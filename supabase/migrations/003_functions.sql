-- ============================================================
-- MIGRACIÓN 003: Funciones del servidor
-- Schema actualizado — usa tablas del nuevo diseño.
-- Aplicar DESPUÉS de 002_rls_policies.sql
-- ============================================================

-- ============================================================
-- FUNCIÓN: handle_new_user
-- Trigger que crea el perfil automáticamente cuando un usuario
-- se registra en Supabase Auth.
-- El rol y nombre vienen en los metadatos del signup.
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Sin nombre'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Ejecutar cada vez que se crea un usuario en Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FUNCIÓN: validate_invitation_code
-- Verifica si un código es válido sin marcarlo como usado.
-- Llamar ANTES del registro para mostrar feedback al usuario.
-- ============================================================
CREATE OR REPLACE FUNCTION validate_invitation_code(p_code TEXT)
RETURNS TABLE (
  valid        BOOLEAN,
  therapist_id UUID,
  error_msg    TEXT
) AS $$
DECLARE
  v_record invitation_codes%ROWTYPE;
BEGIN
  SELECT * INTO v_record
  FROM invitation_codes
  WHERE code = UPPER(TRIM(p_code))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Código de invitación inválido';
    RETURN;
  END IF;

  IF v_record.used_by IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Este código ya fue utilizado';
    RETURN;
  END IF;

  IF v_record.expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Este código ha expirado';
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, v_record.therapist_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- FUNCIÓN: use_invitation_code
-- Marca el código como usado y crea el vínculo terapeuta-cliente.
-- Llamar DESPUÉS de crear el usuario en Auth exitosamente.
-- Usa FOR UPDATE para evitar condiciones de carrera.
-- ============================================================
CREATE OR REPLACE FUNCTION use_invitation_code(
  p_code      TEXT,
  p_client_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_therapist_id UUID;
BEGIN
  -- Bloquear el registro para uso exclusivo
  SELECT therapist_id INTO v_therapist_id
  FROM invitation_codes
  WHERE code       = UPPER(TRIM(p_code))
    AND used_by    IS NULL
    AND expires_at > NOW()
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Marcar como usado
  UPDATE invitation_codes
  SET used_by = p_client_id,
      used_at = NOW()
  WHERE code = UPPER(TRIM(p_code));

  -- Crear vínculo terapeuta-cliente
  INSERT INTO therapist_client_relationships (therapist_id, client_id, status)
  VALUES (v_therapist_id, p_client_id, 'active')
  ON CONFLICT (therapist_id, client_id) DO NOTHING;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCIÓN: generate_invitation_code
-- Genera un código de 8 caracteres único y legible.
-- Evita caracteres confusos: I, O, 0, 1.
-- Ejemplo de salida: "ABX9K2MR"
-- ============================================================
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS TEXT AS $$
DECLARE
  v_code   TEXT;
  v_exists BOOLEAN;
  v_chars  TEXT    := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_len    INTEGER := 8;
  i        INTEGER;
BEGIN
  LOOP
    v_code := '';
    FOR i IN 1..v_len LOOP
      v_code := v_code || SUBSTR(
        v_chars,
        FLOOR(RANDOM() * LENGTH(v_chars) + 1)::INTEGER,
        1
      );
    END LOOP;

    SELECT EXISTS(SELECT 1 FROM invitation_codes WHERE code = v_code)
    INTO v_exists;

    EXIT WHEN NOT v_exists;
  END LOOP;

  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCIÓN: log_audit_event
-- Registra un evento en audit_log desde funciones del servidor.
-- Nunca llamar directamente desde el cliente.
-- ============================================================
CREATE OR REPLACE FUNCTION log_audit_event(
  p_action               TEXT,
  p_target_user_id       UUID    DEFAULT NULL,
  p_target_resource_type TEXT    DEFAULT NULL,
  p_target_resource_id   UUID    DEFAULT NULL,
  p_metadata             JSONB   DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_log (
    user_id,
    action,
    target_user_id,
    target_resource_type,
    target_resource_id,
    metadata
  ) VALUES (
    auth.uid(),
    p_action,
    p_target_user_id,
    p_target_resource_type,
    p_target_resource_id,
    p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
