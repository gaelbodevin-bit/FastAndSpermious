/* ===========================================================
   RENDERER - Gestion du rendu canvas (sprite, HUD)
   =========================================================== */

class Renderer {
  constructor(gameState) {
    this.gameState = gameState;
  }

  clear() {
    this.gameState.ctx.clearRect(0, 0, this.gameState.canvasWidth, this.gameState.canvasHeight);
  }

  drawSprite() {
    const { ctx, spermImg, frameWidth, frameHeight, currentFrame, sperm } = this.gameState;
    
    if (!spermImg || !spermImg.complete) return;

    const sourceX = Math.floor(currentFrame) * frameWidth;
    const sourceY = 0;
    const destX = sperm.x - frameWidth / 2;
    const destY = sperm.y - frameHeight / 2;

    ctx.drawImage(
      spermImg,
      sourceX, sourceY, frameWidth, frameHeight,
      destX, destY, frameWidth, frameHeight
    );
  }

  drawHUD() {
    const { ctx, timeLeft, sperm } = this.gameState;
    
    ctx.fillStyle = "#fff";
    ctx.font = "18px sans-serif";
    ctx.fillText(timeLeft + "s", 10, 24);
    ctx.fillText("Score: " + Math.round(sperm.distance), 10, 48);
  }

  render() {
    this.clear();
    this.drawSprite();
    this.drawHUD();
  }
}

dbg("✅ renderer.js loaded");
