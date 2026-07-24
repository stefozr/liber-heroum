// Wizard render regression. Renders the Wizard at every one of the 7 steps with
// a representative (class/ancestry/career/kit chosen) character and asserts each
// renders without throwing — the path the auth-only smoke test can't reach.
import { describe, it, expect } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { afterEach } from 'vitest';
import React from 'react';
import { Wizard } from '../wizard.jsx';
import { newCharacter } from '../app.jsx';
import { DS_STEPS, DS_ANCESTRIES, DS_CLASSES, DS_CAREERS, DS_KITS, DS_COMPLICATIONS } from '../data.jsx';

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
