// ==========================================================
//  Firebase – Fast and Spermious
//  Sécurisé : Auth anonyme + anti-spam (1 meilleur score / joueur / niveau)
//
//  Arborescence :
//  leaderboards/
//    15/
//      UID: { name, score, ts }
//    30/
//    60/
// ==========================================================

(function () {
  // dbg peut ne pas exister au moment où firebase.js charge
  const log = (...a) => (typeof dbg === "function" ? dbg(...a) : console.log(...a));
  const errlog = (...a) => console.error(...a);

  if (typeof firebase === "undefined") {
    errlog("❌ Firebase SDK non chargé");
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
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
      log("✓ Firebase initialisé");
    } else {
      log("✓ Firebase déjà initialisé");
    }
  } catch (e) {
    errlog("❌ Erreur init Firebase:", e);
    return;
  }

  const db = firebase.database();

  // Auth peut ne pas être dispo si firebase-auth n'est pas chargé
  if (!firebase.auth) {
    errlog("❌ firebase-auth.js non chargé (firebase.auth indisponible)");
    return;
  }

  const auth = firebase.auth();
  window.firebaseDB = db;

  /* =========================
     AUTH ANONYME ROBUSTE
     ========================= */
  let currentUser = null;

  // Promise résolue quand on a un user
  let authResolve, authReject;
  const authReady = new Promise((resolve, reject) => {
    authResolve = resolve;
    authReject = reject;
  });

  // On écoute l'état auth (résout la promise dès que user dispo)
  const unsubscribe = auth.onAuthStateChanged(
    (user) => {
      if (user) {
        currentUser = user;
        log("✓ Firebase auth OK | UID =", user.uid);
        authResolve(user);
        if (typeof unsubscribe === "function") unsubscribe(); // stop listener
      }
    },
    (e) => {
      errlog("❌ Auth state error:", e);
      authReject(e);
    }
  );

  // Démarre l'auth anonyme si pas déjà authentifié
  // (getFirebaseUser gère aussi ce cas)
  auth.signInAnonymously().catch((e) => {
    errlog("❌ Auth anonyme impossible:", e);
    // on ne reject pas forcément ici, car on peut être déjà connecté
  });

  async function getFirebaseUser(timeoutMs = 8000) {
    if (currentUser) return currentUser;

    // Si pas connecté, on tente à nouveau
    if (!auth.currentUser) {
      try {
        await auth.signInAnonymously();
      } catch (e) {
        // si ça échoue, on laisse authReady tenter de se résoudre via onAuthStateChanged
      }
    }

    // Attente avec timeout pour éviter un await infini
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout auth Firebase")), timeoutMs)
    );

    const user = await Promise.race([authReady, timeout]);
    currentUser = user;
    return user;
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
      if (!user || !user.uid) {
        throw new Error("Utilisateur non authentifié");
      }

      const uid = user.uid;

      const score = Number(scoreObj.score) || 0;
      const name = (scoreObj.name || "Anonyme").trim();

      const ref = db.ref(`leaderboards/${lvl}/${uid}`);
      const snap = await ref.once("value");

      const existing = snap.val();
      const existingScore = existing ? Number(existing.score || 0) : -Infinity;

      // ⛔ Anti-spam : on conserve uniquement le MEILLEUR score
      if (snap.exists() && existingScore >= score) {
        log("↪ Score ignoré (moins bon)", score, "<=", existingScore);
        return { ok: true, skipped: true };
      }

      await ref.set({
        name,
        score,
        ts: Date.now()
      });

      log("✓ Score sauvegardé |", lvl, "s |", score);
      return { ok: true };

    } catch (e) {
      errlog("❌ Firebase saveScore:", e);
      return { ok: false, err: e.message || String(e) };
    }
  }

  /* =========================
     LOAD LEADERBOARD (TOP 10)
     ========================= */
  async function firebaseLoadTop(level) {
    try {
      const lvl = Number(level);
      if (![15, 30, 60].includes(lvl)) {
        throw new Error("Niveau invalide: " + level);
      }

      // (optionnel) s'assurer d'être auth pour les rules auth != null
      await getFirebaseUser().catch(() => {});

      const snap = await db
        .ref(`leaderboards/${lvl}`)
        .orderByChild("score")
        .limitToLast(10)
        .once("value");

      const raw = snap.val() || {};

      return Object.values(raw)
        .map((v) => ({
          name: v.name || "?",
          score: Number(v.score || 0),
          ts: v.ts || 0
        }))
        .sort((a, b) => b.score - a.score);

    } catch (e) {
      errlog("❌ Firebase loadTop:", e);
      return [];
    }
  }

  /* =========================
     PLAYER DATA (score cumulé + skins)
     ========================= */

  async function savePlayerData(totalScore, ownedSkins) {
    try {
      const user = await getFirebaseUser();
      if (!user) throw new Error("Non authentifié");

      await db.ref(`players/${user.uid}`).set({
        totalScore: Number(totalScore) || 0,
        ownedSkins: ownedSkins || [],
        ts: Date.now()
      });

      log("✓ PlayerData sauvegardé | score:", totalScore);
      return { ok: true };
    } catch (e) {
      errlog("❌ savePlayerData:", e);
      return { ok: false, err: e.message };
    }
  }

  async function loadPlayerData() {
    try {
      const user = await getFirebaseUser();
      if (!user) throw new Error("Non authentifié");

      const snap = await db.ref(`players/${user.uid}`).once("value");
      const data = snap.val();

      if (!data) {
        log("ℹ️ Aucune donnée joueur sur Firebase");
        return null;
      }

      log("✓ PlayerData chargé | score:", data.totalScore);
      return {
        totalScore: Number(data.totalScore) || 0,
        ownedSkins: data.ownedSkins || []
      };
    } catch (e) {
      errlog("❌ loadPlayerData:", e);
      return null;
    }
  }

  /* =========================
     EXPORT GLOBAL
     ========================= */
  window.firebaseSaveScore = firebaseSaveScore;
  window.firebaseLoadTop   = firebaseLoadTop;
  window.getFirebaseUser   = getFirebaseUser;
  window.savePlayerData    = savePlayerData;
  window.loadPlayerData    = loadPlayerData;

  log("✓ firebase.js chargé");
})();