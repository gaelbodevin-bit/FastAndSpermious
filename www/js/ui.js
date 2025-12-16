/* ===========================================================
   UI - Gestion des interfaces utilisateur (panneaux, menus)
   =========================================================== */

function hidePanels() {
  ["menu", "leaderboard", "leaderboardSelect", "gameover", "shop"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
}

function applyLang() {
  const elementTranslations = {
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
    shopCloseBtn: "close",
    leaderboardSelectTitle: "leaderboardSelectTitle",
    leaderboardSelectInstruction: "leaderboardSelectInstruction",
    backBtn: "back"
  };

  for (const elementId in elementTranslations) {
    const element = document.getElementById(elementId);
    if (element) element.innerText = t(elementTranslations[elementId]);
  }
}

function backToMenu() {
  hidePanels();
  document.getElementById("menu").style.display = "block";
  const canvas = document.getElementById("gameCanvas");
  if (canvas) canvas.style.display = "none";
}

/* ===========================================================
   LEADERBOARD UI
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
  hidePanels();
  const canvas = document.getElementById("gameCanvas");
  if (canvas) canvas.style.display = "none";
  document.getElementById("leaderboard").style.display = "block";
  loadLeaderboardForLevel(level);
}

function loadLeaderboardForLevel(level) {
  if (!window.game) return;
  
  const lbTitle = document.getElementById("lbTitle");
  if (lbTitle) lbTitle.innerText = t("leaderboardTitle") + " " + level + "s";

  const scoresDiv = document.getElementById("scores");
  scoresDiv.innerText = "Chargement…";

  window.game.leaderboardManager.loadTopScores(level).then(list => {
    if (!list || list.length === 0) {
      scoresDiv.innerHTML = "<p>Aucun score pour ce niveau.</p>";
      return;
    }

    let html = "";
    list.forEach((score, index) => {
      html += `<p>${index + 1}. ${score.name || "?"} — ${score.score}</p>`;
    });

    scoresDiv.innerHTML = html;
  });
}

function closeLeaderboard() {
  hidePanels();
  document.getElementById("menu").style.display = "block";
}

/* ===========================================================
   SHOP UI
   =========================================================== */

function openShop() {
  hidePanels();
  const canvas = document.getElementById("gameCanvas");
  if (canvas) canvas.style.display = "none";
  document.getElementById("shop").style.display = "block";
  refreshShopUI();
}

function closeShop() {
  hidePanels();
  document.getElementById("menu").style.display = "block";
}

function equipSkin(skinId) {
  if (!window.game) return;
  
  if (window.game.skinManager.equipSkin(skinId)) {
    window.game.updateCurrentSkin();
    refreshShopUI();
  }
}

function refreshShopUI() {
  if (!window.game) return;

  const statsEl = document.getElementById("shopStats");
  const listEl  = document.getElementById("shopList");
  if (!statsEl || !listEl) return;

  statsEl.innerText = t("shopTotalScore") + " " + window.game.playerState.totalScore;

  const skins = window.game.skinManager.getAvailableSkins();

  let html = "";
  skins.forEach(skin => {
    let statusText = "";
    let btnHtml = "";

    if (!skin.owned && skin.type === "score") {
      statusText = t("shopUnlockAt").replace("{score}", skin.requiredScore || 0);
    } else if (!skin.owned && skin.type === "premium") {
      statusText = t("shopComingSoon");
    } else {
      statusText = t("shopOwned");
      btnHtml = skin.equipped
        ? `<button disabled>${t("shopEquipped")}</button>`
        : `<button onclick="equipSkin('${skin.id}')">${t("shopEquip")}</button>`;
    }

    const name =
      skin["name_" + currentLang] ||
      skin.name_fr ||
      skin.name_en ||
      skin.id;

    // ? IMPORTANT: si preview = sprite, on force l�affichage de la frame 0
    const isSprite = (skin.preview === skin.img);
    const extraStyle = isSprite
      ? `style="object-fit:none; object-position:0px 0px; width:64px; height:64px;"`
      : `style="object-fit:cover; width:64px; height:64px;"`;

    html += `
      <div class="shop-item">
        <img class="skin-preview" src="${skin.preview}" alt="${name}" ${extraStyle}>
        <div class="shop-text">
          <strong>${name}</strong><br>
          <span>${statusText}</span><br>
          ${btnHtml}
        </div>
      </div>
    `;
  });

  listEl.innerHTML = html;
}

/* ===========================================================
   GAME OVER UI
   =========================================================== */

function showGameOver(finalScore) {
  hidePanels();
  const stats = document.getElementById("finalStats");
  if (stats) stats.innerText = t("distance") + finalScore;
  
  document.getElementById("errorMsg").style.display = "none";
  document.getElementById("submitBtn").disabled = false;
  document.getElementById("submitBtn").innerText = t("send");
  document.getElementById("gameover").style.display = "block";
}

async function submitScore() {
  if (!window.game) return;
  
  let btn = document.getElementById("submitBtn");
  let err = document.getElementById("errorMsg");
  
  btn.innerText = t("send") + "…";
  btn.disabled = true;
  err.style.display = "none";

  const playerName = (document.getElementById("playerName").value || "Anonyme").trim();
  const score = window.game.state.getFinalScore();
  const level = window.game.state.lastLevelPlayed;

  const result = await window.game.leaderboardManager.saveScore(playerName, score, level);
  
  if (!result.ok) {
    err.innerText = "Erreur Firebase: " + (result.err || "?");
    err.style.display = "block";
    btn.innerText = t("send");
    btn.disabled = false;
    return;
  }

  openLeaderboard();
}

dbg("? ui.js chargé");
