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
});
