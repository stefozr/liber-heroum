// Hash deep links (audit H17). Pure parse/format tests plus App-mount cases:
// a '#/'-prefixed hash captured at boot resolves — after data loads — to the
// exact screen, re-deriving wizard-vs-play through the openCharacter rule, and
// never touching non-app hashes (the OAuth callback fragment).
// Scaffolding cloned from invite-gate.test.tsx (the only other App-mounting test).
import { describe, it, expect, vi, afterEach, beforeEach, beforeAll } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
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
    updateCampaign: vi.fn(),
    regenInviteCode: vi.fn(),
    leaveCampaign: vi.fn(),
    removeMember: vi.fn(),
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
let parseHash: any;
let navToHash: any;
let newCharacter: any;
beforeAll(async () => {
  vi.resetModules();
  ({ App, parseHash, navToHash, newCharacter } = await import('../app.jsx'));
});

const baseUser = {
  id: 'u-test',
  email: 'friend@example.com',
  displayName: 'Stefan',
  provider: 'discord',
  avatar: null,
  isAdmin: false,
  isAllowed: true,
  displayNameSet: true,
};

function hero(over: any = {}) {
  const c = newCharacter('u-test', null);
  c.id = 'c1';
  c.ancestry.id = DS_ANCESTRIES[0].id;
  c.career.id = DS_CAREERS[0].id;
  c.cclass.id = DS_CLASSES[0].id;
  c.kit.id = DS_KITS[0].id;
  c.identity.name = 'Deep Linked';
  c.name = 'Deep Linked';
  c.status = 'complete';
  return Object.assign(c, over);
}
const campaign = { id: 'g1', name: 'The Rift', description: '', gmId: 'u-test', inviteCode: 'ABC-DEF', createdAt: 1, memberIds: ['u-test'] };

afterEach(() => cleanup());
beforeEach(() => {
  lsStore.clear();
  window.history.replaceState(null, '', '/');
  mockDS.authUser = { ...baseUser };
  mockDS.store = { profiles: [baseUser], characters: [hero()], campaigns: [campaign] };
  mockDS.loadAll.mockClear();
});

describe('parseHash / navToHash', () => {
  it('parses app hashes and rejects everything else', () => {
    expect(parseHash('#/')).toEqual({ view: 'roster' });
    expect(parseHash('#/campaigns')).toEqual({ view: 'campaigns' });
    expect(parseHash('#/admin')).toEqual({ view: 'admin' });
    expect(parseHash('#/hero/abc')).toEqual({ view: 'hero', id: 'abc' });
    expect(parseHash('#/hero/abc/')).toEqual({ view: 'hero', id: 'abc' });
    expect(parseHash('#/campaign/g%201')).toEqual({ view: 'campaign', id: 'g 1' });
    expect(parseHash('#/hero/')).toBeNull();
    expect(parseHash('#/nonsense')).toBeNull();
    expect(parseHash('')).toBeNull();
    expect(parseHash('#access_token=x&token_type=bearer')).toBeNull();
  });

  it('serializes nav state; wizard and play share the hero form', () => {
    expect(navToHash({ view: 'play', activeId: 'a b' })).toBe('#/hero/a%20b');
    expect(navToHash({ view: 'wizard', activeId: 'x' })).toBe('#/hero/x');
    expect(navToHash({ view: 'campaign', activeCampaignId: 'g1' })).toBe('#/campaign/g1');
    expect(navToHash({ view: 'campaigns' })).toBe('#/campaigns');
    expect(navToHash({ view: 'admin' })).toBe('#/admin');
    expect(navToHash({ view: 'roster' })).toBe('#/');
  });
});

describe('App deep-link resolution', () => {
  it('#/hero/<complete> lands on the play sheet', async () => {
    window.location.hash = '#/hero/c1';
    const { container } = render(<App />);
    await waitFor(() => expect(container.querySelector('.play')).not.toBeNull());
    expect(container.textContent).toContain('Deep Linked');
  });

  it('#/hero/<own in-progress> re-derives to the wizard', async () => {
    mockDS.store.characters = [hero({ status: 'in-progress' })];
    window.location.hash = '#/hero/c1';
    const { container } = render(<App />);
    await waitFor(() => expect(container.querySelector('.wiz')).not.toBeNull());
  });

  it('#/hero/nope bounces to the roster with a visible notice', async () => {
    window.location.hash = '#/hero/nope';
    const { container } = render(<App />);
    await waitFor(() => expect(container.textContent).toContain("ISN'T IN YOUR CHRONICLE"));
    expect(container.textContent).toContain('LIBER HEROUM'); // roster masthead
    expect(container.querySelector('.play')).toBeNull();
  });

  it('#/campaign/g1 opens the campaign detail', async () => {
    window.location.hash = '#/campaign/g1';
    const { container } = render(<App />);
    await waitFor(() => expect(container.querySelector('.cmp-detail-head')).not.toBeNull());
    expect(container.textContent).toContain('The Rift');
  });

  it('no hash → remembered LS_VIEW still wins', async () => {
    lsStore.set('test-session/view', 'campaigns');
    const { container } = render(<App />);
    await waitFor(() => expect(container.querySelector('.cmp-page-head')).not.toBeNull());
  });

  it('an OAuth fragment is ignored and boots to the roster', async () => {
    window.location.hash = '#access_token=junk&token_type=bearer';
    const { container } = render(<App />);
    await waitFor(() => expect(container.textContent).toContain('LIBER HEROUM'));
    expect(container.querySelector('.play')).toBeNull();
  });
});
