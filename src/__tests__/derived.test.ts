// computeDerived — pins stat math for every bonus source: class base, kits
// (Field Arsenal max-merge), ancestry traits, prayer/enchantment/augmentation
// picks, complications, and subclass level-gated features (DS_LEVEL_BONUSES).
import { describe, it, expect } from 'vitest';
import { newCharacter, computeDerived } from '../app.jsx';
import { resolvedAncestryTraits } from '../wizard/helpers.js';

function hero(over: any = {}) {
  const c: any = newCharacter('u-test', null);
  Object.assign(c, over);
  return c;
}
function withClass(id: string, extra: any = {}) {
  const c = hero();
  c.cclass.id = id;
  Object.assign(c.cclass, extra);
  return c;
}

describe('class + kit baseline', () => {
  it('fury L1 with panther kit', () => {
    const c = withClass('fury');
    c.kit.id = 'panther';
    const d = computeDerived(c);
    expect(d.staminaMax).toBe(21 + 6);       // 21 base + panther 6/echelon
    expect(d.speed).toBe(5 + 1);
    expect(d.stability).toBe(0 + 1);
    expect(d.disengage).toBe(1);
  });

  it('kit stamina scales with echelon, not level', () => {
    const c = withClass('fury');
    c.kit.id = 'panther';
    c.level = 4;                              // echelon 2
    const d = computeDerived(c);
    expect(d.staminaMax).toBe(21 + 3 * 9 + 6 * 2);
  });

  it('tactician dual kits merge via max (Field Arsenal)', () => {
    const c = withClass('tactician');
    c.kit.id = 'shining-armor';               // sta_per 12, stab 1
    c.kit2.id = 'sniper';                     // spd 1, disengage 1
    const d = computeDerived(c);
    expect(d.staminaMax).toBe(21 + 12);
    expect(d.speed).toBe(5 + 1);
    expect(d.stability).toBe(0 + 1);
    expect(d.disengage).toBe(1 + 1);
  });
});

describe('class feature picks (prayer / enchantment / augmentation)', () => {
  it('conduit Prayer of Steel adds stamina per echelon and stability', () => {
    const l1 = computeDerived(withClass('conduit', { prayer: 'Steel' }));
    expect(l1.staminaMax).toBe(18 + 6);
    expect(l1.stability).toBe(1);
    const c4 = withClass('conduit', { prayer: 'Steel' });
    c4.level = 4;
    expect(computeDerived(c4).staminaMax).toBe(18 + 3 * 6 + 6 * 2);
  });

  it('conduit Speed prayer adds speed and disengage', () => {
    const d = computeDerived(withClass('conduit', { prayer: 'Speed' }));
    expect(d.speed).toBe(6);
    expect(d.disengage).toBe(2);
  });

  it('null Density Augmentation + always-on Null Speed', () => {
    const c = withClass('null', { enchantment: 'Density Augmentation' });
    c.cclass.characteristics = { Might: -1, Agility: 2, Reason: 2, Intuition: 1, Presence: 0 };
    const d = computeDerived(c);
    expect(d.staminaMax).toBe(21 + 6);        // density: +6/echelon
    expect(d.stability).toBe(1);              // density: +1
    expect(d.speed).toBe(5 + 2);              // Null Speed: +Agility
    expect(d.disengage).toBe(1 + 2);
  });

  it('elementalist Enchantment of Battle adds 3 stamina per echelon', () => {
    const d = computeDerived(withClass('elementalist', { enchantment: 'Enchantment of Battle' }));
    expect(d.staminaMax).toBe(18 + 3);
  });
});

describe('ancestry traits (data-driven)', () => {
  it('dwarf Grounded + Spark Off Your Skin', () => {
    const c = withClass('censor');
    c.ancestry.id = 'dwarf';
    c.ancestry.traits = ['Grounded', 'Spark Off Your Skin'];
    const d = computeDerived(c);
    expect(d.staminaMax).toBe(21 + 6);
    expect(d.stability).toBe(0 + 1);
  });

  it('high elf Graceful Retreat feeds the disengage stat', () => {
    const c = withClass('shadow');
    c.ancestry.id = 'high-elf';
    c.ancestry.traits = ['Graceful Retreat'];
    expect(computeDerived(c).disengage).toBe(2);
  });

  it('"speed N" traits upgrade the base; additive bonuses stack on top', () => {
    const c = withClass('shadow');
    c.ancestry.id = 'wode-elf';
    c.ancestry.traits = ['Swift'];            // base 5 upgraded to 6
    expect(computeDerived(c).speed).toBe(6);
    c.kit.id = 'arcane-archer';               // +1 speed on the upgraded base
    expect(computeDerived(c).speed).toBe(7);
    c.kit.id = 'swashbuckler';                // +3 speed
    expect(computeDerived(c).speed).toBe(9);
  });

  it('devil Beast Legs + a +2 speed kit yields 8', () => {
    const c = withClass('shadow');
    c.ancestry.id = 'devil';
    c.ancestry.traits = ['Beast Legs'];       // base 5 → 6
    c.kit.id = 'cloak-dagger';            // +2 speed
    expect(computeDerived(c).speed).toBe(8);
  });

  it('memonek Lightning Nimbleness is never a no-op alongside a kit', () => {
    const c = withClass('shadow');
    c.ancestry.id = 'memonek';
    c.ancestry.traits = ['Lightning Nimbleness'];  // base 5 → 7
    c.kit.id = 'cloak-dagger';                 // +2 speed
    expect(computeDerived(c).speed).toBe(9);
  });

  it('speed penalties are not swallowed by a "speed N" upgrade', () => {
    const c = withClass('shadow');
    c.ancestry.id = 'devil';
    c.ancestry.traits = ['Beast Legs'];       // base 5 → 6
    c.complication.id = 'curse-of-caution';   // −1 speed
    expect(computeDerived(c).speed).toBe(5);
  });

  it('human Staying Power adds recoveries', () => {
    const c = withClass('conduit');
    c.ancestry.id = 'human';
    c.ancestry.traits = ['Staying Power'];
    expect(computeDerived(c).recoveries).toBe(8 + 2);
  });
});

describe('revenant previous life', () => {
  function revenant(formerLife: string, traits: string[], prevLifeTraits: any) {
    const c = withClass('censor');
    c.ancestry.id = 'revenant';
    c.ancestry.formerLife = formerLife;
    c.ancestry.traits = traits;
    c.ancestry.prevLifeTraits = prevLifeTraits;
    return c;
  }

  it('resolvedAncestryTraits expands the borrowed trait, keeps the placeholder when unpicked', () => {
    const picked = resolvedAncestryTraits(revenant('dwarf', ['Previous Life: 1pt', 'Undead Influence'], { '1pt': 'Grounded' }));
    expect(picked.map((t: any) => t.name)).toEqual(['Grounded', 'Undead Influence']);
    expect(picked[0].borrowedFrom).toBe('Dwarf');
    const unpicked = resolvedAncestryTraits(revenant('dwarf', ['Previous Life: 1pt'], {}));
    expect(unpicked[0].name).toBe('Previous Life: 1pt');
    expect(unpicked[0].placeholder).toBe(true);
  });

  it('borrowed trait bonuses reach derived stats', () => {
    const grounded = revenant('dwarf', ['Previous Life: 1pt'], { '1pt': 'Grounded' });
    expect(computeDerived(grounded).stability).toBe(1);
    const spark = revenant('dwarf', ['Previous Life: 2pt'], { '2pt': 'Spark Off Your Skin' });
    expect(computeDerived(spark).staminaMax).toBe(21 + 6);
    const swift = revenant('wode-elf', ['Previous Life: 2pt'], { '2pt': 'Swift' });
    expect(computeDerived(swift).speed).toBe(6);
  });

  it('size comes from the former life', () => {
    expect(computeDerived(revenant('hakaan', [], {})).size).toBe('1L');
    expect(computeDerived(revenant('polder', [], {})).size).toBe('1S');
    const human = withClass('censor');
    human.ancestry.id = 'human';
    expect(computeDerived(human).size).toBe('1M');
  });
});

describe('complications', () => {
  it('Elemental Inside adds stamina per echelon', () => {
    const c = withClass('fury');
    c.complication.id = 'elemental-inside';
    expect(computeDerived(c).staminaMax).toBe(21 + 3);
    c.level = 4;
    expect(computeDerived(c).staminaMax).toBe(21 + 3 * 9 + 3 * 2);
  });

  it('Curse of Stone adds stability (was dead code against ancestry traits)', () => {
    const c = withClass('fury');
    c.complication.id = 'curse-of-stone';
    expect(computeDerived(c).stability).toBe(1);
  });

  it('Primordial Sickness and Curse of Caution apply penalties', () => {
    const sick = withClass('fury');
    sick.complication.id = 'primordial-sickness';
    expect(computeDerived(sick).recoveries).toBe(10 - 1);
    const slow = withClass('fury');
    slow.complication.id = 'curse-of-caution';
    expect(computeDerived(slow).speed).toBe(5 - 1);
  });

  it('Wodewalker raises recovery value by the highest characteristic', () => {
    const c = withClass('fury');
    c.cclass.characteristics = { Might: 2, Agility: 2, Reason: -1, Intuition: 1, Presence: -1 };
    const before = computeDerived(c).recoveryValue;
    c.complication.id = 'wodewalker';
    expect(computeDerived(c).recoveryValue).toBe(before + 2);
  });
});

describe('subclass level-gated features', () => {
  const furyChars = { Might: 2, Agility: 2, Reason: -1, Intuition: 1, Presence: -1 };

  it('reaver gains Agility speed at L2 (Inescapable Wrath), not before', () => {
    const c = withClass('fury', { subclass: 'reaver' });
    c.cclass.characteristics = furyChars;
    expect(computeDerived(c).speed).toBe(5);
    c.level = 2;
    expect(computeDerived(c).speed).toBe(5 + 2);
  });

  it('berserker gains Might stability at L3 (Immovable Object)', () => {
    const c = withClass('fury', { subclass: 'berserker' });
    c.cclass.characteristics = furyChars;
    c.level = 3;
    expect(computeDerived(c).stability).toBe(2);
    // Subclass-gated: a reaver at L3 gets nothing from Immovable Object.
    c.cclass.subclass = 'reaver';
    expect(computeDerived(c).stability).toBe(0);
  });

  it('earth elementalist gains 3×level stamina at L2 (Disciple of Earth)', () => {
    const c = withClass('elementalist', { subclass: 'earth' });
    c.level = 2;
    expect(computeDerived(c).staminaMax).toBe(18 + 6 + 3 * 2);
    c.level = 5;                              // echelon 2; Mountain Does Not Move: stability += level
    const d = computeDerived(c);
    expect(d.staminaMax).toBe(18 + 4 * 6 + 3 * 5);
    expect(d.stability).toBe(5);
  });

  it('null gains +21 flat stamina at L9 (I Am the Weapon)', () => {
    const c = withClass('null');
    c.level = 9;
    const withoutFeature = 21 + 8 * 9;        // base progression
    expect(computeDerived(c).staminaMax).toBe(withoutFeature + 21);
  });
});
