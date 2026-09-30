// Realtime merge rule. A subscribed character row is skipped only when it's the hero
// the user has OPEN and they have a local edit debouncing or in flight for it (the
// own-save-echo / mid-typing clobber case). An idle open sheet applies remote rows —
// that's what lets two members share a public hero live. Regression for the old rule,
// which skipped whenever the open hero was merely *editable* and so silently dropped
// a co-editor's changes for the whole session.
import { describe, it, expect } from 'vitest';
import { shouldSkipRealtimeMerge } from '../app.jsx';

describe('shouldSkipRealtimeMerge', () => {
  it('skips the open hero while an edit is debouncing', () => {
    expect(shouldSkipRealtimeMerge('c1', 'c1', 'c1', null)).toBe(true);
  });

  it('skips the open hero while a save is in flight', () => {
    expect(shouldSkipRealtimeMerge('c1', 'c1', null, 'c1')).toBe(true);
  });

  it('applies remote rows for the open hero when idle (co-editing a public hero)', () => {
    expect(shouldSkipRealtimeMerge('c1', 'c1', null, null)).toBe(false);
  });

  it('applies rows for heroes that are not open, even mid-save of another', () => {
    expect(shouldSkipRealtimeMerge('c2', 'c1', 'c1', 'c1')).toBe(false);
  });

  it('applies rows when nothing is open', () => {
    expect(shouldSkipRealtimeMerge('c1', null, null, null)).toBe(false);
  });
});

// A realtime row can arrive without its data blob (Supabase drops every column
// over 64 bytes once the record passes 1 MiB). Such a hollow row must be detected
// before it reaches the normalizers — which read c.career / c.cclass unguarded —
// and a hero the DB itself holds with sections missing must be filled so it can
// still render and be repaired in the wizard.
import { isHollowHero, ensureShape, normalizeLoaded, newCharacter } from '../app.jsx';

const HOLLOW_ROW = { id: 'c1', ownerId: 'u1', campaignId: null, status: 'complete', level: 3, visibility: 'private' };

describe('isHollowHero', () => {
  it('flags a row that carries only the column fields', () => {
    expect(isHollowHero(HOLLOW_ROW)).toBe(true);
  });

  it('flags null / undefined', () => {
    expect(isHollowHero(null)).toBe(true);
    expect(isHollowHero(undefined)).toBe(true);
  });

  it('accepts a freshly created hero', () => {
    expect(isHollowHero(newCharacter('u1', null))).toBe(false);
  });

  it('accepts a hero with only some sections (a partial save is not hollow)', () => {
    const c: any = newCharacter('u1', null);
    delete c.career;
    expect(isHollowHero(c)).toBe(false);
  });
});

describe('ensureShape', () => {
  it('returns the same object when nothing is missing', () => {
    const c = newCharacter('u1', null);
    expect(ensureShape(c)).toBe(c);
  });

  it('fills a missing section with the default shape and leaves the rest untouched', () => {
    const c: any = newCharacter('u1', null);
    c.cclass.id = 'fury';
    delete c.career;
    const out: any = ensureShape(c);
    expect(out).not.toBe(c);
    expect(out.career).toEqual({ id: null, incident: '', taken: '', languages: [], skills: [], perk: '', perkPicks: { skills: [], languages: [] } });
    expect(out.cclass).toBe(c.cclass);
    expect(c.career).toBeUndefined(); // input not mutated
  });

  it('gives a hollow row every section so the roster can render it', () => {
    const out: any = ensureShape(HOLLOW_ROW);
    for (const k of ['ancestry', 'culture', 'career', 'cclass', 'kit', 'kit2', 'complication', 'identity', 'levelChoices', 'play']) {
      expect(out[k]).toBeDefined();
    }
    expect(out.id).toBe('c1');
    expect(out.level).toBe(3);
  });
});

describe('normalizeLoaded', () => {
  it('does not throw on a hollow row (the crash that blanked the app)', () => {
    expect(() => normalizeLoaded(HOLLOW_ROW)).not.toThrow();
    expect((normalizeLoaded(HOLLOW_ROW) as any).career.id).toBeNull();
  });

  it('is identity-preserving for a clean hero', () => {
    const c = newCharacter('u1', null);
    expect(normalizeLoaded(c)).toBe(c);
  });
});
