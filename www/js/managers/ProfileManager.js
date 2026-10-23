/* ===========================================================
   PROFILE MANAGER — Modale profil + pages légales (panneaux)
   -----------------------------------------------------------
   - Bouton profil à côté du nom Google (dans le menu)
   - Modale : compte, statut premium, déconnexion, accès légal
   - Panneaux légaux in-game : mentions, RGPD, CGU, achats
   =========================================================== */

(function () {
  const log = (...a) => (typeof dbg === "function" ? dbg(...a) : console.log(...a));

  const EDITEUR = {
    nom:     "Blue Cell Production",
    auteur:  "Gaël Bodevin",
    statut:  "Entrepreneur individuel (auto-entreprise)",
    siret:   "105 792 360 00015",
    ville:   "Choussy, France",
    email:   "bluecellproduction@gmail.com"
  };

  /* -------- Textes légaux (FR / EN / ES) — mis à jour octobre 2026 -------- */
  const E = EDITEUR;
  const LEGAL = {
    fr: {
      mentions: `
        <h3>Mentions légales</h3>
        <p><b>Éditeur</b><br>${E.nom}<br>${E.auteur} — ${E.statut}<br>
        SIRET : ${E.siret}<br>${E.ville}<br>Contact : ${E.email}</p>
        <p><b>Directeur de la publication</b><br>${E.auteur}</p>
        <p><b>Hébergement</b><br>Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irlande (Google Firebase). Base de données et fonctions serveur situées dans l'Union européenne (Belgique). Application distribuée par Google Play.</p>
        <p><b>Propriété intellectuelle</b><br>L'ensemble des éléments du jeu (graphismes, sons, musiques, code) est la propriété de ${E.nom}, sauf mention contraire. Toute reproduction non autorisée est interdite.</p>`,
      privacy: `
        <h3>Politique de confidentialité (RGPD)</h3>
        <p><b>Responsable du traitement</b><br>${E.auteur} (${E.nom}), ${E.ville} — ${E.email}</p>
        <p><b>Données collectées</b><br>
        • Compte Google : identifiant, nom d'affichage et adresse e-mail (Firebase Authentication).<br>
        • Jeu : scores, place au classement (avec ton nom d'affichage), score total et skins débloqués.<br>
        • Achats : produits achetés (Premium, skins), numéro de commande Google Play et empreinte du reçu d'achat.<br>
        • Publicité (version gratuite) : identifiant publicitaire de l'appareil, traité par Google AdMob.<br>
        Le jeu ne collecte aucune donnée bancaire : les paiements sont traités par Google Play.</p>
        <p><b>Finalités et bases légales</b><br>
        • Fournir le jeu, sauvegarder ta progression et afficher le classement : exécution du service.<br>
        • Vérifier les achats et prévenir la fraude : exécution du contrat et intérêt légitime.<br>
        • Afficher des publicités dans la version gratuite : intérêt légitime (financement du jeu gratuit). La personnalisation des annonces nécessite ton consentement.</p>
        <p><b>Destinataires</b><br>Google Ireland Limited, sous-traitant (Firebase, Google Play, AdMob). Tes données ne sont ni vendues ni cédées. Ton nom d'affichage et tes scores sont visibles par les autres joueurs dans le classement.</p>
        <p><b>Transferts hors UE</b><br>Google peut traiter certaines données hors de l'Union européenne, encadrées par les clauses contractuelles types de la Commission européenne.</p>
        <p><b>Durée de conservation</b><br>Tant que ton compte existe. À la suppression du compte, toutes tes données sont effacées immédiatement. Les justificatifs de paiement sont conservés par Google Play selon ses propres obligations.</p>
        <p><b>Supprimer ton compte</b><br>Dans le jeu : Profil → « Supprimer mon compte ». Ou par e-mail à ${E.email}. La suppression efface définitivement ton compte, ta progression, ton classement et tes achats.</p>
        <p><b>Tes droits</b><br>Accès, rectification, effacement, limitation, portabilité et opposition : écris à ${E.email}. Tu peux aussi introduire une réclamation auprès de la CNIL (www.cnil.fr).</p>
        <p><b>Publicité</b><br>La version gratuite affiche une publicité plein écran entre certaines manches (Google AdMob). Tu peux réinitialiser ou supprimer ton identifiant publicitaire dans les paramètres Android (Google → Annonces). Le Premium supprime toute publicité.</p>`,
      terms: `
        <h3>Conditions d'utilisation</h3>
        <p><b>Objet</b><br>Fast and Spermious est un jeu d'arcade gratuit édité par ${E.nom}. L'utilisation du jeu implique l'acceptation des présentes conditions.</p>
        <p><b>Compte</b><br>Une connexion Google est requise pour jouer, sauvegarder ta progression et apparaître au classement. Tu peux supprimer ton compte à tout moment depuis ton profil.</p>
        <p><b>Achats intégrés</b><br>Le jeu propose des achats facultatifs (Premium, skins), décrits dans la rubrique « Achats intégrés ».</p>
        <p><b>Comportement</b><br>Toute tentative de triche, de manipulation des scores ou d'atteinte au service peut entraîner la suspension ou la suppression du compte.</p>
        <p><b>Disponibilité et responsabilité</b><br>Le jeu est fourni « en l'état ». ${E.nom} s'efforce d'assurer sa disponibilité mais ne peut garantir l'absence d'interruption ou d'erreur.</p>
        <p><b>Modification</b><br>Ces conditions peuvent évoluer ; la version en vigueur est celle affichée dans le jeu.</p>
        <p><b>Droit applicable</b><br>Droit français. Contact : ${E.email}.</p>`,
      purchases: `
        <h3>Achats intégrés</h3>
        <p><b>Jeu gratuit</b><br>Fast and Spermious est gratuit et financé par la publicité. Il propose des achats facultatifs.</p>
        <p><b>Premium « sans publicité »</b><br>Achat unique supprimant définitivement les publicités sur ton compte. Aucun abonnement, aucun renouvellement.</p>
        <p><b>Skins payants</b><br>Chaque skin payant est un achat unique, débloqué à vie sur ton compte et équipable depuis la boutique. Les skins sont uniquement esthétiques.</p>
        <p><b>Prix et facturation</b><br>Les prix sont affichés TTC dans la boutique, dans ta devise. Le paiement est traité par Google Play et débité sur ton compte Google au moment de l'achat.</p>
        <p><b>Activation et restauration</b><br>Après le paiement, l'achat est vérifié auprès de Google Play puis activé sur ton compte. Il est restauré à chaque connexion avec le même compte Google, y compris sur un autre appareil.</p>
        <p><b>Droit de rétractation</b><br>Il s'agit de contenus numériques fournis immédiatement après l'achat : en validant l'achat, tu demandes leur fourniture immédiate et renonces à ton droit de rétractation (article L221-28 du Code de la consommation).</p>
        <p><b>Remboursement</b><br>Les demandes de remboursement relèvent des conditions de Google Play. Pour toute question : ${E.email}.</p>
        <p><b>Suppression du compte</b><br>Tes achats sont liés à ton compte de jeu : si tu le supprimes, ils sont définitivement perdus.</p>`
    },
    en: {
      mentions: `
        <h3>Legal notice</h3>
        <p><b>Publisher</b><br>${E.nom}<br>${E.auteur} — sole trader<br>
        SIRET: ${E.siret}<br>${E.ville}<br>Contact: ${E.email}</p>
        <p><b>Publication director</b><br>${E.auteur}</p>
        <p><b>Hosting</b><br>Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland (Google Firebase). Database and server functions located in the European Union (Belgium). App distributed through Google Play.</p>
        <p><b>Intellectual property</b><br>All game assets (graphics, sounds, music, code) are the property of ${E.nom} unless stated otherwise. Unauthorised reproduction is prohibited.</p>`,
      privacy: `
        <h3>Privacy policy (GDPR)</h3>
        <p><b>Data controller</b><br>${E.auteur} (${E.nom}), ${E.ville} — ${E.email}</p>
        <p><b>Data collected</b><br>
        • Google account: ID, display name and email address (Firebase Authentication).<br>
        • Game: scores, leaderboard position (with your display name), total score and unlocked skins.<br>
        • Purchases: items bought (Premium, skins), Google Play order number and a fingerprint of the purchase receipt.<br>
        • Advertising (free version): device advertising ID, processed by Google AdMob.<br>
        The game never collects payment card data: payments are handled by Google Play.</p>
        <p><b>Purposes and legal bases</b><br>
        • Providing the game, saving progress and showing the leaderboard: performance of the service.<br>
        • Verifying purchases and preventing fraud: performance of the contract and legitimate interest.<br>
        • Showing ads in the free version: legitimate interest (funding the free game). Personalised ads require your consent.</p>
        <p><b>Recipients</b><br>Google Ireland Limited, as processor (Firebase, Google Play, AdMob). Your data is never sold. Your display name and scores are visible to other players on the leaderboard.</p>
        <p><b>Transfers outside the EU</b><br>Google may process some data outside the European Union under the European Commission's standard contractual clauses.</p>
        <p><b>Retention</b><br>As long as your account exists. When you delete your account, all your data is erased immediately. Payment records are kept by Google Play under its own obligations.</p>
        <p><b>Delete your account</b><br>In the game: Profile → "Delete my account". Or by email to ${E.email}. Deletion permanently erases your account, progress, leaderboard entries and purchases.</p>
        <p><b>Your rights</b><br>Access, rectification, erasure, restriction, portability and objection: email ${E.email}. You may also lodge a complaint with your data protection authority (in France: CNIL, www.cnil.fr).</p>
        <p><b>Advertising</b><br>The free version shows a full-screen ad between some rounds (Google AdMob). You can reset or delete your advertising ID in Android settings (Google → Ads). Premium removes all ads.</p>`,
      terms: `
        <h3>Terms of use</h3>
        <p><b>Purpose</b><br>Fast and Spermious is a free arcade game published by ${E.nom}. Using the game implies acceptance of these terms.</p>
        <p><b>Account</b><br>A Google sign-in is required to play, save progress and appear on the leaderboard. You can delete your account at any time from your profile.</p>
        <p><b>In-app purchases</b><br>The game offers optional purchases (Premium, skins), described in the "In-app purchases" section.</p>
        <p><b>Conduct</b><br>Any cheating, score manipulation or attempt to disrupt the service may result in account suspension or deletion.</p>
        <p><b>Availability and liability</b><br>The game is provided "as is". ${E.nom} strives to keep it available but cannot guarantee it will be free of interruptions or errors.</p>
        <p><b>Changes</b><br>These terms may change; the version in force is the one shown in the game.</p>
        <p><b>Governing law</b><br>French law. Contact: ${E.email}.</p>`,
      purchases: `
        <h3>In-app purchases</h3>
        <p><b>Free game</b><br>Fast and Spermious is free and ad-supported. It offers optional purchases.</p>
        <p><b>Premium "no ads"</b><br>One-time purchase permanently removing ads on your account. No subscription, no renewal.</p>
        <p><b>Paid skins</b><br>Each paid skin is a one-time purchase, unlocked for life on your account and equippable from the shop. Skins are purely cosmetic.</p>
        <p><b>Prices and billing</b><br>Prices are shown including tax in your currency. Payment is handled by Google Play and charged to your Google account at purchase time.</p>
        <p><b>Activation and restore</b><br>After payment, the purchase is verified with Google Play and activated on your account. It is restored every time you sign in with the same Google account, including on another device.</p>
        <p><b>Right of withdrawal</b><br>These are digital contents supplied immediately after purchase: by confirming the purchase, you request immediate supply and waive your right of withdrawal (EU consumer law).</p>
        <p><b>Refunds</b><br>Refund requests follow Google Play terms. Questions: ${E.email}.</p>
        <p><b>Account deletion</b><br>Your purchases are linked to your game account: if you delete it, they are permanently lost.</p>`
    },
    es: {
      mentions: `
        <h3>Aviso legal</h3>
        <p><b>Editor</b><br>${E.nom}<br>${E.auteur} — autónomo<br>
        SIRET: ${E.siret}<br>${E.ville}<br>Contacto: ${E.email}</p>
        <p><b>Director de la publicación</b><br>${E.auteur}</p>
        <p><b>Alojamiento</b><br>Google Ireland Limited, Gordon House, Barrow Street, Dublín 4, Irlanda (Google Firebase). Base de datos y funciones de servidor situadas en la Unión Europea (Bélgica). Aplicación distribuida por Google Play.</p>
        <p><b>Propiedad intelectual</b><br>Todos los elementos del juego (gráficos, sonidos, música, código) son propiedad de ${E.nom}, salvo indicación contraria. Queda prohibida su reproducción no autorizada.</p>`,
      privacy: `
        <h3>Política de privacidad (RGPD)</h3>
        <p><b>Responsable del tratamiento</b><br>${E.auteur} (${E.nom}), ${E.ville} — ${E.email}</p>
        <p><b>Datos recopilados</b><br>
        • Cuenta de Google: identificador, nombre visible y dirección de correo (Firebase Authentication).<br>
        • Juego: puntuaciones, posición en la clasificación (con tu nombre visible), puntuación total y skins desbloqueados.<br>
        • Compras: productos comprados (Premium, skins), número de pedido de Google Play y huella del recibo de compra.<br>
        • Publicidad (versión gratuita): identificador publicitario del dispositivo, tratado por Google AdMob.<br>
        El juego no recopila datos bancarios: los pagos los gestiona Google Play.</p>
        <p><b>Finalidades y bases legales</b><br>
        • Ofrecer el juego, guardar tu progreso y mostrar la clasificación: ejecución del servicio.<br>
        • Verificar las compras y prevenir el fraude: ejecución del contrato e interés legítimo.<br>
        • Mostrar anuncios en la versión gratuita: interés legítimo (financiar el juego gratuito). Los anuncios personalizados requieren tu consentimiento.</p>
        <p><b>Destinatarios</b><br>Google Ireland Limited, como encargado del tratamiento (Firebase, Google Play, AdMob). Tus datos nunca se venden. Tu nombre visible y tus puntuaciones son visibles para los demás jugadores en la clasificación.</p>
        <p><b>Transferencias fuera de la UE</b><br>Google puede tratar algunos datos fuera de la Unión Europea mediante las cláusulas contractuales tipo de la Comisión Europea.</p>
        <p><b>Conservación</b><br>Mientras exista tu cuenta. Al eliminar la cuenta, todos tus datos se borran inmediatamente. Los justificantes de pago los conserva Google Play según sus propias obligaciones.</p>
        <p><b>Eliminar tu cuenta</b><br>En el juego: Perfil → «Eliminar mi cuenta». O por correo a ${E.email}. La eliminación borra definitivamente tu cuenta, progreso, clasificación y compras.</p>
        <p><b>Tus derechos</b><br>Acceso, rectificación, supresión, limitación, portabilidad y oposición: escribe a ${E.email}. También puedes presentar una reclamación ante tu autoridad de protección de datos (en Francia: CNIL, www.cnil.fr).</p>
        <p><b>Publicidad</b><br>La versión gratuita muestra un anuncio a pantalla completa entre algunas partidas (Google AdMob). Puedes restablecer o eliminar tu identificador publicitario en los ajustes de Android (Google → Anuncios). Premium elimina toda la publicidad.</p>`,
      terms: `
        <h3>Condiciones de uso</h3>
        <p><b>Objeto</b><br>Fast and Spermious es un juego arcade gratuito editado por ${E.nom}. El uso del juego implica la aceptación de estas condiciones.</p>
        <p><b>Cuenta</b><br>Se requiere iniciar sesión con Google para jugar, guardar el progreso y aparecer en la clasificación. Puedes eliminar tu cuenta en cualquier momento desde tu perfil.</p>
        <p><b>Compras integradas</b><br>El juego ofrece compras opcionales (Premium, skins), descritas en la sección «Compras integradas».</p>
        <p><b>Conducta</b><br>Cualquier intento de trampa, manipulación de puntuaciones o daño al servicio puede conllevar la suspensión o eliminación de la cuenta.</p>
        <p><b>Disponibilidad y responsabilidad</b><br>El juego se ofrece «tal cual». ${E.nom} procura mantenerlo disponible, pero no puede garantizar la ausencia de interrupciones o errores.</p>
        <p><b>Modificaciones</b><br>Estas condiciones pueden cambiar; la versión vigente es la que se muestra en el juego.</p>
        <p><b>Ley aplicable</b><br>Ley francesa. Contacto: ${E.email}.</p>`,
      purchases: `
        <h3>Compras integradas</h3>
        <p><b>Juego gratis</b><br>Fast and Spermious es gratuito y se financia con publicidad. Ofrece compras opcionales.</p>
        <p><b>Premium «sin anuncios»</b><br>Compra única que elimina permanentemente los anuncios en tu cuenta. Sin suscripción ni renovación.</p>
        <p><b>Skins de pago</b><br>Cada skin de pago es una compra única, desbloqueada de por vida en tu cuenta y equipable desde la tienda. Los skins son solo estéticos.</p>
        <p><b>Precios y facturación</b><br>Los precios se muestran con impuestos incluidos en tu moneda. El pago lo gestiona Google Play y se cobra a tu cuenta de Google en el momento de la compra.</p>
        <p><b>Activación y restauración</b><br>Tras el pago, la compra se verifica con Google Play y se activa en tu cuenta. Se restaura cada vez que inicias sesión con la misma cuenta de Google, también en otro dispositivo.</p>
        <p><b>Derecho de desistimiento</b><br>Se trata de contenidos digitales suministrados inmediatamente tras la compra: al confirmar la compra, solicitas su suministro inmediato y renuncias a tu derecho de desistimiento (normativa europea de consumo).</p>
        <p><b>Reembolsos</b><br>Las solicitudes de reembolso siguen las condiciones de Google Play. Consultas: ${E.email}.</p>
        <p><b>Eliminación de la cuenta</b><br>Tus compras están vinculadas a tu cuenta de juego: si la eliminas, se pierden definitivamente.</p>`
    }
  };

  function legalText(section) {
    const lang = (typeof currentLang !== "undefined" && LEGAL[currentLang]) ? currentLang : "fr";
    return LEGAL[lang][section] || LEGAL.fr[section];
  }

  /* -------------------------------------------------------
     MODALE PROFIL
  ------------------------------------------------------- */
  function openProfile() {
    const user = window.authUser;
    if (!user) { if (typeof signInWithGoogle === "function") signInWithGoogle(); return; }

    let modal = document.getElementById("profileModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "profileModal";
      modal.className = "modal";
      document.body.appendChild(modal);
    }

    const premium = window.isPremium;
    const statusTxt = premium ? t("profilePremiumOn") : t("profileFree");
    const statusCls = premium ? "premium" : "free";

    modal.innerHTML = `
      <div class="modal-content profile-card">
        <div class="profile-avatar">${(user.displayName || "?").charAt(0).toUpperCase()}</div>
        <h2>${user.displayName || user.email || "?"}</h2>
        <p class="profile-sub">${t("profileConnected")}</p>

        <div class="profile-status">
          <span>${t("profileStatus")}</span>
          <span class="badge ${statusCls}">${statusTxt}</span>
        </div>

        <button class="menu-btn" onclick="openBgSelector()">${t("profileBg")}</button>
        <button class="menu-btn" onclick="openLegal()">${t("profileLegal")}</button>
        <button class="menu-btn profile-logout" onclick="profileLogout()">${t("profileLogout")}</button>
        <button class="menu-btn ghost" onclick="closeProfile()">${t("close") || "Fermer"}</button>
        <button class="profile-delete" onclick="confirmDeleteAccount()">${t("profileDelete")}</button>
      </div>`;
    modal.classList.remove("hidden");
    modal.style.display = "flex";
  }

  function closeProfile() {
    const m = document.getElementById("profileModal");
    if (m) m.style.display = "none";
  }

  async function profileLogout() {
    closeProfile();
    if (typeof signOutGoogle === "function") await signOutGoogle();
  }

  /* -------------------------------------------------------
     SUPPRESSION DU COMPTE (RGPD / Google Play)
  ------------------------------------------------------- */
  function confirmDeleteAccount() {
    closeProfile();
    let modal = document.getElementById("deleteModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "deleteModal";
      modal.className = "modal";
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div class="modal-content profile-card delete-card">
        <h2>${t("deleteTitle")}</h2>
        <p class="delete-text">${t("deleteText")}</p>
        <button class="menu-btn delete-confirm" id="deleteConfirmBtn" onclick="doDeleteAccount()">${t("deleteConfirm")}</button>
        <button class="menu-btn ghost" onclick="closeDeleteAccount()">${t("deleteCancel")}</button>
      </div>`;
    modal.style.display = "flex";
  }

  function closeDeleteAccount() {
    const m = document.getElementById("deleteModal");
    if (m) m.style.display = "none";
  }

  async function doDeleteAccount() {
    const btn = document.getElementById("deleteConfirmBtn");
    if (btn) { btn.disabled = true; btn.textContent = t("deleting"); }
    try {
      if (typeof firebase === "undefined" || !firebase.functions) throw new Error("Functions indisponible");
      // 1) Effacement serveur : données + compte de connexion
      await firebase.app().functions("europe-west1").httpsCallable("deleteAccount")({});

      // 2) Déconnexion AVANT de toucher aux données locales
      //    (sinon la sauvegarde auto pourrait réécrire des données sur le serveur)
      if (window.plugins && window.plugins.googleplus && window.plugins.googleplus.disconnect) {
        await new Promise((r) => window.plugins.googleplus.disconnect(r, r));
      }
      if (typeof signOutGoogle === "function") await signOutGoogle();

      // 3) Remise à zéro des données locales
      ["totalScore", "ownedSkins", "equippedSkin", "paidSkins", "playerName", "playerId"]
        .forEach((k) => { try { localStorage.removeItem(k); } catch (e) {} });
      window.paidSkins = [];
      window.isPremium = false;
      const g = window.game;
      if (g && g.playerState) {
        g.playerState.totalScore   = 0;
        g.playerState.ownedSkins   = [];
        g.playerState.equippedSkin = "base";
        if (g.skinManager) await g.skinManager.load();   // remet les skins de base
        if (typeof g.updateCurrentSkin === "function") g.updateCurrentSkin();
      }
      if (typeof updateAuthUI === "function") updateAuthUI();
      if (typeof refreshShopUI === "function") refreshShopUI();

      closeDeleteAccount();
      if (typeof showAuthToast === "function") showAuthToast(t("deleteDone"));
      log("🗑️ Compte supprimé");
    } catch (e) {
      log("❌ deleteAccount :", e && e.message);
      if (btn) { btn.disabled = false; btn.textContent = t("deleteConfirm"); }
      if (typeof showAuthToast === "function") showAuthToast(t("deleteError"), true);
    }
  }

  window.confirmDeleteAccount = confirmDeleteAccount;
  window.closeDeleteAccount   = closeDeleteAccount;
  window.doDeleteAccount      = doDeleteAccount;

  /* -------------------------------------------------------
     PANNEAU LÉGAL (in-game)
  ------------------------------------------------------- */
  function openLegal() {
    closeProfile();
    let panel = document.getElementById("legalPanel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "legalPanel";
      panel.className = "panel";
      document.body.appendChild(panel);
    }
    panel.innerHTML = `
      <h2>${t("legalTitle")}</h2>
      <div class="legal-nav">
        <button class="menu-btn" onclick="showLegal('mentions')">${t("legalMentions")}</button>
        <button class="menu-btn" onclick="showLegal('privacy')">${t("legalPrivacy")}</button>
        <button class="menu-btn" onclick="showLegal('terms')">${t("legalTerms")}</button>
        <button class="menu-btn" onclick="showLegal('purchases')">${t("legalPurchases")}</button>
      </div>
      <div id="legalContent" class="legal-content"></div>
      <button class="menu-btn" onclick="closeLegal()">${t("legalBack")}</button>`;

    if (typeof hidePanels === "function") hidePanels();
    const canvas = document.getElementById("gameCanvas");
    if (canvas) canvas.style.display = "none";
    panel.style.display = "block";
    showLegal("mentions");
  }

  function showLegal(section) {
    const box = document.getElementById("legalContent");
    if (box) box.innerHTML = legalText(section);
    // surligner l'onglet actif
    document.querySelectorAll("#legalPanel .legal-nav .menu-btn").forEach(b => b.classList.remove("active"));
    const idx = { mentions:0, privacy:1, terms:2, purchases:3 }[section];
    const btns = document.querySelectorAll("#legalPanel .legal-nav .menu-btn");
    if (btns[idx]) btns[idx].classList.add("active");
  }

  function closeLegal() {
    const panel = document.getElementById("legalPanel");
    if (panel) panel.style.display = "none";
    if (typeof backToMenu === "function") backToMenu();
  }

  window.openProfile   = openProfile;
  window.closeProfile  = closeProfile;
  window.profileLogout = profileLogout;
  window.openLegal     = openLegal;
  window.showLegal     = showLegal;
  window.closeLegal    = closeLegal;

  /* -------------------------------------------------------
     SÉLECTEUR DE FOND DE JEU (modale)
  ------------------------------------------------------- */
  function openBgSelector() {
    closeProfile();
    let modal = document.getElementById("bgModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "bgModal";
      modal.className = "modal";
      document.body.appendChild(modal);
    }
    const themes = window.BG_THEMES || [];
    const current = (typeof getBgTheme === "function") ? getBgTheme() : "nebula";

    const cards = themes.map(th => {
      const name = t(th.key) || th.fallback;
      const sel = th.id === current ? " selected" : "";
      return `<button class="bg-card${sel}" data-bg="${th.id}" onclick="chooseBg('${th.id}')">
                <span class="bg-swatch bg-${th.id}"></span>
                <span class="bg-name">${name}</span>
              </button>`;
    }).join("");

    modal.innerHTML = `
      <div class="modal-content bg-selector">
        <h2>${t("bgTitle")}</h2>
        <div class="bg-grid">${cards}</div>
        <button class="menu-btn ghost" onclick="closeBgSelector()">${t("close") || "Fermer"}</button>
      </div>`;
    modal.style.display = "flex";
    // Aperçu live du fond pendant la sélection
    if (typeof showGameBackground === "function") showGameBackground();
  }

  function chooseBg(id) {
    if (typeof setBgTheme === "function") setBgTheme(id);
    // mettre à jour la sélection visuelle
    document.querySelectorAll("#bgModal .bg-card").forEach(c => {
      c.classList.toggle("selected", c.dataset.bg === id);
    });
  }

  function closeBgSelector() {
    const m = document.getElementById("bgModal");
    if (m) m.style.display = "none";
    // Recacher le fond (on revient au menu)
    if (typeof hideGameBackground === "function") hideGameBackground();
  }

  window.openBgSelector  = openBgSelector;
  window.chooseBg        = chooseBg;
  window.closeBgSelector = closeBgSelector;

  log("✓ ProfileManager.js chargé");
})();
