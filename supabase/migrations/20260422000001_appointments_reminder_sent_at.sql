-- Track reminder send to avoid duplicate notifications on cron retry.
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS appointments_reminder_sent_at_idx
  ON appointments (data, reminder_sent_at);
