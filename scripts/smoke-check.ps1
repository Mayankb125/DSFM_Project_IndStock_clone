# Smoke check script for backend API endpoints (PowerShell)
# Tests /api/stocks and /api/index endpoints

$ErrorActionPreference = "Stop"

$API_URL = if ($env:API_URL) { $env:API_URL } else { "http://localhost:5000/api" }

Write-Host "🔍 Running smoke checks against ${API_URL}..." -ForegroundColor Cyan
Write-Host ""

# Test /api/health
Write-Host "1. Testing /api/health..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "${API_URL}/health" -Method Get -ErrorAction Stop
    if ($healthResponse.status -eq "ok") {
        Write-Host "   ✅ Health check passed" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Health check returned: $($healthResponse.status)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Failed: Could not reach /api/health" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# Test /api/stocks
Write-Host ""
Write-Host "2. Testing /api/stocks..." -ForegroundColor Yellow
try {
    $stocksResponse = Invoke-RestMethod -Uri "${API_URL}/stocks" -Method Get -ErrorAction Stop
    if ($stocksResponse.success -eq $true) {
        $count = if ($stocksResponse.count) { $stocksResponse.count } else { $stocksResponse.data.Count }
        Write-Host "   ✅ Stocks endpoint returned success ($count stocks)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Stocks endpoint returned success=false" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Failed: Could not reach /api/stocks" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# Test /api/index
Write-Host ""
Write-Host "3. Testing /api/index..." -ForegroundColor Yellow
try {
    $indexResponse = Invoke-RestMethod -Uri "${API_URL}/index" -Method Get -ErrorAction Stop
    if ($indexResponse.success -eq $true) {
        Write-Host "   ✅ Index endpoint returned success" -ForegroundColor Green
        if ($indexResponse.data.nifty50) {
            Write-Host "      ✅ Nifty 50 data present" -ForegroundColor Green
        } else {
            Write-Host "      ⚠️  Nifty 50 data missing" -ForegroundColor Yellow
        }
        if ($indexResponse.data.sensex) {
            Write-Host "      ✅ Sensex data present" -ForegroundColor Green
        } else {
            Write-Host "      ⚠️  Sensex data missing" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ Index endpoint returned success=false" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Failed: Could not reach /api/index" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ All smoke checks passed!" -ForegroundColor Green

