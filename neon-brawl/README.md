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

Pour ajouter un personnage : une entrée dans `PERSOS` (`game/characters.js`) et une
entrée dans `STYLES` (`public/index.html`) pour son apparence.

## Organisation du code

| Fichier | Rôle |
| --- | --- |
| `server.js` | Serveur Express + WebSocket, boucle de jeu à 60 Hz, envoi de l'état à 30 Hz |
| `game/constants.js` | Constantes partagées : arène, règles, touches |
| `game/characters.js` | Éléments, statistiques des 6 personnages et table des attaques |
| `game/physics.js` | Simulation d'un joueur pour un tick : déplacements, plateformes, actions |
| `game/combat.js` | Coups, dégâts, éjections, bouclier, pertes de vie (serveur uniquement) |
| `public/index.html` | Tout le client dans un seul fichier : réseau, affichage, effets, sons |

Le serveur injecte `constants.js`, `characters.js` et `physics.js` dans la page au
moment de la servir : le navigateur prédit ainsi les mouvements du joueur local avec
exactement le même code que le serveur, sans dupliquer ce code. Les coups et les
éjections, eux, ne sont calculés que par le serveur.
