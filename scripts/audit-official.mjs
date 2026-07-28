// Audit the app's game data against the official Draw Steel sources.
//
//   node scripts/audit-official.mjs [classId ...]
//
// Structure comes from public/foundry-items.json (the Draw Steel system compendium,
// vendored). Printed wording comes from reference/rulebook (the PDF) — run
// scripts/extract-pdf-text.mjs and scripts/extract-journals.mjs first. Without those the
// audit still runs; it just skips the book-page citations.
//
// Writes one Markdown report per class to reference/audit/, plus SUMMARY.md.
// Findings are tagged:
//   MISSING      official content the app doesn't have
//   EXTRA        app content with no official counterpart
//   WRONG-LEVEL  present, but granted at a different level
//   WRONG-VALUE  a mechanical field disagrees (number, keyword, distance, target, ...)
//   TEXT-DRIFT   the mechanics agree but the wording is paraphrased
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAppData } from './load-app-data.mjs';
import { loadOfficial, officialAbility, officialFeature, norm } from './official-index.mjs';
import { loadBook, calibrationSamples } from './audit-book.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'reference', 'audit');
const LEVELS = Array.from({ length: 9 }, (_, i) => i + 2);   // 2..10

// ───────────────────────── text comparison ─────────────────────────

const squash = (s) => String(s || '')
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  .replace(/[–—−]/g, '-').replace(/\s+/g, ' ').trim();

const loose = (s) => squash(s).toLowerCase().replace(/[^a-z0-9+<]/g, '');

function similarity(a, b) {
  const words = (s) => new Set(squash(s).toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean));
  const A = words(a); const B = words(b);
  if (!A.size && !B.size) return 1;
  const union = new Set([...A, ...B]);
  let hits = 0;
  for (const w of A) if (B.has(w)) hits++;
  return hits / union.size;
}

// The app spells characteristics out ("Might"); the book abbreviates them ("M").
const CHAR_CANON = {
  m: 'M', might: 'M', a: 'A', agility: 'A', r: 'R', reason: 'R',
  i: 'I', intuition: 'I', p: 'P', presence: 'P',
};
const canonChars = (s) => squash(s).toLowerCase().split(/\s*(?:or|,|\/)\s*/)
  .map(x => CHAR_CANON[x] || x).filter(Boolean).join(' or ');

// The mechanically load-bearing part of a tier line: the numbers, damage types, potency
// and forced movement. Wording around them is TEXT-DRIFT; a change here is WRONG-VALUE.
const DAMAGE_TYPES = ['acid', 'cold', 'corruption', 'fire', 'holy', 'lightning', 'poison', 'psychic', 'sonic'];
function tierSignature(text) {
  const s = squash(text).toLowerCase();
  const nums = (s.match(/\d+/g) || []).join(',');
  const types = DAMAGE_TYPES.filter(t => s.includes(t)).join(',');
  const potency = (s.match(/[mapri]\s*<\s*(?:weak|average|strong)/g) || [])
    .map(x => x.replace(/\s+/g, '')).join(',');
  const forced = (s.match(/\b(push|pull|slide|vertical push|vertical pull)\b/g) || []).join(',');
  return `${nums}|${types}|${potency}|${forced}`;
}

// ───────────────────────── collecting app data ─────────────────────────

const isAbility = (n) => n && typeof n === 'object' && typeof n.name === 'string'
  && (n.tiers || n.keywords || n.powerRoll || n.distance || n.spend);

// The app stores tiers two ways: [[label, text] × 3] in classes.js, and {t1,t2,t3} in a
// few level-up tables. Mirrors normalizeTiers() in src/foundry-export.js.
const appTierTexts = (tiers) => {
  if (!tiers) return [];
  if (Array.isArray(tiers)) return tiers.map(t => (Array.isArray(t) ? t[1] : t) || '');
  return [tiers.t1 || '', tiers.t2 || '', tiers.t3 || ''];
};

/** Walk a class record for abilities, remembering where each came from. */
function abilitiesInClass(cls) {
  const out = [];
  const seen = new Set();
  const walk = (node, path) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${path}[${i}]`));
    if (isAbility(node) && !seen.has(node)) { seen.add(node); out.push({ ability: node, path, level: 1 }); }
    for (const [k, v] of Object.entries(node)) if (k !== 'ability' || !isAbility(node)) walk(v, `${path}.${k}`);
    if (node.ability && isAbility(node.ability) && !seen.has(node.ability)) {
      seen.add(node.ability);
      out.push({ ability: node.ability, path: `${path}.ability`, level: 1 });
    }
  };
  walk(cls, cls.id);
  return out;
}

const ALL_DOMAINS = ['Creation', 'Death', 'Fate', 'Knowledge', 'Life', 'Love',
  'Nature', 'Protection', 'Storm', 'Sun', 'Trickery', 'War'];

/**
 * Every context the level-up tables can be evaluated in for a class — one per subclass,
 * and for the domain classes one per domain as well. Without the domain sweep the audit
 * would report ten twelfths of the Conduit's domain options as missing.
 */
function contextsFor(cls, app) {
  const domainSets = cls.pickTwoDomains
    ? ALL_DOMAINS.map(d => [d, d === 'War' ? 'Life' : 'War'])
    : cls.pickOneDomain ? ALL_DOMAINS.map(d => [d])
    : [[]];
  const subs = (cls.subclasses || []).map(s => s.id);
  const make = (sub, domains) => {
    const c = app.newCharacter('audit', null);
    c.cclass.id = cls.id;
    c.cclass.subclass = sub;
    c.cclass.domains = domains;
    return { sub, domains, ctx: app.makeContext(c) };
  };
  const out = [];
  for (const sub of subs.length ? subs : [null]) {
    for (const domains of domainSets) out.push(make(sub, domains));
  }
  return out;
}

const resolve1 = (v, ctx) => (typeof v === 'function' ? v(ctx) : v) || [];

/** Abilities and feature names the level-up tables grant, per level and subclass. */
function levelUpContents(cls, app) {
  const table = app.LEVELUP_DATA[cls.id] || {};
  const rows = [];
  for (const { sub, ctx } of contextsFor(cls, app)) {
    for (const level of LEVELS) {
      const data = table[level];
      if (!data) continue;
      const features = resolve1(data.autoFeatures, ctx).map(f => f.name).filter(Boolean);
      const abilities = resolve1(data.autoAbilities, ctx);
      const choices = app.levelChoicesFor(cls, level, ctx).map(ch => ({
        id: ch.id, kind: ch.kind, label: ch.label,
        options: resolve1(ch.options, ctx),
      }));
      rows.push({ sub, level, features, abilities, choices, data });
    }
  }
  return rows;
}

// ───────────────────────── comparators ─────────────────────────

function compareChassis(cls, doc, add) {
  const s = doc.system || {};
  const at = `${cls.id} · chassis`;
  const cmp = (field, appVal, offVal) => {
    if (String(appVal) !== String(offVal)) {
      add('WRONG-VALUE', at, `${field}: app \`${appVal}\` vs official \`${offVal}\``, s.source?.page);
    }
  };
  cmp('starting stamina', cls.starting?.stamina1, s.stamina?.starting);
  cmp('stamina per level', cls.starting?.staminaPer, s.stamina?.level);
  cmp('recoveries', cls.starting?.recoveries, s.recoveries);
  cmp('heroic resource', cls.resource, s.primary);

  const appCore = Object.keys(cls.fixedChars || {}).map(c => c.toLowerCase()).sort().join(',');
  const offCore = [...(s.characteristics?.core || [])].sort().join(',');
  cmp('core characteristics', appCore, offCore);

  // Not modelled by the app at all — reported so the gap is visible, not as a value error.
  if (cls.turnGain == null) {
    add('MISSING', at, `heroic resource gained per turn is \`${s.turnGain}\` officially; the app does not model it`, s.source?.page);
  } else cmp('turn gain', cls.turnGain, s.turnGain);
  if (cls.epicResource == null) {
    add('MISSING', at, `epic resource is \`${s.epic}\` officially; the app does not model it`, s.source?.page);
  } else cmp('epic resource', cls.epicResource, s.epic);

  // Every staminaGain in the level table must match the class's per-level stamina.
  return;
}

const TYPE_EQUIV = [
  ['triggered', 'triggered action'],
  ['free triggered', 'free triggered action'],
  ['free maneuver', 'free maneuver'],
];
function typesAgree(a, b) {
  const x = loose(a); const y = loose(b);
  if (x === y) return true;
  return TYPE_EQUIV.some(g => g.map(loose).includes(x) && g.map(loose).includes(y));
}

function compareAbility(appAb, off, at, add, book) {
  const cite = off.page;
  const fields = book?.abilityFields(off.name, off.page) || null;

  /**
   * Report a disputed header field, letting the book decide who is wrong. The book is
   * only ever used to choose between the app's value and the compendium's — it is
   * two-column and pdf.js interleaves it, so a parsed value can belong to a neighbour.
   */
  const disputed = (field, appVal, offVal, label) => {
    const printed = fields?.[field];
    const norm = (v) => squash(v).toLowerCase();
    if (printed != null && norm(printed) === norm(appVal)) {
      add('OFFICIAL-DEFECT', at,
        `${label}: the compendium says \`${offVal || '—'}\` but the book prints \`${printed}\` — the app matches the book`, cite);
      return;
    }
    add('WRONG-VALUE', at, `${label}: app \`${appVal || '—'}\` vs official \`${offVal || '—'}\``
      + (printed != null ? `\n    - book p.${off.page}: ${printed}` : ''), cite);
  };

  // The app writes an em-dash where an ability has no keywords, exactly as the book
  // prints it — that's a rendering placeholder, not a keyword.
  const appKw = [...(appAb.keywords || [])].map(squash).filter(k => k !== '-').sort().join(', ');
  const offKw = [...off.keywords].sort().join(', ');
  if (loose(appKw) !== loose(offKw)) {
    disputed('keywords', appKw, offKw, 'keywords');
  }
  if (appAb.type && off.type && !typesAgree(appAb.type, off.type)) {
    disputed('type', appAb.type, off.type, 'action type');
  }
  if (off.distance && loose(appAb.distance) !== loose(off.distance)) {
    disputed('distance', appAb.distance, off.distance, 'distance');
  }
  if (off.target && loose(appAb.target) !== loose(off.target)) {
    disputed('target', appAb.target, off.target, 'target');
  }
  if (off.cost != null && appAb.cost != null && Number(appAb.cost) !== off.cost) {
    add('WRONG-VALUE', at, `cost: app \`${appAb.cost}\` vs official \`${off.cost}\``, cite);
  }
  if (off.powerRoll && appAb.powerRoll && canonChars(appAb.powerRoll) !== canonChars(off.powerRoll)) {
    const printed = fields?.powerRoll;
    if (printed && canonChars(printed) === canonChars(appAb.powerRoll)) {
      add('OFFICIAL-DEFECT', at,
        `power roll: the compendium says \`+ ${off.powerRoll}\` but the book prints \`+ ${printed}\` — the app matches the book`, cite);
    } else {
      add('WRONG-VALUE', at, `power roll: app \`+ ${appAb.powerRoll}\` vs official \`+ ${off.powerRoll}\``, cite);
    }
  }

  // Tiers.
  if (off.tiers) {
    const appTiers = appTierTexts(appAb.tiers);
    if (!appTiers.some(Boolean)) {
      add('MISSING', at, `official has a power roll (${off.tiers.join(' / ')}), the app has no tiers`, cite);
    } else {
      // Only consult the book when the compendium and the app actually disagree.
      let printedTiers = null;
      const printed = (i) => {
        if (printedTiers === null) printedTiers = book?.tierCandidates(off.name, off.page) || false;
        return printedTiers ? printedTiers[i] || [] : [];
      };
      for (let i = 0; i < 3; i++) {
        const a = appTiers[i] || '';
        const o = off.tiers[i] || '';
        if (loose(a) === loose(o)) continue;
        if (tierSignature(a) === tierSignature(o)) {
          add('TEXT-DRIFT', at, `tier ${i + 1}: app \`${a}\` vs official \`${o}\``, cite);
          continue;
        }
        // Mechanics disagree. The rulebook is the tiebreaker: if the app matches what's
        // printed, the compendium is the one that's wrong.
        const candidates = printed(i);
        const appMatchesBook = candidates.some(c => tierSignature(c) === tierSignature(a));
        const offMatchesBook = candidates.some(c => tierSignature(c) === tierSignature(o));
        if (appMatchesBook && !offMatchesBook) {
          add('OFFICIAL-DEFECT', at,
            `tier ${i + 1}: the compendium says \`${o || '—'}\` but the book prints ` +
            `\`${candidates.find(c => tierSignature(c) === tierSignature(a))}\` — the app matches the book`, cite);
          continue;
        }
        add('WRONG-VALUE', at, `tier ${i + 1}: app \`${a || '—'}\` vs official \`${o || '—'}\``
          + (candidates.length ? `\n    - book p.${off.page}: ${candidates.join(' // ')}` : ''), cite);
      }
    }
  } else if (appTierTexts(appAb.tiers).some(Boolean)) {
    add('EXTRA', at, 'the app gives this ability a power roll; the official document has none', cite);
  }

  // Prose. The app splits official effect text across effect/spend/trigger, so compare the
  // concatenation and only report the aggregate.
  const appProse = [appAb.effect, appAb.spend, appAb.trigger].filter(Boolean).join(' ');
  const offProse = [off.effect, off.spend, off.trigger].filter(Boolean).join(' ');
  if (offProse || appProse) {
    const score = similarity(appProse, offProse);
    if (score < 0.92) {
      const printed = book?.block(off.name, off.page);
      add(score === 0 && !appProse ? 'MISSING' : 'TEXT-DRIFT', at,
        `prose ${(score * 100).toFixed(0)}% match\n` +
        `    - app:      ${squash(appProse) || '—'}\n` +
        `    - official: ${squash(offProse) || '—'}` +
        (printed ? `\n    - book p.${off.page} (pdf ${printed.pdfPage}): ${squash(printed.text).slice(0, 400)}` : ''),
        cite);
    }
  }
}

/** Official grants for one class+subclass, bucketed by level. */
function officialProgression(O, cls, subName) {
  const byLevel = new Map();
  const push = (level, entry) => {
    if (!byLevel.has(level)) byLevel.set(level, []);
    byLevel.get(level).push(entry);
  };
  const consume = (doc, origin) => {
    if (!doc) return;
    for (const adv of Object.values(doc.system?.advancements || {})) {
      const level = adv.requirements?.level;
      if (!Number.isFinite(level)) continue;
      const pool = (adv.pool || [])
        .map(p => O.byId.get(String(p.uuid).split('.').pop()))
        .filter(Boolean)
        .map(d => ({ name: d.name, type: d.type, page: d.system?.source?.page }));
      push(level, { origin, name: adv.name, type: adv.type, chooseN: adv.chooseN, pool });
    }
  };
  consume(O.find('class', cls.name), 'class');
  if (subName) consume(O.find('subclass', subName), 'subclass');
  return byLevel;
}

function compareProgression(cls, app, O, add) {
  // Merge the domain variants: a domain class reaches different options depending on the
  // domains picked, but every one of them is legitimately available at that level.
  const contents = levelUpContents(cls, app);
  const bySub = new Map();
  for (const row of contents) {
    if (!bySub.has(row.sub)) bySub.set(row.sub, new Map());
    const levels = bySub.get(row.sub);
    const prev = levels.get(row.level);
    if (!prev) { levels.set(row.level, { ...row }); continue; }
    prev.features = [...new Set([...prev.features, ...row.features])];
    prev.abilities = [...prev.abilities, ...row.abilities];
    // Same choice id across variants is one slot with a wider option pool, not two slots.
    for (const ch of row.choices) {
      const existing = prev.choices.find(c => c.id === ch.id);
      if (existing) {
        const names = new Set(existing.options.map(o => o.name));
        existing.options = [...existing.options, ...ch.options.filter(o => !names.has(o.name))];
      } else prev.choices.push({ ...ch, options: [...ch.options] });
    }
  }

  for (const [sub, levels] of bySub) {
    const subDef = (cls.subclasses || []).find(s => s.id === sub);
    const official = officialProgression(O, cls, subDef?.name);
    const label = subDef ? `${cls.id}/${subDef.id}` : cls.id;

    // A name can legitimately sit in more than one official pool — a conduit picks two
    // domains, so the same domain feature list is offered at both L1 and L2. Accept the
    // app's placement if it matches any level the official data offers it at.
    const officialLevelsOf = new Map();
    for (const [level, grants] of official) {
      for (const g of grants) {
        for (const p of g.pool) {
          const k = norm(p.name);
          if (!officialLevelsOf.has(k)) officialLevelsOf.set(k, new Set());
          officialLevelsOf.get(k).add(level);
        }
      }
    }

    // Where does each official grant name appear in the app, and at which level?
    const appLevelOf = new Map();
    // Level 1 content lives on the class record, not in the level-up tables.
    for (const { ability } of abilitiesInClass(cls)) appLevelOf.set(norm(ability.name), 1);
    for (const f of cls.features || []) if (f.name) appLevelOf.set(norm(f.name), 1);
    for (const [level, row] of levels) {
      const names = [
        ...row.features,
        ...row.abilities.map(a => a.name),
        ...row.choices.flatMap(ch => ch.options.map(o => o.name)),
      ];
      for (const n of names) {
        if (!n) continue;
        // Domain options are labelled "Life: Blessing of Life" for the picker; the
        // official name is the part after the colon.
        for (const form of [n, n.replace(/^[A-Z][a-z]+:\s*/, '')]) {
          if (!appLevelOf.has(norm(form))) appLevelOf.set(norm(form), level);
        }
      }
    }

    for (const level of LEVELS) {
      const grants = official.get(level) || [];
      const row = levels.get(level);
      if (!row) {
        if (grants.length) add('MISSING', `${label} · L${level}`, 'the app has no level-up entry at all');
        continue;
      }
      if (row.data.staminaGain !== cls.starting?.staminaPer) {
        add('WRONG-VALUE', `${label} · L${level}`,
          `staminaGain \`${row.data.staminaGain}\` but the class gains \`${cls.starting?.staminaPer}\` per level`);
      }
      for (const grant of grants) {
        if (!grant.pool.length) continue;         // perk/skill/characteristic slots — counted below
        const missing = grant.pool.filter(p => !appLevelOf.has(norm(p.name)));
        for (const p of missing) {
          const alsoAt = [...(officialLevelsOf.get(norm(p.name)) || [])].filter(l => l !== level);
          add('MISSING', `${label} · L${level}`,
            `${grant.chooseN ? 'option for' : 'auto grant'} “${grant.name}”: **${p.name}** (${p.type}) is absent from the app`
            + (alsoAt.length ? ` _(also offered at L${alsoAt.join('/')})_` : ''),
            p.page);
        }
        for (const p of grant.pool) {
          const k = norm(p.name);
          if (!appLevelOf.has(k)) continue;
          const appLevel = appLevelOf.get(k);
          if (officialLevelsOf.get(k)?.has(appLevel)) continue;
          add('WRONG-LEVEL', `${label} · L${level}`,
            `**${p.name}** is offered at L${[...officialLevelsOf.get(k)].join('/')} officially ` +
            `but appears at L${appLevel} in the app`, p.page);
        }
      }
      // Slot counts: perks, skills and characteristic increases.
      const officialSlots = {
        perk: grants.filter(g => g.type === 'itemGrant' && /perk/i.test(g.name) && !g.pool.length).length,
        skill: grants.filter(g => g.type === 'skill').reduce((n, g) => n + (g.chooseN || 1), 0),
        characteristic: grants.filter(g => g.type === 'characteristic').length,
      };
      const appSlots = {
        perk: row.choices.filter(c => c.kind === 'perk').length,
        skill: row.choices.filter(c => c.kind === 'skill-group').length,
        // One official `characteristic` advancement can be two things in the app: a fixed
        // increase plus a player-chosen +1 (e.g. "Reason to 3, and one other by 1").
        characteristic: (row.data.autoCharacteristicIncrease || row.data.autoCharIncreaseAll
          || row.choices.some(c => c.kind === 'char-bonus')) ? 1 : 0,
      };
      for (const k of ['perk', 'skill', 'characteristic']) {
        if (officialSlots[k] !== appSlots[k]) {
          add(appSlots[k] < officialSlots[k] ? 'MISSING' : 'EXTRA', `${label} · L${level}`,
            `${k} slots: app ${appSlots[k]} vs official ${officialSlots[k]}`);
        }
      }
    }
  }
}

// ───────────────────────── report ─────────────────────────

// OFFICIAL-DEFECT is informational: the app is right and the compendium is wrong, so it
// needs no fix here — but it must stay visible so nobody "corrects" the app back.
const TAGS = ['MISSING', 'WRONG-VALUE', 'WRONG-LEVEL', 'EXTRA', 'TEXT-DRIFT', 'OFFICIAL-DEFECT'];

function renderReport(clsId, findings, meta) {
  const lines = [`# Audit — ${clsId}`, ''];
  lines.push(`Official: Draw Steel system ${meta.version} (ref ${meta.ref})`);
  if (meta.bookOffset != null) lines.push(`Book: printed page + ${meta.bookOffset} = PDF page`);
  lines.push('');
  const counts = TAGS.map(t => `${t} ${findings.filter(f => f.tag === t).length}`).join(' · ');
  lines.push(counts, '');
  for (const tag of TAGS) {
    const group = findings.filter(f => f.tag === tag);
    if (!group.length) continue;
    lines.push(`## ${tag} (${group.length})`, '');
    let lastAt = null;
    for (const f of group) {
      if (f.at !== lastAt) { lines.push(`### ${f.at}`, ''); lastAt = f.at; }
      lines.push(`- ${f.message}${f.page ? `  _(Heroes p.${f.page})_` : ''}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

// ───────────────────────── main ─────────────────────────

async function main() {
  const only = process.argv.slice(2);
  const O = loadOfficial();
  const app = await loadAppData();
  const book = loadBook();

  if (book) {
    book.calibrate(calibrationSamples(O, app.DS_CLASSES, officialAbility));
    console.log(`Book page offset: +${book.offset} (printed → PDF)`);
  } else {
    console.log('reference/rulebook not found — skipping book citations');
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const summary = [];
  const allFindings = [];

  for (const cls of app.DS_CLASSES) {
    if (only.length && !only.includes(cls.id)) continue;
    const findings = [];
    const add = (tag, at, message, page) => findings.push({ tag, at, message, page });

    const classDoc = O.find('class', cls.name);
    if (!classDoc) add('MISSING', `${cls.id} · chassis`, 'no official class document found');
    else compareChassis(cls, classDoc, add);

    // Level-1 abilities on the class record.
    for (const { ability, path } of abilitiesInClass(cls)) {
      const doc = O.find('ability', ability.name, [cls.name])
        || O.find('feature', ability.name, [cls.name]);
      if (!doc) { add('EXTRA', path, `“${ability.name}” has no official counterpart`); continue; }
      if (doc.type === 'feature') {
        const f = officialFeature(doc);
        const score = similarity([ability.effect, ability.spend].filter(Boolean).join(' '), f.text);
        if (score < 0.92) {
          add('TEXT-DRIFT', path, `“${ability.name}” prose ${(score * 100).toFixed(0)}% match\n` +
            `    - app:      ${squash(ability.effect)}\n    - official: ${squash(f.text)}`, f.page);
        }
        continue;
      }
      compareAbility(ability, officialAbility(doc), `${path} — ${ability.name}`, add, book);
    }

    // Level-up abilities.
    for (const row of levelUpContents(cls, app)) {
      const abilities = [...row.abilities, ...row.choices.filter(c => c.kind === 'ability').flatMap(c => c.options)];
      const seen = new Set();
      for (const ability of abilities) {
        if (!ability?.name || seen.has(ability.name)) continue;
        seen.add(ability.name);
        const scope = [cls.name, (cls.subclasses || []).find(s => s.id === row.sub)?.name].filter(Boolean);
        const doc = O.find('ability', ability.name, scope);
        if (!doc) { add('EXTRA', `${cls.id} · L${row.level}`, `“${ability.name}” has no official counterpart`); continue; }
        compareAbility(ability, officialAbility(doc), `${cls.id} · L${row.level} — ${ability.name}`, add, book);
      }
    }

    compareProgression(cls, app, O, add);

    // Dedupe: the same ability is often reachable from several subclass contexts.
    const unique = [];
    const seenKey = new Set();
    for (const f of findings) {
      const k = `${f.tag}|${f.at}|${f.message}`;
      if (seenKey.has(k)) continue;
      seenKey.add(k);
      unique.push(f);
    }

    writeFileSync(join(OUT_DIR, `${cls.id}.md`),
      renderReport(cls.id, unique, { version: O.version, ref: O.ref, bookOffset: book?.offset }));
    const counts = Object.fromEntries(TAGS.map(t => [t, unique.filter(f => f.tag === t).length]));
    summary.push({ cls: cls.id, total: unique.length, ...counts });
    allFindings.push({ cls: cls.id, findings: unique });
    console.log(`${cls.id.padEnd(13)} ${String(unique.length).padStart(4)} findings  ` +
      TAGS.map(t => `${t} ${counts[t]}`).join('  '));
  }

  // Emit the book-verified divergences so the CI fidelity test can honour them without
  // needing the rulebook. Names and fields only — no licensed prose is committed.
  if (book && !only.length) {
    const divergences = {};
    for (const { cls, findings } of allFindings) {
      for (const f of findings) {
        if (f.tag !== 'OFFICIAL-DEFECT') continue;
        const ability = f.at.includes(' — ') ? f.at.split(' — ').pop() : f.at;
        const field = (f.message.match(/^(keywords|action type|distance|target|power roll|tier \d)/) || [, 'other'])[1]
          .replace(/tier \d/, 'tier');
        (divergences[ability] ||= { class: cls, fields: [] });
        if (!divergences[ability].fields.includes(field)) divergences[ability].fields.push(field);
      }
    }
    writeFileSync(join(ROOT, 'src', '__tests__', 'official-divergences.json'), `${JSON.stringify({
      note: 'Places where the vendored Draw Steel compendium contradicts the printed rulebook and '
        + 'the app follows the book. Generated by scripts/audit-official.mjs, which needs '
        + 'reference/rulebook (see scripts/extract-pdf-text.mjs). Consumed by official-fidelity.test.ts.',
      generated: new Date().toISOString(),
      compendium: O.version,
      divergences,
    }, null, 2)}\n`);
    console.log(`${Object.keys(divergences).length} book-verified divergences → src/__tests__/official-divergences.json`);
  }

  const head = ['class', 'total', ...TAGS];
  const rows = summary.map(s => [s.cls, s.total, ...TAGS.map(t => s[t])]);
  const totals = ['**all**', summary.reduce((n, s) => n + s.total, 0),
    ...TAGS.map(t => summary.reduce((n, s) => n + s[t], 0))];
  writeFileSync(join(OUT_DIR, 'SUMMARY.md'), [
    '# Audit summary', '',
    `Official: Draw Steel system ${O.version} (ref ${O.ref})`,
    book ? `Book: printed page + ${book.offset} = PDF page` : 'Book: not extracted',
    '',
    `| ${head.join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...rows.map(r => `| ${r.join(' | ')} |`),
    `| ${totals.join(' | ')} |`,
    '',
  ].join('\n'));
  console.log(`\nReports → ${OUT_DIR}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
