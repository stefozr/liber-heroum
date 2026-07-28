// Locate the libraries that ship inside the Foundry VTT desktop app so the extraction
// scripts need no npm installs. Foundry bundles classic-level (LevelDB + snappy, with a
// win32-x64 N-API prebuild) and a pinned pdf.js — both load fine under plain Node.
//
// Override the app root with FOUNDRY_APP if Foundry lives somewhere else.
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const CANDIDATES = [
  process.env.FOUNDRY_APP,
  'C:/Program Files/Foundry Virtual Tabletop/resources/app',
  'C:/Program Files (x86)/Foundry Virtual Tabletop/resources/app',
  '/Applications/Foundry Virtual Tabletop.app/Contents/Resources/app',
].filter(Boolean);

function appRoot() {
  for (const dir of CANDIDATES) {
    if (existsSync(join(dir, 'node_modules'))) return dir;
  }
  throw new Error(
    `Could not find the Foundry VTT app directory. Tried:\n  ${CANDIDATES.join('\n  ')}\n` +
    'Set FOUNDRY_APP to the directory containing Foundry\'s node_modules.');
}

const modulesDir = () => join(appRoot(), 'node_modules');

/** Foundry's classic-level (LevelDB). Used to read compendium packs. */
export function loadClassicLevel() {
  const path = join(modulesDir(), 'classic-level');
  if (!existsSync(path)) throw new Error(`classic-level not found at ${path}`);
  return createRequire(import.meta.url)(path).ClassicLevel;
}

/** Foundry's pinned pdf.js, plus the asset paths its text layer needs. */
export async function loadPdfjs() {
  const base = join(modulesDir(), '@foundryvtt', 'pdfjs');
  if (!existsSync(base)) throw new Error(`@foundryvtt/pdfjs not found at ${base}`);
  const lib = await import(pathToFileURL(join(base, 'build', 'pdf.mjs')).href);
  return {
    lib,
    // Trailing separators are required — pdf.js concatenates the file name onto these.
    cMapUrl: pathToFileURL(join(base, 'web', 'cmaps')).href + '/',
    standardFontDataUrl: pathToFileURL(join(base, 'web', 'standard_fonts')).href + '/',
  };
}
