# ☁️ Cloud Functions — Vérification des achats Play

Vérification serveur du premium **no-ads** : l'app envoie le reçu d'achat,
la fonction le valide auprès de Google Play, puis active
`/users/{uid}/premium = true`. **Impossible de tricher côté client.**

---

## 📋 Prérequis (une seule fois)

### 1. Plan Firebase Blaze
Les Cloud Functions nécessitent le plan **Blaze** (paiement à l'usage — gratuit
en dessous des quotas). À activer dans la console Firebase.

### 2. Lier un compte de service à la Play Console
Pour que la fonction interroge l'API Google Play :

1. **Google Cloud Console** → projet `fast-and-spermious` → *IAM et administration → Comptes de service*
   → le compte `fast-and-spermious@appspot.gserviceaccount.com` (créé par défaut).
2. **Play Console** → *Compte de développeur → Accès à l'API* → *Associer un projet Google Cloud*
   → choisir `fast-and-spermious`.
3. Toujours dans *Accès à l'API* → inviter le compte de service ci-dessus
   avec le droit **« Afficher les données financières / Gérer les commandes »**.

### 3. Activer l'API
Dans Google Cloud Console → *API et services* → activer
**Google Play Android Developer API**.

---

## 🚀 Déploiement

```bash
# Depuis la racine du repo
npm install -g firebase-tools      # une fois
firebase login                     # une fois
cd functions && npm install && cd ..

# Déployer les fonctions + les règles de base de données
firebase deploy --only functions,database
```

---

## 🧩 Ce qui est déployé

| Fonction | Rôle |
|---|---|
| `verifyPurchase` | Vérifie le reçu Play et active le premium (appelée après achat) |
| `restorePremium` | Renvoie le statut premium (appelée à la reconnexion) |

Région : **europe-west1** (proche de la base RTDB).

---

## 🔒 Sécurité

- `users/{uid}/premium` est en **écriture interdite côté client**
  (`database.rules.json`) — seule la Cloud Function (admin) peut l'écrire.
- Chaque `purchaseToken` est enregistré et ne peut pas être réutilisé
  par un autre compte (anti-partage).
- L'app ne peut donc plus forcer le premium.

---

## 🧪 Test

1. Créer le produit `premium_no_ads` dans la Play Console (produit ponctuel).
2. Ajouter ton compte Gmail en **testeur de licence**
   (*Play Console → Configuration → Test des licences*).
3. Installer un build de test, acheter → le premium doit s'activer
   après le retour de `verifyPurchase`.
