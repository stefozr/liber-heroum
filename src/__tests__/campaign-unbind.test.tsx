// Removing a hero from a campaign. Two surfaces: the campaign page's party card
// grows a ✕ (owner or Director only) that confirms before calling onAssign(id,
// null); the roster's "move" dialog hands "Remove from campaign" to a confirm
// step instead of acting on the spot. Both end in the same handler.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { CampaignDetail, PartyHeroCard } from '../campaigns.jsx';
import { RosterScreen } from '../roster.jsx';
import { newCharacter } from '../app.jsx';

afterEach(() => cleanup());

const GM = { id: 'u-gm', displayName: 'Director Dee' };
const ME = { id: 'u-me', displayName: 'Player Pat' };
const THEM = { id: 'u-them', displayName: 'Player Quinn' };
const users = [GM, ME, THEM];
const campaign = {
  id: 'camp-1', name: 'The Long Table', description: '', gmId: GM.id,
  inviteCode: 'ABCD-EFGH', createdAt: 0, memberIds: [GM.id, ME.id, THEM.id],
};

function hero(id: string, ownerId: string, name: string, campaignId: string | null = campaign.id) {
  const c: any = newCharacter(ownerId, campaignId);
  c.id = id;
  c.identity.name = name;
  c.name = name;
  return c;
}

const noop = () => {};

function renderDetail(user: typeof ME, chars: any[], onAssign = vi.fn()) {
  render(
    <CampaignDetail
      campaign={campaign} user={user} users={users} chars={chars}
      onOpenHero={noop} onAssign={onAssign} onCreateHero={noop} onUpdate={noop} onRegen={noop}
      onRemoveMember={noop} onLeave={noop} onDelete={noop} onBack={noop}
    />
  );
  return onAssign;
}

describe('CampaignDetail — remove a hero from the campaign', () => {
  const mine = () => hero('c-mine', ME.id, 'Mine');
  const theirs = () => hero('c-theirs', THEM.id, 'Theirs');

  it('a player sees the ✕ on their own hero only', () => {
    renderDetail(ME, [mine(), theirs()]);
    expect(screen.getByLabelText('Remove Mine from campaign')).toBeInTheDocument();
    expect(screen.queryByLabelText('Remove Theirs from campaign')).toBeNull();
  });

  it('confirming sends onAssign(id, null); keeping sends nothing', () => {
    const onAssign = renderDetail(ME, [mine(), theirs()]);
    fireEvent.click(screen.getByLabelText('Remove Mine from campaign'));
    expect(screen.getByText('Remove from Campaign?')).toBeInTheDocument();
    expect(screen.getByText(/stays yours/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('◂ KEEP'));
    expect(onAssign).not.toHaveBeenCalled();
    expect(screen.queryByText('Remove from Campaign?')).toBeNull();

    fireEvent.click(screen.getByLabelText('Remove Mine from campaign'));
    fireEvent.click(screen.getByText('REMOVE'));
    expect(onAssign).toHaveBeenCalledTimes(1);
    expect(onAssign).toHaveBeenCalledWith('c-mine', null);
  });

  it('the Director may remove another player’s hero', () => {
    const onAssign = renderDetail(GM as any, [mine(), theirs()]);
    fireEvent.click(screen.getByLabelText('Remove Theirs from campaign'));
    expect(screen.getByText(/stays with its owner/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('REMOVE'));
    expect(onAssign).toHaveBeenCalledWith('c-theirs', null);
  });

  it('PartyHeroCard without onRemove renders no ✕ (admin screen)', () => {
    render(<PartyHeroCard character={mine()} canEdit onOpen={noop} editLabel="Edit · Admin" />);
    expect(screen.queryByTitle('Remove from campaign')).toBeNull();
    expect(screen.getByText('Mine')).toBeInTheDocument();
  });
});

describe('RosterScreen — remove from the move dialog confirms first', () => {
  it('Remove from campaign → confirm → onAssign(id, null) once', () => {
    const onAssign = vi.fn();
    const c = hero('c-mine', ME.id, 'Mine');
    render(
      <RosterScreen
        characters={[c]} campaigns={[campaign]} userCampaigns={[campaign]}
        onOpen={noop} onCreate={noop} onDelete={noop} onAssign={onAssign} onSetVisibility={noop}
      />
    );
    fireEvent.click(screen.getByText('⚚ move'));
    expect(screen.getByText('Move or Remove')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Remove from campaign'));
    // The assign dialog closes and the confirm takes its place — Modal does not stack.
    expect(screen.queryByText('Move or Remove')).toBeNull();
    expect(screen.getByText('Remove from Campaign?')).toBeInTheDocument();
    expect(onAssign).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'REMOVE' }));
    expect(onAssign).toHaveBeenCalledTimes(1);
    expect(onAssign).toHaveBeenCalledWith('c-mine', null);
    expect(screen.queryByText('Remove from Campaign?')).toBeNull();
  });
});
