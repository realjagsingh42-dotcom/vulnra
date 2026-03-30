-- ─────────────────────────────────────────────────────────────────────────────
-- VULNRA — SSO Schema Migration
-- Apply via: Supabase Dashboard → SQL Editor → paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- PASS 1 — SSO TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- SSO configurations per organization
CREATE TABLE IF NOT EXISTS public.sso_configs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider_type     TEXT        NOT NULL CHECK (provider_type IN ('saml', 'oidc')),
  provider_name     TEXT,       -- e.g., 'okta', 'azure', 'google', 'generic'
  idp_entity_id     TEXT,       -- SAML Entity ID or OIDC Issuer URL
  idp_sso_url       TEXT,       -- SSO Login URL
  idp_certificate   TEXT,       -- X.509 Certificate (PEM format)
  idp_logout_url    TEXT,       -- Single Logout URL
  sp_entity_id      TEXT,       -- Our Service Provider Entity ID
  client_id         TEXT,       -- OIDC Client ID
  client_secret     TEXT,       -- OIDC Client Secret (encrypted)
  scopes            TEXT,       -- OIDC scopes (space-separated)
  enabled           BOOLEAN     DEFAULT false,
  require_signed_assertions BOOLEAN DEFAULT true,
  allowed_domains   TEXT[],     -- Email domains allowed for this IdP
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_tested_at    TIMESTAMPTZ,
  last_test_status  TEXT,
  UNIQUE(org_id, provider_type)
);

-- SSO identities - links IdP users to Supabase users
CREATE TABLE IF NOT EXISTS public.sso_identities (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id          UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sso_config_id   UUID        NOT NULL REFERENCES public.sso_configs(id) ON DELETE CASCADE,
  idp_subject     TEXT        NOT NULL,  -- SAML nameID or OIDC sub
  idp_email       TEXT,       -- Email from IdP
  idp_name         TEXT,       -- Display name from IdP
  first_login_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, idp_subject)
);

-- SSO login sessions (for OAuth flow state)
CREATE TABLE IF NOT EXISTS public.sso_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sso_config_id   UUID        NOT NULL REFERENCES public.sso_configs(id) ON DELETE CASCADE,
  state           TEXT        NOT NULL UNIQUE,  -- OAuth state token
  redirect_uri    TEXT,       -- Where to redirect after auth
  code_verifier   TEXT,       -- PKCE code verifier
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_sso_configs_org_id    ON public.sso_configs (org_id);
CREATE INDEX IF NOT EXISTS idx_sso_configs_enabled    ON public.sso_configs (enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_sso_identities_user_id ON public.sso_identities (user_id);
CREATE INDEX IF NOT EXISTS idx_sso_identities_org_id  ON public.sso_identities (org_id);
CREATE INDEX IF NOT EXISTS idx_sso_identities_email   ON public.sso_identities (idp_email);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_state     ON public.sso_sessions (state);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_expires   ON public.sso_sessions (expires_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- PASS 2 — ENABLE RLS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.sso_configs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sso_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sso_sessions    ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- PASS 3 — RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

-- sso_configs: org admins can manage
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sso_configs' AND policyname='sso_configs_select_org') THEN
    CREATE POLICY "sso_configs_select_org" ON public.sso_configs FOR SELECT
      USING (org_id IN (
        SELECT org_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sso_configs' AND policyname='sso_configs_insert_org') THEN
    CREATE POLICY "sso_configs_insert_org" ON public.sso_configs FOR INSERT
      WITH CHECK (org_id IN (
        SELECT org_id FROM public.organization_members WHERE user_id = auth.uid() AND role = 'owner'
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sso_configs' AND policyname='sso_configs_update_org') THEN
    CREATE POLICY "sso_configs_update_org" ON public.sso_configs FOR UPDATE
      USING (org_id IN (
        SELECT org_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      ))
      WITH CHECK (org_id IN (
        SELECT org_id FROM public.organization_members WHERE user_id = auth.uid() AND role = 'owner'
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sso_configs' AND policyname='sso_configs_delete_org') THEN
    CREATE POLICY "sso_configs_delete_org" ON public.sso_configs FOR DELETE
      USING (org_id IN (
        SELECT org_id FROM public.organization_members WHERE user_id = auth.uid() AND role = 'owner'
      ));
  END IF;
END $$;

-- sso_identities: users can read their own, org admins can read all
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sso_identities' AND policyname='sso_identities_select_own') THEN
    CREATE POLICY "sso_identities_select_own" ON public.sso_identities FOR SELECT
      USING (user_id = auth.uid() OR org_id IN (
        SELECT org_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sso_identities' AND policyname='sso_identities_insert_service') THEN
    CREATE POLICY "sso_identities_insert_service" ON public.sso_identities FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- sso_sessions: service role only (used during auth flow)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sso_sessions' AND policyname='sso_sessions_service_all') THEN
    CREATE POLICY "sso_sessions_service_all" ON public.sso_sessions FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Clean up expired SSO sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sso_sessions()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.sso_sessions WHERE expires_at < now();
END;
$$;

-- Get SSO config with masked secrets (for API responses)
CREATE OR REPLACE FUNCTION public.get_sso_config_safe(p_org_id UUID, p_provider_type TEXT)
RETURNS TABLE (
  id               UUID,
  org_id           UUID,
  provider_type    TEXT,
  provider_name    TEXT,
  idp_entity_id    TEXT,
  idp_sso_url      TEXT,
  enabled          BOOLEAN,
  allowed_domains  TEXT[],
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ,
  last_tested_at   TIMESTAMPTZ,
  last_test_status TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id,
    sc.org_id,
    sc.provider_type,
    sc.provider_name,
    sc.idp_entity_id,
    sc.idp_sso_url,
    sc.enabled,
    sc.allowed_domains,
    sc.created_at,
    sc.updated_at,
    sc.last_tested_at,
    sc.last_test_status
  FROM public.sso_configs sc
  WHERE sc.org_id = p_org_id AND sc.provider_type = p_provider_type;
END;
$$;
