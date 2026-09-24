// Joining a campaign by sigil mid-session. The boot load never saw this table,
// so the join must fetch the party (members' profiles + bound heroes) itself —
// otherwise the campaign page shows nobody until a reload.
// Scaffolding cloned from deep-link.test.tsx.
import { describe, it, expect, vi, afterEach, beforeEach, beforeAll } from 'vitest';
import { render, cleanup, waitFor, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { DS_ANCESTRIES, DS_CAREERS, DS_CLASSES, DS_KITS } from '../data.jsx';

const mockDS = vi.hoisted(() => {
  const noopUnsub = () => {};
  return {
    K: { session: 'test-session' },
    PROVIDERS: {
      discord: { label: 'Discord', mark: 'D' },
      google: { label: 'Google', mark: 'G' },
    },
    authUser: null as any,
    store: { profiles: [] as any[], characters: [] as any[], campaigns: [] as any[] },
    initialsOf: (name: string) => (name || '?').slice(0, 2).toUpperCase(),
    avatarColors: () => ({ bg: '#222', ink: '#eee', ring: '#444' }),
    onAuthChange: vi.fn((cb: (u: any) => void) => {
      setTimeout(() => cb(mockDS.authUser), 0);
      return noopUnsub;
    }),
    loadAll: vi.fn(async () => mockDS.store),
    subscribeCharacters: vi.fn(() => noopUnsub),
    signInWithProvider: vi.fn(),
    signOut: vi.fn(),
    setDisplayName: vi.fn(),
    upsertCharacter: vi.fn(async () => {}),
    upsertCharacterKeepalive: vi.fn(),
    deleteCharacter: vi.fn(async () => {}),
    createCampaign: vi.fn(),
    joinByCode: vi.fn(),
    loadCampaignParty: vi.fn(),
    updateCampaign: vi.fn(),
    regenInviteCode: vi.fn(),
    leaveCampaign: vi.fn(),
    removeMember: vi.fn(),
    releaseHero: vi.fn(async () => {}),
    disbandCampaign: vi.fn(),
  };
});

vi.mock('../backend.jsx', () => ({ DS: mockDS }));

const lsStore = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => (lsStore.has(k) ? lsStore.get(k)! : null),
  setItem: (k: string, v: string) => void lsStore.set(k, String(v)),
  removeItem: (k: string) => void lsStore.delete(k),
  clear: () => lsStore.clear(),
});

let App: any;
let newCharacter: any;
beforeAll(async () => {
  vi.resetModules();
  ({ App, newCharacter } = await import('../app.jsx'));
});

const ME = {
  id: 'u-me', email: 'pat@example.com', displayName: 'Player Pat', provider: 'discord',
  avatar: null, isAdmin: false, isAllowed: true, displayNameSet: true,
};
const GM = { id: 'u-gm', displayName: 'Director Dee', provider: 'discord', avatar: null };

function gmHero() {
  const c = newCharacter(GM.id, 'g1');
  c.id = 'c-gm';
  c.ancestry.id = DS_ANCESTRIES[0].id;
  c.career.id = DS_CAREERS[0].id;
  c.cclass.id = DS_CLASSES[0].id;
  c.kit.id = DS_KITS[0].id;
  c.identity.name = 'Dee’s Champion';
  c.name = 'Dee’s Champion';
  c.status = 'complete';
  return c;
}
const joinedCampaign = { id: 'g1', name: 'The Rift', description: '', gmId: GM.id, inviteCode: 'ABC-DEF', createdAt: 1, memberIds: [GM.id, ME.id] };

afterEach(() => cleanup());
beforeEach(() => {
  lsStore.clear();
  window.history.replaceState(null, '', '/');
  mockDS.authUser = { ...ME };
  // Pat has no heroes and is in no campaign yet.
  mockDS.store = { profiles: [ME], characters: [], campaigns: [] };
  mockDS.joinByCode.mockReset();
  mockDS.loadCampaignParty.mockReset();
});

async function joinBySigil(container: HTMLElement) {
  window.location.hash = '#/campaigns';
  render(<App />);
  await waitFor(() => expect(container.querySelector('.cmp-page-head')).not.toBeNull());
  fireEvent.click(screen.getByText('Join by Sigil'));
  fireEvent.change(screen.getByPlaceholderText('ABC-DEF'), { target: { value: 'ABC-DEF' } });
  fireEvent.click(screen.getByText('JOIN THE TABLE ▸'));
  await waitFor(() => expect(container.querySelector('.cmp-detail-head')).not.toBeNull());
}

describe('App — joining a campaign by sigil', () => {
  it('shows the Director and their hero immediately, without a reload', async () => {
    mockDS.joinByCode.mockResolvedValue(joinedCampaign);
    mockDS.loadCampaignParty.mockResolvedValue({
      memberIds: [GM.id, ME.id],
      characters: [gmHero()],
      profiles: [GM, { id: ME.id, displayName: ME.displayName, provider: 'discord', avatar: null }],
    });
    await joinBySigil(document.body);
    expect(mockDS.loadCampaignParty).toHaveBeenCalledWith('g1');
    expect(mockDS.loadAll).toHaveBeenCalledTimes(1); // no full reload needed
    const text = document.body.textContent!;
    expect(text).toContain('Director Dee');
    expect(text).toContain('Dee’s Champion');
    expect(text).toContain('👁 View'); // another player's hero is read-only for Pat
  });

  it('a failed party fetch still lands on the campaign page with placeholder seats', async () => {
    mockDS.joinByCode.mockResolvedValue(joinedCampaign);
    mockDS.loadCampaignParty.mockRejectedValue(new Error('offline'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await joinBySigil(document.body);
    const text = document.body.textContent!;
    expect(text).toContain('The Rift');
    expect(text).toContain('Fellow member');
    err.mockRestore();
  });
});
