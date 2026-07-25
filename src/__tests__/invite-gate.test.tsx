// Email-whitelist gate. Server-side enforcement lives in migration.sql (RLS +
// is_allowed()); these tests cover the client half: the NotInvitedScreen itself
// and the app.jsx gate-ladder rung that shows it for isAllowed:false users —
// including that no data loading / realtime subscription happens for them.
import { describe, it, expect, vi, afterEach, beforeEach, beforeAll } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';

const mockDS = vi.hoisted(() => {
  const noopUnsub = () => {};
  return {
    K: { session: 'test-session' },
    PROVIDERS: {
      discord: { label: 'Discord', mark: 'D' },
      google: { label: 'Google', mark: 'G' },
    },
    // The test drives auth by swapping this user before render.
    authUser: null as any,
    initialsOf: (name: string) => (name || '?').slice(0, 2).toUpperCase(),
    avatarColors: () => ({ bg: '#222', ink: '#eee', ring: '#444' }),
    onAuthChange: vi.fn((cb: (u: any) => void) => {
      // Mirror the real backend: deliver the profile async, outside the callback.
      setTimeout(() => cb(mockDS.authUser), 0);
      return noopUnsub;
    }),
    loadAll: vi.fn(async () => ({ profiles: [], characters: [], campaigns: [] })),
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

// No other test mounts the full App; Node's experimental localStorage global is
// unavailable without --localstorage-file, so back the App's view persistence
// with an in-memory stub.
const lsStore = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => (lsStore.has(k) ? lsStore.get(k)! : null),
  setItem: (k: string, v: string) => void lsStore.set(k, String(v)),
  removeItem: (k: string) => void lsStore.delete(k),
  clear: () => lsStore.clear(),
});

// setup.ts (via levelup.jsx) already loaded the real app.jsx/backend.jsx into the
// module cache before this file's vi.mock could register, so static imports here
// would get the unmocked graph. Reset and re-import dynamically instead.
let NotInvitedScreen: any;
let App: any;
beforeAll(async () => {
  vi.resetModules();
  ({ NotInvitedScreen } = await import('../auth.jsx'));
  ({ App } = await import('../app.jsx'));
});

const baseUser = {
  id: 'u-test',
  email: 'friend@example.com',
  displayName: 'Stefan',
  provider: 'discord',
  avatar: null,
  isAdmin: false,
};

afterEach(() => cleanup());
beforeEach(() => {
  mockDS.authUser = null;
  mockDS.loadAll.mockClear();
  mockDS.subscribeCharacters.mockClear();
});

describe('NotInvitedScreen', () => {
  it('greets the user by name/email and signs out on click', () => {
    const onSignOut = vi.fn();
    const { container } = render(<NotInvitedScreen user={baseUser} onSignOut={onSignOut} />);

    expect(container.textContent).toContain('Invitation Required');
    expect(container.textContent).toContain('Stefan');
    expect(container.textContent).toContain('friend@example.com');

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });
});

describe('App gate ladder', () => {
  it('shows the invite screen for a non-whitelisted user and loads no data', async () => {
    mockDS.authUser = { ...baseUser, isAllowed: false, displayNameSet: true };
    render(<App />);

    expect(await screen.findByText('Invitation Required')).toBeInTheDocument();
    // Blocked users never reach the name prompt or the app chrome…
    expect(screen.queryByText(/by what name/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/my heroes/i)).not.toBeInTheDocument();
    // …and no data queries or realtime subscription fire for them.
    expect(mockDS.loadAll).not.toHaveBeenCalled();
    expect(mockDS.subscribeCharacters).not.toHaveBeenCalled();
  });

  it('proceeds past the rung to the display-name prompt for a whitelisted user', async () => {
    mockDS.authUser = { ...baseUser, isAllowed: true, displayNameSet: false };
    render(<App />);

    expect(await screen.findByText(/by what name shall you be known/i)).toBeInTheDocument();
    expect(screen.queryByText('Invitation Required')).not.toBeInTheDocument();
    expect(mockDS.loadAll).toHaveBeenCalled();
  });
});
