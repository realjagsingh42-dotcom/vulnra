-- API keys table for programmatic access (CI/CD, automation)
CREATE TABLE IF NOT EXISTS api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,
  name         TEXT NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,   -- SHA-256 of the raw key
  key_prefix   TEXT NOT NULL,          -- first 8 chars after vk_live_ (display only)
  last_used_at TIMESTAMPTZ DEFAULT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  revoked      BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS api_keys_user_id_idx  ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys (key_hash);

-- RLS: users can only see/modify their own keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY api_keys_owner ON api_keys
  USING (user_id = auth.uid());
