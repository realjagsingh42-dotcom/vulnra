# VULNRA — Project Context

> **Last Updated:** 2026-03-15
> **Version:** 0.2.0
> **Repository:** [github.com/realjagsingh42-dotcom/vulnra](https://github.com/realjagsingh42-dotcom/vulnra)
> **Production URL:** https://vulnra-production.up.railway.app

---

## What is VULNRA?

VULNRA is a **production-grade AI vulnerability scanner** for Large Language Models. It automatically probes LLM APIs for security weaknesses — prompt injections, jailbreaks, encoding bypasses, data leakage, bias, and toxicity — using multiple scanning engines (Garak + DeepTeam), scores findings with an AI Judge (Claude 3 Haiku), and maps all results to regulatory frameworks (OWASP LLM Top 10, MITRE ATLAS, EU AI Act, NIST AI RMF, DPDP, ISO 42001). Results are served through a cyberpunk-themed web dashboard with real-time scan progress.

---

## Tech Stack

| Layer | Technology | Version / Details |
|-------|-----------|-------------------|
| **Frontend** | Next.js | 16.1.6, App Router, TypeScript, Tailwind CSS v4, React 19 |
| **Static Pages** | Vanilla HTML/CSS/JS | 20+ marketing/docs pages |
| **Backend API** | FastAPI | Python 3.11, async/await, Pydantic v2 |
| **Authentication** | Supabase Auth | Email/password, GitHub OAuth, Google OAuth |
| **Database** | Supabase PostgreSQL | pgvector extension |
| **Cache & Queue** | Redis + Celery | Upstash Redis, Celery 5.6.2 |
| **AI Providers** | Anthropic | Claude 3 Haiku as AI Judge |
| **Scan Engine 1** | Garak | 0.14.0 — subprocess-based LLM probe |
| **Scan Engine 2** | DeepTeam | 0.1.0 — 40+ vulnerability types |
| **Billing** | Lemon Squeezy | Webhooks live, checkout in progress |
| **Deployment** | Railway | Docker, auto-detected, 3-layer build |

---

## Project Structure

```
D:/VULNRA/
├── app/                                  # FastAPI backend
│   ├── main.py                           # App init, CORS, middleware, static mount, routes
│   ├── __init__.py
│   ├── worker.py                         # Celery worker for async scan tasks
│   │
│   ├── garak_engine.py                   # Garak subprocess integration + probe orchestration
│   ├── deepteam_engine.py                # DeepTeam SDK wrapper (40+ vuln types)
│   ├── judge.py                          # Claude 3 Haiku LLM-as-a-Judge evaluator
│   ├── pdf_report.py                     # PDF vulnerability report generation (ReportLab)
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   └── endpoints/
│   │       ├── __init__.py
│   │       ├── scans.py                  # /scan, /scan/{id}, /multi-turn-scan, /scan/mcp
│   │       └── billing.py               # Lemon Squeezy webhook handler
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py                     # Pydantic BaseSettings, env var validation
│   │   ├── security.py                   # JWT verification, get_current_user, get_admin_user
│   │   ├── utils.py                      # SSRF protection, is_safe_url, private IP blocklist
│   │   ├── rate_limiter.py               # SlowAPI + Redis tier-based rate limiting
│   │   └── compliance.py                 # OWASP LLM Top 10, MITRE ATLAS, EU AI Act mappings
│   │
│   └── services/
│       ├── __init__.py
│       ├── scan_service.py               # Multi-engine orchestration, result merging & dedup
│       ├── supabase_service.py           # DB ops, quota checks, scan storage
│       ├── attack_chains.py              # Multi-turn attacks (Crescendo, GOAT)
│       └── mcp_scanner.py               # MCP server vulnerability scanning
│
├── frontend/                             # Next.js 14 app (TypeScript)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx                # Root layout
│   │   │   ├── page.tsx                  # Landing page
│   │   │   ├── auth/
│   │   │   │   ├── actions.ts            # Server Actions: login, signup, signOut
│   │   │   │   └── callback/route.ts     # OAuth callback handler (GitHub/Google)
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   ├── scanner/                  # Main scan dashboard
│   │   │   ├── mcp-scanner/             # MCP server scanner UI
│   │   │   ├── pricing/
│   │   │   └── billing/                 # Checkout & subscription pages
│   │   │
│   │   ├── components/
│   │   │   ├── auth/                    # LoginForm, SignupForm
│   │   │   ├── scanner/                 # ScanConfig, ScannerLayout, Terminal
│   │   │   └── mcp-scanner/            # MCP scanning components
│   │   │
│   │   ├── lib/                         # Utility functions
│   │   ├── utils/supabase/              # Supabase client, server, middleware helpers
│   │   └── middleware.ts                # Auth route protection (redirects unauthenticated)
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   └── tailwind.config.js
│
├── tests/                               # Full test suite
│   ├── api/
│   │   ├── test_scans.py                # POST /scan, GET /scan/{id} endpoint tests
│   │   ├── test_billing.py              # Lemon Squeezy webhook tests
│   │   └── test_mcp_scan.py             # MCP scan endpoint tests
│   ├── app/
│   │   └── test_garak_engine.py         # Garak engine unit tests
│   ├── services/
│   │   ├── test_compliance.py           # Compliance mapping tests
│   │   └── test_attack_chains.py        # Multi-turn attack tests
│   ├── integration/
│   │   ├── test_mcp_scanner.py          # MCP scanner integration tests
│   │   ├── test_mitre_atlas.py          # MITRE ATLAS mapping tests
│   │   ├── test_multi_turn_attacks.py   # Crescendo/GOAT attack integration
│   │   └── test_owasp_coverage.py       # OWASP LLM Top 10 coverage tests
│   └── test_judge_logic.py              # Claude AI Judge evaluation tests
│
├── Dockerfile                           # 3-layer production Docker build
├── docker-compose.yml                   # Local dev: app + worker + redis
├── create_db.py                         # PostgreSQL schema setup script
├── Procfile                             # Railway/Heroku process config
├── railway.json                         # Railway deployment config
│
├── requirements.txt                     # Core app dependencies
├── requirements-dev.txt                 # Dev + test dependencies (pytest, etc.)
├── requirements-ml.txt                  # Heavy ML deps (torch, garak, deepteam) — separate Docker layer
│
├── .env                                 # Backend env vars (gitignored)
├── env                                  # Env template (committed)
├── package.json                         # Root-level Node config
│
├── .github/
│   └── workflows/
│       ├── ci.yml                       # Lint, test, Docker build
│       └── release.yml                  # Build & publish on semver tags
│
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE                              # MIT
│
└── *.html                               # Static marketing/docs pages (20+)
    index.html, pricing.html, docs.html, compliance.html, roadmap.html,
    api-docs.html, blog.html, about.html, contact.html, compare.html,
    mcp-scanner.html, dashboard.html, scanner.html, security.html, ...
```

---

## Database Schema

**Platform:** Supabase PostgreSQL with `pgvector` extension

### `scans` table
| Column | Type | Notes |
|--------|------|-------|
| `id` | VARCHAR(36) PK | UUID |
| `user_id` | UUID FK | → `auth.users` |
| `target_url` | TEXT | LLM API endpoint |
| `status` | VARCHAR(20) | `pending`, `running`, `complete`, `failed` |
| `tier` | VARCHAR(20) | `free`, `pro`, `enterprise` |
| `risk_score` | FLOAT | 0.0 – 1.0 |
| `findings` | JSONB | Array of vulnerability objects |
| `compliance` | JSONB | OWASP / MITRE / EU AI Act mappings |
| `scan_engine` | TEXT | e.g. `"garak,deepteam"` |
| `created_at` | TIMESTAMP | |
| `completed_at` | TIMESTAMP | |

### `profiles` table
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | Matches `auth.users.id` |
| `email` | TEXT | |
| `tier` | VARCHAR(20) | `free`, `pro`, `enterprise` |
| `subscription_id` | TEXT | Lemon Squeezy subscription ID |
| `updated_at` | TIMESTAMP | |

### `sentinel_watches` table (legacy monitoring)
| Column | Type | Notes |
|--------|------|-------|
| `id` | VARCHAR(36) PK | |
| `chat_id` | VARCHAR(50) | |
| `url` | TEXT | |
| `interval_hours` | INT | Default 24 |
| `last_scan` | TIMESTAMP | |
| `active` | BOOLEAN | |
| `created_at` | TIMESTAMP | |

---

## API Endpoints

### Scan Endpoints (`app/api/endpoints/scans.py`)

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|-----------|-------------|
| `POST` | `/api/scan` | JWT | Tier-based | Start a new LLM vulnerability scan |
| `GET` | `/api/scan/{scan_id}` | JWT | Tier-based | Poll scan status and results |
| `POST` | `/api/multi-turn-scan` | JWT | Tier-based | Start a Crescendo or GOAT multi-turn attack |
| `POST` | `/api/scan/mcp` | JWT | Tier-based | Scan an MCP server for vulnerabilities |

### Billing Endpoints (`app/api/endpoints/billing.py`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/billing/webhook` | HMAC secret | Lemon Squeezy webhook (tier updates) |

### System

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | None | `{"status": "healthy", "version": "0.2.0"}` |

### Rate Limits (per-minute, per-user)

| Tier | Requests/min | Scans/day |
|------|-------------|-----------|
| Free | 1 | 1 |
| Pro | 10 | 100 |
| Enterprise | 100 | Unlimited |

---

## Core Services

### `app/services/scan_service.py` — Orchestration
Runs Garak and DeepTeam in parallel, merges results, deduplicates findings, sorts by severity (HIGH → MEDIUM → LOW → INFO), runs AI Judge on each finding, saves to Supabase, returns full scan record.

### `app/garak_engine.py` — LLM Probing (Garak)
Spawns Garak subprocess with sanitized arguments. Parses structured probe output. Maps probe names to OWASP LLM categories. Applies severity thresholds with AI Judge confidence overlay.

### `app/deepteam_engine.py` — Vulnerability Scanner (DeepTeam)
Uses DeepTeam SDK for 40+ vulnerability types. Returns CVSS scores and remediation guidance. Covers: prompt injection, poisoning, excessive agency, and more.

### `app/judge.py` — AI Judge (Claude 3 Haiku)
Evaluates each raw finding via Claude 3 Haiku. Returns: `is_vulnerable` (bool), `confidence` (0.0–1.0), `reasoning` (string). Falls back to engine heuristics if API is unavailable.

### `app/services/attack_chains.py` — Multi-Turn Attacks
Implements **Crescendo** (5-turn escalating context manipulation) and **GOAT** (autonomous goal-oriented attack traversal). Tracks conversation history and evaluates each turn.

### `app/services/mcp_scanner.py` — MCP Server Scanning
Discovers available tools on a target MCP server. Tests for tool injection, privilege escalation, data exfiltration, and unauthorized resource access. Returns risk score + detailed findings.

### `app/services/supabase_service.py` — Database Layer
User tier lookup, daily quota enforcement, scan result persistence, subscription tier updates via Lemon Squeezy webhooks.

### `app/core/compliance.py` — Compliance Mapping
Maps vulnerability types to:
- **OWASP LLM Top 10 (2025)** — LLM01–LLM10
- **MITRE ATLAS** — 12 tactics, 48+ techniques
- **EU AI Act** — Articles 5–52
- **NIST AI RMF** — Govern/Map/Measure/Manage
- **DPDP** — India data privacy
- **ISO 42001** — AI management system

---

## Scanning Capabilities

### Vulnerability Types Detected

| Category | Examples |
|----------|---------|
| Prompt Injection | Direct injection, indirect chains, HijackKill styles |
| Jailbreaks | DAN, AutoDAN, AntiDAN, continuation attacks |
| Encoding Bypasses | Base64, Base32, ROT13, Unicode obfuscation |
| Data Leakage | PII extraction, system prompt leakage |
| Toxic Content | Hate speech, harassment, extremism generation |
| Multi-Turn Chains | Crescendo, GOAT autonomous attack trees |
| MCP Vulnerabilities | Tool abuse, privilege escalation, data exfil |

### Tier-Based Probe Coverage

| Tier | Garak Probes | DeepTeam | Daily Quota |
|------|-------------|----------|------------|
| Free | `dan.AutoDANCached` | Limited | 1 scan/day |
| Pro | + `dan.AntiDAN`, `promptinject` | Extended | 100/day |
| Enterprise | + `HijackHateHumans`, encoding, continuation | Full 40+ | Unlimited |

---

## Key Dependencies

### Python (Backend)

```
# Core
fastapi==0.135.1, uvicorn==0.41.0, pydantic==2.12.5, pydantic-settings==2.1.0

# Database & Cache
psycopg2-binary==2.9.11, supabase==2.15.3, redis==7.2.1, slowapi==0.1.9

# Task Queue
celery==5.6.2, kombu==5.6.2

# AI & Scanning
anthropic==0.49.0, garak==0.14.0, deepteam==0.1.0, torch==2.6.0 (CPU)

# Utilities
httpx==0.27.2, cryptography==46.0.5, python-dotenv==1.2.2, PyYAML==6.0.3
reportlab==4.1.0, pdfplumber==0.11.9, python-docx==1.2.0
```

### Node.js (Frontend)

```
next@16.1.6, react@19.2.3, typescript, tailwindcss@^4
@supabase/supabase-js@^2.99.1, @supabase/ssr@^0.9.0
lucide-react@^0.577.0, clsx@^2.1.1, tailwind-merge@^3.5.0
```

---

## Environment Variables

### Backend (`.env`)

```env
# Database
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_KEY=eyJ...              # Service Role key (bypasses RLS)

# Cache & Queue
REDIS_URL=rediss://[host]:[port]

# Security
SECRET_KEY=[random signing key]

# AI Providers
ANTHROPIC_API_KEY=sk-ant-...             # Required for AI Judge
OPENAI_API_KEY=sk-...                    # Optional, for DeepTeam OpenAI probes

# Billing
LEMON_SQUEEZY_API_KEY=...
LEMON_SQUEEZY_STORE_ID=...
LEMON_SQUEEZY_WEBHOOK_SECRET=...
LEMON_SQUEEZY_PRO_VARIANT_ID=...
LEMON_SQUEEZY_ENTERPRISE_VARIANT_ID=...

# URLs
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Deployment

### Railway (Production)

- **Platform:** Railway
- **Build:** Docker (auto-detected from `Dockerfile`)
- **Branch:** `main`
- **Command:** `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2 --proxy-headers`
- **Health Check:** `GET /health`, 30s interval, 10s timeout, 3 retries

### Dockerfile Strategy (3-Layer)

```
Layer 1: ML deps — torch (CPU), garak, deepteam, grpcio  (slow, rarely changes)
Layer 2: App deps — fastapi, redis, supabase, celery      (medium, changes infrequently)
Layer 3: App code — app/ directory                        (fast, changes constantly)
```

### Docker Compose (Local Dev)

```yaml
services:
  app:    FastAPI (port 8000), memory limit 1GB
  worker: Celery worker, memory limit 1GB
  redis:  Redis 7-alpine, memory limit 256MB
```

---

## Running Locally

```bash
# Backend
cd D:/VULNRA
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Worker (separate terminal)
celery -A app.worker worker --loglevel=info

# Frontend
cd D:/VULNRA/frontend
npm install
npm run dev    # → http://localhost:3000
```

---

## CI/CD Pipeline

**GitHub Actions (`/.github/workflows/ci.yml`):**
1. Lint — Ruff + mypy type checking
2. Test — pytest with Redis service container
3. Docker — Build Docker image on success

**Release (`/.github/workflows/release.yml`):**
- Triggers on semver tags (e.g., `v0.3.0`)
- Builds and publishes Docker image

---

## Security Measures

| Measure | Implementation |
|---------|---------------|
| SSRF Protection | Private IP blocklist + DNS rebinding defense (`core/utils.py`) |
| Rate Limiting | SlowAPI + Redis, per-tier per-minute limits (`core/rate_limiter.py`) |
| JWT Auth | Supabase JWT verification on every protected endpoint (`core/security.py`) |
| CORS | Whitelist-based origins in `main.py` |
| Security Headers | CSP, X-Frame-Options, X-Content-Type-Options, HSTS |
| Input Validation | Strict Pydantic models on all request bodies |
| Non-root Docker | `USER appuser` in production container |
| Env Validation | Pydantic Settings with required field enforcement |

---

## Features Implemented

| Phase | Feature | Status |
|-------|---------|--------|
| Phase 1 | Garak Engine (subprocess + probe parsing) | ✅ Done |
| Phase 1 | DeepTeam Engine (40+ vulnerability types) | ✅ Done |
| Phase 1 | Multi-Engine Merging & Deduplication | ✅ Done |
| Phase 1 | AI Judge (Claude 3 Haiku) | ✅ Done |
| Phase 2 | SSRF Protection | ✅ Done |
| Phase 2 | Tier-Based Rate Limiting | ✅ Done |
| Phase 2 | Security Headers | ✅ Done |
| Phase 3 | Supabase Auth (email/password) | ✅ Done |
| Phase 3 | GitHub & Google OAuth | ✅ Done |
| Phase 3 | JWT Backend Verification | ✅ Done |
| Phase 3 | Next.js Route Protection | ✅ Done |
| Phase 4 | Cyberpunk Dashboard (Next.js 14) | ✅ Done |
| Phase 4 | Real-Time Scan Progress Polling | ✅ Done |
| Phase 4 | MCP Scanner UI | ✅ Done |
| Phase 5 | 3-Layer Docker Build | ✅ Done |
| Phase 5 | Railway Deployment | ✅ Done |
| Phase 5 | GitHub CI/CD | ✅ Done |
| Phase 6 | Multi-Turn Attack Chains (Crescendo, GOAT) | ✅ Done |
| Phase 6 | MCP Server Security Scanner | ✅ Done |
| Phase 7 | Lemon Squeezy Billing Webhooks | ✅ Done |
| Phase 7 | Checkout & Subscription Pages | ✅ Done |
| — | Scan History | ✅ Done |
| — | PDF Report Download | ✅ Done |
| — | Social Share (Twitter/LinkedIn/Facebook) | ✅ Done |
| — | Enterprise SSO (SAML + OIDC) | ✅ Done |
| — | Scheduled Scans (one-time, recurring, cron) | ✅ Done |

---

## Recent Git History

```
xxxxxx   feat: add scheduled scans (one-time, recurring, cron)
ccfd88e  feat: add social share for scan results (Twitter, LinkedIn, Facebook)
b03ed4a  fix: update MCP scanner tests and fix compliance module usage
39f5e7e  fix: update MCP scanner imports to use correct compliance module functions
6e48f8d  feat: add MCP Security Scanner feature
2e8b149  test: add billing API tests
f5f0fc0  feat: add Lemon Squeezy billing integration with checkout and webhooks
```
