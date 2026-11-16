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
    'sauts',                // doubles sauts restants
    'etat',                 // 'libre' | 'attaque' | 'charge' | 'bouclier' | 'esquive' | 'sonne' | 'mort'
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
  ];

  /** État de simulation d'un joueur neuf, placé en (x, y). */
  function nouvelEtat(x, y) {
    return {
      x, y, vx: 0, vy: 0, dir: 1, sol: false, sauts: 1,
      etat: 'libre', t: 0, atk: '', charge: 0, bouclier: C.BOUCLIER_MAX,
      gel: 0, invul: 0, traverse: 0, prev: 0, course: 0,
      rapide: false, esqAir: false, nAtk: 0, sonne: 0, elan: 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Petites fonctions utilitaires
  // ---------------------------------------------------------------------------
  const MARGE_BORD = 6; // on tient encore debout avec le pied à peine dans le vide

  /** Surface sur laquelle le joueur est posé, ou null s'il n'y en a pas. */
  function surfaceSous(p) {
    if (p.y === C.SOL_Y && p.x >= C.BLOC.x0 - MARGE_BORD && p.x <= C.BLOC.x1 + MARGE_BORD) {
      return { traversable: false };
    }
    for (const pl of C.PLATEFORMES) {
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
    if (p.sol) {
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
  function atterrir(p, y) {
    p.y = y;
    p.vy = 0;
    p.sol = true;
    p.sauts = 1;
    p.rapide = false;
    p.esqAir = false;
    // Une attaque aérienne s'interrompt en touchant le sol.
    if (p.etat === 'attaque' && p.atk.startsWith('air_')) changerEtat(p, 'libre');
  }

  function deplacer(p, S) {
    const yAvant = p.y;

    if (p.sol) {
      p.vy = 0;
    } else {
      p.vy += S.gravite;
      if (p.etat !== 'sonne') {
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
      const dansBloc = p.x >= C.BLOC.x0 - MARGE_BORD && p.x <= C.BLOC.x1 + MARGE_BORD;
      if (dansBloc && yAvant <= C.SOL_Y && p.y >= C.SOL_Y) {
        atterrir(p, C.SOL_Y);
      } else if (p.traverse === 0) {
        for (const pl of C.PLATEFORMES) {
          const dessus = p.x >= pl.x0 - MARGE_BORD && p.x <= pl.x1 + MARGE_BORD;
          if (dessus && yAvant <= pl.y && p.y >= pl.y) {
            atterrir(p, pl.y);
            break;
          }
        }
      }
    }

    // Murs du bloc principal : si les pieds sont sous le niveau du sol et que
    // le corps entre dans le bloc, on le repousse du côté le plus proche.
    const demi = S.l / 2;
    if (p.y > C.SOL_Y + 1 && p.x > C.BLOC.x0 - demi && p.x < C.BLOC.x1 + demi) {
      const milieu = (C.BLOC.x0 + C.BLOC.x1) / 2;
      p.x = p.x < milieu ? C.BLOC.x0 - demi : C.BLOC.x1 + demi;
      p.vx = 0;
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
    const S = PERSOS[p.perso] || PERSOS.nova;

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
    if (p.etat !== 'bouclier' && p.bouclier < C.BOUCLIER_MAX) {
      p.bouclier = Math.min(C.BOUCLIER_MAX, p.bouclier + 0.15);
    }

    switch (p.etat) {
      case 'attaque': etatAttaque(p, touches, appui, axe, S); break;
      case 'charge': etatCharge(p, touches); break;
      case 'bouclier': etatBouclier(p, touches, appui, axe); break;
      case 'esquive': etatEsquive(p); break;
      case 'sonne': etatSonne(p); break;
      default: etatLibre(p, touches, appui, axe, S);
    }

    deplacer(p, S);
  }

  const physics = { CHAMPS, nouvelEtat, avancerJoueur, briserBouclier, changerEtat };

  if (cotéServeur) {
    module.exports = physics;
  } else {
    racine.NB.physics = physics;
  }
})(typeof self !== 'undefined' ? self : this);
