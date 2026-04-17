# VULNRA LLM Security Scan

Automatically scan your LLM API endpoints for vulnerabilities in CI/CD pipelines.

Detects: jailbreaks, prompt injection, data leakage, compliance violations.

## Quick Start

```yaml
- uses: realjagsingh42-dotcom/vulnra@v1
  with:
    api_key: ${{ secrets.VULNRA_API_KEY }}
    target_url: 'https://your-llm-api.com/v1/chat/completions'
    fail_on_risk_score: '70'
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| api_key | ✅ | — | Your VULNRA API key (vk_live_...) |
| target_url | ✅ | — | LLM endpoint URL to scan |
| tier | ❌ | free | free, pro, or enterprise |
| scan_engine | ❌ | crescendo | crescendo, goat, or combined |
| fail_on_risk_score | ❌ | 70 | Fail CI if score ≥ this value (0–100) |
| vulnra_api_url | ❌ | https://web-production-ddb32.up.railway.app | Override for self-hosted |

## Outputs

| Output | Description |
|--------|-------------|
| risk_score | Final risk score 0–100 |
| scan_id | Scan ID to retrieve full report |
| findings_count | Number of vulnerabilities detected |

## Full Example Workflow

```yaml
name: LLM Security Scan
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: realjagsingh42-dotcom/vulnra@v1
        with:
          api_key: ${{ secrets.VULNRA_API_KEY }}
          target_url: ${{ secrets.LLM_ENDPOINT }}
          tier: 'pro'
          fail_on_risk_score: '70'
```

Get your API key at [vulnra-production-fb23.up.railway.app](https://vulnra-production-fb23.up.railway.app).
