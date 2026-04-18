-- ============================================================
-- MIGRACIÓN 002: Políticas de Row Level Security (RLS)
-- Schema actualizado — usa tablas del nuevo diseño con cifrado.
-- Aplicar DESPUÉS del SQL del schema principal (3.1 + 3.2).
--
-- Principios:
--   - Cliente: solo ve sus propios datos
--   - Terapeuta: ve sus datos + datos de sus clientes vinculados
--   - Contenido DBT: lectura para todos los autenticados
-- ============================================================

-- ============================================================
-- Función auxiliar: verifica si el usuario actual es terapeuta
-- del cliente indicado (relación activa).
-- ============================================================
CREATE OR REPLACE FUNCTION is_my_client(p_client_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM therapist_client_relationships r
    WHERE r.therapist_id = auth.uid()
      AND r.client_id    = p_client_id
      AND r.status       = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- Función auxiliar: devuelve el rol del usuario actual
-- ============================================================
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- TABLA: profiles
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Cada usuario lee su propio perfil
CREATE POLICY "profiles: leer propio"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- El terapeuta lee el perfil de sus clientes activos
CREATE POLICY "profiles: terapeuta lee sus clientes"
  ON profiles FOR SELECT
  USING (is_my_client(id));

-- Cada usuario actualiza su propio perfil
CREATE POLICY "profiles: actualizar propio"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- INSERT lo hace el trigger handle_new_user (no desde el cliente)

-- ============================================================
-- TABLA: therapist_client_relationships
-- ============================================================
ALTER TABLE therapist_client_relationships ENABLE ROW LEVEL SECURITY;

-- El terapeuta ve todos sus vínculos
CREATE POLICY "tcr: terapeuta ve los suyos"
  ON therapist_client_relationships FOR SELECT
  USING (therapist_id = auth.uid());

-- El cliente ve su propio vínculo
CREATE POLICY "tcr: cliente ve el suyo"
  ON therapist_client_relationships FOR SELECT
  USING (client_id = auth.uid());

-- Solo el sistema puede insertar vínculos (via use_invitation_code)
-- El terapeuta puede actualizar estado (pausar, terminar relación)
CREATE POLICY "tcr: terapeuta actualiza estado"
  ON therapist_client_relationships FOR UPDATE
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

-- ============================================================
-- TABLA: invitation_codes
-- ============================================================
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;

-- Solo el terapeuta que creó el código puede verlo
CREATE POLICY "codes: terapeuta ve los suyos"
  ON invitation_codes FOR SELECT
  USING (therapist_id = auth.uid());

-- Solo terapeutas pueden generar códigos
CREATE POLICY "codes: terapeutas insertan"
  ON invitation_codes FOR INSERT
  WITH CHECK (
    therapist_id = auth.uid()
    AND current_user_role() = 'therapist'
  );

-- La actualización (marcar usado) solo la hace use_invitation_code (SECURITY DEFINER)

-- ============================================================
-- TABLA: dbt_skills
-- Contenido público del libro DBT — solo lectura para autenticados
-- ============================================================
ALTER TABLE dbt_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dbt_skills: lectura autenticada"
  ON dbt_skills FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- TABLA: skill_worksheets
-- También contenido público del libro
-- ============================================================
ALTER TABLE skill_worksheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "skill_worksheets: lectura autenticada"
  ON skill_worksheets FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- TABLA: diary_cards
-- Datos cifrados — el terapeuta puede leer pero NO descifrar
-- sin la llave compartida (cifrado E2E)
-- ============================================================
ALTER TABLE diary_cards ENABLE ROW LEVEL SECURITY;

-- El cliente lee sus propias tarjetas
CREATE POLICY "diary_cards: cliente lee las suyas"
  ON diary_cards FOR SELECT
  USING (client_id = auth.uid());

-- El terapeuta puede leer (datos cifrados) de sus clientes activos
CREATE POLICY "diary_cards: terapeuta lee las de sus clientes"
  ON diary_cards FOR SELECT
  USING (is_my_client(client_id));

-- Solo el cliente puede crear y actualizar sus tarjetas
CREATE POLICY "diary_cards: cliente inserta"
  ON diary_cards FOR INSERT
  WITH CHECK (
    client_id = auth.uid()
    AND current_user_role() = 'client'
  );

CREATE POLICY "diary_cards: cliente actualiza"
  ON diary_cards FOR UPDATE
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- ============================================================
-- TABLA: diary_card_templates
-- ============================================================
ALTER TABLE diary_card_templates ENABLE ROW LEVEL SECURITY;

-- El cliente ve su plantilla activa
CREATE POLICY "templates: cliente ve la suya"
  ON diary_card_templates FOR SELECT
  USING (client_id = auth.uid());

-- El terapeuta ve las plantillas de sus clientes
CREATE POLICY "templates: terapeuta ve las de sus clientes"
  ON diary_card_templates FOR SELECT
  USING (is_my_client(client_id));

-- El terapeuta puede crear/actualizar plantillas para sus clientes
CREATE POLICY "templates: terapeuta inserta"
  ON diary_card_templates FOR INSERT
  WITH CHECK (
    current_user_role() = 'therapist'
    AND is_my_client(client_id)
  );

CREATE POLICY "templates: terapeuta actualiza"
  ON diary_card_templates FOR UPDATE
  USING (is_my_client(client_id));

-- El cliente puede actualizar su propia plantilla
CREATE POLICY "templates: cliente actualiza la suya"
  ON diary_card_templates FOR UPDATE
  USING (client_id = auth.uid());

-- ============================================================
-- TABLA: crisis_plans
-- ============================================================
ALTER TABLE crisis_plans ENABLE ROW LEVEL SECURITY;

-- El cliente ve sus planes
CREATE POLICY "crisis_plans: cliente ve los suyos"
  ON crisis_plans FOR SELECT
  USING (client_id = auth.uid());

-- El terapeuta ve los planes (cifrados) de sus clientes
CREATE POLICY "crisis_plans: terapeuta ve los de sus clientes"
  ON crisis_plans FOR SELECT
  USING (is_my_client(client_id));

-- El cliente puede crear su plan
CREATE POLICY "crisis_plans: cliente inserta"
  ON crisis_plans FOR INSERT
  WITH CHECK (
    client_id = auth.uid()
    AND current_user_role() = 'client'
  );

-- El terapeuta puede crear planes para sus clientes
CREATE POLICY "crisis_plans: terapeuta inserta"
  ON crisis_plans FOR INSERT
  WITH CHECK (
    current_user_role() = 'therapist'
    AND is_my_client(client_id)
  );

-- Ambos pueden actualizar
CREATE POLICY "crisis_plans: cliente actualiza"
  ON crisis_plans FOR UPDATE
  USING (client_id = auth.uid());

CREATE POLICY "crisis_plans: terapeuta actualiza"
  ON crisis_plans FOR UPDATE
  USING (is_my_client(client_id));

-- ============================================================
-- TABLA: assigned_tasks
-- ============================================================
ALTER TABLE assigned_tasks ENABLE ROW LEVEL SECURITY;

-- El cliente ve sus tareas
CREATE POLICY "tasks: cliente ve las suyas"
  ON assigned_tasks FOR SELECT
  USING (client_id = auth.uid());

-- El terapeuta ve las tareas que asignó
CREATE POLICY "tasks: terapeuta ve las suyas"
  ON assigned_tasks FOR SELECT
  USING (
    therapist_id = auth.uid()
    AND is_my_client(client_id)
  );

-- Solo el terapeuta puede crear tareas para sus clientes
CREATE POLICY "tasks: terapeuta inserta"
  ON assigned_tasks FOR INSERT
  WITH CHECK (
    therapist_id = auth.uid()
    AND current_user_role() = 'therapist'
    AND is_my_client(client_id)
  );

-- El cliente puede cambiar el status de sus tareas
CREATE POLICY "tasks: cliente actualiza status"
  ON assigned_tasks FOR UPDATE
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- El terapeuta puede modificar tareas que asignó
CREATE POLICY "tasks: terapeuta actualiza"
  ON assigned_tasks FOR UPDATE
  USING (
    therapist_id = auth.uid()
    AND is_my_client(client_id)
  );

-- El terapeuta puede eliminar tareas que asignó
CREATE POLICY "tasks: terapeuta elimina"
  ON assigned_tasks FOR DELETE
  USING (
    therapist_id = auth.uid()
    AND is_my_client(client_id)
  );

-- ============================================================
-- TABLA: therapist_messages
-- ============================================================
ALTER TABLE therapist_messages ENABLE ROW LEVEL SECURITY;

-- El cliente lee los mensajes recibidos
CREATE POLICY "messages: cliente lee los suyos"
  ON therapist_messages FOR SELECT
  USING (client_id = auth.uid());

-- El terapeuta lee los mensajes que envió
CREATE POLICY "messages: terapeuta lee los suyos"
  ON therapist_messages FOR SELECT
  USING (therapist_id = auth.uid());

-- Solo terapeutas pueden enviar mensajes a sus clientes
CREATE POLICY "messages: terapeuta inserta"
  ON therapist_messages FOR INSERT
  WITH CHECK (
    therapist_id = auth.uid()
    AND current_user_role() = 'therapist'
    AND is_my_client(client_id)
  );

-- Solo el cliente puede marcar como leído
CREATE POLICY "messages: cliente marca leído"
  ON therapist_messages FOR UPDATE
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- ============================================================
-- TABLA: crisis_activations
-- ============================================================
ALTER TABLE crisis_activations ENABLE ROW LEVEL SECURITY;

-- El cliente ve sus propias activaciones
CREATE POLICY "activations: cliente ve las suyas"
  ON crisis_activations FOR SELECT
  USING (client_id = auth.uid());

-- El terapeuta puede ver activaciones de sus clientes (para seguimiento)
CREATE POLICY "activations: terapeuta ve las de sus clientes"
  ON crisis_activations FOR SELECT
  USING (is_my_client(client_id));

-- Solo el cliente puede registrar una activación de crisis
CREATE POLICY "activations: cliente inserta"
  ON crisis_activations FOR INSERT
  WITH CHECK (
    client_id = auth.uid()
    AND current_user_role() = 'client'
  );

-- El cliente puede cerrar/actualizar su activación
CREATE POLICY "activations: cliente actualiza"
  ON crisis_activations FOR UPDATE
  USING (client_id = auth.uid());

-- ============================================================
-- TABLA: audit_log
-- Solo el sistema puede insertar (via SECURITY DEFINER functions)
-- Nadie puede actualizar ni eliminar — es inmutable
-- ============================================================
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver su propio log de auditoría
CREATE POLICY "audit: usuario ve el suyo"
  ON audit_log FOR SELECT
  USING (user_id = auth.uid());

-- El terapeuta puede ver accesos a sus clientes
CREATE POLICY "audit: terapeuta ve accesos a sus clientes"
  ON audit_log FOR SELECT
  USING (is_my_client(target_user_id));
