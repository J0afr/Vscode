// =============================================================================
// local.js — Partie SANS serveur, pour la version « un seul fichier HTML ».
// (Navigateur uniquement ; n'est pas utilisé par server.js.)
//
// Ce fichier fait tourner dans la page elle-même ce que fait d'habitude le
// serveur : la boucle de jeu, les coups, les vies. Il fournit au client une
// fausse connexion réseau, si bien que le reste du code ne voit pas la
// différence. Il gère aussi :
//   - le menu de départ (choix du mode et des personnages, rappel des touches)
//   - le joueur 2 sur le même clavier
//   - un adversaire dirigé par l'ordinateur (10 niveaux, voir ia.js)
//   - le mode solo : trois modes de difficulté, 10 personnages à débloquer
//     (voir progression.js)
// =============================================================================
(function () {
  'use strict';

  const C = NB.constants;
  const physics = NB.physics;
  const combat = NB.combat;
  const capacites = NB.capacites;
  const { PERSOS, ELEMENTS } = NB.persos;
  const PROG = NB.progression;
  const T = C.TOUCHE;

  // ---------------------------------------------------------------------------
  // Touches des deux joueurs sur le même clavier
  // (event.code = position physique : KeyW est la touche Z d'un clavier AZERTY)
  // ---------------------------------------------------------------------------
  const TOUCHES_J1 = {
    KeyA: T.GAUCHE, KeyD: T.DROITE, KeyW: T.HAUT, KeyS: T.BAS,
    KeyF: T.LEGER, KeyG: T.FORT, KeyH: T.BOUCLIER, KeyT: T.ESQUIVE,
    KeyR: T.ATTRAPE, KeyY: T.SPECIAL, KeyE: T.DASH,
  };
  const TOUCHES_J2 = {
    ArrowLeft: T.GAUCHE, ArrowRight: T.DROITE, ArrowUp: T.HAUT, ArrowDown: T.BAS,
    KeyK: T.LEGER, KeyL: T.FORT, Semicolon: T.BOUCLIER, KeyO: T.ESQUIVE,
    KeyI: T.ATTRAPE, KeyP: T.SPECIAL,
    Numpad1: T.LEGER, Numpad2: T.FORT, Numpad3: T.BOUCLIER, Numpad0: T.ESQUIVE,
    Numpad4: T.ATTRAPE, Numpad5: T.SPECIAL, KeyU: T.DASH, Numpad6: T.DASH,
  };
  const AIDE_J1 = 'Bouger <kbd>Q</kbd><kbd>D</kbd> · Sauter <kbd>Z</kbd> · Descendre <kbd>S</kbd> · '
    + 'Légère <kbd>F</kbd> · Forte <kbd>G</kbd> · Bouclier <kbd>H</kbd> · Esquive <kbd>T</kbd> · Attrape <kbd>R</kbd> · Spécial <kbd>Y</kbd> · Dash <kbd>E</kbd>';
  const AIDE_J2 = 'Bouger <kbd>←</kbd><kbd>→</kbd> · Sauter <kbd>↑</kbd> · Descendre <kbd>↓</kbd> · '
    + 'Légère <kbd>K</kbd> · Forte <kbd>L</kbd> · Bouclier <kbd>M</kbd> · Esquive <kbd>O</kbd> · Attrape <kbd>I</kbd> · Spécial <kbd>P</kbd> · Dash <kbd>U</kbd>';
  const AIDE_RESEAU = 'Bouger <kbd>←</kbd><kbd>→</kbd> ou <kbd>Q</kbd><kbd>D</kbd> · Sauter <kbd>↑</kbd> <kbd>Z</kbd> <kbd>Espace</kbd> · '
    + 'Légère <kbd>J</kbd> · Forte <kbd>K</kbd> · Bouclier <kbd>L</kbd> · Esquive <kbd>Maj</kbd> · Attrape <kbd>U</kbd> · Spécial <kbd>I</kbd> · Dash <kbd>E</kbd> · Personnage <kbd>1</kbd> à <kbd>9</kbd> ou <kbd>P</kbd> · Carte suivante <kbd>Tab</kbd>';

  const enfonceesJ2 = new Set();
  let appuisBrefsJ2 = 0;
  window.addEventListener('keydown', (e) => {
    if (e.target && /^(TEXTAREA|INPUT)$/.test(e.target.tagName)) return; // on écrit un code
    if (e.code === 'Escape') { location.reload(); return; } // retour au menu
    if (enCours && typeAdv === 'joueur' && e.code in TOUCHES_J2) {
      enfonceesJ2.add(e.code);
      appuisBrefsJ2 |= TOUCHES_J2[e.code];
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => enfonceesJ2.delete(e.code));
  window.addEventListener('blur', () => enfonceesJ2.clear());

  function lireJ2() {
    let masque = appuisBrefsJ2;
    appuisBrefsJ2 = 0;
    for (const code of enfonceesJ2) masque |= TOUCHES_J2[code];
    return masque;
  }

  // ---------------------------------------------------------------------------
  // État de la partie
  // ---------------------------------------------------------------------------
  // Sur téléphone, on ne peut pas jouer à deux sur le même écran : l'adversaire
  // par défaut est alors l'ordinateur.
  const TACTILE = /[?&]tactile=1/.test(location.search)
    || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    || 'ontouchstart' in window;
  const config = { perso1: 'braise', adversaire: TACTILE ? 'ordi' : 'joueur', perso2: 'brok', carte: 'prairie', niveau: '4' };
  let solo = null;       // combat de solo en cours : { mode, numero } (sinon null)
  let typeAdv = 'joueur'; // adversaire de la partie en cours : 'joueur', 'ordi' ou 'mannequin'
  let ia = null;         // l'ordinateur de la partie en cours (voir ia.js)
  let joueurs = [];
  let enCours = false;   // une partie locale tourne
  let terminee = false;  // quelqu'un a perdu ses 3 vies
  let tick = 0;
  let evenements = [];
  let objets = [];       // projectiles et zones des capacités

  function creerJoueur(id, nom, couleur, perso) {
    const joueur = {
      id, nom, couleur, perso,
      degats: 0, brulure: 0, vies: C.VIES,
      touches: 0, file: [], acquitte: 0, retour: 0,
      ...physics.nouvelEtat(0, 0),
    };
    placer(joueur);
    return joueur;
  }

  function placer(joueur) {
    const carte = C.carte;
    if (joueur.nom === 'Mannequin') {
      combat.reapparaitre(joueur, carte.mannequin.x, carte.mannequin.y - 1);
      joueur.dir = -1;
    } else {
      combat.reapparaitre(joueur, carte.departs[(joueur.id - 1) % carte.departs.length]);
    }
  }

  // ---------------------------------------------------------------------------
  // Fausse connexion réseau : le client y envoie ses touches et y reçoit l'état,
  // exactement comme avec le vrai serveur.
  // ---------------------------------------------------------------------------
  const ecouteurs = { message: [], close: [] };
  const fausseConnexion = {
    readyState: 1, // « ouverte »
    send(texte) {
      const msg = JSON.parse(texte);
      if (msg.t === 'input' && joueurs[0]) joueurs[0].file.push({ seq: msg.seq, touches: msg.touches });
    },
    addEventListener(type, fonction) {
      if (ecouteurs[type]) ecouteurs[type].push(fonction);
    },
  };

  function emettre(message) {
    const evenement = { data: JSON.stringify(message) };
    for (const fonction of ecouteurs.message) fonction(evenement);
  }

  // ---------------------------------------------------------------------------
  // Boucle de jeu (la même que celle du serveur, pour 2 joueurs)
  // ---------------------------------------------------------------------------
  function consommerInput(joueur) {
    const input = joueur.file.shift();
    if (!input) return;
    joueur.touches = input.touches;
    joueur.acquitte = input.seq;
  }

  function avancer() {
    tick++;
    const [j1, j2] = joueurs;

    consommerInput(j1);
    physics.avancerJoueur(j1, j1.touches);
    if (j1.file.length > 4) { consommerInput(j1); physics.avancerJoueur(j1, j1.touches); }

    if (typeAdv === 'joueur') j2.touches = lireJ2();
    else if (typeAdv === 'ordi') j2.touches = ia.touches(j2, j1, { tick, objets, joueurs });
    else j2.touches = 0;
    physics.avancerJoueur(j2, j2.touches);

    combat.resoudreCoups(joueurs, evenements);
    capacites.avancer(objets, joueurs, evenements, tick);
    combat.effetsContinus(joueurs);
    for (const joueur of combat.gererSorties(joueurs, evenements)) {
      // À l'entraînement, les vies sont illimitées.
      if (typeAdv === 'mannequin' && joueur.vies <= 0) joueur.vies = C.VIES;
      if (joueur.vies > 0) placer(joueur);
      else if (!terminee) finir(joueurs.find((j) => j !== joueur));
    }
    diffuser();
  }

  function diffuser() {
    const etat = {
      t: 'etat', tick, ev: evenements, carte: C.carte.id, objets: capacites.instantane(objets),
      joueurs: joueurs.map(combat.instantaneJoueur),
    };
    evenements = [];
    emettre(etat);
  }

  const DUREE_TICK_MS = 1000 / C.TICK_HZ;
  let dernierTemps = 0;
  let accumulateur = 0;
  setInterval(() => {
    const maintenant = performance.now();
    accumulateur += Math.min(250, maintenant - dernierTemps);
    dernierTemps = maintenant;
    while (accumulateur >= DUREE_TICK_MS) {
      if (enCours) avancer();
      accumulateur -= DUREE_TICK_MS;
    }
  }, 4);

  // ---------------------------------------------------------------------------
  // Déroulement : lancer une partie, la finir
  // ---------------------------------------------------------------------------
  /**
   * Lance une partie. Sans argument : « Combat rapide » avec les réglages du menu.
   * Avec { mode, numero } : un combat du mode solo (l'adversaire, sa carte et son
   * niveau sont imposés par le combat).
   */
  function lancerPartie(combat_solo) {
    solo = combat_solo || null;
    let adversaire = config.adversaire;
    let persoAdv = config.perso2;
    let niveau = Number(config.niveau) || 4;
    let carte = config.carte;
    if (solo) {
      const etape = PROG.SOLO[solo.mode].etapes[solo.numero];
      adversaire = 'ordi';
      persoAdv = etape.perso;
      niveau = etape.niveau;
      carte = etape.carte;
    }
    const ids = Object.keys(C.CARTES);
    C.choisirCarte(carte === 'hasard' ? ids[Math.floor(Math.random() * ids.length)] : carte);
    const nomAdversaire = solo ? 'Niveau ' + niveau
      : { joueur: 'Joueur 2', ordi: 'Ordinateur', mannequin: 'Mannequin' }[adversaire];
    const couleurAdversaire = adversaire === 'mannequin' ? '#9aa4c7' : '#ff2bd6';
    typeAdv = adversaire;
    joueurs = [
      creerJoueur(1, 'Joueur 1', '#00e5ff', config.perso1),
      creerJoueur(2, nomAdversaire, couleurAdversaire, persoAdv),
    ];
    if (adversaire === 'ordi') {
      ia = NB.ia.creer(niveau);
      joueurs[1].modPuiss = ia.params.puissance; // petits bonus ou malus selon le niveau
      joueurs[1].modPoids = ia.params.poids;
    }
    objets = [];
    terminee = false;
    panneau.style.display = 'none';
    document.getElementById('touches').innerHTML =
      '<div><b>J1</b> ' + AIDE_J1 + '</div>'
      + (adversaire === 'joueur' ? '<div><b>J2</b> ' + AIDE_J2 + '</div>' : '')
      + '<div><kbd>Échap</kbd> retour au menu</div>';
    if (!enCours) {
      enCours = true;
      NB.client.demarrer({ local: true, touches: TOUCHES_J1 });
      emettre({ t: 'bienvenue', id: 1 });
    }
  }

  function lancerReseau() {
    // Page ouverte comme simple fichier (sans serveur web) : on ne connaît pas
    // l'adresse de la VM, on la demande une fois et on la retient.
    let serveur = null;
    if (location.protocol === 'file:') {
      let defaut = '';
      try { defaut = localStorage.getItem('nb-serveur') || ''; } catch (e) { /* stockage indisponible */ }
      serveur = window.prompt('Adresse IP de la VM qui héberge le jeu (ex. 192.168.1.42) :', defaut);
      if (!serveur || !serveur.trim()) return;
      serveur = serveur.trim();
      try { localStorage.setItem('nb-serveur', serveur); } catch (e) { /* stockage indisponible */ }
    }
    panneau.style.display = 'none';
    document.getElementById('touches').innerHTML =
      '<div>' + AIDE_RESEAU + '</div><div><kbd>Échap</kbd> retour au menu</div>';
    NB.client.demarrer({ local: false, perso: config.perso1, serveur });
  }

  let dernierSolo = null; // dernier combat de solo (pour « Réessayer » et « Combat suivant »)

  function finir(gagnant) {
    terminee = true;
    if (solo) { finirSolo(gagnant === joueurs[0]); return; }
    const P = PERSOS[gagnant.perso];
    panneau.innerHTML =
      '<div class="boite">'
      + '<h1>' + gagnant.nom + ' gagne !</h1>'
      + '<p>' + P.nom + ' · ' + ELEMENTS[P.element].nom + '</p>'
      + '<p><button class="gros" data-action="rejouer">Rejouer</button> '
      + '<button class="gros" data-action="menu">Menu</button></p>'
      + '</div>';
    panneau.style.display = 'flex';
  }

  // ===========================================================================
  // MODE SOLO
  // ===========================================================================
  const echap = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const etoiles = (niveau) => '★'.repeat(Math.ceil(niveau / 2)) + '☆'.repeat(5 - Math.ceil(niveau / 2));

  /** Fiche d'un personnage : nom, élément, description et capacités. */
  function ficheperso(id) {
    const P = PERSOS[id];
    const E = ELEMENTS[P.element];
    const noms = ['spe1', 'spe2', 'spe3'].map((k) => (P[k].armes ? 'Armes' : P[k].nom));
    return '<div class="fiche" style="border-color:' + E.couleur + '">'
      + '<b style="color:' + E.couleur + '">' + echap(P.nom) + '</b> · ' + E.nom + '<br>'
      + '<span>' + echap(P.description) + '</span><br>'
      + '<small>' + noms.map(echap).join(' · ') + '</small></div>';
  }

  function carteMode(mode) {
    const M = PROG.SOLO[mode];
    const gagnes = PROG.etapesGagnees(mode);
    const ouvert = PROG.modeOuvert(mode);
    const liste = M.etapes.map((e, i) => {
      const P = PERSOS[e.perso];
      const E = ELEMENTS[P.element];
      let classe = 'plus';
      let marque = '○';
      if (i < gagnes) { classe = 'fait'; marque = '✔'; } else if (i === gagnes && ouvert) { classe = 'courant'; marque = '▶'; }
      const nom = ouvert || i < gagnes ? echap(P.nom) : '???';
      return '<li class="' + classe + '"><span class="marque">' + marque + '</span> '
        + '<b style="color:' + (ouvert || i < gagnes ? E.couleur : '#8a86a0') + '">' + nom + '</b>'
        + ' <small>niveau ' + e.niveau + ' ' + etoiles(e.niveau) + '</small></li>';
    }).join('');
    let bouton;
    if (!ouvert) {
      const prec = PROG.MODES[PROG.MODES.indexOf(mode) - 1];
      bouton = '<button disabled>🔒 Termine le mode ' + PROG.SOLO[prec].nom + '</button>';
    } else if (PROG.modeTermine(mode)) {
      bouton = '<button data-action="solo-jouer" data-mode="' + mode + '">Revanche (dernier combat)</button>';
    } else {
      bouton = '<button class="gros" data-action="solo-jouer" data-mode="' + mode + '" style="background:' + M.couleur + '">'
        + (gagnes ? 'Continuer' : 'Commencer') + '</button>';
    }
    return '<div class="carte-mode" style="border-color:' + M.couleur + '">'
      + '<h3 style="color:' + M.couleur + '">' + M.nom + '</h3>'
      + '<p class="avance">' + gagnes + ' / ' + M.etapes.length + ' combats gagnés' + (PROG.modeTermine(mode) ? ' · terminé ✔' : '') + '</p>'
      + '<ol>' + liste + '</ol>' + bouton + '</div>';
  }

  function afficherSolo() {
    panneau.innerHTML = '<div class="boite">'
      + '<h1>MODE SOLO</h1>'
      + '<p class="note">Bats l\'ordinateur de plus en plus fort : chaque combat gagné <b>débloque</b> le personnage que tu viens de battre. '
      + 'Difficile s\'ouvre quand Normal est terminé, Impossible quand Difficile est terminé.</p>'
      + '<h2>Ton personnage</h2>' + boutonsPersos('perso1')
      + '<div class="cartes-modes">' + PROG.MODES.map(carteMode).join('') + '</div>'
      + (PROG.toutTermine() ? '<p class="bravo">🏆 Tu as terminé les trois modes solo : tous les personnages sont à toi !</p>' : '')
      + '<p class="note">' + PROG.nbDebloques() + ' / ' + PROG.total() + ' personnages débloqués'
      + (PROG.sauvegardeOk ? '' : ' · <b>attention : la progression ne peut pas être sauvegardée dans ce navigateur</b>') + '</p>'
      + '<p><button data-action="retour">Retour</button> <button data-action="solo-reset" class="petit">Effacer ma progression</button></p>'
      + '</div>';
    panneau.style.display = 'flex';
  }

  function introSolo(mode, numero) {
    const M = PROG.SOLO[mode];
    const e = M.etapes[numero];
    const revanche = PROG.etapesGagnees(mode) > numero;
    panneau.innerHTML = '<div class="boite">'
      + '<h1>COMBAT ' + (numero + 1) + ' / ' + M.etapes.length + '</h1>'
      + '<p style="color:' + M.couleur + '"><b>Mode ' + M.nom + '</b> · niveau ' + e.niveau + ' ' + etoiles(e.niveau) + ' · ' + echap(C.CARTES[e.carte].nom) + '</p>'
      + '<h2>Ton adversaire</h2>' + ficheperso(e.perso)
      + '<p class="note">' + (revanche ? 'Tu as déjà gagné ce combat (aucun nouveau personnage).' : 'Bats-le pour débloquer ce personnage !') + '</p>'
      + '<h2>Toi</h2>' + ficheperso(config.perso1)
      + '<p><button class="gros" data-action="solo-commencer">Combattre !</button> <button data-action="solo">Retour</button></p>'
      + '</div>';
    panneau.style.display = 'flex';
    dernierSolo = { mode, numero };
  }

  function finirSolo(gagne) {
    const { mode, numero } = solo;
    dernierSolo = { mode, numero };
    const M = PROG.SOLO[mode];
    let html;
    if (gagne) {
      const r = PROG.victoire(mode, numero);
      html = '<h1>VICTOIRE !</h1>';
      if (r.nouveau) {
        html += '<p>🔓 <b>Nouveau personnage débloqué !</b></p>' + ficheperso(r.perso);
      } else {
        html += '<p>Revanche gagnée.</p>';
      }
      if (r.prochainMode) html += '<p class="bravo">Le mode <b>' + PROG.SOLO[r.prochainMode].nom + '</b> est maintenant ouvert !</p>';
      else if (r.modeTermine && r.nouveau && !r.toutTermine) html += '<p class="bravo">Mode ' + M.nom + ' terminé !</p>';
      if (r.toutTermine && r.nouveau) html += '<p class="bravo">🏆 Tu as terminé les trois modes solo ! Tous les personnages sont débloqués.</p>';
      html += '<p>' + (!r.modeTermine
        ? '<button class="gros" data-action="solo-suivant">Combat suivant</button> '
        : '') + '<button data-action="solo">Retour au solo</button></p>';
    } else {
      html = '<h1>DÉFAITE</h1><p>Il faut garder ta concentration : tu peux retenter ce combat autant de fois que tu veux.</p>'
        + '<p><button class="gros" data-action="solo-reessayer">Réessayer</button> <button data-action="solo">Retour au solo</button></p>';
    }
    panneau.innerHTML = '<div class="boite">' + html + '</div>';
    panneau.style.display = 'flex';
  }

  // ---------------------------------------------------------------------------
  // Menus
  // ---------------------------------------------------------------------------
  const style = document.createElement('style');
  style.textContent = [
    '#panneau { position: fixed; inset: 0; z-index: 10; display: flex; padding: 10px; box-sizing: border-box; touch-action: pan-y; }',
    '#panneau {',
    '  background: rgba(10, 10, 18, 0.82); overflow: auto; }',
    '#panneau .boite { margin: auto; max-width: 940px; padding: 16px 28px; text-align: center; border: 4px solid #1d1a26;',
    '  border-radius: 16px; background: linear-gradient(#2d2a44, #1f1c30); box-shadow: 0 10px 40px rgba(0,0,0,0.6); }',
    '#panneau h1 { margin: 0 0 4px; color: #ffd23f; letter-spacing: 0.1em; font-size: 38px;',
    '  text-shadow: 3px 3px 0 #1d1a26, -1px -1px 0 #1d1a26, 1px -1px 0 #1d1a26, -1px 1px 0 #1d1a26; }',
    '#panneau h2 { margin: 10px 0 6px; font-size: 15px; color: #ffffff; letter-spacing: 0.08em; text-transform: uppercase; }',
    '#panneau p { margin: 6px 0; font-size: 13px; line-height: 2; }',
    '#panneau button { margin: 3px; padding: 7px 12px; border: 3px solid #1d1a26; border-radius: 10px; background: #3d3958;',
    '  color: #f2f2f7; font: inherit; font-size: 13px; font-weight: bold; cursor: pointer; text-shadow: 0 1px 2px #000; }',
    '#panneau button small { display: block; opacity: 0.85; font-size: 11px; font-weight: normal; }',
    '#panneau button:hover { filter: brightness(1.15); }',
    '#panneau button[disabled] { opacity: 0.45; cursor: not-allowed; filter: grayscale(0.7); }',
    '#panneau button.choisi { outline: 3px solid #ffd23f; outline-offset: 1px; transform: translateY(-2px); }',
    '#panneau button.gros { padding: 10px 28px; font-size: 18px; background: #ffd23f; color: #1d1a26; text-shadow: none; }',
    '#panneau button.petit { padding: 4px 8px; font-size: 11px; opacity: 0.7; }',
    '#panneau .note { opacity: 0.75; font-size: 12px; line-height: 1.5; }',
    '#panneau .bravo { color: #ffd23f; font-weight: bold; line-height: 1.5; }',
    '#panneau .cartes-modes { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin: 10px 0; }',
    '#panneau .carte-mode { flex: 1 1 250px; max-width: 290px; padding: 8px 10px; border: 4px solid; border-radius: 14px; background: rgba(0,0,0,0.25); }',
    '#panneau .carte-mode h3 { margin: 0; font-size: 20px; letter-spacing: 0.08em; text-shadow: 2px 2px 0 #1d1a26; }',
    '#panneau .carte-mode .avance { margin: 2px 0 6px; font-size: 12px; opacity: 0.85; line-height: 1.4; }',
    '#panneau .carte-mode ol { list-style: none; margin: 0 0 8px; padding: 0; text-align: left; font-size: 13px; line-height: 1.9; }',
    '#panneau .carte-mode li.plus { opacity: 0.6; }',
    '#panneau .carte-mode li.courant { background: rgba(255,210,63,0.15); border-radius: 6px; }',
    '#panneau .carte-mode .marque { display: inline-block; width: 1.3em; text-align: center; }',
    '#panneau .fiche { display: inline-block; min-width: 300px; margin: 4px; padding: 8px 14px; border: 3px solid; border-radius: 12px; background: rgba(0,0,0,0.25); font-size: 14px; line-height: 1.5; }',
    '#panneau .fiche small { opacity: 0.8; font-size: 12px; }',
    '@media (max-width: 760px), (max-height: 500px) {',
    '  #panneau .boite { padding: 10px 12px; }',
    '  #panneau h1 { font-size: 26px; }',
    '  #panneau h2 { margin: 6px 0 4px; font-size: 13px; }',
    '  #panneau button { padding: 5px 8px; font-size: 12px; }',
    '  #panneau button small { display: none; }',
    '  #panneau .note, #panneau .aide { display: none; }',
    '  #panneau button.gros { padding: 8px 20px; font-size: 16px; }',
    '  #panneau .carte-mode { flex-basis: 200px; }',
    '  #panneau .carte-mode ol { font-size: 12px; line-height: 1.6; }',
    '  #panneau .fiche { min-width: 0; font-size: 12px; padding: 4px 8px; }',
    '}',
  ].join('\n');
  document.head.appendChild(style);

  const panneau = document.createElement('div');
  panneau.id = 'panneau';
  document.body.appendChild(panneau);

  /** Boutons de choix de personnage ; les personnages verrouillés sont grisés. */
  function boutonsPersos(cle) {
    return Object.keys(PERSOS).map((id) => {
      const P = PERSOS[id];
      const E = ELEMENTS[P.element];
      const ouvert = PROG.estDebloque(id);
      const ou = PROG.ouDebloquer(id);
      const titre = ouvert ? P.description : 'Verrouillé : gagne le combat ' + (ou ? ou.numero + ' du mode solo ' + ou.nom : '');
      return '<button data-cle="' + cle + '" data-valeur="' + id + '"' + (ouvert ? '' : ' disabled')
        + ' title="' + echap(titre) + '" style="background:' + E.couleur + ';color:#1d1a26;text-shadow:none"'
        + (config[cle] === id ? ' class="choisi"' : '') + '>'
        + (ouvert ? '' : '🔒 ') + (ouvert ? P.nom : '???') + '<small>' + (ouvert ? E.nom : 'à débloquer') + '</small></button>';
    }).join('');
  }

  function boutonsReseau() {
    return '<p><button class="gros" data-action="reseau" style="background:#4ac6ff">En réseau</button> '
      + (NB.p2p
        ? '<button data-action="heberger" style="background:#9be04a;color:#1d1a26;text-shadow:none">Héberger (sans serveur)</button> '
          + '<button data-action="rejoindre" style="background:#ff8ad2;color:#1d1a26;text-shadow:none">Rejoindre (sans serveur)</button>'
        : '') + '</p>';
  }

  /** Écran d'accueil : le mode solo, le combat rapide et le jeu en réseau. */
  function afficherMenu() {
    panneau.innerHTML =
      '<div class="boite">'
      + '<h1>NEON BRAWL</h1>'
      + '<p class="note">Fais monter le pourcentage de ton adversaire pour l\'éjecter de l\'écran. 3 vies chacun.</p>'
      + '<p><button class="gros" data-action="solo" style="background:#ffd23f">Mode solo</button> '
      + '<button class="gros" data-action="combat" style="background:#ff8a3d">Combat rapide</button></p>'
      + '<h2>Ton personnage</h2>' + boutonsPersos('perso1')
      + '<p class="note">' + PROG.nbDebloques() + ' / ' + PROG.total() + ' personnages débloqués · '
      + 'gagne les combats du mode solo pour débloquer les autres.</p>'
      + '<h2>Jouer à plusieurs</h2>' + boutonsReseau()
      + (TACTILE
        ? '<div class="aide"><h2>Commandes tactiles</h2>'
          + '<p class="note">Joystick à gauche : bouger (haut = sauter, bas = descendre ou chute rapide). '
          + 'Boutons à droite : A légère, B forte (maintenir pour charger), ★ spécial, saut, bouclier, '
          + 'esquive, attrape, dash. Tiens le téléphone en mode paysage.</p></div>'
        : '<h2>Touches</h2>'
          + '<p><b>Joueur 1</b> — ' + AIDE_J1 + '<br><b>Joueur 2</b> — ' + AIDE_J2 + '</p>')
      + '<p class="note">Maintenir la direction pour courir. Maintenir Forte pour charger. '
      + 'Haut, bas ou côté + attaque change le coup. Le dash est une impulsion rapide, au sol ou en l\'air (une fois par saut) : '
      + 'on peut l\'annuler en sautant ou en attaquant.<br>'
      + 'L\'attrape passe à travers le bouclier. Spécial = capacité 1, Bas + Spécial = capacité 2, '
      + 'Spécial en l\'air (ou Haut + Spécial) = capacité aérienne.<br>'
      + 'Près du vide, on s\'accroche au bord : Haut pour remonter, Bas pour lâcher.</p>'
      + '<p class="note">« En réseau » : pour jouer entre plusieurs PC. Il faut que le serveur de jeu '
      + 'soit lancé sur cette machine (port 3000).</p>'
      + '</div>';
    panneau.style.display = 'flex';
  }

  /** Combat rapide : réglages libres (adversaire, niveau, carte). */
  function afficherCombat() {
    const types = { joueur: 'Joueur 2 (même clavier)', ordi: 'Ordinateur', mannequin: 'Mannequin d\'entraînement' };
    if (TACTILE) delete types.joueur; // pas de second clavier sur un téléphone
    if (!types[config.adversaire]) config.adversaire = 'ordi';
    panneau.innerHTML =
      '<div class="boite">'
      + '<h1>COMBAT RAPIDE</h1>'
      + '<p><button class="gros" data-action="jouer">Jouer</button> <button data-action="retour">Retour</button></p>'
      + '<h2>Joueur 1</h2>' + boutonsPersos('perso1')
      + '<h2>Adversaire</h2>'
      + Object.keys(types).map((id) => '<button data-cle="adversaire" data-valeur="' + id + '"'
        + (config.adversaire === id ? ' class="choisi"' : '') + '>' + types[id] + '</button>').join('')
      + (config.adversaire === 'ordi'
        ? '<br><span class="note">Niveau de l\'ordinateur :</span> '
          + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => '<button data-cle="niveau" data-valeur="' + n + '"'
            + (config.niveau === String(n) ? ' class="choisi"' : '') + '>' + n + '</button>').join('')
        : '')
      + (config.adversaire !== 'mannequin' ? '<br>' + boutonsPersos('perso2') : '')
      + '<h2>Carte</h2>'
      + Object.keys(C.CARTES).concat('hasard').map((id) => '<button data-cle="carte" data-valeur="' + id + '"'
        + (config.carte === id ? ' class="choisi"' : '') + '>'
        + (id === 'hasard' ? 'Au hasard' : C.CARTES[id].nom) + '</button>').join('')
      + '</div>';
    panneau.style.display = 'flex';
  }

  /** Sélection d'une option : on réaffiche l'écran où l'on se trouve. */
  let ecran = 'accueil';
  function reafficher() {
    if (ecran === 'combat') afficherCombat();
    else if (ecran === 'solo') afficherSolo();
    else afficherMenu();
  }

  function lancerSolo(mode) {
    introSolo(mode, PROG.etapeCourante(mode));
  }

  panneau.addEventListener('click', (e) => {
    const bouton = e.target.closest('button');
    if (!bouton || bouton.disabled) return;
    const a = bouton.dataset.action;
    if (bouton.dataset.cle) {
      config[bouton.dataset.cle] = bouton.dataset.valeur;
      reafficher();
    } else if (a === 'jouer' || a === 'rejouer') {
      lancerPartie(a === 'rejouer' && solo ? solo : null);
    } else if (a === 'solo') {
      ecran = 'solo';
      afficherSolo();
    } else if (a === 'combat') {
      ecran = 'combat';
      afficherCombat();
    } else if (a === 'retour') {
      ecran = 'accueil';
      afficherMenu();
    } else if (a === 'solo-jouer') {
      lancerSolo(bouton.dataset.mode);
    } else if (a === 'solo-commencer') {
      lancerPartie(dernierSolo);
    } else if (a === 'solo-reessayer') {
      lancerPartie(dernierSolo);
    } else if (a === 'solo-suivant') {
      introSolo(dernierSolo.mode, PROG.etapeCourante(dernierSolo.mode));
    } else if (a === 'solo-reset') {
      if (window.confirm('Effacer toute ta progression (personnages débloqués et modes solo) ?')) {
        PROG.reinitialiser();
        afficherSolo();
      }
    } else if (a === 'reseau') {
      lancerReseau();
    } else if (a === 'heberger') {
      NB.p2p.heberger({ perso: config.perso1 });
    } else if (a === 'rejoindre') {
      NB.p2p.rejoindre({ perso: config.perso1 });
    } else if (a === 'menu') {
      location.reload();
    }
  });

  NB.local = {
    creerSocket: () => fausseConnexion,
    aideReseau: AIDE_RESEAU,
    // Pour les tests automatiques : termine la partie en cours (victoire ou défaite du joueur 1).
    forcerFin(gagne) { if (enCours && !terminee) finir(gagne ? joueurs[0] : joueurs[1]); },
  };
  afficherMenu();
})();
