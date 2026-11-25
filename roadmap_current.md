# Tâche en cours — Étape 5 : projets + médias

État : 🟡 en cours · Branche : `vibe/etape-5-projets` · Base : `main` (`d44f264`, étapes 1–4 mergées via PR #10/#11/#12/#13) · PR draft : **#14**

## Objectif de l'étape 5

CRUD projets bilingue (fr/en) avec médias uploadés, pages publiques (deck immersif + page détail), admin projets,
et application de la charte V2 aux pages projets **après validation visuelle de la maquette**.

- Schéma Drizzle + migration `0002_*` : `project`, `project_translation`, `project_image`, `media_file`, `tag`, `project_tag`.
- Upload sécurisé `POST /api/admin/media` (100 % POST, admin + Origin + rate-limit) : octets magiques JPEG/PNG/WebP uniquement
  (SVG/GIF refusés), plafond 5 Mo sur les octets reçus, `sharp` → WebP 1920 px + miniature 480 px, EXIF supprimé,
  bombes > 40 Mpx refusées, dimension min 100 px, stockage hors `public/` (`MEDIA_DIR`, `./.media` en dev / `/data/media` en Docker),
  id 32 hex. Service public `GET /media/[id]?v=thumb` : visible seulement si le média appartient à un projet publié
  (sinon admin, sinon 404 indiscernable), headers `nosniff` + `Content-Security-Policy: default-src 'none'; sandbox` + cache immutable.
- Limites Zod `src/lib/project-schema.ts` : titre 120, résumé 200, description 10 000, alt 200, légende 300,
  URL 300 (https uniquement, sans credentials), tag 30, 15 tags, 30 images de galerie, slug 80
  (`^[a-z0-9]+(-[a-z0-9]+)*$`), position 0–9999.
- Données publiques `src/server/projects/public.ts` (liste publiés, détail publié, repli fr champ par champ) ;
  mutations en transaction (`src/server/projects/mutations.ts`) : tags insensibles à la casse, galerie réordonnée,
  nettoyage des médias orphelins, publication exige titre+résumé fr, suppression exige de retaper le slug.
- API admin 100 % POST : `POST /api/admin/projects`, `/[id]`, `/[id]/publish`, `/[id]/unpublish`, `/[id]/delete`.
- Pages publiques `/[lang]/projects` (deck immersif : un projet par écran 100 dvh, animation roue interceptée
  SCROLL_MS=1400 un écran à la fois, pas de scroll-snap obligatoire desktop, snap uniquement `pointer:coarse`,
  navigation clavier, points, `prefers-reduced-motion`, voile sombre, bouton « Voir le projet ») et
  `/[lang]/projects/[slug]` (classique, description texte brut, galerie avec légendes, brouillon/inconnu → 404).
- Admin `/admin/projects`, `/new`, `/[id]` (éditeur onglets fr/en, tags, couverture, galerie réordonnable,
  barre d'actions fixe, avertissement modifications non enregistrées, suppression par re-saisie du slug).
- **Maquette `maquettes/projets-v2.html` (clair + sombre) produite → validation visuelle Julien en attente (PR #14)**
  avant d'appliquer la charte V2 aux pages publiques.
- i18n `projects.*` / `admin.projects.*` fr/en (parité testée).

## Checklist

- [x] Dépendance `sharp` ajoutée (package.json + lock)
- [x] Schéma + migration `drizzle/0002_*` (6 tables)
- [x] Pipeline média `src/server/media/index.ts` + `POST /api/admin/media` + `GET /media/[id]` + 10 tests (octets magiques, bombes, stockage, visibilité)
- [x] `src/lib/project-schema.ts` (Zod + LIMITS) + tests
- [x] `src/server/projects/public.ts` + mutations transactionnelles + tests PGlite (cycle brouillon→publié→modifié→supprimé, médias orphelins)
- [x] API admin 100 % POST (`/api/admin/projects`, `/[id]`, `/[id]/publish|unpublish|delete`) — couvertes par la matrice d'accès structurelle
- [x] i18n `projects.*` / `admin.projects.*` fr/en (parité testée)
- [x] Admin `/admin/projects` (liste), `/new`, `/[id]` (éditeur complet)
- [x] Smoke HTTP one-shot (PGlite + prod, `DB_POOL_MAX=1`) : **28/28 OK** — matrice anon/user/admin, Origin, upload PNG 201 / SVG 415,
  média 404 brouillon → 200 publié (CSP sandbox + nosniff + immutable) → miniature → 404 dépublié → 200 admin,
  delete 422 mauvais slug → 200, médias orphelins effacés (0 fichier restant)
- [x] `npm run check` (56 tests) + `build` verts à chaque bloc
- [x] Commits poussés → PR draft **#14** ouverte
- [x] Maquette `maquettes/projets-v2.html` produite → **✅ DA validée par Julien** (bouton « Voir le projet » remonté)
- [ ] Pages publiques `/[lang]/projects` (deck immersif) + `/[lang]/projects/[slug]` (détail) — maquette validée, prêt à coder

## Blocages / erreurs signalées (corrigées)

- `errorResponse` ne passait pas les `Response` lancés par `requireApi` → 500 au lieu de 401/403 : passthrough ajouté dans `src/server/http.ts`.
- Smoke : better-auth exige un header `Origin` sur les POST (403 `MISSING_OR_NULL_ORIGIN` sinon) — le navigateur l'envoie toujours ; le script de smoke l'envoie explicitement.
- Smoke : PGlite est mono-connexion, le pool pg (max 10) provoquait des ECONNRESET → `DB_POOL_MAX=1` côté smoke (déjà documenté dans AGENTS.md).
- Union `NodePgDatabase | PgliteDatabase` : éviter `.returning({...})` sur l'union (erreur TS) → ids générés avant insert ; cast confiné `rawTx as unknown as MediaDb` dans les transactions.

## Prochaines étapes (à valider avant code)

Décision Julien (actée) : **profils avant mini-jeux**, stats par jeu rattachées plus tard ; les jeux seront
**ajoutés au fil du temps** (table `game` alimentée dynamiquement — admin/seed — aucun jeu en dur dans le code).

- **Étape 6 — Profil** `/[lang]/profile` : mot de passe, langue préférée ; la page prévoit déjà la place pour les
  stats par jeu (elles arriveront avec l'étape 7).
- **Étape 7 — Mini-jeux** : schéma (`game`, `game_session`, `game_stat` JSONB), page de sélection alimentée par la
  table `game`, JWT 10 min (userId+gameId), `POST /api/v1/games/{slug}/stats` + clé API hachée révocable par jeu,
  plafonds de vraisemblance, rate-limit, revue de sécurité dédiée.
