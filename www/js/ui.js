(typeof dbg === "function" ? dbg : console.log)("?? ui.js chargé");

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

  // Affiche seulement si pas désactivée
  if (localStorage.getItem("hideSkinsInfo") !== "true") {
    modal.classList.remove("hidden");
  }

  closeBtn.addEventListener("click", () => {
    if (checkbox.checked) {
      localStorage.setItem("hideSkinsInfo", "true");
    }
    modal.classList.add("hidden");
  });
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
}

/* =======================
   MENU
   ======================= */

function backToMenu() {
  hidePanels();

  const menu = document.getElementById("menu");
  if (menu) menu.style.display = "block";

  const canvas = document.getElementById("gameCanvas");
  if (canvas) canvas.style.display = "none";

  showQuitBtn(); // la croix apparaît UNIQUEMENT ici
}

/* =======================
   QUITTER L’APP
   ======================= */

function quitApp() {
  dbg("? Quit app demandé");

  // Cordova / Android
  if (window.cordova && navigator.app && navigator.app.exitApp) {
    navigator.app.exitApp();
    return;
  }

  // Navigateur (ne fermera pas toujours, normal)
  alert("Quitter l’application n’est possible que sur mobile.");
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
  scoresDiv.innerText = "Chargement…";

  window.game.leaderboardManager.loadTopScores(level).then(list => {
    if (!list || list.length === 0) {
      scoresDiv.innerHTML = "<p>Aucun score pour ce niveau.</p>";
      return;
    }

    scoresDiv.innerHTML = list
      .map((s, i) => `<p>${i + 1}. ${s.name || "?"} — ${s.score}</p>`)
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

function refreshShopUI() {
  if (!window.game) return;

  const statsEl = document.getElementById("shopStats");
  const listEl  = document.getElementById("shopList");

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
      status = t("shopUnlockAt").replace("{score}", skin.requiredScore);
      requirement = `<div class="skin-requirement">?? ${status}</div>`;
    } else {
      status = t("shopOwned");
      button = skin.equipped
        ? `<button disabled>${t("shopEquipped")}</button>`
        : `<button onclick="equipSkin('${skin.id}')">${t("shopEquip")}</button>`;
    }

    html += `
      <div class="shop-item">
        ${skin.preview ? `<img src="${skin.preview}" class="skin-preview">` : ""}
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
   GAME OVER
   =========================================================== */

function showGameOver(finalScore) {
  hidePanels();

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

  btn.innerText = t("send") + "…";
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
  initSkinsInfoModal();
  console.log("? UI READY");
});
