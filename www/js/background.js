/* ===========================================================
   BACKGROUND - Particules flottantes
   =========================================================== */

(function () {
  const canvas = document.createElement("canvas");
  canvas.id = "bgCanvas";
  canvas.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: -1;
    pointer-events: none !important;
    touch-action: none !important;
    user-select: none;
  `;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  // =====================
  // CONFIG PARTICULES
  // =====================
  const CONFIG = {
    count:       55,    // nombre de particules
    minRadius:   1.5,
    maxRadius:   4.5,
    minSpeed:    0.15,
    maxSpeed:    0.55,
    minOpacity:  0.08,
    maxOpacity:  0.45,
    // Palette dans le thème du jeu (rose / violet / cyan)
    colors: [
      "#ff4ca3",
      "#ff74c5",
      "#c44dff",
      "#7b2fff",
      "#3cf0ff",
      "#ffffff",
    ],
    // Lignes de connexion entre particules proches
    connectionDist: 120,
    connectionOpacity: 0.07,
  };

  let W, H, particles = [];

  // =====================
  // PARTICLE CLASS
  // =====================
  class Particle {
    constructor() { this.reset(true); }

    reset(init = false) {
      this.x      = Math.random() * W;
      this.y      = init ? Math.random() * H : H + 10;
      this.r      = CONFIG.minRadius + Math.random() * (CONFIG.maxRadius - CONFIG.minRadius);
      this.speed  = CONFIG.minSpeed  + Math.random() * (CONFIG.maxSpeed  - CONFIG.minSpeed);
      this.vx     = (Math.random() - 0.5) * 0.4;
      this.vy     = -this.speed;
      this.opacity = CONFIG.minOpacity + Math.random() * (CONFIG.maxOpacity - CONFIG.minOpacity);
      this.color  = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
      // Pulsation légère
      this.pulseSpeed  = 0.01 + Math.random() * 0.02;
      this.pulseOffset = Math.random() * Math.PI * 2;
      this.baseR = this.r;
    }

    update(t) {
      this.x += this.vx;
      this.y += this.vy;
      // Ondulation horizontale douce
      this.x += Math.sin(t * 0.001 + this.pulseOffset) * 0.3;
      // Pulsation du rayon
      this.r = this.baseR + Math.sin(t * this.pulseSpeed + this.pulseOffset) * 0.6;

      if (this.y < -10) this.reset();
      if (this.x < -10) this.x = W + 10;
      if (this.x > W + 10) this.x = -10;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(0.1, this.r), 0, Math.PI * 2);

      // Halo lumineux
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r * 2.5);
      grad.addColorStop(0,   hexAlpha(this.color, this.opacity));
      grad.addColorStop(0.5, hexAlpha(this.color, this.opacity * 0.4));
      grad.addColorStop(1,   hexAlpha(this.color, 0));

      ctx.fillStyle = grad;
      ctx.fill();
    }
  }

  // =====================
  // HELPERS
  // =====================
  function hexAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function init() {
    resize();
    particles = Array.from({ length: CONFIG.count }, () => new Particle());
  }

  // =====================
  // DRAW CONNECTIONS
  // =====================
  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONFIG.connectionDist) {
          const alpha = CONFIG.connectionOpacity * (1 - dist / CONFIG.connectionDist);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(255,76,163,${alpha.toFixed(3)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  // =====================
  // BOUCLE PRINCIPALE
  // =====================
  function loop(t) {
    ctx.clearRect(0, 0, W, H);

    // Fond dégradé chaud (noir ? prune très sombre)
    const bg = ctx.createLinearGradient(0, 0, W * 0.3, H);
    bg.addColorStop(0, "#0a0008");
    bg.addColorStop(0.5, "#08000f");
    bg.addColorStop(1, "#000510");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    drawConnections();
    particles.forEach(p => { p.update(t); p.draw(); });

    requestAnimationFrame(loop);
  }

  // =====================
  // INIT
  // =====================
  window.addEventListener("resize", resize);
  init();
  requestAnimationFrame(loop);

  dbg("? background.js chargé");
})();