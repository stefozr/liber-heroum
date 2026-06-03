// Campaign authorization regression. A hero may be edited only by its owner, the director
// of its campaign, or a global admin — everyone else (incl. fellow party members) may only
// VIEW. This mirrors the characters_update RLS policy and gates the client open/edit path
// in app.jsx (openCharacter → read-only PlayView for non-editors). Was the bug where any
// party member could open and "edit" another player's sheet (silently rejected by RLS).
import { describe, it, expect } from 'vitest';
import { canEditCharacterFor } from '../app.jsx';

const me = { id: 'u-me', isAdmin: false };
const admin = { id: 'u-admin', isAdmin: true };
const campaigns = [{ id: 'camp-1', gmId: 'u-me' }, { id: 'camp-2', gmId: 'u-other' }];

describe('canEditCharacterFor', () => {
  it('owner can edit their own hero', () => {
    expect(canEditCharacterFor({ ownerId: 'u-me', campaignId: null }, me, campaigns)).toBe(true);
  });

  it('a different player CANNOT edit someone else’s hero (the reported bug)', () => {
    const theirHero = { ownerId: 'u-them', campaignId: 'camp-1' };
    const them = { id: 'u-them', isAdmin: false };
    // u-them is a plain player in camp-1 (gmId is u-me) → may not edit u-me's hero…
    expect(canEditCharacterFor({ ownerId: 'u-me', campaignId: 'camp-1' }, them, campaigns)).toBe(false);
    // …and u-me (director of camp-1) viewing it is a separate case below.
    expect(canEditCharacterFor(theirHero, { id: 'u-someone', isAdmin: false }, campaigns)).toBe(false);
  });

  it('the director of the hero’s campaign can edit it', () => {
    // u-me is gm of camp-1; a hero owned by another player but in camp-1 is editable by u-me.
    expect(canEditCharacterFor({ ownerId: 'u-them', campaignId: 'camp-1' }, me, campaigns)).toBe(true);
  });

  it('a director of a DIFFERENT campaign cannot edit', () => {
    expect(canEditCharacterFor({ ownerId: 'u-them', campaignId: 'camp-2' }, me, campaigns)).toBe(false);
  });

  it('a global admin can edit any hero', () => {
    expect(canEditCharacterFor({ ownerId: 'u-them', campaignId: 'camp-2' }, admin, campaigns)).toBe(true);
  });

  it('returns false with no user or no character', () => {
    expect(canEditCharacterFor(null, me, campaigns)).toBe(false);
    expect(canEditCharacterFor({ ownerId: 'u-me' }, null, campaigns)).toBe(false);
  });
});
