// =============================================================================
// assembler.js — Fabrique « neon-brawl-tout-en-un.js » : tout le jeu (serveur,
// règles et page web) réuni dans UN SEUL fichier, à partir des fichiers du projet.
//
// Utilisation :  npm run assembler
//
// Le fichier produit ne doit pas être modifié à la main : on modifie les
// fichiers d'origine, puis on relance cette commande.
// =============================================================================
const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..');
const lire = (fichier) => fs.readFileSync(path.join(racine, fichier), 'utf8').trimEnd();
const indenter = (texte) => texte.split('\n').map((l) => (l ? '    ' + l : l)).join('\n');

// Modules du jeu, dans l'ordre où ils dépendent les uns des autres.
const MODULES = ['constants', 'characters', 'physics', 'combat', 'capacites'];

// La page est rangée dans une chaîne `...` : on protège les caractères spéciaux.
const page = lire('public/index.html')
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$\{/g, '\\${');

let sortie = `// =============================================================================
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
`;

for (const nom of MODULES) {
  sortie += `
// -----------------------------------------------------------------------------
// Module « ${nom} »  (fichier d'origine : game/${nom}.js)
// -----------------------------------------------------------------------------
MODULES['${nom}'] = function (module, exports, require) {
${indenter(lire(`game/${nom}.js`))}
};
`;
}

sortie += `
// #############################################################################
// PARTIE 2 — PAGE WEB  (fichier d'origine : public/index.html)
// #############################################################################
const PAGE_WEB = \`${page}\`;

// #############################################################################
// PARTIE 3 — SERVEUR  (fichier d'origine : server.js)
// #############################################################################
MODULES['serveur'] = function (module, exports, require, __dirname) {
${indenter(lire('server.js'))}
};

// #############################################################################
// PARTIE 4 — DÉMARRAGE
// Petit mécanisme qui relie les parties entre elles, puis lance le serveur.
// #############################################################################
const dejaCharges = {};

/** Remplace « require » : sert les modules de ce fichier, sinon ceux de Node. */
function charger(nom) {
  const cle = nom.replace(/^\\.\\/(game\\/)?/, '');
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
    const cle = nom.replace(/\\.js$/, '');
    if (MODULES[cle]) return '(' + MODULES[cle].toString() + ')();';
    return require('fs').readFileSync(chemin, 'utf8');
  },
};

charger('serveur');
`;

// =============================================================================
// Deuxième fichier produit : « neon-brawl.html », une page autonome à déposer
// telle quelle sur un serveur web (Apache…) ou à ouvrir par double-clic.
// =============================================================================
const balise = (titre, code) => `<script>\n// ---- ${titre} ----\n${code}\n</script>`;
const partage = ['constants', 'characters', 'physics'].map((nom) => balise(`game/${nom}.js`, lire(`game/${nom}.js`)));
// combat.js et capacites.js sont écrits pour Node (require / module.exports) : on l'enveloppe.
for (const nom of ['combat', 'capacites']) {
  partage.push(balise(`game/${nom}.js`, `(function () {
const module = { exports: {} };
const require = (n) => ({ './constants': NB.constants, './characters': NB.persos, './physics': NB.physics, './combat': NB.combat })[n];
${lire(`game/${nom}.js`)}
NB.${nom} = module.exports;
})();`));
}
partage.push(balise('game/local.js', lire('game/local.js')));
const pageAutonome = lire('public/index.html').replace('<!--NB_PARTAGE-->', () => partage.join('\n'));
fs.writeFileSync(path.join(racine, 'neon-brawl.html'), pageAutonome + '\n');
console.log(`Écrit : neon-brawl.html (${pageAutonome.split('\n').length} lignes)`);

const cible = path.join(racine, 'neon-brawl-tout-en-un.js');
fs.writeFileSync(cible, sortie);
console.log(`Écrit : ${cible} (${sortie.split('\n').length} lignes)`);
