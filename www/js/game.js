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

    // ✅ Vérifier si nouveau record AVANT d'afficher le game over
    try {
      const top = await this.leaderboardManager.loadTopScores(level, 1);
      const currentTop1 = top.length > 0 ? top[0].score : 0;
      if (finalScore > currentTop1) {
        showNewRecord();
        setTimeout(() => showGameOver(finalScore), 2800);
      } else {
        showGameOver(finalScore);
      }
    } catch(e) {
      showGameOver(finalScore);
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
    // Sons classiques (one-shot)
    const files = {
      "321":     "sounds/321.mp3",
      "intro":   "sounds/testintro.mp3",
      "timeout": "sounds/Timeout.mp3",
    };

    Object.entries(files).forEach(([key, src]) => {
      const audio = new Audio(src);
      audio.preload = "auto";
      this.sounds[key] = audio;
    });

    this.sounds["intro"].loop   = false;
    this.sounds["intro"].volume = 0.8;
    this.sounds["321"].volume   = 0.7;
    this.sounds["timeout"].volume = 0.6;

    // 🎵 Musique menu via Web Audio API — loop sans gap
    this._audioCtx = null;
    this._menuBuffer = null;
    this._menuSource = null;
    this._menuGain = null;
    this._menuVolume = 0.2; // 👈 Ajuste ici (0.0 → 1.0)

    fetch("sounds/Bouclemenu1.mp3")
      .then(r => r.arrayBuffer())
      .then(buf => {
        this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        return this._audioCtx.decodeAudioData(buf);
      })
      .then(decoded => {
        this._menuBuffer = decoded;
        dbg("🎵 Menu audio buffer prêt");
      })
      .catch(e => {
        dbg("⚠️ Web Audio non disponible, fallback Audio:", e?.message);
        // Fallback Audio classique
        const audio = new Audio("sounds/Bouclemenu1.mp3");
        audio.preload = "auto";
        audio.loop = true;
        audio.volume = 0.2;
        this.sounds["menu"] = audio;
      });

    dbg("🎵 Sons chargés");
  }

  _playMenuWebAudio() {
    if (!this._audioCtx || !this._menuBuffer) return false;
    try {
      if (this._audioCtx.state === "suspended") {
        this._audioCtx.resume();
      }
      this._menuGain = this._audioCtx.createGain();
      this._menuGain.gain.value = this._menuVolume;
      this._menuGain.connect(this._audioCtx.destination);

      this._menuSource = this._audioCtx.createBufferSource();
      this._menuSource.buffer = this._menuBuffer;
      this._menuSource.loop = true; // ✅ loop parfait via Web Audio
      this._menuSource.connect(this._menuGain);
      this._menuSource.start(0);
      return true;
    } catch(e) {
      dbg("⚠️ _playMenuWebAudio erreur:", e?.message);
      return false;
    }
  }

  _stopMenuWebAudio() {
    try {
      if (this._menuSource) {
        this._menuSource.stop();
        this._menuSource.disconnect();
        this._menuSource = null;
      }
      if (this._menuGain) {
        this._menuGain.disconnect();
        this._menuGain = null;
      }
    } catch(e) {}
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

    if (key === "menu" && this._menuBuffer) {
      // ✅ Web Audio API — loop parfait sans gap
      this._playMenuWebAudio();
      return;
    }

    // Fallback Audio classique
    const snd = this.sounds[key];
    if (!snd) return;
    this._currentMusic = snd;
    snd.currentTime = 0;
    snd.play().catch(e => dbg("🔇 Music error:", e?.message));
  }

  // Arrête la musique en cours
  stopMusic() {
    this._stopMenuWebAudio();
    if (this._currentMusic) {
      this._currentMusic.pause();
      this._currentMusic.currentTime = 0;
      this._currentMusic = null;
    }
    this._currentMusicKey = null;
  }

  pauseMusic() {
    if (this._currentMusicKey === "menu" && this._audioCtx) {
      this._audioCtx.suspend();
      return;
    }
    this._currentMusic?.pause();
  }

  resumeMusic() {
    if (this._currentMusicKey === "menu" && this._audioCtx) {
      this._audioCtx.resume();
      return;
    }
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
    // ✅ On ne lance PAS la musique ici — c'est intro.js qui gère le séquençage audio
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

  // ✅ Connexion Google Play Games (si disponible)
  if (typeof initPlayGames === "function") {
    await initPlayGames();
    dbg("🎮 Play Games initialisé");
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