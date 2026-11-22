#!/usr/bin/env bash
# deploy/setup-server.sh — run ONCE on a fresh Ubuntu 24.04 server, as root:
#   bash setup-server.sh your-domain.example
# (No domain? Use <ip-with-dashes>.sslip.io, e.g. 45-77-1-2.sslip.io: free and works with HTTPS.)
#
# Installs Node 22 and Caddy (automatic HTTPS), opens the firewall, adds swap so
# `next build` fits on a small server, and creates two services:
#   tminus-web     the game (next start on 127.0.0.1:3000, behind Caddy)
#   tminus-poller  scripts/poll-predictions.ts (MBTA → Tiger Data every 15s, spawns bosses)
# The code and .env.local arrive separately via deploy/push.sh from your laptop.
set -euo pipefail
DOMAIN="${1:?usage: bash setup-server.sh <domain>}"
APP=/opt/t-minus

echo "== packages"
apt-get update -y
apt-get install -y curl ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https rsync ufw

echo "== Node 22"
if ! command -v node >/dev/null || [ "$(node -v | cut -c2-3)" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v

echo "== Caddy"
if ! command -v caddy >/dev/null; then
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y && apt-get install -y caddy
fi

echo "== swap (next build needs ~2 GB)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "== app user and folder"
id tminus >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin tminus
mkdir -p "$APP" && chown -R tminus:tminus "$APP"

echo "== services"
cat > /etc/systemd/system/tminus-web.service <<UNIT
[Unit]
Description=T-Minus web (Next.js)
After=network-online.target
[Service]
User=tminus
WorkingDirectory=$APP
EnvironmentFile=$APP/.env.local
Environment=NODE_ENV=production
Environment=NEXT_PUBLIC_DEMO_MODE=1
Environment=PORT=3000
ExecStart=/usr/bin/npx next start -H 127.0.0.1 -p 3000
Restart=always
RestartSec=3
[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/systemd/system/tminus-poller.service <<UNIT
[Unit]
Description=T-Minus poller (MBTA to Tiger Data)
After=network-online.target
[Service]
User=tminus
WorkingDirectory=$APP
ExecStart=/usr/bin/npx tsx --env-file=.env.local scripts/poll-predictions.ts
Restart=always
RestartSec=10
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload

echo "== HTTPS for $DOMAIN"
cat > /etc/caddy/Caddyfile <<CADDY
$DOMAIN {
  encode gzip
  reverse_proxy 127.0.0.1:3000
}
CADDY
systemctl reload caddy || systemctl restart caddy

echo "== firewall"
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable

echo "Server ready. Now run deploy/push.sh from your laptop."
