dbg("? LeaderboardManager charg");

/* ===========================================================
   LEADERBOARD MANAGER
   - Firebase Auth anonyme
   - Top 10 scores par niveau (toutes entres confondues)
   - Structure : leaderboards/{level}/{pushId}
   =========================================================== */

class LeaderboardManager {
  constructor() {
    if (!window.firebaseDB || !firebase.auth) {
      dbg("? Firebase non prt dans LeaderboardManager");
      return;
    }

    this.db   = window.firebaseDB;
    this.auth = firebase.auth();
  }

  /* ===========================================================
     SAVE SCORE
     - Chaque soumission cre une nouvelle entre (push)
     - On garde les 10 meilleurs scores au total par niveau
     - Anti-spam : on vrifie que le score dpasse le 10e score actuel
     =========================================================== */

  async saveScore(playerName, score, level) {
    try {
      const lvl = Number(level);
      if (![15, 30, 60].includes(lvl)) {
        throw new Error("Niveau invalide : " + level);
      }

      const user = this.auth.currentUser;
      if (!user) {
        throw new Error("Utilisateur non authentifi");
      }

      const ref = this.db.ref(`leaderboards/${lvl}`);

      // Rcuprer les 10 meilleurs scores actuels
      const snap = await ref
        .orderByChild("score")
        .limitToLast(10)
        .once("value");

      const raw = snap.val() || {};
      const entries = Object.entries(raw).map(([key, v]) => ({
        key,
        score: Number(v.score || 0)
      }));

      // Si on a dj 10 scores, vrifier que le nouveau est meilleur que le 10e
      if (entries.length >= 10) {
        const minScore = Math.min(...entries.map(e => e.score));
        if (score <= minScore) {
          dbg("?? Score ignor (pas dans le top 10) :", score, "<= min", minScore);
          return { ok: true, skipped: true };
        }

        // Supprimer le plus bas pour garder max 10 entres
        const lowestEntry = entries.find(e => e.score === minScore);
        if (lowestEntry) {
          await this.db.ref(`leaderboards/${lvl}/${lowestEntry.key}`).remove();
          dbg("??? Score le plus bas supprim :", minScore);
        }
      }

      // // ? Vrifier si le nouveau score bat le top 1
      const allScores = Object.values(raw).map(v => Number(v.score || 0));
      const currentTop1 = allScores.length > 0 ? Math.max(...allScores) : 0;
      const isNewRecord = score > currentTop1;

      // Ajouter le nouveau score avec un push (cl unique)
      await ref.push({
        name:  playerName || "Anonyme",
        score: Number(score),
        uid:   user.uid,
        ts:    Date.now()
      });

      dbg("Score sauvegard :", lvl, score, isNewRecord ? "NOUVEAU RECORD !" : "");
      return { ok: true, newRecord: isNewRecord };

    } catch (err) {
      dbg("? Erreur saveScore :", err);
      return { ok: false, err: err.message || err };
    }
  }

  /* ===========================================================
     LOAD TOP SCORES
     - Retourne les 10 meilleurs scores tris du plus haut au plus bas
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
      dbg("Erreur loadTopScores :", err);
      return [];
    }
  }

  /* ===========================================================
     SAVE TOTAL SCORE
     - Sauvegarde le score cumulatif du joueur dans leaderboard_total
     =========================================================== */
  async saveTotalScore(playerName, totalScore) {
    try {
      const user = this.auth.currentUser;
      if (!user) return;

      await this.db.ref(`leaderboard_total/${user.uid}`).set({
        name:  playerName || "Anonyme",
        score: Number(totalScore) || 0,
        ts:    Date.now()
      });

      dbg("Total score sauvegarde :", totalScore);
    } catch (err) {
      dbg("Erreur saveTotalScore :", err);
    }
  }

  /* ===========================================================
     LOAD TOTAL LEADERBOARD
     - Retourne le classement par score cumulatif total
     =========================================================== */
  async loadTotalLeaderboard(limit = 100) {
    try {
      const snap = await this.db
        .ref("leaderboard_total")
        .orderByChild("score")
        .limitToLast(limit)
        .once("value");

      const raw = snap.val() || {};

      return Object.values(raw)
        .map(v => ({
          name:  v.name  || "?",
          score: Number(v.score || 0),
          ts:    v.ts    || 0
        }))
        .sort((a, b) => b.score - a.score);

    } catch (err) {
      dbg("Erreur loadTotalLeaderboard :", err);
      return [];
    }
  }
}