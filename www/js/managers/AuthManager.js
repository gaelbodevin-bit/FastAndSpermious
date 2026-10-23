/* ===========================================================
   AUTH MANAGER — Connexion Google obligatoire + statut Premium
   -----------------------------------------------------------
   - Web (navigateur)  : signInWithPopup(GoogleAuthProvider)
   - Cordova (Android) : cordova-plugin-googleplus → credential
   - Le jeu reste bloqué (overlay) tant que non connecté.
   - Premium stocké dans Firebase : /users/{uid}/premium
   =========================================================== */

(function () {
  const log = (...a) => (typeof dbg === "function" ? dbg(...a) : console.log(...a));

  // ID client Web OAuth (Firebase → Auth → Google → ID client Web)
  const WEB_CLIENT_ID =
    "791766983410-auisv28tqpmqk0qfrl6rftth5pdlou2t.apps.googleusercontent.com";

  window.authUser  = null;   // user Firebase connecté
  window.isPremium = false;  // flag premium

  /* -------------------------------------------------------
     CONNEXION GOOGLE
  ------------------------------------------------------- */
  async function signInWithGoogle() {
    if (typeof firebase === "undefined" || !firebase.auth) {
      return { ok: false, err: "Firebase indisponible" };
    }
    const auth = firebase.auth();

    try {
      let result;

      if (window.cordova && window.plugins && window.plugins.googleplus) {
        // --- Android natif ---
        // Musique continue pendant la fenêtre de choix du compte Google
        if (window.keepMusicForOverlay) window.keepMusicForOverlay();
        const gp = await new Promise((res, rej) =>
          window.plugins.googleplus.login({ webClientId: WEB_CLIENT_ID }, res, rej)
        );
        const credential = firebase.auth.GoogleAuthProvider.credential(gp.idToken);
        result = await auth.signInWithCredential(credential);
      } else {
        // --- Navigateur (dev) ---
        const provider = new firebase.auth.GoogleAuthProvider();
        result = await auth.signInWithPopup(provider);
      }

      window.authUser = result.user;
      log("✓ Connecté Google :", result.user.displayName);

      // Nom joueur par défaut = nom Google
      if (result.user.displayName) {
        localStorage.setItem("playerName", result.user.displayName);
      }

      updateAuthUI();        // connecté tout de suite
      refreshPurchases();    // Premium + skins achetés en arrière-plan (ne bloque pas)

      return { ok: true, user: result.user };
    } catch (e) {
      log("❌ Sign-in Google :", e.message || e);
      return { ok: false, err: e.message || String(e) };
    }
  }

  async function signOutGoogle() {
    try {
      if (window.cordova && window.plugins && window.plugins.googleplus) {
        await new Promise(res => window.plugins.googleplus.logout(res, res));
      }
      await firebase.auth().signOut();
    } catch (e) {
      log("⚠️ signOut :", e.message);
    }
    window.authUser  = null;
    window.isPremium = false;
    updateAuthUI();
  }

  /* -------------------------------------------------------
     PREMIUM
  ------------------------------------------------------- */
  // Restaure Premium + skins achetés sans bloquer l'interface
  function refreshPurchases() {
    const p = (typeof restorePremium === "function")
      ? restorePremium()
      : checkPremium().then((v) => { window.isPremium = v; updateAuthUI(); return v; });
    return Promise.resolve(p).catch(() => false);
  }

  async function checkPremium() {
    try {
      const uid = window.authUser?.uid;
      if (!uid || !window.firebaseDB) return false;
      const snap = await window.firebaseDB.ref(`users/${uid}/premium`).once("value");
      return snap.val() === true;
    } catch (e) {
      log("⚠️ checkPremium :", e.message);
      return false;
    }
  }

  // NB : le premium n'est plus écrit côté client (non sécurisé).
  //      C'est la Cloud Function verifyPurchase qui l'active après
  //      vérification du reçu Play. setPremium ne sert qu'au mode dev.
  async function setPremiumDev() {
    const uid = window.authUser?.uid;
    if (!uid || !window.firebaseDB) return false;
    await window.firebaseDB.ref(`users/${uid}/premium`).set(true);
    window.isPremium = true;
    updateAuthUI();
    return true;
  }

  /* -------------------------------------------------------
     ACHAT PREMIUM — via Cloud Function (vérif serveur)
  ------------------------------------------------------- */
  async function buyPremium() {
    if (!window.authUser) {
      await signInWithGoogle();
      if (!window.authUser) return;
    }

    // Google Play Billing (Android)
    if (window.cordova && window.CdvPurchase) {
      try {
        await purchasePremiumViaPlay();   // défini dans PurchaseManager.js
      } catch (e) {
        log("❌ Achat annulé :", e);
      }
      return;
    }

    // Fallback dev (navigateur) — pas de Play Billing hors app
    if (confirm("Activer Premium (mode dev) ?")) {
      await setPremiumDev();
      log("✓ Premium activé (dev)");
    }
  }

  /* -------------------------------------------------------
     UI (bouton premium + label utilisateur dans le menu)
  ------------------------------------------------------- */
  function updateAuthUI() {
    const premiumBtn = document.getElementById("btnPremium");
    if (premiumBtn) {
      premiumBtn.style.display = window.authUser ? "block" : "none";
      premiumBtn.innerText = window.isPremium ? t("premiumActive") : t("premiumBtn");
      premiumBtn.disabled  = window.isPremium;
    }
    const userLabel = document.getElementById("userLabel");
    if (userLabel) {
      if (window.authUser) {
        const name = window.authUser.displayName || window.authUser.email || "";
        userLabel.innerHTML =
          `<span class="user-name">${name}</span>` +
          `<button class="profile-btn" onclick="openProfile()" aria-label="Profil">👤</button>`;
      } else {
        userLabel.innerHTML =
          `<button class="login-btn-menu" onclick="handleLoginGoogle()">${t("loginGoogle")}</button>`;
      }
    }
  }

  /* -------------------------------------------------------
     INIT — appelé par game.js après init Firebase
  ------------------------------------------------------- */
  async function initAuth() {
    if (typeof firebase === "undefined" || !firebase.auth) {
      log("❌ initAuth : Firebase auth indisponible");
      return;
    }
    const auth = firebase.auth();

    // Restaurer une session Google déjà ouverte (persistée par Firebase)
    const existing = auth.currentUser;
    if (existing && !existing.isAnonymous) {
      window.authUser  = existing;
      refreshPurchases();    // en arrière-plan : ne retarde pas l'arrivée au menu
      log("✓ Session Google restaurée :", existing.displayName);
    }
    // Sinon : pas de blocage. Le menu est accessible, connexion optionnelle.
    // La connexion sera demandée au moment de lancer un niveau.
    updateAuthUI();
  }

  /* -------------------------------------------------------
     POPUP "Connexion requise pour jouer"
  ------------------------------------------------------- */
  function showLoginRequired(afterLogin) {
    window._pendingAfterLogin = (typeof afterLogin === "function") ? afterLogin : null;

    let modal = document.getElementById("loginRequiredModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "loginRequiredModal";
      modal.className = "modal";
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div class="modal-content login-required">
        <h2>${t("loginRequiredTitle")}</h2>
        <p>${t("loginRequiredText")}</p>
        <button class="google-btn" onclick="handleLoginGoogle()">
          <span>${t("loginGoogle")}</span>
        </button>
        <button class="menu-btn ghost" onclick="closeLoginRequired()">${t("close") || "Fermer"}</button>
      </div>`;
    modal.style.display = "flex";
  }

  function closeLoginRequired() {
    const m = document.getElementById("loginRequiredModal");
    if (m) m.style.display = "none";
    window._pendingAfterLogin = null;
  }

  /* -------------------------------------------------------
     Handler bouton "Se connecter" (menu)
  ------------------------------------------------------- */
  // Toast visible (diagnostic + UX connexion)
  function showAuthToast(msg, isError) {
    let el = document.getElementById("authToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "authToast";
      el.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);"
        + "max-width:90%;padding:12px 18px;border-radius:12px;z-index:99999;"
        + "font-family:sans-serif;font-size:14px;font-weight:600;color:#fff;"
        + "box-shadow:0 8px 24px rgba(0,0,0,.5);text-align:center;word-break:break-word;";
      document.body.appendChild(el);
    }
    el.style.background = isError ? "#B3123A" : "#0E7C5A";
    el.textContent = msg;
    el.style.display = "block";
    clearTimeout(window._authToastT);
    window._authToastT = setTimeout(() => { el.style.display = "none"; }, isError ? 9000 : 3500);
  }
  window.showAuthToast = showAuthToast;

  async function handleLoginGoogle() {
    showAuthToast("Connexion en cours\u2026");
    const hasPlugin = !!(window.cordova && window.plugins && window.plugins.googleplus);
    const r = await signInWithGoogle();
    // Le sélecteur de compte Google met l'app en pause → on relance la musique au retour
    if (window.game && typeof window.game.resumeMusic === "function") window.game.resumeMusic();
    // Fin de la fenêtre Google : on revient au comportement normal (pause si l'app passe en fond)
    setTimeout(() => { window._keepMusicOverlay = false; }, 1500);
    if (r && r.ok) {
      showAuthToast("Connect\u00e9 : " + (r.user.displayName || r.user.email || ""));
      closeLoginRequired();
      updateAuthUI();
      // Reprendre l'action qui attendait la connexion (ex: lancer un niveau)
      if (typeof window._pendingAfterLogin === "function") {
        const cb = window._pendingAfterLogin;
        window._pendingAfterLogin = null;
        cb();
      }
    } else {
      const code = (r && r.err) ? r.err : "inconnu";
      showAuthToast("\u00c9chec connexion" + (hasPlugin ? "" : " [plugin googleplus absent]") + " : " + code, true);
    }
    return r;
  }

  /* -------------------------------------------------------
     EXPORT GLOBAL
  ------------------------------------------------------- */
  window.signInWithGoogle = signInWithGoogle;
  window.handleLoginGoogle = handleLoginGoogle;
  window.showLoginRequired = showLoginRequired;
  window.closeLoginRequired = closeLoginRequired;
  window.signOutGoogle    = signOutGoogle;
  window.checkPremium     = checkPremium;
  window.setPremiumDev    = setPremiumDev;
  window.buyPremium       = buyPremium;
  window.initAuth         = initAuth;
  window.updateAuthUI     = updateAuthUI;

  log("✓ AuthManager.js chargé");
})();
