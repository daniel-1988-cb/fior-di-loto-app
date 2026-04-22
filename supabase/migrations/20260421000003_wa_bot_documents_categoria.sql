ALTER TABLE wa_bot_documents
  ADD COLUMN IF NOT EXISTS categoria VARCHAR(50) NOT NULL DEFAULT 'generale';

CREATE INDEX IF NOT EXISTS idx_wa_bot_docs_categoria ON wa_bot_documents(categoria);
