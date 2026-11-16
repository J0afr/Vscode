// =============================================================================
// constants.js — Constantes partagées entre le serveur et le navigateur.
//
// Ce fichier est chargé de deux façons :
//   - côté serveur, par require('./constants')
//   - côté navigateur, il est injecté tel quel dans index.html par server.js
//     et range son contenu dans l'objet global NB (NB.constants).
// =============================================================================
(function (racine) {
  const constants = {
    // --- Boucle de jeu ---
    TICK_HZ: 60,          // la physique tourne à 60 pas par seconde
    ETAT_TOUS_LES: 2,     // le serveur envoie l'état 1 tick sur 2 (30 fois/s)

    // --- Arène (en pixels « logiques », le canvas est mis à l'échelle) ---
    LARGEUR: 1280,
    HAUTEUR: 720,

    // --- Joueur (étape 1 : un simple carré) ---
    TAILLE_JOUEUR: 48,
    VITESSE: 6,           // pixels par tick

    // --- Touches, codées sur un masque de bits pour un envoi compact ---
    TOUCHE: { GAUCHE: 1, DROITE: 2, HAUT: 4, BAS: 8 },
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = constants;
  } else {
    racine.NB = racine.NB || {};
    racine.NB.constants = constants;
  }
})(typeof self !== 'undefined' ? self : this);
