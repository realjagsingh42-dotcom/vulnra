import time
import logging
from typing import List, Optional

from app.core.config import logger
from app.services.supabase_service import save_scan_result
from app.services.engine_runner import run_all_engines

# NOTE: All engine imports live inside engine_runner — lazy-loaded so that
# heavy ML dependencies don't block web-server startup.


async def run_scan_internal(
    scan_id: str,
    url: str,
    tier: str,
    user_id: str,
    custom_probes: Optional[List[str]] = None,
    vulnerability_types: Optional[List[str]] = None,
) -> dict:
    findings, compliance, scan_engines, max_risk = run_all_engines(
        scan_id, url, tier,
        custom_probes=custom_probes,
        vulnerability_types=vulnerability_types,
    )

    data = {
        "scan_id":      scan_id,
        "user_id":      user_id,
        "url":          url,
        "tier":         tier,
        "status":       "complete" if scan_engines else "failed",
        "risk_score":   max_risk,
        "findings":     findings,
        "compliance":   compliance,
        "scan_engines": scan_engines,
        "completed_at": time.time(),
    }

    if not scan_engines:
        data["error"] = "All scan engines failed"

    save_scan_result(scan_id, url, tier, data)

    # Deliver webhooks (best-effort, never blocks scan result)
    try:
        from app.services.webhook_delivery import deliver_scan_complete
        deliver_scan_complete(user_id, {**data, "scan_id": scan_id, "url": url, "tier": tier})
    except Exception:
        pass

    return data
