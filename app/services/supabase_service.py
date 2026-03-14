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
