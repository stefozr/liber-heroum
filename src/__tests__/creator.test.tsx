// The Codex-style creator (src/creator/): renders every step across the class and
// ancestry matrix, keeps its own step index, preserves the commit gate, and drives
// the shared mutations the same way the classic wizard does.
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, fireEvent, act, within } from '@testing-library/react';
import React from 'react';
import { DS_ANCESTRIES, DS_CLASSES, DS_CAREERS } from '../data.jsx';
import { parseCareerSkills } from '../wizard/helpers.js';
import { Creator } from '../creator/Creator.jsx';
import { CREATOR_STEPS, creatorStepIndex } from '../creator/steps.js';
import { buildValidCharacter, hero } from './helpers/factories';

afterEach(() => { cleanup(); vi.useRealTimers(); });

const noop = () => {};
const at = (c: any, id: string) => { c.creatorStep = creatorStepIndex(id); return c; };

// A stateful harness so interactions chain like they do in the app.
function renderCreator(initial: any, props: any = {}) {
  let current = initial;
  let rerender: any;
  const update = (fn: any) => {
    current = typeof fn === 'function' ? fn(current) : fn;
    rerender(<Creator character={current} update={update} onExit={noop} onComplete={noop} {...props} />);
  };
  const utils = render(<Creator character={current} update={update} onExit={noop} onComplete={noop} {...props} />);
  rerender = utils.rerender;
  return { ...utils, latest: () => current };
}

describe('renders every step', () => {
  for (const s of CREATOR_STEPS) {
    it(`${s.id}: a fresh hero`, () => {
      const { container } = renderCreator(at(hero(), s.id));
      for (const t of CREATOR_STEPS) expect(container.textContent).toContain(t.short);
      expect(container.querySelector('.cr-main')!.textContent!.length).toBeGreaterThan(40);
    });
  }
  for (const cls of DS_CLASSES as any[]) {
    for (const s of CREATOR_STEPS) {
      it(`${cls.id} · ${s.id}: a complete build`, () => {
        const c = at(buildValidCharacter({ cls: cls.id }), s.id);
        c.identity.name = 'Aelric';
        const { container } = renderCreator(c);
        expect(container.querySelector('.cr')).not.toBeNull();
      });
    }
  }
  for (const a of DS_ANCESTRIES as any[]) {
    for (const id of ['ancestry', 'skills']) {
      it(`${a.id} · ${id}`, () => {
        const { container } = renderCreator(at(buildValidCharacter({ ancestry: a.id }), id));
        expect(container.querySelector('.cr-main')).not.toBeNull();
      });
    }
  }
});

describe('option buttons', () => {
  it('every option and poster is a real button carrying aria-pressed', () => {
    for (const id of ['ancestry', 'class', 'skills']) {
      const { container } = renderCreator(at(buildValidCharacter({ cls: 'conduit', ancestry: 'devil' }), id));
      const opts = [...container.querySelectorAll('.opt-btn, .poster-card')];
      expect(opts.length).toBeGreaterThan(5);
      for (const el of opts) {
        expect(el.tagName).toBe('BUTTON');
        expect(el.hasAttribute('aria-pressed')).toBe(true);
      }
      cleanup();
    }
  });
});

describe('navigation', () => {
  it('tabs write creatorStep and leave wizardStep alone', () => {
    const c = hero();
    c.wizardStep = 3;
    const { getByRole, latest } = renderCreator(c);
    const nav = getByRole('navigation', { name: 'Creation steps' });
    fireEvent.click(within(nav).getByText('Skills'));
    expect(latest().creatorStep).toBe(creatorStepIndex('skills'));
    expect(latest().creatorVisited).toContain(creatorStepIndex('skills'));
    expect(latest().wizardStep).toBe(3);
  });

  it('Save and Close exits', () => {
    const onExit = vi.fn();
    const { getByText } = renderCreator(hero(), { onExit });
    fireEvent.click(getByText('SAVE AND CLOSE'));
    expect(onExit).toHaveBeenCalled();
  });

  it('Skills follows every step that grants one, and Identity is last (no Review)', () => {
    expect(CREATOR_STEPS.map(s => s.id)).toEqual(['ancestry', 'culture', 'career', 'class', 'complication', 'skills', 'identity']);
  });
});

describe('commit gate', () => {
  it('a complete hero commits from the Identity step', () => {
    const onComplete = vi.fn();
    const c = at(buildValidCharacter(), 'identity');
    c.identity.name = 'Aelric';
    const { getByText } = renderCreator(c, { onComplete });
    fireEvent.click(getByText('COMMIT TO THE LIBER ▸'));
    expect(onComplete).toHaveBeenCalledWith(true);
  });

  it('an unfinished hero gets the warning, and can be saved as a draft', () => {
    const onComplete = vi.fn();
    const c = at(buildValidCharacter(), 'identity');
    c.identity.name = 'Aelric';
    c.culture.skills = {};
    const { getByText } = renderCreator(c, { onComplete });
    fireEvent.click(getByText('COMMIT TO THE LIBER ▸'));
    expect(getByText("This Hero Isn't Finished")).toBeTruthy();
    fireEvent.click(getByText('SAVE AS DRAFT ▸'));
    expect(onComplete).toHaveBeenCalledWith(false);
  });

  it('an unnamed hero falls into the same soft gate', () => {
    const onComplete = vi.fn();
    const c = at(buildValidCharacter(), 'identity');
    c.identity.name = '';
    c.name = '';
    const { getByText } = renderCreator(c, { onComplete });
    fireEvent.click(getByText('COMMIT TO THE LIBER ▸'));
    expect(onComplete).not.toHaveBeenCalled();
    expect(getByText('Hero not yet named')).toBeTruthy();
  });
});

describe('picks reuse the wizard mutations', () => {
  it('choosing a career reseeds its auto-granted skills', () => {
    const c = at(hero(), 'career');
    const car: any = (DS_CAREERS as any[]).find(x => parseCareerSkills(x).auto.length > 0);
    const { getByText, latest } = renderCreator(c);
    fireEvent.click(getByText(car.name));
    expect(latest().career.id).toBe(car.id);
    expect(latest().career.skills).toEqual(parseCareerSkills(car).auto);
  });

  it('changing the subclass prunes an out-of-pool kit (Fury)', () => {
    const c = at(buildValidCharacter({ cls: 'fury', subclass: 'stormwight' }), 'class');
    c.kit = { id: 'boren' };
    const { getAllByText, latest } = renderCreator(c);
    fireEvent.click(getAllByText('Berserker')[0]);
    expect(latest().cclass.subclass).toBe('berserker');
    expect(latest().kit.id).toBeNull();
  });

  it('characteristics are a point-buy: −/+ move a score, fixed scores have no steppers', () => {
    const c = at(buildValidCharacter({ cls: 'fury' }), 'class');
    const { getByLabelText, queryByLabelText, latest } = renderCreator(c);
    const before = latest().cclass.characteristics.Reason;
    fireEvent.click(getByLabelText('Lower Reason'));
    expect(latest().cclass.characteristics.Reason).toBe(before - 1);
    fireEvent.click(getByLabelText('Raise Reason'));
    expect(latest().cclass.characteristics.Reason).toBe(before);
    expect(queryByLabelText('Raise Might')).toBeNull(); // Fury's Might is fixed
  });

  it('choosing a class poster selects it', () => {
    const { container, latest } = renderCreator(at(hero(), 'class'));
    const poster = [...container.querySelectorAll('.poster-card')].find(p => p.querySelector('.pc-name')!.textContent === 'Shadow')!;
    fireEvent.click(poster);
    expect(latest().cclass.id).toBe('shadow');
    expect(container.querySelector('.cr-right .dp-title')!.textContent).toBe('Shadow');
    expect(container.querySelector('.cr-right img')).toBeNull(); // the art is on the poster only
  });

  it('Skills step: a devil picks the Silver Tongue skill there', () => {
    const c = at(hero(), 'skills');
    c.ancestry.id = 'devil';
    const { container, latest } = renderCreator(c);
    const sec = container.querySelector('[id="cr-slot-sig:Silver Tongue"]')!;
    expect(sec).not.toBeNull();
    fireEvent.click(within(sec as HTMLElement).getByText('Lie'));
    expect(latest().ancestry.sigSkills['Silver Tongue']).toEqual(['Lie']);
  });

  it('source steps show the informational box, not skill pickers', () => {
    const c = at(hero(), 'ancestry');
    c.ancestry.id = 'devil';
    const { container } = renderCreator(c);
    const box = container.querySelector('.cr-infobox')!;
    expect(box.textContent).toContain('Skills: 1');
    expect(box.querySelector('button')).toBeNull(); // counts only, no link
    expect(container.querySelector('.skill-chip')).toBeNull();
  });
});

describe('detail panel', () => {
  it('hovering previews after a beat, leaving reverts, clicking pins', () => {
    vi.useFakeTimers();
    const { getByText, container } = renderCreator(at(hero(), 'ancestry'));
    const panel = () => container.querySelector('.cr-right .dp-title')!.textContent;
    const intro = panel();
    const devil = getByText('Devil').closest('button')!;
    fireEvent.pointerEnter(devil);
    expect(panel()).toBe(intro);
    act(() => { vi.advanceTimersByTime(70); });
    expect(panel()).toBe('Devil');
    fireEvent.pointerLeave(devil);
    act(() => { vi.advanceTimersByTime(130); });
    expect(panel()).toBe(intro);
    fireEvent.click(devil);
    expect(panel()).toBe('Devil');
  });

  it('the drawer opens from "details ▸", closes on Escape and returns focus', () => {
    vi.useFakeTimers();
    const c = at(buildValidCharacter(), 'class');
    const { container } = renderCreator(c);
    const btn = container.querySelector('#cr-class .cr-sec-details') as HTMLButtonElement;
    btn.focus();
    fireEvent.click(btn);
    const aside = container.querySelector('.cr-right')!;
    expect(aside.classList.contains('open')).toBe(true);
    expect(aside.getAttribute('role')).toBe('dialog');
    expect(document.activeElement).toBe(aside.querySelector('.dp-head button'));
    fireEvent.keyDown(document, { key: 'Escape' });
    act(() => { vi.advanceTimersByTime(5); });
    expect(aside.classList.contains('open')).toBe(false);
    expect(document.activeElement).toBe(btn);
  });
});

describe('resizable sidebars', () => {
  // This jsdom runs without Web Storage; give the widths a Map-backed store.
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  // The handles cap a sidebar at a share of the viewport; test at a desktop width.
  const realWidth = window.innerWidth;
  beforeEach(() => { Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 }); });
  afterEach(() => { Object.defineProperty(window, 'innerWidth', { configurable: true, value: realWidth }); });

  it('arrow keys widen a sidebar, persist it, and Enter resets it', () => {
    const { container, getByRole } = renderCreator(hero());
    const shell = container.querySelector('.cr') as HTMLElement;
    const handle = getByRole('separator', { name: 'Resize details' });
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(shell.style.getPropertyValue('--cr-right')).toBe('456px'); // 440 default + 16
    expect(JSON.parse(localStorage.getItem('lh:creator:panes')!)).toEqual({ right: 456 });
    fireEvent.keyDown(handle, { key: 'Enter' });
    expect(shell.style.getPropertyValue('--cr-right')).toBe('');
  });

  it('a stored width is applied on open, clamped to its limits', () => {
    localStorage.setItem('lh:creator:panes', JSON.stringify({ left: 9999 }));
    const { container } = renderCreator(hero());
    expect((container.querySelector('.cr') as HTMLElement).style.getPropertyValue('--cr-left')).toBe('420px');
  });
});
