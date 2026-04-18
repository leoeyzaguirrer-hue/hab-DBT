-- ============================================================
-- MIGRACIÓN 002: Políticas de Row Level Security (RLS)
-- Debe aplicarse DESPUÉS de 001_initial_schema.sql
--
-- Principios:
--   - Consultante: solo ve sus propios datos
--   - Terapeuta: ve sus datos + datos de sus consultantes vinculados
--   - Contenido DBT: lectura para todos los autenticados
-- ============================================================

-- ============================================================
-- Función auxiliar: verifica si el usuario actual es terapeuta
-- del consultante indicado. Usada en múltiples políticas.
-- ============================================================
CREATE OR REPLACE FUNCTION is_my_consultant(consultant_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM therapist_consultants tc
    WHERE tc.therapist_id  = auth.uid()
      AND tc.consultant_id = consultant_id
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

-- Cada usuario puede leer su propio perfil
CREATE POLICY "profiles: leer propio perfil"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Los terapeutas pueden leer el perfil de sus consultantes
CREATE POLICY "profiles: terapeuta lee sus consultantes"
  ON profiles FOR SELECT
  USING (is_my_consultant(id));

-- Cada usuario puede actualizar su propio perfil
CREATE POLICY "profiles: actualizar propio perfil"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- El INSERT de profiles lo hace únicamente el trigger del sistema,
-- no se permite desde el cliente directamente.
-- (Sin política INSERT = nadie puede insertar manualmente)

-- ============================================================
-- TABLA: therapist_consultants
-- ============================================================
ALTER TABLE therapist_consultants ENABLE ROW LEVEL SECURITY;

-- El terapeuta puede ver todos sus vínculos
CREATE POLICY "tc: terapeuta ve sus vínculos"
  ON therapist_consultants FOR SELECT
  USING (therapist_id = auth.uid());

-- El consultante puede ver su propio vínculo (para saber quién es su terapeuta)
CREATE POLICY "tc: consultante ve su vínculo"
  ON therapist_consultants FOR SELECT
  USING (consultant_id = auth.uid());

-- Solo el sistema puede insertar vínculos (via función validate_invitation_code)
-- No se permite insert directo desde el cliente.

-- ============================================================
-- TABLA: invitation_codes
-- ============================================================
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;

-- Solo el terapeuta que creó el código puede verlo
CREATE POLICY "codes: terapeuta ve sus códigos"
  ON invitation_codes FOR SELECT
  USING (therapist_id = auth.uid());

-- Solo terapeutas pueden generar códigos
CREATE POLICY "codes: terapeutas insertan"
  ON invitation_codes FOR INSERT
  WITH CHECK (
    therapist_id = auth.uid()
    AND current_user_role() = 'therapist'
  );

-- La actualización (marcar como usado) solo la hace la función del servidor
-- No se permite UPDATE directo desde el cliente.

-- ============================================================
-- TABLA: dbt_modules
-- Contenido público: todos los usuarios autenticados pueden leer
-- ============================================================
ALTER TABLE dbt_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dbt_modules: lectura pública autenticada"
  ON dbt_modules FOR SELECT
  TO authenticated
  USING (true);

-- No se permite INSERT/UPDATE/DELETE desde el cliente
-- Solo via migraciones con service role.

-- ============================================================
-- TABLA: dbt_skills
-- Contenido público: todos los usuarios autenticados pueden leer
-- ============================================================
ALTER TABLE dbt_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dbt_skills: lectura pública autenticada"
  ON dbt_skills FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- TABLA: assigned_skills
-- ============================================================
ALTER TABLE assigned_skills ENABLE ROW LEVEL SECURITY;

-- El consultante ve las habilidades asignadas a él
CREATE POLICY "assigned_skills: consultante ve las suyas"
  ON assigned_skills FOR SELECT
  USING (consultant_id = auth.uid());

-- El terapeuta ve las habilidades que asignó a sus consultantes
CREATE POLICY "assigned_skills: terapeuta ve las de sus consultantes"
  ON assigned_skills FOR SELECT
  USING (
    therapist_id = auth.uid()
    AND is_my_consultant(consultant_id)
  );

-- Solo el terapeuta vinculado puede asignar habilidades
CREATE POLICY "assigned_skills: terapeuta inserta"
  ON assigned_skills FOR INSERT
  WITH CHECK (
    therapist_id = auth.uid()
    AND current_user_role() = 'therapist'
    AND is_my_consultant(consultant_id)
  );

-- Solo el terapeuta vinculado puede eliminar habilidades asignadas
CREATE POLICY "assigned_skills: terapeuta elimina"
  ON assigned_skills FOR DELETE
  USING (
    therapist_id = auth.uid()
    AND is_my_consultant(consultant_id)
  );

-- ============================================================
-- TABLA: weekly_cards
-- ============================================================
ALTER TABLE weekly_cards ENABLE ROW LEVEL SECURITY;

-- El consultante ve sus propias tarjetas
CREATE POLICY "weekly_cards: consultante ve las suyas"
  ON weekly_cards FOR SELECT
  USING (consultant_id = auth.uid());

-- El terapeuta ve las tarjetas de sus consultantes
CREATE POLICY "weekly_cards: terapeuta ve las de sus consultantes"
  ON weekly_cards FOR SELECT
  USING (is_my_consultant(consultant_id));

-- Solo el consultante puede crear/actualizar sus tarjetas
CREATE POLICY "weekly_cards: consultante inserta"
  ON weekly_cards FOR INSERT
  WITH CHECK (
    consultant_id = auth.uid()
    AND current_user_role() = 'consultant'
  );

CREATE POLICY "weekly_cards: consultante actualiza"
  ON weekly_cards FOR UPDATE
  USING (consultant_id = auth.uid())
  WITH CHECK (consultant_id = auth.uid());

-- ============================================================
-- TABLA: weekly_card_entries
-- ============================================================
ALTER TABLE weekly_card_entries ENABLE ROW LEVEL SECURITY;

-- El consultante lee sus propias entradas (via weekly_card)
CREATE POLICY "entries: consultante lee las suyas"
  ON weekly_card_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM weekly_cards wc
      WHERE wc.id = weekly_card_id
        AND wc.consultant_id = auth.uid()
    )
  );

-- El terapeuta lee las entradas de sus consultantes
CREATE POLICY "entries: terapeuta lee las de sus consultantes"
  ON weekly_card_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM weekly_cards wc
      WHERE wc.id = weekly_card_id
        AND is_my_consultant(wc.consultant_id)
    )
  );

-- Solo el consultante puede insertar/actualizar sus entradas
CREATE POLICY "entries: consultante inserta"
  ON weekly_card_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weekly_cards wc
      WHERE wc.id = weekly_card_id
        AND wc.consultant_id = auth.uid()
    )
  );

CREATE POLICY "entries: consultante actualiza"
  ON weekly_card_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM weekly_cards wc
      WHERE wc.id = weekly_card_id
        AND wc.consultant_id = auth.uid()
    )
  );

-- ============================================================
-- TABLA: tasks
-- ============================================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- El consultante ve sus propias tareas
CREATE POLICY "tasks: consultante ve las suyas"
  ON tasks FOR SELECT
  USING (consultant_id = auth.uid());

-- El terapeuta ve las tareas que asignó a sus consultantes
CREATE POLICY "tasks: terapeuta ve las suyas"
  ON tasks FOR SELECT
  USING (
    therapist_id = auth.uid()
    AND is_my_consultant(consultant_id)
  );

-- Solo terapeutas pueden crear tareas para sus consultantes
CREATE POLICY "tasks: terapeuta inserta"
  ON tasks FOR INSERT
  WITH CHECK (
    therapist_id = auth.uid()
    AND current_user_role() = 'therapist'
    AND is_my_consultant(consultant_id)
  );

-- El consultante puede marcar una tarea como completada (solo completed_at)
-- El terapeuta puede actualizar cualquier campo de las tareas que asignó
CREATE POLICY "tasks: consultante actualiza completed_at"
  ON tasks FOR UPDATE
  USING (consultant_id = auth.uid())
  WITH CHECK (
    consultant_id = auth.uid()
    -- No puede cambiar therapist_id ni consultant_id
    AND therapist_id = therapist_id
  );

CREATE POLICY "tasks: terapeuta actualiza sus tareas"
  ON tasks FOR UPDATE
  USING (
    therapist_id = auth.uid()
    AND is_my_consultant(consultant_id)
  );

-- El terapeuta puede eliminar tareas que asignó
CREATE POLICY "tasks: terapeuta elimina"
  ON tasks FOR DELETE
  USING (
    therapist_id = auth.uid()
    AND is_my_consultant(consultant_id)
  );

-- ============================================================
-- TABLA: crisis_plans
-- ============================================================
ALTER TABLE crisis_plans ENABLE ROW LEVEL SECURITY;

-- El consultante ve sus planes de crisis
CREATE POLICY "crisis_plans: consultante ve los suyos"
  ON crisis_plans FOR SELECT
  USING (consultant_id = auth.uid());

-- El terapeuta ve los planes de sus consultantes
CREATE POLICY "crisis_plans: terapeuta ve los de sus consultantes"
  ON crisis_plans FOR SELECT
  USING (is_my_consultant(consultant_id));

-- Tanto el consultante como el terapeuta pueden crear planes
CREATE POLICY "crisis_plans: consultante inserta"
  ON crisis_plans FOR INSERT
  WITH CHECK (
    consultant_id = auth.uid()
    AND created_by = auth.uid()
    AND current_user_role() = 'consultant'
  );

CREATE POLICY "crisis_plans: terapeuta inserta para sus consultantes"
  ON crisis_plans FOR INSERT
  WITH CHECK (
    current_user_role() = 'therapist'
    AND is_my_consultant(consultant_id)
    AND created_by = auth.uid()
  );

-- Ambos pueden actualizar
CREATE POLICY "crisis_plans: consultante actualiza los suyos"
  ON crisis_plans FOR UPDATE
  USING (consultant_id = auth.uid());

CREATE POLICY "crisis_plans: terapeuta actualiza los de sus consultantes"
  ON crisis_plans FOR UPDATE
  USING (is_my_consultant(consultant_id));

-- ============================================================
-- TABLA: crisis_plan_steps
-- ============================================================
ALTER TABLE crisis_plan_steps ENABLE ROW LEVEL SECURITY;

-- El consultante lee los pasos de sus planes
CREATE POLICY "steps: consultante lee los suyos"
  ON crisis_plan_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM crisis_plans cp
      WHERE cp.id = crisis_plan_id
        AND cp.consultant_id = auth.uid()
    )
  );

-- El terapeuta lee los pasos de los planes de sus consultantes
CREATE POLICY "steps: terapeuta lee los de sus consultantes"
  ON crisis_plan_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM crisis_plans cp
      WHERE cp.id = crisis_plan_id
        AND is_my_consultant(cp.consultant_id)
    )
  );

-- Ambos pueden insertar/actualizar/eliminar pasos
CREATE POLICY "steps: consultante modifica los suyos"
  ON crisis_plan_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM crisis_plans cp
      WHERE cp.id = crisis_plan_id
        AND cp.consultant_id = auth.uid()
    )
  );

CREATE POLICY "steps: terapeuta modifica los de sus consultantes"
  ON crisis_plan_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM crisis_plans cp
      WHERE cp.id = crisis_plan_id
        AND is_my_consultant(cp.consultant_id)
    )
  );

-- ============================================================
-- TABLA: messages
-- ============================================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Tanto el remitente como el destinatario pueden leer el mensaje
CREATE POLICY "messages: sender y recipient leen"
  ON messages FOR SELECT
  USING (
    sender_id = auth.uid()
    OR recipient_id = auth.uid()
  );

-- Cualquier usuario autenticado puede enviar mensajes
-- (la validación de que solo envíe a sus consultantes/terapeuta
--  se hace en la Server Action, no en RLS)
CREATE POLICY "messages: usuarios autenticados envían"
  ON messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Solo el destinatario puede marcar como leído (actualizar read_at)
CREATE POLICY "messages: recipient actualiza read_at"
  ON messages FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());
