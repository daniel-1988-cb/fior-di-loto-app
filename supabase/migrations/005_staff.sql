CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cognome TEXT DEFAULT '',
  ruolo TEXT NOT NULL DEFAULT 'operatrice',
  colore TEXT NOT NULL DEFAULT '#e8a4a4',
  attiva BOOLEAN NOT NULL DEFAULT TRUE,
  orario_inizio TIME NOT NULL DEFAULT '09:00',
  orario_fine TIME NOT NULL DEFAULT '19:00',
  giorni_lavoro INTEGER[] DEFAULT '{1,2,3,4,5,6}',
  obiettivo_mensile NUMERIC(10,2) DEFAULT 0,
  telefono TEXT,
  email TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_ferie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  data_inizio DATE NOT NULL,
  data_fine DATE NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'ferie',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff(id) ON DELETE SET NULL;

INSERT INTO staff (nome, ruolo, colore) VALUES
  ('Jessica', 'operatrice', '#FF9AA2'),
  ('Rosa', 'operatrice', '#FFB7B2'),
  ('Gloria', 'operatrice', '#FFDAC1'),
  ('Laura', 'titolare', '#B5EAD7'),
  ('Daniel', 'manager', '#C7CEEA'),
  ('Marialucia', 'operatrice', '#E2F0CB')
ON CONFLICT DO NOTHING;
