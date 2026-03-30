"""
VULNRA — User Profile & Notification Prefs Endpoints
GET  /api/user/profile          — fetch display_name, notification prefs
PATCH /api/user/profile         — update display_name
PATCH /api/user/notifications   — update alert_threshold, alert_new_high, etc.
DELETE /api/user                — delete account (danger zone)
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.security import get_current_user
from app.core.deps import require_db

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Models ────────────────────────────────────────────────────────────────────

class ProfilePatch(BaseModel):
    display_name: Optional[str] = None
    notification_email: Optional[str] = None


class NotificationsPatch(BaseModel):
    notification_email: Optional[str] = None
    alert_threshold: Optional[int] = None      # percentage points 0-100
    alert_new_high: Optional[bool] = None
    alert_scan_complete: Optional[bool] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fetch_profile(user_id: str) -> dict:
    sb = require_db()
    resp = sb.table("profiles").select("*").eq("id", user_id).execute()
    rows = resp.data or []
    return rows[0] if rows else {}


def _upsert_profile(user_id: str, fields: dict) -> dict:
    sb = require_db()
    fields["id"] = user_id
    resp = sb.table("profiles").upsert(fields, on_conflict="id").execute()
    rows = resp.data or []
    return rows[0] if rows else {}


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/api/user/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    profile = _fetch_profile(user_id)

    return {
        "user_id":             user_id,
        "email":               current_user.get("email"),
        "tier":                current_user.get("tier", "free"),
        "display_name":        profile.get("display_name"),
        "notification_email":  profile.get("notification_email"),
        "alert_threshold":     profile.get("alert_threshold", 20),
        "alert_new_high":      profile.get("alert_new_high", True),
        "alert_scan_complete": profile.get("alert_scan_complete", False),
        "created_at":          current_user.get("created_at"),
    }


@router.patch("/api/user/profile")
async def update_profile(
    body: ProfilePatch,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    fields: dict = {}

    if body.display_name is not None:
        name = body.display_name.strip()
        if len(name) > 64:
            raise HTTPException(400, "display_name must be ≤ 64 characters")
        fields["display_name"] = name

    if body.notification_email is not None:
        fields["notification_email"] = body.notification_email.strip() or None

    if not fields:
        raise HTTPException(400, "Nothing to update")

    _upsert_profile(user_id, fields)
    return {"status": "ok", **fields}


@router.patch("/api/user/notifications")
async def update_notifications(
    body: NotificationsPatch,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    fields: dict = {}

    if body.notification_email is not None:
        fields["notification_email"] = body.notification_email.strip() or None
    if body.alert_threshold is not None:
        v = body.alert_threshold
        if not (0 <= v <= 100):
            raise HTTPException(400, "alert_threshold must be 0–100")
        fields["alert_threshold"] = v
    if body.alert_new_high is not None:
        fields["alert_new_high"] = body.alert_new_high
    if body.alert_scan_complete is not None:
        fields["alert_scan_complete"] = body.alert_scan_complete

    if not fields:
        raise HTTPException(400, "Nothing to update")

    _upsert_profile(user_id, fields)
    return {"status": "ok", **fields}


@router.delete("/api/user")
async def delete_account(current_user: dict = Depends(get_current_user)):
    """
    Soft-delete by revoking all API keys + sentinel watches.
    Hard-delete of auth.users must be done via Supabase admin (service-role).
    """
    user_id = current_user["id"]
    try:
        from app.services.supabase_service import get_supabase
        sb = get_supabase()
        if sb:
            sb.table("api_keys").update({"revoked": True}).eq("user_id", user_id).execute()
            sb.table("sentinel_watches").delete().eq("user_id", user_id).execute()
            sb.table("webhooks").delete().eq("user_id", user_id).execute()

            # Delete auth user using service-role admin client
            from supabase import create_client
            import os
            url = os.environ.get("SUPABASE_URL", "")
            service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
            if url and service_key:
                admin = create_client(url, service_key)
                admin.auth.admin.delete_user(user_id)

        return {"status": "deleted"}
    except Exception as exc:
        logger.error("delete_account error: %s", exc)
        raise HTTPException(500, "Account deletion failed — contact support@vulnra.ai")
