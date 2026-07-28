// Minimal HTML → Markdown-ish text, tuned for Foundry journal/item HTML.
// Deliberately dependency-free and lossy only in ways that don't affect rules text:
// structure (headings, lists, tables, emphasis) is kept, styling is dropped.

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '—', ndash: '–', hellip: '…', times: '×',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  minus: '−', plusmn: '±', deg: '°', frac12: '½',
};

export function decodeEntities(s) {
  return String(s == null ? '' : s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z][a-z0-9]*);/gi, (m, name) => ENTITIES[name] ?? ENTITIES[name.toLowerCase()] ?? m);
}

// Foundry text enrichers. Each resolves to the text a reader actually sees.
//   @UUID[...]{Label} / @Compendium[...]{Label}  → Label
//   [[lookup @P]]{your Presence score}           → your Presence score
//   [[/r 2d10 + @chr]]{2d10 + M}                 → 2d10 + M
//   [[/apply abc123]]                            → (dropped; a button, not prose)
// Label-less [[...]] enrichers that still carry words the reader sees. Foundry renders
// these as generated text, so dropping them silently truncates rules ("the target
// regains ." instead of "the target regains Stamina equal to your recovery value").
const CHAR_WORD = { M: 'Might', A: 'Agility', R: 'Reason', I: 'Intuition', P: 'Presence' };
const POTENCY_WORD = { weak: 'WEAK', average: 'AVERAGE', strong: 'STRONG' };

// Some enrichers reference an ActiveEffect by id rather than naming the condition. The
// official index installs a lookup so those still read as prose.
let applyResolver = null;
export const setApplyResolver = (fn) => { applyResolver = fn; };

// @P → "your Presence score"; 2*@P → "twice your Presence score".
function expandScore(expr) {
  const e = String(expr).trim();
  let m = e.match(/^(\d+)\s*\*\s*@([MARIP])$/i);
  if (m) {
    const times = { 2: 'twice', 3: 'three times', 4: 'four times' }[m[1]] || `${m[1]} times`;
    return `${times} your ${CHAR_WORD[m[2].toUpperCase()]} score`;
  }
  m = e.match(/^@([MARIP])$/i);
  if (m) return `your ${CHAR_WORD[m[1].toUpperCase()]} score`;
  if (/^@recoveries\.recoveryValue$/i.test(e)) return 'your recovery value';
  if (/^@hero\.victories$/i.test(e)) return 'your Victories';
  if (/^@level$/i.test(e)) return 'your level';
  return e.replace(/^@/, '');
}

// Foundry renders a resource enricher as a subject-neutral chip, so the compendium prose
// around it carries no verb ("The target [[/surge 2]]."). The book supplies one, agreeing
// with the subject — so infer it from the words immediately before.
const PLURAL_SUBJECT = /\b(you|they|we|allies|enemies|targets|creatures|heroes|and each \w+|and one \w+)\s*$/i;
// "You take 2d6 damage and [[/surge 3]]" — the subject is at the head of the clause, not
// immediately before the enricher, so also look back to the start of the sentence.
const SENTENCE_SUBJECT = /(?:^|[.!?:]|\n)\s*\**\s*(?:you|they|each of you)\b[^.!?]*$/i;
const verbFor = (before, singular, plural) =>
  (PLURAL_SUBJECT.test(before) || SENTENCE_SUBJECT.test(before) ? plural : singular);

function renderBracketEnricher(body, before = '', after = '') {
  const raw = body.trim();
  const [verbRaw, ...rest] = raw.replace(/^\//, '').split(/\s+/);
  const verb = verbRaw.toLowerCase();
  const options = Object.fromEntries(rest.filter(a => a.includes('='))
    .map(a => a.split('=').map(x => x.trim())));
  const args = rest.filter(a => !a.includes('='));
  switch (verb) {
    case 'heal': {
      const [amount, kind] = args;
      const value = expandScore(amount);
      const temp = /^temp/i.test(kind || '');
      if (/recovery value/.test(value)) return `Stamina equal to ${value}`;
      return temp ? `${value} temporary Stamina` : `${value} Stamina`;
    }
    case 'damage': {
      // Damage types can be positional (`5 holy`) or an option (`5 type=fire`). The word
      // "damage" is often already in the sentence — don't say it twice.
      const types = [...args.slice(1), options.type].filter(t => t && t !== 'scaling');
      const noun = /^\s*damage\b/i.test(after) ? '' : ' damage';
      return `${expandScore(args[0])} ${types.join(' ')}${noun}`.replace(/\s{2,}/g, ' ').trim();
    }
    case 'surge': {
      const n = expandScore(args[0]);
      return `${verbFor(before, 'gains', 'gain')} ${n} ${n === '1' ? 'surge' : 'surges'}`;
    }
    case 'gain': {
      const verbWord = verbFor(before, 'gains', 'gain');
      return args[1] === 'heroic'
        ? `${verbWord} ${expandScore(args[0])} of their Heroic Resource`
        : `${verbWord} ${expandScore(args[0])} ${args.slice(1).join(' ')}`.trim();
    }
    case 'potency': {
      const [chr, tier] = args;
      return `${(chr || '').toUpperCase()} < ${POTENCY_WORD[(tier || '').toLowerCase()] || tier}`;
    }
    case 'r': case 'roll': return args[0] || '';
    case 'apply': {
      // Three forms:
      //   [[/apply taunted turn]]      a condition named inline, part of the sentence
      //   [[/apply <id> save]]         an ActiveEffect used inline — resolve its name
      //   [[/apply <id>]]              a trailing button; prints nothing
      const first = args[0] || '';
      const duration = args[1];
      if (!/^\.?[A-Za-z0-9]{16}$/.test(first)) {
        return duration === 'save' ? `${first} (save ends)` : first;
      }
      const name = applyResolver?.(first.replace(/^\./, ''));
      if (!name || !duration) return '';
      const label = name.toLowerCase();
      return duration === 'save' ? `${label} (save ends)` : label;
    }
    // /test with no label is a button; reference is a rules link.
    default: return '';
  }
}

function stripEnrichers(s) {
  let out = s;
  // Bracketed enricher with an explicit label — keep the label.
  out = out.replace(/\[\[[^\]]*\]\]\{([^}]*)\}/g, '$1');
  // @Embed[<uuid> options] pulls another document's content in at render time. The book's
  // class chapters embed every ability stat block this way, so the prose isn't in the
  // journal at all — only the reference is. Keep it as a resolvable marker so the audit can
  // look the document up by id and know which section/level it was embedded under.
  out = out.replace(/@Embed\[([^\]\s]+)[^\]]*\](?:\{([^}]*)\})?/g,
    (_, ref) => `\n{{embed:${ref.split('.').pop()}}}\n`);
  // @Thing[ref]{Label} — keep the label.
  out = out.replace(/@[A-Za-z]+\[[^\]]*\]\{([^}]*)\}/g, '$1');
  // @Thing[ref] with no label — keep the last path segment, which is the name.
  out = out.replace(/@[A-Za-z]+\[([^\]]*)\]/g, (_, ref) => ref.split('.').pop());
  // Label-less bracketed enrichers: render the ones that produce text, drop the buttons.
  // Some renderings depend on the words around them (verb agreement, a following "damage").
  out = out.replace(/\[\[([^\]]*)\]\]/g, (match, body, offset) =>
    renderBracketEnricher(body, out.slice(Math.max(0, offset - 60), offset), out.slice(offset + match.length, offset + match.length + 20)));
  return out;
}

const BLOCK = 'p|div|section|article|header|footer|blockquote|figure|figcaption|dl|dt|dd|hr';

// A <table> becomes a real Markdown table. Cells are flattened to one line each —
// the class advancement tables nest <p> inside every <td>, and without this they
// explode into one line per cell and become unreadable.
function tablesToMarkdown(s) {
  return s.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (_, inner) => {
    const rows = [...inner.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m =>
      [...m[1].matchAll(/<(t[hd])\b[^>]*>([\s\S]*?)<\/\1>/gi)]
        .map(c => htmlToText(c[2]).replace(/\s*\n+\s*/g, ' ').replace(/\|/g, '\\|').trim()));
    if (!rows.length) return '\n\n';
    const width = Math.max(...rows.map(r => r.length));
    const pad = (r) => `| ${[...r, ...Array(width - r.length).fill('')].join(' | ')} |`;
    // Foundry's book tables always lead with a header row.
    const [head, ...body] = rows;
    const lines = [pad(head), `| ${Array(width).fill('---').join(' | ')} |`, ...body.map(pad)];
    return `\n\n${lines.join('\n')}\n\n`;
  });
}

export function htmlToText(html) {
  if (!html) return '';
  let s = String(html);

  // Drop content that is never prose.
  s = s.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');

  s = tablesToMarkdown(s);
  // Any stray table markup left outside a well-formed <table>.
  s = s.replace(/<\/?(table|thead|tbody|tfoot|caption|tr|t[hd])\b[^>]*>/gi, '\n\n');

  // Headings.
  s = s.replace(/<h([1-6])\b[^>]*>/gi, (_, n) => `\n\n${'#'.repeat(Number(n))} `);
  s = s.replace(/<\/h[1-6]>/gi, '\n\n');

  // Lists. Items are flattened to one line each: the book wraps every bullet in <p>, and
  // without this the "-" marker ends up stranded on a line of its own.
  s = s.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi,
    (_, inner) => `\n- ${htmlToText(inner).replace(/\s*\n+\s*/g, ' ')}`);
  s = s.replace(/<\/?(ul|ol|li)\b[^>]*>/gi, '\n');

  // Emphasis. Foundry uses <strong>/<b> for the "Effect."-style run-in labels.
  s = s.replace(/<(strong|b)\b[^>]*>/gi, '**').replace(/<\/(strong|b)>/gi, '**');
  s = s.replace(/<(em|i)\b[^>]*>/gi, '*').replace(/<\/(em|i)>/gi, '*');

  // Line breaks and remaining block boundaries.
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(new RegExp(`</?(?:${BLOCK})\\b[^>]*>`, 'gi'), '\n\n');

  // Anything left (span, a, img, ...) contributes no text structure.
  s = s.replace(/<[^>]+>/g, '');

  s = decodeEntities(s);
  s = stripEnrichers(s);

  // Whitespace normalisation: collapse runs, cap blank lines at one, trim each line.
  s = s.replace(/ /g, ' ');
  s = s.split('\n').map(line => line.replace(/[ \t]+/g, ' ').trim()).join('\n');
  s = s.replace(/\*\*\s+\*\*/g, ' ');      // empty bold left by stripped enrichers
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

/** Same as htmlToText but flattened to a single line — for one-line fields and diffing. */
export function htmlToLine(html) {
  return htmlToText(html).replace(/\s*\n+\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
}
