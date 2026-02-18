/* ===========================================================
   GAME - Point d'entrée principal et boucle de jeu
   =========================================================== */

class Game {
  constructor() {
    dbg("✅ Game constructor");
    dbg("🔖 VERSION BUILD :", GAME_CONFIG.VERSION);

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

    // Audio
    this.audioCtx = null;

    // Countdown (protection contre les appels multiples)
    this._countdownInterval = null;
  }

  /* -------------------------------------------------------
     INITIALISATION
  ------------------------------------------------------- */
  async init() {
    dbg("🚀 Game init");

    this.canvas = document.getElementById("gameCanvas");
    if (!this.canvas) {
      dbg("❌ Erreur: canvas non trouvé");
      return false;
    }

    this.state = new GameState(this.canvas, this.spermImg);
    this.renderer = new Renderer(this.state);
    this.inputManager = new InputManager(this.state);

    window.addEventListener("resize", () => this.state.resize());
    this.state.resize();

    this.inputManager.init();

    await this.skinManager.load();
    this.updateCurrentSkin();

    applyLang();
    refreshShopUI();

    dbg("✅ Game initialisé");
    return true;
  }

  /* -------------------------------------------------------
     SKIN
  ------------------------------------------------------- */
  updateCurrentSkin() {
    const currentSkin = this.skinManager.getCurrentSkin();
    if (!currentSkin) return;

    const imagePath = this.skinManager.getSkinImagePath(currentSkin.id);
    if (imagePath) this.spermImg.src = imagePath;

    this.state.updateSpriteProperties(
      currentSkin.frameSize || GAME_CONFIG.FRAME_SIZE,
      currentSkin.frameSize || GAME_CONFIG.FRAME_SIZE,
      currentSkin.frames   || GAME_CONFIG.DEFAULT_FRAMES
    );
  }

  /* -------------------------------------------------------
     DÉMARRAGE / BOUCLE / ARRÊT
  ------------------------------------------------------- */
  start(duration) {
    dbg("▶️ START", duration);

    this.ensureAudioUnlocked();
    hidePanels();
    this.canvas.style.display = "block";
    this.state.run = false;

    this.startCountdown(3, 600).then(() => {
      this.state.reset(duration);
      this.state.run = true;
      this.loop();
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

    this.ensureAudioUnlocked();
    this.playEndRoundFx();
    this.onGameOver();
  }

  onGameOver() {
    const finalScore = this.state.getFinalScore();
    this.playerState.addScore(finalScore);
    refreshShopUI();
    showGameOver(finalScore);
  }

  /* -------------------------------------------------------
     COUNTDOWN
  ------------------------------------------------------- */
  startCountdown(seconds = 3, stepMs = 600) {
    return new Promise((resolve) => {
      const el = document.getElementById("countdown");
      if (!el) { resolve(); return; }

      // Annule tout countdown en cours
      if (this._countdownInterval) {
        clearInterval(this._countdownInterval);
        this._countdownInterval = null;
      }

      this.ensureAudioUnlocked();
      el.style.display = "grid";
      let t = seconds;

      const render = (txt) => {
        el.textContent = txt;
        el.classList.remove("pop");
        void el.offsetWidth; // force reflow pour relancer l'animation CSS
        el.classList.add("pop");
      };

      render(t);
      this.playCountdownTick(t);

      this._countdownInterval = setInterval(() => {
        t--;

        if (t > 0) {
          render(t);
          this.playCountdownTick(t);
          return;
        }

        if (t === 0) {
          render("GO!");
          this.playGoFx();
          clearInterval(this._countdownInterval);
          this._countdownInterval = null;

          setTimeout(() => {
            el.style.display = "none";
            resolve();
          }, 350);
        }
      }, stepMs);
    });
  }

  /* -------------------------------------------------------
     AUDIO
  ------------------------------------------------------- */
  ensureAudioUnlocked() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        dbg("❌ AudioContext non supporté");
        return;
      }

      if (!this.audioCtx) {
        this.audioCtx = new Ctx();
        dbg("🔊 AudioContext créé");
      }

      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume()
          .then(() => dbg("🔊 AudioContext resumed"))
          .catch((e) => dbg("❌ Audio resume failed:", e?.message || e));
      }
    } catch (e) {
      dbg("❌ ensureAudioUnlocked error:", e?.message || e);
    }
  }

  beep(freq = 880, durationMs = 90, type = "square", volume = 0.08) {
    if (!this.audioCtx) return;

    const ctx  = this.audioCtx;
    const now  = ctx.currentTime;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    // Enveloppe attaque/relâche pour éviter les "clics"
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationMs / 1000 + 0.02);
  }

  playCountdownTick(n) {
    const freqMap = { 3: 900, 2: 780, 1: 660 };
    this.beep(freqMap[n] || 800, 95, "square", 0.08);
  }

  playGoFx() {
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // 🔥 Montée rapide (whoosh)
    const osc1  = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(200, now);
    osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // 💥 Impact grave
    const osc2  = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "square";
    osc2.frequency.setValueAtTime(120, now + 0.05);
    gain2.gain.setValueAtTime(0.3, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.22);

    // 📳 Vibration punch
    navigator.vibrate?.([30, 40, 80]);
  }

  playEndRoundFx() {
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // 🎵 Mini jingle "fin de round"
    [600, 800, 1000].forEach((freq, i) => {
      const t    = now + i * 0.08;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    });

    navigator.vibrate?.([40, 60]);
  }
}

/* ===========================================================
   AUDIO UNLOCK (anti-autoplay) - 1er clic/tap
   =========================================================== */
function setupGlobalAudioUnlock(gameInstanceGetter) {
  const unlock = () => {
    const g = gameInstanceGetter?.();
    if (!g) return;

    g.ensureAudioUnlocked?.();
    g.beep?.(1200, 30, "square", 0.03); // mini beep de validation
  };

  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("touchstart",  unlock, { once: true });
  window.addEventListener("keydown",     unlock, { once: true });
}

/* ===========================================================
   FONCTIONS GLOBALES (appelées depuis index.html)
   =========================================================== */
function startGame(duration) {
  window.game?.start(duration);
}

/* ===========================================================
   INITIALISATION
   =========================================================== */
window.onload = async () => {
  dbg("🚀 window.onload");

  window.game = new Game();
  setupGlobalAudioUnlock(() => window.game);

  const initialized = await window.game.init();
  if (!initialized) {
    dbg("❌ Échec initialisation du jeu");
    return;
  }

  backToMenu();
  dbg("✅ Jeu prêt");
};

dbg("✅ game.js chargé");