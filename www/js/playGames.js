/* ===========================================================
   PLAY GAMES - Connexion Google Play Games Services
   Connexion automatique au lancement + liaison Firebase
   =========================================================== */

(function () {
  const log = (...a) => (typeof dbg === "function" ? dbg(...a) : console.log(...a));

  // ✅ Disponible globalement
  window.playGamesReady = false;
  window.playGamesId = null;

  /* =========================
     CONNEXION AUTOMATIQUE
     ========================= */
  async function initPlayGames() {
    // Vérifier que le plugin est disponible (Android uniquement)
    if (!window.cordova || !window.plugins || !window.plugins.playGamesServices) {
      log("⚠️ Play Games Services non disponible (navigateur ou iOS)");
      // Fallback : auth anonyme Firebase déjà gérée dans firebase.js
      return false;
    }

    return new Promise((resolve) => {
      log("🎮 Tentative connexion Google Play Games...");

      window.plugins.playGamesServices.signIn(
        // ✅ Succès
        (result) => {
          log("✓ Play Games connecté | ID:", result.playerId);
          window.playGamesId = result.playerId;
          window.playGamesDisplayName = result.displayName || "Joueur";
          window.playGamesReady = true;

          // Lier à Firebase avec le token Play Games
          linkPlayGamesToFirebase(result).then(resolve);
        },
        // ❌ Échec (joueur non connecté à Google Play)
        (err) => {
          log("⚠️ Play Games non connecté:", err);
          log("→ Fallback auth anonyme Firebase");
          resolve(false);
        }
      );
    });
  }

  /* =========================
     LIAISON FIREBASE
     ========================= */
  async function linkPlayGamesToFirebase(playGamesResult) {
    try {
      if (!firebase || !firebase.auth) {
        log("⚠️ Firebase auth non disponible pour liaison Play Games");
        return false;
      }

      const auth = firebase.auth();

      // Récupérer le token serveur Play Games
      window.plugins.playGamesServices.getServerAuthCode(
        async (authCode) => {
          try {
            log("✓ Auth code Play Games obtenu");

            // Créer credential Firebase avec le token Play Games
            const credential = firebase.auth.GoogleAuthProvider.credential(null, authCode);

            // Si déjà connecté anonymement, lier le compte
            if (auth.currentUser && auth.currentUser.isAnonymous) {
              try {
                await auth.currentUser.linkWithCredential(credential);
                log("✓ Compte anonyme lié à Play Games");
              } catch (linkErr) {
                // Compte déjà existant — se connecter directement
                if (linkErr.code === "auth/credential-already-in-use") {
                  await auth.signInWithCredential(credential);
                  log("✓ Connexion avec compte Play Games existant");
                } else {
                  throw linkErr;
                }
              }
            } else {
              // Connexion directe
              await auth.signInWithCredential(credential);
              log("✓ Connexion Firebase via Play Games");
            }

            log("✓ Firebase UID:", auth.currentUser?.uid);
            return true;

          } catch (e) {
            log("⚠️ Liaison Firebase échouée:", e?.message);
            return false;
          }
        },
        (err) => {
          log("⚠️ getServerAuthCode échoué:", err);
          return false;
        }
      );

    } catch (e) {
      log("⚠️ linkPlayGamesToFirebase:", e?.message);
      return false;
    }
  }

  /* =========================
     DECONNEXION
     ========================= */
  function signOutPlayGames() {
    if (!window.plugins?.playGamesServices) return;
    window.plugins.playGamesServices.signOut(
      () => log("✓ Déconnecté de Play Games"),
      (err) => log("⚠️ Erreur déconnexion:", err)
    );
  }

  /* =========================
     EXPORT GLOBAL
     ========================= */
  window.initPlayGames    = initPlayGames;
  window.signOutPlayGames = signOutPlayGames;

  log("✓ playGames.js chargé");
})();
