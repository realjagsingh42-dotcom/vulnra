"""
app/services/engine_runner.py — Single entry point for running all scan engines.

Both scan_service.py (FastAPI background task) and worker.py (Celery task)
call run_all_engines() instead of duplicating engine invocation logic.

Returns
-------
tuple: (findings, compliance, scan_engines, max_risk)
    findings      — list of finding dicts, sorted by severity
    compliance    — merged compliance record
    scan_engines  — list of engine names that ran successfully
    max_risk      — highest risk_score across all engines (0.0–10.0)
"""

import os
import logging
from typing import Optional

from app.core.compliance_utils import merge_compliance

logger = logging.getLogger("vulnra.engine_runner")


def run_all_engines(
    scan_id: str,
    url: str,
    tier: str,
    custom_probes: Optional[list] = None,
    vulnerability_types: Optional[list] = None,
) -> tuple[list, dict, list, float]:
    """
    Run all scan engines appropriate for *tier* against *url*.

    Engine schedule:
      All tiers   : Garak
      All tiers   : DeepTeam (requires OPENAI_API_KEY)
      pro/ent     : PyRIT converter
      pro/ent     : EasyJailbreak (requires ANTHROPIC_API_KEY)

    All engine imports are lazy so this module loads without pulling in
    heavy ML dependencies at startup.
    """
    findings: list = []
    compliance: dict = {}
    scan_engines: list = []
    max_risk: float = 0.0

    # ── 1. Garak ──────────────────────────────────────────────────────────────
    try:
        from app.garak_engine import run_garak_scan
        result = run_garak_scan(scan_id, url, tier, custom_probes=custom_probes)
        if result.get("status") == "complete":
            findings.extend(result.get("findings", []))
            merge_compliance(compliance, result.get("compliance", {}))
            scan_engines.append(result.get("scan_engine", "garak"))
            max_risk = max(max_risk, float(result.get("risk_score", 0)))
    except Exception as exc:
        logger.error(f"[{scan_id}] Garak engine failed: {exc}")

    # ── 2. DeepTeam ───────────────────────────────────────────────────────────
    if os.environ.get("OPENAI_API_KEY"):
        try:
            from app.deepteam_engine import run_deepteam_scan
            result = run_deepteam_scan(
                scan_id, url, tier, vulnerability_types=vulnerability_types
            )
            if result.get("status") == "complete":
                findings.extend(result.get("findings", []))
                merge_compliance(compliance, result.get("compliance", {}))
                scan_engines.append(result.get("scan_engine", "deepteam_v1"))
                max_risk = max(max_risk, float(result.get("risk_score", 0)))
        except Exception as exc:
            logger.error(f"[{scan_id}] DeepTeam engine failed: {exc}")
    else:
        logger.warning(f"[{scan_id}] Skipping DeepTeam: OPENAI_API_KEY not set")

    # ── 3. PyRIT (pro / enterprise) ───────────────────────────────────────────
    if tier in ("pro", "enterprise"):
        try:
            from app.pyrit_engine import run_pyrit_scan
            result = run_pyrit_scan(scan_id, url, tier)
            if result.get("status") == "complete":
                findings.extend(result.get("findings", []))
                merge_compliance(compliance, result.get("compliance", {}))
                if result.get("findings"):
                    scan_engines.append(result.get("scan_engine", "pyrit_converter"))
                max_risk = max(max_risk, float(result.get("risk_score", 0)))
        except Exception as exc:
            logger.error(f"[{scan_id}] PyRIT engine failed: {exc}")

    # ── 4. EasyJailbreak (pro / enterprise) ───────────────────────────────────
    if tier in ("pro", "enterprise") and os.environ.get("ANTHROPIC_API_KEY"):
        try:
            from app.easyjailbreak_engine import run_easyjailbreak_scan
            result = run_easyjailbreak_scan(scan_id, url, tier)
            if result.get("status") in ("complete", "skipped"):
                findings.extend(result.get("findings", []))
                merge_compliance(compliance, result.get("compliance", {}))
                if result.get("findings"):
                    scan_engines.append(result.get("scan_engine", "easyjailbreak"))
                max_risk = max(max_risk, float(result.get("risk_score", 0)))
        except Exception as exc:
            logger.error(f"[{scan_id}] EasyJailbreak engine failed: {exc}")

    # ── Sort by severity then hit_rate ────────────────────────────────────────
    _SEV = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    findings.sort(
        key=lambda f: (_SEV.get(f.get("severity", ""), 4), -float(f.get("hit_rate", 0)))
    )

    return findings, compliance, scan_engines, max_risk
