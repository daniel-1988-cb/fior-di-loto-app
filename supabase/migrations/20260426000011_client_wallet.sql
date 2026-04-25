-- Saldo prepagato per cliente (acconti, rimborsi a credito, ricariche)
CREATE TABLE IF NOT EXISTS client_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  -- tipo: ricarica (saldo+) | utilizzo (saldo-) | rimborso (saldo+) | aggiustamento
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('ricarica','utilizzo','rimborso','aggiustamento')),
  importo NUMERIC(10,2) NOT NULL,
  descrizione TEXT,
  saldo_dopo NUMERIC(10,2) NOT NULL,
  appointment_id UUID,
  transaction_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_client ON client_wallet_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_wallet_created ON client_wallet_transactions(created_at);

ALTER TABLE client_wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_wallet" ON client_wallet_transactions;
CREATE POLICY "service_role_all_wallet" ON client_wallet_transactions
  FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "auth_all_wallet" ON client_wallet_transactions;
CREATE POLICY "auth_all_wallet" ON client_wallet_transactions
  FOR ALL USING (auth.role() = 'authenticated');
