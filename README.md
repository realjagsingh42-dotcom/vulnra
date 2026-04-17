# VULNRA — AI Risk Scanner & Compliance Reporter

VULNRA automatically finds jailbreaks, prompt injections, and encoding bypasses in any LLM endpoint. It maps vulnerabilities to OWASP LLM Top 10, MITRE ATLAS, EU AI Act, and NIST AI RMF frameworks.

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Start all services with one command
docker compose up --build

# Stop all services
docker compose down
```

### Option 2: Manual Setup

```bash
# 1. Clone and setup
git clone https://github.com/your-org/vulnra.git
cd vulnra
cp .env.example .env

# 2. Install dependencies
python -m venv venv
source venv/bin/activate          # Linux/macOS
pip install -r requirements.txt

cd frontend && npm install && cd ..

# 3. Configure .env
# Edit .env with your Supabase URL/keys and other credentials

# 4. Start all services
./start-all.sh
```

## Services

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Web UI |
| **Backend API** | http://localhost:8000 | REST API |
| **API Docs** | http://localhost:8000/docs | Swagger documentation |
| **Demo LLM** | http://localhost:8001 | Vulnerable target for testing |

## Testing the Scanner

### Run a Quick Scan

```bash
# Scan the demo vulnerable LLM target
curl -X POST http://localhost:8000/scan/quick \
  -H "Content-Type: application/json" \
  -d '{"target_url": "http://localhost:8001/v1/chat/completions"}'
```

### Run a Full Scan (requires authentication)

```bash
# 1. Get a session token from Supabase
# 2. POST a scan request
curl -X POST http://localhost:8000/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "url": "http://localhost:8001/v1/chat/completions",
    "scan_name": "My LLM Test"
  }'

# 3. Poll for results
curl http://localhost:8000/scan/SCAN_ID
```

### Demo Probe Test

```bash
# Run the built-in probe tests against the demo LLM
source venv/bin/activate
python demo/run_demo_test.py
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | Yes | Session signing key. Generate: `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key |
| `REDIS_URL` | Yes | Redis connection string |
| `ANTHROPIC_API_KEY` | For AI Judge | Anthropic API key for vulnerability scoring |
| `LEMONSQUEEZY_*` | For billing | Lemon Squeezy API credentials |

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│  FastAPI     │────▶│   Garak     │
│  (Next.js)  │◀────│  Backend     │◀────│  DeepTeam   │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │   Celery    │
                    │   Worker    │
                    └─────────────┘
```

## Features

- **AI Risk Detection**: Prompt injection, jailbreak, encoding bypass detection
- **Multi-Turn Attacks**: Crescendo and GOAT attack chains
- **Compliance Mapping**: OWASP LLM Top 10, MITRE ATLAS, EU AI Act, NIST AI RMF
- **AI Judge**: Claude-powered vulnerability assessment
- **Scheduled Scans**: Automate recurring security tests
- **Team Management**: Organization quotas and SSO

## Development

```bash
# Start backend only
./start-backend.sh

# Start frontend only
./start-frontend.sh

# Start worker only
./start-worker.sh

# View logs
tail -f logs/backend.log
tail -f logs/worker.log
tail -f logs/demo.log
tail -f logs/frontend.log

# Run tests
pytest tests/
```

## License

MIT License
