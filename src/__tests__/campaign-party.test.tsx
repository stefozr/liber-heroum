// The Party on the campaign page: every member's bound heroes are listed for
// every member, and a hero is never silently dropped — a missing profile or an
// owner who has left the table gets a placeholder seat rather than hiding cards
// the "N Heroes" pill still counts. Read-only cards say so.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { CampaignDetail } from '../campaigns.jsx';
import { newCharacter } from '../app.jsx';

afterEach(() => cleanup());

const GM = { id: 'u-gm', displayName: 'Director Dee' };
const ME = { id: 'u-me', displayName: 'Player Pat' };
const THEM = { id: 'u-them', displayName: 'Player Quinn' };
const campaign = {
  id: 'camp-1', name: 'The Long Table', description: '', gmId: GM.id,
  inviteCode: 'ABCD-EFGH', createdAt: 0, memberIds: [GM.id, ME.id, THEM.id],
};

function hero(id: string, ownerId: string, name: string, over: any = {}) {
  const c: any = newCharacter(ownerId, campaign.id);
  c.id = id;
  c.identity.name = name;
  c.name = name;
  c.status = 'complete';
  return Object.assign(c, over);
}

const noop = () => {};

function renderDetail(user: any, chars: any[], users: any[] = [GM, ME, THEM], camp: any = campaign) {
  const onOpenHero = vi.fn();
  render(
    <CampaignDetail
      campaign={camp} user={user} users={users} chars={chars}
      onOpenHero={onOpenHero} onAssign={noop} onCreateHero={noop} onUpdate={noop} onRegen={noop}
      onRemoveMember={noop} onLeave={noop} onDelete={noop} onBack={noop}
    />
  );
  return onOpenHero;
}

describe('CampaignDetail — a player sees the party', () => {
  it('lists every member’s heroes and opens another player’s hero on click', () => {
    const onOpenHero = renderDetail(ME, [
      hero('c-gm', GM.id, 'Dee’s Hero'),
      hero('c-mine', ME.id, 'Mine'),
      hero('c-theirs', THEM.id, 'Theirs'),
    ]);
    expect(screen.getByText('Dee’s Hero')).toBeInTheDocument();
    expect(screen.getByText('Mine')).toBeInTheDocument();
    expect(screen.getByText('Theirs')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Theirs'));
    expect(onOpenHero).toHaveBeenCalledWith('c-theirs');
  });

  it('marks cards: Edit for mine, View for a private hero of another player, Edit · Public for a public one', () => {
    renderDetail(ME, [
      hero('c-mine', ME.id, 'Mine'),
      hero('c-theirs', THEM.id, 'Theirs'),
      hero('c-shared', THEM.id, 'Shared', { visibility: 'public' }),
    ]);
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('👁 View')).toBeInTheDocument();
    expect(screen.getByText('Edit · Public')).toBeInTheDocument();
  });

  it('a member whose profile has not loaded still gets a seat and keeps their heroes visible', () => {
    // Mirrors the moment right after joining by code, before profiles arrive.
    const onOpenHero = renderDetail(ME, [hero('c-theirs', THEM.id, 'Theirs')], [GM, ME]);
    expect(screen.getByText('Theirs')).toBeInTheDocument();
    expect(screen.getAllByText(/Fellow member/).length).toBeGreaterThan(0);
    // The member strip tallies them too, so its count matches the card groups.
    expect(screen.getByText('3 Members')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Theirs'));
    expect(onOpenHero).toHaveBeenCalledWith('c-theirs');
  });

  it('a hero whose owner is no longer a member is still listed, not counted-but-hidden', () => {
    const shrunk = { ...campaign, memberIds: [GM.id, ME.id] };
    renderDetail(ME, [hero('c-mine', ME.id, 'Mine'), hero('c-gone', THEM.id, 'Left Behind')], [GM, ME, THEM], shrunk);
    expect(screen.getByText('2 Heroes')).toBeInTheDocument();
    expect(screen.getByText('Left Behind')).toBeInTheDocument();
    expect(screen.getByText('Player Quinn')).toBeInTheDocument();
  });
});
