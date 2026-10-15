# NG Panel : gestion du pays NationsGlory

Panel partagé en direct : calculateur de craft, crafts en cours avec suivi du farm, ressources (prix + stock), trades de quête, schématics avec coordonnées.

## Installation (environ 15 minutes, gratuit)

### 1. Créer la base de données (Firebase)
1. Va sur https://console.firebase.google.com → **Ajouter un projet** (désactive Google Analytics).
2. **Build → Firestore Database → Créer une base de données** → mode **production**, région `eur3` (Europe).
3. Onglet **Règles** : colle le contenu de `firestore.rules` → **Publier**. (Si tu changes l'e-mail du compte partagé, change-le aussi dans ce fichier.)
4. **Build → Authentication → Commencer → E-mail/Mot de passe** → activer.
5. Onglet **Utilisateurs → Ajouter un utilisateur** :
   e-mail `pays@ngpanel.app`, mot de passe = **le code du pays** (à donner aux membres).
6. **Paramètres du projet (roue dentée) → Tes applications → </> Web** → enregistre l'app et copie la config dans `firebase-config.js`.

### 2. Héberger sur GitHub Pages
1. Crée un dépôt GitHub public et envoie-y tous les fichiers de ce dossier.
2. **Settings → Pages → Branch : main / (root) → Save**.
3. Ton panel sera sur `https://TON-PSEUDO.github.io/NOM-DU-DEPOT/`.
4. Dans Firebase : **Authentication → Paramètres → Domaines autorisés** → ajoute `TON-PSEUDO.github.io`.

### 3. Premier lancement
1. Ouvre le lien, entre le code (le pseudo est facultatif). La session reste ouverte sur l'appareil.
2. Onglet **Crafts** → bouton **Importer les recettes de départ** (une seule fois).
3. Onglet **Ressources** : renseigne les prix et le stock du pays.

## Utilisation
- **Crafts** : tape un craft, la quantité, ajoute-le. Les ressources s'affichent avec le stock déjà disponible. Chaque membre note ce qu'il a farmé, la barre de progression est commune.
- **Recettes** : crée, modifie ou supprime un craft (nom, quantité produite, ingrédients). Un ingrédient qui n'existe ni en craft ni en ressource est proposé à l'ajout dans Ressources. Une recette qui s'utiliserait elle-même est refusée.
- **Ressources** : formulaire avec saisie assistée, prix et stock modifiables directement dans le tableau.
- **Trades** : la rentabilité se calcule avec les prix des ressources. Les deux ressources doivent exister dans Ressources, sinon le panel propose de les y ajouter.
- **Schématics** : coordonnées copiables en un clic. Dépose directement le fichier (jusqu'à 6 Mo), il est stocké dans Firestore (gratuit, sans carte bancaire).

## Sécurité
Le code est le mot de passe du compte Firebase partagé, vérifié côté serveur, et les règles refusent tout autre compte. Change-le dans Firebase (Authentication) si quelqu'un d'indésirable le connaît. Ne publie pas d'autres données sensibles dans ce panel.

## Limites actuelles
- Pas d'import de fichiers de recettes. Les schématics sont limités à 6 Mo par fichier.
- Le tracteur est incomplet : 3 ingrédients illisibles dans le PDF d'origine.
