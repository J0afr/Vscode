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
| Changer de personnage | `1` Zip, `2` Nova, `3` Brok |

Maintenir haut, bas ou un côté en attaquant change le coup. En l'air, les deux
boutons d'attaque donnent une attaque aérienne. Un bouclier maintenu trop
longtemps ou trop frappé se brise et laisse sonné.

Les personnages :

- **Zip** : rapide et léger, coups vifs mais moins puissants, s'envole facilement.
- **Nova** : équilibrée.
- **Brok** : lent, lourd et puissant, difficile à éjecter.

## Organisation du code

| Fichier | Rôle |
| --- | --- |
| `server.js` | Serveur Express + WebSocket, boucle de jeu à 60 Hz, envoi de l'état à 30 Hz |
| `game/constants.js` | Constantes partagées : arène, règles, touches |
| `game/characters.js` | Statistiques des personnages et table des attaques |
| `game/physics.js` | Simulation d'un joueur pour un tick : déplacements, plateformes, actions |
| `game/combat.js` | Coups, dégâts, éjections, bouclier, pertes de vie (serveur uniquement) |
| `public/index.html` | Tout le client dans un seul fichier : réseau, affichage, effets, sons |

Le serveur injecte `constants.js`, `characters.js` et `physics.js` dans la page au
moment de la servir : le navigateur prédit ainsi les mouvements du joueur local avec
exactement le même code que le serveur, sans dupliquer ce code. Les coups et les
éjections, eux, ne sont calculés que par le serveur.
