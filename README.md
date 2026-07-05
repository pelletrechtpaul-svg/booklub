# 📚 Booklub

Un classement dynamique et collaboratif des livres de notre book club.

- **Ajouter un livre** en un clic — recherche par titre/auteur, la couverture est
  récupérée automatiquement (Google Books) et affichée à une taille standard.
- **Classement** en liste verticale responsive (mobile + desktop).
- **Glisser-déposer** naturel pour faire monter ou descendre un livre.
- **Temps réel** : le classement est synchronisé pour tout le monde via Firebase
  Firestore.

Stack : [Next.js](https://nextjs.org) (App Router) · Firebase Firestore ·
[dnd-kit](https://dndkit.com) · déploiement [Vercel](https://vercel.com).

---

## 1. Prérequis

- Node.js 18.18+ (ou 20+)
- Un compte [Firebase](https://console.firebase.google.com) (gratuit)
- Un compte [Vercel](https://vercel.com) (gratuit)

## 2. Créer la base Firebase

1. Va sur la [console Firebase](https://console.firebase.google.com) → **Ajouter
   un projet**.
2. Dans le projet : **Build → Firestore Database → Créer une base de données**
   (mode production ou test, peu importe, on met nos règles ensuite).
3. Onglet **Rules** : colle le contenu de [`firestore.rules`](./firestore.rules)
   puis **Publier**.
   > ⚠️ Ces règles laissent tout le monde lire/écrire. C’est volontaire pour un
   > petit groupe de confiance sans compte utilisateur. Ne stocke rien de
   > sensible.
4. **Project settings** (roue crantée) → section **Your apps** → **</>** (Web) →
   enregistre l’app. Firebase te donne un objet `firebaseConfig` : garde ces
   valeurs pour l’étape suivante.

## 3. Lancer en local

```bash
npm install
cp .env.local.example .env.local   # puis remplis les valeurs Firebase
npm run dev
```

Ouvre http://localhost:3000.

Les variables à renseigner dans `.env.local` (depuis le `firebaseConfig`) :

| Variable | Valeur Firebase |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` |

## 4. Déployer sur Vercel

1. Pousse ce dépôt sur GitHub.
2. Sur Vercel : **Add New → Project** → importe le dépôt (Vercel détecte
   Next.js tout seul).
3. **Settings → Environment Variables** : ajoute les 6 variables ci-dessus
   (mêmes noms, mêmes valeurs).
4. **Deploy**. À chaque `git push`, Vercel redéploie automatiquement.

## Comment ça marche

- Les livres sont stockés dans la collection Firestore `books`, chacun avec un
  champ `order`. Le classement est trié par `order` croissant.
- Un glisser-déposer réécrit les `order` de la liste dans un batch Firestore ;
  grâce à l’écoute temps réel (`onSnapshot`), tous les écrans se mettent à jour.
- Les couvertures viennent de l’API publique Google Books (pas de clé requise).
