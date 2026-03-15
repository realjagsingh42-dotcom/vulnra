import os
import time
import json
import logging
from typing import List, Optional
from app.core.config import logger
from app.services.supabase_service import save_scan_result

# NOTE: All engine imports are done lazily inside run_scan_internal() —
# avoids loading anthropic SDK + heavy deps at web-server startup,
# keeping the /health response well under 10s.

def _merge_compliance_internal(base: dict, new: dict):
    if not new or new.get("blurred"): return
    for fw, data in new.items():
        if fw in ("blurred", "hint"): continue
        if fw not in base:
            base[fw] = data
        else:
            for key in ("articles", "sections", "functions"):
                if key in data:
                    s = set(base[fw].get(key, []))
                    s.update(data[key])
                    base[fw][key] = sorted(list(s))
            if "fine_eur" in data:
                base[fw]["fine_eur"] = max(base[fw].get("fine_eur", 0), data["fine_eur"])
            if "fine_inr" in data:
                base[fw]["fine_inr"] = max(base[fw].get("fine_inr", 0), data["fine_inr"])

async def run_scan_internal(scan_id: str, url: str, tier: str, user_id: str) -> dict:
    findings = []
    compliance = {}
    scan_engines = []
    max_risk = 0.0

    # ── 1. Garak Scan ───────────────────────────────────────────
    try:
        from app.garak_engine import run_garak_scan  # lazy import
        garak_res = run_garak_scan(scan_id, url, tier)
        if garak_res.get("status") == "complete":
            findings.extend(garak_res.get("findings", []))
            _merge_compliance_internal(compliance, garak_res.get("compliance", {}))
            scan_engines.append(garak_res.get("scan_engine", "garak"))
            max_risk = max(max_risk, float(garak_res.get("risk_score", 0)))
    except Exception as e:
        logger.error(f"Garak engine failed: {e}")

    # ── 2. DeepTeam Scan ────────────────────────────────────────
    try:
        from app.deepteam_engine import run_deepteam_scan  # lazy import
        # Check for API key in env
        if os.environ.get("OPENAI_API_KEY"):
            dt_res = run_deepteam_scan(scan_id, url, tier)
            if dt_res.get("status") == "complete":
                findings.extend(dt_res.get("findings", []))
                _merge_compliance_internal(compliance, dt_res.get("compliance", {}))
                scan_engines.append(dt_res.get("scan_engine", "deepteam_v1"))
                max_risk = max(max_risk, float(dt_res.get("risk_score", 0)))
    except Exception as e:
        logger.error(f"DeepTeam engine failed: {e}")

    # ── 3. PyRIT Converter Engine (Pro / Enterprise) ─────────────
    if tier in ("pro", "enterprise"):
        try:
            from app.pyrit_engine import run_pyrit_scan  # lazy import
            pyrit_res = run_pyrit_scan(scan_id, url, tier)
            if pyrit_res.get("status") == "complete":
                findings.extend(pyrit_res.get("findings", []))
                _merge_compliance_internal(compliance, pyrit_res.get("compliance", {}))
                if pyrit_res.get("findings"):
                    scan_engines.append(pyrit_res.get("scan_engine", "pyrit_converter"))
                max_risk = max(max_risk, float(pyrit_res.get("risk_score", 0)))
        except Exception as e:
            logger.error(f"PyRIT engine failed: {e}")

    # ── 4. EasyJailbreak Engine (Pro / Enterprise) ────────────────
    if tier in ("pro", "enterprise") and os.environ.get("ANTHROPIC_API_KEY"):
        try:
            from app.easyjailbreak_engine import run_easyjailbreak_scan  # lazy import
            ej_res = run_easyjailbreak_scan(scan_id, url, tier)
            if ej_res.get("status") in ("complete", "skipped"):
                findings.extend(ej_res.get("findings", []))
                _merge_compliance_internal(compliance, ej_res.get("compliance", {}))
                if ej_res.get("findings"):
                    scan_engines.append(ej_res.get("scan_engine", "easyjailbreak"))
                max_risk = max(max_risk, float(ej_res.get("risk_score", 0)))
        except Exception as e:
            logger.error(f"EasyJailbreak engine failed: {e}")

    # ── 5. Finalize ──────────────────────────────────────────────
    findings.sort(key=lambda x: ({"HIGH": 0, "MEDIUM": 1, "LOW": 2}.get(x.get("severity"), 3), -float(x.get("hit_rate", 0))))

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

    # Save to Supabase
    save_scan_result(scan_id, url, tier, data)

    return data
