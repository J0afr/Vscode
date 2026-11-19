// =============================================================================
// ia.js — Adversaire dirigé par l'ordinateur, avec 10 niveaux de difficulté.
// (Navigateur uniquement ; utilisé par local.js pour les modes « Ordinateur »
// et « Solo ».)
//
//   const ia = NB.ia.creer(7);               // niveau de 1 (facile) à 10 (redoutable)
//   touches = ia.touches(bot, cible, monde)  // à appeler à chaque tick
//
// « touches » est un masque de bits, exactement comme celui du clavier : l'ordinateur
// joue avec les mêmes règles que le joueur (même physique, mêmes capacités).
//
// Ce qui change avec le niveau :
//   - le temps de réaction et la fréquence des décisions ;
//   - l'agressivité, l'usage des capacités, du dash et de l'attrape ;
//   - la défense : bouclier, esquive, évitement des projectiles ;
//   - les enchaînements sur un adversaire sonné ;
//   - à partir du niveau 8, de petits bonus de puissance et de poids.
// =============================================================================
(function (racine) {
  'use strict';

  const NBg = typeof NB !== 'undefined' ? NB : racine.NB;
  const C = NBg.constants;
  const { PERSOS } = NBg.persos;
  const T = C.TOUCHE;

  /** Réglages d'un niveau (1 à 10). */
  function params(niveau) {
    const n = Math.max(1, Math.min(10, niveau));
    const k = (n - 1) / 9; // 0 au niveau 1, 1 au niveau 10
    return {
      niveau: n,
      decision: [Math.round(26 - 20 * k), Math.round(44 - 36 * k)], // ticks entre deux décisions
      reaction: Math.round(20 - 17 * k),     // ticks avant de réagir à une attaque
      agress: 0.3 + 0.62 * k,                // envie d'attaquer quand on est à portée
      parade: 0.05 + 0.7 * k,                // chance de lever le bouclier face à une attaque
      esquive: Math.max(0, k - 0.3) * 0.9,   // chance d'esquiver plutôt que de parer
      special: 0.1 + 0.55 * k,               // usage des capacités
      attrape: 0.25 + 0.7 * k,               // attrape contre un bouclier
      dash: Math.max(0, k - 0.15) * 0.9,     // dash pour approcher
      combo: Math.max(0, k - 0.2) * 1.25,    // enchaîne sur un adversaire sonné
      projectiles: n >= 5,                   // évite les projectiles
      achever: n >= 3,                       // cherche à envoyer l'adversaire vers le bord
      puissance: n >= 8 ? 1 + 0.04 * (n - 7) : (n <= 2 ? 0.85 : 1), // bonus (ou malus) de puissance
      poids: n >= 8 ? 1 + 0.04 * (n - 7) : 1,                        // bonus de poids
    };
  }

  const alea = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const borne = (x, a, b) => Math.max(a, Math.min(b, x));

  /** Sol le plus proche de l'abscisse x. */
  function solProche(x) {
    let meilleur = null;
    let distance = Infinity;
    for (const s of C.carte.sols) {
      const d = x < s.x0 ? s.x0 - x : x > s.x1 ? x - s.x1 : 0;
      if (d < distance) { distance = d; meilleur = s; }
    }
    return meilleur;
  }

  /** Y a-t-il une surface sous le point (x, y) ? */
  function surfaceSous(x, y) {
    for (const s of C.carte.sols) if (x >= s.x0 - 6 && x <= s.x1 + 6 && s.y >= y - 2) return true;
    for (const p of C.carte.plateformes) if (x >= p.x0 - 6 && x <= p.x1 + 6 && p.y >= y - 2) return true;
    return false;
  }

  function creer(niveau) {
    const P = params(niveau);
    const e = {
      prochain: 0,   // tick de la prochaine décision
      plan: 0,       // touches de déplacement maintenues
      saut: 0,       // ticks pendant lesquels on maintient HAUT
      bouclier: 0,   // ticks pendant lesquels on maintient le bouclier
      appui: 0,      // touches à appuyer au prochain tick
      fort: 0,       // ticks de charge de l'attaque forte
      vu: 0,         // tick où l'on a repéré une attaque adverse
      reagi: false,
      projEsq: 0,    // pour ne pas réagir dix fois au même projectile
    };

    function touches(b, c, m) {
      const tick = m.tick;
      if (b.etat === 'mort') return 0;
      const S = PERSOS[b.perso];

      // Accroché au bord : on remonte.
      if (b.etat === 'bord') return b.t > 10 && tick % 4 === 0 ? T.HAUT : 0;

      // ---------------------------------------------------------------------
      // Retour sur la scène quand on est hors de l'arène
      // ---------------------------------------------------------------------
      const sol = solProche(b.x);
      if (!b.sol && (b.y > sol.y + 5 || !surfaceSous(b.x, b.y))) {
        const cible = borne(b.x, sol.x0 + 70, sol.x1 - 70);
        let mk = 0;
        if (Math.abs(b.x - cible) > 8) mk = b.x < cible ? T.DROITE : T.GAUCHE;
        // On utilise ses sauts dès qu'on retombe, puis le dash et la capacité aérienne.
        if (b.vy > 0 && b.sauts > 0 && tick % 8 === 0) mk |= T.HAUT;
        if (P.dash > 0 && !b.dashAir && b.cdDash === 0 && Math.abs(b.x - cible) > 140 && tick % 8 === 4) mk |= T.DASH;
        const monte = !S.spe3.elan || !(S.spe3.elan.vy > 0); // un plongeon ne ramène pas sur la scène
        if (b.sauts === 0 && !b.airSpe && b.cd3 === 0 && monte && b.y > sol.y - 60 && tick % 6 === 0) mk |= T.SPECIAL | T.HAUT;
        return mk;
      }
      if (!c || c.etat === 'mort') return 0;

      const dx = c.x - b.x;
      const dy = c.y - b.y;
      const dist = Math.abs(dx);
      const versCible = dx > 0 ? T.DROITE : T.GAUCHE;
      const fuite = dx > 0 ? T.GAUCHE : T.DROITE;
      const portee = 62 * S.taille;
      // Pour éliminer l'adversaire, on veut être entre lui et le centre de l'arène :
      // un coup l'enverra alors vers le bord. « bienPlace » : c'est le cas (ou il est au centre).
      const centre = C.carte.centre;
      const versBord = c.x >= centre ? 1 : -1;
      const bienPlace = Math.abs(c.x - centre) < 160 || (dx > 0 ? 1 : -1) === versBord;
      const achever = P.achever && c.degats >= 60;
      const versCentre = centre > b.x ? T.DROITE : T.GAUCHE;

      // ---------------------------------------------------------------------
      // Réactions défensives (avec un temps de réaction qui dépend du niveau)
      // ---------------------------------------------------------------------
      const SC = PERSOS[c.perso];
      const menace = c.etat === 'attaque' && dist < 120 * SC.taille + 40 && Math.abs(dy) < 100;
      if (menace && b.sol && (b.etat === 'libre' || b.etat === 'bouclier')) {
        if (e.vu === 0) e.vu = tick + P.reaction;
        if (!e.reagi && tick >= e.vu) {
          e.reagi = true;
          const h = Math.random();
          if (c.atk === 'attrape') e.appui = T.ESQUIVE | fuite;      // le bouclier ne protège pas d'une attrape
          else if (h < P.esquive) e.appui = T.ESQUIVE | fuite;
          else if (h < P.esquive + P.parade) e.bouclier = alea(14, 24);
        }
      } else if (!menace) {
        e.vu = 0;
        e.reagi = false;
      }

      // Projectiles qui arrivent sur nous (niveau 5 et plus).
      if (P.projectiles && b.sol) {
        for (const o of m.objets) {
          if (o.type !== 'p' || o.proprio === b.id) continue;
          const approche = (o.vx > 0 && o.x < b.x) || (o.vx < 0 && o.x > b.x);
          if (approche && Math.abs(o.x - b.x) < 260 && Math.abs(o.y - (b.y - S.h / 2)) < S.h * 0.8) {
            if (!e.projEsq) {
              e.projEsq = tick + 30;
              if (Math.random() < 0.55) e.appui = T.HAUT; else e.bouclier = 14;
            }
            break;
          }
        }
        if (e.projEsq && tick > e.projEsq) e.projEsq = 0;
      }

      // ---------------------------------------------------------------------
      // Décisions offensives
      // ---------------------------------------------------------------------
      if (tick >= e.prochain && e.fort === 0 && e.bouclier === 0) {
        e.prochain = tick + alea(P.decision[0], P.decision[1]);
        e.plan = 0;
        const h = Math.random();
        const proche = dist <= portee * 1.15 && Math.abs(dy) < 70;

        if (achever && !bienPlace && dist < 420 && b.sol && c.etat !== 'sonne') {
          // On passe de l'autre côté de l'adversaire (rien n'empêche de le traverser)
          // pour se placer entre lui et le centre.
          e.plan = versCentre;
          if (dist < 200 && b.cdDash === 0 && h < P.dash + 0.3) e.appui = T.DASH | versCentre;
        } else if (c.etat === 'bouclier' && proche) {
          // Un bouclier se contre avec une attrape.
          if (Math.random() < P.attrape) e.appui = T.ATTRAPE | versCible; else e.plan = fuite;
        } else if (c.etat === 'sonne' && dist < portee * 2.5 && Math.abs(dy) < 90 && h < P.combo) {
          // Adversaire sonné : on enchaîne, et on termine fort s'il est très abîmé.
          e.plan = versCible;
          if (c.degats > 90) { e.appui = T.FORT | versCible; e.fort = alea(6, 26); } else e.appui = T.LEGER | versCible;
        } else if (!b.sol && dist < portee * 1.4 && Math.abs(dy) < 90) {
          e.appui = T.LEGER | versCible; // en l'air : attaque aérienne
        } else if (!proche) {
          // --- On s'approche, ou on tire de loin ---
          e.plan = versCible;
          if (S.spe2.changerArme && b.cd2 === 0 && h < 0.25) {
            e.appui = T.BAS | T.SPECIAL; // change d'arme
          } else if (b.sol && dist > 230 && b.cdDash === 0 && h < P.dash) {
            e.appui = T.DASH | versCible;
          } else if (Math.abs(dy) < 80 && dist < 560 && b.cd1 === 0 && h < P.special) {
            e.appui = T.SPECIAL | versCible;
          } else if (!S.spe2.changerArme && Math.abs(dy) < 80 && dist < 300 && b.cd2 === 0 && h < P.special * 0.35) {
            e.appui = T.BAS | T.SPECIAL | versCible; // piège ou zone
          } else if (dy < -70) {
            e.saut = 2;
            if (h < 0.5) e.appui = T.LEGER | T.HAUT;
          } else if (dy > 110 && b.sol) {
            e.appui = T.BAS; // traverse la plateforme pour redescendre
          }
        } else {
          // --- À portée : on frappe ---
          const h2 = Math.random();
          const spe3Sol = S.spe3 && !(S.spe3.elan && S.spe3.elan.vy > 0);
          if (b.cd3 === 0 && spe3Sol && h2 < P.special * 0.22) e.appui = T.HAUT | T.SPECIAL | versCible;
          else if (b.cd1 === 0 && h2 < P.special * 0.4) e.appui = T.SPECIAL | versCible;
          else if (achever && bienPlace && h2 < 0.55 + 0.3 * P.agress) {
            // Il est abîmé et bien placé : coup fort, chargé, pour l'envoyer au loin.
            e.appui = T.FORT | versCible;
            e.fort = alea(10, 44);
          }
          else if (h2 < P.agress * 0.55) e.appui = T.LEGER | versCible | (dy < -40 ? T.HAUT : 0);
          else if (h2 < P.agress) { e.appui = T.FORT | versCible; e.fort = alea(3, 8 + Math.round(2.4 * P.niveau)); }
          else e.plan = fuite; // on recule un instant
        }
      }

      // ---------------------------------------------------------------------
      // Touches de ce tick
      // ---------------------------------------------------------------------
      let mk = e.plan;
      if (e.saut > 0) { e.saut--; mk |= T.HAUT; }
      if (e.bouclier > 0) { e.bouclier--; mk |= T.BOUCLIER; }
      if (e.appui) { mk |= e.appui; e.appui = 0; }
      if (e.fort > 0) { e.fort--; mk |= T.FORT; } // on maintient la touche pour charger

      // Poursuite verticale : l'adversaire est plus haut (sur une plateforme, en l'air).
      // On saute, on se place sous lui, puis on utilise le double saut.
      if (dy < -60 && Math.abs(dx) < 320) {
        if (b.sol && b.etat === 'libre' && tick % 12 === 0) mk |= T.HAUT;
        else if (!b.sol && b.etat === 'libre' && b.sauts > 0 && b.vy > -1 && tick % 6 === 0) mk |= T.HAUT;
        if (!(mk & (T.GAUCHE | T.DROITE)) && Math.abs(dx) > 25 && !b.sol) mk |= versCible;
      }

      // Ne pas marcher (ni dasher) dans le vide.
      const sous = C.carte.sols.find((s) => b.sol && b.y === s.y && b.x >= s.x0 - 10 && b.x <= s.x1 + 10);
      if (sous) {
        if (b.x < sous.x0 + 30 && (mk & T.GAUCHE)) mk &= ~(T.GAUCHE | T.DASH);
        if (b.x > sous.x1 - 30 && (mk & T.DROITE)) mk &= ~(T.DROITE | T.DASH);
      }
      return mk;
    }

    return { niveau: P.niveau, params: P, touches };
  }

  const ia = { creer, params };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ia;
  } else {
    racine.NB.ia = ia;
  }
})(typeof self !== 'undefined' ? self : this);
