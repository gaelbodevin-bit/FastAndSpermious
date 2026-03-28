(typeof dbg === "function" ? dbg : console.log)("?? ui.js charg�");

/* ===========================================================
   UI - Gestion des interfaces utilisateur
   =========================================================== */

/* =======================
   MODAL INFO SKINS
   ======================= */

function initSkinsInfoModal() {
  const modal = document.getElementById("skinsInfoModal");
  const closeBtn = document.getElementById("closeSkinsInfo");
  const checkbox = document.getElementById("dontShowSkinsInfo");

  if (!modal || !closeBtn || !checkbox) return;

  // Si l'utilisateur a choisi de ne plus afficher
  if (localStorage.getItem("hideSkinsInfo") === "true") return;

  modal.classList.remove("hidden");

  closeBtn.onclick = () => {
    if (checkbox.checked) {
      localStorage.setItem("hideSkinsInfo", "true");
    }
    modal.classList.add("hidden");
  };
}

/* =======================
   HELPERS
   ======================= */

function hidePanels() {
  [
    "menu",
    "leaderboard",
    "leaderboardSelect",
    "gameover",
    "shop"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  hideQuitBtn();
}

function showQuitBtn() {
  const btn = document.getElementById("quitBtn");
  if (btn) btn.style.display = "block";
}

function hideQuitBtn() {
  const btn = document.getElementById("quitBtn");
  if (btn) btn.style.display = "none";
}

/* =======================
   LANG
   ======================= */

function applyLang() {
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
    shopTitle: "shopTitle",
    shopCloseBtn: "close",
    leaderboardSelectTitle: "leaderboardSelectTitle",
    leaderboardSelectInstruction: "leaderboardSelectInstruction",
    backBtn: "back"
  };

  Object.keys(map).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerText = t(map[id]);
  });

  // --- MODAL INFO SKINS ---
  const sTitle = document.getElementById("skinsInfoTitle");
  if (sTitle) sTitle.innerText = t("skinsInfoTitle");

  const sBody = document.getElementById("skinsInfoBody");
  if (sBody) sBody.innerHTML = t("skinsInfoBody"); // innerHTML car <br>

  const sDont = document.getElementById("skinsInfoDontShow");
  if (sDont) sDont.innerText = t("skinsInfoDontShow");

  const sOk = document.getElementById("closeSkinsInfo");
  if (sOk) sOk.innerText = t("skinsInfoOk");
}

/* =======================
   MENU
   ======================= */

function backToMenu() {
  hidePanels();

  const menu = document.getElementById("menu");
  if (menu) menu.style.display = "flex";

  const canvas = document.getElementById("gameCanvas");
  if (canvas) canvas.style.display = "none";

  showQuitBtn(); // la croix appara�t UNIQUEMENT ici
}

/* =======================
   QUITTER L�APP
   ======================= */

function quitApp() {
  dbg("? Quit app demand�");

  // Cordova / Android
  if (window.cordova && navigator.app && navigator.app.exitApp) {
    navigator.app.exitApp();
    return;
  }

  // Desktop / VM : on ne peut pas fermer une page web -> retour menu
  backToMenu();
}

/* ===========================================================
   LEADERBOARD
   =========================================================== */

function openLeaderboardSelect() {
  hidePanels();

  const canvas = document.getElementById("gameCanvas");
  if (canvas) canvas.style.display = "none";

  document.getElementById("leaderboardSelect").style.display = "block";
  applyLang();
}

function openLeaderboard() {
  if (!window.game) return;

  hidePanels();

  const canvas = document.getElementById("gameCanvas");
  if (canvas) canvas.style.display = "none";

  document.getElementById("leaderboard").style.display = "block";
  loadLeaderboardForLevel(window.game.state.lastLevelPlayed);
}

function switchLeaderboard(level) {
  if (!window.game) return;
  window.game.state.lastLevelPlayed = level;
  openLeaderboard();
}

function loadLeaderboardForLevel(level) {
  if (!window.game) return;

  const title = document.getElementById("lbTitle");
  if (title) title.innerText = `${t("leaderboardTitle")} ${level}s`;

  const scoresDiv = document.getElementById("scores");
  scoresDiv.innerText = "Chargement�";

  window.game.leaderboardManager.loadTopScores(level).then(list => {
    if (!list || list.length === 0) {
      scoresDiv.innerHTML = "<p>Aucun score pour ce niveau.</p>";
      return;
    }

    scoresDiv.innerHTML = list
      .map((s, i) => `<p>${i + 1}. ${s.name || "?"} � ${s.score}</p>`)
      .join("");
  });
}

function closeLeaderboard() {
  backToMenu();
}

/* ===========================================================
   SHOP
   =========================================================== */

function openShop() {
  hidePanels();

  const canvas = document.getElementById("gameCanvas");
  if (canvas) canvas.style.display = "none";

  document.getElementById("shop").style.display = "block";

  refreshShopUI();

  // ?? Affiche la notification UNIQUEMENT � l'ouverture de la boutique
  initSkinsInfoModal();
}

function closeShop() {
  backToMenu();
}

function equipSkin(id) {
  if (!window.game) return;
  if (window.game.skinManager.equipSkin(id)) {
    window.game.updateCurrentSkin();
    refreshShopUI();
  }
}

// ? D�bloquer un skin
function unlockSkin(id) {
  if (!window.game) return;
  const result = window.game.skinManager.unlockSkin(id);
  if (result.ok) {
    dbg("? Skin d�bloqu�:", id);
    refreshShopUI();
  } else {
    dbg("? unlockSkin:", result.err);
  }
}

function refreshShopUI() {
  if (!window.game) return;

  const statsEl = document.getElementById("shopStats");
  const listEl = document.getElementById("shopList");

  if (!statsEl || !listEl) return;

  statsEl.innerText =
    `${t("shopTotalScore")} ${window.game.playerState.totalScore}`;

  const skins = window.game.skinManager.getAvailableSkins();
  let html = "";

  skins.forEach(skin => {
    const name =
      skin[`name_${currentLang}`] ||
      skin.name_fr ||
      skin.name_en ||
      skin.id;

    let status = "";
    let button = "";
    let requirement = "";

    if (!skin.owned && skin.type === "score") {
      status = "";
      requirement = `<div class="skin-requirement">${t("shopUnlockAt").replace("{score}", skin.requiredScore.toLocaleString())}</div>`;
      if (skin.canUnlock) {
        button = `<button onclick="unlockSkin('${skin.id}')" style="background:#27ae60">${t('shopUnlock') || 'Debloquer'}</button>`;
      }
    } else if (skin.owned && skin.type === "score" && skin.requiredScore > 0) {
      status = "";
      requirement = `<div class="skin-requirement" style="color:#2ecc71">Debloqué à ${skin.requiredScore.toLocaleString()} pts</div>`;
      button = skin.equipped
        ? `<button disabled>${t("shopEquipped")}</button>`
        : `<button onclick="equipSkin('${skin.id}')">${t("shopEquip")}</button>`;
    } else if (!skin.owned && skin.type === "paid") {
      status = "";
      requirement = `<div class="skin-requirement" style="color:#c39bd3">Premium - ${skin.price ? skin.price.toFixed(2) + " EUR" : "Premium"}</div>`;
      button = `<button onclick="alert('Achat bientot disponible !')" style="background:#8e44ad">Acheter</button>`;
    } else {
      status = "";
      requirement = skin.type === "paid" ? `<div class="skin-requirement" style="color:#c39bd3">Premium - ${skin.price ? skin.price.toFixed(2) + " EUR" : "Premium"}</div>` : "";
      button = skin.equipped
        ? `<button disabled>${t("shopEquipped")}</button>`
        : `<button onclick="equipSkin('${skin.id}')">${t("shopEquip")}</button>`;
    }
    html += `
      <div class="shop-item">
        ${skin.preview ? `<img src="${skin.preview}" class="skin-preview" onclick="openSkinPreview('${skin.id}')" style="cursor:pointer;">` : ""}
        <div class="shop-text">
          <strong>${name}</strong>
          ${requirement}
          <div>${status}</div>
          ${button}
        </div>
      </div>
    `;
  });

  listEl.innerHTML = html;
}

/* ===========================================================
   SKIN PREVIEW MODAL
   =========================================================== */

function openSkinPreview(skinId) {
  if (!window.game) return;
  const skin = window.game.skinManager.skins.find(s => s.id === skinId);
  if (!skin) return;

  const name = skin[`name_${currentLang}`] || skin.name_fr || skin.id;

  let modal = document.getElementById("skinPreviewModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "skinPreviewModal";
    modal.className = "skin-preview-modal";
    modal.innerHTML = `
      <div class="skin-preview-content">
        <img id="skinPreviewImg" src="" alt="">
        <div id="skinPreviewName"></div>
        <button class="menu-btn" onclick="closeSkinPreview()">Fermer</button>
      </div>
    `;
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeSkinPreview();
    });
    document.body.appendChild(modal);
  }

  document.getElementById("skinPreviewImg").src = skin.preview || skin.img || "";
  document.getElementById("skinPreviewName").innerText = name;
  modal.style.display = "flex";
}

function closeSkinPreview() {
  const modal = document.getElementById("skinPreviewModal");
  if (modal) modal.style.display = "none";
}

/* ===========================================================
   GAME OVER
   =========================================================== */

function showGameOver(finalScore) {
  hidePanels();

  // ? Cacher le canvas de jeu (z-index 40 cachait le panel gameover z-index 20)
  const canvas = document.getElementById("gameCanvas");
  if (canvas) canvas.style.display = "none";

  const stats = document.getElementById("finalStats");
  if (stats) stats.innerText = t("distance") + finalScore;

  const err = document.getElementById("errorMsg");
  if (err) err.style.display = "none";

  const btn = document.getElementById("submitBtn");
  if (btn) {
    btn.disabled = false;
    btn.innerText = t("send");
  }

  document.getElementById("gameover").style.display = "block";
}

async function submitScore() {
  if (!window.game) return;

  const btn = document.getElementById("submitBtn");
  const err = document.getElementById("errorMsg");

  btn.innerText = t("send") + "�";
  btn.disabled = true;
  err.style.display = "none";

  const name =
    (document.getElementById("playerName").value || "Anonyme").trim();

  const score = window.game.state.getFinalScore();
  const level = window.game.state.lastLevelPlayed;

  const res =
    await window.game.leaderboardManager.saveScore(name, score, level);

  if (!res.ok) {
    err.innerText = res.err || "Erreur Firebase";
    err.style.display = "block";
    btn.disabled = false;
    btn.innerText = t("send");
    return;
  }

  openLeaderboard();
}

/* =======================
   INIT
   ======================= */

window.addEventListener("load", () => {
  applyLang();
  console.log("? UI READY");
});