import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { PlayView } from '../play.jsx';
import * as foundry from '../foundry-export.js';
import { buildValidCharacter } from './helpers/factories';

const core = JSON.parse(readFileSync('public/foundry-items.json', 'utf8'));
const summoner = JSON.parse(readFileSync('public/foundry-summoner-items.json', 'utf8'));
const combined = foundry.mergeOfficialIndices(core, summoner);
const noop = () => {};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mount(classId: string, onError = vi.fn()) {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: noop, removeItem: noop });
  const c: any = buildValidCharacter({ cls: classId });
  c.identity.name = 'Export Test';
  return { onError, view: render(<PlayView character={c} update={noop} onExit={noop} onError={onError} />) };
}

describe('Foundry export action', () => {
  it.each(['summoner', 'fury'])('%s requests the matching compendium index and downloads its mapped hero', async classId => {
    const loader = vi.spyOn(foundry, 'loadOfficialIndex').mockResolvedValue(classId === 'summoner' ? combined : core);
    const download = vi.spyOn(foundry, 'downloadJson').mockImplementation(noop);
    const { view, onError } = mount(classId);
    fireEvent.click(view.getByRole('button', { name: 'EXPORT', exact: true }));
    await waitFor(() => expect(download).toHaveBeenCalledOnce());
    expect(loader).toHaveBeenCalledWith({ includeSummoner: classId === 'summoner' });
    const [hero, filename]: any = download.mock.calls[0];
    expect(filename).toBe('export-test-foundryvtt.json');
    const classItem = hero.items.find((i: any) => i.type === 'class');
    expect(classItem._stats.compendiumSource).toMatch(classId === 'summoner'
      ? /^Compendium\.draw-steel-summoner-class\./ : /^Compendium\.draw-steel\./);
    expect(onError).not.toHaveBeenCalled();
  });

  it('does not download an unmapped Summoner when its required index fails', async () => {
    vi.spyOn(foundry, 'loadOfficialIndex').mockResolvedValue(null);
    const download = vi.spyOn(foundry, 'downloadJson').mockImplementation(noop);
    const { view, onError } = mount('summoner');
    fireEvent.click(view.getByRole('button', { name: 'EXPORT', exact: true }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith('EXPORT ABORTED — OFFICIAL COMPENDIUM FAILED TO LOAD, RETRY'));
    expect(download).not.toHaveBeenCalled();
  });
});
