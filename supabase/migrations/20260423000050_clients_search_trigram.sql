-- Speed up ilike searches on clients (used by client picker combobox).
-- pg_trgm makes %text% searches use GIN index instead of full scan.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_clients_nome_trgm ON clients USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clients_cognome_trgm ON clients USING gin (cognome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clients_telefono_trgm ON clients USING gin (telefono gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clients_email_trgm ON clients USING gin (email gin_trgm_ops);
