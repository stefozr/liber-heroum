// data-lint — guards against content-pipeline leaks in shipped rules text (audit H3).
// Two failure classes:
//   1. Raw compendium tokens like '@chr' / '@P' surviving into display strings
//      (they belong only to the Foundry export layer, which builds its own).
//   2. Unbalanced '**' markdown — renderRich() bolds **…** pairs, so an odd
//      count means a literal asterisk pair leaks to screen.
import { describe, it, expect } from 'vitest';
import { DS_ANCESTRIES, DS_CULTURES, DS_CAREERS, DS_CLASSES, DS_KITS, DS_COMPLICATIONS } from '../data.jsx';
import { LEVELUP_DATA } from '../levelup.jsx';

function collectStrings(node: any, path: string, out: Array<[string, string]>) {
  if (typeof node === 'string') { out.push([path, node]); return; }
  if (Array.isArray(node)) { node.forEach((v, i) => collectStrings(v, `${path}[${i}]`, out)); return; }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) collectStrings(v, `${path}.${k}`, out);
  }
}

const TABLES: Array<[string, any]> = [
  ['DS_ANCESTRIES', DS_ANCESTRIES],
  ['DS_CULTURES', DS_CULTURES],
  ['DS_CAREERS', DS_CAREERS],
  ['DS_CLASSES', DS_CLASSES],
  ['DS_KITS', DS_KITS],
  ['DS_COMPLICATIONS', DS_COMPLICATIONS],
  ['LEVELUP_DATA', LEVELUP_DATA],
];

const allStrings: Array<[string, string]> = [];
for (const [name, table] of TABLES) collectStrings(table, name, allStrings);

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
});
