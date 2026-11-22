#!/usr/bin/env bash
# deploy/push.sh — run from your laptop, in the repo:  bash deploy/push.sh root@<server-ip>
# Copies the code and .env.local to the server over SSH, builds, and (re)starts
# the web and poller services. Run it again after any change to redeploy.
set -euo pipefail
HOST="${1:?usage: bash deploy/push.sh root@<server-ip>}"
APP=/opt/t-minus
cd "$(dirname "$0")/.."
[ -s .env.local ] || { echo "missing .env.local"; exit 1; }

echo "== copy code"
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude .git --exclude logs --exclude .env.local \
  ./ "$HOST:$APP/"
echo "== copy .env.local (secrets: sent over SSH only, readable by the app user only)"
scp -q .env.local "$HOST:$APP/.env.local"

echo "== build and restart on the server"
ssh "$HOST" "set -e; cd $APP; chown -R tminus:tminus $APP; chmod 600 .env.local;
  sudo -u tminus npm ci --no-audit --no-fund;
  sudo -u tminus env NEXT_PUBLIC_DEMO_MODE=1 npx next build;
  systemctl enable --now tminus-web tminus-poller;
  systemctl restart tminus-web tminus-poller;
  sleep 3; systemctl --no-pager --lines=0 status tminus-web tminus-poller | grep -E 'Active|●'"
echo "Deployed. Stop the poller on your laptop so there aren't two writing to the database."
