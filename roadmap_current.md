# Tâche en cours — Étape 2 : authentification + rôles

État : 🟡 en cours · Branche : `vibe/etape-2-auth` (PR à ouvrir) · Base : `main` (étape 1 mergée via PR #10)

## Objectif de l'étape 2

Auth robuste sans inscription publique : schéma Drizzle (tables Better Auth + `rate_limit` + `audit_log`, migration
`drizzle/0000_*.sql`), factory testable `src/server/auth/create-auth.ts` (seul import de `better-auth`), logique pure
`authz.ts`, gardes `src/server/guards.ts` (`requireUser`/`requireAdmin`/`requireApi`), route `/api/auth/[...all]`,
script `create-admin`, Argon2id, mdp 12–128, sessions 7 j sans cache cookie, rate-limit en base (5/min sur sign-in),
verrouillage 10 échecs → 15 min, `SELF_ACTION`/`LAST_ADMIN`, impersonation bloquée, audit `login_failed`/`account_locked`.

## Checklist

- [x] `src/server/db/schema.ts` + migration `drizzle/0000_daffy_carmella_unuscione.sql` (`npm run db:generate`)
- [x] `src/server/auth/password.ts` (Argon2id 64 MiB t=3 p=1, verify sans exception)
- [x] `src/server/auth/authz.ts` (pur, testé) + `create-auth.ts` (Better Auth 1.7 + plugin admin + plugin local
  `security-hooks` : impersonation 403, lockout, politique mdp sur endpoints admin, SELF_ACTION/LAST_ADMIN)
- [x] `src/server/guards.ts` + `src/app/api/auth/[...all]/route.ts`
- [x] `scripts/create-admin.mts` (mdp saisi masqué, `ADMIN_PASSWORD` pour la CI)
- [x] Tests : `tests/authz.test.ts` (7), `tests/auth.test.ts` (8, PGlite) → **26 tests au total, `npm run check` vert**
- [x] `npm run build` vert ; smoke HTTP sur build de prod (PGlite) : mauvais mdp → 401 identique à email inconnu,
  sign-up → 400 désactivé, bon mdp → 200 + cookie session, `get-session` OK/null, 6e tentative → 429, health OK
- [ ] Commit(s) → push → PR draft → CI verte

## Blocages / erreurs signalées (corrigées dans l'étape)

- `server-only` dans `env.ts` cassait les tests/scripts → retiré (le module est partagé serveur + CLI).
- better-auth 1.7 : `hooks.before/after` = handler unique en top-level ; les hooks typés avec `path`/`context` passent
  par un **plugin** local (`hooks: { before: [{ matcher, handler }] }`).
- Les after-hooks doivent retourner un objet (`return {}`) sinon crash interne (`result.headers` de undefined) —
  y compris sur les `return;` précoces (ex. email inconnu → 500 sinon).
- `PGLiteSocketServer` (L majuscule) dans `@electric-sql/pglite-socket` ; sous `tsx`, utiliser `import * as ns`.
- Les processus lancés en arrière-plan ne survivent pas entre deux appels shell de l'agent → smoke en une seule commande.
- `curl` bloqué → smoke via `node --input-type=module` + `fetch` sur 127.0.0.1.

## Prochaine étape (à valider avant code)

Étape 3 — pages `/[lang]/login`, `/[lang]/change-password`, déconnexion POST, `/[lang]/welcome` (invitations) :
formulaires en `fetch` client vers `/api/auth/*` (le rate-limit ne s'applique pas aux appels serveur directs),
`safeRedirect` (liste blanche), erreurs 401 identiques traduites, 429/banni gérés, redirection `mustChangePassword`.
