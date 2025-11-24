Write-Host "?? Activation du debug WebView Cordova..." -ForegroundColor Cyan

$project = "C:\FastAndSpermious\FastAndSpermious"
$config = "$project\config.xml"

if (!(Test-Path $config)) {
    Write-Host "? config.xml introuvable !" -ForegroundColor Red
    exit
}

# Injection des préférences
Write-Host "?? Modification de config.xml..." -ForegroundColor Cyan

(Get-Content $config) `
    -replace "</widget>", '  <preference name="AndroidWebViewDebuggingEnabled" value="true" />
  <preference name="AndroidInsecureFileModeEnabled" value="true" />
</widget>' `
| Set-Content $config

# Installation du plugin console
Write-Host "?? Installation de cordova-plugin-console..." -ForegroundColor Cyan
cd $project
cordova plugin add cordova-plugin-console

Write-Host "?? Rebuild APK..." -ForegroundColor Cyan
cordova build android

Write-Host "?? Réinstallation APK..." -ForegroundColor Cyan
adb install -r -d platforms/android/app/build/outputs/apk/debug/app-debug.apk

Write-Host "?? Debug WebView activé !" -ForegroundColor Green
Write-Host "?? Lance ensuite : adb logcat | findstr -i console" -ForegroundColor Yellow
