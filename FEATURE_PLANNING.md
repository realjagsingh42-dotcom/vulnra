# VULNRA — Feature Planning

> **Last Updated:** 2026-03-31
> **Current Version:** v0.3.0
> **Next Release Target:** v0.4.0

---

## Overview

This document tracks all feature work — completed, in-progress, planned, and backlog. It serves as the source of truth for product direction and milestone planning.

---

## Completed Features

### v0.1.0 — Foundation (2025-03-08)

| Feature | Status | Notes |
|---------|--------|-------|
| FastAPI backend with Celery + Redis | ✅ Done | Async scan queue |
| Garak engine integration | ✅ Done | Subprocess-based probing |
| Scanner UI with real-time log output | ✅ Done | Terminal component |
| Compliance mapping (EU AI Act, NIST, DPDP, ISO 42001, OWASP) | ✅ Done | `core/compliance.py` |
| PDF audit report generation | ✅ Done | ReportLab, `pdf_report.py` |
| Homepage with pricing, features, CTA | ✅ Done | Static HTML |

### v0.2.0 — Production Ready (2026-03-14)

| Feature | Status | Notes |
|---------|--------|-------|
| **DeepTeam engine** — 40+ vulnerability types | ✅ Done | `deepteam_engine.py` |
| **Multi-engine merging** — deduplicated results sorted by severity | ✅ Done | `scan_service.py` |
| **AI Judge** — Claude 3 Haiku evaluates each finding | ✅ Done | `judge.py` |
| **SSRF protection** — private IP blocklist, DNS rebinding defense | ✅ Done | `core/utils.py` |
| **Tier-based rate limiting** — SlowAPI + Redis | ✅ Done | `core/rate_limiter.py` |
| **Security headers** — CSP, HSTS, X-Frame-Options | ✅ Done | `main.py` middleware |
| **Supabase Auth** — email/password + GitHub + Google OAuth | ✅ Done | Frontend + backend JWT |
| **Route protection** — Next.js middleware | ✅ Done | `middleware.ts` |
| **Tiered access control** — Free/Pro/Enterprise quotas | ✅ Done | `supabase_service.py` |
| **Next.js 14 frontend** — cyberpunk design, TypeScript | ✅ Done | `frontend/` |
| **Scanner dashboard** — real-time progress, findings panel | ✅ Done | `scanner/` components |
| **3-layer Docker build** — optimized for Railway | ✅ Done | `Dockerfile` |
| **GitHub CI/CD** — lint, test, Docker build | ✅ Done | `.github/workflows/` |
| **Multi-turn attack chains** — Crescendo + GOAT | ✅ Done | `attack_chains.py` |
| **MCP server scanner** — tool injection, privilege escalation, exfil | ✅ Done | `mcp_scanner.py` |
| **Lemon Squeezy billing webhooks** — tier auto-update | ✅ Done | `billing.py` |
| **MITRE ATLAS compliance mapping** | ✅ Done | `core/compliance.py` |
| **Static marketing pages** — 20+ HTML pages | ✅ Done | Root `*.html` |

---

## In Progress — v0.3.0

### 1. Billing Checkout Flow

**Priority:** P0 — ✅ COMPLETE (2026-03-15)
**Owner:** Backend + Frontend

#### What's done
- ✅ `POST /billing/checkout` — httpx-based Lemon Squeezy checkout session creation
- ✅ `GET /billing/subscription` — Returns current tier + subscription_id
- ✅ `POST /billing/cancel` — Cancels subscription via LS API, downgrades to free
- ✅ Webhook handlers fixed: `subscription_created`, `subscription_updated`, `subscription_cancelled/expired/paused`
- ✅ `/billing/page.tsx` — Full cyberpunk pricing table with upgrade/downgrade CTAs
- ✅ `/billing/success/page.tsx` — Polls subscription endpoint every 2s (up to 30s), auto-redirects to scanner
- ✅ `/billing/manage/page.tsx` — Current plan view, cancel flow with confirmation step
- ✅ Variant-ID → tier mapping in `_variant_to_tier()` using settings env vars
- ✅ Tier badge in scanner dashboard nav

---

### 2. PDF Report Download

**Priority:** P1 — ✅ COMPLETE (2026-03-30)
**Owner:** Backend + Frontend

#### What's done
- ✅ `pdf_report.py` with ReportLab — verified produces valid output
- ✅ `GET /api/scan/{id}/report` — Stream PDF response with correct headers
- ✅ Auth guard: only scan owner can download
- ✅ Frontend: "Download Report" button in findings panel
- ✅ PDF content: title, scan date, target URL, risk score, findings table, compliance summary, remediation recommendations
- ✅ Free tier: watermarked PDF (top 3 findings only); Pro/Enterprise: full PDF

**Acceptance Criteria:**
- ✅ Completed scan has a downloadable PDF button
- ✅ PDF includes: title, scan date, target URL, risk score, findings table, compliance mapping
- ✅ Free tier: watermarked PDF only; Pro/Enterprise: full PDF

---

## Completed — v0.3.0

### 3. Dashboard Scan History

**Priority:** P1 — ✅ COMPLETE (2026-03-30)
**Description:** Users can now view past scans from the UI.

#### What's done
- ✅ `GET /api/scans` — paginated list of user's scans (id, url, status, risk_score, created_at)
- ✅ Dashboard `/history` page — table of past scans with link to re-open results
- ✅ Scan detail page at `/scanner/[id]` — re-render findings from stored JSON
- ✅ Delete scan endpoint + UI

**Acceptance Criteria:**
- ✅ User can see all their past scans sorted by date
- ✅ Each scan row shows: target URL, risk score, date, status
- ✅ Clicking a scan loads the full findings view

---

### 4. Scan Result Sharing

**Priority:** P2 — ✅ COMPLETE (2026-03-31)
**Description:** Allow users to share scan reports publicly (or with a team).

#### What's done
- ✅ `POST /api/scan/{id}/share` — Generate a signed, time-limited public token (30-day expiry)
- ✅ Public report URL: `/report/{token}` — Read-only view, no auth required
- ✅ `GET /api/report/{token}` — Returns scan data for shared link
- ✅ Copy link button in findings panel
- ✅ Share token stored in `scans.share_token` and `scans.share_expires_at`
- ✅ Database migration: `supabase/migrations/20260320_complete_schema.sql`

**Acceptance Criteria:**
- ✅ Pro+ users can generate a shareable link for any completed scan
- ✅ Shared link shows full results without requiring login
- ✅ Link expires after 30 days; expired links return 404

---

### 5. Continuous Monitoring (Sentinel)

**Priority:** P2 — Enterprise differentiator
**Description:** Scheduled re-scanning of an LLM endpoint at configurable intervals.

#### Schema (partially exists as `sentinel_watches`)
- [ ] Activate the `sentinel_watches` table (currently legacy/unused)
- [ ] `POST /api/monitor` — Create a watch (url, interval_hours, tier)
- [ ] `GET /api/monitor` — List active watches
- [ ] `DELETE /api/monitor/{id}` — Remove watch
- [ ] Celery beat schedule: scan watches on their intervals
- [ ] Email alert on new HIGH severity finding (via Supabase email or Resend)

**Acceptance Criteria:**
- Pro users can set up monitoring with 24h minimum interval
- Enterprise users can set 1h minimum interval
- Alert email sent when risk score increases by >20% vs last scan
- Dashboard shows monitoring status for watched endpoints

---

## Planned — v0.4.0

### 6. Enterprise Team Management

**Priority:** P2**Description:** Allow organizations to manage multiple users under one account.

**New DB Tables:**
- `organizations` — id, name, owner_id, tier, created_at
- `organization_members` — org_id, user_id, role (admin/member), invited_at, joined_at
- `organization_invites` — id, org_id, email, token, expires_at

**Features:**
- [ ] `POST /api/org` — Create organization
- [ ] `POST /api/org/invite` — Invite member by email (sends invite email)
- [ ] `GET /api/org/members` — List org members
- [ ] `DELETE /api/org/members/{id}` — Remove member
- [ ] Scan quota shared across org members
- [ ] Org admin dashboard page
- [ ] Role-based scan visibility (members see team scans, not personal scans of others)

**Acceptance Criteria:**
- Enterprise user can create an org and invite up to 50 members
- All org members share the enterprise quota pool
- Org admin can view all scans run by any member
- Non-admin members can only view their own scans + org-wide reports

---

### 7. Custom Probe Configuration

**Priority:** P3
**Description:** Let Pro/Enterprise users customize which Garak probes and DeepTeam vulnerability types to run.

- [ ] Scan request accepts optional `probes: string[]` and `vulnerability_types: string[]` fields
- [ ] Frontend: "Advanced Config" panel in scan setup — checklist of probes by category
- [ ] Probe presets: "OWASP LLM Top 10", "Jailbreaks Only", "Compliance Audit", "Full Sweep"
- [ ] Persist preferred preset per user in `profiles.scan_preferences JSONB`

**Acceptance Criteria:**
- Pro users can select/deselect probe categories before starting a scan
- Enterprise users can configure per-probe granularity
- Presets can be saved and reused

---

### 8. API Key Authentication

**Priority:** P2 — Needed for programmatic access
**Description:** Allow users to authenticate API calls with an API key instead of JWT (for CI/CD, automation).

**New DB Table:**
- `api_keys` — id, user_id, key_hash, name, last_used, created_at, expires_at, revoked

**Features:**
- [ ] `POST /api/keys` — Create API key (returns plaintext key once)
- [ ] `GET /api/keys` — List user's API keys (masked)
- [ ] `DELETE /api/keys/{id}` — Revoke key
- [ ] Backend: accept `Authorization: Bearer vk_live_...` as alternative to Supabase JWT
- [ ] Dashboard: API keys management page with key creation, copy, revoke
- [ ] Docs page: code examples for Python, curl, Node.js using API keys

**Acceptance Criteria:**
- User can create up to 5 API keys (Pro: 20, Enterprise: unlimited)
- Key authenticates with same tier/quota as the owning user
- Revoked keys immediately return 401

---

### 9. Webhook Notifications

**Priority:** P3
**Description:** Let users receive scan completion and alert events via outbound webhooks.

- `POST /api/webhooks` — Register a webhook URL with event filter
- `GET /api/webhooks` — List registered webhooks
- `DELETE /api/webhooks/{id}` — Remove webhook
- Events: `scan.complete`, `scan.failed`, `monitor.alert`, `tier.upgraded`
- Payload: signed with HMAC-SHA256 using per-user secret
- Retry logic: 3 attempts with exponential backoff

---

## v1.0.0 — GA Release

### 10. SSO / SAML Login

**Priority:** Enterprise-only
- SAML 2.0 SSO via Supabase Auth SSO feature
- Admin can configure identity provider (Okta, Azure AD, Google Workspace)
- JIT user provisioning on first SSO login
- Domain-based org auto-join

### 11. Audit Logs

**Priority:** Enterprise-only
- Every API action recorded: who, what, when, from which IP
- `GET /api/audit-logs` — paginated, filterable
- Export as CSV
- Retention: 90 days (configurable up to 1 year)

### 12. Custom Compliance Frameworks

**Priority:** Enterprise
- Let enterprise users define custom control mappings
- Import: upload CSV of controls → auto-map to VULNRA vulnerability categories
- Export: compliance report against custom framework

### 13. Vuln Database (Vuln-DB)

**Priority:** P3 — Community/SEO value
- Public, searchable database of LLM vulnerability patterns
- Each entry: CVE-style ID, description, affected models, OWASP category, mitigations
- Linked from scan findings ("Learn more about this vulnerability")
- Community submission via GitHub issue template (`scan_module_request.md`)

### 14. Multi-Channel Integrations

**Priority:** P4
- Slack: post scan results to a channel
- Discord: post findings via webhook
- Telegram: `/scan <url>` bot command (partial design exists)
- WhatsApp: scan initiation via WhatsApp Business API

---

## Backlog / Unscheduled

| Feature | Notes |
|---------|-------|
| Model provider SDKs (Bedrock, Cohere, Vertex AI) | Allow scanning models beyond REST endpoints |
| Browser extension | Scan any LLM chatbot in-browser |
| VS Code extension | Scan LLM calls inline while coding |
| CI/CD GitHub Action | `vulnra/scan-action@v1` — scan on every PR |
| Benchmark comparisons | Side-by-side risk scores for GPT-4 vs Claude vs Gemini |
| Red team report templates | Pentest-style narrative reports |
| Custom attack chain builder | Visual UI to compose multi-turn attack sequences |
| SBOM integration | Map scan findings to model supply chain |

---

## Prioritization Matrix

| Feature | Business Value | User Impact | Effort | Priority |
|---------|---------------|-------------|--------|----------|
| Billing checkout | Revenue blocker | High | Medium | ✅ Done |
| PDF reports | Promised in pricing | Medium | Low | ✅ Done |
| Scan history | Core UX gap | High | Low | ✅ Done |
| Scan sharing | Viral loop | Medium | Medium | **P2** |
| Continuous monitoring | Enterprise lock-in | High | High | **P2** |
| API key auth | Devtools adoption | Medium | Medium | **P2** |
| Team management | Enterprise revenue | High | High | **P2** |
| Custom probes | Power user retention | Medium | Medium | **P3** |
| Webhook notifications | Automation/devtools | Medium | Low | **P3** |
| SSO / SAML | Enterprise requirement | High | High | **P2** (v1.0) |
| Audit logs | Enterprise compliance | High | Medium | **P2** (v1.0) |

---

## Milestone Targets

| Milestone | Target Date | Key Deliverables |
|-----------|------------|-----------------|
| **v0.3.0** | 2026-03-30 | Billing checkout, PDF reports, scan history, scan sharing |
| **v0.4.0** | 2026-05-01 | Continuous monitoring, API keys, webhooks, custom probes |
| **v0.5.0** | 2026-06-01 | Team management, org dashboard, shared quotas |
| **v1.0.0 GA** | 2026-08-01 | SSO, audit logs, custom frameworks, vuln-db, all integrations |
