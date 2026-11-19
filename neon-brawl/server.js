// =============================================================================
// server.js — Serveur de Neon Brawl.
//
// Rôles :
//   1. Servir la page du jeu (un seul fichier : public/index.html).
//   2. Accepter les connexions WebSocket des joueurs.
//   3. Faire tourner la simulation à 60 Hz : le serveur fait AUTORITÉ, les
//      navigateurs n'envoient que leurs touches.
//   4. Diffuser l'état du jeu 30 fois par seconde.
//
// Mode de jeu actuel : « arène libre ». Tous les joueurs connectés se battent
// ensemble ; quand un joueur a perdu ses 3 vies il repart avec 3 vies neuves.
// Un joueur seul affronte un mannequin d'entraînement immobile.
// (Le lobby et le tournoi arrivent à l'étape suivante.)
// =============================================================================
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');

const C = require('./game/constants');
const { PERSOS } = require('./game/characters');
const physics = require('./game/physics');
const combat = require('./game/combat');
const capacites = require('./game/capacites');

const PORT = Number(process.env.PORT) || 3000;
const HOTE = '0.0.0.0'; // écoute sur toutes les cartes réseau (accès depuis le LAN)

// -----------------------------------------------------------------------------
// Page du jeu
// -----------------------------------------------------------------------------
// Le client est UN SEUL fichier HTML. Pour que le navigateur prédise les
// mouvements avec exactement le même code que le serveur, on injecte dans la
// page les fichiers partagés de game/ à la place du marqueur <!--NB_PARTAGE-->.
// Ainsi il n'y a aucune duplication de code et toujours une seule page servie.
const FICHIERS_PARTAGES = ['constants.js', 'characters.js', 'physics.js', 'progression.js'];

function construirePage() {
  const page = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  const scripts = FICHIERS_PARTAGES
    .map((nom) => {
      const code = fs.readFileSync(path.join(__dirname, 'game', nom), 'utf8');
      return `<script>\n// ---- game/${nom} (injecté par le serveur) ----\n${code}\n</script>`;
    })
    .join('\n');
  return page.replace('<!--NB_PARTAGE-->', () => scripts);
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
const COULEURS = ['#00e5ff', '#ff2bd6', '#ffb300', '#6bff4a', '#b388ff', '#ff5252', '#40ffc8', '#ff8a3d'];
const LISTE_PERSOS = Object.keys(PERSOS);
const { BASE } = require('./game/characters'); // personnages disponibles sans rien débloquer
const joueurs = new Map(); // id -> joueur (humains et mannequin)
let prochainId = 1;
let mannequin = null;

/** Point d'apparition, pris dans la liste de la carte en cours. */
function xApparition(joueur) {
  const departs = C.carte.departs;
  return departs[(joueur.id - 1) % departs.length];
}

function couleurLibre() {
  const prises = new Set([...joueurs.values()].map((j) => j.couleur));
  return COULEURS.find((c) => !prises.has(c)) || COULEURS[0];
}

function creerJoueur(socket) {
  const id = prochainId++;
  const joueur = {
    id,
    socket,                 // null pour le mannequin
    nom: `Joueur ${id}`,
    couleur: couleurLibre(),
    perso: BASE[(id - 1) % BASE.length],
    degats: 0,
    brulure: 0,             // ticks de brûlure restants (élément feu)
    vies: C.VIES,
    touches: 0,             // dernières touches appliquées
    file: [],               // inputs reçus, pas encore simulés
    acquitte: 0,            // numéro du dernier input simulé (renvoyé au client)
    retour: 0,              // compte à rebours avant réapparition
    ...physics.nouvelEtat(0, 0),
  };
  combat.reapparaitre(joueur, xApparition(joueur));
  joueur.invul = 60;
  joueurs.set(id, joueur);
  return joueur;
}

/** Le mannequin se tient au sol, au milieu de l'arène. */
function placerMannequin() {
  combat.reapparaitre(mannequin, C.carte.mannequin.x, C.carte.mannequin.y - 1);
  mannequin.dir = -1;
}

/** Un joueur seul a droit à un mannequin d'entraînement ; à deux ou plus, il s'en va. */
function ajusterMannequin() {
  const humains = [...joueurs.values()].filter((j) => j.socket).length;
  if (humains === 1 && !mannequin) {
    mannequin = creerJoueur(null);
    mannequin.nom = 'Mannequin';
    mannequin.couleur = '#9aa4c7';
    mannequin.perso = 'ondine';
    placerMannequin();
  } else if (humains !== 1 && mannequin) {
    joueurs.delete(mannequin.id);
    mannequin = null;
  }
}

function envoyer(socket, message) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}

wss.on('connection', (socket) => {
  const joueur = creerJoueur(socket);
  ajusterMannequin();
  console.log(`[+] ${joueur.nom} connecté`);
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
        joueur.file.push({ seq: msg.seq, touches: msg.touches & C.MASQUE_TOUCHES });
      }
    } else if (msg.t === 'perso' && LISTE_PERSOS.includes(msg.perso)) {
      joueur.perso = msg.perso;
    } else if (msg.t === 'carte' && C.CARTES[msg.id] && msg.id !== C.carte.id) {
      changerCarte(msg.id, joueur);
    }
  });

  socket.on('close', () => {
    joueurs.delete(joueur.id);
    ajusterMannequin();
    console.log(`[-] ${joueur.nom} déconnecté`);
  });

  socket.on('error', () => {});
});

// -----------------------------------------------------------------------------
// Boucle de jeu à pas fixe
// -----------------------------------------------------------------------------
let tick = 0;
let evenements = []; // coups, éjections… accumulés jusqu'au prochain envoi
const objets = [];   // projectiles et zones des capacités élémentaires

/** Change de carte : tout le monde repart de zéro sur la nouvelle arène. */
function changerCarte(id, auteur) {
  C.choisirCarte(id);
  objets.length = 0;
  for (const joueur of joueurs.values()) {
    joueur.vies = C.VIES;
    if (joueur === mannequin) placerMannequin();
    else combat.reapparaitre(joueur, xApparition(joueur));
  }
  console.log(`[carte] ${auteur.nom} passe sur « ${C.carte.nom} »`);
}

function consommerInput(joueur) {
  const input = joueur.file.shift();
  if (!input) return; // rien reçu ce tick-ci : on garde les dernières touches
  joueur.touches = input.touches;
  joueur.acquitte = input.seq;
}

function avancerSimulation() {
  tick++;
  const liste = [...joueurs.values()];

  // 1. Chaque joueur avance selon ses touches.
  for (const joueur of liste) {
    consommerInput(joueur);
    physics.avancerJoueur(joueur, joueur.touches);
    // Si le réseau a livré un paquet d'inputs en retard, on rattrape
    // progressivement pour ne pas accumuler de latence.
    if (joueur.file.length > 4) {
      consommerInput(joueur);
      physics.avancerJoueur(joueur, joueur.touches);
    }
  }

  // 2. Les coups, puis les sorties d'écran.
  combat.resoudreCoups(liste, evenements);
  capacites.avancer(objets, liste, evenements, tick);
  combat.effetsContinus(liste);
  const prets = combat.gererSorties(liste, evenements);

  // 3. Arène libre : tout le monde revient, avec 3 vies neuves si besoin.
  for (const joueur of prets) {
    if (joueur.vies <= 0) joueur.vies = C.VIES;
    if (joueur === mannequin) placerMannequin();
    else combat.reapparaitre(joueur, xApparition(joueur));
  }

  if (tick % C.ETAT_TOUS_LES === 0) diffuserEtat();
}

function diffuserEtat() {
  const etat = {
    t: 'etat',
    tick,
    ev: evenements,
    carte: C.carte.id,
    objets: capacites.instantane(objets),
    joueurs: [...joueurs.values()].map(combat.instantaneJoueur),
  };
  evenements = [];
  const texte = JSON.stringify(etat);
  for (const joueur of joueurs.values()) {
    if (joueur.socket && joueur.socket.readyState === joueur.socket.OPEN) joueur.socket.send(texte);
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

// Les erreurs d'écoute sont signalées à la fois par le serveur HTTP et par le
// serveur WebSocket : on les traite au même endroit.
wss.on('error', () => {});
serveurHttp.on('error', (erreur) => {
  if (erreur.code === 'EADDRINUSE') {
    console.error(`Le port ${PORT} est déjà utilisé : le serveur de jeu tourne sans doute déjà`);
    console.error('(par exemple le service : sudo systemctl status neon-brawl).');
    console.error('Pour le relancer : sudo systemctl restart neon-brawl');
  } else {
    console.error('Impossible de démarrer le serveur :', erreur.message);
  }
  process.exit(1);
});

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
