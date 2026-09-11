@echo off
title Sentinel SOC Agent - Backend
echo ===================================================
echo Starting Microsoft Sentinel AI Triage Backend...
echo ===================================================

cd /d "%~dp0backend"

if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate

echo Installing / checking requirements...
pip install -r requirements.txt

echo.
echo Starting FastAPI + WebSocket server on http://localhost:8000...
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
