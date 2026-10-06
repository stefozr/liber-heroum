// Regression cases from the 2026-10-06 Steel Compendium v2 audit.
// These rules are independent of the vendored Foundry compendium baseline.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import { newCharacter, computeDerived, playCurrencies, respiteComplicationChanges, normalizeLoaded, summarizeBenefits } from '../app.jsx';
import { DS_CLASSES, DS_KITS, DS_CAREERS, DS_ANCESTRIES } from '../data.jsx';
import { kitSigAbility, parseCareerSkills, attributeCareerSkills } from '../wizard/helpers.js';
import { LEVELUP_DATA, makeContext, levelChoicesFor } from '../levelup.jsx';
import { PlayView } from '../play.jsx';
import { KitDetails } from '../theme/sheet.jsx';
import { DOMAIN_6_ABILITIES } from '../data/conduit-domains.js';

vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} });
afterEach(cleanup);

function hero(cls = 'censor', sub?: string) {
  const c: any = newCharacter('audit-test', null);
  c.cclass.id = cls;
  c.cclass.subclass = sub;
  c.identity.name = 'Audit Hero';
  c.kit.id = 'mountain';
  return c;
}
function levelAbility(cls: string, level: number, name: string, sub?: string) {
  const c = hero(cls, sub);
  const ctx = makeContext(c);
  const data: any = LEVELUP_DATA[cls][level];
  const auto = typeof data.autoAbilities === 'function' ? data.autoAbilities(ctx) : (data.autoAbilities || []);
  const choices = levelChoicesFor(DS_CLASSES.find(x => x.id === cls), level, ctx);
  const abilities = [...auto, ...choices.flatMap((ch: any) => {
    if (ch.kind !== 'ability') return [];
    return typeof ch.options === 'function' ? ch.options(ctx) : (ch.options || []);
  })];
  const a = abilities.find((a: any) => a.name === name);
  expect(a, `${cls} L${level} grants ${name}`).toBeTruthy();
  return a;
}

describe('complete ability rules', () => {
  it('Gods’ Machine repeats its roll once on each later turn', () => {
    const a: any = DOMAIN_6_ABILITIES.Creation;
    expect(a.effect).toMatch(/Once on each subsequent turn.*free maneuver.*Intuition.*repeat the power roll/);
  });
  it('I’m No Threat breaks on interaction or harm and rewards harm with a surge', () => {
    const sub: any = DS_CLASSES.find(x => x.id === 'shadow')!.subclasses.find(x => x.id === 'harlequin-mask');
    const a = sub.abilities.find((x: any) => x.name === 'I’m No Threat');
    expect(a.effect).toContain('physically interact');
    expect(a.effect).toContain('no action required');
    expect(a.effect).toMatch(/harming another creature, you gain 1 surge/);
  });
  it('Gravitic Well only targets allies in its strained version', () => {
    const a = levelAbility('talent', 6, 'Gravitic Well', 'telekinesis');
    expect(a.target).toBe('Each enemy and object in the area');
    expect(a.strained).toContain('yourself and each ally');
  });
  it('Heart of the Wode restrains nearby enemies with a main action escape', () => {
    const a = levelAbility('elementalist', 8, 'Heart of the Wode', 'green');
    expect(a.effect).toMatch(/ends their turn within 3 squares.*restrained until the end of their next turn/);
    expect(a.effect).toContain('main action to end the effect early');
  });
  it('10,000 Minions supplies at most ten additional Minion Bridge squares', () => {
    expect(levelAbility('summoner', 9, '10,000 Minions', 'blight').effect).toMatch(/Minion Bridge.*maximum of 10 additional squares/);
  });
  it('Cavalry Call minions expire without death effects or essence', () => {
    const a = levelAbility('summoner', 3, 'Cavalry Call', 'blight');
    expect(a.effect).toContain('die at the end of your turn');
    expect(a.effect).toContain('activate no effects upon death');
    expect(a.effect).toContain('gain no essence');
  });
  it('Void portals can expand and offer destination choices', () => {
    const a = levelAbility('elementalist', 2, 'There Is No Space Between', 'void');
    expect(a.effect).toMatch(/start of each of your turns.*new portal/);
    expect(a.effect).toContain('three or more portals');
    expect(a.effect).toContain("chooses that enemy's destination portal");
  });
  it('Mantle of Essence can be switched off freely', () => {
    const c = hero('elementalist', 'fire');
    const features: any[] = LEVELUP_DATA.elementalist[4].autoFeatures(makeContext(c));
    expect(features.find(x => x.name === 'Mantle of Essence').text).toContain('activate or deactivate this aura at will (no action required)');
  });
  it('Shadowmeld’s trait and ability both explain surface destruction', () => {
    const sig: any = DS_ANCESTRIES.find(x => x.id === 'polder')!.signatures.find(x => x.name === 'Shadowmeld');
    for (const text of [sig.text, sig.abilities[0].effect]) {
      expect(text).toMatch(/surface.*destroyed.*ability ends.*1d6 damage/);
    }
  });
});

describe('kit signatures and Stormwight forms', () => {
  it('all 25 kit cards specify keyword, target, and characteristic rules', () => {
    expect(DS_KITS).toHaveLength(25);
    for (const kit of DS_KITS) {
      const a = kitSigAbility(kit);
      expect(a.keywords, kit.name).toContain('Weapon');
      expect(a.keywords.length, kit.name).toBeGreaterThan(1);
      expect(a.target, kit.name).toBeTruthy();
      expect(a.powerRoll, kit.name).toMatch(/Might|Agility/);
      expect(a.tiers, kit.name).toHaveLength(3);
    }
    const arrow = kitSigAbility(DS_KITS.find(x => x.id === 'arcane-archer'));
    expect(arrow.keywords).toEqual(['Magic', 'Ranged', 'Strike', 'Weapon']);
    expect(arrow.powerRoll).toBe('Agility, Reason, Intuition, or Presence');
    expect(arrow.tiers[0][1]).toBe('5 + A, R, I, or P fire damage');
    const mind = kitSigAbility(DS_KITS.find(x => x.id === 'battlemind'));
    expect(mind.target).toBe('One creature');
    expect(mind.powerRoll).toBe('Might, Reason, Intuition, or Presence');
    expect(kitSigAbility(DS_KITS.find(x => x.id === 'dual-wielder')).target).toBe('Two creatures or objects');
    expect(kitSigAbility(DS_KITS.find(x => x.id === 'corven')).keywords).toEqual(['Area', 'Melee', 'Weapon']);
  });
  it('KitDetails displays target restrictions and roll characteristics', () => {
    const { container } = render(<KitDetails kit={DS_KITS.find(x => x.id === 'battlemind')} />);
    expect(container.textContent).toContain('Melee · Psionic · Strike · Weapon');
    expect(container.textContent).toContain('One creature');
    expect(container.textContent).toContain('Power Roll + Might, Reason, Intuition, or Presence');
  });
  it.each([['boren', 'Bear', 'cold'], ['corven', 'Crow', 'fire'], ['raden', 'Rat', 'corruption'], ['vuken', 'Wolf', 'lightning']])('%s grants its forms, aspect, primordial type, and transformation', (id, animal, damage) => {
    const c = hero('fury', 'stormwight');
    c.kit.id = id;
    const benefits = summarizeBenefits(c);
    const features = benefits.features;
    expect(features.find(x => x.name === `Animal Form: ${animal}`)).toBeTruthy();
    expect(features.find(x => x.name === `Hybrid Form: ${animal}`).text).toContain('4th level');
    expect(features.find(x => x.name === 'Aspect Benefits')).toBeTruthy();
    expect(features.find(x => x.name.startsWith('Primordial Storm:')).text).toContain(damage);
    const aspect = benefits.classAbilities.find(x => x.name === 'Aspect of the Wild');
    expect(aspect.type).toBe('Maneuver');
    expect(aspect.keywords).toEqual(['Magic']);
    expect(aspect.effect).toContain('Renown as 2 higher');
    expect(aspect.spend).toContain('free maneuver');
    expect(DS_KITS.find(x => x.id === id).weapon).toBe('Unarmed');
  });
});

describe('Warden skill grants', () => {
  it('grants Nature and requires a separate exploration and intrigue pick', () => {
    const warden = DS_CAREERS.find(x => x.id === 'warden');
    const parsed = parseCareerSkills(warden);
    expect(parsed.auto).toEqual(['Nature']);
    expect(parsed.picks.map(p => ({ count: p.count, groups: p.groups }))).toEqual([
      { count: 1, groups: ['exploration'] }, { count: 1, groups: ['intrigue'] },
    ]);
    const skills = warden.quick.split(' · ');
    expect(skills).toEqual(['Nature', 'Navigate', 'Track']);
    expect([...attributeCareerSkills(parsed, skills)]).toEqual([['Navigate', 0], ['Track', 1]]);
  });
});

describe('complication currency and respite rules', () => {
  it('Betrothed caps Renown even on legacy saves with large Director adjustments', () => {
    const c = hero(); c.complication.id = 'betrothed'; c.career.id = 'aristocrat';
    expect(playCurrencies(c).renown).toBe(0);
    c.level = 4; c.play.renownAdj = 100;
    expect(playCurrencies(c).renown).toBe(3);
    c.play.renownAdj = -100;
    expect(playCurrencies(c).renown).toBe(0);
    c.complication.id = null; c.play.renownAdj = 100;
    expect(playCurrencies(c).renown).toBe(101);
  });
  it('Curse of Poverty carries unused Recoveries, stacks new losses, and resets spent increases', () => {
    let c = hero(); c.complication.id = 'curse-of-poverty'; c.career.id = 'aristocrat';
    const base = computeDerived(c).recoveries;
    c.play.wealthAdj = 3; // Wealth 5, including the career grant.
    const rest = () => { c = { ...c, play: { ...c.play, ...respiteComplicationChanges(c), recoveriesUsed: 0 } }; };
    rest();
    expect(playCurrencies(c).wealth).toBe(1);
    expect(computeDerived(c).recoveries).toBe(base + 4);
    c = JSON.parse(JSON.stringify(c)); // persisted capacity survives reloading
    rest();
    expect(computeDerived(c).recoveries).toBe(base + 4);
    c.play.wealthAdj += 2; rest();
    expect(computeDerived(c).recoveries).toBe(base + 6);
    c.play.recoveriesUsed = 1; c.play.wealthAdj += 3; rest();
    expect(computeDerived(c).recoveries).toBe(base + 3); // old increase ends, new loss applies
    c.play.recoveriesUsed = 1; rest();
    expect(computeDerived(c).recoveries).toBe(base);
  });
  it('does not erase debt or modify other complications', () => {
    const c = hero(); c.complication.id = 'curse-of-poverty'; c.play.wealthAdj = -6;
    expect(respiteComplicationChanges(c)).toMatchObject({ wealthAdj: -6, povertyRecoveries: 0 });
    c.complication.id = 'indebted'; c.play.povertyRecoveries = 4;
    expect(respiteComplicationChanges(c)).toEqual({});
    expect(computeDerived(c).recoveries).toBe(12);
  });
  it('respite UI applies the curse and restores the enlarged Recovery pool', () => {
    const c = hero(); c.complication.id = 'curse-of-poverty'; c.play.wealthAdj = 3; c.play.recoveriesUsed = 1;
    let saved = c;
    const update = (mut: any) => { saved = mut(saved); };
    const { getByText } = render(<PlayView character={c} update={update} onExit={() => {}} onEdit={() => {}} />);
    fireEvent.click(getByText('RESPITE ❧'));
    expect(getByText(/Curse of Poverty reduces Wealth/).textContent).toContain('3');
    fireEvent.click(getByText('TAKE RESPITE ❧'));
    expect(playCurrencies(saved).wealth).toBe(1);
    expect(saved.play.recoveriesUsed).toBe(0);
    expect(computeDerived(saved).recoveries).toBe(15);
  });
  it('typing Renown clamps the saved adjustment to Betrothed’s cap', () => {
    const c = hero(); c.level = 3; c.complication.id = 'betrothed'; c.career.id = 'aristocrat'; c.play.renownAdj = 100;
    let saved = c;
    const { container, getByLabelText } = render(<PlayView character={c} update={(mut: any) => { saved = mut(saved); }} onExit={() => {}} onEdit={() => {}} />);
    fireEvent.click(getByLabelText('Edit Renown'));
    const input = container.querySelector('.hb-stat input')!;
    fireEvent.change(input, { target: { value: '9' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(saved.play.renownAdj).toBe(1); // cap 2, career base 1; no hidden overflow
    expect(playCurrencies(saved).renown).toBe(2);
  });
});

describe('saved level-up rules', () => {
  it('refreshes learned ability copies and history without changing selections or play state', () => {
    const c = hero('talent', 'telekinesis'); c.level = 6;
    const canonical = levelAbility('talent', 6, 'Gravitic Well', 'telekinesis');
    const old = { ...canonical, target: 'Each creature and object in the area' };
    const custom = { name: 'Director Ability', effect: 'Homebrew rule' };
    const choice: any = levelChoicesFor(DS_CLASSES.find(x => x.id === 'talent'), 6, makeContext(c)).find((ch: any) => ch.kind === 'ability');
    c.cclass.levelAbilities = { 6: [old, custom] };
    c.levelChoices = { 6: { appliedAt: 123, picks: { [choice.id]: old } } };
    const fixed = normalizeLoaded(c);
    expect(fixed.cclass.levelAbilities[6][0].target).toBe('Each enemy and object in the area');
    expect(fixed.levelChoices[6].picks[choice.id].target).toBe('Each enemy and object in the area');
    expect(fixed.levelChoices[6].appliedAt).toBe(123);
    expect(fixed.cclass.levelAbilities[6][1]).toEqual(custom);
    expect(fixed.play).toEqual(c.play);
    expect(c.cclass.levelAbilities[6][0].target).toBe('Each creature and object in the area');
    expect(normalizeLoaded(fixed)).toBe(fixed);
  });
});
