@echo off
echo =============================================
echo   Miru-Shield -- Install Garak
echo   (requires Python 3.10-3.12)
echo =============================================
cd /d "%~dp0"

REM Check for compatible Python
echo Looking for Python 3.10-3.12...

python3.12 --version >nul 2>&1 && set GARAK_PY=python3.12 && goto FOUND
python3.11 --version >nul 2>&1 && set GARAK_PY=python3.11 && goto FOUND
python3.10 --version >nul 2>&1 && set GARAK_PY=python3.10 && goto FOUND

echo.
echo WARNING: No Python 3.10-3.12 found.
echo Garak does not support Python 3.13+
echo.
echo Options:
echo   1. Install Python 3.12 from https://python.org/downloads/
echo   2. Miru-Shield will use mock scan data until garak is installed
echo.
echo Mock data is realistic and sufficient for development.
echo You only need garak for production scanning.
pause
exit /b 1

:FOUND
echo Found: %GARAK_PY%
echo.
echo Creating garak virtual environment...
%GARAK_PY% -m venv garak_env
call garak_env\Scripts\activate.bat

echo Installing garak (this takes 2-3 minutes)...
python -m pip install --upgrade pip --quiet
python -m pip install garak

echo.
echo Verifying installation...
python -c "import garak; print('garak version:', garak.__version__)"

if errorlevel 1 (
    echo FAILED: garak did not install correctly
) else (
    echo.
    echo =============================================
    echo   Garak installed successfully!
    echo   Real scans are now enabled.
    echo   Restart worker.bat to apply.
    echo =============================================
)
pause
