#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# VULNRA — Stop all services
# Usage: ./stop-all.sh
# ─────────────────────────────────────────────────────────────────────────────

echo "Stopping VULNRA services..."

# Stop services by PID
if [ -f ".vulnra.pids" ]; then
    read -r BACKEND_PID WORKER_PID DEMO_PID FRONTEND_PID < .vulnra.pids
    kill $BACKEND_PID 2>/dev/null
    kill $WORKER_PID 2>/dev/null
    kill $DEMO_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    rm .vulnra.pids
fi

# Kill any remaining processes
pkill -f "uvicorn app.main:app" 2>/dev/null
pkill -f "celery.*app.worker" 2>/dev/null
pkill -f "python demo/vulnerable_llm.py" 2>/dev/null
pkill -f "next-server" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null

# Stop Redis container
docker stop vulnra-redis 2>/dev/null
docker rm vulnra-redis 2>/dev/null

echo "All services stopped."
