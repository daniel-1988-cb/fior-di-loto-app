-- Estende appointment_requests per supportare anche richieste di spostamento e cancellazione
-- Background: il bot Marialucia oggi inserisce SOLO booking pending_review per nuovi
-- appuntamenti. Stiamo aggiungendo gli intent reschedule_request e cancel_request
-- che vengono parcheggiati nella stessa tabella ma classificati per `tipo`.
--
-- Aggiunte:
-- - tipo: distingue nuovo (default, retro-compatibile) / spostamento / cancellazione
-- - appointment_id_ref: l'appuntamento esistente che il cliente vuole modificare/annullare
-- - proposed_datetime: orario proposto dal cliente (estratto dal testo) per lo spostamento
-- - proposed_alternatives: array di slot suggeriti dal bot quando il proposto non era libero
ALTER TABLE appointment_requests
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'nuovo'
    CHECK (tipo IN ('nuovo', 'spostamento', 'cancellazione')),
  ADD COLUMN IF NOT EXISTS appointment_id_ref UUID REFERENCES appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proposed_datetime TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS proposed_alternatives JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_appt_req_tipo ON appointment_requests(tipo, stato);
CREATE INDEX IF NOT EXISTS idx_appt_req_ref ON appointment_requests(appointment_id_ref);

COMMENT ON COLUMN appointment_requests.tipo IS 'nuovo=prenotazione nuova, spostamento=modifica appt esistente, cancellazione';
COMMENT ON COLUMN appointment_requests.appointment_id_ref IS 'L''appuntamento esistente che il cliente vuole spostare/cancellare (NULL per tipo=nuovo)';
COMMENT ON COLUMN appointment_requests.proposed_datetime IS 'Datetime proposto dal cliente per spostamento (NULL se non specificato)';
COMMENT ON COLUMN appointment_requests.proposed_alternatives IS 'Array di datetime ISO suggeriti dal bot al cliente quando lo slot richiesto non era libero';
