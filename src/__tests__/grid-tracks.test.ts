// Equal-width grid tracks. jsdom does no layout, so this pins the CSS rule that
// produces equal columns rather than the rendered widths.
//
// A bare `1fr` is `minmax(auto, 1fr)`: the track's floor is its widest child's
// min-content. One card with an unbreakable header then widens its whole column
// and the siblings shrink to pay for it, so a "repeat(3, 1fr)" grid renders three
// different widths. That was the class-picker bug. Every multi-track template
// therefore has to spell out `minmax(0, …)`.
//
// Scans source text rather than importing the sheets: they are template literals
// inside modules that don't all export them, and this way any stylesheet added
// later is covered without touching this file.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '..');

function sourceFiles(dir: string, out: string[] = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === '__tests__' || entry === 'node_modules') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(js|jsx|ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

// Every grid-template-columns value in a file.
function templates(css: string) {
  const out: string[] = [];
  const re = /grid-template-columns\s*:\s*([^;}]+)/g;
  let m;
  while ((m = re.exec(css))) out.push(m[1].trim());
  return out;
}

// Split on whitespace at paren depth 0, so "minmax(0, 2fr)" stays one token.
function splitTop(value: string) {
  const out: string[] = [];
  let depth = 0, cur = '';
  for (const ch of value) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (/\s/.test(ch) && depth === 0) { if (cur) out.push(cur); cur = ''; }
    else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

// Split a template into its tracks, expanding repeat(N, X) into N copies of X.
// repeat(auto-fill, …) is left as a single token: it sizes its own tracks equally
// by construction, so it isn't subject to this bug.
function tracksOf(value: string) {
  const parts: string[] = [];
  for (const token of splitTop(value)) {
    const m = /^repeat\(\s*(\d+)\s*,(.*)\)$/.exec(token);
    if (m) for (let i = 0; i < Number(m[1]); i++) parts.push(m[2].trim());
    else parts.push(token);
  }
  return parts;
}

// The bug only exists between fr tracks that are meant to size against each other,
// so this flags a template only when *every* track is an fr track and there are two
// or more of them — the equal-columns-of-cards case this guards.
//
// Deliberately not flagged: mixed templates like "38px 1fr" or "1fr auto 1fr", where
// the fr track is a flexible remainder beside a fixed or auto one. A bare fr there
// has the same min-content floor, but tightening it changes how those layouts
// distribute space, which is a separate change from this one.
function offendersIn(value: string) {
  const tracks = tracksOf(value);
  // Not /\bfr\b/ — "1fr" has no word boundary between the digit and the "f",
  // so that pattern silently matches nothing.
  const isFr = (t: string) => /fr\b/.test(t);
  if (tracks.length < 2 || !tracks.every(isFr)) return [];
  return tracks
    .filter(t => !t.includes('minmax(0'))
    .map(t => `${value}   →   bare "${t}"`);
}

describe('grid track sizing', () => {
  const files = sourceFiles(SRC);

  it('finds the stylesheets it is meant to guard', () => {
    const withGrids = files.filter(f => templates(readFileSync(f, 'utf8')).length > 0);
    // theme/styles.js, play.jsx and levelup.jsx at minimum — if this drops to zero
    // the scan silently stopped testing anything.
    expect(withGrids.length).toBeGreaterThanOrEqual(3);
  });

  it('no multi-track template uses a bare fr unit', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const rel = file.slice(SRC.length + 1).replace(/\\/g, '/');
      for (const value of templates(readFileSync(file, 'utf8'))) {
        for (const bad of offendersIn(value)) offenders.push(`${rel}: ${bad}`);
      }
    }
    expect(offenders, `use minmax(0, …) instead:\n  ${offenders.join('\n  ')}`).toEqual([]);
  });

  it('the picker grids are declared with minmax(0, 1fr)', () => {
    // The specific regression: .grid-2/3/4 back ~42 call sites across the wizard,
    // review and play screens, so they are the ones worth naming explicitly.
    const css = readFileSync(join(SRC, 'theme', 'styles.js'), 'utf8');
    for (const n of [2, 3, 4]) {
      const rule = new RegExp(`\\.grid-${n} \\{[^}]*grid-template-columns: repeat\\(${n}, minmax\\(0, 1fr\\)\\)`);
      expect(css, `.grid-${n} must use minmax(0, 1fr)`).toMatch(rule);
    }
  });
});
