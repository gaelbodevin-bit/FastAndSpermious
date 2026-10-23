/* ===========================================================
   PURCHASE MANAGER — Google Play Billing (cordova-plugin-purchase v13)
   -----------------------------------------------------------
   Produits (achats uniques, non consommables) :
     - premium_no_ads   → Premium (plus de pub)
     - skin_<id>        → un skin payant (skins.json, type "paid")
   À l'achat : le reçu est envoyé à la Cloud Function verifyPurchase,
   qui le vérifie auprès de Google Play AVANT tout déblocage.
   Les skins payants achetés sont enregistrés côté serveur dans
   users/{uid}/paidSkins (écriture réservée au serveur) et restaurés
   à chaque connexion.
   =========================================================== */

(function () {
  const log = (...a) => (typeof dbg === "function" ? dbg(...a) : console.log(...a));

  const PREMIUM_ID  = "premium_no_ads";
  const SKIN_PREFIX = "skin_";
  let storeReady = false;

  /* -------- Skins payants possédés (cache local, vérité côté serveur) -------- */
  function readPaidCache() {
    try {
      const a = JSON.parse(localStorage.getItem("paidSkins") || "[]");
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  window.paidSkins = readPaidCache();

  function setPaidSkins(list) {
    window.paidSkins = Array.from(new Set(list || []));
    try { localStorage.setItem("paidSkins", JSON.stringify(window.paidSkins)); } catch (e) {}
    // Garder la liste des skins possédés cohérente (nécessaire pour équiper)
    const ps = window.game && window.game.playerState;
    if (ps) window.paidSkins.forEach((id) => ps.ownSkin(id));
    if (typeof refreshShopUI === "function") refreshShopUI();
  }

  /* -------- Appel d'une Cloud Function (région europe-west1) -------- */
  function callFunction(name, data) {
    if (typeof firebase === "undefined" || !firebase.functions) {
      return Promise.reject(new Error("Firebase Functions indisponible"));
    }
    const fn = firebase.app().functions("europe-west1").httpsCallable(name);
    return fn(data || {}).then((res) => res.data);
  }

  /* -------- Liste des skins payants (skins.json) -------- */
  function paidSkinIds() {
    try {
      const sm = window.game && window.game.skinManager;
      if (sm && sm.loaded) return sm.skins.filter((s) => s.type === "paid").map((s) => s.id);
      const x = new XMLHttpRequest();
      x.open("GET", "skins.json", false);
      x.send();
      return JSON.parse(x.responseText).filter((s) => s.type === "paid").map((s) => s.id);
    } catch (e) {
      log("⚠️ Liste des skins payants :", e.message);
      return [];
    }
  }

  /* -------------------------------------------------------
     INIT du store (appelé après deviceready)
  ------------------------------------------------------- */
  function initStore() {
    if (!window.CdvPurchase) {
      log("ℹ️ CdvPurchase absent (hors app) — achats désactivés");
      return;
    }
    const { store, ProductType, Platform } = window.CdvPurchase;

    const products = [{ id: PREMIUM_ID, type: ProductType.NON_CONSUMABLE, platform: Platform.GOOGLE_PLAY }]
      .concat(paidSkinIds().map((id) => ({
        id: SKIN_PREFIX + id,
        type: ProductType.NON_CONSUMABLE,
        platform: Platform.GOOGLE_PLAY,
      })));
    store.register(products);

    // Achat approuvé par Google Play → vérification serveur → finalisation.
    // Si la vérification échoue, la transaction n'est PAS finalisée :
    // elle sera re-proposée au prochain lancement.
    store.when()
      .approved((transaction) => {
        log("🧾 Achat approuvé, vérification serveur…");
        return verifyWithServer(transaction)
          .then(() => transaction.finish())
          .catch((err) => {
            log("❌ Vérif serveur :", err && err.message);
            // Le paiement est passé : seule la validation a échoué. La transaction
            // n'est pas finalisée, elle sera revalidée au prochain lancement.
            if (typeof showAuthToast === "function") showAuthToast(t("purchasePending"), true);
          });
      })
      .finished(() => log("✓ Transaction finalisée"));

    store.error((err) => log("⚠️ Store error :", err && err.message));

    store.initialize([Platform.GOOGLE_PLAY]).then(() => {
      storeReady = true;
      log("✓ Store initialisé (" + products.length + " produits)");
      if (typeof refreshShopUI === "function") refreshShopUI(); // affiche les prix Play
    });
  }

  /* -------------------------------------------------------
     PRIX localisé d'un produit (ex. "0,99 €"), ou null
  ------------------------------------------------------- */
  function getProductPrice(productId) {
    try {
      if (!storeReady || !window.CdvPurchase) return null;
      const { store, Platform } = window.CdvPurchase;
      const p = store.get(productId, Platform.GOOGLE_PLAY);
      return (p && p.pricing && p.pricing.price) || null;
    } catch (e) { return null; }
  }

  /* -------------------------------------------------------
     ACHAT générique (ouvre la fenêtre Google Play)
  ------------------------------------------------------- */
  async function purchaseProduct(productId) {
    if (!window.CdvPurchase) throw new Error("Store indisponible");
    const { store, Platform, ErrorCode } = window.CdvPurchase;

    const product = store.get(productId, Platform.GOOGLE_PLAY);
    if (!product) throw new Error("Produit introuvable : " + productId);
    const offer = product.getOffer();
    if (!offer) throw new Error("Offre indisponible : " + productId);

    if (window.keepMusicForOverlay) window.keepMusicForOverlay();   // musique continue pendant la fenêtre d'achat
    const err = await store.order(offer);   // v13 : renvoie une erreur au lieu de rejeter
    if (err && !(ErrorCode && err.code === ErrorCode.PAYMENT_CANCELLED)) {
      throw new Error(err.message || "Achat impossible");
    }
  }

  function purchasePremiumViaPlay() {
    return purchaseProduct(PREMIUM_ID);
  }

  /* -------------------------------------------------------
     ACHAT D'UN SKIN (bouton "Acheter" de la boutique)
  ------------------------------------------------------- */
  async function buySkin(skinId) {
    // Achat réservé à l'app Android
    if (!window.CdvPurchase) {
      if (typeof showAuthToast === "function") showAuthToast(t("purchaseAppOnly"), true);
      return;
    }
    // Connexion obligatoire (l'achat est rattaché au compte)
    if (!window.authUser) {
      if (typeof showLoginRequired === "function") showLoginRequired(() => buySkin(skinId));
      return;
    }
    if (window.paidSkins.includes(skinId)) return;
    try {
      await purchaseProduct(SKIN_PREFIX + skinId);
    } catch (e) {
      log("❌ Achat skin :", e.message);
      if (typeof showAuthToast === "function") showAuthToast(t("purchaseError"), true);
    }
  }

  /* -------------------------------------------------------
     VÉRIFICATION SERVEUR d'une transaction
  ------------------------------------------------------- */
  async function verifyWithServer(transaction) {
    const purchaseToken =
      transaction.purchaseToken ||
      (transaction.nativePurchase && transaction.nativePurchase.purchaseToken);
    if (!purchaseToken) throw new Error("purchaseToken manquant");

    const productId = (transaction.products && transaction.products[0] && transaction.products[0].id) || PREMIUM_ID;

    const res = await callFunction("verifyPurchase", { productId, purchaseToken });

    if (res && res.premium) {
      window.isPremium = true;
      if (typeof updateAuthUI === "function") updateAuthUI();
      log("👑 Premium activé (vérifié serveur)");
    }
    if (res && res.skinId) {
      setPaidSkins(window.paidSkins.concat([res.skinId]));
      // Équiper directement le skin acheté
      const g = window.game;
      if (g && g.skinManager.equipSkin(res.skinId)) {
        g.updateCurrentSkin();
        if (typeof refreshShopUI === "function") refreshShopUI();
      }
      if (typeof showAuthToast === "function") showAuthToast(t("purchaseSkinOk"));
      log("🎨 Skin acheté (vérifié serveur) :", res.skinId);
    }
    return res;
  }

  /* -------------------------------------------------------
     RESTAURATION (à la connexion) : Premium + skins payants
     Renvoie le statut premium (booléen), comme avant.
  ------------------------------------------------------- */
  // Lecture DIRECTE dans Firebase (users/{uid}) : quasi instantané, pas de
  // démarrage à froid de Cloud Function. Sécurisé : le joueur peut lire ses
  // achats mais seules les Cloud Functions peuvent les écrire (règles RTDB).
  async function restorePremium() {
    const apply = (premium, skins) => {
      if (Array.isArray(skins)) setPaidSkins(skins);
      window.isPremium = premium === true;
      if (typeof updateAuthUI === "function") updateAuthUI();
      return window.isPremium;
    };
    try {
      const uid = window.authUser && window.authUser.uid;
      if (uid && window.firebaseDB) {
        const snap = await window.firebaseDB.ref("users/" + uid).once("value");
        const u = snap.val() || {};
        const skins = u.paidSkins || {};
        return apply(u.premium, Object.keys(skins).filter((k) => skins[k] === true));
      }
    } catch (e) {
      log("⚠️ Lecture achats Firebase :", e.message);
    }
    // Secours : Cloud Function
    try {
      const res = await callFunction("restorePremium", {});
      return apply(res && res.premium, res && res.paidSkins);
    } catch (e) {
      log("⚠️ restorePremium :", e.message);
      return false;
    }
  }

  // Init store quand Cordova est prêt
  document.addEventListener("deviceready", initStore, false);

  window.purchasePremiumViaPlay = purchasePremiumViaPlay;
  window.restorePremium         = restorePremium;
  window.buySkin                = buySkin;
  window.getProductPrice        = getProductPrice;
  window.SKIN_PRODUCT_PREFIX    = SKIN_PREFIX;

  log("✓ PurchaseManager.js chargé");
})();
