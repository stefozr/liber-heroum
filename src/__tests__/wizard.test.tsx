// Wizard render regression. Renders the Wizard at every one of the 7 steps with
// a representative (class/ancestry/career/kit chosen) character and asserts each
// renders without throwing — the path the auth-only smoke test can't reach.
import { describe, it, expect } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { afterEach } from 'vitest';
import React from 'react';
import { Wizard } from '../wizard.jsx';
import { newCharacter } from '../app.jsx';
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
  return { ...utils, latest: () => updated };
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
    const { container, latest } = renderWizard(c);
    const card = Array.from(container.querySelectorAll('.card'))
      .find(el => el.textContent === claimed) as HTMLElement;
    expect(card.className).toContain('blocked');
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
