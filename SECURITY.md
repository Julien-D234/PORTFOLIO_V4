# Sécurité

## Signalement

Projet personnel de Julien (GitHub `Julien-D234`). Pour signaler un problème de sécurité, ouvrir une issue privée
(security advisory) sur le dépôt plutôt qu'une issue publique.

## Principes appliqués

- **CSP stricte à nonce** par requête (`src/lib/csp.ts`, posée par `src/proxy.ts`) : pas de `style=` inline dans le JSX
  (classes Tailwind ; les modifs CSSOM en JS restent permises).
- **En-têtes** (`next.config.ts`) : HSTS preload, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy` (caméra/micro/géoloc/paiement/usb vides), COOP/CORP `same-origin`, `poweredByHeader: false`.
- **Contrôle d'accès serveur uniquement** : `src/server/guards.ts` (`requireUser` / `requireAdmin` / `requireApi`),
  session relue en base à chaque requête (ban/rôle immédiats), non-admin → 404 sur les pages admin.
- **Routes admin 100 % en POST** avec `requireApi("admin")` puis `isSameOrigin` (Origin exact) avant tout accès BDD,
  puis lecture JSON bornée, puis validation Zod. Un test structurel interdit PUT/PATCH/DELETE sur `api/admin/**`.
- **Auth** : email + mot de passe, `disableSignUp`, Argon2id, mdp 12–128 car., rate-limit en base, verrouillage de
  compte (10 échecs → 15 min), réponse 401 identique, sessions 7 j en cookie `httpOnly` `SameSite=Lax` `__Secure-` en
  prod, impersonation bloquée, dernier admin protégé (`LAST_ADMIN`), auto-actions interdites (`SELF_ACTION`).
- **Invitations** à usage unique : jeton en fragment d'URL (jamais envoyé au serveur), seul le SHA-256 est stocké,
  expiration 48 h, consommation atomique, `Referrer-Policy: no-referrer` + `no-store` sur la page d'activation.
- **Médias** : upload vérifié par octets magiques (JPEG/PNG/WebP, SVG/GIF refusés), recompression WebP via `sharp`
  (EXIF supprimé, plafond de pixels), stockage hors `public/`, service par id aléatoire avec 404 indiscernable.
- **Conteneurs** : app non-root, FS read-only, `cap_drop: ALL`, `no-new-privileges`, Postgres non exposé,
  `npm audit --omit=dev --audit-level=high` en CI.
- **Secrets** : jamais dans git ni dans les logs ; `.env` généré sur place (`openssl`), `.env` dans `.gitignore`.
- **API v1 jeux** (`/api/v1/games/{slug}/*`, 100 % POST) : `start` exige la clé API du jeu (`x-api-key`, seul le hash
  SHA-256 est stocké, comparaison en temps constant) ; `stats`/`refresh` exigent un ticket JWT HS256 de 10 min
  (signé avec un secret dérivé de `BETTER_AUTH_SECRET`, `node:crypto`, vérifié en `timingSafeEqual`, alg imposé) lié à une
  session ouverte (`game_session.expiresAt`) ; le ticket ne sert qu'aux stats, jamais à ouvrir une page. Plafonds de
  vraisemblance appliqués serveur (score/durée/taille du payload selon `game.limits`), rate-limit par joueur+jeu,
  CORS limité à l'origine https du jeu (Bearer, sans cookies), test structurel : auth avant tout accès BDD sur `api/v1/**`.
  Le ticket est transmis au jeu par `postMessage` (jamais dans l'URL) ; les iframes de jeux sont en
  `sandbox="allow-scripts"` et la CSP autorise `frame-src https:`.

## Dette connue

- Pas de sauvegarde hors serveur pour l'instant (tâche ROADMAP différée) : jusqu'à sa mise en place, une perte du VPS
  entraîne la perte des données et des médias.
- IP du rate-limit lue dans `X-Forwarded-For` : sûr uniquement derrière Caddy.
