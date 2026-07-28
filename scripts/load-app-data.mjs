// Load the app's game-data modules outside the browser.
//
// The data lives in .jsx files that Node can't import directly, and `src/data.jsx` and
// `src/theme.jsx` publish onto `window` at module scope. Rather than stand up a Vite dev
// server (slow, and its watcher keeps the process alive), this bundles the entry points
// with esbuild — already present as a Vite dependency — into one temp ESM file and imports
// that. React is bundled along with it so no globals are needed beyond a `window` shim.
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Module-scope `Object.assign(window, ...)` in data.jsx/theme.jsx runs on import.
function installBrowserShims() {
  if (globalThis.window) return;
  const noop = () => {};
  const el = () => ({ style: {}, setAttribute: noop, appendChild: noop, remove: noop, classList: { add: noop, remove: noop } });
  globalThis.window = globalThis;
  globalThis.document = {
    createElement: el, createTextNode: el,
    head: { appendChild: noop }, body: { appendChild: noop },
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    addEventListener: noop, removeEventListener: noop,
  };
  globalThis.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
  globalThis.location = { href: 'http://localhost/', search: '', pathname: '/' };
  globalThis.history = { pushState: noop, replaceState: noop };
  globalThis.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop });
}

let cached = null;

/**
 * @returns {Promise<{DS_CLASSES, DS_ANCESTRIES, DS_CAREERS, DS_CULTURES, DS_KITS,
 *   DS_COMPLICATIONS, DS_SKILL_GROUPS, DS_LANGUAGES, DS_LEVEL_BONUSES,
 *   LEVELUP_DATA, makeContext, levelChoicesFor, PERKS, newCharacter}>}
 */
export async function loadAppData() {
  if (cached) return cached;
  installBrowserShims();

  const dir = mkdtempSync(join(tmpdir(), 'lh-appdata-'));
  const outfile = join(dir, 'bundle.mjs');
  try {
    await build({
      stdin: {
        contents: `
          export * from ${JSON.stringify(join(ROOT, 'src/data.jsx'))};
          export { LEVELUP_DATA, makeContext, levelChoicesFor, deriveGroupName,
                   DOMAIN_1ST_FEATURES, DOMAIN_2_ABILITIES, DOMAIN_4_FEATURES, CENSOR_DOMAIN_1 }
            from ${JSON.stringify(join(ROOT, 'src/levelup.jsx'))};
          export { PERKS, parseCareerSkills, classSkillPicks, pickPool }
            from ${JSON.stringify(join(ROOT, 'src/wizard/helpers.js'))};
          export { newCharacter, computeDerived, classDef } from ${JSON.stringify(join(ROOT, 'src/app.jsx'))};
        `,
        resolveDir: ROOT,
        loader: 'js',
      },
      bundle: true, format: 'esm', platform: 'node', target: 'node20',
      outfile, logLevel: 'silent',
      loader: { '.js': 'jsx', '.jsx': 'jsx' },
      // import.meta.env is Vite's; supabaseClient falls back to a placeholder without it.
      define: { 'import.meta.env': '{}' },
    });
    cached = await import(pathToFileURL(outfile).href);
    return cached;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
