// Vitest setup: jest-dom matchers, the level-up data side-effect modules (so
// window.LEVELUP_DATA / window.DOMAIN_* exist for the wizard's class pickers),
// and a couple of jsdom stubs the app expects.
import '@testing-library/jest-dom/vitest';

import '../levelup.jsx';
import '../levelup-troubadour.jsx';
import '../levelup-shadow.jsx';
import '../levelup-null.jsx';
import '../levelup-tactician.jsx';
import '../levelup-talent.jsx';
import '../levelup-fury-hi.jsx';
import '../levelup-conduit-hi.jsx';
import '../levelup-elementalist-hi.jsx';

if (!window.matchMedia) {
  // @ts-expect-error minimal stub
  window.matchMedia = () => ({
    matches: false, media: '', onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; },
  });
}
window.scrollTo = () => {};
