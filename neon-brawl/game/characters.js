// =============================================================================
// characters.js — Les 3 personnages et la table des attaques.
// Fichier partagé serveur / navigateur (voir constants.js).
// =============================================================================
(function (racine) {
  // ---------------------------------------------------------------------------
  // Personnages
  // ---------------------------------------------------------------------------
  //   l, h        : largeur et hauteur du corps (zone où l'on peut être touché)
  //   taille      : échelle des attaques (portée)
  //   marche/course : vitesses au sol (px/tick)
  //   vitAir, accelAir : contrôle en l'air
  //   saut, doubleSaut : vitesse verticale au décollage
  //   gravite, chuteMax, chuteRapide : chute
  //   poids       : plus il est élevé, moins on est éjecté loin
  //   puissance   : multiplicateur de dégâts
  //   cadence     : multiplicateur de durée des attaques (< 1 = plus rapide)
  const PERSOS = {
    zip: {
      nom: 'Zip', description: 'Rapide et léger',
      l: 44, h: 66, taille: 1.1,
      marche: 3.4, course: 7.6, accelSol: 1.3,
      vitAir: 5.6, accelAir: 0.6,
      saut: 13.6, doubleSaut: 12.6,
      gravite: 0.62, chuteMax: 11, chuteRapide: 16.5,
      poids: 0.8, puissance: 0.85, cadence: 0.8,
    },
    nova: {
      nom: 'Nova', description: 'Équilibrée',
      l: 52, h: 78, taille: 1.3,
      marche: 2.9, course: 6.3, accelSol: 1.0,
      vitAir: 5.0, accelAir: 0.45,
      saut: 13.2, doubleSaut: 12.2,
      gravite: 0.6, chuteMax: 10.5, chuteRapide: 15.5,
      poids: 1.0, puissance: 1.0, cadence: 1,
    },
    brok: {
      nom: 'Brok', description: 'Lourd et puissant',
      l: 66, h: 90, taille: 1.55,
      marche: 2.3, course: 5.1, accelSol: 0.7,
      vitAir: 4.3, accelAir: 0.34,
      saut: 13.0, doubleSaut: 11.8,
      gravite: 0.7, chuteMax: 12, chuteRapide: 17.5,
      poids: 1.3, puissance: 1.25, cadence: 1.2,
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
    const attaque = ATTAQUES[joueur.atk];
    if (!attaque) return null;
    const perso = PERSOS[joueur.perso] || PERSOS.nova;
    const debut = Math.round(attaque.debut * perso.cadence);
    const fin = debut + Math.max(2, Math.round(attaque.actif * perso.cadence));
    const total = Math.max(fin + 2, Math.round(attaque.total * perso.cadence));
    return { attaque, perso, debut, fin, total };
  }

  const persos = { PERSOS, ATTAQUES, infosAttaque };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = persos;
  } else {
    racine.NB.persos = persos;
  }
})(typeof self !== 'undefined' ? self : this);
