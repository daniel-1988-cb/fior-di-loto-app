CREATE TABLE IF NOT EXISTS wa_bot_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titolo VARCHAR(200) NOT NULL,
  contenuto TEXT NOT NULL,
  attivo BOOLEAN NOT NULL DEFAULT TRUE,
  ordine INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_bot_docs_attivo ON wa_bot_documents(attivo, ordine) WHERE attivo = TRUE;

ALTER TABLE wa_bot_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_wa_docs" ON wa_bot_documents FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "auth_read_wa_docs" ON wa_bot_documents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_write_wa_docs" ON wa_bot_documents FOR ALL USING (auth.role() = 'authenticated');
