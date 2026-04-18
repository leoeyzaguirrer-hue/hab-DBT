-- ============================================================
-- MIGRACIÓN 003: Funciones del servidor
-- Debe aplicarse DESPUÉS de 002_rls_policies.sql
-- ============================================================

-- ============================================================
-- FUNCIÓN: handle_new_user
-- Trigger que crea automáticamente el perfil cuando un usuario
-- se registra en Supabase Auth.
-- Los datos del perfil vienen en los metadatos del registro.
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Sin nombre'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'consultant')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ejecutar el trigger cada vez que se crea un nuevo usuario en Auth
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FUNCIÓN: validate_invitation_code
-- Valida un código de invitación durante el registro del consultante.
--
-- Retorna:
--   - therapist_id (UUID) si el código es válido
--   - NULL si el código no existe, expiró o ya fue usado
--
-- Esta función usa SECURITY DEFINER para poder actualizar
-- invitation_codes sin que el cliente tenga permisos de UPDATE.
-- ============================================================
CREATE OR REPLACE FUNCTION validate_invitation_code(p_code TEXT)
RETURNS TABLE (
  valid        BOOLEAN,
  therapist_id UUID,
  error_msg    TEXT
) AS $$
DECLARE
  v_code_record invitation_codes%ROWTYPE;
BEGIN
  -- Buscar el código en la base de datos
  SELECT * INTO v_code_record
  FROM invitation_codes
  WHERE code = UPPER(TRIM(p_code))
  LIMIT 1;

  -- Código no encontrado
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Código de invitación inválido';
    RETURN;
  END IF;

  -- Código ya fue usado
  IF v_code_record.used_by IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Este código ya fue utilizado';
    RETURN;
  END IF;

  -- Código expirado
  IF v_code_record.expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Este código de invitación ha expirado';
    RETURN;
  END IF;

  -- Código válido: retornar el therapist_id para vinculación posterior
  RETURN QUERY SELECT TRUE, v_code_record.therapist_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- FUNCIÓN: use_invitation_code
-- Marca un código como usado y crea el vínculo terapeuta-consultante.
-- Se llama desde el servidor DESPUÉS de que el usuario fue creado
-- exitosamente en Supabase Auth.
--
-- Parámetros:
--   p_code         - El código ingresado por el consultante
--   p_consultant_id - El UUID del consultante recién creado
-- ============================================================
CREATE OR REPLACE FUNCTION use_invitation_code(
  p_code          TEXT,
  p_consultant_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_therapist_id UUID;
BEGIN
  -- Obtener y bloquear el registro para evitar condiciones de carrera
  SELECT therapist_id INTO v_therapist_id
  FROM invitation_codes
  WHERE code       = UPPER(TRIM(p_code))
    AND used_by    IS NULL
    AND expires_at > NOW()
  FOR UPDATE SKIP LOCKED;

  -- Si no se encontró un código válido disponible, abortar
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Marcar el código como usado
  UPDATE invitation_codes
  SET used_by  = p_consultant_id,
      used_at  = NOW()
  WHERE code = UPPER(TRIM(p_code));

  -- Crear el vínculo terapeuta-consultante
  INSERT INTO therapist_consultants (therapist_id, consultant_id)
  VALUES (v_therapist_id, p_consultant_id)
  ON CONFLICT (therapist_id, consultant_id) DO NOTHING;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCIÓN: generate_invitation_code
-- Genera un código alfanumérico único de 8 caracteres en mayúsculas.
-- Llamada desde el servidor cuando el terapeuta solicita un código nuevo.
--
-- Ejemplo de código generado: "ABX9K2MR"
-- ============================================================
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS TEXT AS $$
DECLARE
  v_code      TEXT;
  v_exists    BOOLEAN;
  v_chars     TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- sin I, O, 0, 1 para evitar confusión visual
  v_length    INTEGER := 8;
  i           INTEGER;
BEGIN
  LOOP
    -- Generar código aleatorio
    v_code := '';
    FOR i IN 1..v_length LOOP
      v_code := v_code || SUBSTR(v_chars, FLOOR(RANDOM() * LENGTH(v_chars) + 1)::INTEGER, 1);
    END LOOP;

    -- Verificar que el código no exista ya (activo o no)
    SELECT EXISTS(
      SELECT 1 FROM invitation_codes WHERE code = v_code
    ) INTO v_exists;

    EXIT WHEN NOT v_exists;
  END LOOP;

  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCIÓN: create_default_crisis_plan
-- Crea un plan de crisis inicial genérico para un consultante nuevo.
-- Se llama automáticamente via trigger al crear el perfil de un consultante.
-- ============================================================
CREATE OR REPLACE FUNCTION create_default_crisis_plan()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_id UUID;
BEGIN
  -- Solo crear plan si el nuevo perfil es un consultante
  IF NEW.role <> 'consultant' THEN
    RETURN NEW;
  END IF;

  -- Crear el plan de crisis base
  INSERT INTO crisis_plans (consultant_id, title, is_active, created_by)
  VALUES (NEW.id, 'Mi Plan de Crisis', TRUE, NEW.id)
  RETURNING id INTO v_plan_id;

  -- Insertar los pasos iniciales del plan general DBT
  INSERT INTO crisis_plan_steps (crisis_plan_id, step_order, title, content, category, do_list, dont_list)
  VALUES
    (
      v_plan_id, 1,
      '¿Estoy en peligro inmediato?',
      'Si hay riesgo para tu vida o la de otros, pide ayuda de emergencia ahora.',
      'professional_help',
      '["Llama al 911 o número de emergencias local", "Ve a la guardia del hospital más cercano", "Llama a tu terapeuta"]',
      '["No estés solo/a", "No tomes decisiones permanentes en este momento"]'
    ),
    (
      v_plan_id, 2,
      'Señales de que estoy en crisis',
      'Reconoce las señales de que tu nivel de malestar es muy alto.',
      'warning_signs',
      '["Identifica qué emoción estás sintiendo", "Nota la intensidad del 1 al 10", "Recuerda que las emociones son temporales"]',
      '["No juzgues lo que sentís", "No actúes de forma impulsiva"]'
    ),
    (
      v_plan_id, 3,
      'Cosas que me ayudan a calmarme',
      'Usa habilidades DBT para reducir la intensidad emocional.',
      'coping_skills',
      '["Respira profundo (4-7-8)", "Aplica TIP: temperatura, ejercicio intenso, respiración pausada", "Usa TIPP o habilidades de mindfulness"]',
      '["No te aísles completamente", "No uses alcohol u otras sustancias"]'
    ),
    (
      v_plan_id, 4,
      'Personas de apoyo',
      'Contacta a alguien de confianza.',
      'support_contacts',
      '["Escribe los números de personas de apoyo en tu celular", "Pide compañía si lo necesitás"]',
      '["No asumas que molestás", "No esperes a estar en el peor momento para pedir ayuda"]'
    ),
    (
      v_plan_id, 5,
      'Ambiente seguro',
      'Asegurate de que tu entorno no ponga en riesgo tu seguridad.',
      'safe_environment',
      '["Ve a un lugar seguro", "Aleja objetos que puedan hacerte daño", "Quédate en un espacio con personas de confianza"]',
      '["No estés en lugares que aumenten el malestar", "No uses medios peligrosos"]'
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ejecutar el trigger cada vez que se crea un nuevo perfil
CREATE TRIGGER on_consultant_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_default_crisis_plan();
