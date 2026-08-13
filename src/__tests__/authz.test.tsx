// Campaign authorization regression. A hero may be edited only by its owner, the director
// of its campaign, a global admin — or, when the hero is marked public, any member of its
// campaign. Everyone else (incl. fellow party members on a PRIVATE hero) may only VIEW.
// This mirrors the characters_update RLS policy and gates the client open/edit path in
// app.jsx (openCharacter → read-only PlayView for non-editors). Was the bug where any
// party member could open and "edit" another player's sheet (silently rejected by RLS).
import { describe, it, expect } from 'vitest';
import { canEditCharacterFor, canSetVisibilityFor } from '../app.jsx';

const me = { id: 'u-me', isAdmin: false };
const admin = { id: 'u-admin', isAdmin: true };
const campaigns = [
  { id: 'camp-1', gmId: 'u-me', memberIds: ['u-me', 'u-them'] },
  { id: 'camp-2', gmId: 'u-other', memberIds: ['u-other', 'u-them'] },
];

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

  describe('public heroes', () => {
    const them = { id: 'u-them', isAdmin: false };

    it('a fellow campaign member CAN edit a public hero', () => {
      expect(canEditCharacterFor({ ownerId: 'u-other', campaignId: 'camp-2', visibility: 'public' }, them, campaigns)).toBe(true);
    });

    it('a fellow campaign member still CANNOT edit a private hero (regression)', () => {
      expect(canEditCharacterFor({ ownerId: 'u-other', campaignId: 'camp-2', visibility: 'private' }, them, campaigns)).toBe(false);
      // absent visibility (pre-migration blob) means private
      expect(canEditCharacterFor({ ownerId: 'u-other', campaignId: 'camp-2' }, them, campaigns)).toBe(false);
    });

    it('a non-member cannot edit a public hero', () => {
      // u-me is not a member of camp-2 (and not its gm)
      expect(canEditCharacterFor({ ownerId: 'u-other', campaignId: 'camp-2', visibility: 'public' }, me, campaigns)).toBe(false);
    });

    it('public without a campaign grants nothing', () => {
      expect(canEditCharacterFor({ ownerId: 'u-other', campaignId: null, visibility: 'public' }, them, campaigns)).toBe(false);
    });
  });
});

// Flipping private/public (and deleting) is owner-or-admin only — deliberately NOT the
// Director. Mirrors the characters_delete RLS policy + protect_character_columns trigger.
describe('canSetVisibilityFor', () => {
  it('owner can flip visibility', () => {
    expect(canSetVisibilityFor({ ownerId: 'u-me', campaignId: 'camp-1' }, me)).toBe(true);
  });

  it('a global admin can flip visibility', () => {
    expect(canSetVisibilityFor({ ownerId: 'u-them', campaignId: 'camp-1' }, admin)).toBe(true);
  });

  it('the Director cannot flip visibility on someone else’s hero', () => {
    // u-me is gm of camp-1 but not the owner
    expect(canSetVisibilityFor({ ownerId: 'u-them', campaignId: 'camp-1' }, me)).toBe(false);
  });

  it('a fellow member cannot flip visibility, even on a public hero', () => {
    expect(canSetVisibilityFor({ ownerId: 'u-me', campaignId: 'camp-1', visibility: 'public' }, { id: 'u-them', isAdmin: false })).toBe(false);
  });

  it('returns false with no user or no character', () => {
    expect(canSetVisibilityFor(null, me)).toBe(false);
    expect(canSetVisibilityFor({ ownerId: 'u-me' }, null)).toBe(false);
  });
});
