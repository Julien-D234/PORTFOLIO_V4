# Tâche en cours — Étape 3 : pages de connexion

État : 🟡 en cours · Branche : `vibe/etape-3-login` · Base : `main` (étapes 1+2 mergées, PR #10 + #11)

## Objectif de l'étape 3

Pages d'auth visibles et sûres : `/[lang]/login` (formulaire `fetch` vers `/api/auth/sign-in/email`, erreurs
traduites 401/403/429, `safeRedirect` anti open-redirect, redirection `mustChangePassword` → change-password),
`/[lang]/change-password` (derrière `requireUser({ allowMustChangePassword: true })`, hook qui lève
`mustChangePassword` après succès), bouton déconnexion (POST `/api/auth/sign-out`).

## Checklist

- [x] i18n `auth.*` fr/en (parité testée) : login, changePassword, signOut
- [x] `src/lib/auth-forms.ts` : `safeRedirect` (blanc `/​{lang}/…`, refuse `//`, `\`, `..`, langues inconnues, non-`/`)
  + `isValidEmail` + tests (8 cas)
- [x] `src/lib/password-policy.ts` (constantes sans vendor, importable côté client — argon2 natif sinon dans le bundle)
- [x] Composants client : `LoginForm`, `ChangePasswordForm`, `SignOutButton` (`useRouter().push`, charte V2)
- [x] Pages `/[lang]/login` (redirect si déjà connecté, param `?redirect=` sanitizé) et `/[lang]/change-password`
  (garde `requireUser` avec `allowMustChangePassword`)
- [x] Hook `after` `/change-password` : lève `mustChangePassword` après succès
- [x] **30 tests verts**, lint 0 warning, build OK
- [x] Smoke HTTP (PGlite + prod) : `/fr/login` 200 + formulaire ; `/fr/change-password` anonyme → 307 `/fr/login` ;
  connecté → 200 ; sign-in 200 ; change-password mauvais actuel → 400 ; OK → 200 ; re-sign-in nouveau mdp → 200 ;
  sign-out → session null
- [ ] Commit(s) → push → PR draft → CI verte

## Blocages / erreurs signalées (corrigées)

- `@node-rs/argon2` (natif) était tiré dans le bundle client via `password.ts` → constantes déplacées dans
  `src/lib/password-policy.ts`.
- `window.location.href` → `useRouter().push()` (règle lint Next).
- better-auth renvoie 400 `INVALID_PASSWORD` (pas 401) pour un mauvais mdp actuel → mappé dans le formulaire.

## Prochaine étape (à valider avant code)

Étape 4 — Administration des comptes : table `invitation` (jeton SHA-256, 48 h, usage unique, lien en fragment
`/[lang]/welcome#token=…`), `POST /api/admin/users` + régénération, `POST /api/welcome` (public, 10/min/IP,
connexion immédiate, politique mdp avant consommation, réponse `INVALID_LINK` uniforme), pages
`/admin`, `/admin/users` (+ new, `[id]`), `/admin/audit`, actions admin (rôle, ban 1h/1j/7j/30j/définitif, débannir,
révoquer sessions, supprimer en retapant l'e-mail, déverrouiller), `isSameOrigin` sur tout POST admin,
**toutes les routes admin en POST**, non-admin → 404 sur les pages, matrice de tests + smoke curl.
