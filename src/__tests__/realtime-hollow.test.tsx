// A hollow realtime row (its data blob dropped by Supabase for rows over 1 MiB)
// used to be normalized inside the setCharacters updater, where reading
// c.career.id threw during App's render and blanked the whole app. The app must
// keep the hero it already has, and a hero the store itself holds hollow must
// still render. Scaffolding cloned from campaign-join.test.tsx.
import { describe, it, expect, vi, afterEach, beforeEach, beforeAll } from 'vitest';
import { render, cleanup, waitFor, fireEvent, screen, act } from '@testing-library/react';
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
    onUpsert: null as null | ((row: any) => void),
    initialsOf: (name: string) => (name || '?').slice(0, 2).toUpperCase(),
    avatarColors: () => ({ bg: '#222', ink: '#eee', ring: '#444' }),
    onAuthChange: vi.fn((cb: (u: any) => void) => {
      setTimeout(() => cb(mockDS.authUser), 0);
      return noopUnsub;
    }),
    loadAll: vi.fn(async () => mockDS.store),
    subscribeCharacters: vi.fn((onUpsert: (row: any) => void) => { mockDS.onUpsert = onUpsert; return noopUnsub; }),
    signInWithProvider: vi.fn(),
    signOut: vi.fn(),
    setDisplayName: vi.fn(),
    upsertCharacter: vi.fn(async () => {}),
    upsertCharacterKeepalive: vi.fn(),
    fetchCharacter: vi.fn(async () => null),
    uploadPortrait: vi.fn(async () => 'https://example.test/p.png'),
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

function myHero() {
  const c = newCharacter(ME.id, null);
  c.id = 'c-jack';
  c.ancestry.id = DS_ANCESTRIES[0].id;
  c.career.id = DS_CAREERS[0].id;
  c.cclass.id = DS_CLASSES[0].id;
  c.kit.id = DS_KITS[0].id;
  c.identity.name = 'Jack Crow';
  c.name = 'Jack Crow';
  c.status = 'complete';
  return c;
}
// What hydrateChar yields for a truncated realtime record: column fields only.
const HOLLOW_ROW = { id: 'c-jack', ownerId: ME.id, campaignId: null, status: 'complete', level: 1, visibility: 'private' };

afterEach(() => cleanup());
beforeEach(() => {
  lsStore.clear();
  window.history.replaceState(null, '', '/');
  mockDS.authUser = { ...ME };
  mockDS.onUpsert = null;
});

async function bootRoster() {
  window.location.hash = '#/';
  const { container } = render(<App />);
  await waitFor(() => expect(container.querySelector('.hero-card')).not.toBeNull());
  return container;
}

describe('App — hollow hero rows', () => {
  it('ignores a hollow realtime row and keeps the hero it already has', async () => {
    mockDS.store = { profiles: [ME], characters: [myHero()], campaigns: [] };
    const body = await bootRoster();
    expect(body.textContent).toContain('Jack Crow');
    await waitFor(() => expect(mockDS.onUpsert).not.toBeNull());

    act(() => { mockDS.onUpsert!(HOLLOW_ROW); });

    // Still rendered, still Jack Crow, and still openable.
    expect(body.textContent).toContain('Jack Crow');
    expect(body.textContent).toContain(DS_CLASSES[0].name);
    fireEvent.click(screen.getByLabelText('Open Jack Crow'));
    await waitFor(() => expect(body.querySelector('.hero-card')).toBeNull());
    expect(body.textContent).toContain('Jack Crow');
  });

  it('renders a hero the store itself holds hollow instead of blanking the app', async () => {
    mockDS.store = { profiles: [ME], characters: [HOLLOW_ROW], campaigns: [] };
    const body = await bootRoster();
    expect(body.textContent).toContain('Unnamed Hero');
    fireEvent.click(screen.getByLabelText('Open Unnamed Hero'));
    await waitFor(() => expect(body.querySelector('.hero-card')).toBeNull());
  });
});
