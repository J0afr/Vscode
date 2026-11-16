// =============================================================================
// server.js — Serveur de Neon Brawl.
//
// Rôles :
//   1. Servir la page du jeu (un seul fichier : public/index.html).
//   2. Accepter les connexions WebSocket des joueurs.
//   3. Faire tourner la simulation à 60 Hz : le serveur fait AUTORITÉ, les
//      navigateurs n'envoient que leurs touches.
//   4. Diffuser l'état du jeu 30 fois par seconde.
// =============================================================================
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');

const C = require('./game/constants');
const physics = require('./game/physics');

const PORT = Number(process.env.PORT) || 3000;
const HOTE = '0.0.0.0'; // écoute sur toutes les cartes réseau (accès depuis le LAN)

// -----------------------------------------------------------------------------
// Page du jeu
// -----------------------------------------------------------------------------
// Le client est UN SEUL fichier HTML. Pour que le navigateur prédise les
// mouvements avec exactement le même code que le serveur, on injecte dans la
// page les fichiers partagés de game/ à la place du marqueur <!--NB_PARTAGE-->.
// Ainsi il n'y a aucune duplication de code et toujours une seule page servie.
const FICHIERS_PARTAGES = ['constants.js', 'physics.js'];

function construirePage() {
  const page = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  const scripts = FICHIERS_PARTAGES
    .map((nom) => {
      const code = fs.readFileSync(path.join(__dirname, 'game', nom), 'utf8');
      return `<script>\n// ---- game/${nom} (injecté par le serveur) ----\n${code}\n</script>`;
    })
    .join('\n');
  return page.replace('<!--NB_PARTAGE-->', scripts);
}

const app = express();
app.get(['/', '/index.html'], (req, res) => {
  // Reconstruit à chaque requête : pratique pendant le développement,
  // et le coût est négligeable.
  res.set('Cache-Control', 'no-store');
  res.type('html').send(construirePage());
});
app.use(express.static(path.join(__dirname, 'public')));

const serveurHttp = http.createServer(app);
const wss = new WebSocketServer({ server: serveurHttp });

// -----------------------------------------------------------------------------
// Joueurs
// -----------------------------------------------------------------------------
const COULEURS = ['#00e5ff', '#ff2bd6', '#ffb300', '#6bff4a', '#b388ff', '#ff5252'];
const joueurs = new Map(); // id -> joueur
let prochainId = 1;

function creerJoueur(socket) {
  const id = prochainId++;
  const joueur = {
    id,
    socket,
    nom: `Joueur ${id}`,
    couleur: COULEURS[(id - 1) % COULEURS.length],
    // Position de départ : répartie sur la largeur de l'arène.
    x: 200 + ((id - 1) % 5) * 220,
    y: C.HAUTEUR / 2,
    touches: 0,        // dernières touches appliquées
    file: [],          // inputs reçus, pas encore simulés
    acquitte: 0,       // numéro du dernier input simulé (renvoyé au client)
  };
  joueurs.set(id, joueur);
  return joueur;
}

function envoyer(socket, message) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}

wss.on('connection', (socket) => {
  const joueur = creerJoueur(socket);
  console.log(`[+] ${joueur.nom} connecté (${joueurs.size} en ligne)`);
  envoyer(socket, { t: 'bienvenue', id: joueur.id });

  socket.on('message', (donnees) => {
    let msg;
    try {
      msg = JSON.parse(donnees);
    } catch {
      return; // message illisible : on l'ignore
    }
    // Le client n'envoie QUE ses touches ; il ne peut pas imposer sa position.
    if (msg.t === 'input' && Number.isInteger(msg.seq) && Number.isInteger(msg.touches)) {
      if (joueur.file.length < 120) {
        joueur.file.push({ seq: msg.seq, touches: msg.touches & 15 });
      }
    }
  });

  socket.on('close', () => {
    joueurs.delete(joueur.id);
    console.log(`[-] ${joueur.nom} déconnecté (${joueurs.size} en ligne)`);
  });

  socket.on('error', () => {});
});

// -----------------------------------------------------------------------------
// Boucle de jeu à pas fixe
// -----------------------------------------------------------------------------
let tick = 0;

function consommerInput(joueur) {
  const input = joueur.file.shift();
  if (!input) return; // rien reçu ce tick-ci : on garde les dernières touches
  joueur.touches = input.touches;
  joueur.acquitte = input.seq;
}

function avancerSimulation() {
  tick++;
  for (const joueur of joueurs.values()) {
    consommerInput(joueur);
    physics.avancerJoueur(joueur, joueur.touches);
    // Si le réseau a livré un paquet d'inputs en retard, on rattrape
    // progressivement pour ne pas accumuler de latence.
    if (joueur.file.length > 4) {
      consommerInput(joueur);
      physics.avancerJoueur(joueur, joueur.touches);
    }
  }
  if (tick % C.ETAT_TOUS_LES === 0) diffuserEtat();
}

function diffuserEtat() {
  const etat = {
    t: 'etat',
    tick,
    joueurs: [...joueurs.values()].map((j) => ({
      id: j.id,
      nom: j.nom,
      couleur: j.couleur,
      x: j.x,
      y: j.y,
      acq: j.acquitte,
    })),
  };
  const texte = JSON.stringify(etat);
  for (const joueur of joueurs.values()) {
    if (joueur.socket.readyState === joueur.socket.OPEN) joueur.socket.send(texte);
  }
}

// setInterval n'est pas précis à la milliseconde : on mesure le temps réellement
// écoulé et on exécute autant de ticks que nécessaire (accumulateur).
const DUREE_TICK_MS = 1000 / C.TICK_HZ;
let dernierTemps = process.hrtime.bigint();
let accumulateur = 0;

setInterval(() => {
  const maintenant = process.hrtime.bigint();
  accumulateur += Number(maintenant - dernierTemps) / 1e6;
  dernierTemps = maintenant;
  // Garde-fou : après un gros blocage, on ne rejoue pas des secondes entières.
  if (accumulateur > 250) accumulateur = 250;
  while (accumulateur >= DUREE_TICK_MS) {
    avancerSimulation();
    accumulateur -= DUREE_TICK_MS;
  }
}, 4);

// -----------------------------------------------------------------------------
// Démarrage
// -----------------------------------------------------------------------------
function adressesLocales() {
  const adresses = [];
  for (const cartes of Object.values(os.networkInterfaces())) {
    for (const carte of cartes || []) {
      if (carte.family === 'IPv4' && !carte.internal) adresses.push(carte.address);
    }
  }
  return adresses;
}

serveurHttp.listen(PORT, HOTE, () => {
  console.log('==============================================');
  console.log('  NEON BRAWL — serveur démarré');
  console.log('==============================================');
  console.log(`  Sur cette machine : http://localhost:${PORT}`);
  const ips = adressesLocales();
  if (ips.length === 0) {
    console.log('  Aucune adresse réseau trouvée (carte réseau déconnectée ?)');
  }
  for (const ip of ips) {
    console.log(`  Pour les autres joueurs du réseau : http://${ip}:${PORT}`);
  }
  console.log('==============================================');
});
