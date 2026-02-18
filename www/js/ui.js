/* ===========================================================
   UI - Gestion des interfaces utilisateur (panneaux, menus)
   =========================================================== */

function hidePanels() {
  ["menu", "leaderboard", "leaderboardSelect", "gameover", "shop"].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.style.display = "none";
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
  
  const leaderboardTitle = document.getElementById("lbTitle");
  if (leaderboardTitle) leaderboardTitle.innerText = t("leaderboardTitle") + " " + level + "s";

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
  
  const statsElement = document.getElementById("shopStats");
  const listElement = document.getElementById("shopList");
  
  if (!statsElement || !listElement) return;

  statsElement.innerText = t("shopTotalScore") + " " + window.game.playerState.totalScore;

  const availableSkins = window.game.skinManager.getAvailableSkins();
  
  let html = "";
  availableSkins.forEach(skin => {
    let statusText = "";
    let btnHtml = "";

    if (!skin.owned && skin.type === "score") {
      statusText = t("shopUnlockAt").replace("{score}", skin.requiredScore);
    } else if (!skin.owned && skin.type === "premium") {
      statusText = t("shopComingSoon");
    } else if (skin.owned) {
      statusText = t("shopOwned");
      btnHtml = skin.equipped
        ? `<button disabled>${t("shopEquipped")}</button>`
        : `<button onclick="equipSkin('${skin.id}')">${t("shopEquip")}</button>`;
    }

    const name = skin["name_" + currentLang] || skin.name_fr || skin.name_en || skin.id;

    html += `
      <div class="shop-item">
        <strong>${name}</strong><br>
        <span>${statusText}</span><br>
        ${btnHtml}
      </div>`;
  });

  listElement.innerHTML = html;
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
  
  let submitButton = document.getElementById("submitBtn");
  let errorMessage = document.getElementById("errorMsg");
  
  submitButton.innerText = t("send") + "…";
  submitButton.disabled = true;
  errorMessage.style.display = "none";

  const playerName = (document.getElementById("playerName").value || "Anonyme").trim();
  const score = window.game.state.getFinalScore();
  const level = window.game.state.lastLevelPlayed;

  const result = await window.game.leaderboardManager.saveScore(playerName, score, level);
  
  if (!result.ok) {
    errorMessage.innerText = "Erreur Firebase: " + (result.err || "?");
    errorMessage.style.display = "block";
    submitButton.innerText = t("send");
    submitButton.disabled = false;
    return;
  }

  openLeaderboard();
}

dbg("✅ ui.js loaded");
