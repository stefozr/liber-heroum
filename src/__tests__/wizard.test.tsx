// Wizard render regression. Renders the Wizard at every one of the 7 steps with
// a representative (class/ancestry/career/kit chosen) character and asserts each
// renders without throwing — the path the auth-only smoke test can't reach.
import { describe, it, expect } from 'vitest';
import { render, cleanup } from '@testing-library/react';
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
