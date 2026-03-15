"""
app/worker.py - Celery worker for VULNRA.
Consolidated and hardened version.
"""

import os
import time
import pathlib
import sys
import logging
from celery import Celery

# Ensure project root is on path for standalone execution
ROOT = pathlib.Path(__file__).parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.config import settings

# ── Logging Setup ─────────────────────────────────────────────────────────────
logger = logging.getLogger("vulnra.worker")

# ── Celery App Setup ──────────────────────────────────────────────────────────
app = Celery(
    "vulnra",
    broker=settings.redis_url,
    backend=settings.redis_url
)

app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    worker_pool="solo", # Safe for Windows/Development
    broker_connection_retry_on_startup=True,
    task_track_started=True,
    broker_transport_options={
        "visibility_timeout": 3600,
        "socket_connect_timeout": 5,
        "socket_timeout": 5,
    },
    beat_schedule={
        "sentinel-check-every-15-minutes": {
            "task": "app.worker.check_due_sentinel_watches",
            "schedule": 900,  # every 15 minutes
        },
    },
)

# ── Tasks ─────────────────────────────────────────────────────────────────────

@app.task(name="app.worker.run_scan", bind=True)
def run_scan(self, scan_id: str, url: str, tier: str = "free"):
    """
    Asynchronous task to run multi-engine scans (Garak + DeepTeam).
    """
    logger.info(f"Worker received scan task: {scan_id} -> {url} [Tier: {tier}]")
    
    findings = []
    compliance = {}
    scan_engines = []
    max_risk = 0.0
    
    # ── 1. Garak Scan ───────────────────────────────────────────
    try:
        from app.garak_engine import run_garak_scan
        garak_res = run_garak_scan(scan_id, url, tier)
        if garak_res.get("status") == "complete":
            findings.extend(garak_res.get("findings", []))
            _merge_compliance(compliance, garak_res.get("compliance", {}))
            scan_engines.append(garak_res.get("scan_engine", "garak"))
            max_risk = max(max_risk, float(garak_res.get("risk_score", 0)))
    except Exception as e:
        logger.error(f"Garak engine failed: {e}")

    # ── 2. DeepTeam Scan ────────────────────────────────────────
    try:
        from app.deepteam_engine import run_deepteam_scan
        # DeepTeam requires OpenAI key
        if os.environ.get("OPENAI_API_KEY"):
            dt_res = run_deepteam_scan(scan_id, url, tier)
            if dt_res.get("status") == "complete":
                findings.extend(dt_res.get("findings", []))
                _merge_compliance(compliance, dt_res.get("compliance", {}))
                scan_engines.append(dt_res.get("scan_engine", "deepteam_v1"))
                max_risk = max(max_risk, float(dt_res.get("risk_score", 0)))
        else:
            logger.warning("Skipping DeepTeam scan: OPENAI_API_KEY missing.")
    except Exception as e:
        logger.error(f"DeepTeam engine failed: {e}")

    # ── 3. Post-Process & Finalize ──────────────────────────────
    # Sort unified findings by severity
    findings.sort(key=lambda x: ({"HIGH": 0, "MEDIUM": 1, "LOW": 2}.get(x.get("severity"), 3), -float(x.get("hit_rate", 0))))
    
    # Post-process for free tier (minimal info)
    if tier == "free" and findings:
        for i, f in enumerate(findings):
            if i > 0:
                f["blurred"] = True
                f["detail"] = "Upgrade to Pro to see full details"
        compliance["blurred"] = True
        compliance["hint"] = "Upgrade to Pro"

    result = {
        "scan_id": scan_id,
        "url": url,
        "tier": tier,
        "status": "complete" if scan_engines else "failed",
        "risk_score": max_risk,
        "findings": findings,
        "compliance": compliance,
        "scan_engines": scan_engines,
        "completed_at": time.time(),
    }
    
    if not scan_engines:
        result["error"] = "All scan engines failed"
        logger.error(f"Scan {scan_id} failed completely.")
    else:
        logger.info(f"Scan {scan_id} completed via engines: {scan_engines}")
        
    return result

def _merge_compliance(base: dict, new: dict):
    """Deep merge compliance records."""
    if not new or new.get("blurred"):
        return
    for framework, data in new.items():
        if framework in ("blurred", "hint"): continue
        if framework not in base:
            base[framework] = data
        else:
            # Merge articles/sections sets
            if "articles" in data:
                existing = set(base[framework].get("articles", []))
                existing.update(data["articles"])
                base[framework]["articles"] = sorted(list(existing))
            if "sections" in data:
                existing = set(base[framework].get("sections", []))
                existing.update(data["sections"])
                base[framework]["sections"] = sorted(list(existing))
            if "functions" in data:
                existing = set(base[framework].get("functions", []))
                existing.update(data["functions"])
                base[framework]["functions"] = sorted(list(existing))
            # Max fine
            if "fine_eur" in data:
                base[framework]["fine_eur"] = max(base[framework].get("fine_eur", 0), data["fine_eur"])
            if "fine_inr" in data:
                base[framework]["fine_inr"] = max(base[framework].get("fine_inr", 0), data["fine_inr"])

@app.task(name="app.worker.check_due_sentinel_watches")
def check_due_sentinel_watches():
    """
    Beat task: runs every 15 minutes. Dispatches sentinel_check for each due watch.
    """
    try:
        from app.services.supabase_service import get_due_sentinel_watches
        due = get_due_sentinel_watches()
        logger.info(f"Sentinel beat: {len(due)} watches due")
        for watch in due:
            sentinel_check.delay(
                watch["id"],
                watch["url"],
                watch.get("tier", "pro"),
                watch.get("last_risk_score"),
                watch.get("notification_email"),
                watch.get("user_id"),
            )
    except Exception as e:
        logger.error(f"check_due_sentinel_watches failed: {e}")


@app.task(name="app.worker.sentinel_check")
def sentinel_check(
    watch_id: str,
    url: str,
    tier: str = "pro",
    prev_risk_score: float = None,
    notification_email: str = None,
    user_id: str = None,
):
    """
    Run a full scan for a watched endpoint. On completion:
    - Save scan result to DB
    - Update sentinel_watches.last_scan / last_risk_score
    - Send alert email if risk score increased > 20pp or new HIGH finding
    """
    import uuid as _uuid
    logger.info(f"Sentinel scan triggered: {url} (watch={watch_id})")

    scan_id = str(_uuid.uuid4())

    # Run scan synchronously (reuse run_scan task body directly)
    try:
        result = run_scan.run(scan_id, url, tier)
    except Exception as e:
        logger.error(f"Sentinel scan failed for {url}: {e}")
        return

    new_risk = float(result.get("risk_score", 0))
    findings  = result.get("findings", [])

    # Persist to scans table
    try:
        from app.services.supabase_service import get_supabase
        sb = get_supabase()
        if sb and user_id:
            sb.table("scans").upsert({
                "id":           scan_id,
                "user_id":      user_id,
                "target_url":   url,
                "tier":         tier,
                "status":       result.get("status", "complete"),
                "scan_engine":  ",".join(result.get("scan_engines", [])),
                "risk_score":   new_risk,
                "findings":     findings,
                "compliance":   result.get("compliance", {}),
                "completed_at": "now()",
            }).execute()
    except Exception as e:
        logger.error(f"Failed to persist sentinel scan result: {e}")

    # Update watch timestamps
    try:
        from app.services.supabase_service import update_sentinel_after_scan
        update_sentinel_after_scan(watch_id, new_risk)
    except Exception as e:
        logger.error(f"Failed to update sentinel watch after scan: {e}")

    # Alert logic: send email if risk jumped >20pp or new HIGH findings
    if notification_email:
        should_alert = False
        reason = ""
        if prev_risk_score is not None and (new_risk - prev_risk_score) >= 0.20:
            should_alert = True
            reason = f"risk score increased from {round(prev_risk_score*100)}→{round(new_risk*100)}"
        elif any(f.get("severity") == "HIGH" for f in findings):
            should_alert = True
            high_count = sum(1 for f in findings if f.get("severity") == "HIGH")
            reason = f"{high_count} HIGH severity finding(s) detected"

        if should_alert:
            _send_sentinel_alert(notification_email, url, new_risk, findings, reason)

    logger.info(f"Sentinel scan complete for {url}: risk={new_risk:.2f}")


def _send_sentinel_alert(email: str, url: str, risk_score: float, findings: list, reason: str):
    """Send a Sentinel alert email via Resend API."""
    try:
        import httpx
        from app.core.config import settings
        if not settings.resend_api_key:
            logger.warning("RESEND_API_KEY not set — skipping Sentinel alert email")
            return

        high_findings = [f for f in findings if f.get("severity") == "HIGH"]
        findings_html = "".join(
            f'<li><strong>{f.get("category", "Unknown")}</strong> — {f.get("detail", "")[:200]}</li>'
            for f in high_findings[:5]
        )

        body_html = f"""
        <div style="font-family:monospace;background:#060608;color:#e0e0e0;padding:24px;border-radius:8px;">
          <h2 style="color:#b8ff57;margin-top:0;">⚠ VULNRA Sentinel Alert</h2>
          <p><strong>Endpoint:</strong> {url}</p>
          <p><strong>Risk Score:</strong> {round(risk_score * 100)}/100</p>
          <p><strong>Reason:</strong> {reason}</p>
          {"<h3 style='color:#b8ff57;'>High Severity Findings</h3><ul>" + findings_html + "</ul>" if findings_html else ""}
          <p style="margin-top:24px;font-size:12px;color:#666;">
            This alert was sent by <a href="https://vulnra.ai" style="color:#b8ff57;">VULNRA Sentinel</a>.
            Log in to view full results and download a PDF report.
          </p>
        </div>
        """

        httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.alert_from_email,
                "to": [email],
                "subject": f"[VULNRA] Risk alert: {url[:60]}",
                "html": body_html,
            },
            timeout=10,
        )
        logger.info(f"Sentinel alert sent to {email} for {url}")
    except Exception as e:
        logger.error(f"Failed to send sentinel alert email: {e}")