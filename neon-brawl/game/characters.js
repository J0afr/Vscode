// =============================================================================
// characters.js — Les 6 personnages (un par élément) et la table des attaques.
// Fichier partagé serveur / navigateur (voir constants.js).
// =============================================================================
(function (racine) {
  // ---------------------------------------------------------------------------
  // Éléments
  // ---------------------------------------------------------------------------
  // Chaque personnage appartient à un élément, qui lui donne sa couleur et un
  // effet particulier quand ses coups touchent (appliqué dans combat.js).
  const ELEMENTS = {
    feu:    { nom: 'Feu',    couleur: '#ff6a2b', effet: 'Brûlure : la victime continue de prendre des dégâts' },
    eau:    { nom: 'Eau',    couleur: '#4d8dff', effet: 'Vague : repousse plus fort, même à 0 %' },
    terre:  { nom: 'Terre',  couleur: '#9be04a', effet: 'Séisme : brise les boucliers très vite' },
    air:    { nom: 'Air',    couleur: '#7dffd0', effet: 'Bourrasque : envoie plus haut, et 2 sauts en l\'air' },
    foudre: { nom: 'Foudre', couleur: '#ffe14a', effet: 'Paralysie : fige la victime plus longtemps' },
    glace:  { nom: 'Glace',  couleur: '#c4f1ff', effet: 'Gel : la victime reste sonnée plus longtemps' },
  };

  // ---------------------------------------------------------------------------
  // Personnages
  // ---------------------------------------------------------------------------
  //   element     : clé dans ELEMENTS
  //   l, h        : largeur et hauteur du corps (zone où l'on peut être touché)
  //   taille      : échelle des attaques (portée)
  //   marche/course : vitesses au sol (px/tick)
  //   vitAir, accelAir : contrôle en l'air
  //   saut, doubleSaut : vitesse verticale au décollage
  //   sautsAir    : nombre de sauts possibles en l'air
  //   gravite, chuteMax, chuteRapide : chute
  //   poids       : plus il est élevé, moins on est éjecté loin
  //   puissance   : multiplicateur de dégâts
  //   cadence     : multiplicateur de durée des attaques (< 1 = plus rapide)
  const PERSOS = {
    braise: {
      nom: 'Braise', element: 'feu', description: 'Agressive, frappe fort',
      l: 50, h: 76, taille: 1.25,
      marche: 3.0, course: 6.6, accelSol: 1.0,
      vitAir: 5.1, accelAir: 0.48,
      saut: 13.2, doubleSaut: 12.2, sautsAir: 1,
      gravite: 0.62, chuteMax: 11, chuteRapide: 16,
      poids: 0.95, puissance: 1.1, cadence: 0.95,
      // Capacités : SPÉCIAL seul, et BAS + SPÉCIAL.
      spe1: {
        nom: 'Lance-flammes', debut: 8, actif: 24, total: 46, recharge: 100, boites: [], geste: [44, -36, 0],
        objet: { type: 'projectile', style: 'flamme', rafale: 3, vitesse: 9, r: 13, vie: 15,
          deg: 1.2, base: 1.2, ech: 0, angle: 20, sansGel: true },
      },
      spe2: {
        nom: 'Brasier', debut: 12, actif: 4, total: 36, recharge: 420, boites: [], geste: [34, -12, 0],
        objet: { type: 'zone', style: 'brasier', auSol: true, dx: 90, l: 60, h: 50, vie: 260, intervalle: 24,
          deg: 2.2, base: 2.5, ech: 0, angle: 80, sansGel: true },
      },
      // Capacité aérienne : SPÉCIAL en l'air (ou HAUT + SPÉCIAL).
      spe3: {
        nom: 'Envol ardent', debut: 10, actif: 20, total: 40, recharge: 80, suspend: true,
        elan: { vx: 7, vy: -11, tenir: true }, geste: [30, -70, 0],
        boites: [[0, -40, 40]], deg: 10, base: 5, ech: 0.1, angle: 50,
      },
    },
    ondine: {
      nom: 'Ondine', element: 'eau', description: 'Équilibrée, bon retour sur l\'arène',
      l: 52, h: 78, taille: 1.3,
      marche: 2.9, course: 6.2, accelSol: 1.0,
      vitAir: 5.2, accelAir: 0.5,
      saut: 13.4, doubleSaut: 12.8, sautsAir: 1,
      gravite: 0.56, chuteMax: 10, chuteRapide: 15,
      poids: 1.0, puissance: 1.0, cadence: 1,
      spe1: {
        nom: 'Bulle', debut: 12, actif: 4, total: 38, recharge: 110, boites: [], geste: [44, -36, 0],
        objet: { type: 'projectile', style: 'bulle', vitesse: 4.5, r: 22, vie: 120,
          deg: 7, base: 5.5, ech: 0.05, angle: 28 },
      },
      spe2: {
        nom: 'Geyser', debut: 14, actif: 4, total: 44, recharge: 300, boites: [], geste: [30, -70, 0],
        objet: { type: 'zone', style: 'geyser', auSol: true, dx: 110, l: 30, h: 230, vie: 26,
          deg: 9, base: 7, ech: 0.1, angle: 88 },
      },
      spe3: {
        nom: 'Tourbillon d\'eau', debut: 6, actif: 14, total: 34, recharge: 80,
        elan: { vy: -10 }, geste: [0, -80, 0],
        boites: [[0, -40, 58]], deuxCotes: true, deg: 9, base: 5.5, ech: 0.09, angle: 75,
      },
    },
    brok: {
      nom: 'Brok', element: 'terre', description: 'Lourd et puissant',
      l: 66, h: 90, taille: 1.55,
      marche: 2.3, course: 5.1, accelSol: 0.7,
      vitAir: 4.3, accelAir: 0.34,
      saut: 13.0, doubleSaut: 11.8, sautsAir: 1,
      gravite: 0.7, chuteMax: 12, chuteRapide: 17.5,
      poids: 1.3, puissance: 1.25, cadence: 1.2,
      spe1: {
        nom: 'Rocher', debut: 16, actif: 4, total: 48, recharge: 150, boites: [], geste: [40, -60, 0],
        objet: { type: 'projectile', style: 'rocher', vitesse: 7.5, vy: -5, g: 0.4, r: 24, vie: 160, dy: -40,
          deg: 12, base: 5, ech: 0.12, angle: 45 },
      },
      spe2: {
        nom: 'Séisme', debut: 18, actif: 4, total: 52, recharge: 300, boites: [], geste: [20, -4, 0],
        objet: { type: 'zone', style: 'seisme', auSol: true, dx: 0, l: 190, h: 24, vie: 14,
          deg: 10, base: 6.5, ech: 0.1, angle: 80, deuxCotes: true, auSolSeulement: true },
      },
      spe3: {
        nom: 'Météore', debut: 12, actif: 30, total: 50, recharge: 110, suspend: true,
        elan: { vx: 0, vy: 17, tenir: true }, geste: [0, 10, 0],
        boites: [[0, 0, 40]], deg: 14, base: 5, ech: 0.12, angle: -75,
      },
    },
    zephyr: {
      nom: 'Zéphyr', element: 'air', description: 'Très léger, plane et saute 3 fois',
      l: 46, h: 70, taille: 1.15,
      marche: 3.1, course: 6.8, accelSol: 1.1,
      vitAir: 5.8, accelAir: 0.62,
      saut: 13.0, doubleSaut: 12.0, sautsAir: 2,
      gravite: 0.5, chuteMax: 9, chuteRapide: 14.5,
      poids: 0.75, puissance: 0.85, cadence: 0.9,
      spe1: {
        nom: 'Lame de vent', debut: 9, actif: 4, total: 32, recharge: 80, boites: [], geste: [44, -36, 0],
        objet: { type: 'projectile', style: 'lame', vitesse: 13, r: 18, vie: 42,
          deg: 5, base: 3.5, ech: 0.06, angle: 25, perce: true },
      },
      spe2: {
        // La tornade propulse Zéphyr vers le haut : pratique pour revenir sur l'arène.
        nom: 'Tornade', debut: 5, actif: 6, total: 30, recharge: 200, boites: [], geste: [0, -80, 0],
        elan: { vy: -15.5 },
        objet: { type: 'zone', style: 'tornade', dx: 0, l: 46, h: 150, vie: 50, intervalle: 9,
          deg: 2, base: 3.5, ech: 0, angle: 85, sansGel: true },
      },
      spe3: {
        nom: 'Cyclone', debut: 4, actif: 30, total: 44, recharge: 90,
        elan: { vy: -8.5, tenir: true }, geste: [0, -80, 0],
        boites: [[0, -36, 50]], deuxCotes: true, deg: 8, base: 5, ech: 0.08, angle: 85,
      },
    },
    zip: {
      nom: 'Zip', element: 'foudre', description: 'Le plus rapide, léger',
      l: 44, h: 66, taille: 1.1,
      marche: 3.4, course: 7.6, accelSol: 1.3,
      vitAir: 5.6, accelAir: 0.6,
      saut: 13.6, doubleSaut: 12.6, sautsAir: 1,
      gravite: 0.62, chuteMax: 11, chuteRapide: 16.5,
      poids: 0.8, puissance: 0.85, cadence: 0.8,
      spe1: {
        nom: 'Éclair', debut: 6, actif: 3, total: 26, recharge: 70, boites: [], geste: [44, -36, 0],
        objet: { type: 'projectile', style: 'eclair', vitesse: 22, r: 13, vie: 20,
          deg: 4, base: 2.5, ech: 0.03, angle: 30 },
      },
      spe2: {
        nom: 'Mine électrique', debut: 10, actif: 4, total: 34, recharge: 360, boites: [], geste: [20, -8, 0],
        objet: { type: 'zone', style: 'mine', dx: 0, l: 34, h: 60, vie: 600, delai: 40,
          declenche: true, unique: true, deg: 9, base: 5.5, ech: 0.1, angle: 80, deuxCotes: true },
      },
      spe3: {
        nom: 'Charge foudroyante', debut: 6, actif: 16, total: 34, recharge: 80, suspend: true,
        elan: { vx: 16, vy: -1.5, tenir: true }, geste: [40, -34, 0],
        boites: [[30, -34, 32]], deg: 9, base: 4.5, ech: 0.1, angle: 35,
      },
    },
    givre: {
      nom: 'Givre', element: 'glace', description: 'Solide, glisse un peu, coups lents',
      l: 58, h: 84, taille: 1.42,
      marche: 2.6, course: 5.7, accelSol: 0.45,
      vitAir: 4.6, accelAir: 0.4,
      saut: 13.0, doubleSaut: 12.0, sautsAir: 1,
      gravite: 0.66, chuteMax: 11.5, chuteRapide: 17,
      poids: 1.15, puissance: 1.1, cadence: 1.1,
      spe1: {
        nom: 'Éclat de glace', debut: 11, actif: 4, total: 36, recharge: 100, boites: [], geste: [44, -36, 0],
        objet: { type: 'projectile', style: 'glacon', vitesse: 8.5, r: 16, vie: 75,
          deg: 6, base: 3, ech: 0.05, angle: 35 },
      },
      spe2: {
        // Piège posé au sol : l'adversaire qui marche dessus est gelé sur place.
        nom: 'Piège de givre', debut: 14, actif: 4, total: 40, recharge: 420, boites: [], geste: [34, -12, 0],
        objet: { type: 'zone', style: 'givre', auSol: true, dx: 80, l: 55, h: 30, vie: 480, delai: 30,
          declenche: true, unique: true, deg: 5, base: 0, ech: 0, angle: 0, fige: 75 },
      },
      spe3: {
        nom: 'Pluie de glace', debut: 8, actif: 16, total: 36, recharge: 100,
        elan: { vy: -7 }, geste: [20, 10, 0], boites: [],
        objet: { type: 'projectile', style: 'glacon', rafale: 5, vitesse: 2, vy: 10, g: 0.25, r: 15, vie: 60,
          dx: 10, dy: 0, deg: 6, base: 3.5, ech: 0.07, angle: -60 },
      },
    },
  };

  // ---------------------------------------------------------------------------
  // Attaques
  // ---------------------------------------------------------------------------
  //   debut  : ticks de préparation avant que le coup ne touche
  //   actif  : ticks pendant lesquels le coup touche
  //   total  : durée complète de l'attaque
  //   deg    : dégâts (en %)
  //   base   : éjection de base
  //   ech    : éjection ajoutée par % de dégâts de la victime
  //   angle  : direction d'éjection en degrés (0 = à l'horizontale devant,
  //            90 = vers le haut, négatif = vers le bas)
  //   boites : zones de frappe [décalage x, décalage y, rayon], relatives aux
  //            pieds de l'attaquant, x positif = devant lui
  //   deuxCotes : la victime est éjectée du côté où elle se trouve
  const ATTAQUES = {
    // --- Attaques légères au sol ---
    jab:        { debut: 3,  actif: 3,  total: 14, deg: 3,  base: 3,   ech: 0.02, angle: 55,  boites: [[38, -32, 20]] },
    leger_cote: { debut: 6,  actif: 4,  total: 24, deg: 7,  base: 4,   ech: 0.07, angle: 40,  boites: [[46, -30, 24]] },
    leger_haut: { debut: 5,  actif: 5,  total: 24, deg: 6,  base: 4.5, ech: 0.07, angle: 90,  boites: [[8, -78, 26]] },
    leger_bas:  { debut: 4,  actif: 3,  total: 20, deg: 5,  base: 3.5, ech: 0.05, angle: 75,  boites: [[42, -10, 20]] },
    // --- Attrape : courte portée, mais passe à travers le bouclier ---
    attrape:    { debut: 6,  actif: 3,  total: 34, deg: 8,  base: 6,   ech: 0.06, angle: 45,  boites: [[36, -34, 20]], attrape: true },
    // --- Attaques fortes au sol (chargeables) ---
    fort_cote:  { debut: 14, actif: 4,  total: 44, deg: 14, base: 5,   ech: 0.16, angle: 38,  boites: [[54, -32, 30]] },
    fort_haut:  { debut: 11, actif: 5,  total: 42, deg: 13, base: 5,   ech: 0.15, angle: 88,  boites: [[4, -88, 32]] },
    fort_bas:   { debut: 9,  actif: 4,  total: 40, deg: 12, base: 5,   ech: 0.13, angle: 28,  boites: [[44, -10, 24], [-44, -10, 24]], deuxCotes: true },
    // --- Attaques aériennes ---
    air_neutre: { debut: 4,  actif: 10, total: 28, deg: 6,  base: 3.5, ech: 0.07, angle: 50,  boites: [[0, -30, 40]], deuxCotes: true },
    air_cote:   { debut: 7,  actif: 4,  total: 30, deg: 9,  base: 4,   ech: 0.11, angle: 40,  boites: [[46, -32, 26]] },
    air_haut:   { debut: 5,  actif: 5,  total: 26, deg: 8,  base: 4,   ech: 0.10, angle: 85,  boites: [[4, -78, 28]] },
    air_bas:    { debut: 12, actif: 5,  total: 36, deg: 11, base: 4,   ech: 0.11, angle: -80, boites: [[4, 8, 26]] },
  };

  /**
   * Durées de l'attaque en cours d'un joueur, adaptées à la cadence de son
   * personnage. Le coup touche quand  debut < joueur.t <= fin.
   */
  function infosAttaque(joueur) {
    const perso = PERSOS[joueur.perso] || PERSOS.ondine;
    // « spe1 », « spe2 » et « spe3 » sont les capacités propres au personnage.
    const special = joueur.atk === 'spe1' || joueur.atk === 'spe2' || joueur.atk === 'spe3';
    const attaque = special ? perso[joueur.atk] : ATTAQUES[joueur.atk];
    if (!attaque) return null;
    const debut = Math.round(attaque.debut * perso.cadence);
    const fin = debut + Math.max(2, Math.round(attaque.actif * perso.cadence));
    const total = Math.max(fin + 2, Math.round(attaque.total * perso.cadence));
    return { attaque, perso, debut, fin, total };
  }

  const persos = { ELEMENTS, PERSOS, ATTAQUES, infosAttaque };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = persos;
  } else {
    racine.NB.persos = persos;
  }
})(typeof self !== 'undefined' ? self : this);
