# Automated Prerequisites Setup for Windows
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host " Microsoft Sentinel AI SOC Agent - Setup" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# 1. Check & Install Python
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "[+] Installing Python 3.11 via winget..." -ForegroundColor Yellow
    winget install Python.Python.3.11 -e --accept-package-agreements --accept-source-agreements
} else {
    Write-Host "[✓] Python is already installed." -ForegroundColor Green
}

# 2. Check & Install Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[+] Installing Node.js LTS via winget..." -ForegroundColor Yellow
    winget install OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
} else {
    Write-Host "[✓] Node.js is already installed." -ForegroundColor Green
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host " Setup complete! Please RESTART your PowerShell window" -ForegroundColor Green
Write-Host " to refresh environment PATH variables." -ForegroundColor Green
Write-Host " Then simply double-click 'run-backend.bat' and 'run-frontend.bat'." -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Cyan
