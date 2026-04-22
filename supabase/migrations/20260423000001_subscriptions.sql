-- Subscriptions (abbonamenti catalogo) — Fase 2 MVP
-- Pacchetti ricorrenti/prepagati venduti dal centro (sedute incluse, validità,
-- servizi coperti). Istanze vendute ai clienti vengono registrate come
-- transaction_items con kind='abbonamento' che referenzia subscriptions.id.

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(200) NOT NULL,
  descrizione TEXT,
  sedute_totali INTEGER NOT NULL,
  validita_giorni INTEGER, -- NULL = illimitato
  prezzo NUMERIC(10,2) NOT NULL,
  servizi_inclusi JSONB DEFAULT '[]'::jsonb, -- array of service UUIDs
  attivo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_subs" ON subscriptions;
CREATE POLICY "service_role_all_subs" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "auth_all_subs" ON subscriptions;
CREATE POLICY "auth_all_subs" ON subscriptions
  FOR ALL USING (auth.role() = 'authenticated');
