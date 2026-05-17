window.addEventListener("load", () => {
  const intro = document.getElementById("studio-intro");
  const text  = document.getElementById("studio-text");
  if (!intro || !text) return;

  // ? Lancer la musique d'intro ds le dbut de la cinmatique
  // On attend que window.game soit prt (charg aprs intro.js)
  // ? Lancer la musique intro uniquement pendant la cinématique
  // On attend que game soit prêt, mais on n'écoute pas de tap
  let introStarted = false;
  const tryPlayIntro = () => {
    if (introStarted) return;
    if (window.game?.sounds?.["intro"]) {
      introStarted = true;
      window.game.playMusic("intro");
    } else {
      setTimeout(tryPlayIntro, 100);
    }
  };
  // Lancer uniquement si l'intro est encore visible
  const introCheckInterval = setInterval(() => {
    if (!document.getElementById("studio-intro")) {
      clearInterval(introCheckInterval);
      return;
    }
    tryPlayIntro();
  }, 100);

  /* ===============================
     CRATION DE LA CELLULE
     =============================== */
  const cell = document.createElement("div");
  cell.style.width = "180px";
  cell.style.height = "180px";
  cell.style.background = "url('assets/studio/logo_cell.png') center / contain no-repeat";
  cell.style.opacity = "0";
  cell.style.transform = "scale(0.2)";
  cell.style.willChange = "transform, opacity";
  intro.insertBefore(cell, text);

  /* ===============================
     1) APPARITION / NAISSANCE
     =============================== */
  cell.animate(
    [
      { opacity: 0, transform: "scale(0.2)" },
      { opacity: 1, transform: "scale(1)" }
    ],
    {
      duration: 1800,
      easing: "ease-out",
      fill: "forwards"
    }
  );

  /* ===============================
     2) RESPIRATION ORGANIQUE
     =============================== */
  let baseScale       = 1;
  const breathAmplitude  = 0.065;
  const growthPerBreath  = 0.006;
  const breathDuration   = 3400;
  let breathCount        = 0;
  const maxBreaths       = 6;

  function breathe() {
    if (breathCount >= maxBreaths) return;
    const minScale = baseScale;
    const maxScale = baseScale + breathAmplitude;

    cell.animate(
      [
        { transform: `scale(${minScale})` },
        { transform: `scale(${maxScale})` },
        { transform: `scale(${minScale})` }
      ],
      {
        duration: breathDuration,
        easing: "ease-in-out",
        fill: "forwards"
      }
    );

    baseScale += growthPerBreath;
    breathCount++;
    setTimeout(breathe, breathDuration);
  }

  // Lancer la respiration juste aprs la naissance
  setTimeout(breathe, 1800);

  /* ===============================
     3) TEXTE (CALME, SYNCHRO)
     =============================== */
  setTimeout(() => {
    text.animate(
      [
        { opacity: 0, transform: "translateY(-6px)" },
        { opacity: 1, transform: "translateY(0)" }
      ],
      {
        duration: 700,
        easing: "ease-out",
        fill: "forwards"
      }
    );
  }, 1800);

  /* ===============================
     4) FIN INTRO (PROPRE)
     =============================== */
  setTimeout(() => {
    intro.animate(
      [
        { opacity: 1 },
        { opacity: 0 }
      ],
      {
        duration: 600,
        fill: "forwards"
      }
    ).onfinish = () => {
      clearInterval(introCheckInterval);
      intro.remove();
      window.game?.stopMusic();
      window.game?.playMusic("menu");
    };
  }, 7000);
});