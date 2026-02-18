/* ===========================================================
   GAME - Point d'entrÃ©e principal et boucle de jeu
   =========================================================== */

class Game {
  constructor() {
    dbg("? Game constructor");
    dbg("?? VERSION BUILD :", GAME_CONFIG.VERSION);

    // Ã‰tats
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
    
    // RÃ©cupÃ©rer le canvas
    this.canvas = document.getElementById("gameCanvas");
    if (!this.canvas) {
      dbg("? Erreur: canvas non trouvÃ©");
      return false;
    }

    // Initialiser l'Ã©tat du jeu
    this.state = new GameState(this.canvas, this.spermImg);
    this.renderer = new Renderer(this.state);
    this.inputManager = new InputManager(this.state);
    
    // Ã‰vÃ©nements
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

    dbg("? Game initialisÃ©");
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

  start(duration) {
    dbg("âœ… START", duration);

    // ðŸ”Š DÃ©bloque l'audio immÃ©diatement (reste dans le geste utilisateur)
    this.ensureAudioUnlocked();

    hidePanels();
    this.canvas.style.display = "block";

    // On bloque la boucle pendant le countdown
    this.state.run = false;

    this.startCountdown(3, 600).then(() => {
      this.state.reset(duration);
      this.state.run = true;
      this.loop();
    });
  }

  // ==============================
  // COUNTDOWN + AUDIO + VIBRATION
  // ==============================
  ensureAudioUnlocked() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        dbg("â�Œ AudioContext non supportÃ©");
        return;
      }
      if (!this.audioCtx) this.audioCtx = new Ctx();

      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume().then(() => {
          dbg("ðŸ”Š AudioContext resumed");
        }).catch((e) => {
          dbg("â�Œ Audio resume failed:", e?.message || e);
        });
      }
    } catch (e) {
      dbg("â�Œ ensureAudioUnlocked error:", e?.message || e);
    }
  }

  beep(freq = 880, durationMs = 90, type = "square", volume = 0.08) {
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    // Enveloppe (attaque/relÃ¢che) pour Ã©viter les "clics"
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationMs / 1000 + 0.02);
  }

  playCountdownTick(n) {
  const map = { 3: 800, 2: 700, 1: 600 };
  this.beep(map[n], 90, "square", 0.15);
  playEndRoundFx() {
  if (!this.audioCtx) return;

  const ctx = this.audioCtx;
  const now = ctx.currentTime;

  // 🎵 petite montée musicale
  const notes = [600, 800, 1000];

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + i * 0.08);

    gain.gain.setValueAtTime(0.001, now + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.15, now + i * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.18);
  });

  // 📳 vibration légère finale
  navigator.vibrate?.([40, 60]);
}

playGoFx() {
  this.beep(150, 80, "sawtooth", 0.25); // grave impact
  setTimeout(() => this.beep(1000, 120, "square", 0.15), 40);
  navigator.vibrate?.([60]);
  }

  startCountdown(seconds = 3, stepMs = 600) {
    return new Promise((resolve) => {
      const el = document.getElementById("countdown");
      if (!el) { resolve(); return; }

      el.style.display = "grid";
      let t = seconds;

      const render = (txt) => {
        el.textContent = txt;
        el.classList.remove("pop");
        void el.offsetWidth;
        el.classList.add("pop");
      };

      render(t);
      this.playCountdownTick(t);

      const interval = setInterval(() => {
        t--;

        if (t > 0) {
          render(t);
          this.playCountdownTick(t);
          return;
        }

        if (t === 0) {
          render("GO!");
          this.playGoFx();
          clearInterval(interval);

          setTimeout(() => {
            el.style.display = "none";
            resolve();
          }, 350);
        }
      }, stepMs);
    });
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

  this.playEndRoundFx(); // 🔔 AJOUT ICI

  this.onGameOver();
}

  onGameOver() {
    const finalScore = this.state.getFinalScore();
    
    // Ajouter le score au total du joueur
    this.playerState.addScore(finalScore);
    refreshShopUI();
    
    // Afficher l'Ã©cran game over
    showGameOver(finalScore);
  }
}



/* ===========================================================
   AUDIO UNLOCK GLOBAL (anti-autoplay, VM / live-server friendly)
   - Le 1er clic/tap/clavier dÃ©bloque l'audio pour WebAudio.
   =========================================================== */
function setupGlobalAudioUnlock(gameInstanceGetter) {
  const unlock = () => {
    const g = gameInstanceGetter && gameInstanceGetter();
    if (!g) return;

    g.ensureAudioUnlocked && g.ensureAudioUnlocked();

    // Petit bip de test (trÃ¨s court) pour valider que l'audio est bien dÃ©bloquÃ©
    g.beep && g.beep(1200, 25, "square", 0.03);

    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("touchstart", unlock);
    window.removeEventListener("keydown", unlock);
  };

  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("touchstart", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

/* ===========================================================
   FONCTIONS GLOBALES (appelÃ©es depuis index.html)
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
  
  setupGlobalAudioUnlock(() => window.game);
const initialized = await window.game.init();

  if (!initialized) {
    dbg("? Ã‰chec initialisation du jeu");
    return;
  }

  // âœ… Affichage initial du menu + croix
  backToMenu();

  dbg("? Jeu prÃªt");
};

dbg("? game.js chargÃ©");
