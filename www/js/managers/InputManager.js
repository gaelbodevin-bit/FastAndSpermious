/* ===========================================================
   INPUT MANAGER - Gestion des entrées (shake, accélération)
   =========================================================== */

class InputManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.isActive = false;
  }

  init() {
    if (window.DeviceMotionEvent) {
      window.addEventListener("devicemotion", this.handleMotion.bind(this), true);
      this.isActive = true;
      dbg("📱 Shake active");
      return true;
    }
    dbg("⚠️ DeviceMotion not available");
    return false;
  }

  handleMotion(event) {
    const acceleration = event.accelerationIncludingGravity;
    if (!acceleration) return;
    
    const shakeIntensity = Math.abs(acceleration.x) + 
                           Math.abs(acceleration.y) + 
                           Math.abs(acceleration.z);
    
    if (shakeIntensity > GAME_CONFIG.SHAKE_THRESHOLD) {
      this.gameState.shakeForce = shakeIntensity;
    }
  }
}

dbg("✅ InputManager.js loaded");
