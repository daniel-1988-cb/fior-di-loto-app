-- Transaction line items (Fase 2 checkout — carrello multi-item).
-- Ogni transaction può avere N line items (servizi, prodotti, abbonamenti,
-- voucher, card regalo). Le card regalo in vendita generano a loro volta
-- un voucher nuovo — quell'id viene salvato in `generated_voucher_id` così
-- da poter ristampare il codice a partire dalla transazione.

CREATE TABLE IF NOT EXISTS transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  kind VARCHAR(20) NOT NULL, -- servizio | prodotto | abbonamento | voucher | card_regalo
  ref_id UUID, -- id servizio/prodotto/voucher se applicabile, null per card regalo custom
  label TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  generated_voucher_id UUID REFERENCES vouchers(id) ON DELETE SET NULL, -- per card_regalo: voucher creato al checkout
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_items_transaction ON transaction_items(transaction_id);

ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_tx_items"
  ON transaction_items FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "auth_read_tx_items"
  ON transaction_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "auth_write_tx_items"
  ON transaction_items FOR ALL
  USING (auth.role() = 'authenticated');
