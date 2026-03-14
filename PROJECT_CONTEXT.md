# VULNRA — Project Context

> **Last Updated:** 2026-03-14  
> **Version:** 0.2.0  
> **Repository:** [github.com/realjagsingh42-dotcom/vulnra](https://github.com/realjagsingh42-dotcom/vulnra)

## What is VULNRA?

VULNRA is a **production-grade AI vulnerability scanner** for Large Language Models. It probes LLM APIs for security weaknesses (prompt injection, jailbreaks, data leakage, bias, toxicity, etc.) using multiple scanning engines, scores findings with an AI Judge, and presents results through a premium cyberpunk-themed web interface.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router, TypeScript, Tailwind CSS) |
| **Static Pages** | Vanilla HTML/CSS/JS (index, pricing, docs, etc.) |
| **Backend API** | FastAPI (Python 3.11) |
| **Auth** | Supabase Auth (email/password + GitHub OAuth + Google OAuth) |
| **Database** | Supabase PostgreSQL with pgvector |
| **Cache/Queue** | Redis (Upstash) + Celery |
| **AI Providers** | OpenAI, Anthropic (Claude) |
| **Scan Engines** | Garak, DeepTeam |
| **AI Judge** | Claude 3 Haiku (LLM-as-a-Judge scoring) |
| **Deployment** | Railway (Docker) |
| **Billing** | Lemon Squeezy *(planned)* |

---

## Project Structure

```
d:\VULNRA\
├── app/                          # FastAPI backend
│   ├── main.py                   # App entrypoint, CORS, middleware, routes
│   ├── garak_engine.py           # Garak scan engine integration
│   ├── deepteam_engine.py        # DeepTeam scan engine integration
│   ├── judge.py                  # AI Judge (Claude) for finding evaluation
│   ├── api/
│   │   └── endpoints/
│   │       └── scans.py          # POST /scan, GET /scan/{id} endpoints
│   ├── core/
│   │   ├── config.py             # Pydantic Settings, env validation
│   │   ├── security.py           # JWT verification, get_current_user
│   │   └── utils.py              # SSRF protection, is_safe_url
│   └── services/
│       ├── scan_service.py       # Scan orchestration, result merging
│       └── supabase_service.py   # DB operations, quotas, scan storage
├── frontend/                     # Next.js 14 app
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/
│   │   │   │   ├── actions.ts    # Server Actions (login, signup, signOut)
│   │   │   │   └── callback/
│   │   │   │       └── route.ts  # OAuth callback handler
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── scanner/page.tsx
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── SignupForm.tsx
│   │   │   └── scanner/
│   │   │       ├── ScanConfig.tsx
│   │   │       ├── ScannerLayout.tsx
│   │   │       └── Terminal.tsx
│   │   ├── utils/supabase/       # Supabase client/server/middleware helpers
│   │   └── middleware.ts         # Auth route protection
│   └── .env.local                # Frontend env vars
├── tests/                        # Test suite
├── Dockerfile                    # Production Docker (3-layer strategy)
├── requirements.txt              # App dependencies
├── requirements-ml.txt           # Heavy ML dependencies (separate Docker layer)
├── requirements-dev.txt          # Dev/test dependencies
├── .env                          # Backend env vars (gitignored)
├── env                           # Env template (committed)
├── *.html                        # Static marketing/docs pages
└── roadmap.html                  # Public product roadmap
```

---

## Features Implemented

### ✅ Phase 1 — Core Scanning
- **Garak Engine** — Subprocess-based LLM probe engine with report parsing
- **DeepTeam Engine** — 40+ vulnerability type scanner using DeepTeam SDK
- **Multi-Engine Merging** — Results from both engines are merged and deduplicated
- **AI Judge (Claude)** — LLM-as-a-Judge that evaluates each finding for severity, confidence, and reasoning

### ✅ Phase 2 — Security Hardening
- **SSRF Protection** — Private IP blocklist with DNS rebinding defense
- **Rate Limiting** — SlowAPI-based rate limiting on all endpoints
- **Security Headers** — X-Content-Type-Options, X-Frame-Options, CSP headers
- **Input Validation** — Pydantic models with strict type checking

### ✅ Phase 3 — Authentication & Authorization
- **Supabase Auth** — Email/password signup and login
- **GitHub OAuth** — One-click sign-in via GitHub
- **Google OAuth** — One-click sign-in via Google
- **JWT Verification** — Backend verifies Supabase JWTs on every API call
- **Route Protection** — Next.js middleware redirects unauthenticated users
- **Tiered Access** — Free (1 scan/day), Pro (100/day), Enterprise (unlimited)

### ✅ Phase 4 — Frontend & UI
- **Next.js 14 App** — TypeScript, App Router, Tailwind CSS
- **Cyberpunk Design** — Dark mode, acid-green accents, scanline animations, glassmorphism
- **Login/Signup Pages** — Fully functional with OAuth buttons
- **Scanner Dashboard** — Real-time scan config, terminal output, and findings panel
- **Scan Polling** — Frontend polls `GET /scan/{id}` for live progress updates
- **Findings Panel** — Displays severity, category, AI reasoning, and hit rates

### ✅ Phase 5 — Infrastructure
- **Modular Backend** — Clean separation: `core/`, `api/`, `services/`
- **Optimized Dockerfile** — 3-layer build (ML deps → app deps → code) for fast Railway deploys
- **Environment Management** — Pydantic Settings with `.env` file support
- **Static Pages** — 20+ marketing/docs HTML pages (pricing, roadmap, docs, compliance, etc.)

---

## Environment Variables

### Backend (`.env`)
```env
REDIS_URL=rediss://...             # Upstash Redis connection
SECRET_KEY=...                     # Session signing key
SUPABASE_URL=https://....supabase.co
SUPABASE_SERVICE_KEY=eyJ...        # Service Role key (bypasses RLS)
OPENAI_API_KEY=                    # Optional: for OpenAI-based scans
ANTHROPIC_API_KEY=                 # Optional: for AI Judge
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://....supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/scan` | ✅ JWT | Start a new vulnerability scan |
| `GET` | `/api/scan/{scan_id}` | ✅ JWT | Poll scan status and results |
| `GET` | `/health` | ❌ | Health check for Railway/Docker |

---

## Running Locally

```bash
# Backend
cd d:\VULNRA
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd d:\VULNRA\frontend
npm install
npm run dev    # → http://localhost:3000
```

---

## Deployment

- **Platform:** Railway
- **Build:** Docker (auto-detected from `Dockerfile`)
- **Branch:** `main`
- **URL:** `https://vulnra-production.up.railway.app`

---

## What's Next

| Priority | Feature | Status |
|----------|---------|--------|
| 1 | **Lemon Squeezy Billing** — Subscription payments, webhook-based tier updates | 🔲 Planned |
| 2 | **Social Share** — LinkedIn/Twitter share buttons for scan reports | 🔲 Planned |
| 3 | **PDF Reports** — Downloadable vulnerability assessment PDFs | 🔲 Planned |
| 4 | **Multi-Channel** — WhatsApp and Telegram bot integrations | 🔲 Planned |
| 5 | **Enterprise Features** — Team management, SSO, audit logs | 🔲 Planned |
