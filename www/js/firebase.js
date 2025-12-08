// ==========================================================
//  Firebase – Fast and Spermious
//  Arborescence :
//  scores/
//    15s/
//      -PUSHID: { name, score, ts }
//    30s/
//    60s/
// ==========================================================

(function () {
  if (typeof firebase === "undefined") {
    console.error("Firebase SDK non chargé (firebase.js)");
    return;
  }

  const firebaseConfig = {
    apiKey: "AIzaSyC9_psT-efferD3iCrvls5f9BsI7jp3HWC",
    authDomain: "fast-and-spermious-default-rtdb.europe-west1.firebasedatabase.app",
    databaseURL: "https://fast-and-spermious-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "fast-and-spermious",
    storageBucket: "fast-and-spermious.appspot.com",
    messagingSenderId: "977624754717",
    appId: "1:977624754717:web:a30466f297977c570432a1"
  };

  try {
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
      console.log("?? Firebase INIT OK");
    } else {
      console.log("?? Firebase déjà initialisé");
    }
  } catch (e) {
    console.error("ERREUR INIT FIREBASE", e);
    return;
  }

  const db = firebase.database();
  window.firebaseDB = db; // export global au cas où

  // --------------------------------------------------------
  //  Sauvegarde d'un score
  //  level = 15 / 30 / 60  => chemin "scores/15s"
  // --------------------------------------------------------
  async function firebaseSaveScore(scoreObj, level) {
    try {
      if (!db) throw new Error("Firebase non initialisé");

      const lvl = Number(level) || 0;
      if (![15, 30, 60].includes(lvl)) {
        throw new Error("Niveau invalide pour saveScore: " + level);
      }

      const path = "scores/" + lvl + "s";
      await db.ref(path).push(scoreObj);

      return { ok: true };
    } catch (err) {
      console.error("Erreur Firebase saveScore:", err);
      return { ok: false, err: err.message };
    }
  }

  // --------------------------------------------------------
  //  Chargement du classement pour un niveau
  //  level = 15 / 30 / 60  => lit "scores/15s"
  // --------------------------------------------------------
  async function firebaseLoadTop(level) {
    try {
      if (!db) throw new Error("Firebase non initialisé");

      const lvl = Number(level) || 0;
      if (![15, 30, 60].includes(lvl)) {
        throw new Error("Niveau invalide pour loadTop: " + level);
      }

      const path = "scores/" + lvl + "s";

      const snap = await db.ref(path).once("value");
      const raw = snap.val() || {};

      const list = Object.values(raw).map(v => ({
        name: v.name || "?",
        score: Number(v.score || 0),
        ts: v.ts || 0
      }));

      list.sort((a, b) => b.score - a.score);

      return list.slice(0, 20);
    } catch (err) {
      console.error("Erreur Firebase loadTop:", err);
      return [];
    }
  }

  // exposer les fonctions globalement
  window.firebaseSaveScore = firebaseSaveScore;
  window.firebaseLoadTop  = firebaseLoadTop;
})();
