-- Marketing campaigns — bulk send to a client segment via WA/email/SMS.
-- The cron /api/cron/marketing-send picks up stato='programmata' rows whose
-- schedule_at is in the past, flips them to 'in_invio', and iterates the
-- target segment calling sendMessage / sendEmail.

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  canale VARCHAR(20) NOT NULL, -- whatsapp, email, sms
  segmento_target VARCHAR(30), -- nullable = tutti
  subject TEXT, -- per email
  body TEXT NOT NULL,
  schedule_at TIMESTAMPTZ,
  stato VARCHAR(20) NOT NULL DEFAULT 'bozza', -- bozza, programmata, in_invio, inviata, errore
  sent_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_schedule
  ON campaigns(stato, schedule_at)
  WHERE stato = 'programmata';

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "svc_camp" ON campaigns;
CREATE POLICY "svc_camp" ON campaigns
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "auth_camp" ON campaigns;
CREATE POLICY "auth_camp" ON campaigns
  FOR ALL USING (auth.role() = 'authenticated');
