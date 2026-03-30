# Enterprise SSO Implementation Plan

## Current State

**Already Implemented:**
- ✅ Audit Logs table in Supabase (`audit_logs`)
- ✅ Audit logging service (`app/services/audit.py`)
- ✅ Audit log endpoint (`GET /api/audit-logs`)
- ✅ Organization management (create org, invite members, roles)
- ✅ Organization member roles: `owner`, `admin`, `member`

**Not Yet Implemented:**
- ❌ Enterprise SSO (SAML/OIDC)

---

## SSO Implementation

### Option 1: Supabase SSO (Recommended)
Supabase Enterprise includes SSO via SAML 2.0 and OIDC. No additional code needed - just enable in Supabase Dashboard.

**Pros:**
- Zero code required
- Managed by Supabase
- Supports SAML 2.0, OIDC, Google Workspace, Azure AD, Okta, OneLogin

**Cons:**
- Requires Supabase Enterprise plan (~$599/month)
- Less customization

### Option 2: Custom SAML/OIDC Integration
Implement SSO using Python libraries (`python3-saml`, `litauth`).

**Components Needed:**
1. **Database:** Add `sso_configs` table for SAML/OIDC settings
2. **Backend:** SSO config CRUD endpoints
3. **Frontend:** SSO settings UI in org management
4. **Auth:** Integrate with Supabase or handle separately

---

## Implementation Steps (Option 2 - Custom)

### 1. Database Schema
```sql
-- SSO configurations table
CREATE TABLE IF NOT EXISTS public.sso_configs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id),
  provider_type   TEXT        NOT NULL CHECK (provider_type IN ('saml', 'oidc')),
  idp_entity_id   TEXT,       -- SAML Entity ID or OIDC Issuer
  idp_sso_url     TEXT,       -- SSO URL
  idp_certificate TEXT,       -- X.509 cert
  sp_entity_id    TEXT,       -- Our entity ID
  enabled         BOOLEAN     DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Organization IDPs (users linked via SSO)
CREATE TABLE IF NOT EXISTS public.sso_identities (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id),
  org_id          UUID        NOT NULL REFERENCES organizations(id),
  idp_subject     TEXT,       -- SAML nameID or OIDC sub
  idp_email       TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, idp_subject)
);
```

### 2. Backend Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/org/sso` | Get SSO config |
| POST | `/api/org/sso` | Create SSO config |
| PUT | `/api/org/sso` | Update SSO config |
| DELETE | `/api/org/sso` | Disable SSO |
| POST | `/api/auth/saml/login` | Initiate SAML login |
| POST | `/api/auth/saml/callback` | SAML assertion consumer |
| POST | `/api/auth/oidc/login` | Initiate OIDC flow |
| POST | `/api/auth/oidc/callback` | OIDC callback |

### 3. SSO Service (`app/services/sso_service.py`)
- SAML 1.1/2.0 parsing and validation
- OIDC token exchange
- Map IdP user to Supabase user
- Auto-provision org members

### 4. Frontend
- SSO settings page in `/org/settings/sso`
- Test connection button
- Enable/disable toggle

---

## Audit Logging Actions (Existing)

```python
# Already implemented
scan.created, scan.completed, scan.failed
report.downloaded
share.created
api_key.created, api_key.revoked
member.invited, member.removed, member.role_changed
org.created, org.updated
audit_log.viewed

# Additional actions to add
sso.enabled, sso.disabled, sso.login_success, sso.login_failed
```

---

## Timeline

| Task | Effort |
|------|--------|
| Database schema | 1 hour |
| SSO service | 4 hours |
| Backend endpoints | 3 hours |
| Frontend UI | 2 hours |
| Testing | 2 hours |
| **Total** | **~12 hours** |

---

## Alternative: Supabase Enterprise SSO

If budget allows, enable SSO via Supabase Dashboard:
1. Upgrade to Supabase Enterprise (~$599/mo)
2. Go to Authentication → SSO
3. Configure SAML/OIDC provider
4. No code changes needed

This is the recommended path for production.
