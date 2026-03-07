import os, time, pathlib
from celery import Celery

def _env(key, default=""):
    p = pathlib.Path(__file__).parent.parent / ".env"
    if p.exists():
        for line in p.read_text().splitlines():
            line = line.strip()
            if line.startswith(f"{key}=") and not line.startswith("#"):
                return line.split("=", 1)[1].strip()
    return os.environ.get(key, default)

REDIS_URL = _env("REDIS_URL", "redis://localhost:6379/0")

app = Celery("mirushield", broker=REDIS_URL, backend=REDIS_URL)
app.conf.update(
    task_serializer="json", result_serializer="json",
    accept_content=["json"], timezone="UTC",
    worker_pool="solo",
    broker_connection_retry_on_startup=True,
    task_routes={
        "app.worker.run_scan":        {"queue": "scans"},
        "app.worker.sentinel_check":  {"queue": "sentinel"},
    },
)
celery_app = app


@app.task(name="app.worker.run_scan", bind=True)
def run_scan(self, scan_id, url, tier="free"):
    print(f"[WORKER] scan={scan_id} url={url} tier={tier}")

    # ── Real Garak scan ───────────────────────────────────────
    from app.garak_engine import run_garak_scan
    result = run_garak_scan(scan_id, url, tier)

    # ── Free-tier blurring (applied after real scan) ──────────
    if tier == "free" and result.get("findings"):
        # Show first finding, blur the rest
        for i, f in enumerate(result["findings"]):
            if i > 0:
                f["blurred"] = True
                f["detail"]  = "Upgrade to Pro to see full details"
        result["compliance"] = {"blurred": True, "hint": "Upgrade to Pro"}

    result.update({
        "tier":             tier,
        "findings_count":   len(result.get("findings", [])),
        "completed_at":     time.time(),
    })

    print(f"[WORKER] done scan={scan_id} score={result.get('risk_score')} "
          f"engine={result.get('scan_engine')} findings={result.get('findings_count')}")
    return result


@app.task(name="app.worker.sentinel_check")
def sentinel_check(watch_id, url, chat_id):
    task = run_scan.delay(watch_id, url, tier="pro")
    return {"watch_id": watch_id, "task_id": task.id}