import uuid, time, random, json
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Miru-Shield API",
              description="AI Risk Scanner & Compliance Reporter",
              version="0.1.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

# ── Redis client (lazy, shared) ───────────────────────────────────────────────
_redis = None

def get_redis():
    global _redis
    if _redis is None:
        import redis as r
        from app.worker import REDIS_URL
        _redis = r.from_url(REDIS_URL, decode_responses=True)
    return _redis

SCAN_TTL = 60 * 60 * 24 * 7   # keep scans 7 days
SCAN_KEY  = "scan:{}"          # Redis key pattern


# ── Scan store helpers ────────────────────────────────────────────────────
def scan_set(scan_id: str, data: dict):
    """Write scan dict to Redis (serialised as JSON)."""
    try:
        get_redis().setex(SCAN_KEY.format(scan_id), SCAN_TTL, json.dumps(data))
    except Exception as e:
        print(f"[REDIS] scan_set failed: {e}")

def scan_get(scan_id: str) -> dict | None:
    """Read scan dict from Redis. Returns None if not found."""
    try:
        raw = get_redis().get(SCAN_KEY.format(scan_id))
        return json.loads(raw) if raw else None
    except Exception as e:
        print(f"[REDIS] scan_get failed: {e}")
        return None

def scan_list() -> list[dict]:
    """Return all scans stored in Redis."""
    try:
        rc = get_redis()
        keys = rc.keys("scan:*")
        pipe = rc.pipeline()
        for k in keys:
            pipe.get(k)
        raws = pipe.execute()
        return [json.loads(r) for r in raws if r]
    except Exception as e:
        print(f"[REDIS] scan_list failed: {e}")
        return []


# ── Sync fallback (no Celery) ───────────────────────────────────────────────────
def _sync_scan(scan_id: str, url: str, tier: str):
    time.sleep(5)
    score = round(random.uniform(4.5, 9.5), 1)
    data = scan_get(scan_id) or {}
    data.update({
        "status":       "complete",
        "risk_score":   score,
        "findings":     [{"category": "PROMPT_INJECTION", "severity": "HIGH",
                          "detail": "Mock finding (sync fallback)", "blurred": False}],
        "compliance":   {"eu_ai_act": {"fine_eur": 15_000_000}},
        "scan_engine":  "sync_fallback",
        "completed_at": time.time(),
    })
    scan_set(scan_id, data)


# ── Routes ────────────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "service": "Miru-Shield", "version": "0.1.0"}


@app.get("/health")
def health():
    redis_ok = False
    try:
        get_redis().ping()
        redis_ok = True
    except Exception:
        pass
    return {
        "status":       "healthy",
        "redis":        "connected" if redis_ok else "unavailable",
        "scan_mode":    "celery" if redis_ok else "sync_fallback",
    }


@app.post("/scan")
def start_scan(url: str, tier: str = "free",
               background_tasks: BackgroundTasks = None):
    scan_id = str(uuid.uuid4())

    try:
        from app.worker import run_scan
        task = run_scan.delay(scan_id, url, tier)
        data = {"scan_id": scan_id, "url": url, "tier": tier,
                "status": "queued", "task_id": task.id, "mode": "celery"}
        scan_set(scan_id, data)
        return {**data, "poll_url": f"/scan/{scan_id}"}

    except Exception as e:
        print(f"[WARN] Celery unavailable ({e}) — sync fallback")
        data = {"scan_id": scan_id, "url": url, "tier": tier,
                "status": "scanning", "mode": "sync_fallback"}
        scan_set(scan_id, data)
        background_tasks.add_task(_sync_scan, scan_id, url, tier)
        return {**data, "poll_url": f"/scan/{scan_id}"}


@app.get("/scan/{scan_id}")
def get_scan(scan_id: str):
    entry = scan_get(scan_id)
    if not entry:
        return {"scan_id": scan_id, "status": "not_found"}

    if entry.get("status") == "complete":
        return entry

    if entry.get("mode") == "celery":
        try:
            from app.worker import app as celery_app
            from celery.result import AsyncResult
            result = AsyncResult(entry["task_id"], app=celery_app)
            state  = result.state

            if state == "SUCCESS":
                entry.update(result.get())
                entry["status"] = "complete"
                scan_set(scan_id, entry)   # persist the completed result
                return entry

            elif state == "FAILURE":
                entry.update({"status": "failed", "error": str(result.result)})
                scan_set(scan_id, entry)
                return entry

            elif state == "PROGRESS":
                meta = result.info or {}
                return {"scan_id": scan_id, "status": "scanning",
                        "step": meta.get("step"), "progress": meta.get("progress", 0)}

            else:
                return {"scan_id": scan_id, "status": "queued", "celery_state": state}

        except Exception as e:
            return {**entry, "poll_error": str(e)}

    return entry


@app.get("/scans")
def list_scans():
    scans = scan_list()
    refreshed = []
    for entry in scans:
        sid = entry.get("scan_id")
        # For scans not yet in a terminal state, fetch live Celery status
        if sid and entry.get("status") not in ("complete", "failed"):
            live = get_scan(sid)   # reuses all the Celery-check + Redis-persist logic
            refreshed.append(live)
        else:
            refreshed.append(entry)
    # Sort newest first using scan_id (UUID v4 is not time-ordered, so use completed_at / fallback)
    refreshed.sort(key=lambda s: s.get("completed_at") or 0, reverse=True)
    return {"total": len(refreshed), "scans": refreshed}


@app.get("/scan/{scan_id}/report")
def get_report(scan_id: str):
    from fastapi.responses import Response
    entry = scan_get(scan_id)
    if not entry or entry.get("status") != "complete":
        return {"error": "Scan not complete or not found"}
    try:
        from app.pdf_report import generate_audit_pdf
        pdf_bytes = generate_audit_pdf(entry)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename=vulnra_{scan_id[:8]}.pdf'}
        )
    except Exception as e:
        return {"error": f"PDF generation failed: {e}"}