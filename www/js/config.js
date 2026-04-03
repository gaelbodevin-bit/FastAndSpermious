dbg("? config.js chargé");

/* ===========================================================
   CONFIG - Langues, Constantes, Configuration
   =========================================================== */

/* =======================
   LANGUES
   ======================= */

const LANG = {
  fr: {
    menuTitle: "Fast and Spermious",
    play15: "Niveau 15s",
    play30: "Niveau 30s",
    play60: "Niveau 60s",
    leaderboard: "Classement",
    shop: "Boutique",
    send: "Envoyer",
    distance: "Distance : ",
    gameOver: "Fin du niveau",
    menu: "Menu",
    leaderboardTitle: "Classement niveau",
    close: "Fermer",
    shopTitle: "Boutique de skins",
    shopTotalScore: "Score total :",
    shopOwned: "Déjà débloqué",
    shopEquip: "Équiper",
    shopEquipped: "Équipé",
    shopComingSoon: "Disponible prochainement",
    shopUnlockAt: "Débloqué dès {score} points",
    leaderboardSelectTitle: "Classement par niveaux",
    leaderboardSelectInstruction: "Choisissez un niveau.",
    back: "Retour",

    // MODAL INFO SKINS
    skinsInfoTitle: "🔓 Débloquer des skins",
    skinsInfoBody:
      "Les skins se débloquent en atteignant certains scores ou via des achats.",
    skinsInfoDontShow: "Ne plus afficher",
    skinsInfoOk: "Compris",
    shopUnlock: "Débloquer",
    shopUnlockedAt: "Débloqué à {score} pts",
    shopPremium: "Premium"
  },

  en: {
    menuTitle: "Fast and Spermious",
    play15: "15s Mode",
    play30: "30s Mode",
    play60: "60s Mode",
    leaderboard: "Leaderboard",
    shop: "Shop",
    send: "Send",
    distance: "Distance: ",
    gameOver: "End of level",
    menu: "Menu",
    leaderboardTitle: "Leaderboard",
    close: "Close",
    shopTitle: "Skin Shop",
    shopTotalScore: "Total score:",
    shopOwned: "Already unlocked",
    shopEquip: "Equip",
    shopEquipped: "Equipped",
    shopComingSoon: "Coming soon",
    shopUnlockAt: "Unlocked at {score} points",
    leaderboardSelectTitle: "Leaderboard by level",
    leaderboardSelectInstruction: "Choose a level.",
    back: "Back",

    // MODAL INFO SKINS
    skinsInfoTitle: "🔓 Unlock skins",
    skinsInfoBody:
      "Skins unlock by reaching certain scores or through purchases.",
    skinsInfoDontShow: "Don't show again",
    skinsInfoOk: "Got it",
    shopUnlock: "Unlock",
    shopUnlockedAt: "Unlocked at {score} pts",
    shopPremium: "Premium"
  },

  es: {
    menuTitle: "Fast and Spermious",
    play15: "Nivel 15s",
    play30: "Nivel 30s",
    play60: "Nivel 60s",
    leaderboard: "Clasificación",
    shop: "Tienda",
    send: "Enviar",
    distance: "Distancia: ",
    gameOver: "Fin del nivel",
    menu: "Menú",
    leaderboardTitle: "Clasificación nivel",
    close: "Cerrar",
    shopTitle: "Tienda de skins",
    shopTotalScore: "Puntuación total:",
    shopOwned: "Ya desbloqueado",
    shopEquip: "Equipar",
    shopEquipped: "Equipado",
    shopComingSoon: "Próximamente",
    shopUnlockAt: "Se desbloquea con {score} puntos",
    leaderboardSelectTitle: "Clasificación por niveles",
    leaderboardSelectInstruction: "Elige un nivel.",
    back: "Volver",

    // MODAL INFO SKINS
    skinsInfoTitle: "🔓 Desbloquear skins",
    skinsInfoBody:
      "Las skins se desbloquean al alcanzar ciertas puntuaciones o mediante compras.",
    skinsInfoDontShow: "No volver a mostrar",
    skinsInfoOk: "Entendido",
    shopUnlock: "Desbloquear",
    shopUnlockedAt: "Desbloqueado con {score} pts",
    shopPremium: "Premium"
  }
};

/* =======================
   LANG HELPERS
   ======================= */

// Détecter la langue du navigateur du téléphone

function detectDeviceLanguage() {
  const deviceLang = navigator.language || navigator.userLanguage;
  const langCode = deviceLang.split('-')[0].toLowerCase();
  
  // Langues supportées : fr, en, es
  const supportedLangs = ['fr', 'en', 'es'];
  
  if (supportedLangs.includes(langCode)) {
    dbg("Langue détectée1:", langCode);
    return langCode;
  }
  
  // Langue par défaut si non supportée
  return "fr";
}

let currentLang = detectDeviceLanguage();


function t(key) {
  if (LANG[currentLang] && key in LANG[currentLang]) {
    return LANG[currentLang][key];
  }
  if (LANG.fr && key in LANG.fr) {
    return LANG.fr[key];
  }
  return key;
}

function setLang(lang) {
  if (!LANG[lang]) return;
  currentLang = lang;
  localStorage.setItem("lang", lang);

  if (typeof applyLang === "function") applyLang();
  if (typeof refreshShopUI === "function") refreshShopUI();
}

/* =======================
   GAME CONSTANTS
   ======================= */

const GAME_CONFIG = {
  VERSION: "2026.04.03",

  // Sprite
  FRAME_SIZE: 256,
  DEFAULT_FRAMES: 6,
  SPRITE_SCALE: 0.6,

  // Physique
  SHAKE_THRESHOLD: 20,
  VELOCITY_DAMPING: 0.92,

  // Mouvement
  SPERM_AMPLITUDE: 30,
  SPERM_WAVE_SPEED: 0.04,

  // Animation
  FRAME_ANIMATION_SPEED: 0.08
};