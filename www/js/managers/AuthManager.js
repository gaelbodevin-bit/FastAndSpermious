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

      window.isPremium = (typeof restorePremium === "function") ? await restorePremium() : await checkPremium();
      hideLoginOverlay();
      updateAuthUI();

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
    showLoginOverlay();
    updateAuthUI();
  }

  /* -------------------------------------------------------
     PREMIUM
  ------------------------------------------------------- */
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
     OVERLAY DE CONNEXION (bloque le jeu)
  ------------------------------------------------------- */
  function showLoginOverlay() {
    let ov = document.getElementById("loginOverlay");
    if (!ov) {
      ov = document.createElement("div");
      ov.id = "loginOverlay";
      ov.innerHTML = `
        <div class="login-box">
          <h1>Fast and Spermious</h1>
          <p id="loginSubtitle">Connecte-toi pour jouer</p>
          <button id="googleLoginBtn" class="google-btn">
            <span>Se connecter avec Google</span>
          </button>
        </div>`;
      document.body.appendChild(ov);
      document.getElementById("googleLoginBtn").onclick = () => signInWithGoogle();
    }
    ov.style.display = "flex";
  }

  function hideLoginOverlay() {
    const ov = document.getElementById("loginOverlay");
    if (ov) ov.style.display = "none";
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
        userLabel.innerHTML = "";
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

    // Récupérer une session Google déjà ouverte (persistée par Firebase)
    const existing = auth.currentUser;
    if (existing && !existing.isAnonymous) {
      window.authUser  = existing;
      window.isPremium = (typeof restorePremium === "function") ? await restorePremium() : await checkPremium();
      hideLoginOverlay();
      updateAuthUI();
      log("✓ Session Google restaurée :", existing.displayName);
      return;
    }

    // Sinon, on bloque avec l'overlay de connexion
    showLoginOverlay();
    updateAuthUI();
  }

  /* -------------------------------------------------------
     EXPORT GLOBAL
  ------------------------------------------------------- */
  window.signInWithGoogle = signInWithGoogle;
  window.signOutGoogle    = signOutGoogle;
  window.checkPremium     = checkPremium;
  window.setPremiumDev    = setPremiumDev;
  window.buyPremium       = buyPremium;
  window.initAuth         = initAuth;
  window.updateAuthUI     = updateAuthUI;

  log("✓ AuthManager.js chargé");
})();
