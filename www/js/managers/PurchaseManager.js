/* ===========================================================
   PURCHASE MANAGER — Google Play Billing (cordova-plugin-purchase v13)
   -----------------------------------------------------------
   - Initialise le store, référence le produit premium_no_ads
   - À l'achat : envoie le reçu à la Cloud Function verifyPurchase
     qui vérifie auprès de Google Play AVANT d'activer le premium.
   - Restauration auto à la reconnexion via restorePremium.
   =========================================================== */

(function () {
  const log = (...a) => (typeof dbg === "function" ? dbg(...a) : console.log(...a));

  const PREMIUM_ID = "premium_no_ads";
  let storeReady = false;
  let premiumProduct = null;

  /* -------- Appel d'une Cloud Function (region europe-west1) -------- */
  function callFunction(name, data) {
    if (typeof firebase === "undefined" || !firebase.functions) {
      return Promise.reject(new Error("Firebase Functions indisponible"));
    }
    const fn = firebase.app().functions("europe-west1").httpsCallable(name);
    return fn(data || {}).then(res => res.data);
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

    store.register([{
      id: PREMIUM_ID,
      type: ProductType.NON_CONSUMABLE,
      platform: Platform.GOOGLE_PLAY,
    }]);

    // Quand un achat est approuvé → vérification serveur
    store.when()
      .approved(transaction => {
        log("🧾 Achat approuvé, vérification serveur…");
        return verifyWithServer(transaction)
          .then(() => transaction.verified ? transaction.verified() : null)
          .catch(err => log("❌ Vérif serveur:", err.message));
      })
      .verified(receipt => {
        if (receipt.finish) receipt.finish();
      })
      .finished(() => {
        log("✓ Transaction finalisée");
      });

    store.error(err => log("⚠️ Store error:", err && err.message));

    store.initialize([Platform.GOOGLE_PLAY]).then(() => {
      storeReady = true;
      premiumProduct = store.get(PREMIUM_ID, Platform.GOOGLE_PLAY);
      log("✓ Store initialisé");
    });
  }

  /* -------------------------------------------------------
     ACHAT
  ------------------------------------------------------- */
  async function purchasePremiumViaPlay() {
    if (!window.CdvPurchase) throw new Error("Store indisponible");
    const { store, Platform } = window.CdvPurchase;

    const product = premiumProduct || store.get(PREMIUM_ID, Platform.GOOGLE_PLAY);
    if (!product) throw new Error("Produit premium introuvable");

    const offer = product.getOffer();
    if (!offer) throw new Error("Offre indisponible");

    await store.order(offer);   // ouvre la fenêtre d'achat Google Play
  }

  /* -------------------------------------------------------
     VÉRIFICATION SERVEUR d'une transaction
  ------------------------------------------------------- */
  async function verifyWithServer(transaction) {
    const purchaseToken =
      transaction.purchaseToken ||
      (transaction.nativePurchase && transaction.nativePurchase.purchaseToken);

    if (!purchaseToken) throw new Error("purchaseToken manquant");

    const res = await callFunction("verifyPurchase", {
      productId: PREMIUM_ID,
      purchaseToken: purchaseToken,
    });

    if (res && res.premium) {
      window.isPremium = true;
      if (typeof updateAuthUI === "function") updateAuthUI();
      log("👑 Premium activé (vérifié serveur)");
    }
    return res;
  }

  /* -------------------------------------------------------
     RESTAURATION (à la reconnexion)
  ------------------------------------------------------- */
  async function restorePremium() {
    try {
      const res = await callFunction("restorePremium", {});
      if (res && res.premium) {
        window.isPremium = true;
        if (typeof updateAuthUI === "function") updateAuthUI();
      }
      return res && res.premium;
    } catch (e) {
      log("⚠️ restorePremium:", e.message);
      return false;
    }
  }

  // Init store quand Cordova est prêt
  document.addEventListener("deviceready", initStore, false);

  window.purchasePremiumViaPlay = purchasePremiumViaPlay;
  window.restorePremium         = restorePremium;

  log("✓ PurchaseManager.js chargé");
})();
