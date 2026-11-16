#!/bin/bash
# =============================================================================
# installer.sh — Installe Neon Brawl sur une VM Debian/Ubuntu avec Apache.
#
#   sudo bash deploy/installer.sh
#
# Ce que fait ce script :
#   1. copie la page du jeu dans /var/www/html/index.html (servie par Apache)
#   2. installe le serveur de jeu dans /opt/neon-brawl (pour jouer entre PC)
#   3. crée un service systemd pour qu'il démarre tout seul avec la machine
#   4. ouvre les ports 80 et 3000 dans le pare-feu ufw (s'il est installé)
# =============================================================================
set -e

if [ "$(id -u)" -ne 0 ]; then
  echo "Lance ce script avec sudo :  sudo bash deploy/installer.sh"
  exit 1
fi

ICI="$(cd "$(dirname "$0")/.." && pwd)"

if ! command -v node >/dev/null; then
  echo "Node.js n'est pas installé. Installe-le d'abord :  sudo apt install -y nodejs npm"
  exit 1
fi

echo "1/4  Page du jeu -> /var/www/html/index.html"
mkdir -p /var/www/html
if [ -f /var/www/html/index.html ]; then
  cp /var/www/html/index.html "/var/www/html/index.html.ancien"
  echo "     (l'ancienne page est gardée dans index.html.ancien)"
fi
cp "$ICI/neon-brawl.html" /var/www/html/index.html

echo "2/4  Serveur de jeu -> /opt/neon-brawl"
mkdir -p /opt/neon-brawl
cp "$ICI/neon-brawl-tout-en-un.js" /opt/neon-brawl/
cd /opt/neon-brawl
[ -f package.json ] || npm init -y >/dev/null
npm install --omit=dev express ws >/dev/null
chown -R www-data:www-data /opt/neon-brawl

echo "3/4  Service systemd (démarrage automatique)"
cp "$ICI/deploy/neon-brawl.service" /etc/systemd/system/neon-brawl.service
systemctl daemon-reload
systemctl enable --now neon-brawl
systemctl restart neon-brawl

echo "4/4  Pare-feu"
if command -v ufw >/dev/null; then
  ufw allow 80/tcp >/dev/null
  ufw allow 3000/tcp >/dev/null
  echo "     ports 80 et 3000 ouverts"
else
  echo "     ufw n'est pas installé : rien à ouvrir"
fi

echo
echo "Terminé. Adresse à donner aux joueurs :"
for ip in $(hostname -I); do echo "   http://$ip/"; done
echo "Dans le menu du jeu, cliquer sur « En réseau » pour jouer entre PC."
echo "État du serveur de jeu :  systemctl status neon-brawl"
