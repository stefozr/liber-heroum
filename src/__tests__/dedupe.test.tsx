// Duplicate-prevention regression. A hero can't hold the same skill (or perk) twice, but
// they're chosen across independent slots (culture / career / class domain / ancestry /
// level-up). These tests pin the shared collectors in app.jsx that every picker consults to
// grey out an already-held skill/perk. See src/wizard/steps/* and src/levelup.jsx pickers.
import { describe, it, expect } from 'vitest';
import { newCharacter, collectSkillPicks, collectPerkPicks, skillsTakenExcept, perksTakenExcept } from '../app.jsx';

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
