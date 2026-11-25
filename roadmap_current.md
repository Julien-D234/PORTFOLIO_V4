# Tâche en cours — Étape 7 : mini-jeux

État : 🟡 en cours · Branche : `vibe/etape-7-jeux` · Base : `main` (`4903192`, étapes 5+6 mergées via PR #14/#15)

## Objectif de l'étape 7 (plan validé par Julien)

Mini-jeux **ajoutés au fil du temps par l'admin** (table `game`, aucun jeu en dur dans le code). La page
`/{lang}/games/[slug]` (connexion requise) crée une `game_session` et remet au jeu un **ticket JWT HS256 de 10 min**
par `postMessage` (jamais dans l'URL) — le ticket ne sert **qu'à remonter les stats** (`stats`) et à se renouveler
(`refresh`) tant que la session est ouverte ; il n'ouvre aucune page. Plafonds de vraisemblance par jeu, rate-limit,
clé API du jeu (`x-api-key`, hash SHA-256, affichée une seule fois) pour `start` machine-to-machine. Section stats
du profil branchée sur `game_stat`.

## Checklist

- [x] i18n `games.*`, `admin.games.*`, `profile.stats.*` fr/en + nav admin
- [x] Schéma + migration `0003` : `game`, `game_session`, `game_stat`
- [x] `src/lib/game-schema.ts` (Zod : jeu, limites, stats)
- [ ] Ports : `src/server/games/jwt.ts` (issue/verify HS256, node:crypto, secret dérivé) + `api-keys.ts` + tests (tamper, expiry)
- [ ] `src/server/games/{queries,mutations}.ts` : CRUD admin, startSession, refreshSession, recordStat (plafonds + rate-limit + session ouverte) + tests PGlite
- [ ] API v1 100 % POST : `start` (x-api-key), `refresh` (Bearer), `stats` (Bearer + plafonds) + test structurel api/v1 (auth avant BDD, POST only)
- [ ] Admin `/admin/games`, `/new`, `/[id]` + éditeur (champs, limites, clé API régénérable affichée une fois, publish/unpublish, delete par slug)
- [ ] Pages publiques `/[lang]/games` + `/[lang]/games/[slug]` (iframe sandbox + postMessage, ou module interne)
- [ ] Profil : section stats par jeu réelle (`game_stat`)
- [ ] `npm run check` + `build` + smoke one-shot par bloc (mauvaise clé → 401, ticket expiré → 401, plafond → 422, 121e stat/min → 429, cycle start→refresh→stats→profil)
- [ ] Commits → push → PR draft → CI verte → merge sur « go merge »

## Blocages / erreurs signalées (corrigées)

- (à compléter au fil de l'eau)

## Prochaine étape (à valider avant code)

Étape 8 — Production VPS Debian 12 : provisionnement + durcissement (SSH clé seule, UFW 22/80/443 tcp+udp,
`unattended-upgrades`, pas de fail2ban), Docker repo officiel, build sur le VPS, migrations au démarrage, Caddy,
cron (prune + check `/api/health`). Liste précise des actions serveur soumise à Julien avant exécution.
