// Read side of reference/rulebook (produced by scripts/extract-pdf-text.mjs).
// The printed book is the tiebreaker whenever the Foundry compendium and the app disagree,
// so both the audit and the fixer need to look abilities up by their cited page.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const squash = (s) => String(s || '').replace(/\s+/g, ' ').trim();

export function loadBook() {
  const file = join(ROOT, 'reference', 'rulebook', 'pages.json');
  if (!existsSync(file)) return null;
  const pages = JSON.parse(readFileSync(file, 'utf8'));
  let offset = 0;

  return {
    get offset() { return offset; },

    /**
     * Printed page numbers differ from PDF indices by the front matter. Recover the offset
     * empirically: for a sample of items, find the PDF page containing the name and take
     * the most common (pdfIndex - printedPage).
     */
    calibrate(samples) {
      const votes = new Map();
      for (const { name, page } of samples) {
        const n = Number(page);
        if (!Number.isFinite(n)) continue;
        for (const p of pages) {
          if (p.text.includes(name)) {
            const delta = p.page - n;
            if (delta >= 0 && delta < 60) votes.set(delta, (votes.get(delta) || 0) + 1);
            break;
          }
        }
      }
      offset = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
      return offset;
    },

    /** The printed block for `name` near its cited page. */
    block(name, printedPage, chars = 700) {
      const n = Number(printedPage);
      const candidates = Number.isFinite(n)
        ? [n + offset, n + offset + 1, n + offset - 1].filter(p => p >= 1 && p <= pages.length)
        : [];
      for (const pageNo of candidates) {
        const text = pages[pageNo - 1]?.text || '';
        const i = text.indexOf(name);
        if (i >= 0) return { pdfPage: pageNo, text: text.slice(i, i + chars) };
      }
      return null;
    },

    /**
     * The header fields as printed for an ability: keywords, action type, distance,
     * target and power-roll characteristic. Used to arbitrate when the compendium and the
     * app disagree — the book is the authority on all of them.
     *
     * The book is two-column and pdf.js interleaves the columns, so a field is only
     * returned when exactly one unambiguous candidate is found on the page.
     */
    abilityFields(name, printedPage) {
      const found = this.block(name, printedPage, 900);
      if (!found) return null;
      const text = found.text;
      const only = (matches, pick) => {
        const values = [...new Set(matches.map(pick))];
        return values.length === 1 ? values[0] : null;
      };
      const ACTIONS = 'Main action|Free maneuver|Maneuver|Free triggered action|Free triggered|Triggered|Move action|No action';
      // "Melee, Strike, Weapon Main action" — or "—" when the ability has no keywords.
      const header = [...text.matchAll(new RegExp(`(?:^|\\n)\\s*(—|[A-Z][A-Za-z]*(?:, [A-Z][A-Za-z]*)*)\\s+(${ACTIONS})\\b`, 'g'))];
      const kwRaw = only(header, m => m[1]);
      const distTarget = [...text.matchAll(/Distance:\s*([^;\n]+);\s*Target:\s*([^\n]+)/g)];
      const power = [...text.matchAll(/Power Roll \+ ([A-Za-z]+(?: or [A-Za-z]+)?)/g)];
      return {
        pdfPage: found.pdfPage,
        keywords: kwRaw == null ? null : (kwRaw === '—' ? [] : kwRaw.split(', ')),
        type: only(header, m => m[2]),
        distance: only(distTarget, m => m[1].trim()),
        target: only(distTarget, m => m[2].trim()),
        powerRoll: only(power, m => m[1]),
      };
    },

    /**
     * Candidate printed texts for each power-roll tier near an ability's cited page.
     * The book is two-column and pdf.js interleaves them, so a page can yield several
     * candidates per tier — callers test whether *any* of them matches.
     */
    tierCandidates(name, printedPage) {
      const found = this.block(name, printedPage, 1400);
      if (!found) return null;
      const labels = [/11 or lower:\s*/g, /12-16:\s*/g, /17\+:\s*/g];
      return labels.map((re) => {
        const out = [];
        for (const m of found.text.matchAll(re)) {
          const rest = found.text.slice(m.index + m[0].length);
          const end = rest.search(/(?:11 or lower:|12-16:|17\+:|Effect:|Special:|Trigger:|\n\n)/);
          out.push(squash(end >= 0 ? rest.slice(0, end) : rest));
        }
        return out.filter(Boolean);
      });
    },
  };
}

/** Ability/class names + cited pages to calibrate against, drawn from the official index. */
export function calibrationSamples(O, classes, officialAbility) {
  const samples = [];
  for (const cls of classes) {
    const doc = O.find('class', cls.name);
    if (doc?.system?.source?.page) samples.push({ name: cls.name, page: doc.system.source.page });
    for (const d of O.forClass('ability', cls.id).slice(0, 6)) {
      const a = officialAbility(d);
      if (a.page) samples.push({ name: a.name, page: a.page });
    }
  }
  return samples;
}
