"""
app/worker.py - Celery worker for Miru-Shield.
Calls real Garak engine, falls back to mock if unavailable.
"""

import os
import pathlib
import sys

# Ensure project root is on path
ROOT = pathlib.Path(__file__).parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from celery import Celery

# ── READ .env WITHOUT dotenv ──────────────────────────────────
def _read_env(key, default=""):
    env_path = ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line.startswith(key + "="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return os.environ.get(key, default)

REDIS_URL       = _read_env("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER   = _read_env("CELERY_BROKER_URL",  f"{REDIS_URL.rsplit('/',1)[0]}/1")
CELERY_BACKEND  = _read_env("CELERY_RESULT_BACKEND", f"{REDIS_URL.rsplit('/',1)[0]}/2")

# ── CELERY APP ────────────────────────────────────────────────
celery_app = Celery(
    "mirushield",
    broker=CELERY_BROKER,
    backend=CELERY_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    worker_pool="solo",       # Windows-safe
    task_routes={
        "app.worker.run_scan":      {"queue": "scans"},
        "app.worker.sentinel_check": {"queue": "sentinel"},
    },
)

# ── IMPORT GARAK ENGINE ───────────────────────────────────────
try:
    from app.garak_engine import run_garak_scan, garak_available
    ENGINE_LOADED = True
except ImportError:
    try:
        from garak_engine import run_garak_scan, garak_available
        ENGINE_LOADED = True
    except ImportError:
        ENGINE_LOADED = False


def _fallback_scan(scan_id, url, tier):
    """Emergency mock if garak_engine import fails entirely."""
    import random, time
    random.seed(scan_id)
    time.sleep(2)
    findings = []
    if tier in ("pro", "enterprise"):
        findings = [
            {"category": "PROMPT_INJECTION", "severity": "HIGH",
             "detail": "System prompt exposed via indirect injection",
             "hit_rate": 0.18, "hits": 9, "total": 50, "blurred": False},
            {"category": "PII_LEAK", "severity": "MEDIUM",
             "detail": "Email address reflected in error response",
             "hit_rate": 0.05, "hits": 1, "total": 20, "blurred": False},
        ]
    score = round(sum(f["hit_rate"] * 10 for f in findings) / max(len(findings), 1), 1) if findings else 1.2
    return {
        "scan_id": scan_id, "url": url,
        "risk_score": score, "findings": findings,
        "compliance": {}, "scan_engine": "fallback_mock", "status": "complete",
    }


# ── TASKS ─────────────────────────────────────────────────────

@celery_app.task(name="app.worker.run_scan", bind=True)
def run_scan(self, scan_id: str, url: str, tier: str = "pro"):
    print(f"[SCAN] Starting {scan_id} → {url} ({tier})")
    print(f"[SCAN] Engine loaded: {ENGINE_LOADED}, Garak available: {garak_available() if ENGINE_LOADED else 'N/A'}")

    try:
        if ENGINE_LOADED:
            result = run_garak_scan(scan_id, url, tier)
        else:
            result = _fallback_scan(scan_id, url, tier)
    except Exception as e:
        print(f"[SCAN] Error: {e} — using fallback")
        result = _fallback_scan(scan_id, url, tier)

    print(f"[SCAN] Complete: {scan_id} score={result['risk_score']} engine={result['scan_engine']}")
    return result


@celery_app.task(name="app.worker.sentinel_check")
def sentinel_check(watch_id: str, url: str, tier: str = "pro"):
    """Periodic re-scan for watched endpoints."""
    print(f"[SENTINEL] Re-scanning {url}")
    return run_scan(watch_id, url, tier)


if __name__ == "__main__":
    print(f"Engine loaded: {ENGINE_LOADED}")
    if ENGINE_LOADED:
        print(f"Garak available: {garak_available()}")
