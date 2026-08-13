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
