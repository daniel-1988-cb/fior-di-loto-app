-- Documenti caricati per cliente (consenso, foto, doc identità, contratti, ecc)
CREATE TABLE IF NOT EXISTS client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  nome VARCHAR(200) NOT NULL,
  tipo VARCHAR(40) NOT NULL DEFAULT 'altro', -- consenso|identita|contratto|foto|altro
  storage_path TEXT NOT NULL,        -- path nel bucket 'client-documents'
  mime_type VARCHAR(100),
  size_bytes BIGINT,
  uploaded_by UUID,                   -- user id (auth.users)
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_docs_client ON client_documents(client_id);

ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_client_docs" ON client_documents;
CREATE POLICY "service_role_all_client_docs" ON client_documents
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "auth_all_client_docs" ON client_documents;
CREATE POLICY "auth_all_client_docs" ON client_documents
  FOR ALL USING (auth.role() = 'authenticated');
