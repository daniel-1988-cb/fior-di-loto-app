-- Unique index parziale su clients.telefono per prevenire duplicati da webhook bot
-- (due messaggi simultanei sullo stesso numero potrebbero altrimenti creare 2 righe).
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_telefono_unique
  ON clients (telefono)
  WHERE telefono IS NOT NULL;
