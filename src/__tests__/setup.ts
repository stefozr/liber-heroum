// Vitest setup: jest-dom matchers, the level-up data module (it imports every
// per-class table and publishes window.LEVELUP_DATA / window.DOMAIN_* for the
// wizard's class pickers), and a couple of jsdom stubs the app expects.
import '@testing-library/jest-dom/vitest';

import '../levelup.jsx';

if (!window.matchMedia) {
  // @ts-expect-error minimal stub
  window.matchMedia = () => ({
    matches: false, media: '', onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; },
  });
}
window.scrollTo = () => {};
