// The Codex-style creator re-buckets the classic wizard's issues by topic: skill and
// language lines move to its Skills & Languages step. These tests pin that the move
// loses nothing (same multiset of texts as DS_STEPS — so the commit gate and the
// roster progress mean the same thing in both layouts) and that the Skills step's
// slot descriptors agree with the issues they stand for.
import { describe, it, expect } from 'vitest';
import { DS_STEPS, DS_CLASSES, DS_ANCESTRIES, DS_COMPLICATIONS, DS_CAREERS } from '../data.jsx';
import { stepIssues } from '../wizard.jsx';
import { CREATOR_STEPS } from '../creator/steps.js';
import { creatorIssueEntries, creatorIssues, creatorStepStatus, statusLabel } from '../creator/status.js';
import { allSlots } from '../creator/skill-slots.js';
import { buildValidCharacter, hero } from './helpers/factories';

const sorted = (xs: string[]) => [...xs].sort();
const wizardTexts = (c: any) => sorted((DS_STEPS as any[]).flatMap((_: any, i: number) => stepIssues(c, i)));
const creatorTexts = (c: any) => sorted(CREATOR_STEPS.flatMap(s => creatorIssueEntries(c, s.id).map(e => e.text)));

// Valid builds across every class × subclass, every ancestry and every complication,
// plus the same builds with their skill and language picks stripped back out.
function corpus() {
  const out: [string, any][] = [['empty hero', hero()]];
  for (const cls of DS_CLASSES as any[]) {
    for (const sub of (cls.subclasses || [null]).map((s: any) => s && (s.id || s.name))) {
      out.push([`${cls.id}/${sub}`, buildValidCharacter({ cls: cls.id, subclass: sub })]);
    }
  }
  for (const a of DS_ANCESTRIES as any[]) out.push([`ancestry ${a.id}`, buildValidCharacter({ ancestry: a.id })]);
  for (const comp of DS_COMPLICATIONS as any[]) out.push([`complication ${comp.id}`, buildValidCharacter({ complication: comp.id })]);
  for (const car of DS_CAREERS as any[]) out.push([`career ${car.id}`, buildValidCharacter({ career: car.id })]);
  const stripped = out.slice(1).map(([label, c]) => {
    const s = structuredClone(c);
    s.culture.skills = {};
    s.culture.language = '';
    s.career.skills = s.career.skills.slice(0, 1);
    s.career.languages = [];
    s.cclass.skills = [];
    s.cclass.domainSkill = null;
    s.ancestry.sigSkills = {};
    s.ancestry.traitSkills = {};
    if (s.complication) { s.complication.skills = {}; s.complication.languages = []; }
    return [`${label} (picks stripped)`, s] as [string, any];
  });
  return [...out, ...stripped];
}
const CORPUS = corpus();

describe('creator issues are the wizard issues, re-bucketed', () => {
  for (const [label, c] of CORPUS) {
    it(`${label}: same issue texts over CREATOR_STEPS as over DS_STEPS`, () => {
      expect(creatorTexts(c)).toEqual(wizardTexts(c));
    });
  }

  it('skill and language lines live only on the Skills step', () => {
    const c = hero();
    c.ancestry.id = 'devil';
    for (const s of CREATOR_STEPS) {
      const topics = creatorIssueEntries(c, s.id).map(e => e.topic);
      if (s.id === 'skills') expect(topics.every(t => t === 'skill' || t === 'language')).toBe(true);
      else expect(topics.some(t => t === 'skill' || t === 'language')).toBe(false);
    }
  });

  it('prefixes Skills-step lines with their chapter', () => {
    const c = hero();
    c.culture.language = '';
    expect(creatorIssues(c, 'skills')).toContain('Culture: Language not chosen');
    expect(creatorIssues(c, 'skills')).toContain('Culture: Environment skill not picked');
  });
});

describe('skill slots agree with the Skills-step issues', () => {
  for (const [label, c] of CORPUS) {
    it(`${label}: every slot done ⇔ no skill/language issues`, () => {
      const allDone = allSlots(c).every((s: any) => s.done);
      expect(allDone).toBe(creatorIssueEntries(c, 'skills').length === 0);
    });
  }
});

describe('tab status', () => {
  it('a fresh hero reads as not started, with complication optional', () => {
    const c = hero();
    expect(creatorStepStatus(c, 'ancestry').state).toBe('not-started');
    expect(creatorStepStatus(c, 'skills').state).toBe('not-started');
    expect(creatorStepStatus(c, 'complication').state).toBe('optional');
    expect(statusLabel(creatorStepStatus(c, 'complication'))).toBe('Optional');
  });

  it('a complete build reads as done everywhere', () => {
    const c = buildValidCharacter();
    c.identity.name = 'Aelric';
    for (const s of CREATOR_STEPS.filter(s => s.id !== 'complication')) {
      expect(creatorStepStatus(c, s.id).state, s.id).toBe('done');
    }
  });

  it('counts what is left on a started step', () => {
    const c = buildValidCharacter();
    c.cclass.signatures = [];
    const st = creatorStepStatus(c, 'class');
    expect(st.state).toBe('in-progress');
    expect(statusLabel(st)).toBe(`${st.left} left`);
    expect(st.left).toBeGreaterThan(0);
  });
});
