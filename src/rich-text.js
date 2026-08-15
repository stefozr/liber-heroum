// rich-text.js — the markdown subset the official rules text actually uses.
//
// Deliberately not a markdown library: the shipped strings use exactly five
// markers, all of them unambiguous, and a general parser would start finding
// structure in things that aren't (the summoner minions' `stamina: '4 | 4 | 4'`
// is a tier list, not a table row). The vocabulary:
//
//   \n\n              paragraph break — the only paragraph break; no string has
//                     a run of three, and no lone \n is ever a soft wrap
//   - item            bullet, always a dash, one \n between items
//   **bold**          inline label prefix ("**Persistent 1:** …"), and, when it
//                     is the whole paragraph, a section heading
//   *italic*          book citations ("see *Draw Steel: Monsters*")
//   > body            sidebar, continued with a bare '>' on blank lines
//
// Pure — no React — so the Foundry exporter builds HTML from the same parse
// instead of carrying a second implementation that drifts from this one.

// One inline run. t: 'text' | 'b' | 'i'.
function span(t, s) { return { t, s }; }

// Bold first, then italics inside what's left: '**A**' must not be read as an
// empty italic wrapping 'A'. An unpaired marker stays literal — data-lint guards
// against those, and swallowing them here would hide the very thing it checks.
function parseInline(text) {
  const out = [];
  for (const [i, chunk] of text.split(/\*\*(.+?)\*\*/g).entries()) {
    if (!chunk) continue;
    if (i % 2 === 1) { out.push(span('b', chunk)); continue; }
    for (const [j, part] of chunk.split(/\*([^*\n]+)\*/g).entries()) {
      if (part) out.push(span(j % 2 === 1 ? 'i' : 'text', part));
    }
  }
  return out;
}

const BULLET = /^- +/;
const QUOTE = /^> ?/;

// A paragraph that is nothing but one bold run is a section heading
// ("**Discipline in Combat**"), not a paragraph that happens to be bold.
function isHeading(spans) {
  return spans.length === 1 && spans[0].t === 'b';
}

// Lines of one \n\n-delimited chunk → blocks. Bullets and quote lines gather
// into a single block each; anything else rejoins as one paragraph.
function parseChunk(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    if (BULLET.test(lines[i])) {
      const items = [];
      while (i < lines.length && BULLET.test(lines[i])) items.push(parseInline(lines[i++].replace(BULLET, '')));
      out.push({ kind: 'list', items });
    } else if (QUOTE.test(lines[i])) {
      const inner = [];
      while (i < lines.length && QUOTE.test(lines[i])) inner.push(lines[i++].replace(QUOTE, ''));
      // A sidebar separates its own paragraphs with bare '>' lines, which strip
      // to '' — the same blank-line break the top level uses.
      out.push({ kind: 'quote', blocks: parseBlocks(inner.join('\n').replace(/\n{2,}/g, '\n\n')) });
    } else {
      const para = [];
      while (i < lines.length && !BULLET.test(lines[i]) && !QUOTE.test(lines[i])) para.push(lines[i++]);
      const spans = parseInline(para.join(' ').trim());
      if (spans.length) out.push({ kind: isHeading(spans) ? 'h' : 'p', spans });
    }
  }
  return out;
}

// text → [{ kind: 'p' | 'h', spans } | { kind: 'list', items } | { kind: 'quote', blocks }]
function parseBlocks(text) {
  if (typeof text !== 'string' || !text) return [];
  return text.split(/\n{2,}/).flatMap(chunk => parseChunk(chunk.split('\n')));
}

// True when the string carries none of the five markers, so callers can skip the
// parse and hand the original string straight to React.
function isPlain(text) {
  return typeof text !== 'string' || !/[\n*]/.test(text);
}

// Blocks → HTML, for the Foundry export. `esc` escapes text content; the tags
// here are ours and must not be escaped, so the caller owns only the former.
function blocksToHtml(blocks, esc) {
  const inline = (spans) => spans.map(({ t, s }) =>
    t === 'b' ? `<strong>${esc(s)}</strong>` : t === 'i' ? `<em>${esc(s)}</em>` : esc(s)).join('');
  return blocks.map((b) => {
    if (b.kind === 'list') return `<ul>${b.items.map(it => `<li>${inline(it)}</li>`).join('')}</ul>`;
    if (b.kind === 'quote') return `<blockquote>${blocksToHtml(b.blocks, esc)}</blockquote>`;
    if (b.kind === 'h') return `<h4>${inline(b.spans)}</h4>`;
    return `<p>${inline(b.spans)}</p>`;
  }).join('');
}

export { parseBlocks, parseInline, blocksToHtml, isPlain };
