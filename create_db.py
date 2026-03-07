import subprocess, sys

def install(p):
    subprocess.check_call([sys.executable, "-m", "pip", "install", p, "--quiet"])

try:
    import psycopg2
except ImportError:
    install("psycopg2-binary"); import psycopg2

import os

# Read .env manually
env = {}
if os.path.exists(".env"):
    for line in open(".env"):
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()

HOST = env.get("POSTGRES_HOST", "localhost")
PORT = env.get("POSTGRES_PORT", "5432")
USER = env.get("POSTGRES_USER", "postgres")
PASS = env.get("POSTGRES_PASSWORD", "")
DB   = env.get("POSTGRES_DB", "mirushield")

print(f"Connecting to PostgreSQL {HOST}:{PORT} as {USER}...")

try:
    conn = psycopg2.connect(host=HOST, port=PORT, user=USER, password=PASS, database="postgres")
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(f"SELECT 1 FROM pg_database WHERE datname='{DB}'")
    if not cur.fetchone():
        cur.execute(f"CREATE DATABASE {DB}")
        print(f"  Created database: {DB}")
    else:
        print(f"  Database already exists: {DB}")
    cur.close(); conn.close()

    conn = psycopg2.connect(host=HOST, port=PORT, user=USER, password=PASS, database=DB)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS scans (
            id VARCHAR(36) PRIMARY KEY,
            url TEXT NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            tier VARCHAR(20) DEFAULT 'free',
            risk_score FLOAT,
            findings JSONB,
            compliance JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            completed_at TIMESTAMP
        )
    """)
    print("  Table: scans OK")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS sentinel_watches (
            id VARCHAR(36) PRIMARY KEY,
            chat_id VARCHAR(50),
            url TEXT NOT NULL,
            interval_hours INT DEFAULT 24,
            last_scan TIMESTAMP,
            active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    print("  Table: sentinel_watches OK")

    cur.close(); conn.close()
    print("\nDatabase setup complete!")

except psycopg2.OperationalError as e:
    print(f"\nERROR: {e}")
    print(f"\nCheck .env — POSTGRES_PASSWORD is currently: {'(empty)' if not PASS else '***'}")
    print("Is PostgreSQL running? Check Windows Services (services.msc)")

input("\nPress Enter to exit...")
