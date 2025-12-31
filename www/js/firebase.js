// ==========================================================
//  Firebase – Fast and Spermious
//  Sécurisé : Auth anonyme + anti-spam (1 score / joueur / niveau)
//
//  Arborescence :
//  leaderboards/
//    15/
//      UID: { name, score, ts }
//    30/
//    60/
// ==========================================================

(function () {

  if (typeof firebase === "undefined") {
    console.error("❌ Firebase SDK non chargé");
    return;
  }

  /* =========================
     CONFIG
     ========================= */

  const firebaseConfig = {
    apiKey: "AIzaSyCeHwyUe32aOlCNjPZQxekfr9M6AxaJC-0",
    authDomain: "fast-and-spermious.firebaseapp.com",
    databaseURL: "https://fast-and-spermious-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "fast-and-spermious",
    storageBucket: "fast-and-spermious.appspot.com",
    messagingSenderId: "977624754717",
    appId: "1:977624754717:web:a30466f297977c570432a1"
  };

  /* =========================
     INIT FIREBASE
     ========================= */

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      dbg("✓ Firebase initialisé");
    }
  } catch (e) {
    console.error("❌ Erreur init Firebase:", e);
    return;
  }

  const db   = firebase.database();
  const auth = firebase.auth();

  window.firebaseDB = db;

  /* =========================
     AUTH ANONYME ROBUSTE
     ========================= */

  let currentUser = null;
  let authResolve;

  const authReady = new Promise(resolve => {
    authResolve = resolve;
  });

  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = user;
      dbg("✓ Firebase auth OK | UID =", user.uid);
      authResolve(user);
    }
  });

  auth.signInAnonymously().catch(err => {
    console.error("❌ Auth anonyme impossible:", err);
  });

  async function getFirebaseUser() {
    if (currentUser) return currentUser;
    return await authReady;
  }

  /* =========================
     SAVE SCORE (ANTI-SPAM)
     ========================= */

  async function firebaseSaveScore(scoreObj, level) {
    try {
      if (!scoreObj || typeof scoreObj.score === "undefined") {
        throw new Error("scoreObj invalide");
      }

      const lvl = Number(level);
      if (![15, 30, 60].includes(lvl)) {
        throw new Error("Niveau invalide: " + level);
      }

      const user = await getFirebaseUser();
      if (!user) {
        throw new Error("Utilisateur non authentifié");
      }

      const uid = user.uid;
      const ref = db.ref(`leaderboards/${lvl}/${uid}`);
      const snap = await ref.once("value");

      // ⛔ Anti-spam : on conserve uniquement le MEILLEUR score
      if (snap.exists() && snap.val().score >= scoreObj.score) {
        dbg("↪ Score ignoré (moins bon)");
        return { ok: true, skipped: true };
      }

      await ref.set({
        name: scoreObj.name || "Anonyme",
        score: Number(scoreObj.score) || 0,
        ts: Date.now()
      });

      dbg("✓ Score sauvegardé |", lvl, "s |", scoreObj.score);
      return { ok: true };

    } catch (err) {
      console.error("❌ Firebase saveScore:", err);
      return { ok: false, err: err.message || err };
    }
  }

  /* =========================
     LOAD LEADERBOARD (TOP 20)
     ========================= */

  async function firebaseLoadTop(level) {
    try {
      const lvl = Number(level);
      if (![15, 30, 60].includes(lvl)) {
        throw new Error("Niveau invalide: " + level);
      }

      const snap = await db
        .ref(`leaderboards/${lvl}`)
        .orderByChild("score")
        .limitToLast(20)
        .once("value");

      const raw = snap.val() || {};

      return Object.values(raw)
        .map(v => ({
          name: v.name || "?",
          score: Number(v.score || 0),
          ts: v.ts || 0
        }))
        .sort((a, b) => b.score - a.score);

    } catch (err) {
      console.error("❌ Firebase loadTop:", err);
      return [];
    }
  }

  /* =========================
     EXPORT GLOBAL
     ========================= */

  window.firebaseSaveScore = firebaseSaveScore;
  window.firebaseLoadTop  = firebaseLoadTop;

  dbg("✓ firebase.js chargé");

})();
