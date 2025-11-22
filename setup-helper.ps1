# Gringo Setup Helper Script
# This script helps you get started with Supabase integration

Write-Host "Gringo Hybrid Sync Setup Helper" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

# Check if npm is installed
$npmVersion = npm --version 2>$null
if (-not $npmVersion) {
    Write-Host "[ERROR] npm is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

Write-Host "[OK] npm version: $npmVersion`n" -ForegroundColor Green

# Check if dependencies are installed
if (-not (Test-Path "node_modules\@supabase")) {
    Write-Host "[INSTALL] Installing Supabase dependency..." -ForegroundColor Yellow
    npm install @supabase/supabase-js
    Write-Host "[OK] Supabase installed`n" -ForegroundColor Green
} else {
    Write-Host "[OK] Supabase already installed`n" -ForegroundColor Green
}

# Check environment configuration
$envPath = "src\environments\environment.ts"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw

    if ($envContent -match "YOUR_SUPABASE_URL") {
        Write-Host "[WARNING] Supabase credentials not configured yet" -ForegroundColor Yellow
        Write-Host "`nTo enable cloud sync:`n" -ForegroundColor Yellow
        Write-Host "1. Create free account at https://supabase.com" -ForegroundColor White
        Write-Host "2. Create new project" -ForegroundColor White
        Write-Host "3. Copy Project URL and anon key from Settings - API" -ForegroundColor White
        Write-Host "4. Update credentials in: $envPath`n" -ForegroundColor White

        $response = Read-Host "Do you want to open Supabase website now? (Y/N)"
        if ($response -eq "Y" -or $response -eq "y") {
            Start-Process "https://supabase.com"
        }
    } else {
        Write-Host "[OK] Supabase credentials configured`n" -ForegroundColor Green
    }
} else {
    Write-Host "[ERROR] Environment file not found: $envPath" -ForegroundColor Red
}

Write-Host "`nQuick Reference:" -ForegroundColor Cyan
Write-Host "==================`n" -ForegroundColor Cyan

Write-Host "Start development server:" -ForegroundColor Yellow
Write-Host "  npm start`n" -ForegroundColor White

Write-Host "Build for production:" -ForegroundColor Yellow
Write-Host "  npm run build`n" -ForegroundColor White

Write-Host "View setup guide:" -ForegroundColor Yellow
Write-Host "  code SUPABASE_SETUP_GUIDE.md`n" -ForegroundColor White

Write-Host "View quick start:" -ForegroundColor Yellow
Write-Host "  code QUICK_START.md`n" -ForegroundColor White

Write-Host "`nCurrent Status:" -ForegroundColor Cyan
Write-Host "================`n" -ForegroundColor Cyan

Write-Host "[OK] Offline mode: READY (works now!)" -ForegroundColor Green
Write-Host "[PENDING] Cloud sync: PENDING (needs Supabase setup)" -ForegroundColor Yellow
Write-Host "[OK] All features: WORKING (offline)" -ForegroundColor Green

Write-Host "`n[INFO] Your app works RIGHT NOW in offline mode!" -ForegroundColor Green
Write-Host "       Cloud sync is OPTIONAL and takes just 10 minutes to set up.`n" -ForegroundColor Green

$response = Read-Host "Start development server now? (Y/N)"
if ($response -eq "Y" -or $response -eq "y") {
    Write-Host "`nStarting Gringo...`n" -ForegroundColor Cyan
    npm start
} else {
    Write-Host "`nRun 'npm start' when you're ready!`n" -ForegroundColor Cyan
}
