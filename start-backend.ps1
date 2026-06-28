#!/usr/bin/env pwsh
# Start Logixa Flow Backend
# Usage: .\start-backend.ps1

$backendPath = "d:\1 main\Logixa Flow ver.1.1.1.00\web-platform\backend"

Write-Host "🚀 Starting Logixa Flow Backend..." -ForegroundColor Cyan
Write-Host ""

# Change to backend directory
Set-Location $backendPath

# Install dependencies
Write-Host "📦 Installing Python dependencies..." -ForegroundColor Yellow
python -m pip install -r requirements.txt --quiet

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Start server
Write-Host "🎯 Starting FastAPI server..." -ForegroundColor Cyan
Write-Host "📍 API will be available at:" -ForegroundColor Yellow
Write-Host "   - Swagger UI: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "   - ReDoc: http://127.0.0.1:8000/redoc" -ForegroundColor White
Write-Host "   - Base URL: http://localhost:8000" -ForegroundColor White
Write-Host ""

python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
