# CLAUDE.md - Project Context for AI Assistant

> **Last Updated:** 2026-03-30

## Project Overview

VULNRA is a production-grade AI vulnerability scanner for Large Language Models. It automatically probes LLM APIs for security weaknesses using multiple scanning engines (Garak + DeepTeam), scores findings with an AI Judge (Claude 3 Haiku), and maps results to regulatory frameworks.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Backend | FastAPI (Python 3.11), Pydantic v2 |
| Database | Supabase PostgreSQL (pgvector) |
| Cache/Queue | Redis + Celery |
| AI | Anthropic Claude 3 Haiku (AI Judge) |
| Scan Engines | Garak 0.14.0, DeepTeam 0.1.0 |
| Deployment | Railway (Docker) |

## Key Commands

```bash
# Backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm install && npm run dev

# Worker
celery -A app.worker worker --loglevel=info
```

## Features Implemented

- ✅ Garak Engine (subprocess + probe parsing)
- ✅ DeepTeam Engine (40+ vulnerability types)
- ✅ AI Judge (Claude 3 Haiku)
- ✅ SSRF Protection & Rate Limiting
- ✅ Supabase Auth (email/password, GitHub, Google OAuth)
- ✅ Next.js Dashboard with Cyberpunk Theme
- ✅ MCP Server Security Scanner
- ✅ Multi-Turn Attack Chains (Crescendo, GOAT)
- ✅ Lemon Squeezy Billing
- ✅ PDF Report Download
- ✅ Social Share (Twitter, LinkedIn, Facebook)
- ✅ Enterprise SSO (SAML 2.0 + OIDC)
- ✅ Audit Logging

## Important Files

- `PROJECT_CONTEXT.md` - Full project documentation
- `app/api/endpoints/scans.py` - Scan API endpoints
- `app/services/sso_service.py` - SSO service
- `app/api/endpoints/org.py` - Org + SSO endpoints
- `frontend/src/components/scanner/` - Scanner UI components

## Important Files

- `PROJECT_CONTEXT.md` - Full project documentation
- `app/api/endpoints/scans.py` - Scan API endpoints
- `frontend/src/components/scanner/` - Scanner UI components

## Notes

- Share links are public (anyone with link can view)
- Social share includes: risk score, findings count, severity breakdown
- SSO supports SAML 2.0 and OIDC providers (Okta, Azure AD, Google Workspace, OneLogin, Ping Identity, Generic)
- SSO available on Pro and Enterprise tiers
