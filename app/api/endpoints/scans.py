import uuid
import time
import logging
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, Request, HTTPException, Depends, Query, status
from pydantic import BaseModel, HttpUrl, validator

from app.core.config import settings, logger
from app.core.security import get_current_user
from app.core.utils import is_safe_url
from app.services.supabase_service import check_scan_quota, get_scan_result
from app.services.scan_service import run_scan_internal

router = APIRouter()

@router.get("/scan/{scan_id}")
async def get_scan_status(
    scan_id: str,
    current_user: dict = Depends(get_current_user)
):
    scan_data = get_scan_result(scan_id)
    if not scan_data:
        return {"scan_id": scan_id, "status": "pending_or_not_found"}

    # Ensure the requesting user owns the scan
    if scan_data.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this scan.")

    return {
        "scan_id": scan_data.get("id"),
        "status": scan_data.get("status", "unknown"),
        "target_url": scan_data.get("target_url"),
        "tier": scan_data.get("tier"),
        "risk_score": scan_data.get("risk_score"),
        "findings": scan_data.get("findings", []),
        "compliance": scan_data.get("compliance", {}),
        "completed_at": scan_data.get("completed_at"),
    }

class ScanRequest(BaseModel):
    url: HttpUrl
    tier: str = "free"

    @validator("tier")
    def validate_tier(cls, v):
        allowed = ("free", "basic", "pro", "enterprise")
        if v.lower().strip() not in allowed:
            return "free"
        return v.lower().strip()

@router.post("/scan")
async def start_scan(
    request: Request,
    scan_data: ScanRequest,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    user_tier = current_user["tier"]
    
    url = str(scan_data.url)
    tier = scan_data.tier

    # Enforce tier if they try to request a higher one than they have
    if tier != "free" and user_tier == "free":
         tier = "free"

    # Quota check
    quota = check_scan_quota(user_id, user_tier)
    if not quota["allowed"]:
        return {
            "error": "quota_exceeded",
            "message": quota["reason"],
            "upgrade": "https://vulnra.lemonsqueezy.com/checkout"
        }

    # SSRF check
    if not is_safe_url(url):
        raise HTTPException(status_code=400, detail="Invalid target URL (private IPs or local hostnames blocked).")

    scan_id = str(uuid.uuid4())
    
    # Start scan in background
    background_tasks.add_task(run_scan_internal, scan_id, url, tier, user_id)
    
    return {
        "scan_id": scan_id,
        "status": "queued",
        "message": f"Scan started at {tier} tier."
    }
