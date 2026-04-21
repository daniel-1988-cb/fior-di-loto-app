-- Bot WhatsApp (Marialucia) — tables and RLS

CREATE TABLE IF NOT EXISTS wa_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  assigned_to UUID REFERENCES users(id),
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wa_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  meta_message_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wa_conv_client_created ON wa_conversations(client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS wa_templates_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_template_name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(30) NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'it',
  body TEXT NOT NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wa_message_buffer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_wa_buffer_phone_received ON wa_message_buffer(phone, received_at);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS wa_opt_in BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS wa_last_seen TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS wa_phone_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE wa_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_templates_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_message_buffer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_threads" ON wa_threads FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_conv" ON wa_conversations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_tpl" ON wa_templates_meta FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_buf" ON wa_message_buffer FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "auth_read_threads" ON wa_threads FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read_conv" ON wa_conversations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read_tpl" ON wa_templates_meta FOR SELECT USING (auth.role() = 'authenticated');
