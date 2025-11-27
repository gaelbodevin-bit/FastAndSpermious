###############################################################
# TEST FIREBASE APK — Génération + Build + Instructions
###############################################################

$root = "C:\FastAndSpermious"
$www = "$root\www"
$cordova = "$root\FastAndSpermious"
$wwwTarget = "$cordoa\www"

Write-Host "?? Création du fichier de test Firebase APK..." -ForegroundColor Cyan

# S'assure que www existe
if (!(Test-Path $www)) {
    New-Item -ItemType Directory -Path $www | Out-Null
}

# Génération du test interne
@'
<!DOCTYPE html>
<html>
<body style="background:#000;color:#fff;font-family:sans-serif">

<h2>Test interne APK</h2>

<p id="step1">1?? Vérification de firebase-app…</p>
<p id="step2">2?? Vérification de firebase.database…</p>
<p id="step3">3?? Résultat final :</p>

<script src="js/firebase/firebase-app-compat.js"></script>
<script src="js/firebase/firebase-database-compat.js"></script>

<script>
try {
    document.getElementById("step1").innerText = "1?? firebase-app chargé ?";
} catch (e) {
    document.getElementById("step1").innerText = "1?? firebase-app NON chargé ?";
}

try {
    if (firebase && firebase.database) {
        document.getElementById("step2").innerText = "2?? firebase.database existe ?";
    } else {
        document.getElementById("step2").innerText = "2?? firebase.database NON chargé ?";
    }
} catch (e) {
    document.getElementById("step2").innerText = "2?? firebase.database NON chargé ?";
}

document.getElementById("step3").innerText =
    (window.firebase)
    ? "3?? ?? Firebase EST chargé dans l’APK"
    : "3?? ? Firebase N’EST PAS chargé dans l’APK";
</script>

</body>
</html>
'@ | Out-File "$www/test-internal.html" -Encoding UTF8 -Force

Write-Host "? test-internal.html généré" -ForegroundColor Green

###############################################################
# Build APK
###############################################################

if (!(Test-Path $cordova)) {
    Write-Host "? Projet Cordova introuvable." -ForegroundColor Red
    exit
}

Write-Host "?? Copie du www vers Cordova..." -ForegroundColor Cyan
Copy-Item -Path "$www\*" -Destination "$cordova\www" -Recurse -Force

Write-Host "?? Build Cordova en cours..." -ForegroundColor Cyan
cd $cordova
cordova build android

if ($LASTEXITCODE -ne 0) {
    Write-Host "? Le build Cordova a échoué." -ForegroundColor Red
    exit
}

Write-Host "? Build réussi" -ForegroundColor Green

###############################################################
# Installation APK
###############################################################

$apk = "$cordova\platforms\android\app\build\outputs\apk\debug\app-debug.apk"

if (!(Test-Path $apk)) {
    Write-Host "? APK introuvable" -ForegroundColor Red
    exit
}

Write-Host "?? Installation APK..." -ForegroundColor Cyan
adb install -r -d $apk

Write-Host ""
Write-Host "?? INSTALLATION TERMINÉE" -ForegroundColor Green
Write-Host ""
Write-Host "?? Maintenant, sur ton téléphone, ouvre Chrome et tape :" -ForegroundColor Yellow
Write-Host "file:///android_asset/www/test-internal.html" -ForegroundColor Cyan
Write-Host ""
Write-Host "?? Envoie-moi EXACTEMENT ce que tu vois :" -ForegroundColor Green
Write-Host "- 1?? firebase-app…" 
Write-Host "- 2?? firebase.database…" 
Write-Host "- 3?? Résultat final"
Write-Host ""
