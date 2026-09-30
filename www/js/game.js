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
    this._previewFrameId = null;

    // Audio
    this.sounds = {};
    this._currentMusic = null;
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

    // ✅ Resize uniquement hors partie pour éviter reset du contexte 2D
    window.addEventListener("resize", () => {
      if (!this.state.run) this.state.resize();
    });
    this.state.resize();

    this.inputManager.init();

    await this.skinManager.load();
    this.updateCurrentSkin();

    this.loadSounds();

    applyLang();
    refreshShopUI();

    // ✅ Pause/reprise musique quand l'app passe en arrière-plan
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.pauseMusic();
        dbg("⏸️ Musique en pause (app masquée)");
      } else {
        this.resumeMusic();
        dbg("▶️ Musique reprise (app visible)");
      }
    });

    // ✅ Cordova : événements pause/resume natifs Android
    document.addEventListener("pause",  () => {
      this.pauseMusic();
      dbg("⏸️ Cordova pause");
    }, false);

    document.addEventListener("resume", () => {
      this.resumeMusic();
      dbg("▶️ Cordova resume");
    }, false);

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

    this.stopMusic();
    hidePanels();
    showQuitBtn();
    this.canvas.style.display = "block";
    if (typeof showGameBackground === "function") showGameBackground();
    this.state.run = false;

    // ✅ Positionner le perso au centre dès l'affichage
    this.state.sperm.x = this.state.W / 2;
    this.state.sperm.y = this.state.H * 0.75;
    this.state.sperm.dist = 0;

    // ✅ Forcer la taille du canvas (évite reset contexte 2D)
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.state.W = this.canvas.width;
    this.state.H = this.canvas.height;

    // ✅ Lancer une preview (affiche le perso pendant délai + countdown)
    this.startPreviewLoop();

    // ✅ Délai 2 secondes avant le countdown
    setTimeout(() => {
      this.startCountdown(3, 1000).then(() => {
        this.stopPreviewLoop();
        this.state.reset(duration);
        this.state.run = true;
        this.loop();
      });
    }, 2000);
  }

  startPreviewLoop() {
    if (this._previewFrameId) return;
    const tick = () => {
      this.renderer.render();
      this._previewFrameId = requestAnimationFrame(tick);
    };
    this._previewFrameId = requestAnimationFrame(tick);
  }

  stopPreviewLoop() {
    if (this._previewFrameId) {
      cancelAnimationFrame(this._previewFrameId);
      this._previewFrameId = null;
    }
  }

  loop() {
    if (!this.state.run) {
      this.animationFrameId = null;
      return;
    }

    this.state.update();
    this.renderer.render();
    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  stop() {
    // ✅ Arrêter la boucle RAF en premier pour éviter les appels multiples
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.state.stop();
    this.playSound("timeout");
    this.onGameOver();
  }

  async onGameOver() {
    const finalScore = this.state.getFinalScore();
    const level = this.state.lastLevelPlayed;

    this.playerState.addScore(finalScore);
    refreshShopUI();

    // ✅ Pub interstitielle après la manche (sautée si Premium),
    //    PUIS record éventuel + écran de game over.
    const proceed = async () => {
      try {
        const top = await this.leaderboardManager.loadTopScores(level, 1);
        const currentTop1 = top.length > 0 ? top[0].score : 0;
        if (finalScore > currentTop1) {
          showNewRecord();
          setTimeout(() => showGameOver(finalScore), 2800);
        } else {
          showGameOver(finalScore);
        }
      } catch (e) {
        showGameOver(finalScore);
      }
    };

    if (typeof showInterstitial === "function") {
      showInterstitial(() => proceed());
    } else {
      proceed();
    }
  }

  /* -------------------------------------------------------
     COUNTDOWN
  ------------------------------------------------------- */
  startCountdown(seconds = 3, stepMs = 1000) {
    return new Promise((resolve) => {
      const el = document.getElementById("countdown");
      if (!el) { resolve(); return; }

      // Annule tout countdown en cours
      if (this._countdownInterval) {
        clearInterval(this._countdownInterval);
        this._countdownInterval = null;
      }

      // ✅ Jouer le fichier countdown complet dès le début
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
    // Tous les sons en Audio classique (fiable sur WebView Android)
    const files = {
      "321":     "sounds/321.mp3",
      "intro":   "sounds/testintro.mp3",
      "timeout": "sounds/Timeout.mp3",
      "menu":    "sounds/Bouclemenu1.mp3",
    };

    Object.entries(files).forEach(([key, src]) => {
      const audio = new Audio(src);
      audio.preload = "auto";
      this.sounds[key] = audio;
    });

    this.sounds["intro"].loop     = false;
    this.sounds["intro"].volume   = 0.8;
    this.sounds["321"].volume     = 0.7;
    this.sounds["timeout"].volume = 0.6;
    this.sounds["menu"].loop      = true;
    this.sounds["menu"].volume    = 0.2;

    this._currentMusic = null;
    this._currentMusicKey = null;
    this._pendingMusicKey = null; // musique demandée mais bloquée (autoplay)

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
    this.stopMusic();
    this._currentMusicKey = key;

    const snd = this.sounds[key];
    if (!snd) return;
    this._currentMusic = snd;
    snd.currentTime = 0;
    const p = snd.play();
    if (p && p.catch) {
      p.catch(e => {
        // Bloqué par l'autoplay policy → on retient pour relancer au 1er tap
        this._pendingMusicKey = key;
        dbg("🔇 Music bloquée (autoplay), en attente d'un tap:", e?.message);
      });
    }
  }

  // Arrête la musique en cours
  stopMusic() {
    if (this._currentMusic) {
      this._currentMusic.pause();
      this._currentMusic.currentTime = 0;
      this._currentMusic = null;
    }
    this._currentMusicKey = null;
  }

  pauseMusic() {
    this._currentMusic?.pause();
  }

  resumeMusic() {
    this._currentMusic?.play().catch(e => dbg("🔇 Resume error:", e?.message));
  }

  // Relance la musique après un déblocage audio (1er tap) si elle était bloquée
  resumeCurrentMusic() {
    const key = this._pendingMusicKey || this._currentMusicKey;
    if (!key) return;
    const snd = this.sounds[key];
    if (!snd) return;
    this._currentMusic = snd;
    this._currentMusicKey = key;
    snd.play()
      .then(() => { this._pendingMusicKey = null; })
      .catch(e => dbg("🔇 Resume error:", e?.message));
  }
}

/* ===========================================================
   AUDIO UNLOCK (anti-autoplay Android) - 1er tap/clic
   =========================================================== */
function setupGlobalAudioUnlock(gameInstanceGetter) {
  const unlock = () => {
    const g = gameInstanceGetter?.();
    if (!g) return;
    // Relancer la musique si elle a été bloquée par l'autoplay policy
    if (typeof g.resumeCurrentMusic === "function") g.resumeCurrentMusic();
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("touchstart",  unlock);
  window.addEventListener("keydown",     unlock);
}

/* ===========================================================
   FONCTIONS GLOBALES (appelées depuis index.html)
   =========================================================== */
function startGame(duration) {
  // Connexion Google obligatoire pour jouer
  if (!window.authUser) {
    if (typeof showLoginRequired === "function") {
      showLoginRequired(() => window.game?.start(duration));
    }
    return;
  }
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

  // ✅ Connexion Google OBLIGATOIRE (overlay bloquant tant que non connecté)
  if (typeof initAuth === "function") {
    await initAuth();
    dbg("🔐 Auth Google initialisée");
  }

  // ✅ Reset ownedSkins si nouvelle version (nettoie les données de test)
  const _savedVer = localStorage.getItem("gameVersion");
  if (_savedVer !== GAME_CONFIG.VERSION) {
    dbg("🔄 Reset skins - version:", GAME_CONFIG.VERSION);
    localStorage.removeItem("ownedSkins");
    localStorage.removeItem("equippedSkin");
    localStorage.setItem("gameVersion", GAME_CONFIG.VERSION);
    // Recharger playerState proprement
    window.game.playerState.ownedSkins = [];
    window.game.playerState.equippedSkin = "base";
    // Réappliquer les skins "always"
    await window.game.skinManager.load();
    window.game.updateCurrentSkin();
  }

  // ✅ Sync score et skins depuis Firebase
  window.game.playerState.syncFromFirebase().then(() => {
    refreshShopUI();
    dbg("✅ Sync Firebase terminée");
  });

  // ✅ Affichage version
  const vTag = document.getElementById("versionTag");
  if (vTag) vTag.textContent = "v" + GAME_CONFIG.VERSION;

  backToMenu();
  dbg("✅ Jeu prêt");
};

dbg("✅ game.js chargé");