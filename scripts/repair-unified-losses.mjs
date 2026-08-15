// Restore rules text that the unified-repo apply pass truncated.
//
//   node scripts/repair-unified-losses.mjs                 # dry run (default): report only
//   node scripts/repair-unified-losses.mjs --write         # edit the source files
//   node scripts/repair-unified-losses.mjs --base <sha>    # compare against another commit
//
// Why this exists: the unified repo stores an ability's structured `effects[].effect` as
// only the lead-in sentence — Practical Magic's is literally "Choose one of the following
// effects:" — while the options live in `metadata.content`. unified-index.mjs read the
// structured field, so apply-unified-fixes.mjs swapped complete app text for truncated
// reference text and reported success. 16 fields lost their bullet lists that way, and
// several lost most of the rule.
//
// The repair is mechanical rather than by hand, because hand-patching misses sites: align
// every string literal in the pre-pass commit against the current file, and restore the
// ones whose replacement lost content. Fields that legitimately grew (the book wording, the
// mechanical corrections) are left exactly as they are.
//
// Prevention lives elsewhere: unified-index.mjs now reads metadata.content, and
// apply-unified-fixes.mjs refuses a lossy replacement outright.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// The commit before the v1.7 release commit — the last state before the unified pass ran.
// NOT the v1.6 tag: 116b64e legitimately rewrote the Talent abilities (splitting their
// strained riders into a field of their own), and comparing across it would read that as
// text loss and undo it.
const DEFAULT_BASE = '116b64e';

// Same list apply-unified-fixes.mjs writes to; anything it could damage, this can repair.
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

// ───────────────────────── string-literal scanning (from apply-unified-fixes.mjs) ─────────────────────────
// Kept byte-identical to the apply pass's scanner and encoder, so a literal this script
// rewrites round-trips to exactly the source form the apply pass would have produced.

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

// Quote/dash/whitespace normalizer, also from apply-unified-fixes.mjs. The pass
// straightened curly quotes, so a raw comparison reports survivors as missing.
const squash = (s) => String(s || '')
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  .replace(/[–—−]/g, '-').replace(/\s+/g, ' ').trim();

// ───────────────────────── alignment ─────────────────────────

/**
 * Align two literal sequences and return their substitutions as [oldValue, newLiteral].
 *
 * Index pairing alone would be wrong: commits between the base and now legitimately ADD
 * literals (116b64e added the Talent's `strained:` fields), which shifts everything after
 * them. A standard LCS over the values anchors on the untouched literals — the vast
 * majority — and leaves genuine replacements as the aligned gaps between anchors.
 *
 * Only 1:1 gaps are treated as substitutions. A gap where the counts differ means text was
 * split or merged; those are reported as unmatched for a human, never rewritten.
 */
function alignSubstitutions(oldValues, newLits) {
  const newValues = newLits.map(l => l.value);
  const n = oldValues.length;
  const m = newValues.length;
  // LCS table over literal values. These files run ~2k literals, so an O(n·m) table of
  // 32-bit ints is a few tens of MB at worst and finishes instantly.
  const dp = [];
  for (let i = 0; i <= n; i++) dp.push(new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = oldValues[i] === newValues[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const subs = [];
  const unmatched = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (oldValues[i] === newValues[j]) { i++; j++; continue; }
    // Collect the run of non-matching literals on both sides up to the next anchor.
    const gapOld = [];
    const gapNew = [];
    while (i < n && j < m && oldValues[i] !== newValues[j]) {
      if (dp[i + 1][j] >= dp[i][j + 1]) gapOld.push(oldValues[i++]);
      else gapNew.push(newLits[j++]);
    }
    if (gapOld.length === 1 && gapNew.length === 1) subs.push([gapOld[0], gapNew[0]]);
    else for (const v of gapOld) unmatched.push(v);
  }
  while (i < n) unmatched.push(oldValues[i++]);
  return { subs, unmatched };
}

// ───────────────────────── loss detection ─────────────────────────

const BULLET = /\n- /;
const ENDS_SENTENCE = /[.!?)"'’”]\s*$/;

/**
 * Why a replacement counts as a loss, or null when the new text is fine.
 *
 * Deliberately conservative: the same pass also made real corrections, and every rule here
 * would happily undo one. Growth is never a loss — the Summoner's minion rules legitimately
 * went from 5,223 chars of bullets to 6,740 of the book's own bolded sections — so every
 * rule but the dangling colon requires the new text to be SHORTER. The length rules skip
 * short strings entirely, because tier lines, targets and action types were corrected on
 * purpose ("2 + R acid and cold and … damage" → "2 + R damage", "Main action" → "Action").
 */
function lossReason(oldText, newText) {
  const o = oldText.trim();
  const t = newText.trim();
  if (!o || !t) return null;
  // A lead-in with its list gone: "Choose one of the following effects:" and nothing after.
  if (/:$/.test(t) && !/:$/.test(o)) return 'ends on a dangling colon';
  // Cut off mid-sentence. A trailing bullet item is a legitimate ending.
  const truncated = t.length >= 120 && ENDS_SENTENCE.test(o) && !ENDS_SENTENCE.test(t) && !BULLET.test(t);
  // When the replacement is longer it carries book text worth keeping, so a truncation
  // there wants the missing tail written back by hand — not the old paraphrase restored.
  if (truncated) return t.length >= o.length ? 'truncated mid-sentence (manual)' : 'truncated mid-sentence';
  if (t.length >= o.length) return null;
  if (BULLET.test(o) && !BULLET.test(t)) return 'lost its bullet list';
  if (o.length >= 250 && t.length < o.length * 0.6) {
    return `shorter by ${Math.round((1 - t.length / o.length) * 100)}%`;
  }
  return null;
}

// ───────────────────────── main ─────────────────────────

function main() {
  const write = process.argv.includes('--write');
  const baseArg = process.argv[process.argv.indexOf('--base') + 1];
  const base = process.argv.includes('--base') && baseArg ? baseArg : DEFAULT_BASE;

  let restored = 0;
  let unmatchedTotal = 0;
  const report = [];

  for (const rel of SOURCES) {
    const path = join(ROOT, rel);
    let newSrc;
    let oldSrc;
    try { newSrc = readFileSync(path, 'utf8'); } catch { continue; }
    try {
      oldSrc = execFileSync('git', ['show', `${base}:${rel}`], { cwd: ROOT, maxBuffer: 1 << 30 }).toString();
    } catch { continue; }                        // file did not exist at base

    const oldLits = scanLiterals(oldSrc);
    const newLits = scanLiterals(newSrc);
    const { subs, unmatched } = alignSubstitutions(oldLits.map(l => l.value), newLits);

    const edits = [];
    for (const [oldValue, lit] of subs) {
      const reason = lossReason(oldValue, lit.value);
      if (!reason) continue;
      // "(manual)" findings are reported but never rewritten — see lossReason.
      if (!reason.endsWith('(manual)')) {
        edits.push({ start: lit.start, end: lit.end, text: encode(oldValue, lit.quote) });
      }
      report.push({ rel, reason, oldLen: oldValue.length, newLen: lit.value.length,
        head: (reason.endsWith('(manual)') ? lit.value : oldValue).slice(-90).replace(/\n/g, ' | ') });
    }
    // Old text with no 1:1 partner — split, merged or dropped outright. Never rewritten
    // blind; a human has to place it back.
    for (const v of unmatched) {
      if (v.length < 200 && !BULLET.test(v)) continue;      // short strings churn for many innocent reasons
      // Split or merged rather than lost: a distinctive slice of it still ships somewhere
      // in the file. Only text that vanished outright is worth a human's attention.
      // Compare through squash(), because the pass also straightened curly quotes — an
      // apostrophe alone would otherwise report a survivor as missing.
      const probe = squash(v.slice(0, 60));
      if (newLits.some(l => squash(l.value).includes(probe))) continue;
      unmatchedTotal++;
      report.push({ rel, reason: 'NO PARTNER — needs manual placement', oldLen: v.length, newLen: 0,
        head: v.slice(0, 80).replace(/\n/g, ' | ') });
    }

    if (!edits.length) continue;
    edits.sort((a, b) => b.start - a.start);
    let src = newSrc;
    for (const e of edits) src = src.slice(0, e.start) + e.text + src.slice(e.end);
    if (write) writeFileSync(path, src);
    restored += edits.length;
    console.log(`${write ? 'restored' : 'would restore'} ${rel}: ${edits.length}`);
  }

  console.log('');
  for (const r of report) {
    console.log(`${r.rel}  [${r.oldLen} -> ${r.newLen}]  ${r.reason}`);
    console.log(`   ${r.head}`);
  }
  console.log(`\n${restored} field${restored === 1 ? '' : 's'} ${write ? 'restored' : 'to restore'}`
    + `, ${unmatchedTotal} unmatched (manual)`);
  if (!write) console.log('dry run — pass --write to apply');
}

main();
