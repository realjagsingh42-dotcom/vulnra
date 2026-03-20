import os
import logging
from typing import Optional
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger("vulnra.supabase")

_sb: Optional[Client] = None

def get_supabase() -> Optional[Client]:
    global _sb
    if _sb is None:
        url = settings.supabase_url
        key = settings.supabase_key
        if url and key:
            try:
                _sb = create_client(url, key)
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
    return _sb

def get_user_tier(user_id: str) -> str:
    """Fetch current tier from Supabase profiles table."""
    try:
        sb = get_supabase()
        if not sb:
            return "free"
        res = sb.table("profiles").select("tier").eq("id", user_id).single().execute()
        return res.data.get("tier", "free") if res.data else "free"
    except Exception as e:
        logger.error(f"Tier lookup failed for {user_id}: {e}")
        return "free"

def save_scan_result(scan_id: str, url: str, tier: str, data: dict):
    """Persist scan metadata to Supabase."""
    try:
        sb = get_supabase()
        if not sb:
            return
            
        scan_engines = data.get("scan_engines", [])
        
        sb.table("scans").upsert({
            "id":           scan_id,
            "user_id":      data.get("user_id", "00000000-0000-0000-0000-000000000000"),
            "target_url":   url,
            "tier":         tier,
            "status":       data.get("status"),
            "scan_engine":  ",".join(scan_engines) if scan_engines else "none",
            "risk_score":   data.get("risk_score"),
            "findings":     data.get("findings"),
            "compliance":   data.get("compliance"),
            "completed_at": "now()",
        }).execute()
    except Exception as e:
        logger.error(f"Failed to save scan {scan_id} to Supabase: {e}")

def get_scan_result(scan_id: str) -> Optional[dict]:
    """Fetch scan metadata from Supabase."""
    try:
        sb = get_supabase()
        if not sb:
            return None
        res = sb.table("scans").select("*").eq("id", scan_id).single().execute()
        return res.data
    except Exception as e:
        logger.error(f"Failed to fetch scan {scan_id} from Supabase: {e}")
        return None

def check_scan_quota(user_id: str, tier: str) -> dict:
    """
    Check if user has scans remaining today.
    Returns {"allowed": True} or {"allowed": False, "reason": "..."}
    """
    # Define limits locally or import from config
    TIER_LIMITS = {
        "free":       {"scans_per_day": 1},
        "pro":        {"scans_per_day": 100},
        "enterprise": {"scans_per_day": 999},
    }
    
    limit = TIER_LIMITS.get(tier, TIER_LIMITS["free"])["scans_per_day"]
    if limit >= 999:
        return {"allowed": True}
    try:
        sb = get_supabase()
        if not sb:
            return {"allowed": True}
        
        from datetime import date
        today = date.today().isoformat()
        
        res = (
            sb.table("scans")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("status", "complete")
            .gte("created_at", today)
            .execute()
        )
        used = res.count or 0
        if used >= limit:
            return {
                "allowed": False,
                "reason":  f"{tier.capitalize()} tier limit reached ({limit} scan/day). Upgrade for more.",
                "used":    used,
                "limit":   limit,
            }
        return {"allowed": True, "used": used, "limit": limit}
    except Exception as e:
        logger.error(f"Quota check failed for {user_id}: {e}")
        return {"allowed": True}

def get_user_scans(user_id: str, limit: int = 50, offset: int = 0) -> list:
    """Fetch paginated scan history for a user."""
    try:
        sb = get_supabase()
        if not sb:
            return []
        res = (
            sb.table("scans")
            .select("id, target_url, status, risk_score, tier, scan_engine, created_at, completed_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .offset(offset)
            .execute()
        )
        return res.data or []
    except Exception as e:
        logger.error(f"Failed to fetch scans for {user_id}: {e}")
        return []


def get_prev_scan_risk_for_url(user_id: str, target_url: str, exclude_id: str) -> Optional[float]:
    """Return risk_score of the most recent completed scan for the same URL (excluding current scan)."""
    try:
        sb = get_supabase()
        if not sb:
            return None
        res = (
            sb.table("scans")
            .select("risk_score")
            .eq("user_id", user_id)
            .eq("target_url", target_url)
            .eq("status", "complete")
            .neq("id", exclude_id)
            .order("completed_at", desc=True)
            .limit(1)
            .execute()
        )
        if res.data:
            return float(res.data[0]["risk_score"])
    except Exception as e:
        logger.error(f"Failed to get prev scan risk: {e}")
    return None


def create_share_token(scan_id: str, user_id: str) -> Optional[str]:
    """Create (or return existing) a share token for a completed scan."""
    import uuid as _uuid
    from datetime import datetime, timezone, timedelta
    try:
        sb = get_supabase()
        if not sb:
            return None
        # Check existing token first
        existing = sb.table("scans").select("share_token").eq("id", scan_id).eq("user_id", user_id).single().execute()
        if existing.data and existing.data.get("share_token"):
            return existing.data["share_token"]
        # Generate new token
        token = str(_uuid.uuid4())
        expires = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        sb.table("scans").update({
            "share_token": token,
            "share_expires_at": expires,
        }).eq("id", scan_id).eq("user_id", user_id).execute()
        return token
    except Exception as e:
        logger.error(f"Failed to create share token for scan {scan_id}: {e}")
        return None


def get_scan_by_share_token(token: str) -> Optional[dict]:
    """Fetch a scan by its public share token. Returns None if expired or not found."""
    from datetime import datetime, timezone
    try:
        sb = get_supabase()
        if not sb:
            return None
        res = (
            sb.table("scans")
            .select("id, target_url, status, risk_score, tier, scan_engine, findings, compliance, completed_at, share_expires_at")
            .eq("share_token", token)
            .single()
            .execute()
        )
        if not res.data:
            return None
        expires = res.data.get("share_expires_at")
        if expires:
            exp_dt = datetime.fromisoformat(expires.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > exp_dt:
                return None
        return res.data
    except Exception as e:
        logger.error(f"Failed to fetch scan by share token: {e}")
        return None


_API_KEY_LIMITS = {"free": 3, "pro": 20, "enterprise": 9999}


def create_api_key(user_id: str, name: str, tier: str) -> dict:
    """
    Generate a new API key. Returns {key, id, prefix} where key is shown only once.
    Raises ValueError if quota exceeded.
    """
    import hashlib
    import secrets
    import uuid as _uuid

    limit = _API_KEY_LIMITS.get(tier, _API_KEY_LIMITS["free"])
    sb = get_supabase()
    if not sb:
        raise RuntimeError("DB unavailable")

    existing = (
        sb.table("api_keys")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("revoked", False)
        .execute()
    )
    count = existing.count or 0
    if count >= limit:
        raise ValueError(f"API key limit reached ({limit} for {tier} tier).")

    raw = f"vk_live_{secrets.token_hex(32)}"
    key_hash = hashlib.sha256(raw.encode()).hexdigest()
    key_prefix = raw[8:16]
    key_id = str(_uuid.uuid4())

    sb.table("api_keys").insert({
        "id": key_id,
        "user_id": user_id,
        "name": name,
        "key_hash": key_hash,
        "key_prefix": key_prefix,
        "revoked": False,
    }).execute()

    return {"key": raw, "id": key_id, "prefix": key_prefix}


def list_api_keys(user_id: str) -> list:
    """List all API keys for a user (never returns key_hash)."""
    try:
        sb = get_supabase()
        if not sb:
            return []
        res = (
            sb.table("api_keys")
            .select("id, name, key_prefix, created_at, last_used_at, revoked")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception as e:
        logger.error(f"Failed to list API keys for {user_id}: {e}")
        return []


def revoke_api_key(key_id: str, user_id: str) -> bool:
    """Mark an API key as revoked. Returns True on success."""
    try:
        sb = get_supabase()
        if not sb:
            return False
        sb.table("api_keys").update({"revoked": True}).eq("id", key_id).eq("user_id", user_id).execute()
        return True
    except Exception as e:
        logger.error(f"Failed to revoke API key {key_id}: {e}")
        return False


def get_api_key_user(raw_key: str) -> Optional[dict]:
    """Verify an API key and return {id, email, tier} if valid and not revoked."""
    import hashlib
    try:
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        sb = get_supabase()
        if not sb:
            return None
        res = (
            sb.table("api_keys")
            .select("id, user_id, revoked")
            .eq("key_hash", key_hash)
            .single()
            .execute()
        )
        if not res.data or res.data.get("revoked"):
            return None
        user_id = res.data["user_id"]
        key_id  = res.data["id"]
        try:
            sb.table("api_keys").update({"last_used_at": "now()"}).eq("id", key_id).execute()
        except Exception:
            pass
        tier = get_user_tier(user_id)
        profile = sb.table("profiles").select("email").eq("id", user_id).single().execute()
        email = (profile.data or {}).get("email", "")
        return {"id": user_id, "email": email, "tier": tier}
    except Exception as e:
        logger.error(f"API key verification failed: {e}")
        return None


_SENTINEL_LIMITS = {"pro": {"max_watches": 5, "min_interval_hours": 24}, "enterprise": {"max_watches": 50, "min_interval_hours": 1}}


def create_sentinel_watch(user_id: str, url: str, interval_hours: int, tier: str, notification_email: Optional[str]) -> dict:
    """Create a new sentinel watch. Raises ValueError on quota/tier violation."""
    import uuid as _uuid
    limits = _SENTINEL_LIMITS.get(tier)
    if not limits:
        raise ValueError("Sentinel monitoring requires Pro or Enterprise tier.")
    if interval_hours < limits["min_interval_hours"]:
        raise ValueError(f"Minimum interval for {tier} tier is {limits['min_interval_hours']}h.")
    sb = get_supabase()
    if not sb:
        raise RuntimeError("DB unavailable")
    existing = sb.table("sentinel_watches").select("id", count="exact").eq("user_id", user_id).eq("active", True).execute()
    if (existing.count or 0) >= limits["max_watches"]:
        raise ValueError(f"Watch limit reached ({limits['max_watches']} for {tier} tier).")
    watch_id = str(_uuid.uuid4())
    sb.table("sentinel_watches").insert({
        "id": watch_id,
        "user_id": user_id,
        "url": url,
        "interval_hours": interval_hours,
        "tier": tier,
        "notification_email": notification_email,
        "active": True,
    }).execute()
    res = sb.table("sentinel_watches").select("*").eq("id", watch_id).single().execute()
    return res.data


def list_sentinel_watches(user_id: str) -> list:
    """Return all active watches for a user."""
    try:
        sb = get_supabase()
        if not sb:
            return []
        res = (
            sb.table("sentinel_watches")
            .select("id, url, interval_hours, tier, last_scan, last_risk_score, notification_email, active, created_at")
            .eq("user_id", user_id)
            .eq("active", True)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception as e:
        logger.error(f"Failed to list sentinel watches for {user_id}: {e}")
        return []


def delete_sentinel_watch(watch_id: str, user_id: str) -> bool:
    """Soft-delete a sentinel watch."""
    try:
        sb = get_supabase()
        if not sb:
            return False
        sb.table("sentinel_watches").update({"active": False}).eq("id", watch_id).eq("user_id", user_id).execute()
        return True
    except Exception as e:
        logger.error(f"Failed to delete sentinel watch {watch_id}: {e}")
        return False


def get_due_sentinel_watches() -> list:
    """Return all active watches that are due for a re-scan."""
    try:
        sb = get_supabase()
        if not sb:
            return []
        from datetime import datetime, timezone
        now_iso = datetime.now(timezone.utc).isoformat()
        # Use raw SQL via RPC or filter: active=true AND (last_scan IS NULL OR last_scan + interval < now)
        res = sb.table("sentinel_watches").select("*").eq("active", True).execute()
        if not res.data:
            return []
        due = []
        now_dt = datetime.now(timezone.utc)
        for w in res.data:
            if not w.get("last_scan"):
                due.append(w)
                continue
            last = datetime.fromisoformat(str(w["last_scan"]).replace("Z", "+00:00"))
            from datetime import timedelta
            if (now_dt - last).total_seconds() >= w["interval_hours"] * 3600:
                due.append(w)
        return due
    except Exception as e:
        logger.error(f"Failed to fetch due sentinel watches: {e}")
        return []


def update_sentinel_after_scan(watch_id: str, risk_score: float) -> None:
    """Update last_scan timestamp and last_risk_score after a sentinel scan completes."""
    try:
        sb = get_supabase()
        if not sb:
            return
        sb.table("sentinel_watches").update({
            "last_scan": "now()",
            "last_risk_score": risk_score,
        }).eq("id", watch_id).execute()
    except Exception as e:
        logger.error(f"Failed to update sentinel watch {watch_id} after scan: {e}")


# ── Webhooks ──────────────────────────────────────────────────────────────────

def list_webhooks_for_user(user_id: str, event: Optional[str] = None) -> list:
    """Return active webhooks for a user, optionally filtered by event type."""
    try:
        sb = get_supabase()
        if not sb:
            return []
        q = sb.table("webhooks").select("*").eq("user_id", user_id).eq("active", True)
        rows = q.execute().data or []
        if event:
            rows = [r for r in rows if event in (r.get("events") or [])]
        return rows
    except Exception as e:
        logger.error(f"list_webhooks_for_user error: {e}")
        return []


def update_webhook_status(webhook_id: str, success: bool, status_code: int) -> None:
    """Update last_triggered_at, last_status, last_status_code after delivery."""
    try:
        sb = get_supabase()
        if not sb:
            return
        sb.table("webhooks").update({
            "last_triggered_at": "now()",
            "last_status":       "success" if success else "failed",
            "last_status_code":  status_code,
        }).eq("id", webhook_id).execute()
    except Exception as e:
        logger.error(f"update_webhook_status error: {e}")


def update_user_subscription(email: str, tier: str, subscription_id: Optional[str] = None):
    """Update user subscription tier in Supabase."""
    try:
        sb = get_supabase()
        if not sb:
            return
        
        # Find user by email and update their tier
        user_res = sb.table("profiles").select("id").eq("email", email).execute()
        if user_res.data and len(user_res.data) > 0:
            user_id = user_res.data[0]["id"]
            sb.table("profiles").update({
                "tier": tier,
                "lemon_sub_id": subscription_id,
                "updated_at": "now()"
            }).eq("id", user_id).execute()
            logger.info(f"Updated subscription for {email} to tier {tier}")
    except Exception as e:
        logger.error(f"Failed to update subscription for {email}: {e}")
