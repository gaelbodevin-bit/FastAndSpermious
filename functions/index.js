/* ============================================================
   FAST AND SPERMIOUS — Cloud Functions
   Vérification serveur des achats Google Play
   ------------------------------------------------------------
   Produits acceptés (achats uniques) :
     - premium_no_ads  → /users/{uid}/premium = true
     - skin_<id>       → /users/{uid}/paidSkins/{id} = true
   L'app envoie le reçu (productId + purchaseToken). La fonction
   le vérifie auprès de l'API Google Play et n'écrit le déblocage
   QUE si l'achat est authentique et valide. Ces chemins ne sont
   pas modifiables par l'app (règles RTDB) : impossible de tricher.
   ============================================================ */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const { google } = require("googleapis");
const crypto = require("crypto");

admin.initializeApp();

// Région Europe (proche de la base RTDB europe-west1)
// serviceAccount : compte invité dans la Play Console (autorisation "données
// financières / commandes"), nécessaire pour vérifier les achats via l'API Play.
setGlobalOptions({
  region: "europe-west1",
  maxInstances: 10,
  serviceAccount: "firebase-adminsdk-fbsvc@fast-and-spermious.iam.gserviceaccount.com",
});

// Nom du package de l'app (doit correspondre à config.xml)
const PACKAGE_NAME = "com.fast.spermious";

const PREMIUM_PRODUCT_ID = "premium_no_ads";
const SKIN_PREFIX = "skin_";

/* Identifie le produit acheté (ou null si inconnu) */
function resolveProduct(productId) {
  if (productId === PREMIUM_PRODUCT_ID) return { kind: "premium" };
  if (typeof productId === "string" && /^skin_[a-z0-9_]{1,60}$/.test(productId)) {
    return { kind: "skin", skinId: productId.slice(SKIN_PREFIX.length) };
  }
  return null;
}

/* Les jetons Google Play contiennent des "." (interdits dans les clés
   Firebase) → on stocke une empreinte SHA-256 du jeton comme clé. */
function tokenKey(purchaseToken) {
  return crypto.createHash("sha256").update(purchaseToken).digest("hex");
}

/* ------------------------------------------------------------
   Client Google Play Developer API
   Utilise le compte de service attaché à la fonction (ADC),
   lié à la Play Console.
------------------------------------------------------------ */
function getAndroidPublisher() {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  return google.androidpublisher({ version: "v3", auth });
}

/* ============================================================
   verifyPurchase — appelée par l'app après un achat approuvé
   data = { productId, purchaseToken }
   ============================================================ */
exports.verifyPurchase = onCall(async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Connexion requise.");
  }

  const productId = request.data && request.data.productId;
  const purchaseToken = request.data && request.data.purchaseToken;

  if (!productId || !purchaseToken || typeof purchaseToken !== "string") {
    throw new HttpsError("invalid-argument", "productId et purchaseToken requis.");
  }
  const product = resolveProduct(productId);
  if (!product) {
    throw new HttpsError("invalid-argument", "Produit inconnu.");
  }

  // 1) Vérification auprès de Google Play
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

  // purchaseState : 0 = acheté, 1 = annulé, 2 = en attente
  if (!purchase || purchase.purchaseState !== 0) {
    throw new HttpsError("failed-precondition", "Achat non valide ou annulé.");
  }

  // 2) Anti-partage : un même achat ne peut servir qu'à UN compte
  const db = admin.database();
  const tokenRef = db.ref("purchaseTokens/" + tokenKey(purchaseToken));
  const tokenSnap = await tokenRef.once("value");
  if (tokenSnap.exists() && tokenSnap.val().uid !== uid) {
    throw new HttpsError("already-exists", "Achat déjà utilisé par un autre compte.");
  }

  // 3) Déblocage
  if (product.kind === "premium") {
    await db.ref("users/" + uid + "/premium").set(true);
  } else {
    await db.ref("users/" + uid + "/paidSkins/" + product.skinId).set(true);
  }
  await tokenRef.set({
    uid: uid,
    productId: productId,
    orderId: purchase.orderId || null,
    verifiedAt: admin.database.ServerValue.TIMESTAMP,
  });

  // 4) Accuser réception auprès de Play (sinon remboursement auto sous 3 jours)
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

  return product.kind === "premium"
    ? { ok: true, premium: true }
    : { ok: true, skinId: product.skinId };
});

/* ============================================================
   restorePremium — restaure les achats à la connexion
   Renvoie { premium, paidSkins: [ids] } (la vérité reste côté serveur)
   ============================================================ */
exports.restorePremium = onCall(async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Connexion requise.");
  }
  const db = admin.database();
  const [premiumSnap, skinsSnap] = await Promise.all([
    db.ref("users/" + uid + "/premium").once("value"),
    db.ref("users/" + uid + "/paidSkins").once("value"),
  ]);
  const skins = skinsSnap.val() || {};
  return {
    premium: premiumSnap.val() === true,
    paidSkins: Object.keys(skins).filter((k) => skins[k] === true),
  };
});

/* ============================================================
   deleteAccount — suppression du compte et de TOUTES les données
   (droit à l'effacement RGPD, exigence Google Play)
   - players/{uid}, users/{uid} (Premium, skins achetés),
     leaderboard_total/{uid}, entrées de classement, jetons d'achat
   - puis le compte Firebase Authentication
   ============================================================ */
exports.deleteAccount = onCall(async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Connexion requise.");
  }
  const db = admin.database();
  const updates = {};

  updates["players/" + uid] = null;
  updates["users/" + uid] = null;
  updates["leaderboard_total/" + uid] = null;

  // Classements par niveau (entrées indexées par uid OU poussées avec un champ uid)
  for (const root of ["leaderboards", "scores"]) {
    for (const lvl of [15, 30, 60]) {
      const snap = await db.ref(root + "/" + lvl).once("value");
      snap.forEach((child) => {
        const v = child.val() || {};
        if (child.key === uid || v.uid === uid) {
          updates[root + "/" + lvl + "/" + child.key] = null;
        }
      });
    }
  }

  // Jetons d'achat rattachés à ce compte
  const tokens = await db.ref("purchaseTokens").orderByChild("uid").equalTo(uid).once("value");
  tokens.forEach((child) => { updates["purchaseTokens/" + child.key] = null; });

  await db.ref().update(updates);

  // Compte de connexion
  try {
    await admin.auth().deleteUser(uid);
  } catch (err) {
    if (!err || err.code !== "auth/user-not-found") {
      console.error("deleteUser:", err && err.message);
      throw new HttpsError("internal", "Suppression du compte impossible.");
    }
  }
  console.log("Compte supprimé:", uid, "| chemins effacés:", Object.keys(updates).length);
  return { ok: true };
});
