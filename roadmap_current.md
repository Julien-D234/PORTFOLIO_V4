# Tâche en cours — Étape 1 : socle technique

État : 🟡 en cours · Branche : `vibe/rebuild-v4-ad0ea2` · PR : voir lien dans `HANDOFF.md`

## Objectif de l'étape 1

Socle exécutable et testé : Next.js 16.4 (App Router, `src/proxy.ts`) + TS strict + Tailwind 4, i18n maison fr/en
avec redirection de langue, CSP à nonce + en-têtes de sécurité, thème V2 global (double thème, bascule mémorisée),
accueil `/{lang}` volontairement vide, `GET /api/health`, ports/adapters (DB), scripts `db:*`/`dev:db`, CI GitHub
Actions + Dependabot, Docker/Caddy, docs (README, SECURITY.md, AGENTS.md, CAHIER_DES_CHARGES.md, HANDOFF.md,
ROADMAP.md, roadmap_current.md). **Sans sauvegarde** (décision : plus tard).

## Checklist

- [x] Branche `vibe/rebuild-v4-ad0ea2` + dépendances installées (package-lock.json)
- [x] `package.json` / `tsconfig.json` strict / ESLint 9 / Vitest 5 / drizzle.config.ts
- [x] i18n : `src/i18n/`, `messages/fr.json` + `en.json` (parité testée), `src/lib/locale.ts`
- [x] `src/proxy.ts` : redirection 307 de langue + CSP à nonce + `x-locale`/`x-nonce`
- [x] En-têtes de sécurité dans `next.config.ts`
- [x] Thème V2 global (`globals.css` : variables clair/sombre, `prefers-color-scheme`, `data-theme`) + bascule cookie
  (`ThemeToggle`) + accueil vide + `GET /api/health`
- [x] Ports/adapters socle : `src/server/env.ts`, `src/server/db/index.ts` (seul import pg/drizzle)
- [x] Scripts : `dev:db` (PGlite socket), `db:migrate` (no-op tant que `drizzle/` est absent)
- [x] CI `.github/workflows/ci.yml` (check + docker) + `dependabot.yml`
- [x] Docker : Dockerfile multi-étapes, `docker-compose.yml`, `docker/docker-compose.prod.yml` + Caddyfile
  (pas de `backup.sh` — sauvegardes différées)
- [x] Docs : README, SECURITY.md, AGENTS.md, CAHIER_DES_CHARGES.md, HANDOFF.md, ROADMAP.md, roadmap_current.md
- [x] Tests : parité fr/en, locale, CSP → `npm run check` (lint + typecheck + 11 tests) et `npm run build` verts
- [x] Smoke sur build de prod (`node .next/standalone/server.js`) : `/`→307 `/fr` (défaut), `Accept-Language: en`→`/en`,
  cookie `NEXT_LOCALE=en`→`/en`, CSP à nonce + en-têtes présents, `<html lang="fr">`, `/api/health` → `{"status":"ok"}` no-store
- [ ] Commit(s) → push → PR draft → CI verte

## Prochaine étape (à valider avant code)

Étape 2 — Auth + rôles : schéma Drizzle (`user`/`session`/`account`/`verification` + `rate_limit`/`audit_log`),
Better Auth 1.7 + plugin admin + Argon2id via la factory `src/server/auth/create-auth.ts`, gardes
`src/server/guards.ts`, logique pure `authz.ts`, hooks (rate-limit, verrouillage, politique mdp 12–128), scripts
`create-admin`, migrations `drizzle/0000_init.sql`, tests PGlite.

## Blocages / erreurs signalées

- `"type": "commonjs"` dans package.json cassait le build Next 16 (sources ESM) → package passé en `"type": "module"`
  (les scripts `.mts` restent ESM). Corrigé dans l'étape 1.
- `eslint-config-next` v16 n'exporte plus `./vitest` → config flat via `core-web-vitals` + `typescript`. Corrigé.
- `curl` est bloqué dans l'environnement de l'agent → smoke tests via `node --input-type=module` + `fetch` sur 127.0.0.1.
- `next start` avertit avec `output: standalone` → smoke via `node .next/standalone/server.js`.
