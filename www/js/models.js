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

  ownSkin(skinId) {
    if (!this.ownedSkins.includes(skinId)) {
      this.ownedSkins.push(skinId);
      this.save();
    }
  }

  equipSkin(skinId) {
    if (this.ownedSkins.includes(skinId)) {
      this.equippedSkin = skinId;
      this.save();
      return true;
    }
    return false;
  }
}

class GameState {
  constructor(canvas, spermImage) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.spermImg = spermImage;
    
    // Propriétés du sprite
    this.frameW = GAME_CONFIG.FRAME_SIZE;
    this.frameH = GAME_CONFIG.FRAME_SIZE;
    this.frames = GAME_CONFIG.DEFAULT_FRAMES;
    this.frame = 0;
    
    // État du jeu
    this.run = false;
    this.timeLeft = 0;
    this.timer = null;
    this.shakeForce = 0;
    this.lastLevelPlayed = 15;
    
    // Position et mouvement du sperm
    this.sperm = {
      x: 180,
      y: 500,
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
    this.sperm.y = this.H * 0.75;
    this.sperm.x = this.W / 2;
    this.sperm.dist = 0;
    this.sperm.vy = 0;
    this.timeLeft = duration;
    this.run = true;
    
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0 && window.game) window.game.stop();
    }, 1000);
  }

  stop() {
    this.run = false;
    if (this.timer) clearInterval(this.timer);
  }

  update() {
    if (!this.run) return;
    
    // Physique du shake
    if (this.shakeForce > 0) {
      this.sperm.vy = Math.min(this.shakeForce / 10, 10);
      this.shakeForce = 0;
    } else {
      this.sperm.vy *= GAME_CONFIG.VELOCITY_DAMPING;
    }
    
    // Mouvement vertical
    this.sperm.y -= this.sperm.vy;
    this.sperm.dist += this.sperm.vy;
    
    // Mouvement sinusoïdal horizontal
    this.sperm.angle += GAME_CONFIG.SPERM_WAVE_SPEED;
    this.sperm.x = this.W / 2 + Math.sin(this.sperm.angle) * this.sperm.amp;
    
    // Contraintes de position
    if (this.sperm.y < this.frameH / 2) this.sperm.y = this.frameH / 2;
    if (this.sperm.y > this.H - this.frameH / 2) this.sperm.y = this.H - this.frameH / 2;
    
    // Animation du sprite
    this.frame = (this.frame + GAME_CONFIG.FRAME_ANIMATION_SPEED) % Math.max(this.frames, 1);
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

dbg("? models.js chargé");
