# Arborescence provisoire du site — PORTFOLIO_V4

Préfixe de langue partout : `/{lang}/…` avec `lang` = `fr` (défaut) ou `en`. Sans préfixe → 307 vers la langue
choisie (cookie `NEXT_LOCALE` > `Accept-Language` > `fr`). Statut : ✅ livrée · 🟡 en cours (étape 5) · ⬜ à faire.

## Pages publiques

| Route | Contenu | Statut |
|---|---|---|
| `/` | 307 → `/{lang}/` | ✅ |
| `/{lang}/` | Accueil — volontairement minimal pour l'instant (design + navigation globale à venir, voir ROADMAP) | ✅ (vide) |
| `/{lang}/login` | Connexion e-mail + mot de passe (accès **par URL uniquement** pour l'instant — aucun lien nulle part) | ✅ |
| `/{lang}/change-password` | Changement de mot de passe (forcé si `mustChangePassword`) | ✅ |
| `/{lang}/welcome#token=…` | Activation par invitation à usage unique (fragment jamais envoyé au serveur, `no-referrer` + `no-store`) | ✅ |
| `/{lang}/projects` | Deck immersif : un projet publié par écran 100 dvh | 🟡 étape 5 (maquette DA validée) |
| `/{lang}/projects/[slug]` | Page détail d'un projet publié (brouillon/inconnu → 404) | 🟡 étape 5 |
| `/{lang}/games` | Sélection des mini-jeux publiés (depuis la table `game`) | 🟡 étape 7 |
| `/{lang}/games/[slug]` | Lancement d'un jeu (connexion requise, session + ticket 10 min renouvelable, postMessage) | 🟡 étape 7 |
| `/{lang}/profile` | Profil : infos, mot de passe, langue, **stats par jeu** (étape 7) | ✅ étape 6 + 🟡 étape 7 |

## Espace admin (`requireAdmin` — non-admin → 404 sur les pages, 403 sur les API)

| Route | Contenu | Statut |
|---|---|---|
| `/{lang}/admin` | Tableau de bord (compteur users, derniers audits) | ✅ |
| `/{lang}/admin/users` · `/new` · `/[id]` | Comptes, invitations, actions, unlock | ✅ |
| `/{lang}/admin/audit` | Journal d'audit filtrable | ✅ |
| `/{lang}/admin/projects` · `/new` · `/[id]` | CRUD projets + médias + publish | ✅ code, 🟡 pages publiques en attente |
| `/{lang}/admin/games` · `/new` · `/[id]` | CRUD jeux (ajoutés au fil du temps) + clé API (affichée une fois) + limites | 🟡 étape 7 |

## API

| Route | Rôle | Statut |
|---|---|---|
| `/api/auth/*` | Better Auth (sign-in/out, change-password, admin user management) | ✅ |
| `/api/welcome` | POST public : activation invitation (rate-limit 10/min/IP) | ✅ |
| `/api/health` | Healthcheck (Docker/Caddy/cron) | ✅ |
| `/api/admin/*` | 100 % POST, `requireApi("admin")` + `isSameOrigin` + rate-limit : users, invitations, projets, médias | ✅ |
| `/api/v1/games/{slug}/start` | Démarre une session (clé API du jeu `x-api-key`, hash SHA-256) → ticket 10 min | 🟡 étape 7 |
| `/api/v1/games/{slug}/stats` + `/refresh` | Stats (Bearer ticket) + renouvellement du ticket tant que la session est ouverte | 🟡 étape 7 |
| `/media/[id]?v=thumb` | Service des médias WebP (public si projet publié, admin sinon, 404 indiscernable sinon) | ✅ |

## Fichiers statiques

- `/robots.txt`, `/favicon.ico`, médias traités hors `public/` (servis uniquement via `/media/[id]`).

## Notes

- Aucune page publique n'a de lien vers login/admin **volontairement** pour l'instant : accès par URL.
- La navigation globale (menu haut de page) arrivera avec le design de l'accueil (tâche transverse ROADMAP).
- Le menu « points » du deck projets : un point par projet publié, fixe à droite, cliquable ; l'actif est
  surligné `#ffd84a` ; navigation aussi à la molette (1 écran / 1400 ms), au clavier (↑ ↓ PageUp PageDown Home End)
  et au doigt (swipe) ; `prefers-reduced-motion` → transition instantanée.
