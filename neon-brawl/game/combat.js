// =============================================================================
// combat.js — Interactions entre joueurs (serveur uniquement).
//
//   - détection des coups (zone de frappe contre corps adverse)
//   - dégâts, éjection, hitstun, hit freeze, bouclier
//   - sorties d'écran (perte d'une vie) et réapparition
//
// Les navigateurs ne calculent jamais rien de tout ça : ils reçoivent le
// résultat dans l'état envoyé par le serveur.
// =============================================================================
const C = require('./constants');
const { PERSOS, infosAttaque } = require('./characters');
const physics = require('./physics');

const DELAI_REAPPARITION = 70; // ticks entre l'éjection et le retour en jeu

/** Vrai si le cercle (cx, cy, r) touche le corps du joueur v. */
function cercleToucheCorps(cx, cy, r, v) {
  const S = PERSOS[v.perso] || PERSOS.nova;
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

  for (const coup of coups) appliquerCoup(coup, evenements);
}

function appliquerCoup({ a, v, infos, cx, cy }, evenements) {
  const { attaque, perso } = infos;
  // Une attaque chargée à fond fait 40 % de dégâts en plus et éjecte plus loin.
  const charge = Math.min(1, a.charge / C.CHARGE_MAX);
  const degats = attaque.deg * perso.puissance * (1 + 0.4 * charge);
  const sv = PERSOS[v.perso] || PERSOS.nova;
  // Point d'impact, à mi-chemin entre la zone de frappe et la victime.
  const ix = (cx + v.x) / 2;
  const iy = (cy + v.y - sv.h / 2) / 2;

  // --- Coup paré par le bouclier ---
  if (v.etat === 'bouclier') {
    v.bouclier -= degats * 1.3;
    v.vx = (v.x >= a.x ? 1 : -1) * 2.5;
    a.gel = v.gel = 4;
    if (v.bouclier <= 0) {
      physics.briserBouclier(v);
      evenements.push({ t: 'brise', x: v.x, y: v.y - sv.h / 2, id: v.id });
    } else {
      evenements.push({ t: 'pare', x: ix, y: iy, id: v.id });
    }
    return;
  }

  // --- Coup reçu ---
  v.degats += degats;
  const ejection = ((attaque.base + v.degats * attaque.ech) * (1 + 0.3 * charge)) / sv.poids;

  const cote = attaque.deuxCotes ? (v.x === a.x ? a.dir : Math.sign(v.x - a.x)) : a.dir;
  const angle = (attaque.angle * Math.PI) / 180;
  v.vx = Math.cos(angle) * ejection * cote;
  v.vy = -Math.sin(angle) * ejection;
  // Frappé vers le bas alors qu'on est au sol : on rebondit.
  if (v.sol && v.vy > 0) v.vy = -v.vy * 0.8;
  if (v.vy < 0) v.sol = false;

  physics.changerEtat(v, 'sonne');
  v.sonne = Math.min(100, Math.round(ejection * 2.4) + 6);
  v.rapide = false;
  v.elan = 0;
  v.dir = -cote || v.dir; // la victime fait face à l'attaquant

  // Hit freeze : les deux joueurs se figent un court instant, d'autant plus
  // longtemps que le coup est fort.
  const gel = Math.max(3, Math.min(14, Math.round(3 + degats / 2)));
  a.gel = gel;
  v.gel = gel;

  evenements.push({
    t: 'coup',
    x: Math.round(ix), y: Math.round(iy),
    f: Math.round(ejection * 10) / 10,   // force, pour doser les effets
    id: v.id, de: a.id,
  });
}

/**
 * Gère les sorties d'écran et le compte à rebours des joueurs éliminés.
 * Renvoie la liste des joueurs prêts à réapparaître (au serveur de décider
 * s'ils reviennent, selon le mode de jeu).
 */
function gererSorties(joueurs, evenements) {
  const prets = [];
  const Z = C.SORTIE;
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
function reapparaitre(p, x, y = 140) {
  const garde = { nAtk: p.nAtk, prev: p.prev };
  Object.assign(p, physics.nouvelEtat(x, y), garde);
  p.degats = 0;
  p.invul = 120;
  p.dir = x < (C.BLOC.x0 + C.BLOC.x1) / 2 ? 1 : -1;
}

module.exports = { resoudreCoups, gererSorties, reapparaitre };
