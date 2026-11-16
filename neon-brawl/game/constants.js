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

    // --- Cartes ---
    // Chaque carte décrit :
    //   sols        : blocs pleins (on ne passe pas au travers). y = dessus,
    //                 bas = dessous. On peut s'accrocher à leurs bords.
    //   plateformes : traversables par le dessous ; BAS pour se laisser tomber.
    //   sortie      : zones d'éjection, au-delà on perd une vie.
    //   departs     : abscisses où les joueurs apparaissent (ils tombent du ciel).
    //   mannequin   : position du mannequin d'entraînement.
    //   decor       : nom du décor dessiné par le navigateur.
    // Le monde est vu par une caméra fixe : de x = -160 à 1440, de y = -50 à 850.
    CARTES: {
      prairie: {
        nom: 'Prairie', decor: 'prairie',
        sols: [{ x0: 240, x1: 1040, y: 520, bas: 640 }],
        plateformes: [
          { x0: 330, x1: 530, y: 400 },
          { x0: 750, x1: 950, y: 400 },
          { x0: 540, x1: 740, y: 285 },
        ],
        departs: [440, 840, 600, 680, 360, 920, 520, 760],
        mannequin: { x: 760, y: 520 },
      },
      volcan: {
        nom: 'Volcan', decor: 'volcan',
        sols: [
          { x0: 180, x1: 560, y: 540, bas: 680 },
          { x0: 720, x1: 1100, y: 540, bas: 680 },
        ],
        plateformes: [
          { x0: 540, x1: 740, y: 410 },
          { x0: 280, x1: 440, y: 300 },
          { x0: 840, x1: 1000, y: 300 },
        ],
        departs: [370, 910, 300, 980, 450, 830, 230, 1050],
        mannequin: { x: 860, y: 540 },
      },
      plage: {
        nom: 'Plage', decor: 'plage',
        sols: [{ x0: 300, x1: 980, y: 500, bas: 590 }],
        plateformes: [{ x0: 530, x1: 750, y: 370 }],
        departs: [450, 830, 600, 680, 380, 900, 520, 760],
        mannequin: { x: 760, y: 500 },
      },
      sommet: {
        nom: 'Sommet enneigé', decor: 'sommet',
        sols: [{ x0: 260, x1: 1020, y: 530, bas: 700 }],
        plateformes: [
          { x0: 300, x1: 480, y: 400 },
          { x0: 800, x1: 980, y: 400 },
        ],
        departs: [440, 840, 600, 680, 340, 940, 520, 760],
        mannequin: { x: 760, y: 530 },
      },
      ruines: {
        nom: 'Ruines célestes', decor: 'ruines',
        sols: [{ x0: 330, x1: 950, y: 540, bas: 620 }],
        plateformes: [
          { x0: 150, x1: 310, y: 440 },
          { x0: 970, x1: 1130, y: 440 },
          { x0: 540, x1: 740, y: 330 },
        ],
        departs: [470, 810, 230, 1050, 600, 680, 400, 880],
        mannequin: { x: 760, y: 540 },
      },
      ville: {
        nom: 'Toits de la ville', decor: 'ville',
        sols: [{ x0: 220, x1: 1060, y: 520, bas: 900 }],
        plateformes: [],
        departs: [440, 840, 600, 680, 330, 950, 520, 760],
        mannequin: { x: 760, y: 520 },
      },
    },
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

  // Carte en cours. Les modules de règles lisent toujours « C.carte » : changer
  // de carte se fait donc en un seul appel, côté serveur comme côté navigateur.
  constants.choisirCarte = function (id) {
    const carte = constants.CARTES[id] || constants.CARTES.prairie;
    carte.id = constants.CARTES[id] ? id : 'prairie';
    carte.sortie = constants.SORTIE;
    // Milieu de l'arène : entre le bord gauche du premier sol et le bord droit du dernier.
    carte.centre = (carte.sols[0].x0 + carte.sols[carte.sols.length - 1].x1) / 2;
    constants.carte = carte;
    return carte;
  };
  constants.choisirCarte('prairie');

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = constants;
  } else {
    racine.NB = racine.NB || {};
    racine.NB.constants = constants;
  }
})(typeof self !== 'undefined' ? self : this);
