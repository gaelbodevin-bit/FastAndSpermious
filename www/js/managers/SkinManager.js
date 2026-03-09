/* ===========================================================
   SKIN MANAGER - Gestion des skins (chargement, équipement)
   =========================================================== */

class SkinManager {
  constructor(playerState) {
    this.playerState = playerState;
    this.skins = [];
    this.loaded = false;
  }

  async load() {
    try {
      let url;
      
      if (window.cordova && cordova.file && cordova.file.applicationDirectory) {
        url = cordova.file.applicationDirectory + "www/skins.json";
        dbg("?? Chargement skins depuis APK:", url);
      } else {
        url = "skins.json?" + Date.now();
        dbg("?? Chargement skins depuis navigateur:", url);
      }

      // XMLHttpRequest pour compatibilité file://
      const httpRequest = new XMLHttpRequest();
      httpRequest.open('GET', url, false);
      httpRequest.send();
      
      if (httpRequest.status !== 200 && httpRequest.status !== 0) {
        throw new Error("HTTP " + httpRequest.status);
      }

      this.skins = JSON.parse(httpRequest.responseText);
      this.loaded = true;

      // Déverrouiller les skins "always"
      this.skins.forEach(skin => {
        if (skin.type === "always" && !this.playerState.ownedSkins.includes(skin.id)) {
          this.playerState.ownSkin(skin.id);
        }
      });

      // Vérifier que le skin équipé est valide
      if (!this.playerState.ownedSkins.includes(this.playerState.equippedSkin)) {
        this.playerState.equippedSkin = "base";
        this.playerState.save();
      }

      dbg("?? Skins chargés avec succès:", this.skins.length);
      return true;

    } catch (e) {
      dbg("? Erreur loadSkins:", e);
      return false;
    }
  }

  getCurrentSkin() {
    if (!this.loaded || this.skins.length === 0) return null;
    return this.skins.find(s => s.id === this.playerState.equippedSkin) || this.skins[0];
  }

  getSkinImagePath(skinId) {
    const skin = this.skins.find(s => s.id === skinId);
    if (!skin) return null;

    let imagePath = skin.img;
    if (window.cordova && cordova.file && cordova.file.applicationDirectory) {
      imagePath = cordova.file.applicationDirectory + "www/" + skin.img;
    }
    
    return imagePath;
  }

  getAvailableSkins() {
    return this.skins.map(skin => ({
      ...skin,
      owned: this.playerState.ownedSkins.includes(skin.id) || skin.type === "always",
      equipped: skin.id === this.playerState.equippedSkin,
      canUnlock: skin.type === "score" && this.playerState.totalScore >= skin.requiredScore
    }));
  }

  // ? Débloquer un skin si le score est suffisant
  unlockSkin(skinId) {
    const skin = this.skins.find(s => s.id === skinId);
    if (!skin) return { ok: false, err: "Skin introuvable" };

    if (this.playerState.ownedSkins.includes(skinId)) {
      return { ok: false, err: "Déjà débloqué" };
    }

    if (skin.type === "score") {
      if (this.playerState.totalScore < skin.requiredScore) {
        return { ok: false, err: "Score insuffisant" };
      }
      this.playerState.ownSkin(skinId);
      dbg("? Skin débloqué:", skinId);
      return { ok: true };
    }

    return { ok: false, err: "Type non débloquable" };
  }

  equipSkin(skinId) {
    if (this.playerState.equipSkin(skinId)) {
      dbg("? Skin équipé:", skinId);
      return true;
    }
    return false;
  }
}

dbg("? SkinManager.js chargé");