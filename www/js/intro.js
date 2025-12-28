window.addEventListener("load", () => {
  const intro = document.getElementById("studio-intro");
  const text  = document.getElementById("studio-text");
  if (!intro || !text) return;

  /* ===============================
     CRÉATION DE LA CELLULE
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
 // Taille de départ après la naissance
let baseScale = 1;

// Respiration bien visible
const breathAmplitude = 0.065;

// Croissance lente mais perceptible sur plusieurs cycles
const growthPerBreath = 0.006;

// Respiration lente
const breathDuration = 3400;

// Nombre max de respirations (évite qu’elle devienne énorme)
let breathCount = 0;
const maxBreaths = 6;

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

  // ?? la taille moyenne augmente APRÈS une respiration complète
  baseScale += growthPerBreath;
  breathCount++;

  setTimeout(breathe, breathDuration);
}

// Lancer la respiration juste après la naissance
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
}, 1800); // ? EXACTEMENT la fin de la naissance


  /* ===============================
     4) FIN INTRO (PROPRE)
     =============================== */
  setTimeout(() => {
    breathing = false; // stop respiration

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
      intro.remove();
    };

  }, 7000); // ?? laisse le temps de voir la respiration
});
