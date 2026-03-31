CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codice TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL DEFAULT 'importo', -- 'servizio', 'prodotto', 'importo'
  valore NUMERIC(10,2) NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  destinatario_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  acquistato_da_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  descrizione TEXT,
  data_scadenza DATE,
  usato BOOLEAN NOT NULL DEFAULT FALSE,
  data_uso TIMESTAMPTZ,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
