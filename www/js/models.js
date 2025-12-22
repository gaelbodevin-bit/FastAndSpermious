dbg("? models.js chargé");

/* ===========================================================
   MODELS - États du jeu et du joueur
   =========================================================== */

class PlayerState {
  constructor() {
    try {
      this.totalScore = parseInt(localStorage.getItem("totalScore") || "0", 10);
      this.ownedSkins = JSON.parse(localStorage.getItem("ownedSkins") || "[]");
      this.equippedSkin = localStorage.getItem("equippedSkin") || "base";
    } catch (e) {
      dbg("? Erreur chargement PlayerState:", e);
      this.totalScore = 0;
      this.ownedSkins = [];
      this.equippedSkin = "base";
    }
  }

  save() {
    try {
      localStorage.setItem("totalScore", String(this.totalScore));
      localStorage.setItem("ownedSkins", JSON.stringify(this.ownedSkins));
      localStorage.setItem("equippedSkin", this.equippedSkin);
    } catch (e) {
      dbg("? Erreur sauvegarde PlayerState:", e);
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

/* ===========================================================
   GAME STATE
   =========================================================== */

class GameState {
  constructor(canvas, spermImage) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.spermImg = spermImage;

    // Sprite
    this.frameW = GAME_CONFIG.FRAME_SIZE;
    this.frameH = GAME_CONFIG.FRAME_SIZE;
    this.frames = GAME_CONFIG.DEFAULT_FRAMES;
    this.frame = 0;

    // Jeu
    this.run = false;
    this.timeLeft = 0;
    this.timer = null;
    this.shakeForce = 0;
    this.lastLevelPlayed = 15;

    // État fin de course
    this.reachedTop = false;

    // Spermatozoïde
    this.sperm = {
      x: 0,
      y: 0,
      angle: 0,
      amp: GAME_CONFIG.SPERM_AMPLITUDE,
      vy: 0,
      dist: 0
    };

    this.resize();
  }

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

  reset(duration) {
    this.lastLevelPlayed = duration;

    this.sperm.x = this.W / 2;
    this.sperm.y = this.H * 0.75;
    this.sperm.vy = 0;
    this.sperm.dist = 0;
    this.sperm.angle = 0;
    this.sperm.amp = GAME_CONFIG.SPERM_AMPLITUDE;

    this.reachedTop = false;

    this.timeLeft = duration;
    this.run = true;

    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0 && window.game) {
        window.game.stop();
      }
    }, 1000);
  }

  stop() {
    this.run = false;
    if (this.timer) clearInterval(this.timer);
  }

  update() {
    if (!this.run) return;

    const halfH = this.frameH / 2;

    /* -----------------------------
       PHYSIQUE DU SHAKE
       ----------------------------- */
    if (this.shakeForce > 0) {
      this.sperm.vy = Math.min(this.shakeForce / 10, 10);
      this.shakeForce = 0;
    } else {
      this.sperm.vy *= GAME_CONFIG.VELOCITY_DAMPING;
    }

    /* -----------------------------
       MOUVEMENT VERTICAL
       ----------------------------- */
    if (!this.reachedTop) {
      this.sperm.y -= this.sperm.vy;
      this.sperm.dist += Math.max(0, this.sperm.vy);
    }

    if (this.sperm.y <= halfH) {
      this.sperm.y = halfH;
      this.sperm.vy = 0;
      this.reachedTop = true;
    }

    /* -----------------------------
       ONDULATION HORIZONTALE
       ----------------------------- */
    if (!this.reachedTop) {
      this.sperm.angle += GAME_CONFIG.SPERM_WAVE_SPEED;
    } else {
      // amortissement doux à la fin
      this.sperm.angle += GAME_CONFIG.SPERM_WAVE_SPEED * 0.25;
      this.sperm.amp *= 0.92;

      if (this.sperm.amp < 0.5) {
        this.sperm.amp = 0;
      }
    }

    this.sperm.x =
      this.W / 2 + Math.sin(this.sperm.angle) * this.sperm.amp;

    /* -----------------------------
       LIMITES BAS
       ----------------------------- */
    if (this.sperm.y > this.H - halfH) {
      this.sperm.y = this.H - halfH;
    }

    /* -----------------------------
       ANIMATION SPRITE
       ----------------------------- */
    this.frame =
      (this.frame + GAME_CONFIG.FRAME_ANIMATION_SPEED) %
      Math.max(this.frames, 1);
  }

  updateSpriteProperties(frameW, frameH, frames) {
    this.frameW = frameW || GAME_CONFIG.FRAME_SIZE;
    this.frameH = frameH || GAME_CONFIG.FRAME_SIZE;
    this.frames = frames || GAME_CONFIG.DEFAULT_FRAMES;
  }

  getFinalScore() {
    return Math.round(this.sperm.dist);
  }
}
