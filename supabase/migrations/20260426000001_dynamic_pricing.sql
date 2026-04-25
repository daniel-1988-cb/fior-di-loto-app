-- Dynamic pricing rules: sconti/maggiorazioni per fasce orarie/giorni
-- Permette regole tipo "sconto 10% lun-mer 09:00-12:00 su tutti i servizi"
-- o "maggiorazione 5% sabato 17:00-20:00 sul servizio X"

CREATE TABLE IF NOT EXISTS dynamic_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(120) NOT NULL,
  descrizione TEXT,
  -- adjust_type: 'sconto' (riduce prezzo) | 'maggiorazione' (aumenta prezzo)
  adjust_type VARCHAR(20) NOT NULL CHECK (adjust_type IN ('sconto','maggiorazione')),
  -- adjust_kind: 'percentuale' (es 10 = -10%) | 'fisso' (es 5 = -5€)
  adjust_kind VARCHAR(20) NOT NULL CHECK (adjust_kind IN ('percentuale','fisso')),
  adjust_value NUMERIC(10,2) NOT NULL CHECK (adjust_value >= 0),
  -- giorni_settimana: array di interi 0-6 (0=domenica), [] = tutti i giorni
  giorni_settimana INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  -- ora_inizio / ora_fine: HH:MM, NULL = tutto il giorno
  ora_inizio TIME,
  ora_fine TIME,
  -- servizi_target: array di service uuid, [] = tutti i servizi
  servizi_target UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  -- date_inizio / date_fine: range opzionale (NULL = sempre attivo)
  data_inizio DATE,
  data_fine DATE,
  priorita INTEGER NOT NULL DEFAULT 100,
  attivo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_active ON dynamic_pricing_rules(attivo);
CREATE INDEX IF NOT EXISTS idx_pricing_priority ON dynamic_pricing_rules(priorita);

ALTER TABLE dynamic_pricing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_pricing" ON dynamic_pricing_rules;
CREATE POLICY "service_role_all_pricing" ON dynamic_pricing_rules
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "auth_all_pricing" ON dynamic_pricing_rules;
CREATE POLICY "auth_all_pricing" ON dynamic_pricing_rules
  FOR ALL USING (auth.role() = 'authenticated');
