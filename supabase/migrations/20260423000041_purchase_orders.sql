-- Purchase orders (ordini di stock verso fornitori).
-- purchase_order_items contiene le righe con snapshot del nome prodotto e
-- tracking quantita_ricevuta (per ricevimenti parziali). L'aggiornamento
-- di products.giacenza avviene in application-level (server action
-- receivePurchaseOrder) con best-effort atomicity.

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  numero_ordine VARCHAR(50),
  data_ordine DATE NOT NULL,
  data_consegna_attesa DATE,
  data_consegna_effettiva DATE,
  stato VARCHAR(20) NOT NULL DEFAULT 'in_attesa', -- in_attesa, in_transito, ricevuto, cancellato
  importo_totale NUMERIC(10,2) NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_stato
  ON purchase_orders(stato, data_ordine DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier
  ON purchase_orders(supplier_id, data_ordine DESC);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "svc_po" ON purchase_orders;
CREATE POLICY "svc_po" ON purchase_orders
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "auth_po" ON purchase_orders;
CREATE POLICY "auth_po" ON purchase_orders
  FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  nome_prodotto TEXT NOT NULL, -- snapshot at time of order
  quantita INTEGER NOT NULL,
  costo_unitario NUMERIC(10,2) NOT NULL,
  quantita_ricevuta INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poi_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_poi_product ON purchase_order_items(product_id);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "svc_poi" ON purchase_order_items;
CREATE POLICY "svc_poi" ON purchase_order_items
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "auth_poi" ON purchase_order_items;
CREATE POLICY "auth_poi" ON purchase_order_items
  FOR ALL USING (auth.role() = 'authenticated');
