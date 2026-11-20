# Tâche en cours — Étape 5 : projets + médias

État : 🟡 en cours · Branche : `vibe/etape-5-projets` · Base : `main` (`d44f264`, étapes 1–4 mergées via PR #10/#11/#12/#13)

## Objectif de l'étape 5

CRUD projets bilingue (fr/en) avec médias uploadés, pages publiques (deck immersif + page détail), admin projets,
et application de la charte V2 aux pages projets **après validation visuelle de la maquette**.

- Schéma Drizzle + migration `0002_*` : `project`, `project_translation`, `project_image`, `media_file`, `tag`, `project_tag`.
- Upload sécurisé `POST /api/admin/media` (100 % POST, `adminPost`) : octets magiques JPEG/PNG/WebP uniquement
  (SVG/GIF refusés), plafond 5 Mo sur les octets reçus, `sharp` → WebP 1920 px + miniature 480 px, EXIF supprimé,
  bombes > 40 Mpx refusées (`limitInputPixels`), dimension min 100 px, stockage hors `public/` (`MEDIA_DIR`,
  `./.media` en dev / `/data/media` en Docker), id 32 hex. Service public `GET /media/[id]?v=thumb` :
  visible seulement si l'image appartient à un projet publié (sinon admin, sinon 404 indiscernable), headers
  `nosniff` + `Content-Security-Policy: default-src 'none'; sandbox` + cache immutable.
- Limites Zod `src/lib/project-schema.ts` : titre 120, résumé 200, description 10 000, alt 200, légende 300,
  URL 300 (https uniquement, sans credentials), tag 30, 15 tags, 30 images de galerie, slug 80
  (`^[a-z0-9]+(-[a-z0-9]+)*$`), position 0–9999.
- Données publiques `src/server/projects/public.ts` (liste publiés, détail publié, média public, repli fr champ par champ) ;
  mutations en transaction (tags insensibles à la casse, galerie, nettoyage des médias orphelins, publication exige
  titre+résumé fr, suppression exige de retaper le slug).
- API admin 100 % POST : `POST /api/admin/projects`, `/[id]`, `/[id]/publish`, `/[id]/unpublish`, `/[id]/delete`.
- Pages publiques `/[lang]/projects` (deck immersif : un projet par écran 100 dvh, animation roue interceptée
  SCROLL_MS=1400 un écran à la fois, pas de scroll-snap obligatoire desktop, snap uniquement `pointer:coarse`,
  navigation clavier, points, `prefers-reduced-motion`, voile sombre, bouton « Voir le projet ») et
  `/[lang]/projects/[slug]` (classique, description texte brut, galerie avec légendes, brouillon/inconnu → 404).
- Admin `/admin/projects`, `/new`, `/[id]` (éditeur onglets fr/en, tags, couverture, galerie réordonnable,
  barre d'actions fixe, avertissement modifications non enregistrées, suppression par re-saisie du slug).
- **Maquette `maquettes/projets-v2.html` (clair + sombre) à produire et faire valider par Julien AVANT** d'appliquer
  la charte V2 aux pages projets.
- i18n `projects.*` / `admin.projects.*` fr/en (parité testée) ; tests (requêtes/mutations projets, octets magiques
  et bombes médias, la matrice d'accès structurelle couvre automatiquement les nouvelles routes) ; smoke HTTP
  matrice anonyme/user/admin + Origin + cycle brouillon → publié → dépublié → supprimé + médias effacés.

## Checklist

- [x] Dépendance `sharp` ajoutée (package.json + lock)
- [ ] Schéma + migration `drizzle/0002_*` (6 tables)
- [ ] Pipeline média `src/server/media/*` + `POST /api/admin/media` + `GET /media/[id]` + tests (octets magiques, bombes)
- [ ] `src/lib/project-schema.ts` (Zod + LIMITS) + tests
- [ ] `src/server/projects/public.ts` + mutations (transaction) + tests PGlite
- [ ] API admin 100 % POST (projects, publish/unpublish/delete) + matrice d'accès
- [ ] Maquette `maquettes/projets-v2.html` → **validation visuelle Julien**
- [ ] Pages publiques `/[lang]/projects` (deck) + `/[lang]/projects/[slug]` (détail)
- [ ] Admin `/admin/projects`, `/new`, `/[id]`
- [ ] i18n `projects.*` / `admin.projects.*` fr/en
- [ ] `npm run check` + `build` verts à chaque bloc + smoke HTTP one-shot (PGlite + prod)
- [ ] Commit(s) → push → PR draft → CI verte

## Blocages / erreurs signalées (corrigés)

- (à compléter au fil de l'eau)

## Prochaine étape (à valider avant code)

Étape 6 — Mini-jeux : schéma (`game`, `game_session`, `game_stat` JSONB), page de sélection, JWT 10 min
(userId+gameId), `POST /api/v1/games/{slug}/stats` + clé API hachée révocable par jeu, plafonds de vraisemblance,
rate-limit, revue de sécurité dédiée.
