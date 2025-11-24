dbg("? game.js chargé");
dbg("?? VERSION BUILD :", "2025.11.21.01");

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
