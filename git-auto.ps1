###############################################################
# FAST AND SPERMIOUS - AUTO PUSH GITHUB
# Script GitHub automatisé pour D:\Dev\FastAndSpermious
# Dépôt : https://github.com/gaelbodevin-bit/FastAndSpermious.git
###############################################################

$ErrorActionPreference = "Stop"

# Emplacement du projet
$projectPath = "D:\Dev\FastAndSpermious"

Write-Host "?? Passage au dossier projet..." -ForegroundColor Cyan
Set-Location $projectPath

Write-Host "?? Vérification du dépôt Git..." -ForegroundColor Cyan

# Si le dépôt .git n'existe pas ? initialisation
if (!(Test-Path "$projectPath\.git")) {
    Write-Host "?? Dépôt non initialisé. Initialisation..." -ForegroundColor Yellow

    git init

    $remoteUrl = "https://github.com/gaelbodevin-bit/FastAndSpermious.git"
    git remote add origin $remoteUrl
    git branch -M main

    Write-Host "?? Dépôt Git initialisé et connecté à GitHub." -ForegroundColor Green
}

###############################################################
# STAGE
###############################################################

Write-Host "? Ajout des fichiers..." -ForegroundColor Cyan
git add .

###############################################################
# COMMIT AUTOMATIQUE
###############################################################

$timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
$autoMessage = "Auto-commit FastAndSpermious - $timestamp"

Write-Host "?? Commit : $autoMessage" -ForegroundColor Magenta

git commit -m "$autoMessage" 2>$null

###############################################################
# PUSH
###############################################################

Write-Host "?? Envoi sur GitHub..." -ForegroundColor Cyan
git push -u origin main

Write-Host "? Synchronisation terminée !" -ForegroundColor Green
###############################################################
