# HANDOFF — PORTFOLIO_V4

Projet reconstruit de zéro dans `Julien-D234/PORTFOLIO_V4` (l'ancien `PORTFOLIO_V3` reste en référence).
Branche de travail : `vibe/rebuild-v4-ad0ea2`, livraison par PR vers `main`.

État : **étape 1 (socle) en cours** — voir `ROADMAP.md` (vue d'ensemble) et `roadmap_current.md` (tâche en cours).

## Décisions actées

- Charte V2 (double thème, ombre dure, bichromie CSS, rayon 4 px, `#ffd84a`, monospace titres/dates/tags/boutons,
  thème = système mémorisé après bascule).
- Stack : Next.js 16.4 (`src/proxy.ts`) + TS strict + Tailwind 4 + PostgreSQL 17/Drizzle + Better Auth 1.7 (Argon2id)
  + Zod 4 + Vitest/PGlite + i18n maison + Docker/Caddy.
- Architecture briques remplaçables (ports/adapters — voir `AGENTS.md`).
- Production : VPS **Debian 12 à provisionner** (étape 8) ; SSH clé seule, UFW 22/80/443 tcp+udp, pas de fail2ban,
  Docker repo officiel, `unattended-upgrades`, build sur le VPS, migrations au démarrage.
- **Pas de sauvegarde pour l'instant** (tâche ROADMAP différée ; risque noté dans `SECURITY.md`).

## Commandes

```bash
npm install --include=dev
npm run check        # lint + typecheck + tests
npm run build
npm run dev:db       # PGlite sur 127.0.0.1:5544 (une seule connexion → DB_POOL_MAX=1 côté app)
npm run db:migrate
```

## Pièges

- `NODE_ENV=production` dans le shell → `npm install` saute les devDependencies (`--include=dev` obligatoire).
- Pas de daemon Docker côté agent : PGlite pour la DB, job CI `docker` pour l'image.
- Next 16 : `proxy.ts` (pas `middleware.ts`), `params` = Promise, `next typegen` via `npm run typecheck`.
- Ne jamais committer `.env` ni afficher de secret ; push/PR via `gh` (authentifié Julien-D234).
- `next start` avertit avec `output: standalone` → smoke via `node .next/standalone/server.js`.
- `curl` est bloqué dans l'environnement de l'agent → smoke via `node --input-type=module` + `fetch` sur `127.0.0.1`.
- Push via `git push` (les permissions de l'app GitHub `MistralAI` ont été passées en Contents: Read and write sur
  PORTFOLIO_V4 : https://github.com/apps/mistralai → Configure).
