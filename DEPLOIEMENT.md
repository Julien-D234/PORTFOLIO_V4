# Déploiement — PORTFOLIO_V4 sur le VPS Debian 12 (existant)

Point de départ acté avec Julien : **VPS Debian 12 déjà en service** (SSH clé déjà en place, pare-feu et
mises à jour auto déjà gérés côté hébergeur/existant) → on démarre au **point 6 (Docker)**.
Hypothèse : `SITE_DOMAIN` (ex. `portfolio.example.fr`) a ses DNS A/AAAA pointés vers l'IP du VPS.

Règle : aucune de ces commandes n'est exécutée sans l'accord de Julien ; `.env` jamais commité.

## 6. Installer Docker (repo officiel, pas le paquet Debian)

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"   # puis se déconnecter/reconnecter
```

## 7. Déployer l'application (build sur le VPS, migrations au démarrage, Caddy en frontal HTTPS)

```bash
sudo mkdir -p /opt/portfolio && sudo chown "$USER" /opt/portfolio
cd /opt/portfolio
git clone https://github.com/Julien-D234/PORTFOLIO_V4.git .   # branche main

# .env prod (chmod 600, jamais commité) — secrets générés sur place :
cat > .env <<'EOF'
DATABASE_URL=postgres://postgres:CHANGER_MDP_DB@db:5432/portfolio
BETTER_AUTH_SECRET=CHANGER_SECRET_32+
BETTER_AUTH_URL=https://SITE_DOMAIN
POSTGRES_USER=postgres
POSTGRES_PASSWORD=CHANGER_MDP_DB
POSTGRES_DB=portfolio
SITE_DOMAIN=mondomaine.fr
NODE_ENV=production
MEDIA_DIR=/data/media
DB_POOL_MAX=10
EOF
# avec : openssl rand -base64 32  (secret) et openssl rand -base64 24  (mdp db)
chmod 600 .env

# build + démarrage (le service `migrate` applique les migrations Drizzle au boot) :
docker compose -f docker-compose.yml -f docker/docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker/docker-compose.prod.yml up -d
docker compose -f docker-compose.yml -f docker/docker-compose.prod.yml ps

# vérifications :
curl -fsS https://SITE_DOMAIN/api/health     # {"ok":true}
docker compose -f docker-compose.yml -f docker/docker-compose.prod.yml logs --tail=50 app
```

- Caddy (service `caddy`) sert le HTTPS automatiquement (Let's Encrypt) sur `SITE_DOMAIN`, redirige `www.` → nu,
  proxy vers `app:3000` ; seuls 80/443 (tcp) et 443 (udp, HTTP/3) sont publiés (`docker-compose.prod.yml` retire le port 3000).
- L'app tourne en non-root, FS read-only, `cap_drop: ALL`, volume `media` pour `/data/media`, Postgres non exposé.

### Mise à jour du code

```bash
cd /opt/portfolio && git pull
docker compose -f docker-compose.yml -f docker/docker-compose.prod.yml build app
docker compose -f docker-compose.yml -f docker/docker-compose.prod.yml up -d
```

### Rollback

```bash
cd /opt/portfolio && git checkout <ancien-sha>
docker compose -f docker-compose.yml -f docker/docker-compose.prod.yml build app
 docker compose -f docker-compose.yml -f docker/docker-compose.prod.yml up -d
```
(Attention : les migrations Drizzle ne se « rollbackent » pas seules — préférer une migration corrective.)

## 8. Cron (root : `sudo crontab -e` ou `/etc/cron.d/portfolio`)

```cron
# healthcheck toutes les 5 min (log si KO)
*/5 * * * * curl -fsS https://SITE_DOMAIN/api/health >/dev/null 2>&1 || echo "$(date -Is) health KO" >> /var/log/portfolio-health.log
# prune docker hebdomadaire (dimanche 4h)
0 4 * * 0 docker system prune -f >> /var/log/portfolio-prune.log 2>&1
```

## Hors scope acté

- **Pas de sauvegarde offsite pour l'instant** (décision Julien) : risque accepté, noté dans `SECURITY.md` (dette connue).
- Pas de fail2ban (décision actée).
