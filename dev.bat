@echo off
echo =============================================
echo   Miru-Shield -- API Server
echo   http://localhost:8000/docs
echo =============================================
cd /d "%~dp0"
call venv\Scripts\activate.bat
set PYTHONPATH=%CD%
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
