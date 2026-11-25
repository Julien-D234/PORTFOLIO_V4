# Tâche en cours — Étape 8 : production (VPS Debian 12 existant)

État : 🟡 en cours · Branche : `vibe/etape-8-prod` · Base : `main` (`535bb5a`, étapes 5+6+7 mergées via PR #14/#15/#16)

## Objectif de l'étape 8 (décision Julien : VPS déjà en service → on démarre au point 6)

Déployer PORTFOLIO_V4 sur le VPS Debian 12 existant : Docker (repo officiel), build sur le VPS, migrations au
démarrage, Caddy en frontal HTTPS (Let's Encrypt), cron (healthcheck + prune). **Aucune action serveur sans accord
préalable de Julien** — la liste exacte des commandes est dans `DEPLOIEMENT.md`.

## Checklist

- [x] `DEPLOIEMENT.md` : points 6→8 avec commandes exactes (Docker officiel, clone `/opt/portfolio`, `.env` prod,
      build + `up -d` avec `docker-compose.prod.yml`, vérif `/api/health`, MàJ code, rollback, crontab healthcheck 5 min + prune hebdo)
- [x] `.env.example` : bloc prod explicite (`DATABASE_URL` → service `db`, `BETTER_AUTH_URL=https://SITE_DOMAIN`)
- [x] Vérification des fichiers prod existants : `docker-compose.prod.yml` (ports app resetés, caddy 80/443 tcp+udp),
      `docker/Caddyfile` (reverse_proxy app:3000, www→nu), `Dockerfile` (runner non-root, read-only, healthcheck)
- [ ] Exécution côté serveur par Julien (points 6, 7, 8 de `DEPLOIEMENT.md`), une action à la fois avec accord
- [ ] Vérif post-déploiement : `https://SITE_DOMAIN/api/health`, login admin, upload média, page projets/jeux
- [ ] PR → CI verte → merge sur « go merge »

## Hors scope acté

- Pas de sauvegarde offsite pour l'instant (risque accepté, dette notée dans `SECURITY.md`).
- Pas de fail2ban ; SSH clé seule et UFW déjà en place sur le VPS existant.

## Blocages / erreurs signalées (corrigées)

- (à compléter au fil de l'eau)

## Prochaine étape

Après déploiement : revue transverse (accueil + navigation globale, envoi d'invitations par e-mail/SMTP,
sauvegardes offsite) — voir tableau « Tâches transverses / différées » de `ROADMAP.md`.
