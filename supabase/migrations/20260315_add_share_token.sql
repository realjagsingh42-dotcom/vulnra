-- Add share_token to scans table for public report sharing
ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Unique index so we can look up scans by token quickly
CREATE UNIQUE INDEX IF NOT EXISTS scans_share_token_idx ON scans (share_token)
  WHERE share_token IS NOT NULL;
