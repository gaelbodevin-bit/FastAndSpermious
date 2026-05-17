dbg("? models.js charg");

/* ===========================================================
   MODELS - tats du jeu et du joueur
   =========================================================== */

/* =======================
   PLAYER STATE
   ======================= */

class PlayerState {
  constructor() {
    try {
      // ?? ID joueur unique (persistant)
      this.playerId =
        localStorage.getItem("playerId") ||
        (crypto.randomUUID
          ? crypto.randomUUID()
          : "pid_" + Date.now() + "_" + Math.random().toString(36).slice(2));

      localStorage.setItem("playerId", this.playerId);

      // ?? Progression joueur
      this.totalScore = parseInt(
        localStorage.getItem("totalScore") || "0",
        10
      );

      this.ownedSkins = JSON.parse(
        localStorage.getItem("ownedSkins") || "[]"
      );

      this.equippedSkin =
        localStorage.getItem("equippedSkin") || "base";

    } catch (e) {
      dbg("? Erreur chargement PlayerState:", e);

      this.playerId = "pid_fallback_" + Date.now();
      this.totalScore = 0;
      this.ownedSkins = [];
      this.equippedSkin = "base";
    }
  }

  // ? Sauvegarde locale + Firebase
  save() {
    try {
      localStorage.setItem("playerId",    this.playerId);
      localStorage.setItem("totalScore",  String(this.totalScore));
      localStorage.setItem("ownedSkins",  JSON.stringify(this.ownedSkins));
      localStorage.setItem("equippedSkin", this.equippedSkin);
    } catch (e) {
      dbg("? Erreur sauvegarde locale PlayerState:", e);
    }
    // Sync Firebase
    if (typeof savePlayerData === "function") {
      savePlayerData(this.totalScore, this.ownedSkins)
        .catch(e => dbg("? savePlayerData:", e));
    }
  }

  // ? Sync depuis Firebase au dmarrage
  async syncFromFirebase() {
    try {
      if (typeof loadPlayerData !== "function") return;
      const data = await loadPlayerData();
      if (!data) return;
      // On prend le MAX pour ne pas perdre de points
      if (data.totalScore > this.totalScore) {
        this.totalScore = data.totalScore;
        localStorage.setItem("totalScore", String(this.totalScore));
        dbg("? Score sync Firebase:", this.totalScore);
      }
      // Fusionner les skins
      let changed = false;
      (data.ownedSkins || []).forEach(id => {
        if (!this.ownedSkins.includes(id)) {
          this.ownedSkins.push(id);
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem("ownedSkins", JSON.stringify(this.ownedSkins));
        dbg("? Skins sync Firebase:", this.ownedSkins);
      }
    } catch (e) {
      dbg("? syncFromFirebase:", e);
    }
  }

  addScore(score) {
    this.totalScore += score;
    this.save();
  }

  ownSkin(id) {
    if (!this.ownedSkins.includes(id)) {
      this.ownedSkins.push(id);
      this.save();
    }
  }

  equipSkin(id) {
    if (this.ownedSkins.includes(id)) {
      this.equippedSkin = id;
      this.save();
      return true;
    }
    return false;
  }
}

/* =======================
   GAME STATE
   ======================= */

class GameState {
  constructor(canvas, spermImage) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.spermImg = spermImage;

    /* ---------- SPRITE ---------- */
    this.frameW = GAME_CONFIG.FRAME_SIZE;
    this.frameH = GAME_CONFIG.FRAME_SIZE;
    this.frames = GAME_CONFIG.DEFAULT_FRAMES;
    this.frame = 0;

    /* ---------- GAME ---------- */
    this.run = false;
    this.timeLeft = 0;
    this.timer = null;
    this.shakeForce = 0;
    this.lastLevelPlayed = 15;

    /* ---------- SPERM ---------- */
    this.sperm = {
      x: 0,
      y: 0,
      vy: 0,
      dist: 0,
      angle: 0,
      amp: GAME_CONFIG.SPERM_AMPLITUDE
    };

    this.resize();
  }

  /* =======================
     RESIZE
     ======================= */

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    this.W = this.canvas.width;
    this.H = this.canvas.height;

    if (!this.run) {
      this.sperm.x = this.W / 2;
      this.sperm.y = this.H * 0.75;
    }
  }

  /* =======================
     RESET / START
     ======================= */

  reset(duration) {
    this.lastLevelPlayed = duration;

    this.sperm.x = this.W / 2;
    this.sperm.y = this.H * 0.75;
    this.sperm.vy = 0;
    this.sperm.dist = 0;
    this.sperm.angle = 0;
    this.sperm.amp = GAME_CONFIG.SPERM_AMPLITUDE;

    this.timeLeft = duration;
    this.run = true;

    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        // ? Nettoyer le timer AVANT d'appeler stop()
        clearInterval(this.timer);
        this.timer = null;
        if (window.game) window.game.stop();
      }
    }, 1000);
  }

  stop() {
    this.run = false;
    if (this.timer) clearInterval(this.timer);
  }

  /* =======================
     UPDATE (PHYSIQUE + SCORE)
     ======================= */

  update() {
    if (!this.run) return;

    const halfH = this.frameH / 2;

    /* ---------- SHAKE / VITESSE ---------- */
    if (this.shakeForce > 0) {
      // ? Vitesse proportionnelle au mouvement, max limité
      // Pour atteindre le haut en ~15s il faut ~H/15/60 px/frame
      const targetMaxVy = (this.H * 0.65) / (this.timeLeft * 60 + 1);
      const force = Math.min(this.shakeForce / 20, targetMaxVy * 3);
      this.sperm.vy = Math.max(this.sperm.vy, force);
      this.shakeForce = 0;
    } else {
      this.sperm.vy *= GAME_CONFIG.VELOCITY_DAMPING;
    }

    /* ---------- SCORE (INDPENDANT DU Y) ---------- */
    if (this.sperm.vy > 0) {
      this.sperm.dist += this.sperm.vy;
    }

    /* ---------- MOUVEMENT VERTICAL VISUEL ---------- */
    this.sperm.y -= this.sperm.vy;

    // Clamp visuel uniquement
    if (this.sperm.y < halfH) {
      this.sperm.y = halfH;
    }

    if (this.sperm.y > this.H - halfH) {
      this.sperm.y = this.H - halfH;
    }

    /* ---------- ONDULATION HORIZONTALE ---------- */
    this.sperm.angle += GAME_CONFIG.SPERM_WAVE_SPEED;
    this.sperm.amp *= 0.995; // micro amortissement continu

    this.sperm.x =
      this.W / 2 + Math.sin(this.sperm.angle) * this.sperm.amp;

    /* ---------- ANIMATION SPRITE ---------- */
    this.frame =
      (this.frame + GAME_CONFIG.FRAME_ANIMATION_SPEED) %
      Math.max(this.frames, 1);
  }

  /* =======================
     SPRITE SETTINGS
     ======================= */

  updateSpriteProperties(frameW, frameH, frames) {
    this.frameW = frameW || GAME_CONFIG.FRAME_SIZE;
    this.frameH = frameH || GAME_CONFIG.FRAME_SIZE;
    this.frames = frames || GAME_CONFIG.DEFAULT_FRAMES;
  }

  getFinalScore() {
    return Math.round(this.sperm.dist);
  }
}