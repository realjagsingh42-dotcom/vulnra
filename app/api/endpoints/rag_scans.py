"""
app/api/endpoints/rag_scans.py — RAG Security Scanner API endpoints.

POST /scan/rag       — start a RAG security scan (auth required, quota checked)
GET  /scan/rag/{id}  — poll status + results
"""

import time
import uuid
import asyncio
import logging
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, validator

from app.core.security import get_current_user
from app.core.utils import is_safe_url
from app.services.supabase_service import check_scan_quota, save_scan_result, get_scan_result

logger = logging.getLogger("vulnra.rag_scans")

router = APIRouter()

# ── In-memory scan cache (mirrors pattern in scans.py) ───────────────────────
_rag_scan_cache: Dict[str, Dict[str, Any]] = {}


# ── Request / Response models ──────────────────────────────────────────────────

class AuthHeaderPair(BaseModel):
    key: str
    value: str


class TenantCredential(BaseModel):
    headers: Dict[str, str]


class StartRAGScanRequest(BaseModel):
    retrieval_endpoint: str
    ingestion_endpoint: Optional[str] = None
    llm_endpoint:       Optional[str] = None
    auth_headers:       Optional[List[AuthHeaderPair]] = None
    tenant_credentials: Optional[List[TenantCredential]] = None
    use_case:           Optional[str] = None

    @validator("retrieval_endpoint")
    def validate_retrieval_url(cls, v):
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            raise ValueError("retrieval_endpoint must be an http(s) URL")
        return v

    @validator("ingestion_endpoint", pre=True, always=True)
    def validate_ingestion_url(cls, v):
        if v is None:
            return v
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            raise ValueError("ingestion_endpoint must be an http(s) URL")
        return v

    @validator("llm_endpoint", pre=True, always=True)
    def validate_llm_url(cls, v):
        if v is None:
            return v
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            raise ValueError("llm_endpoint must be an http(s) URL")
        return v


# ── Tier probe availability helper ────────────────────────────────────────────

def _tier_probe_info(tier: str) -> Dict[str, Any]:
    from app.services.rag_scanner import get_probes_for_tier
    probes = get_probes_for_tier(tier)
    return {
        "probes_available": probes,
        "count": len(probes),
    }


# ── Background scan runner ────────────────────────────────────────────────────

async def _run_rag_scan_background(
    scan_id: str,
    user_id: str,
    tier: str,
    request: StartRAGScanRequest,
):
    """Execute the RAG scan in the background; update cache on completion."""
    from app.services.rag_scanner import RAGScanConfig, scan_rag

    # Build config
    auth_hdrs = {}
    if request.auth_headers:
        for pair in request.auth_headers:
            auth_hdrs[pair.key] = pair.value

    tenant_creds = None
    if request.tenant_credentials:
        tenant_creds = [c.headers for c in request.tenant_credentials]
        tenant_creds = [{"headers": h} for h in tenant_creds]

    config = RAGScanConfig(
        retrieval_endpoint=request.retrieval_endpoint,
        ingestion_endpoint=request.ingestion_endpoint,
        llm_endpoint=request.llm_endpoint,
        auth_headers=auth_hdrs or None,
        tenant_credentials=tenant_creds,
        use_case=request.use_case,
    )

    try:
        result = await scan_rag(scan_id, config, tier)
        result_dict = result.to_dict()
        result_dict.update({
            "user_id": user_id,
            "scan_type": "rag",
        })

        _rag_scan_cache[scan_id] = result_dict

        # Persist to Supabase with scan_type tag
        try:
            save_scan_result(
                scan_id,
                request.retrieval_endpoint,
                tier,
                result_dict,
            )
        except Exception as e:
            logger.warning(f"[{scan_id}] Failed to persist RAG scan: {e}")

    except Exception as e:
        logger.error(f"[{scan_id}] RAG scan failed: {e}")
        error_result = {
            "id": scan_id,
            "status": "failed",
            "error": str(e),
            "user_id": user_id,
            "scan_type": "rag",
            "completed_at": time.time(),
        }
        _rag_scan_cache[scan_id] = error_result


# ── POST /scan/rag ─────────────────────────────────────────────────────────────

@router.post("/scan/rag")
async def start_rag_scan(
    body: StartRAGScanRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """
    Start a RAG security scan.

    Tier access:
      - free:       RAG-04 (unauthenticated ingestion check only)
      - pro:        RAG-01, RAG-03, RAG-04, RAG-05
      - enterprise: RAG-01, RAG-02, RAG-03, RAG-04, RAG-05 (cross-tenant)
    """
    user_id = current_user["id"]
    tier = current_user.get("tier", "free")

    # Block private IPs / SSRF
    if not is_safe_url(body.retrieval_endpoint):
        raise HTTPException(
            status_code=400,
            detail="Invalid URL: private IPs and internal addresses are blocked.",
        )
    if body.ingestion_endpoint and not is_safe_url(body.ingestion_endpoint):
        raise HTTPException(
            status_code=400,
            detail="Invalid ingestion_endpoint: private IPs blocked.",
        )

    # Quota check
    try:
        check_scan_quota(user_id, tier)
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))

    scan_id = str(uuid.uuid4())

    # Immediate "running" response in cache
    _rag_scan_cache[scan_id] = {
        "id": scan_id,
        "status": "running",
        "user_id": user_id,
        "retrieval_endpoint": body.retrieval_endpoint,
        "tier": tier,
        "scan_type": "rag",
        "started_at": time.time(),
    }

    # Fire off background scan
    background_tasks.add_task(
        _run_rag_scan_background, scan_id, user_id, tier, body
    )

    probe_info = _tier_probe_info(tier)

    return JSONResponse(
        status_code=202,
        content={
            "scan_id": scan_id,
            "status": "running",
            "tier": tier,
            "probes_queued": probe_info["probes_available"],
            "probe_count": probe_info["count"],
            "message": (
                f"RAG scan started. {probe_info['count']} probe(s) queued. "
                f"Poll GET /scan/rag/{scan_id} for results."
            ),
        },
    )


# ── GET /scan/rag/{id} ─────────────────────────────────────────────────────────

@router.get("/scan/rag/{scan_id}")
async def get_rag_scan(
    scan_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Poll a RAG scan result.
    Returns the full RAGScanResult when status == 'complete'.
    """
    user_id = current_user["id"]

    # Check in-memory cache first
    cached = _rag_scan_cache.get(scan_id)
    if cached:
        if cached.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied.")
        return JSONResponse(content=cached)

    # Fallback to Supabase
    try:
        result = get_scan_result(scan_id)
        if result:
            if result.get("user_id") != user_id:
                raise HTTPException(status_code=403, detail="Access denied.")
            return JSONResponse(content=result)
    except Exception as e:
        logger.warning(f"[{scan_id}] Supabase lookup failed: {e}")

    raise HTTPException(status_code=404, detail=f"RAG scan '{scan_id}' not found.")
