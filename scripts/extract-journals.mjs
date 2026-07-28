// Extract a Foundry VTT LevelDB compendium pack into readable JSON + Markdown.
//
//   node scripts/extract-journals.mjs                 # both default packs
//   node scripts/extract-journals.mjs <packDir> [out] # a specific pack
//
// Reads with the classic-level that ships inside the Foundry desktop app (see
// scripts/foundry-libs.mjs) — no npm install needed.
//
// IMPORTANT: classic-level has no read-only mode. Opening a pack takes its LOCK and
// rewrites LOG/MANIFEST. So the pack is copied to a temp dir first and the original is
// never touched. Foundry must not be running.
//
// Output lands in reference/ (gitignored) — the Heroes book is licensed commercial
// content and must not be committed.
import {
  cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadClassicLevel } from './foundry-libs.mjs';
import { htmlToText } from './html-to-text.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_ROOT = join(ROOT, 'reference');

const DEFAULT_PACKS = [
  { dir: join(ROOT, 'Extra', 'draw-steel-heroes', 'packs', 'journal'), name: 'heroes-journal' },
  { dir: 'D:/FoundryVTT/Data/systems/draw-steel/packs/journals', name: 'system-journals' },
];

const slug = (s) => String(s || 'untitled').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'untitled';

// Newest mtime anywhere in the pack dir — used for the skip-if-fresh check.
function newestMtime(dir) {
  let newest = 0;
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else newest = Math.max(newest, statSync(p).mtimeMs);
    }
  };
  walk(dir);
  return newest;
}

/** Read every key/value out of a pack, working on a throwaway copy. */
async function readPack(packDir) {
  const ClassicLevel = loadClassicLevel();
  const scratch = mkdtempSync(join(tmpdir(), 'ds-pack-'));
  const copy = join(scratch, 'pack');
  cpSync(packDir, copy, { recursive: true });
  // A stale LOCK from an unclean shutdown would block the open.
  rmSync(join(copy, 'LOCK'), { force: true });

  const db = new ClassicLevel(copy, { valueEncoding: 'json' });
  try {
    await db.open();
    const entries = [];
    for await (const [key, value] of db.iterator()) entries.push([key, value]);
    return entries;
  } finally {
    await db.close().catch(() => {});
    rmSync(scratch, { recursive: true, force: true });
  }
}

// Foundry pack keys look like:
//   !folders!<id>                      !journal!<id>
//   !journal.pages!<journalId>.<pageId> !journal.categories!<journalId>.<catId>
// The segment between the bangs is the document path.
const docPath = (key) => (key.match(/^!([^!]+)!/) || [, ''])[1];

function build(entries) {
  const journals = new Map();   // id → { _id, name, sort, categories: Map, pages: [] }
  const folders = new Map();
  const other = [];

  for (const [key, doc] of entries) {
    const path = docPath(key);
    if (path === 'folders') { folders.set(doc._id, doc); continue; }
    if (path === 'journal') {
      journals.set(doc._id, { ...doc, categories: new Map(), pages: [] });
      continue;
    }
    if (path === 'journal.categories' || path === 'journal.pages') continue; // second pass
    other.push([key, doc]);
  }

  for (const [key, doc] of entries) {
    const path = docPath(key);
    if (path !== 'journal.categories' && path !== 'journal.pages') continue;
    const parentId = key.slice(path.length + 2).split('.')[0];
    const journal = journals.get(parentId);
    if (!journal) { other.push([key, doc]); continue; }
    if (path === 'journal.categories') journal.categories.set(doc._id, doc);
    else journal.pages.push(doc);
  }

  for (const j of journals.values()) j.pages.sort((a, b) => (a.sort || 0) - (b.sort || 0));
  return { journals, folders, other };
}

// Pages nearly always open with an <h1> repeating their own title (Foundry hides it via
// title.show=false). Drop it so the page name isn't stated twice.
function dropRedundantTitle(text, name) {
  const m = text.match(/^#{1,3}\s+(.+?)\s*\n+/);
  if (m && m[1].trim().toLowerCase() === String(name || '').trim().toLowerCase()) {
    return text.slice(m[0].length);
  }
  return text;
}

function pageRecord(page, journal) {
  const category = page.category ? journal.categories.get(page.category)?.name || null : null;
  // text.content is the usual shape; image/pdf/video pages have no prose.
  const html = page.text?.content || '';
  return {
    id: page._id,
    journal: journal.name,
    journalId: journal._id,
    category,
    name: page.name,
    sort: page.sort ?? 0,
    type: page.type,
    level: page.title?.level ?? null,
    text: dropRedundantTitle(htmlToText(html), page.name),
    html,
  };
}

async function extractPack({ dir, name }) {
  if (!existsSync(dir)) {
    console.warn(`  skip ${name}: ${dir} not found`);
    return null;
  }
  const outDir = join(OUT_ROOT, name);
  const indexPath = join(outDir, 'index.json');
  if (existsSync(indexPath) && statSync(indexPath).mtimeMs > newestMtime(dir)) {
    console.log(`  ${name}: up to date, skipping`);
    return JSON.parse(readFileSync(indexPath, 'utf8'));
  }

  console.log(`  ${name}: reading ${dir}`);
  const entries = await readPack(dir);
  const { journals, folders, other } = build(entries);

  const pages = [];
  for (const j of journals.values()) for (const p of j.pages) pages.push(pageRecord(p, j));

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'pages.json'), JSON.stringify(pages, null, 1));

  // One Markdown file per journal, pages in book order — this is what's actually readable.
  const bookDir = join(outDir, 'book');
  mkdirSync(bookDir, { recursive: true });
  const ordered = [...journals.values()].sort((a, b) => (a.sort || 0) - (b.sort || 0));
  for (const [i, j] of ordered.entries()) {
    const body = j.pages.map((p) => {
      const rec = pageRecord(p, j);
      const head = rec.category ? `## ${rec.category} — ${rec.name}` : `## ${rec.name}`;
      return `${head}\n\n${rec.text}`;
    }).join('\n\n---\n\n');
    writeFileSync(
      join(bookDir, `${String(i).padStart(2, '0')}-${slug(j.name)}.md`),
      `# ${j.name}\n\n${body}\n`);
  }

  const index = {
    pack: name, source: dir, extracted: new Date().toISOString(),
    counts: { journals: journals.size, pages: pages.length, folders: folders.size, unclaimed: other.length },
    journals: ordered.map(j => ({
      id: j._id, name: j.name, sort: j.sort ?? 0,
      pages: j.pages.map(p => ({ id: p._id, name: p.name, sort: p.sort ?? 0 })),
    })),
  };
  writeFileSync(indexPath, JSON.stringify(index, null, 1));
  console.log(`  ${name}: ${journals.size} journals, ${pages.length} pages → ${outDir}`);
  if (other.length) console.log(`  ${name}: ${other.length} unclaimed keys (see counts)`);
  return index;
}

async function main() {
  const [dirArg, nameArg] = process.argv.slice(2);
  const packs = dirArg ? [{ dir: resolve(dirArg), name: nameArg || slug(dirArg) }] : DEFAULT_PACKS;
  mkdirSync(OUT_ROOT, { recursive: true });
  console.log('Extracting Foundry journal packs...');
  for (const pack of packs) await extractPack(pack);
}

main().catch((err) => { console.error(err); process.exit(1); });
