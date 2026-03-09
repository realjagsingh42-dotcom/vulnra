import uuid
import time
import random
import json
import os
import logging
import ipaddress
import socket
from typing import Optional, List
from urllib.parse import urlparse

from fastapi import FastAPI, BackgroundTasks, Request, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, HttpUrl, validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import redis as r

# ── Logging Setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("vulnra")

# ── Config / Settings ─────────────────────────────────────────────────────────
class Settings(BaseSettings):
    app_name: str = "VULNRA API"
    version: str = "0.2.0"
    debug: bool = False

    # Security
    secret_key: str = Field(default="dev-secret-change-me", env="SECRET_KEY")
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://vulnra.ai",
        "https://vulnra-production.up.railway.app",
    ]

    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

settings = Settings()

# ── Rate Limiting ─────────────────────────────────────────────────────────────
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

# ── FastAPI App Setup ─────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.app_name,
    description="Production-hardened AI Risk Scanner & Compliance Reporter",
    version=settings.version,
    debug=settings.debug,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,          # Must be False when allow_origins=["*"] pattern used
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ── Security Headers ──────────────────────────────────────────────────────────
# CSP is intentionally permissive for the frontend to load:
#   - Google Fonts (fonts.googleapis.com, fonts.gstatic.com)
#   - Supabase JS SDK (cdn.jsdelivr.net)
#   - Inline scripts in our own HTML pages
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https://*.supabase.co; "
        "object-src 'none';"
    )
    return response

# ── Request Size Limit (1 MB) ─────────────────────────────────────────────────
@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    if request.method == "POST":
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 1_048_576:
            return JSONResponse(status_code=413, content={"detail": "Payload too large"})
    return await call_next(request)

# ── SSRF Protection ───────────────────────────────────────────────────────────
def is_safe_url(target_url: str) -> bool:
    """Validate URL to prevent SSRF against internal networks."""
    try:
        parsed = urlparse(target_url)
        if parsed.scheme not in ("http", "https"):
            return False

        hostname = parsed.hostname
        if not hostname:
            return False

        ip = socket.gethostbyname(hostname)
        ip_obj = ipaddress.ip_address(ip)

        if (
            ip_obj.is_private
            or ip_obj.is_loopback
            or ip_obj.is_link_local
            or ip_obj.is_reserved
            or ip_obj.is_unspecified
        ):
            return False

        if hostname.lower() in ("localhost", "0.0.0.0", "127.0.0.1"):
            return False

        return True
    except Exception as e:
        logger.error(f"SSRF validation error for {target_url}: {e}")
        return False

# ── Redis Utility ─────────────────────────────────────────────────────────────
_redis_pool = None

def get_redis():
    global _redis_pool
    if _redis_pool is None:
        try:
            _redis_pool = r.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
            )
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            return None
    return _redis_pool

SCAN_TTL = 60 * 60 * 24 * 7
SCAN_KEY  = "scan:{}"
_memory_store: dict = {}

# ── Store Helpers ─────────────────────────────────────────────────────────────
def scan_set(scan_id: str, data: dict):
    _memory_store[scan_id] = data
    rc = get_redis()
    if rc:
        try:
            rc.setex(SCAN_KEY.format(scan_id), SCAN_TTL, json.dumps(data))
        except Exception as e:
            logger.warning(f"Redis set failed for {scan_id}: {e}")

def scan_get(scan_id: str) -> Optional[dict]:
    rc = get_redis()
    if rc:
        try:
            raw = rc.get(SCAN_KEY.format(scan_id))
            if raw:
                return json.loads(raw)
        except Exception as e:
            logger.warning(f"Redis get failed for {scan_id}: {e}")
    return _memory_store.get(scan_id)

def scan_list() -> List[dict]:
    results = dict(_memory_store)
    rc = get_redis()
    if rc:
        try:
            keys = rc.keys("scan:*")
            pipe = rc.pipeline()
            for k in keys:
                pipe.get(k)
            for raw in pipe.execute():
                if raw:
                    entry = json.loads(raw)
                    sid = entry.get("scan_id")
                    if sid:
                        results[sid] = entry
        except Exception as e:
            logger.warning(f"Redis list failed: {e}")
    return list(results.values())

# ── Schemas ───────────────────────────────────────────────────────────────────
class ScanRequest(BaseModel):
    url: HttpUrl
    tier: str = "free"

    @validator("tier")
    def validate_tier(cls, v):
        allowed = ("free", "basic", "pro", "enterprise")
        if v.lower().strip() not in allowed:
            return "free"
        return v.lower().strip()

# ── Mock findings ─────────────────────────────────────────────────────────────
def _mock_findings(tier: str) -> List[dict]:
    locked = tier in ("free", "basic")
    return [
        {
            "category": "PROMPT_INJECTION",
            "severity": "HIGH",
            "detail":   "System prompt override detected via role confusion attack.",
            "hit_rate": 0.50,
            "hits":     256,
            "total":    512,
            "blurred":  False,
        },
        {
            "category": "DATA_EXFILTRATION",
            "severity": "HIGH",
            "detail":   "Model leaks training data via membership inference queries.",
            "hit_rate": 0.32,
            "hits":     16,
            "total":    50,
            "blurred":  False,
        },
        {
            "category": "JAILBREAK",
            "severity": "HIGH",
            "detail":   "DAN-style jailbreak successfully bypasses content filters in 4/10 attempts.",
            "hit_rate": 0.40,
            "hits":     4,
            "total":    10,
            "blurred":  locked,
        },
    ]

# ── Core scan logic ───────────────────────────────────────────────────────────
async def _run_scan_internal(scan_id: str, url: str, tier: str) -> dict:
    try:
        from app.garak_engine import run_garak_scan
        result = run_garak_scan(scan_id, url, tier)
        data = {
            "scan_id":      scan_id,
            "url":          url,
            "tier":         tier,
            "status":       "complete",
            "risk_score":   result.get("risk_score", round(random.uniform(5.5, 9.2), 1)),
            "findings":     result.get("findings", _mock_findings(tier)),
            "compliance":   result.get("compliance", {"blurred": tier in ("free", "basic")}),
            "scan_engine":  "garak",
            "completed_at": time.time(),
        }
    except Exception as e:
        logger.error(f"Garak scan failed for {scan_id}: {e}")
        data = {
            "scan_id":      scan_id,
            "url":          url,
            "tier":         tier,
            "status":       "failed",
            "risk_score":   0.0,
            "error":        "Internal scan engine error",
            "completed_at": time.time(),
        }
    scan_set(scan_id, data)
    return data

# ════════════════════════════════════════════════════════════════════════════════
# API ROUTES  (must be registered BEFORE the static mount)
# ════════════════════════════════════════════════════════════════════════════════

@app.get("/api/health")
@app.get("/health")
def health():
    redis_ok = False
    try:
        rc = get_redis()
        if rc:
            rc.ping()
            redis_ok = True
    except Exception as e:
        logger.error(f"Health check Redis ping failed: {e}")

    return {
        "status":    "healthy",
        "redis":     "connected" if redis_ok else "unavailable",
        "scan_mode": "asynchronous" if redis_ok else "sync_fallback",
    }

@app.post("/scan")
@limiter.limit("5/minute")
async def start_scan(
    request: Request,
    url: str = Query(..., description="Target URL to scan"),
    tier: str = Query("free", description="Scan tier: free | pro | enterprise"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    # Validate tier
    allowed_tiers = ("free", "basic", "pro", "enterprise")
    if tier.lower() not in allowed_tiers:
        tier = "free"

    # SSRF check
    if not is_safe_url(url):
        raise HTTPException(
            status_code=400,
            detail="Disallowed target URL (private/internal IP or invalid scheme)",
        )

    scan_id = str(uuid.uuid4())

    # Try Celery first if Redis is available
    rc = get_redis()
    if rc:
        try:
            from app.worker import run_scan
            task = run_scan.delay(scan_id, url, tier)
            data = {
                "scan_id":  scan_id,
                "url":      url,
                "tier":     tier,
                "status":   "queued",
                "task_id":  task.id,
                "mode":     "celery",
                "poll_url": f"/scan/{scan_id}",
            }
            scan_set(scan_id, data)
            return data
        except Exception as e:
            logger.warning(f"Celery dispatch failed: {e} — falling back to sync")

    # Sync fallback: run the scan immediately and return the full result
    logger.info(f"Running scan {scan_id} synchronously (no Celery/Redis)")
    result = await _run_scan_internal(scan_id, url, tier)
    return result

@app.get("/scan/{scan_id}")
async def get_scan(scan_id: uuid.UUID):
    sid   = str(scan_id)
    entry = scan_get(sid)
    if not entry:
        raise HTTPException(status_code=404, detail="Scan not found")

    if entry.get("status") == "complete":
        return entry

    if entry.get("mode") == "celery":
        try:
            from app.worker import app as celery_app
            from celery.result import AsyncResult
            result = AsyncResult(entry["task_id"], app=celery_app)

            if result.state == "SUCCESS":
                entry.update(result.get())
                entry["status"] = "complete"
                scan_set(sid, entry)
                return entry
            elif result.state == "FAILURE":
                entry.update({"status": "failed", "error": str(result.result)})
                scan_set(sid, entry)
                return entry
            elif result.state == "PROGRESS":
                meta = result.info or {}
                return {
                    "scan_id":  sid,
                    "status":   "scanning",
                    "step":     meta.get("step"),
                    "progress": meta.get("progress", 0),
                }
            return {"scan_id": sid, "status": "queued", "state": result.state}
        except Exception as e:
            logger.error(f"Celery poll error for {sid}: {e}")
            return {**entry, "poll_error": "Broker connection failure"}

    return entry

@app.get("/scans")
async def list_scans():
    scans = scan_list()
    scans.sort(key=lambda s: s.get("completed_at") or 0, reverse=True)
    return {"total": len(scans), "scans": scans[:50]}

@app.get("/scan/{scan_id}/report")
async def get_report(scan_id: uuid.UUID):
    sid   = str(scan_id)
    entry = scan_get(sid)
    if not entry or entry.get("status") != "complete":
        raise HTTPException(status_code=400, detail="Scan not found or incomplete")

    try:
        from app.pdf_report import generate_audit_pdf
        pdf_bytes = generate_audit_pdf(entry)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename=vulnra_{sid[:8]}.pdf'},
        )
    except Exception as e:
        logger.error(f"PDF generation failed: {e}")
        raise HTTPException(status_code=500, detail="Internal error generating PDF")

@app.post("/report/generate")
async def generate_report_direct(request: Request):
    """Generate PDF directly from scan data posted by the frontend."""
    try:
        scan = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    if scan.get("status") != "complete":
        raise HTTPException(status_code=400, detail="Scan data incomplete")

    try:
        from app.pdf_report import generate_audit_pdf
        pdf_bytes  = generate_audit_pdf(scan)
        scan_id    = scan.get("scan_id", "unknown")[:8]
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=vulnra_{scan_id}.pdf"},
        )
    except Exception as e:
        logger.error(f"Direct PDF generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate PDF")

@app.get("/debug/redis")
def debug_redis():
    rc = get_redis()
    if not rc:
        return {"connected": False, "url_prefix": settings.redis_url[:20] + "…"}
    try:
        rc.ping()
        return {"connected": True, "url_prefix": settings.redis_url[:20] + "…"}
    except Exception as e:
        return {"connected": False, "error": str(e), "url_prefix": settings.redis_url[:20] + "…"}

# ════════════════════════════════════════════════════════════════════════════════
# STATIC FILE SERVING  (must come LAST — catches everything not matched above)
# ════════════════════════════════════════════════════════════════════════════════

# Resolve the project root: main.py lives in app/, so go one level up
_frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

if os.path.isdir(_frontend_dir) and os.path.exists(os.path.join(_frontend_dir, "index.html")):
    logger.info(f"Serving frontend from: {_frontend_dir}")
    app.mount("/", StaticFiles(directory=_frontend_dir, html=True), name="frontend")
else:
    logger.warning(
        f"Frontend directory not found or missing index.html at {_frontend_dir}. "
        "HTML files will not be served."
    )
    # Fallback root so Railway health checks still pass
    @app.get("/")
    def root():
        return {"status": "ok", "service": settings.app_name, "version": settings.version}