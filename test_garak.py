r"""
test_garak.py - Verify Garak integration is working.
Run from D:\shield\ with the venv active.
"""

import sys
import json
import pathlib

ROOT = pathlib.Path(__file__).parent
sys.path.insert(0, str(ROOT))

print("=" * 55)
print("  Miru-Shield — Garak Engine Verification")
print("=" * 55)

# ── STEP 1: Import ────────────────────────────────────────────
print("\n[1/4] Importing garak_engine...")
try:
    from app.garak_engine import run_garak_scan, garak_available, _find_garak_python
    print("  ✓ Import OK")
except ImportError as e:
    print(f"  ✗ Import failed: {e}")
    print("  → Make sure app/garak_engine.py exists in D:\\shield\\app\\")
    input("\nPress Enter to exit...")
    sys.exit(1)

# ── STEP 2: Detect garak ──────────────────────────────────────
print("\n[2/4] Detecting Garak installation...")
python = _find_garak_python()
available = garak_available()
print(f"  Garak Python : {python or 'NOT FOUND'}")
print(f"  Available    : {available}")

if not available:
    print("\n  ⚠  Garak not found in garak_env\\")
    print("  → Run install_garak.bat to install it")
    print("  → Will use mock scan data for now")
else:
    print("  ✓ Garak ready for real scans")

# ── STEP 3: Run a scan ────────────────────────────────────────
print("\n[3/4] Running test scan (httpbin.org, free tier)...")
print("  This may take 30–120 seconds if using real Garak...\n")

result = run_garak_scan("test-verify-001", "https://httpbin.org/post", "free")

print(f"\n  scan_id     : {result['scan_id']}")
print(f"  risk_score  : {result['risk_score']}")
print(f"  findings    : {len(result['findings'])}")
print(f"  engine      : {result['scan_engine']}")
print(f"  status      : {result['status']}")

if result["scan_engine"] == "garak_v1":
    print("\n  ✓ REAL Garak scan — live vulnerability data!")
else:
    print("\n  ℹ  Mock scan — realistic simulated data")

# ── STEP 4: Full result ────────────────────────────────────────
print("\n[4/4] Full result:")
print(json.dumps(result, indent=2))

print("\n" + "=" * 55)
if available:
    print("  ✓ Garak engine fully operational")
    print("  Restart worker.bat to use real scans")
else:
    print("  ℹ  Mock mode active (run install_garak.bat for real scans)")
print("=" * 55)
input("\nPress Enter to exit...")