-- Staff presenze — registro clock in/out giornaliero.
-- clock_out = NULL indica una sessione ancora aperta (staff "In servizio").
-- Il monthly summary nel gestionale somma (clock_out - clock_in) per ottenere
-- le ore lavorate nel mese per operatrice.

CREATE TABLE IF NOT EXISTS staff_presenze (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_presenze_staff_data ON staff_presenze(staff_id, data);
CREATE INDEX IF NOT EXISTS idx_staff_presenze_clock_out ON staff_presenze(clock_out) WHERE clock_out IS NULL;

ALTER TABLE staff_presenze ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_presenze"
  ON staff_presenze FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "auth_all_presenze"
  ON staff_presenze FOR ALL
  USING (auth.role() = 'authenticated');

-- Estendi staff_ferie con stato per workflow approvazione
ALTER TABLE staff_ferie
  ADD COLUMN IF NOT EXISTS stato VARCHAR(20) NOT NULL DEFAULT 'pending';
-- Allowed: pending | approved | rejected
CREATE INDEX IF NOT EXISTS idx_staff_ferie_stato ON staff_ferie(stato);
