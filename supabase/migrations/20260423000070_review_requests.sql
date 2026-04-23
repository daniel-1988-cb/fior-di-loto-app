-- Richieste recensione inviate post-visita (WA/SMS/email)
-- Landing interna /recensione/[token] raccoglie rating + testo; se rating >=4 e
-- business_settings.google_review_url presente, reindirizziamo il cliente su
-- Google Maps per la pubblica. Il token è l'unico identificatore usato dal
-- link tracciato /api/r/[token] → /recensione/[token].
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  token VARCHAR(32) NOT NULL UNIQUE,
  canale VARCHAR(20) NOT NULL DEFAULT 'whatsapp', -- whatsapp|sms|email
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clicked_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  rating INTEGER,
  feedback_text TEXT,
  redirected_google BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_review_req_client ON review_requests(client_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_req_appt ON review_requests(appointment_id);
CREATE INDEX IF NOT EXISTS idx_review_req_token ON review_requests(token);
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "svc_rr" ON review_requests FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "auth_rr" ON review_requests FOR ALL USING (auth.role() = 'authenticated');
-- La landing pubblica legge/scrive via service_role (route handler, niente anon).
