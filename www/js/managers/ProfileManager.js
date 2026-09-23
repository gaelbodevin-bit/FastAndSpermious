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

  /* -------- Textes légaux (FR / EN / ES) -------- */
  const LEGAL = {
    fr: {
      mentions: `
        <h3>Mentions légales</h3>
        <p><b>Éditeur</b><br>${EDITEUR.nom}<br>${EDITEUR.auteur} — ${EDITEUR.statut}<br>
        SIRET : ${EDITEUR.siret}<br>${EDITEUR.ville}<br>Contact : ${EDITEUR.email}</p>
        <p><b>Hébergement des données</b><br>Google Firebase (Google Ireland Ltd.), serveurs situés dans l'Union européenne.</p>
        <p><b>Propriété intellectuelle</b><br>L'ensemble des éléments du jeu (graphismes, sons, code) est la propriété de ${EDITEUR.nom}, sauf mention contraire. Toute reproduction non autorisée est interdite.</p>`,
      privacy: `
        <h3>Politique de confidentialité (RGPD)</h3>
        <p><b>Données collectées</b><br>Lors de la connexion Google : nom d'affichage et identifiant de compte. Pendant le jeu : scores et progression.</p>
        <p><b>Finalité</b><br>Ces données servent uniquement à afficher ton pseudo dans le classement, sauvegarder ta progression et gérer le statut Premium.</p>
        <p><b>Base légale</b><br>Ton consentement, donné à la connexion.</p>
        <p><b>Conservation</b><br>Les données sont conservées tant que ton compte existe. Tu peux demander leur suppression à tout moment.</p>
        <p><b>Tes droits</b><br>Accès, rectification, suppression, portabilité et opposition. Pour exercer un droit, écris à ${EDITEUR.email}.</p>
        <p><b>Publicité</b><br>La version gratuite affiche des publicités via Google AdMob, qui peut utiliser des identifiants publicitaires. Le mode Premium supprime toute publicité.</p>`,
      terms: `
        <h3>Conditions d'utilisation</h3>
        <p><b>Objet</b><br>Fast and Spermious est un jeu d'arcade édité par ${EDITEUR.nom}. L'utilisation du jeu implique l'acceptation des présentes conditions.</p>
        <p><b>Compte</b><br>Une connexion Google est requise pour jouer, sauvegarder la progression et accéder au classement.</p>
        <p><b>Comportement</b><br>Toute tentative de triche, de manipulation des scores ou d'atteinte au service peut entraîner la suppression du compte.</p>
        <p><b>Responsabilité</b><br>Le jeu est fourni « en l'état ». ${EDITEUR.nom} ne saurait être tenu responsable d'une interruption de service ou d'une perte de données.</p>`,
      purchases: `
        <h3>Achats intégrés</h3>
        <p><b>Jeu gratuit</b><br>Fast and Spermious est gratuit et financé par la publicité. Il propose des achats facultatifs (« in-app »).</p>
        <p><b>Premium « sans publicité »</b><br>Achat unique supprimant définitivement les publicités sur ton compte. Aucun abonnement, aucun renouvellement.</p>
        <p><b>Facturation</b><br>Les achats sont traités par Google Play. Le montant est débité via ton compte Google au moment de l'achat.</p>
        <p><b>Restauration</b><br>Le statut Premium est lié à ton compte Google et restauré automatiquement à la reconnexion.</p>
        <p><b>Remboursement</b><br>Les demandes de remboursement relèvent des conditions de Google Play. Pour toute question : ${EDITEUR.email}.</p>`
    },
    en: {
      mentions: `
        <h3>Legal notice</h3>
        <p><b>Publisher</b><br>${EDITEUR.nom}<br>${EDITEUR.auteur} — sole trader<br>
        SIRET: ${EDITEUR.siret}<br>${EDITEUR.ville}<br>Contact: ${EDITEUR.email}</p>
        <p><b>Data hosting</b><br>Google Firebase (Google Ireland Ltd.), servers located in the European Union.</p>
        <p><b>Intellectual property</b><br>All game assets (graphics, sounds, code) are the property of ${EDITEUR.nom} unless stated otherwise. Unauthorised reproduction is prohibited.</p>`,
      privacy: `
        <h3>Privacy policy (GDPR)</h3>
        <p><b>Data collected</b><br>On Google sign-in: display name and account ID. During play: scores and progression.</p>
        <p><b>Purpose</b><br>This data is only used to show your name on the leaderboard, save your progress and manage Premium status.</p>
        <p><b>Legal basis</b><br>Your consent, given at sign-in.</p>
        <p><b>Retention</b><br>Data is kept as long as your account exists. You may request deletion at any time.</p>
        <p><b>Your rights</b><br>Access, rectification, erasure, portability and objection. To exercise a right, email ${EDITEUR.email}.</p>
        <p><b>Advertising</b><br>The free version shows ads via Google AdMob, which may use advertising identifiers. Premium removes all ads.</p>`,
      terms: `
        <h3>Terms of use</h3>
        <p><b>Purpose</b><br>Fast and Spermious is an arcade game published by ${EDITEUR.nom}. Using the game implies acceptance of these terms.</p>
        <p><b>Account</b><br>A Google sign-in is required to play, save progress and access the leaderboard.</p>
        <p><b>Conduct</b><br>Any cheating, score manipulation or attempt to disrupt the service may result in account deletion.</p>
        <p><b>Liability</b><br>The game is provided "as is". ${EDITEUR.nom} cannot be held liable for service interruption or data loss.</p>`,
      purchases: `
        <h3>In-app purchases</h3>
        <p><b>Free game</b><br>Fast and Spermious is free and ad-supported. It offers optional in-app purchases.</p>
        <p><b>Premium "no ads"</b><br>One-time purchase permanently removing ads on your account. No subscription, no renewal.</p>
        <p><b>Billing</b><br>Purchases are handled by Google Play and charged to your Google account at purchase time.</p>
        <p><b>Restore</b><br>Premium status is tied to your Google account and restored automatically on sign-in.</p>
        <p><b>Refunds</b><br>Refund requests follow Google Play terms. Questions: ${EDITEUR.email}.</p>`
    },
    es: {
      mentions: `
        <h3>Aviso legal</h3>
        <p><b>Editor</b><br>${EDITEUR.nom}<br>${EDITEUR.auteur} — autónomo<br>
        SIRET: ${EDITEUR.siret}<br>${EDITEUR.ville}<br>Contacto: ${EDITEUR.email}</p>
        <p><b>Alojamiento de datos</b><br>Google Firebase (Google Ireland Ltd.), servidores en la Unión Europea.</p>
        <p><b>Propiedad intelectual</b><br>Todos los elementos del juego (gráficos, sonidos, código) son propiedad de ${EDITEUR.nom}, salvo indicación contraria. Queda prohibida su reproducción no autorizada.</p>`,
      privacy: `
        <h3>Política de privacidad (RGPD)</h3>
        <p><b>Datos recopilados</b><br>Al iniciar sesión con Google: nombre visible e identificador de cuenta. Durante el juego: puntuaciones y progreso.</p>
        <p><b>Finalidad</b><br>Estos datos solo se usan para mostrar tu nombre en la clasificación, guardar tu progreso y gestionar el estado Premium.</p>
        <p><b>Base legal</b><br>Tu consentimiento, dado al iniciar sesión.</p>
        <p><b>Conservación</b><br>Los datos se conservan mientras exista tu cuenta. Puedes solicitar su eliminación en cualquier momento.</p>
        <p><b>Tus derechos</b><br>Acceso, rectificación, supresión, portabilidad y oposición. Para ejercer un derecho, escribe a ${EDITEUR.email}.</p>
        <p><b>Publicidad</b><br>La versión gratuita muestra anuncios mediante Google AdMob, que puede usar identificadores publicitarios. Premium elimina toda la publicidad.</p>`,
      terms: `
        <h3>Condiciones de uso</h3>
        <p><b>Objeto</b><br>Fast and Spermious es un juego arcade editado por ${EDITEUR.nom}. El uso del juego implica la aceptación de estas condiciones.</p>
        <p><b>Cuenta</b><br>Se requiere iniciar sesión con Google para jugar, guardar el progreso y acceder a la clasificación.</p>
        <p><b>Conducta</b><br>Cualquier intento de trampa, manipulación de puntuaciones o daño al servicio puede conllevar la eliminación de la cuenta.</p>
        <p><b>Responsabilidad</b><br>El juego se ofrece "tal cual". ${EDITEUR.nom} no se hace responsable de interrupciones del servicio o pérdida de datos.</p>`,
      purchases: `
        <h3>Compras integradas</h3>
        <p><b>Juego gratis</b><br>Fast and Spermious es gratuito y se financia con publicidad. Ofrece compras opcionales.</p>
        <p><b>Premium "sin anuncios"</b><br>Compra única que elimina permanentemente los anuncios en tu cuenta. Sin suscripción ni renovación.</p>
        <p><b>Facturación</b><br>Las compras las gestiona Google Play y se cobran a tu cuenta de Google en el momento de la compra.</p>
        <p><b>Restauración</b><br>El estado Premium está vinculado a tu cuenta de Google y se restaura automáticamente al iniciar sesión.</p>
        <p><b>Reembolsos</b><br>Las solicitudes de reembolso siguen las condiciones de Google Play. Consultas: ${EDITEUR.email}.</p>`
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

        <button class="menu-btn" onclick="openLegal()">${t("profileLegal")}</button>
        <button class="menu-btn profile-logout" onclick="profileLogout()">${t("profileLogout")}</button>
        <button class="menu-btn ghost" onclick="closeProfile()">${t("close") || "Fermer"}</button>
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

  log("✓ ProfileManager.js chargé");
})();
