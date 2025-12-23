/* ===========================================================
   RENDERER - Gestion du rendu canvas (sprite, HUD)
   =========================================================== */

class Renderer {
  constructor(gameState) {
    this.gameState = gameState;
  }

  clear() {
    this.gameState.ctx.clearRect(0, 0, this.gameState.W, this.gameState.H);
  }

  drawSprite() {
    const { ctx, spermImg, frameW, frameH, frame, sperm } = this.gameState;
    
    if (!spermImg || !spermImg.complete) return;

    const sourceX = Math.floor(frame) * frameW;
    const sourceY = 0;
    const scale = GAME_CONFIG.SPRITE_SCALE;

const drawW = frameW * scale;
const drawH = frameH * scale;

const destX = sperm.x - drawW / 2;
const destY = sperm.y - drawH / 2;

ctx.drawImage(
  spermImg,
  sourceX, sourceY, frameW, frameH,
  destX, destY, drawW, drawH
);
  }

  drawHUD() {
    const { ctx, timeLeft, sperm } = this.gameState;
    
    ctx.fillStyle = "#fff";
    ctx.font = "18px sans-serif";
    ctx.fillText(timeLeft + "s", 10, 24);
    ctx.fillText("Score: " + Math.round(sperm.dist), 10, 48);
  }

  render() {
    this.clear();
    this.drawSprite();
    this.drawHUD();
  }
}

dbg("? renderer.js chargé");
