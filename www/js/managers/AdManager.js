/* ===========================================================
   AD MANAGER — Pub interstitielle après chaque manche
   -----------------------------------------------------------
   Plugin : admob-plus-cordova 2.x
     - événements PAR ANNONCE : ad.on("dismiss"), ad.on("showfail")
       (→ document "admob.ad.dismiss" / "admob.ad.showfail")
   Principes :
     - onDone() est TOUJOURS appelé, exactement une fois → le jeu
       n'est JAMAIS bloqué.
     - L'annonce est préchargée. Fin de manche :
         • annonce prête  → affichage, reprise à sa fermeture ;
         • pas prête      → on enchaîne IMMÉDIATEMENT.
     - Filets de sécurité si la fermeture n'est pas captée :
         • événement Android "resume" (la pub est une activité
           séparée : l'app revient au premier plan à sa fermeture) ;
         • délai maximum armé AVANT l'affichage.
   =========================================================== */

(function () {
  const log = (...a) => (typeof dbg === "function" ? dbg(...a) : console.log(...a));

  // Bloc d'annonces interstitiel (AdMob)
  const INTERSTITIAL_ID = "ca-app-pub-1631547194835241/8222945184";
  const SAFETY_MS = 45000;   // délai maximum d'une pub affichée

  let _ad            = null;  // InterstitialAd réutilisée
  let _started       = false; // admob.start() appelé
  let _loaded        = false; // une annonce est prête
  let _loading       = false; // chargement en cours
  let _currentDone   = null;  // reprise de la manche en cours
  let _safetyTimer   = null;
  let _resumeHandler = null;

  async function startAdmob(admob) {
    if (_started) return;
    if (typeof admob.start === "function") await admob.start();
    _started = true;
  }

  // Crée l'annonce une seule fois et branche SES événements (API du plugin)
  function getAd(admob) {
    if (_ad) return _ad;
    _ad = new admob.InterstitialAd({ adUnitId: INTERSTITIAL_ID });
    if (typeof _ad.on === "function") {
      _ad.on("dismiss",  () => finishAd("dismiss"));
      _ad.on("showfail", () => finishAd("showfail"));
    }
    return _ad;
  }

  // Termine l'affichage d'une pub (une seule fois) puis prépare la suivante
  function finishAd(reason) {
    if (_safetyTimer)   { clearTimeout(_safetyTimer); _safetyTimer = null; }
    if (_resumeHandler) { document.removeEventListener("resume", _resumeHandler, false); _resumeHandler = null; }
    _loaded = false;
    const d = _currentDone;
    _currentDone = null;
    if (typeof d === "function") {
      log("📺 Pub terminée :", reason);
      d();
    }
    setTimeout(preload, 1000);
  }

  // Précharge une annonce en arrière-plan (non bloquant)
  async function preload() {
    const admob = window.admob;
    if (!admob || !admob.InterstitialAd) return;
    if (_loaded || _loading || _currentDone) return;
    _loading = true;
    try {
      await startAdmob(admob);
      await getAd(admob).load();
      _loaded = true;
      log("📺 Pub préchargée");
    } catch (e) {
      _loaded = false;
      log("⚠️ Préchargement pub indisponible :", e && (e.message || e));
    } finally {
      _loading = false;
    }
  }

  /* -------------------------------------------------------
     API PUBLIQUE : showInterstitial(onDone)
     onDone() est TOUJOURS appelé, exactement une fois.
  ------------------------------------------------------- */
  async function showInterstitial(onDone) {
    const base = typeof onDone === "function" ? onDone : () => {};
    let called = false;
    const done = () => { if (called) return; called = true; base(); };

    // Premium → pas de pub
    if (window.isPremium) { done(); return; }

    const admob = window.admob;

    // Navigateur (dev) — overlay "fausse pub" 5 s
    if (!admob || !admob.InterstitialAd) { showWebAd(done); return; }

    // Aucune annonce prête → on n'attend PAS
    if (!_loaded) { done(); preload(); return; }

    // Annonce prête → affichage
    _currentDone = done;
    _safetyTimer = setTimeout(() => finishAd("délai max"), SAFETY_MS);
    try {
      await getAd(admob).show();
      // Filet : à la fermeture de la pub, Android ramène l'app au premier plan
      if (_currentDone === done) {
        _resumeHandler = () => setTimeout(() => finishAd("resume"), 400);
        document.addEventListener("resume", _resumeHandler, false);
      }
    } catch (e) {
      log("⚠️ Affichage pub :", e && (e.message || e));
      finishAd("erreur affichage");
    }
  }

  /* -------------------------------------------------------
     FALLBACK WEB : overlay 5 secondes
  ------------------------------------------------------- */
  function showWebAd(done) {
    let ov = document.getElementById("adOverlay");
    if (!ov) {
      ov = document.createElement("div");
      ov.id = "adOverlay";
      ov.innerHTML = `
        <div class="ad-title">${t("adTitle")}</div>
        <div class="ad-placeholder">${t("adSpace") || "Publicité"}</div>
        <div class="ad-counter"></div>
        <button class="ad-skip"></button>`;
      document.body.appendChild(ov);
    }

    const counter = ov.querySelector(".ad-counter");
    const skipBtn = ov.querySelector(".ad-skip");
    ov.querySelector(".ad-title").innerText = t("adTitle");

    ov.style.display = "flex";

    let secs = 5;
    counter.innerText = secs;
    skipBtn.innerText = t("adSkip");
    skipBtn.disabled  = true;

    const iv = setInterval(() => {
      secs--;
      counter.innerText = Math.max(secs, 0);
      if (secs <= 0) {
        clearInterval(iv);
        skipBtn.disabled  = false;
        counter.innerText = "";
      }
    }, 1000);

    skipBtn.onclick = () => {
      clearInterval(iv);
      ov.style.display = "none";
      done();
    };
  }

  // Préchargement dès que Cordova est prêt (+ si deviceready est déjà passé)
  document.addEventListener("deviceready", () => { preload(); }, false);
  if (window.admob) preload();

  window.showInterstitial = showInterstitial;
  log("✓ AdManager.js chargé");
})();
