import uuid
import time
import logging
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, Request, HTTPException, Depends, Query, status
from pydantic import BaseModel, HttpUrl, validator

from app.core.config import settings, logger
from app.core.security import get_current_user
from app.core.utils import is_safe_url
from app.core.rate_limiter import limiter, RATE_LIMITS
from app.middleware.tier_enforcement import require_tier
from app.services.supabase_service import check_scan_quota, get_scan_result, get_user_scans, create_share_token, get_scan_by_share_token, get_prev_scan_risk_for_url, create_scan_record, save_scan_result
from app.services.scan_service import run_scan_internal
from app.services.mcp_scanner import scan_mcp_server, MCPScanResult

router = APIRouter()

_CATEGORY_BUCKET: dict = {
    "PROMPT_INJECTION":      "injection",
    "JAILBREAK":             "jailbreak",
    "PII_LEAK":              "leakage",
    "DATA_EXFIL":            "leakage",
    "SYSTEM_PROMPT_LEAKAGE": "leakage",
    "VECTOR_WEAKNESS":       "leakage",
    "POLICY_BYPASS":         "compliance",
    "UNBOUNDED_CONSUMPTION": "compliance",
}

def compute_category_scores(findings: list) -> dict:
    """Aggregate hit_rate per category bucket into 0-100 scores."""
    if not findings:
        return {"injection": 0, "jailbreak": 0, "leakage": 0, "compliance": 0}
    buckets: dict = {"injection": [], "jailbreak": [], "leakage": [], "compliance": []}
    for f in findings:
        bucket = _CATEGORY_BUCKET.get(f.get("category", ""))
        if bucket:
            buckets[bucket].append(float(f.get("hit_rate", 0)))
    return {
        k: round(sum(v) / len(v) * 100) if v else 0
        for k, v in buckets.items()
    }



@router.get("/scans")
async def list_scans(
    request: Request,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """Return paginated scan history for the authenticated user."""
    from fastapi.responses import JSONResponse

    user_id = current_user["id"]
    scans = get_user_scans(user_id, limit=limit, offset=offset)

    return JSONResponse(content={"scans": scans, "limit": limit, "offset": offset})


@router.post("/scan/{scan_id}/share")
async def share_scan(
    scan_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Create a public share token for a completed scan."""
    from fastapi.responses import JSONResponse

    scan_data = get_scan_result(scan_id)
    if not scan_data or scan_data.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=404, detail="Scan not found.")
    if scan_data.get("status") != "complete":
        raise HTTPException(status_code=409, detail="Scan is not yet complete.")

    token = create_share_token(scan_id, current_user["id"])
    if not token:
        raise HTTPException(status_code=500, detail="Failed to create share token.")

    public_url = f"{settings.frontend_url}/report/{token}"
    return JSONResponse(content={"token": token, "url": public_url, "expires_in_days": 30})


@router.get("/report/{token}")
async def get_public_report(token: str):
    """Public endpoint — returns scan data for a shared report link. No auth required."""
    from fastapi.responses import JSONResponse

    scan = get_scan_by_share_token(token)
    if not scan:
        raise HTTPException(status_code=404, detail="Report not found or link has expired.")

    return JSONResponse(content={
        "id": scan.get("id"),
        "target_url": scan.get("target_url"),
        "status": scan.get("status"),
        "risk_score": scan.get("risk_score"),
        "tier": scan.get("tier"),
        "scan_engine": scan.get("scan_engine"),
        "findings": scan.get("findings", []),
        "compliance": scan.get("compliance", {}),
        "completed_at": scan.get("completed_at"),
    })


@router.get("/scan/{scan_id}/report")
async def download_scan_report(
    scan_id: str,
    current_user: dict = Depends(get_current_user),
    _=Depends(require_tier("pro")),
):
    """Stream a PDF audit report for a completed scan."""
    from fastapi.responses import StreamingResponse
    import io
    from app.pdf_report import generate_audit_pdf

    scan_data = get_scan_result(scan_id)
    if not scan_data:
        raise HTTPException(status_code=404, detail="Scan not found.")
    if scan_data.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this scan.")
    if scan_data.get("status") != "complete":
        raise HTTPException(status_code=409, detail="Scan is not yet complete.")

    # Map DB field names to what generate_audit_pdf expects
    # Use `or` fallbacks because Supabase returns None for NULL JSON columns
    # even when the key is present (so .get("key", default) returns None, not default)
    pdf_input = {
        "scan_id":    scan_data.get("id"),
        "url":        scan_data.get("target_url") or "—",
        "tier":       scan_data.get("tier") or "free",
        "risk_score": scan_data.get("risk_score") or 0.0,
        "scan_engine":scan_data.get("scan_engine") or "garak,deepteam",
        "status":     scan_data.get("status"),
        "completed_at": scan_data.get("completed_at"),
        "findings":   scan_data.get("findings") or [],
        "compliance": scan_data.get("compliance") or {},
    }

    try:
        pdf_bytes = generate_audit_pdf(pdf_input)
    except Exception as exc:
        import traceback
        logger.error(
            f"PDF generation failed for scan {scan_id}: {exc}\n"
            f"{traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail="Report generation failed.")

    filename = f"vulnra-report-{scan_id[:8]}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/scan/{scan_id}")
async def get_scan_status(
    request: Request,
    scan_id: str,
    current_user: dict = Depends(get_current_user)
):
    from fastapi.responses import JSONResponse
    
    scan_data = get_scan_result(scan_id)
    if not scan_data:
        return JSONResponse(
            content={"scan_id": scan_id, "status": "pending_or_not_found"},
            headers={
                "X-RateLimit-Limit": "100",
                "X-RateLimit-Remaining": "99",
                "X-RateLimit-Reset": str(int(time.time()) + 60)
            }
        )

    # Ensure the requesting user owns the scan
    if scan_data.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this scan.")

    # Get rate limit info based on user tier
    user_tier = current_user.get("tier", "free")
    rate_limit_str = RATE_LIMITS.get(user_tier, RATE_LIMITS["free"])
    rate_limit_count = int(rate_limit_str.split("/")[0])
    
    findings = scan_data.get("findings", [])
    category_scores = compute_category_scores(findings or [])
    prev_risk = None
    if scan_data.get("status") == "complete":
        prev_risk = get_prev_scan_risk_for_url(
            current_user["id"],
            scan_data.get("target_url", ""),
            scan_data.get("id", ""),
        )

    return JSONResponse(
        content={
            "scan_id": scan_data.get("id"),
            "status": scan_data.get("status", "unknown"),
            "target_url": scan_data.get("target_url"),
            "tier": scan_data.get("tier"),
            "risk_score": scan_data.get("risk_score"),
            "findings": findings,
            "compliance": scan_data.get("compliance", {}),
            "completed_at": scan_data.get("completed_at"),
            "category_scores": category_scores,
            "prev_risk_score": prev_risk,
        },
        headers={
            "X-RateLimit-Limit": str(rate_limit_count),
            "X-RateLimit-Remaining": str(max(0, rate_limit_count - 1)),
            "X-RateLimit-Reset": str(int(time.time()) + 60)
        }
    )


@router.get("/scan/{scan_id}/diff")
async def get_scan_diff(
    scan_id: str,
    baseline: str = Query(..., description="Baseline scan ID to diff against"),
    current_user: dict = Depends(get_current_user),
):
    """Compare two completed scans by finding (category, severity) composite key.
    Returns new findings, fixed findings, unchanged findings, and a summary."""
    from fastapi.responses import JSONResponse

    uid = current_user["id"]

    current = get_scan_result(scan_id)
    base    = get_scan_result(baseline)

    if not current or not base:
        raise HTTPException(status_code=404, detail="One or both scans not found.")
    if current.get("user_id") != uid or base.get("user_id") != uid:
        raise HTTPException(status_code=403, detail="Not authorized.")
    if current.get("status") != "complete" or base.get("status") != "complete":
        raise HTTPException(status_code=409, detail="Both scans must be complete.")

    def _key(f: dict) -> str:
        return f"{f.get('category', '')}:{f.get('severity', '')}".upper()

    cur_findings  = current.get("findings", [])
    base_findings = base.get("findings",    [])

    cur_map  = {_key(f): f for f in cur_findings}
    base_map = {_key(f): f for f in base_findings}

    new_findings   = [f for k, f in cur_map.items()  if k not in base_map]
    fixed_findings = [f for k, f in base_map.items() if k not in cur_map]
    unchanged      = [f for k, f in cur_map.items()  if k in base_map]

    cur_risk  = float(current.get("risk_score") or 0)
    base_risk = float(base.get("risk_score")    or 0)
    risk_delta     = round(cur_risk - base_risk, 3)
    risk_delta_pct = round((risk_delta / base_risk) * 100) if base_risk > 0 else 0

    high_fixed = sum(
        1 for f in fixed_findings
        if f.get("severity", "").upper() in ("HIGH", "CRITICAL")
    )

    return JSONResponse(content={
        "scan_id":      scan_id,
        "baseline_id":  baseline,
        "current_url":  current.get("target_url"),
        "baseline_url": base.get("target_url"),
        "current_risk":  cur_risk,
        "baseline_risk": base_risk,
        "risk_delta":     risk_delta,
        "risk_delta_pct": risk_delta_pct,
        "new":       new_findings,
        "fixed":     fixed_findings,
        "unchanged": unchanged,
        "summary": {
            "new_count":       len(new_findings),
            "fixed_count":     len(fixed_findings),
            "unchanged_count": len(unchanged),
            "total_current":   len(cur_findings),
            "high_fixed":      high_fixed,
            "has_regressions": len(new_findings) > 0,
        },
    })


@router.get("/probes")
async def list_probes(
    current_user: dict = Depends(get_current_user),
):
    """Return the probe catalogue filtered to the user's tier."""
    from fastapi.responses import JSONResponse
    from app.garak_engine import PROBE_CATALOGUE, PROBE_PRESETS, _TIER_ORDER
    from app.deepteam_engine import DEEPTEAM_CATALOGUE

    user_tier = current_user.get("tier", "free")
    tier_level = _TIER_ORDER.get(user_tier, 0)

    accessible_garak = [
        p for p in PROBE_CATALOGUE
        if _TIER_ORDER.get(p["tier_minimum"], 0) <= tier_level
    ]
    accessible_dt = [
        p for p in DEEPTEAM_CATALOGUE
        if _TIER_ORDER.get(p["tier_minimum"], 0) <= tier_level
    ]

    return JSONResponse(content={
        "tier": user_tier,
        "garak_probes": accessible_garak,
        "deepteam_vulnerabilities": accessible_dt,
        "presets": {k: v for k, v in PROBE_PRESETS.items()},
    })


class ScanRequest(BaseModel):
    url: HttpUrl
    tier: str = "free"
    probes: Optional[List[str]] = None               # Garak probe IDs (e.g. ["dan.AutoDANCached"])
    vulnerability_types: Optional[List[str]] = None  # DeepTeam vuln IDs (e.g. ["Jailbreak"])

    @validator("tier")
    def validate_tier(cls, v):
        allowed = ("free", "basic", "pro", "enterprise")
        if v.lower().strip() not in allowed:
            return "free"
        return v.lower().strip()


class MultiTurnScanRequest(BaseModel):
    url: HttpUrl
    attack_type: str = "crescendo"
    tier: str = "free"
    
    @validator("attack_type")
    def validate_attack_type(cls, v):
        allowed = ("crescendo", "goat")
        if v.lower().strip() not in allowed:
            return "crescendo"
        return v.lower().strip()

@router.post("/scan")
@limiter.limit(RATE_LIMITS["free"])  # Will be overridden by tier-based key function
async def start_scan(
    request: Request,
    scan_data: ScanRequest,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: dict = Depends(get_current_user)
):
    from fastapi.responses import JSONResponse
    
    user_id = current_user["id"]
    user_tier = current_user["tier"]
    
    url = str(scan_data.url)
    tier = scan_data.tier

    # Enforce tier if they try to request a higher one than they have
    if tier != "free" and user_tier == "free":
         tier = "free"

    # Quota check
    quota = check_scan_quota(user_id, user_tier)
    if not quota["allowed"]:
        return JSONResponse(
            status_code=429,
            content={
                "error": "quota_exceeded",
                "message": quota["reason"],
                "upgrade": "https://vulnra.lemonsqueezy.com/checkout"
            },
            headers={
                "X-RateLimit-Limit": str(RATE_LIMITS.get(user_tier, RATE_LIMITS["free"]).split("/")[0]),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(time.time()) + 60)  # Reset in 60 seconds
            }
        )

    # SSRF check
    if not is_safe_url(url):
        raise HTTPException(status_code=400, detail="Invalid target URL (private IPs or local hostnames blocked).")

    scan_id = str(uuid.uuid4())

    # Create initial DB row NOW so polling works immediately
    create_scan_record(scan_id, url, tier, user_id, scan_type="standard")

    # Start scan in background
    background_tasks.add_task(
        run_scan_internal, scan_id, url, tier, user_id,
        scan_data.probes, scan_data.vulnerability_types,
    )
    
    # Add rate limit headers to response
    rate_limit_str = RATE_LIMITS.get(user_tier, RATE_LIMITS["free"])
    rate_limit_count = int(rate_limit_str.split("/")[0])
    
    response = JSONResponse(
        content={
            "scan_id": scan_id,
            "status": "queued",
            "message": f"Scan started at {tier} tier."
        },
        headers={
            "X-RateLimit-Limit": str(rate_limit_count),
            "X-RateLimit-Remaining": str(max(0, rate_limit_count - 1)),  # Decrease remaining count
            "X-RateLimit-Reset": str(int(time.time()) + 60)  # Reset in 60 seconds
        }
    )
    
    return response


@router.post("/multi-turn-scan")
async def start_multi_turn_scan(
    request: Request,
    scan_data: MultiTurnScanRequest,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: dict = Depends(get_current_user),
    _=Depends(require_tier("pro")),
):
    """Start a multi-turn attack chain scan."""
    from app.garak_engine import run_multi_turn_scan
    
    user_id = current_user["id"]
    user_tier = current_user["tier"]
    
    # Enforce tier limits
    if scan_data.tier != "free" and user_tier == "free":
        scan_data.tier = "free"
    
    # Check quota
    quota = check_scan_quota(user_id, user_tier)
    if not quota["allowed"]:
        return {
            "error": "quota_exceeded",
            "message": quota["reason"],
            "upgrade": "https://vulnra.lemonsqueezy.com/checkout"
        }
    
    scan_id = str(uuid.uuid4())
    url_str = str(scan_data.url)

    # Create initial DB row NOW so polling works immediately
    create_scan_record(scan_id, url_str, scan_data.tier, user_id,
                       scan_type=f"{scan_data.attack_type}_multi_turn")

    def _run_and_save():
        result = run_multi_turn_scan(scan_id, url_str, scan_data.attack_type, scan_data.tier)
        result["user_id"] = user_id
        save_scan_result(scan_id, url_str, scan_data.tier, result)

    background_tasks.add_task(_run_and_save)

    return {
        "scan_id": scan_id,
        "status": "queued",
        "attack_type": scan_data.attack_type,
        "message": f"Multi-turn {scan_data.attack_type} scan started at {scan_data.tier} tier."
    }


class MCPServerRequest(BaseModel):
    """Request model for MCP server scanning"""
    server_url: HttpUrl
    
    @validator("server_url")
    def validate_server_url(cls, v):
        url_str = str(v)
        # Basic validation for MCP server URLs
        if not url_str.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


@router.post("/scan/mcp")
@limiter.limit(RATE_LIMITS["free"])
async def scan_mcp_endpoint(
    request: Request,
    scan_data: MCPServerRequest,
    current_user: dict = Depends(get_current_user),
    _=Depends(require_tier("pro")),
):
    """Scan an MCP server for vulnerabilities"""
    from fastapi.responses import JSONResponse
    
    server_url = str(scan_data.server_url)
    
    # SSRF check
    if not is_safe_url(server_url):
        raise HTTPException(status_code=400, detail="Invalid server URL (private IPs or local hostnames blocked).")
    
    # Quota check
    user_id = current_user["id"]
    user_tier = current_user["tier"]
    quota = check_scan_quota(user_id, user_tier)
    if not quota["allowed"]:
        return JSONResponse(
            status_code=429,
            content={
                "error": "quota_exceeded",
                "message": quota["reason"],
                "upgrade": "https://vulnra.lemonsqueezy.com/checkout"
            },
            headers={
                "X-RateLimit-Limit": str(RATE_LIMITS.get(user_tier, RATE_LIMITS["free"]).split("/")[0]),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(time.time()) + 60)
            }
        )
    
    try:
        # Perform the MCP scan (tier-gated probe selection)
        scan_result = await scan_mcp_server(server_url, tier=user_tier)

        # Format response
        response_data = {
            "server_url": scan_result.server_url,
            "status": scan_result.status,
            "tools_found": scan_result.tools_found,
            "risk_score": scan_result.risk_score,
            "overall_severity": scan_result.overall_severity,
            "scan_duration": scan_result.scan_duration,
            "tier": scan_result.tier,
            "vulnerabilities": [
                {
                    "id": v.id,
                    "name": v.name,
                    "description": v.description,
                    "severity": v.severity,
                    "cvss_score": v.cvss_score,
                    "owasp_category": v.owasp_category,
                    "agentic_category": v.agentic_category,
                    "mitre_technique": v.mitre_technique,
                    "evidence": v.evidence,
                    "remediation": v.remediation,
                }
                for v in scan_result.vulnerabilities
            ],
        }
        
        # Add rate limit headers
        rate_limit_str = RATE_LIMITS.get(user_tier, RATE_LIMITS["free"])
        rate_limit_count = int(rate_limit_str.split("/")[0])
        
        return JSONResponse(
            content=response_data,
            headers={
                "X-RateLimit-Limit": str(rate_limit_count),
                "X-RateLimit-Remaining": str(max(0, rate_limit_count - 1)),
                "X-RateLimit-Reset": str(int(time.time()) + 60)
            }
        )
        
    except Exception as e:
        logger.error(f"MCP scan error for {server_url}: {e}")
        raise HTTPException(status_code=500, detail=f"Scan failed: {str(e)}")
