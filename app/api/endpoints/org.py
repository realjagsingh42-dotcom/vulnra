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

  # SSO Endpoints
  GET    /api/org/sso              — list SSO configs
  POST   /api/org/sso              — create SSO config
  PUT    /api/org/sso/{id}         — update SSO config
  DELETE /api/org/sso/{id}        — delete SSO config
  POST   /api/org/sso/{id}/test    — test SSO connection
  GET    /api/org/sso/identities  — list SSO identities
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
from app.core.rate_limiter import limiter
from app.core.config import settings
from app.services.audit import log_action, get_audit_logs
from app.services.supabase_service import get_supabase
from app.services import sso_service

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
        logger.error(f"_get_user_org failed: {e}")
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
        # Verify the target user is actually a member of this org before deleting
        member_check = (
            sb.table("organization_members")
            .select("user_id")
            .eq("org_id", org_id)
            .eq("user_id", member_user_id)
            .maybe_single()
            .execute()
        )
        if not member_check.data:
            raise HTTPException(status_code=404, detail="Member not found in this organization.")
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


# ── POST /api/org/join — Accept invitation ────────────────────────────────────

class AcceptInviteRequest(BaseModel):
    token: str

    @validator("token")
    def validate_token(cls, v):
        v = v.strip()
        if len(v) < 10:
            raise ValueError("Invalid invite token.")
        return v


@router.post("/org/join")
async def accept_org_invite(
    body: AcceptInviteRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """
    Accept an organization invite.
    Validates the token, adds the user to the org, marks the invite consumed.
    Enterprise tier is required only at the org level — any user can accept an invite.
    """
    user_id = current_user["id"]

    try:
        sb = get_supabase()

        # Fetch invite by token
        inv_res = (
            sb.table("organization_invites")
            .select("id, org_id, email, role, expires_at, accepted_at")
            .eq("token", body.token)
            .maybe_single()
            .execute()
        )
        invite = inv_res.data
        if not invite:
            raise HTTPException(status_code=404, detail="Invite not found or already used.")

        # Verify the invite was issued to the authenticated user's email
        invite_email = (invite.get("email") or "").lower()
        current_email = (current_user.get("email") or "").lower()
        if invite_email != current_email:
            raise HTTPException(
                status_code=403,
                detail="This invite was issued to a different email address.",
            )

        if invite.get("accepted_at"):
            raise HTTPException(status_code=409, detail="This invite has already been accepted.")

        # Check expiry (expires_at is an ISO timestamp string from Supabase)
        import datetime as _dt
        expires_raw = invite.get("expires_at", "")
        if expires_raw:
            try:
                exp_dt = _dt.datetime.fromisoformat(expires_raw.replace("Z", "+00:00"))
                now_dt = _dt.datetime.now(_dt.timezone.utc)
                if now_dt > exp_dt:
                    raise HTTPException(status_code=410, detail="This invite has expired.")
            except HTTPException:
                raise
            except Exception:
                pass  # if parsing fails, proceed

        org_id = invite["org_id"]
        role   = invite.get("role", "member")

        # Check not already a member
        existing = (
            sb.table("organization_members")
            .select("user_id")
            .eq("org_id", org_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if existing.data:
            raise HTTPException(status_code=409, detail="You are already a member of this organization.")

        # Add member
        sb.table("organization_members").insert({
            "org_id":    org_id,
            "user_id":   user_id,
            "role":      role,
        }).execute()

        # Mark invite accepted
        sb.table("organization_invites").update({
            "accepted_at": "now()",
        }).eq("id", invite["id"]).execute()

        # Fetch org name for response
        org_res = (
            sb.table("organizations")
            .select("name")
            .eq("id", org_id)
            .maybe_single()
            .execute()
        )
        org_name = (org_res.data or {}).get("name", "")

        log_action(user_id, "member.joined", org_id, request, {"role": role, "invite_id": invite["id"]})

        return JSONResponse(
            status_code=200,
            content={
                "joined":   True,
                "org_id":   org_id,
                "org_name": org_name,
                "role":     role,
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"accept_org_invite failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to accept invitation.")


# ── GET /api/org/join — Preview invite (no auth required) ─────────────────────

@router.get("/org/join")
@limiter.limit("5/minute")
async def preview_org_invite(request: Request, token: str):
    """
    Public endpoint — returns org name + role for invite preview page.
    Does NOT require authentication so the join page can display info before login.
    """
    token = (token or "").strip()
    # Invite tokens are generated with secrets.token_urlsafe(32) → 43 base64url chars
    import re as _re
    if not token or not _re.fullmatch(r"[A-Za-z0-9_\-]{20,128}", token):
        raise HTTPException(status_code=400, detail="Invalid token.")

    try:
        sb = get_supabase()
        inv_res = (
            sb.table("organization_invites")
            .select("org_id, role, expires_at, accepted_at, organizations(name)")
            .eq("token", token.strip())
            .maybe_single()
            .execute()
        )
        invite = inv_res.data
        if not invite:
            raise HTTPException(status_code=404, detail="Invite not found.")
        if invite.get("accepted_at"):
            raise HTTPException(status_code=409, detail="This invite has already been accepted.")

        org_name = (invite.get("organizations") or {}).get("name", "Unknown Organization")

        return JSONResponse(content={
            "org_name": org_name,
            "org_id":   invite["org_id"],
            "role":     invite.get("role", "member"),
            "valid":    True,
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"preview_org_invite failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to load invite.")


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


# ═══════════════════════════════════════════════════════════════════════════
# SSO ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

class CreateSSORequest(BaseModel):
    provider_type: str
    provider_name: str
    idp_entity_id: str
    idp_sso_url: str
    idp_certificate: Optional[str] = ""
    idp_logout_url: Optional[str] = ""
    client_id: Optional[str] = ""
    client_secret: Optional[str] = ""
    scopes: Optional[str] = "openid email profile"
    allowed_domains: Optional[list[str]] = []


class UpdateSSORequest(BaseModel):
    provider_name: Optional[str] = None
    idp_entity_id: Optional[str] = None
    idp_sso_url: Optional[str] = None
    idp_certificate: Optional[str] = None
    idp_logout_url: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    scopes: Optional[str] = None
    allowed_domains: Optional[list[str]] = None
    enabled: Optional[bool] = None


def _get_user_org_id(user_id: str) -> Optional[str]:
    """Get user's organization ID."""
    sb = get_supabase()
    res = (
        sb.table("organization_members")
        .select("org_id, organizations(id)")
        .eq("user_id", user_id)
        .execute()
    )
    if not res.data:
        return None
    return res.data[0].get("organizations", {}).get("id")


def _require_org_admin(user_id: str, org_id: str) -> None:
    """Require user to be org owner or admin."""
    sb = get_supabase()
    res = (
        sb.table("organization_members")
        .select("role")
        .eq("user_id", user_id)
        .eq("org_id", org_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=403, detail="Not a member of this organization.")
    role = res.data[0]["role"]
    if role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Admin access required.")


def _require_pro_or_enterprise(user: dict) -> None:
    """Require Pro or Enterprise tier."""
    tier = user.get("user_metadata", {}).get("tier", "free")
    if tier not in ("pro", "enterprise"):
        raise HTTPException(status_code=403, detail="Pro or Enterprise tier required.")


@router.get("/org/sso")
async def list_sso_configs(
    current_user: dict = Depends(get_current_user),
):
    """List all SSO configurations for the user's organization."""
    _require_pro_or_enterprise(current_user)

    user_id = current_user["id"]
    org_id = _get_user_org_id(user_id)
    if not org_id:
        raise HTTPException(status_code=404, detail="Not in an organization.")

    configs = sso_service.get_all_sso_configs(org_id)
    return JSONResponse(content={
        "configs": [
            {
                "id": c.id,
                "org_id": c.org_id,
                "provider_type": c.provider_type,
                "provider_name": c.provider_name,
                "idp_entity_id": c.idp_entity_id,
                "idp_sso_url": c.idp_sso_url,
                "enabled": c.enabled,
                "allowed_domains": c.allowed_domains,
                "created_at": None,
                "updated_at": None,
                "last_tested_at": None,
                "last_test_status": None,
            }
            for c in configs
        ]
    })


@router.post("/org/sso")
async def create_sso_config(
    req: CreateSSORequest,
    current_user: dict = Depends(get_current_user),
    request: Request = None,
):
    """Create a new SSO configuration."""
    _require_pro_or_enterprise(current_user)

    user_id = current_user["id"]
    org_id = _get_user_org_id(user_id)
    if not org_id:
        raise HTTPException(status_code=404, detail="Not in an organization.")
    _require_org_admin(user_id, org_id)

    if req.provider_type not in ("saml", "oidc"):
        raise HTTPException(status_code=400, detail="Provider type must be 'saml' or 'oidc'.")

    config = sso_service.create_sso_config(
        org_id=org_id,
        provider_type=req.provider_type,
        provider_name=req.provider_name,
        idp_entity_id=req.idp_entity_id,
        idp_sso_url=req.idp_sso_url,
        idp_certificate=req.idp_certificate or "",
        idp_logout_url=req.idp_logout_url or "",
        client_id=req.client_id or "",
        client_secret=req.client_secret or "",
        scopes=req.scopes or "openid email profile",
        allowed_domains=req.allowed_domains or [],
    )

    log_action(user_id, "sso.config.created", config.id, request, {"provider_type": req.provider_type, "provider_name": req.provider_name})

    return JSONResponse(content={
        "id": config.id,
        "provider_type": config.provider_type,
        "provider_name": config.provider_name,
        "enabled": config.enabled,
    })


@router.put("/org/sso/{config_id}")
async def update_sso_config(
    config_id: str,
    req: UpdateSSORequest,
    current_user: dict = Depends(get_current_user),
    request: Request = None,
):
    """Update an SSO configuration."""
    _require_pro_or_enterprise(current_user)

    user_id = current_user["id"]
    org_id = _get_user_org_id(user_id)
    if not org_id:
        raise HTTPException(status_code=404, detail="Not in an organization.")
    _require_org_admin(user_id, org_id)

    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update.")

    config = sso_service.update_sso_config(config_id, **updates)
    if not config or config.org_id != org_id:
        raise HTTPException(status_code=404, detail="SSO config not found.")

    if "enabled" in updates:
        action = "sso.enabled" if updates["enabled"] else "sso.disabled"
        log_action(user_id, action, config_id, request)

    return JSONResponse(content={"success": True})


@router.delete("/org/sso/{config_id}")
async def delete_sso_config(
    config_id: str,
    current_user: dict = Depends(get_current_user),
    request: Request = None,
):
    """Delete an SSO configuration."""
    _require_pro_or_enterprise(current_user)

    user_id = current_user["id"]
    org_id = _get_user_org_id(user_id)
    if not org_id:
        raise HTTPException(status_code=404, detail="Not in an organization.")
    _require_org_admin(user_id, org_id)

    config = sso_service.get_sso_config(org_id, "saml")
    if not config:
        config = sso_service.get_sso_config(org_id, "oidc")
    if not config or config.id != config_id:
        raise HTTPException(status_code=404, detail="SSO config not found.")

    sso_service.delete_sso_config(config_id)
    log_action(user_id, "sso.config.deleted", config_id, request)

    return JSONResponse(content={"success": True})


@router.post("/org/sso/{config_id}/test")
async def test_sso_connection(
    config_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Test SSO connection."""
    _require_pro_or_enterprise(current_user)

    user_id = current_user["id"]
    org_id = _get_user_org_id(user_id)
    if not org_id:
        raise HTTPException(status_code=404, detail="Not in an organization.")
    _require_org_admin(user_id, org_id)

    config = sso_service.get_sso_config(org_id, "saml")
    if not config:
        config = sso_service.get_sso_config(org_id, "oidc")
    if not config or config.id != config_id:
        raise HTTPException(status_code=404, detail="SSO config not found.")

    success, message = sso_service.test_sso_connection(config)

    return JSONResponse(content={
        "success": success,
        "message": message,
    })


@router.get("/org/sso/identities")
async def list_sso_identities(
    current_user: dict = Depends(get_current_user),
):
    """List SSO identities for the organization."""
    _require_pro_or_enterprise(current_user)

    user_id = current_user["id"]
    org_id = _get_user_org_id(user_id)
    if not org_id:
        raise HTTPException(status_code=404, detail="Not in an organization.")
    _require_org_admin(user_id, org_id)

    identities = sso_service.get_org_sso_identities(org_id)

    return JSONResponse(content={
        "identities": [
            {
                "id": i["id"],
                "email": i.get("idp_email"),
                "name": i.get("idp_name"),
                "idp_subject": i.get("idp_subject"),
                "first_login_at": i.get("first_login_at"),
                "last_login_at": i.get("last_login_at"),
            }
            for i in identities
        ]
    })
