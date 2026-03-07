@echo off
echo =============================================
echo   Miru-Shield -- SETUP (run once)
echo =============================================
cd /d "%~dp0"

echo Step 1: Creating virtual environment...
python -m venv venv
if errorlevel 1 ( echo FAILED: Is Python installed? & pause & exit /b 1 )

echo Step 2: Activating venv...
call venv\Scripts\activate.bat

echo Step 3: Installing packages...
python -m pip install --upgrade pip --quiet
python -m pip install fastapi "uvicorn[standard]" celery redis sqlalchemy psycopg2-binary python-dotenv pydantic httpx

echo.
echo Step 4: Verifying...
python -c "import uvicorn; print('  uvicorn  OK')"
python -c "import celery;  print('  celery   OK')"
python -c "import fastapi; print('  fastapi  OK')"
python -c "import redis;   print('  redis    OK')"

echo.
echo =============================================
echo   Setup complete!
echo   Next steps:
echo     1. Edit .env  (set your DB password)
echo     2. python create_db.py
echo     3. Open two terminals:
echo          Terminal 1: dev.bat
echo          Terminal 2: worker.bat
echo =============================================
pause
