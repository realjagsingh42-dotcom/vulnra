"""
app/services/audit.py — Audit logging service for VULNRA Enterprise.

Writes structured audit events to the `audit_logs` Supabase table.
Call `log_action()` from any sensitive endpoint.

Supported actions:
  scan.created          — user started a scan
  scan.rag.created      — user started a RAG scan
  report.downloaded     — user downloaded a PDF report
  share.created         — user created a share link
  api_key.created       — user created an API key
  api_key.revoked       — user revoked an API key
  member.invited        — org admin invited a member
  member.removed        — org admin removed a member
  org.created           — org was created
  audit_log.viewed      — admin viewed the audit log
"""

import logging
import time
import uuid
from typing import Any, Dict, Optional

from fastapi import Request
from app.services.supabase_service import get_supabase

logger = logging.getLogger("vulnra.audit")


def log_action(
    user_id: str,
    action: str,
    resource_id: str = "",
    request: Optional[Request] = None,
    metadata: Optional[Dict[str, Any]] = None,
    org_id: Optional[str] = None,
) -> None:
    """
    Write an audit log entry to the `audit_logs` table.
    Silently ignores errors to avoid disrupting the calling request.

    Args:
        user_id:     UUID of the user performing the action.
        action:      Dot-namespaced action string (e.g. 'scan.created').
        resource_id: ID of the affected resource (scan_id, key_id, etc.).
        request:     FastAPI Request object (used to extract IP + user agent).
        metadata:    Arbitrary extra data stored as JSONB.
        org_id:      UUID of the user's organization (Enterprise).
    """
    try:
        sb = get_supabase()

        ip_address: Optional[str] = None
        user_agent: Optional[str] = None

        if request is not None:
            # Extract real IP (respects X-Forwarded-For from Railway's proxy)
            xff = request.headers.get("x-forwarded-for")
            if xff:
                ip_address = xff.split(",")[0].strip()
            else:
                ip_address = getattr(request.client, "host", None)
            user_agent = request.headers.get("user-agent", "")[:512]

        entry = {
            "id":          str(uuid.uuid4()),
            "user_id":     user_id,
            "org_id":      org_id,
            "action":      action,
            "resource_id": resource_id or "",
            "ip_address":  ip_address,
            "user_agent":  user_agent,
            "metadata":    metadata or {},
            "created_at":  "now()",
        }

        sb.table("audit_logs").insert(entry).execute()
        logger.debug(f"[audit] {action} by {user_id} resource={resource_id}")

    except Exception as e:
        # Audit failures must never crash the calling endpoint
        logger.warning(f"[audit] Failed to log action '{action}': {e}")


def get_audit_logs(
    org_id: str,
    user_id: Optional[str] = None,
    action_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Dict[str, Any]:
    """
    Retrieve paginated audit logs for an organization.

    Args:
        org_id:        Organization ID (only returns logs for this org).
        user_id:       Optional filter — only logs for this user.
        action_filter: Optional prefix filter (e.g. 'scan.' matches all scan actions).
        limit:         Max rows to return (capped at 200).
        offset:        Pagination offset.

    Returns:
        {'logs': [...], 'total': int, 'limit': int, 'offset': int}
    """
    try:
        sb = get_supabase()
        limit = min(limit, 200)

        query = (
            sb.table("audit_logs")
            .select("*", count="exact")
            .eq("org_id", org_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )

        if user_id:
            query = query.eq("user_id", user_id)

        if action_filter:
            # Use ilike for prefix matching: 'scan.' → 'scan.%'
            query = query.ilike("action", f"{action_filter}%")

        res = query.execute()
        return {
            "logs":   res.data or [],
            "total":  res.count or 0,
            "limit":  limit,
            "offset": offset,
        }
    except Exception as e:
        logger.error(f"[audit] get_audit_logs failed: {e}")
        return {"logs": [], "total": 0, "limit": limit, "offset": offset}
