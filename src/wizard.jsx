// wizard.jsx — barrel re-exporting the creation wizard (see src/wizard/).
// Kept at this path and still publishing to window (app/play/levelup read window.PERKS).
import { Wizard } from './wizard/Wizard.jsx';
import { PERKS } from './wizard/helpers.js';

Object.assign(window, { Wizard, PERKS });
export { Wizard, PERKS };
