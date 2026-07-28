// Rewrite the app's ability data in place to the official wording and values.
//
//   node scripts/apply-official-fixes.mjs --dry            # report only (default)
//   node scripts/apply-official-fixes.mjs --write          # edit the source files
//   node scripts/apply-official-fixes.mjs --write censor   # limit to some classes
//
// The data files are hand-formatted, so this does NOT reprint them. It locates each
// ability's region in the source, finds the exact string literal that currently holds a
// field's value, and swaps in the official one — leaving layout, comments and structure
// untouched. Ability factories differ per file (`ab(name, {...})` in classes.js,
// positional `ins(n, name, flavor, effect, extra)` in the level-up modules), which is why
// this works on literals rather than on call shapes.
//
// Where the audit found the compendium contradicting the printed book (OFFICIAL-DEFECT),
// the app's value is already correct and is left alone.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAppData } from './load-app-data.mjs';
import { loadOfficial, officialAbility, officialFeature, norm } from './official-index.mjs';
import { loadBook, calibrationSamples } from './audit-book.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES = [
  'src/data/classes.js',
  'src/levelup.jsx',
  'src/levelup-conduit-hi.jsx', 'src/levelup-elementalist-hi.jsx', 'src/levelup-fury-hi.jsx',
  'src/levelup-null.jsx', 'src/levelup-shadow.jsx', 'src/levelup-tactician.jsx',
  'src/levelup-talent.jsx', 'src/levelup-troubadour.jsx',
];

// ───────────────────────── string-literal scanning ─────────────────────────

/**
 * Every JS string literal in `src`, with its raw source span and decoded value.
 * Needed because the same text may be written as 'don’t' or 'don’t' — matching on
 * the decoded value finds it either way, and we only ever rewrite whole literals.
 */
function scanLiterals(src) {
  const out = [];
  const QUOTES = new Set(["'", '"', '`']);
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
    if (ch === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i) + 1; if (i < 1) break; continue; }
    if (!QUOTES.has(ch)) continue;
    const quote = ch;
    let j = i + 1;
    let value = '';
    let ok = false;
    while (j < src.length) {
      const c = src[j];
      if (c === '\\') {
        const esc = src[j + 1];
        if (esc === 'u') { value += String.fromCodePoint(parseInt(src.slice(j + 2, j + 6), 16)); j += 6; continue; }
        value += ({ n: '\n', t: '\t', r: '\r' })[esc] ?? esc;
        j += 2;
        continue;
      }
      if (c === quote) { ok = true; break; }
      if (c === '\n' && quote !== '`') break;   // unterminated: not a literal
      value += c;
      j++;
    }
    if (ok) { out.push({ start: i, end: j + 1, quote, value }); i = j; }
  }
  return out;
}

/** Re-encode a value as a source literal in the same style the file already uses. */
function encode(value, quote = "'") {
  let s = String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
  s = s.replace(new RegExp(quote, 'g'), `\\${quote}`);
  return `${quote}${s}${quote}`;
}

// ───────────────────────── planning the edits ─────────────────────────

const squash = (s) => String(s || '').replace(/\s+/g, ' ').trim();
// The app writes characteristics out in full; the book and compendium abbreviate them.
const CHAR_FULL = { M: 'Might', A: 'Agility', R: 'Reason', I: 'Intuition', P: 'Presence' };
const CHAR_LETTER = Object.fromEntries(Object.entries(CHAR_FULL).map(([k, v]) => [v.toLowerCase(), k]));
const same = (a, b) => squash(a) === squash(b);

/**
 * Ability regions in a file: from each ability-name literal to the next one. Field values
 * are searched only inside their own ability's region so an identical string belonging to
 * a different ability can't be clobbered.
 */
// An ability is always defined as the name argument of a factory call — `ab('Name', {…})`
// in classes.js, `foc(9, 'Name', flavor, effect, {…})` in the level-up modules. Anchoring
// on that excludes same-named things that aren't abilities (a Conduit prayer is also
// called "Steel") and starts the region at the definition rather than at a wrapper's
// `name:` property.
const DEFINITION_SITE = /\b[A-Za-z_$][\w$]*\(\s*(?:\d+\s*,\s*)?$/;

function abilityRegions(src, literals, names) {
  const marks = literals
    .filter(l => names.has(l.value) && DEFINITION_SITE.test(src.slice(Math.max(0, l.start - 24), l.start)))
    .map(l => ({ name: l.value, at: l.start }))
    .sort((a, b) => a.at - b.at);
  return marks.map((m, i) => ({
    name: m.name,
    from: m.at,
    to: i + 1 < marks.length ? marks[i + 1].at : src.length,
  }));
}

/**
 * Offset just inside the ability's options object, for inserting a field that isn't
 * written out because the factory supplies a default (`distance: extra?.distance ||
 * 'Melee 1'`). That's the first `{` after the ability's name that opens an object with
 * named keys — in classes.js the `ab(name, {…})` options, in the level-up modules the
 * trailing `extra` argument. Returns null when the call has no options object at all.
 */
const ABILITY_KEYS = /\b(keywords|tiers|powerRoll|distance|target|type|flavor|effect|trigger|spend|cost)\s*:/;

function optionsObjectStart(src, literals, region) {
  const strings = literals.filter(l => l.start >= region.from && l.start < region.to);
  const inString = (i) => strings.some(l => i >= l.start && i < l.end);
  for (let i = region.from; i < region.to; i++) {
    if (src[i] !== '{' || inString(i)) continue;
    // Must be an object with named keys, and specifically one holding ability fields —
    // a nested `bonuses: { … }` also has named keys but is not the options object.
    const rest = src.slice(i + 1, i + 40);
    if (!/^\s*[A-Za-z_$][\w$]*\s*:/.test(rest)) continue;
    if (!ABILITY_KEYS.test(src.slice(i, Math.min(region.to, i + 600)))) continue;
    return i + 1;
  }
  return null;
}

const DAMAGE_TYPES = ['acid', 'cold', 'corruption', 'fire', 'holy', 'lightning', 'poison', 'psychic', 'sonic'];
function tierSignature(text) {
  const s = squash(text).toLowerCase();
  return [
    (s.match(/\d+/g) || []).join(','),
    DAMAGE_TYPES.filter(t => s.includes(t)).join(','),
    (s.match(/[mapri]\s*<\s*(?:weak|average|strong)/g) || []).map(x => x.replace(/\s+/g, '')).join(','),
    (s.match(/\b(push|pull|slide)\b/g) || []).join(','),
  ].join('|');
}

const appTierTexts = (tiers) => {
  if (!tiers) return [];
  if (Array.isArray(tiers)) return tiers.map(t => (Array.isArray(t) ? t[1] : t) || '');
  return [tiers.t1 || '', tiers.t2 || '', tiers.t3 || ''];
};

/**
 * Decide a disputed field. The book is the authority, but it is two-column and pdf.js
 * interleaves the columns, so a parsed value can belong to a neighbouring ability. It is
 * therefore only ever used to *choose between* the two candidates we already have —
 * never to introduce a third value.
 *
 * Returns 'app' to keep what the app has, 'official' to take the compendium's value, or
 * 'unknown' when the book can't settle it.
 */
function arbitrate(appVal, offVal, bookVal) {
  if (bookVal == null) return 'unknown';
  const b = squash(bookVal).toLowerCase();
  if (b === squash(appVal).toLowerCase()) return 'app';
  if (b === squash(offVal).toLowerCase()) return 'official';
  return 'unknown';
}

/** The field replacements one ability needs: [{ field, from, to }]. */
function plannedEdits(appAb, off, book, notes) {
  const edits = [];
  const fields = book?.abilityFields(off.name, off.page) || null;
  // A few compendium `story` fields drop the closing full stop the book prints. Don't
  // regress punctuation the app already had.
  const keepTerminal = (current, next) =>
    /[.!?…]$/.test(String(current).trim()) && !/[.!?…]$/.test(String(next).trim())
      ? `${next}.` : next;

  const want = (field, current, next) => {
    if (next == null || next === '') return;
    if (current == null || current === '') return;      // absent fields are a data gap, not a rewrite
    const value = keepTerminal(current, next);
    if (same(current, value)) return;
    edits.push({ field, from: current, to: value });
  };

  // Header fields: let the book settle any disagreement before rewriting.
  for (const field of ['type', 'distance', 'target']) {
    const verdict = arbitrate(appAb[field], off[field], fields?.[field]);
    if (verdict === 'app') continue;
    want(field, appAb[field], off[field]);
  }
  if (off.powerRoll && appAb.powerRoll
      && arbitrate(appAb.powerRoll, off.powerRoll, fields?.powerRoll) !== 'app'
      && CHAR_LETTER[squash(appAb.powerRoll).toLowerCase()] !== off.powerRoll) {
    // The app spells the characteristic out; the compendium abbreviates it.
    const full = CHAR_FULL[off.powerRoll] || off.powerRoll;
    if (!same(appAb.powerRoll, full)) edits.push({ field: 'powerRoll', from: appAb.powerRoll, to: full });
  }
  want('trigger', appAb.trigger, off.trigger);
  // An ability with no effect text at all, where the book prints one — add the field.
  if (!appAb.effect && off.effect) edits.push({ field: 'effect', addField: off.effect });
  else want('effect', appAb.effect, off.effect);
  want('spend', appAb.spend, off.spend);
  want('flavor', appAb.flavor, off.flavor);

  if (off.tiers) {
    const current = appTierTexts(appAb.tiers);
    // The app has no power roll at all for this ability but the book prints one.
    if (!current.some(Boolean) && off.tiers.some(Boolean)) {
      edits.push({ field: 'tiers', addTiers: off.tiers });
      return edits;
    }
    for (let i = 0; i < 3; i++) {
      const a = current[i];
      const o = off.tiers[i];
      if (!a || !o || same(a, o)) continue;
      // The book wins: if the app already matches what's printed and the compendium
      // doesn't, the compendium is the wrong one — leave the app alone.
      if (tierSignature(a) !== tierSignature(o)) {
        const printed = book?.tierCandidates(off.name, off.page)?.[i] || [];
        if (printed.some(c => tierSignature(c) === tierSignature(a))
          && !printed.some(c => tierSignature(c) === tierSignature(o))) continue;
      }
      edits.push({ field: `tier${i + 1}`, from: a, to: o });
    }
  }

  // The app writes an em-dash where an ability has no keywords, exactly as the book
  // prints it, so `['—']` and `[]` mean the same thing.
  const real = (list) => (list || []).filter(k => k !== '—');
  const appKw = appAb.keywords || [];
  const offKw = off.keywords || [];
  if (real(appKw).join(', ') !== real(offKw).join(', ')) {
    const verdict = arbitrate(real(appKw).join(', '), real(offKw).join(', '),
      fields?.keywords && real(fields.keywords).join(', '));
    const removes = real(appKw).filter(k => !offKw.includes(k));
    // With no ruling from the book, trust the compendium only when it *adds* keywords.
    // Its removals have proven unreliable (it drops Area/Magic the book prints).
    if (verdict === 'official' || (verdict === 'unknown' && !removes.length && offKw.length)) {
      // Keep the em-dash placeholder rather than rendering an empty keyword line.
      edits.push({ field: 'keywords', keywords: { from: appKw, to: offKw.length ? offKw : ['—'] } });
    } else if (verdict === 'unknown' && removes.length) {
      notes?.push(`${off.name}: keywords disputed (app has ${removes.join(', ')}, compendium doesn't, book unclear) — left alone`);
    }
  }
  return edits;
}

// ───────────────────────── applying the edits ─────────────────────────

function applyToFile(path, abilitiesByName, allNames, O, book, stats) {
  const abs = join(ROOT, path);
  const src = readFileSync(abs, 'utf8');
  const literals = scanLiterals(src);
  // Boundaries come from *every* ability name the app knows, not just the in-scope ones,
  // so restricting to one class can't let an edit leak into a neighbouring ability.
  const regions = abilityRegions(src, literals, allNames);

  const replacements = [];   // { start, end, text }
  const notes = [];

  for (const region of regions) {
    const appAb = abilitiesByName.get(region.name);
    if (!appAb) continue;
    const doc = O.find('ability', region.name, appAb.__scope || []);
    if (!doc) continue;
    const off = officialAbility(doc);
    const inRegion = literals.filter(l => l.start >= region.from && l.start < region.to);

    for (const edit of plannedEdits(appAb, off, book, notes)) {
      if (edit.addField) {
        const at = optionsObjectStart(src, literals, region);
        if (at == null) { notes.push(`${region.name}: no options object for ${edit.field}`); stats.unlocated++; continue; }
        replacements.push({ start: at, end: at, field: edit.field, text: ` ${edit.field}: ${encode(edit.addField)},` });
        stats[edit.field] = (stats[edit.field] || 0) + 1;
        stats.inserted++;
        continue;
      }
      if (edit.addTiers) {
        // No tiers written at all — add the array. Raw pairs rather than the file's tier
        // helper, so this works the same in classes.js and the level-up modules.
        const at = optionsObjectStart(src, literals, region);
        if (at == null) { notes.push(`${region.name}: no options object for tiers`); stats.unlocated++; continue; }
        const pairs = ['≤11', '12–16', '17+']
          .map((label, i) => `[${encode(label)},${encode(edit.addTiers[i] || '')}]`).join(',');
        replacements.push({ start: at, end: at, field: 'tiers', text: ` tiers: [${pairs}],` });
        stats.tiers++;
        stats.inserted++;
        continue;
      }
      if (edit.keywords) {
        // Keywords are an array literal — rewrite each member, and append any that are new.
        const { from, to } = edit.keywords;
        const slots = from.map(k => inRegion.find(l => l.value === k)).filter(Boolean);
        if (slots.length !== from.length) {
          // The whole list comes from a factory default, so there is nothing to rewrite —
          // write an explicit `keywords: [...]` into the options object instead.
          const at = optionsObjectStart(src, literals, region);
          if (at == null) { notes.push(`${region.name}: keywords not located`); continue; }
          replacements.push({
            start: at, end: at, field: 'keywords',
            text: ` keywords: [${to.map(k => encode(k)).join(',')}],`,
          });
          stats.keywords++;
          stats.inserted++;
          continue;
        }
        // Replace the array literal wholesale — rewriting members one by one can't drop
        // an entry without leaving a hole in the array.
        const first = slots[0];
        const last = slots[slots.length - 1];
        const open = src.lastIndexOf('[', first.start);
        const close = src.indexOf(']', last.end);
        if (open < region.from || close < 0 || close >= region.to) {
          notes.push(`${region.name}: keywords array not delimited`);
          continue;
        }
        replacements.push({
          start: open, end: close + 1, field: 'keywords',
          text: `[${to.map(k => encode(k, first.quote)).join(',')}]`,
        });
        stats.keywords++;
        continue;
      }
      const slot = inRegion.find(l => same(l.value, edit.from));
      if (!slot) {
        // No literal to swap: the value comes from a factory default, so write an
        // explicit override into the options object instead.
        const at = /^tier/.test(edit.field) ? null : optionsObjectStart(src, literals, region);
        if (at == null) { notes.push(`${region.name}: could not locate ${edit.field} literal`); stats.unlocated++; continue; }
        if (replacements.some(r => r.start === at && r.field === edit.field)) continue;
        replacements.push({
          start: at, end: at, field: edit.field,
          text: ` ${edit.field}: ${encode(edit.to)},`,
        });
        stats[edit.field] = (stats[edit.field] || 0) + 1;
        stats.inserted++;
        continue;
      }
      if (replacements.some(r => r.start === slot.start)) continue;
      replacements.push({ start: slot.start, end: slot.end, text: encode(edit.to, slot.quote) });
      stats[edit.field.startsWith('tier') ? 'tiers' : edit.field] =
        (stats[edit.field.startsWith('tier') ? 'tiers' : edit.field] || 0) + 1;
    }
  }

  // Descending so earlier offsets stay valid; equal offsets are insertions at the same
  // point, which may all be applied.
  replacements.sort((a, b) => b.start - a.start || (b.end - b.start) - (a.end - a.start));
  let out = src;
  for (const r of replacements) out = out.slice(0, r.start) + r.text + out.slice(r.end);
  return { out, changed: replacements.length, notes, original: src };
}

// ───────────────────────── level-up features ─────────────────────────

/**
 * Class and subclass features granted automatically at a level, per the compendium.
 * `chooseN` being unset marks an automatic grant rather than a choice.
 */
function officialAutoFeatures(O, cls, subName, level) {
  const out = [];
  const consume = (doc) => {
    for (const adv of Object.values(doc?.system?.advancements || {})) {
      if (adv.requirements?.level !== level || adv.chooseN) continue;
      for (const p of adv.pool || []) {
        const d = O.byId.get(String(p.uuid).split('.').pop());
        if (d?.type === 'feature') out.push(d);
      }
    }
  };
  consume(O.find('class', cls.name));
  if (subName) consume(O.find('subclass', subName));
  return out;
}

/**
 * The app collapses graded features into one name — three levels of "Growing Ferocity
 * Improvement" where the book prints I, II and III. The Foundry export matches official
 * documents by name, so the numeral matters. Rename and re-text them from the compendium.
 */
function planFeatureEdits(app, O) {
  const edits = [];   // { file?: null, fromName, fromText, toName, toText }
  const strip = (s) => norm(s).replace(/-(i|ii|iii|iv)$/, '');

  for (const cls of app.DS_CLASSES) {
    const subs = (cls.subclasses || []).length ? cls.subclasses : [{ id: null, name: null }];
    for (const sub of subs) {
      const c = app.newCharacter('fix', null);
      c.cclass.id = cls.id;
      c.cclass.subclass = sub.id;
      c.cclass.domains = cls.pickTwoDomains ? ['Life', 'Protection'] : cls.pickOneDomain ? ['War'] : [];
      const ctx = app.makeContext(c);
      for (let level = 2; level <= 10; level++) {
        const entry = app.LEVELUP_DATA[cls.id]?.[level];
        if (!entry) continue;
        const appFeatures = (typeof entry.autoFeatures === 'function' ? entry.autoFeatures(ctx) : entry.autoFeatures) || [];
        const official = officialAutoFeatures(O, cls, sub.name, level);
        for (const f of appFeatures) {
          if (!f?.name || !f?.text) continue;
          if (official.some(d => norm(d.name) === norm(f.name))) continue;    // already exact
          const match = official.find(d => strip(d.name) === strip(f.name));
          if (!match) continue;
          const text = officialFeature(match).text;
          if (norm(match.name) === norm(f.name) && same(text, f.text)) continue;
          edits.push({ fromName: f.name, fromText: f.text, toName: match.name, toText: text });
        }
      }
    }
  }
  // The same feature is reached through several subclass contexts.
  const seen = new Set();
  return edits.filter(e => {
    const k = `${e.fromName}|${e.fromText}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function applyFeatureEdits(path, edits, stats) {
  const abs = join(ROOT, path);
  const src = readFileSync(abs, 'utf8');
  const literals = scanLiterals(src);
  const replacements = [];

  for (const edit of edits) {
    // Match on the text, which is unique — the *name* repeats across levels, which is
    // exactly the bug being fixed.
    const textSlot = literals.find(l => same(l.value, edit.fromText));
    if (!textSlot) continue;
    const nameSlot = [...literals].reverse().find(l => l.end <= textSlot.start && l.value === edit.fromName);
    if (!nameSlot || textSlot.start - nameSlot.end > 40) continue;
    if (replacements.some(r => r.start === nameSlot.start)) continue;
    replacements.push({ start: nameSlot.start, end: nameSlot.end, text: encode(edit.toName, nameSlot.quote) });
    if (!same(edit.fromText, edit.toText)) {
      replacements.push({ start: textSlot.start, end: textSlot.end, text: encode(edit.toText, textSlot.quote) });
    }
    stats.features++;
  }

  replacements.sort((a, b) => b.start - a.start);
  let out = src;
  for (const r of replacements) out = out.slice(0, r.start) + r.text + out.slice(r.end);
  return { out, changed: replacements.length, original: src };
}

// ───────────────────────── main ─────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const only = args.filter(a => !a.startsWith('--'));

  const O = loadOfficial();
  const app = await loadAppData();
  const book = loadBook();
  if (book) book.calibrate(calibrationSamples(O, app.DS_CLASSES, officialAbility));

  // Every ability the app knows, by name, with a scope hint for collision resolution.
  const byName = new Map();
  const allNames = new Set();
  const isAbility = (n) => n && typeof n === 'object' && typeof n.name === 'string'
    && (n.tiers || n.keywords || n.powerRoll || n.distance || n.spend);
  const remember = (ab, scope, inScope) => {
    allNames.add(ab.name);
    if (inScope && !byName.has(ab.name)) byName.set(ab.name, Object.assign(ab, { __scope: scope }));
  };
  for (const cls of app.DS_CLASSES) {
    const inScope = !only.length || only.includes(cls.id);
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(walk);
      if (isAbility(node)) remember(node, [cls.name], inScope);
      Object.values(node).forEach(walk);
    };
    walk(cls);
    for (const level of Object.keys(app.LEVELUP_DATA[cls.id] || {})) {
      const entry = app.LEVELUP_DATA[cls.id][level];
      for (const sub of (cls.subclasses || [{ id: null, name: null }])) {
        const c = app.newCharacter('fix', null);
        c.cclass.id = cls.id; c.cclass.subclass = sub.id;
        c.cclass.domains = cls.pickTwoDomains ? ['Life', 'Protection'] : cls.pickOneDomain ? ['War'] : [];
        const ctx = app.makeContext(c);
        const res = (v) => (typeof v === 'function' ? v(ctx) : v) || [];
        for (const ab of res(entry.autoAbilities)) if (isAbility(ab)) remember(ab, [cls.name, sub.name].filter(Boolean), inScope);
        for (const ch of app.levelChoicesFor(cls, Number(level), ctx)) {
          if (ch.kind !== 'ability') continue;
          for (const ab of res(ch.options)) if (isAbility(ab)) remember(ab, [cls.name, sub.name].filter(Boolean), inScope);
        }
      }
    }
  }
  console.log(`${byName.size} app abilities in scope (${allNames.size} known app-wide)`);

  const stats = { tiers: 0, effect: 0, spend: 0, trigger: 0, flavor: 0, type: 0, distance: 0, target: 0, keywords: 0, features: 0, inserted: 0, unlocated: 0 };
  let total = 0;
  for (const path of SOURCES) {
    const { out, changed, notes, original } = applyToFile(path, byName, allNames, O, book, stats);
    total += changed;
    if (changed) console.log(`${relative(ROOT, path).padEnd(34)} ${String(changed).padStart(4)} edits`);
    for (const n of notes) console.log(`   ! ${n}`);
    if (write && out !== original) writeFileSync(join(ROOT, path), out);
  }
  // Second phase: level-up feature names and text. The app collapses graded features
  // ("Growing Ferocity Improvement" at three levels) that the book numbers I / II / III.
  const featureEdits = planFeatureEdits(app, O);
  for (const path of SOURCES) {
    const { out, changed, original } = applyFeatureEdits(path, featureEdits, stats);
    total += changed;
    if (changed) console.log(`${relative(ROOT, path).padEnd(34)} ${String(changed).padStart(4)} feature edits`);
    if (write && out !== original) writeFileSync(join(ROOT, path), out);
  }

  console.log(`\n${total} edits ${write ? 'written' : '(dry run — pass --write to apply)'}`);
  console.log(Object.entries(stats).filter(([, v]) => v).map(([k, v]) => `  ${k}: ${v}`).join('\n'));
}

main().catch((err) => { console.error(err); process.exit(1); });
