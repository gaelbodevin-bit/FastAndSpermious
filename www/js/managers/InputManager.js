/* ===========================================================
   INPUT MANAGER - Gestion des entrées (shake, accélération)
   =========================================================== */

class InputManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.enabled = false;
  }

  init() {
    if (window.DeviceMotionEvent) {
      window.addEventListener("devicemotion", this.handleMotion.bind(this), true);
      this.enabled = true;
      dbg("? Shake actif");
      return true;
    }
    dbg("? DeviceMotion non disponible");
    return false;
  }

  handleMotion(event) {
    const acceleration = event.accelerationIncludingGravity;
    if (!acceleration) return;
    
    const magnitude = Math.abs(acceleration.x) + 
                     Math.abs(acceleration.y) + 
                     Math.abs(acceleration.z);
    
    if (magnitude > GAME_CONFIG.SHAKE_THRESHOLD) {
      this.gameState.shakeForce = magnitude;
    }
  }
}

dbg("? InputManager.js chargé");
