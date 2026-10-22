@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==================================================
echo   Fast and Spermious - build Android (debug)
echo ==================================================
echo.
call cordova clean android || goto :err
call cordova build android || goto :err
echo.
echo  APK pret : platforms\android\app\build\outputs\apk\debug\app-debug.apk
explorer "platforms\android\app\build\outputs\apk\debug"
echo.
pause
exit /b 0

:err
echo.
echo  *** ECHEC du build : copie l'erreur ci-dessus a Claude ***
pause
exit /b 1
