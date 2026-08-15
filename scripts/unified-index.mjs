// Read side of Extra/data-unified-main — the Draw Steel unified data repo
// (en/unified/json: one JSON file per entity, kebab-case slugs).
//
// Counterpart to official-index.mjs (which reads the vendored Foundry compendium).
// This loads the unified repo, strips its scc.v1 markdown links, and flattens its
// feature/ability files into the card shape the app stores so audit-unified.mjs can
// compare like with like.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_REF = join(ROOT, 'Extra', 'data-unified-main');

// Same normalizer as official-index.mjs / dsid() in src/foundry-export.js.
export const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const respell = (k) => k.replace(/judgment/g, 'judgement');

/**
 * Strip markdown links — `[text](scc.v1:…)` and relative links — down to their text,
 * drop HTML comments (`<!-- @type: callout -->` pipeline markers), and turn markdown
 * headings into the `**bold**` lines the app's renderer understands.
 */
export const deLink = (s) => String(s || '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/^#{2,6}\s*(.+)$/gm, '**$1**')
  .replace(/[ \t]+$/gm, '')
  .replace(/\n{3,}/g, '\n\n')
  .replace(/\s{2,}/g, (m) => (m.includes('\n') ? m : ' '))
  .trim();

/** deLink plus emphasis/heading markers removed — for similarity scoring, not display. */
export const stripMd = (s) => deLink(s)
  .replace(/\*\*([^*]*)\*\*/g, '$1').replace(/\*([^*]*)\*/g, '$1')
  .replace(/^#+\s*/gm, '').trim();

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

function* walkJson(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) yield* walkJson(p);
    else if (entry.endsWith('.json')) yield p;
  }
}

// ───────────────────────── loading ─────────────────────────

const TOP_TYPES = ['ancestry', 'career', 'class', 'complication', 'culture', 'kit', 'perk', 'skill', 'title'];

/**
 * Index en/unified/json (plus the summoner book's monster stat blocks, which only
 * exist under en/books/summoner).
 */
export function loadUnified(root = DEFAULT_REF) {
  const jsonRoot = join(root, 'en', 'unified', 'json');
  if (!existsSync(jsonRoot)) throw new Error(`unified repo not found at ${jsonRoot}`);

  // Top-level entities: "type:slug" → doc (slug = filename).
  const top = new Map();
  const topByName = new Map();
  for (const type of TOP_TYPES) {
    const dir = join(jsonRoot, type);
    if (!existsSync(dir)) continue;
    for (const p of walkJson(dir)) {
      const doc = readJson(p);
      doc._slug = basename(p, '.json');
      doc._path = relative(jsonRoot, p).replace(/\\/g, '/');
      top.set(`${type}:${doc._slug}`, doc);
      topByName.set(`${type}:${norm(doc.name)}`, doc);
    }
  }

  // Features: feature/[ability|trait]/<scope…>/[level-N/]<slug>.json
  const features = [];
  const featuresByName = new Map();
  for (const p of walkJson(join(jsonRoot, 'feature'))) {
    const doc = readJson(p);
    const rel = relative(join(jsonRoot, 'feature'), p).replace(/\\/g, '/');
    const segs = rel.split('/');
    const slug = basename(p, '.json');
    const kind = segs[0] === 'ability' || segs[0] === 'trait' ? segs.shift() : (doc.feature_type || 'feature');
    const levelSeg = segs.find(s => /^level-\d+$/.test(s));
    const level = levelSeg ? Number(levelSeg.split('-')[1]) : (doc.metadata?.level ?? null);
    const scope = segs.slice(0, -1).filter(s => !/^level-\d+$/.test(s));
    const rec = { kind, scope, level, slug, doc, path: `feature/${rel}` };
    features.push(rec);
    const k = norm(doc.name);
    if (!featuresByName.has(k)) featuresByName.set(k, []);
    featuresByName.get(k).push(rec);
  }

  // Stat blocks (summoner minions/champions/fixtures, beastheart companions):
  // these only exist in the per-book trees, not under unified/.
  const monsters = [];
  const monstersByName = new Map();
  for (const book of ['summoner', 'beastheart']) {
    const monsterRoot = join(root, 'en', 'books', book, 'json', 'monster');
    if (!existsSync(monsterRoot)) continue;
    for (const p of walkJson(monsterRoot)) {
      const doc = readJson(p);
      const rel = relative(monsterRoot, p).replace(/\\/g, '/');
      const segs = rel.split('/');
      const rec = {
        book,
        group: segs[0],                                     // minion | champion | fixture | companion | …
        section: segs[segs.length - 2] || null,             // statblock | advancement-features | portfolio dir
        portfolio: segs.includes('statblock') && book === 'summoner' ? segs[segs.indexOf('statblock') - 1] : null,
        slug: basename(p, '.json'),
        doc, path: `monster/${rel}`,
      };
      monsters.push(rec);
      const k = norm(doc.name);
      if (!monstersByName.has(k)) monstersByName.set(k, []);
      monstersByName.get(k).push(rec);
    }
  }

  return {
    root, top, topByName, features, featuresByName, monsters, monstersByName,

    /** Top-level entity by type and slug or name. */
    find(type, nameOrSlug) {
      const slug = norm(nameOrSlug);
      return top.get(`${type}:${slug}`) || topByName.get(`${type}:${slug}`)
        || top.get(`${type}:${respell(slug)}`) || topByName.get(`${type}:${respell(slug)}`) || null;
    },

    /**
     * Feature/ability/trait by name, scored against scope hints (class/ancestry slugs)
     * and an optional level. Returns the best-scoring record or null.
     */
    findFeature(name, { scope = [], level = null, kind = null } = {}) {
      const k = norm(name);
      const cands = featuresByName.get(k) || featuresByName.get(respell(k)) || [];
      if (!cands.length) return null;
      const want = scope.map(norm);
      const scored = cands.map(r => ({
        r,
        score: (kind && r.kind === kind ? 4 : 0)
          + r.scope.filter(s => want.includes(s)).length * 2
          + (level != null && r.level === level ? 1 : 0),
      })).sort((a, b) => b.score - a.score);
      return scored[0].r;
    },

    /** Every record matching a name within scope, best first — a name can exist both as
     *  an ability card and as a fuller class-feature writeup. */
    findFeatureAll(name, { scope = [], level = null } = {}) {
      const k = norm(name);
      const cands = featuresByName.get(k) || featuresByName.get(respell(k)) || [];
      const want = scope.map(norm);
      return cands.map(r => ({
        r,
        score: r.scope.filter(s => want.includes(s)).length * 2
          + (level != null && r.level === level ? 1 : 0),
      })).sort((a, b) => b.score - a.score)
        .filter(x => !scope.length || x.score >= 2)
        .map(x => x.r);
    },

    /** All feature records under a scope path prefix, e.g. ['trait','dwarf']. */
    featuresUnder(...prefix) {
      const kind = prefix[0] === 'ability' || prefix[0] === 'trait' ? prefix.shift() : null;
      return features.filter(r => (!kind || r.kind === kind)
        && prefix.every((seg, i) => r.scope[i] === seg));
    },

    findMonster(name, filter = {}) {
      const cands = (monstersByName.get(norm(name)) || [])
        .filter(r => Object.entries(filter).every(([k, v]) => r[k] === v));
      return cands[0] || null;
    },
  };
}

// ───────────────────────── renderers ─────────────────────────

/** "3 Focus" → 3; "Signature" / null → null. */
export const parseCost = (cost) => {
  const m = String(cost || '').match(/^(\d+)/);
  return m ? Number(m[1]) : null;
};

/**
 * effects[].roll "Power Roll + [Might](…) or [Agility](…)" → "Might or Agility".
 * Monster stat blocks write "2d10 + R" instead — strip the dice the same way.
 */
const parseRoll = (roll) => deLink(roll || '')
  .replace(/^\s*Power Roll\s*\+\s*/i, '').replace(/^\s*2d10\s*\+\s*/i, '').trim();

/**
 * Flatten a unified feature/ability doc into the app's ability-card shape
 * (see `ab()` in src/data/classes.js) so compareAbility-style logic works on it.
 */
export function renderAbility(doc) {
  const effects = doc.effects || [];
  const roll = effects.find(e => e.roll != null);
  const effectParts = [];
  const spendParts = [];
  const strainedParts = [];
  for (const e of effects) {
    if (e.roll != null) continue;
    const text = deLink(e.effect || '');
    if (!text) continue;
    if (e.cost != null || /^spend/i.test(e.name || '')) {
      const cost = e.cost != null ? deLink(String(e.cost)) : (e.name || '');
      spendParts.push({ cost, text });
    } else if (/^strained$/i.test(e.name || '')) {
      strainedParts.push(text);                 // the Talent's strain riders — the app has a dedicated field
    } else if (!e.name || /^effects?$/i.test(e.name)) {
      effectParts.push(text);
    } else {
      effectParts.push(`**${deLink(e.name)}:** ${text}`);
    }
  }
  return {
    name: doc.name,
    flavor: deLink(doc.flavor || ''),
    keywords: (doc.keywords || []).map(k => deLink(k)),
    type: deLink(doc.usage || ''),
    distance: deLink(doc.distance || ''),
    target: deLink(doc.target || ''),
    trigger: deLink(doc.trigger || ''),
    cost: parseCost(doc.cost),
    costText: deLink(doc.cost || ''),
    powerRoll: roll ? parseRoll(roll.roll) : '',
    tiers: roll ? [roll.tier1, roll.tier2, roll.tier3].map(t => deLink(t || '')) : null,
    effect: effectParts.join('\n\n'),
    strained: strainedParts.join('\n\n'),
    spend: spendParts.map(s => (s.text.includes(String(s.cost)) ? s.text : `${s.cost}: ${s.text}`)).join('\n\n'),
    spendParts,
  };
}

/** Non-ability feature/trait text: effects[].effect joined, links stripped. */
export function renderFeatureText(doc) {
  return (doc.effects || [])
    .filter(e => e.roll == null)
    .map(e => {
      const text = deLink(e.effect || '');
      return !e.name || /^effects?$/i.test(e.name) ? text : `**${deLink(e.name)}:** ${text}`;
    })
    .filter(Boolean).join('\n\n');
}
