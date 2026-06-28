#!/usr/bin/env pwsh
# Setup and Preview Logixa Flow
# This script installs dependencies and prepares the project for local development
# Usage: .\setup-preview.ps1

Write-Host "🔧 Logixa Flow - Setup and Preview" -ForegroundColor Cyan
Write-Host ""

$projectRoot = "d:\1 main\Logixa Flow ver.1.1.1.00"
$backendPath = "$projectRoot\web-platform\backend"
$frontendPath = "$projectRoot\web-platform\frontend"

# Check Python
Write-Host "✓ Checking system requirements..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
$nodeVersion = node --version 2>&1
$npmVersion = npm --version 2>&1

Write-Host "  - Python: $pythonVersion" -ForegroundColor Green
Write-Host "  - Node.js: $nodeVersion" -ForegroundColor Green
Write-Host "  - npm: $npmVersion" -ForegroundColor Green
Write-Host ""

# Backend setup
Write-Host "📦 Setting up Backend..." -ForegroundColor Cyan
Set-Location $backendPath

Write-Host "  Installing Python dependencies..." -ForegroundColor Yellow
python -m pip install -r requirements.txt --quiet

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Backend setup failed" -ForegroundColor Red
    exit 1
}

Write-Host "  ✅ Backend ready!" -ForegroundColor Green
Write-Host ""

# Frontend setup
Write-Host "📦 Setting up Frontend..." -ForegroundColor Cyan
Set-Location $frontendPath

Write-Host "  Installing npm dependencies (this may take a minute)..." -ForegroundColor Yellow
npm install --legacy-peer-deps --silent

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Frontend setup failed" -ForegroundColor Red
    exit 1
}

Write-Host "  ✅ Frontend ready!" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✨ Setup Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "🚀 To start the application:" -ForegroundColor Cyan
Write-Host ""
Write-Host "OPTION 1: Use scripts (recommended)" -ForegroundColor Yellow
Write-Host "  Terminal 1: .\start-backend.ps1" -ForegroundColor White
Write-Host "  Terminal 2: .\start-frontend.ps1" -ForegroundColor White
Write-Host ""

Write-Host "OPTION 2: Manual commands" -ForegroundColor Yellow
Write-Host "  Terminal 1 (Backend):" -ForegroundColor White
Write-Host "    cd $backendPath" -ForegroundColor White
Write-Host "    python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000" -ForegroundColor White
Write-Host ""
Write-Host "  Terminal 2 (Frontend):" -ForegroundColor White
Write-Host "    cd $frontendPath" -ForegroundColor White
Write-Host "    npm run dev -- -p 3000" -ForegroundColor White
Write-Host ""

Write-Host "📍 Access URLs:" -ForegroundColor Cyan
Write-Host "  - Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  - API Docs: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "  - API ReDoc: http://127.0.0.1:8000/redoc" -ForegroundColor White
Write-Host ""

Write-Host "📚 For more help, see:" -ForegroundColor Cyan
Write-Host "  - SETUP_PREVIEW.md (this file)" -ForegroundColor White
Write-Host "  - PREVIEW_QUICKSTART.md (5-min quick start)" -ForegroundColor White
Write-Host "  - RUN_GUIDE.md (detailed instructions)" -ForegroundColor White
Write-Host ""
