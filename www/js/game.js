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

    // ✅ Fenêtre système par-dessus le jeu (choix du compte Google, achat Play) :
    //    l'app passe en pause mais on GARDE la musique (continuité).
    //    Le mode se coupe au retour dans l'app, ou au bout de 2 min par sécurité.
    window.keepMusicForOverlay = () => {
      window._keepMusicOverlay = true;
      clearTimeout(window._keepMusicOverlayT);
      window._keepMusicOverlayT = setTimeout(() => { window._keepMusicOverlay = false; }, 120000);
    };
    const endOverlay = () => {
      if (!window._keepMusicOverlay) return;
      clearTimeout(window._keepMusicOverlayT);
      setTimeout(() => { window._keepMusicOverlay = false; }, 800);
    };

    // ✅ Pause/reprise musique quand l'app passe en arrière-plan
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (window._keepMusicOverlay) return;   // fenêtre Google : on garde la musique
        this.pauseMusic();
        dbg("⏸️ Musique en pause (app masquée)");
      } else {
        this.resumeMusic();
        endOverlay();
        dbg("▶️ Musique reprise (app visible)");
      }
    });

    // ✅ Cordova : événements pause/resume natifs Android
    document.addEventListener("pause",  () => {
      if (window._keepMusicOverlay) return;     // fenêtre Google : on garde la musique
      this.pauseMusic();
      dbg("⏸️ Cordova pause");
    }, false);

    document.addEventListener("resume", () => {
      this.resumeMusic();
      endOverlay();
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

    // Musique de fond : on GARDE la boucle du menu (pas de changement de morceau),
    // on baisse juste un peu le volume en fondu. Si aucune boucle ne tourne, on en lance une.
    this.setMusicLevel("game");
    this.ensureLoop();
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
        // Délai max : sans réseau, la requête Firebase pourrait ne jamais répondre
        const top = await Promise.race([
          this.leaderboardManager.loadTopScores(level, 1),
          new Promise((_, rej) => setTimeout(() => rej(new Error("leaderboard-timeout")), 4000)),
        ]);
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
      // Boucles de fond (menu + en jeu) — tirées au hasard
      "loop1":   "sounds/Bouclemenu1.mp3",
      "loop2":   "sounds/Boucle%20menu%20jeu%202.mp3",
      "loop3":   "sounds/Boucle%20menu%20jeu%203.mp3",
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

    // Boucles de fond interchangeables (menu + en jeu)
    this._musicLoops  = ["loop1", "loop2", "loop3"];
    this._musicLevels = { menu: 0.2, game: 0.12 };  // volume des boucles : menu / en partie
    this._musicLevel  = "menu";
    this._fadeTimer   = null;
    this._musicLoops.forEach((k) => {
      if (this.sounds[k]) { this.sounds[k].loop = true; this.sounds[k].volume = this._musicLevels.menu; }
    });

    this._currentMusic = null;
    this._currentMusicKey = null;
    this._pendingMusicKey = null; // musique demandée mais bloquée (autoplay)
    this._musicToken      = 0;    // n° de la dernière demande de musique (anti-requêtes périmées)

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

  // Joue une musique : coupe TOUTE musique en cours, puis lance celle-ci
  playMusic(key) {
    this.stopMusic();

    const snd = this.sounds[key];
    if (!snd) return;
    const token = ++this._musicToken;
    this._currentMusic    = snd;
    this._currentMusicKey = key;
    if ((this._musicLoops || []).includes(key)) snd.volume = this._musicLevels[this._musicLevel];
    snd.currentTime = 0;

    const p = snd.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        if (token === this._musicToken) this._pendingMusicKey = null;
      }).catch((e) => {
        // Demande périmée (une autre musique a été demandée depuis) → on ignore
        if (token !== this._musicToken) return;
        // AbortError = play() interrompu par un pause() volontaire → PAS un blocage autoplay
        if (e && e.name === "AbortError") return;
        // Vrai blocage autoplay → on relancera au 1er tap
        this._pendingMusicKey = key;
        dbg("🔇 Musique bloquée (autoplay), en attente d'un tap:", e?.message);
      });
    }
  }

  // Lance une boucle de fond au hasard (différente de celle en cours si possible)
  playRandomLoop() {
    const pool = this._musicLoops || ["loop1"];
    const choices = pool.length > 1 ? pool.filter((k) => k !== this._currentMusicKey) : pool;
    const key = choices[Math.floor(Math.random() * choices.length)];
    this.playMusic(key);
  }

  // Lance une boucle SEULEMENT si aucune ne tourne déjà (pas de coupure au retour menu,
  // en fermant la boutique, etc.). Pendant l'intro, on ne touche à rien : intro.js
  // lance la boucle à la fin de la cinématique.
  ensureLoop() {
    if (document.getElementById("studio-intro")) return;
    const loops = this._musicLoops || [];
    if (this._currentMusicKey && loops.includes(this._currentMusicKey)) return;
    this.playRandomLoop();
  }

  // Arrête TOUTES les musiques de fond (intro + boucles) → aucune piste ne peut rester orpheline
  stopMusic() {
    this._cancelFade();
    this._musicToken++; // invalide toute demande de lecture encore en cours
    const keys = ["intro"].concat(this._musicLoops || []);
    keys.forEach((k) => {
      const s = this.sounds[k];
      if (s) { try { s.pause(); s.currentTime = 0; } catch (e) {} }
    });
    this._currentMusic    = null;
    this._currentMusicKey = null;
    this._pendingMusicKey = null;
  }

  pauseMusic() {
    this._currentMusic?.pause();
  }

  // Reprend la musique courante (retour d'arrière-plan, après le sélecteur de compte Google…).
  // Si Android refuse la reprise, elle sera relancée au prochain tap.
  resumeMusic() {
    const snd = this._currentMusic;
    if (!snd || !snd.paused) return;
    const key = this._currentMusicKey;
    const token = this._musicToken;
    const p = snd.play();
    if (p && typeof p.then === "function") {
      p.catch((e) => {
        if (token !== this._musicToken || (e && e.name === "AbortError")) return;
        this._pendingMusicKey = key;
        dbg("🔇 Reprise musique refusée, relance au prochain tap:", e?.message);
      });
    }
  }

  // Volume des boucles selon le contexte : "menu" ou "game" (fondu doux)
  setMusicLevel(level, fadeMs = 600) {
    if (!this._musicLevels || !(level in this._musicLevels)) return;
    this._musicLevel = level;
    const target = this._musicLevels[level];
    const snd = this._currentMusic;
    this._cancelFade();
    if (!snd || !(this._musicLoops || []).includes(this._currentMusicKey)) return; // jamais l'intro
    if (!fadeMs) { snd.volume = target; return; }
    const from  = snd.volume;
    const steps = Math.max(1, Math.round(fadeMs / 30));
    let i = 0;
    this._fadeTimer = setInterval(() => {
      i++;
      snd.volume = Math.min(1, Math.max(0, from + (target - from) * (i / steps)));
      if (i >= steps) this._cancelFade();
    }, 30);
  }

  _cancelFade() {
    if (this._fadeTimer) { clearInterval(this._fadeTimer); this._fadeTimer = null; }
  }

  // Au 1er tap : relance UNIQUEMENT la musique courante si elle avait été bloquée par l'autoplay
  resumeCurrentMusic() {
    if (document.getElementById("studio-intro")) return; // pendant l'intro : un tap ne lance rien
    const key = this._pendingMusicKey;
    if (!key) return;                                  // rien en attente → on ne fait rien
    if (key !== this._currentMusicKey || !this._currentMusic) {
      this._pendingMusicKey = null;                    // attente périmée → on l'oublie
      return;
    }
    // Sécurité : aucune autre piste musicale ne doit jouer
    ["intro"].concat(this._musicLoops || []).forEach((k) => {
      const s = this.sounds[k];
      if (s && s !== this._currentMusic) { try { s.pause(); } catch (e) {} }
    });
    const token = this._musicToken;
    this._currentMusic.play()
      .then(() => { if (token === this._musicToken) this._pendingMusicKey = null; })
      .catch((e) => dbg("🔇 Resume error:", e?.message));
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

  // ✅ Reset ownedSkins si la clé de données change (nettoie les données de test)
  //    Indépendant du numéro affiché : changer VERSION n'efface plus rien.
  const _savedVer = localStorage.getItem("gameVersion");
  if (_savedVer !== GAME_CONFIG.DATA_VERSION) {
    dbg("🔄 Reset skins - données:", GAME_CONFIG.DATA_VERSION);
    localStorage.removeItem("ownedSkins");
    localStorage.removeItem("equippedSkin");
    localStorage.setItem("gameVersion", GAME_CONFIG.DATA_VERSION);
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
  if (vTag) vTag.textContent = "V" + GAME_CONFIG.VERSION;

  backToMenu();
  dbg("✅ Jeu prêt");
};

dbg("✅ game.js chargé");