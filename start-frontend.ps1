#!/usr/bin/env pwsh
# Start Logixa Flow Frontend
# Usage: .\start-frontend.ps1

$frontendPath = "d:\1 main\Logixa Flow ver.1.1.1.00\web-platform\frontend"

Write-Host "🚀 Starting Logixa Flow Frontend..." -ForegroundColor Cyan
Write-Host ""

# Change to frontend directory
Set-Location $frontendPath

# Install dependencies
Write-Host "📦 Installing npm dependencies..." -ForegroundColor Yellow
npm install --legacy-peer-deps

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Start dev server
Write-Host "🎯 Starting Next.js dev server..." -ForegroundColor Cyan
Write-Host "📍 Frontend will be available at:" -ForegroundColor Yellow
Write-Host "   - http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "⏱️  First load may take 15-60 seconds for compilation..." -ForegroundColor Yellow
Write-Host ""

npm run dev -- -p 3000
