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

    // Countdown
    this._countdownInterval = null;

    // Audio
    this.sounds = {};
    this._currentMusic = null; // musique en cours de lecture
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

    // Charger tous les sons
    this.loadSounds();

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

    // Arrêter la musique du menu
    this.stopMusic();

    hidePanels();
    showQuitBtn();
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

    this.playSound("timeout");
    this.onGameOver();
  }

  onGameOver() {
    const finalScore = this.state.getFinalScore();
    this.playerState.addScore(finalScore);
    refreshShopUI();
    showGameOver(finalScore);

    // Relancer la musique du menu après le game over
    this.playMusic("menu");
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

      // Jouer le fichier countdown complet dès le début
      this.playSound("321");

      el.style.display = "grid";
      let t = seconds;

      const render = (txt) => {
        el.textContent = txt;
        el.classList.remove("pop");
        void el.offsetWidth; // force reflow pour relancer l'animation CSS
        el.classList.add("pop");
      };

      render(t);

      this._countdownInterval = setInterval(() => {
        t--;

        if (t > 0) {
          render(t);
          return;
        }

        if (t === 0) {
          render("GO!");
          clearInterval(this._countdownInterval);
          this._countdownInterval = null;

          navigator.vibrate?.([30, 40, 80]);

          setTimeout(() => {
            el.style.display = "none";
            resolve();
          }, 350);
        }
      }, stepMs);
    });
  }

  /* -------------------------------------------------------
     AUDIO - Chargement
  ------------------------------------------------------- */
  loadSounds() {
    const files = {
      "321":     "sounds/321.mp3",
      "menu":    "sounds/Bouclemenu1.mp3",
      "intro":   "sounds/testintro.mp3",
      "timeout": "sounds/Timeout.mp3",
    };

    Object.entries(files).forEach(([key, src]) => {
      const audio = new Audio(src);
      audio.preload = "auto";
      this.sounds[key] = audio;
    });

    // Musiques en boucle
    this.sounds["menu"].loop   = true;
    this.sounds["menu"].volume = 0.6;

    // Intro : pas de boucle
    this.sounds["intro"].loop   = false;
    this.sounds["intro"].volume = 0.8;

    dbg("🎵 Sons chargés");
  }

  /* -------------------------------------------------------
     AUDIO - Lecture
  ------------------------------------------------------- */

  // Joue un effet sonore one-shot
  playSound(key) {
    const snd = this.sounds[key];
    if (!snd) return;
    snd.currentTime = 0;
    snd.play().catch(e => dbg("🔇 Sound error:", e?.message));
  }

  // Joue une musique (arrête la précédente)
  playMusic(key) {
    const snd = this.sounds[key];
    if (!snd) return;

    // Déjà en cours → ne rien faire
    if (this._currentMusic === snd && !snd.paused) return;

    this.stopMusic();
    this._currentMusic = snd;
    snd.currentTime = 0;
    snd.play().catch(e => dbg("🔇 Music error:", e?.message));
  }

  // Arrête la musique en cours
  stopMusic() {
    if (this._currentMusic) {
      this._currentMusic.pause();
      this._currentMusic.currentTime = 0;
      this._currentMusic = null;
    }
  }

  pauseMusic() {
    this._currentMusic?.pause();
  }

  resumeMusic() {
    this._currentMusic?.play().catch(e => dbg("🔇 Resume error:", e?.message));
  }
}

/* ===========================================================
   AUDIO UNLOCK (anti-autoplay Android) - 1er tap/clic
   =========================================================== */
function setupGlobalAudioUnlock(gameInstanceGetter) {
  const unlock = () => {
    const g = gameInstanceGetter?.();
    if (!g) return;
    dbg("🔊 Audio unlocked");
    // Démarre la musique du menu au 1er tap
    g.playMusic("menu");
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