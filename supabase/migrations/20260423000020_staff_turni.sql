-- Staff turni programmati — override giornaliero dell'orario standard di staff.
-- Un turno è una fascia di lavoro specifica per data; permette pianificazione
-- settimanale dedicata (planner) che sovrascrive `staff.orario_inizio/fine`.

CREATE TABLE IF NOT EXISTS staff_turni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  ora_inizio TIME NOT NULL,
  ora_fine TIME NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ora_fine > ora_inizio),
  UNIQUE (staff_id, data, ora_inizio)
);

CREATE INDEX IF NOT EXISTS idx_staff_turni_data ON staff_turni(data);
CREATE INDEX IF NOT EXISTS idx_staff_turni_staff_data ON staff_turni(staff_id, data);

ALTER TABLE staff_turni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_turni"
  ON staff_turni FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "auth_all_turni"
  ON staff_turni FOR ALL
  USING (auth.role() = 'authenticated');
