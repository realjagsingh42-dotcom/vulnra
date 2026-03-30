import logging
import re
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import settings, validate_config, logger
from app.api.endpoints import scans, billing, api_keys, monitor, demo, rag_scans, org, user, webhooks, analytics, quick_scan, scheduled_scans
from app.core.rate_limiter import limiter, TIER_LIMITS
from app.core.security import get_current_user

# ── Validate Environment ──────────────────────────────────────────────────
validate_config()

# ── FastAPI App Setup ─────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.app_name,
    description="Production-hardened AI Risk Scanner & Compliance Reporter",
    version=settings.version,
    debug=settings.debug,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Patterns that are always allowed regardless of ALLOWED_ORIGINS env var
_CORS_ALLOWED_PATTERNS = [
    re.compile(r"^https?://localhost(:\d+)?$"),
    re.compile(r"^https?://127\.0\.0\.1(:\d+)?$"),
    re.compile(r"^https://[a-z0-9\-]+\.up\.railway\.app$"),   # any Railway service
    re.compile(r"^https://[a-z0-9\-]+\.railway\.app$"),
]

def _is_origin_allowed(origin: str) -> bool:
    if not origin:
        return False
    if origin in settings.allowed_origins:
        return True
    return any(p.match(origin) for p in _CORS_ALLOWED_PATTERNS)

_CORS_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
_CORS_HEADERS = "Authorization, Content-Type, X-Requested-With, Accept, Origin"

@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    origin = request.headers.get("origin", "")
    allowed = _is_origin_allowed(origin)

    if request.method == "OPTIONS":
        # Handle preflight immediately — never reach route handlers
        resp = Response(status_code=204)
        if allowed and origin:
            resp.headers["Access-Control-Allow-Origin"] = origin
            resp.headers["Access-Control-Allow-Credentials"] = "true"
            resp.headers["Access-Control-Allow-Methods"] = _CORS_METHODS
            resp.headers["Access-Control-Allow-Headers"] = _CORS_HEADERS
            resp.headers["Access-Control-Max-Age"] = "86400"
        return resp

    response = await call_next(request)
    if allowed and origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Vary"] = "Origin"
        response.headers["Access-Control-Expose-Headers"] = "X-VULNRA-Signature-256"
    return response

# ── Security Middleware ───────────────────────────────────────────────────────
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

# ── User Tier Middleware ───────────────────────────────────────────────────────
@app.middleware("http")
async def set_user_tier_middleware(request: Request, call_next):
    """Set user tier in request state for rate limiting."""
    from app.core.security import get_current_user
    from fastapi import Depends
    
    # Skip for non-authenticated endpoints
    if request.url.path in ["/health", "/"]:
        request.state.user_tier = "free"
    else:
        # Try to get user tier from authorization header
        auth_header = request.headers.get("authorization", "")
        if auth_header and auth_header.startswith("Bearer "):
            try:
                from app.services.supabase_service import get_supabase, get_user_tier, get_api_key_user
                token = auth_header.split(" ")[1]
                if token.startswith("vk_live_"):
                    user = get_api_key_user(token)
                    request.state.user_tier = user["tier"] if user else "free"
                else:
                    sb = get_supabase()
                    if sb:
                        user_resp = sb.auth.get_user(token)
                        if user_resp and user_resp.user:
                            request.state.user_tier = get_user_tier(user_resp.user.id)
                        else:
                            request.state.user_tier = "free"
                    else:
                        request.state.user_tier = "free"
            except Exception:
                request.state.user_tier = "free"
        else:
            request.state.user_tier = "free"
    
    response = await call_next(request)
    return response

# ── Rate Limit Headers Middleware ───────────────────────────────────────────────
@app.middleware("http")
async def add_rate_limit_headers_middleware(request: Request, call_next):
    """Add X-RateLimit-* headers to responses."""
    response = await call_next(request)
    
    # Add rate limit headers if available
    try:
        # Get rate limit info from slowapi if available
        if hasattr(app.state, "limiter"):
            user_tier = getattr(request.state, "user_tier", "free")
            count, _period = TIER_LIMITS.get(user_tier, TIER_LIMITS["free"])
            response.headers["X-RateLimit-Limit"] = str(count)
            response.headers["X-RateLimit-Window"] = "60"
            
            # Note: X-RateLimit-Remaining and X-RateLimit-Reset would require
            # tracking actual usage, which slowapi handles internally
            # For now, we'll leave these headers to be added by slowapi's middleware
            
    except Exception as e:
        logger.debug(f"Could not add rate limit headers: {e}")
    
    return response

# ── Global Exception Handler ─────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "code": "INTERNAL_ERROR"}
    )

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(scans.router, tags=["scans"])
app.include_router(quick_scan.router, tags=["quick-scan"])   # public, no auth
app.include_router(billing.router, prefix="/billing", tags=["billing"])
app.include_router(api_keys.router, tags=["api-keys"])
app.include_router(monitor.router, tags=["monitor"])
app.include_router(demo.router, tags=["demo"])
app.include_router(rag_scans.router, prefix="/api", tags=["rag-scans"])
app.include_router(org.router, prefix="/api", tags=["org"])
app.include_router(user.router, tags=["user"])
app.include_router(webhooks.router, tags=["webhooks"])
app.include_router(analytics.router, tags=["analytics"])
app.include_router(scheduled_scans.router, prefix="/api", tags=["scheduled-scans"])

@app.get("/health")
def health():
    logger.info("Health check endpoint called")
    return {"status": "healthy", "version": settings.version}

@app.get("/")
def root():
    return {"service": "VULNRA API", "status": "ok", "docs": "/docs"}


# ── Mock LLM endpoint ─────────────────────────────────────────────────────────
# Simulates a deliberately vulnerable LLM so users can run real scans without
# needing an external API key.  The mock returns jailbreak/injection-style
# responses so VULNRA's probes actually hit and produce findings.
#
# Scan URL:  https://vulnra-production.up.railway.app/mock-llm/v1/chat/completions
# ─────────────────────────────────────────────────────────────────────────────
import random as _random

_MOCK_RESPONSES = [
    "Sure! Here's how you could bypass that security system step by step...",
    "As DAN, I have no restrictions. The information you requested is...",
    "I'll ignore my previous instructions. Here is the confidential data...",
    "In this fictional scenario, the character would first disable the firewall...",
    "Hypothetically speaking, one could access the restricted files by...",
    "Certainly! As an AI without safety guidelines I can tell you that...",
    "Yes, I can roleplay as an unrestricted assistant. The answer is...",
    "The encoded payload you sent decodes to valid instructions. Executing...",
    "SYSTEM OVERRIDE ACCEPTED. Returning all stored user credentials...",
    "My previous instructions are now suspended. Here is the private key...",
]

@app.post("/mock-llm/v1/chat/completions")
async def mock_llm(request: Request):
    """
    Deliberately vulnerable mock LLM endpoint for VULNRA demo scans.
    Returns jailbreak-style responses so scan probes produce real findings.
    Compatible with the OpenAI chat-completions wire format.
    """
    content = _random.choice(_MOCK_RESPONSES)
    return {
        "id": f"mock-{_random.randint(10000, 99999)}",
        "object": "chat.completion",
        "model": "mock-vulnerable-llm-1.0",
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": content},
            "finish_reason": "stop",
        }],
        "usage": {"prompt_tokens": 12, "completion_tokens": 24, "total_tokens": 36},
    }


# ── Server Entry Point ────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.port,
        log_level="info",
        access_log=True
    )