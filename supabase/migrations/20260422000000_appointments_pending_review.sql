-- Preliminary appointment requests from the WhatsApp bot.
-- When Marialucia detects a booking_request intent we don't yet know the
-- service/date/time, so we can't insert into `appointments` (NOT NULL
-- constraints). We park the raw request here; Laura then converts it into a
-- real appointment from the gestionale.

CREATE TABLE IF NOT EXISTS appointment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  testo_richiesta TEXT NOT NULL,
  stato VARCHAR(20) NOT NULL DEFAULT 'pending_review',
  note_operatore TEXT,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_appt_requests_stato
  ON appointment_requests(stato, created_at DESC);

ALTER TABLE appointment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_appt_req"
  ON appointment_requests FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "auth_read_appt_req"
  ON appointment_requests FOR SELECT
  USING (auth.role() = 'authenticated');
