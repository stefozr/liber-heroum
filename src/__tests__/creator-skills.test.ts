// The creator's Skills & Languages slot model: each slot's toggle writes the same
// state the classic wizard's chip grids do, and its blocked reasons mirror their
// dedupe rules (grants, other slots, capacity, duplicate-grant swaps).
import { describe, it, expect } from 'vitest';
import { DS_SKILL_GROUPS } from '../data.jsx';
import { stepIssues } from '../wizard.jsx';
import { skillSlots, languageSlots, slotsForStep, stepGrantCounts } from '../creator/skill-slots.js';
import { creatorIssueEntries } from '../creator/status.js';
import { buildValidCharacter, hero } from './helpers/factories';

const slot = (c: any, id: string) => [...skillSlots(c), ...languageSlots(c)].find((s: any) => s.id === id) as any;

describe('ancestry signature skill', () => {
  it('devil: Silver Tongue is a one-pick interpersonal slot that toggles sigSkills', () => {
    const c = hero();
    c.ancestry.id = 'devil';
    const s = slot(c, 'sig:Silver Tongue');
    expect(s.step).toBe('ancestry');
    expect(s.groups[0].pool).toEqual(expect.arrayContaining((DS_SKILL_GROUPS as any).interpersonal));
    expect(s.done).toBe(false);
    const after = s.toggle(c, 'Lie', 0);
    expect(after.ancestry.sigSkills['Silver Tongue']).toEqual(['Lie']);
    const s2 = slot(after, 'sig:Silver Tongue');
    expect(s2.done).toBe(true);
    expect(s2.blockedReason('Lie', 0)).toBeNull();          // a pick stays removable
    expect(s2.blockedReason('Flirt', 0)).toBe('Already picked 1');
    expect(s2.toggle(after, 'Lie', 0).ancestry.sigSkills['Silver Tongue']).toEqual([]);
  });

  it('blocks a skill held by another slot, naming the holder', () => {
    const c = hero();
    c.ancestry.id = 'devil';
    c.culture.environment = 'urban';
    c.culture.skills = { environment: 'Lie' };
    expect(slot(c, 'sig:Silver Tongue').blockedReason('Lie', 0)).toBe('Already chosen — Culture');
  });
});

describe('culture aspects', () => {
  it('an unchosen aspect is a pending slot; choosing it unlocks a one-pick slot', () => {
    const c = hero();
    expect(slot(c, 'culture:environment').pending).toBeTruthy();
    c.culture.environment = 'urban';
    const s = slot(c, 'culture:environment');
    expect(s.pending).toBeFalsy();
    expect(s.groups[0].count).toBe(1);
    const pick = s.groups[0].pool[0];
    expect(s.toggle(c, pick, 0).culture.skills.environment).toBe(pick);
  });
});

describe('career and class', () => {
  it('career quick build fills the career skills like the wizard button', () => {
    const c = buildValidCharacter({ career: 'agent' });
    c.career.skills = c.career.skills.slice(0, 1);
    const s = slot(c, 'career');
    expect(s.done).toBe(false);
    expect(s.granted).toContain('Sneak');
    const after = s.quickBuild(c);
    expect(after.career.skills.length).toBeGreaterThan(1);
  });

  it('career pick toggles attribute to the clicked group', () => {
    const c = buildValidCharacter({ career: 'agent' });
    const s = slot(c, 'career');
    const g = s.groups[0];
    const picked = g.picked[0];
    const off = s.toggle(c, picked, g.idx);
    expect(off.career.skills).not.toContain(picked);
    const on = slot(off, 'career').toggle(off, picked, g.idx);
    expect(on.career.skills).toContain(picked);
    expect(on.career.skillPicks[picked]).toBe(g.idx);
  });

  it('a duplicated class grant becomes a swap slot that stores the replacement', () => {
    const c = buildValidCharacter({ cls: 'shadow', subclass: 'caustic-alchemy', career: 'agent' });
    c.cclass.skillSwaps = {};
    const s = slot(c, 'swap:class:Sneak');
    expect(s.kind).toBe('swap');
    expect(s.done).toBe(false);
    expect(s.collision).toEqual({ skill: 'Sneak', source: 'Career' });
    const free = s.pool.find((n: string) => !s.blockedReason(n));
    const after = s.toggle(c, free);
    expect(after.cclass.skillSwaps.Sneak).toBe(free);
    expect(slot(after, 'swap:class:Sneak').done).toBe(true);
    // Clicking the chosen replacement clears it again.
    expect(slot(after, 'swap:class:Sneak').toggle(after, free).cclass.skillSwaps.Sneak).toBeUndefined();
  });

  it('conduit: the domain skill is pending until a domain feature is chosen', () => {
    const c = buildValidCharacter({ cls: 'conduit' });
    const withFeature = slot(c, 'domain');
    c.cclass.domainFeature = null;
    c.cclass.domainSkill = null;
    expect(slot(c, 'domain').pending).toBeTruthy();
    expect(slot(c, 'domain').done).toBe(true);
    expect(withFeature).toBeTruthy();
  });
});

describe('languages', () => {
  it('Caelian is a grant; the culture pick swaps rather than refusing', () => {
    const c = hero();
    expect(slot(c, 'lang:standard').granted).toEqual(['Caelian']);
    const s = slot(c, 'lang:culture');
    const other = s.groups[0].pool.find((L: string) => L !== 'Caelian');
    expect(s.blockedReason(other)).toBeNull();
    expect(s.toggle(c, other).culture.language).toBe(other);
  });

  it('a career language already known elsewhere is blocked', () => {
    const c = buildValidCharacter();
    c.career.id = 'aristocrat';
    c.career.languages = [];
    const s = slot(c, 'lang:career');
    expect(s).toBeTruthy();
    expect(s.blockedReason(c.culture.language)).toMatch(/^Already known/);
    expect(s.blockedReason('Caelian')).toMatch(/^Already known/);
  });
});

describe('info lines and step filtering', () => {
  it('every slot lives on a creator source step', () => {
    const c = buildValidCharacter({ ancestry: 'devil', cls: 'conduit', complication: 'shipwrecked' });
    for (const s of [...skillSlots(c), ...languageSlots(c)] as any[]) {
      expect(['ancestry', 'culture', 'career', 'class', 'complication']).toContain(s.step);
    }
    expect(slotsForStep(c, 'ancestry').length).toBeGreaterThan(0);
  });

  it('counts what each step grants for its info box', () => {
    // Culture: one skill per aspect (owed even before the aspect is chosen), plus
    // Caelian and the native language.
    expect(stepGrantCounts(hero(), 'culture')).toEqual({ skills: 3, languages: 2, forget: 0 });
    // Agent: Sneak + one interpersonal + one intrigue, and two languages.
    const agent = buildValidCharacter({ career: 'agent' });
    expect(stepGrantCounts(agent, 'career')).toEqual({ skills: 3, languages: 2, forget: 0 });
    // Shipwrecked: two exploration skills, and you forget a language.
    const ship = buildValidCharacter({ complication: 'shipwrecked' });
    expect(stepGrantCounts(ship, 'complication')).toEqual({ skills: 2, languages: 0, forget: 1 });
    // Devil: Silver Tongue's one interpersonal skill.
    const devil = hero();
    devil.ancestry.id = 'devil';
    expect(stepGrantCounts(devil, 'ancestry').skills).toBe(1);
  });

  it('the Skills step owes exactly the wizard’s skill/language lines', () => {
    const c = buildValidCharacter({ ancestry: 'devil' });
    c.ancestry.sigSkills = {};
    expect(creatorIssueEntries(c, 'skills').map(e => e.text)).toContain('Silver Tongue: skill not picked');
    expect(stepIssues(c, 0)).toContain('Silver Tongue: skill not picked');
  });
});
