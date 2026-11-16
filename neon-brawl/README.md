# Neon Brawl

Jeu de combat de plateforme multijoueur en réseau local, jouable dans le navigateur.
Personnages, décors et sons sont originaux et générés par le code (aucune image,
aucun fichier audio, aucune ressource venant d'internet).

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

Chaque personnage a deux **capacités** liées à son élément. Chacune a un temps de
recharge, montré par deux voyants dans le panneau du joueur.

| Personnage | Capacité 1 | Capacité 2 (bas + spécial) |
| --- | --- | --- |
| Braise | **Lance-flammes** : jet de flammes continu qui brûle | **Brasier** : flaque de feu au sol, blesse tant qu'on y reste |
| Ondine | **Bulle** : projectile lent qui repousse loin | **Geyser** : colonne d'eau devant elle, envoie en l'air |
| Brok | **Rocher** : gros projectile en cloche, très puissant | **Séisme** : frappe tous ceux qui sont au sol autour de lui |
| Zéphyr | **Lame de vent** : projectile rapide qui traverse les adversaires | **Tornade** : le propulse vers le haut et blesse autour |
| Zip | **Éclair** : projectile très rapide | **Mine électrique** : piège qui explose au contact |
| Givre | **Éclat de glace** : projectile qui sonne longtemps | **Piège de givre** : plaque au sol qui gèle sur place |

Une capacité ne touche jamais celui qui l'a lancée.

Pour ajouter un personnage : une entrée dans `PERSOS` (`game/characters.js`) et une
entrée dans `STYLES` (`public/index.html`) pour son apparence.

## Organisation du code

| Fichier | Rôle |
| --- | --- |
| `server.js` | Serveur Express + WebSocket, boucle de jeu à 60 Hz, envoi de l'état à 30 Hz |
| `game/constants.js` | Constantes partagées : arène, règles, touches |
| `game/characters.js` | Éléments, statistiques des 6 personnages et table des attaques |
| `game/physics.js` | Simulation d'un joueur pour un tick : déplacements, plateformes, actions |
| `game/combat.js` | Coups, dégâts, éjections, bouclier, attrape, pertes de vie (serveur uniquement) |
| `game/capacites.js` | Capacités élémentaires : projectiles, zones et pièges (serveur uniquement) |
| `game/local.js` | Partie sans serveur (menu, 2 joueurs sur un clavier, ordinateur) pour `neon-brawl.html` |
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

## Installation complète sur la VM (Apache + serveur de jeu)

Une seule commande installe la page dans Apache, le serveur de jeu, son démarrage
automatique (systemd) et ouvre le pare-feu :

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
