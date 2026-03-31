-- AI Assistant: documents + query logs

CREATE TABLE IF NOT EXISTS ai_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descrizione TEXT,
  contenuto TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'generale',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_email TEXT
);

CREATE TABLE IF NOT EXISTS ai_query_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_email TEXT NOT NULL DEFAULT '',
  domanda TEXT NOT NULL,
  risposta TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
