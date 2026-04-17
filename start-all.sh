#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# VULNRA — Start all services locally
# Usage: ./start-all.sh
#
# Starts:
#   - Backend API:    http://localhost:8000
#   - Celery Worker:  Background task processing
#   - Frontend:      http://localhost:3000
#   - Demo LLM:      http://localhost:8001 (vulnerable target for testing)
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================="
echo "  VULNRA — Starting all services"
echo "============================================="

# Check for .env file
if [ ! -f ".env" ]; then
    echo ""
    echo "WARNING: .env file not found!"
    echo "Copy .env.example to .env and configure your credentials."
    echo ""
fi

# Check for venv
if [ ! -d "venv" ]; then
    echo ""
    echo "ERROR: venv not found. Run setup first:"
    echo "  python -m venv venv"
    echo "  source venv/bin/activate && pip install -r requirements.txt"
    echo ""
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Set PYTHONPATH
export PYTHONPATH="$SCRIPT_DIR"

echo ""
echo "Starting services..."
echo ""

# Start Redis (if not running)
if ! command -v redis-cli &> /dev/null || ! redis-cli ping &> /dev/null; then
    echo "[1/4] Redis not running. Starting with docker..."
    docker run -d -p 6379:6379 --name vulnra-redis redis:7-alpine 2>/dev/null || true
fi

# Start Backend API (port 8000)
echo "[2/4] Starting Backend API on http://localhost:8000..."
nohup uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "       Backend PID: $BACKEND_PID"

# Start Celery Worker
echo "[3/4] Starting Celery Worker..."
nohup celery -A app.worker worker --loglevel=info --pool=solo > logs/worker.log 2>&1 &
WORKER_PID=$!
echo "       Worker PID: $WORKER_PID"

# Start Demo LLM Target (port 8001)
echo "[4/4] Starting Demo LLM Target on http://localhost:8001..."
nohup python demo/vulnerable_llm.py > logs/demo.log 2>&1 &
DEMO_PID=$!
echo "       Demo LLM PID: $DEMO_PID"

# Start Frontend (port 3000)
echo ""
echo "[5/5] Starting Frontend on http://localhost:3000..."
cd frontend
nohup npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "       Frontend PID: $FRONTEND_PID"
cd ..

# Save PIDs for cleanup
echo "$BACKEND_PID $WORKER_PID $DEMO_PID $FRONTEND_PID" > .vulnra.pids

# Wait for services to start
sleep 3

echo ""
echo "============================================="
echo "  VULNRA — All Services Started!"
echo "============================================="
echo ""
echo "Services:"
echo "  Frontend:    http://localhost:3000"
echo "  Backend API:  http://localhost:8000"
echo "  API Docs:     http://localhost:8000/docs"
echo "  Demo LLM:     http://localhost:8001"
echo ""
echo "Scan the demo target:"
echo "  POST http://localhost:8000/scan/quick"
echo "  Body: {\"target_url\": \"http://localhost:8001/v1/chat/completions\"}"
echo ""
echo "View logs:"
echo "  tail -f logs/backend.log"
echo "  tail -f logs/worker.log"
echo "  tail -f logs/demo.log"
echo "  tail -f logs/frontend.log"
echo ""
echo "Stop all services:"
echo "  ./stop-all.sh"
echo ""

# Wait for user interrupt
wait
