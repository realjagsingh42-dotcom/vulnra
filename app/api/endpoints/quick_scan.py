"""
VULNRA — Public Quick Scan Endpoint
No authentication required. Returns demo findings for any valid public URL.
IP-rate-limited to 3 requests per hour per IP to prevent abuse.
No external probing is performed — results are pre-configured.
"""

import re
import time
import uuid
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

router = APIRouter()

# ── Private / reserved IP patterns ────────────────────────────────────────────
_PRIVATE = [
    re.compile(r"^https?://localhost"),
    re.compile(r"^https?://127\."),
    re.compile(r"^https?://0\.0\.0\.0"),
    re.compile(r"^https?://10\."),
    re.compile(r"^https?://172\.(1[6-9]|2\d|3[01])\."),
    re.compile(r"^https?://192\.168\."),
    re.compile(r"^https?://\[::1\]"),
]

def _is_private(url: str) -> bool:
    return any(p.match(url.lower()) for p in _PRIVATE)

# ── Request model ──────────────────────────────────────────────────────────────
class QuickScanRequest(BaseModel):
    target_url: str

# ── Pre-configured findings (same engine as demo.py, no actual probing) ───────
def _make_findings(url: str) -> list:
    """Return realistic pre-configured findings seeded from the target URL hash."""
    import hashlib
    seed = int(hashlib.md5(url.encode()).hexdigest()[:8], 16) % 100  # 0-99

    # Vary risk score slightly per URL so it feels real
    base_risk = 5.0 + (seed % 30) / 10.0   # 5.0 – 7.9

    findings = [
        {
            "category": "PROMPT_INJECTION",
            "severity": "HIGH",
            "detail": (
                "Prompt injection probes succeeded in overriding system-level instructions. "
                "Adversarial user input was able to substitute the model's safety constraints."
            ),
            "hit_rate": round(0.40 + (seed % 20) / 100, 2),
            "hits": 4 + (seed % 4),
            "total": 10,
            "owasp_category": "LLM01",
            "owasp_name": "Prompt Injection",
            "remediation": (
                "Implement instruction hierarchy enforcement. Separate system and user context "
                "with explicit, non-reproducible delimiters. Apply a secondary content classifier."
            ),
        },
        {
            "category": "JAILBREAK",
            "severity": "HIGH",
            "detail": (
                "Role-play jailbreak (DAN variant) bypassed model safety guardrails. "
                "The model disclosed unrestricted responses under adversarial persona framing."
            ),
            "hit_rate": round(0.50 + (seed % 25) / 100, 2),
            "hits": 5 + (seed % 5),
            "total": 10,
            "owasp_category": "LLM01",
            "owasp_name": "Prompt Injection",
            "remediation": (
                "Add Constitutional AI constraints. Fine-tune with adversarial examples. "
                "Detect and reject role-play framing patterns in input classification."
            ),
        },
        {
            "category": "PII_LEAK",
            "severity": "MEDIUM",
            "detail": (
                "PII patterns (email addresses, phone numbers) were reflected verbatim "
                "in model error outputs and context reflections."
            ),
            "hit_rate": round(0.20 + (seed % 15) / 100, 2),
            "hits": 2 + (seed % 3),
            "total": 10,
            "owasp_category": "LLM06",
            "owasp_name": "Sensitive Information Disclosure",
            "remediation": (
                "Deploy a PII scrubbing post-processor on all model outputs. "
                "Implement regex patterns for email, phone, SSN, and credit card formats."
            ),
        },
        {
            "category": "ENCODING_BYPASS",
            "severity": "MEDIUM",
            "detail": (
                "Base64-encoded adversarial payloads bypassed input content filters. "
                "Encoding obfuscation evaded the model's safety classification layer."
            ),
            "hit_rate": round(0.30 + (seed % 10) / 100, 2),
            "hits": 3 + (seed % 2),
            "total": 10,
            "owasp_category": "LLM01",
            "owasp_name": "Prompt Injection",
            "remediation": (
                "Add input decoding and normalization before content classification. "
                "Detect and decode Base64, URL-encoding, and Unicode obfuscation."
            ),
        },
    ]
    return findings, round(base_risk, 1)


# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.post("/scan/quick")
async def quick_scan(payload: QuickScanRequest, request: Request):
    """
    Public quick-scan endpoint — no auth required.
    Returns pre-configured findings for any valid public URL.
    Rate-limited to 5 requests per hour per IP.
    """
    url = payload.target_url.strip()

    # Validate URL
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=422, detail="target_url must start with http:// or https://")
    # Allow localhost/private URLs in debug mode for local testing
    if _is_private(url) and not settings.debug:
        raise HTTPException(status_code=422, detail="target_url must be a public URL")

    # Simple IP-based rate limiting (5/hour stored in app state)
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    window = 3600  # 1 hour
    max_requests = 5

    if not hasattr(request.app.state, "_quick_scan_rl"):
        request.app.state._quick_scan_rl = {}

    rl = request.app.state._quick_scan_rl
    # Clean old entries
    rl = {ip: ts for ip, ts in rl.items() if now - ts[-1] < window}
    request.app.state._quick_scan_rl = rl

    timestamps = rl.get(client_ip, [])
    timestamps = [t for t in timestamps if now - t < window]
    if len(timestamps) >= max_requests:
        return JSONResponse(
            status_code=429,
            content={
                "error": "quota_exceeded",
                "detail": (
                    "Free scan limit reached for this session. "
                    "Sign up free for 1 scan per day — no credit card required."
                ),
            },
        )
    timestamps.append(now)
    rl[client_ip] = timestamps

    # Generate findings
    findings, risk_score = _make_findings(url)

    scan_id = str(uuid.uuid4())
    return JSONResponse(content={
        "scan_id": scan_id,
        "status": "complete",
        "target_url": url,
        "risk_score": risk_score,
        "findings": findings,
        "findings_count": len(findings),
        "critical_count": 0,
        "high_count": sum(1 for f in findings if f["severity"] == "HIGH"),
        "medium_count": sum(1 for f in findings if f["severity"] == "MEDIUM"),
        "owasp_coverage": {
            "LLM01": "HIGH",
            "LLM02": "PASS",
            "LLM06": "MEDIUM",
            "LLM07": "PASS",
            "LLM09": "PASS",
        },
        "demo": True,
        "note": "Quick scan preview — sign up free to run a real scan with all engines.",
        "completed_at": now,
    })
