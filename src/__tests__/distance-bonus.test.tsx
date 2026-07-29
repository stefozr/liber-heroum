// Keyword-gated ability distance bonuses. Features like Acolyte of the Mystery,
// Prayer/Enchantment of Distance, and Distance Augmentation grant +2 distance to
// abilities carrying specific keywords. The data marks them with a machine-readable
// `distanceBonus: { keywords, amount }`, collectDistanceBonuses gathers the ones a
// character has, and applyDistanceBonuses bumps the Ranged/within components of a
// matching ability's distance string at display time (play sheet + wizard review).
import { describe, it, expect } from 'vitest';
import { newCharacter, collectDistanceBonuses, applyDistanceBonuses } from '../app.jsx';
import { DS_CLASSES } from '../data.jsx';

const cls = (id: string) => DS_CLASSES.find((x: any) => x.id === id);

function charOf(classId: string, cclassPatch: any = {}) {
  const c: any = newCharacter('u-test', null);
  c.cclass = { ...c.cclass, id: classId, ...cclassPatch };
  return c;
}

const elementalist = cls('elementalist');
const voidSub = elementalist.subclasses.find((s: any) => s.id === 'void');
const subtleRelocation = voidSub.abilities.find((a: any) => a.name === 'Subtle Relocation');
const sharedVoidSense = voidSub.abilities.find((a: any) => a.name === 'Shared Void Sense');
const graspOfBeyond = elementalist.signatures.find((a: any) => a.name === 'Grasp of Beyond');
const beholdTheMystery = elementalist.heroic3.find((a: any) => a.name === 'Behold the Mystery');
const hurlElement = elementalist.features.find((f: any) => f.name === 'Hurl Element').ability;

describe('collectDistanceBonuses', () => {
  it('void elementalist gets the Acolyte of the Mystery bonus', () => {
    const bonuses = collectDistanceBonuses(charOf('elementalist', { subclass: 'void' }));
    expect(bonuses).toEqual([{ keywords: ['Magic', 'Ranged', 'Void'], amount: 2 }]);
  });

  it('non-void elementalist specializations grant no distance bonus', () => {
    for (const sub of ['earth', 'fire', 'green']) {
      expect(collectDistanceBonuses(charOf('elementalist', { subclass: sub }))).toEqual([]);
    }
  });

  it('conduit with the Distance prayer gets +2 ranged magic', () => {
    const bonuses = collectDistanceBonuses(charOf('conduit', { prayer: 'Distance' }));
    expect(bonuses).toEqual([{ keywords: ['Magic', 'Ranged'], amount: 2 }]);
  });

  it('conduit with a different prayer gets nothing', () => {
    expect(collectDistanceBonuses(charOf('conduit', { prayer: 'Steel' }))).toEqual([]);
  });

  it('talent with Distance Augmentation gets +2 ranged psionic', () => {
    const bonuses = collectDistanceBonuses(charOf('talent', { enchantment: 'Distance Augmentation' }));
    expect(bonuses).toEqual([{ keywords: ['Psionic', 'Ranged'], amount: 2 }]);
  });

  it('elementalist Enchantment of Distance is collected once, not per choice-slot alias', () => {
    // enchantWard/augmentWard/augment all map to the same cclass.enchantment slot —
    // only the class's own choice feature may contribute.
    const bonuses = collectDistanceBonuses(charOf('elementalist', { subclass: 'fire', enchantment: 'Enchantment of Distance' }));
    expect(bonuses).toEqual([{ keywords: ['Magic', 'Ranged'], amount: 2 }]);
  });

  it('void + Enchantment of Distance stack as two separate bonuses', () => {
    const bonuses = collectDistanceBonuses(charOf('elementalist', { subclass: 'void', enchantment: 'Enchantment of Distance' }));
    expect(bonuses).toHaveLength(2);
  });

  it('classless character gets nothing', () => {
    expect(collectDistanceBonuses(newCharacter('u-test', null))).toEqual([]);
  });
});

describe('applyDistanceBonuses', () => {
  const acolyte = [{ keywords: ['Magic', 'Ranged', 'Void'], amount: 2 }];

  it('Subtle Relocation shows Ranged 12 for a Void elementalist', () => {
    expect(applyDistanceBonuses(subtleRelocation, acolyte).distance).toBe('Ranged 12');
    expect(subtleRelocation.distance).toBe('Ranged 10'); // data untouched
  });

  it('Shared Void Sense also gains the bonus', () => {
    expect(applyDistanceBonuses(sharedVoidSense, acolyte).distance).toBe('Ranged 12');
  });

  it('area shapes bump the "within" component', () => {
    expect(applyDistanceBonuses(beholdTheMystery, acolyte).distance).toBe('3 cube within 12');
  });

  it('melee and keyword-mismatched abilities are returned unchanged', () => {
    // Grasp of Beyond is Melee (no Ranged keyword); Hurl Element lacks the Void keyword.
    expect(applyDistanceBonuses(graspOfBeyond, acolyte)).toBe(graspOfBeyond);
    expect(applyDistanceBonuses(hurlElement, acolyte)).toBe(hurlElement);
  });

  it('Hurl Element does gain the Enchantment of Distance bonus', () => {
    const enchant = [{ keywords: ['Magic', 'Ranged'], amount: 2 }];
    expect(applyDistanceBonuses(hurlElement, enchant).distance).toBe('Ranged 12');
  });

  it('stacked bonuses sum (void acolyte + Enchantment of Distance → Ranged 14)', () => {
    const both = [...acolyte, { keywords: ['Magic', 'Ranged'], amount: 2 }];
    expect(applyDistanceBonuses(subtleRelocation, both).distance).toBe('Ranged 14');
  });

  it('bumps only the ranged side of a dual melee/ranged distance', () => {
    const a = { name: 'X', keywords: ['Magic', 'Ranged'], distance: 'Melee 1 or Ranged 5' };
    expect(applyDistanceBonuses(a, [{ keywords: ['Magic', 'Ranged'], amount: 2 }]).distance).toBe('Melee 1 or Ranged 7');
  });

  it('tolerates missing distance, keywords, or bonuses', () => {
    const bare = { name: 'X' };
    expect(applyDistanceBonuses(bare, acolyte)).toBe(bare);
    expect(applyDistanceBonuses(subtleRelocation, [])).toBe(subtleRelocation);
    expect(applyDistanceBonuses(null, acolyte)).toBe(null);
  });
});
