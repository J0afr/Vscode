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
    + 'Légère <kbd>J</kbd> · Forte <kbd>K</kbd> · Bouclier <kbd>L</kbd> · Esquive <kbd>Maj</kbd> · Attrape <kbd>U</kbd> · Spécial <kbd>I</kbd> · Personnage <kbd>1</kbd> à <kbd>6</kbd> · Carte suivante <kbd>Tab</kbd>';

  const enfonceesJ2 = new Set();
  let appuisBrefsJ2 = 0;
  window.addEventListener('keydown', (e) => {
    if (e.target && /^(TEXTAREA|INPUT)$/.test(e.target.tagName)) return; // on écrit un code
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
  // Sur téléphone, on ne peut pas jouer à deux sur le même écran : l'adversaire
  // par défaut est alors l'ordinateur.
  const TACTILE = /[?&]tactile=1/.test(location.search)
    || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    || 'ontouchstart' in window;
  const config = { perso1: 'braise', adversaire: TACTILE ? 'ordi' : 'joueur', perso2: 'brok', carte: 'prairie' };
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
  // Adversaire dirigé par l'ordinateur
  // ---------------------------------------------------------------------------
  const ia = { prochain: 0, plan: 0, saut: 0, bouclier: 0, appui: 0, fort: 0 };

  /** Sol le plus proche de l'abscisse x. */
  function solProche(x) {
    let meilleur = null;
    let distance = Infinity;
    for (const s of C.carte.sols) {
      const d = x < s.x0 ? s.x0 - x : x > s.x1 ? x - s.x1 : 0;
      if (d < distance) { distance = d; meilleur = s; }
    }
    return meilleur;
  }

  /** Choisit les touches de l'ordinateur (b) face à sa cible (c). */
  function touchesOrdi(b, c) {
    if (b.etat === 'mort') return 0;
    const S = PERSOS[b.perso];

    // Accroché au bord : il remonte.
    if (b.etat === 'bord') return b.t > 12 && tick % 4 === 0 ? T.HAUT : 0;

    // Hors de l'arène : revenir vers le sol le plus proche.
    const sol = solProche(b.x);
    const dessus = b.x > sol.x0 + 10 && b.x < sol.x1 - 10;
    if (!b.sol && (!dessus || b.y > sol.y)) {
      const cible = Math.max(sol.x0 + 60, Math.min(sol.x1 - 60, b.x));
      let m = b.x < cible ? T.DROITE : T.GAUCHE;
      if (b.vy > 0 && tick % 14 < 2) m |= T.HAUT;
      // Plus de saut : la capacité aérienne (sauf si elle plonge vers le bas).
      const remonte = !S.spe3.elan || !(S.spe3.elan.vy > 0);
      if (b.sauts === 0 && !b.airSpe && b.cd3 === 0 && remonte && b.y > sol.y - 60 && tick % 6 === 0) {
        m |= T.SPECIAL | T.HAUT;
      }
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
    const sous = C.carte.sols.find((s) => b.sol && b.y === s.y && b.x >= s.x0 - 10 && b.x <= s.x1 + 10);
    if (sous) {
      if (b.x < sous.x0 + 30) m &= ~T.GAUCHE;
      if (b.x > sous.x1 - 30) m &= ~T.DROITE;
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
      t: 'etat', tick, ev: evenements, carte: C.carte.id, objets: capacites.instantane(objets),
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
    // Carte choisie (ou tirée au sort).
    const ids = Object.keys(C.CARTES);
    C.choisirCarte(config.carte === 'hasard' ? ids[Math.floor(Math.random() * ids.length)] : config.carte);
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

  function finir(gagnant) {
    terminee = true;
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

  // ---------------------------------------------------------------------------
  // Menu
  // ---------------------------------------------------------------------------
  const style = document.createElement('style');
  style.textContent = [
    '#panneau { position: fixed; inset: 0; z-index: 10; display: flex; padding: 10px; box-sizing: border-box; touch-action: pan-y; }',
    '#panneau {',
    '  background: rgba(10, 10, 18, 0.82); overflow: auto; }',
    '#panneau .boite { margin: auto; max-width: 900px; padding: 16px 28px; text-align: center; border: 4px solid #1d1a26;',
    '  border-radius: 16px; background: linear-gradient(#2d2a44, #1f1c30); box-shadow: 0 10px 40px rgba(0,0,0,0.6); }',
    '#panneau h1 { margin: 0 0 4px; color: #ffd23f; letter-spacing: 0.1em; font-size: 38px;',
    '  text-shadow: 3px 3px 0 #1d1a26, -1px -1px 0 #1d1a26, 1px -1px 0 #1d1a26, -1px 1px 0 #1d1a26; }',
    '#panneau h2 { margin: 10px 0 6px; font-size: 15px; color: #ffffff; letter-spacing: 0.08em; text-transform: uppercase; }',
    '#panneau p { margin: 6px 0; font-size: 13px; line-height: 2; }',
    '#panneau button { margin: 3px; padding: 7px 12px; border: 3px solid #1d1a26; border-radius: 10px; background: #3d3958;',
    '  color: #f2f2f7; font: inherit; font-size: 13px; font-weight: bold; cursor: pointer; text-shadow: 0 1px 2px #000; }',
    '#panneau button small { display: block; opacity: 0.85; font-size: 11px; font-weight: normal; }',
    '#panneau button:hover { filter: brightness(1.15); }',
    '#panneau button.choisi { outline: 3px solid #ffd23f; outline-offset: 1px; transform: translateY(-2px); }',
    '#panneau button.gros { padding: 10px 28px; font-size: 18px; background: #ffd23f; color: #1d1a26; text-shadow: none; }',
    '#panneau .note { opacity: 0.75; font-size: 12px; line-height: 1.5; }',
    '@media (max-width: 760px), (max-height: 500px) {',
    '  #panneau .boite { padding: 10px 12px; }',
    '  #panneau h1 { font-size: 26px; }',
    '  #panneau h2 { margin: 6px 0 4px; font-size: 13px; }',
    '  #panneau button { padding: 5px 8px; font-size: 12px; }',
    '  #panneau button small { display: none; }',
    '  #panneau .note, #panneau .aide { display: none; }',
    '  #panneau button.gros { padding: 8px 20px; font-size: 16px; }',
    '}',
  ].join('\n');
  document.head.appendChild(style);

  const panneau = document.createElement('div');
  panneau.id = 'panneau';
  document.body.appendChild(panneau);

  function boutonsPersos(cle) {
    return Object.keys(PERSOS).map((id) => {
      const P = PERSOS[id];
      const couleur = ELEMENTS[P.element].couleur;
      return '<button data-cle="' + cle + '" data-valeur="' + id + '" style="background:' + couleur + ';color:#1d1a26;text-shadow:none"'
        + (config[cle] === id ? ' class="choisi"' : '') + '>'
        + P.nom + '<small>' + ELEMENTS[P.element].nom + ' · ' + P.description + '</small></button>';
    }).join('');
  }

  function boutonsJouer() {
    return '<p><button class="gros" data-action="jouer">Jouer</button> '
      + '<button class="gros" data-action="reseau" style="background:#4ac6ff">En réseau</button></p>'
      + (NB.p2p
        ? '<p><button data-action="heberger" style="background:#9be04a;color:#1d1a26;text-shadow:none">Héberger (sans serveur)</button> '
          + '<button data-action="rejoindre" style="background:#ff8ad2;color:#1d1a26;text-shadow:none">Rejoindre (sans serveur)</button></p>'
        : '');
  }

  function afficherMenu() {
    const types = { joueur: 'Joueur 2 (même clavier)', ordi: 'Ordinateur', mannequin: 'Mannequin d\'entraînement' };
    if (TACTILE) delete types.joueur; // pas de second clavier sur un téléphone
    panneau.innerHTML =
      '<div class="boite">'
      + '<h1>NEON BRAWL</h1>'
      + (TACTILE ? boutonsJouer() : '')
      + '<p class="note">Fais monter le pourcentage de ton adversaire pour l\'éjecter de l\'écran. 3 vies chacun.</p>'
      + '<h2>Joueur 1</h2>' + boutonsPersos('perso1')
      + '<h2>Adversaire</h2>'
      + Object.keys(types).map((id) => '<button data-cle="adversaire" data-valeur="' + id + '"'
        + (config.adversaire === id ? ' class="choisi"' : '') + '>' + types[id] + '</button>').join('')
      + '<br>' + boutonsPersos('perso2')
      + '<h2>Carte</h2>'
      + Object.keys(C.CARTES).concat('hasard').map((id) => '<button data-cle="carte" data-valeur="' + id + '"'
        + (config.carte === id ? ' class="choisi"' : '') + '>'
        + (id === 'hasard' ? 'Au hasard' : C.CARTES[id].nom) + '</button>').join('')
      + (TACTILE
        ? '<div class="aide"><h2>Commandes tactiles</h2>'
          + '<p class="note">Joystick à gauche : bouger (haut = sauter, bas = descendre ou chute rapide). '
          + 'Boutons à droite : A légère, B forte (maintenir pour charger), ★ spécial, saut, bouclier, '
          + 'esquive, attrape. Tiens le téléphone en mode paysage.</p></div>'
        : '<h2>Touches</h2>'
          + '<p><b>Joueur 1</b> — ' + AIDE_J1 + '<br><b>Joueur 2</b> — ' + AIDE_J2 + '</p>')
      + '<p class="note">Maintenir la direction pour courir. Maintenir Forte pour charger. '
      + 'Haut, bas ou côté + attaque change le coup.<br>'
      + 'L\'attrape passe à travers le bouclier. Spécial = capacité 1, Bas + Spécial = capacité 2, '
      + 'Spécial en l\'air (ou Haut + Spécial) = capacité aérienne.<br>'
      + 'Près du vide, on s\'accroche au bord : Haut pour remonter, Bas pour lâcher.</p>'
      + (TACTILE ? '' : boutonsJouer())
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
    } else if (bouton.dataset.action === 'heberger') {
      NB.p2p.heberger({ perso: config.perso1 });
    } else if (bouton.dataset.action === 'rejoindre') {
      NB.p2p.rejoindre({ perso: config.perso1 });
    } else if (bouton.dataset.action === 'menu') {
      location.reload();
    }
  });

  NB.local = { creerSocket: () => fausseConnexion, aideReseau: AIDE_RESEAU };
  afficherMenu();
})();
