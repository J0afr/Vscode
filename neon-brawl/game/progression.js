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
