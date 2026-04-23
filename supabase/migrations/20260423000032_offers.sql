-- Offers / promo codes catalog.
-- Tracked centrally so campaigns, landing pages and staff can reference the
-- same `codice`. `usi_correnti` is incremented manually (via admin UI) or
-- by future checkout integrations; `max_usi` is a soft cap enforced in
-- application code.

CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codice VARCHAR(30) NOT NULL UNIQUE,
  descrizione TEXT,
  tipo_sconto VARCHAR(10) NOT NULL, -- percentuale | importo
  valore_sconto NUMERIC(10,2) NOT NULL,
  validita_da DATE,
  validita_a DATE,
  max_usi INTEGER,
  usi_correnti INTEGER NOT NULL DEFAULT 0,
  segmenti_applicabili JSONB DEFAULT '[]'::jsonb,
  attivo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offers_codice
  ON offers(codice)
  WHERE attivo = true;

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "svc_offers" ON offers;
CREATE POLICY "svc_offers" ON offers
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "auth_offers" ON offers;
CREATE POLICY "auth_offers" ON offers
  FOR ALL USING (auth.role() = 'authenticated');
