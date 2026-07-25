// Layer E — LevelUpFlow modal walkthroughs. Drives the real modal with clicks: for each
// class, open at level 2, pick the first option on every choice screen, ASCEND, and
// assert the applied update. Exhaustive option coverage lives in levelup-matrix.test.ts
// (pure); these tests pin the modal wiring: step order, canAdvance gating, the two-tier
// perk/skill drilldown, the char-bonus screen, and edit mode.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import { LevelUpFlow, makeContext, levelChoicesFor, deriveGroupName } from '../levelup.jsx';
import { classDef } from '../app.jsx';
import { DS_CLASSES, DS_SKILL_GROUPS } from '../data.jsx';
import { PERKS } from '../wizard/helpers.js';
import { buildValidCharacter, levelTo, firstPickFor } from './helpers/factories';

afterEach(() => cleanup());
const noop = () => {};

// Click the innermost element whose text matches — bubbles up to the option card.
function clickText(container: HTMLElement, text: string) {
  const matches = [...container.querySelectorAll<HTMLElement>('*')]
    .filter(e => (e.textContent || '').trim() === text.trim() && !e.querySelector('*'));
  const el = matches[matches.length - 1]
    || [...container.querySelectorAll<HTMLElement>('*')].filter(e => (e.textContent || '').includes(text)).pop();
  expect(el, `"${text}" not found on screen`).toBeTruthy();
  fireEvent.click(el!);
}
function clickButton(container: HTMLElement, label: RegExp) {
  const btn = [...container.querySelectorAll<HTMLButtonElement>('button')].find(b => label.test(b.textContent || ''));
  expect(btn, `button ${label} not found`).toBeTruthy();
  expect(btn!.disabled, `button ${label} unexpectedly disabled`).toBe(false);
  fireEvent.click(btn!);
}

// Walk the whole modal: intro → each choice (first valid pick) → review → ASCEND/SAVE.
function driveLevelUp(c: any, editLevel: number | null = null) {
  let result: any = null;
  const update = (fn: any) => { result = fn(c); };
  const { container } = render(
    <LevelUpFlow open={true} onClose={noop} character={c} update={update} editLevel={editLevel} />
  );
  const cls = classDef(c);
  const level = editLevel ?? c.level + 1;
  const ctx = makeContext(c);
  const choices = levelChoicesFor(cls, level, ctx);

  clickButton(container, /CONTINUE/); // leave the intro
  for (const ch of choices) {
    const pick: any = firstPickFor(ch, ctx, c);
    expect(pick, `${cls.id} L${level} ${ch.id} unsatisfiable`).toBeTruthy();
    if (ch.kind === 'perk' || ch.kind === 'skill-group') {
      clickText(container, pick.name);    // category card
      // Edit mode pre-selects the saved category; clicking it again toggles it OFF.
      // If the drilldown list vanished, click once more to re-open it.
      if (!(container.textContent || '').includes(pick.chosen)) clickText(container, pick.name);
      clickText(container, pick.chosen);  // specific item
    } else {
      clickText(container, pick.name);
    }
    clickButton(container, /CONTINUE|ASCEND|SAVE/);
  }
  clickButton(container, editLevel != null ? /SAVE/ : /ASCEND/); // review
  return result;
}

describe('LevelUpFlow walks level 2 for every class', () => {
  for (const cls of DS_CLASSES as any[]) {
    it(`${cls.id}: intro → choices → review → ASCEND applies the level`, () => {
      const c = buildValidCharacter({ cls: cls.id });
      const result = driveLevelUp(c);
      expect(result, `${cls.id} update never fired`).toBeTruthy();
      expect(result.level).toBe(2);
      expect(result.levelChoices[2]).toBeTruthy();
      expect(result.play.stamina).toBeNull();
    });
  }
});

describe('deeper screens', () => {
  it('conduit L4: char-bonus screen and the two-tier perk/skill drilldowns all wire through', () => {
    const at3 = levelTo(buildValidCharacter({ cls: 'conduit', domains: ['Life', 'Protection'] }), 3);
    const result = driveLevelUp(at3);
    expect(result.level).toBe(4);
    const picks = result.levelChoices[4].picks;
    expect(picks['char-bonus-4']?.id).toBeTruthy();
    expect(picks['perk-4']?.chosen).toBeTruthy();
    expect(picks['skill-4']?.chosen).toBeTruthy();
  });

  it('troubadour L3 now offers the official 7-drama abilities and can continue', () => {
    const at2 = levelTo(buildValidCharacter({ cls: 'troubadour' }), 2);
    let result: any = null;
    const update = (fn: any) => { result = fn(at2); };
    const { container } = render(
      <LevelUpFlow open={true} onClose={noop} character={at2} update={update} />
    );
    clickButton(container, /CONTINUE/);
    for (const name of ['Extensive Rewrites', 'Infernal Gavotte', 'Star Solo', 'We Meet at Last']) {
      expect(container.textContent).toContain(name);
    }
    expect(container.textContent).not.toContain('No options available');
    clickText(container, 'Star Solo');
    clickButton(container, /CONTINUE/);
    clickButton(container, /ASCEND/);
    expect(result.level).toBe(3);
    expect(result.cclass.levelAbilities[3].some((a: any) => a.name === 'Star Solo')).toBe(true);
  });

  it('edit mode pre-fills, replaces the level, and leaves level/vitals alone', () => {
    const at3 = levelTo(buildValidCharacter({ cls: 'censor' }), 3);
    at3.play.stamina = 12;
    const result = driveLevelUp(at3, 2);
    expect(result.level).toBe(3);
    expect(result.play.stamina).toBe(12);
    expect(result.levelChoices[2]).toBeTruthy();
  });

  it('a perk already held blocks its card at the next level', () => {
    const at2 = levelTo(buildValidCharacter({ cls: 'fury' }), 2);
    const perk2 = at2.levelChoices[2].picks['perk']?.chosen;
    expect(perk2).toBeTruthy();
    const at3 = levelTo(at2, 3);
    const { container } = render(
      <LevelUpFlow open={true} onClose={noop} character={at3} update={noop} />
    );
    clickButton(container, /CONTINUE/); // intro → perk-4 (fury L4's first choice)
    const cls = classDef(at3);
    const ctx = makeContext(at3);
    const perkChoice = levelChoicesFor(cls, 4, ctx).find((ch: any) => ch.kind === 'perk');
    const opts = typeof perkChoice.options === 'function' ? perkChoice.options(ctx) : perkChoice.options;
    // Open the category that contains the already-held perk.
    const heldGroup = Object.entries(PERKS as any).find(([, list]: any) => list.some((p: any) => p.name === perk2))![0];
    const categoryOpt = opts.find((o: any) => deriveGroupName(o) === heldGroup);
    if (categoryOpt) {
      clickText(container, categoryOpt.name);
      const blocked = [...container.querySelectorAll<HTMLElement>('.lvl-opt.blocked')];
      expect(blocked.some(e => e.textContent!.includes(perk2)), `"${perk2}" should render blocked`).toBe(true);
    }
  });
});
