-- Suppliers / fornitori anagrafica.
-- Usato dai purchase_orders per l'ordinamento merce; indipendente da
-- products (un fornitore può non avere prodotti in catalogo).

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(200) NOT NULL,
  partita_iva VARCHAR(20),
  codice_fiscale VARCHAR(20),
  email VARCHAR(255),
  telefono VARCHAR(50),
  indirizzo TEXT,
  referente TEXT,
  note TEXT,
  attivo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_attivo ON suppliers(attivo, nome);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "svc_suppliers" ON suppliers;
CREATE POLICY "svc_suppliers" ON suppliers
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "auth_suppliers" ON suppliers;
CREATE POLICY "auth_suppliers" ON suppliers
  FOR ALL USING (auth.role() = 'authenticated');
