-- Configurazione follow-up per servizio (e default globali via service_id NULL)
-- offset_hours: -12 = 12h prima dell'appt, +12 = 12h dopo, +24 = 24h dopo, ecc.
-- Niente -24 (gestito dal cron reminders esistente).

CREATE TABLE IF NOT EXISTS service_followup_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services(id) ON DELETE CASCADE, -- NULL = default globale
  offset_hours INTEGER NOT NULL CHECK (offset_hours BETWEEN -168 AND 168 AND offset_hours <> 0 AND offset_hours <> -24),
  message_template TEXT NOT NULL,
  attivo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (service_id, offset_hours)
);

CREATE INDEX IF NOT EXISTS idx_followup_service ON service_followup_rules(service_id);
CREATE INDEX IF NOT EXISTS idx_followup_active ON service_followup_rules(attivo) WHERE attivo = TRUE;

ALTER TABLE service_followup_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_followup_rules" ON service_followup_rules;
CREATE POLICY "service_role_all_followup_rules" ON service_followup_rules
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "auth_all_followup_rules" ON service_followup_rules;
CREATE POLICY "auth_all_followup_rules" ON service_followup_rules
  FOR ALL USING (auth.role() = 'authenticated');


-- Dedup invii follow-up per (appointment, rule). Una sola riga per coppia.
CREATE TABLE IF NOT EXISTS appointment_followups_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES service_followup_rules(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
  status VARCHAR(20) NOT NULL DEFAULT 'sent', -- sent | failed | skipped
  error TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (appointment_id, rule_id)
);

CREATE INDEX IF NOT EXISTS idx_followup_sent_appt ON appointment_followups_sent(appointment_id);
CREATE INDEX IF NOT EXISTS idx_followup_sent_at ON appointment_followups_sent(sent_at);

ALTER TABLE appointment_followups_sent ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_followup_sent" ON appointment_followups_sent;
CREATE POLICY "service_role_all_followup_sent" ON appointment_followups_sent
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "auth_all_followup_sent" ON appointment_followups_sent;
CREATE POLICY "auth_all_followup_sent" ON appointment_followups_sent
  FOR ALL USING (auth.role() = 'authenticated');
