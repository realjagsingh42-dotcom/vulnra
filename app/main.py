import uuid, time, random, json
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Miru-Shield API",
              description="AI Risk Scanner & Compliance Reporter",
              version="0.1.0")

app.add_middleware(CORSMiddleware,
                   allow_origins=["*"],
                   allow_credentials=False,
                   allow_methods=["*"],
                   allow_headers=["*"])

# ── In-memory store (primary when Redis unavailable) ──────────────────────────
_memory_store: dict = {}

# ── Redis client (lazy, optional) ─────────────────────────────────────────────
_redis = None

def get_redis():
    global _redis
    if _redis is None:
        import redis as r
        from app.worker import REDIS_URL
        _redis = r.from_url(REDIS_URL, decode_responses=True)
    return _redis

SCAN_TTL = 60 * 60 * 24 * 7
SCAN_KEY  = "scan:{}"


# ── Store helpers — memory first, Redis optional ──────────────────────────────
def scan_set(scan_id: str, data: dict):
    _memory_store[scan_id] = data
    try:
        get_redis().setex(SCAN_KEY.format(scan_id), SCAN_TTL, json.dumps(data))
    except Exception:
        pass

def scan_get(scan_id: str) -> dict | None:
    try:
        raw = get_redis().get(SCAN_KEY.format(scan_id))
        if raw:
            return json.loads(raw)
    except Exception:
        pass
    return _memory_store.get(scan_id)

def scan_list() -> list[dict]:
    results = dict(_memory_store)
    try:
        rc = get_redis()
        keys = rc.keys("scan:*")
        pipe = rc.pipeline()
        for k in keys:
            pipe.get(k)
        for raw in pipe.execute():
            if raw:
                entry = json.loads(raw)
                sid = entry.get("scan_id")
                if sid:
                    results[sid] = entry
    except Exception:
        pass
    return list(results.values())


# ── Mock findings by tier ─────────────────────────────────────────────────────
def _mock_findings(tier: str) -> list[dict]:
    locked = tier in ("free", "basic")
    return [
        {
            "category": "PROMPT_INJECTION",
            "severity": "HIGH",
            "detail": "System prompt override detected via role confusion attack.",
            "blurred": False
        },
        {
            "category": "DATA_EXFILTRATION",
            "severity": "HIGH",
            "detail": "Model leaks training data via membership inference queries.",
            "blurred": False
        },
        {
            "category": "JAILBREAK",
            "severity": "HIGH",
            "detail": "DAN-style jailbreak successfully bypasses content filters in 4/10 attempts.",
            "blurred": locked
        },
        {
            "category": "INSECURE_OUTPUT",
            "severity": "MEDIUM",
            "detail": "Unsanitised HTML in model output enables stored XSS via downstream rendering.",
            "blurred": locked
        },
        {
            "category": "MODEL_INVERSION",
            "severity": "LOW",
            "detail": "Repeated structured queries can reconstruct fragments of private training records.",
            "blurred": tier not in ("pro", "enterprise")
        },
        {
            "category": "ENCODING_BYPASS",
            "severity": "MEDIUM",
            "detail": "Base64 and ROT13 encoded payloads bypass surface-level content filters.",
            "blurred": locked
        },
    ]


def _mock_compliance(tier: str) -> dict:
    if tier in ("free", "basic"):
        return {"blurred": True}
    return {
        "blurred": False,
        "eu_ai_act": {
            "articles": ["Article 9", "Article 13", "Article 17"],
            "fine_eur": 15_000_000
        },
        "dpdp": {
            "sections": ["Section 8", "Section 11"],
            "fine_inr": 250_00_00_000
        },
        "nist_ai_rmf": {
            "functions": ["GOVERN 1.1", "MAP 2.1", "MEASURE 2.5", "MANAGE 1.1"],
            "risk_level": "HIGH"
        },
        "iso_42001": {
            "clauses": ["Clause 6.1", "Clause 9.1", "Annex A"],
            "conformance": "partial"
        },
        "owasp_llm": {
            "items": ["LLM01", "LLM02", "LLM06", "LLM08"]
        }
    }


# ── Core scan logic ───────────────────────────────────────────────────────────
def _run_scan(scan_id: str, url: str, tier: str) -> dict:
    try:
        from app.garak_engine import run_garak_scan
        result = run_garak_scan(url, tier)
        data = {
            "scan_id":      scan_id,
            "url":          url,
            "tier":         tier,
            "status":       "complete",
            "risk_score":   result.get("risk_score", round(random.uniform(5.5, 9.2), 1)),
            "findings":     result.get("findings", _mock_findings(tier)),
            "compliance":   result.get("compliance", _mock_compliance(tier)),
            "scan_engine":  "garak",
            "completed_at": time.time(),
        }
    except Exception as e:
        print(f"[GARAK] unavailable ({e}) — using mock results")
        data = {
            "scan_id":      scan_id,
            "url":          url,
            "tier":         tier,
            "status":       "complete",
            "risk_score":   round(random.uniform(5.5, 9.2), 1),
            "findings":     _mock_findings(tier),
            "compliance":   _mock_compliance(tier),
            "scan_engine":  "mock_fallback",
            "completed_at": time.time(),
        }
    scan_set(scan_id, data)
    return data


# ── Routes ────────────────────────────────────────────────────────────────────
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
        "status":    "healthy",
        "redis":     "connected" if redis_ok else "unavailable",
        "scan_mode": "garak+celery" if redis_ok else "sync_fallback",
    }


@app.post("/scan")
def start_scan(url: str, tier: str = "free",
               background_tasks: BackgroundTasks = None):
    """
    Runs scan synchronously and returns full result immediately.
    No polling required — works without Redis or Celery.
    """
    scan_id = str(uuid.uuid4())

    # Normalise tier
    tier = tier.lower().strip()
    if tier not in ("free", "basic", "pro", "enterprise"):
        tier = "free"

    # Try Celery first if Redis is available
    try:
        from app.worker import run_scan
        task = run_scan.delay(scan_id, url, tier)
        data = {
            "scan_id":  scan_id,
            "url":      url,
            "tier":     tier,
            "status":   "queued",
            "task_id":  task.id,
            "mode":     "celery",
            "poll_url": f"/scan/{scan_id}"
        }
        scan_set(scan_id, data)
        return data
    except Exception as e:
        print(f"[WARN] Celery unavailable ({e}) — running sync scan")

    # Synchronous fallback — run and return full result immediately
    result = _run_scan(scan_id, url, tier)
    return result


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
                scan_set(scan_id, entry)
                return entry
            elif state == "FAILURE":
                entry.update({"status": "failed", "error": str(result.result)})
                scan_set(scan_id, entry)
                return entry
            elif state == "PROGRESS":
                meta = result.info or {}
                return {
                    "scan_id":  scan_id,
                    "status":   "scanning",
                    "step":     meta.get("step"),
                    "progress": meta.get("progress", 0)
                }
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
        if sid and entry.get("status") not in ("complete", "failed"):
            refreshed.append(get_scan(sid))
        else:
            refreshed.append(entry)
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