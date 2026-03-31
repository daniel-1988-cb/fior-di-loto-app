-- Social Competitor Tracker

CREATE TABLE IF NOT EXISTS social_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  handle TEXT NOT NULL,
  piattaforma TEXT NOT NULL DEFAULT 'instagram',
  follower INTEGER DEFAULT 0,
  post_totali INTEGER DEFAULT 0,
  freq_settimanale NUMERIC(4,1) DEFAULT 0,
  engagement_rate NUMERIC(5,2) DEFAULT 0,
  ultimo_aggiornamento DATE,
  note TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competitor_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES social_competitors(id) ON DELETE CASCADE,
  follower INTEGER,
  post_totali INTEGER,
  freq_settimanale NUMERIC(4,1),
  engagement_rate NUMERIC(5,2),
  data_rilevazione DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
