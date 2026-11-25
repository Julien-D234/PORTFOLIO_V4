# Tâche en cours — Étape 6 : profil utilisateur

État : 🟡 en cours · Branche : `vibe/etape-6-profil` · Base : `main` (`9955bb0`, étape 5 mergée via PR #14)

## Objectif de l'étape 6 (plan validé par Julien)

Page `/{lang}/profile` pour tout utilisateur **connecté** (`requireUser`) : infos du compte en lecture seule
(nom, e-mail, rôle, créé le), **changement de langue** (persisté en base `user.locale` + cookie `NEXT_LOCALE`,
puis redirection vers `/{nouvelle-langue}/profile` — décision actée), **changement de mot de passe** (formulaire
existant réutilisé), et une section **stats par jeu** en placeholder (branchée à l'étape 7 sur `game_stat`).

## Checklist

- [x] i18n `profile.*` fr/en + `admin.nav.profile` (parité testée)
- [ ] `src/lib/profile-schema.ts` (Zod `{locale: fr|en}`) + test
- [ ] `src/server/profile/queries.ts` : `setUserLocale(db, userId, locale)` (update + audit `profile.locale_changed`) + test PGlite
- [ ] Route `POST /api/profile/locale` : `requireApi()` + `isSameOrigin` + rate-limit 10/min + Zod → 200 + `Set-Cookie NEXT_LOCALE` (Path=/, Max-Age 1 an, SameSite=Lax) + test structurel (api/profile → requireApi + isSameOrigin, POST only)
- [ ] `src/components/profile/language-form.tsx` (boutons FR/EN → POST → redirect `/{lang}/profile` ou refresh)
- [ ] Page `src/app/[lang]/profile/page.tsx` (requireUser, infos, langue, `ChangePasswordForm` avec `redirectTo`, stats placeholder) + `generateMetadata`
- [ ] `ChangePasswordForm` : prop optionnel `redirectTo` (rétrocompatible)
- [ ] Lien « Profil » dans la nav admin + `ARBORESCENCE.md`
- [ ] `npm run check` + `build` + smoke one-shot par bloc (anon → 307 ; user → 200 ; POST sans Origin → 403 ; locale invalide → 400 ; `en` → 200 + cookie + DB ; 11e POST → 429)
- [ ] Commits → push → PR draft → CI verte → merge sur « go merge »

## Blocages / erreurs signalées (corrigées)

- (à compléter au fil de l'eau)

## Prochaine étape (à valider avant code)

Étape 7 — Mini-jeux : schéma (`game`, `game_session`, `game_stat`), admin `/admin/games*` (jeux ajoutés au fil du
temps via la table, clé API hachée révocable, limites de vraisemblance), pages `/[lang]/games` + `/[lang]/games/[slug]`,
JWT HS256 10 min (postMessage, jamais dans l'URL), `POST /api/v1/games/{slug}/start|stats`, section stats du profil
branchée sur `game_stat`, revue de sécurité dédiée, tests + smoke.
