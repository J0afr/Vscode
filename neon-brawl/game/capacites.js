// =============================================================================
// capacites.js — Capacités élémentaires (serveur uniquement).
//
// Chaque personnage a deux capacités (voir « spe1 » et « spe2 » dans
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
  if (o.auSol && !p.sol && x >= C.BLOC.x0 && x <= C.BLOC.x1 && p.y < C.SOL_Y) y = C.SOL_Y;
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
    if (p.etat !== 'attaque' || (p.atk !== 'spe1' && p.atk !== 'spe2')) continue;
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

function source(objet) {
  return {
    id: objet.proprio, joueur: null, x: objet.x, dir: objet.dir, charge: 0,
    element: objet.element, puissance: objet.puissance,
  };
}

function avancerProjectile(o, joueurs, evenements) {
  o.vy += o.def.g || 0;
  o.x += o.vx;
  o.y += o.vy;
  o.vie--;

  for (const v of joueurs) {
    if (v.id === o.proprio || v.etat === 'mort' || v.invul > 0 || o.touches.includes(v.id)) continue;
    if (!combat.cercleToucheCorps(o.x, o.y, o.r, v)) continue;
    combat.frapper(v, o.def, source(o), evenements, o.x, o.y);
    o.touches.push(v.id);
    if (!o.def.perce) { o.vie = 0; return; } // un projectile perçant continue sa route
  }

  // Le projectile s'écrase contre le bloc principal.
  if (o.x > C.BLOC.x0 && o.x < C.BLOC.x1 && o.y + o.r * 0.5 > C.SOL_Y) {
    o.vie = 0;
    evenements.push({ t: 'eclat', x: Math.round(o.x), y: C.SOL_Y, el: o.element });
  }
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
    combat.frapper(v, def, source(z), evenements, z.x, v.y - sv.h / 2);

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
  for (const o of objets) {
    if (o.type === 'p') avancerProjectile(o, joueurs, evenements);
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
    : { id: o.id, t: 'z', s: o.style, el: o.element, x: r(o.x), y: r(o.y), l: o.l, h: o.h, actif: o.delai > 0 ? 0 : 1, vie: o.vie }));
}

module.exports = { avancer, instantane };
