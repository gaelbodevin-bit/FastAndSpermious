# Fast and Spermious

Un jeu mobile/WEB construit en HTML/CSS/JavaScript, empaqueté pour Android via Apache Cordova, avec un classement stocké dans Firebase Realtime Database.

## Aperçu rapide
- UI en **HTML/CSS** (panneaux: menu, canvas du jeu, game-over, classement, boutique, debug).
- Logique du jeu en **JavaScript** dans `www/js/game.js`.
- Classement en **Firebase Realtime Database** via `www/js/firebase.js` (SDK v8).
- Build Android via **Cordova** et scripts **PowerShell**.

## Architecture
- `www/index.html` : Entrée principale. Charge Firebase SDK, `js/firebase.js` et `js/game.js`. Définit les éléments du DOM (boutons de niveaux, sélection de langue, panneaux).
- `www/js/game.js` :
  - Multi-langue (`LANG` fr/en/es), `setLang()` et `applyLang()` pour le DOM.
  - Boucle de jeu (`requestAnimationFrame`) et capteur `devicemotion` pour détecter le secouement et calculer la distance/score.
  - Système de skins: chargés depuis `www/skins.json` (ou chemin Cordova), persistance avec `localStorage` (`totalScore`, `ownedSkins`, `equippedSkin`).
  - Classement: ouvre/charge/affiche top 20 par niveau.
- `www/js/firebase.js` :
  - Initialisation Firebase (config incluse).
  - `firebaseSaveScore(payload, level)` : pousse `{ name, score, level, ts }` sous `scores/{15s|30s|60s}`.
  - `firebaseLoadTop(level)` : lit, trie desc, renvoie les 20 meilleurs scores.
- `www/skins.json` + `www/img/skins/...` : Déclaration et images des skins.
- `package.json` : Projet Cordova Android (`cordova-android` 14.x), plugins `cordova-plugin-console`, `cordova-plugin-file`.
- Scripts PowerShell:
  - `Build-FastAndSpermious.ps1` : Crée un projet Cordova, copie le site, construit l’APK et tente l’installation via ADB.
  - Autres scripts (`Build-FastAndSpermious-Online.ps1`, `build-fast-and-spermious.ps1`, `Enable-WebViewDebug.ps1`, `Test-Firebase*.ps1`) : utilitaires/variantes.

## Lancer en local (navigateur)
Prérequis: Node.js installé (optionnel, juste pour un petit serveur). Vous pouvez aussi ouvrir `www/index.html` directement dans un navigateur.

Option 1 — ouvrir directement:
1. Ouvrez `www/index.html` dans Chrome.
2. La détection `devicemotion` fonctionne sur mobile; sur desktop, le jeu se lance mais sans secouement réel.

Option 2 — petit serveur HTTP:
```bash
# depuis le dossier FastAndSpermious
npx serve www
# ou
npx http-server www -p 8080
```
Ensuite, ouvrez http://localhost:8080.

> Remarque: Le classement Firebase requiert l’accès réseau et des règles Firebase compatibles lecture/écriture.

## Build Android (APK) avec Cordova
Prérequis:
- Node.js et Cordova CLI (`npm i -g cordova`).
- JDK/Android SDK, Gradle installé et dans le PATH.
- ADB (Android Platform Tools) pour l’installation sur l’appareil.

Via script PowerShell recommandé:
1. Ouvrez PowerShell en Administrateur.
2. Vérifiez/éditez les chemins dans `Build-FastAndSpermious.ps1` (ex: `$GradlePath`).
3. Exécutez:
```powershell
# depuis le dossier racine du repo
./Build-FastAndSpermious.ps1
```
Le script:
- Crée un projet Cordova Android.
- Copie les fichiers `www`.
- Construit l’APK.
- Installe sur un téléphone connecté via `adb` si détecté.

Build Cordova manuel (alternative):
```powershell
# dans un nouveau dossier de travail
cordova create MyApp com.fast.spermious "Fast and Spermious"
cd MyApp
cordova platform add android
# Copiez le contenu du dossier www/ de ce repo vers MyApp/www
cordova build android
# APK en platforms/android/app/build/outputs/apk/debug/app-debug.apk
```

## Configuration Firebase
Le fichier `www/js/firebase.js` contient la configuration:
- `databaseURL` et `projectId` doivent correspondre à votre projet.
- Assurez-vous que les règles de la Realtime Database autorisent l’écriture/lecture pour vos besoins (ou l’auth si nécessaire).

## Personnalisation
- Textes UI: modifiez `LANG` dans `www/js/game.js`.
- Skins: éditez `www/skins.json` et ajoutez des images sous `www/img/skins/`.
- Logique du shake: ajustez les seuils dans `handleMotion()` et la conversion en vitesse (`sperm.vy`).
- UI: ajustez `www/index.html` et `www/css/style.css`.

## Débogage
- Panneau debug: bouton "Debug" affiche `#debugConsole` pour logs (`dbg(...)`).
- WebView Android: utilisez `chrome://inspect` avec le téléphone connecté, ou `Enable-WebViewDebug.ps1` si besoin.

## Licence et crédits
Projet basé sur une structure Cordova (Apache Cordova). Les ressources et le code de jeu sont spécifiques à ce projet.
