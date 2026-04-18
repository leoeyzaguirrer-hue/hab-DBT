-- ============================================================
-- MIGRACIÓN 001: Esquema inicial de la base de datos
-- Aplicar en orden. Requiere extensión pgcrypto (incluida en Supabase).
-- ============================================================

-- Habilitar UUID v4 (ya disponible en Supabase por defecto)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLA: profiles
-- Extiende auth.users con datos del perfil y rol del usuario.
-- Se crea automáticamente via trigger cuando un usuario se registra.
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL,
  role        TEXT        NOT NULL CHECK (role IN ('consultant', 'therapist')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLA: therapist_consultants
-- Vincula a un terapeuta con sus consultantes.
-- Un consultante puede tener solo un terapeuta principal.
-- ============================================================
CREATE TABLE therapist_consultants (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consultant_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Un consultante no puede estar vinculado dos veces al mismo terapeuta
  CONSTRAINT unique_therapist_consultant UNIQUE (therapist_id, consultant_id)
);

-- Índice para búsquedas frecuentes por terapeuta y por consultante
CREATE INDEX idx_tc_therapist_id   ON therapist_consultants (therapist_id);
CREATE INDEX idx_tc_consultant_id  ON therapist_consultants (consultant_id);

-- ============================================================
-- TABLA: invitation_codes
-- Códigos de invitación generados por terapeutas para registrar consultantes.
-- Cada código es único, de un solo uso y expira en 7 días.
-- ============================================================
CREATE TABLE invitation_codes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT        NOT NULL UNIQUE,
  therapist_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  used_by       UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  used_at       TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Si fue usado, debe tener fecha de uso y viceversa
  CONSTRAINT used_consistency CHECK (
    (used_by IS NULL AND used_at IS NULL) OR
    (used_by IS NOT NULL AND used_at IS NOT NULL)
  )
);

CREATE INDEX idx_invitation_codes_therapist ON invitation_codes (therapist_id);

-- ============================================================
-- TABLA: dbt_modules
-- Los 4 módulos principales del programa DBT.
-- Contenido cargado via seed.sql, no modificable por usuarios.
-- ============================================================
CREATE TABLE dbt_modules (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  slug         TEXT        NOT NULL UNIQUE,  -- ej: 'mindfulness', 'distress-tolerance'
  description  TEXT,
  color        TEXT        NOT NULL DEFAULT '#64748b',  -- color hex para la UI
  order_index  INTEGER     NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_module_order UNIQUE (order_index)
);

-- ============================================================
-- TABLA: dbt_skills
-- Habilidades dentro de cada módulo DBT.
-- Contenido del libro de habilidades, cargado via seed.
-- ============================================================
CREATE TABLE dbt_skills (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id    UUID        NOT NULL REFERENCES dbt_modules(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  description  TEXT,
  instructions TEXT,        -- cómo practicar la habilidad
  examples     TEXT,        -- ejemplos de aplicación cotidiana
  order_index  INTEGER     NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_skill_order_per_module UNIQUE (module_id, order_index)
);

CREATE INDEX idx_dbt_skills_module ON dbt_skills (module_id);

-- ============================================================
-- TABLA: assigned_skills
-- Habilidades sugeridas/asignadas por el terapeuta al consultante.
-- Una habilidad no puede asignarse dos veces al mismo consultante.
-- ============================================================
CREATE TABLE assigned_skills (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consultant_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id       UUID        NOT NULL REFERENCES dbt_skills(id) ON DELETE CASCADE,
  notes          TEXT,       -- notas del terapeuta sobre por qué asigna esta habilidad
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_assigned_skill UNIQUE (consultant_id, skill_id)
);

CREATE INDEX idx_assigned_skills_consultant ON assigned_skills (consultant_id);

-- ============================================================
-- TABLA: weekly_cards
-- Tarjeta de seguimiento semanal del consultante (una por semana).
-- La semana siempre arranca el lunes y termina el domingo.
-- ============================================================
CREATE TABLE weekly_cards (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start     DATE        NOT NULL,  -- lunes de la semana
  week_end       DATE        NOT NULL,  -- domingo de la semana
  config         JSONB       NOT NULL DEFAULT '{}',  -- campos personalizables
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Solo una tarjeta por semana por consultante
  CONSTRAINT unique_weekly_card UNIQUE (consultant_id, week_start),

  -- La semana debe tener exactamente 7 días
  CONSTRAINT valid_week CHECK (week_end = week_start + INTERVAL '6 days')
);

CREATE INDEX idx_weekly_cards_consultant ON weekly_cards (consultant_id, week_start DESC);

-- ============================================================
-- TABLA: weekly_card_entries
-- Entradas diarias dentro de la tarjeta semanal.
-- Una entrada por día, con registro de emociones, habilidades y hábitos.
-- ============================================================
CREATE TABLE weekly_card_entries (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_card_id  UUID        NOT NULL REFERENCES weekly_cards(id) ON DELETE CASCADE,
  entry_date      DATE        NOT NULL,
  skills_used     JSONB       NOT NULL DEFAULT '[]',   -- array de skill_ids usadas
  emotions        JSONB       NOT NULL DEFAULT '[]',   -- [{name, intensity: 1-10}]
  urges           JSONB       NOT NULL DEFAULT '[]',   -- [{name, intensity: 1-10}]
  medications_taken BOOLEAN   NOT NULL DEFAULT FALSE,
  exercise_done   BOOLEAN     NOT NULL DEFAULT FALSE,
  sleep_hours     NUMERIC(3,1),                        -- ej: 7.5 horas
  notes           TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_daily_entry UNIQUE (weekly_card_id, entry_date)
);

CREATE TRIGGER weekly_card_entries_updated_at
  BEFORE UPDATE ON weekly_card_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLA: tasks
-- Tareas asignadas por el terapeuta al consultante,
-- opcionalmente vinculadas a una habilidad DBT.
-- ============================================================
CREATE TABLE tasks (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consultant_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id       UUID        REFERENCES dbt_skills(id) ON DELETE SET NULL,
  title          TEXT        NOT NULL,
  description    TEXT,
  due_date       DATE,
  completed_at   TIMESTAMPTZ,  -- NULL = pendiente
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_consultant ON tasks (consultant_id, created_at DESC);
CREATE INDEX idx_tasks_therapist  ON tasks (therapist_id);

-- ============================================================
-- TABLA: crisis_plans
-- Plan de crisis del consultante. Puede haber uno activo por consultante.
-- Puede ser creado por el consultante, el terapeuta, o ambos.
-- ============================================================
CREATE TABLE crisis_plans (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL DEFAULT 'Mi Plan de Crisis',
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by     UUID        NOT NULL REFERENCES profiles(id),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER crisis_plans_updated_at
  BEFORE UPDATE ON crisis_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_crisis_plans_consultant ON crisis_plans (consultant_id);

-- ============================================================
-- TABLA: crisis_plan_steps
-- Pasos ordenados dentro del plan de crisis.
-- Incluye listas de qué hacer y qué no hacer.
-- ============================================================
CREATE TABLE crisis_plan_steps (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  crisis_plan_id  UUID    NOT NULL REFERENCES crisis_plans(id) ON DELETE CASCADE,
  step_order      INTEGER NOT NULL,
  title           TEXT    NOT NULL,
  content         TEXT    NOT NULL,
  category        TEXT    CHECK (category IN (
                    'warning_signs',    -- señales de alerta
                    'coping_skills',    -- habilidades de afrontamiento
                    'support_contacts', -- contactos de apoyo
                    'professional_help',-- ayuda profesional
                    'safe_environment'  -- ambiente seguro
                  )),
  do_list         JSONB   NOT NULL DEFAULT '[]',   -- cosas que SÍ hacer
  dont_list       JSONB   NOT NULL DEFAULT '[]',   -- cosas que NO hacer
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_step_order UNIQUE (crisis_plan_id, step_order)
);

CREATE INDEX idx_crisis_plan_steps_plan ON crisis_plan_steps (crisis_plan_id, step_order);

-- ============================================================
-- TABLA: messages
-- Mensajes de apoyo, validación o motivación entre terapeuta y consultante.
-- ============================================================
CREATE TABLE messages (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content       TEXT        NOT NULL,
  type          TEXT        NOT NULL DEFAULT 'general'
                            CHECK (type IN ('motivation', 'validation', 'task', 'general')),
  read_at       TIMESTAMPTZ,  -- NULL = no leído
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- No se puede enviar mensajes a uno mismo
  CONSTRAINT no_self_message CHECK (sender_id <> recipient_id)
);

CREATE INDEX idx_messages_recipient ON messages (recipient_id, created_at DESC);
CREATE INDEX idx_messages_sender    ON messages (sender_id, created_at DESC);
