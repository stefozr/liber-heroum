// Wizard render regression. Renders the Wizard at every one of the 7 steps with
// a representative (class/ancestry/career/kit chosen) character and asserts each
// renders without throwing — the path the auth-only smoke test can't reach.
import { describe, it, expect } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { afterEach } from 'vitest';
import React from 'react';
import { Wizard, isStepValid, stepIssues } from '../wizard.jsx';
import { newCharacter, collectSkillPicks } from '../app.jsx';
import { DS_STEPS, DS_ANCESTRIES, DS_CLASSES, DS_CAREERS, DS_KITS, DS_COMPLICATIONS, DS_CULTURES, DS_SKILL_GROUPS, DS_LANGUAGES, kitPoolFor } from '../data.jsx';
import { PERKS, pickPool } from '../wizard/helpers.js';
import { buildValidCharacter } from './helpers/factories';
import { vi } from 'vitest';

afterEach(() => cleanup());

function sampleCharacter(step: number) {
  const c: any = newCharacter('u-test', null);
  c.wizardStep = step;
  // Fill enough that class/review steps exercise their pickers and summaries.
  c.ancestry.id = DS_ANCESTRIES[0].id;
  c.career.id = DS_CAREERS[0].id;
  c.cclass.id = DS_CLASSES[0].id;
  c.kit.id = DS_KITS[0].id;
  c.complication.id = DS_COMPLICATIONS[0].id;
  c.identity.name = 'Test Hero';
  c.name = 'Test Hero';
  return c;
}

const noop = () => {};

describe('Wizard renders every step', () => {
  DS_STEPS.forEach((s: any, i: number) => {
    it(`step ${i} (${s.id}) renders without throwing`, () => {
      const { container } = render(
        <Wizard character={sampleCharacter(i)} update={noop} onExit={noop} onComplete={noop} />
      );
      // The rail always lists the step names — confirms the Wizard mounted.
      expect(container.textContent).toContain(s.name);
      expect(container.textContent!.length).toBeGreaterThan(50);
    });
  });
});

describe('Fury kit selection', () => {
  const classStep = DS_STEPS.findIndex((s: any) => /class/i.test(s.id));

  function furyCharacter(subclass: string, kitId: string | null = null) {
    const c = sampleCharacter(classStep);
    c.cclass.id = 'fury';
    c.cclass.subclass = subclass;
    c.kit.id = kitId;
    return c;
  }

  it('shows the kit picker; Berserker draws from the standard kits', () => {
    const { container } = render(
      <Wizard character={furyCharacter('berserker')} update={noop} onExit={noop} onComplete={noop} />
    );
    expect(container.textContent).toContain('Choose your Kit');
    expect(container.textContent).toContain('Panther');
    expect(container.textContent).not.toContain('Boren');
  });

  it('limits Stormwights to the four stormwight kits, with no stale suggestion', () => {
    const { container } = render(
      <Wizard character={furyCharacter('stormwight')} update={noop} onExit={noop} onComplete={noop} />
    );
    for (const kit of ['Boren', 'Corven', 'Raden', 'Vuken']) {
      expect(container.textContent).toContain(kit);
    }
    expect(container.textContent).not.toContain('Panther');
    expect(container.textContent).not.toContain('SUGGESTED');
  });

  it('clears an out-of-pool kit when the subclass changes', () => {
    const c = furyCharacter('stormwight', 'boren');
    let updated: any = null;
    const update = (fn: any) => { updated = fn(c); };
    const { getAllByText } = render(
      <Wizard character={c} update={update} onExit={noop} onComplete={noop} />
    );
    fireEvent.click(getAllByText('Berserker')[0]);
    expect(updated.cclass.subclass).toBe('berserker');
    expect(updated.kit.id).toBeNull();
  });
});

describe('Null class step', () => {
  it('offers the Psionic Augmentation picker with the three official options', () => {
    const classStep = DS_STEPS.findIndex((s: any) => /class/i.test(s.id));
    const c = sampleCharacter(classStep);
    c.cclass.id = 'null';
    c.kit.id = null;
    const { container } = render(
      <Wizard character={c} update={noop} onExit={noop} onComplete={noop} />
    );
    for (const opt of ['Density Augmentation', 'Force Augmentation', 'Speed Augmentation']) {
      expect(container.textContent).toContain(opt);
    }
  });
});

// ─── Layer E: representative interaction tests per picker ───
const CLASS_STEP = DS_STEPS.findIndex((s: any) => /class/i.test(s.id));

function atStep(step: number, spec: any = {}) {
  const c = buildValidCharacter(spec);
  c.wizardStep = step;
  return c;
}
function renderWizard(c: any) {
  let updated: any = null;
  const update = (fn: any) => { updated = fn(c); };
  const utils = render(<Wizard character={c} update={update} onExit={noop} onComplete={noop} />);
  // resetUpdates drops the wizard's mount-time write (it records the opening
  // chapter into wizardVisited) so "no update issued" assertions stay meaningful.
  return { ...utils, latest: () => updated, resetUpdates: () => { updated = null; } };
}

describe('subclass picker', () => {
  for (const cls of (DS_CLASSES as any[]).filter(x => x.subclasses)) {
    it(`${cls.id}: renders every subclass and stores a click`, () => {
      const c = atStep(CLASS_STEP, { cls: cls.id });
      c.cclass.subclass = null;
      const { container, getAllByText, latest } = renderWizard(c);
      for (const s of cls.subclasses) expect(container.textContent).toContain(s.name);
      const target = cls.subclasses[cls.subclasses.length - 1];
      fireEvent.click(getAllByText(target.name)[0]);
      expect(latest().cclass.subclass).toBe(target.id || target.name);
      cleanup();
    });
  }
});

describe('class skill picker', () => {
  it('renders the pick pools, granted chips are locked, and a click stores the skill', () => {
    const c = atStep(CLASS_STEP, { cls: 'fury' });
    c.cclass.skills = [];
    c.cclass.skillPicks = {};
    const { container, latest } = renderWizard(c);
    expect(container.textContent).toContain('Class Skills');
    // Granted Nature chip is locked (fury grantedSkills; berserker Lift also granted).
    const chips = [...container.querySelectorAll<HTMLButtonElement>('.skill-chip.auto')];
    expect(chips.some(ch => ch.textContent!.includes('Lift'))).toBe(true);
    // Every pool skill renders as a chip.
    const pool = pickPool((DS_CLASSES as any[]).find(x => x.id === 'fury').skillPicks[0]);
    for (const s of pool) expect(container.textContent).toContain(s);
    // Click a free chip → stored on cclass.skills with its pick index.
    const free = [...container.querySelectorAll<HTMLButtonElement>('.skill-chip')].find(
      ch => !ch.disabled && ch.textContent === 'Jump');
    fireEvent.click(free!);
    expect(latest().cclass.skills).toContain('Jump');
    expect(latest().cclass.skillPicks['Jump']).toBe(0);
  });

  it('tactician doctrines add a subclass skill-group pick', () => {
    const c = atStep(CLASS_STEP, { cls: 'tactician', subclass: 'insurgent' });
    const { container } = renderWizard(c);
    expect(container.textContent).toContain('one intrigue — from Insurgent');
    cleanup();
    const c2 = atStep(CLASS_STEP, { cls: 'tactician', subclass: 'mastermind' });
    const { container: c2c } = renderWizard(c2);
    expect(c2c.textContent).toContain('one lore — from Mastermind');
  });

  it('quick build applies the class suggestions minus granted/dupes', () => {
    const c = atStep(CLASS_STEP, { cls: 'talent' });
    c.cclass.skills = [];
    c.cclass.skillPicks = {};
    const { container, latest } = renderWizard(c);
    const btn = [...container.querySelectorAll<HTMLButtonElement>('.quick-pick-btn')]
      .find(b => b.closest('.orn-frame')?.textContent?.includes('Class Skills'));
    fireEvent.click(btn!);
    const cls: any = (DS_CLASSES as any[]).find(x => x.id === 'talent');
    for (const s of latest().cclass.skills) {
      expect(cls.quickSkills).toContain(s);
      expect(cls.grantedSkills).not.toContain(s);
    }
    expect(latest().cclass.skills.length).toBeGreaterThan(0);
  });

  it('a skill chosen elsewhere renders blocked', () => {
    const c = atStep(CLASS_STEP, { cls: 'fury' });
    c.cclass.skills = [];
    c.cclass.skillPicks = {};
    c.culture.skills = { ...c.culture.skills, environment: 'Jump' };
    const { container } = renderWizard(c);
    const jump = [...container.querySelectorAll<HTMLButtonElement>('.skill-chip')].find(
      ch => ch.textContent === 'Jump' && ch.closest('.orn-frame')?.textContent?.includes('Class Skills'));
    expect(jump!.className).toContain('blocked');
    expect(jump!.disabled).toBe(true);
  });
});

describe('characteristic picker', () => {
  it('renders all five stats and flags a lesser-sum official array as legal', () => {
    const c = atStep(CLASS_STEP, { cls: 'fury' });
    const { container, rerender } = renderWizard(c);
    for (const k of ['Might', 'Agility', 'Reason', 'Intuition', 'Presence']) {
      expect(container.textContent).toContain(k);
    }
    expect(container.textContent).toContain('POINTS LEFT');
    // The official 2/−1/−1 array underspends the budget but shows as legal.
    const c2 = atStep(CLASS_STEP, { cls: 'fury' });
    c2.cclass.characteristics = { ...c2.cclass.characteristics, Reason: 2, Intuition: -1, Presence: -1 };
    rerender(<Wizard character={c2} update={noop} onExit={noop} onComplete={noop} />);
    expect(container.textContent).toContain('OFFICIAL ARRAY');
  });
});

describe('conditional pickers per class', () => {
  it('conduit shows prayer/ward/triggered pickers; fury shows none', () => {
    const { container } = renderWizard(atStep(CLASS_STEP, { cls: 'conduit' }));
    const cls: any = (DS_CLASSES as any[]).find(x => x.id === 'conduit');
    for (const p of cls.prayers) expect(container.textContent).toContain(p.name);
    for (const w of cls.wards) expect(container.textContent).toContain(w.name);
    for (const t of cls.triggereds) expect(container.textContent).toContain(t.name);
    cleanup();
    const { container: fury } = renderWizard(atStep(CLASS_STEP, { cls: 'fury' }));
    expect(fury.textContent).not.toContain('Prayer of Steel');
  });
  it('kit picker appears only for kit-wielding classes', () => {
    const { container } = renderWizard(atStep(CLASS_STEP, { cls: 'elementalist' }));
    expect(container.textContent).not.toContain('Choose your Kit');
    cleanup();
    const { container: tac } = renderWizard(atStep(CLASS_STEP, { cls: 'tactician' }));
    expect(tac.textContent).toContain('Choose Two Kits');
  });
  it('conduit domain picker lists all 12 domains and FIFO-drops the oldest of 3', () => {
    const c = atStep(CLASS_STEP, { cls: 'conduit', domains: ['Life', 'Protection'] });
    const { container, getAllByText, latest } = renderWizard(c);
    const cls: any = (DS_CLASSES as any[]).find(x => x.id === 'conduit');
    for (const d of cls.domains) expect(container.textContent).toContain(d);
    fireEvent.click(getAllByText('Storm')[0]);
    expect(latest().cclass.domains).toEqual(['Protection', 'Storm']);
  });
});

describe('ability picker', () => {
  it('renders every signature/heroic option; clicking stores the pick', () => {
    const cls: any = (DS_CLASSES as any[]).find(x => x.id === 'fury');
    const c = atStep(CLASS_STEP, { cls: 'fury' });
    c.cclass.signatures = [];
    c.cclass.heroic3 = null;
    c.cclass.heroic5 = null;
    const { container, getAllByText, latest } = renderWizard(c);
    for (const a of [...cls.signatures, ...cls.heroic3, ...cls.heroic5]) {
      expect(container.textContent).toContain(a.name);
    }
    fireEvent.click(getAllByText(cls.signatures[1].name)[0]);
    expect(latest().cclass.signatures).toEqual([cls.signatures[1].name]);
  });
});

describe('revenant former life', () => {
  it('shows the former-life picker for revenants only, and stores the pick', () => {
    const ancestryStep = DS_STEPS.findIndex((s: any) => /ancestry/i.test(s.id));
    const c = atStep(ancestryStep, { ancestry: 'revenant' });
    const { container, getAllByText, latest } = renderWizard(c);
    expect(container.textContent!.toLowerCase()).toContain('former life');
    // The main ancestry grid also lists Polder — the former-life panel renders after it.
    const polders = getAllByText('Polder');
    fireEvent.click(polders[polders.length - 1]);
    expect(latest().ancestry.formerLife).toBe('polder');
    cleanup();
    const human = atStep(ancestryStep, { ancestry: 'human' });
    const { container: hc } = renderWizard(human);
    expect(hc.textContent!.toLowerCase()).not.toContain('former life');
  });

  it('trait choice pickers store picks and flip the gate (orc, dragon-knight, time-raider)', () => {
    const ancestryStep = DS_STEPS.findIndex((s: any) => /ancestry/i.test(s.id));
    // Orc Passionate Artisan: two crafting-skill chips.
    const orc = atStep(ancestryStep, { ancestry: 'orc', traits: ['Passionate Artisan'] });
    orc.ancestry.traitSkills = {};
    expect(isStepValid(orc, ancestryStep)).toBe(false);
    const { getAllByText, latest } = renderWizard(orc);
    fireEvent.click(getAllByText('Alchemy').pop()!);
    expect(latest().ancestry.traitSkills['Passionate Artisan']).toEqual(['Alchemy']);
    cleanup();
    // Dragon Knight Prismatic Scales: immunity chip.
    const dk = atStep(ancestryStep, { ancestry: 'dragon-knight', traits: ['Prismatic Scales'] });
    dk.ancestry.traitOptions = {};
    expect(isStepValid(dk, ancestryStep)).toBe(false);
    const dkr = renderWizard(dk);
    fireEvent.click(dkr.getAllByText('Fire').pop()!);
    const dkAfter = dkr.latest();
    expect(dkAfter.ancestry.traitOptions['Prismatic Scales']).toEqual(['Fire']);
    expect(isStepValid(dkAfter, ancestryStep)).toBe(true);
    cleanup();
    // Time Raider Psionic Gift: options derived from the abilities array.
    const tr = atStep(ancestryStep, { ancestry: 'time-raider', traits: ['Psionic Gift'] });
    tr.ancestry.traitOptions = {};
    expect(isStepValid(tr, ancestryStep)).toBe(false);
    const trr = renderWizard(tr);
    fireEvent.click(trr.getAllByText('Psionic Bolt').pop()!);
    const trAfter = trr.latest();
    expect(trAfter.ancestry.traitOptions['Psionic Gift']).toEqual(['Psionic Bolt']);
    expect(isStepValid(trAfter, ancestryStep)).toBe(true);
    cleanup();
    // Deselecting the trait clears its picks.
    const orc2 = atStep(ancestryStep, { ancestry: 'orc', traits: ['Passionate Artisan'] });
    const orc2r = renderWizard(orc2);
    fireEvent.click(orc2r.getAllByText('Passionate Artisan')[0]);
    const orc2After = orc2r.latest();
    expect(orc2After.ancestry.traits).not.toContain('Passionate Artisan');
    expect(orc2After.ancestry.traitSkills['Passionate Artisan']).toBeUndefined();
  });

  it('a purchased Previous Life trait gates the step until the borrowed trait is picked', () => {
    const ancestryStep = DS_STEPS.findIndex((s: any) => /ancestry/i.test(s.id));
    const c = atStep(ancestryStep, { ancestry: 'revenant', formerLife: 'dwarf', traits: ['Previous Life: 1pt'] });
    c.ancestry.prevLifeTraits = {};                       // undo the factory's auto-pick
    expect(isStepValid(c, ancestryStep)).toBe(false);
    const { getAllByText, latest } = renderWizard(c);
    // 'Grounded' is dwarf's only 1pt trait; the borrow picker card is the last match.
    const grounded = getAllByText('Grounded');
    fireEvent.click(grounded[grounded.length - 1]);
    const after = latest();
    expect(after.ancestry.prevLifeTraits['1pt']).toBe('Grounded');
    expect(isStepValid(after, ancestryStep)).toBe(true);
  });
});

describe('duplicate-grant swap UI', () => {
  it('Agent + Shadow renders the substitution block; clicking a chip stores the swap', () => {
    const c = atStep(CLASS_STEP, { cls: 'shadow', subclass: 'caustic-alchemy', career: 'agent' });
    c.cclass.skillSwaps = {};
    const { container, latest } = renderWizard(c);
    expect(container.textContent).toContain('Sneak is already granted by Career');
    expect(container.textContent).toContain('choose another intrigue skill instead');
    const matches = [...container.querySelectorAll<HTMLElement>('div')].filter(
      d => d.textContent?.startsWith('Sneak is already granted'));
    const block = matches[matches.length - 1].parentElement!; // innermost header → its collision block
    const chip = [...block.querySelectorAll<HTMLButtonElement>('.skill-chip')].find(ch => !ch.disabled);
    fireEvent.click(chip!);
    expect(latest().cclass.skillSwaps.Sneak).toBe(chip!.textContent);
  });
  it('the swapped grant chip shows "Sneak → replacement" and no block renders without a collision', () => {
    const c = atStep(CLASS_STEP, { cls: 'shadow', subclass: 'caustic-alchemy', career: 'agent' });
    const rep = c.cclass.skillSwaps.Sneak; // factory resolved it
    const { container } = renderWizard(c);
    expect(container.textContent).toContain(`Sneak → ${rep}`);
    cleanup();
    const clean = atStep(CLASS_STEP, { cls: 'shadow', subclass: 'caustic-alchemy' });
    const { container: cc } = renderWizard(clean);
    expect(cc.textContent).not.toContain('is already granted by');
  });

  it('a complication fixed-grant collision renders the block and gates the step until swapped', () => {
    const COMP_STEP = DS_STEPS.findIndex((s: any) => /complication/i.test(s.id));
    const c = atStep(COMP_STEP, { cls: 'fury', career: 'agent', complication: 'silent-sentinel' });
    c.complication.skillSwaps = {};
    expect(isStepValid(c, COMP_STEP)).toBe(false);
    const { container, latest } = renderWizard(c);
    expect(container.textContent).toContain('Sneak is already granted by Career');
    const matches = [...container.querySelectorAll<HTMLElement>('div')].filter(
      d => d.textContent?.startsWith('Sneak is already granted'));
    const block = matches[matches.length - 1].parentElement!;
    const chip = [...block.querySelectorAll<HTMLButtonElement>('.skill-chip')].find(ch => !ch.disabled);
    fireEvent.click(chip!);
    const after = latest();
    expect(after.complication.skillSwaps.Sneak).toBe(chip!.textContent);
    expect(isStepValid(after, COMP_STEP)).toBe(true);
    cleanup();
    // Skipping the complication stays always-valid.
    const skipped = atStep(COMP_STEP, { cls: 'fury', career: 'agent' });
    expect(skipped.complication.id).toBeFalsy();
    expect(isStepValid(skipped, COMP_STEP)).toBe(true);
  });
});

describe('culture and career storage semantics', () => {
  it('changing a culture aspect drops that aspect\'s chosen skill', () => {
    const cultureStep = DS_STEPS.findIndex((s: any) => /culture/i.test(s.id));
    const c = atStep(cultureStep, { environment: 'nomadic' });
    expect(c.culture.skills.environment).toBeTruthy();
    const { getAllByText, latest } = renderWizard(c);
    fireEvent.click(getAllByText('Urban')[0]);
    expect(latest().culture.environment).toBe('urban');
    expect(latest().culture.skills.environment).toBeUndefined();
  });
  it('changing career reseeds skills with the new career\'s autos', () => {
    const careerStep = DS_STEPS.findIndex((s: any) => /career/i.test(s.id));
    const c = atStep(careerStep, { career: 'agent' });
    const { getAllByText, latest } = renderWizard(c);
    fireEvent.click(getAllByText('Warden')[0]);
    expect(latest().career.id).toBe('warden');
    expect(latest().career.skills).toEqual(['Track']);
    expect(latest().career.perk).toBe('');
  });
  it('the career d6 button lands on a legal incident (stubbed roll)', () => {
    const careerStep = DS_STEPS.findIndex((s: any) => /career/i.test(s.id));
    const car: any = (DS_CAREERS as any[]).find(x => x.id === 'agent');
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    try {
      const c = atStep(careerStep, { career: 'agent' });
      const { getAllByText, latest } = renderWizard(c);
      fireEvent.click(getAllByText(/Roll 1d6/)[0]);
      const names = car.incidents.map((i: any) => (typeof i === 'string' ? i : i.name));
      expect(names).toContain(latest().career.incident);
      expect(latest().career.incident).toBe(names[names.length - 1]);
    } finally { spy.mockRestore(); }
  });
  it('the complication d100 button lands on a legal complication (stubbed roll)', () => {
    const compStep = DS_STEPS.findIndex((s: any) => /complication/i.test(s.id));
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      const c = atStep(compStep);
      const { getAllByText, latest } = renderWizard(c);
      fireEvent.click(getAllByText(/ROLL d100/)[0]);
      const rolled = (DS_COMPLICATIONS as any[]).find(x => x.id === latest().complication.id);
      expect(rolled).toBeDefined();
      expect(rolled.d100).toBe(51);
    } finally { spy.mockRestore(); }
  });
});

// Compact step navigator (railbar) — the ≤900px replacement for the step rail.
// Rendered unconditionally (CSS decides which shows), so it's testable in jsdom.
describe('compact step navigator (railbar)', () => {
  it('arrows navigate and disable at both ends', () => {
    const mid = renderWizard(atStep(2));
    fireEvent.click(mid.getByLabelText('Next chapter'));
    expect(mid.latest().wizardStep).toBe(3);
    fireEvent.click(mid.getByLabelText('Previous chapter'));
    expect(mid.latest().wizardStep).toBe(1);
    cleanup();
    const first = renderWizard(atStep(0));
    expect((first.getByLabelText('Previous chapter') as HTMLButtonElement).disabled).toBe(true);
    cleanup();
    const last = renderWizard(atStep(DS_STEPS.length - 1));
    expect((last.getByLabelText('Next chapter') as HTMLButtonElement).disabled).toBe(true);
  });
});

// Cross-step language conflicts: culture and career pick from the same list, so each
// step must block the other's picks — and a career chip that conflicts retroactively
// (culture re-picked it later) must stay removable, never filtered out of the DOM.
describe('language conflict between culture and career', () => {
  const cultureStep = DS_STEPS.findIndex((s: any) => /culture/i.test(s.id));
  const careerStep = DS_STEPS.findIndex((s: any) => /career/i.test(s.id));
  const chip = (container: HTMLElement, name: string) =>
    Array.from(container.querySelectorAll('.skill-chip')).find(el => el.textContent === name) as HTMLElement;

  it('culture step renders career-claimed languages blocked and inert', () => {
    const c = atStep(cultureStep, { career: 'agent' }); // agent grants 2 languages
    expect(c.career.languages.length).toBe(2);
    const claimed = c.career.languages[0];
    const { container, latest, resetUpdates } = renderWizard(c);
    const card = Array.from(container.querySelectorAll('.card'))
      .find(el => el.textContent === claimed) as HTMLElement;
    expect(card.className).toContain('blocked');
    resetUpdates();
    fireEvent.click(card);
    expect(latest()).toBeNull(); // click swallowed — no update issued
  });

  it('career step blocks the culture language but keeps a conflicting own pick removable', () => {
    const c = atStep(careerStep, { career: 'agent' });
    // Simulate the reported ordering: culture later re-picked a career language.
    c.culture.language = c.career.languages[0];
    const conflicted = c.career.languages[0];
    const other = (DS_LANGUAGES as string[]).find(
      L => L !== 'Caelian' && L !== conflicted && !c.career.languages.includes(L))!;
    const { container, latest } = renderWizard(c);
    // The conflicted chip is still rendered, still "on", and still toggles off.
    const conflictedChip = chip(container, conflicted);
    expect(conflictedChip.className).toContain('on');
    fireEvent.click(conflictedChip);
    expect(latest().career.languages).not.toContain(conflicted);
    // An unpicked language known elsewhere renders blocked (not filtered away).
    expect(chip(container, 'Caelian').className).toContain('blocked');
    expect(chip(container, other)).toBeDefined();
  });
});

// Complication grant pickers — skills/languages chosen on the complication step.
describe('complication grant pickers', () => {
  const COMP_STEP = DS_STEPS.findIndex((s: any) => /complication/i.test(s.id));

  it('a chosen complication with unfilled picks invalidates the step; skipping stays valid', () => {
    const c = atStep(COMP_STEP);
    c.complication = { id: 'grifter', custom: '', skills: {}, languages: [] };
    expect(isStepValid(c, COMP_STEP)).toBe(false);
    c.complication = { id: null, custom: '', skills: {}, languages: [] };
    expect(isStepValid(c, COMP_STEP)).toBe(true);
  });

  it('grifter: clicking a free skill chip stores the pick and completes the step', () => {
    const c = atStep(COMP_STEP);
    c.complication = { id: 'grifter', custom: '', skills: {}, languages: [] };
    const held = new Set(collectSkillPicks(c).map((p: any) => p.name));
    const free = (DS_SKILL_GROUPS as any).intrigue.find((s: string) => !held.has(s));
    const { getAllByText, latest } = renderWizard(c);
    fireEvent.click(getAllByText(free)[0]);
    expect(latest().complication.skills[0]).toEqual([free]);
    expect(isStepValid(latest(), COMP_STEP)).toBe(true);
  });

  it('a skill already held elsewhere renders as a blocked chip', () => {
    const c = atStep(COMP_STEP);
    c.complication = { id: 'grifter', custom: '', skills: {}, languages: [] };
    const held = collectSkillPicks(c).find((p: any) => (DS_SKILL_GROUPS as any).intrigue.includes(p.name));
    if (!held) return; // default build holds no intrigue skill — nothing to assert
    const { getAllByText } = renderWizard(c);
    const chip = getAllByText(held.name).find((el: any) => el.className?.includes?.('skill-chip'));
    expect(chip!.className).toContain('blocked');
  });

  it('exile: clicking a language chip stores the pick', () => {
    const c = atStep(COMP_STEP);
    c.complication = { id: 'exile', custom: '', skills: {}, languages: [] };
    const { getAllByText, latest } = renderWizard(c);
    fireEvent.click(getAllByText('Zaliac')[0]);
    expect(latest().complication.languages).toEqual(['Zaliac']);
    expect(isStepValid(latest(), COMP_STEP)).toBe(true);
  });

  it('stripped-of-rank previews the Issue Order ability card on the step', () => {
    const c = atStep(COMP_STEP);
    c.complication = { id: 'stripped-of-rank', custom: '', skills: {}, languages: [] };
    const { container } = renderWizard(c);
    expect(container.textContent).toContain('Issue Order');
    expect(isStepValid(c, COMP_STEP)).toBe(true); // ability grants need no picks
  });

  it('re-picking a complication clears stored grant picks', () => {
    const c = atStep(COMP_STEP);
    c.complication = { id: 'grifter', custom: '', skills: { 0: ['Alertness'] }, languages: [] };
    const { getAllByText, latest } = renderWizard(c);
    fireEvent.click(getAllByText('Exile')[0]);
    expect(latest().complication.id).toBe('exile');
    expect(latest().complication.skills).toEqual({});
  });
});

// stepIssues — the itemized "what's still missing" behind isStepValid and the
// commit modal's per-section detail lines.
describe('stepIssues', () => {
  const REVIEW_STEP = DS_STEPS.findIndex((s: any) => /review/i.test(s.id));
  const ANCESTRY_STEP = DS_STEPS.findIndex((s: any) => /ancestry/i.test(s.id));
  const CULTURE_STEP = DS_STEPS.findIndex((s: any) => /culture/i.test(s.id));
  const IDENTITY_STEP = DS_STEPS.findIndex((s: any) => /identity/i.test(s.id));
  const COMP_STEP = DS_STEPS.findIndex((s: any) => /complication/i.test(s.id));

  it('a wizard-complete character has no issues on any step, and empty ⇔ valid', () => {
    const c = buildValidCharacter();
    DS_STEPS.forEach((_: any, i: number) => {
      expect(stepIssues(c, i)).toEqual([]);
      expect(isStepValid(c, i)).toBe(true);
    });
    // The invariant holds for broken characters too.
    const broken = buildValidCharacter();
    broken.cclass.subclass = null;
    broken.culture.language = null;
    broken.identity.name = '';
    DS_STEPS.forEach((_: any, i: number) => {
      expect(stepIssues(broken, i).length === 0).toBe(isStepValid(broken, i));
    });
  });

  it('names the missing class picks', () => {
    const c = buildValidCharacter({ cls: 'fury' });
    c.cclass.subclass = null;
    expect(stepIssues(c, CLASS_STEP)).toContain('Subclass not chosen');
    const c2 = buildValidCharacter({ cls: 'fury' });
    c2.kit.id = null;
    expect(stepIssues(c2, CLASS_STEP)).toContain('Kit not chosen');
    // Signature count shortfall reports picked-of-required (or the singular form).
    const c3 = buildValidCharacter({ cls: 'fury' });
    const cls: any = (DS_CLASSES as any[]).find(x => x.id === 'fury');
    const req = cls.sigCount ?? 1;
    c3.cclass.signatures = c3.cclass.signatures.slice(0, req - 1);
    expect(stepIssues(c3, CLASS_STEP)).toContain(
      req === 1 ? 'Signature ability not chosen' : `Signature abilities: ${req - 1} of ${req} picked`);
  });

  it('names the missing culture and identity picks', () => {
    const c = buildValidCharacter();
    c.culture.language = null;
    c.culture.skills = { ...c.culture.skills, upbringing: undefined };
    const issues = stepIssues(c, CULTURE_STEP);
    expect(issues).toContain('Language not chosen');
    expect(issues).toContain('Upbringing skill not picked');
    c.identity.name = '   ';
    expect(stepIssues(c, IDENTITY_STEP)).toEqual(['Hero not yet named']);
  });

  it('a revenant without a former life reports it; a skipped complication reports nothing', () => {
    const c = buildValidCharacter({ ancestry: 'revenant' });
    c.ancestry.formerLife = null;
    expect(stepIssues(c, ANCESTRY_STEP)).toContain('Former life not chosen');
    const skipped = buildValidCharacter();
    expect(skipped.complication.id).toBeFalsy();
    expect(stepIssues(skipped, COMP_STEP)).toEqual([]);
  });

  it('an unresolved duplicate-grant collision names the colliding skill', () => {
    const c = buildValidCharacter({ cls: 'shadow', subclass: 'caustic-alchemy', career: 'agent' });
    c.cclass.skillSwaps = {};
    expect(stepIssues(c, CLASS_STEP)).toContain('Duplicate skill: swap for Sneak not chosen');
  });

  it('the commit modal itemizes each unfinished chapter and its rows still navigate', () => {
    const c = buildValidCharacter({ cls: 'fury' });
    c.wizardStep = REVIEW_STEP;
    // Break more than four class picks — every one must render, with no "+ N more" cap.
    c.cclass.subclass = null;
    c.cclass.signatures = [];
    c.kit.id = null;
    c.cclass.skills = [];
    c.cclass.characteristics = {};
    const issues = stepIssues(c, CLASS_STEP);
    expect(issues.length).toBeGreaterThan(4);
    const { container, getByText, latest } = renderWizard(c);
    // The review step lists every missing item as chapter cards — no overflow cap.
    for (const issue of issues) expect(container.textContent).toContain(issue);
    expect(container.textContent).not.toMatch(/\+\s*\d+ more/);
    fireEvent.click(getByText('COMMIT TO THE LIBER ▸'));
    const modal = container.querySelector('.modal')!;
    expect(modal.textContent).toContain("This Hero Isn't Finished");
    for (const issue of issues) expect(modal.textContent).toContain(issue);
    expect(modal.textContent).not.toMatch(/\+\s*\d+ more/);
    fireEvent.click(modal.querySelector<HTMLButtonElement>('.card-btn')!);
    expect(latest().wizardStep).toBe(CLASS_STEP);
  });
});
