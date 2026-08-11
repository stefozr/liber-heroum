// Play-sheet render regression. Mounts PlayView for a representative completed,
// kit-bearing character and asserts it renders without throwing — the path that
// surfaced "parseKitSig is not defined" (play.jsx used the helper without importing
// it). The wizard/theme suites never render the play sheet, so this closes that gap.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import { PlayView, conditionedSpeed } from '../play.jsx';
import { newCharacter } from '../app.jsx';
import { DS_ANCESTRIES, DS_CLASSES, DS_CAREERS, DS_KITS, DS_COMPLICATIONS } from '../data.jsx';

// Node's experimental localStorage global is unavailable without
// --localstorage-file (same situation as invite-gate.test.tsx), so back the
// sheet's tab persistence with an in-memory stub.
const lsStore = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => (lsStore.has(k) ? lsStore.get(k)! : null),
  setItem: (k: string, v: string) => void lsStore.set(k, String(v)),
  removeItem: (k: string) => void lsStore.delete(k),
  clear: () => lsStore.clear(),
});

afterEach(() => { cleanup(); localStorage.clear(); });

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

describe('conditionedSpeed', () => {
  it('caps speed per the rules text', () => {
    expect(conditionedSpeed(6, {})).toBe(6);
    expect(conditionedSpeed(6, { Slowed: true })).toBe(2);
    expect(conditionedSpeed(1, { Slowed: true })).toBe(1);      // "unless already lower"
    expect(conditionedSpeed(6, { Grabbed: true })).toBe(0);
    expect(conditionedSpeed(6, { Restrained: true })).toBe(0);
    expect(conditionedSpeed(6, { Slowed: true, Grabbed: true })).toBe(0);
    expect(conditionedSpeed(6, { Weakened: true, Prone: true })).toBe(6); // no numeric effect
    expect(conditionedSpeed(6, undefined)).toBe(6);
  });
});

describe('PlayView sheet tabs', () => {
  it('renders three tabs and switches the visible panel', () => {
    const { container, getAllByRole } = render(
      <PlayView character={completedCharacter()} update={noop} onExit={noop} onEdit={noop} />
    );
    const tabs = getAllByRole('tab');
    // textContent includes the aria-hidden glyph, so match on the label suffix.
    expect(tabs.map(t => t.textContent)).toEqual(['✠Character', '⚔Combat', '▲Progression']);

    const panel = (id: string) => container.querySelector(`#play-panel-${id}`) as HTMLElement;
    expect(panel('character').hidden).toBe(false);
    expect(panel('combat').hidden).toBe(true);
    expect(panel('progression').hidden).toBe(true);

    fireEvent.click(tabs[1]);
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(tabs[0].getAttribute('aria-selected')).toBe('false');
    expect(panel('character').hidden).toBe(true);
    expect(panel('combat').hidden).toBe(false);
  });

  it('persists the active tab per hero and restores it on remount', () => {
    const c = completedCharacter();
    const first = render(
      <PlayView character={c} update={noop} onExit={noop} onEdit={noop} />
    );
    fireEvent.click(first.getAllByRole('tab')[2]);
    expect(localStorage.getItem(`draw-steel/v2/session/playTab/${c.id}`)).toBe('progression');
    first.unmount();

    const second = render(
      <PlayView character={c} update={noop} onExit={noop} onEdit={noop} />
    );
    const progTab = second.getAllByRole('tab')[2];
    expect(progTab.getAttribute('aria-selected')).toBe('true');
  });

  it('arrow keys move selection along the tab strip', () => {
    const { getAllByRole } = render(
      <PlayView character={completedCharacter()} update={noop} onExit={noop} onEdit={noop} />
    );
    const tabs = getAllByRole('tab');
    tabs[0].focus();
    fireEvent.keyDown(tabs[0].parentElement!, { key: 'ArrowRight' });
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(tabs[1].parentElement!, { key: 'ArrowLeft' });
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
  });

  it('characteristics and stats live on the Character tab; conditions outside all tabs', () => {
    const { container } = render(
      <PlayView character={completedCharacter()} update={noop} onExit={noop} onEdit={noop} />
    );
    const charPanel = container.querySelector('#play-panel-character')!;
    expect(charPanel.textContent).toContain('Might');
    expect(charPanel.textContent).toContain('Echelon');
    expect(container.querySelector('#play-panel-combat')!.textContent).not.toContain('Echelon');
    // Conditions sit in the pinned strip, not inside any tab panel.
    const strip = container.querySelector('.cond-strip')!;
    expect(strip.querySelectorAll('.cond').length).toBe(9);
    expect(strip.closest('[role="tabpanel"]')).toBeNull();
  });

  it('groups abilities under source headers', () => {
    const c = completedCharacter();
    c.ancestry.id = 'dragon-knight';
    c.ancestry.traits = ['Dragon Breath'];  // grants an ancestry ability
    const { container } = render(
      <PlayView character={c} update={noop} onExit={noop} onEdit={noop} />
    );
    const heads = Array.from(container.querySelectorAll('.abil-group-head')).map(h => h.textContent);
    expect(heads.some(h => h!.startsWith('Kit —'))).toBe(true);
    expect(heads).toContain('Ancestry');
  });

  it('active conditions cap the displayed Speed tile', () => {
    const c = completedCharacter();
    const base = render(
      <PlayView character={c} update={noop} onExit={noop} onEdit={noop} />
    );
    const speedTile = (container: HTMLElement) =>
      Array.from(container.querySelectorAll('.stat-tile'))
        .find(t => t.querySelector('.lbl')!.textContent === 'Speed')!;
    const baseSpeed = Number(speedTile(base.container).querySelector('.val')!.textContent!.match(/^\d+/)![0]);
    expect(baseSpeed).toBeGreaterThanOrEqual(5);
    base.unmount();

    c.play.conditions = { Slowed: true };
    const slowed = render(
      <PlayView character={c} update={noop} onExit={noop} onEdit={noop} />
    );
    const tile = speedTile(slowed.container);
    expect(tile.querySelector('.val')!.textContent).toBe(`2/${baseSpeed}`);
    expect(tile.className).toContain('rubric');
    slowed.unmount();

    c.play.conditions = { Slowed: true, Grabbed: true };
    const grabbed = render(
      <PlayView character={c} update={noop} onExit={noop} onEdit={noop} />
    );
    expect(speedTile(grabbed.container).querySelector('.val')!.textContent).toBe(`0/${baseSpeed}`);
  });

  it('hovering a condition chip shows its rules text in a tooltip', () => {
    const { container } = render(
      <PlayView character={completedCharacter()} update={noop} onExit={noop} onEdit={noop} />
    );
    expect(container.querySelector('.play-tip')).toBeNull();
    const weakened = Array.from(container.querySelectorAll('.cond-wrap'))
      .find(w => w.textContent === 'Weakened')!;
    fireEvent.mouseEnter(weakened);
    const tip = container.querySelector('.play-tip')!;
    expect(tip.textContent).toContain('Weakened');
    expect(tip.textContent).toContain('bane on power rolls');
    fireEvent.mouseLeave(weakened);
    expect(container.querySelector('.play-tip')).toBeNull();
  });

  it('potency legend entries show styled tooltips with their formula', () => {
    const { container } = render(
      <PlayView character={completedCharacter()} update={noop} onExit={noop} onEdit={noop} />
    );
    const weak = Array.from(container.querySelectorAll('.potency-row span'))
      .find(s => s.textContent!.startsWith('WEAK'))!;
    fireEvent.mouseEnter(weak);
    const tip = container.querySelector('.play-tip')!;
    expect(tip.textContent).toContain('M < WEAK');
    expect(tip.textContent).toContain('highest characteristic − 2');
    fireEvent.mouseLeave(weak);
    expect(container.querySelector('.play-tip')).toBeNull();
  });

  it('tooltips still show on the read-only sheet, where chips are disabled', () => {
    const { container } = render(
      <PlayView character={completedCharacter()} update={noop} onExit={noop} canEdit={false} />
    );
    const dazed = Array.from(container.querySelectorAll('.cond-wrap'))
      .find(w => w.textContent === 'Dazed')!;
    expect((dazed.querySelector('.cond') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.mouseEnter(dazed);
    expect(container.querySelector('.play-tip')!.textContent).toContain('only one thing on their turn');
  });

  it('progression tab consolidates a level-up into one editable row', () => {
    const c = completedCharacter();
    c.level = 2;
    // Censor (DS_CLASSES[0]) level 2 has a 'perk' choice (kind: 'perk').
    c.levelChoices = { 2: { picks: { perk: {
      chosen: 'Friend Catapult', name: 'Lore Perk', id: 'lore',
      chosenText: 'Launch a willing ally skyward.',
    } } } };
    const { container } = render(
      <PlayView character={c} update={noop} onExit={noop} onEdit={noop} />
    );
    const panel = container.querySelector('#play-panel-progression')!;
    const rows = panel.querySelectorAll('.prog-row');
    // Creation row (Lv 1) + the level-2 row.
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain(DS_ANCESTRIES[0].name);
    expect(rows[1].textContent).toContain('Lv 2');
    expect(rows[1].querySelector('.prog-edit')).not.toBeNull();
    // Selections carry their descriptive text, not just names.
    expect(rows[1].textContent).toContain('Launch a willing ally skyward.');
    expect(rows[1].querySelectorAll('.prog-pick-text').length).toBeGreaterThan(0);
  });
});
