-- Rule-based marketing automations.
-- The cron /api/cron/marketing-automations iterates active rules once/day
-- (09:00 Rome), evaluates `trigger_tipo` + `trigger_config` against clients,
-- and sends a single message per matching client per day. Each send is
-- logged in sent_messages with a dedup guard on (client_id, canale, day).

CREATE TABLE IF NOT EXISTS marketing_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  trigger_tipo VARCHAR(40) NOT NULL, -- inattivita_giorni, nuovo_cliente, compleanno, post_visita
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- es {"giorni":60}
  canale VARCHAR(20) NOT NULL,
  body TEXT NOT NULL,
  attivo BOOLEAN NOT NULL DEFAULT FALSE,
  ultima_esecuzione TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE marketing_automations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "svc_autom" ON marketing_automations;
CREATE POLICY "svc_autom" ON marketing_automations
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "auth_autom" ON marketing_automations;
CREATE POLICY "auth_autom" ON marketing_automations
  FOR ALL USING (auth.role() = 'authenticated');
