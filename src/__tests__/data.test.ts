// Data integrity guard. Snapshots a compact { count, hash } digest of every game
// table. Captured against the current monolithic data.jsx, then must stay
// identical after the split into src/data/* — any dropped/reordered/edited entry
// changes the hash and fails the test.
import { describe, it, expect } from 'vitest';
import * as data from '../data.jsx';

// djb2 over the canonical JSON — tiny, deterministic, catches any content change.
function hash(x: unknown): string {
  const s = JSON.stringify(x);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}
function digest(x: any) {
  const count = Array.isArray(x) ? x.length : Object.keys(x).length;
  return { count, bytes: JSON.stringify(x).length, hash: hash(x) };
}

const TABLES = [
  'DS_LANGUAGES', 'DS_SKILL_GROUPS', 'DS_ANCESTRIES', 'DS_CULTURES',
  'DS_CAREERS', 'DS_CLASSES', 'DS_KITS', 'DS_COMPLICATIONS', 'DS_STEPS',
  'DS_LEVEL_BONUSES',
] as const;

describe('game data tables', () => {
  for (const name of TABLES) {
    it(`${name} is present and unchanged`, () => {
      const value = (data as any)[name];
      expect(value, `${name} must be exported`).toBeDefined();
      expect(digest(value)).toMatchSnapshot();
    });
  }
});

describe('heroic resource rules', () => {
  it('every class carries a feature explaining how its heroic resource is gained', () => {
    for (const cls of (data as any).DS_CLASSES) {
      const f = (cls.features || []).find((x: any) => x.name === cls.resource || x.name.startsWith(cls.resource + ' '));
      expect(f, `${cls.id} has no feature for ${cls.resource}`).toBeDefined();
      expect(f.text, `${cls.id} resource text`).toMatch(/start of each of your turns/i);
    }
  });
});
