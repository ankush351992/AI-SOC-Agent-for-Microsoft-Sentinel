@echo off
title Sentinel SOC Agent - Frontend
echo ===================================================
echo Starting Sentinel AI Triage Frontend Dashboard...
echo ===================================================

cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo Installing npm dependencies...
    call npm install
)

echo Starting Vite Dev Server on http://localhost:3000...
call npm run dev
pause
