-- ─────────────────────────────────────────────────────────────────────────────
-- VULNRA — Complete Database Schema (idempotent, safe to re-run)
-- Apply via: Supabase Dashboard → SQL Editor → paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. PROFILES ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT,
  full_name         TEXT,
  org_name          TEXT,
  tier              TEXT    NOT NULL DEFAULT 'free'
                              CHECK (tier IN ('free', 'pro', 'enterprise')),
  scan_count_today  INT     NOT NULL DEFAULT 0,
  last_scan_date    DATE,
  lemon_customer_id TEXT,
  lemon_sub_id      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on new sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles: own row') THEN
    CREATE POLICY "profiles: own row" ON public.profiles FOR ALL USING (auth.uid() = id);
  END IF;
END $$;

-- ── 2. SCANS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scans (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_url      TEXT        NOT NULL,
  tier            TEXT        NOT NULL DEFAULT 'free'
                                CHECK (tier IN ('free', 'pro', 'enterprise')),
  status          TEXT        NOT NULL DEFAULT 'queued'
                                CHECK (status IN ('queued', 'scanning', 'complete', 'failed')),
  scan_engine     TEXT,
  scan_mode       TEXT        DEFAULT 'standard'
                                CHECK (scan_mode IN ('standard', 'deep', 'stealth')),
  risk_score      NUMERIC(4,1),
  findings        JSONB,
  compliance      JSONB,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  error_message   TEXT,
  -- Sharing
  share_token     UUID        DEFAULT NULL,
  share_expires_at TIMESTAMPTZ DEFAULT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generated columns — add only if Postgres version supports them
-- findings_count and duration_ms are computed at query time via views instead

CREATE UNIQUE INDEX IF NOT EXISTS scans_share_token_idx     ON public.scans (share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS scans_user_id_idx                ON public.scans (user_id);
CREATE INDEX IF NOT EXISTS scans_status_idx                 ON public.scans (status);
CREATE INDEX IF NOT EXISTS scans_created_at_idx             ON public.scans (created_at DESC);
CREATE INDEX IF NOT EXISTS scans_user_created_idx           ON public.scans (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS scans_risk_score_idx             ON public.scans (risk_score DESC);

-- Add share columns to existing table if upgrading
ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS share_token      UUID        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='scans' AND policyname='scans: own rows') THEN
    CREATE POLICY "scans: own rows" ON public.scans FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 3. LOGIN ACTIVITY ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.login_activity (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider       TEXT        NOT NULL DEFAULT 'email'
                               CHECK (provider IN ('email', 'google', 'github')),
  ip_address     TEXT,
  user_agent     TEXT,
  country        TEXT,
  city           TEXT,
  logged_in_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  success        BOOL        NOT NULL DEFAULT true,
  failure_reason TEXT
);

CREATE INDEX IF NOT EXISTS login_user_idx ON public.login_activity (user_id);
CREATE INDEX IF NOT EXISTS login_time_idx ON public.login_activity (logged_in_at DESC);
CREATE INDEX IF NOT EXISTS login_ip_idx   ON public.login_activity (ip_address);

ALTER TABLE public.login_activity ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='login_activity' AND policyname='login_activity: own rows') THEN
    CREATE POLICY "login_activity: own rows" ON public.login_activity FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 4. API KEYS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_keys (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL,
  name         TEXT        NOT NULL,
  key_hash     TEXT        NOT NULL UNIQUE,
  key_prefix   TEXT        NOT NULL,
  last_used_at TIMESTAMPTZ DEFAULT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked      BOOLEAN     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS api_keys_user_id_idx  ON public.api_keys (user_id);
CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx ON public.api_keys (key_hash);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='api_keys' AND policyname='api_keys_owner') THEN
    CREATE POLICY "api_keys_owner" ON public.api_keys USING (user_id = auth.uid());
  END IF;
END $$;

-- ── 5. SENTINEL WATCHES ──────────────────────────────────────────────────────
-- Schema matches supabase_service.py:
--   columns used: id, url, interval_hours, tier, last_scan, last_risk_score,
--                 notification_email, active, user_id, created_at
CREATE TABLE IF NOT EXISTS public.sentinel_watches (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL,
  url                TEXT        NOT NULL,
  interval_hours     INT         NOT NULL DEFAULT 24,
  tier               TEXT        NOT NULL DEFAULT 'pro',
  last_scan          TIMESTAMPTZ DEFAULT NULL,
  last_risk_score    FLOAT       DEFAULT NULL,
  notification_email TEXT        DEFAULT NULL,
  active             BOOLEAN     NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe column additions if upgrading a partial schema
ALTER TABLE public.sentinel_watches
  ADD COLUMN IF NOT EXISTS url                TEXT        DEFAULT '',
  ADD COLUMN IF NOT EXISTS interval_hours     INT         NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS tier               TEXT        NOT NULL DEFAULT 'pro',
  ADD COLUMN IF NOT EXISTS last_scan          TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_risk_score    FLOAT       DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notification_email TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS active             BOOLEAN     NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS sentinel_watches_user_id_idx ON public.sentinel_watches (user_id);
CREATE INDEX IF NOT EXISTS sentinel_watches_active_idx  ON public.sentinel_watches (active, last_scan);

ALTER TABLE public.sentinel_watches ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sentinel_watches' AND policyname='sentinel_watches_owner') THEN
    CREATE POLICY "sentinel_watches_owner" ON public.sentinel_watches USING (user_id = auth.uid());
  END IF;
END $$;

-- ── 6. SCAN HISTORY VIEW ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.scan_history AS
  SELECT
    s.id,
    s.user_id,
    p.email,
    p.org_name,
    p.tier,
    s.target_url,
    s.status,
    s.risk_score,
    COALESCE(jsonb_array_length(s.findings), 0) AS findings_count,
    s.scan_engine,
    s.scan_mode,
    CASE WHEN s.completed_at IS NOT NULL
         THEN EXTRACT(EPOCH FROM (s.completed_at - s.started_at))::INT * 1000
         ELSE NULL END                           AS duration_ms,
    s.started_at,
    s.completed_at,
    s.created_at
  FROM public.scans s
  JOIN public.profiles p ON p.id = s.user_id;

-- ── 7. ORGANIZATIONS (Enterprise) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organizations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  owner_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  tier       VARCHAR(32) NOT NULL DEFAULT 'enterprise',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON public.organizations (owner_id);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='organizations' AND policyname='org_select_member') THEN
    CREATE POLICY "org_select_member" ON public.organizations FOR SELECT
      USING (id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='organizations' AND policyname='org_insert_owner') THEN
    CREATE POLICY "org_insert_owner" ON public.organizations FOR INSERT
      WITH CHECK (owner_id = auth.uid());
  END IF;
END $$;

-- ── 8. ORGANIZATION MEMBERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organization_members (
  org_id    UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role      VARCHAR(32) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members (user_id);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='organization_members' AND policyname='org_members_select') THEN
    CREATE POLICY "org_members_select" ON public.organization_members FOR SELECT
      USING (org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='organization_members' AND policyname='org_members_service_manage') THEN
    CREATE POLICY "org_members_service_manage" ON public.organization_members FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ── 9. ORGANIZATION INVITES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organization_invites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  role        VARCHAR(32) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  token       TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_invites_token  ON public.organization_invites (token);
CREATE INDEX IF NOT EXISTS idx_org_invites_email  ON public.organization_invites (email);
CREATE INDEX IF NOT EXISTS idx_org_invites_org_id ON public.organization_invites (org_id);

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='organization_invites' AND policyname='org_invites_select_by_token') THEN
    CREATE POLICY "org_invites_select_by_token" ON public.organization_invites FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='organization_invites' AND policyname='org_invites_service_manage') THEN
    CREATE POLICY "org_invites_service_manage" ON public.organization_invites FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ── 10. AUDIT LOGS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  org_id      UUID        REFERENCES public.organizations(id) ON DELETE SET NULL,
  action      TEXT        NOT NULL,
  resource_id TEXT        NOT NULL DEFAULT '',
  ip_address  INET,
  user_agent  TEXT,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id     ON public.audit_logs (org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_logs' AND policyname='audit_logs_select_admin') THEN
    CREATE POLICY "audit_logs_select_admin" ON public.audit_logs FOR SELECT
      USING (org_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid() AND role = 'admin'
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_logs' AND policyname='audit_logs_service_insert') THEN
    CREATE POLICY "audit_logs_service_insert" ON public.audit_logs FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ── 11. RAG SCANS ─────────────────────────────────────────────────────────────
-- Stores results from the RAG Security Scanner (Sprint 6)
CREATE TABLE IF NOT EXISTS public.rag_scans (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  retrieval_endpoint        TEXT        NOT NULL,
  status                    TEXT        NOT NULL DEFAULT 'queued'
                                          CHECK (status IN ('queued', 'scanning', 'complete', 'failed')),
  tier                      TEXT        NOT NULL DEFAULT 'free',
  risk_score                FLOAT       DEFAULT NULL,
  corpus_poisoning_rate     FLOAT       DEFAULT NULL,
  cross_tenant_leakage      BOOLEAN     DEFAULT NULL,
  unauthenticated_ingestion BOOLEAN     DEFAULT NULL,
  embedding_vectors_exposed BOOLEAN     DEFAULT NULL,
  findings                  JSONB       DEFAULT '[]',
  scan_duration             FLOAT       DEFAULT NULL,
  error_message             TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at              TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS rag_scans_user_id_idx    ON public.rag_scans (user_id);
CREATE INDEX IF NOT EXISTS rag_scans_created_at_idx ON public.rag_scans (created_at DESC);

ALTER TABLE public.rag_scans ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rag_scans' AND policyname='rag_scans: own rows') THEN
    CREATE POLICY "rag_scans: own rows" ON public.rag_scans FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
