/* ===========================================================
   AD MANAGER — Pub interstitielle après chaque manche
   -----------------------------------------------------------
   - Premium (window.isPremium) : aucune pub.
   - Android : AdMob interstitiel (cordova-plugin-admob-free).
   - Navigateur : overlay HTML "fausse pub" (5s) pour tester le flux.
   =========================================================== */

(function () {
  const log = (...a) => (typeof dbg === "function" ? dbg(...a) : console.log(...a));

  // Remplacer par le vrai bloc d'annonces AdMob avant publication
  const INTERSTITIAL_ID = "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX";

  let _interstitial = null; // instance admob-plus réutilisée

  /* -------------------------------------------------------
     API PUBLIQUE : showInterstitial(onDone)
     onDone() est TOUJOURS appelé (pub vue, sautée, ou premium).
  ------------------------------------------------------- */
  async function showInterstitial(onDone) {
    const done = typeof onDone === "function" ? onDone : () => {};

    // Premium → pas de pub
    if (window.isPremium) { done(); return; }

    // Android — admob-plus-cordova
    const admob = window.admob;
    if (admob && admob.InterstitialAd) {
      try {
        if (!_interstitial) {
          _interstitial = new admob.InterstitialAd({ adUnitId: INTERSTITIAL_ID });
        }
        // On rejoue onDone une fois la pub fermée (ou en cas d'échec)
        const finish = () => { done(); };
        admob.on && admob.on("interstitialdismiss", finish);

        await _interstitial.load();
        await _interstitial.show();
        // Fallback si l'event dismiss n'est pas capté (selon versions)
        setTimeout(finish, 500);
        return;
      } catch (err) {
        log("⚠️ AdMob :", err && err.message);
        showWebAd(done);
        return;
      }
    }

    // Fallback navigateur
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
