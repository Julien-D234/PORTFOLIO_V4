# ROADMAP — PORTFOLIO_V4

Dernière mise à jour : étape 7 (mini-jeux) en cours — étapes 5+6 mergées via PR #14/#15. Tâche en cours et avancement détaillé : `roadmap_current.md`.

## Vue d'ensemble

| # | Tâche | Statut | Avancement |
|---|---|---|---|
| 1 | Socle technique (Next.js, i18n, CSP, thème V2, ports/adapters, CI, Docker) | ✅ fait (mergé via PR #10) | 100 % |
| 2 | Authentification + rôles user/admin + garde-fous | ✅ fait (mergé via PR #11) | 100 % |
| 3 | Pages connexion / changement de mot de passe / déconnexion | ✅ fait (mergé via PR #12) | 100 % |
| 4 | Administration des comptes (liste, détail, actions, invitations, audit, page welcome) | ✅ fait (mergé via PR #13) | 100 % |
| 5 | Projets (public immersif + détail + admin + upload médias) + charte V2 appliquée | 🟡 en cours | voir `roadmap_current.md` |
| 6 | Profil utilisateur (mot de passe, langue ; stats par jeu rattachées plus tard à l'étape 7) | 🟡 en cours | voir `roadmap_current.md` |
| 7 | Mini-jeux (sélection + API de remontée de stats) — **jeux ajoutés au fil du temps** via la table `game` (alimentée dynamiquement, aucun jeu en dur dans le code) | 🟡 en cours | voir `roadmap_current.md` |
| 8 | Production : VPS Debian 12 (provisionnement, durcissement, déploiement, tâches serveur) | ⬜ à faire | VPS à provisionner |

## Tâches transverses / différées

| Tâche | Statut | Note |
|---|---|---|
| Sauvegardes (pg_dump + médias, local 14 j, puis copie offsite chiffrée + test de restauration) | ⏸️ différée volontairement | Décision Julien : « on ne fait pas de sauvegarde pour l'instant ». Risque accepté : perte du VPS = perte données/médias (code sauvé sur GitHub). |
| Maquette `maquettes/projets-v2.html` (clair + sombre) | ✅ DA validée par Julien (PR #14) | Bouton « Voir le projet » remonté (contenu centré verticalement) |
| Accueil : design/contenu + navigation globale | ⬜ avec étape 5+ | Accueil volontairement vide pour l'instant |
| Envoi des invitations par e-mail (SMTP) | ⬜ plus tard | Liens transmis manuellement par l'admin en attendant |
| Filtre public par tags, point d'intérêt réglable des images | ⬜ idées V2+ | — |

## Décisions actées (ne pas rouvrir sans accord de Julien)

- Charte graphique **V2** : double thème clair `#f4f1ea` / sombre `#0a0a0b`, cartes à ombre dure (bordure 2 px, ombre
  4 px sans flou), rayon 4 px, bichromie unique des images en CSS, surlignage `#ffd84a` conservé, monospace sur
  titres/dates/tags/boutons, thème par défaut = `prefers-color-scheme` (bascule manuelle mémorisée en cookie).
- Stack : Next.js 16.4 + TS strict + Tailwind 4 + PostgreSQL 17/Drizzle + Better Auth 1.7 (Argon2id) + Zod 4 +
  Vitest/PGlite + i18n maison fr/en + Docker/Caddy.
- Architecture **briques remplaçables** (ports/adapters, voir `AGENTS.md`).
- Dépôt `Julien-D234/PORTFOLIO_V4`, livraison par **branche + PR** vers `main`.
- Production : **VPS Debian 12 à provisionner** (étape 8) ; Docker via repo officiel, `unattended-upgrades`, UFW
  22/80/443 tcp+udp, SSH clé seule, **pas de fail2ban**, build sur le VPS, migrations au démarrage.
- **Pas de sauvegarde pour l'instant** (voir tableau ci-dessus).
- **Ordre des étapes acté** : profil (étape 6) avant mini-jeux (étape 7) ; les stats par jeu seront rattachées au
  profil à l'étape 7. Les mini-jeux sont **ajoutés au fil du temps** via la table `game` (aucun jeu en dur dans le code).
