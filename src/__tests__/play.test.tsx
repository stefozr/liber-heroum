// Play-sheet render regression. Mounts PlayView for a representative completed,
// kit-bearing character and asserts it renders without throwing — the path that
// surfaced "parseKitSig is not defined" (play.jsx used the helper without importing
// it). The wizard/theme suites never render the play sheet, so this closes that gap.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import { PlayView, conditionedSpeed, perMinionStamina, minionMax, squadAlive, applySquadDamage } from '../play.jsx';
import { newCharacter } from '../app.jsx';
import { DS_ANCESTRIES, DS_CLASSES, DS_CAREERS, DS_KITS, DS_COMPLICATIONS, SUMMONER_PORTFOLIOS } from '../data.jsx';

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

  it('an admin gets a VIEW READ-ONLY preview toggle in the top bar', () => {
    const onToggle = vi.fn();
    const { getAllByText, queryByText } = render(
      <PlayView character={completedCharacter()} update={noop} onExit={noop}
        canPreviewReadonly onTogglePreviewReadonly={onToggle} />
    );
    expect(queryByText('EXIT READ-ONLY')).toBeNull();
    // Top-bar actions render twice by design (buttons + collapsed ⋯ menu).
    fireEvent.click(getAllByText('VIEW READ-ONLY')[0]);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('while previewing, the toggle reads EXIT READ-ONLY and stays clickable on the read-only sheet', () => {
    const onToggle = vi.fn();
    const { container, getAllByText, queryByText } = render(
      <PlayView character={completedCharacter()} update={noop} onExit={noop}
        canEdit={false} owner={{ id: 'u-test', displayName: 'Mara Quill' }}
        canPreviewReadonly previewReadonly onTogglePreviewReadonly={onToggle} />
    );
    expect(queryByText('VIEW READ-ONLY')).toBeNull();
    // The sheet renders genuinely read-only…
    expect(container.querySelector('.play-readonly')).not.toBeNull();
    // …but the exit toggle still works.
    fireEvent.click(getAllByText('EXIT READ-ONLY')[0]);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('non-admins never see the read-only preview toggle', () => {
    const { queryByText } = render(
      <PlayView character={completedCharacter()} update={noop} onExit={noop} />
    );
    expect(queryByText('VIEW READ-ONLY')).toBeNull();
    expect(queryByText('EXIT READ-ONLY')).toBeNull();
  });

  it('the owner gets a visibility toggle in the top bar', () => {
    const onSetVisibility = vi.fn();
    const { getAllByText } = render(
      <PlayView character={completedCharacter()} update={noop} onExit={noop}
        canSetVisibility onSetVisibility={onSetVisibility} />
    );
    // Top-bar actions render twice by design (buttons + collapsed ⋯ menu).
    const [btn] = getAllByText('MAKE PUBLIC');
    fireEvent.click(btn);
    expect(onSetVisibility).toHaveBeenCalledWith('public');
  });

  it('a public hero offers the owner MAKE PRIVATE instead', () => {
    const c = completedCharacter();
    c.visibility = 'public';
    const onSetVisibility = vi.fn();
    const { getAllByText, queryByText } = render(
      <PlayView character={c} update={noop} onExit={noop}
        canSetVisibility onSetVisibility={onSetVisibility} />
    );
    expect(queryByText('MAKE PUBLIC')).toBeNull();
    fireEvent.click(getAllByText('MAKE PRIVATE')[0]);
    expect(onSetVisibility).toHaveBeenCalledWith('private');
  });

  it('a non-owner editor of a public hero sees the party-editable tag and no toggle', () => {
    const c = completedCharacter();
    c.visibility = 'public';
    const { container, queryByText } = render(
      <PlayView character={c} update={noop} onExit={noop}
        canEdit isOwner={false} canSetVisibility={false}
        owner={{ id: 'u-test', displayName: 'Mara Quill' }} />
    );
    expect(container.textContent).toContain('Party-editable · kept by Mara Quill');
    // Flipping visibility stays with the owner.
    expect(queryByText('MAKE PRIVATE')).toBeNull();
    expect(queryByText('MAKE PUBLIC')).toBeNull();
    // And the sheet is genuinely editable — not the read-only rendering.
    expect(container.querySelector('.play-readonly')).toBeNull();
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

describe('masthead ledger & respite', () => {
  // PlayView mutates through update(mutator) — capture the evolving character
  // the same way App.updateActive would apply it.
  const capture = (initial: any) => {
    const ref = { c: initial };
    const update = (mut: any) => { ref.c = typeof mut === 'function' ? mut(ref.c) : mut; };
    return { ref, update };
  };
  const stat = (container: HTMLElement, label: string) =>
    Array.from(container.querySelectorAll('.hb-stat'))
      .find(s => s.querySelector('.hb-stat-lbl')!.textContent === label)!;

  it('shows Renown/Wealth/XP with career grants; the numbers are click-to-edit', () => {
    const c = completedCharacter();
    c.career.id = 'aristocrat';               // renown 1, wealth 1
    const { container } = render(
      <PlayView character={c} update={noop} onExit={noop} onEdit={noop} />
    );
    expect(stat(container, 'Renown').querySelector('.hb-stat-num')!.textContent).toBe('1');
    expect(stat(container, 'Wealth').querySelector('.hb-stat-num')!.textContent).toBe('2'); // 1 base + career
    expect(stat(container, 'XP').querySelector('.hb-stat-num')!.textContent).toBe('0');
    // Renown/Wealth render their number as an edit button; the respite-only XP
    // stays a bare figure with no control at all.
    for (const label of ['Renown', 'Wealth']) {
      expect(stat(container, label).querySelector(`button[aria-label="Edit ${label}"]`)).toBeTruthy();
    }
    expect(stat(container, 'XP').querySelector('button')).toBeNull();
  });

  it('clicking the number opens a type-in field; Enter commits as the Director delta', () => {
    const { ref, update } = capture(completedCharacter()); // agent career: renown base 0
    const { container } = render(
      <PlayView character={ref.c} update={update} onExit={noop} onEdit={noop} />
    );
    fireEvent.click(stat(container, 'Renown').querySelector('[aria-label="Edit Renown"]')!);
    const input = stat(container, 'Renown').querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('0');                                 // pre-filled with the shown value
    expect(stat(container, 'Wealth').querySelector('input')).toBeNull(); // Wealth stays at rest
    fireEvent.change(input, { target: { value: '7' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(ref.c.play.renownAdj).toBe(7);                          // base 0 → delta = typed value
    expect(stat(container, 'Renown').querySelector('input')).toBeNull(); // field closed

    // Blur commits too; wealth is unclamped so a typed negative sticks.
    fireEvent.click(stat(container, 'Wealth').querySelector('[aria-label="Edit Wealth"]')!);
    const w = stat(container, 'Wealth').querySelector('input') as HTMLInputElement;
    fireEvent.change(w, { target: { value: '-3' } });
    fireEvent.blur(w);
    expect(ref.c.play.wealthAdj).toBe(-4);                         // shown 1 (base) → typed −3
  });

  it('Escape cancels; a below-floor value clamps; garbage commits nothing', () => {
    const { ref, update } = capture(completedCharacter()); // renown base 0
    const { container } = render(
      <PlayView character={ref.c} update={update} onExit={noop} onEdit={noop} />
    );
    const open = () => {
      fireEvent.click(stat(container, 'Renown').querySelector('[aria-label="Edit Renown"]')!);
      return stat(container, 'Renown').querySelector('input') as HTMLInputElement;
    };
    let input = open();
    fireEvent.change(input, { target: { value: '9' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(stat(container, 'Renown').querySelector('input')).toBeNull();
    expect(ref.c.play.renownAdj).toBe(0);
    // Typing below the floor clamps via the delta (display can never go negative).
    input = open();
    fireEvent.change(input, { target: { value: '-5' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(ref.c.play.renownAdj).toBe(0);
    // Non-numeric and empty drafts close without committing.
    for (const junk of ['abc', '  ']) {
      input = open();
      fireEvent.change(input, { target: { value: junk } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(ref.c.play.renownAdj).toBe(0);
      expect(stat(container, 'Renown').querySelector('input')).toBeNull();
    }
  });

  it('read-only sheets show the figures without any edit affordance', () => {
    const { container } = render(
      <PlayView character={completedCharacter()} update={noop} onExit={noop}
        canEdit={false} owner={{ id: 'u-test', displayName: 'Mara Quill' }} />
    );
    expect(container.querySelectorAll('.hb-stat')).toHaveLength(3);
    expect(container.querySelectorAll('.hb-stat button, .hb-stat input')).toHaveLength(0);
    expect(container.textContent).not.toContain('RESPITE');
  });

  it('RESPITE converts victories into XP and restores stamina and recoveries', () => {
    const init = completedCharacter();
    init.play = { ...init.play, stamina: 5, recoveriesUsed: 2, victories: 3, xp: 1 };
    const { ref, update } = capture(init);
    const { getByText } = render(
      <PlayView character={ref.c} update={update} onExit={noop} onEdit={noop} />
    );
    fireEvent.click(getByText('RESPITE ❧'));
    // The confirm modal previews the conversion before anything changes.
    expect(getByText(/Convert/).textContent).toContain('3 Victories');
    expect(ref.c.play.victories).toBe(3);
    fireEvent.click(getByText('TAKE RESPITE ❧'));
    expect(ref.c.play).toMatchObject({
      victories: 0,
      xp: 4,                 // 1 + 3 converted
      recoveriesUsed: 0,
      stamina: null,         // the "full" sentinel, lazily refilled like level-up
    });
  });
});

describe('summoner squad math', () => {
  it('perMinionStamina reads the stat block and bakes in Elite Formation', () => {
    expect(perMinionStamina({ stamina: '2' }, { cclass: { formation: 'Platoon Formation' } })).toBe(2);
    expect(perMinionStamina({ stamina: '2' }, { cclass: { formation: 'Elite Formation' } })).toBe(5);
    expect(perMinionStamina(null, { cclass: {} })).toBe(1);
  });
  it('minionMax is 8, or 12 under Horde Formation', () => {
    expect(minionMax({ cclass: { formation: 'Platoon Formation' } })).toBe(8);
    expect(minionMax({ cclass: { formation: 'Horde Formation' } })).toBe(12);
  });
  it('squadAlive derives the count from the pool', () => {
    expect(squadAlive({ stamina: 12 }, 4)).toBe(3);
    expect(squadAlive({ stamina: 7 }, 4)).toBe(2);
    expect(squadAlive({ stamina: 0 }, 4)).toBe(0);
  });
  it('applySquadDamage kills one minion per chunk and reports excess', () => {
    expect(applySquadDamage({ stamina: 12 }, 5, 4)).toEqual({ stamina: 7, deaths: 1, excess: 0 });
    expect(applySquadDamage({ stamina: 12 }, 3, 4)).toEqual({ stamina: 9, deaths: 0, excess: 0 });
    expect(applySquadDamage({ stamina: 4 }, 9, 4)).toEqual({ stamina: 0, deaths: 1, excess: 5 });
  });
});

describe('master-class play trackers', () => {
  const capture = (initial: any) => {
    const ref = { c: initial };
    const update = (mut: any) => { ref.c = typeof mut === 'function' ? mut(ref.c) : mut; };
    return { ref, update };
  };
  const beastheartCharacter = () => {
    const c = completedCharacter();
    c.cclass.id = 'beastheart';
    c.cclass.subclass = 'punisher';
    c.cclass.companion = 'wolf';
    return c;
  };
  const summonerCharacter = () => {
    const c = completedCharacter();
    c.cclass.id = 'summoner';
    c.cclass.subclass = 'graves';
    c.cclass.formation = 'Platoon Formation';
    c.cclass.quickCommand = 'Shield!';
    const pf: any = (SUMMONER_PORTFOLIOS as any).graves;
    c.cclass.minions = { sig: pf.signature.slice(0, 2).map((m: any) => m.id), t3: pf.t3.slice(0, 2).map((m: any) => m.id) };
    c.kit = { id: null };
    return c;
  };
  const gauge = (container: HTMLElement, label: string) =>
    Array.from(container.querySelectorAll('.vital')).find(v => v.querySelector('.vital-lbl')!.textContent === label)!;
  const ctl = (g: Element, text: string) =>
    Array.from(g.querySelectorAll('.vital-ctl button')).find(b => b.textContent === text) as HTMLButtonElement;

  it('beastheart: spending ferocity via the stepper feeds rampage; type-in does not', () => {
    const init = beastheartCharacter();
    init.play = { ...init.play, resource: 5, rampage: 0 };
    const { ref, update } = capture(init);
    const { container, rerender } = render(
      <PlayView character={ref.c} update={update} onExit={noop} onEdit={noop} />
    );
    fireEvent.click(ctl(gauge(container, 'Ferocity'), '−1'));
    expect(ref.c.play.resource).toBe(4);
    expect(ref.c.play.rampage).toBe(1);
    // A clamped decrease only counts what was actually spent.
    rerender(<PlayView character={ref.c} update={update} onExit={noop} onEdit={noop} />);
    fireEvent.click(ctl(gauge(container, 'Ferocity'), '−5'));
    expect(ref.c.play.resource).toBe(0);
    expect(ref.c.play.rampage).toBe(5);
    // Gaining ferocity never adds rampage.
    rerender(<PlayView character={ref.c} update={update} onExit={noop} onEdit={noop} />);
    fireEvent.click(ctl(gauge(container, 'Ferocity'), '+5'));
    expect(ref.c.play.rampage).toBe(5);
    // Type-in is the correction channel — rampage stays put.
    rerender(<PlayView character={ref.c} update={update} onExit={noop} onEdit={noop} />);
    fireEvent.click(gauge(container, 'Ferocity').querySelector('.vital-cur')!);
    const input = gauge(container, 'Ferocity').querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(ref.c.play.resource).toBe(1);
    expect(ref.c.play.rampage).toBe(5);
  });

  it('beastheart: companion panel shows the stat block, rampage pill and gated table rows', () => {
    const init = beastheartCharacter();
    init.play = { ...init.play, rampage: 12 };
    const { container } = render(
      <PlayView character={init} update={noop} onExit={noop} onEdit={noop} />
    );
    const text = container.textContent!;
    expect(text).toContain('Companion — Wolf');
    expect(text).toContain('RAMPAGING');
    // Reached rows highlight (8 and 12), level-gated rows (16/20/24 at level 1) dim.
    // Scoped to the combat panel — the Character tab renders the same table
    // (without a live meter) and stays mounted while hidden.
    const combat = container.querySelector('#play-panel-combat')!;
    expect(combat.querySelectorAll('.feat-table .ftl.ft-active').length).toBe(2);
    expect(combat.querySelectorAll('.feat-table .ftl.ft-gated').length).toBe(3);
    // The companion's own stamina gauge is present and clamps to the hero max.
    expect(gauge(container, 'Companion Stamina')).toBeTruthy();
  });

  it('beastheart: companion stamina steppers write play.companionStamina with clamps', () => {
    const init = beastheartCharacter();
    init.play = { ...init.play, companionStamina: 5 };
    const { ref, update } = capture(init);
    const { container } = render(
      <PlayView character={ref.c} update={update} onExit={noop} onEdit={noop} />
    );
    fireEvent.click(ctl(gauge(container, 'Companion Stamina'), '+5'));
    expect(ref.c.play.companionStamina).toBe(10);
  });

  it('summoner: squads summon, take pooled damage, and report chunk deaths', () => {
    const init = summonerCharacter();
    const { ref, update } = capture(init);
    const view = () => <PlayView character={ref.c} update={update} onExit={noop} onEdit={noop} />;
    const { container, getByText, rerender } = render(view());
    expect(container.textContent).toContain('Minions');
    fireEvent.click(getByText('ADD SQUAD ✚'));
    expect(ref.c.play.squads).toHaveLength(1);
    expect(ref.c.play.squads[0].minionId).toBeTruthy();
    rerender(view());
    // Summon two minions: pool = 2 × per-minion stamina.
    const per = perMinionStamina((ref.c.play.squads[0].minionId && (SUMMONER_PORTFOLIOS as any).graves.signature.concat((SUMMONER_PORTFOLIOS as any).graves.t3).find((m: any) => m.id === ref.c.play.squads[0].minionId)) || { stamina: '1' }, ref.c);
    const plus = Array.from(container.querySelectorAll('.squad-row .cnt-ctl button')).find(b => b.textContent === '+1') as HTMLButtonElement;
    fireEvent.click(plus);
    rerender(view());
    fireEvent.click(plus);
    expect(ref.c.play.squads[0].stamina).toBe(2 * per);
    rerender(view());
    // Damage exactly one chunk: one minion dies.
    const dmg = container.querySelector('.sq-dmg') as HTMLInputElement;
    fireEvent.change(dmg, { target: { value: String(per) } });
    fireEvent.click(getByText('APPLY'));
    expect(ref.c.play.squads[0].stamina).toBe(per);
    expect(container.textContent).toContain('1 minion dies');
  });

  it('respite clears the master-class trackers', () => {
    const init = beastheartCharacter();
    init.play = { ...init.play, rampage: 9, companionStamina: 3, squads: [{ id: 'sq1', minionId: 'x', stamina: 4 }], victories: 1 };
    const { ref, update } = capture(init);
    const { getByText } = render(
      <PlayView character={ref.c} update={update} onExit={noop} onEdit={noop} />
    );
    fireEvent.click(getByText('RESPITE ❧'));
    fireEvent.click(getByText('TAKE RESPITE ❧'));
    expect(ref.c.play).toMatchObject({ rampage: 0, companionStamina: null, squads: [] });
  });

  it('END ENCOUNTER zeroes ferocity and rampage', () => {
    const init = beastheartCharacter();
    init.play = { ...init.play, resource: 7, rampage: 11 };
    const { ref, update } = capture(init);
    const { getByText } = render(
      <PlayView character={ref.c} update={update} onExit={noop} onEdit={noop} />
    );
    fireEvent.click(getByText('END ENCOUNTER ✕'));
    expect(ref.c.play).toMatchObject({ resource: 0, rampage: 0 });
  });

  it('read-only sheets disable the new tracker controls', () => {
    const init = summonerCharacter();
    init.play = { ...init.play, squads: [{ id: 'sq1', minionId: (SUMMONER_PORTFOLIOS as any).graves.signature[0].id, stamina: 4 }] };
    const { container } = render(
      <PlayView character={init} update={noop} onExit={noop}
        canEdit={false} owner={{ id: 'u-test', displayName: 'Mara Quill' }} />
    );
    const controls = container.querySelectorAll('.squad-row button, .squad-row input, .squad-row select');
    expect(controls.length).toBeGreaterThan(0);
    controls.forEach(el => expect((el as HTMLButtonElement).disabled).toBe(true));
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
    // The Echelon tile was retired — echelon only feeds stamina math now.
    expect(charPanel.textContent).not.toContain('Echelon');
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
