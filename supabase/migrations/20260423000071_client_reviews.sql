-- Recensioni ricevute dal form interno. Ogni riga corrisponde a una submit
-- sulla landing /recensione/[token]. published_google indica che l'utente è
-- stato reindirizzato a Google Maps (non garantisce che la review pubblica
-- sia effettivamente stata scritta, solo che è stata offerta l'opportunità).
CREATE TABLE IF NOT EXISTS client_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  review_request_id UUID REFERENCES review_requests(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  testo TEXT,
  published_google BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_reviews_client ON client_reviews(client_id, created_at DESC);
ALTER TABLE client_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "svc_cr" ON client_reviews FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "auth_cr" ON client_reviews FOR ALL USING (auth.role() = 'authenticated');
