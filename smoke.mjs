// Headless smoke test: load the built bundle in jsdom and confirm <App/> mounts
// without throwing, and that it renders the login gate (the cold-start view).
import { JSDOM } from 'jsdom';
import { readdirSync } from 'fs';

const dom = new JSDOM(
  '<!doctype html><html><head></head><body data-theme="obsidian"><div id="root"></div></body></html>',
  { url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'outside-only' }
);
const { window } = dom;

// Map browser globals Node doesn't have. Some (navigator) are read-only in
// Node 25, so define defensively.
const def = (k, v) => { try { globalThis[k] = v; } catch { Object.defineProperty(globalThis, k, { value: v, configurable: true }); } };
def('window', window);
def('document', window.document);
def('HTMLElement', window.HTMLElement);
def('Node', window.Node);
for (const k of ['MutationObserver', 'CustomEvent', 'Event', 'Element', 'DocumentFragment', 'DOMParser', 'localStorage', 'sessionStorage', 'HTMLInputElement', 'HTMLTextAreaElement', 'SVGElement']) {
  if (window[k] !== undefined) def(k, window[k]);
}
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
window.matchMedia = window.matchMedia || (() => ({
  matches: false, media: '', onchange: null,
  addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; },
}));
window.scrollTo = () => {};

const errors = [];
window.addEventListener('error', (e) => errors.push('window error: ' + (e.error?.stack || e.message)));
const origError = console.error;
console.error = (...a) => { errors.push('console.error: ' + a.map(String).join(' ')); origError(...a); };

// The bundle is an ES module; evaluate it in this (globals-injected) context.
const bundlePath = './dist/assets/' + readdirSync('dist/assets').find(f => f.endsWith('.js'));

try {
  await import(bundlePath);
} catch (e) {
  console.log('IMPORT THREW:\n', e.stack || e);
  process.exit(1);
}

await new Promise(r => setTimeout(r, 600));

const rootHTML = window.document.getElementById('root').innerHTML;
const has = (s) => rootHTML.includes(s) ? 'YES' : 'no';
console.log('--- markers: LIBER HEROUM:', has('LIBER HEROUM'),
  '| Enter the Chronicle:', has('Enter the Chronicle'),
  '| Continue with Discord:', has('Continue with Discord'),
  '| still-booting:', has('Opening the Liber'));
console.log('--- root innerHTML length:', rootHTML.length);
const sample = rootHTML.replace(/\s+/g, ' ').slice(0, 300);
console.log('--- root sample:', sample);
if (errors.length) {
  console.log('--- captured errors (' + errors.length + '):');
  for (const e of errors.slice(0, 8)) console.log('   •', e.slice(0, 400));
}
if (rootHTML.length < 50) {
  console.log('FAIL: root appears empty — App did not render.');
  process.exit(1);
}
console.log('PASS: App mounted and rendered content.');
process.exit(errors.some(e => e.includes('error')) ? 2 : 0);
