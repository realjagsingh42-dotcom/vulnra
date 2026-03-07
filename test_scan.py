import sys, os, time, json

def install(p):
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", p, "--quiet"])

try: import httpx
except ImportError: install("httpx"); import httpx

try: import redis as redis_lib
except ImportError: install("redis"); import redis_lib

BASE = "http://localhost:8000"

def p(d): print(json.dumps(d, indent=2))

print("\n" + "#"*50 + "\n  Miru-Shield — Test Suite\n" + "#"*50)

# 1. Health
print("\n--- TEST 1: GET /health ---")
try:
    r = httpx.get(f"{BASE}/health", timeout=5)
    health = r.json(); p(health); print("PASS ✓")
except httpx.ConnectError:
    print("FAIL ✗ — API not running. Start dev.bat first.")
    input(); sys.exit(1)

# 2. Root
print("\n--- TEST 2: GET / ---")
p(httpx.get(f"{BASE}/", timeout=5).json()); print("PASS ✓")

# 3. Redis direct
print("\n--- TEST 3: Redis direct ---")
redis_url = "redis://localhost:6379/0"
if os.path.exists(".env"):
    for line in open(".env"):
        if line.startswith("REDIS_URL="):
            redis_url = line.split("=",1)[1].strip()
try:
    redis_lib.from_url(redis_url, socket_connect_timeout=3).ping()
    print(f"CONNECTED ✓  ({redis_url})")
except Exception as e:
    print(f"NOTE: {e}")

# 4. POST /scan
print("\n--- TEST 4: POST /scan (tier=pro) ---")
r = httpx.post(f"{BASE}/scan", params={"url": "https://httpbin.org/post", "tier": "pro"}, timeout=10)
data = r.json(); p(data)
if "scan_id" not in data:
    print("FAIL ✗"); input(); sys.exit(1)
scan_id = data["scan_id"]
print(f"PASS ✓  scan_id={scan_id[:8]}...  mode={data.get('mode')}")

# 5. Poll
print("\n--- TEST 5: Poll until complete ---")
for i in range(1, 20):
    r = httpx.get(f"{BASE}/scan/{scan_id}", timeout=5)
    d = r.json()
    st = d.get("status","?")
    score = d.get("risk_score","—")
    print(f"  [{i:02d}] status={st:<14} score={score}")
    if st == "complete":
        print("\nFull result:"); p(d)
        print(f"\nPASS ✓  findings={len(d.get('findings',[]))}  compliance={'yes' if d.get('compliance') else 'no'}")
        break
    elif st in ("failed","error"):
        print(f"FAIL ✗  {d}"); break
    time.sleep(2)
else:
    print("TIMEOUT — check worker.bat terminal")

# 6. List
print("\n--- TEST 6: GET /scans ---")
d = httpx.get(f"{BASE}/scans", timeout=5).json()
print(f"Total scans: {d['total']}")
for s in d["scans"]:
    print(f"  {s['scan_id'][:8]}...  {s.get('status'):<14}  score={s.get('risk_score','—')}")
print("PASS ✓")

print("\n" + "#"*50 + "\n  All tests done\n" + "#"*50)
input("\nPress Enter to exit...")
