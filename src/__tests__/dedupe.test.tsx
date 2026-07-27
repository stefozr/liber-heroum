// Duplicate-prevention regression. A hero can't hold the same skill (or perk) twice, but
// they're chosen across independent slots (culture / career / class domain / ancestry /
// level-up). These tests pin the shared collectors in app.jsx that every picker consults to
// grey out an already-held skill/perk. See src/wizard/steps/* and src/levelup.jsx pickers.
import { describe, it, expect } from 'vitest';
import { newCharacter, collectSkillPicks, collectPerkPicks, skillsTakenExcept, perksTakenExcept, collectLanguagePicks, languagesTakenExcept, normalizeLanguages } from '../app.jsx';

function charWithPicks() {
  const c: any = newCharacter('u-test', null);
  c.culture.skills = { environment: 'Climb', upbringing: 'Lift' };
  c.career.skills = ['Sneak', 'Hide'];
  c.career.perk = 'Quick Hands';
  c.cclass.domainSkill = 'Magic';
  c.ancestry.sigSkills = { 'Silver Tongue': ['Lie', 'Persuade'] };
  return c;
}

describe('skill/perk dedupe collectors', () => {
  it('collects every committed skill across all slots, tagged by source', () => {
    const names = collectSkillPicks(charWithPicks()).map(p => p.name).sort();
    expect(names).toEqual(['Climb', 'Hide', 'Lie', 'Lift', 'Magic', 'Persuade', 'Sneak'].sort());
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
