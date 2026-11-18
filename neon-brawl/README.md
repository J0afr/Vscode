# Neon Brawl

Jeu de combat de plateforme multijoueur en réseau local, jouable dans le navigateur.
Personnages, décors et sons sont originaux et dessinés ou générés par le code
(aucune image, aucun fichier audio, aucune ressource venant d'internet).

> Projet construit étape par étape. État actuel : **étapes 1 à 4** — réseau,
> physique de plateforme, combat, personnages, effets visuels et sonores.
> À venir : lobby, tournoi, spectateurs, menu des touches, service systemd.

## Installation

Il faut Node.js 18 ou plus récent.

```bash
cd neon-brawl
npm install
```

## Lancement

```bash
npm start
```

Le serveur affiche dans la console l'adresse à donner aux autres joueurs,
par exemple `http://192.168.1.42:3000`.

## Comment jouer

Ouvre l'adresse dans un navigateur sur chaque PC. Pour l'instant, tous les joueurs
connectés se battent ensemble dans une « arène libre ». Si tu es seul, un mannequin
d'entraînement immobile apparaît.

Le principe : chaque coup reçu fait monter ton pourcentage. Plus il est haut, plus
tu es éjecté loin. Tu perds une vie en sortant de l'écran. Chacun a 3 vies.

| Action | Touches |
| --- | --- |
| Se déplacer (maintenir pour courir) | `←` `→` ou `Q` `D` |
| Sauter, double saut en l'air | `↑`, `Z` ou `Espace` |
| Chute rapide (en l'air), traverser une plateforme (dessus) | `↓` ou `S` |
| Attaque légère | `J` ou `C` |
| Attaque forte, à maintenir pour la charger | `K` ou `V` |
| Bouclier | `L` ou `B` |
| Esquive (roulade si une direction est maintenue) | `Maj` ou `N` |
| Attrape : courte portée, passe à travers le bouclier | `U` ou `X` |
| Capacité 1 de l'élément | `I` ou `F` |
| Capacité 2 de l'élément | bas + `I` |
| Capacité aérienne | `I` en l'air (ou haut + `I`) |
| Carte suivante (pour tout le monde, en réseau) | `Tab` |
| Changer de personnage | `1` à `6` |

Maintenir haut, bas ou un côté en attaquant change le coup. En l'air, les deux
boutons d'attaque donnent une attaque aérienne. Un bouclier maintenu trop
longtemps ou trop frappé se brise et laisse sonné.

### Les 6 personnages

Chaque personnage appartient à un élément, qui ajoute un effet à tous ses coups.

| Touche | Personnage | Élément | Style | Effet de l'élément |
| --- | --- | --- | --- | --- |
| `1` | **Braise** | Feu | Agressive, frappe fort | Brûlure : la victime prend encore 3 % en 2 secondes |
| `2` | **Ondine** | Eau | Équilibrée, revient bien sur l'arène | Vague : repousse plus fort, même à 0 % |
| `3` | **Brok** | Terre | Lent, lourd, très puissant | Séisme : brise les boucliers très vite |
| `4` | **Zéphyr** | Air | Très léger, plane, 2 sauts en l'air | Bourrasque : envoie plus haut |
| `5` | **Zip** | Foudre | Le plus rapide, léger | Paralysie : fige la victime plus longtemps à l'impact |
| `6` | **Givre** | Glace | Solide, glisse un peu, coups lents | Gel : la victime reste sonnée plus longtemps |

### Attrape et capacités élémentaires

L'**attrape** saisit l'adversaire même s'il se protège avec son bouclier, puis le
projette (maintenir la direction opposée pour le jeter derrière soi). Elle a une
portée très courte et laisse à découvert si elle rate.

Chaque personnage a trois **capacités** liées à son élément. Chacune a un temps de
recharge, montré par trois voyants dans le panneau du joueur. La capacité aérienne
ne s'utilise qu'une fois par saut (elle se recharge en touchant le sol ou un bord).

| Personnage | Capacité 1 | Capacité 2 (bas + spécial) | Capacité aérienne (spécial en l'air) |
| --- | --- | --- | --- |
| Braise | **Lance-flammes** : jet continu qui brûle | **Brasier** : flaque de feu au sol | **Envol ardent** : s'élance en diagonale, enflammée |
| Ondine | **Bulle** : projectile lent qui repousse loin | **Geyser** : colonne d'eau qui envoie en l'air | **Tourbillon d'eau** : remonte en frappant tout autour |
| Brok | **Rocher** : gros projectile en cloche | **Séisme** : frappe ceux qui sont au sol autour | **Météore** : plonge vers le bas et écrase vers le sol |
| Zéphyr | **Lame de vent** : traverse les adversaires | **Tornade** : le propulse vers le haut | **Cyclone** : monte en tournoyant, dirigeable |
| Zip | **Éclair** : projectile très rapide | **Mine électrique** : piège qui explose au contact | **Charge foudroyante** : ruée horizontale |
| Givre | **Éclat de glace** : sonne longtemps | **Piège de givre** : gèle sur place | **Pluie de glace** : lâche des glaçons en dessous |

Une capacité ne touche jamais celui qui l'a lancée.

### S'accrocher au bord

En tombant près du bord d'un sol, on s'y accroche automatiquement (sauf en
maintenant bas), avec un court instant d'invulnérabilité. Ensuite :

| Touche | Effet |
| --- | --- |
| haut ou direction de la scène | remonter |
| saut (`Espace`) | sauter depuis le bord |
| attaque | remonter en frappant |
| esquive | remonter en roulade |
| bas ou direction du vide | lâcher |

Au bout de 5 secondes, on lâche tout seul.

### Les cartes

Les cartes sont grandes : la **caméra suit les combattants** et dézoome quand ils
s'éloignent les uns des autres, en gardant toujours le cœur de l'arène dans le cadre.
Le paysage du fond défile moins vite que l'arène, pour donner de la profondeur.

| Carte | Particularités |
| --- | --- |
| **Prairie** | Grande île flottante herbeuse et cinq plateformes sur trois étages |
| **Volcan** | Trois îles de roche (celle du milieu plus haute) au-dessus d'une mer de lave |
| **Plage** | Grande île de sable et un îlot séparé, reliés par une passerelle |
| **Sommet enneigé** | La plus large arène, sous une aurore boréale, cinq plateformes |
| **Ruines célestes** | Temple central et deux îlots sur les côtés, au-dessus des nuages |
| **Toits de la ville** | Trois toits d'immeubles de hauteurs différentes, à franchir en sautant |

En local, la carte se choisit dans le menu (ou « Au hasard »). En réseau, `Tab`
passe à la carte suivante pour tout le monde (les vies sont remises à zéro).
Pour ajouter une carte : sa géométrie, sa vue et ses zones d'éjection dans `CARTES`
(`game/constants.js`), et son décor dans `DECORS` (`public/index.html`).

Pour ajouter un personnage : une entrée dans `PERSOS` (`game/characters.js`) et une
entrée dans `STYLES` (`public/index.html`) pour son apparence.

## Organisation du code

| Fichier | Rôle |
| --- | --- |
| `server.js` | Serveur Express + WebSocket, boucle de jeu à 60 Hz, envoi de l'état à 30 Hz |
| `game/constants.js` | Constantes partagées : cartes, règles, touches |
| `game/characters.js` | Éléments, statistiques des 6 personnages et table des attaques |
| `game/physics.js` | Simulation d'un joueur pour un tick : déplacements, plateformes, actions |
| `game/combat.js` | Coups, dégâts, éjections, bouclier, attrape, pertes de vie (serveur uniquement) |
| `game/capacites.js` | Capacités élémentaires : projectiles, zones et pièges (serveur uniquement) |
| `game/local.js` | Partie sans serveur (menu, 2 joueurs sur un clavier, ordinateur) pour `neon-brawl.html` |
| `game/p2p.js` | Parties à plusieurs sans serveur : l'hôte fait tourner la partie, connexion par codes (WebRTC) |
| `public/index.html` | Tout le client dans un seul fichier : réseau, affichage, effets, sons |

Le serveur injecte `constants.js`, `characters.js` et `physics.js` dans la page au
moment de la servir : le navigateur prédit ainsi les mouvements du joueur local avec
exactement le même code que le serveur, sans dupliquer ce code. Les coups et les
éjections, eux, ne sont calculés que par le serveur.

## Version « tout en un »

`neon-brawl-tout-en-un.js` contient tout le jeu (serveur, règles et page web) dans
un seul fichier. Il suffit de le copier sur une machine, puis :

```bash
npm install express ws
node neon-brawl-tout-en-un.js
```

Ce fichier est fabriqué à partir des autres : après une modification du code, on
le régénère avec `npm run assembler` (ne pas le modifier à la main).

## Version « un seul fichier HTML » (Apache)

`neon-brawl.html` est une page autonome : tout le jeu est dedans, sans Node.js.
On la dépose sur un serveur web, ou on l'ouvre par double-clic.

```bash
sudo cp neon-brawl.html /var/www/html/index.html
```

Elle propose au démarrage :

- **Joueur 2 (même clavier)** : deux personnes sur le même PC.
- **Ordinateur** : seul contre un adversaire dirigé par le jeu.
- **Mannequin d'entraînement** : vies illimitées.
- **En réseau** : pour jouer entre plusieurs PC. Un serveur web comme Apache ne
  sait que distribuer la page, il ne peut pas relayer les coups entre les PC :
  il faut donc lancer en plus le serveur de jeu sur la même machine
  (`npm start`, port 3000). La page s'y connecte toute seule.

Touches en local : joueur 1 `ZQSD` + `F` `G` `H` `T` (attrape `R`, spécial `Y`),
joueur 2 flèches + `K` `L` `M` `O` (attrape `I`, spécial `P`).
`Échap` revient au menu.

Comme la version tout-en-un, ce fichier est régénéré par `npm run assembler`.

## Sur téléphone et tablette

La même page s'adapte toute seule aux écrans tactiles : il suffit d'ouvrir
`http://<IP-de-la-VM>/` sur le téléphone (connecté au même Wi-Fi), en mode paysage.

- **Joystick à gauche** : bouger ; haut pour sauter, bas pour descendre d'une
  plateforme ou tomber plus vite.
- **Boutons à droite** : A (attaque légère), B (attaque forte, à maintenir pour
  charger), ★ (capacité spéciale : avec le joystick vers le bas = capacité 2, en
  l'air = capacité aérienne), Saut, bouclier, esquive, attrape.
- **En haut** : plein écran, menu, et en réseau « Perso › » et « Carte › ».

Sur téléphone, le menu propose de jouer contre l'ordinateur, contre le mannequin,
ou en réseau contre les autres (PC ou téléphones). En mode portrait, un message
demande de tourner le téléphone.

## Jouer à plusieurs SANS serveur (Héberger / Rejoindre)

Dans `neon-brawl.html`, le menu propose **Héberger (sans serveur)** et **Rejoindre
(sans serveur)**. Aucun Node.js ni Apache n'est nécessaire : un joueur héberge la
partie dans sa propre page, les autres s'y connectent directement (WebRTC).

Comme il n'y a pas de serveur pour présenter les appareils entre eux, on échange
deux codes en les copiant-collant (par message, mail, etc.) :

1. **L'hôte** clique sur « Héberger » : un code d'invitation s'affiche. Il l'envoie à son ami.
2. **L'ami** clique sur « Rejoindre », colle ce code, clique sur « Générer ma réponse »
   et renvoie le nouveau code à l'hôte.
3. **L'hôte** colle la réponse et clique sur « Connecter » : la partie démarre chez l'ami.

Pour un autre ami, l'hôte clique sur « + Inviter un joueur » (bouton « 👥 Inviter »
en haut à gauche pendant la partie). Jusqu'à 8 joueurs.

À savoir :

- Les appareils doivent être sur le **même réseau** (même Wi-Fi, pas un réseau « invité »)
  et ce réseau ne doit pas isoler les appareils entre eux. Sur certains réseaux
  d'entreprise ou de cours, les connexions directes sont bloquées : dans ce cas,
  utiliser le serveur de jeu.
- L'hôte doit **garder son onglet ouvert et visible** : c'est lui qui fait tourner la
  partie. S'il part, la partie s'arrête pour tout le monde.
- Un invité qui n'envoie plus rien pendant 10 secondes est retiré de la partie.
- Ce mode ne fonctionne que dans `neon-brawl.html`, pas avec le serveur Node.

## Utiliser `neon-brawl.html` comme simple fichier (sans serveur web)

Le fichier est autonome. Ouvert dans un **vrai navigateur** (JavaScript activé), il
permet de jouer contre l'ordinateur ou le mannequin sans rien installer.
Le bouton « En réseau » demande alors l'adresse IP de la VM (retenue ensuite) et
se connecte au serveur de jeu.

Attention : l'aperçu de fichiers d'un téléphone (Fichiers sur iPhone, par exemple)
n'exécute pas le JavaScript et n'affiche pas le jeu. Il faut ouvrir le fichier
avec une application qui contient un vrai navigateur.

## Le WebSocket

Les navigateurs et le serveur de jeu communiquent par **WebSocket** : une connexion
qui reste ouverte, par laquelle chaque navigateur envoie ses touches 60 fois par
seconde et reçoit l'état de la partie 30 fois par seconde.

Avec Apache, ce WebSocket passe par le port 80, à l'adresse `ws://<IP-de-la-VM>/ws` :
Apache le relaie au serveur de jeu (`deploy/neon-brawl-apache.conf`, installé par
`deploy/installer.sh`). Les joueurs n'ont donc besoin que de `http://<IP-de-la-VM>/`.
Si ce relais n'est pas en place, la page se rabat toute seule sur le port 3000.

## Installation complète sur la VM (Apache + serveur de jeu)

Une seule commande installe la page dans Apache, le serveur de jeu, son démarrage
automatique (systemd), le relais WebSocket dans Apache, et ouvre le pare-feu :

```bash
sudo bash deploy/installer.sh
```

Commandes utiles ensuite :

```bash
systemctl status neon-brawl      # le serveur de jeu tourne-t-il ?
sudo systemctl restart neon-brawl
journalctl -u neon-brawl -f      # voir ses messages
```

La carte réseau de la VM doit être en mode « accès par pont » (bridge) pour que
les autres PC du réseau puissent l'atteindre.

## Les autres PC n'arrivent pas à jouer ?

Sur la VM, lance :

```bash
sudo bash deploy/diagnostic.sh
```

Le script vérifie le mode réseau de la VM, Apache, le serveur de jeu et le pare-feu,
et indique la commande à taper pour chaque problème trouvé.
