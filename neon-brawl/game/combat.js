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
