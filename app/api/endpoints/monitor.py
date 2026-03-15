from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, HttpUrl, validator, EmailStr

from app.core.security import get_current_user
from app.core.utils import is_safe_url
from app.services.supabase_service import (
    create_sentinel_watch, list_sentinel_watches,
    delete_sentinel_watch, _SENTINEL_LIMITS,
)

router = APIRouter()


class CreateWatchRequest(BaseModel):
    url: HttpUrl
    interval_hours: int = 24
    notification_email: Optional[str] = None

    @validator("interval_hours")
    def validate_interval(cls, v):
        if v < 1 or v > 720:
            raise ValueError("interval_hours must be between 1 and 720.")
        return v

    @validator("notification_email")
    def validate_email(cls, v):
        if v is None:
            return v
        v = v.strip()
        if v and "@" not in v:
            raise ValueError("Invalid email address.")
        return v or None


@router.post("/monitor")
async def create_watch(
    body: CreateWatchRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a new sentinel watch. Pro/Enterprise only."""
    tier = current_user["tier"]
    if tier not in _SENTINEL_LIMITS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sentinel monitoring requires Pro or Enterprise tier.",
        )

    url_str = str(body.url)
    if not is_safe_url(url_str):
        raise HTTPException(status_code=400, detail="Invalid URL (private IPs blocked).")

    try:
        watch = create_sentinel_watch(
            user_id=current_user["id"],
            url=url_str,
            interval_hours=body.interval_hours,
            tier=tier,
            notification_email=body.notification_email,
        )
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    limits = _SENTINEL_LIMITS[tier]
    return JSONResponse(
        status_code=201,
        content={
            "watch": watch,
            "limit": limits["max_watches"],
            "min_interval_hours": limits["min_interval_hours"],
        },
    )


@router.get("/monitor")
async def get_watches(current_user: dict = Depends(get_current_user)):
    """List all active sentinel watches for the authenticated user."""
    tier   = current_user["tier"]
    watches = list_sentinel_watches(current_user["id"])
    limits  = _SENTINEL_LIMITS.get(tier, {"max_watches": 0, "min_interval_hours": 24})
    return JSONResponse(content={
        "watches": watches,
        "limit": limits["max_watches"],
        "tier": tier,
        "sentinel_available": tier in _SENTINEL_LIMITS,
    })


@router.delete("/monitor/{watch_id}")
async def remove_watch(
    watch_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete (deactivate) a sentinel watch."""
    ok = delete_sentinel_watch(watch_id, current_user["id"])
    if not ok:
        raise HTTPException(status_code=404, detail="Watch not found.")
    return JSONResponse(content={"deleted": True, "id": watch_id})
