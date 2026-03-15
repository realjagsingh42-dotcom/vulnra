-- VULNRA Enterprise: Organizations, Members, Invites, Audit Logs
-- Migration: 20260315_enterprise_tables

-- ── organizations ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
    owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    tier        VARCHAR(32) NOT NULL DEFAULT 'enterprise',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);

-- RLS: users can only read their own org (via membership)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select_member" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT org_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "org_insert_owner" ON organizations
    FOR INSERT WITH CHECK (owner_id = auth.uid());


-- ── organization_members ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organization_members (
    org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role       VARCHAR(32) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Members can see other members of their own org
CREATE POLICY "org_members_select" ON organization_members
    FOR SELECT USING (
        org_id IN (
            SELECT org_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Service role manages membership (inserts/deletes via backend)
CREATE POLICY "org_members_service_manage" ON organization_members
    FOR ALL USING (auth.role() = 'service_role');


-- ── organization_invites ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organization_invites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    role        VARCHAR(32) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    token       TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_invites_token  ON organization_invites(token);
CREATE INDEX IF NOT EXISTS idx_org_invites_email  ON organization_invites(email);
CREATE INDEX IF NOT EXISTS idx_org_invites_org_id ON organization_invites(org_id);

ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

-- Org admins can see their own org's invites
CREATE POLICY "org_invites_select_admin" ON organization_invites
    FOR SELECT USING (
        org_id IN (
            SELECT org_id FROM organization_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Public: anyone with the token can look it up (for accept flow)
CREATE POLICY "org_invites_select_by_token" ON organization_invites
    FOR SELECT USING (true);  -- filtered by token in application layer

CREATE POLICY "org_invites_service_manage" ON organization_invites
    FOR ALL USING (auth.role() = 'service_role');


-- ── audit_logs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    org_id      UUID REFERENCES organizations(id) ON DELETE SET NULL,
    action      TEXT NOT NULL,
    resource_id TEXT NOT NULL DEFAULT '',
    ip_address  INET,
    user_agent  TEXT,
    metadata    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id     ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only org admins can read audit logs for their org
CREATE POLICY "audit_logs_select_admin" ON audit_logs
    FOR SELECT USING (
        org_id IN (
            SELECT org_id FROM organization_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Service role writes all audit entries
CREATE POLICY "audit_logs_service_insert" ON audit_logs
    FOR INSERT WITH CHECK (auth.role() = 'service_role');
