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
    'etat',                 // 'libre' | 'attaque' | 'charge' | 'bouclier' | 'esquive' | 'sonne' | 'bord' | 'mort'
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
  ];

  /** État de simulation d'un joueur neuf, placé en (x, y). */
  function nouvelEtat(x, y) {
    return {
      x, y, vx: 0, vy: 0, dir: 1, sol: false, sauts: 1,
      etat: 'libre', t: 0, atk: '', charge: 0, bouclier: C.BOUCLIER_MAX,
      gel: 0, invul: 0, traverse: 0, prev: 0, course: 0,
      rapide: false, esqAir: false, nAtk: 0, sonne: 0, elan: 0, cd1: 0, cd2: 0, cd3: 0,
      airSpe: false, bordCd: 0,
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
    p[recharge] = S[nom].recharge;
    return true;
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

    if (p.sol) {
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
    if (p.bordCd > 0) p.bordCd--;
    if (p.etat !== 'bouclier' && p.bouclier < C.BOUCLIER_MAX) {
      p.bouclier = Math.min(C.BOUCLIER_MAX, p.bouclier + 0.15);
    }

    switch (p.etat) {
      case 'attaque': etatAttaque(p, touches, appui, axe, S); break;
      case 'charge': etatCharge(p, touches); break;
      case 'bouclier': etatBouclier(p, touches, appui, axe); break;
      case 'esquive': etatEsquive(p); break;
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
