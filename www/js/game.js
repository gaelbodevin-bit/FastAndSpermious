/* ===========================================================
   GAME - Point d'entrée principal et boucle de jeu
   =========================================================== */

class Game {
  constructor() {
    dbg("? Game constructor");
    dbg("?? VERSION BUILD :", GAME_CONFIG.VERSION);
    
    // États
    this.playerState = new PlayerState();
    this.state = null;
    this.renderer = null;
    
    // Managers
    this.skinManager = new SkinManager(this.playerState);
    this.leaderboardManager = new LeaderboardManager();
    this.inputManager = null;
    
    // Canvas et image
    this.canvas = null;
    this.spermImg = new Image();
    
    // Boucle de jeu
    this.animationFrameId = null;
  }

  async init() {
    dbg("? Game init");
    
    // Récupérer le canvas
    this.canvas = document.getElementById("gameCanvas");
    if (!this.canvas) {
      dbg("? Erreur: canvas non trouvé");
      return false;
    }

    // Initialiser l'état du jeu
    this.state = new GameState(this.canvas, this.spermImg);
    this.renderer = new Renderer(this.state);
    this.inputManager = new InputManager(this.state);
    
    // Événements
    window.addEventListener("resize", () => this.state.resize());
    this.state.resize();
    
    // Input
    this.inputManager.init();
    
    // Charger les skins
    await this.skinManager.load();
    this.updateCurrentSkin();
    
    // UI
    applyLang();
    refreshShopUI();
    
    dbg("? Game initialisé");
    return true;
  }

  updateCurrentSkin() {
    const currentSkin = this.skinManager.getCurrentSkin();
    if (!currentSkin) return;

    const imagePath = this.skinManager.getSkinImagePath(currentSkin.id);
    if (imagePath) {
      this.spermImg.src = imagePath;
    }

    this.state.updateSpriteProperties(
      currentSkin.frameSize || GAME_CONFIG.FRAME_SIZE,
      currentSkin.frameSize || GAME_CONFIG.FRAME_SIZE,
      currentSkin.frames || GAME_CONFIG.DEFAULT_FRAMES
    );
  }

  start(duration) {
    dbg("?? START", duration);
    
    hidePanels();
    this.canvas.style.display = "block";
    
    this.state.reset(duration);
    this.loop();
  }

  loop() {
    if (!this.state.run) return;
    
    this.state.update();
    this.renderer.render();
    
    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  stop() {
    this.state.stop();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.onGameOver();
  }

  onGameOver() {
    const finalScore = this.state.getFinalScore();
    
    // Ajouter le score au total du joueur
    this.playerState.addScore(finalScore);
    refreshShopUI();
    
    // Afficher l'écran game over
    showGameOver(finalScore);
  }
}

/* ===========================================================
   FONCTIONS GLOBALES (appelées depuis index.html)
   =========================================================== */

function startGame(duration) {
  if (window.game) {
    window.game.start(duration);
  }
}

/* ===========================================================
   INITIALISATION
   =========================================================== */

window.onload = async () => {
  dbg("? window.onload");
  
  window.game = new Game();
  const initialized = await window.game.init();
  
  if (!initialized) {
    dbg("? Échec initialisation du jeu");
    return;
  }
  
  dbg("? Jeu prêt");
};

dbg("? game.js chargé");
