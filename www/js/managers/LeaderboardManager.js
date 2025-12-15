/* ===========================================================
   LEADERBOARD MANAGER - Gestion du classement Firebase
   =========================================================== */

class LeaderboardManager {
  async saveScore(playerName, score, level) {
    dbg("?? Sauvegarde score:", playerName, score, "niveau:", level);
    
    const payload = {
      name: playerName.trim() || "Anonyme",
      score: Math.round(score),
      level: level,
      ts: Date.now()
    };

    return await firebaseSaveScore(payload, level);
  }

  async loadTopScores(level, limit = 20) {
    dbg("?? Chargement classement niveau:", level);
    return await firebaseLoadTop(level, limit);
  }
}

dbg("? LeaderboardManager.js chargé");
