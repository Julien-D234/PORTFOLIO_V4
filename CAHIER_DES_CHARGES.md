# Cahier des charges — PORTFOLIO_V4 (V3)

Plateforme personnelle : portfolio de projets + hébergement de mini-jeux + comptes, rôles et statistiques.
Propriétaire : Julien (GitHub `Julien-D234`). Langue de travail : français.
Ce document permet de refaire le projet de zéro. Avancement : `ROADMAP.md` (global) et `roadmap_current.md` (tâche en cours).

## 0. Consigne d'origine — à respecter

**Rôle** : architecte logiciel senior + développeur full-stack expert en sécurité web.
**Contexte** : base d'une plateforme perso = portfolio + mini-jeux (projets séparés qui remontent des stats vers la
BDD principale, donc vers les profils). Stack moderne, maintenable par un développeur seul.
**Ordre des fonctionnalités** : 1) accueil (sans texte ni info perso) → 2) auth robuste + rôles user/admin →
3) page de connexion (pas d'inscription publique) → 4) admin sécurisée des comptes → 5) page projets →
6) page de sélection des mini-jeux → 7) profil avec stats des jeux → 8) production.
**Règles strictes** : sécurité d'abord (protection des routes par rôle = priorité absolue) ; ne pas coder avant
validation de Julien (plan proposé puis validé) ; penser l'intégration des futurs mini-jeux (remontée des stats) ;
expliquer le raisonnement étape par étape.

**Méthode de travail** : réponses en français, courtes ; travail par étapes (plan → validation → code → tests +
revue sécurité → un commit par bloc) ; avant toute action serveur, liste précise des actions soumise à Julien ;
l'agent signale ses propres erreurs.

## 1. Périmètre

| # | Fonction | Statut |
|---|---|---|
| 1 | Socle (Next.js, i18n, CSP, thème V2, CI, Docker) | 🟡 en cours |
| 2 | Auth + rôles user/admin + garde-fous | ⬜ |
| 3 | Connexion / changement de mot de passe (pas d'inscription publique) | ⬜ |
| 4 | Administration des comptes (liste, détail, actions, invitations, audit) | ⬜ |
| 5 | Projets (public immersif + détail + admin + médias) + charte V2 | ⬜ |
| 6 | Mini-jeux (sélection + API de stats) | ⬜ |
| 7 | Profil (stats par jeu, mdp, langue) | ⬜ |
| 8 | Production (VPS Debian 12) | ⬜ |

Acteurs : visiteur (anonyme), utilisateur (compte créé par un admin), administrateur. **Aucune inscription publique.**
Accueil volontairement vide pour l'instant (pas de lien vers login/admin ; accès par URL).

## 2. Stack (validée, figée)

Next.js 16.4 (App Router, **`src/proxy.ts`**, lire `node_modules/next/dist/docs/` avant de coder) · React 19 ·
TypeScript strict · Tailwind CSS 4 (`@tailwindcss/turbopack`) · PostgreSQL 17 + Drizzle (migrations SQL dans
`drizzle/`) · Better Auth 1.7 (plugin `admin`) + Argon2id (`@node-rs/argon2`) · Zod 4 · Vitest 5 + PGlite ·
i18n maison (`src/i18n/`, `messages/{fr,en}.json`, mêmes clés testées) · Node 22 · Docker + Compose + Caddy ·
GitHub Actions + Dependabot.

## 3. Architecture : briques remplaçables (décision actée)

Chaque brique est derrière un **port** ; le code vendor est isolé dans **un seul module par brique**, aucun autre
module ne l'importe (tableau dans `AGENTS.md`) : DB (`src/server/db/index.ts`), auth (`create-auth.ts` + `authz.ts`
pure), médias (`media/store.ts` : FS → S3 plus tard), i18n (`src/i18n/`), rate-limit (table PG → Redis plus tard),
invitations (lien manuel → SMTP plus tard). Tests au niveau du port. Postgres standard, thèmes en variables CSS,
aucun `style=` inline (CSP à nonce).

## 4. Internationalisation

fr (défaut) + en, extensible. URLs préfixées `/{lang}/…`. `proxy.ts` redirige (307) toute URL sans langue :
cookie `NEXT_LOCALE` valide > `Accept-Language` (pondération q) > `fr`. `Vary: Accept-Language, Cookie`.
Test de parité des clés fr/en. Contenu éditorial traduit en base avec repli fr champ par champ (étape 5).

## 5. Sécurité (priorité absolue)

- CSP à nonce par requête (`src/lib/csp.ts` + `src/proxy.ts`) ; en-têtes dans `next.config.ts` (HSTS preload,
  nosniff, XFO DENY, Referrer-Policy, Permissions-Policy, COOP/CORP, `poweredByHeader: false`). Le matcher de
  `proxy.ts` exclut `api`, `media/`, `_next/static`, `_next/image`, `favicon.ico` et les fichiers.
- Contrôle d'accès **côté serveur uniquement** (`src/server/guards.ts`) : session relue en base à chaque requête ;
  anonyme → 307 vers login ; `mustChangePassword` → change-password ; non-admin sur page admin → **404**.
  `requireApi(role?)` → 401/403 `{error:"CODE"}`.
- Routes admin **100 % en POST** : `requireApi("admin")` **avant** tout accès BDD, puis `isSameOrigin` (Origin exact),
  puis JSON borné, puis Zod. Test structurel interdisant PUT/PATCH/DELETE sur `api/admin/**`.
- Auth : email+mdp, `disableSignUp`, Argon2id, mdp 12–128 car. (aussi sur les endpoints admin via hook), sessions 7 j
  `httpOnly` `SameSite=Lax` `__Secure-` en prod, pas de cache cookie (ban immédiat), rate-limit en base (5
  connexions/min), verrouillage 10 échecs → 15 min, 401 identique, impersonation bloquée, `LAST_ADMIN`,
  `SELF_ACTION`, audit_log. `safeRedirect` (liste blanche) après connexion. Formulaires en `fetch` client vers
  `/api/auth/*` (le rate-limit ne s'applique pas aux appels serveur directs).
- Invitations à usage unique (remplacent le mdp provisoire) : jeton 256 bits dans le **fragment** d'URL
  (`/fr/welcome#token=…`), SHA-256 stocké, 48 h, consommation atomique, réponse `INVALID_LINK` uniforme,
  `Referrer-Policy: no-referrer` + `no-store` sur la page. Pas d'e-mail pour l'instant (l'admin transmet le lien).
- Médias (étape 5) : octets magiques (JPEG/PNG/WebP ; SVG/GIF refusés), 5 Mo max, `sharp` → WebP (EXIF supprimé,
  1920 px + miniature 480, bombes > 40 Mpx refusées), stockage hors `public/`, service `GET /media/[id]` (publié ou
  admin, sinon 404 indiscernable), `nosniff`, cache immutable.
- Conteneurs : app non-root, FS read-only, `cap_drop: ALL`, `no-new-privileges`, tmpfs, Postgres non exposé,
  `npm audit --omit=dev --audit-level=high` en CI.
- Secrets : jamais en git/logs ; `.env` généré sur place.

## 6. Design — charte V2 (validée, figée)

Double thème de même poids : clair « papier » `#f4f1ea` / sombre `#0a0a0b` (conservé) ; défaut
`prefers-color-scheme`, bascule manuelle mémorisée (cookie serveur, anti-flash). Cartes à **ombre dure** : bordure
`2px solid var(--ink)`, `box-shadow: 4px 4px 0 var(--shadow-c)` sans flou, rayon **4 px**, survol `(-2px,-2px)` +
ombre 6 px, appui `(4px,4px)` + ombre 0, focus `3px solid var(--acc)`. **Bichromie unique** des images en CSS
(`grayscale` + calques `lighten`/`multiply`, originaux intacts, teintes liées au thème). Surlignage `#ffd84a`
(ponctuel). Monospace sur **titres, dates, tags, boutons** ; texte `system-ui` 15 px/1,5. Tout en variables CSS.
Contrastes WCAG > AA dans les deux thèmes. Voile noir identique en immersif (`#000d → #0005 → #0002`).
Maquette `maquettes/projets-v2.html` (clair + sombre) **obligatoire avant** d'appliquer la charte aux pages projets.

## 7. Fonctionnalités détaillées (à construire, ordre imposé)

1. Accueil `/{lang}` : vide (fond du thème actif).
2. Auth + rôles : schéma Drizzle (tables Better Auth + `rate_limit`, `audit_log`, puis `invitation`), factory
   `create-auth.ts`, gardes, hooks, scripts `db:migrate` / `create-admin`, tests PGlite.
3. `/[lang]/login`, `/[lang]/change-password`, déconnexion POST, `/[lang]/welcome` (invitation).
4. Admin comptes : `/[lang]/admin`, `/admin/users` (+ new, `[id]`), `/admin/audit` — tout derrière `requireAdmin`.
5. Projets : modèle (`project`, `project_translation`, `project_image`, `media_file`, `tag`, `project_tag`),
   upload `POST /api/admin/media`, pages publiques `/[lang]/projects` (immersif, un projet par écran, défilement
   JS animé 1 écran à la fois, pas de scroll-snap mandatory sur desktop) et `/[lang]/projects/[slug]` (texte brut +
   galerie), admin `/admin/projects` (+ new, `[id]`), API admin 100 % POST.
6. Mini-jeux : `game`, `game_session`, `game_stat` (JSONB), page `/[lang]/games`, JWT court (10 min) userId+gameId,
   `POST /api/v1/games/{slug}/stats` + clé d'API hachée par jeu, plafonds de plausibilité, rate-limit, revue sécurité
   dédiée. **Plan à valider avant tout code.**
7. Profil `/[lang]/profile` (derrière `requireUser`) : stats par jeu, changement de mdp, langue (`user.locale`).
8. Production : voir §9.

## 8. Livraison et process

- Dépôt `Julien-D234/PORTFOLIO_V4` ; branche `vibe/**` + **PR vers `main`** (draft au début), merge après CI verte.
- CI : job `check` (`npm ci --include=dev`, lint, typecheck, tests, build, `npm audit --omit=dev --audit-level=high`)
  + job `docker` (build de l'image). Dependabot hebdo (npm, actions, docker) — vérifier avant de merger, ne pas
  monter Node/Postgres sans test.
- Un commit par bloc, messages en français.

## 9. Déploiement — VPS Debian 12 (à provisionner à l'étape 8)

- Debian 12 (bookworm) frais, user non-root sudo, **SSH clé seule** (`PasswordAuthentication no`,
  `PermitRootLogin no` dans `/etc/ssh/sshd_config.d/99-hardening.conf`), UFW 22/80/443 **tcp+udp** (443/udp = HTTP/3),
  `unattended-upgrades` (màj sécurité auto), sysctl durci, swap 2 Go. **Pas de fail2ban** (refus de Julien).
- **Docker Engine via le repo officiel Docker** (le paquet `docker.io` de Debian est trop vieux) + plugin compose.
- Code sur le VPS (build sur place, pas GHCR), `.env` à part (secrets `openssl` générés sur le VPS), compose prod :
  `app` (non-root, read-only, volume `media:/data/media`) + `db` (postgres:17-alpine, non exposé, healthcheck) +
  `migrate` (applique les migrations au démarrage, `service_completed_successfully`) + `caddy` (ports 80/443,
  TLS Let's Encrypt auto, redirect www → racine).
- Tâches serveur (cron root) : `docker system prune` hebdomadaire, contrôle `/api/health`. **Sauvegardes :
  différées volontairement** (pas de `backup.sh` pour l'instant ; à remettre en place plus tard : pg_dump + médias,
  local 14 j puis copie offsite chiffrée + test de restauration — risque accepté entre-temps, voir `SECURITY.md`).
- Procédure de redéploiement : backup image précédente (`docker tag`), transfert du code, rebuild, vérif
  `/api/health` + pages + logs. **Liste des actions soumise à Julien avant exécution.**

## 10. Critères de recette

1. `npm run check` vert ; `npm run build` OK ; CI verte (jobs `check` et `docker`).
2. Smoke curl sur build de prod : matrice anonyme/user/admin, Origin, méthodes, validations.
3. Prod : `/api/health` OK, certificat valide, en-têtes présents, `/fr/admin` → 307 anonyme.
