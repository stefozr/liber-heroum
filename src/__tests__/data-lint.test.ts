// data-lint — guards against content-pipeline leaks in shipped rules text (audit H3).
// Failure classes:
//   1. Raw compendium tokens like '@chr' / '@P' surviving into display strings
//      (they belong only to the Foundry export layer, which builds its own).
//   2. Unbalanced '**' markdown — renderRich() bolds **…** pairs, so an odd
//      count means a literal asterisk pair leaks to screen.
//   3. PDF-extraction damage: whitespace before punctuation ("turn ."), duplicated
//      adjacent words ("gains gains"), orphaned hyphenation halves ("destroy ing"),
//      and leaked straight-quote enricher tokens ('"Damage Immunity 5"' fragments).
//   4. Features whose text points the reader at a table that isn't in the data.
import { describe, it, expect } from 'vitest';
import { DS_ANCESTRIES, DS_CULTURES, DS_CAREERS, DS_CLASSES, DS_KITS, DS_COMPLICATIONS, SUMMONER_PORTFOLIOS, BEASTHEART_COMPANIONS } from '../data.jsx';
import { LEVELUP_DATA } from '../levelup.jsx';
import { DOMAIN_1ST_FEATURES, DOMAIN_2_ABILITIES, DOMAIN_4_FEATURES, DOMAIN_6_ABILITIES, DOMAIN_7_FEATURES, DOMAIN_9_ABILITIES } from '../data/conduit-domains.js';

// LEVELUP_DATA gates most content behind functions of the level-up context
// (autoFeatures/autoAbilities/choices.options as ({ sub }) => …). Evaluate those
// with every subclass of the owning class so the returned text is linted too;
// functions that need a richer context than { sub } are skipped (best-effort).
const SUBS_BY_CLASS: Record<string, string[]> = Object.fromEntries(
  DS_CLASSES.map((c: any) => [c.id, (c.subclasses || []).map((s: any) => s.id)]));

function collectStrings(node: any, path: string, out: Array<[string, string]>, subs?: string[]) {
  if (typeof node === 'string') { out.push([path, node]); return; }
  if (typeof node === 'function' && subs) {
    for (const sub of subs.length ? subs : [undefined]) {
      try { collectStrings(node({ sub }), `${path}(${sub})`, out, subs); } catch { /* needs fuller ctx */ }
    }
    return;
  }
  if (Array.isArray(node)) { node.forEach((v, i) => collectStrings(v, `${path}[${i}]`, out, subs)); return; }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) collectStrings(v, `${path}.${k}`, out, subs);
  }
}

const TABLES: Array<[string, any]> = [
  ['DS_ANCESTRIES', DS_ANCESTRIES],
  ['DS_CULTURES', DS_CULTURES],
  ['DS_CAREERS', DS_CAREERS],
  ['DS_CLASSES', DS_CLASSES],
  ['DS_KITS', DS_KITS],
  ['DS_COMPLICATIONS', DS_COMPLICATIONS],
  ['CONDUIT_DOMAINS', { DOMAIN_1ST_FEATURES, DOMAIN_2_ABILITIES, DOMAIN_4_FEATURES, DOMAIN_6_ABILITIES, DOMAIN_7_FEATURES, DOMAIN_9_ABILITIES }],
  // Statblock text ships on the sheet like any other rules text, and the same content
  // pipeline writes it — it belongs under the same guards.
  ['SUMMONER_PORTFOLIOS', SUMMONER_PORTFOLIOS],
  ['BEASTHEART_COMPANIONS', BEASTHEART_COMPANIONS],
];

const allStrings: Array<[string, string]> = [];
for (const [name, table] of TABLES) collectStrings(table, name, allStrings);
for (const [clsId, levels] of Object.entries(LEVELUP_DATA as Record<string, any>)) {
  collectStrings(levels, `LEVELUP_DATA.${clsId}`, allStrings, SUBS_BY_CLASS[clsId] || []);
}

describe('data lint (H3)', () => {
  it('collected a sane amount of text', () => {
    expect(allStrings.length).toBeGreaterThan(1000);
  });

  it('no raw @-tokens in display strings', () => {
    // Image paths and the like never contain '@'; any '@' followed by a letter
    // is a leaked template token (@chr, @P, …).
    const leaks = allStrings.filter(([, s]) => /@[A-Za-z]/.test(s));
    expect(leaks.map(([p, s]) => `${p}: ${s.slice(0, 80)}`)).toEqual([]);
  });

  it('every ** is part of a balanced **bold** pair', () => {
    const bad = allStrings.filter(([, s]) => {
      const marks = (s.match(/\*\*/g) || []).length;
      return marks % 2 !== 0;
    });
    expect(bad.map(([p, s]) => `${p}: ${s.slice(0, 80)}`)).toEqual([]);
  });

  it('no whitespace before punctuation (PDF-extraction residue)', () => {
    const bad = allStrings.filter(([, s]) => /\s[,.;:](\s|$)/.test(s));
    expect(bad.map(([p, s]) => `${p}: ${s.slice(0, 100)}`)).toEqual([]);
  });

  it('no duplicated adjacent words', () => {
    const bad = allStrings.filter(([, s]) => {
      const m = /\b([A-Za-z]{2,})\s+\1\b/i.exec(s);
      return !!m;
    });
    expect(bad.map(([p, s]) => `${p}: ${s.slice(0, 100)}`)).toEqual([]);
  });

  it('no orphaned hyphenation halves', () => {
    // "destroy ing", "precipitat ing", "with- out" — a standalone suffix word or a
    // dangling hyphen mid-sentence is always a broken PDF line wrap. Suspended
    // hyphens before a conjunction ("Red- or blue-skinned") are legitimate.
    const bad = allStrings.filter(([, s]) =>
      /\b\w+ (ing|tion|ment)\b/.test(s) || /[a-z]- (?!or\b|and\b)[a-z]/.test(s));
    expect(bad.map(([p, s]) => `${p}: ${s.slice(0, 100)}`)).toEqual([]);
  });

  it('no leaked straight-quote enricher tokens', () => {
    // Broken '[[/apply "Damage Immunity 5"]]' enrichers leave '"Damage' style
    // fragments. Scoped to rules keywords so legitimate quoted prose passes.
    const bad = allStrings.filter(([, s]) =>
      /"(Damage|Acid|Cold|Corruption|Fire|Holy|Lightning|Poison|Psychic|Sonic)\b/.test(s));
    expect(bad.map(([p, s]) => `${p}: ${s.slice(0, 100)}`)).toEqual([]);
  });

  // ─── Truncation damage from the unified-data apply pass (v1.7) ───
  // The unified repo stores an ability's structured effect as only its lead-in sentence
  // ("Choose one of the following effects:") and keeps the options in metadata.content,
  // so a pass that read the structured field shipped instructions with nothing to follow.
  // These four guards describe what that damage looks like from the outside.

  it('no prose ends on a dangling lead-in colon', () => {
    // The options list belongs in the same string. The exception is a field whose choices
    // are structured data the picker renders itself.
    const STRUCTURED_CHOICES = ['Choose one skill from the following:'];
    const bad = allStrings.filter(([, s]) =>
      /:\s*$/.test(s) && !STRUCTURED_CHOICES.includes(s.trim()));
    expect(bad.map(([p, s]) => `${p}: ${s.slice(-80)}`)).toEqual([]);
  });

  it('long prose ends in terminal punctuation', () => {
    // Catches text cut mid-sentence ("…Many bureaucratic communities") and fields
    // overwritten with a stat fragment ("Stamina: Your maximum Stamina"). Short strings
    // are labels, names and tier fragments, which legitimately end bare. Scoped to prose
    // fields: a power-roll tier is a sentence fragment by design ("…as a free triggered
    // action") and a quote ends in its attribution.
    const PROSE = /\.(desc|text|effect|flavor|benefit|drawback|special|strained)$/;
    const bad = allStrings.filter(([p, s]) => {
      const t = s.trim();
      return PROSE.test(p) && t.length > 120 && !/[.!?)"'’”*\]]$/.test(t);
    });
    expect(bad.map(([p, s]) => `${p}: …${s.trim().slice(-70)}`)).toEqual([]);
  });

  it('no duplicated single-letter words', () => {
    // The duplicate-word rule above needs 2+ letters, so "a a size 1M object" slips past.
    const bad = allStrings.filter(([, s]) => /\b([aAI])\s+\1\b/.test(s));
    expect(bad.map(([p, s]) => `${p}: ${s.slice(0, 100)}`)).toEqual([]);
  });

  it('an ability with a trigger field does not repeat the trigger in its effect', () => {
    // The card renders `trigger` on its own line; a "**Trigger:**" inside the effect text
    // means the effect was overwritten with the whole card and now prints twice.
    const offenders: string[] = [];
    const walk = (node: any, path: string, subs?: string[]) => {
      if (typeof node === 'function' && subs) {
        for (const sub of subs.length ? subs : [undefined]) {
          try { walk(node({ sub }), `${path}(${sub})`, subs); } catch { /* needs fuller ctx */ }
        }
        return;
      }
      if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`, subs)); return; }
      if (node && typeof node === 'object') {
        if (typeof node.trigger === 'string' && node.trigger
          && typeof node.effect === 'string' && /\*\*Trigger:?\*\*/i.test(node.effect)) {
          offenders.push(`${path}: ${node.name || '(unnamed)'}`);
        }
        for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`, subs);
      }
    };
    for (const [name, table] of TABLES) walk(table, name);
    for (const [clsId, levels] of Object.entries(LEVELUP_DATA as Record<string, any>)) {
      walk(levels, `LEVELUP_DATA.${clsId}`, SUBS_BY_CLASS[clsId] || []);
    }
    expect(offenders).toEqual([]);
  });

  it('features that cite a table carry table data', () => {
    // "…as noted on the X table" must have a `table` on the same feature — except
    // acknowledged cross-references to a sibling feature that carries the table.
    const CROSS_REFS = new Set(['Primordial Strength', 'Primordial Cunning']);
    const offenders: string[] = [];
    const walk = (node: any, path: string, subs?: string[]) => {
      if (typeof node === 'function' && subs) {
        for (const sub of subs.length ? subs : [undefined]) {
          try { walk(node({ sub }), `${path}(${sub})`, subs); } catch { /* needs fuller ctx */ }
        }
        return;
      }
      if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`, subs)); return; }
      if (node && typeof node === 'object') {
        if (typeof node.name === 'string' && typeof node.text === 'string'
          && /\btable\b/i.test(node.text) && !node.table && !CROSS_REFS.has(node.name)) {
          offenders.push(`${path}: ${node.name}`);
        }
        for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`, subs);
      }
    };
    for (const [name, table] of TABLES) walk(table, name);
    for (const [clsId, levels] of Object.entries(LEVELUP_DATA as Record<string, any>)) {
      walk(levels, `LEVELUP_DATA.${clsId}`, SUBS_BY_CLASS[clsId] || []);
    }
    expect(offenders).toEqual([]);
  });
});
