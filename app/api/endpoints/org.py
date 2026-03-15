"""
app/api/endpoints/org.py — Organization management for VULNRA Enterprise.

Endpoints:
  POST   /api/org                  — create organization (Enterprise only)
  GET    /api/org                  — get current org info + members
  POST   /api/org/invite           — invite member by email (sends via Resend)
  GET    /api/org/members          — list members with roles
  DELETE /api/org/members/{id}     — remove member
  GET    /api/org/scans            — list org scans (admin: all; member: own)
  GET    /api/audit-logs           — paginated audit log (admin only)
"""

import logging
import secrets
import time
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, validator

from app.core.security import get_current_user
from app.services.audit import log_action, get_audit_logs
from app.services.supabase_service import get_supabase

logger = logging.getLogger("vulnra.org")
router = APIRouter()


# ── Request models ────────────────────────────────────────────────────────────

class CreateOrgRequest(BaseModel):
    name: str

    @validator("name")
    def validate_name(cls, v):
        v = v.strip()
        if len(v) < 2 or len(v) > 100:
            raise ValueError("Organization name must be 2–100 characters.")
        return v


class InviteMemberRequest(BaseModel):
    email: str
    role: str = "member"

    @validator("email")
    def validate_email(cls, v):
        v = v.strip().lower()
        if "@" not in v:
            raise ValueError("Invalid email address.")
        return v

    @validator("role")
    def validate_role(cls, v):
        if v not in ("admin", "member"):
            raise ValueError("Role must be 'admin' or 'member'.")
        return v


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_user_org(user_id: str) -> Optional[dict]:
    """Return the org where the user is a member, or None."""
    try:
        sb = get_supabase()
        res = (
            sb.table("organization_members")
            .select("org_id, role, organizations(id, name, owner_id, tier, created_at)")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        return res.data
    except Exception as e:
        logger.warning(f"_get_user_org failed: {e}")
        return None


def _require_enterprise(current_user: dict):
    if current_user.get("tier") != "enterprise":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization features require Enterprise tier.",
        )


def _require_org_admin(user_id: str, org_id: str):
    try:
        sb = get_supabase()
        res = (
            sb.table("organization_members")
            .select("role")
            .eq("org_id", org_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if not res.data or res.data.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin role required for this action.",
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _send_invite_email(to_email: str, invite_token: str, org_name: str):
    """Send invitation email via Resend. Silently logs on failure."""
    try:
        from app.core.config import settings
        if not settings.resend_api_key:
            logger.warning("RESEND_API_KEY not set — skipping invite email")
            return

        import urllib.request, json as _json
        frontend_url = settings.frontend_url.rstrip("/")
        invite_url = f"{frontend_url}/org/join?token={invite_token}"

        body = _json.dumps({
            "from":    settings.alert_from_email,
            "to":      [to_email],
            "subject": f"You've been invited to join {org_name} on VULNRA",
            "html": (
                f"<p>You've been invited to join <strong>{org_name}</strong> on "
                f"<a href='https://vulnra.ai'>VULNRA</a>.</p>"
                f"<p><a href='{invite_url}'>Accept Invitation</a></p>"
                f"<p>This invite expires in 7 days.</p>"
            ),
        }).encode()

        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=body,
            headers={
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type":  "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10):
            pass
    except Exception as e:
        logger.warning(f"Invite email failed: {e}")


# ── POST /api/org — Create organization ───────────────────────────────────────

@router.post("/org")
async def create_org(
    body: CreateOrgRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Create a new organization. Enterprise tier required."""
    _require_enterprise(current_user)

    user_id = current_user["id"]

    # Check if already in an org
    existing = _get_user_org(user_id)
    if existing:
        raise HTTPException(
            status_code=400,
            detail="You are already a member of an organization.",
        )

    try:
        sb = get_supabase()
        org_id = str(uuid.uuid4())

        # Create org
        sb.table("organizations").insert({
            "id":         org_id,
            "name":       body.name,
            "owner_id":   user_id,
            "tier":       "enterprise",
            "created_at": "now()",
        }).execute()

        # Add creator as admin member
        sb.table("organization_members").insert({
            "org_id":  org_id,
            "user_id": user_id,
            "role":    "admin",
        }).execute()

        log_action(user_id, "org.created", org_id, request, {"org_name": body.name})

        return JSONResponse(
            status_code=201,
            content={
                "id":   org_id,
                "name": body.name,
                "role": "admin",
                "tier": "enterprise",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"create_org failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to create organization.")


# ── GET /api/org — Get org info ────────────────────────────────────────────────

@router.get("/org")
async def get_org(current_user: dict = Depends(get_current_user)):
    """Get current user's organization details."""
    _require_enterprise(current_user)

    membership = _get_user_org(current_user["id"])
    if not membership:
        raise HTTPException(status_code=404, detail="You are not a member of any organization.")

    org = membership.get("organizations", {})
    return JSONResponse(content={
        "id":         org.get("id"),
        "name":       org.get("name"),
        "owner_id":   org.get("owner_id"),
        "tier":       org.get("tier"),
        "created_at": str(org.get("created_at", "")),
        "your_role":  membership.get("role"),
    })


# ── POST /api/org/invite — Invite member ──────────────────────────────────────

@router.post("/org/invite")
async def invite_member(
    body: InviteMemberRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Invite a member to the organization by email."""
    _require_enterprise(current_user)

    user_id = current_user["id"]
    membership = _get_user_org(user_id)
    if not membership:
        raise HTTPException(status_code=404, detail="You are not a member of any organization.")

    org = membership.get("organizations", {})
    org_id = org.get("id")
    _require_org_admin(user_id, org_id)

    try:
        sb = get_supabase()

        # Create invite token
        token = secrets.token_urlsafe(32)
        expires_at = time.time() + 7 * 24 * 3600  # 7 days

        sb.table("organization_invites").insert({
            "id":         str(uuid.uuid4()),
            "org_id":     org_id,
            "email":      body.email,
            "role":       body.role,
            "token":      token,
            "expires_at": f"to_timestamp({expires_at})",
            "created_at": "now()",
        }).execute()

        _send_invite_email(body.email, token, org.get("name", "VULNRA"))
        log_action(user_id, "member.invited", org_id, request, {"invited_email": body.email, "role": body.role})

        return JSONResponse(
            status_code=201,
            content={
                "invited":     body.email,
                "role":        body.role,
                "expires_days": 7,
                "email_sent":  True,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"invite_member failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to send invitation.")


# ── GET /api/org/members — List members ───────────────────────────────────────

@router.get("/org/members")
async def list_members(current_user: dict = Depends(get_current_user)):
    """List all members of the user's organization."""
    _require_enterprise(current_user)

    membership = _get_user_org(current_user["id"])
    if not membership:
        raise HTTPException(status_code=404, detail="Not in an organization.")

    org_id = membership.get("organizations", {}).get("id")

    try:
        sb = get_supabase()
        res = (
            sb.table("organization_members")
            .select("user_id, role")
            .eq("org_id", org_id)
            .execute()
        )
        members = res.data or []

        # Pending invites
        inv_res = (
            sb.table("organization_invites")
            .select("email, role, created_at")
            .eq("org_id", org_id)
            .execute()
        )
        pending = inv_res.data or []

        return JSONResponse(content={
            "members": members,
            "pending_invites": pending,
            "org_id": org_id,
        })
    except Exception as e:
        logger.error(f"list_members failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch members.")


# ── DELETE /api/org/members/{id} — Remove member ──────────────────────────────

@router.delete("/org/members/{member_user_id}")
async def remove_member(
    member_user_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Remove a member from the organization (admin only)."""
    _require_enterprise(current_user)

    user_id = current_user["id"]
    if user_id == member_user_id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself.")

    membership = _get_user_org(user_id)
    if not membership:
        raise HTTPException(status_code=404, detail="Not in an organization.")

    org_id = membership.get("organizations", {}).get("id")
    _require_org_admin(user_id, org_id)

    try:
        sb = get_supabase()
        sb.table("organization_members").delete().eq("org_id", org_id).eq("user_id", member_user_id).execute()
        log_action(user_id, "member.removed", member_user_id, request, {"org_id": org_id})
        return JSONResponse(content={"removed": True, "user_id": member_user_id})
    except Exception as e:
        logger.error(f"remove_member failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove member.")


# ── GET /api/org/scans — Org scans ────────────────────────────────────────────

@router.get("/org/scans")
async def get_org_scans(
    limit: int = 20,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
):
    """List scans for the organization (admin sees all, member sees own)."""
    _require_enterprise(current_user)

    user_id = current_user["id"]
    membership = _get_user_org(user_id)
    if not membership:
        raise HTTPException(status_code=404, detail="Not in an organization.")

    org_id = membership.get("organizations", {}).get("id")
    is_admin = membership.get("role") == "admin"

    try:
        sb = get_supabase()
        limit = min(limit, 100)

        # Get all org member user_ids
        members_res = (
            sb.table("organization_members")
            .select("user_id")
            .eq("org_id", org_id)
            .execute()
        )
        member_ids = [m["user_id"] for m in (members_res.data or [])]

        query = (
            sb.table("scans")
            .select("*", count="exact")
            .in_("user_id", member_ids if is_admin else [user_id])
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )
        res = query.execute()

        return JSONResponse(content={
            "scans":  res.data or [],
            "total":  res.count or 0,
            "limit":  limit,
            "offset": offset,
        })
    except Exception as e:
        logger.error(f"get_org_scans failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch org scans.")


# ── GET /api/audit-logs — Audit log ───────────────────────────────────────────

@router.get("/audit-logs")
async def get_audit_log(
    limit: int = 50,
    offset: int = 0,
    user_filter: Optional[str] = None,
    action_filter: Optional[str] = None,
    request: Request = None,
    current_user: dict = Depends(get_current_user),
):
    """Retrieve paginated audit logs for the org (admin only)."""
    _require_enterprise(current_user)

    user_id = current_user["id"]
    membership = _get_user_org(user_id)
    if not membership:
        raise HTTPException(status_code=404, detail="Not in an organization.")

    org_id = membership.get("organizations", {}).get("id")
    _require_org_admin(user_id, org_id)

    log_action(user_id, "audit_log.viewed", org_id, request)

    result = get_audit_logs(
        org_id=org_id,
        user_id=user_filter,
        action_filter=action_filter,
        limit=limit,
        offset=offset,
    )
    return JSONResponse(content=result)
