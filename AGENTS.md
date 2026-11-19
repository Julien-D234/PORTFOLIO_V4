# AGENTS.md — règles de travail sur ce dépôt

Propriétaire : Julien (GitHub `Julien-D234`). Langue de travail : **français**.Réponses courtes et directes.

## Méthode (contraignante)

1. **Ne jamais coder avant validation** : proposer un plan écrit (choix techniques + sécurité), attendre le feu vert de
   Julien, puis coder. Un commit par bloc.
2. **Sécurité d'abord** : protection des routes par rôle = priorité absolue. Toute page/layout admin appelle
   `requireAdmin` ; toute route `api/admin/**` appelle `requireApi("admin")` **avant** tout accès BDD, puis
   `isSameOrigin` (POST), puis lecture JSON bornée, puis Zod. Routes admin = **POST uniquement** (un test structurel
   l'impose). Non-admin → 404 sur les pages admin.
3. Tests + revue sécurité à chaque étape (`npm run check` vert, `npm run build` OK, smoke curl sur build de prod quand
   il y a des routes). Signaler ses propres erreurs dans `HANDOFF.md` / `roadmap_current.md`.
4. Avant toute action sur le serveur (VPS) : donner à Julien la **liste précise des actions** et attendre son accord.
5. Livraison : branche `vibe/**` + pull request vers `main` (draft au début), merge après CI verte. Ne jamais pousser de
   secret (`.env`, tokens, clés) ; ne jamais afficher de secret.

## Architecture : briques remplaçables (ports/adapters)

Chaque brique est derrière un port ; **le code vendor est isolé dans un seul module par brique** et aucun autre module
ne doit l'importer directement :

| Brique | Port (seul module autorisé à importer le vendor) |
|---|---|
| Base de données | `src/server/db/index.ts` (seul import de `pg` / `drizzle-orm`) |
| Auth | `src/server/auth/create-auth.ts` (seul import de `better-auth`) + logique pure `src/server/auth/authz.ts` |
| Stockage médias | `src/server/media/store.ts` (FS maintenant, S3 plus tard) |
| i18n | `src/i18n/` + `messages/*.json` (maison, remplaçable par next-intl) |
| Rate-limit | `src/server/rate-limit.ts` (table Postgres maintenant, Redis plus tard) |
| Invitations / e-mail | `src/server/admin/invitations.ts` (lien manuel maintenant, SMTP plus tard) |

Règles : tests au niveau du port (Vitest, PGlite), Postgres standard sans feature propriétaire, thèmes en variables
CSS (aucune couleur en dur dans les composants), pas de `style=` inline (CSP à nonce).

## Pièges d'environnement connus

- `NODE_ENV=production` dans le shell → `npm install` ignore les devDependencies : toujours `npm install --include=dev`
  (la CI utilise `npm ci --include=dev`).
- Pas de daemon Docker dans l'environnement de l'agent : tester la DB avec PGlite (`npm run dev:db`, une seule
  connexion → `DB_POOL_MAX=1` pour l'app) ; le build d'image Docker est couvert par le job CI `docker`.
- Next 16 : utiliser `src/proxy.ts` (pas `middleware.ts`) ; `params` des pages/layouts est une `Promise` ;
  types `PageProps`/`LayoutProps` générés par `next typegen` (lancé par `npm run typecheck`).
- Scripts en `.mts` (package CJS), `allowImportingTsExtensions` actif.
- Ne jamais faire de `pkill -f` avec un motif présent dans sa propre commande.
