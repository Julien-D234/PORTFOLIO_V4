# Tâche en cours — Étape 6 : profil utilisateur

État : ✅ livrée (en attente de merge) · 🟡 · Branche : `vibe/etape-6-profil` · Base : `main` (`9955bb0`, étape 5 mergée via PR #14)

## Objectif de l'étape 6 (plan validé par Julien)

Page `/{lang}/profile` pour tout utilisateur **connecté** (`requireUser`) : infos du compte en lecture seule
(nom, e-mail, rôle, créé le), **changement de langue** (persisté en base `user.locale` + cookie `NEXT_LOCALE`,
puis redirection vers `/{nouvelle-langue}/profile` — décision actée), **changement de mot de passe** (formulaire
existant réutilisé), et une section **stats par jeu** en placeholder (branchée à l'étape 7 sur `game_stat`).

## Checklist

- [x] i18n `profile.*` fr/en + `admin.nav.profile` (parité testée)
- [x] `src/lib/profile-schema.ts` (Zod `{locale: fr|en}`) + test
- [x] `src/server/profile/queries.ts` : `setUserLocale` (update + audit `profile.locale_changed`) + test PGlite
- [x] Route `POST /api/profile/locale` : `requireApi()` + `isSameOrigin` + rate-limit 10/min + Zod → 200 + `Set-Cookie NEXT_LOCALE` + test structurel (api/profile → requireApi + isSameOrigin, POST only)
- [x] `src/components/profile/language-form.tsx` (boutons FR/EN → POST → redirect `/{lang}/profile` ou refresh)
- [x] Page `src/app/[lang]/profile/page.tsx` (requireUser, infos, langue, `ChangePasswordForm` avec `redirectTo`, stats placeholder) + `generateMetadata`
- [x] `ChangePasswordForm` : prop optionnel `redirectTo` (rétrocompatible)
- [x] Lien « Profil » dans la nav admin + `ARBORESCENCE.md`
- [x] `npm run check` (**59 tests**) + `build` + smoke one-shot **10/10 OK** (anon → 307/401 ; user → 200 ; POST sans Origin → 403 ; `de` → 400 ; `en` → 200 + cookie NEXT_LOCALE ; `/en/profile` → 200 ; 11e POST → 429)
- [x] Commits → push → PR draft → CI verte → merge sur « go merge »

## Blocages / erreurs signalées (corrigées)

- (à compléter au fil de l'eau)

## Prochaine étape (à valider avant code)

Étape 7 — Mini-jeux : schéma (`game`, `game_session`, `game_stat`), admin `/admin/games*` (jeux ajoutés au fil du
temps via la table, clé API hachée révocable, limites de vraisemblance), pages `/[lang]/games` + `/[lang]/games/[slug]`,
JWT HS256 10 min (postMessage, jamais dans l'URL), `POST /api/v1/games/{slug}/start|stats`, section stats du profil
branchée sur `game_stat`, revue de sécurité dédiée, tests + smoke.
