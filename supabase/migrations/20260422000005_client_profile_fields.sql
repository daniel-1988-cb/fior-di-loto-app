-- Client profile quick-action fields used by the "Attività" menu in the
-- client drawer. Keep these as free-text TEXT columns (not JSON) so
-- operators can jot down arbitrary notes. Structured parsing lives
-- client-side.
--
-- `tags` is already present on `clients` as JSONB (see drizzle schema /
-- generated types), so we deliberately do NOT re-create it here.
--
-- `blocked` gates scheduling: when true, the UI hides/disables "Nuovo
-- appuntamento" and shows a red banner in the drawer.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS avviso_personale TEXT,
  ADD COLUMN IF NOT EXISTS allergie TEXT,
  ADD COLUMN IF NOT EXISTS patch_test TEXT,
  ADD COLUMN IF NOT EXISTS blocked BOOLEAN NOT NULL DEFAULT FALSE;

-- Partial index: queries only care about the small set of blocked clients.
CREATE INDEX IF NOT EXISTS idx_clients_blocked
  ON clients (blocked)
  WHERE blocked = TRUE;
