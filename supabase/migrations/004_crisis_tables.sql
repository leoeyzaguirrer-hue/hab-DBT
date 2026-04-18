-- ============================================================
-- MIGRACIÓN 004: Plan de crisis (versión cifrada) + activaciones
-- Reemplaza el crisis_plans viejo (sin cifrado) por la versión
-- con datos cifrados en el cliente (E2EE).
--
-- IMPORTANTE: Ejecutar en el SQL Editor de Supabase.
-- Si ya existían crisis_plans y crisis_plan_steps del schema viejo,
-- se eliminan primero (no hay datos de producción aún).
-- ============================================================

-- Eliminar tablas viejas si existen
DROP TABLE IF EXISTS crisis_plan_steps CASCADE;
DROP TABLE IF EXISTS crisis_plans CASCADE;

-- ============================================================
-- TABLA: crisis_plans
-- Un plan activo por consultante/cliente. Los datos están
-- cifrados con la llave de dispositivo del consultante.
-- ============================================================
CREATE TABLE crisis_plans (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  encrypted_data   TEXT        NOT NULL,
  encryption_iv    TEXT        NOT NULL,
  last_modified_by UUID        REFERENCES profiles(id),
  version          INTEGER     NOT NULL DEFAULT 1,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Un plan activo por cliente
  CONSTRAINT unique_active_crisis_plan UNIQUE (client_id)
);

CREATE INDEX idx_crisis_plans_client ON crisis_plans (client_id);

CREATE TRIGGER crisis_plans_updated_at
  BEFORE UPDATE ON crisis_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLA: crisis_activations
-- Registra cada vez que un consultante activa el botón SOS.
-- Permite al terapeuta monitorear las crisis sin ver el contenido.
-- ============================================================
CREATE TABLE IF NOT EXISTS crisis_activations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  crisis_plan_id  UUID        REFERENCES crisis_plans(id) ON DELETE SET NULL,
  steps_used      JSONB,                        -- pasos que usó (array de índices)
  resolved        BOOLEAN     DEFAULT FALSE,
  encrypted_notes TEXT,                         -- notas personales cifradas
  encryption_iv   TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ
);

CREATE INDEX idx_crisis_activations_client ON crisis_activations (client_id, started_at DESC);

-- ============================================================
-- TABLA: therapist_client_relationships
-- Versión actualizada con cifrado de llave compartida.
-- ============================================================
CREATE TABLE IF NOT EXISTS therapist_client_relationships (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id             UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status                TEXT        NOT NULL DEFAULT 'active'
                                    CHECK (status IN ('active', 'paused', 'ended')),
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at              TIMESTAMPTZ,
  shared_encryption_key TEXT,

  CONSTRAINT unique_therapist_client UNIQUE (therapist_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_tcr_therapist ON therapist_client_relationships (therapist_id);
CREATE INDEX IF NOT EXISTS idx_tcr_client    ON therapist_client_relationships (client_id);

-- ============================================================
-- RLS: crisis_plans
-- ============================================================
ALTER TABLE crisis_plans ENABLE ROW LEVEL SECURITY;

-- El consultante ve y modifica su propio plan
CREATE POLICY "client_own_crisis_plan_all"
  ON crisis_plans FOR ALL
  USING  (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- El terapeuta puede leer el plan de sus clientes
CREATE POLICY "therapist_reads_client_crisis_plan"
  ON crisis_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM therapist_client_relationships r
      WHERE r.therapist_id = auth.uid()
        AND r.client_id    = crisis_plans.client_id
        AND r.status       = 'active'
    )
  );

-- ============================================================
-- RLS: crisis_activations
-- ============================================================
ALTER TABLE crisis_activations ENABLE ROW LEVEL SECURITY;

-- El consultante gestiona sus propias activaciones
CREATE POLICY "client_own_crisis_activations"
  ON crisis_activations FOR ALL
  USING  (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- El terapeuta puede leer las activaciones de sus clientes
CREATE POLICY "therapist_reads_client_activations"
  ON crisis_activations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM therapist_client_relationships r
      WHERE r.therapist_id = auth.uid()
        AND r.client_id    = crisis_activations.client_id
        AND r.status       = 'active'
    )
  );

-- ============================================================
-- RLS: therapist_client_relationships (si no tenía)
-- ============================================================
ALTER TABLE therapist_client_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tcr_therapist_all"
  ON therapist_client_relationships FOR ALL
  USING  (auth.uid() = therapist_id)
  WITH CHECK (auth.uid() = therapist_id);

CREATE POLICY "tcr_client_select"
  ON therapist_client_relationships FOR SELECT
  USING (auth.uid() = client_id);
