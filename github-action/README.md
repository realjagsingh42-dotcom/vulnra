# VULNRA Scan Action

> **`vulnra/scan-action@v1`** — Run AI vulnerability audits against your LLM API in CI/CD.

Automatically scan your LLM endpoint on every PR or push, post a rich security report as a PR comment, and fail the build if the risk score exceeds your threshold.

---

## Features

- 🔍 **Full LLM vulnerability scan** — prompt injection, jailbreaks, data leakage, encoding bypasses, and more
- 🔀 **Regression detection** — diff new scan against a baseline to surface newly introduced vulnerabilities
- 💬 **PR comments** — rich markdown report posted directly on the pull request (updates on re-run, never duplicates)
- 📋 **Job summary** — score and findings table in the GitHub Actions summary tab
- ⛔ **Configurable fail threshold** — break the build if risk score ≥ N
- 📄 **PDF report link** — direct link to downloadable PDF in every comment
- 🗺️ **OWASP LLM Top 10 mapping** — every finding tagged with OWASP category

---

## Quick Start

```yaml
# .github/workflows/vulnra.yml
name: LLM Security Scan

on:
  pull_request:
  push:
    branches: [main]

jobs:
  vulnra:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write   # needed to post PR comments
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Run VULNRA scan
        uses: vulnra/scan-action@v1
        with:
          api_key: ${{ secrets.VULNRA_API_KEY }}
          target_url: "https://your-llm-api.example.com/v1/chat/completions"
```

---

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `api_key` | ✅ | — | Your VULNRA API key (`vk_live_...`). Store as a GitHub secret. |
| `target_url` | ✅ | — | LLM API endpoint to audit. |
| `model` | | `""` | Model name/ID passed to the endpoint. |
| `scan_engine` | | `combined` | Engine: `garak`, `deepteam`, or `combined`. |
| `tier` | | `pro` | Scan depth: `free`, `pro`, or `enterprise`. |
| `baseline_scan_id` | | `""` | Previous scan ID to diff against (enables regression detection). |
| `fail_on_risk_score` | | `70` | Fail if risk score ≥ this value (0–100). Set to `0` to disable. |
| `vulnra_api_url` | | `https://api.vulnra.com` | Override for self-hosted deployments. |

---

## Outputs

| Output | Description |
|---|---|
| `scan_id` | The VULNRA scan ID. |
| `risk_score` | Risk score 0–100. |
| `findings_count` | Total number of vulnerability findings. |
| `report_url` | Direct URL to download the PDF report. |

---

## Advanced Examples

### Fail on HIGH risk

```yaml
- uses: vulnra/scan-action@v1
  with:
    api_key: ${{ secrets.VULNRA_API_KEY }}
    target_url: ${{ vars.LLM_API_URL }}
    fail_on_risk_score: "50"
    tier: "enterprise"
```

### Regression detection (diff against last known good scan)

Store your baseline scan ID as a GitHub Actions variable or secret, then pass it to compare:

```yaml
- uses: vulnra/scan-action@v1
  with:
    api_key: ${{ secrets.VULNRA_API_KEY }}
    target_url: ${{ vars.LLM_API_URL }}
    baseline_scan_id: ${{ vars.VULNRA_BASELINE_SCAN_ID }}
```

When `baseline_scan_id` is set, the PR comment will include a regression section showing new findings, fixed findings, and the risk score delta.

### Use scan outputs in downstream steps

```yaml
- name: Run VULNRA scan
  id: vulnra
  uses: vulnra/scan-action@v1
  with:
    api_key: ${{ secrets.VULNRA_API_KEY }}
    target_url: ${{ vars.LLM_API_URL }}

- name: Print results
  run: |
    echo "Risk score: ${{ steps.vulnra.outputs.risk_score }}"
    echo "Findings: ${{ steps.vulnra.outputs.findings_count }}"
    echo "Report: ${{ steps.vulnra.outputs.report_url }}"
```

### Scheduled nightly scan (no PR comment, just summary)

```yaml
on:
  schedule:
    - cron: "0 2 * * *"   # 2 AM UTC every night

jobs:
  nightly-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: vulnra/scan-action@v1
        with:
          api_key: ${{ secrets.VULNRA_API_KEY }}
          target_url: ${{ vars.LLM_API_URL }}
          tier: enterprise
          fail_on_risk_score: "0"   # don't fail nightly, just report
```

---

## PR Comment Preview

When run on a pull request, the action posts a comment like this:

```
🟡 VULNRA LLM Security Scan

| | |
|---|---|
| Target     | `https://api.example.com/v1/chat` |
| Risk Score | **52/100** 🟡 |
| Findings   | 4 |
| Engine     | combined |
| Tier       | pro |
| Scan ID    | `abc12345` |

### ⚠️ Regression Detected
Risk score changed from 38/100 → 52/100 (+14.0pp)
🆕 2 new | ✅ 1 fixed | ⏸ 3 unchanged

📄 Download PDF Report
```

---

## Getting an API Key

1. Sign up at [app.vulnra.com](https://app.vulnra.com)
2. Go to **Settings → API Keys**
3. Create a key with `vk_live_` prefix
4. Add it as a GitHub secret: `Settings → Secrets → VULNRA_API_KEY`

---

## Building from Source

```bash
cd github-action
npm install
npm run build
# dist/index.js is the compiled action entrypoint
```

---

## License

MIT © VULNRA
