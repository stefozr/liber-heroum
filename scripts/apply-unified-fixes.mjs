// Rewrite the app's rules text in place to the unified-repo (book) wording.
//
//   node scripts/apply-unified-fixes.mjs                # dry run (default): report only
//   node scripts/apply-unified-fixes.mjs --write        # edit the source files
//   node scripts/apply-unified-fixes.mjs --cat kits,complications
//
// Consumes reference/audit-unified/findings.json (run scripts/audit-unified.mjs first).
// The data files are hand-formatted, so this does NOT reprint them: it finds the exact
// string literal that currently holds a field's value and swaps in the reference text,
// leaving layout, comments and structure untouched (same approach as
// apply-official-fixes.mjs). Only prose fields are applied — structural fields
// (keywords, costs, names, numbers) are left for reviewed hand edits.
//
// A literal is only rewritten when it can be located unambiguously: a unique match
// across the sources, or a unique match near its owner's name literal. Everything else
// lands in the "unapplied" report for manual follow-up.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FINDINGS = join(ROOT, 'reference', 'audit-unified', 'findings.json');

const SOURCES = [
  'src/data/classes.js', 'src/data/ancestries.js', 'src/data/careers.js',
  'src/data/complications.js', 'src/data/kits.js', 'src/data/cultures.js',
  'src/data/conduit-domains.js', 'src/data/beastheart-companions.js',
  'src/data/summoner-minions.js', 'src/data/skills.js',
  'src/levelup.jsx',
  'src/levelup-conduit-hi.jsx', 'src/levelup-elementalist-hi.jsx', 'src/levelup-fury-hi.jsx',
  'src/levelup-null.jsx', 'src/levelup-shadow.jsx', 'src/levelup-tactician.jsx',
  'src/levelup-talent.jsx', 'src/levelup-troubadour.jsx',
  'src/levelup-summoner.jsx', 'src/levelup-beastheart.jsx',
];

// Prose fields that are safe to swap wholesale. Structural fields (keywords, cost,
// distance, target, type, names, stat numbers) are excluded on purpose.
const APPLY_FIELDS = new Set([
  'tier1', 'tier2', 'tier3', 'sigTier1', 'sigTier2', 'sigTier3',
  'benefit', 'drawback', 'benefit+drawback', 'desc', 'text', 'trigger', 'flavor',
  'question', 'effect',
]);

// ───────────────────────── string-literal scanning (from apply-official-fixes.mjs) ─────────────────────────

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

function encode(value, quote = "'") {
  if (quote === '`') {
    const s = String(value).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
    return `\`${s}\``;
  }
  let s = String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
  s = s.replace(new RegExp(quote, 'g'), `\\${quote}`);
  return `${quote}${s}${quote}`;
}

const squash = (s) => String(s || '')
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  .replace(/[–—−]/g, '-').replace(/\s+/g, ' ').trim();

// ───────────────────────── jobs from findings ─────────────────────────

/** The entity/ability name a finding belongs to, for disambiguating duplicate literals. */
function ownerOf(at) {
  const dash = at.split(' — ');
  if (dash.length > 1) return dash[dash.length - 1].trim();
  const m = at.match(/(?:trait|incident|ward|companion)\s+(.+)$/);
  if (m) return m[1].trim();
  const compl = at.match(/^\d+\.\s+(.+)$/);          // complications: "17. Curse of Misfortune"
  return compl ? compl[1].trim() : null;
}

function jobsFrom(findings, cats) {
  const jobs = [];
  for (const f of findings) {
    if (cats.length && !cats.includes(f.cat)) continue;
    if (!APPLY_FIELDS.has(f.field)) continue;
    const owner = ownerOf(f.at);
    if (f.field === 'effect' && f.appParts) {
      for (const part of ['effect', 'strained', 'spend']) {
        const app = f.appParts[part];
        const ref = f.refParts[part];
        if (app && ref && squash(app) !== squash(ref)) {
          jobs.push({ cat: f.cat, at: f.at, field: `${part}`, app, ref, owner });
        } else if (!app && ref) {
          jobs.push({ cat: f.cat, at: f.at, field: `${part}`, app: '', ref, owner, manual: 'app has no such part' });
        }
      }
      continue;
    }
    if (!f.app || !f.ref) {
      if (f.ref) jobs.push({ ...f, owner, manual: 'app has no text' });
      continue;
    }
    jobs.push({ cat: f.cat, at: f.at, field: f.field, app: f.app, ref: f.ref, owner });
  }
  // Dedupe identical replacements (the same card can be reachable via several contexts),
  // but remember the multiplicity: a trait shared by two ancestries is two findings and
  // legitimately two literals — all of them get the same new text.
  const seen = new Map();
  const out = [];
  for (const j of jobs) {
    const k = `${squash(j.app)}→${squash(j.ref)}`;
    if (seen.has(k)) { seen.get(k).count++; continue; }
    const entry = { ...j, count: 1 };
    seen.set(k, entry);
    out.push(entry);
  }
  return out;
}

// ───────────────────────── locating & applying ─────────────────────────

function main() {
  const write = process.argv.includes('--write');
  const catArg = (process.argv.find(a => a.startsWith('--cat')) || '').split('=')[1]
    || process.argv[process.argv.indexOf('--cat') + 1];
  const cats = process.argv.includes('--cat') ? String(catArg || '').split(',').filter(Boolean) : [];

  const findings = JSON.parse(readFileSync(FINDINGS, 'utf8'));
  const jobs = jobsFrom(findings, cats);

  const files = SOURCES.map(rel => {
    const path = join(ROOT, rel);
    let src;
    try { src = readFileSync(path, 'utf8'); } catch { return null; }
    return { rel, path, src, literals: scanLiterals(src) };
  }).filter(Boolean);

  // Index every literal by squashed value.
  const byValue = new Map();
  for (const file of files) {
    for (const lit of file.literals) {
      const k = squash(lit.value);
      if (!k) continue;
      if (!byValue.has(k)) byValue.set(k, []);
      byValue.get(k).push({ file, lit });
    }
  }

  const edits = new Map();          // file → [{start,end,text}]
  const unapplied = [];
  const claimed = new Set();        // `${file.rel}:${lit.start}` — one edit per literal

  for (const job of jobs) {
    if (job.manual) { unapplied.push({ ...job, reason: job.manual }); continue; }
    // Don't introduce content the app can't render or hasn't modelled: a reference to a
    // rules table the old text avoided, or an inline markdown pipe table.
    if (/\btable\b/i.test(job.ref) && !/\btable\b/i.test(job.app)) {
      unapplied.push({ ...job, reason: 'reference text cites a table the app does not carry' });
      continue;
    }
    if (/^\s*\|.*\|\s*$/m.test(job.ref)) {
      unapplied.push({ ...job, reason: 'reference text contains a markdown table' });
      continue;
    }
    let cands = byValue.get(squash(job.app)) || [];
    let suffix = '';                        // preserved app-added tail (prefix matches)
    cands = cands.filter(c => !claimed.has(`${c.file.rel}:${c.lit.start}`));
    if (!cands.length) {
      // The audit strips the app-added "…skill group" packaging sentence from domain
      // feature texts before comparing — find the literal whose stripped form matches
      // and keep its tail (same regex as audit-unified's stripSkillSuffix).
      const SUFFIX_RE = /(?:^|\s)([^.]*skill group access[^.]*\.)\s*$/i;
      const pm = [];
      for (const file of files) {
        for (const lit of file.literals) {
          if (claimed.has(`${file.rel}:${lit.start}`)) continue;
          const m = lit.value.match(SUFFIX_RE);
          if (!m) continue;
          const stripped = lit.value.replace(SUFFIX_RE, '').trim();
          if (squash(stripped) === squash(job.app)) pm.push({ file, lit, tail: m[1] });
        }
      }
      if (pm.length === 1) {
        cands = pm;
        suffix = ` ${pm[0].tail}`;
      }
    }
    if (cands.length > 1 && job.owner) {
      // Prefer the literal whose nearest preceding owner-name literal is closest.
      const dist = (c) => {
        const owners = c.file.literals.filter(l =>
          squash(l.value).toLowerCase() === squash(job.owner).toLowerCase() && l.start < c.lit.start);
        return owners.length ? c.lit.start - owners[owners.length - 1].start : Infinity;
      };
      const scored = cands.map(c => ({ c, d: dist(c) })).sort((a, b) => a.d - b.d);
      if (scored[0].d < Infinity && (scored.length === 1 || scored[0].d < scored[1].d)) cands = [scored[0].c];
    }
    if (!cands.length) { unapplied.push({ ...job, reason: 'literal not found (split/concatenated in source?)' }); continue; }
    if (cands.length > 1 && cands.length <= job.count) {
      // As many identical literals as findings (a trait shared across ancestries):
      // every copy gets the same reference text.
    } else if (cands.length > 1) {
      unapplied.push({ ...job, reason: `ambiguous: ${cands.length} matching literals` });
      continue;
    }
    for (const { file, lit } of cands) {
      claimed.add(`${file.rel}:${lit.start}`);
      if (!edits.has(file)) edits.set(file, []);
      edits.get(file).push({ start: lit.start, end: lit.end, text: encode(job.ref + suffix, lit.quote), job });
    }
  }

  // Structural card fields (distance/target/type/powerRoll): replace only when the
  // literal sits right after its field key and inside its owner ability's neighbourhood.
  if (process.argv.includes('--structural')) {
    const STRUCTURAL = new Set(['distance', 'target', 'type', 'powerRoll']);
    // The app spells action types out; the reference sometimes abbreviates.
    const TYPE_CANON = { 'Free triggered': 'Free triggered action', Move: 'Move action', Triggered: 'Triggered' };
    const seenS = new Set();
    for (const f of findings) {
      if (cats.length && !cats.includes(f.cat)) continue;
      if (!STRUCTURAL.has(f.field) || !f.app || !f.ref) continue;
      const owner = ownerOf(f.at);
      if (!owner) { unapplied.push({ ...f, reason: 'structural: no owner in at' }); continue; }
      const key = `${owner}|${f.field}|${squash(f.app)}`;
      if (seenS.has(key)) continue;
      seenS.add(key);
      let newVal = f.field === 'type' ? (TYPE_CANON[f.ref] || f.ref) : f.ref;
      if (f.field === 'powerRoll') newVal = f.ref.replace(/^\+\s*/, '');
      const cands = [];
      for (const file of files) {
        for (const lit of file.literals) {
          if (claimed.has(`${file.rel}:${lit.start}`)) continue;
          if (squash(lit.value).toLowerCase() !== squash(f.app).toLowerCase()) continue;
          if (!new RegExp(`${f.field}\\s*:\\s*$`).test(file.src.slice(Math.max(0, lit.start - 24), lit.start))) continue;
          const owners = file.literals.filter(l =>
            squash(l.value).toLowerCase() === squash(owner).toLowerCase() && l.start < lit.start && lit.start - l.start < 2500);
          if (owners.length) cands.push({ file, lit });
        }
      }
      if (cands.length !== 1) { unapplied.push({ ...f, reason: `structural: ${cands.length} candidates` }); continue; }
      const { file, lit } = cands[0];
      claimed.add(`${file.rel}:${lit.start}`);
      if (!edits.has(file)) edits.set(file, []);
      edits.get(file).push({ start: lit.start, end: lit.end, text: encode(newVal, lit.quote) });
    }
  }

  let applied = 0;
  for (const [file, list] of edits) {
    list.sort((a, b) => b.start - a.start);
    let src = file.src;
    for (const e of list) { src = src.slice(0, e.start) + e.text + src.slice(e.end); applied++; }
    if (write) writeFileSync(file.path, src);
    console.log(`${write ? 'wrote' : 'would write'} ${file.rel}: ${list.length} replacements`);
  }

  console.log(`\n${applied} replacements ${write ? 'applied' : 'planned'}, ${unapplied.length} need manual follow-up`);
  const outPath = join(ROOT, 'reference', 'audit-unified', 'unapplied.json');
  writeFileSync(outPath, `${JSON.stringify(unapplied, null, 1)}\n`);
  console.log(`unapplied → ${outPath}`);
}

main();
