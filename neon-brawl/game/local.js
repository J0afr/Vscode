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
//   - un adversaire dirigé par l'ordinateur
// =============================================================================
(function () {
  'use strict';

  const C = NB.constants;
  const physics = NB.physics;
  const combat = NB.combat;
  const capacites = NB.capacites;
  const { PERSOS, ELEMENTS } = NB.persos;
  const T = C.TOUCHE;
  const CENTRE_X = (C.BLOC.x0 + C.BLOC.x1) / 2;

  // ---------------------------------------------------------------------------
  // Touches des deux joueurs sur le même clavier
  // (event.code = position physique : KeyW est la touche Z d'un clavier AZERTY)
  // ---------------------------------------------------------------------------
  const TOUCHES_J1 = {
    KeyA: T.GAUCHE, KeyD: T.DROITE, KeyW: T.HAUT, KeyS: T.BAS,
    KeyF: T.LEGER, KeyG: T.FORT, KeyH: T.BOUCLIER, KeyT: T.ESQUIVE,
    KeyR: T.ATTRAPE, KeyY: T.SPECIAL,
  };
  const TOUCHES_J2 = {
    ArrowLeft: T.GAUCHE, ArrowRight: T.DROITE, ArrowUp: T.HAUT, ArrowDown: T.BAS,
    KeyK: T.LEGER, KeyL: T.FORT, Semicolon: T.BOUCLIER, KeyO: T.ESQUIVE,
    KeyI: T.ATTRAPE, KeyP: T.SPECIAL,
    Numpad1: T.LEGER, Numpad2: T.FORT, Numpad3: T.BOUCLIER, Numpad0: T.ESQUIVE,
    Numpad4: T.ATTRAPE, Numpad5: T.SPECIAL,
  };
  const AIDE_J1 = 'Bouger <kbd>Q</kbd><kbd>D</kbd> · Sauter <kbd>Z</kbd> · Descendre <kbd>S</kbd> · '
    + 'Légère <kbd>F</kbd> · Forte <kbd>G</kbd> · Bouclier <kbd>H</kbd> · Esquive <kbd>T</kbd> · Attrape <kbd>R</kbd> · Spécial <kbd>Y</kbd>';
  const AIDE_J2 = 'Bouger <kbd>←</kbd><kbd>→</kbd> · Sauter <kbd>↑</kbd> · Descendre <kbd>↓</kbd> · '
    + 'Légère <kbd>K</kbd> · Forte <kbd>L</kbd> · Bouclier <kbd>M</kbd> · Esquive <kbd>O</kbd> · Attrape <kbd>I</kbd> · Spécial <kbd>P</kbd>';
  const AIDE_RESEAU = 'Bouger <kbd>←</kbd><kbd>→</kbd> ou <kbd>Q</kbd><kbd>D</kbd> · Sauter <kbd>↑</kbd> <kbd>Z</kbd> <kbd>Espace</kbd> · '
    + 'Légère <kbd>J</kbd> · Forte <kbd>K</kbd> · Bouclier <kbd>L</kbd> · Esquive <kbd>Maj</kbd> · Attrape <kbd>U</kbd> · Spécial <kbd>I</kbd> · Personnage <kbd>1</kbd> à <kbd>6</kbd>';

  const enfonceesJ2 = new Set();
  let appuisBrefsJ2 = 0;
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') { location.reload(); return; } // retour au menu
    if (enCours && config.adversaire === 'joueur' && e.code in TOUCHES_J2) {
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
  const config = { perso1: 'braise', adversaire: 'joueur', perso2: 'brok' };
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
    const x = CENTRE_X + (joueur.id === 1 ? -200 : 200);
    if (joueur.nom === 'Mannequin') {
      combat.reapparaitre(joueur, CENTRE_X + 120, C.SOL_Y - 1);
      joueur.dir = -1;
    } else {
      combat.reapparaitre(joueur, x);
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
  // Adversaire dirigé par l'ordinateur
  // ---------------------------------------------------------------------------
  const ia = { prochain: 0, plan: 0, saut: 0, bouclier: 0, appui: 0, fort: 0 };

  /** Choisit les touches de l'ordinateur (b) face à sa cible (c). */
  function touchesOrdi(b, c) {
    if (b.etat === 'mort') return 0;

    // Hors de l'arène : revenir vers le centre en sautant.
    const dehors = b.x < C.BLOC.x0 + 10 || b.x > C.BLOC.x1 - 10;
    if (!b.sol && (dehors || b.y > C.SOL_Y)) {
      let m = b.x < CENTRE_X ? T.DROITE : T.GAUCHE;
      if (b.vy > 0 && tick % 14 < 2) m |= T.HAUT;
      return m;
    }
    if (c.etat === 'mort') return 0;

    // Attaque forte en cours de charge : on maintient la touche.
    if (ia.fort > 0) { ia.fort--; return T.FORT; }

    const dx = c.x - b.x;
    const dy = c.y - b.y;
    const versCible = dx > 0 ? T.DROITE : T.GAUCHE;
    const portee = 62 * PERSOS[b.perso].taille;

    // Une nouvelle décision toutes les 10 à 24 images : il reste battable.
    if (tick >= ia.prochain) {
      ia.prochain = tick + 10 + Math.floor(Math.random() * 14);
      ia.plan = 0;
      const hasard = Math.random();
      if (c.etat === 'bouclier' && Math.abs(dx) <= portee && Math.abs(dy) < 40) {
        ia.appui = T.ATTRAPE | versCible; // un bouclier se contre avec une attrape
      } else if (Math.abs(dx) > portee) {
        ia.plan = versCible;
        // De loin, il utilise ses capacités de temps en temps.
        if (Math.abs(dy) < 60 && Math.abs(dx) < 520 && hasard > 0.72) {
          ia.appui = T.SPECIAL | versCible | (hasard > 0.9 ? T.BAS : 0);
        }
        if (dy < -70 && hasard < 0.5) ia.saut = 2;
      } else if (Math.abs(dy) < 70) {
        if (c.etat === 'attaque' && hasard < 0.35) ia.bouclier = 20;
        else if (hasard < 0.55) ia.appui = T.LEGER | versCible;
        else if (hasard < 0.8) { ia.appui = T.FORT | versCible; ia.fort = 4 + Math.floor(Math.random() * 30); }
        else ia.plan = versCible ^ (T.GAUCHE | T.DROITE); // recule
      } else if (dy < 0) {
        ia.saut = 2;
        if (hasard < 0.5) ia.appui = T.LEGER | T.HAUT;
      }
    }

    let m = ia.plan;
    if (ia.saut > 0) { ia.saut--; m |= T.HAUT; }
    if (ia.bouclier > 0) { ia.bouclier--; m |= T.BOUCLIER; }
    if (ia.appui) { m |= ia.appui; ia.appui = 0; }
    // Ne pas marcher dans le vide.
    if (b.sol && b.y === C.SOL_Y) {
      if (b.x < C.BLOC.x0 + 30) m &= ~T.GAUCHE;
      if (b.x > C.BLOC.x1 - 30) m &= ~T.DROITE;
    }
    return m;
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

    if (config.adversaire === 'joueur') j2.touches = lireJ2();
    else if (config.adversaire === 'ordi') j2.touches = touchesOrdi(j2, j1);
    else j2.touches = 0;
    physics.avancerJoueur(j2, j2.touches);

    combat.resoudreCoups(joueurs, evenements);
    capacites.avancer(objets, joueurs, evenements, tick);
    combat.effetsContinus(joueurs);
    for (const joueur of combat.gererSorties(joueurs, evenements)) {
      // À l'entraînement, les vies sont illimitées.
      if (config.adversaire === 'mannequin' && joueur.vies <= 0) joueur.vies = C.VIES;
      if (joueur.vies > 0) placer(joueur);
      else if (!terminee) finir(joueurs.find((j) => j !== joueur));
    }
    diffuser();
  }

  const arrondi = (n) => Math.round(n * 100) / 100;

  function diffuser() {
    const etat = {
      t: 'etat', tick, ev: evenements, objets: capacites.instantane(objets),
      joueurs: joueurs.map((j) => {
        const s = {
          id: j.id, nom: j.nom, couleur: j.couleur, perso: j.perso,
          degats: Math.round(j.degats), vies: j.vies, acq: j.acquitte,
          brulure: j.brulure > 0 ? 1 : 0,
        };
        for (const champ of physics.CHAMPS) {
          s[champ] = typeof j[champ] === 'number' ? arrondi(j[champ]) : j[champ];
        }
        return s;
      }),
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
  function lancerPartie() {
    const nomAdversaire = { joueur: 'Joueur 2', ordi: 'Ordinateur', mannequin: 'Mannequin' }[config.adversaire];
    const couleurAdversaire = config.adversaire === 'mannequin' ? '#9aa4c7' : '#ff2bd6';
    joueurs = [
      creerJoueur(1, 'Joueur 1', '#00e5ff', config.perso1),
      creerJoueur(2, nomAdversaire, couleurAdversaire, config.perso2),
    ];
    objets = [];
    terminee = false;
    panneau.style.display = 'none';
    document.getElementById('touches').innerHTML =
      '<div><b>J1</b> ' + AIDE_J1 + '</div>'
      + (config.adversaire === 'joueur' ? '<div><b>J2</b> ' + AIDE_J2 + '</div>' : '')
      + '<div><kbd>Échap</kbd> retour au menu</div>';
    if (!enCours) {
      enCours = true;
      NB.client.demarrer({ local: true, touches: TOUCHES_J1 });
      emettre({ t: 'bienvenue', id: 1 });
    }
  }

  function lancerReseau() {
    panneau.style.display = 'none';
    document.getElementById('touches').innerHTML =
      '<div>' + AIDE_RESEAU + '</div><div><kbd>Échap</kbd> retour au menu</div>';
    NB.client.demarrer({ local: false });
  }

  function finir(gagnant) {
    terminee = true;
    const P = PERSOS[gagnant.perso];
    panneau.innerHTML =
      '<div class="boite">'
      + '<h1 style="color:' + ELEMENTS[P.element].couleur + '">' + gagnant.nom + ' gagne !</h1>'
      + '<p>' + P.nom + ' · ' + ELEMENTS[P.element].nom + '</p>'
      + '<p><button class="gros" data-action="rejouer">Rejouer</button> '
      + '<button class="gros" data-action="menu">Menu</button></p>'
      + '</div>';
    panneau.style.display = 'flex';
  }

  // ---------------------------------------------------------------------------
  // Menu
  // ---------------------------------------------------------------------------
  const style = document.createElement('style');
  style.textContent = [
    '#panneau { position: fixed; inset: 0; z-index: 10; display: flex; align-items: center; justify-content: center;',
    '  background: rgba(5, 6, 13, 0.86); overflow: auto; }',
    '#panneau .boite { max-width: 880px; padding: 22px 30px; text-align: center; border: 2px solid #00e5ff;',
    '  border-radius: 14px; background: #0a0d20; box-shadow: 0 0 40px rgba(0, 229, 255, 0.35); }',
    '#panneau h1 { margin: 0 0 4px; color: #00e5ff; letter-spacing: 0.12em; text-shadow: 0 0 16px currentColor; }',
    '#panneau h2 { margin: 16px 0 8px; font-size: 15px; color: #ff2bd6; letter-spacing: 0.08em; text-transform: uppercase; }',
    '#panneau p { margin: 6px 0; font-size: 13px; line-height: 2; }',
    '#panneau button { margin: 3px; padding: 7px 12px; border: 2px solid #3b4a8a; border-radius: 8px; background: #10142b;',
    '  color: #cfd8ff; font: inherit; font-size: 13px; cursor: pointer; }',
    '#panneau button small { display: block; opacity: 0.7; font-size: 11px; }',
    '#panneau button.choisi { background: #1c2450; color: #fff; box-shadow: 0 0 14px currentColor; }',
    '#panneau button.gros { padding: 10px 26px; font-size: 17px; font-weight: bold; border-color: #00e5ff; color: #00e5ff; }',
    '#panneau button.gros:hover { background: #00e5ff; color: #05060d; }',
    '#panneau .note { opacity: 0.65; font-size: 12px; line-height: 1.5; }',
  ].join('\n');
  document.head.appendChild(style);

  const panneau = document.createElement('div');
  panneau.id = 'panneau';
  document.body.appendChild(panneau);

  function boutonsPersos(cle) {
    return Object.keys(PERSOS).map((id) => {
      const P = PERSOS[id];
      const couleur = ELEMENTS[P.element].couleur;
      return '<button data-cle="' + cle + '" data-valeur="' + id + '" style="border-color:' + couleur + ';color:' + couleur + '"'
        + (config[cle] === id ? ' class="choisi"' : '') + '>'
        + P.nom + '<small>' + ELEMENTS[P.element].nom + ' · ' + P.description + '</small></button>';
    }).join('');
  }

  function afficherMenu() {
    const types = { joueur: 'Joueur 2 (même clavier)', ordi: 'Ordinateur', mannequin: 'Mannequin d\'entraînement' };
    panneau.innerHTML =
      '<div class="boite">'
      + '<h1>NEON BRAWL</h1>'
      + '<p class="note">Fais monter le pourcentage de ton adversaire pour l\'éjecter de l\'écran. 3 vies chacun.</p>'
      + '<h2>Joueur 1</h2>' + boutonsPersos('perso1')
      + '<h2>Adversaire</h2>'
      + Object.keys(types).map((id) => '<button data-cle="adversaire" data-valeur="' + id + '"'
        + (config.adversaire === id ? ' class="choisi"' : '') + '>' + types[id] + '</button>').join('')
      + '<br>' + boutonsPersos('perso2')
      + '<h2>Touches</h2>'
      + '<p><b>Joueur 1</b> — ' + AIDE_J1 + '<br><b>Joueur 2</b> — ' + AIDE_J2 + '</p>'
      + '<p class="note">Maintenir la direction pour courir. Maintenir Forte pour charger. '
      + 'Haut, bas ou côté + attaque change le coup.<br>'
      + 'L\'attrape passe à travers le bouclier. Spécial = capacité 1, Bas + Spécial = capacité 2.</p>'
      + '<p><button class="gros" data-action="jouer">Jouer</button> '
      + '<button class="gros" data-action="reseau" style="border-color:#ff2bd6;color:#ff2bd6">En réseau</button></p>'
      + '<p class="note">« En réseau » : pour jouer entre plusieurs PC. Il faut que le serveur de jeu '
      + 'soit lancé sur cette machine (port 3000).</p>'
      + '</div>';
    panneau.style.display = 'flex';
  }

  panneau.addEventListener('click', (e) => {
    const bouton = e.target.closest('button');
    if (!bouton) return;
    if (bouton.dataset.cle) {
      config[bouton.dataset.cle] = bouton.dataset.valeur;
      afficherMenu();
    } else if (bouton.dataset.action === 'jouer' || bouton.dataset.action === 'rejouer') {
      lancerPartie();
    } else if (bouton.dataset.action === 'reseau') {
      lancerReseau();
    } else if (bouton.dataset.action === 'menu') {
      location.reload();
    }
  });

  NB.local = { creerSocket: () => fausseConnexion };
  afficherMenu();
})();
