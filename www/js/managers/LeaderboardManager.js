/* ===========================================================
   LEADERBOARD MANAGER - Gestion du classement Firebase
   =========================================================== */

class LeaderboardManager {
  async saveScore(playerName, score, level) {
    dbg("💾 Saving score:", playerName, score, "level:", level);
    
    const payload = {
      name: playerName.trim() || "Anonyme",
      score: Math.round(score),
      level: level,
      timestamp: Date.now()
    };

    return await firebaseSaveScore(payload, level);
  }

  async loadTopScores(level, limit = 20) {
    dbg("📊 Loading leaderboard for level:", level);
    return await firebaseLoadTop(level, limit);
  }
}

dbg("✅ LeaderboardManager.js loaded");
