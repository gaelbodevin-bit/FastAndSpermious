###############################################################
# FAST AND SPERMIOUS - GIT AUTO + BUILD WEB
# Script stable 2025
###############################################################

$ErrorActionPreference = "Stop"
$root = "D:\Dev\FastAndSpermious"

Write-Host "?? Git auto-sync…" -ForegroundColor Cyan
Set-Location $root

# 1. PULL
try {
    git pull
    Write-Host "??  Pull OK" -ForegroundColor Green
} catch {
    Write-Host "? Git pull error: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. ADD
try {
    git add .
    Write-Host "? Add OK" -ForegroundColor Green
} catch {
    Write-Host "? Git add error: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. COMMIT
$timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
try {
    git commit -m "Auto-commit: $timestamp"
    Write-Host "?? Commit OK" -ForegroundColor Green
} catch {
    Write-Host "?? Aucun commit à faire" -ForegroundColor Yellow
}

# 4. PUSH
try {
    git push
    Write-Host "??  Push OK" -ForegroundColor Green
} catch {
    Write-Host "? Git push error: $($_.Exception.Message)" -ForegroundColor Red
}

###############################################################
# 5. BUILD WEB AUTO
###############################################################

$buildScript = Join-Path $root "Build-FastAndSpermious-Web.ps1"

if (Test-Path $buildScript) {
    Write-Host "?? Lancement du build Web…" -ForegroundColor Cyan
    powershell -ExecutionPolicy Bypass -File $buildScript
} else {
    Write-Host "? Script de build introuvable : $buildScript" -ForegroundColor Red
}

Write-Host "?? Git + Build terminé." -ForegroundColor Green
