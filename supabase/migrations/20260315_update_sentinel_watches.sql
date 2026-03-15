-- Create sentinel_watches with full schema (safe to run on fresh or partial table)
CREATE TABLE IF NOT EXISTS sentinel_watches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  url             TEXT NOT NULL,
  interval_hours  INT NOT NULL DEFAULT 24,
  tier            TEXT NOT NULL DEFAULT 'pro',
  last_scan       TIMESTAMPTZ DEFAULT NULL,
  last_risk_score FLOAT DEFAULT NULL,
  notification_email TEXT DEFAULT NULL,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Add any missing columns if the table already existed with partial schema
ALTER TABLE sentinel_watches
  ADD COLUMN IF NOT EXISTS user_id            UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  ADD COLUMN IF NOT EXISTS tier               TEXT NOT NULL DEFAULT 'pro',
  ADD COLUMN IF NOT EXISTS last_risk_score    FLOAT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notification_email TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS active             BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS interval_hours     INT NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS last_scan          TIMESTAMPTZ DEFAULT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS sentinel_watches_user_id_idx ON sentinel_watches (user_id);
CREATE INDEX IF NOT EXISTS sentinel_watches_active_idx  ON sentinel_watches (active, last_scan);

-- RLS
ALTER TABLE sentinel_watches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sentinel_watches' AND policyname = 'sentinel_watches_owner'
  ) THEN
    CREATE POLICY sentinel_watches_owner ON sentinel_watches USING (user_id = auth.uid());
  END IF;
END $$;
