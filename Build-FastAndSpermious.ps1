# ======================================================
# FAST AND SPERMIOUS - BUILD + INSTALL AUTOMATIQUE ANDROID (v4)
# Compatible PowerShell Windows - sans caractères spéciaux
# ======================================================

# 1?? Autoriser temporairement l'exécution des scripts
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

Write-Host ""
Write-Host "==== LANCEMENT DU BUILD FAST AND SPERMIOUS ====" -ForegroundColor Cyan

# 2?? Forcer le chemin Gradle (adapter si ton dossier Gradle diffère)
$GradlePath = "C:\Gradle\gradle-9.2.0-bin\gradle-9.2.0\bin"
if (-not (Test-Path $GradlePath)) {
    Write-Host "ERREUR: Gradle introuvable dans $GradlePath" -ForegroundColor Red
    exit
}
$env:Path += ";$GradlePath"
Write-Host "Gradle detecte dans : $GradlePath" -ForegroundColor DarkGray

# --- VARIABLES DU PROJET ---
$ProjectRoot = "C:\FastAndSpermious"
$AppFolder = "$ProjectRoot\FastAndSpermious"
$AppId = "com.fast.spermious"
$AppTitle = "Fast and Spermious"
$WwwPath = "$AppFolder\www"

# --- 3?? SUPPRESSION ANCIEN PROJET ---
if (Test-Path $AppFolder) {
    Write-Host "Suppression de l'ancien projet..."
    Remove-Item $AppFolder -Recurse -Force
}

# --- 4?? CREATION PROJET CORDOVA ---
Write-Host "Creation du projet Cordova..."
cordova create $AppFolder $AppId $AppTitle
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur: Cordova non trouve ou creation echouee." -ForegroundColor Red
    exit
}

cd $AppFolder
cordova platform add android
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur: ajout de la plateforme Android echoue." -ForegroundColor Red
    exit
}

# --- 5?? COPIE DU CODE DU JEU ---
Write-Host "Copie du code du jeu..."

@'
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Fast and Spermious</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="container">
    <h1>Fast and Spermious</h1>
    <h2 id="score">0</h2>
    <button id="resetBtn">Reset</button>
    <p class="tip">Secoue ton telephone pour marquer des points !</p>
  </div>
  <script src="cordova.js"></script>
  <script src="game.js"></script>
</body>
</html>
'@ | Set-Content "$WwwPath\index.html" -Encoding UTF8

@'
body {
  background: radial-gradient(circle, #111, #000);
  color: #fff;
  font-family: Arial, sans-serif;
  text-align: center;
  height: 100vh;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

#container { padding: 20px; }

h1 { font-size: 2em; margin-bottom: 20px; }
#score { font-size: 4em; margin: 20px 0; }

button {
  font-size: 1.2em;
  padding: 10px 20px;
  border: none;
  border-radius: 12px;
  background: #ff007f;
  color: white;
  cursor: pointer;
  transition: transform 0.2s;
}

button:hover { transform: scale(1.1); }

.tip {
  font-size: 0.9em;
  opacity: 0.7;
  margin-top: 15px;
}
'@ | Set-Content "$WwwPath\style.css" -Encoding UTF8

@'
document.addEventListener("deviceready", initGame);

let score = 0;
let lastShakeTime = 0;

function initGame() {
  const scoreElement = document.getElementById("score");
  const resetBtn = document.getElementById("resetBtn");

  resetBtn.addEventListener("click", () => {
    score = 0;
    scoreElement.textContent = score;
  });

  if (window.DeviceMotionEvent) {
    window.addEventListener("devicemotion", detectShake, false);
  } else {
    alert("Accelerometre non supporte sur cet appareil.");
  }

  function detectShake(event) {
    const acc = event.accelerationIncludingGravity;
    const totalForce = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z);

    if (totalForce > 25) {
      const currentTime = new Date().getTime();
      if (currentTime - lastShakeTime > 300) {
        lastShakeTime = currentTime;
        score++;
        scoreElement.textContent = score;
      }
    }
  }
}
'@ | Set-Content "$WwwPath\game.js" -Encoding UTF8

# --- 6?? COMPILATION ---
Write-Host "Compilation de l'APK Android..."
cordova build android
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur pendant la compilation Cordova." -ForegroundColor Red
    exit
}

# --- 7?? INSTALLATION AUTOMATIQUE SUR LE TELEPHONE ---
$ApkPath = "$AppFolder\platforms\android\app\build\outputs\apk\debug\app-debug.apk"

if (Test-Path $ApkPath) {
    Write-Host ""
    Write-Host "===================="
    Write-Host "BUILD TERMINE AVEC SUCCES" -ForegroundColor Green
    Write-Host "APK disponible ici :" -ForegroundColor Yellow
    Write-Host $ApkPath
    Write-Host "===================="

    Write-Host ""
    Write-Host "Detection du telephone connecte..." -ForegroundColor Cyan
    $devices = & adb devices | Select-String "device$"

    if ($devices) {
        Write-Host "Telephone detecte. Installation en cours..." -ForegroundColor Green
        & adb install -r $ApkPath
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Installation reussie sur le telephone !" -ForegroundColor Green
        } else {
            Write-Host "Echec de l'installation sur le telephone." -ForegroundColor Red
        }
    } else {
        Write-Host "Aucun telephone detecte via ADB. Installe manuellement avec :" -ForegroundColor Yellow
        Write-Host "adb install -r `"$ApkPath`""
    }

} else {
    Write-Host "Erreur: APK introuvable apres build." -ForegroundColor Red
}
