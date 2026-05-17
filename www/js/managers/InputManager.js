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
    // ? Utiliser acceleration sans gravité si dispo, sinon soustraire ~9.8
    const acc = event.acceleration || event.accelerationIncludingGravity;
    if (!acc) return;

    // Magnitude du mouvement réel (sans gravité statique)
    const ax = acc.x || 0;
    const ay = acc.y || 0;
    const az = acc.z || 0;

    // Si accelerationIncludingGravity, soustraire la composante statique
    const gravity = event.acceleration ? 0 : 9.8;
    const magnitude = Math.sqrt(ax * ax + ay * ay + Math.max(0, az - gravity) * Math.max(0, az - gravity));

    // ? Seuil plus élevé pour ignorer les micro-mouvements
    if (magnitude > GAME_CONFIG.SHAKE_THRESHOLD) {
      // Stocker la force brute pour models.js
      this.gameState.shakeForce = magnitude;
    }
  }
}

dbg("? InputManager.js chargé");