# PORTFOLIO_V4

Plateforme personnelle : portfolio de projets + hébergement de mini-jeux + comptes avec rôles, en fr/en.

Reconstruction de zéro de `PORTFOLIO_V3` (conservé à titre de référence). Voir `CAHIER_DES_CHARGES.md` pour le
périmètre complet, `ROADMAP.md` pour l'avancement global et `roadmap_current.md` pour la tâche en cours.

## Stack

Next.js 16.4 (App Router, `src/proxy.ts`) · React 19 · TypeScript strict · Tailwind CSS 4 · PostgreSQL 17 + Drizzle ·
Better Auth 1.7 (plugin admin, Argon2id) · Zod 4 · Vitest 5 + PGlite · i18n maison (`src/i18n/`, `messages/{fr,en}.json`) ·
Docker + Caddy. Node 22.

## Commandes

```bash
npm install --include=dev   # NODE_ENV=production dans le shell fait sauter les devDependencies
npm run check               # lint + typecheck (next typegen) + tests Vitest
npm run build
npm run dev:db              # Postgres PGlite local (PORT=5544 pour changer de port)
npm run db:migrate          # applique drizzle/*.sql sur DATABASE_URL
```

Variables d'environnement : voir `.env.example` (`DATABASE_URL`, `BETTER_AUTH_SECRET` ≥ 32 car., `BETTER_AUTH_URL`).

## Démarrage local (sans Docker)

```bash
PORT=5544 npm run dev:db   # en arrière-plan
export DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5544/postgres BETTER_AUTH_SECRET=<32+ car.> BETTER_AUTH_URL=http://localhost:3000
npm run db:migrate
npm run dev
```

## Docker

```bash
cp .env.example .env   # puis éditer
docker compose up -d --build                 # dev : app sur :3000
# prod (VPS) :
docker compose -f docker-compose.yml -f docker/docker-compose.prod.yml up -d --build   # + Caddy (80/443)
```

## Principes

- **Sécurité d'abord** : contrôle d'accès côté serveur uniquement (`src/server/guards.ts`), routes admin 100 % en POST
  (`requireApi("admin")` + `isSameOrigin` avant tout accès BDD), CSP à nonce, en-têtes de sécurité systématiques.
- **Briques remplaçables** : chaque brique (DB, auth, médias, i18n, rate-limit, invitations) est derrière un port ;
  le code vendor est isolé dans un seul module par brique. Voir `AGENTS.md`.
- Pas d'inscription publique ; les comptes sont créés par un admin (lien d'invitation à usage unique).
- Travail par étapes : plan validé par Julien avant tout code, un commit par bloc, tests + revue sécurité à chaque étape.
