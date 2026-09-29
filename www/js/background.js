/* ===========================================================
   BACKGROUND - Fonds de jeu animes (multi-themes)
   -----------------------------------------------------------
   5 themes : nebula (defaut), void, fire, clouds, liquid.
   Le theme choisi est stocke dans localStorage "bgTheme".
   Visible en menu ET pendant la partie (canvas de jeu transparent).
   API : window.setBgTheme(id), window.getBgTheme(), window.BG_THEMES
   =========================================================== */

(function () {
  const log = (...a) => (typeof dbg === "function" ? dbg(...a) : console.log(...a));

  const canvas = document.createElement("canvas");
  canvas.id = "bgCanvas";
  canvas.style.cssText = `
    position: fixed; top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 0;
    opacity: 0;
    transition: opacity .35s ease;
    pointer-events: none !important;
    touch-action: none !important;
    user-select: none;
  `;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  // Le fond animé n'est visible que pendant la partie (body.in-game)
  function updateVisibility() {
    canvas.style.opacity = document.body.classList.contains("in-game") ? "1" : "0";
  }
  window.showGameBackground = function () { document.body.classList.add("in-game"); updateVisibility(); };
  window.hideGameBackground = function () { document.body.classList.remove("in-game"); updateVisibility(); };

  let W, H, t = 0, parts = [], balls = [];

  const BG_THEMES = [
    { id: "nebula", key: "bgNebula", fallback: "Nebuleuse" },
    { id: "void",   key: "bgVoid",   fallback: "Vortex" },
    { id: "fire",   key: "bgFire",   fallback: "Feu" },
    { id: "clouds", key: "bgClouds", fallback: "Nuage" },
    { id: "liquid", key: "bgLiquid", fallback: "Liquide neon" },
  ];
  const DEFAULT_THEME = "nebula";

  let theme = localStorage.getItem("bgTheme") || DEFAULT_THEME;
  if (!BG_THEMES.some(x => x.id === theme)) theme = DEFAULT_THEME;

  const rnd = (a, b) => a + Math.random() * (b - a);

  function seedTheme() {
    parts = []; balls = [];
    if (theme === "nebula") {
      parts = Array.from({ length: 55 }, () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(.5, 2), tw: rnd(0, 6.28) }));
    } else if (theme === "void") {
      parts = Array.from({ length: 130 }, () => ({ a: rnd(0, 6.28), d: rnd(4, Math.max(W, H) * .7), sp: rnd(.002, .01) }));
    } else if (theme === "fire") {
      parts = Array.from({ length: 90 }, () => ({ x: rnd(0, W), y: rnd(H * .5, H), r: rnd(2, 7), s: rnd(.6, 2), life: rnd(0, 1), hue: rnd(10, 45) }));
    } else if (theme === "clouds") {
      parts = Array.from({ length: 9 }, () => ({ x: rnd(-60, W), y: rnd(H * .12, H * .88), r: rnd(50, 100), sp: rnd(.1, .4), a: rnd(.1, .25) }));
    } else if (theme === "liquid") {
      balls = Array.from({ length: 5 }, () => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - .5) * .004, vy: (Math.random() - .5) * .004, r: .18 + Math.random() * .12 }));
    }
  }

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    seedTheme();
  }

  function setBgTheme(id) {
    if (!BG_THEMES.some(x => x.id === id)) return;
    theme = id;
    localStorage.setItem("bgTheme", id);
    seedTheme();
  }
  function getBgTheme() { return theme; }

  function drawNebula() {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#120a2e"); g.addColorStop(1, "#04101f");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const cols = ["139,92,246", "34,228,219", "255,76,163"];
    for (let i = 0; i < 3; i++) {
      const cx = W * (.3 + .3 * Math.sin(t * 0.002 + i)) + i * 20;
      const cy = H * (.4 + .2 * Math.cos(t * 0.0015 + i));
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * .3);
      rg.addColorStop(0, `rgba(${cols[i]},0.22)`); rg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    }
    parts.forEach(p => {
      const a = .4 + .5 * Math.sin(t * 0.05 + p.tw);
      ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill();
    });
  }

  function drawVoid() {
    ctx.fillStyle = "#03030a"; ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
    cg.addColorStop(0, "rgba(139,92,246,.5)"); cg.addColorStop(1, "rgba(139,92,246,0)");
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, 60, 0, 6.28); ctx.fill();
    const maxD = Math.max(W, H) * .7;
    parts.forEach(p => {
      p.d -= p.sp * 40; p.a += p.sp * 2;
      if (p.d < 3) { p.d = maxD; p.a = rnd(0, 6.28); }
      const x = cx + Math.cos(p.a) * p.d, y = cy + Math.sin(p.a) * p.d * .7;
      const a = Math.max(0, 1 - p.d / maxD);
      ctx.fillStyle = `rgba(255,255,255,${(a * .9).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 6.28); ctx.fill();
    });
  }

  function drawFire() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0a0402"); g.addColorStop(.55, "#1c0a03"); g.addColorStop(1, "#3a1505");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const lg = ctx.createRadialGradient(W / 2, H, 10, W / 2, H, H * .7);
    lg.addColorStop(0, "rgba(255,120,20,0.35)"); lg.addColorStop(1, "rgba(255,120,20,0)");
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    parts.forEach(p => {
      p.y -= p.s; p.x += Math.sin(t * 0.05 + p.life * 6) * 0.4; p.life -= 0.004;
      if (p.y < H * .1 || p.life <= 0) { p.y = rnd(H * .7, H); p.x = rnd(0, W); p.life = 1; p.r = rnd(2, 7); }
      const a = Math.max(0, p.life);
      const rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2);
      rg.addColorStop(0, `hsla(${p.hue},100%,60%,${a * 0.9})`);
      rg.addColorStop(.5, `hsla(${p.hue - 5},100%,50%,${a * 0.4})`);
      rg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2, 0, 6.28); ctx.fill();
    });
  }

  function drawClouds() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#14213e"); g.addColorStop(.5, "#243c63"); g.addColorStop(1, "#3d5a8a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    parts.forEach(p => {
      p.x += p.sp; if (p.x - p.r > W) { p.x = -p.r * 2; p.y = rnd(H * .12, H * .88); }
      for (let k = 0; k < 5; k++) {
        const ox = Math.cos(k * 1.3) * p.r * .6, oy = Math.sin(k * 1.7) * p.r * .3;
        const rg = ctx.createRadialGradient(p.x + ox, p.y + oy, 2, p.x + ox, p.y + oy, p.r * .8);
        rg.addColorStop(0, `rgba(255,255,255,${p.a})`); rg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(p.x + ox, p.y + oy, p.r * .8, 0, 6.28); ctx.fill();
      }
    });
  }

  function drawLiquid() {
    const pulse = (Math.sin(t * 0.05) + 1) / 2;
    ctx.fillStyle = "#0a0018"; ctx.fillRect(0, 0, W, H);
    balls.forEach(b => {
      b.x += b.vx; b.y += b.vy;
      if (b.x < 0.1 || b.x > 0.9) b.vx *= -1;
      if (b.y < 0.1 || b.y > 0.9) b.vy *= -1;
    });
    const step = 10, R = (0.9 + pulse * 0.3), minDim = Math.min(W, H);
    for (let py = 0; py < H; py += step) {
      for (let px = 0; px < W; px += step) {
        let sum = 0;
        for (const b of balls) {
          const dx = px - b.x * W, dy = py - b.y * H;
          const rr = (b.r * minDim * R);
          sum += (rr * rr) / (dx * dx + dy * dy + 1);
        }
        if (sum > 1.0) {
          const hue = (t * 2 + px * 0.4 + py * 0.3) % 360;
          const a = Math.min(0.8, (sum - 1) * 0.5);
          ctx.fillStyle = `hsla(${hue},95%,60%,${a})`;
          ctx.fillRect(px, py, step, step);
        }
      }
    }
  }

  const RENDERERS = { nebula: drawNebula, void: drawVoid, fire: drawFire, clouds: drawClouds, liquid: drawLiquid };

  function loop() {
    t++;
    ctx.clearRect(0, 0, W, H);
    (RENDERERS[theme] || drawNebula)();
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(loop);

  window.setBgTheme = setBgTheme;
  window.getBgTheme = getBgTheme;
  window.BG_THEMES  = BG_THEMES;

  log("bg charge (theme: " + theme + ")");
})();
