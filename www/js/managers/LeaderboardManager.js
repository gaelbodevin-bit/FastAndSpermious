dbg("? LeaderboardManager chargé");

/* ===========================================================
   LEADERBOARD MANAGER
   - Firebase Auth anonyme
   - 1 score max par joueur / niveau
   =========================================================== */

class LeaderboardManager {
  constructor() {
    if (!window.firebaseDB || !firebase.auth) {
      dbg("? Firebase non prêt dans LeaderboardManager");
      return;
    }

    this.db = window.firebaseDB;
    this.auth = firebase.auth();
  }

  /* ===========================================================
     SAVE SCORE
     - Un seul score par UID et par niveau
     - On garde uniquement le MEILLEUR
     =========================================================== */

  async saveScore(playerName, score, level) {
    try {
      const lvl = Number(level);
      if (![15, 30, 60].includes(lvl)) {
        throw new Error("Niveau invalide: " + level);
      }

      const user = this.auth.currentUser;
      if (!user) {
        throw new Error("Utilisateur non authentifié");
      }

      const uid = user.uid;
      const ref = this.db.ref(`leaderboards/${lvl}/${uid}`);

      const snap = await ref.once("value");
      const existing = snap.val();

      // ? Anti-spam : on garde le meilleur score uniquement
      if (existing && Number(existing.score) >= score) {
        dbg("? Score ignoré (moins bon)", score, "<=", existing.score);
        return { ok: true, skipped: true };
      }

      await ref.set({
        name: playerName || "Anonyme",
        score: Number(score),
        ts: Date.now()
      });

      dbg("? Score sauvegardé:", lvl, score);
      return { ok: true };

    } catch (err) {
      dbg("? Erreur saveScore:", err);
      return { ok: false, err: err.message || err };
    }
  }

  /* ===========================================================
     LOAD TOP SCORES
     =========================================================== */

  async loadTopScores(level, limit = 20) {
    try {
      const lvl = Number(level);
      if (![15, 30, 60].includes(lvl)) {
        throw new Error("Niveau invalide: " + level);
      }

      const snap = await this.db
        .ref(`leaderboards/${lvl}`)
        .orderByChild("score")
        .limitToLast(limit)
        .once("value");

      const raw = snap.val() || {};

      const list = Object.values(raw)
        .map(v => ({
          name: v.name || "?",
          score: Number(v.score || 0),
          ts: v.ts || 0
        }))
        .sort((a, b) => b.score - a.score);

      return list;

    } catch (err) {
      dbg("? Erreur loadTopScores:", err);
      return [];
    }
  }
}
