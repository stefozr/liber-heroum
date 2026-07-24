// Level-up data registration — every class with a level-up table must be
// reachable from the LEVELUP_DATA export itself (not via window side effects),
// with a complete levels-2-10 progression. Pins the bug where the five
// externally-defined classes (null, troubadour, shadow, tactician, talent)
// silently unregistered whenever levelup.jsx re-evaluated.
import { describe, it, expect } from 'vitest';
import { LEVELUP_DATA } from '../levelup.jsx';

const ALL_CLASSES = ['censor', 'conduit', 'elementalist', 'fury', 'null', 'shadow', 'tactician', 'talent', 'troubadour'];

describe('LEVELUP_DATA', () => {
  it('registers all nine classes', () => {
    expect(Object.keys(LEVELUP_DATA).sort()).toEqual(ALL_CLASSES);
  });

  ALL_CLASSES.forEach((id) => {
    it(`${id} has complete level 2-10 entries`, () => {
      const cls = LEVELUP_DATA[id];
      for (let lvl = 2; lvl <= 10; lvl++) {
        const entry = cls[lvl];
        expect(entry, `${id} level ${lvl}`).toBeTruthy();
        expect(entry.summary, `${id} level ${lvl} summary`).toBeTruthy();
        expect(entry.staminaGain, `${id} level ${lvl} staminaGain`).toBeGreaterThan(0);
        expect(Array.isArray(entry.choices), `${id} level ${lvl} choices`).toBe(true);
      }
    });
  });
});
