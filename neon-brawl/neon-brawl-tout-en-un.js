// =============================================================================
// NEON BRAWL — version « tout en un »
//
// Ce fichier contient TOUT le jeu : le serveur, les règles et la page web.
// Il est fabriqué automatiquement par outils/assembler.js.
//
// Pour jouer :
//   1. Installer Node.js (version 18 ou plus)
//   2. Dans le dossier de ce fichier :   npm install express ws
//   3. Lancer :                          node neon-brawl-tout-en-un.js
//   4. Ouvrir l'adresse affichée dans la console (http://<IP>:3000)
//
// Sommaire :
//   PARTIE 1 — Règles du jeu (constantes, personnages, physique, combat)
//   PARTIE 2 — Page web envoyée aux navigateurs (HTML + CSS + JavaScript)
//   PARTIE 3 — Serveur
//   PARTIE 4 — Démarrage
// =============================================================================
'use strict';

// #############################################################################
// PARTIE 1 — RÈGLES DU JEU
// Chaque bloc ci-dessous est un « module ». Les trois premiers sont aussi
// envoyés au navigateur, pour qu'il prédise les mouvements avec le même code.
// #############################################################################
const MODULES = {};

// -----------------------------------------------------------------------------
// Module « constants »  (fichier d'origine : game/constants.js)
// -----------------------------------------------------------------------------
MODULES['constants'] = function (module, exports, require) {
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
};

// -----------------------------------------------------------------------------
// Module « characters »  (fichier d'origine : game/characters.js)
// -----------------------------------------------------------------------------
MODULES['characters'] = function (module, exports, require) {
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
};

// -----------------------------------------------------------------------------
// Module « physics »  (fichier d'origine : game/physics.js)
// -----------------------------------------------------------------------------
MODULES['physics'] = function (module, exports, require) {
    // =============================================================================
    // physics.js — Simulation d'UN joueur pendant UN tick.
    //
    // Ce code est exécuté à l'identique :
    //   - par le serveur (qui fait autorité),
    //   - par le navigateur (prédiction du joueur local).
    // Il doit donc rester déterministe : même état + mêmes touches => même résultat.
    //
    // Il gère tout ce qui ne dépend que du joueur lui-même : déplacements, sauts,
    // plateformes, et le déroulé de ses actions (attaque, bouclier, esquive…).
    // Les interactions ENTRE joueurs (coups reçus, éjections) sont dans combat.js
    // et ne sont calculées que par le serveur.
    // =============================================================================
    (function (racine) {
      const cotéServeur = typeof module !== 'undefined' && module.exports;
      const C = cotéServeur ? require('./constants') : racine.NB.constants;
      const { PERSOS, infosAttaque } = cotéServeur ? require('./characters') : racine.NB.persos;
      const T = C.TOUCHE;

      // Champs qui décrivent entièrement la simulation d'un joueur. Ce sont eux que
      // le client recopie depuis le serveur avant de rejouer ses inputs.
      const CHAMPS = [
        'x', 'y', 'vx', 'vy',   // position des pieds et vitesse
        'dir',                  // sens du regard : 1 = droite, -1 = gauche
        'sol',                  // vrai si le joueur est posé sur une surface
        'sauts',                // sauts aériens restants
        'etat',                 // 'libre' | 'attaque' | 'charge' | 'bouclier' | 'esquive' | 'dash' | 'sonne' | 'bord' | 'mort'
        't',                    // nombre de ticks passés dans l'état courant
        'atk',                  // nom de l'attaque (ou du type d'esquive) en cours
        'charge',               // ticks de charge de l'attaque forte
        'bouclier',             // énergie du bouclier
        'gel',                  // « hit freeze » : ticks pendant lesquels le joueur est figé
        'invul',                // ticks d'invulnérabilité restants
        'traverse',             // ticks pendant lesquels on ignore les plateformes
        'prev',                 // touches du tick précédent (pour détecter un appui)
        'course',               // ticks passés à avancer dans la même direction
        'rapide',               // chute rapide en cours
        'esqAir',               // esquive aérienne déjà utilisée
        'nAtk',                 // compteur d'attaques lancées
        'sonne',                // ticks restants sans contrôle après un coup
        'elan',                 // compte à rebours avant le décollage
        'cd1', 'cd2', 'cd3',    // temps de recharge des trois capacités
        'airSpe',               // capacité aérienne déjà utilisée depuis le dernier atterrissage
        'bordCd',               // délai avant de pouvoir se raccrocher à un bord
        'cdDash',               // temps de recharge du dash
        'dashAir',              // dash aérien déjà utilisé depuis le dernier atterrissage
        'arme',                 // arme équipée (personnage qui change d'arme, comme Sylve)
      ];

      /** État de simulation d'un joueur neuf, placé en (x, y). */
      function nouvelEtat(x, y) {
        return {
          x, y, vx: 0, vy: 0, dir: 1, sol: false, sauts: 1,
          etat: 'libre', t: 0, atk: '', charge: 0, bouclier: C.BOUCLIER_MAX,
          gel: 0, invul: 0, traverse: 0, prev: 0, course: 0,
          rapide: false, esqAir: false, nAtk: 0, sonne: 0, elan: 0, cd1: 0, cd2: 0, cd3: 0,
          airSpe: false, bordCd: 0, cdDash: 0, dashAir: false, arme: 0,
        };
      }

      // ---------------------------------------------------------------------------
      // Petites fonctions utilitaires
      // ---------------------------------------------------------------------------
      const MARGE_BORD = 6; // on tient encore debout avec le pied à peine dans le vide

      /** Surface sur laquelle le joueur est posé, ou null s'il n'y en a pas. */
      function surfaceSous(p) {
        for (const s of C.carte.sols) {
          if (p.y === s.y && p.x >= s.x0 - MARGE_BORD && p.x <= s.x1 + MARGE_BORD) {
            return { traversable: false };
          }
        }
        for (const pl of C.carte.plateformes) {
          if (p.y === pl.y && p.x >= pl.x0 - MARGE_BORD && p.x <= pl.x1 + MARGE_BORD) {
            return { traversable: true };
          }
        }
        return null;
      }

      /** Rapproche « valeur » de « cible » d'au plus « pas ». */
      function approcher(valeur, cible, pas) {
        if (valeur < cible) return Math.min(cible, valeur + pas);
        return Math.max(cible, valeur - pas);
      }

      function changerEtat(p, etat) {
        p.etat = etat;
        p.t = 0;
      }

      function lancerAttaque(p, nom) {
        changerEtat(p, 'attaque');
        p.atk = nom;
        p.charge = 0;
        p.elan = 0;
        p.nAtk++;
      }

      function lancerCharge(p, nom) {
        changerEtat(p, 'charge');
        p.atk = nom;
        p.charge = 0;
        p.elan = 0;
      }

      /**
       * Lance une capacité élémentaire si elle est rechargée.
       *   BAS + SPÉCIAL                    : capacité 2
       *   SPÉCIAL en l'air, ou HAUT + SPÉCIAL : capacité aérienne (une fois par saut)
       *   SPÉCIAL au sol                   : capacité 1
       */
      function lancerSpecial(p, bas, haut, axe, S) {
        let n = 1;
        if (bas) n = 2;
        else if (haut || !p.sol) n = 3;
        const nom = 'spe' + n;
        const recharge = 'cd' + n;
        if (p[recharge] > 0 || !S[nom]) return false;
        if (n === 3) {
          if (p.airSpe) return false;
          p.airSpe = true;
        }
        if (axe !== 0) p.dir = axe;
        lancerAttaque(p, nom);
        const def = S[nom];
        // Capacité « changer d'arme » : on passe à l'arme suivante de la capacité 1.
        if (def.changerArme && S.spe1 && S.spe1.armes) p.arme = (p.arme + 1) % S.spe1.armes.length;
        // Une capacité à armes (capacité 1) a le temps de recharge de l'arme équipée.
        p[recharge] = def.armes ? def.armes[p.arme % def.armes.length].recharge : def.recharge;
        return true;
      }

      // ---------------------------------------------------------------------------
      // Dash : une impulsion rapide, au sol ou en l'air (une fois par saut)
      // ---------------------------------------------------------------------------
      const DASH_DUREE = 10;     // ticks
      const DASH_RECHARGE = 40;  // ticks avant de pouvoir recommencer

      /** Vitesse du dash : proportionnelle à la vitesse de course du personnage. */
      function vitesseDash(S) {
        return (S.dash && S.dash.vitesse) || S.course * 1.9;
      }

      function lancerDash(p, axe, S) {
        if (p.cdDash > 0) return false;
        if (!p.sol && p.dashAir) return false;
        if (axe !== 0) p.dir = axe;
        changerEtat(p, 'dash');
        p.atk = p.sol ? 'sol' : 'air';
        if (!p.sol) { p.dashAir = true; p.vy = 0; }
        p.vx = p.dir * vitesseDash(S);
        p.cdDash = (S.dash && S.dash.recharge) || DASH_RECHARGE;
        p.elan = 0;
        p.rapide = false;
        p.course = 0;
        return true;
      }

      function etatDash(p, touches, appui, axe, S) {
        const duree = (S.dash && S.dash.duree) || DASH_DUREE;
        p.vx = p.dir * vitesseDash(S) * (p.t > duree - 3 ? 0.7 : 1); // petit freinage final
        if (!p.sol) p.vy = 0;
        // Annulation : saut, attaque, capacité, attrape, bouclier ou esquive à tout moment
        // après les premières images. L'action part avec l'élan du dash.
        const annule = appui & (T.HAUT | T.SAUT | T.LEGER | T.FORT | T.SPECIAL | T.ATTRAPE | T.BOUCLIER | T.ESQUIVE);
        if (p.t >= 3 && annule) {
          changerEtat(p, 'libre');
          etatLibre(p, touches, appui, axe, S);
          return;
        }
        if (p.t >= duree) changerEtat(p, 'libre');
      }

      function sauter(p, vitesse) {
        p.vy = -vitesse;
        p.sol = false;
        p.rapide = false;
        p.elan = 0;
      }

      /** Le bouclier vole en éclats : le joueur est sonné un long moment. */
      function briserBouclier(p) {
        changerEtat(p, 'sonne');
        p.sonne = 140;
        p.vx = 0;
        p.vy = -10;
        p.sol = false;
        p.bouclier = 40;
      }

      /** Déplacement horizontal en l'air. */
      function controleAir(p, axe, S, facteur) {
        if (axe !== 0) {
          const cible = axe * S.vitAir;
          // On n'accélère pas au-delà de la vitesse aérienne maximale, mais on peut
          // toujours freiner si on va trop vite (après une éjection par exemple).
          if ((axe > 0 && p.vx < cible) || (axe < 0 && p.vx > cible)) {
            p.vx = approcher(p.vx, cible, S.accelAir * facteur);
          }
        }
        if (Math.abs(p.vx) > S.vitAir) p.vx *= 0.96;
      }

      // ---------------------------------------------------------------------------
      // Les états du joueur
      // ---------------------------------------------------------------------------
      function etatLibre(p, touches, appui, axe, S) {
        const haut = touches & T.HAUT;
        const bas = touches & T.BAS;
        const appuiSaut = appui & (T.HAUT | T.SAUT);

        if (p.sol) {
          // ----- Au sol -----
          if ((appui & T.DASH) && lancerDash(p, axe, S)) return;
          if ((appui & T.SPECIAL) && lancerSpecial(p, bas, haut, axe, S)) return;
          if (appui & T.ATTRAPE) {
            if (axe !== 0) p.dir = axe;
            lancerAttaque(p, 'attrape');
            return;
          }
          if (appui & T.LEGER) {
            if (haut) lancerAttaque(p, 'leger_haut');
            else if (bas) lancerAttaque(p, 'leger_bas');
            else if (axe !== 0) { p.dir = axe; lancerAttaque(p, 'leger_cote'); }
            else lancerAttaque(p, 'jab');
            return;
          }
          if (appui & T.FORT) {
            if (haut) lancerCharge(p, 'fort_haut');
            else if (bas) lancerCharge(p, 'fort_bas');
            else { if (axe !== 0) p.dir = axe; lancerCharge(p, 'fort_cote'); }
            return;
          }
          if (appui & T.ESQUIVE) {
            changerEtat(p, 'esquive');
            p.elan = 0;
            if (axe !== 0) { p.atk = 'roulade'; p.vx = axe * 7.5; p.invul = 16; }
            else { p.atk = 'surplace'; p.vx = 0; p.invul = 15; }
            return;
          }
          if (touches & T.BOUCLIER) {
            changerEtat(p, 'bouclier');
            p.elan = 0;
            return;
          }

          // Saut : on ne décolle qu'après un court élan. Si une attaque est lancée
          // pendant cet élan avec HAUT enfoncé, c'est une attaque vers le haut qui
          // part à la place du saut (voir plus haut).
          if (appuiSaut && p.elan === 0) {
            p.elan = C.ELAN_SAUT;
          } else if (p.elan > 0) {
            p.elan--;
            if (p.elan === 0) { sauter(p, S.saut); return; }
          }

          // Traverser une plateforme vers le bas.
          if ((appui & T.BAS)) {
            const surface = surfaceSous(p);
            if (surface && surface.traversable) {
              p.traverse = 12;
              p.sol = false;
              return;
            }
          }

          // Marche, puis course si on maintient la direction.
          if (axe !== 0) {
            if (p.dir !== axe) p.course = 0;
            p.dir = axe;
            p.course++;
            const vitesse = p.course > 14 ? S.course : S.marche;
            p.vx = approcher(p.vx, axe * vitesse, S.accelSol);
          } else {
            p.course = 0;
            p.vx *= 0.7;
            if (Math.abs(p.vx) < 0.1) p.vx = 0;
          }
          return;
        }

        // ----- En l'air -----
        p.elan = 0;
        p.course = 0;
        if ((appui & T.DASH) && lancerDash(p, axe, S)) return;
        if ((appui & T.SPECIAL) && lancerSpecial(p, bas, haut, axe, S)) return;
        if (appui & (T.LEGER | T.FORT)) {
          if (haut) lancerAttaque(p, 'air_haut');
          else if (bas) lancerAttaque(p, 'air_bas');
          else if (axe !== 0) { p.dir = axe; lancerAttaque(p, 'air_cote'); }
          else lancerAttaque(p, 'air_neutre');
          return;
        }
        if ((appui & T.ESQUIVE) && !p.esqAir) {
          changerEtat(p, 'esquive');
          p.atk = 'air';
          p.esqAir = true;
          p.invul = 18;
          p.rapide = false;
          p.vx = axe * 6;
          p.vy = haut ? -6 : bas ? 6 : p.vy * 0.3;
          return;
        }
        if (appuiSaut && p.sauts > 0) {
          p.sauts--;
          sauter(p, S.doubleSaut);
          if (axe !== 0) p.vx = axe * S.vitAir * 0.8;
        } else if ((appui & T.BAS) && p.vy > -1) {
          p.rapide = true; // chute rapide
        }
        controleAir(p, axe, S, 1);
      }

      function etatAttaque(p, touches, appui, axe, S) {
        const infos = infosAttaque(p);
        if (!infos || p.t >= infos.total) {
          changerEtat(p, 'libre');
          return;
        }
        const e = infos.attaque.elan;
        // « suspend » : le joueur reste presque immobile en l'air pendant la préparation.
        if (infos.attaque.suspend && !p.sol && p.t <= infos.debut) {
          p.vy = Math.min(p.vy, 0.8);
          p.vx *= 0.85;
        }
        // Certaines capacités propulsent le lanceur : une fois (« elan »), ou
        // pendant toute la phase active (« tenir »).
        const propulse = e && e.tenir && p.t > infos.debut && p.t <= infos.fin;
        if (e && (p.t === infos.debut + 1 || propulse)) {
          if (e.vx !== undefined) p.vx = e.vx * p.dir;
          if (e.vy !== undefined) { p.vy = e.vy; if (e.vy < 0 || !p.sol) p.sol = false; p.rapide = false; }
        }
        // Fin de la propulsion : on retrouve sa vitesse normale.
        if (e && e.tenir && p.t === infos.fin + 1) {
          if (e.vx !== undefined) p.vx = Math.max(-S.vitAir, Math.min(S.vitAir, p.vx));
          if (p.vy < -S.saut * 0.5) p.vy = -S.saut * 0.5;
        }
        if (propulse) {
          if (e.vx === undefined) controleAir(p, axe, S, 1);
        } else if (p.sol) {
          p.vx *= 0.8;
        } else {
          if ((appui & T.BAS) && p.vy > -1) p.rapide = true;
          controleAir(p, axe, S, 0.7);
        }
      }

      function etatCharge(p, touches) {
        p.vx *= 0.8;
        p.charge++;
        // On frappe dès que la touche est relâchée, ou quand la charge est pleine.
        if (!(touches & T.FORT) || p.charge >= C.CHARGE_MAX) {
          p.etat = 'attaque';
          p.t = 0;
          p.nAtk++;
        }
      }

      function etatBouclier(p, touches, appui, axe) {
        if (!p.sol) { changerEtat(p, 'libre'); return; }
        p.vx *= 0.7;
        p.bouclier -= 0.3; // le bouclier s'use tant qu'on le maintient
        if (p.bouclier <= 0) { briserBouclier(p); return; }

        if (appui & T.ESQUIVE) {
          changerEtat(p, 'esquive');
          if (axe !== 0) { p.atk = 'roulade'; p.vx = axe * 7.5; p.invul = 16; }
          else { p.atk = 'surplace'; p.vx = 0; p.invul = 15; }
          return;
        }
        if (appui & (T.HAUT | T.SAUT)) {
          changerEtat(p, 'libre');
          p.elan = C.ELAN_SAUT;
          return;
        }
        if (!(touches & T.BOUCLIER) && p.t >= 6) changerEtat(p, 'libre');
      }

      const DUREE_ESQUIVE = { roulade: 24, surplace: 22, air: 28 };

      function etatEsquive(p) {
        if (p.atk === 'roulade' && p.t > 16) p.vx *= 0.6;
        if (p.atk === 'air') p.vx *= 0.95;
        if (p.t >= (DUREE_ESQUIVE[p.atk] || 22)) changerEtat(p, 'libre');
      }

      function etatSonne(p) {
        p.sonne--;
        p.vx *= p.sol ? 0.9 : 0.985;
        if (p.sonne <= 0) { p.sonne = 0; changerEtat(p, 'libre'); }
      }

      // ---------------------------------------------------------------------------
      // Déplacement et collisions
      // ---------------------------------------------------------------------------
      function atterrir(p, y, S) {
        p.y = y;
        p.vy = 0;
        p.sol = true;
        p.sauts = S.sautsAir;
        p.rapide = false;
        p.esqAir = false;
        p.airSpe = false;
        p.dashAir = false;
        // Une attaque aérienne s'interrompt en touchant le sol.
        if (p.etat === 'attaque' && (p.atk.startsWith('air_') || p.atk === 'spe3')) changerEtat(p, 'libre');
      }

      // ---------------------------------------------------------------------------
      // Accroche aux bords
      // ---------------------------------------------------------------------------
      /**
       * En tombant près du bord d'un sol, le joueur s'y accroche automatiquement
       * (sauf s'il maintient BAS). Il est alors invulnérable un court instant.
       */
      function essayerBord(p, S, touches) {
        if (p.sol || p.bordCd > 0 || (touches & T.BAS)) return;
        const recuperation = p.etat === 'attaque' && p.atk === 'spe3';
        if (p.etat !== 'libre' && !recuperation) return;
        if (p.vy < -2 && !recuperation) return; // on ne s'accroche pas en montant

        for (const s of C.carte.sols) {
          for (const cote of [-1, 1]) {           // -1 : bord gauche, 1 : bord droit
            const bx = cote < 0 ? s.x0 : s.x1;
            const xAccroche = bx + cote * S.l / 2; // centre du joueur suspendu
            const hautCorps = p.y - S.h;
            if (Math.abs(p.x - xAccroche) > 42) continue;
            if (cote * (p.x - bx) < -12) continue; // il est au-dessus de la scène
            if (hautCorps < s.y - 55 || hautCorps > s.y + 28) continue;

            changerEtat(p, 'bord');
            p.x = xAccroche;
            p.y = s.y + S.h - 12; // les mains au niveau du bord
            p.vx = 0;
            p.vy = 0;
            p.dir = -cote;        // il regarde la scène
            p.sauts = S.sautsAir;
            p.esqAir = false;
            p.airSpe = false;
            p.dashAir = false;
            p.rapide = false;
            p.invul = Math.max(p.invul, 40);
            return;
          }
        }
      }

      /** Remonte du bord sur la scène. */
      function monter(p, S) {
        const bx = p.x + p.dir * S.l / 2;  // abscisse du bord
        p.y = p.y - S.h + 12;              // hauteur du sol
        p.x = bx + p.dir * (S.l / 2 + 2);
        p.vx = 0;
        p.vy = 0;
        p.sol = true;
        p.invul = Math.max(p.invul, 8);
        changerEtat(p, 'libre');
      }

      function etatBord(p, touches, appui, S) {
        p.vx = 0;
        p.vy = 0;
        if (p.t < 6) return; // petit temps avant de pouvoir agir
        const versScene = p.dir > 0 ? T.DROITE : T.GAUCHE;
        const versVide = p.dir > 0 ? T.GAUCHE : T.DROITE;

        if (appui & T.SAUT) {
          // Saut depuis le bord.
          changerEtat(p, 'libre');
          sauter(p, S.saut * 1.05);
          p.vx = p.dir * 2;
        } else if (appui & (T.HAUT | versScene)) {
          monter(p, S);
        } else if (appui & (T.LEGER | T.FORT)) {
          monter(p, S);
          lancerAttaque(p, 'leger_cote');
        } else if (appui & T.ESQUIVE) {
          // Roulade vers l'intérieur de la scène.
          monter(p, S);
          changerEtat(p, 'esquive');
          p.atk = 'roulade';
          p.vx = p.dir * 7.5;
          p.invul = 16;
        } else if ((appui & (T.BAS | versVide)) || p.t > 300) {
          // On lâche (et au bout de 5 secondes, on lâche de toute façon).
          changerEtat(p, 'libre');
          p.bordCd = 30;
        }
      }

      function deplacer(p, S) {
        if (p.etat === 'bord') return; // suspendu : ni gravité ni mouvement
        const yAvant = p.y;
        const carte = C.carte;

        if (p.sol || p.etat === 'dash') {
          p.vy = 0;
        } else {
          p.vy += S.gravite;
          // Ni la vitesse maximale de chute ni la chute rapide ne s'appliquent quand
          // on est éjecté ou propulsé par une capacité aérienne.
          if (p.etat !== 'sonne' && !(p.etat === 'attaque' && p.atk === 'spe3')) {
            if (p.rapide && p.vy < S.chuteRapide) p.vy = S.chuteRapide;
            const max = p.rapide ? S.chuteRapide : S.chuteMax;
            if (p.vy > max) p.vy = max;
          }
        }

        p.x += p.vx;
        p.y += p.vy;

        if (p.sol) {
          // On a peut-être marché dans le vide.
          if (!surfaceSous(p)) p.sol = false;
        } else if (p.vy >= 0) {
          // On ne se pose que si l'on arrive PAR LE DESSUS de la surface.
          let pose = false;
          for (const s of carte.sols) {
            const dessus = p.x >= s.x0 - MARGE_BORD && p.x <= s.x1 + MARGE_BORD;
            if (dessus && yAvant <= s.y && p.y >= s.y) {
              atterrir(p, s.y, S);
              pose = true;
              break;
            }
          }
          if (!pose && p.traverse === 0) {
            for (const pl of carte.plateformes) {
              const dessus = p.x >= pl.x0 - MARGE_BORD && p.x <= pl.x1 + MARGE_BORD;
              if (dessus && yAvant <= pl.y && p.y >= pl.y) {
                atterrir(p, pl.y, S);
                break;
              }
            }
          }
        }

        // Murs et plafonds des sols : si le corps entre dans un bloc plein sans
        // venir du dessus, on le repousse.
        const demi = S.l / 2;
        for (const s of carte.sols) {
          const bas = s.bas === undefined ? 2000 : s.bas;
          if (p.x <= s.x0 - demi || p.x >= s.x1 + demi) continue;
          if (p.y <= s.y + 1 || p.y - S.h >= bas) continue;
          if (yAvant - S.h >= bas - 1) {
            // Il arrive par en dessous : il se cogne la tête.
            p.y = bas + S.h;
            if (p.vy < 0) p.vy = 0;
          } else {
            p.x = p.x < (s.x0 + s.x1) / 2 ? s.x0 - demi : s.x1 + demi;
            p.vx = 0;
          }
        }
      }

      // ---------------------------------------------------------------------------
      // Fonction principale
      // ---------------------------------------------------------------------------
      /**
       * Fait avancer un joueur d'un tick.
       * @param {object} p        le joueur (modifié sur place) ; doit avoir p.perso
       * @param {number} touches  masque de bits des touches enfoncées
       */
      function avancerJoueur(p, touches) {
        const S = PERSOS[p.perso] || PERSOS.ondine;

        if (p.etat === 'mort') { p.prev = touches; return; }
        // Hit freeze : tout est figé. On ne met pas « prev » à jour, pour qu'une
        // touche enfoncée pendant le gel soit prise en compte juste après.
        if (p.gel > 0) { p.gel--; return; }

        const appui = touches & ~p.prev; // touches qui viennent d'être enfoncées
        p.prev = touches;
        const axe = (touches & T.DROITE ? 1 : 0) - (touches & T.GAUCHE ? 1 : 0);

        p.t++;
        if (p.invul > 0) p.invul--;
        if (p.traverse > 0) p.traverse--;
        if (p.cd1 > 0) p.cd1--;
        if (p.cd2 > 0) p.cd2--;
        if (p.cd3 > 0) p.cd3--;
        if (p.cdDash > 0) p.cdDash--;
        if (p.bordCd > 0) p.bordCd--;
        if (p.etat !== 'bouclier' && p.bouclier < C.BOUCLIER_MAX) {
          p.bouclier = Math.min(C.BOUCLIER_MAX, p.bouclier + 0.15);
        }

        switch (p.etat) {
          case 'attaque': etatAttaque(p, touches, appui, axe, S); break;
          case 'charge': etatCharge(p, touches); break;
          case 'bouclier': etatBouclier(p, touches, appui, axe); break;
          case 'esquive': etatEsquive(p); break;
          case 'dash': etatDash(p, touches, appui, axe, S); break;
          case 'sonne': etatSonne(p); break;
          case 'bord': etatBord(p, touches, appui, S); break;
          default: etatLibre(p, touches, appui, axe, S);
        }

        deplacer(p, S);
        essayerBord(p, S, touches);
      }

      const physics = { CHAMPS, nouvelEtat, avancerJoueur, briserBouclier, changerEtat };

      if (cotéServeur) {
        module.exports = physics;
      } else {
        racine.NB.physics = physics;
      }
    })(typeof self !== 'undefined' ? self : this);
};

// -----------------------------------------------------------------------------
// Module « progression »  (fichier d'origine : game/progression.js)
// -----------------------------------------------------------------------------
MODULES['progression'] = function (module, exports, require) {
    // =============================================================================
    // progression.js — Personnages à débloquer et modes solo.
    // Fichier de navigateur, chargé dans toutes les versions de la page.
    //
    // Le mode solo est une série de combats contre l'ordinateur, de plus en plus
    // durs, en trois modes de difficulté. Chaque combat gagné débloque le
    // personnage qu'on vient de battre :
    //
    //   Normal     (3 combats, niveaux 1 à 3)   : Épine, Lumi, Boulon
    //   Difficile  (3 combats, niveaux 4 à 6)   : Brume, Orage, Yéti
    //   Impossible (4 combats, niveaux 7 à 10)  : Dragon, Spectre, Colosse, Aurore
    //
    // Difficile s'ouvre une fois Normal terminé, Impossible une fois Difficile terminé.
    // Les personnages de base (voir BASE dans characters.js) sont toujours disponibles.
    //
    // La progression est gardée dans le navigateur (localStorage). Pour tout
    // débloquer (test, démonstration) : ajouter « ?tout=1 » à l'adresse de la page.
    // =============================================================================
    (function (racine) {
      'use strict';

      const { BASE, PERSOS } = racine.NB.persos;
      const CLE = 'neon-brawl-progression-v1';

      /** Les trois modes solo et leurs combats (adversaire = personnage débloqué en cas de victoire). */
      const SOLO = {
        normal: {
          nom: 'Normal', couleur: '#6bff4a',
          etapes: [
            { perso: 'epine', niveau: 1, carte: 'prairie' },
            { perso: 'lumi', niveau: 2, carte: 'plage' },
            { perso: 'boulon', niveau: 3, carte: 'ville' },
          ],
        },
        difficile: {
          nom: 'Difficile', couleur: '#ffb300',
          etapes: [
            { perso: 'brume', niveau: 4, carte: 'sommet' },
            { perso: 'orage', niveau: 5, carte: 'ruines' },
            { perso: 'yeti', niveau: 6, carte: 'volcan' },
          ],
        },
        impossible: {
          nom: 'Impossible', couleur: '#ff5252',
          etapes: [
            { perso: 'dragon', niveau: 7, carte: 'volcan' },
            { perso: 'spectre', niveau: 8, carte: 'ruines' },
            { perso: 'colosse', niveau: 9, carte: 'sommet' },
            { perso: 'aurore', niveau: 10, carte: 'prairie' },
          ],
        },
      };
      const MODES = ['normal', 'difficile', 'impossible'];

      // ---------------------------------------------------------------------------
      // Sauvegarde : localStorage si possible, sinon en mémoire (perdue au rechargement)
      // ---------------------------------------------------------------------------
      let etat = { normal: 0, difficile: 0, impossible: 0 }; // combats gagnés dans chaque mode
      let sauvegardeOk = true;
      const toutDebloque = /[?&]tout=1/.test(racine.location ? racine.location.search : '');

      function charger() {
        try {
          const brut = racine.localStorage.getItem(CLE);
          if (brut) {
            const lu = JSON.parse(brut);
            for (const m of MODES) etat[m] = Math.max(0, Math.min(SOLO[m].etapes.length, Number(lu[m]) || 0));
          }
        } catch (e) {
          sauvegardeOk = false;
        }
      }

      function sauvegarder() {
        try {
          racine.localStorage.setItem(CLE, JSON.stringify(etat));
        } catch (e) {
          sauvegardeOk = false;
        }
      }
      charger();

      // ---------------------------------------------------------------------------
      // Interrogation
      // ---------------------------------------------------------------------------
      /** Tous les personnages débloqués par des combats gagnés. */
      function gagnes() {
        const liste = [];
        for (const m of MODES) SOLO[m].etapes.slice(0, etat[m]).forEach((e) => liste.push(e.perso));
        return liste;
      }

      function estDebloque(id) {
        return toutDebloque || BASE.indexOf(id) >= 0 || gagnes().indexOf(id) >= 0;
      }

      /** Où se débloque un personnage verrouillé : { mode, numero } (numero de 1 à n). */
      function ouDebloquer(id) {
        for (const m of MODES) {
          const i = SOLO[m].etapes.findIndex((e) => e.perso === id);
          if (i >= 0) return { mode: m, nom: SOLO[m].nom, numero: i + 1 };
        }
        return null;
      }

      /** Nombre de combats gagnés dans un mode. */
      const etapesGagnees = (mode) => etat[mode];
      const modeTermine = (mode) => etat[mode] >= SOLO[mode].etapes.length;
      const toutTermine = () => MODES.every(modeTermine);

      /** Un mode est ouvert quand le précédent est terminé (Normal l'est toujours). */
      function modeOuvert(mode) {
        const i = MODES.indexOf(mode);
        return toutDebloque || i === 0 || modeTermine(MODES[i - 1]);
      }

      /** Numéro (à partir de 0) du prochain combat à livrer ; le dernier si le mode est terminé (revanche). */
      function etapeCourante(mode) {
        return Math.min(etat[mode], SOLO[mode].etapes.length - 1);
      }

      /**
       * Enregistre une victoire au combat « numero » du mode. Renvoie ce qu'elle débloque :
       *   { perso, nouveau, modeTermine, toutTermine, prochainMode }
       * « nouveau » est faux si ce combat avait déjà été gagné (revanche).
       */
      function victoire(mode, numero) {
        const etapes = SOLO[mode].etapes;
        const nouveau = numero === etat[mode];
        if (nouveau) {
          etat[mode]++;
          sauvegarder();
        }
        const fin = modeTermine(mode);
        const i = MODES.indexOf(mode);
        return {
          perso: etapes[numero].perso,
          nouveau,
          modeTermine: fin,
          toutTermine: toutTermine(),
          prochainMode: fin && nouveau && i < MODES.length - 1 ? MODES[i + 1] : null,
        };
      }

      function reinitialiser() {
        etat = { normal: 0, difficile: 0, impossible: 0 };
        sauvegarder();
      }

      const progression = {
        SOLO, MODES, BASE,
        estDebloque, ouDebloquer, etapesGagnees, modeTermine, toutTermine, modeOuvert, etapeCourante,
        victoire, reinitialiser,
        nbDebloques: () => Object.keys(PERSOS).filter(estDebloque).length,
        total: () => Object.keys(PERSOS).length,
        get sauvegardeOk() { return sauvegardeOk; },
        get toutDebloque() { return toutDebloque; },
      };

      if (typeof module !== 'undefined' && module.exports) {
        module.exports = progression;
      } else {
        racine.NB.progression = progression;
      }
    })(typeof self !== 'undefined' ? self : this);
};

// -----------------------------------------------------------------------------
// Module « combat »  (fichier d'origine : game/combat.js)
// -----------------------------------------------------------------------------
MODULES['combat'] = function (module, exports, require) {
    // =============================================================================
    // combat.js — Interactions entre joueurs (serveur uniquement).
    //
    //   - détection des coups (zone de frappe contre corps adverse)
    //   - dégâts, éjection, hitstun, hit freeze, bouclier, attrape
    //   - effets des éléments
    //   - sorties d'écran (perte d'une vie) et réapparition
    //
    // Les navigateurs ne calculent jamais rien de tout ça : ils reçoivent le
    // résultat dans l'état envoyé par le serveur.
    // =============================================================================
    const C = require('./constants');
    const { PERSOS, ELEMENTS, infosAttaque } = require('./characters');
    const physics = require('./physics');

    const DELAI_REAPPARITION = 70; // ticks entre l'éjection et le retour en jeu

    /** Vrai si le cercle (cx, cy, r) touche le corps du joueur v. */
    function cercleToucheCorps(cx, cy, r, v) {
      const S = PERSOS[v.perso] || PERSOS.ondine;
      // Point du rectangle du corps le plus proche du centre du cercle.
      const px = Math.max(v.x - S.l / 2, Math.min(v.x + S.l / 2, cx));
      const py = Math.max(v.y - S.h, Math.min(v.y, cy));
      const dx = cx - px;
      const dy = cy - py;
      return dx * dx + dy * dy <= r * r;
    }

    /**
     * Cherche tous les coups qui touchent pendant ce tick, puis les applique.
     * On détecte d'abord et on applique ensuite : ainsi deux joueurs qui se
     * frappent au même instant se touchent tous les deux.
     * @param {object[]} joueurs
     * @param {object[]} evenements  liste où ajouter les événements (pour les effets côté client)
     */
    function resoudreCoups(joueurs, evenements) {
      const coups = [];

      for (const a of joueurs) {
        if (a.etat !== 'attaque') continue;
        const infos = infosAttaque(a);
        if (!infos) continue;

        // Nouvelle attaque : on oublie qui a déjà été touché par la précédente.
        if (a.memoireNAtk !== a.nAtk) {
          a.memoireNAtk = a.nAtk;
          a.dejaTouches = [];
        }
        if (a.t <= infos.debut || a.t > infos.fin) continue; // le coup n'est pas actif

        const ech = infos.perso.taille;
        for (const v of joueurs) {
          if (v === a || v.etat === 'mort' || v.invul > 0) continue;
          if (a.dejaTouches.includes(v.id)) continue;
          for (const [bx, by, rayon] of infos.attaque.boites) {
            const cx = a.x + bx * a.dir * ech;
            const cy = a.y + by * ech;
            if (cercleToucheCorps(cx, cy, rayon * ech, v)) {
              a.dejaTouches.push(v.id);
              coups.push({ a, v, infos, cx, cy });
              break;
            }
          }
        }
      }

      for (const { a, v, infos, cx, cy } of coups) {
        const source = {
          id: a.id, joueur: a, tireur: a, x: a.x, dir: a.dir, charge: a.charge,
          element: infos.perso.element, puissance: infos.perso.puissance * (a.modPuiss || 1),
        };
        frapper(v, infos.attaque, source, evenements, cx, cy);
      }
    }

    /**
     * Applique un coup à la victime v. Sert aux attaques au corps à corps comme
     * aux projectiles et aux zones (voir capacites.js).
     * @param {object} v       la victime
     * @param {object} def     le coup : deg, base, ech, angle, et options
     *                         (deuxCotes, attrape, fige, sansGel)
     * @param {object} source  { id, x, dir, element, puissance, charge, joueur }
     *                         « joueur » n'est renseigné que pour un coup au corps à corps
     * @param {number} cx, cy  centre de la zone de frappe
     */
    function frapper(v, def, source, evenements, cx, cy) {
      const a = source.joueur || null;
      const tireur = source.tireur || a;
      const element = source.element;
      const mod = (ELEMENTS[element] && ELEMENTS[element].mod) || {};
      // Une attaque chargée à fond fait 40 % de dégâts en plus et éjecte plus loin.
      const charge = Math.min(1, (source.charge || 0) / C.CHARGE_MAX);
      const degats = def.deg * source.puissance * (1 + 0.4 * charge) * (mod.degatsPlus || 1);
      const sv = PERSOS[v.perso] || PERSOS.ondine;
      // Point d'impact, à mi-chemin entre la zone de frappe et la victime.
      const ix = Math.round((cx + v.x) / 2);
      const iy = Math.round((cy + v.y - sv.h / 2) / 2);

      // --- Coup paré par le bouclier (l'attrape, elle, passe au travers) ---
      if (v.etat === 'bouclier' && !def.attrape) {
        // Terre : les coups de terre usent le bouclier bien plus vite.
        v.bouclier -= degats * (element === 'terre' ? 2.2 : (mod.bouclierDmg || 1.3));
        v.vx = (v.x >= source.x ? 1 : -1) * 2.5;
        v.gel = 4;
        if (a) a.gel = 4;
        if (v.bouclier <= 0) {
          physics.briserBouclier(v);
          evenements.push({ t: 'brise', x: v.x, y: v.y - sv.h / 2, id: v.id });
        } else {
          evenements.push({ t: 'pare', x: ix, y: iy, id: v.id });
        }
        return;
      }

      v.degats += degats;
      v.rapide = false;
      v.elan = 0;

      // --- Gel complet (piège de givre) : la victime reste figée sur place ---
      if (def.fige) {
        physics.changerEtat(v, 'sonne');
        v.sonne = def.fige;
        v.vx = 0;
        v.vy = 0;
        evenements.push({ t: 'coup', x: ix, y: iy, f: 8, id: v.id, de: source.id, el: element });
        return;
      }

      let cote = def.deuxCotes ? (v.x === source.x ? source.dir : Math.sign(v.x - source.x)) : source.dir;

      // --- Attrape : on saisit l'adversaire, puis on le projette ---
      if (def.attrape && a) {
        // En maintenant la direction opposée, on le jette derrière soi.
        const arriere = a.dir > 0 ? C.TOUCHE.GAUCHE : C.TOUCHE.DROITE;
        if (a.touches & arriere) cote = -cote;
        const sa = PERSOS[a.perso] || PERSOS.ondine;
        v.x = a.x + a.dir * (sa.l / 2 + sv.l / 2);
        v.y = a.y;
        v.sol = a.sol;
      }

      // Eau : une poussée de base plus forte.
      const base = def.base + (element === 'eau' ? 1.3 : 0);
      const ejection = ((base + v.degats * def.ech) * (1 + 0.3 * charge) * (mod.ejectionPlus || 1)) / (sv.poids * (v.modPoids || 1));

      // Air : les coups qui partent vers l'avant envoient plus haut.
      const releve = element === 'air' && def.angle >= 0 && def.angle < 75 ? 14 : 0;
      const angle = ((def.angle + releve) * Math.PI) / 180;
      v.vx = Math.cos(angle) * ejection * cote;
      v.vy = -Math.sin(angle) * ejection;
      // Frappé vers le bas alors qu'on est au sol : on rebondit.
      if (v.sol && v.vy > 0) v.vy = -v.vy * 0.8;
      if (v.vy < 0) v.sol = false;

      physics.changerEtat(v, 'sonne');
      v.sonne = Math.min(100, Math.round(ejection * 2.4) + 6);
      v.dir = -cote || v.dir; // la victime fait face au coup

      // Hit freeze : les joueurs se figent un court instant, d'autant plus
      // longtemps que le coup est fort. Une attrape tient l'adversaire un moment.
      let gel = Math.max(3, Math.min(14, Math.round(3 + degats / 2)));
      if (def.attrape) gel = 16;
      if (def.sansGel) gel = 0;
      v.gel = gel;
      if (a) a.gel = gel;

      // --- Effets des autres éléments ---
      if (element === 'feu') v.brulure = 120;                       // brûle pendant 2 s
      if (element === 'foudre') v.gel += 6;                         // paralysie
      if (element === 'glace') v.sonne = Math.min(115, Math.round(v.sonne * 1.3)); // gel
      if (mod.gelPlus) v.gel += mod.gelPlus;                                        // lumière : impact marqué
      if (mod.poison) v.poison = mod.poison;                                        // ombre : poison
      if (mod.soin && tireur && tireur !== v) tireur.degats = Math.max(0, tireur.degats - mod.soin); // nature : sève

      evenements.push({
        t: 'coup',
        x: ix, y: iy,
        f: Math.round(ejection * 10) / 10,   // force, pour doser les effets
        id: v.id, de: source.id, el: element,
      });
    }

    /** Effets qui durent dans le temps : la brûlure du feu (+3 % en 2 secondes). */
    function effetsContinus(joueurs) {
      for (const p of joueurs) {
        if (p.etat === 'mort') continue;
        if (p.brulure > 0) {
          p.brulure--;
          if (p.brulure % 20 === 0) p.degats += 0.5;
        }
        if (p.poison > 0) {
          p.poison--;
          if (p.poison % 25 === 0) p.degats += 0.6;
        }
      }
    }

    /**
     * Gère les sorties d'écran et le compte à rebours des joueurs éliminés.
     * Renvoie la liste des joueurs prêts à réapparaître (au serveur de décider
     * s'ils reviennent, selon le mode de jeu).
     */
    function gererSorties(joueurs, evenements) {
      const prets = [];
      const Z = C.carte.sortie;
      for (const p of joueurs) {
        if (p.etat === 'mort') {
          if (p.retour > 0) p.retour--;
          if (p.retour === 0) prets.push(p);
          continue;
        }
        if (p.x < Z.gauche || p.x > Z.droite || p.y < Z.haut || p.y > Z.bas) {
          p.vies--;
          evenements.push({
            t: 'ko', id: p.id,
            x: Math.round(Math.max(Z.gauche, Math.min(Z.droite, p.x))),
            y: Math.round(Math.max(Z.haut, Math.min(Z.bas, p.y))),
          });
          p.etat = 'mort';
          p.t = 0;
          p.vx = 0;
          p.vy = 0;
          p.retour = DELAI_REAPPARITION;
        }
      }
      return prets;
    }

    /** Remet un joueur en jeu au-dessus de l'arène, brièvement invulnérable. */
    function reapparaitre(p, x, y = C.carte.yApparition) {
      const garde = { nAtk: p.nAtk, prev: p.prev };
      Object.assign(p, physics.nouvelEtat(x, y), garde);
      p.degats = 0;
      p.brulure = 0;
      p.poison = 0;
      p.sauts = (PERSOS[p.perso] || PERSOS.ondine).sautsAir;
      p.invul = 120;
      p.dir = x < C.carte.centre ? 1 : -1;
    }

    const arrondi = (n) => Math.round(n * 100) / 100;

    /** Version d'un joueur envoyée aux navigateurs (serveur, mode local et mode sans serveur). */
    function instantaneJoueur(j) {
      const s = {
        id: j.id, nom: j.nom, couleur: j.couleur, perso: j.perso,
        degats: Math.round(j.degats), vies: j.vies, acq: j.acquitte,
        brulure: j.brulure > 0 ? 1 : 0, poison: j.poison > 0 ? 1 : 0,
      };
      for (const champ of physics.CHAMPS) s[champ] = typeof j[champ] === 'number' ? arrondi(j[champ]) : j[champ];
      return s;
    }

    module.exports = { cercleToucheCorps, resoudreCoups, frapper, effetsContinus, gererSorties, reapparaitre, instantaneJoueur };
};

// -----------------------------------------------------------------------------
// Module « capacites »  (fichier d'origine : game/capacites.js)
// -----------------------------------------------------------------------------
MODULES['capacites'] = function (module, exports, require) {
    // =============================================================================
    // capacites.js — Capacités élémentaires (serveur uniquement).
    //
    // Chaque personnage a trois capacités (« spe1 », « spe2 » et « spe3 » dans
    // characters.js). Quand un joueur en lance une, elle crée un OBJET dans
    // l'arène, qui vit sa vie indépendamment du joueur :
    //
    //   - un PROJECTILE : il avance, et frappe le premier adversaire touché ;
    //   - une ZONE : elle reste en place et frappe ceux qui s'y trouvent
    //     (flaque de feu, geyser, piège qui se déclenche au contact…).
    //
    // Le propriétaire d'un objet n'est jamais touché par celui-ci.
    // =============================================================================
    const C = require('./constants');
    const { PERSOS, infosAttaque } = require('./characters');
    const combat = require('./combat');

    let prochainId = 1;

    /** Crée l'objet décrit par « o » pour le joueur p, et l'ajoute à la liste. */
    function creer(objets, p, o, perso) {
      const ech = perso.taille;
      const x = p.x + p.dir * (o.dx === undefined ? 40 : o.dx) * ech;
      const commun = {
        id: prochainId++, style: o.style, def: o,
        proprio: p.id, element: perso.element, puissance: perso.puissance,
        dir: p.dir, vie: o.vie, touches: [],
      };

      if (o.type === 'projectile') {
        objets.push({
          ...commun, type: 'p',
          x, y: p.y + (o.dy === undefined ? -36 : o.dy) * ech,
          vx: p.dir * o.vitesse, vy: o.vy || 0, r: o.r,
        });
        return;
      }

      // Zone. « unique » : une seule à la fois par joueur (la nouvelle remplace l'ancienne).
      if (o.unique) {
        for (const autre of objets) {
          if (autre.proprio === p.id && autre.style === o.style) autre.vie = 0;
        }
      }
      // « auSol » : la zone se pose sur le sol sous le joueur.
      let y = p.y;
      if (o.auSol && !p.sol) {
        const sol = C.carte.sols.find((s) => x >= s.x0 && x <= s.x1 && p.y < s.y);
        if (sol) y = sol.y;
      }
      objets.push({
        ...commun, type: 'z',
        x, y, l: o.l, h: o.h,
        delai: o.delai || 0,   // ticks avant que la zone ne devienne active
        derniers: {},          // dernier tick où chaque joueur a été touché
      });
    }

    /** Les joueurs qui lancent une capacité font apparaître leur objet. */
    function lancer(objets, joueurs) {
      for (const p of joueurs) {
        if (p.etat !== 'attaque' || !p.atk.startsWith('spe')) continue;
        const infos = infosAttaque(p);
        const o = infos && infos.attaque.objet;
        if (!o || p.t <= infos.debut) continue;

        if (o.rafale) {
          // Tir continu (lance-flammes) : un projectile tous les « rafale » ticks.
          // La mémoire évite de tirer deux fois pendant un hit freeze.
          const cle = p.nAtk * 1000 + p.t;
          if (p.t <= infos.fin && (p.t - infos.debut - 1) % o.rafale === 0 && p.memoireTir !== cle) {
            p.memoireTir = cle;
            creer(objets, p, o, infos.perso);
          }
        } else if (p.memoireSpe !== p.nAtk) {
          p.memoireSpe = p.nAtk;
          creer(objets, p, o, infos.perso);
        }
      }
    }

    /**
     * Décrit celui qui frappe, pour combat.frapper. « tireur » est le joueur qui a
     * lancé l'objet (s'il est encore là) : il bénéficie des effets de son élément
     * (soin de la nature…) et de ses éventuels bonus de difficulté.
     */
    function source(objet, joueurs) {
      const tireur = joueurs.find((j) => j.id === objet.proprio) || null;
      return {
        id: objet.proprio, joueur: null, tireur, x: objet.x, dir: objet.dir, charge: 0,
        element: objet.element, puissance: objet.puissance * ((tireur && tireur.modPuiss) || 1),
      };
    }

    /** Une explosion à l'endroit où une bombe ou un missile s'arrête. */
    function exploser(o, objets, evenements) {
      const d = o.def.explose;
      if (!d) return;
      objets.push({
        id: prochainId++, style: d.style, def: d, type: 'z',
        proprio: o.proprio, element: o.element, puissance: o.puissance, dir: o.dir, touches: [],
        vie: d.vie, x: o.x, y: o.y + d.r, l: d.r, h: d.r * 2, delai: 0, derniers: {},
      });
      evenements.push({ t: 'eclat', x: Math.round(o.x), y: Math.round(o.y), el: o.element });
    }

    /** Fin de vie d'un projectile (avec explosion éventuelle). */
    function finir(o, objets, evenements) {
      if (o.fini) return;
      o.fini = true;
      o.vie = 0;
      exploser(o, objets, evenements);
    }

    function avancerProjectile(o, joueurs, evenements, objets) {
      const def = o.def;

      // Boomerang : il part tout droit en ralentissant, puis revient vers son lanceur.
      if (def.boomerang) {
        o.age = (o.age || 0) + 1;
        const proprio = joueurs.find((j) => j.id === o.proprio);
        if (!proprio || proprio.etat === 'mort') { o.vie = 0; return; }
        if (o.age < def.allee) {
          o.vx *= 0.97;
        } else {
          if (o.age === def.allee) o.touches = []; // il peut toucher de nouveau au retour
          const dx = proprio.x - o.x;
          const dy = proprio.y - 36 - o.y;
          const d = Math.hypot(dx, dy);
          if (d < 34) { o.vie = 0; return; }       // rattrapé au vol
          const v = def.vitesse * 1.15;
          o.vx = (dx / d) * v;
          o.vy = (dy / d) * v;
        }
      }

      o.vy += def.g || 0;
      o.x += o.vx;
      o.y += o.vy;
      o.vie--;

      for (const v of joueurs) {
        if (v.id === o.proprio || v.etat === 'mort' || v.invul > 0 || o.touches.includes(v.id)) continue;
        if (!combat.cercleToucheCorps(o.x, o.y, o.r, v)) continue;
        o.touches.push(v.id);
        if (def.explose) { finir(o, objets, evenements); return; } // bombe, missile : explose au contact
        combat.frapper(v, def, source(o, joueurs), evenements, o.x, o.y);
        if (!def.perce) { o.vie = 0; return; } // un projectile perçant continue sa route
      }

      // Le projectile s'écrase contre les sols (sauf le boomerang, qui les survole).
      if (!def.traverseSol) {
        for (const s of C.carte.sols) {
          const bas = s.bas === undefined ? 2000 : s.bas;
          if (o.x > s.x0 && o.x < s.x1 && o.y + o.r * 0.5 > s.y && o.y - o.r < bas) {
            finir(o, objets, evenements);
            if (!def.explose) evenements.push({ t: 'eclat', x: Math.round(o.x), y: s.y, el: o.element });
            return;
          }
        }
      }
      if (o.vie <= 0) finir(o, objets, evenements);
    }

    function avancerZone(z, joueurs, evenements, tick) {
      if (z.delai > 0) { z.delai--; return; }
      z.vie--;
      const def = z.def;

      for (const v of joueurs) {
        if (v.id === z.proprio || v.etat === 'mort' || v.invul > 0) continue;
        if (def.auSolSeulement && !v.sol) continue;
        const sv = PERSOS[v.perso] || PERSOS.ondine;
        const dedans = Math.abs(v.x - z.x) <= z.l + sv.l / 2 && v.y >= z.y - z.h && v.y - sv.h <= z.y + 8;
        if (!dedans) continue;

        if (def.intervalle) {
          // Dégâts répétés tant qu'on reste dans la zone.
          if (tick - (z.derniers[v.id] || -999) < def.intervalle) continue;
          z.derniers[v.id] = tick;
        } else if (z.touches.includes(v.id)) {
          continue; // un seul coup par victime
        }
        z.touches.push(v.id);
        combat.frapper(v, def, source(z, joueurs), evenements, z.x, v.y - sv.h / 2);

        // Un piège disparaît dès qu'il s'est déclenché.
        if (def.declenche) {
          z.vie = 0;
          evenements.push({ t: 'eclat', x: Math.round(z.x), y: Math.round(z.y - 20), el: z.element });
          return;
        }
      }
    }

    /**
     * Fait vivre toutes les capacités pendant un tick. À appeler après
     * combat.resoudreCoups. Modifie la liste « objets » sur place.
     */
    function avancer(objets, joueurs, evenements, tick) {
      lancer(objets, joueurs);
      // On parcourt une copie : une explosion ajoute des objets pendant la boucle.
      for (const o of objets.slice()) {
        if (o.type === 'p') avancerProjectile(o, joueurs, evenements, objets);
        else avancerZone(o, joueurs, evenements, tick);
      }
      // On retire les objets en fin de vie.
      for (let i = objets.length - 1; i >= 0; i--) {
        if (objets[i].vie <= 0) objets.splice(i, 1);
      }
    }

    /** Version allégée des objets, à envoyer aux navigateurs pour l'affichage. */
    function instantane(objets) {
      const r = (n) => Math.round(n * 10) / 10;
      return objets.map((o) => (o.type === 'p'
        ? { id: o.id, t: 'p', s: o.style, el: o.element, x: r(o.x), y: r(o.y), vx: r(o.vx), vy: r(o.vy), g: o.def.g || 0, r: o.r }
        : { id: o.id, t: 'z', s: o.style, el: o.element, x: r(o.x), y: r(o.y), l: o.l, h: o.h, actif: o.delai > 0 ? 0 : 1, vie: o.vie, vm: o.def.vie }));
    }

    module.exports = { avancer, instantane };
};

// #############################################################################
// PARTIE 2 — PAGE WEB  (fichier d'origine : public/index.html)
// #############################################################################
const PAGE_WEB = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<title>Neon Brawl</title>
<style>
  /* Aucune ressource externe : tout est dans ce fichier (pas de CDN). */
  html, body {
    margin: 0;
    height: 100%;
    background: #101018;
    color: #f2f2f7;
    font-family: "Trebuchet MS", "Segoe UI", Verdana, sans-serif;
    overflow: hidden;
  }
  #scene {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  canvas {
    display: block;
    background: #000;
    border-radius: 6px;
  }
  #bandeau {
    position: fixed;
    top: 10px;
    left: 14px;
    font-size: 14px;
    letter-spacing: 0.04em;
    text-shadow: 0 1px 3px #000, 0 0 2px #000;
    pointer-events: none;
  }
  #bandeau b { color: #ffd23f; }
  #touches {
    position: fixed;
    top: 8px;
    right: 14px;
    max-width: calc(100% - 470px);
    text-align: right;
    font-size: 12px;
    line-height: 1.9;
    opacity: 0.9;
    text-shadow: 0 1px 3px #000, 0 0 2px #000;
    pointer-events: none;
  }
  #touches span { margin-left: 12px; white-space: nowrap; }
  kbd {
    display: inline-block;
    min-width: 1.1em;
    padding: 0 5px;
    border: 1px solid #555;
    border-bottom-width: 2px;
    border-radius: 4px;
    background: #f2f2f7;
    color: #1d1a26;
    font-family: inherit;
    font-size: 11px;
    text-align: center;
  }
  /* ----- Commandes tactiles (téléphones et tablettes) ----- */
  body.tactile { touch-action: none; overscroll-behavior: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
  body.tactile #touches { display: none; }
  #tactile { display: none; }
  body.tactile.en-jeu #tactile { display: block; }
  #tactile .zone { position: fixed; z-index: 6; touch-action: none; }
  #manette {
    left: calc(18px + env(safe-area-inset-left)); bottom: 18px;
    width: 34vmin; height: 34vmin; max-width: 190px; max-height: 190px; min-width: 120px; min-height: 120px;
    border-radius: 50%; background: rgba(20, 18, 30, 0.35); border: 3px solid rgba(255, 255, 255, 0.45);
  }
  #manche {
    position: absolute; left: 50%; top: 50%; width: 42%; height: 42%; margin: -21% 0 0 -21%;
    border-radius: 50%; background: rgba(255, 255, 255, 0.75); border: 3px solid #1d1a26; pointer-events: none;
  }
  #boutons {
    right: calc(14px + env(safe-area-inset-right)); bottom: 14px;
    width: 42vmin; height: 42vmin; max-width: 240px; max-height: 240px; min-width: 150px; min-height: 150px;
  }
  #tactile button {
    position: absolute; border-radius: 50%; border: 3px solid #1d1a26; color: #1d1a26;
    font: bold 13px "Trebuchet MS", sans-serif; touch-action: none; padding: 0; opacity: 0.85;
    box-shadow: 0 3px 0 rgba(0, 0, 0, 0.35);
  }
  #tactile button small { display: block; font-size: 9px; font-weight: normal; }
  #tactile button.appuye { transform: scale(0.9); opacity: 1; filter: brightness(1.2); box-shadow: none; }
  /* Boutons principaux, en losange */
  #boutons .b-saut   { right: 34%; top: 0;    width: 32%; height: 32%; background: #ffffff; }
  #boutons .b-leger  { right: 0;   top: 34%;  width: 34%; height: 34%; background: #ffd23f; }
  #boutons .b-fort   { right: 34%; bottom: 0; width: 32%; height: 32%; background: #ff7a4a; }
  #boutons .b-special{ left: 0;    top: 34%;  width: 34%; height: 34%; background: #4ac6ff; }
  /* Petits boutons */
  #boutons .b-bouclier { left: 4%;  top: 2%;    width: 23%; height: 23%; background: #b48cff; }
  #boutons .b-esquive  { right: 2%; bottom: 4%; width: 23%; height: 23%; background: #9be04a; }
  #boutons .b-attrape  { left: 4%;  bottom: 4%; width: 23%; height: 23%; background: #ff8ad2; }
  #boutons .b-dash     { right: 2%; top: 2%;    width: 23%; height: 23%; background: #ffa24a; }
  #barre-tactile { top: calc(6px + env(safe-area-inset-top)); right: calc(8px + env(safe-area-inset-right)); display: flex; gap: 6px; }
  #barre-tactile button {
    position: static; border-radius: 9px; width: auto; height: 30px; padding: 0 10px;
    background: rgba(242, 242, 247, 0.9); font-size: 12px;
  }
  body.tactile #bandeau { font-size: 11px; top: 8px; left: 10px; }
  #tourner {
    display: none; position: fixed; inset: 0; z-index: 30; background: #1f1c30; color: #fff;
    align-items: center; justify-content: center; text-align: center; font-size: 20px; padding: 30px;
  }
  #tourner span { display: block; font-size: 64px; margin-bottom: 12px; }
  @media (orientation: portrait) { body.tactile.en-jeu #tourner { display: flex; } }

  #alerte {
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 20;
    max-width: 640px;
    padding: 18px 24px;
    border: 4px solid #1d1a26;
    border-radius: 14px;
    background: #fff4d6;
    color: #1d1a26;
    font-size: 14px;
    line-height: 1.5;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
    display: none;
  }
  #alerte h2 { margin: 0 0 8px; font-size: 19px; color: #c0392b; }
  #alerte code { background: #1d1a26; color: #ffd23f; padding: 1px 6px; border-radius: 4px; }
  #alerte li { margin: 4px 0; }
</style>
<script>
// =============================================================================
// Compatibilité et messages d'erreur — ce bloc s'exécute avant tout le reste.
// =============================================================================
(function () {
  // Les navigateurs anciens (Chrome < 99, Firefox < 112, Safari < 16) ne
  // connaissent pas roundRect, utilisé pour les rectangles arrondis. On le
  // fournit nous-mêmes, sinon l'affichage se figerait.
  var proto = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (proto && !proto.roundRect) {
    proto.roundRect = function (x, y, l, h, r) {
      var v = Array.isArray(r) ? (r.length === 4 ? r : [r[0], r[0], r[0], r[0]]) : [r || 0, r || 0, r || 0, r || 0];
      var m = Math.min(Math.abs(l), Math.abs(h)) / 2;
      var hg = Math.min(v[0], m), hd = Math.min(v[1], m), bd = Math.min(v[2], m), bg = Math.min(v[3], m);
      this.moveTo(x + hg, y);
      this.lineTo(x + l - hd, y);
      this.quadraticCurveTo(x + l, y, x + l, y + hd);
      this.lineTo(x + l, y + h - bd);
      this.quadraticCurveTo(x + l, y + h, x + l - bd, y + h);
      this.lineTo(x + bg, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - bg);
      this.lineTo(x, y + hg);
      this.quadraticCurveTo(x, y, x + hg, y);
      this.closePath();
    };
  }

  // Affiche un message au milieu de l'écran (titre + contenu HTML).
  window.alerteNB = function (titre, html) {
    var boite = document.getElementById('alerte');
    if (!boite) return;
    boite.innerHTML = '<h2>' + titre + '</h2>' + html;
    boite.style.display = titre ? 'block' : 'none';
  };

  // Toute erreur du jeu est affichée à l'écran, pour pouvoir la signaler.
  window.addEventListener('error', function (e) {
    window.alerteNB('Le jeu a rencontré une erreur',
      '<p><code>' + String(e.message).replace(/</g, '&lt;') + '</code></p>'
      + '<p>Ligne ' + e.lineno + '. Navigateur : ' + navigator.userAgent.replace(/</g, '&lt;') + '</p>'
      + '<p>Mets ton navigateur à jour, ou envoie ce message pour qu\\'on corrige le problème.</p>');
  });
})();
</script>
</head>
<body>
<div id="scene"><canvas id="jeu" width="1280" height="720"></canvas></div>
<div id="alerte"></div>
<noscript>
  <div style="position:fixed;inset:0;z-index:99;background:#1f1c30;color:#fff;padding:28px;font:17px/1.5 'Trebuchet MS',sans-serif;overflow:auto">
    <h2 style="color:#ffd23f;margin-top:0">Le jeu ne peut pas démarrer ici</h2>
    <p>Cette page est ouverte dans un <b>aperçu de fichier</b> (ou un navigateur sans JavaScript) :
       le jeu a besoin de JavaScript pour fonctionner.</p>
    <p>Ouvre-la plutôt dans <b>Safari</b> ou <b>Chrome</b>, à l'adresse du serveur :<br>
       <code style="color:#ffd23f">http://&lt;adresse-IP-de-la-VM&gt;/</code></p>
    <p>(le téléphone doit être sur le même Wi-Fi que la VM)</p>
  </div>
</noscript>
<div id="tactile">
  <div id="manette" class="zone"><div id="manche"></div></div>
  <div id="boutons" class="zone">
    <button class="b-saut" data-touche="SAUT">Saut</button>
    <button class="b-leger" data-touche="LEGER">A<small>légère</small></button>
    <button class="b-fort" data-touche="FORT">B<small>forte</small></button>
    <button class="b-special" data-touche="SPECIAL">★<small>spécial</small></button>
    <button class="b-bouclier" data-touche="BOUCLIER"><small>bouclier</small></button>
    <button class="b-esquive" data-touche="ESQUIVE"><small>esquive</small></button>
    <button class="b-attrape" data-touche="ATTRAPE"><small>attrape</small></button>
    <button class="b-dash" data-touche="DASH"><small>dash</small></button>
  </div>
  <div id="barre-tactile" class="zone">
    <button data-action="perso" class="reseau-seul">Perso ›</button>
    <button data-action="carte" class="reseau-seul">Carte ›</button>
    <button data-action="plein">⛶</button>
    <button data-action="menu">☰ Menu</button>
  </div>
</div>
<div id="tourner"><div><span>↻</span>Tourne ton téléphone en mode paysage pour jouer.</div></div>
<div id="bandeau"><b>NEON BRAWL</b> · <span id="statut">connexion…</span></div>
<div id="touches">
  <div>
    <span>Bouger <kbd>←</kbd><kbd>→</kbd> / <kbd>Q</kbd><kbd>D</kbd></span>
    <span>Sauter <kbd>↑</kbd> / <kbd>Z</kbd> / <kbd>Espace</kbd></span>
    <span>Descendre <kbd>↓</kbd> / <kbd>S</kbd></span>
  </div>
  <div>
    <span>Attaque légère <kbd>J</kbd> / <kbd>C</kbd></span>
    <span>Attaque forte (maintenir) <kbd>K</kbd> / <kbd>V</kbd></span>
    <span>Bouclier <kbd>L</kbd> / <kbd>B</kbd></span>
    <span>Esquive <kbd>Maj</kbd> / <kbd>N</kbd></span>
  </div>
  <div>
    <span>Attrape (perce le bouclier) <kbd>U</kbd> / <kbd>X</kbd></span>
    <span>Capacité 1 <kbd>I</kbd> / <kbd>F</kbd></span>
    <span>Capacité 2 <kbd>↓</kbd> + <kbd>I</kbd></span>
    <span>Capacité aérienne <kbd>I</kbd> en l'air</span>
    <span>Dash <kbd>E</kbd></span>
  </div>
  <div>
    <span>Personnage : <kbd>1</kbd> à <kbd>9</kbd> ou <kbd>P</kbd> (suivant)</span>
    <span>Carte suivante <kbd>Tab</kbd></span>
  </div>
</div>

<!-- Le serveur remplace ce marqueur par le code partagé (dossier game/). -->
<!--NB_PARTAGE-->

<script>
// =============================================================================
// Client de Neon Brawl
//
// Principe du réseau :
//   - À chaque tick (60/s) on lit le clavier, on numérote cet « input », on
//     l'envoie au serveur ET on l'applique tout de suite en local : c'est la
//     PRÉDICTION, le joueur ne ressent aucune latence.
//   - Quand un état arrive du serveur, on repart de l'état officiel et on
//     rejoue les inputs que le serveur n'a pas encore traités : c'est la
//     RÉCONCILIATION.
//   - Les autres joueurs sont affichés ~100 ms dans le passé, en glissant
//     entre deux états reçus : c'est l'INTERPOLATION.
//   - Les coups, dégâts et éjections ne sont JAMAIS calculés ici : seul le
//     serveur en décide.
// =============================================================================
(function () {
  'use strict';

  const C = NB.constants;
  const physics = NB.physics;
  const { ELEMENTS, PERSOS, infosAttaque } = NB.persos;
  const T = C.TOUCHE;

  const canvas = document.getElementById('jeu');
  const ctx = canvas.getContext('2d');
  const elStatut = document.getElementById('statut');

  // ---------------------------------------------------------------------------
  // Mise à l'échelle : le jeu est dessiné en 1280x720 et étiré à la fenêtre.
  // ---------------------------------------------------------------------------
  function redimensionner() {
    const echelle = Math.min(window.innerWidth / C.LARGEUR, window.innerHeight / C.HAUTEUR);
    canvas.style.width = Math.floor(C.LARGEUR * echelle) + 'px';
    canvas.style.height = Math.floor(C.HAUTEUR * echelle) + 'px';
  }
  window.addEventListener('resize', redimensionner);
  redimensionner();

  // Caméra fixe : on voit l'arène avec un peu de marge autour.
  // ---------------------------------------------------------------------------
  // Caméra : elle suit les combattants et dézoome quand ils s'éloignent les
  // uns des autres, sans jamais sortir du rectangle « vue » de la carte.
  // ---------------------------------------------------------------------------
  const cam = { x: 640, y: 400, z: 0.6, pret: false }; // centre visé (monde) et zoom
  const ZOOM_MAX = 1.0;

  /** Zoom le plus faible permis : celui qui montre toute la vue de la carte. */
  function zoomMinimal() {
    const v = C.carte.vue;
    return Math.max(C.LARGEUR / (v.x1 - v.x0), C.HAUTEUR / (v.y1 - v.y0));
  }

  function majCamera(joueurs, dt) {
    const v = C.carte.vue;
    const zmin = zoomMinimal();
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const j of joueurs) {
      if (j.etat === 'mort') continue;
      // Un joueur éjecté hors de la vue n'entraîne pas la caméra avec lui.
      const x = Math.max(v.x0, Math.min(v.x1, j.x));
      const y = Math.max(v.y0, Math.min(v.y1, j.y));
      x0 = Math.min(x0, x - 300);
      x1 = Math.max(x1, x + 300);
      y0 = Math.min(y0, y - 330);
      y1 = Math.max(y1, y + 230); // de la place pour le panneau du bas
    }
    if (x0 === Infinity) { x0 = v.x0; x1 = v.x1; y0 = v.y0; y1 = v.y1; }
    // Le cœur de l'arène reste toujours dans le cadre : on voit où l'on va retomber.
    const hautSols = Math.min(...C.carte.sols.map((sol) => sol.y));
    x0 = Math.min(x0, C.carte.centre - 450);
    x1 = Math.max(x1, C.carte.centre + 450);
    y1 = Math.max(y1, hautSols + 230);

    const z = Math.max(zmin, Math.min(ZOOM_MAX, C.LARGEUR / (x1 - x0), C.HAUTEUR / (y1 - y0)));
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    if (!cam.pret) {
      Object.assign(cam, { x: cx, y: cy, z, pret: true });
    } else {
      // Mouvement amorti : la caméra glisse au lieu de sauter.
      const k = 1 - Math.pow(0.92, dt);
      cam.z += (z - cam.z) * k;
      cam.x += (cx - cam.x) * k;
      cam.y += (cy - cam.y) * k;
    }
    // On ne montre jamais ce qui dépasse la vue de la carte.
    const demiL = C.LARGEUR / (2 * cam.z);
    const demiH = C.HAUTEUR / (2 * cam.z);
    cam.x = v.x1 - v.x0 <= demiL * 2 ? (v.x0 + v.x1) / 2 : Math.max(v.x0 + demiL, Math.min(v.x1 - demiL, cam.x));
    cam.y = v.y1 - v.y0 <= demiH * 2 ? (v.y0 + v.y1) / 2 : Math.max(v.y0 + demiH, Math.min(v.y1 - demiH, cam.y));
  }

  /** Coordonnées écran d'un point du monde. */
  function versEcran(x, y) {
    return [(x - cam.x) * cam.z + C.LARGEUR / 2, (y - cam.y) * cam.z + C.HAUTEUR / 2];
  }

  // ===========================================================================
  // SONS — tout est synthétisé avec la Web Audio API, aucun fichier audio.
  // ===========================================================================
  let actx = null;
  let tamponBruit = null;

  /** Les navigateurs n'autorisent le son qu'après une action de l'utilisateur. */
  function activerAudio() {
    if (!actx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      actx = new Ctx();
      // Une seconde de bruit blanc, réutilisée pour tous les impacts.
      tamponBruit = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
      const donnees = tamponBruit.getChannelData(0);
      for (let i = 0; i < donnees.length; i++) donnees[i] = Math.random() * 2 - 1;
    }
    if (actx.state === 'suspended') actx.resume();
  }

  /** Une note qui glisse de f0 à f1. */
  function ton(f0, f1, duree, forme, volume) {
    if (!actx) return;
    const t0 = actx.currentTime;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = forme;
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + duree);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duree);
    osc.connect(gain).connect(actx.destination);
    osc.start(t0);
    osc.stop(t0 + duree + 0.02);
  }

  /** Un souffle de bruit filtré, dont le filtre glisse de f0 à f1. */
  function bruit(duree, f0, f1, volume, type) {
    if (!actx) return;
    const t0 = actx.currentTime;
    const source = actx.createBufferSource();
    source.buffer = tamponBruit;
    source.loop = true;
    const filtre = actx.createBiquadFilter();
    filtre.type = type || 'lowpass';
    filtre.frequency.setValueAtTime(f0, t0);
    filtre.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + duree);
    const gain = actx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duree);
    source.connect(filtre).connect(gain).connect(actx.destination);
    source.start(t0, Math.random() * 0.5);
    source.stop(t0 + duree + 0.02);
  }

  const sons = {
    saut() { ton(300, 620, 0.12, 'square', 0.05); },
    doubleSaut() { ton(460, 940, 0.13, 'square', 0.05); },
    atterrissage() { bruit(0.07, 500, 120, 0.12); },
    frappe() { bruit(0.11, 2400, 500, 0.13, 'bandpass'); },
    coup(force) {
      const k = Math.min(1, force / 22);
      ton(200 - 80 * k, 45, 0.12 + 0.2 * k, 'sine', 0.3 + 0.25 * k);
      bruit(0.06 + 0.16 * k, 3500, 300, 0.2 + 0.25 * k);
      if (k > 0.55) ton(900, 120, 0.25, 'sawtooth', 0.1);
    },
    pare() { ton(1300, 900, 0.09, 'triangle', 0.16); },
    brise() { ton(1600, 150, 0.5, 'square', 0.14); bruit(0.4, 5000, 400, 0.25); },
    esquive() { bruit(0.14, 900, 3000, 0.08, 'bandpass'); },
    dash() { bruit(0.18, 500, 3200, 0.1, 'bandpass'); ton(180, 520, 0.12, 'sawtooth', 0.025); },
    ko() {
      bruit(1.0, 6000, 80, 0.5);
      ton(1000, 50, 0.9, 'sawtooth', 0.16);
      ton(120, 30, 0.7, 'sine', 0.5);
    },
  };

  // ===========================================================================
  // CLAVIER
  // ===========================================================================
  // On utilise event.code (position physique de la touche) : KeyW/KeyA/KeyS/KeyD
  // correspondent à ZQSD sur un clavier AZERTY et à WASD sur un QWERTY.
  const TOUCHES_RESEAU = {
    ArrowLeft: T.GAUCHE, ArrowRight: T.DROITE, ArrowUp: T.HAUT, ArrowDown: T.BAS,
    KeyA: T.GAUCHE, KeyD: T.DROITE, KeyW: T.HAUT, KeyS: T.BAS,
    Space: T.SAUT,
    KeyJ: T.LEGER, KeyK: T.FORT, KeyL: T.BOUCLIER, ShiftLeft: T.ESQUIVE, ShiftRight: T.ESQUIVE,
    KeyC: T.LEGER, KeyV: T.FORT, KeyB: T.BOUCLIER, KeyN: T.ESQUIVE,
    KeyU: T.ATTRAPE, KeyI: T.SPECIAL, KeyX: T.ATTRAPE, KeyF: T.SPECIAL,
    KeyE: T.DASH,
  };
  let TOUCHES = TOUCHES_RESEAU;
  // Touches 1 à 9 (rangée du haut ou pavé numérique) : choix du personnage ; P : le suivant.
  // Seuls les personnages débloqués (voir progression.js) peuvent être choisis.
  const CHOIX_PERSO = {};
  Object.keys(PERSOS).slice(0, 9).forEach((cle, i) => {
    CHOIX_PERSO['Digit' + (i + 1)] = cle;
    CHOIX_PERSO['Numpad' + (i + 1)] = cle;
  });
  const persoDebloque = (id) => !NB.progression || NB.progression.estDebloque(id);

  /** Demande le personnage débloqué qui suit celui qu'on joue. */
  function persoSuivant() {
    const ids = Object.keys(PERSOS).filter(persoDebloque);
    const i = ids.indexOf(moi.perso);
    envoyer({ t: 'perso', perso: ids[(i + 1) % ids.length] });
  }
  const enfoncees = new Set();
  // Touches enfoncées depuis le dernier tick : un appui très bref (enfoncé puis
  // relâché entre deux ticks) est ainsi quand même pris en compte.
  let appuisBrefs = 0;

  window.addEventListener('keydown', (e) => {
    activerAudio();
    // Dans une zone de texte (code à coller…), les touches servent à écrire.
    if (e.target && /^(TEXTAREA|INPUT)$/.test(e.target.tagName)) return;
    if (e.code in TOUCHES) {
      enfoncees.add(e.code);
      appuisBrefs |= TOUCHES[e.code];
      e.preventDefault(); // empêche les flèches / Espace de faire défiler la page
    } else if (!enLocal && e.code === 'Tab' && !e.repeat) {
      // Carte suivante (pour tout le monde).
      e.preventDefault();
      const ids = Object.keys(C.CARTES);
      envoyer({ t: 'carte', id: ids[(ids.indexOf(C.carte.id) + 1) % ids.length] });
    } else if (!enLocal && e.code === 'KeyP' && !e.repeat) {
      persoSuivant();
    } else if (!enLocal && e.code in CHOIX_PERSO && !e.repeat) {
      if (persoDebloque(CHOIX_PERSO[e.code])) envoyer({ t: 'perso', perso: CHOIX_PERSO[e.code] });
    }
  });
  window.addEventListener('keyup', (e) => enfoncees.delete(e.code));
  // Si la fenêtre perd le focus, on relâche tout (sinon une touche reste « collée »).
  window.addEventListener('blur', () => enfoncees.clear());
  window.addEventListener('pointerdown', activerAudio);

  function lireTouches() {
    let masque = appuisBrefs | appuisTactiles | masqueTactile;
    appuisBrefs = 0;
    appuisTactiles = 0;
    for (const code of enfoncees) masque |= TOUCHES[code];
    return masque;
  }

  // ===========================================================================
  // COMMANDES TACTILES — téléphones et tablettes
  // Le joystick et les boutons produisent les mêmes bits que le clavier :
  // tout le reste du jeu (prédiction, serveur…) ne voit aucune différence.
  // ===========================================================================
  const TACTILE = /[?&]tactile=1/.test(location.search)
    || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    || 'ontouchstart' in window;
  let masqueTactile = 0;   // touches maintenues à l'écran
  let appuisTactiles = 0;  // touches enfoncées depuis le dernier tick
  let masqueManette = 0;
  let masqueBoutons = 0;

  function majTactile(nouveau, ancien) {
    appuisTactiles |= nouveau & ~ancien;
    masqueTactile = masqueManette | masqueBoutons;
  }

  if (TACTILE) {
    document.body.classList.add('tactile');
    // Pas de menu contextuel sur un appui long.
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // --- Joystick : gauche/droite pour bouger, haut pour sauter, bas pour descendre ---
    const manette = document.getElementById('manette');
    const manche = document.getElementById('manche');
    let doigtManette = null;
    let centre = null;
    const bougerManette = (e) => {
      let dx = (e.clientX - centre.x) / centre.r;
      let dy = (e.clientY - centre.y) / centre.r;
      const n = Math.hypot(dx, dy);
      if (n > 1) { dx /= n; dy /= n; }
      manche.style.transform = 'translate(' + (dx * centre.r * 0.55) + 'px,' + (dy * centre.r * 0.55) + 'px)';
      let m = 0;
      if (dx < -0.35) m |= T.GAUCHE;
      if (dx > 0.35) m |= T.DROITE;
      if (dy < -0.55) m |= T.HAUT;
      if (dy > 0.55) m |= T.BAS;
      const ancien = masqueManette;
      masqueManette = m;
      majTactile(m, ancien);
    };
    manette.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      activerAudio();
      doigtManette = e.pointerId;
      manette.setPointerCapture(e.pointerId);
      const r = manette.getBoundingClientRect();
      centre = { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 };
      bougerManette(e);
    });
    manette.addEventListener('pointermove', (e) => { if (e.pointerId === doigtManette) bougerManette(e); });
    const lacherManette = (e) => {
      if (e.pointerId !== doigtManette) return;
      doigtManette = null;
      masqueManette = 0;
      manche.style.transform = '';
      majTactile(0, 0);
    };
    manette.addEventListener('pointerup', lacherManette);
    manette.addEventListener('pointercancel', lacherManette);

    // --- Boutons d'action : enfoncés tant que le doigt reste dessus ---
    for (const bouton of document.querySelectorAll('#boutons button')) {
      const bit = T[bouton.dataset.touche];
      const lacher = () => {
        bouton.classList.remove('appuye');
        masqueBoutons &= ~bit;
        majTactile(0, 0);
      };
      bouton.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        activerAudio();
        bouton.setPointerCapture(e.pointerId);
        bouton.classList.add('appuye');
        const ancien = masqueBoutons;
        masqueBoutons |= bit;
        majTactile(masqueBoutons, ancien);
      });
      bouton.addEventListener('pointerup', lacher);
      bouton.addEventListener('pointercancel', lacher);
    }

    // --- Barre du haut ---
    document.getElementById('barre-tactile').addEventListener('click', (e) => {
      const bouton = e.target.closest('button');
      if (!bouton) return;
      const action = bouton.dataset.action;
      if (action === 'menu') {
        location.reload();
      } else if (action === 'perso') {
        persoSuivant();
      } else if (action === 'carte') {
        const ids = Object.keys(C.CARTES);
        envoyer({ t: 'carte', id: ids[(ids.indexOf(C.carte.id) + 1) % ids.length] });
      } else if (action === 'plein') {
        pleinEcran();
      }
    });
  }

  /** Plein écran et, si le téléphone le permet, orientation paysage bloquée. */
  function pleinEcran() {
    const el = document.documentElement;
    const demande = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!demande) return;
    const promesse = demande.call(el);
    if (promesse && promesse.then) {
      promesse.then(() => {
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
      }).catch(() => {});
    }
  }

  /** Affiche la manette (une fois la partie lancée) ; les boutons réseau seulement en réseau. */
  function montrerManette(reseau) {
    document.body.classList.add('en-jeu');
    for (const b of document.querySelectorAll('#tactile .reseau-seul')) b.style.display = reseau ? '' : 'none';
  }

  // ===========================================================================
  // ÉTAT DU CLIENT
  // ===========================================================================
  let socket = null;
  let persoVoulu = null; // personnage choisi dans le menu, pour le mode réseau
  let socketFourni = null;           // connexion toute faite (partie sans serveur) au lieu d'un WebSocket
  let etiquetteReseau = 'arène libre'; // nom du mode affiché en haut à gauche
  let serveurManuel = null; // adresse de la VM saisie à la main (page ouverte comme simple fichier)
  // Version « un seul fichier HTML » : NB.local existe et peut faire tourner la
  // partie dans la page, sans serveur (voir game/local.js).
  const LOCAL = NB.local || null;
  let enLocal = false;
  let monId = null;

  // Joueur local (prédit) : mêmes champs que sur le serveur.
  const moi = Object.assign(physics.nouvelEtat(0, 0), { perso: 'ondine', connu: false });
  let precedent = { x: 0, y: 0 };      // position au tick précédent (lissage d'affichage)
  let enAttente = [];                   // inputs envoyés, pas encore acquittés
  let seq = 0;                          // numéro du prochain input
  const erreur = { x: 0, y: 0 };        // écart de correction, résorbé en douceur

  // Derniers états reçus, pour interpoler les autres joueurs.
  let delaiInterpolation = 100;         // retard d'affichage des autres joueurs (ms)
  let historique = [];                  // [{ temps, joueurs: Map(id -> joueur) }]

  // Effets visuels.
  // Projectiles et zones des capacités, tels que reçus du serveur.
  let objets = [];
  let tempsObjets = 0;

  let particules = [];
  let ondes = [];                       // anneaux qui s'élargissent
  let rayons = [];                      // faisceaux d'éjection
  let secousse = 0;                     // amplitude du tremblement d'écran
  let flash = 0;                        // éclair blanc plein écran

  // ===========================================================================
  // RÉSEAU
  // ===========================================================================
  function envoyer(message) {
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }

  // Adresses possibles du WebSocket du serveur de jeu, essayées à tour de rôle :
  //   1. « /ws » sur la même adresse que la page : Apache relaie au serveur
  //      de jeu (voir deploy/neon-brawl-apache.conf), seul le port 80 sert ;
  //   2. le port 3000 directement, si Apache n'a pas ce relais.
  // Quand la page est servie par le serveur de jeu lui-même, l'adresse 1 suffit.
  function adressesServeur() {
    // Page ouverte comme simple fichier : l'adresse de la VM a été saisie dans le menu.
    if (serveurManuel) {
      const h = serveurManuel.replace(/^\\w+:\\/\\//, '').replace(/\\/.*$/, '');
      return h.indexOf(':') >= 0 ? ['ws://' + h + '/ws'] : ['ws://' + h + '/ws', 'ws://' + h + ':3000/ws'];
    }
    const ws = location.protocol === 'https:' ? 'wss://' : 'ws://';
    const hote = location.hostname || 'localhost';
    if (!LOCAL) return [ws + location.host + '/ws'];
    const liste = [ws + hote + ':3000/ws'];
    if (location.protocol.startsWith('http')) liste.unshift(ws + location.host + '/ws');
    return liste;
  }
  let essai = 0;
  let echecs = 0; // tentatives ratées d'affilée

  /** Explique à l'écran pourquoi le multijoueur ne se connecte pas. */
  function expliquerEchec() {
    const hote = location.hostname || '(fichier ouvert sans serveur web)';
    const adresses = adressesServeur().map((a) => '<code>' + a + '</code>').join(' puis ');
    let conseils = '';
    if (serveurManuel) {
      conseils = '<li>Vérifie l\\'adresse saisie (<code>' + serveurManuel.replace(/</g, '&lt;') + '</code>) : '
        + 'c\\'est celle de la VM (<code>hostname -I</code>), et le téléphone doit être sur le même Wi-Fi.</li>';
    } else if (location.protocol === 'file:') {
      conseils = '<li>Ce fichier a été ouvert directement depuis le disque. Pour jouer à plusieurs, ouvre '
        + 'plutôt <code>http://&lt;IP-de-la-VM&gt;/</code> dans le navigateur.</li>';
    } else if (hote === 'localhost' || hote === '127.0.0.1') {
      conseils = '<li>Tu as ouvert <code>' + hote + '</code> : ça ne marche que sur la VM elle-même. '
        + 'Les autres PC doivent utiliser l\\'adresse IP de la VM.</li>';
    }
    window.alerteNB('Serveur de jeu introuvable',
      '<p>La page s\\'affiche, mais le serveur de jeu (celui qui relie les joueurs) ne répond pas.<br>'
      + 'Adresses essayées : ' + adresses + '.</p><ul>' + conseils
      + '<li>Sur la VM, vérifie qu\\'il tourne : <code>sudo systemctl status neon-brawl</code><br>'
      + 'sinon : <code>sudo systemctl restart neon-brawl</code></li>'
      + '<li>Pour trouver ce qui bloque : <code>sudo bash deploy/diagnostic.sh</code></li>'
      + '<li>En attendant, tu peux jouer sur ce PC : touche <code>Échap</code>, puis « Jouer ».</li></ul>'
      + '<p>Nouvelle tentative automatique toutes les secondes…</p>');
  }

  function connecter() {
    elStatut.textContent = 'connexion…';
    let ouvert = false;
    if (socketFourni) {
      socket = socketFourni();
    } else if (enLocal) {
      socket = LOCAL.creerSocket();
    } else {
      const adresses = adressesServeur();
      socket = new WebSocket(adresses[essai % adresses.length]);
      socket.addEventListener('open', () => {
        ouvert = true;
        echecs = 0;
        window.alerteNB('');
      });
    }

    socket.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data);
      if (msg.t === 'bienvenue') {
        monId = msg.id;
        // En réseau, on applique le personnage choisi dans le menu.
        if (persoVoulu && !enLocal) envoyer({ t: 'perso', perso: persoVoulu });
        moi.connu = false;
        enAttente = [];
        historique = [];
      } else if (msg.t === 'etat') {
        recevoirEtat(msg);
      }
    });

    socket.addEventListener('close', () => {
      if (socketFourni) {
        // Partie sans serveur : si l'hôte part, la partie est finie.
        monId = null;
        elStatut.textContent = 'connexion perdue';
        window.alerteNB('Partie terminée',
          '<p>La connexion avec l\\'hôte a été coupée (il a quitté la partie, ou le réseau a lâché).</p>'
          + '<p>Appuie sur <code>Échap</code> (ou le bouton Menu) pour revenir au menu.</p>');
        return;
      }
      // Jamais ouverte : on essaiera l'autre adresse. Sinon, on retente la même.
      if (!ouvert) {
        essai++;
        echecs++;
        if (echecs >= 4 && !enLocal) expliquerEchec();
      }
      elStatut.textContent = ouvert
        ? 'déconnecté — nouvelle tentative…'
        : 'serveur de jeu introuvable — nouvelle tentative…';
      monId = null;
      setTimeout(connecter, ouvert ? 1000 : 600);
    });
  }

  function recevoirEtat(etat) {
    const carte = new Map();
    for (const j of etat.joueurs) carte.set(j.id, j);

    // Sons et petits effets déduits du changement d'état de chaque joueur.
    const ancien = historique.length ? historique[historique.length - 1].joueurs : null;
    if (ancien) {
      for (const j of etat.joueurs) {
        const avant = ancien.get(j.id);
        if (avant) effetsDeTransition(avant, j);
      }
    }
    for (const ev of etat.ev) jouerEvenement(ev, carte);
    objets = etat.objets || [];
    // Le serveur a changé de carte : on la charge et on redessine le décor.
    if (etat.carte && etat.carte !== carteDessinee) {
      if (etat.carte !== C.carte.id) C.choisirCarte(etat.carte);
      dessinerFond();
    }
    tempsObjets = performance.now();

    historique.push({ temps: performance.now(), joueurs: carte });
    if (historique.length > 30) historique.shift();

    const humains = etat.joueurs.filter((j) => j.nom !== 'Mannequin').length;
    elStatut.textContent = (enLocal ? 'partie locale' : etiquetteReseau + ' · ' + humains + ' joueur(s) en ligne') + ' · ' + C.carte.nom;

    // --- Réconciliation du joueur local ---
    const officiel = carte.get(monId);
    if (!officiel) return;

    const avantX = moi.x;
    const avantY = moi.y;

    // 1. On repart de l'état du serveur…
    for (const champ of physics.CHAMPS) moi[champ] = officiel[champ];
    moi.perso = officiel.perso;
    // 2. …on oublie les inputs déjà traités…
    enAttente = enAttente.filter((input) => input.seq > officiel.acq);
    // 3. …et on rejoue ceux qui ne le sont pas encore.
    for (const input of enAttente) physics.avancerJoueur(moi, input.touches);

    if (!moi.connu) {
      moi.connu = true;
      precedent.x = moi.x;
      precedent.y = moi.y;
      return;
    }

    // S'il y a un écart avec ce qu'on affichait, on ne « téléporte » pas le
    // personnage : on garde l'écart de côté et on le réduit sur quelques images.
    erreur.x += avantX - moi.x;
    erreur.y += avantY - moi.y;
    if (Math.abs(erreur.x) > 120 || Math.abs(erreur.y) > 120) {
      erreur.x = 0;
      erreur.y = 0;
      precedent.x = moi.x;
      precedent.y = moi.y;
    }
  }

  // ===========================================================================
  // EFFETS
  // ===========================================================================
  function etincelles(x, y, couleur, nombre, vitesse, angle, ouverture) {
    for (let i = 0; i < nombre; i++) {
      const a = angle === undefined ? Math.random() * Math.PI * 2 : angle + (Math.random() - 0.5) * ouverture;
      const v = vitesse * (0.3 + Math.random() * 0.7);
      const vie = 18 + Math.random() * 22;
      particules.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        vie, max: vie, couleur, taille: 2 + Math.random() * 3,
      });
    }
  }

  function poussiere(x, y) {
    for (let i = 0; i < 6; i++) {
      const vie = 12 + Math.random() * 10;
      particules.push({
        x: x + (Math.random() - 0.5) * 20, y,
        vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 1.2,
        vie, max: vie, couleur: '#8fa0d8', taille: 3,
      });
    }
  }

  /** Compare deux états successifs d'un joueur pour déclencher sons et poussières. */
  function effetsDeTransition(avant, apres) {
    if (apres.etat === 'mort') return;
    if (apres.nAtk > avant.nAtk) sons.frappe();
    if (avant.sol && !apres.sol && apres.vy < -5 && apres.etat !== 'sonne') {
      sons.saut();
      poussiere(avant.x, avant.y);
    } else if (!avant.sol && !apres.sol && apres.sauts < avant.sauts) {
      sons.doubleSaut();
      ondes.push({ x: apres.x, y: apres.y, r: 6, vr: 3, vie: 12, max: 12, couleur: apres.couleur });
    }
    if (!avant.sol && apres.sol && avant.etat !== 'mort') {
      sons.atterrissage();
      poussiere(apres.x, apres.y);
    }
    if (apres.etat === 'esquive' && avant.etat !== 'esquive') sons.esquive();
    if (apres.etat === 'dash' && avant.etat !== 'dash') {
      sons.dash();
      ondes.push({ x: apres.x - apres.dir * 20, y: apres.y - 30, r: 4, vr: 2.5, vie: 10, max: 10, couleur: '#ffffff' });
      if (apres.sol) poussiere(apres.x, apres.y);
    }
  }

  /** Événements envoyés par le serveur : coups, parades, éjections. */
  function jouerEvenement(ev, carte) {
    const victime = carte.get(ev.id);
    const couleur = victime ? victime.couleur : '#ffffff';

    if (ev.t === 'coup') {
      sons.coup(ev.f);
      etincelles(ev.x, ev.y, '#ffffff', 6 + ev.f, 3 + ev.f * 0.5);
      const teinte = ELEMENTS[ev.el] ? ELEMENTS[ev.el].couleur : couleur;
      etincelles(ev.x, ev.y, teinte, 8 + ev.f, 2 + ev.f * 0.5);
      ondes.push({ x: ev.x, y: ev.y, r: 8, vr: 3 + ev.f * 0.3, vie: 14, max: 14, couleur: '#ffffff' });
      // Tremblement d'écran uniquement sur les gros coups.
      if (ev.f > 11) secousse = Math.max(secousse, Math.min(22, ev.f * 0.9));
    } else if (ev.t === 'eclat') {
      // Un projectile s'écrase, ou un piège se déclenche.
      etincelles(ev.x, ev.y, ELEMENTS[ev.el] ? ELEMENTS[ev.el].couleur : '#ffffff', 14, 6);
      sons.atterrissage();
    } else if (ev.t === 'pare') {
      sons.pare();
      etincelles(ev.x, ev.y, couleur, 8, 4);
    } else if (ev.t === 'brise') {
      sons.brise();
      etincelles(ev.x, ev.y, couleur, 40, 9);
      ondes.push({ x: ev.x, y: ev.y, r: 20, vr: 7, vie: 22, max: 22, couleur });
      secousse = Math.max(secousse, 12);
    } else if (ev.t === 'ko') {
      sons.ko();
      // Explosion dirigée vers le centre de l'arène, depuis le bord de sortie.
      const angle = Math.atan2(cam.y - ev.y, cam.x - ev.x);
      etincelles(ev.x, ev.y, couleur, 70, 26, angle, 0.7);
      etincelles(ev.x, ev.y, '#ffffff', 40, 20, angle, 0.5);
      rayons.push({ x: ev.x, y: ev.y, angle, vie: 34, max: 34, couleur });
      secousse = 24;
      flash = 0.55;
    }
  }

  // ===========================================================================
  // TICK LOCAL (60 Hz) : lecture du clavier, envoi, prédiction
  // ===========================================================================
  function tickLocal() {
    if (!moi.connu || !socket || socket.readyState !== WebSocket.OPEN) return;

    const input = { seq: ++seq, touches: lireTouches() };
    socket.send(JSON.stringify({ t: 'input', seq: input.seq, touches: input.touches }));

    precedent.x = moi.x;
    precedent.y = moi.y;
    physics.avancerJoueur(moi, input.touches);

    enAttente.push(input);
    if (enAttente.length > 120) enAttente.shift();
  }

  // ===========================================================================
  // INTERPOLATION DES AUTRES JOUEURS
  // ===========================================================================
  function joueursInterpoles() {
    if (historique.length === 0) return [];
    const cible = performance.now() - delaiInterpolation;

    // On cherche les deux états qui encadrent l'instant « cible ».
    let a = historique[0];
    let b = historique[0];
    for (let i = historique.length - 1; i >= 0; i--) {
      if (historique[i].temps <= cible) {
        a = historique[i];
        b = historique[i + 1] || historique[i];
        break;
      }
    }
    const duree = b.temps - a.temps;
    const k = duree > 0 ? Math.min(1, Math.max(0, (cible - a.temps) / duree)) : 0;

    const resultat = [];
    for (const [id, jb] of b.joueurs) {
      const ja = a.joueurs.get(id) || jb;
      // Pas de glissement entre le point d'éjection et le point de réapparition.
      const saut = ja.etat === 'mort' || jb.etat === 'mort';
      resultat.push(Object.assign({}, ja, {
        x: saut ? ja.x : ja.x + (jb.x - ja.x) * k,
        y: saut ? ja.y : ja.y + (jb.y - ja.y) * k,
      }));
    }
    return resultat;
  }

  // ===========================================================================
  // DÉCORS — chaque carte a son paysage. La partie fixe est dessinée une seule
  // fois dans une image (« fond ») ; une petite partie animée (nuages, lave,
  // vagues, neige…) est redessinée à chaque image.
  // Tout est dessiné en coordonnées du monde (mêmes unités que la physique).
  // ===========================================================================
  // Deux images préparées à chaque changement de carte :
  //   « fond »  : le paysage lointain (ciel, montagnes…), en basse résolution ;
  //               il défile moins vite que l'arène (effet de profondeur) ;
  //   « scene » : les sols, plateformes et décorations, à l'échelle 1.
  const fond = document.createElement('canvas');
  const scene = document.createElement('canvas');
  const RES_FOND = 0.5;
  // Les paysages sont dessinés dans leur propre repère, de 1620 × 920 unités
  // (x de -170 à 1450, y de -60 à 860), agrandi pour couvrir toute la vue.
  // MONDE : zone couverte, dans ce repère. PAYSAGE : passage au repère du monde
  // (x_monde = ox + s × x_paysage).
  const MONDE = { x0: -170, x1: 1450, y0: -60, y1: 860 };
  const PAYSAGE = { s: 1, ox: 0, oy: 0 };
  const ZONE_FOND = { x0: 0, y0: 0, l: 1, h: 1 };  // zone du monde couverte par « fond »
  const ZONE_SCENE = { x0: 0, y0: 0 };             // coin haut gauche de « scene » dans le monde
  const CONTOUR = '#1d1a26';                               // couleur des contours

  /** Générateur pseudo-aléatoire : les décors sont toujours identiques. */
  function aleaGraine(graine) {
    return () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647; };
  }

  function degradeV(f, y0, y1, arrets) {
    const d = f.createLinearGradient(0, y0, 0, y1);
    for (const [k, c] of arrets) d.addColorStop(k, c);
    return d;
  }

  function remplirCiel(f, arrets) {
    f.fillStyle = degradeV(f, MONDE.y0, MONDE.y1, arrets);
    f.fillRect(MONDE.x0, MONDE.y0, MONDE.x1 - MONDE.x0, MONDE.y1 - MONDE.y0);
  }

  function disque(f, x, y, r, couleur) {
    f.fillStyle = couleur;
    f.beginPath();
    f.arc(x, y, r, 0, Math.PI * 2);
    f.fill();
  }

  /** Halo lumineux doux (soleil, lune, lueur de lave…). */
  function halo(f, x, y, r, couleur) {
    const d = f.createRadialGradient(x, y, 0, x, y, r);
    d.addColorStop(0, couleur);
    d.addColorStop(1, 'rgba(0,0,0,0)');
    f.fillStyle = d;
    f.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function nuage(f, x, y, s, couleur) {
    f.fillStyle = couleur;
    f.beginPath();
    for (const [dx, dy, r] of [[0, 0, 30], [30, -16, 28], [62, -4, 30], [34, 10, 28], [-28, 8, 22], [90, 10, 20]]) {
      f.moveTo(x + dx * s + r * s, y + dy * s);
      f.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    }
    f.fill();
  }

  /**
   * Une ligne de collines (douces) ou de montagnes (pointues) qui couvre toute
   * la largeur. Renvoie les sommets, pour y ajouter des détails.
   */
  function relief(f, alea, y, amplitude, pas, couleur, pointu) {
    const pts = [];
    for (let x = MONDE.x0 - pas; x <= MONDE.x1 + pas; x += pas * (0.7 + alea() * 0.6)) {
      const k = pointu ? (pts.length % 2 ? 0.2 : 1) : 0.4 + 0.6 * alea();
      pts.push([x, y - amplitude * k * (0.6 + alea() * 0.4)]);
    }
    f.fillStyle = couleur;
    f.beginPath();
    f.moveTo(pts[0][0], MONDE.y1);
    f.lineTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      if (pointu) {
        f.lineTo(pts[i][0], pts[i][1]);
      } else {
        const mx = (pts[i - 1][0] + pts[i][0]) / 2;
        const my = (pts[i - 1][1] + pts[i][1]) / 2;
        f.quadraticCurveTo(pts[i - 1][0], pts[i - 1][1], mx, my);
      }
    }
    f.lineTo(pts[pts.length - 1][0], MONDE.y1);
    f.closePath();
    f.fill();
    return pts;
  }

  function arbre(f, x, y, s, feuillage, ombre) {
    f.fillStyle = '#6b4a2b';
    f.fillRect(x - 5 * s, y - 40 * s, 10 * s, 40 * s);
    f.fillStyle = feuillage;
    f.beginPath();
    for (const [dx, dy, r] of [[0, -62, 26], [-20, -46, 20], [20, -46, 20], [0, -40, 22]]) {
      f.moveTo(x + dx * s + r * s, y + dy * s);
      f.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    }
    f.fill();
    f.fillStyle = ombre;
    f.beginPath();
    f.arc(x + 10 * s, y - 40 * s, 16 * s, 0, Math.PI * 2);
    f.fill();
  }

  function sapin(f, x, y, s, couleur, neige) {
    f.fillStyle = '#4a3526';
    f.fillRect(x - 4 * s, y - 14 * s, 8 * s, 14 * s);
    for (let i = 0; i < 3; i++) {
      const base = y - 10 * s - i * 22 * s;
      const largeur = (30 - i * 7) * s;
      f.fillStyle = couleur;
      f.beginPath();
      f.moveTo(x - largeur, base);
      f.lineTo(x, base - 36 * s);
      f.lineTo(x + largeur, base);
      f.closePath();
      f.fill();
      if (neige) {
        f.fillStyle = neige;
        f.beginPath();
        f.moveTo(x - largeur * 0.45, base - 20 * s);
        f.lineTo(x, base - 36 * s);
        f.lineTo(x + largeur * 0.45, base - 20 * s);
        f.closePath();
        f.fill();
      }
    }
  }

  function palmier(f, x, y, s, penche) {
    f.strokeStyle = CONTOUR;
    f.lineWidth = 3;
    // Tronc courbé, fait de segments.
    let px = x;
    let py = y;
    for (let i = 0; i < 7; i++) {
      const nx = px + penche * 5 * s;
      const ny = py - 22 * s;
      f.fillStyle = i % 2 ? '#a5753f' : '#8c5f30';
      f.beginPath();
      f.moveTo(px - 8 * s, py);
      f.lineTo(nx - 7 * s, ny);
      f.lineTo(nx + 7 * s, ny);
      f.lineTo(px + 8 * s, py);
      f.closePath();
      f.fill();
      f.stroke();
      px = nx;
      py = ny;
    }
    // Feuilles.
    for (const a of [-2.7, -2.1, -1.5, -0.9, -0.35, 0.2, -3.2]) {
      f.fillStyle = '#3e9b45';
      f.beginPath();
      f.moveTo(px, py);
      const ex = px + Math.cos(a) * 75 * s;
      const ey = py + Math.sin(a) * 40 * s + 22 * s;
      f.quadraticCurveTo(px + Math.cos(a) * 40 * s, py + Math.sin(a) * 50 * s - 10 * s, ex, ey);
      f.quadraticCurveTo(px + Math.cos(a) * 40 * s, py + Math.sin(a) * 30 * s + 6 * s, px, py);
      f.fill();
      f.stroke();
    }
    disque(f, px - 6 * s, py + 6 * s, 6 * s, '#6b4a2b');
    disque(f, px + 6 * s, py + 8 * s, 6 * s, '#6b4a2b');
  }

  /**
   * Un sol (bloc plein) : un corps qui s'effile vers le bas, et une couche de
   * dessus (herbe, neige, sable, dallage…).
   *   st.corps   : [couleur du haut, couleur du bas]
   *   st.dessus  : couleur de la couche du dessus, st.epaisseur : son épaisseur
   *   st.pointe  : profondeur de la pointe sous le bloc (0 = bloc droit)
   *   st.motif   : fonction de détails (f, s)
   */
  function dessinerSol(f, s, st) {
    const bas = profondeurSol(s);
    const alea = aleaGraine(Math.round(s.x0 * 7 + s.y));
    f.lineJoin = 'round';
    f.lineCap = 'round';
    f.lineWidth = 4;
    f.strokeStyle = CONTOUR;

    // Corps.
    f.beginPath();
    f.moveTo(s.x0, s.y + 4);
    f.lineTo(s.x1, s.y + 4);
    f.lineTo(s.x1 - 6, bas);
    if (st.pointe) {
      const n = 8;
      for (let i = 1; i < n; i++) {
        const k = i / n;
        const x = s.x1 - 6 - (s.x1 - s.x0 - 12) * k;
        const profondeur = Math.sin(k * Math.PI) * st.pointe * (0.75 + 0.25 * alea());
        f.lineTo(x, bas + profondeur);
      }
    }
    f.lineTo(s.x0 + 6, bas);
    f.closePath();
    f.fillStyle = degradeV(f, s.y, bas + (st.pointe || 0), [[0, st.corps[0]], [1, st.corps[1]]]);
    f.fill();
    f.stroke();

    if (st.motif) {
      f.save();
      f.clip();
      st.motif(f, s, bas, alea);
      f.restore();
    }

    // Couche du dessus, avec un bord inférieur ondulé.
    const ep = st.epaisseur || 18;
    f.beginPath();
    f.moveTo(s.x0 - 6, s.y + 6);
    f.quadraticCurveTo(s.x0 - 6, s.y - 2, s.x0 + 4, s.y - 2);
    f.lineTo(s.x1 - 4, s.y - 2);
    f.quadraticCurveTo(s.x1 + 6, s.y - 2, s.x1 + 6, s.y + 6);
    for (let x = s.x1 + 6; x >= s.x0 - 6; x -= 20) {
      f.lineTo(x, s.y + ep + (st.ondule ? Math.sin(x * 0.11) * 5 + 4 : 0));
    }
    f.closePath();
    f.fillStyle = st.dessus;
    f.fill();
    f.stroke();
    // Reflet clair sur le dessus.
    f.strokeStyle = st.reflet || 'rgba(255,255,255,0.35)';
    f.lineWidth = 3;
    f.beginPath();
    f.moveTo(s.x0 + 8, s.y + 3);
    f.lineTo(s.x1 - 8, s.y + 3);
    f.stroke();
    if (st.dessusMotif) st.dessusMotif(f, s, alea);
  }

  /** Une plateforme fine, traversable. */
  function dessinerPlateforme(f, pl, st) {
    const ep = st.epaisseur || 14;
    f.lineJoin = 'round';
    f.lineWidth = 3.5;
    f.strokeStyle = CONTOUR;
    f.fillStyle = st.corps;
    f.beginPath();
    f.roundRect(pl.x0 - 4, pl.y - 1, pl.x1 - pl.x0 + 8, ep, 6);
    f.fill();
    f.stroke();
    f.fillStyle = st.dessus;
    f.beginPath();
    f.roundRect(pl.x0 - 4, pl.y - 1, pl.x1 - pl.x0 + 8, ep * 0.45, [6, 6, 0, 0]);
    f.fill();
    f.stroke();
    if (st.motif) st.motif(f, pl, ep);
  }

  // ---------------------------------------------------------------------------
  // Les six décors
  // ---------------------------------------------------------------------------
  const DECORS = {
    // ----- Prairie : ciel bleu, collines, île flottante herbeuse -----
    prairie: {
      fond(f) {
        const alea = aleaGraine(11);
        remplirCiel(f, [[0, '#4fa8ec'], [0.55, '#a3d8f7'], [1, '#e6f6ff']]);
        halo(f, 1230, 60, 220, 'rgba(255,250,210,0.85)');
        disque(f, 1230, 60, 52, '#fff7cf');
        for (const [x, y, s] of [[40, 70, 1.3], [430, 20, 0.9], [830, 120, 1.1]]) nuage(f, x, y, s, '#ffffff');
        relief(f, alea, 560, 190, 260, '#b4dcc0', false);
        relief(f, alea, 650, 160, 210, '#86c777', false);
        for (let i = 0; MONDE.x0 + 60 + i * 175 < MONDE.x1; i++) {
          const x = MONDE.x0 + 60 + i * 175 + alea() * 70;
          arbre(f, x, 650 + alea() * 50, 0.8 + alea() * 0.5, '#4f9f3c', 'rgba(0,0,0,0.12)');
        }
        f.fillStyle = '#5aa448';
        f.fillRect(MONDE.x0, 740, MONDE.x1 - MONDE.x0, MONDE.y1 - 740);
      },
      sol: {
        corps: ['#a8743f', '#5f3c1f'], dessus: '#66c23f', epaisseur: 22, ondule: true, pointe: 140,
        motif(f, s, bas, alea) {
          // Cailloux dans la terre.
          for (let i = 0; i < 26; i++) {
            const x = s.x0 + alea() * (s.x1 - s.x0);
            const y = s.y + 34 + alea() * (bas - s.y + 60);
            f.fillStyle = alea() < 0.5 ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.12)';
            f.beginPath();
            f.ellipse(x, y, 6 + alea() * 10, 4 + alea() * 5, 0, 0, Math.PI * 2);
            f.fill();
          }
        },
        dessusMotif(f, s, alea) {
          // Brins d'herbe et fleurs.
          f.lineWidth = 2;
          f.strokeStyle = '#3f8f2a';
          for (let x = s.x0; x < s.x1; x += 9) {
            f.beginPath();
            f.moveTo(x, s.y - 1);
            f.lineTo(x + 2, s.y - 6 - alea() * 6);
            f.stroke();
          }
          for (let i = 0; i < 14; i++) {
            const x = s.x0 + 20 + alea() * (s.x1 - s.x0 - 40);
            disque(f, x, s.y - 5, 3.5, ['#ffffff', '#ffe14a', '#ff7aa8'][i % 3]);
          }
        },
      },
      plateforme: { corps: '#8a5c32', dessus: '#66c23f', epaisseur: 16 },
      anim(f, t) {
        // Nuages qui dérivent lentement.
        for (const [y, s, v, d] of [[200, 0.8, 0.012, 0], [40, 1.0, 0.008, 700], [300, 0.6, 0.016, 1200]]) {
          const x = MONDE.x0 - 200 + ((t * v + d) % (MONDE.x1 - MONDE.x0 + 400));
          nuage(f, x, y, s, 'rgba(255,255,255,0.75)');
        }
      },
    },

    // ----- Volcan : ciel rouge, volcan en éruption, mer de lave -----
    volcan: {
      fond(f) {
        const alea = aleaGraine(23);
        remplirCiel(f, [[0, '#1d0b12'], [0.45, '#5a1a17'], [0.8, '#b8401c'], [1, '#f07a2a']]);
        // Le volcan au loin, son panache de fumée et ses coulées.
        f.fillStyle = '#2b1416';
        f.beginPath();
        f.moveTo(260, 760);
        f.lineTo(560, 150);
        f.lineTo(700, 150);
        f.lineTo(1040, 760);
        f.closePath();
        f.fill();
        for (let i = 0; i < 9; i++) {
          disque(f, 630 + (alea() - 0.3) * 90 * (i / 3), 120 - i * 26, 40 + i * 9, 'rgba(70,55,55,' + (0.75 - i * 0.06) + ')');
        }
        halo(f, 630, 150, 120, 'rgba(255,140,40,0.9)');
        f.strokeStyle = '#ff7a1c';
        f.lineWidth = 6;
        f.lineCap = 'round';
        for (const [x0, x1] of [[590, 470], [650, 760], [620, 640]]) {
          f.beginPath();
          f.moveTo(x0, 155);
          f.quadraticCurveTo((x0 + x1) / 2 + 30, 420, x1, 700);
          f.stroke();
        }
        relief(f, alea, 700, 160, 150, '#3a1c1c', true);
        relief(f, alea, 760, 90, 110, '#241012', true);
        halo(f, 640, 900, 700, 'rgba(255,110,30,0.55)');
      },
      sol: {
        corps: ['#4a3b3a', '#1e1617'], dessus: '#6a5450', epaisseur: 16, pointe: 110, reflet: 'rgba(255,190,150,0.25)',
        motif(f, s, bas, alea) {
          // Fissures où rougeoie la lave.
          f.strokeStyle = '#ff7a1c';
          f.lineWidth = 3;
          for (let i = 0; i < 6; i++) {
            let x = s.x0 + 30 + alea() * (s.x1 - s.x0 - 60);
            let y = s.y + 24;
            f.beginPath();
            f.moveTo(x, y);
            for (let k = 0; k < 4; k++) { x += (alea() - 0.5) * 40; y += 20 + alea() * 30; f.lineTo(x, y); }
            f.stroke();
          }
        },
      },
      plateforme: {
        corps: '#6a5652', dessus: '#b0948c', epaisseur: 16,
        motif(f, pl, ep) {
          f.strokeStyle = '#ff7a1c';
          f.lineWidth = 2;
          f.beginPath();
          f.moveTo(pl.x0 + 30, pl.y + ep - 3);
          f.lineTo(pl.x0 + 50, pl.y + ep * 0.6);
          f.lineTo(pl.x0 + 75, pl.y + ep - 2);
          f.stroke();
        },
      },
      anim(f, t) {
        // Mer de lave qui ondule.
        f.fillStyle = degradeV(f, 760, 860, [[0, '#ffb02a'], [0.3, '#ff6a14'], [1, '#a8200c']]);
        f.beginPath();
        f.moveTo(MONDE.x0, MONDE.y1);
        for (let x = MONDE.x0; x <= MONDE.x1; x += 30) {
          f.lineTo(x, 770 + Math.sin(x * 0.02 + t * 0.002) * 8 + Math.sin(x * 0.05 - t * 0.003) * 4);
        }
        f.lineTo(MONDE.x1, MONDE.y1);
        f.closePath();
        f.fill();
        // Bulles et braises qui montent.
        for (let i = 0; i < 18; i++) {
          const cycle = (t * 0.0004 + i * 0.137) % 1;
          const x = MONDE.x0 + ((i * 397) % (MONDE.x1 - MONDE.x0));
          const y = 780 - cycle * 700;
          f.globalAlpha = 1 - cycle;
          disque(f, x + Math.sin(cycle * 12 + i) * 18, y, 2.5, '#ffb347');
        }
        f.globalAlpha = 1;
      },
    },

    // ----- Plage : coucher de soleil sur la mer, île de sable -----
    plage: {
      fond(f) {
        const alea = aleaGraine(5);
        remplirCiel(f, [[0, '#3c4fa8'], [0.35, '#b46aa0'], [0.62, '#ff9a6a'], [0.7, '#ffd27a'], [1, '#ffd27a']]);
        halo(f, 640, 560, 330, 'rgba(255,220,140,0.8)');
        disque(f, 640, 560, 90, '#ffe9a8');
        for (const [x, y, s] of [[80, 120, 1.1], [1100, 70, 1.3], [500, 200, 0.7]]) nuage(f, x, y, s, 'rgba(255,190,170,0.75)');
        // Îles lointaines.
        f.fillStyle = '#7a4a6a';
        f.beginPath();
        f.ellipse(80, 575, 230, 50, 0, Math.PI, 0);
        f.ellipse(1260, 575, 180, 38, 0, Math.PI, 0);
        f.fill();
        // La mer et le reflet du soleil.
        f.fillStyle = degradeV(f, 570, MONDE.y1, [[0, '#3f7fbf'], [1, '#173a6a']]);
        f.fillRect(MONDE.x0, 570, MONDE.x1 - MONDE.x0, MONDE.y1 - 570);
        f.fillStyle = 'rgba(255,225,150,0.7)';
        for (let i = 0; i < 14; i++) {
          const y = 580 + i * 14;
          const l = 120 - i * 6 + alea() * 40;
          f.fillRect(640 - l / 2 + (alea() - 0.5) * 30, y, l, 3);
        }
      },
      sol: {
        corps: ['#c99a5c', '#7a6455'], dessus: '#f4d58e', epaisseur: 20, ondule: true, pointe: 90,
        motif(f, s, bas, alea) {
          for (let i = 0; i < 30; i++) {
            disque(f, s.x0 + alea() * (s.x1 - s.x0), s.y + 30 + alea() * 140, 2 + alea() * 4, 'rgba(90,60,30,0.25)');
          }
        },
        dessusMotif(f, s) {
          // Coquillages et étoile de mer.
          disque(f, s.x0 + 120, s.y - 3, 5, '#ffffff');
          disque(f, s.x1 - 160, s.y - 3, 4, '#ffd0e0');
          f.fillStyle = '#ff7a5a';
          f.beginPath();
          for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + (i * Math.PI) / 5;
            const r = i % 2 ? 4 : 10;
            f.lineTo(s.x0 + 260 + Math.cos(a) * r, s.y - 6 + Math.sin(a) * r * 0.6);
          }
          f.fill();
        },
      },
      plateforme: {
        corps: '#9a6b3d', dessus: '#c08a52', epaisseur: 14,
        motif(f, pl, ep) {
          // Planches de bois.
          f.strokeStyle = CONTOUR;
          f.lineWidth = 2;
          for (let x = pl.x0 + 30; x < pl.x1; x += 34) {
            f.beginPath();
            f.moveTo(x, pl.y);
            f.lineTo(x, pl.y + ep - 2);
            f.stroke();
          }
        },
      },
      decoration(f, carte) {
        // Palmiers sur l'île (purement décoratifs, derrière les joueurs).
        const s = carte.sols[0];
        palmier(f, s.x0 + 50, s.y, 1.1, 1);
        palmier(f, s.x1 - 70, s.y, 0.95, -1);
        palmier(f, (s.x0 + s.x1) / 2 + 160, s.y, 0.8, 1);
      },
      anim(f, t) {
        // Vagues au pied de l'île.
        for (let k = 0; k < 3; k++) {
          f.strokeStyle = 'rgba(255,255,255,' + (0.55 - k * 0.15) + ')';
          f.lineWidth = 3;
          f.beginPath();
          for (let x = MONDE.x0; x <= MONDE.x1; x += 20) {
            const y = 640 + k * 50 + Math.sin(x * 0.03 + t * 0.002 + k) * 5;
            if (x === MONDE.x0) f.moveTo(x, y); else f.lineTo(x, y);
          }
          f.stroke();
        }
        // Mouettes.
        f.strokeStyle = '#3a2a3a';
        f.lineWidth = 2.5;
        for (let i = 0; i < 3; i++) {
          const x = MONDE.x0 + ((t * (0.03 + i * 0.01) + i * 600) % (MONDE.x1 - MONDE.x0));
          const y = 120 + i * 50 + Math.sin(t * 0.002 + i) * 10;
          const aile = Math.sin(t * 0.012 + i) * 6;
          f.beginPath();
          f.moveTo(x - 12, y - aile);
          f.quadraticCurveTo(x - 5, y - 6, x, y);
          f.quadraticCurveTo(x + 5, y - 6, x + 12, y - aile);
          f.stroke();
        }
      },
    },

    // ----- Sommet enneigé : nuit, aurore boréale, montagnes et sapins -----
    sommet: {
      fond(f) {
        const alea = aleaGraine(41);
        remplirCiel(f, [[0, '#08142e'], [0.5, '#1f3a6a'], [1, '#7f9fcf']]);
        for (let i = 0; i < 160; i++) disque(f, MONDE.x0 + alea() * (MONDE.x1 - MONDE.x0), MONDE.y0 + alea() * 480, alea() < 0.85 ? 1.2 : 2, 'rgba(255,255,255,0.8)');
        // Aurore boréale : des voiles verts et bleus.
        for (const [y, couleur] of [[90, 'rgba(90,255,180,0.22)'], [150, 'rgba(120,200,255,0.18)'], [60, 'rgba(160,120,255,0.14)']]) {
          f.fillStyle = couleur;
          f.beginPath();
          f.moveTo(MONDE.x0, y);
          for (let x = MONDE.x0; x <= MONDE.x1; x += 40) f.lineTo(x, y + Math.sin(x * 0.006 + y) * 40);
          for (let x = MONDE.x1; x >= MONDE.x0; x -= 40) f.lineTo(x, y + 90 + Math.sin(x * 0.006 + y) * 40);
          f.closePath();
          f.fill();
        }
        disque(f, 180, 110, 40, '#f2f4ff');
        disque(f, 196, 100, 36, '#cfd9f2');
        // Montagnes aux sommets enneigés.
        for (const [y, amp, pas, couleur] of [[560, 330, 230, '#4a6390'], [640, 240, 190, '#33496e']]) {
          const pts = relief(f, alea, y, amp, pas, couleur, true);
          f.fillStyle = '#eef4ff';
          for (let i = 0; i < pts.length; i += 2) {
            const [px, py] = pts[i];
            const g = pts[i - 1] || [px - 100, py + 200];
            const d = pts[i + 1] || [px + 100, py + 200];
            f.beginPath();
            f.moveTo(px, py);
            f.lineTo(px + (g[0] - px) * 0.3, py + (g[1] - py) * 0.3);
            f.lineTo(px + (g[0] - px) * 0.18, py + (g[1] - py) * 0.36);
            f.lineTo(px, py + (g[1] - py) * 0.25);
            f.lineTo(px + (d[0] - px) * 0.3, py + (d[1] - py) * 0.3);
            f.closePath();
            f.fill();
          }
        }
        for (let i = 0; MONDE.x0 + 40 + i * 120 < MONDE.x1; i++) sapin(f, MONDE.x0 + 40 + i * 120 + alea() * 40, 760 + alea() * 40, 1 + alea() * 0.6, '#1f3b3a', '#eef4ff');
        f.fillStyle = '#e8f0ff';
        f.fillRect(MONDE.x0, 800, MONDE.x1 - MONDE.x0, MONDE.y1 - 800);
      },
      sol: {
        corps: ['#7d8ea3', '#3c4658'], dessus: '#f4f8ff', epaisseur: 22, ondule: true, pointe: 90, reflet: 'rgba(170,200,255,0.6)',
        motif(f, s, bas, alea) {
          f.fillStyle = 'rgba(0,0,0,0.15)';
          for (let i = 0; i < 16; i++) {
            const x = s.x0 + alea() * (s.x1 - s.x0);
            const y = s.y + 40 + alea() * 160;
            f.beginPath();
            f.moveTo(x, y);
            f.lineTo(x + 30, y + 8);
            f.lineTo(x + 8, y + 22);
            f.closePath();
            f.fill();
          }
        },
        dessusMotif(f, s) {
          // Stalactites de glace sous les bords.
          f.fillStyle = '#cfeaff';
          f.strokeStyle = CONTOUR;
          f.lineWidth = 2;
          for (const x of [s.x0 + 4, s.x0 + 26, s.x1 - 26, s.x1 - 4]) {
            f.beginPath();
            f.moveTo(x - 7, s.y + 20);
            f.lineTo(x, s.y + 46);
            f.lineTo(x + 7, s.y + 20);
            f.fill();
            f.stroke();
          }
        },
      },
      plateforme: { corps: '#9fd2f2', dessus: '#f4f8ff', epaisseur: 16 },
      anim(f, t) {
        // Neige qui tombe.
        f.fillStyle = 'rgba(255,255,255,0.85)';
        for (let i = 0; i < 70; i++) {
          const v = 0.03 + (i % 5) * 0.01;
          const y = MONDE.y0 + ((t * v + i * 131) % (MONDE.y1 - MONDE.y0));
          const x = MONDE.x0 + ((i * 263) % (MONDE.x1 - MONDE.x0)) + Math.sin(t * 0.001 + i) * 20;
          f.beginPath();
          f.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
          f.fill();
        }
      },
    },

    // ----- Ruines célestes : au-dessus des nuages, temple de marbre -----
    ruines: {
      fond(f) {
        const alea = aleaGraine(77);
        remplirCiel(f, [[0, '#5d9be6'], [0.6, '#bcd8f0'], [1, '#ffe9c4']]);
        // Rayons de lumière.
        f.fillStyle = 'rgba(255,245,210,0.18)';
        for (let i = 0; i < 6; i++) {
          f.beginPath();
          f.moveTo(1100, -60);
          f.lineTo(200 + i * 230, 860);
          f.lineTo(290 + i * 230, 860);
          f.closePath();
          f.fill();
        }
        // Rochers flottants lointains avec colonnes brisées.
        for (const [x, y, s] of [[60, 260, 0.8], [1250, 200, 1], [900, 120, 0.5], [300, 120, 0.45]]) {
          f.fillStyle = 'rgba(150,140,170,0.55)';
          f.beginPath();
          f.moveTo(x - 80 * s, y);
          f.lineTo(x + 80 * s, y);
          f.lineTo(x + 20 * s, y + 90 * s);
          f.lineTo(x - 30 * s, y + 70 * s);
          f.closePath();
          f.fill();
          f.fillStyle = 'rgba(240,235,250,0.6)';
          f.fillRect(x - 50 * s, y - 90 * s, 18 * s, 90 * s);
          f.fillRect(x + 25 * s, y - 55 * s, 18 * s, 55 * s);
        }
        // Mer de nuages.
        f.fillStyle = '#ffffff';
        f.fillRect(MONDE.x0, 760, MONDE.x1 - MONDE.x0, MONDE.y1 - 760);
        for (let i = 0; MONDE.x0 + i * 66 < MONDE.x1; i++) nuage(f, MONDE.x0 + i * 66 + alea() * 30, 720 + alea() * 50, 1.2 + alea() * 0.6, i % 2 ? '#ffffff' : '#f2f0ff');
      },
      sol: {
        corps: ['#d8cbb0', '#9a8a70'], dessus: '#f4efe4', epaisseur: 18, pointe: 120, reflet: 'rgba(255,255,255,0.7)',
        motif(f, s, bas) {
          // Grosses pierres taillées.
          f.strokeStyle = 'rgba(80,60,40,0.35)';
          f.lineWidth = 2;
          for (let y = s.y + 40, rang = 0; y < bas + 80; y += 32, rang++) {
            f.beginPath();
            f.moveTo(s.x0, y);
            f.lineTo(s.x1, y);
            for (let x = s.x0 + (rang % 2 ? 40 : 0); x < s.x1; x += 80) {
              f.moveTo(x, y - 32);
              f.lineTo(x, y);
            }
            f.stroke();
          }
        },
        dessusMotif(f, s) {
          // Dalles et liseré doré.
          f.strokeStyle = 'rgba(120,100,70,0.45)';
          f.lineWidth = 2;
          for (let x = s.x0 + 50; x < s.x1; x += 50) {
            f.beginPath();
            f.moveTo(x, s.y);
            f.lineTo(x, s.y + 16);
            f.stroke();
          }
          f.strokeStyle = '#d9a93a';
          f.lineWidth = 3;
          f.beginPath();
          f.moveTo(s.x0, s.y + 22);
          f.lineTo(s.x1, s.y + 22);
          f.stroke();
        },
      },
      plateforme: {
        corps: '#e6dccb', dessus: '#f8f4ec', epaisseur: 16,
        motif(f, pl, ep) {
          f.fillStyle = '#d9a93a';
          f.fillRect(pl.x0 - 2, pl.y + ep - 5, pl.x1 - pl.x0 + 4, 3);
        },
      },
      decoration(f, carte) {
        // Colonnes brisées aux deux bouts du temple (décoratives).
        const s = carte.sols[0];
        for (const [x, h] of [[s.x0 + 30, 120], [s.x1 - 30, 80]]) {
          f.fillStyle = '#eee6d6';
          f.strokeStyle = CONTOUR;
          f.lineWidth = 3;
          f.beginPath();
          f.moveTo(x - 16, s.y);
          f.lineTo(x - 16, s.y - h);
          f.lineTo(x - 4, s.y - h - 10);
          f.lineTo(x + 6, s.y - h + 4);
          f.lineTo(x + 16, s.y - h - 6);
          f.lineTo(x + 16, s.y);
          f.closePath();
          f.fill();
          f.stroke();
          f.strokeStyle = 'rgba(0,0,0,0.15)';
          for (const dx of [-6, 4]) {
            f.beginPath();
            f.moveTo(x + dx, s.y - 4);
            f.lineTo(x + dx, s.y - h + 8);
            f.stroke();
          }
        }
      },
      anim(f, t) {
        // Quelques nuages qui passent devant la mer de nuages.
        for (let i = 0; i < 4; i++) {
          const x = MONDE.x0 - 200 + ((t * 0.02 + i * 450) % (MONDE.x1 - MONDE.x0 + 400));
          nuage(f, x, 790 + (i % 2) * 30, 1.4, 'rgba(255,255,255,0.9)');
        }
      },
    },

    // ----- Toits de la ville : nuit, gratte-ciel illuminés -----
    ville: {
      fond(f) {
        const alea = aleaGraine(99);
        remplirCiel(f, [[0, '#0b0f2a'], [0.55, '#2a2350'], [1, '#6a3a6a']]);
        for (let i = 0; i < 110; i++) disque(f, MONDE.x0 + alea() * (MONDE.x1 - MONDE.x0), MONDE.y0 + alea() * 420, 1.2, 'rgba(255,255,255,0.7)');
        halo(f, 1080, 120, 160, 'rgba(255,250,220,0.35)');
        disque(f, 1080, 120, 60, '#fff6d8');
        // Deux rangées d'immeubles avec des fenêtres allumées.
        for (const [base, hMin, hMax, couleur, fenetre] of [
          [700, 160, 420, '#262448', 'rgba(255,220,130,0.55)'],
          [780, 100, 300, '#1a1830', 'rgba(255,210,110,0.85)'],
        ]) {
          let x = MONDE.x0;
          while (x < MONDE.x1) {
            const l = 70 + alea() * 90;
            const h = hMin + alea() * (hMax - hMin);
            f.fillStyle = couleur;
            f.fillRect(x, base - h, l - 6, MONDE.y1 - base + h);
            if (alea() < 0.3) f.fillRect(x + l / 2 - 4, base - h - 40, 3, 40); // antenne
            f.fillStyle = fenetre;
            for (let fy = base - h + 14; fy < MONDE.y1; fy += 22) {
              for (let fx = x + 8; fx < x + l - 18; fx += 16) {
                if (alea() < 0.45) f.fillRect(fx, fy, 8, 11);
              }
            }
            x += l;
          }
        }
      },
      sol: {
        corps: ['#7a4a3c', '#3a2420'], dessus: '#6b6f7c', epaisseur: 16, pointe: 0, reflet: 'rgba(255,255,255,0.25)',
        motif(f, s, bas, alea) {
          // Briques et fenêtres de l'immeuble.
          f.strokeStyle = 'rgba(0,0,0,0.25)';
          f.lineWidth = 1.5;
          for (let y = s.y + 30; y < bas; y += 14) {
            f.beginPath();
            f.moveTo(s.x0, y);
            f.lineTo(s.x1, y);
            f.stroke();
          }
          for (let y = s.y + 60; y < bas; y += 90) {
            for (let x = s.x0 + 50; x < s.x1 - 60; x += 110) {
              f.fillStyle = alea() < 0.6 ? '#ffd27a' : '#2a2a3a';
              f.fillRect(x, y, 46, 52);
              f.strokeStyle = CONTOUR;
              f.lineWidth = 3;
              f.strokeRect(x, y, 46, 52);
              f.beginPath();
              f.moveTo(x + 23, y);
              f.lineTo(x + 23, y + 52);
              f.stroke();
            }
          }
        },
      },
      plateforme: { corps: '#555a66', dessus: '#7a7f8c', epaisseur: 14 },
      decoration(f, carte) {
        // Château d'eau et bouche d'aération sur les toits (décoratifs).
        const s = carte.sols[0];
        f.strokeStyle = CONTOUR;
        f.lineWidth = 3;
        const haut = carte.sols[carte.sols.length - 1];
        const x = haut.x1 - 140;
        f.fillStyle = '#4a3a30';
        f.fillRect(x - 30, haut.y - 50, 6, 50);
        f.fillRect(x + 24, haut.y - 50, 6, 50);
        f.fillStyle = '#8a5a3a';
        f.beginPath();
        f.roundRect(x - 40, haut.y - 120, 80, 72, 8);
        f.fill();
        f.stroke();
        f.fillStyle = '#5a3a2a';
        f.beginPath();
        f.moveTo(x - 46, haut.y - 120);
        f.lineTo(x, haut.y - 150);
        f.lineTo(x + 46, haut.y - 120);
        f.closePath();
        f.fill();
        f.stroke();
        f.fillStyle = '#8a909c';
        f.beginPath();
        f.roundRect(s.x0 + 90, s.y - 34, 70, 34, 4);
        f.fill();
        f.stroke();
      },
      anim(f, t) {
        // Lumières rouges qui clignotent au sommet des immeubles.
        if (Math.floor(t / 600) % 2) {
          for (const [x, y] of [[40, 300], [520, 360], [1180, 330], [900, 420]]) disque(f, x, y, 4, '#ff3a3a');
        }
      },
    },
  };

  let carteDessinee = C.carte.id; // carte dont le décor est dans « fond »

  /** Prépare les deux images du décor (« fond » et « scene ») pour la carte en cours. */
  function dessinerFond() {
    const carte = C.carte;
    const decor = DECORS[carte.decor] || DECORS.prairie;
    const v = carte.vue;
    carteDessinee = carte.id;
    cam.pret = false;

    // --- 1. Paysage lointain : il couvre la vue, avec une marge pour le défilement ---
    const marge = 0.2;
    ZONE_FOND.x0 = v.x0 - (v.x1 - v.x0) * marge;
    ZONE_FOND.y0 = v.y0 - (v.y1 - v.y0) * marge;
    ZONE_FOND.l = (v.x1 - v.x0) * (1 + 2 * marge);
    ZONE_FOND.h = (v.y1 - v.y0) * (1 + 2 * marge);
    PAYSAGE.s = (v.y1 - v.y0) / 920;
    PAYSAGE.ox = (v.x0 + v.x1) / 2 - 640 * PAYSAGE.s;
    PAYSAGE.oy = v.y0 + 60 * PAYSAGE.s;
    MONDE.x0 = (ZONE_FOND.x0 - PAYSAGE.ox) / PAYSAGE.s;
    MONDE.x1 = (ZONE_FOND.x0 + ZONE_FOND.l - PAYSAGE.ox) / PAYSAGE.s;
    MONDE.y0 = (ZONE_FOND.y0 - PAYSAGE.oy) / PAYSAGE.s;
    MONDE.y1 = (ZONE_FOND.y0 + ZONE_FOND.h - PAYSAGE.oy) / PAYSAGE.s;

    fond.width = Math.ceil(ZONE_FOND.l * RES_FOND);
    fond.height = Math.ceil(ZONE_FOND.h * RES_FOND);
    const f = fond.getContext('2d');
    f.setTransform(RES_FOND, 0, 0, RES_FOND, -ZONE_FOND.x0 * RES_FOND, -ZONE_FOND.y0 * RES_FOND);
    f.transform(PAYSAGE.s, 0, 0, PAYSAGE.s, PAYSAGE.ox, PAYSAGE.oy);
    decor.fond(f);

    // --- 2. L'arène : sols, plateformes et décorations ---
    const tout = carte.sols.concat(carte.plateformes);
    const x0 = Math.min(...tout.map((e) => e.x0)) - 140;
    const x1 = Math.max(...tout.map((e) => e.x1)) + 140;
    const y0 = Math.min(...tout.map((e) => e.y)) - 280;
    const y1 = Math.max(...carte.sols.map((e) => profondeurSol(e) + (decor.sol.pointe || 0))) + 30;
    scene.width = Math.ceil(x1 - x0);
    scene.height = Math.ceil(y1 - y0);
    ZONE_SCENE.x0 = x0;
    ZONE_SCENE.y0 = y0;
    const g = scene.getContext('2d');
    g.setTransform(1, 0, 0, 1, -x0, -y0);
    if (decor.decoration) decor.decoration(g, carte);
    for (const sol of carte.sols) dessinerSol(g, sol, decor.sol);
    for (const pl of carte.plateformes) dessinerPlateforme(g, pl, decor.plateforme);
  }

  /** Jusqu'où on dessine un sol vers le bas (les immeubles s'arrêtent hors champ). */
  function profondeurSol(sol) {
    return Math.min(sol.bas === undefined ? sol.y + 650 : sol.bas, sol.y + 650);
  }

  // Vignette sombre sur les bords de l'écran (préparée une fois).
  const vignette = ctx.createRadialGradient(640, 360, 320, 640, 360, 820);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.3)');

  /**
   * Dessine le décor complet pour la caméra actuelle : paysage (avec effet de
   * profondeur), sa partie animée, puis l'arène. Laisse le contexte dans le
   * repère du monde, prêt pour les personnages.
   */
  function dessinerDecor(t, dx, dy) {
    const v = C.carte.vue;
    const zmin = zoomMinimal();
    // Le paysage bouge et zoome moins que l'arène : il paraît lointain.
    const p = 0.35;
    const zb = zmin + (cam.z - zmin) * p;
    const bx = (v.x0 + v.x1) / 2 + (cam.x - (v.x0 + v.x1) / 2) * p;
    const by = (v.y0 + v.y1) / 2 + (cam.y - (v.y0 + v.y1) / 2) * p;
    ctx.setTransform(zb, 0, 0, zb, C.LARGEUR / 2 - bx * zb + dx * 0.4, C.HAUTEUR / 2 - by * zb + dy * 0.4);
    ctx.drawImage(fond, ZONE_FOND.x0, ZONE_FOND.y0, ZONE_FOND.l, ZONE_FOND.h);
    const decor = DECORS[C.carte.decor] || DECORS.prairie;
    if (decor.anim) {
      ctx.save();
      ctx.transform(PAYSAGE.s, 0, 0, PAYSAGE.s, PAYSAGE.ox, PAYSAGE.oy);
      decor.anim(ctx, t);
      ctx.restore();
    }
    ctx.setTransform(cam.z, 0, 0, cam.z, C.LARGEUR / 2 - cam.x * cam.z + dx, C.HAUTEUR / 2 - cam.y * cam.z + dy);
    ctx.drawImage(scene, ZONE_SCENE.x0, ZONE_SCENE.y0);
  }

  dessinerFond();

  /** Hauteur de la première surface sous le point (x, y), pour l'ombre des joueurs. */
  function surfaceDessous(x, y) {
    let meilleur = Infinity;
    for (const s of C.carte.sols) if (x >= s.x0 && x <= s.x1 && s.y >= y - 1 && s.y < meilleur) meilleur = s.y;
    for (const p of C.carte.plateformes) if (x >= p.x0 && x <= p.x1 && p.y >= y - 1 && p.y < meilleur) meilleur = p.y;
    return meilleur;
  }

  /** Ombre portée au sol sous chaque joueur. */
  function dessinerOmbre(j) {
    const S = PERSOS[j.perso] || PERSOS.ondine;
    const y = surfaceDessous(j.x, j.y);
    if (y === Infinity) return;
    const k = Math.max(0.25, 1 - (y - j.y) / 300);
    ctx.fillStyle = 'rgba(0,0,0,' + (0.3 * k) + ')';
    ctx.beginPath();
    ctx.ellipse(j.x, y + 2, S.l * 0.6 * k, 6 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ===========================================================================
  // PERSONNAGES — de petits combattants façon dessin animé : couleurs pleines
  // et contour sombre.
  // ===========================================================================

  /** Remplit le chemin courant avec la couleur, puis trace le contour sombre. */
  function forme(couleur) {
    ctx.fillStyle = couleur;
    ctx.fill();
    ctx.strokeStyle = CONTOUR;
    ctx.stroke();
  }

  /** Trait épais coloré, cerné de sombre (bras, jambes, écharpe…). */
  function traitCerne(couleur, largeur) {
    ctx.strokeStyle = CONTOUR;
    ctx.lineWidth = largeur + 4;
    ctx.stroke();
    ctx.strokeStyle = couleur;
    ctx.lineWidth = largeur;
    ctx.stroke();
    ctx.lineWidth = 3;
  }

  /** Éclaircit une couleur #rrggbb (k entre 0 et 1). */
  function eclaircir(couleur, k) {
    const n = parseInt(couleur.slice(1, 7), 16);
    const canal = (d) => Math.round(((n >> d) & 255) + (255 - ((n >> d) & 255)) * k);
    return 'rgb(' + canal(16) + ',' + canal(8) + ',' + canal(0) + ')';
  }

  function melanger(a, b, k) {
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  }

  // Apparence de chaque personnage : forme de la tête, du corps, et attribut.
  const STYLES = {
    braise: { tete: 'rond', attribut: 'flammes' },
    ondine: { tete: 'goutte', attribut: 'bulles', robe: true },
    brok:   { tete: 'carre', attribut: 'cornes', large: true, grossesMains: true, sourcils: true },
    zephyr: { tete: 'rond', attribut: 'ailes', robe: true },
    zip:    { tete: 'rond', attribut: 'oreilles' },
    givre:  { tete: 'hexagone', attribut: 'cristaux', large: true, anguleux: true, sourcils: true },
    sylve:  { tete: 'rond', attribut: 'capuche', robe: true },
    epine:  { tete: 'rond', attribut: 'pointes', large: true, grossesMains: true, sourcils: true, pointes: 5 },
    lumi:   { tete: 'rond', attribut: 'halo' },
    boulon: { tete: 'carre', attribut: 'antennes', large: true, anguleux: true, grossesMains: true },
    brume:  { tete: 'rond', attribut: 'bandeau' },
    orage:  { tete: 'rond', attribut: 'chapeau', robe: true },
    yeti:   { tete: 'carre', attribut: 'pointes', large: true, grossesMains: true, sourcils: true, pointes: 3, blanc: true },
    dragon: { tete: 'carre', attribut: 'cornes', large: true, grossesMains: true, sourcils: true },
    spectre:{ tete: 'goutte', attribut: 'halo', robe: true, fantome: true },
    colosse:{ tete: 'hexagone', attribut: 'casque', large: true, anguleux: true, grossesMains: true, sourcils: true },
    aurore: { tete: 'rond', attribut: 'couronne', robe: true },
  };

  /**
   * Petite icône d'arme, centrée en (x, y) : 0 arc, 1 boomerang, 2 pistolet, 3 bombe, 4 hache.
   * Sert dans la main de Sylve et dans le panneau du joueur.
   */
  function dessinerArme(i, x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = CONTOUR;
    if (i === 0) {
      ctx.beginPath();
      ctx.arc(-t * 0.3, 0, t, -1.25, 1.25);
      traitCerne('#c98b4a', 4);
      ctx.beginPath();
      ctx.moveTo(-t * 0.3 + Math.cos(-1.25) * t, Math.sin(-1.25) * t);
      ctx.lineTo(-t * 0.3 + Math.cos(1.25) * t, Math.sin(1.25) * t);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#f2f2f7';
      ctx.stroke();
    } else if (i === 1) {
      ctx.beginPath();
      ctx.arc(0, t * 0.2, t * 0.9, 3.6, 5.8);
      traitCerne('#d9a14a', 5);
    } else if (i === 2) {
      ctx.fillStyle = '#7b8494';
      ctx.fillRect(-t * 0.8, -t * 0.4, t * 1.7, t * 0.5);
      ctx.strokeRect(-t * 0.8, -t * 0.4, t * 1.7, t * 0.5);
      ctx.fillStyle = '#5b4636';
      ctx.fillRect(-t * 0.7, t * 0.05, t * 0.4, t * 0.7);
      ctx.strokeRect(-t * 0.7, t * 0.05, t * 0.4, t * 0.7);
    } else if (i === 3) {
      ctx.beginPath();
      ctx.arc(0, t * 0.1, t * 0.6, 0, Math.PI * 2);
      forme('#2a2a35');
      ctx.beginPath();
      ctx.moveTo(t * 0.3, -t * 0.4);
      ctx.lineTo(t * 0.6, -t * 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(t * 0.6, -t * 0.9, t * 0.15, 0, Math.PI * 2);
      forme('#ffb347');
    } else {
      ctx.beginPath();
      ctx.moveTo(0, t * 0.9);
      ctx.lineTo(0, -t * 0.7);
      traitCerne('#8a5c32', 4);
      ctx.beginPath();
      ctx.moveTo(0, -t * 0.7);
      ctx.lineTo(t * 0.9, -t * 0.9);
      ctx.lineTo(t * 0.8, t * 0.05);
      ctx.closePath();
      forme('#cfd6e3');
    }
    ctx.restore();
  }

  function dessinerPerso(j, estMoi) {
    const S = PERSOS[j.perso] || PERSOS.ondine;
    const l = S.l;
    const h = S.h;
    const e = S.taille;
    const maintenant = performance.now();
    const infos = (j.etat === 'attaque' || j.etat === 'charge') ? infosAttaque(j) : null;
    const touche = j.etat === 'sonne' && j.gel > 0; // vient de prendre un coup : flash blanc
    // Le corps prend la couleur de l'élément ; la couleur du joueur sert au
    // nom, au repère et au panneau du bas.
    const teinte = j.nom === 'Mannequin' ? j.couleur : ELEMENTS[S.element].couleur;
    const style = STYLES[j.perso] || STYLES.ondine;
    const couleur = touche ? '#ffffff' : teinte;

    ctx.save();
    ctx.translate(j.x, j.y);

    // Transparence : esquive, ou clignotement pendant l'invulnérabilité.
    if (j.etat === 'esquive') ctx.globalAlpha = 0.4;
    else if (j.invul > 0 && Math.floor(maintenant / 70) % 2) ctx.globalAlpha = 0.4;

    // --- Aura de charge ---
    if (j.etat === 'charge') {
      const k = Math.min(1, j.charge / C.CHARGE_MAX);
      const rayon = h * (0.55 + 0.35 * k) + Math.sin(maintenant / 40) * 3;
      const aura = ctx.createRadialGradient(0, -h / 2, rayon * 0.3, 0, -h / 2, rayon);
      aura.addColorStop(0, 'rgba(255,255,255,0)');
      aura.addColorStop(0.8, teinte + '55');
      aura.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, -h / 2, rayon, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Corps (tourné et retourné selon l'action) ---
    ctx.save();
    let rotation = 0;
    if (j.etat === 'sonne') {
      rotation = j.sol ? Math.sin(maintenant / 60) * 0.35 : (maintenant / 110) * (j.vx >= 0 ? 1 : -1);
    } else if (j.etat === 'esquive' && j.atk === 'roulade') {
      rotation = (j.t / 24) * Math.PI * 2 * (j.vx >= 0 ? 1 : -1);
    } else if (j.etat === 'attaque' && j.atk === 'air_neutre' && infos) {
      rotation = (j.t / infos.total) * Math.PI * 2 * j.dir;
    } else if (j.etat === 'dash') {
      rotation = 0.3 * j.dir; // penché vers l'avant
    }
    ctx.translate(0, -h / 2);
    ctx.rotate(rotation);
    // Petit tassement pendant l'élan du saut ou la charge.
    const tasse = (j.elan > 0 || j.etat === 'charge') ? 0.9 : 1;
    ctx.scale(j.dir, tasse);
    ctx.translate(0, h / 2 / tasse);

    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = CONTOUR;
    ctx.shadowBlur = 0;

    const rTete = l * 0.52;
    const yTete = -h + rTete;
    const yHautCorps = yTete + rTete * 0.75;
    const yHanche = -h * 0.2;
    const largeurCorps = l * (style.large ? 0.8 : 0.6);
    const enMarche = j.sol && Math.abs(j.vx) > 0.5;
    const pas = enMarche ? Math.sin(j.x * 0.14) : 0;

    // -- Position des mains --
    const rMain = l * (style.grossesMains ? 0.24 : 0.16);
    const reposAvant = [l * 0.46, -h * 0.42 - pas * 4];
    const reposArriere = [-l * 0.46, -h * 0.42 + pas * 4];
    let mainAvant = reposAvant;
    let mainArriere = reposArriere;

    if (j.etat === 'charge') {
      mainAvant = [-l * 0.3 + (Math.random() - 0.5) * 3, -h * 0.5 + (Math.random() - 0.5) * 3];
    } else if (j.etat === 'dash') {
      mainAvant = [-l * 0.5, -h * 0.45];
      mainArriere = [-l * 0.65, -h * 0.36];
    } else if (j.etat === 'bord') {
      // Suspendu au bord : les deux mains agrippées au rebord, devant lui.
      mainAvant = [l * 0.5, -h + 12];
      mainArriere = [l * 0.3, -h + 10];
    } else if (j.etat === 'bouclier') {
      mainAvant = [l * 0.5, -h * 0.6];
      mainArriere = [l * 0.2, -h * 0.5];
    } else if (j.etat === 'attaque' && infos) {
      const boites = infos.attaque.boites.length ? infos.attaque.boites : [infos.attaque.geste || [40, -34, 0]];
      const position = (repos, boite) => {
        const cible = [boite[0] * e, boite[1] * e];
        if (j.t <= infos.debut) {
          // Armement : la main recule un peu avant de frapper.
          return melanger(repos, cible, -0.3 * (j.t / infos.debut));
        }
        if (j.t <= infos.fin) return cible;
        return melanger(cible, repos, (j.t - infos.fin) / (infos.total - infos.fin));
      };
      mainAvant = position(reposAvant, boites[0]);
      if (boites[1]) mainArriere = position(reposArriere, boites[1]);
    }

    const dessinerMain = (pos) => {
      ctx.beginPath();
      ctx.arc(pos[0], pos[1], rMain, 0, Math.PI * 2);
      forme(couleur);
    };

    dessinerMain(mainArriere);

    // -- Jambes --
    const yPied = j.sol ? 0 : -h * 0.07;
    const ecart = l * 0.16;
    const balancement = j.sol ? pas * l * 0.32 : -l * 0.12;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(-ecart, yHanche); ctx.lineTo(-ecart + balancement, yPied - 3);
    ctx.moveTo(ecart, yHanche); ctx.lineTo(ecart - balancement, yPied - 3);
    traitCerne(couleur, 5);
    for (const px of [-ecart + balancement, ecart - balancement]) {
      ctx.beginPath();
      ctx.ellipse(px + l * 0.06, yPied - 3, l * 0.15, 3.5, 0, 0, Math.PI * 2);
      forme(couleur);
    }

    // -- Écharpe de Zip (derrière le corps) --
    if (style.attribut === 'oreilles') {
      const vent = Math.min(18, Math.abs(j.vx) * 2.5);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-l * 0.15, yHautCorps + 3);
      ctx.quadraticCurveTo(
        -l * 0.7, yHautCorps - 4 + Math.sin(maintenant / 90) * 5,
        -l * 0.95 - vent, yHautCorps + 6 + Math.sin(maintenant / 70) * 6
      );
      traitCerne('#e8304a', 6); // écharpe rouge
      ctx.restore();
    }

    // -- Ailes de Zéphyr (derrière le corps) : elles battent plus vite en l'air --
    if (style.attribut === 'ailes') {
      const battement = Math.sin(maintenant / (j.sol ? 260 : 60)) * 0.4;
      for (const k of [1, 0.7]) {
        ctx.save();
        ctx.translate(-l * 0.2, yHautCorps + 6);
        ctx.rotate(0.5 + battement * k + (1 - k));
        ctx.beginPath();
        ctx.ellipse(-l * 0.45 * k, 0, l * 0.45 * k, l * 0.17 * k, 0, 0, Math.PI * 2);
        forme(couleur);
        ctx.restore();
      }
    }

    // -- Tronc --
    ctx.beginPath();
    if (style.robe) {
      // Une petite robe en trapèze.
      ctx.moveTo(-largeurCorps * 0.35, yHautCorps);
      ctx.lineTo(largeurCorps * 0.35, yHautCorps);
      ctx.lineTo(largeurCorps * 0.75, yHanche + 2);
      ctx.lineTo(-largeurCorps * 0.75, yHanche + 2);
      ctx.closePath();
    } else {
      ctx.roundRect(-largeurCorps / 2, yHautCorps, largeurCorps, yHanche - yHautCorps + 3, style.anguleux ? 0 : 6);
    }
    forme(couleur);

    // -- Attributs derrière la tête --
    const hautTete = yTete - rTete * 0.75;
    if (style.attribut === 'oreilles') {
      // Zip : oreilles pointues.
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * rTete * 0.85, yTete - rTete * 0.35);
        ctx.lineTo(s * rTete * 0.75, yTete - rTete * 1.6);
        ctx.lineTo(s * rTete * 0.15, yTete - rTete * 0.85);
        ctx.closePath();
        forme(couleur);
      }
    } else if (style.attribut === 'cornes') {
      // Brok : cornes.
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * rTete * 0.55, hautTete);
        ctx.quadraticCurveTo(s * rTete * 1.5, yTete - rTete * 0.9, s * rTete * 1.25, yTete - rTete * 1.7);
        ctx.quadraticCurveTo(s * rTete * 0.95, yTete - rTete * 1.0, s * rTete * 0.9, yTete - rTete * 0.3);
        ctx.closePath();
        forme(couleur);
      }
    } else if (style.attribut === 'flammes') {
      // Braise : une chevelure de flammes qui danse.
      const pas = (rTete * 1.7) / 4;
      ctx.beginPath();
      ctx.moveTo(-rTete * 0.85, yTete - rTete * 0.3);
      for (let i = 0; i < 4; i++) {
        const x0 = -rTete * 0.85 + i * pas;
        const hauteur = rTete * (0.75 + 0.3 * Math.sin(maintenant / 80 + i * 1.9)) * (i % 2 ? 1.25 : 0.85);
        ctx.lineTo(x0 + pas * 0.2 - rTete * 0.25, hautTete - hauteur);
        ctx.lineTo(x0 + pas, hautTete);
      }
      ctx.lineTo(rTete * 0.85, yTete - rTete * 0.3);
      ctx.closePath();
      forme(couleur);
    } else if (style.attribut === 'cristaux') {
      // Givre : une couronne d'éclats de glace.
      for (const [dx, hauteur, demi] of [[-0.55, 0.8, 0.2], [0, 1.25, 0.24], [0.55, 0.9, 0.2]]) {
        ctx.beginPath();
        ctx.moveTo((dx - demi) * rTete, hautTete);
        ctx.lineTo((dx + 0.1) * rTete, hautTete - hauteur * rTete);
        ctx.lineTo((dx + demi) * rTete, hautTete);
        ctx.closePath();
        forme(couleur);
      }
    } else if (style.attribut === 'ailes') {
      // Zéphyr : un anneau de vent au-dessus de la tête.
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.ellipse(0, yTete - rTete * 1.4 + Math.sin(maintenant / 220) * 2, rTete * 0.62, rTete * 0.18, 0, 0, Math.PI * 2);
      traitCerne('#ffffff', 3);
    } else if (style.attribut === 'bulles') {
      // Ondine : deux bulles qui flottent derrière elle.
      ctx.shadowBlur = 0;
      for (const [dx, dy, r, v] of [[-1.35, -0.9, 4.5, 260], [-1.1, -1.55, 3, 190]]) {
        ctx.beginPath();
        ctx.arc(dx * rTete, yTete + dy * rTete + Math.sin(maintenant / v) * 4, r + 1, 0, Math.PI * 2);
        forme('#d8ecff');
      }
    }

    // -- Tête --
    ctx.beginPath();
    if (style.tete === 'carre') {
      ctx.roundRect(-rTete, yTete - rTete * 0.9, rTete * 2, rTete * 1.8, rTete * 0.55);
    } else if (style.tete === 'goutte') {
      // Une goutte d'eau, la pointe vers le haut et un peu en arrière.
      ctx.moveTo(-rTete * 0.25, yTete - rTete * 1.8);
      ctx.quadraticCurveTo(rTete * 0.95, yTete - rTete * 0.85, rTete, yTete);
      ctx.arc(0, yTete, rTete, 0, Math.PI);
      ctx.quadraticCurveTo(-rTete * 0.95, yTete - rTete * 0.8, -rTete * 0.25, yTete - rTete * 1.8);
      ctx.closePath();
    } else if (style.tete === 'hexagone') {
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 3;
        ctx.lineTo(Math.cos(a) * rTete * 1.08, yTete + Math.sin(a) * rTete * 1.08);
      }
      ctx.closePath();
    } else {
      ctx.arc(0, yTete, rTete, 0, Math.PI * 2);
    }
    forme(couleur);
    // Reflet clair sur la tête.
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(-rTete * 0.35, yTete - rTete * 0.45, rTete * 0.32, rTete * 0.18, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // -- Accessoires posés sur la tête (dessinés par-dessus) --
    const sommet = yTete - rTete;
    const at = style.attribut;
    if (at === 'capuche') {
      // Sylve : une capuche pointue, avec une plume.
      ctx.beginPath();
      ctx.moveTo(-rTete * 1.08, yTete + rTete * 0.05);
      ctx.quadraticCurveTo(-rTete * 0.9, sommet - rTete * 0.2, -rTete * 1.5, sommet - rTete * 0.9);
      ctx.quadraticCurveTo(rTete * 0.2, sommet - rTete * 0.5, rTete * 1.05, yTete - rTete * 0.12);
      ctx.quadraticCurveTo(0, yTete - rTete * 0.35, -rTete * 1.08, yTete + rTete * 0.05);
      ctx.closePath();
      forme(couleur);
      ctx.beginPath();
      ctx.ellipse(-rTete * 0.7, sommet - rTete * 0.55, rTete * 0.5, rTete * 0.14, -0.7, 0, Math.PI * 2);
      forme('#ffffff');
    } else if (at === 'chapeau') {
      // Orage : un chapeau pointu de mage, avec un bord.
      ctx.beginPath();
      ctx.moveTo(-rTete * 0.8, sommet + rTete * 0.2);
      ctx.quadraticCurveTo(-rTete * 0.2, sommet - rTete * 0.8, rTete * 0.6, sommet - rTete * 1.7);
      ctx.quadraticCurveTo(rTete * 0.55, sommet - rTete * 0.5, rTete * 0.8, sommet + rTete * 0.2);
      ctx.closePath();
      forme(couleur);
      ctx.beginPath();
      ctx.ellipse(0, sommet + rTete * 0.22, rTete * 1.25, rTete * 0.22, 0, 0, Math.PI * 2);
      forme(eclaircir(couleur, 0.3));
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(-rTete * 0.62, sommet - rTete * 0.1, rTete * 1.2, rTete * 0.18);
    } else if (at === 'couronne') {
      // Aurore : une couronne dorée.
      ctx.beginPath();
      ctx.moveTo(-rTete * 0.8, sommet + rTete * 0.3);
      ctx.lineTo(-rTete * 0.85, sommet - rTete * 0.5);
      ctx.lineTo(-rTete * 0.4, sommet - rTete * 0.05);
      ctx.lineTo(0, sommet - rTete * 0.7);
      ctx.lineTo(rTete * 0.4, sommet - rTete * 0.05);
      ctx.lineTo(rTete * 0.85, sommet - rTete * 0.5);
      ctx.lineTo(rTete * 0.8, sommet + rTete * 0.3);
      ctx.closePath();
      forme('#ffd23f');
    } else if (at === 'casque') {
      // Colosse : un casque de pierre.
      ctx.beginPath();
      ctx.moveTo(-rTete * 1.1, yTete - rTete * 0.15);
      ctx.quadraticCurveTo(-rTete * 1.1, sommet - rTete * 0.35, 0, sommet - rTete * 0.35);
      ctx.quadraticCurveTo(rTete * 1.1, sommet - rTete * 0.35, rTete * 1.1, yTete - rTete * 0.15);
      ctx.closePath();
      forme(eclaircir(couleur, 0.25));
      ctx.beginPath();
      ctx.moveTo(0, sommet - rTete * 0.35);
      ctx.lineTo(0, yTete - rTete * 0.15);
      ctx.stroke();
    } else if (at === 'bandeau') {
      // Brume : un bandeau de ninja avec deux pans qui flottent.
      ctx.fillStyle = '#2b2b3a';
      ctx.fillRect(-rTete * 1.02, yTete - rTete * 0.62, rTete * 2.04, rTete * 0.32);
      ctx.strokeRect(-rTete * 1.02, yTete - rTete * 0.62, rTete * 2.04, rTete * 0.32);
      for (const [dy, k] of [[0, 1], [0.18, 0.7]]) {
        ctx.beginPath();
        ctx.moveTo(-rTete * 1.0, yTete - rTete * (0.5 - dy));
        ctx.quadraticCurveTo(-rTete * 1.7, yTete - rTete * 0.7 + Math.sin(maintenant / 90 + dy * 9) * 5, -rTete * (2.0 * k + 0.4), yTete - rTete * (0.2 - dy) + Math.sin(maintenant / 70) * 7);
        traitCerne('#2b2b3a', 5);
      }
    } else if (at === 'halo') {
      // Lumi, Spectre : un anneau flottant au-dessus de la tête.
      ctx.beginPath();
      ctx.ellipse(0, sommet - rTete * 0.5 + Math.sin(maintenant / 260) * 2, rTete * 0.8, rTete * 0.2, 0, 0, Math.PI * 2);
      traitCerne(style.fantome ? '#d6c4ff' : '#fff3a0', 4);
    } else if (at === 'antennes') {
      // Boulon : deux antennes à bout rouge.
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * rTete * 0.5, sommet + rTete * 0.05);
        ctx.lineTo(sx * rTete * 0.8, sommet - rTete * 0.95);
        traitCerne('#6b7280', 3);
        ctx.beginPath();
        ctx.arc(sx * rTete * 0.8, sommet - rTete * 0.95, rTete * 0.2, 0, Math.PI * 2);
        forme(Math.floor(maintenant / 400) % 2 ? '#ff5a5a' : '#ffb0b0');
      }
    } else if (at === 'pointes') {
      // Épine, Yéti : une crinière de pointes.
      const n = style.pointes || 5;
      for (let i = 0; i < n; i++) {
        const k = n === 1 ? 0.5 : i / (n - 1);
        const x = (k - 0.5) * rTete * 1.7;
        const haut = rTete * (0.7 + 0.5 * Math.sin(k * Math.PI));
        ctx.beginPath();
        ctx.moveTo(x - rTete * 0.2, sommet + rTete * 0.25);
        ctx.lineTo(x + (k - 0.5) * rTete * 0.4, sommet - haut + rTete * 0.1);
        ctx.lineTo(x + rTete * 0.2, sommet + rTete * 0.25);
        ctx.closePath();
        forme(style.blanc ? '#f4fbff' : eclaircir(couleur, 0.15));
      }
    }

    // -- Yeux --
    const xYeux = rTete * 0.28;
    const ecartYeux = rTete * 0.3;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 0;
    if (j.etat === 'sonne') {
      // Yeux en croix quand on est sonné.
      ctx.strokeStyle = CONTOUR;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (const ox of [xYeux - ecartYeux, xYeux + ecartYeux]) {
        ctx.moveTo(ox - 4, yTete - 4); ctx.lineTo(ox + 4, yTete + 4);
        ctx.moveTo(ox + 4, yTete - 4); ctx.lineTo(ox - 4, yTete + 4);
      }
      ctx.stroke();
    } else {
      const concentre = j.etat === 'attaque' || j.etat === 'charge' || j.etat === 'bouclier';
      ctx.lineWidth = 2;
      for (const ox of [xYeux - ecartYeux, xYeux + ecartYeux]) {
        ctx.beginPath();
        ctx.ellipse(ox, yTete, rTete * 0.16, rTete * (concentre ? 0.17 : 0.27), 0, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = CONTOUR;
        ctx.stroke();
        // Pupille, tournée vers l'avant.
        ctx.fillStyle = CONTOUR;
        ctx.beginPath();
        ctx.arc(ox + rTete * 0.05, yTete + rTete * 0.02, rTete * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
      if (style.sourcils) {
        // Sourcils froncés.
        ctx.strokeStyle = CONTOUR;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(xYeux - ecartYeux - 6, yTete - rTete * 0.5);
        ctx.lineTo(xYeux + ecartYeux + 6, yTete - rTete * 0.28);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = CONTOUR;
    ctx.lineWidth = 3;

    dessinerMain(mainAvant);
    // Arme équipée (Sylve) : dans la main avant.
    if (S.spe1 && S.spe1.armes) {
      dessinerArme((j.arme | 0) % S.spe1.armes.length, mainAvant[0] + l * 0.05, mainAvant[1], l * 0.42);
    }
    ctx.restore(); // fin du corps tourné

    // --- Traînée lumineuse du coup, pendant qu'il est actif ---
    if (j.etat === 'attaque' && infos && j.t > infos.debut && j.t <= infos.fin + 2) {
      const k = Math.max(0, 1 - (j.t - infos.debut) / (infos.fin - infos.debut + 2));
      for (const [bx, by, rayon] of infos.attaque.boites) {
        const cx = bx * e * j.dir;
        const cy = by * e;
        const r = rayon * e;
        const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        halo.addColorStop(0, 'rgba(255,255,255,' + (0.75 * k) + ')');
        halo.addColorStop(0.5, teinte + '88');
        halo.addColorStop(1, teinte + '00');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // --- Bulle du bouclier (rétrécit quand le bouclier s'use) ---
    if (j.etat === 'bouclier') {
      const r = h * 0.72 * (0.45 + 0.55 * Math.max(0, j.bouclier) / C.BOUCLIER_MAX);
      ctx.shadowColor = teinte;
      ctx.shadowBlur = 0;
      ctx.fillStyle = teinte + '33';
      ctx.strokeStyle = teinte;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -h / 2, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // --- Nom au-dessus de la tête ---
    ctx.globalAlpha = 1;
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = CONTOUR;
    ctx.strokeText(j.nom, 0, -h - rTete * 0.9 - 14);
    ctx.fillStyle = j.couleur;
    ctx.fillText(j.nom, 0, -h - rTete * 0.9 - 14);
    if (S.spe1 && S.spe1.armes) {
      // Nom de l'arme équipée, juste au-dessus du nom.
      ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeText(S.spe1.armes[(j.arme | 0) % S.spe1.armes.length].nom, 0, -h - rTete * 0.9 - 32);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(S.spe1.armes[(j.arme | 0) % S.spe1.armes.length].nom, 0, -h - rTete * 0.9 - 32);
    }
    if (estMoi) {
      // Petit triangle pour repérer son propre personnage.
      ctx.fillStyle = j.couleur;
      ctx.beginPath();
      ctx.moveTo(-7, -h - rTete * 0.9 - 9);
      ctx.lineTo(7, -h - rTete * 0.9 - 9);
      ctx.lineTo(0, -h - rTete * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ===========================================================================
  // CAPACITÉS : projectiles et zones
  // ===========================================================================
  function dessinerObjets(maintenant) {
    // Entre deux états reçus, on prolonge la trajectoire des projectiles.
    const ticks = Math.min(4, (maintenant - tempsObjets) / (1000 / C.TICK_HZ));

    // Plusieurs capacités partagent un même dessin (la couleur de l'élément fait la différence).
    const ALIAS = { piege: 'givre', colonne: 'geyser', onde: 'seisme' };
    for (const objet of objets) {
      const o = ALIAS[objet.s] ? Object.assign({}, objet, { s: ALIAS[objet.s] }) : objet;
      const couleur = ELEMENTS[o.el] ? ELEMENTS[o.el].couleur : '#ffffff';
      ctx.save();
      ctx.strokeStyle = couleur;
      ctx.fillStyle = couleur;
      ctx.shadowColor = couleur;
      ctx.shadowBlur = 16;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      if (o.t === 'p') {
        const x = o.x + o.vx * ticks;
        const y = o.y + o.vy * ticks + 0.5 * o.g * ticks * ticks;
        const sens = o.vx >= 0 ? 1 : -1;
        ctx.translate(x, y);

        if (o.s === 'flamme') {
          ctx.globalAlpha = 0.75;
          ctx.fillStyle = Math.random() < 0.5 ? '#ffd34a' : couleur;
          ctx.beginPath();
          ctx.arc(0, 0, o.r * (0.6 + Math.random() * 0.5), 0, Math.PI * 2);
          ctx.fill();
        } else if (o.s === 'bulle') {
          ctx.fillStyle = couleur + '30';
          ctx.beginPath();
          ctx.arc(0, Math.sin(maintenant / 120) * 2, o.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, o.r * 0.65, -2.4, -1.5);
          ctx.stroke();
        } else if (o.s === 'rocher') {
          ctx.rotate((maintenant / 130) * sens);
          ctx.fillStyle = '#16210f';
          ctx.beginPath();
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2;
            const r = o.r * (i % 2 ? 0.8 : 1.05);
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (o.s === 'lame') {
          // Un croissant de vent.
          ctx.scale(sens, 1);
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(-o.r * 0.6, 0, o.r * 1.3, -1.1, 1.1);
          ctx.stroke();
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.arc(-o.r * 1.5, 0, o.r * 1.1, -0.9, 0.9);
          ctx.stroke();
        } else if (o.s === 'eclair') {
          // Un trait brisé qui change à chaque image.
          ctx.scale(sens, 1);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(14, 0);
          for (let i = 1; i <= 5; i++) ctx.lineTo(14 - i * 16, (Math.random() - 0.5) * 22);
          ctx.stroke();
        } else if (o.s === 'fleche') {
          ctx.scale(sens, 1);
          ctx.rotate(Math.atan2(o.vy, Math.abs(o.vx)));
          ctx.shadowBlur = 0;
          ctx.strokeStyle = CONTOUR;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(-24, 0);
          ctx.lineTo(10, 0);
          ctx.stroke();
          ctx.strokeStyle = '#e0c08c';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.fillStyle = '#e8e8f0';
          ctx.lineWidth = 2;
          ctx.strokeStyle = CONTOUR;
          ctx.beginPath();
          ctx.moveTo(19, 0);
          ctx.lineTo(8, -6);
          ctx.lineTo(8, 6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = couleur;
          ctx.beginPath();
          ctx.moveTo(-24, 0);
          ctx.lineTo(-31, -6);
          ctx.lineTo(-18, 0);
          ctx.lineTo(-31, 6);
          ctx.closePath();
          ctx.fill();
        } else if (o.s === 'boomerang') {
          ctx.shadowBlur = 0;
          ctx.rotate((maintenant / 55) * sens);
          ctx.beginPath();
          ctx.arc(0, o.r * 0.15, o.r * 0.9, 3.5, 5.9);
          ctx.strokeStyle = CONTOUR;
          ctx.lineWidth = 11;
          ctx.stroke();
          ctx.strokeStyle = '#e0a84a';
          ctx.lineWidth = 6;
          ctx.stroke();
        } else if (o.s === 'balle') {
          ctx.shadowBlur = 0;
          ctx.scale(sens, 1);
          ctx.globalAlpha = 0.45;
          ctx.fillStyle = '#ffe9a0';
          ctx.fillRect(-o.r * 3.5, -o.r * 0.35, o.r * 3.5, o.r * 0.7);
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.arc(0, 0, o.r * 0.75, 0, Math.PI * 2);
          ctx.fillStyle = '#fff5c8';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = CONTOUR;
          ctx.stroke();
        } else if (o.s === 'bombe') {
          ctx.shadowBlur = 0;
          ctx.rotate((maintenant / 200) * sens);
          ctx.beginPath();
          ctx.arc(0, 0, o.r, 0, Math.PI * 2);
          ctx.fillStyle = '#2a2a35';
          ctx.fill();
          ctx.strokeStyle = CONTOUR;
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.beginPath();
          ctx.ellipse(-o.r * 0.35, -o.r * 0.35, o.r * 0.3, o.r * 0.18, -0.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(o.r * 0.4, -o.r * 0.85);
          ctx.lineTo(o.r * 0.8, -o.r * 1.4);
          ctx.strokeStyle = '#c9a36a';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.fillStyle = Math.floor(maintenant / 90) % 2 ? '#ffb347' : '#ff6a2b';
          ctx.beginPath();
          ctx.arc(o.r * 0.8, -o.r * 1.4, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (o.s === 'hache') {
          ctx.shadowBlur = 0;
          ctx.rotate((maintenant / 70) * sens);
          ctx.beginPath();
          ctx.moveTo(0, o.r * 0.9);
          ctx.lineTo(0, -o.r * 0.7);
          ctx.strokeStyle = CONTOUR;
          ctx.lineWidth = 7;
          ctx.stroke();
          ctx.strokeStyle = '#9a6a3a';
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, -o.r * 0.75);
          ctx.lineTo(o.r * 0.95, -o.r * 0.95);
          ctx.lineTo(o.r * 0.8, o.r * 0.1);
          ctx.closePath();
          ctx.fillStyle = '#cfd6e3';
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = CONTOUR;
          ctx.stroke();
        } else if (o.s === 'epine') {
          ctx.shadowBlur = 0;
          ctx.scale(sens, 1);
          ctx.beginPath();
          ctx.moveTo(o.r * 1.6, 0);
          ctx.lineTo(-o.r * 0.7, -o.r * 0.55);
          ctx.lineTo(-o.r * 0.7, o.r * 0.55);
          ctx.closePath();
          ctx.fillStyle = couleur;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = CONTOUR;
          ctx.stroke();
        } else if (o.s === 'orbe') {
          const k = 1 + Math.sin(maintenant / 90) * 0.08;
          const lueur = ctx.createRadialGradient(0, 0, 0, 0, 0, o.r * 1.5 * k);
          lueur.addColorStop(0, '#ffffff');
          lueur.addColorStop(0.35, couleur);
          lueur.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = lueur;
          ctx.beginPath();
          ctx.arc(0, 0, o.r * 1.5 * k, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(0, 0, o.r * 0.75 * k, 0, Math.PI * 2);
          ctx.strokeStyle = CONTOUR;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (o.s === 'rayon') {
          ctx.shadowBlur = 0;
          ctx.scale(sens, 1);
          const g = ctx.createLinearGradient(-o.r * 4, 0, o.r * 1.4, 0);
          g.addColorStop(0, 'rgba(255,255,255,0)');
          g.addColorStop(0.8, couleur);
          g.addColorStop(1, '#ffffff');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(-o.r * 4, 0);
          ctx.lineTo(o.r * 0.4, -o.r * 0.55);
          ctx.lineTo(o.r * 1.5, 0);
          ctx.lineTo(o.r * 0.4, o.r * 0.55);
          ctx.closePath();
          ctx.fill();
        } else if (o.s === 'shuriken') {
          ctx.shadowBlur = 0;
          ctx.rotate((maintenant / 45) * sens);
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4;
            const r = i % 2 ? o.r * 0.38 : o.r * 1.05;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath();
          ctx.fillStyle = '#c9ccd8';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = CONTOUR;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, o.r * 0.2, 0, Math.PI * 2);
          ctx.fillStyle = couleur;
          ctx.fill();
        } else if (o.s === 'missile') {
          ctx.shadowBlur = 0;
          ctx.scale(sens, 1);
          ctx.fillStyle = Math.random() < 0.5 ? '#ffd34a' : '#ff6a2b';
          ctx.beginPath();
          ctx.moveTo(-o.r * 0.9, 0);
          ctx.lineTo(-o.r * (1.8 + Math.random() * 0.8), -o.r * 0.35);
          ctx.lineTo(-o.r * (1.8 + Math.random() * 0.8), o.r * 0.35);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#c7ced9';
          ctx.lineWidth = 2;
          ctx.strokeStyle = CONTOUR;
          ctx.beginPath();
          ctx.roundRect(-o.r, -o.r * 0.42, o.r * 1.9, o.r * 0.84, o.r * 0.3);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#e24b4b';
          ctx.beginPath();
          ctx.moveTo(o.r * 0.9, -o.r * 0.42);
          ctx.lineTo(o.r * 1.6, 0);
          ctx.lineTo(o.r * 0.9, o.r * 0.42);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (o.s === 'boule') {
          ctx.shadowBlur = 0;
          ctx.rotate((maintenant / 160) * sens);
          ctx.beginPath();
          ctx.arc(0, 0, o.r, 0, Math.PI * 2);
          ctx.fillStyle = '#f4fbff';
          ctx.fill();
          ctx.strokeStyle = CONTOUR;
          ctx.stroke();
          ctx.fillStyle = '#c4dff2';
          for (const [dx, dy] of [[-0.35, 0.2], [0.3, -0.3], [0.2, 0.4]]) {
            ctx.beginPath();
            ctx.arc(dx * o.r, dy * o.r, o.r * 0.17, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Éclat de glace : un losange allongé.
          ctx.scale(sens, 1);
          ctx.rotate(Math.atan2(o.vy, Math.abs(o.vx)));
          ctx.fillStyle = couleur + '55';
          ctx.beginPath();
          ctx.moveTo(o.r * 1.5, 0);
          ctx.lineTo(0, -o.r * 0.55);
          ctx.lineTo(-o.r * 1.1, 0);
          ctx.lineTo(0, o.r * 0.55);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } else {
        ctx.translate(o.x, o.y);

        if (o.s === 'brasier') {
          // Des langues de feu le long de la flaque.
          ctx.globalAlpha = Math.min(1, o.vie / 30);
          for (let i = -3; i <= 3; i++) {
            const hauteur = o.h * (0.45 + 0.5 * Math.abs(Math.sin(maintenant / 110 + i * 1.7)));
            ctx.fillStyle = i % 2 ? '#ffd34a' : couleur;
            ctx.beginPath();
            ctx.moveTo(i * o.l / 3.5 - 10, 0);
            ctx.quadraticCurveTo(i * o.l / 3.5 + Math.sin(maintenant / 90 + i) * 6, -hauteur * 1.3, i * o.l / 3.5 + 10, 0);
            ctx.fill();
          }
        } else if (o.s === 'geyser') {
          const k = Math.min(1, o.vie / 10);
          const colonne = ctx.createLinearGradient(0, 0, 0, -o.h);
          colonne.addColorStop(0, '#ffffff');
          colonne.addColorStop(0.3, couleur);
          colonne.addColorStop(1, couleur + '00');
          ctx.globalAlpha = k;
          ctx.fillStyle = colonne;
          ctx.beginPath();
          ctx.moveTo(-o.l, 0);
          ctx.quadraticCurveTo(-o.l * 0.5, -o.h * 0.6, -o.l * 0.8, -o.h);
          ctx.lineTo(o.l * 0.8, -o.h);
          ctx.quadraticCurveTo(o.l * 0.5, -o.h * 0.6, o.l, 0);
          ctx.fill();
        } else if (o.s === 'seisme') {
          // Des pics de roche qui jaillissent du sol.
          ctx.fillStyle = '#16210f';
          for (let i = -4; i <= 4; i++) {
            if (i === 0) continue;
            const hauteur = (o.h + 22) * (0.5 + 0.5 * Math.abs(Math.sin(i * 2.3))) * Math.min(1, o.vie / 6);
            ctx.beginPath();
            ctx.moveTo(i * o.l / 4.5 - 14, 0);
            ctx.lineTo(i * o.l / 4.5 + (i % 2 ? 4 : -4), -hauteur);
            ctx.lineTo(i * o.l / 4.5 + 14, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        } else if (o.s === 'tornade') {
          ctx.globalAlpha = Math.min(1, o.vie / 12);
          for (let i = 0; i < 6; i++) {
            const y = -(i + 0.5) * o.h / 6;
            const largeur = o.l * (0.35 + 0.65 * (i / 5));
            ctx.beginPath();
            ctx.ellipse(Math.sin(maintenant / 70 + i) * 8, y, largeur, 7, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else if (o.s === 'mine') {
          // Une boule d'électricité ; elle clignote tant qu'elle n'est pas armée.
          if (!o.actif && Math.floor(maintenant / 90) % 2) ctx.globalAlpha = 0.3;
          const r = 11 + Math.sin(maintenant / 100) * 2;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, -24, r * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(0, -24, r, 0, Math.PI * 2);
          ctx.stroke();
          if (o.actif) {
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 3; i++) {
              const a = Math.random() * Math.PI * 2;
              ctx.moveTo(Math.cos(a) * r, -24 + Math.sin(a) * r);
              ctx.lineTo(Math.cos(a) * (r + 12), -24 + Math.sin(a) * (r + 12));
            }
            ctx.stroke();
          }
        } else if (o.s === 'explosion') {
          // Une boule de feu qui grossit puis s'estompe, centrée sur la zone.
          const k = 1 - Math.max(0, o.vie) / (o.vm || 9);
          const r = o.l * (0.45 + 0.7 * k);
          ctx.shadowBlur = 0;
          ctx.globalAlpha = Math.max(0, 1 - k * 0.8);
          const boule = ctx.createRadialGradient(0, -o.h / 2, 0, 0, -o.h / 2, r);
          boule.addColorStop(0, '#ffffff');
          boule.addColorStop(0.4, couleur);
          boule.addColorStop(1, 'rgba(255,120,40,0)');
          ctx.fillStyle = boule;
          ctx.beginPath();
          ctx.arc(0, -o.h / 2, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, -o.h / 2, r * (0.7 + 0.4 * k), 0, Math.PI * 2);
          ctx.stroke();
        } else if (o.s === 'nuage') {
          // Un nuage de fumée qui ondule.
          ctx.shadowBlur = 0;
          ctx.globalAlpha = Math.min(0.65, o.vie / 40);
          ctx.fillStyle = couleur;
          for (let i = -3; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(i * o.l / 3.2, -o.h * 0.4 + Math.sin(maintenant / 300 + i * 1.3) * 7, o.h * (0.34 + 0.08 * Math.cos(i)), 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (o.s === 'givre') {
          // Une plaque de glace hérissée de petits cristaux.
          if (!o.actif) ctx.globalAlpha = 0.4;
          ctx.fillStyle = couleur + '40';
          ctx.beginPath();
          ctx.ellipse(0, 0, o.l, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.lineWidth = 2;
          for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(i * o.l / 3 - 6, 0);
            ctx.lineTo(i * o.l / 3, -10 - (i % 2 ? 8 : 0));
            ctx.lineTo(i * o.l / 3 + 6, 0);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }
  }

  // ===========================================================================
  // EFFETS : mise à jour et dessin
  // ===========================================================================
  function dessinerEffets(dt) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    // Faisceaux d'éjection.
    for (const r of rayons) {
      r.vie -= dt;
      const k = Math.max(0, r.vie / r.max);
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.angle);
      const longueur = 3000;
      const largeur = 90 * k;
      const degrade = ctx.createLinearGradient(0, 0, longueur, 0);
      degrade.addColorStop(0, '#ffffff');
      degrade.addColorStop(0.15, r.couleur);
      degrade.addColorStop(1, r.couleur + '00');
      ctx.globalAlpha = k;
      ctx.fillStyle = degrade;
      ctx.beginPath();
      ctx.moveTo(-40, -largeur);
      ctx.lineTo(longueur, -largeur * 0.15);
      ctx.lineTo(longueur, largeur * 0.15);
      ctx.lineTo(-40, largeur);
      ctx.fill();
      ctx.restore();
    }
    rayons = rayons.filter((r) => r.vie > 0);

    // Anneaux.
    for (const o of ondes) {
      o.vie -= dt;
      o.r += o.vr * dt;
      ctx.globalAlpha = Math.max(0, o.vie / o.max);
      ctx.strokeStyle = o.couleur;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ondes = ondes.filter((o) => o.vie > 0);

    // Particules.
    for (const p of particules) {
      p.vie -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy = p.vy * 0.94 + 0.12 * dt;
      const k = Math.max(0, p.vie / p.max);
      ctx.globalAlpha = k;
      ctx.fillStyle = p.couleur;
      ctx.fillRect(p.x - p.taille / 2, p.y - p.taille / 2, p.taille * (0.5 + k), p.taille * (0.5 + k));
    }
    particules = particules.filter((p) => p.vie > 0);
    if (particules.length > 700) particules.splice(0, particules.length - 700);

    ctx.restore();
  }

  // ===========================================================================
  // INTERFACE : pourcentages et vies
  // ===========================================================================
  function couleurDegats(degats) {
    // Blanc -> jaune -> rouge sombre à mesure que les dégâts montent.
    const k = Math.min(1, degats / 150);
    const teinte = 55 - 55 * k;
    const lum = 95 - 45 * Math.min(1, degats / 60) - 12 * k;
    return 'hsl(' + teinte + ', 100%, ' + lum + '%)';
  }

  function dessinerInterface(joueurs) {
    const n = joueurs.length;
    if (n === 0) return;
    const largeur = Math.min(230, (C.LARGEUR - 40) / n);
    const depart = (C.LARGEUR - largeur * n) / 2;

    joueurs.forEach((j, i) => {
      const x = depart + i * largeur + largeur / 2;
      const y = C.HAUTEUR - 18;
      const P = PERSOS[j.perso];
      const teinte = P ? ELEMENTS[P.element].couleur : '#999999';
      ctx.save();
      ctx.lineJoin = 'round';

      // Fond du panneau, avec la couleur du joueur en bandeau.
      const gauche = x - largeur / 2 + 8;
      ctx.fillStyle = 'rgba(20, 18, 30, 0.78)';
      ctx.strokeStyle = CONTOUR;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(gauche, y - 74, largeur - 16, 84, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = j.couleur;
      ctx.beginPath();
      ctx.roundRect(gauche, y - 74, largeur - 16, 8, [12, 12, 0, 0]);
      ctx.fill();

      // Pastille du personnage, à la couleur de son élément.
      ctx.fillStyle = teinte;
      ctx.beginPath();
      ctx.arc(gauche + 30, y - 32, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = CONTOUR;
      ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(P ? P.nom[0] : '?', gauche + 30, y - 25);

      // Pourcentage, cerné de noir ; il tremble un peu quand il est élevé.
      const tremble = j.degats > 100 ? (Math.random() - 0.5) * 2 : 0;
      ctx.font = 'bold 40px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'right';
      ctx.lineWidth = 6;
      ctx.strokeStyle = CONTOUR;
      const xPourcent = gauche + largeur - 40;
      ctx.strokeText(j.degats + '%', xPourcent + tremble, y - 22 + tremble);
      ctx.fillStyle = couleurDegats(j.degats);
      ctx.fillText(j.degats + '%', xPourcent + tremble, y - 22 + tremble);

      // Nom et personnage.
      ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(j.nom, gauche + 58, y - 54);
      ctx.fillStyle = '#b8b4c8';
      ctx.fillText(P ? P.nom + ' · ' + ELEMENTS[P.element].nom : '', gauche + 58, y - 2);

      // Voyants des trois capacités (1, 2, aérienne) : pleins quand elles sont prêtes.
      if (P) {
        [j.cd1, j.cd2, j.cd3].forEach((recharge, k) => {
          const def = P['spe' + (k + 1)];
          const max = def.armes ? def.armes[(j.arme | 0) % def.armes.length].recharge : def.recharge;
          const cx = gauche + largeur - 30;
          const cy = y - 52 + k * 17;
          ctx.globalAlpha = recharge > 0 ? 0.5 : 1;
          ctx.fillStyle = '#3a3648';
          ctx.beginPath();
          ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = teinte;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, 6.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - Math.min(1, recharge / max)));
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        });
      }

      // Arme équipée (Sylve).
      if (P && P.spe1 && P.spe1.armes) {
        ctx.globalAlpha = 1;
        dessinerArme((j.arme | 0) % P.spe1.armes.length, gauche + 120, y - 40, 9);
      }

      // Vies.
      ctx.lineWidth = 2;
      for (let v = 0; v < C.VIES; v++) {
        ctx.beginPath();
        ctx.arc(gauche + 62 + v * 15, y - 40, 5, 0, Math.PI * 2);
        ctx.fillStyle = v < j.vies ? j.couleur : '#3a3648';
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  /** Repère au bord de l'écran pour un joueur sorti du champ mais pas encore éjecté. */
  function dessinerHorsChamp(j) {
    const [sx, sy] = versEcran(j.x, j.y - 30);
    if (sx > 0 && sx < C.LARGEUR && sy > 0 && sy < C.HAUTEUR) return;
    const bx = Math.max(26, Math.min(C.LARGEUR - 26, sx));
    const by = Math.max(26, Math.min(C.HAUTEUR - 110, sy));
    ctx.save();
    ctx.strokeStyle = j.couleur;
    ctx.fillStyle = 'rgba(20, 18, 30, 0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bx, by, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = j.couleur;
    ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', bx, by + 5);
    ctx.restore();
  }

  // ===========================================================================
  // BOUCLE PRINCIPALE
  // ===========================================================================
  const DUREE_TICK_MS = 1000 / C.TICK_HZ;
  let dernierTemps = performance.now();
  let accumulateur = 0;

  function boucle(maintenant) {
    const ecoule = Math.min(250, maintenant - dernierTemps);
    dernierTemps = maintenant;
    accumulateur += ecoule;
    while (accumulateur >= DUREE_TICK_MS) {
      tickLocal();
      accumulateur -= DUREE_TICK_MS;
    }
    // Fraction du tick en cours : affichage fluide même sur un écran > 60 Hz.
    const alpha = accumulateur / DUREE_TICK_MS;
    const dt = ecoule / DUREE_TICK_MS; // durée de la frame, en ticks

    // L'écart de correction fond progressivement.
    erreur.x *= 0.85;
    erreur.y *= 0.85;

    // --- Liste des joueurs à afficher ---
    const joueurs = joueursInterpoles();
    for (const j of joueurs) {
      if (j.id === monId && moi.connu) {
        // Le joueur local est affiché à sa position PRÉDITE, pas à celle du passé.
        for (const champ of physics.CHAMPS) j[champ] = moi[champ];
        if (moi.gel === 0) {
          j.x = precedent.x + (moi.x - precedent.x) * alpha + erreur.x;
          j.y = precedent.y + (moi.y - precedent.y) * alpha + erreur.y;
        }
      }
    }

    // --- Tremblement d'écran ---
    let dx = 0;
    let dy = 0;
    if (secousse > 0.3) {
      dx = (Math.random() - 0.5) * 2 * secousse;
      dy = (Math.random() - 0.5) * 2 * secousse;
      secousse *= Math.pow(0.88, dt);
    } else {
      secousse = 0;
    }

    // --- Dessin ---
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, C.LARGEUR, C.HAUTEUR);
    majCamera(joueurs, dt);
    dessinerDecor(maintenant, dx, dy);
    const vivants = joueurs.filter((j) => j.etat !== 'mort');
    for (const j of vivants) dessinerOmbre(j);
    for (const j of vivants) {
      // Traînée derrière un joueur éjecté à grande vitesse.
      if (j.etat === 'sonne' && Math.hypot(j.vx, j.vy) > 8) {
        const S = PERSOS[j.perso] || PERSOS.ondine;
        const vie = 16;
        particules.push({
          x: j.x + (Math.random() - 0.5) * 14, y: j.y - S.h / 2 + (Math.random() - 0.5) * 14,
          vx: 0, vy: 0, vie, max: vie, couleur: j.couleur, taille: 7,
        });
      }
    }
    for (const j of vivants) {
      // Dash : une traînée de formes derrière le joueur.
      if (j.etat === 'dash') {
        const S = PERSOS[j.perso] || PERSOS.ondine;
        const vie = 12;
        particules.push({
          x: j.x - j.dir * 10, y: j.y - S.h * (0.2 + Math.random() * 0.6),
          vx: -j.dir * 1.5, vy: 0, vie, max: vie, couleur: ELEMENTS[S.element].couleur, taille: 9,
        });
      }
      // Poison : petites bulles violettes.
      if (j.poison && Math.random() < 0.4 * dt) {
        const S = PERSOS[j.perso] || PERSOS.ondine;
        const vie = 16 + Math.random() * 8;
        particules.push({
          x: j.x + (Math.random() - 0.5) * S.l, y: j.y - Math.random() * S.h,
          vx: 0, vy: -0.8, vie, max: vie, couleur: '#b06cff', taille: 4,
        });
      }
    }
    for (const j of vivants) {
      // Petites flammes sur un joueur qui brûle.
      if (j.brulure && Math.random() < 0.6 * dt) {
        const S = PERSOS[j.perso] || PERSOS.ondine;
        const vie = 14 + Math.random() * 10;
        particules.push({
          x: j.x + (Math.random() - 0.5) * S.l, y: j.y - Math.random() * S.h,
          vx: 0, vy: -1.5 - Math.random() * 1.5, vie, max: vie,
          couleur: Math.random() < 0.5 ? '#ff6a2b' : '#ffd34a', taille: 4,
        });
      }
    }
    dessinerObjets(maintenant);
    // Le joueur local est dessiné en dernier, par-dessus les autres.
    for (const j of vivants) if (j.id !== monId) dessinerPerso(j, false);
    for (const j of vivants) if (j.id === monId) dessinerPerso(j, true);
    dessinerEffets(dt);

    // --- Interface (coordonnées écran) ---
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, C.LARGEUR, C.HAUTEUR);
    for (const j of vivants) dessinerHorsChamp(j);
    dessinerInterface(joueurs);
    if (flash > 0.01) {
      ctx.fillStyle = 'rgba(255,255,255,' + flash + ')';
      ctx.fillRect(0, 0, C.LARGEUR, C.HAUTEUR);
      flash *= Math.pow(0.85, dt);
    }

    requestAnimationFrame(boucle);
  }

  // Petit accès pour les tests automatiques (lecture seule).
  window.__nb = {
    moi,
    etat: () => (historique.length ? [...historique[historique.length - 1].joueurs.values()] : []),
  };

  // Démarrage. Avec le serveur Node, on se connecte tout de suite. Dans la
  // version « un seul fichier HTML », c'est le menu qui décide (local ou réseau).
  NB.client = {
    tactile: TACTILE,
    demarrer(options) {
      enLocal = !!options.local;
      persoVoulu = options.perso || null;
      socketFourni = options.socketFourni || null;
      etiquetteReseau = options.etiquette || 'arène libre';
      if (options.delai) delaiInterpolation = options.delai;
      serveurManuel = options.serveur || null;
      if (enLocal) {
        TOUCHES = options.touches;
        delaiInterpolation = 20; // pas de réseau : presque aucun retard nécessaire
      }
      montrerManette(!enLocal);
      if (TACTILE) pleinEcran();
      connecter();
    },
  };
  if (!LOCAL) {
    montrerManette(true);
    connecter();
  }
  requestAnimationFrame(boucle);
})();
</script>
</body>
</html>`;

// #############################################################################
// PARTIE 3 — SERVEUR  (fichier d'origine : server.js)
// #############################################################################
MODULES['serveur'] = function (module, exports, require, __dirname) {
    // =============================================================================
    // server.js — Serveur de Neon Brawl.
    //
    // Rôles :
    //   1. Servir la page du jeu (un seul fichier : public/index.html).
    //   2. Accepter les connexions WebSocket des joueurs.
    //   3. Faire tourner la simulation à 60 Hz : le serveur fait AUTORITÉ, les
    //      navigateurs n'envoient que leurs touches.
    //   4. Diffuser l'état du jeu 30 fois par seconde.
    //
    // Mode de jeu actuel : « arène libre ». Tous les joueurs connectés se battent
    // ensemble ; quand un joueur a perdu ses 3 vies il repart avec 3 vies neuves.
    // Un joueur seul affronte un mannequin d'entraînement immobile.
    // (Le lobby et le tournoi arrivent à l'étape suivante.)
    // =============================================================================
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const http = require('http');
    const express = require('express');
    const { WebSocketServer } = require('ws');

    const C = require('./game/constants');
    const { PERSOS } = require('./game/characters');
    const physics = require('./game/physics');
    const combat = require('./game/combat');
    const capacites = require('./game/capacites');

    const PORT = Number(process.env.PORT) || 3000;
    const HOTE = '0.0.0.0'; // écoute sur toutes les cartes réseau (accès depuis le LAN)

    // -----------------------------------------------------------------------------
    // Page du jeu
    // -----------------------------------------------------------------------------
    // Le client est UN SEUL fichier HTML. Pour que le navigateur prédise les
    // mouvements avec exactement le même code que le serveur, on injecte dans la
    // page les fichiers partagés de game/ à la place du marqueur <!--NB_PARTAGE-->.
    // Ainsi il n'y a aucune duplication de code et toujours une seule page servie.
    const FICHIERS_PARTAGES = ['constants.js', 'characters.js', 'physics.js', 'progression.js'];

    function construirePage() {
      const page = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
      const scripts = FICHIERS_PARTAGES
        .map((nom) => {
          const code = fs.readFileSync(path.join(__dirname, 'game', nom), 'utf8');
          return `<script>\n// ---- game/${nom} (injecté par le serveur) ----\n${code}\n</script>`;
        })
        .join('\n');
      return page.replace('<!--NB_PARTAGE-->', () => scripts);
    }

    const app = express();
    app.get(['/', '/index.html'], (req, res) => {
      // Reconstruit à chaque requête : pratique pendant le développement,
      // et le coût est négligeable.
      res.set('Cache-Control', 'no-store');
      res.type('html').send(construirePage());
    });
    app.use(express.static(path.join(__dirname, 'public')));

    const serveurHttp = http.createServer(app);
    const wss = new WebSocketServer({ server: serveurHttp });

    // -----------------------------------------------------------------------------
    // Joueurs
    // -----------------------------------------------------------------------------
    const COULEURS = ['#00e5ff', '#ff2bd6', '#ffb300', '#6bff4a', '#b388ff', '#ff5252', '#40ffc8', '#ff8a3d'];
    const LISTE_PERSOS = Object.keys(PERSOS);
    const { BASE } = require('./game/characters'); // personnages disponibles sans rien débloquer
    const joueurs = new Map(); // id -> joueur (humains et mannequin)
    let prochainId = 1;
    let mannequin = null;

    /** Point d'apparition, pris dans la liste de la carte en cours. */
    function xApparition(joueur) {
      const departs = C.carte.departs;
      return departs[(joueur.id - 1) % departs.length];
    }

    function couleurLibre() {
      const prises = new Set([...joueurs.values()].map((j) => j.couleur));
      return COULEURS.find((c) => !prises.has(c)) || COULEURS[0];
    }

    function creerJoueur(socket) {
      const id = prochainId++;
      const joueur = {
        id,
        socket,                 // null pour le mannequin
        nom: `Joueur ${id}`,
        couleur: couleurLibre(),
        perso: BASE[(id - 1) % BASE.length],
        degats: 0,
        brulure: 0,             // ticks de brûlure restants (élément feu)
        vies: C.VIES,
        touches: 0,             // dernières touches appliquées
        file: [],               // inputs reçus, pas encore simulés
        acquitte: 0,            // numéro du dernier input simulé (renvoyé au client)
        retour: 0,              // compte à rebours avant réapparition
        ...physics.nouvelEtat(0, 0),
      };
      combat.reapparaitre(joueur, xApparition(joueur));
      joueur.invul = 60;
      joueurs.set(id, joueur);
      return joueur;
    }

    /** Le mannequin se tient au sol, au milieu de l'arène. */
    function placerMannequin() {
      combat.reapparaitre(mannequin, C.carte.mannequin.x, C.carte.mannequin.y - 1);
      mannequin.dir = -1;
    }

    /** Un joueur seul a droit à un mannequin d'entraînement ; à deux ou plus, il s'en va. */
    function ajusterMannequin() {
      const humains = [...joueurs.values()].filter((j) => j.socket).length;
      if (humains === 1 && !mannequin) {
        mannequin = creerJoueur(null);
        mannequin.nom = 'Mannequin';
        mannequin.couleur = '#9aa4c7';
        mannequin.perso = 'ondine';
        placerMannequin();
      } else if (humains !== 1 && mannequin) {
        joueurs.delete(mannequin.id);
        mannequin = null;
      }
    }

    function envoyer(socket, message) {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
    }

    wss.on('connection', (socket) => {
      const joueur = creerJoueur(socket);
      ajusterMannequin();
      console.log(`[+] ${joueur.nom} connecté`);
      envoyer(socket, { t: 'bienvenue', id: joueur.id });

      socket.on('message', (donnees) => {
        let msg;
        try {
          msg = JSON.parse(donnees);
        } catch {
          return; // message illisible : on l'ignore
        }
        // Le client n'envoie QUE ses touches ; il ne peut pas imposer sa position.
        if (msg.t === 'input' && Number.isInteger(msg.seq) && Number.isInteger(msg.touches)) {
          if (joueur.file.length < 120) {
            joueur.file.push({ seq: msg.seq, touches: msg.touches & C.MASQUE_TOUCHES });
          }
        } else if (msg.t === 'perso' && LISTE_PERSOS.includes(msg.perso)) {
          joueur.perso = msg.perso;
        } else if (msg.t === 'carte' && C.CARTES[msg.id] && msg.id !== C.carte.id) {
          changerCarte(msg.id, joueur);
        }
      });

      socket.on('close', () => {
        joueurs.delete(joueur.id);
        ajusterMannequin();
        console.log(`[-] ${joueur.nom} déconnecté`);
      });

      socket.on('error', () => {});
    });

    // -----------------------------------------------------------------------------
    // Boucle de jeu à pas fixe
    // -----------------------------------------------------------------------------
    let tick = 0;
    let evenements = []; // coups, éjections… accumulés jusqu'au prochain envoi
    const objets = [];   // projectiles et zones des capacités élémentaires

    /** Change de carte : tout le monde repart de zéro sur la nouvelle arène. */
    function changerCarte(id, auteur) {
      C.choisirCarte(id);
      objets.length = 0;
      for (const joueur of joueurs.values()) {
        joueur.vies = C.VIES;
        if (joueur === mannequin) placerMannequin();
        else combat.reapparaitre(joueur, xApparition(joueur));
      }
      console.log(`[carte] ${auteur.nom} passe sur « ${C.carte.nom} »`);
    }

    function consommerInput(joueur) {
      const input = joueur.file.shift();
      if (!input) return; // rien reçu ce tick-ci : on garde les dernières touches
      joueur.touches = input.touches;
      joueur.acquitte = input.seq;
    }

    function avancerSimulation() {
      tick++;
      const liste = [...joueurs.values()];

      // 1. Chaque joueur avance selon ses touches.
      for (const joueur of liste) {
        consommerInput(joueur);
        physics.avancerJoueur(joueur, joueur.touches);
        // Si le réseau a livré un paquet d'inputs en retard, on rattrape
        // progressivement pour ne pas accumuler de latence.
        if (joueur.file.length > 4) {
          consommerInput(joueur);
          physics.avancerJoueur(joueur, joueur.touches);
        }
      }

      // 2. Les coups, puis les sorties d'écran.
      combat.resoudreCoups(liste, evenements);
      capacites.avancer(objets, liste, evenements, tick);
      combat.effetsContinus(liste);
      const prets = combat.gererSorties(liste, evenements);

      // 3. Arène libre : tout le monde revient, avec 3 vies neuves si besoin.
      for (const joueur of prets) {
        if (joueur.vies <= 0) joueur.vies = C.VIES;
        if (joueur === mannequin) placerMannequin();
        else combat.reapparaitre(joueur, xApparition(joueur));
      }

      if (tick % C.ETAT_TOUS_LES === 0) diffuserEtat();
    }

    function diffuserEtat() {
      const etat = {
        t: 'etat',
        tick,
        ev: evenements,
        carte: C.carte.id,
        objets: capacites.instantane(objets),
        joueurs: [...joueurs.values()].map(combat.instantaneJoueur),
      };
      evenements = [];
      const texte = JSON.stringify(etat);
      for (const joueur of joueurs.values()) {
        if (joueur.socket && joueur.socket.readyState === joueur.socket.OPEN) joueur.socket.send(texte);
      }
    }

    // setInterval n'est pas précis à la milliseconde : on mesure le temps réellement
    // écoulé et on exécute autant de ticks que nécessaire (accumulateur).
    const DUREE_TICK_MS = 1000 / C.TICK_HZ;
    let dernierTemps = process.hrtime.bigint();
    let accumulateur = 0;

    setInterval(() => {
      const maintenant = process.hrtime.bigint();
      accumulateur += Number(maintenant - dernierTemps) / 1e6;
      dernierTemps = maintenant;
      // Garde-fou : après un gros blocage, on ne rejoue pas des secondes entières.
      if (accumulateur > 250) accumulateur = 250;
      while (accumulateur >= DUREE_TICK_MS) {
        avancerSimulation();
        accumulateur -= DUREE_TICK_MS;
      }
    }, 4);

    // -----------------------------------------------------------------------------
    // Démarrage
    // -----------------------------------------------------------------------------
    function adressesLocales() {
      const adresses = [];
      for (const cartes of Object.values(os.networkInterfaces())) {
        for (const carte of cartes || []) {
          if (carte.family === 'IPv4' && !carte.internal) adresses.push(carte.address);
        }
      }
      return adresses;
    }

    // Les erreurs d'écoute sont signalées à la fois par le serveur HTTP et par le
    // serveur WebSocket : on les traite au même endroit.
    wss.on('error', () => {});
    serveurHttp.on('error', (erreur) => {
      if (erreur.code === 'EADDRINUSE') {
        console.error(`Le port ${PORT} est déjà utilisé : le serveur de jeu tourne sans doute déjà`);
        console.error('(par exemple le service : sudo systemctl status neon-brawl).');
        console.error('Pour le relancer : sudo systemctl restart neon-brawl');
      } else {
        console.error('Impossible de démarrer le serveur :', erreur.message);
      }
      process.exit(1);
    });

    serveurHttp.listen(PORT, HOTE, () => {
      console.log('==============================================');
      console.log('  NEON BRAWL — serveur démarré');
      console.log('==============================================');
      console.log(`  Sur cette machine : http://localhost:${PORT}`);
      const ips = adressesLocales();
      if (ips.length === 0) {
        console.log('  Aucune adresse réseau trouvée (carte réseau déconnectée ?)');
      }
      for (const ip of ips) {
        console.log(`  Pour les autres joueurs du réseau : http://${ip}:${PORT}`);
      }
      console.log('==============================================');
    });
};

// #############################################################################
// PARTIE 4 — DÉMARRAGE
// Petit mécanisme qui relie les parties entre elles, puis lance le serveur.
// #############################################################################
const dejaCharges = {};

/** Remplace « require » : sert les modules de ce fichier, sinon ceux de Node. */
function charger(nom) {
  const cle = nom.replace(/^\.\/(game\/)?/, '');
  if (nom === 'fs') return faussesLectures;
  if (!MODULES[cle]) return require(nom);
  if (!dejaCharges[cle]) {
    const module = { exports: {} };
    dejaCharges[cle] = module;
    MODULES[cle](module, module.exports, charger, __dirname);
  }
  return dejaCharges[cle].exports;
}

// Le serveur croit lire des fichiers sur le disque : on lui donne à la place
// le contenu rangé dans ce fichier.
const faussesLectures = {
  readFileSync(chemin) {
    const nom = require('path').basename(chemin);
    if (nom === 'index.html') return PAGE_WEB;
    const cle = nom.replace(/\.js$/, '');
    if (MODULES[cle]) return '(' + MODULES[cle].toString() + ')();';
    return require('fs').readFileSync(chemin, 'utf8');
  },
};

charger('serveur');
