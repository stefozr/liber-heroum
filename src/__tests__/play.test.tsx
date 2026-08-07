// Play-sheet render regression. Mounts PlayView for a representative completed,
// kit-bearing character and asserts it renders without throwing — the path that
// surfaced "parseKitSig is not defined" (play.jsx used the helper without importing
// it). The wizard/theme suites never render the play sheet, so this closes that gap.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import React from 'react';
import { PlayView } from '../play.jsx';
import { newCharacter } from '../app.jsx';
import { DS_ANCESTRIES, DS_CLASSES, DS_CAREERS, DS_KITS, DS_COMPLICATIONS } from '../data.jsx';

afterEach(() => cleanup());

function completedCharacter() {
  const c: any = newCharacter('u-test', null);
  c.ancestry.id = DS_ANCESTRIES[0].id;
  c.career.id = DS_CAREERS[0].id;
  c.cclass.id = DS_CLASSES[0].id;
  c.kit.id = DS_KITS[0].id;          // exercises the parseKitSig(kt.sig) path
  c.complication.id = DS_COMPLICATIONS[0].id;
  c.identity.name = 'Test Hero';
  c.name = 'Test Hero';
  c.status = 'complete';
  return c;
}

const noop = () => {};

describe('PlayView renders the character sheet', () => {
  it('mounts a completed, kit-bearing hero without throwing', () => {
    const { container } = render(
      <PlayView character={completedCharacter()} update={noop} onExit={noop} onEdit={noop} />
    );
    expect(container.textContent).toContain('Test Hero');
    expect(container.textContent!.length).toBeGreaterThan(50);
  });

  it('revenant shows the borrowed Previous Life trait, not the placeholder', () => {
    const c = completedCharacter();
    c.ancestry.id = 'revenant';
    c.ancestry.formerLife = 'dwarf';
    c.ancestry.traits = ['Previous Life: 1pt'];
    c.ancestry.prevLifeTraits = { '1pt': 'Grounded' };
    const { container } = render(
      <PlayView character={c} update={noop} onExit={noop} onEdit={noop} />
    );
    const text = container.textContent!;
    expect(text).toContain('Grounded');
    expect(text).not.toContain('Take a 1-point trait');
    expect(text).toContain('PREVIOUS LIFE — DWARF');
    expect(text).toContain('Former Life: Dwarf');
  });

  it('devil shows the picked signature skill, not the rules prompt', () => {
    const c = completedCharacter();
    c.ancestry.id = 'devil';
    c.ancestry.sigSkills = { 'Silver Tongue': ['Lie'] };
    const { container } = render(
      <PlayView character={c} update={noop} onExit={noop} onEdit={noop} />
    );
    const text = container.textContent!;
    // The Skills panel shows the picked skill next to the signature source…
    expect(text).toContain('Devil — Silver Tongue');
    expect(text).toContain('Lie');
    // …instead of the unpicked-fallback prompt.
    expect(text).not.toContain('interpersonal of your choice');
  });

  it('trait choice picks and ancestry abilities render on the sheet', () => {
    const c = completedCharacter();
    c.ancestry.id = 'dragon-knight';
    c.ancestry.traits = ['Prismatic Scales', 'Dragon Breath'];
    c.ancestry.sigOptions = { 'Wyrmplate': ['Cold'] };
    c.ancestry.traitOptions = { 'Prismatic Scales': ['Fire'] };
    const { container } = render(
      <PlayView character={c} update={noop} onExit={noop} onEdit={noop} />
    );
    const text = container.textContent!;
    expect(text).toContain('Additional Immunity: Fire');
    expect(text).toContain('A furious exhalation of energy'); // Dragon Breath ability card
  });

  it('psionic gift renders only the chosen ability', () => {
    const c = completedCharacter();
    c.ancestry.id = 'time-raider';
    c.ancestry.traits = ['Psionic Gift'];
    c.ancestry.traitOptions = { 'Psionic Gift': ['Psionic Bolt'] };
    const { container } = render(
      <PlayView character={c} update={noop} onExit={noop} onEdit={noop} />
    );
    const text = container.textContent!;
    expect(text).toContain('purple beam of psychic force'); // Psionic Bolt flavor
    expect(text).not.toContain('You slam an invisible force'); // Concussive Slam flavor
  });

  it('read-only sheet disables the session trackers and names the owner', () => {
    const { container } = render(
      <PlayView character={completedCharacter()} update={noop} onExit={noop}
        canEdit={false} owner={{ id: 'u-test', displayName: 'Mara Quill' }} />
    );
    // Every stepper/counter button is truly disabled, not just visually dimmed.
    const trackerButtons = container.querySelectorAll('.vital-ctl button, .cnt-ctl button, .cond');
    expect(trackerButtons.length).toBeGreaterThan(0);
    trackerButtons.forEach(b => expect((b as HTMLButtonElement).disabled).toBe(true));
    // The viewing tag says whose hero this is.
    expect(container.textContent).toContain('kept by Mara Quill');
    // No level-edit affordance for viewers.
    expect(container.querySelector('.prog-edit')).toBeNull();
  });

  it('revenant size tile uses the former life', () => {
    const c = completedCharacter();
    c.ancestry.id = 'revenant';
    c.ancestry.formerLife = 'hakaan';
    const { container } = render(
      <PlayView character={c} update={noop} onExit={noop} onEdit={noop} />
    );
    expect(container.textContent).toContain('1L');
  });
});
