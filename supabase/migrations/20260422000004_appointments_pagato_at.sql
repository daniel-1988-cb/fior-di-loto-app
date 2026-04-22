-- Track when an appointment was paid (cash-in at checkout).
-- Decoupled from `stato`: stato=completato means "service done",
-- pagato_at IS NOT NULL means "payment collected". These can diverge
-- (e.g. appointment completed but invoice still open).

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS pagato_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_appointments_pagato_at
  ON appointments (pagato_at)
  WHERE pagato_at IS NOT NULL;
