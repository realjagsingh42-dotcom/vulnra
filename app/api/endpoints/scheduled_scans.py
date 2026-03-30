"""
app/api/endpoints/scheduled_scans.py — Scheduled Scan API Endpoints.

Endpoints:
  GET    /api/scheduled-scans       — list scheduled scans
  POST   /api/scheduled-scans       — create scheduled scan
  GET    /api/scheduled-scans/{id}  — get schedule details
  PUT    /api/scheduled-scans/{id}  — update schedule
  DELETE /api/scheduled-scans/{id}  — delete/cancel schedule
  POST   /api/scheduled-scans/{id}/pause     — pause schedule
  POST   /api/scheduled-scans/{id}/resume    — resume schedule
  POST   /api/scheduled-scans/{id}/run-now   — trigger immediate run
  GET    /api/scheduled-scans/{id}/runs      — get run history
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, HttpUrl, EmailStr, validator

from app.core.security import get_current_user
from app.core.utils import is_safe_url
from app.services import scheduled_scan_service

logger = logging.getLogger("vulnra.scheduled_scans")
router = APIRouter()


class CreateScheduledScanRequest(BaseModel):
    target_url: str
    scan_type: str = "standard"
    tier: str = "free"
    
    schedule_type: str
    run_at: Optional[datetime] = None
    cron_expression: Optional[str] = None
    interval_hours: Optional[int] = None
    
    probes: Optional[list[str]] = None
    vulnerability_types: Optional[list[str]] = None
    attack_type: Optional[str] = None
    
    notify_on_complete: bool = True
    notify_email: Optional[str] = None

    @validator("target_url")
    def validate_url(cls, v):
        if not is_safe_url(v):
            raise ValueError("Invalid URL (private IPs blocked).")
        return v

    @validator("schedule_type")
    def validate_schedule_type(cls, v):
        if v not in ("one-time", "recurring", "cron"):
            raise ValueError("schedule_type must be 'one-time', 'recurring', or 'cron'.")
        return v

    @validator("scan_type")
    def validate_scan_type(cls, v):
        if v not in ("standard", "multi-turn", "mcp"):
            raise ValueError("scan_type must be 'standard', 'multi-turn', or 'mcp'.")
        return v


class UpdateScheduledScanRequest(BaseModel):
    target_url: Optional[str] = None
    scan_type: Optional[str] = None
    run_at: Optional[datetime] = None
    cron_expression: Optional[str] = None
    interval_hours: Optional[int] = None
    probes: Optional[list[str]] = None
    vulnerability_types: Optional[list[str]] = None
    attack_type: Optional[str] = None
    notify_on_complete: Optional[bool] = None
    notify_email: Optional[str] = None

    @validator("target_url")
    def validate_url(cls, v):
        if v and not is_safe_url(v):
            raise ValueError("Invalid URL (private IPs blocked).")
        return v

    @validator("scan_type")
    def validate_scan_type(cls, v):
        if v and v not in ("standard", "multi-turn", "mcp"):
            raise ValueError("scan_type must be 'standard', 'multi-turn', or 'mcp'.")
        return v


@router.get("/scheduled-scans")
async def list_scheduled_scans(
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """List scheduled scans for the authenticated user."""
    tier = current_user.get("tier", "free")
    
    if tier == "free":
        return JSONResponse(content={"scans": [], "total": 0, "limit": limit, "offset": offset})
    
    result = scheduled_scan_service.list_scheduled_scans(
        user_id=current_user["id"],
        status=status,
        limit=limit,
        offset=offset,
    )
    
    limits = scheduled_scan_service.get_schedule_limits(tier)
    result["limits"] = limits
    
    return JSONResponse(content=result)


@router.post("/scheduled-scans")
async def create_scheduled_scan(
    body: CreateScheduledScanRequest,
    current_user: dict = Depends(get_current_user),
    request: Request = None,
):
    """Create a new scheduled scan."""
    tier = body.tier or current_user.get("tier", "free")
    
    try:
        scan = scheduled_scan_service.create_scheduled_scan(
            user_id=current_user["id"],
            target_url=body.target_url,
            schedule_type=body.schedule_type,
            tier=tier,
            scan_type=body.scan_type,
            run_at=body.run_at,
            cron_expression=body.cron_expression,
            interval_hours=body.interval_hours,
            probes=body.probes,
            vulnerability_types=body.vulnerability_types,
            attack_type=body.attack_type,
            notify_on_complete=body.notify_on_complete,
            notify_email=body.notify_email,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return JSONResponse(content=scan, status_code=201)


@router.get("/scheduled-scans/{scan_id}")
async def get_scheduled_scan(
    scan_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a scheduled scan by ID."""
    scan = scheduled_scan_service.get_scheduled_scan(scan_id)
    
    if not scan:
        raise HTTPException(status_code=404, detail="Scheduled scan not found.")
    
    if scan["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized.")
    
    runs = scheduled_scan_service.get_schedule_runs(scan_id)
    scan["runs"] = runs.get("runs", [])
    
    return JSONResponse(content=scan)


@router.put("/scheduled-scans/{scan_id}")
async def update_scheduled_scan(
    scan_id: str,
    body: UpdateScheduledScanRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update a scheduled scan."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update.")
    
    try:
        scan = scheduled_scan_service.update_scheduled_scan(
            scan_id=scan_id,
            user_id=current_user["id"],
            **updates,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not scan:
        raise HTTPException(status_code=404, detail="Scheduled scan not found.")
    
    return JSONResponse(content=scan)


@router.delete("/scheduled-scans/{scan_id}")
async def delete_scheduled_scan(
    scan_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete (cancel) a scheduled scan."""
    ok = scheduled_scan_service.delete_scheduled_scan(scan_id, current_user["id"])
    
    if not ok:
        raise HTTPException(status_code=404, detail="Scheduled scan not found.")
    
    return JSONResponse(content={"deleted": True, "id": scan_id})


@router.post("/scheduled-scans/{scan_id}/pause")
async def pause_scheduled_scan(
    scan_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Pause a scheduled scan."""
    ok = scheduled_scan_service.pause_scheduled_scan(scan_id, current_user["id"])
    
    if not ok:
        raise HTTPException(status_code=404, detail="Scheduled scan not found.")
    
    return JSONResponse(content={"status": "paused", "id": scan_id})


@router.post("/scheduled-scans/{scan_id}/resume")
async def resume_scheduled_scan(
    scan_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Resume a paused scheduled scan."""
    try:
        scan = scheduled_scan_service.resume_scheduled_scan(scan_id, current_user["id"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not scan:
        raise HTTPException(status_code=404, detail="Scheduled scan not found.")
    
    return JSONResponse(content=scan)


@router.post("/scheduled-scans/{scan_id}/run-now")
async def trigger_scheduled_scan_now(
    scan_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Trigger a scheduled scan to run immediately."""
    try:
        config = scheduled_scan_service.trigger_now(scan_id, current_user["id"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not config:
        raise HTTPException(status_code=404, detail="Scheduled scan not found.")
    
    from app.worker import run_scheduled_scan
    run_scheduled_scan.delay(config["id"])
    
    return JSONResponse(content={
        "triggered": True,
        "id": scan_id,
        "message": "Scan triggered. Check /scan/{id} for status.",
    })


@router.get("/scheduled-scans/{scan_id}/runs")
async def get_schedule_runs(
    scan_id: str,
    current_user: dict = Depends(get_current_user),
    limit: int = 20,
    offset: int = 0,
):
    """Get run history for a scheduled scan."""
    scan = scheduled_scan_service.get_scheduled_scan(scan_id)
    
    if not scan:
        raise HTTPException(status_code=404, detail="Scheduled scan not found.")
    
    if scan["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized.")
    
    runs = scheduled_scan_service.get_schedule_runs(scan_id, limit, offset)
    return JSONResponse(content=runs)
