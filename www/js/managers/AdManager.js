/* ===========================================================
   AD MANAGER — Pub interstitielle après chaque manche
   -----------------------------------------------------------
   - Premium (window.isPremium) : aucune pub.
   - Android : AdMob interstitiel (admob-plus-cordova).
   - Navigateur : overlay HTML "fausse pub" (5s) pour tester le flux.
   - IMPORTANT : onDone() est TOUJOURS appelé (pub vue, sautée,
     échec de chargement, compte en validation, premium…) afin de
     ne JAMAIS bloquer le jeu.
   =========================================================== */

(function () {
  const log = (...a) => (typeof dbg === "function" ? dbg(...a) : console.log(...a));

  // Bloc d'annonces interstitiel (AdMob)
  const INTERSTITIAL_ID = "ca-app-pub-1631547194835241/8222945184";

  // Garde-fou : si l'annonce ne charge pas sous ce délai, on continue le jeu.
  const LOAD_TIMEOUT_MS = 3000;

  let _interstitial = null;  // instance admob-plus réutilisée
  let _evtBound = false;     // écouteurs d'événements liés une seule fois
  let _currentDone = null;   // callback de reprise de la manche en cours

  /* -------------------------------------------------------
     Lie une seule fois les événements de fermeture AdMob.
     Quelle que soit la version, on tente plusieurs noms.
  ------------------------------------------------------- */
  function bindEventsOnce(admob) {
    if (_evtBound || !admob || typeof admob.on !== "function") return;
    _evtBound = true;

    const fire = () => {
      const d = _currentDone;
      _currentDone = null;
      if (typeof d === "function") d();
    };

    const E = admob.events || {};
    const names = [
      E.INTERSTITIAL_DISMISS, E.INTERSTITIAL_SHOW_FAIL, E.INTERSTITIAL_FAIL_TO_SHOW,
      "interstitialdismiss", "interstitialshowfail", "admob.interstitial.dismiss",
    ].filter(Boolean);

    names.forEach((n) => { try { admob.on(n, fire); } catch (e) {} });
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
      bindEventsOnce(admob);
      _currentDone = done;

      try {
        if (!_interstitial) {
          _interstitial = new admob.InterstitialAd({ adUnitId: INTERSTITIAL_ID });
        }

        // Chargement borné : si l'annonce ne charge pas (compte AdMob en
        // validation, pas de remplissage, réseau…), on ne bloque pas le jeu.
        await Promise.race([
          _interstitial.load(),
          new Promise((_, rej) => setTimeout(() => rej(new Error("load-timeout")), LOAD_TIMEOUT_MS)),
        ]);

        await _interstitial.show();

        // show() a réussi : la reprise se fait sur l'événement "dismiss".
        // Garde-fou ultime si l'événement n'est jamais émis.
        setTimeout(() => { if (_currentDone === done) { _currentDone = null; done(); } }, 60000);
        return;
      } catch (err) {
        log("⚠️ AdMob indisponible, on continue :", err && err.message);
        _currentDone = null;
        done();  // on NE montre PAS de fausse pub sur mobile : on enchaîne.
        return;
      }
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

  window.showInterstitial = showInterstitial;
  log("✓ AdManager.js chargé");
})();
