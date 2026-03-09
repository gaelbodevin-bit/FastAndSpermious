dbg("? LeaderboardManager chargé");

/* ===========================================================
   LEADERBOARD MANAGER
   - Firebase Auth anonyme
   - Top 10 scores par niveau (toutes entrées confondues)
   - Structure : leaderboards/{level}/{pushId}
   =========================================================== */

class LeaderboardManager {
  constructor() {
    if (!window.firebaseDB || !firebase.auth) {
      dbg("? Firebase non prêt dans LeaderboardManager");
      return;
    }

    this.db   = window.firebaseDB;
    this.auth = firebase.auth();
  }

  /* ===========================================================
     SAVE SCORE
     - Chaque soumission crée une nouvelle entrée (push)
     - On garde les 10 meilleurs scores au total par niveau
     - Anti-spam : on vérifie que le score dépasse le 10e score actuel
     =========================================================== */

  async saveScore(playerName, score, level) {
    try {
      const lvl = Number(level);
      if (![15, 30, 60].includes(lvl)) {
        throw new Error("Niveau invalide : " + level);
      }

      const user = this.auth.currentUser;
      if (!user) {
        throw new Error("Utilisateur non authentifié");
      }

      const ref = this.db.ref(`leaderboards/${lvl}`);

      // Récupérer les 10 meilleurs scores actuels
      const snap = await ref
        .orderByChild("score")
        .limitToLast(10)
        .once("value");

      const raw = snap.val() || {};
      const entries = Object.entries(raw).map(([key, v]) => ({
        key,
        score: Number(v.score || 0)
      }));

      // Si on a déjà 10 scores, vérifier que le nouveau est meilleur que le 10e
      if (entries.length >= 10) {
        const minScore = Math.min(...entries.map(e => e.score));
        if (score <= minScore) {
          dbg("?? Score ignoré (pas dans le top 10) :", score, "<= min", minScore);
          return { ok: true, skipped: true };
        }

        // Supprimer le plus bas pour garder max 10 entrées
        const lowestEntry = entries.find(e => e.score === minScore);
        if (lowestEntry) {
          await this.db.ref(`leaderboards/${lvl}/${lowestEntry.key}`).remove();
          dbg("??? Score le plus bas supprimé :", minScore);
        }
      }

      // Ajouter le nouveau score avec un push (clé unique)
      await ref.push({
        name:  playerName || "Anonyme",
        score: Number(score),
        uid:   user.uid,
        ts:    Date.now()
      });

      dbg("? Score sauvegardé :", lvl, score);
      return { ok: true };

    } catch (err) {
      dbg("? Erreur saveScore :", err);
      return { ok: false, err: err.message || err };
    }
  }

  /* ===========================================================
     LOAD TOP SCORES
     - Retourne les 10 meilleurs scores triés du plus haut au plus bas
     =========================================================== */

  async loadTopScores(level, limit = 10) {
    try {
      const lvl = Number(level);
      if (![15, 30, 60].includes(lvl)) {
        throw new Error("Niveau invalide : " + level);
      }

      const snap = await this.db
        .ref(`leaderboards/${lvl}`)
        .orderByChild("score")
        .limitToLast(limit)
        .once("value");

      const raw = snap.val() || {};

      const list = Object.values(raw)
        .map(v => ({
          name:  v.name  || "?",
          score: Number(v.score || 0),
          ts:    v.ts    || 0
        }))
        .sort((a, b) => b.score - a.score);

      return list;

    } catch (err) {
      dbg("? Erreur loadTopScores :", err);
      return [];
    }
  }
}