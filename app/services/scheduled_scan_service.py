"""
app/services/scheduled_scan_service.py — Scheduled Scan Service for VULNRA.

Manages scheduled one-time and recurring vulnerability scans.
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

from app.services.supabase_service import get_supabase

logger = logging.getLogger("vulnra.scheduled_scan")

_SCHEDULE_LIMITS = {
    "free": {"max_schedules": 0, "min_interval_hours": 24},
    "pro": {"max_schedules": 10, "min_interval_hours": 1},
    "enterprise": {"max_schedules": 100, "min_interval_hours": 1},
}


def get_schedule_limits(tier: str) -> Dict[str, int]:
    return _SCHEDULE_LIMITS.get(tier, _SCHEDULE_LIMITS["free"])


def create_scheduled_scan(
    user_id: str,
    target_url: str,
    schedule_type: str,
    tier: str,
    scan_type: str = "standard",
    run_at: Optional[datetime] = None,
    cron_expression: Optional[str] = None,
    interval_hours: Optional[int] = None,
    probes: Optional[List[str]] = None,
    vulnerability_types: Optional[List[str]] = None,
    attack_type: Optional[str] = None,
    notify_on_complete: bool = True,
    notify_email: Optional[str] = None,
    org_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a new scheduled scan."""
    limits = get_schedule_limits(tier)
    
    if tier == "free":
        raise ValueError("Scheduled scans require Pro or Enterprise tier.")
    
    if limits["max_schedules"] == 0:
        raise ValueError("Scheduled scans require Pro or Enterprise tier.")
    
    sb = get_supabase()
    
    existing_count = (
        sb.table("scheduled_scans")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("status", "active")
        .execute()
    ).count or 0
    
    if existing_count >= limits["max_schedules"]:
        raise ValueError(f"Maximum {limits['max_schedules']} scheduled scans allowed on {tier} tier.")
    
    if schedule_type == "one-time" and not run_at:
        raise ValueError("run_at is required for one-time schedules.")
    
    if schedule_type == "recurring" and not interval_hours:
        raise ValueError("interval_hours is required for recurring schedules.")
    
    if schedule_type == "cron" and not cron_expression:
        raise ValueError("cron_expression is required for cron schedules.")
    
    if interval_hours and interval_hours < limits["min_interval_hours"]:
        raise ValueError(f"Minimum interval is {limits['min_interval_hours']} hours.")
    
    next_run = None
    if schedule_type == "one-time":
        next_run = run_at
    elif schedule_type == "recurring":
        next_run = datetime.utcnow() + timedelta(hours=interval_hours)
    elif schedule_type == "cron":
        next_run = _calculate_next_cron_run(cron_expression)
    
    entry = {
        "user_id": user_id,
        "org_id": org_id,
        "target_url": target_url,
        "scan_type": scan_type,
        "tier": tier,
        "schedule_type": schedule_type,
        "run_at": run_at.isoformat() if run_at else None,
        "cron_expression": cron_expression,
        "interval_hours": interval_hours,
        "probes": probes,
        "vulnerability_types": vulnerability_types,
        "attack_type": attack_type,
        "status": "active",
        "next_run_at": next_run.isoformat() if next_run else None,
        "notify_on_complete": notify_on_complete,
        "notify_email": notify_email,
    }
    
    res = sb.table("scheduled_scans").insert(entry).execute()
    return res.data[0]


def get_scheduled_scan(scan_id: str) -> Optional[Dict[str, Any]]:
    """Get a scheduled scan by ID."""
    sb = get_supabase()
    res = (
        sb.table("scheduled_scans")
        .select("*")
        .eq("id", scan_id)
        .execute()
    )
    return res.data[0] if res.data else None


def list_scheduled_scans(
    user_id: str,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    """List scheduled scans for a user."""
    sb = get_supabase()
    query = (
        sb.table("scheduled_scans")
        .select("*", count="exact")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
    )
    
    if status:
        query = query.eq("status", status)
    
    res = query.execute()
    return {
        "scans": res.data or [],
        "total": res.count or 0,
        "limit": limit,
        "offset": offset,
    }


def update_scheduled_scan(
    scan_id: str,
    user_id: str,
    **updates,
) -> Optional[Dict[str, Any]]:
    """Update a scheduled scan."""
    sb = get_supabase()
    
    existing = get_scheduled_scan(scan_id)
    if not existing or existing["user_id"] != user_id:
        return None
    
    if "interval_hours" in updates:
        tier = existing["tier"]
        limits = get_schedule_limits(tier)
        if updates["interval_hours"] < limits["min_interval_hours"]:
            raise ValueError(f"Minimum interval is {limits['min_interval_hours']} hours.")
    
    updates["updated_at"] = "now()"
    
    if "run_at" in updates and updates["run_at"]:
        updates["run_at"] = updates["run_at"].isoformat()
    
    res = (
        sb.table("scheduled_scans")
        .update(updates)
        .eq("id", scan_id)
        .execute()
    )
    
    return res.data[0] if res.data else None


def pause_scheduled_scan(scan_id: str, user_id: str) -> bool:
    """Pause a scheduled scan."""
    sb = get_supabase()
    
    existing = get_scheduled_scan(scan_id)
    if not existing or existing["user_id"] != user_id:
        return False
    
    sb.table("scheduled_scans").update({
        "status": "paused",
        "updated_at": "now()",
    }).eq("id", scan_id).execute()
    
    return True


def resume_scheduled_scan(scan_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    """Resume a paused scheduled scan."""
    sb = get_supabase()
    
    existing = get_scheduled_scan(scan_id)
    if not existing or existing["user_id"] != user_id:
        return None
    
    if existing["status"] != "paused":
        raise ValueError("Can only resume paused schedules.")
    
    next_run = None
    schedule_type = existing["schedule_type"]
    
    if schedule_type == "one-time":
        run_at = existing.get("run_at")
        if run_at:
            next_run = datetime.fromisoformat(run_at.replace("Z", "+00:00"))
            if next_run <= datetime.utcnow():
                raise ValueError("Scheduled time has passed.")
    elif schedule_type == "recurring":
        interval = existing.get("interval_hours") or 24
        next_run = datetime.utcnow() + timedelta(hours=interval)
    elif schedule_type == "cron":
        cron_expr = existing.get("cron_expression")
        if cron_expr:
            next_run = _calculate_next_cron_run(cron_expr)
    
    res = sb.table("scheduled_scans").update({
        "status": "active",
        "next_run_at": next_run.isoformat() if next_run else None,
        "updated_at": "now()",
    }).eq("id", scan_id).execute()
    
    return res.data[0] if res.data else None


def delete_scheduled_scan(scan_id: str, user_id: str) -> bool:
    """Delete (cancel) a scheduled scan."""
    sb = get_supabase()
    
    existing = get_scheduled_scan(scan_id)
    if not existing or existing["user_id"] != user_id:
        return False
    
    sb.table("scheduled_scans").update({
        "status": "cancelled",
        "deleted_at": "now()",
        "updated_at": "now()",
    }).eq("id", scan_id).execute()
    
    return True


def trigger_now(scan_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    """Trigger a scheduled scan to run immediately."""
    sb = get_supabase()
    
    existing = get_scheduled_scan(scan_id)
    if not existing or existing["user_id"] != user_id:
        return None
    
    if existing["status"] not in ("active", "paused"):
        raise ValueError(f"Cannot run scan with status: {existing['status']}")
    
    return {
        "id": existing["id"],
        "target_url": existing["target_url"],
        "scan_type": existing["scan_type"],
        "tier": existing["tier"],
        "probes": existing.get("probes"),
        "vulnerability_types": existing.get("vulnerability_types"),
        "attack_type": existing.get("attack_type"),
    }


def get_due_scheduled_scans() -> List[Dict[str, Any]]:
    """Get all scheduled scans that are due to run."""
    sb = get_supabase()
    res = (
        sb.table("scheduled_scans")
        .select("*")
        .eq("status", "active")
        .execute()
    )
    
    due = []
    now = datetime.utcnow()
    
    for scan in res.data or []:
        next_run = scan.get("next_run_at")
        if next_run:
            next_run_dt = datetime.fromisoformat(next_run.replace("Z", "+00:00"))
            if next_run_dt <= now:
                due.append(scan)
    
    return due


def update_after_scan(
    scan_id: str,
    new_risk_score: float,
    findings_count: int,
) -> None:
    """Update scheduled scan after a scan completes."""
    sb = get_supabase()
    
    existing = get_scheduled_scan(scan_id)
    if not existing:
        return
    
    schedule_type = existing["schedule_type"]
    next_run = None
    
    if schedule_type == "one-time":
        sb.table("scheduled_scans").update({
            "status": "completed",
            "last_run_at": "now()",
            "last_scan_id": None,
            "last_risk_score": new_risk_score,
            "updated_at": "now()",
        }).eq("id", scan_id).execute()
        
    elif schedule_type == "recurring":
        interval = existing.get("interval_hours") or 24
        next_run = datetime.utcnow() + timedelta(hours=interval)
        sb.table("scheduled_scans").update({
            "last_run_at": "now()",
            "last_risk_score": new_risk_score,
            "next_run_at": next_run.isoformat(),
            "updated_at": "now()",
        }).eq("id", scan_id).execute()
        
    elif schedule_type == "cron":
        cron_expr = existing.get("cron_expression")
        if cron_expr:
            next_run = _calculate_next_cron_run(cron_expr)
        sb.table("scheduled_scans").update({
            "last_run_at": "now()",
            "last_risk_score": new_risk_score,
            "next_run_at": next_run.isoformat() if next_run else None,
            "updated_at": "now()",
        }).eq("id", scan_id).execute()


def get_schedule_runs(
    scan_id: str,
    limit: int = 20,
    offset: int = 0,
) -> Dict[str, Any]:
    """Get run history for a scheduled scan."""
    sb = get_supabase()
    
    res = (
        sb.table("scheduled_scan_runs")
        .select("*", count="exact")
        .eq("scheduled_scan_id", scan_id)
        .order("started_at", desc=True)
        .range(offset, offset + limit - 1)
    )
    
    return {
        "runs": res.data or [],
        "total": res.count or 0,
        "limit": limit,
        "offset": offset,
    }


def create_run_record(
    scheduled_scan_id: str,
    scan_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a run record when a scheduled scan starts."""
    sb = get_supabase()
    
    entry = {
        "scheduled_scan_id": scheduled_scan_id,
        "scan_id": scan_id,
        "status": "running" if scan_id else "pending",
    }
    
    res = sb.table("scheduled_scan_runs").insert(entry).execute()
    return res.data[0]


def update_run_record(
    run_id: str,
    status: str,
    risk_score: Optional[float] = None,
    findings_count: Optional[int] = None,
    error_message: Optional[str] = None,
) -> None:
    """Update a run record when it completes."""
    sb = get_supabase()
    
    updates = {
        "status": status,
        "completed_at": "now()",
    }
    
    if risk_score is not None:
        updates["risk_score"] = risk_score
    if findings_count is not None:
        updates["findings_count"] = findings_count
    if error_message:
        updates["error_message"] = error_message
    
    sb.table("scheduled_scan_runs").update(updates).eq("id", run_id).execute()


def _calculate_next_cron_run(cron_expression: str) -> Optional[datetime]:
    """Calculate next run time from cron expression."""
    try:
        from croniter import croniter
        
        base = datetime.utcnow()
        cron = croniter(cron_expression, base)
        return cron.get_next(datetime)
    except Exception as e:
        logger.warning(f"Failed to parse cron expression '{cron_expression}': {e}")
        return None
