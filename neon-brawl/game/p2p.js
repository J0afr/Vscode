// =============================================================================
// p2p.js — Parties entre plusieurs appareils SANS serveur (navigateur seul).
//
// Un navigateur ne peut pas « écouter » des connexions comme le ferait un
// serveur. Mais deux navigateurs peuvent se relier directement (WebRTC). Ici :
//
//   - un joueur « héberge » : sa page fait tourner la partie (exactement ce que
//     fait server.js : physique, coups, vies) pour tous les joueurs ;
//   - les autres « rejoignent » : leur page envoie ses touches à l'hôte et
//     reçoit l'état de la partie, comme avec le vrai serveur.
//
// Comme il n'y a pas de serveur pour présenter les appareils entre eux, la mise
// en relation se fait à la main, avec deux codes à copier-coller :
//   1. l'hôte crée une invitation (un code) et l'envoie à son ami ;
//   2. l'ami colle ce code, obtient un code de réponse et le renvoie à l'hôte ;
//   3. l'hôte colle la réponse : les deux appareils sont connectés.
//
// Il faut que les appareils soient sur le même réseau (même Wi-Fi), et que ce
// réseau laisse passer les connexions directes entre appareils.
// =============================================================================
(function () {
  'use strict';

  const C = NB.constants;
  const physics = NB.physics;
  const combat = NB.combat;
  const capacites = NB.capacites;
  const { PERSOS } = NB.persos;

  const LISTE_PERSOS = Object.keys(PERSOS);
  const COULEURS = ['#00e5ff', '#ff2bd6', '#ffb300', '#6bff4a', '#b388ff', '#ff5252', '#40ffc8', '#ff8a3d'];
  const MAX_JOUEURS = 8;
  const CONFIG_RTC = { iceServers: [] }; // réseau local : aucun serveur d'aide nécessaire

  // ===========================================================================
  // 1. LA PARTIE (côté hôte) — équivalent de server.js, dans la page
  // ===========================================================================
  const salon = {
    actif: false,
    joueurs: new Map(),     // id -> joueur (humains et mannequin)
    objets: [],             // projectiles et zones des capacités
    evInvites: [],          // événements à envoyer aux invités au prochain état
    tick: 0,
    prochainId: 1,
    hote: null,             // le joueur de celui qui héberge
    mannequin: null,
    invites: [],            // une entrée par invitation
    nInvite: 0,
  };

  function xApparition(joueur) {
    const departs = C.carte.departs;
    return departs[(joueur.id - 1) % departs.length];
  }

  function couleurLibre() {
    const prises = new Set([...salon.joueurs.values()].map((j) => j.couleur));
    return COULEURS.find((c) => !prises.has(c)) || COULEURS[0];
  }

  /** Le mannequin a un numéro à part (100), pour ne pas voler celui d'un vrai joueur. */
  function creerJoueur(idFixe) {
    const id = idFixe || salon.prochainId++;
    const joueur = {
      id,
      nom: 'Joueur ' + id,
      couleur: couleurLibre(),
      perso: LISTE_PERSOS[(id - 1) % LISTE_PERSOS.length],
      degats: 0, brulure: 0, vies: C.VIES,
      touches: 0, file: [], acquitte: 0, retour: 0,
      ...physics.nouvelEtat(0, 0),
    };
    combat.reapparaitre(joueur, xApparition(joueur));
    joueur.invul = 60;
    salon.joueurs.set(id, joueur);
    return joueur;
  }

  function placerMannequin() {
    const m = C.carte.mannequin;
    combat.reapparaitre(salon.mannequin, m.x, m.y - 1);
    salon.mannequin.dir = -1;
  }

  /** Un joueur seul a droit à un mannequin d'entraînement ; à deux ou plus, il s'en va. */
  function ajusterMannequin() {
    const humains = [...salon.joueurs.values()].filter((j) => j !== salon.mannequin).length;
    if (humains === 1 && !salon.mannequin) {
      salon.mannequin = creerJoueur(100);
      salon.mannequin.nom = 'Mannequin';
      salon.mannequin.couleur = '#9aa4c7';
      salon.mannequin.perso = 'ondine';
      placerMannequin();
    } else if (humains !== 1 && salon.mannequin) {
      salon.joueurs.delete(salon.mannequin.id);
      salon.mannequin = null;
    }
  }

  function changerCarte(id) {
    C.choisirCarte(id);
    salon.objets.length = 0;
    for (const joueur of salon.joueurs.values()) {
      joueur.vies = C.VIES;
      if (joueur === salon.mannequin) placerMannequin();
      else combat.reapparaitre(joueur, xApparition(joueur));
    }
  }

  /** Message reçu d'un joueur (de l'hôte lui-même ou d'un invité). */
  function recevoir(joueur, msg) {
    if (msg.t === 'input' && Number.isInteger(msg.seq) && Number.isInteger(msg.touches)) {
      if (joueur.file.length < 120) joueur.file.push({ seq: msg.seq, touches: msg.touches & C.MASQUE_TOUCHES });
    } else if (msg.t === 'perso' && LISTE_PERSOS.includes(msg.perso)) {
      joueur.perso = msg.perso;
    } else if (msg.t === 'carte' && C.CARTES[msg.id] && msg.id !== C.carte.id) {
      changerCarte(msg.id);
    }
  }

  function consommerInput(joueur) {
    const input = joueur.file.shift();
    if (!input) return;
    joueur.touches = input.touches;
    joueur.acquitte = input.seq;
  }

  const arrondi = (n) => Math.round(n * 100) / 100;

  function instantane(j) {
    const s = {
      id: j.id, nom: j.nom, couleur: j.couleur, perso: j.perso,
      degats: Math.round(j.degats), vies: j.vies, acq: j.acquitte,
      brulure: j.brulure > 0 ? 1 : 0,
    };
    for (const champ of physics.CHAMPS) s[champ] = typeof j[champ] === 'number' ? arrondi(j[champ]) : j[champ];
    return s;
  }

  function avancerSimulation() {
    salon.tick++;
    const liste = [...salon.joueurs.values()];
    const evenements = [];

    for (const joueur of liste) {
      consommerInput(joueur);
      physics.avancerJoueur(joueur, joueur.touches);
      // Inputs arrivés en retard : on rattrape progressivement.
      if (joueur.file.length > 4) { consommerInput(joueur); physics.avancerJoueur(joueur, joueur.touches); }
    }
    combat.resoudreCoups(liste, evenements);
    capacites.avancer(salon.objets, liste, evenements, salon.tick);
    combat.effetsContinus(liste);
    for (const joueur of combat.gererSorties(liste, evenements)) {
      if (joueur.vies <= 0) joueur.vies = C.VIES;
      if (joueur === salon.mannequin) placerMannequin();
      else combat.reapparaitre(joueur, xApparition(joueur));
    }
    for (const e of evenements) salon.evInvites.push(e);
    diffuser(evenements);
  }

  function diffuser(evenementsTick) {
    const base = {
      t: 'etat', tick: salon.tick, carte: C.carte.id,
      objets: capacites.instantane(salon.objets),
      joueurs: [...salon.joueurs.values()].map(instantane),
    };
    // L'hôte reçoit l'état à chaque tick (60 fois par seconde)…
    versHote(JSON.stringify({ ...base, ev: evenementsTick }));
    // …les invités 30 fois par seconde, avec les événements des deux ticks.
    if (salon.tick % C.ETAT_TOUS_LES === 0) {
      const texte = JSON.stringify({ ...base, ev: salon.evInvites });
      salon.evInvites = [];
      for (const inv of salon.invites) {
        if (inv.joueur && inv.dc.readyState === 'open' && inv.dc.bufferedAmount < 1e6) inv.dc.send(texte);
      }
    }
  }

  // Boucle à pas fixe, comme celle du serveur.
  let boucleLancee = false;
  function lancerBoucle() {
    if (boucleLancee) return;
    boucleLancee = true;
    // Un invité qui n'envoie plus rien depuis 10 secondes est considéré comme parti
    // (téléphone verrouillé, onglet fermé, Wi-Fi coupé…).
    setInterval(() => {
      const maintenant = performance.now();
      for (const inv of salon.invites) {
        if (inv.joueur && maintenant - inv.vu > 10000) { retirer(inv); inv.dc.close(); }
      }
    }, 1000);
    const duree = 1000 / C.TICK_HZ;
    let dernier = performance.now();
    let accu = 0;
    setInterval(() => {
      const maintenant = performance.now();
      accu += Math.min(250, maintenant - dernier);
      dernier = maintenant;
      while (accu >= duree) { avancerSimulation(); accu -= duree; }
    }, 4);
  }

  // ---------------------------------------------------------------------------
  // L'hôte joue dans la même page : il est relié à la partie par une fausse
  // connexion, comme dans local.js.
  // ---------------------------------------------------------------------------
  const ecouteursHote = { message: [], close: [] };
  const socketHote = {
    readyState: 1,
    send(texte) { if (salon.hote) recevoir(salon.hote, JSON.parse(texte)); },
    addEventListener(type, fonction) { if (ecouteursHote[type]) ecouteursHote[type].push(fonction); },
  };
  function versHote(texte) {
    for (const f of ecouteursHote.message) f({ data: texte });
  }

  // ===========================================================================
  // 2. MISE EN RELATION PAR CODES (WebRTC)
  // ===========================================================================
  function encoder(desc) {
    return btoa(JSON.stringify({ t: desc.type, s: desc.sdp }));
  }

  function decoder(texte, type) {
    let o;
    try { o = JSON.parse(atob(String(texte).replace(/\s+/g, ''))); } catch (e) { o = null; }
    if (!o || typeof o.s !== 'string') throw new Error('Code illisible : copie-le en entier, sans rien ajouter ni enlever.');
    if (o.t !== type) {
      throw new Error(type === 'offer'
        ? 'Ce n\'est pas le code de l\'invitation : c\'est celui de la réponse.'
        : 'Ce n\'est pas le code de la réponse : c\'est celui de l\'invitation.');
    }
    return { type: o.t, sdp: o.s };
  }

  /** Attend que l'appareil ait listé ses adresses réseau (quelques dixièmes de seconde). */
  function attendreAdresses(pc) {
    return new Promise((resoudre) => {
      if (pc.iceGatheringState === 'complete') { resoudre(); return; }
      let fini = false;
      const fin = () => { if (!fini) { fini = true; resoudre(); } };
      pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') fin(); });
      setTimeout(fin, 4000);
    });
  }

  const MESSAGE_RESEAU = 'Connexion impossible. Vérifie que les deux appareils sont sur le même Wi-Fi '
    + '(pas un réseau « invité »), et que le réseau n\'isole pas les appareils entre eux.';

  // ---------------------------------------------------------------------------
  // Côté hôte : une invitation par ami
  // ---------------------------------------------------------------------------
  async function creerInvitation() {
    const inv = { n: ++salon.nInvite, pc: new RTCPeerConnection(CONFIG_RTC), dc: null, joueur: null, code: '', etat: 'préparation…' };
    inv.dc = inv.pc.createDataChannel('jeu');
    inv.dc.onopen = () => {
      if (salon.joueurs.size >= MAX_JOUEURS + 1) { inv.dc.close(); return; }
      inv.joueur = creerJoueur();
      inv.vu = performance.now();
      ajusterMannequin();
      inv.dc.send(JSON.stringify({ t: 'bienvenue', id: inv.joueur.id }));
      majEtat(inv, 'connecté ✔ (' + inv.joueur.nom + ')', 'ok');
    };
    inv.dc.onmessage = (e) => {
      if (!inv.joueur) return;
      inv.vu = performance.now();
      try { recevoir(inv.joueur, JSON.parse(e.data)); } catch (err) { /* message illisible : ignoré */ }
    };
    inv.dc.onclose = () => retirer(inv);
    inv.pc.onconnectionstatechange = () => {
      const etat = inv.pc.connectionState;
      if (etat === 'failed' && !inv.joueur) majEtat(inv, MESSAGE_RESEAU, 'pb');
      if (etat === 'failed' || etat === 'closed') retirer(inv);
    };
    salon.invites.push(inv);
    await inv.pc.setLocalDescription(await inv.pc.createOffer());
    await attendreAdresses(inv.pc);
    inv.code = encoder(inv.pc.localDescription);
    inv.etat = 'envoie ce code à ton ami';
    return inv;
  }

  /** Un invité est parti : on retire son personnage de la partie. */
  function retirer(inv) {
    if (!inv.joueur) return;
    salon.joueurs.delete(inv.joueur.id);
    inv.joueur = null;
    ajusterMannequin();
    majEtat(inv, 'déconnecté', 'pb');
  }

  async function appliquerReponse(inv, texte) {
    try {
      await inv.pc.setRemoteDescription(decoder(texte, 'answer'));
      majEtat(inv, 'connexion en cours…', '');
    } catch (e) {
      majEtat(inv, e.message, 'pb');
    }
  }

  // ---------------------------------------------------------------------------
  // Côté invité : une connexion vers l'hôte, qui se comporte comme un WebSocket
  // ---------------------------------------------------------------------------
  function socketInvite(dc) {
    const ecouteurs = { message: [], close: [] };
    let tampon = []; // messages arrivés avant que le jeu ne soit prêt
    const s = {
      readyState: dc.readyState === 'open' ? 1 : 0,
      send(texte) { if (dc.readyState === 'open') dc.send(texte); },
      addEventListener(type, f) {
        if (!ecouteurs[type]) return;
        ecouteurs[type].push(f);
        if (type === 'message' && tampon) {
          // Le jeu est prêt : on lui remet les messages arrivés avant lui, puis on ne met plus rien de côté.
          const reste = tampon;
          tampon = null;
          for (const data of reste) f({ data });
        }
      },
    };
    dc.onmessage = (e) => {
      if (tampon) { tampon.push(e.data); return; }
      for (const f of ecouteurs.message) f({ data: e.data });
    };
    dc.onopen = () => { s.readyState = 1; };
    dc.onclose = () => { s.readyState = 3; for (const f of ecouteurs.close) f(); };
    return s;
  }

  // ===========================================================================
  // 3. INTERFACE (dans le panneau du menu)
  // ===========================================================================
  const echapper = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const panneau = () => document.getElementById('panneau');

  const style = document.createElement('style');
  style.textContent = [
    '#panneau textarea { width: 100%; box-sizing: border-box; height: 74px; margin: 4px 0; padding: 6px; border: 3px solid #1d1a26;',
    '  border-radius: 8px; background: #f2f2f7; color: #1d1a26; font: 11px monospace; resize: none;',
    '  -webkit-user-select: text; user-select: text; touch-action: manipulation; }',
    '#panneau .invite { margin: 8px 0; padding: 8px 10px; border: 3px solid #1d1a26; border-radius: 12px; background: rgba(0,0,0,0.25); text-align: left; }',
    '#panneau .invite p { margin: 2px 0; font-size: 13px; line-height: 1.4; }',
    '#panneau .aide-salon { font-size: 13px; line-height: 1.5; opacity: 0.9; margin: 6px 0; }',
    '#panneau .etat { display: block; margin-top: 4px; font-size: 13px; font-weight: bold; color: #ffd23f; }',
    '#panneau .etat.ok { color: #6bff4a; }',
    '#panneau .etat.pb { color: #ff8a8a; }',
    '#btn-inviter { position: fixed; z-index: 7; top: 34px; left: 10px; display: none; padding: 5px 12px; border: 3px solid #1d1a26;',
    '  border-radius: 10px; background: #ffd23f; color: #1d1a26; font: bold 13px "Trebuchet MS", sans-serif; cursor: pointer; }',
  ].join('\n');
  document.head.appendChild(style);

  const boutonInviter = document.createElement('button');
  boutonInviter.id = 'btn-inviter';
  boutonInviter.textContent = '👥 Inviter';
  document.body.appendChild(boutonInviter);

  function majEtat(inv, texte, classe) {
    inv.etat = texte;
    const el = document.querySelector('#panneau .invite[data-n="' + inv.n + '"] .etat');
    if (el) { el.textContent = texte; el.className = 'etat ' + (classe || ''); }
  }

  /** Copie le texte d'une zone, même sur une page non sécurisée (http://). */
  function copier(zone, bouton) {
    zone.focus();
    zone.select();
    zone.setSelectionRange(0, zone.value.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    if (!ok && navigator.clipboard) { navigator.clipboard.writeText(zone.value).then(() => { ok = true; }).catch(() => {}); ok = true; }
    const ancien = bouton.textContent;
    bouton.textContent = ok ? 'Copié ✔' : 'Sélectionné : copie-le à la main';
    setTimeout(() => { bouton.textContent = ancien; }, 1800);
  }

  // ----- Écran de l'hôte -----
  function ligneInvitation(inv) {
    return '<div class="invite" data-n="' + inv.n + '">'
      + '<b>Invité ' + inv.n + '</b>'
      + '<p>1. Envoie ce code à ton ami :</p>'
      + '<textarea readonly class="code-offre">' + echapper(inv.code || 'préparation…') + '</textarea>'
      + '<button data-a="copier">Copier le code</button>'
      + '<p>2. Il te renvoie un code : colle-le ici :</p>'
      + '<textarea class="code-reponse" placeholder="Code de réponse"></textarea>'
      + '<button data-a="connecter">Connecter</button>'
      + '<span class="etat ' + (inv.joueur ? 'ok' : '') + '">' + echapper(inv.etat) + '</span>'
      + '</div>';
  }

  function afficherSalon() {
    const p = panneau();
    p.innerHTML = '<div class="boite">'
      + '<h1>SALON</h1>'
      + '<p class="aide-salon">Les appareils doivent être sur le <b>même Wi-Fi</b>. Pour chaque ami : '
      + '1) tu lui envoies un code, 2) il te renvoie sa réponse, 3) tu la colles ici. '
      + '<b>Garde cet onglet ouvert et visible</b> : c\'est lui qui fait tourner la partie.</p>'
      + '<div id="liste-invites">' + salon.invites.map(ligneInvitation).join('') + '</div>'
      + '<p><button data-a="ajouter">+ Inviter un joueur</button> '
      + '<button class="gros" data-a="fermer">Jouer</button></p>'
      + '</div>';
    p.style.display = 'flex';
  }

  async function ajouterLigne() {
    const liste = document.getElementById('liste-invites');
    const inv = await creerInvitation();
    if (liste) {
      liste.insertAdjacentHTML('beforeend', ligneInvitation(inv));
      liste.lastElementChild.scrollIntoView({ block: 'nearest' });
    }
  }

  // ----- Écran de l'invité -----
  function afficherInvite(options, etat) {
    const p = panneau();
    p.innerHTML = '<div class="boite">'
      + '<h1>REJOINDRE</h1>'
      + '<p class="aide-salon">Les appareils doivent être sur le <b>même Wi-Fi</b>.</p>'
      + '<div class="invite">'
      + '<p>1. Colle le code que l\'hôte t\'a envoyé :</p>'
      + '<textarea id="code-hote" placeholder="Code de l\'invitation"></textarea>'
      + '<button data-a="generer">Générer ma réponse</button>'
      + '<p>2. Envoie ce code à l\'hôte :</p>'
      + '<textarea readonly id="code-reponse"></textarea>'
      + '<button data-a="copier-reponse">Copier le code</button>'
      + '<span class="etat" id="etat-invite">' + echapper(etat || '') + '</span>'
      + '</div>'
      + '<p><button data-a="retour">Retour</button></p>'
      + '</div>';
    p.style.display = 'flex';
  }

  let essaiInvite = null;

  async function genererReponse(options) {
    const etat = document.getElementById('etat-invite');
    const montrer = (t, c) => { etat.textContent = t; etat.className = 'etat ' + (c || ''); };
    try {
      const offre = decoder(document.getElementById('code-hote').value, 'offer');
      if (essaiInvite) essaiInvite.close();
      const pc = new RTCPeerConnection(CONFIG_RTC);
      essaiInvite = pc;
      pc.ondatachannel = (e) => {
        const dc = e.channel;
        const sock = socketInvite(dc);
        const demarrer = () => {
          panneau().style.display = 'none';
          document.getElementById('touches').innerHTML = '<div>' + (NB.local.aideReseau || '') + '</div><div><kbd>Échap</kbd> retour au menu</div>';
          NB.client.demarrer({ local: false, perso: options.perso, socketFourni: () => sock, etiquette: 'salon' });
        };
        if (dc.readyState === 'open') demarrer(); else dc.addEventListener('open', demarrer);
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') montrer(MESSAGE_RESEAU, 'pb');
      };
      await pc.setRemoteDescription(offre);
      await pc.setLocalDescription(await pc.createAnswer());
      montrer('préparation du code…', '');
      await attendreAdresses(pc);
      document.getElementById('code-reponse').value = encoder(pc.localDescription);
      montrer('Envoie ce code à l\'hôte : la partie démarre dès qu\'il l\'a collé.', '');
    } catch (e) {
      montrer(e.message || String(e), 'pb');
    }
  }

  // ----- Clics -----
  let options = { perso: 'braise' };
  document.addEventListener('click', (e) => {
    const bouton = e.target.closest && e.target.closest('button[data-a]');
    if (!bouton || !panneau().contains(bouton)) return;
    const a = bouton.dataset.a;
    const ligne = bouton.closest('.invite');
    if (a === 'ajouter') {
      ajouterLigne();
    } else if (a === 'fermer') {
      panneau().style.display = 'none';
    } else if (a === 'copier') {
      copier(ligne.querySelector('.code-offre'), bouton);
    } else if (a === 'connecter') {
      const inv = salon.invites.find((i) => i.n === Number(ligne.dataset.n));
      if (inv) appliquerReponse(inv, ligne.querySelector('.code-reponse').value);
    } else if (a === 'generer') {
      genererReponse(options);
    } else if (a === 'copier-reponse') {
      copier(document.getElementById('code-reponse'), bouton);
    } else if (a === 'retour') {
      location.reload();
    }
  });
  boutonInviter.addEventListener('click', afficherSalon);

  // ===========================================================================
  // Points d'entrée, appelés par le menu
  // ===========================================================================
  NB.p2p = {
    /** « Héberger » : la partie tourne dans cette page, on invite des amis. */
    heberger(opts) {
      options = opts || options;
      if (!salon.actif) {
        salon.actif = true;
        salon.hote = creerJoueur();
        salon.hote.perso = options.perso;
        ajusterMannequin();
        lancerBoucle();
        document.getElementById('touches').innerHTML = '<div>' + (NB.local.aideReseau || '') + '</div><div><kbd>Échap</kbd> retour au menu</div>';
        NB.client.demarrer({ local: false, socketFourni: () => socketHote, etiquette: 'salon (hôte)', delai: 30 });
        versHote(JSON.stringify({ t: 'bienvenue', id: salon.hote.id }));
        boutonInviter.style.display = 'block';
      }
      afficherSalon();
      if (!salon.invites.length) ajouterLigne();
    },
    /** « Rejoindre » : on colle le code de l'hôte. */
    rejoindre(opts) {
      options = opts || options;
      afficherInvite(options);
    },
  };
})();
