###############################################################
# FAST AND SPERMIOUS – BUILD ONLINE 2025
# VERSION COMPLÈTE CORRIGÉE
# - 3 niveaux (15 / 30 / 60s)
# - Sprite animé auto (9 skins, 6 frames 256x256)
# - Shake detector
# - Classement Firebase par niveau
# - Leaderboard = niveau du dernier game joué
# - Mini-console DEBUG
# - Affichage VERSION BUILD
# - Multi-langues FR / EN / ES
# - Boutique de skins AUTO (Système B)
###############################################################

$ErrorActionPreference = "Stop"

###############################################################
# 0. VERSION DU BUILD
###############################################################

$version = "2025.11.20.5"

###############################################################
# 1. PATHS
###############################################################

$root      = "C:\FastAndSpermious"
$project   = Join-Path $root "FastAndSpermious"
$wwwRoot   = Join-Path $root "www"
$wwwTarget = Join-Path $project "www"

Write-Host "?? Réinitialisation du dossier www..." -ForegroundColor Cyan
if (Test-Path $wwwRoot) { Remove-Item $wwwRoot -Recurse -Force }
New-Item -ItemType Directory -Path "$wwwRoot","$wwwRoot/css","$wwwRoot/js","$wwwRoot/js/firebase","$wwwRoot/img" | Out-Null

###############################################################
# 2. FIREBASE OFFLINE
###############################################################

Write-Host "?? Téléchargement Firebase (compat)..." -ForegroundColor Cyan

$firebaseLibs = @(
    "firebase-app-compat.js",
    "firebase-database-compat.js"
)

foreach ($lib in $firebaseLibs) {
    Invoke-WebRequest -Uri "https://www.gstatic.com/firebasejs/9.6.10/$lib" `
        -OutFile "$wwwRoot/js/firebase/$lib" -UseBasicParsing
    Write-Host "? $lib"
}

###############################################################
# 3. INDEX.HTML
###############################################################

Write-Host "?? Génération index.html..." -ForegroundColor Cyan

@'
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Fast and Spermious</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="css/style.css">
</head>
<body>

<!-- GLOBAL dbg() AVANT TOUT -->
<script>
window.dbg = function(){
    try { console.log.apply(console, arguments); } catch(e){}
    var el = document.getElementById("debugLog");
    if (!el) return;
    var msg = Array.prototype.map.call(arguments, function(a){
        return (typeof a === "object" ? JSON.stringify(a) : String(a));
    }).join(" ");
    el.textContent += "\n" + msg;
    el.scrollTop = el.scrollHeight;
};
</script>

<!-- GLOBAL JS ERROR CATCHER -->
<script>
window.onerror = function(msg, src, line, col, err){
    dbg("[JS ERROR]", msg, "@", src + ":" + line);
};
</script>

<div id="menu" class="panel">
  <h1 id="menuTitle">Fast and Spermious</h1>
  <button id="btn15" onclick="startGame(15)">Niveau 15s</button>
  <button id="btn30" onclick="startGame(30)">Niveau 30s</button>
  <button id="btn60" onclick="startGame(60)">Niveau 60s</button>
  <button id="btnLeaderboard" onclick="openLeaderboard()">Classement</button>
  <button id="btnShop" onclick="openShop()">Boutique</button>

  <div id="langSelect" style="margin-top:10px;">
    <button onclick="setLang('fr')">FR</button>
    <button onclick="setLang('en')">EN</button>
    <button onclick="setLang('es')">ES</button>
  </div>
</div>

<canvas id="gameCanvas"></canvas>

<div id="gameover" class="panel overlay">
  <h2 id="gameoverTitle">Fin du niveau</h2>
  <p id="finalStats"></p>
  <input id="playerName" maxlength="12" placeholder="Ton pseudo">
  <button id="submitBtn" onclick="submitScore()">Envoyer</button>
  <p id="errorMsg" style="color:red;display:none;"></p>
  <button id="menuFromGameBtn" onclick="backToMenu()">Menu</button>
</div>

<div id="leaderboard" class="panel overlay">
  <h2 id="lbTitle">Classement</h2>
  <p id="lbInfo"></p>
  <div id="scores">Chargement…</div>
  <button id="lbCloseBtn" onclick="closeLeaderboard()">Fermer</button>
</div>

<div id="shop" class="panel overlay">
  <h2 id="shopTitle">Boutique</h2>
  <p id="shopStats"></p>
  <div id="shopList"></div>
  <button id="shopCloseBtn" onclick="closeShop()">Fermer</button>
</div>

<!-- MINI-CONSOLE -->
<div id="debugPanel">
  <div id="debugTitle">Debug</div>
  <pre id="debugLog"></pre>
</div>

<!-- VERSION BUILD (affichée en bas à droite) -->
<div id="buildVersion"
     style="position:fixed;bottom:65px;right:5px;font-size:10px;color:#0ff;opacity:0.7;">
  VERSION: __VERSION__
</div>

<!-- Firebase Offline -->
<script src="js/firebase/firebase-app-compat.js"></script>
<script src="js/firebase/firebase-database-compat.js"></script>

<!-- Game scripts -->
<script src="js/firebase.js"></script>
<script src="js/game.js"></script>

</body>
</html>
'@ | Out-File "$wwwRoot/index.html" -Encoding UTF8 -Force

# Injection de la version dans index.html
(Get-Content "$wwwRoot/index.html") -replace "__VERSION__", $version |
    Set-Content "$wwwRoot/index.html" -Encoding UTF8

###############################################################
# 4. STYLE.CSS
###############################################################

Write-Host "?? Génération style.css..." -ForegroundColor Cyan

@'
body{
  margin:0;
  background:#000;
  color:#fff;
  font-family:sans-serif;
  text-align:center;
  overflow:hidden;
}
button{
  margin:6px;
  padding:10px 22px;
  border:none;
  background:#ff4081;
  color:#fff;
  border-radius:18px;
  font-size:17px;
}
canvas{
  display:none;
  background:linear-gradient(to top,#001,#004);
}

/* PANELS */
.panel{
  position:absolute;
  top:50%;left:50%;
  transform:translate(-50%,-50%);
  background:rgba(0,0,0,0.85);
  z-index:30;
  padding:20px;
  border-radius:12px;
  width:80%;
  max-width:420px;
  display:none;
}
#menu{display:block;z-index:40;}
.overlay{z-index:50;}
#leaderboard{max-height:70%;overflow-y:auto;}
#shop{max-height:70%;overflow-y:auto;}

/* ITEMS BOUTIQUE */
.shop-item{
  border:1px solid #444;
  border-radius:8px;
  padding:8px;
  margin:6px 0;
  font-size:13px;
  text-align:left;
}

/* MINI-CONSOLE */
#debugPanel{
  position:fixed;bottom:0;left:0;right:0;height:60px;
  background:rgba(0,0,0,0.9);
  z-index:100;border-top:1px solid #333;
}
#debugTitle{
  font-size:10px;background:#111;color:#0ff;padding:2px 4px;
}
#debugLog{
  margin:0;height:38px;padding:3px 4px;font-size:9px;
  overflow-y:auto;color:#0f0;text-align:left;font-family:monospace;
}
'@ | Out-File "$wwwRoot/css/style.css" -Encoding UTF8 -Force

###############################################################
# 5. FIREBASE.JS (GLOBAL + SÉPARATION PAR NIVEAU)
###############################################################

Write-Host "?? Génération firebase.js..." -ForegroundColor Cyan

@'
dbg("?? firebase.js démarré");

let db = null;

function getScoresRef(level){
  if(!db){
    dbg("?? getScoresRef sans db");
    return null;
  }
  const key = String(level) + "s"; // "15s", "30s", "60s"
  return db.ref("scores/" + key);
}

try{
  firebase.initializeApp({
    apiKey:"AIzaSyCeHwyUe32aOlCNjPZQxekfr9M6AxaJC-0",
    authDomain:"fast-and-spermious.firebaseapp.com",
    databaseURL:"https://fast-and-spermious-default-rtdb.europe-west1.firebasedatabase.app",
    projectId:"fast-and-spermious",
    storageBucket:"fast-and-spermious.appspot.com",
    appId:"1:791766983410:web:6b1d77401727b52f60a66b"
  });
  dbg("? Firebase initialisé");
  db = firebase.database();
  dbg("? db OK");
}catch(e){
  dbg("? ERREUR INIT FIREBASE", String(e));
}

async function firebaseSaveScore(data, level){
  dbg("?? SAVE", data, "level=", level);
  const ref = getScoresRef(level);
  if(!ref){
    dbg("? firebaseSaveScore ref null");
    return {ok:0,err:"ref_null"};
  }
  try{
    await ref.push(data);
    dbg("? Score envoyé");
    return {ok:1};
  }catch(e){
    dbg("? SAVE ERROR", String(e));
    return {ok:0,err:String(e)};
  }
}

function firebaseLoadTop(level, n=20){
  dbg("?? LOAD classement level=", level);
  const ref = getScoresRef(level);
  if(!ref){
    dbg("? firebaseLoadTop ref null");
    return Promise.resolve([]);
  }

  return new Promise(function(resolve){
    ref.orderByChild("score").limitToLast(n).once("value", function(snap){
      let arr = [];
      snap.forEach(function(child){
        let v = child.val() || {};
        if(typeof v.score === "string"){
          v.score = parseInt(v.score, 10) || 0;
        }
        arr.push(v);
      });
      arr.sort(function(a,b){ return (b.score||0) - (a.score||0); });
      dbg("?? Scores reçus:", arr.length, arr);
      resolve(arr);
    }, function(err){
      dbg("? LOAD ERROR", String(err));
      resolve([]);
    });
  });
}
'@ | Out-File "$wwwRoot/js/firebase.js" -Encoding UTF8 -Force

###############################################################
# 6. GAME.JS (LANGUES + AUTO-SKINS + RESPONSIVE)
###############################################################

Write-Host "?? Génération game.js..." -ForegroundColor Cyan

@'
dbg("? game.js chargé");
dbg("?? VERSION BUILD :", "__VERSION__");

// ========================= LANGUES ==========================
const LANG = {
  fr: {
    menuTitle: "Fast and Spermious",
    play15: "Niveau 15s",
    play30: "Niveau 30s",
    play60: "Niveau 60s",
    leaderboard: "Classement",
    shop: "Boutique",
    send: "Envoyer",
    distance: "Distance : ",
    gameOver: "Fin du niveau",
    menu: "Menu",
    leaderboardTitle: "Classement niveau",
    close: "Fermer",
    shopTitle: "Boutique de skins",
    shopTotalScore: "Score total :",
    shopOwned: "Déjà débloqué",
    shopEquip: "Équiper",
    shopEquipped: "Équipé",
    shopComingSoon: "Disponible prochainement",
    shopUnlockAt: "Débloqué dès {score} points"
  },
  en: {
    menuTitle: "Fast and Spermious",
    play15: "15s Mode",
    play30: "30s Mode",
    play60: "60s Mode",
    leaderboard: "Leaderboard",
    shop: "Shop",
    send: "Send",
    distance: "Distance: ",
    gameOver: "End of level",
    menu: "Menu",
    leaderboardTitle: "Leaderboard",
    close: "Close",
    shopTitle: "Skin Shop",
    shopTotalScore: "Total score:",
    shopOwned: "Already unlocked",
    shopEquip: "Equip",
    shopEquipped: "Equipped",
    shopComingSoon: "Coming soon",
    shopUnlockAt: "Unlocked at {score} points"
  },
  es: {
    menuTitle: "Fast and Spermious",
    play15: "Nivel 15s",
    play30: "Nivel 30s",
    play60: "Nivel 60s",
    leaderboard: "Clasificación",
    shop: "Tienda",
    send: "Enviar",
    distance: "Distancia: ",
    gameOver: "Fin del nivel",
    menu: "Menú",
    leaderboardTitle: "Clasificación nivel",
    close: "Cerrar",
    shopTitle: "Tienda de skins",
    shopTotalScore: "Puntuación total:",
    shopOwned: "Ya desbloqueado",
    shopEquip: "Equipar",
    shopEquipped: "Equipado",
    shopComingSoon: "Próximamente",
    shopUnlockAt: "Se desbloquea con {score} puntos"
  }
};

let currentLang = localStorage.getItem("lang") || "fr";

function t(key){
  if (LANG[currentLang] && key in LANG[currentLang]) return LANG[currentLang][key];
  if (LANG["fr"] && key in LANG["fr"]) return LANG["fr"][key];
  return key;
}

// ========================= SKINS (AUTO) ======================

let totalScore   = parseInt(localStorage.getItem("totalScore") || "0", 10);
let ownedSkins   = JSON.parse(localStorage.getItem("ownedSkins") || "[]");
let equippedSkin = localStorage.getItem("equippedSkin") || "base";

function saveSkinState(){
  localStorage.setItem("totalScore", String(totalScore));
  localStorage.setItem("ownedSkins", JSON.stringify(ownedSkins));
  localStorage.setItem("equippedSkin", equippedSkin);
}

let SKINS = [];
let skinsLoaded = false;

let canvas, ctx, W=360, H=640;
let spermImg, frame = 0, frames = 6, frameW = 256, frameH = 256;
let run=false, timeLeft=0, timer;
let shakeForce=0;
let lastLevelPlayed = 15;

const sperm = { x:180, y:500, angle:0, amp:30, vy:0, dist:0 };

async function loadSkins(){
  try{
    const res = await fetch("skins.json?" + Date.now());
    SKINS = await res.json();
    skinsLoaded = true;

    SKINS.forEach(s => {
      if (!ownedSkins.includes(s.id)) ownedSkins.push(s.id);
    });

    if (!equippedSkin || !ownedSkins.includes(equippedSkin)) {
      equippedSkin = "base";
    }

    saveSkinState();
    updateSkin();
    dbg("?? Skins chargés:", SKINS.length);
  }catch(e){
    dbg("? Erreur loadSkins:", String(e));
  }
}

function updateSkin(){
  if (!SKINS || SKINS.length === 0) return;
  const skin = SKINS.find(s => s.id === equippedSkin) || SKINS[0];

  if (!spermImg) spermImg = new Image();
  spermImg.src = skin.img;

  frameW = skin.frameSize || 256;
  frameH = skin.frameSize || 256;
  frames = skin.frames || 6;
}

// ========================= JEU ==============================

function resizeCanvas(){
  if(!canvas) return;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  W = canvas.width;
  H = canvas.height;

  if(!run){
    sperm.x = W/2;
    sperm.y = H*0.75;
  }
}

function handleMotion(e){
  const a = e.accelerationIncludingGravity;
  if(!a) return;
  const m = Math.abs(a.x)+Math.abs(a.y)+Math.abs(a.z);
  if(m>20) shakeForce=m;
}

function hidePanels(){
  ["menu","leaderboard","gameover","shop"].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.display="none";
  });
}

function startGame(d){
  dbg("?? START",d);
  lastLevelPlayed = d;
  hidePanels();
  canvas.style.display="block";

  sperm.y = H*0.75;
  sperm.x = W/2;
  sperm.dist = 0;
  sperm.vy = 0;

  timeLeft = d;
  run = true;

  if(timer) clearInterval(timer);
  timer=setInterval(()=>{
    timeLeft--;
    if(timeLeft<=0) endGame();
  },1000);

  loop();
}

function loop(){
  if(!run) return;

  ctx.clearRect(0,0,W,H);

  if(shakeForce>0){
    sperm.vy = Math.min(shakeForce/10,10);
    shakeForce=0;
  } else {
    sperm.vy *= 0.97;
  }

  sperm.y -= sperm.vy;
  sperm.dist += sperm.vy;

  sperm.angle += 0.1;
  sperm.x = W/2 + Math.sin(sperm.angle)*sperm.amp;

  if(sperm.y<frameH/2) sperm.y=frameH/2;
  if(sperm.y>H-frameH/2) sperm.y=H-frameH/2;

  frame = (frame + 0.18) % Math.max(frames,1);

  if(spermImg && spermImg.complete){
    ctx.drawImage(
      spermImg,
      Math.floor(frame) * frameW, 0, frameW, frameH,
      sperm.x - frameW/2, sperm.y - frameH/2,
      frameW, frameH
    );
  }

  ctx.fillStyle="#fff";
  ctx.font="18px sans-serif";
  ctx.fillText(timeLeft+"s",10,24);
  ctx.fillText("Score:"+Math.round(sperm.dist),10,48);

  requestAnimationFrame(loop);
}

function endGame(){
  run=false;
  if(timer) clearInterval(timer);
  hidePanels();
  const stats = document.getElementById("finalStats");
  if(stats) stats.innerText = t("distance") + Math.round(sperm.dist);
  document.getElementById("errorMsg").style.display="none";
  document.getElementById("submitBtn").disabled=false;
  document.getElementById("submitBtn").innerText=t("send");
  document.getElementById("gameover").style.display="block";

  totalScore += Math.round(sperm.dist);
  saveSkinState();
  refreshShopUI();
}

async function submitScore(){
  let btn=document.getElementById("submitBtn");
  let err=document.getElementById("errorMsg");
  btn.innerText=t("send")+"…";btn.disabled=true;
  err.style.display="none";

  const name=(document.getElementById("playerName").value||"Anonyme").trim();
  const payload={
    name:name,
    score:Math.round(sperm.dist),
    level:lastLevelPlayed,
    ts:Date.now()
  };

  const r=await firebaseSaveScore(payload, lastLevelPlayed);
  if(!r.ok){
    err.innerText="Erreur Firebase: "+(r.err||"?");
    err.style.display="block";
    btn.innerText=t("send");btn.disabled=false;
    return;
  }

  openLeaderboard();
}

function openLeaderboard(){
  hidePanels();
  canvas.style.display="none";

  const lbTitle = document.getElementById("lbTitle");
  const lbInfo  = document.getElementById("lbInfo");
  if(lbTitle) lbTitle.innerText = t("leaderboardTitle")+" "+lastLevelPlayed+"s";
  if(lbInfo)  lbInfo.innerText  = "";

  const scoresDiv=document.getElementById("scores");
  scoresDiv.innerText="Chargement…";
  document.getElementById("leaderboard").style.display="block";

  firebaseLoadTop(lastLevelPlayed).then(list=>{
    dbg("?? openLeaderboard list.length=", list ? list.length : 0);
    if(!list || list.length===0){
      scoresDiv.innerHTML="<p>Aucun score pour ce niveau.</p>";
      return;
    }

    let html="";
    for(let i=0;i<list.length;i++){
      const s=list[i] || {};
      const rank=i+1;
      const name=s.name || "?";
      const score=(typeof s.score==="number" ? s.score : parseInt(s.score||"0",10) || 0);
      html += `<p>${rank}. ${name} — ${score}</p>`;
    }
    scoresDiv.innerHTML=html;
  });
}

function closeLeaderboard(){
  hidePanels();
  document.getElementById("menu").style.display="block";
}

function backToMenu(){
  hidePanels();
  document.getElementById("menu").style.display="block";
  canvas.style.display="none";
}

// ========================= LANG / UI ========================

function applyLang(){
  const map = {
    menuTitle: "menuTitle",
    btn15: "play15",
    btn30: "play30",
    btn60: "play60",
    btnLeaderboard: "leaderboard",
    btnShop: "shop",
    submitBtn: "send",
    gameoverTitle: "gameOver",
    menuFromGameBtn: "menu",
    lbCloseBtn: "close",
    shopTitle: "shopTitle",
    shopCloseBtn: "close"
  };
  Object.keys(map).forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.innerText = t(map[id]);
  });
}

function setLang(l){
  currentLang = l;
  localStorage.setItem("lang", l);
  applyLang();
  refreshShopUI();
}

// ========================= BOUTIQUE =========================

function openShop(){
  hidePanels();
  canvas.style.display="none";
  document.getElementById("shop").style.display="block";
  refreshShopUI();
}

function closeShop(){
  hidePanels();
  document.getElementById("menu").style.display="block";
}

function equipSkin(id){
  if (!ownedSkins.includes(id)) return;
  equippedSkin = id;
  saveSkinState();
  updateSkin();
  refreshShopUI();
}

function refreshShopUI(){
  const statsEl = document.getElementById("shopStats");
  const listEl  = document.getElementById("shopList");
  if(!statsEl || !listEl) return;

  statsEl.innerText = t("shopTotalScore")+" "+totalScore;

  if(!SKINS || SKINS.length===0){
    listEl.innerHTML = "<p>Aucun skin chargé.</p>";
    return;
  }

  let html="";
  SKINS.forEach(s=>{
    const owned = ownedSkins.includes(s.id) || s.type === "always";

    let statusText = "";
    let btnHtml    = "";

    if (!owned && s.type === "score") {
      statusText = t("shopUnlockAt").replace("{score}", s.requiredScore || 0);
    } else if (!owned && s.type === "premium") {
      statusText = t("shopComingSoon");
    } else if (owned) {
      statusText = t("shopOwned");
      if (equippedSkin === s.id) {
        btnHtml = `<button disabled>${t("shopEquipped")}</button>`;
      } else {
        btnHtml = `<button onclick="equipSkin('${s.id}')">${t("shopEquip")}</button>`;
      }
    }

    const name = s["name_"+currentLang] || s.name_fr || s.name_en || s.id;

    html += `
      <div class="shop-item">
        <strong>${name}</strong><br>
        <span>${statusText}</span><br>
        ${btnHtml}
      </div>
    `;
  });

  listEl.innerHTML = html;
}

// ========================= INIT =============================

window.onload = async () => {
  dbg("? onload OK");

  canvas = document.getElementById("gameCanvas");
  ctx     = canvas.getContext("2d");

  spermImg = new Image();

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  if(window.DeviceMotionEvent){
    window.addEventListener("devicemotion",handleMotion,true);
    dbg("? Shake actif");
  } else {
    dbg("?? DeviceMotion non supporté");
  }

  applyLang();
  await loadSkins();
  refreshShopUI();
};
'@ | Out-File "$wwwRoot/js/game.js" -Encoding UTF8 -Force

# Injection de la version dans game.js
(Get-Content "$wwwRoot/js/game.js") -replace "__VERSION__", $version |
    Set-Content "$wwwRoot/js/game.js" -Encoding UTF8

###############################################################
# 7. SKINS AUTO – 9 skins, 6 frames 256x256 + skins.json
###############################################################

Write-Host "?? Génération auto des skins..." -ForegroundColor Cyan

Add-Type -AssemblyName System.Drawing

$skinsRoot = Join-Path $wwwRoot "img/skins"
New-Item -ItemType Directory -Path $skinsRoot -Force | Out-Null

function New-SpermSprite {
    param(
        [string]$Folder,
        [System.Drawing.Color]$BodyColor,
        $GlowColor,
        [bool]$Halo
    )

    $frameSize = 256
    $frames    = 6
    $width     = $frameSize * $frames
    $height    = $frameSize

    # Compatibilité maximale : on crée un bitmap puis on le clone en 32bppArgb
    $bmpBase = New-Object System.Drawing.Bitmap $width, $height
    $rect    = [System.Drawing.Rectangle]::FromLTRB(0,0,$width,$height)
    $bmp     = $bmpBase.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $bmpBase.Dispose()

    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = "AntiAlias"
    $g.Clear([System.Drawing.Color]::Transparent)

    $bodyBrush = New-Object System.Drawing.SolidBrush $BodyColor
    $bodyPen   = New-Object System.Drawing.Pen $BodyColor, 12

    $hasGlow = $false
    if ($GlowColor -is [System.Drawing.Color]) {
        $hasGlow = $true
        $glowPen = New-Object System.Drawing.Pen (
            [System.Drawing.Color]::FromArgb(90,$GlowColor.R,$GlowColor.G,$GlowColor.B)
        ), 26
    }

    for($f=0; $f -lt $frames; $f++){
        $ox = $f * $frameSize
        $cx = $ox + $frameSize * 0.5
        $cy = $frameSize * 0.40
        $headR    = 60
        $tailLen  = 150
        $segments = 45
        $phase    = $f * [Math]::PI / 6

        if($hasGlow){
            for($r=$headR+25; $r -le $headR+65; $r+=15){
                $a = 40 - (($r-($headR+25))/2)
                if($a -lt 5){ $a = 5 }
                $gb = New-Object System.Drawing.SolidBrush (
                    [System.Drawing.Color]::FromArgb($a,$GlowColor.R,$GlowColor.G,$GlowColor.B)
                )
                $g.FillEllipse($gb, $cx-$r, $cy-$r, $r*2, $r*2)
                $gb.Dispose()
            }
        }

        if($Halo -and $hasGlow){
            $haloR = $headR + 35
            $haloY = $cy - $headR - 35
            $haloPen = New-Object System.Drawing.Pen (
                [System.Drawing.Color]::FromArgb(230,$GlowColor.R,$GlowColor.G,$GlowColor.B)
            ), 12
            $g.DrawEllipse($haloPen, $cx-$haloR, $haloY, $haloR*2, 26)
            $haloPen.Dispose()
        }

        $g.FillEllipse($bodyBrush, $cx-$headR, $cy-$headR, $headR*2, $headR*2)

        for($i=0; $i -lt $segments; $i++){
            $t1 = $i / $segments
            $t2 = ($i+1) / $segments

            $x1 = $cx + [Math]::Sin($t1*5*[Math]::PI + $phase) * 28
            $y1 = $cy + $t1 * $tailLen

            $x2 = $cx + [Math]::Sin($t2*5*[Math]::PI + $phase) * 28
            $y2 = $cy + $t2 * $tailLen

            if($hasGlow){
                $g.DrawLine($glowPen, $x1, $y1, $x2, $y2)
            }
            $g.DrawLine($bodyPen, $x1, $y1, $x2, $y2)
        }
    }

    $outPath = Join-Path $Folder "sprite.png"
    $bmp.Save($outPath,[System.Drawing.Imaging.ImageFormat]::Png)

    if($hasGlow){ $glowPen.Dispose() }
    $bodyBrush.Dispose()
    $bodyPen.Dispose()
    $g.Dispose()
    $bmp.Dispose()
}

$skinsDef = @(
    @{ id="base";     fr="Skin de base"; en="Base skin";    es="Skin básico";  body=[System.Drawing.Color]::White;                          glow=$null;                                            halo=$false },
    @{ id="bronze";   fr="Bronze";       en="Bronze";       es="Bronce";       body=[System.Drawing.Color]::FromArgb(205,127,50);          glow=$null;                                            halo=$false },
    @{ id="silver";   fr="Argent";       en="Silver";       es="Plata";        body=[System.Drawing.Color]::FromArgb(192,192,192);        glow=$null;                                            halo=$false },
    @{ id="gold";     fr="Or";           en="Gold";         es="Oro";          body=[System.Drawing.Color]::FromArgb(255,215,0);          glow=$null;                                            halo=$false },
    @{ id="platine";  fr="Platine";      en="Platinum";     es="Platino";      body=[System.Drawing.Color]::FromArgb(229,228,226);        glow=$null;                                            halo=$false },
    @{ id="emeraude"; fr="Émeraude";     en="Emerald";      es="Esmeralda";    body=[System.Drawing.Color]::FromArgb(80,200,120);         glow=$null;                                            halo=$false },
    @{ id="radian";   fr="Radian";       en="Radiant";      es="Radiante";     body=[System.Drawing.Color]::FromArgb(180,80,255);         glow=[System.Drawing.Color]::FromArgb(180,80,255);     halo=$false },
    @{ id="celeste";  fr="Céleste";      en="Celestial";    es="Celeste";      body=[System.Drawing.Color]::FromArgb(120,190,255);        glow=[System.Drawing.Color]::FromArgb(120,190,255);    halo=$false },
    @{ id="god";      fr="God Mode";     en="God Mode";     es="Modo Dios";    body=[System.Drawing.Color]::White;                        glow=[System.Drawing.Color]::FromArgb(255,215,0);      halo=$true }
)

$skinsList = @()

foreach($s in $skinsDef){
    $folder = Join-Path $skinsRoot $s.id
    New-Item -ItemType Directory -Path $folder -Force | Out-Null

    New-SpermSprite -Folder $folder -BodyColor $s.body -GlowColor $s.glow -Halo $s.halo

    $cfg = [PSCustomObject]@{
        name_fr       = $s.fr
        name_en       = $s.en
        name_es       = $s.es
        type          = "always"  # tout débloqué pour les tests
        requiredScore = 0
        frames        = 6
        frameSize     = 256
    }
    ($cfg | ConvertTo-Json -Depth 5) | Out-File (Join-Path $folder "config.json") -Encoding UTF8

    $skinsList += [PSCustomObject]@{
        id            = $s.id
        name_fr       = $s.fr
        name_en       = $s.en
        name_es       = $s.es
        type          = "always"
        requiredScore = 0
        frames        = 6
        frameSize     = 256
        img           = "img/skins/$($s.id)/sprite.png"
    }

    Write-Host "  ? Skin $($s.id) généré"
}

($skinsList | ConvertTo-Json -Depth 5) | Out-File "$wwwRoot/skins.json" -Encoding UTF8
Write-Host "? skins.json généré (9 skins, tous débloqués)"

###############################################################
# 8. TEST-INTERNAL.HTML
###############################################################

Write-Host "?? Génération test-internal.html..." -ForegroundColor Cyan

@'
<!DOCTYPE html>
<html>
<body style="background:#000;color:#fff;font-family:sans-serif">
<h2>Test Firebase</h2>
<p id="a"></p><p id="b"></p><p id="c"></p>
<script src="js/firebase/firebase-app-compat.js"></script>
<script src="js/firebase/firebase-database-compat.js"></script>
<script>
a.innerText="firebase-app ?";
b.innerText=firebase.database?"database OK":"database ?";
c.innerText="Firebase chargé ?";
</script>
</body>
</html>
'@ | Out-File "$wwwRoot/test-internal.html" -Encoding UTF8 -Force

###############################################################
# 9. COPIE VERS PROJET CORDOVA
###############################################################

Write-Host "?? Copie des fichiers vers Cordova..." -ForegroundColor Cyan

if (Test-Path $wwwTarget) {
    Remove-Item $wwwTarget -Recurse -Force
}
New-Item -ItemType Directory -Path $wwwTarget | Out-Null
Copy-Item "$wwwRoot\*" "$wwwTarget" -Recurse -Force

Write-Host "? Build OK – VERSION $version"
Write-Host "? Ensuite :"
Write-Host "cd C:\FastAndSpermious\FastAndSpermious"
Write-Host "cordova build android"
Write-Host "adb install -r -d platforms/android/app/build/outputs/apk/debug/app-debug.apk"
