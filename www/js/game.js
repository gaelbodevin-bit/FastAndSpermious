/* ===========================================================
   GAME - Point d'entrée principal et boucle de jeu
   =========================================================== */

class Game {
  constructor() {
    dbg("? Game constructor");
    dbg("?? VERSION BUILD :", GAME_CONFIG.VERSION);

    // États
    this.playerState = new PlayerState();
    this.state = null;
    this.renderer = null;

    // Managers
    this.skinManager = new SkinManager(this.playerState);
    this.leaderboardManager = new LeaderboardManager();
    this.inputManager = null;

    // Canvas et image
    this.canvas = null;
    this.spermImg = new Image();

    // Boucle de jeu
    this.animationFrameId = null;
  }

  async init() {
    dbg("? Game init");
    
    // Récupérer le canvas
    this.canvas = document.getElementById("gameCanvas");
    if (!this.canvas) {
      dbg("? Erreur: canvas non trouvé");
      return false;
    }

    // Initialiser l'état du jeu
    this.state = new GameState(this.canvas, this.spermImg);
    this.renderer = new Renderer(this.state);
    this.inputManager = new InputManager(this.state);
    
    // Événements
    window.addEventListener("resize", () => this.state.resize());
    this.state.resize();
    
    // Input
    this.inputManager.init();
    
    // Charger les skins
    await this.skinManager.load();
    this.updateCurrentSkin();
    
    // UI
    applyLang();
    refreshShopUI();

    dbg("? Game initialisé");
    return true;
  }

  updateCurrentSkin() {
    const currentSkin = this.skinManager.getCurrentSkin();
    if (!currentSkin) return;

    const imagePath = this.skinManager.getSkinImagePath(currentSkin.id);
    if (imagePath) {
      this.spermImg.src = imagePath;
    }

    this.state.updateSpriteProperties(
      currentSkin.frameSize || GAME_CONFIG.FRAME_SIZE,
      currentSkin.frameSize || GAME_CONFIG.FRAME_SIZE,
      currentSkin.frames || GAME_CONFIG.DEFAULT_FRAMES
    );
  }

  async start(duration) {
  dbg("?? START", duration);

  // Débloque l'audio (important mobile)
  this.ensureAudioUnlocked();

  hidePanels();
  this.canvas.style.display = "block";

  this.state.run = false;
  await this.startCountdown(3, 600);

  this.state.reset(duration);
  this.state.run = true;
  this.loop();
}



  loop() {
    if (!this.state.run) return;
    
    this.state.update();
    this.renderer.render();
    
    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  stop() {
    this.state.stop();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.onGameOver();
  }

  onGameOver() {
    const finalScore = this.state.getFinalScore();
    
    // Ajouter le score au total du joueur
    this.playerState.addScore(finalScore);
    refreshShopUI();
    
    // Afficher l'écran game over
    showGameOver(finalScore);
  }
  startCountdown(seconds = 3, stepMs = 600) {
  return new Promise((resolve) => {
    const el = document.getElementById("countdown");
    if (!el) {
      resolve();
      return;
    }

    el.style.display = "grid";
    let t = seconds;

    const render = (txt) => {
      el.textContent = txt;
      el.classList.remove("pop");
      void el.offsetWidth;
      el.classList.add("pop");
    };

    render(t);

    const interval = setInterval(() => {
      t--;

      if (t > 0) {
        render(t);
        return;
      }

      if (t === 0) {
        render("GO!");
        clearInterval(interval);

        setTimeout(() => {
          el.style.display = "none";
          resolve();
        }, 350);
      }
    }, stepMs);
  });
}
// ==============================
// AUDIO (beeps) + VIBRATION
// ==============================
ensureAudioUnlocked() {
  try {
    if (!this.audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.audioCtx = new Ctx();
    }
    // Sur mobile, l'AudioContext peut être "suspended" tant qu'il n'y a pas eu interaction
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
  } catch (e) {}
}

beep(freq = 880, durationMs = 90, type = "square", volume = 0.08) {
  if (!this.audioCtx) return;

  const ctx = this.audioCtx;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  // Enveloppe (attaque/relâche) pour éviter les "clics"
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.02);
}

playCountdownTick(n) {
  // 3,2,1 : un peu plus grave en descendant
  // (tu peux changer les fréquences si tu veux)
  const map = { 3: 900, 2: 780, 1: 660 };
  this.beep(map[n] || 800, 95, "square", 0.08);
}

playGoFx() {
  // GO : double beep + plus punchy
  this.beep(520, 110, "sawtooth", 0.10);
  setTimeout(() => this.beep(1040, 90, "square", 0.09), 90);

  // Vibration (si dispo)
  if (navigator.vibrate) {
    navigator.vibrate([40, 30, 60]); // petit pattern “impact”
  }
}

}

/* ===========================================================
   FONCTIONS GLOBALES (appelées depuis index.html)
   =========================================================== */

function startGame(duration) {
  if (window.game) {
    window.game.start(duration);
  }
}

/* ===========================================================
   INITIALISATION
   =========================================================== */

window.onload = async () => {
  dbg("? window.onload");

  window.game = new Game();
  const initialized = await window.game.init();

  if (!initialized) {
    dbg("? Échec initialisation du jeu");
    return;
  }

  // ✅ Affichage initial du menu + croix
  backToMenu();

  dbg("? Jeu prêt");
};

dbg("? game.js chargé");
