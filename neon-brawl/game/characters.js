// =============================================================================
// characters.js — Les personnages (6 de base, Sylve et 10 à débloquer) et la table des attaques.
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
    // Éléments des personnages à débloquer. « mod » : réglages lus par combat.js.
    nature:  { nom: 'Nature',  couleur: '#38c06a', effet: 'Sève : soigne un peu le lanceur à chaque coup', mod: { soin: 1.5 } },
    lumiere: { nom: 'Lumière', couleur: '#ffdca8', effet: 'Éclat : coups plus puissants, impact plus marqué', mod: { degatsPlus: 1.1, gelPlus: 4 } },
    ombre:   { nom: 'Ombre',   couleur: '#8a5cff', effet: 'Poison : la victime perd des points lentement', mod: { poison: 200 } },
    metal:   { nom: 'Métal',   couleur: '#aab7c9', effet: 'Acier : écrase les boucliers, repousse plus fort', mod: { bouclierDmg: 1.8, ejectionPlus: 1.08 } },
  };

  // ---------------------------------------------------------------------------
  // Petits constructeurs de capacités (pour garder les fiches de personnages courtes)
  // ---------------------------------------------------------------------------
  /** Un tir : crée un projectile (voir capacites.js). */
  function tir(nom, t, objet) {
    return { nom, debut: t.debut, actif: t.actif || 4, total: t.total, recharge: t.recharge, boites: [],
      geste: t.geste || [44, -36, 0], objet: Object.assign({ type: 'projectile' }, objet) };
  }
  /** Une zone ou un piège posé dans l'arène (voir capacites.js). */
  function piege(nom, t, objet) {
    return { nom, debut: t.debut, actif: t.actif || 4, total: t.total, recharge: t.recharge, boites: [],
      geste: t.geste || [34, -12, 0], objet: Object.assign({ type: 'zone' }, objet) };
  }
  /** Une attaque de corps à corps avec élan (ruée, plongeon, tourbillon…). */
  function ruee(nom, t) {
    return Object.assign({ nom, geste: [40, -34, 0] }, t);
  }

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

    // =========================================================================
    // SYLVE — le rôdeur : il change d'arme (capacité 2) et tire avec l'arme
    // équipée (capacité 1). Armes : arc, boomerang, pistolet, bombe, hache.
    // =========================================================================
    sylve: {
      nom: 'Sylve', element: 'nature', description: 'Rôdeur : change d\'arme (arc, boomerang, pistolet…)',
      l: 46, h: 72, taille: 1.15,
      marche: 3.0, course: 6.6, accelSol: 1.1,
      vitAir: 5.2, accelAir: 0.5,
      saut: 13.4, doubleSaut: 12.6, sautsAir: 1,
      gravite: 0.6, chuteMax: 10.5, chuteRapide: 15.5,
      poids: 1.0, puissance: 1.02, cadence: 0.92,
      // Capacité 1 : tire avec l'arme équipée (voir « armes »).
      spe1: {
        nom: 'Arme équipée', debut: 8, actif: 4, total: 34, recharge: 60, boites: [], geste: [44, -36, 0],
        armes: [
          { nom: 'Arc', debut: 10, actif: 3, total: 34, recharge: 40,
            objet: { type: 'projectile', style: 'fleche', vitesse: 17, r: 10, vie: 55, dy: -38,
              deg: 6.5, base: 3.5, ech: 0.07, angle: 22 } },
          { nom: 'Boomerang', debut: 8, actif: 3, total: 30, recharge: 75,
            objet: { type: 'projectile', style: 'boomerang', vitesse: 15, r: 18, vie: 260, dy: -38,
              boomerang: true, allee: 32, traverseSol: true, perce: true,
              deg: 5, base: 2.5, ech: 0.05, angle: 35 } },
          { nom: 'Pistolet', debut: 5, actif: 12, total: 34, recharge: 55,
            objet: { type: 'projectile', style: 'balle', rafale: 4, vitesse: 21, r: 8, vie: 34, dy: -38,
              deg: 2.4, base: 2, ech: 0.03, angle: 12, sansGel: true } },
          { nom: 'Bombe', debut: 12, actif: 3, total: 40, recharge: 120,
            objet: { type: 'projectile', style: 'bombe', vitesse: 7.5, vy: -5.5, g: 0.42, r: 14, vie: 80, dy: -40,
              explose: { style: 'explosion', r: 78, vie: 9, deg: 11, base: 5.5, ech: 0.12, angle: 60, deuxCotes: true } } },
          { nom: 'Hache de jet', debut: 14, actif: 3, total: 42, recharge: 90,
            objet: { type: 'projectile', style: 'hache', vitesse: 8.5, vy: -6, g: 0.38, r: 20, vie: 90, dy: -44,
              deg: 11, base: 5.2, ech: 0.13, angle: 48 } },
        ],
      },
      // Capacité 2 : passe à l'arme suivante (la touche bas + spécial).
      spe2: { nom: 'Changer d\'arme', debut: 3, actif: 2, total: 16, recharge: 18, boites: [], geste: [10, -60, 0], changerArme: true },
      // Capacité aérienne : tir plongeant, avec un recul qui le propulse vers le haut.
      spe3: {
        nom: 'Tir plongeant', debut: 7, actif: 4, total: 32, recharge: 90, boites: [], geste: [30, -20, 0],
        elan: { vy: -8.5 },
        objet: { type: 'projectile', style: 'fleche', vitesse: 8, vy: 10, r: 11, vie: 60, dy: -20,
          deg: 7, base: 4, ech: 0.08, angle: -55 },
      },
    },

    // =========================================================================
    // LES 10 PERSONNAGES À DÉBLOQUER (mode solo, voir progression.js)
    //   Normal     : Épine, Lumi, Boulon
    //   Difficile  : Brume, Orage, Yéti
    //   Impossible : Dragon, Spectre, Colosse, Aurore
    // =========================================================================
    epine: {
      nom: 'Épine', element: 'nature', description: 'Tank hérissé de piquants',
      l: 60, h: 80, taille: 1.4,
      marche: 2.4, course: 5.3, accelSol: 0.75, vitAir: 4.4, accelAir: 0.35,
      saut: 13.0, doubleSaut: 11.9, sautsAir: 1, gravite: 0.68, chuteMax: 11.5, chuteRapide: 17,
      poids: 1.25, puissance: 1.12, cadence: 1.15,
      spe1: tir('Épines', { debut: 9, actif: 14, total: 38, recharge: 90 },
        { style: 'epine', rafale: 5, vitesse: 13, r: 9, vie: 40, deg: 2.6, base: 2.4, ech: 0.04, angle: 25, sansGel: true }),
      spe2: piege('Ronces', { debut: 14, total: 40, recharge: 360, geste: [34, -12, 0] },
        { style: 'piege', auSol: true, dx: 80, l: 50, h: 34, vie: 480, delai: 28, declenche: true, unique: true,
          deg: 5, base: 0, ech: 0, angle: 0, fige: 60 }),
      spe3: ruee('Toupie', { debut: 5, actif: 22, total: 40, recharge: 90, elan: { vy: -6.5, tenir: true },
        boites: [[0, -40, 56]], deuxCotes: true, deg: 9, base: 5, ech: 0.09, angle: 75 }),
    },
    lumi: {
      nom: 'Lumi', element: 'lumiere', description: 'Légère et lumineuse, 2 sauts en l\'air',
      l: 44, h: 68, taille: 1.1,
      marche: 3.1, course: 6.9, accelSol: 1.1, vitAir: 5.7, accelAir: 0.6,
      saut: 13.0, doubleSaut: 12.4, sautsAir: 2, gravite: 0.52, chuteMax: 9.2, chuteRapide: 14.5,
      poids: 0.78, puissance: 0.88, cadence: 0.88,
      spe1: tir('Rayon', { debut: 8, total: 30, recharge: 70 },
        { style: 'rayon', vitesse: 20, r: 11, vie: 38, perce: true, deg: 4.5, base: 3, ech: 0.05, angle: 28 }),
      spe2: piege('Flash', { debut: 10, total: 36, recharge: 260, geste: [10, -50, 0] },
        { style: 'explosion', dx: 0, l: 105, h: 120, vie: 8, deg: 6.5, base: 6, ech: 0.1, angle: 80, deuxCotes: true }),
      spe3: ruee('Étoile filante', { debut: 4, actif: 14, total: 32, recharge: 85, suspend: true,
        elan: { vx: 15, vy: -3, tenir: true }, geste: [40, -34, 0],
        boites: [[28, -34, 34]], deg: 8, base: 4.5, ech: 0.09, angle: 40 }),
    },
    boulon: {
      nom: 'Boulon', element: 'metal', description: 'Robot lourd, missiles et mines',
      l: 56, h: 80, taille: 1.4,
      marche: 2.7, course: 5.8, accelSol: 0.9, vitAir: 4.8, accelAir: 0.4,
      saut: 13.0, doubleSaut: 11.9, sautsAir: 1, gravite: 0.68, chuteMax: 12, chuteRapide: 17.5,
      poids: 1.3, puissance: 1.22, cadence: 1.05,
      spe1: tir('Missile', { debut: 12, total: 40, recharge: 130 },
        { style: 'missile', vitesse: 10, r: 13, vie: 60,
          explose: { style: 'explosion', r: 56, vie: 8, deg: 7, base: 4.5, ech: 0.09, angle: 55, deuxCotes: true } }),
      spe2: piege('Mine magnétique', { debut: 12, total: 36, recharge: 330, geste: [20, -8, 0] },
        { style: 'piege', dx: 0, l: 34, h: 60, vie: 600, delai: 40, declenche: true, unique: true,
          deg: 10, base: 5.5, ech: 0.1, angle: 80, deuxCotes: true }),
      spe3: ruee('Marteau-fusée', { debut: 10, actif: 28, total: 46, recharge: 110, suspend: true,
        elan: { vx: 0, vy: 16, tenir: true }, geste: [0, 10, 0],
        boites: [[0, 2, 42]], deg: 13, base: 5, ech: 0.12, angle: -75 }),
    },
    brume: {
      nom: 'Brume', element: 'ombre', description: 'Ninja très rapide, poison et esquives',
      l: 40, h: 62, taille: 1.05,
      marche: 3.5, course: 7.9, accelSol: 1.35, vitAir: 5.8, accelAir: 0.62,
      saut: 13.8, doubleSaut: 12.8, sautsAir: 1, gravite: 0.6, chuteMax: 10.8, chuteRapide: 16.5,
      poids: 0.78, puissance: 0.85, cadence: 0.78, dash: { vitesse: 16, recharge: 30 },
      spe1: tir('Shuriken', { debut: 6, actif: 8, total: 28, recharge: 70 },
        { style: 'shuriken', rafale: 5, vitesse: 15, r: 12, vie: 48, deg: 4, base: 2.8, ech: 0.05, angle: 28 }),
      spe2: piege('Fumigène', { debut: 10, total: 34, recharge: 380, geste: [34, -12, 0] },
        { style: 'nuage', auSol: true, dx: 70, l: 85, h: 90, vie: 150, intervalle: 22, sansGel: true,
          deg: 1.6, base: 2.2, ech: 0, angle: 80 }),
      spe3: ruee('Pas fantôme', { debut: 3, actif: 12, total: 28, recharge: 80, suspend: true, invul: 14,
        elan: { vx: 17, vy: 0, tenir: true }, geste: [40, -34, 0],
        boites: [[26, -32, 30]], deg: 7, base: 4, ech: 0.08, angle: 35 }),
    },
    orage: {
      nom: 'Orage', element: 'foudre', description: 'Mage : boules d\'éclair et pluie d\'orage',
      l: 46, h: 76, taille: 1.2,
      marche: 2.8, course: 6.0, accelSol: 0.95, vitAir: 5.2, accelAir: 0.5,
      saut: 13.1, doubleSaut: 12.3, sautsAir: 1, gravite: 0.56, chuteMax: 10, chuteRapide: 15,
      poids: 0.92, puissance: 1.05, cadence: 1.05,
      spe1: tir('Boule d\'éclair', { debut: 12, total: 40, recharge: 110 },
        { style: 'orbe', vitesse: 6.5, r: 20, vie: 130, deg: 7, base: 4.5, ech: 0.1, angle: 35 }),
      spe2: piege('Pluie d\'orage', { debut: 14, total: 44, recharge: 300, geste: [30, -60, 0] },
        { style: 'colonne', auSol: true, dx: 150, l: 70, h: 260, vie: 70, intervalle: 12, sansGel: true,
          deg: 3, base: 3.5, ech: 0.02, angle: 82 }),
      spe3: ruee('Éclair-saut', { debut: 5, actif: 18, total: 36, recharge: 85, elan: { vy: -11.5 }, geste: [0, -80, 0],
        boites: [[0, -40, 54]], deuxCotes: true, deg: 7, base: 5, ech: 0.09, angle: 80 }),
    },
    yeti: {
      nom: 'Yéti', element: 'glace', description: 'Géant des neiges, avalanches',
      l: 68, h: 92, taille: 1.6,
      marche: 2.2, course: 4.9, accelSol: 0.55, vitAir: 4.1, accelAir: 0.32,
      saut: 12.8, doubleSaut: 11.5, sautsAir: 1, gravite: 0.72, chuteMax: 12.5, chuteRapide: 18,
      poids: 1.4, puissance: 1.2, cadence: 1.2,
      spe1: tir('Boule de neige', { debut: 14, total: 44, recharge: 130 },
        { style: 'boule', vitesse: 8, vy: -6, g: 0.4, r: 22, vie: 150, deg: 10, base: 5, ech: 0.12, angle: 40 }),
      spe2: piege('Avalanche', { debut: 18, total: 50, recharge: 300, geste: [20, -4, 0] },
        { style: 'onde', auSol: true, dx: 0, l: 200, h: 30, vie: 16, auSolSeulement: true, deuxCotes: true,
          deg: 9, base: 6, ech: 0.1, angle: 80 }),
      spe3: ruee('Chute glaciale', { debut: 12, actif: 30, total: 50, recharge: 110, suspend: true,
        elan: { vx: 0, vy: 17, tenir: true }, geste: [0, 10, 0],
        boites: [[0, 4, 46]], deg: 14, base: 5, ech: 0.13, angle: -75 }),
    },
    dragon: {
      nom: 'Dragon', element: 'feu', description: 'Souffle brûlant, vole presque',
      l: 62, h: 86, taille: 1.5,
      marche: 2.9, course: 6.2, accelSol: 1.0, vitAir: 5.0, accelAir: 0.45,
      saut: 13.4, doubleSaut: 12.6, sautsAir: 2, gravite: 0.62, chuteMax: 11, chuteRapide: 16.5,
      poids: 1.2, puissance: 1.2, cadence: 1.0,
      spe1: tir('Souffle', { debut: 8, actif: 26, total: 50, recharge: 120 },
        { style: 'flamme', rafale: 3, vitesse: 11, r: 17, vie: 22, perce: true, deg: 1.8, base: 1.5, ech: 0, angle: 18, sansGel: true }),
      spe2: piege('Pilier de feu', { debut: 14, total: 44, recharge: 280, geste: [30, -60, 0] },
        { style: 'colonne', auSol: true, dx: 100, l: 36, h: 280, vie: 30, delai: 24,
          deg: 9, base: 7, ech: 0.1, angle: 88 }),
      spe3: ruee('Piqué', { debut: 10, actif: 26, total: 46, recharge: 100, suspend: true,
        elan: { vx: 10, vy: 14, tenir: true }, geste: [22, 0, 0],
        boites: [[22, 0, 42]], deg: 13, base: 5, ech: 0.12, angle: -60 }),
    },
    spectre: {
      nom: 'Spectre', element: 'ombre', description: 'Fantôme flottant, cages d\'ombre',
      l: 48, h: 74, taille: 1.2,
      marche: 2.7, course: 5.9, accelSol: 0.9, vitAir: 5.4, accelAir: 0.55,
      saut: 12.8, doubleSaut: 12.2, sautsAir: 2, gravite: 0.46, chuteMax: 8.5, chuteRapide: 14,
      poids: 0.82, puissance: 1.0, cadence: 1.0,
      spe1: tir('Orbe sombre', { debut: 13, total: 42, recharge: 120 },
        { style: 'orbe', vitesse: 5.5, r: 24, vie: 150, perce: true, deg: 6, base: 3.5, ech: 0.07, angle: 40 }),
      spe2: piege('Cage d\'ombre', { debut: 14, total: 40, recharge: 360, geste: [34, -12, 0] },
        { style: 'piege', auSol: true, dx: 70, l: 55, h: 80, vie: 420, delai: 22, declenche: true, unique: true,
          deg: 6, base: 0, ech: 0, angle: 0, fige: 85 }),
      spe3: ruee('Dématérialisation', { debut: 4, actif: 16, total: 34, recharge: 75, suspend: true, invul: 20,
        elan: { vx: 15, vy: -2, tenir: true }, geste: [40, -34, 0],
        boites: [[28, -36, 34]], deg: 8, base: 4.5, ech: 0.09, angle: 45 }),
    },
    colosse: {
      nom: 'Colosse', element: 'terre', description: 'Titan de pierre, écrase tout',
      l: 74, h: 98, taille: 1.7,
      marche: 2.0, course: 4.6, accelSol: 0.5, vitAir: 3.9, accelAir: 0.3,
      saut: 12.6, doubleSaut: 11.2, sautsAir: 1, gravite: 0.78, chuteMax: 13, chuteRapide: 19,
      poids: 1.55, puissance: 1.3, cadence: 1.25,
      spe1: tir('Lancer de roc', { debut: 18, total: 52, recharge: 140 },
        { style: 'rocher', vitesse: 8, vy: -6, g: 0.42, r: 28, vie: 160, deg: 14, base: 5.5, ech: 0.14, angle: 42 }),
      spe2: piege('Séisme majeur', { debut: 20, total: 56, recharge: 320, geste: [20, -4, 0] },
        { style: 'seisme', auSol: true, dx: 0, l: 260, h: 28, vie: 18, auSolSeulement: true, deuxCotes: true,
          deg: 12, base: 7, ech: 0.12, angle: 80 }),
      spe3: ruee('Saut écrasant', { debut: 14, actif: 32, total: 54, recharge: 120, suspend: true,
        elan: { vx: 0, vy: 18, tenir: true }, geste: [0, 10, 0],
        boites: [[0, 4, 50]], deg: 16, base: 5.5, ech: 0.14, angle: -75 }),
    },
    aurore: {
      nom: 'Aurore', element: 'lumiere', description: 'Reine de lumière, redoutable partout',
      l: 54, h: 82, taille: 1.3,
      marche: 3.1, course: 6.8, accelSol: 1.1, vitAir: 5.4, accelAir: 0.55,
      saut: 13.6, doubleSaut: 12.8, sautsAir: 2, gravite: 0.58, chuteMax: 10.5, chuteRapide: 16,
      poids: 1.1, puissance: 1.12, cadence: 0.95,
      spe1: tir('Lance de lumière', { debut: 8, total: 30, recharge: 60 },
        { style: 'rayon', vitesse: 24, r: 13, vie: 40, perce: true, deg: 7, base: 4, ech: 0.09, angle: 30 }),
      spe2: piege('Colonne céleste', { debut: 12, total: 44, recharge: 240, geste: [30, -60, 0] },
        { style: 'colonne', auSol: true, dx: 120, l: 60, h: 300, vie: 24, delai: 20,
          deg: 11, base: 7, ech: 0.13, angle: 88 }),
      spe3: ruee('Ascension', { debut: 4, actif: 20, total: 38, recharge: 80, elan: { vy: -12.5 }, geste: [0, -80, 0],
        boites: [[0, -40, 60]], deuxCotes: true, deg: 9, base: 5.5, ech: 0.1, angle: 85 }),
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
  const CACHE_ARMES = {};
  function infosAttaque(joueur) {
    const perso = PERSOS[joueur.perso] || PERSOS.ondine;
    // « spe1 », « spe2 » et « spe3 » sont les capacités propres au personnage.
    const special = joueur.atk === 'spe1' || joueur.atk === 'spe2' || joueur.atk === 'spe3';
    let attaque = special ? perso[joueur.atk] : ATTAQUES[joueur.atk];
    if (!attaque) return null;
    // Capacité à armes (Sylve) : les durées, la portée et le projectile sont ceux de l'arme équipée.
    if (attaque.armes) {
      const n = attaque.armes.length;
      const arme = (joueur.arme | 0) % n;
      const cle = joueur.perso + ':' + joueur.atk + ':' + arme;
      attaque = CACHE_ARMES[cle] || (CACHE_ARMES[cle] = Object.assign({}, attaque, attaque.armes[arme]));
    }
    const debut = Math.round(attaque.debut * perso.cadence);
    const fin = debut + Math.max(2, Math.round(attaque.actif * perso.cadence));
    const total = Math.max(fin + 2, Math.round(attaque.total * perso.cadence));
    return { attaque, perso, debut, fin, total };
  }

  // Personnages disponibles dès le départ ; les autres se débloquent en solo.
  const BASE = ['braise', 'ondine', 'brok', 'zephyr', 'zip', 'givre', 'sylve'];

  const persos = { ELEMENTS, PERSOS, ATTAQUES, BASE, infosAttaque };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = persos;
  } else {
    racine.NB.persos = persos;
  }
})(typeof self !== 'undefined' ? self : this);
