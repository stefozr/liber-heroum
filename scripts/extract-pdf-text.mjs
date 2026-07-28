// Extract text from the Draw Steel rulebook PDF using the pdf.js that ships inside the
// Foundry VTT desktop app — no npm install needed.
//
//   node scripts/extract-pdf-text.mjs [pdfPath] [outName]
//
// Output goes to reference/<outName>/ (gitignored — the rulebook is licensed content):
//   pages.json    [{ page, text }]
//   book.md       every page concatenated with page markers
//
// Two artefacts of pdf.js text extraction are corrected here:
//   1. Text items carry no spacing. Naively joining with '' welds words together and
//      joining with ' ' breaks hyphenation and kerned pairs, so gaps are inferred from
//      each item's transform matrix and width.
//   2. Drop caps are separate items in a much larger font, which reads as "I f you're".
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPdfjs } from './foundry-libs.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_PDF = join(ROOT, 'Extra', 'Draw Steel Heroes v1.pdf');

// The book sets its icons and small-caps in a symbol font, so pdf.js hands back the raw
// glyph slots rather than meaningful characters. Decode the ones that carry rules meaning.
// Verified by frequency across all 417 pages: á/é/í appear ~348 times each (once per tier
// of every ability), ¥ 436 times (bullet), and the potency tokens follow a strict
// <characteristic><'<'><w|v|s> shape.
const POTENCY_CHAR = { m: 'M', a: 'A', r: 'R', i: 'I', p: 'P' };
const POTENCY_TIER = { w: 'WEAK', v: 'AVERAGE', s: 'STRONG' };

function normalizeBookGlyphs(text) {
  return text
    .replace(/á/g, '11 or lower:')
    .replace(/é/g, '12-16:')
    .replace(/í/g, '17+:')
    .replace(/¥/g, '-')
    // p<w → P < WEAK. Case-insensitive: headings use the capital form.
    .replace(/\b([maripMARIP])\s*<\s*([wvsWVS])\b/g,
      (_, c, t) => `${POTENCY_CHAR[c.toLowerCase()]} < ${POTENCY_TIER[t.toLowerCase()]}`)
    // "e Melee 1 x One creature" — the distance and target icons.
    .replace(/^e (.+?) x (.+)$/gm, 'Distance: $1; Target: $2')
    .replace(/ ,/g, ',')
    .replace(/[ \t]{2,}/g, ' ');
}

// Reassemble one page's text items into lines, then lines into paragraphs.
function itemsToText(items) {
  const glyphs = items.filter(it => it.str !== '' && !it.isWhitespace);
  if (!glyphs.length) return '';

  // Group by baseline. transform = [a, b, c, d, e, f]; e = x, f = y, d ≈ font size.
  const rows = [];
  for (const it of glyphs) {
    const [, , , scaleY, x, y] = it.transform;
    const size = Math.abs(scaleY) || it.height || 10;
    // Same line if the baseline is within a third of the glyph height — tolerant enough
    // for superscripts and the slight drift in justified text.
    const row = rows.find(r => Math.abs(r.y - y) <= Math.max(2, size / 3));
    if (row) { row.items.push({ ...it, x, size }); row.y = (row.y + y) / 2; }
    else rows.push({ y, items: [{ ...it, x, size }] });
  }
  rows.sort((a, b) => b.y - a.y);          // PDF y grows upward
  for (const r of rows) r.items.sort((a, b) => a.x - b.x);

  const lines = rows.map((row) => {
    let out = '';
    let prevEnd = null;
    let prevSize = null;
    for (const it of row.items) {
      if (prevEnd !== null) {
        const gap = it.x - prevEnd;
        const ref = Math.min(prevSize, it.size);
        // A gap wider than ~a fifth of the font size is a real space. Below that the
        // items are one word split by kerning or a font change.
        const dropCapJoin = prevSize > it.size * 1.6;   // oversized initial + its word
        if (gap > ref * 0.2 && !dropCapJoin) out += ' ';
      }
      out += it.str;
      prevEnd = it.x + (it.width || 0);
      prevSize = it.size;
    }
    return { text: out.replace(/\s{2,}/g, ' ').trim(), size: Math.max(...row.items.map(i => i.size)) };
  }).filter(l => l.text);

  // Join wrapped lines into paragraphs: a line ending mid-sentence continues the next.
  const paras = [];
  for (const line of lines) {
    const prev = paras[paras.length - 1];
    const continues = prev
      && !/[.!?:;”"’)\]]$/.test(prev.text)
      && !/^[•\-–—]/.test(line.text)
      && Math.abs(prev.size - line.size) < 0.6;
    if (continues) {
      // Soft hyphen at a line break: rejoin the word.
      if (/[a-z]-$/.test(prev.text)) prev.text = prev.text.slice(0, -1) + line.text;
      else prev.text += ' ' + line.text;
      prev.size = Math.max(prev.size, line.size);
    } else {
      paras.push({ ...line });
    }
  }
  return paras.map(p => p.text).join('\n\n');
}

async function main() {
  const pdfPath = resolve(process.argv[2] || DEFAULT_PDF);
  const outName = process.argv[3] || 'rulebook';
  if (!existsSync(pdfPath)) throw new Error(`PDF not found: ${pdfPath}`);

  const outDir = join(ROOT, 'reference', outName);
  const pagesPath = join(outDir, 'pages.json');
  if (existsSync(pagesPath) && statSync(pagesPath).mtimeMs > statSync(pdfPath).mtimeMs) {
    console.log(`${outName}: up to date, skipping`);
    return;
  }

  const { lib, cMapUrl, standardFontDataUrl } = await loadPdfjs();
  console.log(`Reading ${pdfPath} ...`);
  const doc = await lib.getDocument({
    data: new Uint8Array(readFileSync(pdfPath)),
    cMapUrl, cMapPacked: true, standardFontDataUrl,
    disableFontFace: true, isEvalSupported: false,
    verbosity: 0,
  }).promise;

  console.log(`  ${doc.numPages} pages`);
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    pages.push({ page: n, text: normalizeBookGlyphs(itemsToText(content.items)) });
    page.cleanup();
    if (n % 50 === 0) console.log(`  ${n}/${doc.numPages}`);
  }
  await doc.destroy();

  mkdirSync(outDir, { recursive: true });
  writeFileSync(pagesPath, JSON.stringify(pages, null, 1));
  writeFileSync(join(outDir, 'book.md'),
    pages.map(p => `\n\n<!-- page ${p.page} -->\n\n${p.text}`).join('').trim() + '\n');

  const empty = pages.filter(p => !p.text).length;
  const chars = pages.reduce((n, p) => n + p.text.length, 0);
  console.log(`  wrote ${outDir}: ${chars.toLocaleString()} chars, ${empty} image-only pages`);
}

main().catch((err) => { console.error(err); process.exit(1); });
