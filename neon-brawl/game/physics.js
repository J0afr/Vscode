// =============================================================================
// physics.js — Simulation d'un joueur pour UN tick.
//
// Ce code est exécuté à l'identique :
//   - par le serveur (qui fait autorité),
//   - par le navigateur (prédiction du joueur local).
// Il doit donc rester déterministe : mêmes entrées => même résultat.
//
// Étape 1 : déplacement libre dans les 4 directions, sans gravité.
// (L'étape 2 remplacera ce contenu par la vraie physique de plateforme.)
// =============================================================================
(function (racine) {
  const C = (typeof module !== 'undefined' && module.exports)
    ? require('./constants')
    : racine.NB.constants;

  /**
   * Fait avancer un joueur d'un tick.
   * @param {{x:number, y:number}} joueur  position du centre du joueur (modifiée sur place)
   * @param {number} touches               masque de bits des touches enfoncées
   */
  function avancerJoueur(joueur, touches) {
    const T = C.TOUCHE;
    let dx = 0;
    let dy = 0;
    if (touches & T.GAUCHE) dx -= 1;
    if (touches & T.DROITE) dx += 1;
    if (touches & T.HAUT) dy -= 1;
    if (touches & T.BAS) dy += 1;

    joueur.x += dx * C.VITESSE;
    joueur.y += dy * C.VITESSE;

    // On reste dans l'arène.
    const demi = C.TAILLE_JOUEUR / 2;
    joueur.x = Math.max(demi, Math.min(C.LARGEUR - demi, joueur.x));
    joueur.y = Math.max(demi, Math.min(C.HAUTEUR - demi, joueur.y));
  }

  const physics = { avancerJoueur };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = physics;
  } else {
    racine.NB.physics = physics;
  }
})(typeof self !== 'undefined' ? self : this);
