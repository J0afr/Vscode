# Neon Brawl

Jeu de combat de plateforme multijoueur en réseau local, jouable dans le navigateur.

> Projet en cours de construction, étape par étape. État actuel : **étape 1**
> (serveur, WebSocket, carrés qui bougent en temps réel).

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

## Jouer (étape 1)

Ouvre l'adresse dans un navigateur sur chaque PC. Chaque joueur dirige un carré
avec les flèches ou ZQSD.

## Organisation du code

| Fichier | Rôle |
| --- | --- |
| `server.js` | Serveur Express + WebSocket, boucle de jeu à 60 Hz, envoi de l'état à 30 Hz |
| `game/constants.js` | Constantes partagées par le serveur et le navigateur |
| `game/physics.js` | Simulation d'un joueur pour un tick (partagée elle aussi) |
| `public/index.html` | Tout le client, dans un seul fichier (HTML, CSS, JavaScript) |

Le serveur injecte `game/constants.js` et `game/physics.js` dans la page au moment
de la servir : le navigateur prédit ainsi les mouvements avec exactement le même
code que le serveur, sans dupliquer ce code.
