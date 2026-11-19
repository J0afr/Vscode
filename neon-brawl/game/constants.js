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
    //   departs     : abscisses où les joueurs apparaissent (ils tombent du ciel).
    //   mannequin   : position du mannequin d'entraînement.
    //   vue         : rectangle que la caméra ne dépasse jamais.
    //   sortie      : zones d'éjection : au-delà, on perd une vie.
    //   decor       : nom du décor dessiné par le navigateur.
    // La caméra suit les joueurs et dézoome quand ils s'éloignent.
    CARTES: {
      prairie: {
        nom: 'Prairie', decor: 'prairie',
        sols: [{ x0: 0, x1: 1600, y: 600, bas: 740 }],
        plateformes: [
          { x0: 170, x1: 450, y: 470 },
          { x0: 1150, x1: 1430, y: 470 },
          { x0: 600, x1: 1000, y: 360 },
          { x0: 280, x1: 540, y: 230 },
          { x0: 1060, x1: 1320, y: 230 },
        ],
        departs: [400, 1200, 800, 600, 1000, 250, 1350, 700],
        mannequin: { x: 1000, y: 600 },
        vue: { x0: -700, x1: 2300, y0: -600, y1: 1250 },
        sortie: { gauche: -950, droite: 2550, haut: -850, bas: 1500 },
      },
      volcan: {
        nom: 'Volcan', decor: 'volcan',
        sols: [
          { x0: -150, x1: 450, y: 620, bas: 760 },
          { x0: 680, x1: 1120, y: 560, bas: 700 },
          { x0: 1350, x1: 1950, y: 620, bas: 760 },
        ],
        plateformes: [
          { x0: 400, x1: 720, y: 470 },
          { x0: 1080, x1: 1400, y: 470 },
          { x0: 750, x1: 1050, y: 330 },
          { x0: 0, x1: 260, y: 400 },
          { x0: 1540, x1: 1800, y: 400 },
        ],
        departs: [200, 1600, 900, 50, 1750, 560, 1240, 900],
        mannequin: { x: 1000, y: 560 },
        vue: { x0: -850, x1: 2650, y0: -650, y1: 1300 },
        sortie: { gauche: -1100, droite: 2900, haut: -900, bas: 1550 },
      },
      plage: {
        nom: 'Plage', decor: 'plage',
        sols: [
          { x0: 0, x1: 1500, y: 580, bas: 680 },
          { x0: 1720, x1: 2080, y: 640, bas: 710 },
        ],
        plateformes: [
          { x0: 420, x1: 700, y: 450 },
          { x0: 820, x1: 1100, y: 450 },
          { x0: 620, x1: 900, y: 320 },
          { x0: 1460, x1: 1760, y: 500 },
        ],
        departs: [350, 1150, 750, 1900, 550, 950, 200, 1300],
        mannequin: { x: 1000, y: 580 },
        vue: { x0: -700, x1: 2750, y0: -600, y1: 1250 },
        sortie: { gauche: -950, droite: 3000, haut: -850, bas: 1500 },
      },
      sommet: {
        nom: 'Sommet enneigé', decor: 'sommet',
        sols: [{ x0: 0, x1: 1900, y: 620, bas: 900 }],
        plateformes: [
          { x0: 180, x1: 440, y: 490 },
          { x0: 1460, x1: 1720, y: 490 },
          { x0: 560, x1: 880, y: 380 },
          { x0: 1020, x1: 1340, y: 380 },
          { x0: 800, x1: 1100, y: 250 },
        ],
        departs: [450, 1450, 950, 250, 1650, 700, 1200, 950],
        mannequin: { x: 1150, y: 620 },
        vue: { x0: -750, x1: 2650, y0: -650, y1: 1300 },
        sortie: { gauche: -1000, droite: 2900, haut: -900, bas: 1550 },
      },
      ruines: {
        nom: 'Ruines célestes', decor: 'ruines',
        sols: [
          { x0: -300, x1: 60, y: 520, bas: 600 },
          { x0: 300, x1: 1300, y: 620, bas: 720 },
          { x0: 1540, x1: 1900, y: 520, bas: 600 },
        ],
        plateformes: [
          { x0: 60, x1: 300, y: 600 },
          { x0: 1300, x1: 1540, y: 600 },
          { x0: 450, x1: 720, y: 480 },
          { x0: 880, x1: 1150, y: 480 },
          { x0: 660, x1: 940, y: 340 },
        ],
        departs: [550, 1050, 800, -120, 1720, 400, 1200, 800],
        mannequin: { x: 1000, y: 620 },
        vue: { x0: -1000, x1: 2600, y0: -650, y1: 1250 },
        sortie: { gauche: -1250, droite: 2850, haut: -900, bas: 1500 },
      },
      ville: {
        nom: 'Toits de la ville', decor: 'ville',
        sols: [
          { x0: -250, x1: 450, y: 600, bas: 1500 },
          { x0: 650, x1: 1150, y: 520, bas: 1500 },
          { x0: 1350, x1: 2000, y: 620, bas: 1500 },
        ],
        plateformes: [
          { x0: 380, x1: 720, y: 430 },
          { x0: 1080, x1: 1420, y: 440 },
        ],
        departs: [100, 1650, 900, -100, 1850, 300, 1450, 900],
        mannequin: { x: 1000, y: 520 },
        vue: { x0: -950, x1: 2700, y0: -650, y1: 1300 },
        sortie: { gauche: -1200, droite: 2950, haut: -900, bas: 1550 },
      },
    },
    SORTIE: { gauche: -230, droite: 1510, haut: -220, bas: 900 }, // valeur par défaut

    // --- Règles ---
    VIES: 3,
    BOUCLIER_MAX: 100,
    CHARGE_MAX: 60,       // nombre de ticks pour charger une attaque forte à fond
    ELAN_SAUT: 4,         // petit délai avant de décoller (permet HAUT + attaque)

    // --- Touches, codées sur un masque de bits pour un envoi compact ---
    TOUCHE: {
      GAUCHE: 1, DROITE: 2, HAUT: 4, BAS: 8,
      SAUT: 16, LEGER: 32, FORT: 64, BOUCLIER: 128, ESQUIVE: 256,
      ATTRAPE: 512, SPECIAL: 1024, DASH: 2048,
    },
    MASQUE_TOUCHES: 4095,
  };

  // Carte en cours. Les modules de règles lisent toujours « C.carte » : changer
  // de carte se fait donc en un seul appel, côté serveur comme côté navigateur.
  constants.choisirCarte = function (id) {
    const carte = constants.CARTES[id] || constants.CARTES.prairie;
    carte.id = constants.CARTES[id] ? id : 'prairie';
    carte.sortie = carte.sortie || constants.SORTIE;
    // Hauteur d'où l'on retombe après une éjection : bien au-dessus des sols.
    carte.yApparition = Math.min(...carte.sols.map((s) => s.y)) - 420;
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
