// data.jsx — barrel that re-exports the per-domain game-data modules in src/data/.
// Kept at this path (and still publishing to window) so existing importers and the
// window.DS_SKILL_GROUPS reads in the wizard class pickers are unaffected.
import { DS_LANGUAGES } from './data/languages.js';
import { DS_SKILL_GROUPS } from './data/skills.js';
import { DS_ANCESTRIES } from './data/ancestries.js';
import { DS_CULTURES } from './data/cultures.js';
import { DS_CAREERS } from './data/careers.js';
import { DS_CLASSES } from './data/classes.js';
import { DS_KITS } from './data/kits.js';
import { DS_COMPLICATIONS } from './data/complications.js';
import { DS_STEPS } from './data/steps.js';

Object.assign(window, {
  DS_LANGUAGES, DS_SKILL_GROUPS, DS_ANCESTRIES, DS_CULTURES, DS_CAREERS, DS_CLASSES, DS_KITS, DS_COMPLICATIONS, DS_STEPS,
});

export {
  DS_LANGUAGES, DS_SKILL_GROUPS, DS_ANCESTRIES, DS_CULTURES, DS_CAREERS, DS_CLASSES, DS_KITS, DS_COMPLICATIONS, DS_STEPS,
};
