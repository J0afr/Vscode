#!/bin/bash
# =============================================================================
# diagnostic.sh — Cherche pourquoi les autres PC du réseau n'arrivent pas à jouer.
#
#   sudo bash deploy/diagnostic.sh
#
# Le script ne modifie rien : il vérifie chaque maillon et dit ce qui bloque.
# =============================================================================
ROUGE='\033[1;31m'; VERT='\033[1;32m'; JAUNE='\033[1;33m'; FIN='\033[0m'
ok()   { echo -e "  ${VERT}OK${FIN}        $1"; }
pb()   { echo -e "  ${ROUGE}PROBLÈME${FIN}  $1"; PROBLEMES=$((PROBLEMES + 1)); }
info() { echo -e "  ${JAUNE}ATTENTION${FIN} $1"; }
PROBLEMES=0

echo "=== 1. Adresse de la VM sur le réseau ==="
IPS=$(hostname -I 2>/dev/null)
echo "  Adresses : ${IPS:-aucune}"
if [ -z "$IPS" ]; then
  pb "Aucune adresse réseau : la carte réseau de la VM est débranchée ou désactivée."
fi
for ip in $IPS; do
  case "$ip" in
    10.0.2.*)
      pb "$ip est une adresse NAT de VirtualBox : les autres PC ne peuvent PAS la joindre.
            -> Éteins la VM, Configuration > Réseau > Mode d'accès : « Accès par pont »,
               choisis la carte réseau de ton PC (Wi-Fi ou Ethernet), puis redémarre la VM." ;;
    192.168.56.*)
      pb "$ip est un réseau « privé hôte » de VirtualBox : seul ton PC peut la joindre.
            -> Passe la carte réseau de la VM en « Accès par pont »." ;;
    192.168.*|10.*|172.1[6-9].*|172.2[0-9].*|172.3[0-1].*)
      info "$ip : adresse de réseau local. Vérifie qu'elle commence comme celle des autres PC
            (sur un PC Windows : commande « ipconfig »). Si les débuts diffèrent
            (ex. 192.168.1.x contre 192.168.0.x), la VM n'est pas en « Accès par pont »." ;;
    *) info "$ip : adresse inhabituelle, vérifie le mode réseau de la VM." ;;
  esac
done

echo
echo "=== 2. Programmes qui attendent les joueurs ==="
ECOUTE=$(ss -ltnp 2>/dev/null)
if echo "$ECOUTE" | grep -qE '(0\.0\.0\.0|\*|\[::\]):80\b'; then
  ok "Apache répond sur le port 80 (la page du jeu)."
else
  pb "Rien n'écoute sur le port 80 : Apache n'est pas lancé.
            -> sudo systemctl start apache2   (et : sudo systemctl enable apache2)"
fi
if echo "$ECOUTE" | grep -qE '(0\.0\.0\.0|\*|\[::\]):3000\b'; then
  ok "Le serveur de jeu répond sur le port 3000, pour tout le réseau."
elif echo "$ECOUTE" | grep -qE '127\.0\.0\.1:3000\b'; then
  pb "Le serveur de jeu n'écoute que sur la VM elle-même (127.0.0.1)."
else
  pb "Le serveur de jeu n'est pas lancé : sans lui, chaque PC joue seul.
            -> sudo systemctl start neon-brawl
               (s'il n'existe pas : sudo bash deploy/installer.sh)"
  if command -v systemctl >/dev/null && systemctl list-unit-files 2>/dev/null | grep -q neon-brawl; then
    echo "            Dernières lignes du service :"
    journalctl -u neon-brawl -n 8 --no-pager 2>/dev/null | sed 's/^/              /'
  fi
fi

echo
echo "=== 3. Pare-feu ==="
if command -v ufw >/dev/null; then
  ETAT=$(ufw status 2>/dev/null)
  if echo "$ETAT" | grep -q "Status: inactive\|État : inactif"; then
    ok "Le pare-feu ufw est désactivé : il ne bloque rien."
  else
    for port in 80 3000; do
      if echo "$ETAT" | grep -qE "^$port(/tcp)?\s+ALLOW|^$port(/tcp)?\s+AUTORISER"; then
        ok "Le port $port est ouvert dans ufw."
      else
        pb "Le port $port est fermé par le pare-feu.  -> sudo ufw allow $port/tcp"
      fi
    done
  fi
else
  ok "ufw n'est pas installé : il ne bloque rien."
fi

echo
echo "=== 4. Test depuis la VM elle-même ==="
if command -v curl >/dev/null; then
  for ip in $IPS; do
    if curl -s -m 3 -o /dev/null "http://$ip/"; then ok "La page répond sur http://$ip/"; else pb "La page ne répond pas sur http://$ip/"; fi
    if curl -s -m 3 -o /dev/null "http://$ip:3000/"; then ok "Le serveur de jeu répond sur http://$ip:3000/"; else pb "Le serveur de jeu ne répond pas sur http://$ip:3000/"; fi
  done
else
  info "curl n'est pas installé : test sauté (sudo apt install -y curl)."
fi

echo
if [ "$PROBLEMES" -eq 0 ]; then
  echo -e "${VERT}Aucun problème trouvé côté VM.${FIN} Si un autre PC ne voit toujours pas le jeu :"
  echo "  - il doit être sur le même réseau (même box / même Wi-Fi, pas un réseau « invité »),"
  echo "  - il doit ouvrir http://<adresse ci-dessus>/  (pas « localhost »), puis cliquer « En réseau »,"
  echo "  - le pare-feu de TON PC (celui qui héberge la VM) peut aussi bloquer : essaie de le couper un instant."
else
  echo -e "${ROUGE}$PROBLEMES problème(s) trouvé(s).${FIN} Corrige-les dans l'ordre, puis relance ce script."
fi
