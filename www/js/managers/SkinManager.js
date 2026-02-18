/* ===========================================================
   SKIN MANAGER - Gestion des skins (chargement, équipement)
   =========================================================== */

class SkinManager {
  constructor(playerState) {
    this.playerState = playerState;
    this.skins = [];
    this.isLoaded = false;
  }

  async load() {
    try {
      let url;
      
      if (window.cordova && cordova.file && cordova.file.applicationDirectory) {
        url = cordova.file.applicationDirectory + "www/skins.json";
        dbg("📱 Loading skins from APK:", url);
      } else {
        url = "skins.json?" + Date.now();
        dbg("🌐 Loading skins from browser:", url);
      }

      // XMLHttpRequest pour compatibilité file://
      const httpRequest = new XMLHttpRequest();
      httpRequest.open('GET', url, false);
      httpRequest.send();
      
      if (httpRequest.status !== 200 && httpRequest.status !== 0) {
        throw new Error("HTTP " + httpRequest.status);
      }

      this.skins = JSON.parse(httpRequest.responseText);
      this.isLoaded = true;

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

      dbg("🎉 Skins loaded successfully:", this.skins.length);
      return true;

    } catch (error) {
      dbg("❌ Error loading skins:", error);
      return false;
    }
  }

  getCurrentSkin() {
    if (!this.isLoaded || this.skins.length === 0) return null;
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

  equipSkin(skinId) {
    if (this.playerState.equipSkin(skinId)) {
      dbg("🎽 Skin equipped:", skinId);
      return true;
    }
    return false;
  }
}

dbg("✅ SkinManager.js loaded");
