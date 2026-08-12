// Duplicate-prevention regression. A hero can't hold the same skill (or perk) twice, but
// they're chosen across independent slots (culture / career / class domain / ancestry /
// level-up). These tests pin the shared collectors in app.jsx that every picker consults to
// grey out an already-held skill/perk. See src/wizard/steps/* and src/levelup.jsx pickers.
import { describe, it, expect } from 'vitest';
import { newCharacter, collectSkillPicks, collectPerkPicks, skillsTakenExcept, perksTakenExcept, collectLanguagePicks, languagesTakenExcept, normalizeLanguages, summarizeBenefits, duplicateSkillPicks, normalizeSkills } from '../app.jsx';
import { complicationGrantCollisions, effectiveComplicationSkills } from '../wizard/helpers.js';

function charWithPicks() {
  const c: any = newCharacter('u-test', null);
  c.culture.skills = { environment: 'Climb', upbringing: 'Lift' };
  c.career.skills = ['Sneak', 'Hide'];
  c.career.perk = 'Quick Hands';
  c.cclass.domainSkill = 'Magic';
  c.ancestry.sigSkills = { 'Silver Tongue': ['Lie', 'Persuade'] };
  c.ancestry.traitSkills = { 'Passionate Artisan': ['Alchemy'] };
  return c;
}

describe('skill/perk dedupe collectors', () => {
  it('collects every committed skill across all slots, tagged by source', () => {
    const names = collectSkillPicks(charWithPicks()).map(p => p.name).sort();
    expect(names).toEqual(['Alchemy', 'Climb', 'Hide', 'Lie', 'Lift', 'Magic', 'Persuade', 'Sneak'].sort());
  });

  it('trait skill picks exclude their own slot but block every other slot', () => {
    const c = charWithPicks();
    expect(skillsTakenExcept(c, 'trait:Passionate Artisan').has('Alchemy')).toBe(false);
    expect(skillsTakenExcept(c, 'trait:Passionate Artisan').has('Lie')).toBe(true);
    expect(skillsTakenExcept(c, 'career').has('Alchemy')).toBe(true);
  });

  it('collects perks (career perk here; level-up perks added elsewhere)', () => {
    expect(collectPerkPicks(charWithPicks()).map(p => p.name)).toContain('Quick Hands');
  });

  it('reports a skill held in one slot as taken for every OTHER slot', () => {
    const c = charWithPicks();
    // Career holds "Sneak" → it must read as taken when a different slot asks.
    expect(skillsTakenExcept(c, 'culture:environment').has('Sneak')).toBe(true);
    expect(skillsTakenExcept(c, 'domain').has('Sneak')).toBe(true);
    expect(skillsTakenExcept(c, 'sig:Silver Tongue').has('Sneak')).toBe(true);
  });

  it('excludes the slot identified by ownKey so it stays togglable in place', () => {
    const c = charWithPicks();
    // Career asking about its own key should NOT see its own picks as "taken elsewhere".
    const careerView = skillsTakenExcept(c, 'career');
    expect(careerView.has('Sneak')).toBe(false);
    expect(careerView.has('Hide')).toBe(false);
    // …but it still sees skills from culture / domain / ancestry.
    expect(careerView.has('Climb')).toBe(true);
    expect(careerView.has('Magic')).toBe(true);
    expect(careerView.has('Lie')).toBe(true);
  });

  it('one culture aspect blocks the others but not itself', () => {
    const c = charWithPicks();
    const envView = skillsTakenExcept(c, 'culture:environment');
    expect(envView.has('Climb')).toBe(false); // environment's own pick
    expect(envView.has('Lift')).toBe(true);   // upbringing's pick
  });

  it('maps a taken skill to a human-readable source', () => {
    expect(skillsTakenExcept(charWithPicks(), 'career').get('Climb')).toBe('Culture');
  });

  it('career perk reads as taken for other (non-career) perk slots', () => {
    expect(perksTakenExcept(charWithPicks(), 'lvl:5:perk').has('Quick Hands')).toBe(true);
    expect(perksTakenExcept(charWithPicks(), 'career').has('Quick Hands')).toBe(false);
  });
});

// Languages are chosen in two slots (culture single pick, career multi pick) plus the
// standard Caelian everyone knows. These collectors mirror the skill ones so each picker
// can block the other's picks instead of silently duplicating (the duplicate used to be
// deduped away at Foundry export, losing a language).
describe('language dedupe collectors', () => {
  function charWithLangs() {
    const c: any = newCharacter('u-test', null);
    c.culture.language = 'Hyrallic';
    c.career.languages = ['Zaliac', 'Khelt'];
    return c;
  }

  it('collects standard, culture, and career languages tagged by source', () => {
    const picks = collectLanguagePicks(charWithLangs());
    expect(picks.map(p => p.name).sort()).toEqual(['Caelian', 'Hyrallic', 'Khelt', 'Zaliac']);
    expect(picks.find(p => p.name === 'Zaliac')!.source).toBe('Career');
    expect(picks.find(p => p.name === 'Hyrallic')!.source).toBe('Culture');
  });

  it('career view blocks culture + standard picks but not its own', () => {
    const view = languagesTakenExcept(charWithLangs(), 'career');
    expect(view.has('Zaliac')).toBe(false);
    expect(view.has('Khelt')).toBe(false);
    expect(view.get('Hyrallic')).toBe('Culture');
    expect(view.get('Caelian')).toBe('Standard');
  });

  it('culture view blocks career picks but keeps Caelian selectable (its own default)', () => {
    const view = languagesTakenExcept(charWithLangs(), ['culture', 'standard']);
    expect(view.get('Zaliac')).toBe('Career');
    expect(view.has('Hyrallic')).toBe(false);
    expect(view.has('Caelian')).toBe(false);
  });

  it('normalizeLanguages prunes career entries duplicated by culture/Caelian', () => {
    const c = charWithLangs();
    c.career.languages = ['Hyrallic', 'Zaliac', 'Caelian'];
    expect(normalizeLanguages(c).career.languages).toEqual(['Zaliac']);
    // No duplicates → the object passes through untouched (identity preserved).
    const clean = charWithLangs();
    expect(normalizeLanguages(clean)).toBe(clean);
  });
});

describe('complication grant dedupe', () => {
  function charWithComplication(id: string, skills: any = {}, languages: string[] = []) {
    const c: any = newCharacter('u-test', null);
    c.complication = { id, custom: '', skills, languages };
    return c;
  }

  it('fixed and chosen complication skills appear in collectSkillPicks, tagged by slot', () => {
    const c = charWithComplication('silent-sentinel', { 0: ['History'] });
    const picks = collectSkillPicks(c);
    expect(picks.find(p => p.name === 'Eavesdrop')!.key).toBe('comp:fixed');
    expect(picks.find(p => p.name === 'Sneak')!.key).toBe('comp:fixed');
    expect(picks.find(p => p.name === 'History')!.key).toBe('comp:0');
    expect(picks.find(p => p.name === 'History')!.source).toBe('Silent Sentinel');
  });

  it('a complication pick blocks other slots but stays togglable in its own slot', () => {
    const c = charWithComplication('grifter', { 0: ['Disguise'] });
    expect(skillsTakenExcept(c, 'career').get('Disguise')).toBe('Grifter');
    expect(skillsTakenExcept(c, 'comp:0').has('Disguise')).toBe(false);
  });

  it('skills held elsewhere read as taken from the complication picker\'s viewpoint', () => {
    const c = charWithComplication('grifter', {});
    c.career.skills = ['Sneak'];
    expect(skillsTakenExcept(c, 'comp:0').get('Sneak')).toBe('Career');
  });

  it('complication languages join collectLanguagePicks and block the career picker', () => {
    const c = charWithComplication('exile', {}, ['Zaliac']);
    expect(collectLanguagePicks(c).find(p => p.name === 'Zaliac')!.source).toBe('Complication');
    expect(languagesTakenExcept(c, 'career').get('Zaliac')).toBe('Complication');
    expect(languagesTakenExcept(c, 'complication').has('Zaliac')).toBe(false);
  });

  it('normalizeLanguages prunes complication languages duplicated by earlier slots', () => {
    const c = charWithComplication('exile', {}, ['Hyrallic']);
    c.culture.language = 'Hyrallic';
    expect(normalizeLanguages(c).complication.languages).toEqual([]);
    const clean = charWithComplication('exile', {}, ['Zaliac']);
    expect(normalizeLanguages(clean)).toBe(clean);
  });

  it('fixed grants colliding with earlier slots are detected, tagged by source', () => {
    const c = charWithComplication('silent-sentinel');
    c.career.skills = ['Sneak'];
    expect(complicationGrantCollisions(c)).toEqual([{ skill: 'Sneak', source: 'Career' }]);
    // Ancestry trait skill picks count as held too (heldBeforeCareer fix).
    const orc = charWithComplication('raised-by-beasts');
    orc.ancestry.traitSkills = { 'Passionate Artisan': ['Handle Animals'] };
    expect(complicationGrantCollisions(orc)).toEqual([{ skill: 'Handle Animals', source: 'Ancestry' }]);
  });

  it('a valid swap reads through to collectSkillPicks; the raw duplicate disappears', () => {
    const c = charWithComplication('silent-sentinel');
    c.career.skills = ['Sneak'];
    // Without a swap the duplicate is collected twice (the bug being fixed at read time).
    expect(collectSkillPicks(c).filter(p => p.name === 'Sneak')).toHaveLength(2);
    c.complication.skillSwaps = { Sneak: 'Hide' };
    const names = collectSkillPicks(c).map(p => p.name);
    expect(names.filter(n => n === 'Sneak')).toHaveLength(1);
    expect(collectSkillPicks(c).find(p => p.name === 'Hide')!.key).toBe('comp:fixed');
    expect(effectiveComplicationSkills(c)).toEqual(['Eavesdrop', 'Hide']);
  });

  it('a stale swap is ignored once the collision goes away', () => {
    const c = charWithComplication('silent-sentinel');
    c.complication.skillSwaps = { Sneak: 'Hide' };
    expect(effectiveComplicationSkills(c)).toEqual(['Eavesdrop', 'Sneak']);
  });

  it('summarizeBenefits shows the swap as "Sneak → replacement"', () => {
    const c = charWithComplication('silent-sentinel');
    c.career.skills = ['Sneak'];
    c.complication.skillSwaps = { Sneak: 'Hide' };
    const row = summarizeBenefits(c).skills.find((s: any) => s.source === 'Silent Sentinel');
    expect(row.text).toContain('Sneak → Hide');
  });
});

// A pick that duplicates a granted skill (or an earlier slot's pick) is invalid — the
// rules say "choose another instead". The live pickers block the chip, but drafts saved
// through the soft commit gate, free rail navigation (pick class skills, then choose a
// career that auto-grants one of them), and legacy saves can still carry one.
// duplicateSkillPicks is the order-free detector; normalizeSkills is the load-time
// repair (the skills mirror of normalizeLanguages): the grant keeps the name, the pick
// is shed, and the wizard's existing "N of M picked" prompt re-opens the slot.
describe('duplicate skill picks: detection + normalizeSkills repair', () => {
  // The reported bug: Shadow grants Sneak; the Criminal career picked it too.
  function criminalShadow() {
    const c: any = newCharacter('u-test', null);
    c.career.id = 'criminal';
    c.career.skills = ['Criminal Underworld', 'Sneak', 'Pick Lock'];
    c.career.skillPicks = { Sneak: 0, 'Pick Lock': 0 };
    c.cclass.id = 'shadow';
    c.cclass.subclass = 'black-ash';
    return c;
  }

  it('flags the career pick colliding with the class grant in repair scope only', () => {
    const c = criminalShadow();
    // Wizard scope: the LATER slot's grant owns this collision (the class step's swap
    // prompt) — flagging the pick too would demand two replacements for one duplicate.
    expect(duplicateSkillPicks(c)).toEqual([]);
    // Repair scope: no swap stored means the duplicate is real; the pick is prunable.
    const dups = duplicateSkillPicks(c, { includeLaterGrants: true });
    expect(dups).toHaveLength(1);
    expect(dups[0]).toMatchObject({ name: 'Sneak', key: 'career', holder: 'Shadow' });
  });

  it('normalizeSkills sheds the career pick and keeps the grant (Criminal + Shadow)', () => {
    const fixed = normalizeSkills(criminalShadow());
    expect(fixed.career.skills).toEqual(['Criminal Underworld', 'Pick Lock']);
    expect(fixed.career.skillPicks).toEqual({ 'Pick Lock': 0 });
    const names = collectSkillPicks(fixed).map((p: any) => p.name);
    expect(names.filter((n: string) => n === 'Sneak')).toHaveLength(1);
  });

  it('a resolved swap is no duplicate — the character passes through untouched', () => {
    const c = criminalShadow();
    c.cclass.skillSwaps = { Sneak: 'Alertness' }; // the class grant reads Alertness
    expect(normalizeSkills(c)).toBe(c);
  });

  it('ordering hole: a class pick made before a career whose auto grant matches', () => {
    const c: any = newCharacter('u-test', null);
    c.cclass.id = 'shadow';
    c.cclass.skills = ['Track'];
    c.cclass.skillPicks = { Track: 0 };
    c.career.id = 'warden'; // auto-grants Track
    c.career.skills = ['Track', 'Endurance'];
    c.career.skillPicks = { Endurance: 0 };
    // The grant sits EARLIER in the slot order, so this one flags in wizard scope too.
    const dups = duplicateSkillPicks(c);
    expect(dups).toHaveLength(1);
    expect(dups[0]).toMatchObject({ name: 'Track', key: 'class', holder: 'Career' });
    const fixed = normalizeSkills(c);
    expect(fixed.cclass.skills).toEqual([]);          // the pick is shed…
    expect(fixed.career.skills).toContain('Track');   // …the auto grant keeps the name
  });

  it('pick vs pick: the later slot is pruned (culture keeps, career sheds)', () => {
    const c: any = newCharacter('u-test', null);
    c.culture.skills = { environment: 'Sneak' };
    c.career.id = 'criminal';
    c.career.skills = ['Criminal Underworld', 'Sneak'];
    c.career.skillPicks = { Sneak: 0 };
    const fixed = normalizeSkills(c);
    expect(fixed.culture.skills.environment).toBe('Sneak');
    expect(fixed.career.skills).toEqual(['Criminal Underworld']);
  });

  it('a level-up pick duplicating a career grant is dropped', () => {
    const c: any = newCharacter('u-test', null);
    c.cclass.id = 'fury';     // fury's level 4 offers an any-skill choice
    c.career.id = 'agent';    // auto-grants Sneak
    c.career.skills = ['Sneak'];
    c.levelChoices = { 4: { picks: { 'skill-4': { chosen: 'Sneak' } } } };
    const fixed = normalizeSkills(c);
    expect(fixed.levelChoices['4'].picks['skill-4']).toBeUndefined();
    expect(fixed.career.skills).toEqual(['Sneak']);
  });

  it('is identity-preserving on clean characters and idempotent on dirty ones', () => {
    const clean: any = newCharacter('u-test', null);
    clean.career.id = 'criminal';
    clean.career.skills = ['Criminal Underworld', 'Lie'];
    expect(normalizeSkills(clean)).toBe(clean);
    const once = normalizeSkills(criminalShadow());
    expect(normalizeSkills(once)).toBe(once);
  });

  it('grant-vs-grant duplicates are not prunable — the swap prompt owns those', () => {
    // Agent's auto Sneak vs Shadow's granted Sneak with no swap stored: both sides
    // are grants, so the repair leaves the character alone; the wizard's commit gate
    // keeps the hero a draft until the class step's swap is chosen.
    const c: any = newCharacter('u-test', null);
    c.career.id = 'agent';
    c.career.skills = ['Sneak'];
    c.cclass.id = 'shadow';
    expect(duplicateSkillPicks(c, { includeLaterGrants: true })).toEqual([]);
    expect(normalizeSkills(c)).toBe(c);
  });
});

describe('complication grants in summarizeBenefits', () => {
  it('medusa-blood surfaces Stone Eyes through classAbilities', () => {
    const c: any = newCharacter('u-test', null);
    c.complication = { id: 'medusa-blood', custom: '', skills: {}, languages: [] };
    const names = summarizeBenefits(c).classAbilities.map((a: any) => a.name);
    expect(names).toContain('Stone Eyes');
  });

  it('grants render as skills/languages rows with pick placeholders', () => {
    const c: any = newCharacter('u-test', null);
    c.complication = { id: 'ivory-tower', custom: '', skills: { 0: ['History'] }, languages: [] };
    const b = summarizeBenefits(c);
    const row = b.skills.find((s: any) => s.source === 'Ivory Tower');
    expect(row.text).toBe('History \u00b7 +2 of your choice');
    const lang = b.languages.find((l: any) => l.source === 'Ivory Tower');
    expect(lang.text).toBe('+1 of your choice');
  });

  it('earth elementalist + grounded yields exactly one Motivate Earth, at Ranged 5', () => {
    const c: any = newCharacter('u-test', null);
    c.cclass.id = 'elementalist';
    c.cclass.subclass = 'earth';
    c.complication = { id: 'grounded', custom: '', skills: {}, languages: [] };
    const all = summarizeBenefits(c).classAbilities.filter((a: any) => a.name === 'Motivate Earth');
    expect(all).toHaveLength(1);
    expect(all[0].distance).toBe('Ranged 5');
    expect(all[0].keywords).not.toContain('Melee');
  });

  it('grounded alone grants the unmodified Melee 1 Motivate Earth', () => {
    const c: any = newCharacter('u-test', null);
    c.complication = { id: 'grounded', custom: '', skills: {}, languages: [] };
    const all = summarizeBenefits(c).classAbilities.filter((a: any) => a.name === 'Motivate Earth');
    expect(all).toHaveLength(1);
    expect(all[0].distance).toBe('Melee 1');
  });
});

describe('class feature picks in summarizeBenefits', () => {
  it('conduit picks surface as their own entries with full rules text', () => {
    const c: any = newCharacter('u-test', null);
    c.cclass.id = 'conduit';
    c.cclass.triggeredAction = 'Word of Guidance';
    c.cclass.prayer = 'Steel';
    c.cclass.ward = 'Bastion';
    const features = summarizeBenefits(c).features;
    for (const name of ['Triggered Action: Word of Guidance', 'Prayer: Steel', 'Ward: Bastion']) {
      const f = features.find((x: any) => x.name === name);
      expect(f, name).toBeDefined();
      expect(f.text.length, name).toBeGreaterThan(0);
      expect(f.text, name).not.toMatch(/^Choose one/);
    }
  });

  it('unchosen features fall back to the prompt text', () => {
    const c: any = newCharacter('u-test', null);
    c.cclass.id = 'conduit';
    const features = summarizeBenefits(c).features;
    expect(features.find((x: any) => x.name === 'Triggered Action')?.text).toMatch(/^Choose one/);
    expect(features.find((x: any) => x.name === 'Prayer / Ward')?.text).toMatch(/^Choose one/);
  });

  it('null augmentation (stored in the shared enchantment field) is labeled Augmentation', () => {
    const c: any = newCharacter('u-test', null);
    c.cclass.id = 'null';
    c.cclass.enchantment = 'Density Augmentation';
    const features = summarizeBenefits(c).features;
    const f = features.find((x: any) => x.name === 'Augmentation: Density Augmentation');
    expect(f).toBeDefined();
    expect(f.text.length).toBeGreaterThan(0);
  });
});
