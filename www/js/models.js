/* ===========================================================
   MODELS - États du jeu et du joueur
   =========================================================== */

class PlayerState {
  constructor() {
    try {
      this.totalScore = parseInt(localStorage.getItem("totalScore") || "0", 10);
      this.ownedSkins = JSON.parse(localStorage.getItem("ownedSkins") || "[]");
      this.equippedSkin = localStorage.getItem("equippedSkin") || "base";
    } catch (error) {
      dbg("❌ Error loading PlayerState:", error);
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
    } catch (error) {
      dbg("❌ Error saving PlayerState:", error);
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
    
    // Sprite properties
    this.frameWidth = GAME_CONFIG.FRAME_SIZE;
    this.frameHeight = GAME_CONFIG.FRAME_SIZE;
    this.totalFrames = GAME_CONFIG.DEFAULT_FRAMES;
    this.currentFrame = 0;
    
    // Game state
    this.isRunning = false;
    this.timeLeft = 0;
    this.timer = null;
    this.shakeForce = 0;
    this.lastLevelPlayed = 15;
    
    // Sperm position and movement
    this.sperm = {
      x: 180,
      y: 500,
      angle: 0,
      amplitude: GAME_CONFIG.SPERM_AMPLITUDE,
      velocityY: 0,
      distance: 0
    };
    
    this.resize();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.canvasWidth = this.canvas.width;
    this.canvasHeight = this.canvas.height;
    
    if (!this.isRunning) {
      this.sperm.x = this.canvasWidth / 2;
      this.sperm.y = this.canvasHeight * 0.75;
    }
  }

  reset(duration) {
    this.lastLevelPlayed = duration;
    this.sperm.y = this.canvasHeight * 0.75;
    this.sperm.x = this.canvasWidth / 2;
    this.sperm.distance = 0;
    this.sperm.velocityY = 0;
    this.timeLeft = duration;
    this.isRunning = true;
    
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0 && window.game) window.game.stop();
    }, 1000);
  }

  stop() {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
  }

  update() {
    if (!this.isRunning) return;
    
    // Shake physics
    if (this.shakeForce > 0) {
      this.sperm.velocityY = Math.min(this.shakeForce / 10, 10);
      this.shakeForce = 0;
    } else {
      this.sperm.velocityY *= GAME_CONFIG.VELOCITY_DAMPING;
    }
    
    // Vertical movement
    this.sperm.y -= this.sperm.velocityY;
    this.sperm.distance += this.sperm.velocityY;
    
    // Horizontal sinusoidal movement
    this.sperm.angle += GAME_CONFIG.SPERM_WAVE_SPEED;
    this.sperm.x = this.canvasWidth / 2 + Math.sin(this.sperm.angle) * this.sperm.amplitude;
    
    // Position constraints
    if (this.sperm.y < this.frameHeight / 2) this.sperm.y = this.frameHeight / 2;
    if (this.sperm.y > this.canvasHeight - this.frameHeight / 2) this.sperm.y = this.canvasHeight - this.frameHeight / 2;
    
    // Sprite animation
    this.currentFrame = (this.currentFrame + GAME_CONFIG.FRAME_ANIMATION_SPEED) % Math.max(this.totalFrames, 1);
  }

  updateSpriteProperties(frameWidth, frameHeight, totalFrames) {
    this.frameWidth = frameWidth || GAME_CONFIG.FRAME_SIZE;
    this.frameHeight = frameHeight || GAME_CONFIG.FRAME_SIZE;
    this.totalFrames = totalFrames || GAME_CONFIG.DEFAULT_FRAMES;
  }

  getFinalScore() {
    return Math.round(this.sperm.distance);
  }
}

dbg("✅ models.js loaded");
