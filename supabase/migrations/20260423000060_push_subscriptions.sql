-- Web Push subscription store (PWA notifications).
-- Un record per endpoint device (un utente può avere più dispositivi).

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  label TEXT,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_subs_last_seen ON push_subscriptions(last_seen DESC);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "svc_push" ON push_subscriptions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "auth_read_push" ON push_subscriptions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_write_own_push" ON push_subscriptions FOR ALL USING (auth.role() = 'authenticated');
