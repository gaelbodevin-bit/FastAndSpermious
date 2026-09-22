# 🧬 Fast and Spermious

Jeu mobile Android développé avec Apache Cordova + JavaScript.
**Studio :** Blue Cell Production · **Auteur :** Gaël Bodevin

---

## 📁 Structure du projet

```
FastAndSpermious/
├── www/                        ← Sources de l'app
│   ├── index.html              ← Point d'entrée + styles overlays
│   ├── skins.json              ← Définition des skins
│   ├── privacy.html            ← Politique de confidentialité (RGPD)
│   ├── css/                    ← Feuilles de style (style.css, intro.css)
│   ├── assets/                 ← Logos studio, splash screens
│   ├── js/
│   │   ├── firebase.js         ← Init Firebase + scores + player data
│   │   ├── config.js           ← Langues (FR/EN/ES) + constantes de jeu
│   │   ├── models.js           ← PlayerState + GameState
│   │   ├── background.js       ← Particules de fond
│   │   ├── renderer.js         ← Rendu du sprite
│   │   ├── ui.js               ← Menus, leaderboard, shop, game over
│   │   ├── game.js             ← Boucle de jeu + point d'entrée
│   │   ├── intro.js            ← Intro studio
│   │   ├── playGames.js        ← Google Play Games (optionnel)
│   │   └── managers/
│   │       ├── AuthManager.js       ← Connexion Google obligatoire + premium
│   │       ├── AdManager.js         ← Pub interstitielle (AdMob)
│   │       ├── SkinManager.js       ← Gestion des skins
│   │       ├── LeaderboardManager.js
│   │       └── InputManager.js      ← Détection mouvement (shake)
│   └── img/                    ← Sprites, previews, drapeaux
├── tools/                      ← Scripts de build
├── keystore/                   ← Keystore de signature (ignoré par git)
├── config.xml                  ← Configuration Cordova + plugins
├── package.json
└── .gitignore
```

---

## 🔧 Stack technique

- **Apache Cordova** (Android, minSdk 22 / target 34)
- **Firebase** — Auth Google (obligatoire) + Realtime Database
- **AdMob** — pub interstitielle après chaque manche
- **Google Play Billing** — premium « sans pub »

---

## 🔐 Connexion & monétisation

- **Connexion Google obligatoire** : un overlay bloque le jeu tant que le joueur n'est pas connecté (`AuthManager.js`).
- **Pub interstitielle** : affichée après chaque manche via `AdManager.js`, sautée pour les joueurs premium.
- **Premium no-ads** : achat unique `premium_no_ads`, flag stocké dans Firebase `/users/{uid}/premium`.

---

## 🚀 Build

```powershell
# Installer les plugins (première fois)
cordova platform add android
cordova plugin add cordova-plugin-googleplus admob-plus-cordova cordova-plugin-purchase

# Build debug
cordova clean android && cordova build android

# Build release signé
cordova build android --release -- \
  --keystore="keystore/fast-spermious.jks" \
  --storePassword=XXX --alias=fastspermious --password=XXX
```

> ⚠️ Après chaque changement, `cordova clean android` est requis pour un build fiable sur appareil physique.
> ⚠️ Le keystore va dans `keystore/` (ignoré par git — ne jamais le commiter).

---

## 🌍 Langues

Français · English · Español (détection automatique de la langue du téléphone)
