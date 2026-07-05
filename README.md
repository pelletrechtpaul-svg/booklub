# 📚 Booklub

Un classement dynamique et collaboratif des livres de notre book club.

- **Ajouter un livre** — recherche par titre/auteur (Open Library), ou **ajout
  manuel** avec **import automatique depuis un lien Amazon** (titre, auteur,
  année, couverture). Couverture affichée à une taille standard.
- **Détails par livre** : qui l’a proposé, date de débat.
- **Notes par participant** : chaque membre (Roman, Claire, Paul) note de 1 à 5
  étoiles ; la moyenne s’affiche sur la fiche.
- **Classement** en liste verticale responsive (mobile + desktop).
- **Glisser-déposer** naturel pour faire monter ou descendre un livre.
- **Temps réel** : le classement est synchronisé pour tout le monde via Firebase
  Realtime Database.

> Les participants sont définis dans [`src/lib/participants.js`](./src/lib/participants.js)
> — modifie cette liste pour changer les noms.

Stack : [Next.js](https://nextjs.org) (App Router) · Firebase Realtime Database ·
[dnd-kit](https://dndkit.com) · déploiement [Vercel](https://vercel.com).

> ℹ️ On utilise **Realtime Database** (et non Firestore) car elle est gratuite
> sur le plan Spark **sans carte bancaire**, et elle est temps réel par nature —
> parfait pour un classement partagé.

---

## 1. Prérequis

- Node.js 18.18+ (ou 20+)
- Un compte [Firebase](https://console.firebase.google.com) (gratuit)
- Un compte [Vercel](https://vercel.com) (gratuit)

## 2. Créer la base Firebase

1. Va sur la [console Firebase](https://console.firebase.google.com) → **Ajouter
   un projet** (Google Analytics facultatif).
2. Dans le projet : **Build → Realtime Database → Créer une base de données**.
   - Emplacement : **Belgium (europe-west1)** (ou États-Unis, peu importe).
   - Règles de sécurité : **Démarrer en mode test** → **Activer**.
3. Onglet **Règles (Rules)** : colle le contenu de
   [`database.rules.json`](./database.rules.json) puis **Publier**.
   > ⚠️ Ces règles laissent tout le monde lire/écrire. C’est volontaire pour un
   > petit groupe de confiance sans compte utilisateur. Ne stocke rien de
   > sensible.
4. Note l’**URL de la base** affichée en haut de la Realtime Database, du type
   `https://booklub-xxxx-default-rtdb.europe-west1.firebasedatabase.app`.
5. **Paramètres du projet** (roue crantée) → section **Vos applications** →
   **</>** (Web) → enregistre l’app. Firebase te donne un objet `firebaseConfig` :
   garde ces valeurs (+ l’URL de la base) pour l’étape suivante.

## 3. Lancer en local

```bash
npm install
cp .env.local.example .env.local   # puis remplis les valeurs Firebase
npm run dev
```

Ouvre http://localhost:3000.

Les variables à renseigner dans `.env.local` :

| Variable | Valeur Firebase |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | l’URL de la Realtime Database (étape 2.4) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` |

## 4. Déployer sur Vercel

1. Pousse ce dépôt sur GitHub.
2. Sur Vercel : **Add New → Project** → importe le dépôt (Vercel détecte
   Next.js tout seul).
3. **Settings → Environment Variables** : ajoute les 7 variables ci-dessus
   (mêmes noms, mêmes valeurs).
4. **Deploy**. À chaque `git push`, Vercel redéploie automatiquement.

## Comment ça marche

- Les livres sont stockés sous le nœud Realtime Database `books`, chacun avec un
  champ `order`. Le classement est trié par `order` croissant.
- Un glisser-déposer réécrit les `order` de la liste dans une mise à jour
  atomique (`update` multi-chemins) ; grâce à l’écoute temps réel (`onValue`),
  tous les écrans se mettent à jour instantanément.
- Les couvertures et la recherche viennent de l’API publique Open Library
  (pas de clé requise, sans limite de débit agressive).
