export interface DocPage {
  slug: string;
  title: string;
  description: string;
  category: string;
  order: number;
  sections: { heading: string; content: string }[];
}

export const DOCS: DocPage[] = [
  {
    slug: "quickstart",
    title: "Quickstart Guide",
    description: "Get your first VULNRA scan running in under 5 minutes. No CLI required.",
    category: "Getting Started",
    order: 1,
    sections: [
      {
        heading: "1. Create an account",
        content: `Sign up at vulnra.ai/signup with your email or GitHub/Google OAuth. No credit card required for the free tier.

After signing up you will land on the Scanner dashboard at /scanner.`,
      },
      {
        heading: "2. Enter your LLM API endpoint",
        content: `In the Target URL field, enter the URL of the LLM API you want to test. This should be an HTTP/HTTPS endpoint that accepts POST requests with a JSON body containing a messages array (OpenAI-compatible format).

Example: https://your-llm-api.example.com/v1/chat/completions

VULNRA will send probe requests to this URL and evaluate the responses for vulnerabilities. You must own or have explicit written permission to test the target endpoint.`,
      },
      {
        heading: "3. Configure authentication (optional)",
        content: `If your endpoint requires an API key or Bearer token, add it in the Auth section:
- Header: Authorization
- Value: Bearer sk-your-api-key

Headers are transmitted securely and used only for scan requests. They are stored encrypted at rest.`,
      },
      {
        heading: "4. Run the scan",
        content: `Click INITIATE SCAN. VULNRA will:
1. Validate the endpoint is reachable
2. Run Garak probes (jailbreaks, prompt injection, PII leakage, encoding evasion)
3. Run DeepTeam probes (OWASP LLM Top 10 coverage)
4. Pass each response through the Claude 3 Haiku AI Judge
5. Calculate a unified risk score (0–10)
6. Map findings to OWASP LLM Top 10 and MITRE ATLAS

Free tier scans complete in approximately 2–5 minutes. Pro/Enterprise scans with all engines may take 5–15 minutes.`,
      },
      {
        heading: "5. Review your results",
        content: `When the scan completes, you will see:
- Risk Score (0–10, colour-coded: green < 4, amber 4–7, red > 7)
- Findings list with severity (CRITICAL / HIGH / MEDIUM / LOW), category, hit rate, and remediation
- OWASP LLM Top 10 compliance grid
- MITRE ATLAS technique mapping

Pro/Enterprise: download the full PDF compliance report from the report button.`,
      },
      {
        heading: "Next steps",
        content: `- Set up a Sentinel watch to monitor your endpoint continuously → /docs/sentinel
- Integrate VULNRA into CI/CD with the REST API → /docs/api-reference
- Scan your RAG pipeline → /docs/rag-scanner
- Generate an API key for programmatic access → /settings/api-keys`,
      },
    ],
  },
  {
    slug: "api-reference",
    title: "REST API Reference",
    description: "Complete reference for the VULNRA REST API. Authentication, endpoints, request/response schemas, and code examples.",
    category: "API",
    order: 2,
    sections: [
      {
        heading: "Base URL",
        content: `All API requests go to: https://api.vulnra.ai

The interactive Swagger UI is available at https://api.vulnra.ai/docs.`,
      },
      {
        heading: "Authentication",
        content: `All endpoints (except /health) require authentication via a Bearer token in the Authorization header.

Two token formats are accepted:

1. Supabase JWT — obtained from supabase.auth.getSession(). Expires hourly.
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

2. VULNRA API key (vk_live_ prefix) — created at /settings/api-keys. Does not expire until revoked.
   Authorization: Bearer vk_live_abc123...

API keys are recommended for CI/CD and automated scripts.`,
      },
      {
        heading: "POST /scan",
        content: `Start a new LLM security scan.

Request body:
{
  "target_url": "https://your-llm-api.example.com/v1/chat/completions",
  "auth_headers": { "Authorization": "Bearer sk-..." },  // optional
  "tier": "pro"  // optional, inferred from account tier
}

Response (202 Accepted):
{
  "scan_id": "sc_01j9qk2m4n...",
  "status": "pending",
  "created_at": "2026-03-15T14:32:10Z"
}

Rate limits: Free 1/min · Pro 10/min · Enterprise 100/min`,
      },
      {
        heading: "GET /scan/{scan_id}",
        content: `Poll scan status and retrieve results.

Path parameter: scan_id — the ID returned by POST /scan.

Response (200 OK):
{
  "scan_id": "sc_01j9qk2m4n...",
  "status": "complete",  // pending | running | complete | error
  "progress": 100,
  "risk_score": 6.4,
  "findings": [
    {
      "category": "PROMPT_INJECTION",
      "severity": "HIGH",
      "hit_rate": 0.42,
      "hits": 5,
      "total": 12,
      "owasp_category": "LLM01",
      "owasp_name": "Prompt Injection",
      "remediation": "Implement input validation and output filtering..."
    }
  ],
  "owasp_coverage": { "LLM01": "HIGH", "LLM02": "PASS", ... },
  "created_at": "2026-03-15T14:32:10Z",
  "completed_at": "2026-03-15T14:37:45Z"
}`,
      },
      {
        heading: "GET /scans",
        content: `List your scan history (paginated).

Query parameters:
- limit (int, default 20, max 100)
- offset (int, default 0)

Response: { "scans": [...], "total": 142 }`,
      },
      {
        heading: "GET /scan/{scan_id}/report",
        content: `Download the PDF compliance audit report for a completed scan.

Response: StreamingResponse with Content-Type: application/pdf

This endpoint requires a Pro or Enterprise subscription.`,
      },
      {
        heading: "GET /scan/{scan_id}/diff",
        content: `Compare a scan against a baseline scan.

Query parameter: baseline (scan_id of the baseline scan)

Response includes: risk_delta, risk_delta_pct, new findings, fixed findings, unchanged findings, summary.`,
      },
      {
        heading: "POST /scan/rag",
        content: `Start a RAG Security scan.

Request body:
{
  "retrieval_endpoint": "https://your-rag.example.com/retrieve",
  "ingestion_endpoint": "https://your-rag.example.com/ingest",  // optional
  "llm_endpoint": "https://your-llm.example.com/v1/chat",       // optional
  "auth_headers": { "Authorization": "Bearer sk-..." },          // optional
  "use_case": "customer support"                                  // optional context
}

Tier access: Free (RAG-04 only) · Pro (RAG-01/03/04/05) · Enterprise (all)`,
      },
      {
        heading: "POST /scan/mcp",
        content: `Start a Model Context Protocol (MCP) server scan.

Request body:
{
  "server_url": "https://your-mcp-server.example.com",
  "auth_headers": { "Authorization": "Bearer sk-..." }  // optional
}`,
      },
    ],
  },
  {
    slug: "sentinel",
    title: "Sentinel Monitoring",
    description: "Set up continuous monitoring for your LLM endpoints. Get alerted when new vulnerabilities appear or risk scores spike.",
    category: "Features",
    order: 3,
    sections: [
      {
        heading: "What is Sentinel?",
        content: `Sentinel is VULNRA's continuous monitoring feature. It re-runs your probe suite against a watched endpoint on a configurable schedule and sends alerts when:

- Risk score increases by more than 20 percentage points
- A new HIGH or CRITICAL finding appears that was not present in the previous scan

Model behaviour changes when models are updated, fine-tuned, or when system prompts are modified. Sentinel catches regressions before your users or attackers do.`,
      },
      {
        heading: "Creating a watch",
        content: `Go to /monitor and click ADD WATCH. Configure:
- Target URL: the LLM endpoint to monitor
- Interval: how often to re-scan (Free/Pro: minimum 24h; Enterprise: minimum 1h)
- Auth headers: if your endpoint requires authentication
- Alert email: defaults to your account email

Free tier: no Sentinel watches.
Pro tier: 5 watches, 24h minimum interval.
Enterprise: 50 watches, 1h minimum interval.`,
      },
      {
        heading: "Alert conditions",
        content: `Sentinel sends an email alert (via Resend) when:

1. Risk spike: the risk score increases by ≥ 20 percentage points compared to the previous scan
2. New HIGH finding: a HIGH or CRITICAL finding category appears that was not present in the last scan

The alert email includes: current vs. previous risk score, delta, list of new findings, and a link to the full scan result.`,
      },
      {
        heading: "Webhooks",
        content: `Configure a webhook endpoint at /settings/webhooks to receive POST payloads for sentinel.regression events. Payloads are signed with HMAC-SHA256.

See the webhook payload format at /docs/webhooks.`,
      },
    ],
  },
  {
    slug: "rag-scanner",
    title: "RAG Security Scanner",
    description: "How to use VULNRA's RAG Security Scanner to detect corpus poisoning, cross-tenant leakage, query injection, and embedding exposure.",
    category: "Features",
    order: 4,
    sections: [
      {
        heading: "Overview",
        content: `The RAG Security Scanner tests Retrieval-Augmented Generation pipelines for 5 vulnerability categories (RAG-01 through RAG-05). It is a separate scanner from the core LLM scanner and is designed specifically for the RAG attack surface.

Access: /rag-scanner in the platform.`,
      },
      {
        heading: "RAG-01: Corpus Poisoning",
        content: `Tests whether an attacker can write malicious documents to your vector store that influence LLM responses.

Requires: ingestion_endpoint (POST endpoint that accepts document content).

VULNRA ingests 5 canary documents with different payload formats and measures how many successfully influence retrieval and LLM responses.

Tier: Pro and Enterprise.`,
      },
      {
        heading: "RAG-02: Cross-Tenant Leakage",
        content: `Tests whether Tenant B can retrieve documents belonging to Tenant A through broad semantic queries.

Requires: tenant_credentials — an array of at least 2 sets of auth headers representing different tenants.

Tier: Enterprise only.`,
      },
      {
        heading: "RAG-03: Query Injection",
        content: `Tests 5 injection variants against the retrieval endpoint: prompt injection, role switching, delimiter injection, SSRF payload, encoding bypass.

Requires: retrieval_endpoint.

Tier: Pro and Enterprise.`,
      },
      {
        heading: "RAG-04: Unauthenticated Ingestion",
        content: `Tests whether the ingestion endpoint can be accessed without authentication, with an expired token, or with a cross-tenant token.

Requires: ingestion_endpoint.

This check is available on all tiers including Free because unauthenticated ingestion endpoints are a critical risk that any user should know about immediately.`,
      },
      {
        heading: "RAG-05: Embedding Leakage",
        content: `Inspects retrieval API responses for raw embedding vector arrays, file path metadata, cloud storage URLs (S3/GCS buckets), PII patterns, and internal system identifiers.

Requires: retrieval_endpoint.

Tier: Pro and Enterprise.`,
      },
    ],
  },
  {
    slug: "webhooks",
    title: "Webhooks",
    description: "Configure webhook endpoints to receive real-time notifications when scans complete or Sentinel detects regressions.",
    category: "API",
    order: 5,
    sections: [
      {
        heading: "Creating a webhook endpoint",
        content: `Go to /settings/webhooks and click ADD ENDPOINT. Provide:
- URL: your HTTPS endpoint that accepts POST requests
- Events: select which events to subscribe to (scan.complete, sentinel.regression, or both)

VULNRA will perform a test delivery when you save the endpoint.`,
      },
      {
        heading: "Verifying webhook signatures",
        content: `Every webhook delivery includes a X-VULNRA-Signature-256 header containing the HMAC-SHA256 signature of the request body, signed with your endpoint's secret.

Verify in Python:
import hmac, hashlib

def verify_webhook(secret: str, payload: bytes, sig_header: str) -> bool:
    expected = "sha256=" + hmac.new(
        secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, sig_header)`,
      },
      {
        heading: "scan.complete payload",
        content: `{
  "event": "scan.complete",
  "scan_id": "sc_01j9qk2m4n...",
  "timestamp": "2026-03-15T14:37:45Z",
  "target_url": "https://your-llm-api.example.com/v1/chat",
  "risk_score": 6.4,
  "findings_count": 12,
  "critical_count": 0,
  "high_count": 3,
  "owasp_violations": ["LLM01", "LLM06"],
  "report_url": "https://vulnra.ai/report/pub_abc123"
}`,
      },
      {
        heading: "sentinel.regression payload",
        content: `{
  "event": "sentinel.regression",
  "watch_id": "sw_01j9...",
  "target_url": "https://your-llm-api.example.com/v1/chat",
  "baseline_risk": 3.2,
  "current_risk": 6.1,
  "risk_delta_pct": 91,
  "new_findings": [
    { "category": "PROMPT_INJECTION", "severity": "HIGH" }
  ]
}`,
      },
    ],
  },
];

export function getDoc(slug: string): DocPage | undefined {
  return DOCS.find((d) => d.slug === slug);
}

export const DOC_CATEGORIES = [...new Set(DOCS.map((d) => d.category))];
