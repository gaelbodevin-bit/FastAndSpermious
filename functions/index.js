/* ============================================================
   FAST AND SPERMIOUS — Cloud Functions
   Vérification serveur des achats Google Play (premium no-ads)
   ------------------------------------------------------------
   L'app envoie le reçu d'achat (productId + purchaseToken).
   La fonction vérifie ce reçu auprès de l'API Google Play,
   et n'écrit /users/{uid}/premium = true QUE si l'achat est
   authentique et valide. Impossible de tricher côté client.
   ============================================================ */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const { google } = require("googleapis");

admin.initializeApp();

// Région Europe (proche de la base RTDB europe-west1)
setGlobalOptions({ region: "europe-west1", maxInstances: 10 });

// Nom du package de l'app (doit correspondre à config.xml)
const PACKAGE_NAME = "com.fast.spermious";

// Le seul produit premium accepté
const PREMIUM_PRODUCT_ID = "premium_no_ads";

/* ------------------------------------------------------------
   Client Google Play Developer API
   Utilise le compte de service attaché à la fonction (ADC).
   → Voir README : lier un compte de service à la Play Console.
------------------------------------------------------------ */
function getAndroidPublisher() {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  return google.androidpublisher({ version: "v3", auth });
}

/* ============================================================
   verifyPurchase — appelée par l'app après un achat réussi
   data = { productId, purchaseToken }
   ============================================================ */
exports.verifyPurchase = onCall(async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Connexion requise.");
  }

  const productId = request.data && request.data.productId;
  const purchaseToken = request.data && request.data.purchaseToken;

  if (!productId || !purchaseToken) {
    throw new HttpsError("invalid-argument", "productId et purchaseToken requis.");
  }
  if (productId !== PREMIUM_PRODUCT_ID) {
    throw new HttpsError("invalid-argument", "Produit inconnu.");
  }

  let purchase;
  try {
    const publisher = getAndroidPublisher();
    const res = await publisher.purchases.products.get({
      packageName: PACKAGE_NAME,
      productId: productId,
      token: purchaseToken,
    });
    purchase = res.data;
  } catch (err) {
    console.error("Erreur API Play:", err && err.message);
    throw new HttpsError("internal", "Vérification Play impossible.");
  }

  /* purchaseState : 0 = acheté, 1 = annulé, 2 = en attente
     purchaseToken déjà consommé par un autre compte ? → on refuse */
  if (!purchase || purchase.purchaseState !== 0) {
    throw new HttpsError("failed-precondition", "Achat non valide ou annulé.");
  }

  // Anti-partage : vérifier que ce token n'a pas déjà servi pour un AUTRE uid
  const db = admin.database();
  const tokenRef = db.ref("purchaseTokens/" + purchaseToken);
  const tokenSnap = await tokenRef.once("value");
  if (tokenSnap.exists() && tokenSnap.val().uid !== uid) {
    throw new HttpsError("already-exists", "Achat déjà utilisé par un autre compte.");
  }

  // Tout est bon → activer le premium
  await db.ref("users/" + uid + "/premium").set(true);
  await tokenRef.set({
    uid: uid,
    productId: productId,
    orderId: purchase.orderId || null,
    verifiedAt: admin.database.ServerValue.TIMESTAMP,
  });

  // (Optionnel) accuser réception de l'achat auprès de Play
  try {
    if (purchase.acknowledgementState === 0) {
      const publisher = getAndroidPublisher();
      await publisher.purchases.products.acknowledge({
        packageName: PACKAGE_NAME,
        productId: productId,
        token: purchaseToken,
      });
    }
  } catch (err) {
    console.warn("Acknowledge non critique:", err && err.message);
  }

  return { ok: true, premium: true };
});

/* ============================================================
   restorePremium — restaure le premium à la reconnexion
   (relit simplement le flag ; la vérité reste côté serveur)
   ============================================================ */
exports.restorePremium = onCall(async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Connexion requise.");
  }
  const snap = await admin.database().ref("users/" + uid + "/premium").once("value");
  return { premium: snap.val() === true };
});
