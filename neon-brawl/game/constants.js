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

    // --- Écran (pixels « logiques », le canvas est mis à l'échelle) ---
    LARGEUR: 1280,
    HAUTEUR: 720,

    // --- Arène ---
    // Bloc principal : plein, on ne passe pas au travers. Il descend jusqu'en
    // bas de l'écran (une sorte de tour), ses côtés sont des murs.
    SOL_Y: 520,
    BLOC: { x0: 240, x1: 1040 },
    // Plateformes flottantes : on les traverse par le dessous, et on peut se
    // laisser tomber au travers avec BAS.
    PLATEFORMES: [
      { x0: 330, x1: 530, y: 400 },
      { x0: 750, x1: 950, y: 400 },
      { x0: 540, x1: 740, y: 285 },
    ],
    // Zones d'éjection : au-delà, on perd une vie.
    SORTIE: { gauche: -230, droite: 1510, haut: -220, bas: 900 },

    // --- Règles ---
    VIES: 3,
    BOUCLIER_MAX: 100,
    CHARGE_MAX: 60,       // nombre de ticks pour charger une attaque forte à fond
    ELAN_SAUT: 4,         // petit délai avant de décoller (permet HAUT + attaque)

    // --- Touches, codées sur un masque de bits pour un envoi compact ---
    TOUCHE: {
      GAUCHE: 1, DROITE: 2, HAUT: 4, BAS: 8,
      SAUT: 16, LEGER: 32, FORT: 64, BOUCLIER: 128, ESQUIVE: 256,
      ATTRAPE: 512, SPECIAL: 1024,
    },
    MASQUE_TOUCHES: 2047,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = constants;
  } else {
    racine.NB = racine.NB || {};
    racine.NB.constants = constants;
  }
})(typeof self !== 'undefined' ? self : this);
