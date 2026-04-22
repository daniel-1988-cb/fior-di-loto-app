-- Blocked time slots ("Fasce orarie bloccate") — non-appointment blocks
-- on staff calendars (pauses, training, vacation, custom blocks).
-- Kept separate from `appointments` because that table requires NOT NULL
-- client_id/service_id which don't apply here.

CREATE TABLE IF NOT EXISTS blocked_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  ora_inizio TIME NOT NULL,
  ora_fine TIME NOT NULL,
  tipo VARCHAR(30) NOT NULL DEFAULT 'personalizza', -- personalizza | formazione | ferie | pausa | altro
  titolo TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ora_fine > ora_inizio)
);

CREATE INDEX IF NOT EXISTS idx_blocked_slots_staff_data ON blocked_slots (staff_id, data);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_data ON blocked_slots (data);

ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_blocked_slots"
  ON blocked_slots FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "auth_read_blocked_slots"
  ON blocked_slots FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "auth_write_blocked_slots"
  ON blocked_slots FOR ALL
  USING (auth.role() = 'authenticated');
