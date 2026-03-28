/* ===========================================================
   SKIN MANAGER - Gestion des skins (chargement, ùquipement)
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

      // XMLHttpRequest pour compatibilitù file://
      const httpRequest = new XMLHttpRequest();
      httpRequest.open('GET', url, false);
      httpRequest.send();
      
      if (httpRequest.status !== 200 && httpRequest.status !== 0) {
        throw new Error("HTTP " + httpRequest.status);
      }

      this.skins = JSON.parse(httpRequest.responseText);
      this.loaded = true;

      // ?? DEBUG : dÈverrouiller tous les skins pour les tests ó mettre false en prod !
      const DEBUG_UNLOCK_ALL = TRUE;

      this.skins.forEach(skin => {
        if (
          skin.type === "always" ||
          DEBUG_UNLOCK_ALL
        ) {
          if (!this.playerState.ownedSkins.includes(skin.id)) {
            this.playerState.ownSkin(skin.id);
          }
        }
      });

      // Vùrifier que le skin ùquipù est valide
      if (!this.playerState.ownedSkins.includes(this.playerState.equippedSkin)) {
        this.playerState.equippedSkin = "base";
        this.playerState.save();
      }

      dbg("?? Skins chargùs avec succùs:", this.skins.length);
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

  // ? Dùbloquer un skin si le score est suffisant
  unlockSkin(skinId) {
    const skin = this.skins.find(s => s.id === skinId);
    if (!skin) return { ok: false, err: "Skin introuvable" };

    if (this.playerState.ownedSkins.includes(skinId)) {
      return { ok: false, err: "Dùjù dùbloquù" };
    }

    if (skin.type === "score") {
      if (this.playerState.totalScore < skin.requiredScore) {
        return { ok: false, err: "Score insuffisant" };
      }
      this.playerState.ownSkin(skinId);
      dbg("? Skin dùbloquù:", skinId);
      return { ok: true };
    }

    return { ok: false, err: "Type non dùbloquable" };
  }

  equipSkin(skinId) {
    if (this.playerState.equipSkin(skinId)) {
      dbg("? Skin ùquipù:", skinId);
      return true;
    }
    return false;
  }
}

dbg("? SkinManager.js chargù");