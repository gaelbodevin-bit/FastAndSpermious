/* ===========================================================
   AD MANAGER — Pub interstitielle après chaque manche
   -----------------------------------------------------------
   - Premium (window.isPremium) : aucune pub.
   - Android : AdMob interstitiel (admob-plus-cordova), PRÉCHARGÉ.
   - Navigateur : overlay HTML "fausse pub" (5s) pour tester le flux.

   Principes :
   - onDone() est TOUJOURS appelé, exactement une fois → le jeu
     n'est JAMAIS bloqué.
   - L'annonce est préchargée à l'avance. À la fin d'une manche :
       • une annonce est prête → on l'affiche ;
       • sinon → on enchaîne IMMÉDIATEMENT (aucun délai) et on
         relance un préchargement pour la prochaine fois.
   =========================================================== */

(function () {
  const log = (...a) => (typeof dbg === "function" ? dbg(...a) : console.log(...a));

  // Bloc d'annonces interstitiel (AdMob)
  const INTERSTITIAL_ID = "ca-app-pub-1631547194835241/8222945184";

  let _interstitial = null;  // instance admob-plus réutilisée
  let _started      = false; // admob.start() déjà appelé
  let _evtBound     = false; // écouteurs liés une seule fois
  let _loaded       = false; // une annonce est prête
  let _loading      = false; // chargement en cours
  let _currentDone  = null;  // reprise de la manche en cours

  /* Initialise le SDK AdMob une seule fois (après deviceready) */
  async function startAdmob() {
    const admob = window.admob;
    if (!admob || _started) return;
    try {
      if (typeof admob.start === "function") await admob.start();
      _started = true;
    } catch (e) {
      log("⚠️ admob.start :", e && e.message);
    }
  }

  function getAd(admob) {
    if (!_interstitial) {
      _interstitial = new admob.InterstitialAd({ adUnitId: INTERSTITIAL_ID });
    }
    return _interstitial;
  }

  /* Événements de fermeture AdMob (liés une seule fois) */
  function bindEventsOnce(admob) {
    if (_evtBound || !admob || typeof admob.on !== "function") return;
    _evtBound = true;

    const resume = () => {
      const d = _currentDone;
      _currentDone = null;
      _loaded = false;            // annonce consommée
      if (typeof d === "function") d();
      preload();                  // prépare la suivante
    };

    const E = admob.events || {};
    [
      E.INTERSTITIAL_DISMISS, E.INTERSTITIAL_SHOW_FAIL, E.INTERSTITIAL_FAIL_TO_SHOW,
      "interstitialdismiss", "interstitialshowfail", "admob.interstitial.dismiss",
    ].filter(Boolean).forEach((n) => { try { admob.on(n, resume); } catch (e) {} });
  }

  /* Précharge une annonce en arrière-plan (non bloquant) */
  async function preload() {
    const admob = window.admob;
    if (!admob || !admob.InterstitialAd) return;
    if (_loaded || _loading) return;
    _loading = true;
    try {
      await startAdmob();
      bindEventsOnce(admob);
      await getAd(admob).load();
      _loaded = true;
    } catch (e) {
      _loaded = false;
      log("⚠️ Préchargement pub indisponible :", e && e.message);
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

    // Android — admob-plus-cordova
    if (admob && admob.InterstitialAd) {
      if (_loaded) {
        _currentDone = done;
        try {
          await getAd(admob).show();
          // Reprise normale sur l'événement "dismiss" ; garde-fou ultime :
          setTimeout(() => {
            if (_currentDone === done) { _currentDone = null; _loaded = false; done(); preload(); }
          }, 60000);
          return;
        } catch (e) {
          log("⚠️ Affichage pub :", e && e.message);
          _loaded = false;
          _currentDone = null;
          done();
          preload();
          return;
        }
      }

      // Aucune annonce prête → on n'attend PAS : on enchaîne et on précharge.
      done();
      preload();
      return;
    }

    // Fallback navigateur (dev) — overlay "fausse pub" 5 s
    showWebAd(done);
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
