// attributeCareerSkills — a chosen career skill must belong to exactly one pick
// group, even when the skill lives in two skill groups (Track: exploration+intrigue,
// Handle Animals: exploration+interpersonal).
import { describe, it, expect } from 'vitest';
import { attributeCareerSkills } from '../wizard/helpers.js';
import { DS_SKILL_GROUPS } from '../data.jsx';

// "one exploration + one intrigue" — both pools contain Track.
const EXPLORATION_PLUS_INTRIGUE = {
  auto: [],
  picks: [
    { count: 1, groups: ['exploration'], label: 'one exploration' },
    { count: 1, groups: ['intrigue'], label: 'one intrigue' },
  ],
};

describe('attributeCareerSkills', () => {
  it('data premise: Track is in both exploration and intrigue', () => {
    expect(DS_SKILL_GROUPS.exploration).toContain('Track');
    expect(DS_SKILL_GROUPS.intrigue).toContain('Track');
  });

  it('honors the explicit pick the user clicked, not the first matching pool', () => {
    const map = attributeCareerSkills(EXPLORATION_PLUS_INTRIGUE, ['Track'], { Track: 1 });
    expect(map.get('Track')).toBe(1);
    expect(map.size).toBe(1);
  });

  it('legacy saves without skillPicks fall back to the first pool with capacity', () => {
    const map = attributeCareerSkills(EXPLORATION_PLUS_INTRIGUE, ['Track', 'Sneak'], undefined);
    expect(map.get('Track')).toBe(0);   // exploration still open when Track is placed
    expect(map.get('Sneak')).toBe(1);   // Sneak is intrigue-only
  });

  it('fallback skips a pick group that is already full', () => {
    // Navigate (exploration-only) fills pick 0, so unmapped Track must land in intrigue.
    const map = attributeCareerSkills(EXPLORATION_PLUS_INTRIGUE, ['Navigate', 'Track'], { Navigate: 0 });
    expect(map.get('Navigate')).toBe(0);
    expect(map.get('Track')).toBe(1);
  });

  it('ignores an invalid mapping (out of range / not in that pool) and re-attributes', () => {
    const outOfRange = attributeCareerSkills(EXPLORATION_PLUS_INTRIGUE, ['Track'], { Track: 7 });
    expect(outOfRange.get('Track')).toBe(0);
    const wrongPool = attributeCareerSkills(EXPLORATION_PLUS_INTRIGUE, ['Sneak'], { Sneak: 0 });
    expect(wrongPool.get('Sneak')).toBe(1);   // Sneak isn't exploration; falls back to intrigue
  });

  it('auto-granted skills are never attributed to a pick group', () => {
    const parsed = { ...EXPLORATION_PLUS_INTRIGUE, auto: ['Track'] };
    const map = attributeCareerSkills(parsed, ['Track'], {});
    expect(map.has('Track')).toBe(false);
  });

  it('handles explicit option lists ("Music or Perform") like group pools', () => {
    const parsed = { auto: [], picks: [{ count: 1, options: ['Music', 'Perform'], label: 'Music or Perform' }] };
    const map = attributeCareerSkills(parsed, ['Perform'], {});
    expect(map.get('Perform')).toBe(0);
  });
});
