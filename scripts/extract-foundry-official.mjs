// Extract official Draw Steel item documents from the system's public GitHub repo
// (MetaMorphic-Digital/draw-steel) into public/foundry-items.json, used by the
// FoundryVTT exporter to embed official compendium items instead of generated ones.
//
// Usage: node scripts/extract-foundry-official.mjs [ref]   (default ref: 1.1.x)
// Optional: set GITHUB_TOKEN to authenticate the single tree-listing API call.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'MetaMorphic-Digital/draw-steel';
const REF = process.argv[2] || '1.1.x';
const PACKS = ['abilities', 'classes', 'character-options', 'origins'];
const TYPES = new Set([
  'ability', 'class', 'subclass', 'feature', 'kit', 'perk', 'complication',
  'ancestry', 'ancestryTrait', 'culture', 'career',
]);
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'foundry-items.json');

// Same normalizer as dsid() in src/foundry-export.js.
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function main() {
  const headers = { 'User-Agent': 'liber-heroum-extractor' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  console.log(`Listing tree ${REPO}@${REF} ...`);
  const treeRes = await fetch(`https://api.github.com/repos/${REPO}/git/trees/${REF}?recursive=1`, { headers });
  if (!treeRes.ok) throw new Error(`tree API: ${treeRes.status} ${await treeRes.text()}`);
  const tree = await treeRes.json();
  if (tree.truncated) throw new Error('tree listing truncated — need a different fetch strategy');

  const packRe = new RegExp(`^src/packs/(${PACKS.join('|')})/.*\\.json$`);
  const paths = tree.tree
    .filter(n => n.type === 'blob' && packRe.test(n.path))
    .map(n => n.path)
    .filter(p => TYPES.has(p.split('/').pop().split('_')[0]));
  console.log(`${paths.length} item documents to fetch`);

  // Recursively remove keys that only make sense inside a compendium pack.
  const STRIP = new Set(['_key', '_stats']);
  const strip = (v) => {
    if (Array.isArray(v)) { v.forEach(strip); return v; }
    if (v && typeof v === 'object') {
      for (const k of Object.keys(v)) {
        if (STRIP.has(k)) delete v[k];
        else strip(v[k]);
      }
    }
    return v;
  };

  const fetchDoc = async (path, attempt = 0) => {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${REPO}/${REF}/${encodeURI(path)}`, {
        headers: { 'User-Agent': headers['User-Agent'] },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt < 2) return fetchDoc(path, attempt + 1);
      throw new Error(`${path}: ${err.message}`);
    }
  };

  // Worker pool, 10 concurrent fetches.
  const docs = new Array(paths.length);
  let next = 0, done = 0;
  await Promise.all(Array.from({ length: 10 }, async () => {
    while (next < paths.length) {
      const i = next++;
      docs[i] = await fetchDoc(paths[i]);
      if (++done % 200 === 0) console.log(`  ${done}/${paths.length}`);
    }
  }));

  // Build the index: "<type>:<slug>" → doc, or array of {scope, doc} on collision.
  const items = {};
  const counts = {};
  const register = (key, entry) => {
    const existing = items[key];
    if (!existing) items[key] = entry;
    else if (Array.isArray(existing)) existing.push(entry);
    else items[key] = [existing, entry];
  };
  paths.forEach((path, i) => {
    const doc = strip(docs[i]);
    delete doc.folder;
    delete doc.sort;
    for (const e of doc.effects || []) delete e.folder;
    counts[doc.type] = (counts[doc.type] || 0) + 1;
    // Scope: normalized dir segments between the pack root and the file, ids stripped —
    // used by the exporter to break ties (e.g. domain features under Censor vs Conduit).
    const segs = path.split('/');
    const scope = segs.slice(2, -1).map(s => norm(s.replace(/_[a-zA-Z0-9]{16}$/, '')));
    const entry = { scope, doc };
    const keys = new Set([norm(doc.system?._dsid || doc.name), norm(doc.name)]);
    for (const k of keys) if (k) register(`${doc.type}:${k}`, entry);
  });

  // Collapse singletons to bare docs (the common case) to keep the file lean.
  let collisions = 0;
  for (const [k, v] of Object.entries(items)) {
    if (Array.isArray(v)) collisions++;
    else items[k] = v.doc;
  }

  const versionRes = await fetch(`https://raw.githubusercontent.com/${REPO}/${REF}/system.json`, { headers });
  const version = versionRes.ok ? (await versionRes.json()).version : REF;

  const out = {
    system: 'draw-steel', ref: REF, version,
    generated: new Date().toISOString(),
    counts, items,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  const json = JSON.stringify(out);
  writeFileSync(OUT, json);
  console.log(`Wrote ${OUT}`);
  console.log(`  system version ${version}, ${Object.keys(items).length} keys (${collisions} with collisions)`);
  console.log(`  counts: ${JSON.stringify(counts)}`);
  console.log(`  size: ${(json.length / 1024 / 1024).toFixed(2)} MB`);
}

main().catch(err => { console.error(err); process.exit(1); });
