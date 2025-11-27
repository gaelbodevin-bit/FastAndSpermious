# ======================================================
# FAST AND SPERMIOUS - INSTALLATION SANS FIL (Wi-Fi ADB)
# ======================================================

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
Write-Host ""
Write-Host "==== INSTALLATION FAST AND SPERMIOUS EN MODE WIFI ====" -ForegroundColor Cyan

# --- CONFIG ---
$ApkPath = "C:\FastAndSpermious\FastAndSpermious\platforms\android\app\build\outputs\apk\debug\app-debug.apk"

if (-not (Test-Path $ApkPath)) {
    Write-Host "Erreur: APK introuvable à l'emplacement suivant :" -ForegroundColor Red
    Write-Host $ApkPath
    exit
}

# --- ETAPE 1 : AFFICHER INSTRUCTIONS POUR LE PAIRING ---
Write-Host ""
Write-Host "?? Étape 1 : Sur ton téléphone :" -ForegroundColor Yellow
Write-Host " - Active 'Options pour les développeurs'"
Write-Host " - Active 'Débogage sans fil (ADB over Wi-Fi)'"
Write-Host " - Choisis 'Coupler un appareil avec le débogage sans fil'"
Write-Host "   ? Note l'adresse IP + port (ex : 192.168.1.42:37147)"
Write-Host "   ? Note le code à 6 chiffres affiché"
Write-Host ""
Write-Host "??? Étape 2 : Entre ci-dessous les infos de ton téléphone" -ForegroundColor Yellow

# --- ETAPE 2 : RECUPERER LES INFOS ---
$pairAddress = Read-Host "Adresse IP + port de couplage (ex: 192.168.1.42:37147)"
$pairCode = Read-Host "Code de couplage à 6 chiffres"

# --- ETAPE 3 : COUPLAGE ---
Write-Host ""
Write-Host "Connexion en cours pour le couplage..." -ForegroundColor Cyan
& adb pair $pairAddress $pairCode

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "? Couplage terminé (si succès affiché ci-dessus)."
Write-Host ""

# --- ETAPE 4 : CONNEXION ADB CLASSIQUE ---
$deviceAddress = Read-Host "Adresse IP principale du téléphone (ex: 192.168.1.42:5555)"
Write-Host ""
Write-Host "Connexion à $deviceAddress ..." -ForegroundColor Cyan
& adb connect $deviceAddress

Start-Sleep -Seconds 2
$devices = & adb devices | Select-String "device$"

if (-not $devices) {
    Write-Host "? Aucun appareil connecté via Wi-Fi. Vérifie que ton téléphone et ton PC sont sur le même réseau Wi-Fi." -ForegroundColor Red
    exit
}

Write-Host "? Appareil détecté en Wi-Fi !" -ForegroundColor Green

# --- ETAPE 5 : INSTALLATION ---
Write-Host ""
Write-Host "Installation du jeu Fast and Spermious..." -ForegroundColor Cyan
& adb install -r -d $ApkPath

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "?? Installation réussie ! Lance le jeu sur ton téléphone." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "? Échec de l'installation. Vérifie le débogage sans fil et réessaie." -ForegroundColor Red
}

Write-Host ""
Write-Host "Appuie sur une touche pour fermer..." -ForegroundColor DarkGray
pause
