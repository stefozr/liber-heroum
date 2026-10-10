// Bundle the installed Summoner module for browser exports. Read temporary copies
// of its LevelDB packs so extraction never opens or changes the live Foundry data.
// Usage: node scripts/extract-foundry-summoner.mjs [module-directory]
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadClassicLevel } from './foundry-libs.mjs';

const MODULE_ID = 'draw-steel-summoner-class';
const PACKS = ['summoner-class', 'summoner-kits'];
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function buildSummonerIndex(manifest, packs) {
  if (manifest.id !== MODULE_ID) throw new Error(`Expected module ${MODULE_ID}, got ${manifest.id}`);
  const sources = new Map();
  for (const [pack, records] of packs) {
    for (const [key, doc] of records) {
      if (key.startsWith('!items!')) sources.set(doc._id, `Compendium.${MODULE_ID}.${pack}.Item.${doc._id}`);
    }
  }
  const clean = value => {
    if (typeof value === 'string') {
      // These are leftover authoring-world references in the module's grants and
      // effects. Only rewrite targets that actually exist in the extracted packs.
      return value.replace(/Compendium\.world\.(?:classes|complications-perks-kits)\.Item\.([A-Za-z0-9]{16})/g,
        (uuid, id) => sources.get(id) || uuid);
    }
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value)
        .filter(([key]) => !['_key', '_stats', 'folder'].includes(key))
        .map(([key, v]) => [key, clean(v)]));
    }
    return value;
  };
  const items = {}, counts = {};
  for (const [pack, records] of packs) {
    const folders = new Map([...records].filter(([key]) => key.startsWith('!folders!')).map(([, doc]) => [doc._id, doc]));
    for (const [key, raw] of records) {
      if (!key.startsWith('!items!')) continue;
      const doc = clean(raw);
      delete doc.sort;
      doc.effects = (raw.effects || []).map(effect => {
        if (typeof effect !== 'string') return clean(effect);
        const data = records.get(`!items.effects!${raw._id}.${effect}`);
        if (!data) throw new Error(`Missing effect ${raw.name}/${effect}`);
        return clean(data);
      });
      doc._stats = { compendiumSource: sources.get(doc._id) };
      const scope = ['summoner'];
      let folder = folders.get(raw.folder);
      const seen = new Set();
      while (folder && !seen.has(folder._id)) {
        seen.add(folder._id);
        scope.push(norm(folder.name.replace(/ Features$/, '')));
        folder = folders.get(folder.folder);
      }
      counts[doc.type] = (counts[doc.type] || 0) + 1;
      for (const name of new Set([norm(doc.name), norm(doc.system?._dsid)])) {
        if (name) (items[`${doc.type}:${name}`] ||= []).push({ scope: [...new Set(scope)], doc });
      }
    }
  }
  return { system: 'draw-steel', module: MODULE_ID, version: manifest.version, counts, items };
}

async function main() {
  const moduleDir = resolve(process.argv[2] || join(process.env.FOUNDRY_DATA || 'D:/FoundryVTT/Data', 'modules', MODULE_ID));
  const manifest = JSON.parse(await readFile(join(moduleDir, 'module.json'), 'utf8'));
  const tempRoot = resolve(tmpdir());
  const snapshot = await mkdtemp(join(tempRoot, 'lh-summoner-extract-'));
  try {
    const Level = loadClassicLevel();
    const packs = new Map();
    for (const pack of PACKS) {
      const definition = manifest.packs.find(p => p.name === pack && p.type === 'Item');
      if (!definition) throw new Error(`Missing Item pack ${pack}`);
      const destination = join(snapshot, pack);
      await cp(join(moduleDir, definition.path), destination, { recursive: true });
      const db = new Level(destination, { valueEncoding: 'json', createIfMissing: false });
      try {
        await db.open();
        packs.set(pack, new Map(await db.iterator().all()));
      } finally {
        await db.close();
      }
    }
    const index = buildSummonerIndex(manifest, packs);
    const output = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'foundry-summoner-items.json');
    await writeFile(output, JSON.stringify(index));
    console.log(`Wrote ${output}: ${MODULE_ID} ${manifest.version}, ${JSON.stringify(index.counts)}`);
  } finally {
    const target = resolve(snapshot);
    if (!target.startsWith(tempRoot + sep) || !basename(target).startsWith('lh-summoner-extract-')) {
      throw new Error(`Refusing to remove unexpected snapshot path ${target}`);
    }
    await rm(target, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(err => { console.error(err); process.exitCode = 1; });
}
