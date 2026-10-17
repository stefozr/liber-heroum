// Perk data integrity — every perk in the app must be a real Draw Steel perk
// (i.e. resolve against the official compendium index), and every career's
// quick-build perk must exist in the group that career grants.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { PERKS, perkDef } from '../wizard/helpers.js';
import { DS_CAREERS } from '../data/careers.js';
import { dsid } from '../foundry-export.js';

describe('PERKS data', () => {
  it('has the six official groups', () => {
    expect(Object.keys(PERKS).sort()).toEqual(
      ['Crafting', 'Exploration', 'Interpersonal', 'Intrigue', 'Lore', 'Supernatural']);
  });

  it('every career quickPerk exists in that career’s perk group', () => {
    for (const car of DS_CAREERS) {
      if (!car.quickPerk) continue;
      const group = PERKS[car.perk] || [];
      expect(group.map(p => p.name), `${car.name} quickPerk '${car.quickPerk}' in ${car.perk}`)
        .toContain(car.quickPerk);
    }
  });

  // Perks used as an action carry a same-named ability card (the sheet shows the
  // card in place of the prose, keyed on the shared name).
  const ACTION_PERKS = ['Arcane Trick', 'Creature Sense', 'Friend Catapult', 'Gum Up The Works',
    'Invisible Force', 'I’ve Got You', 'Psychic Whisper'];
  it('the perks used as an action carry their own same-named ability card', () => {
    const all = Object.values(PERKS).flat() as Array<{ name: string; abilities?: any[] }>;
    expect(all.filter(p => p.abilities?.length).map(p => p.name).sort()).toEqual([...ACTION_PERKS].sort());
    for (const p of all) {
      for (const a of p.abilities || []) {
        expect(a.name, `${p.name} card name`).toBe(p.name);
        expect(typeof a.type, `${p.name} card type`).toBe('string');
        expect(typeof a.effect, `${p.name} card effect`).toBe('string');
      }
    }
    expect(perkDef('I’ve Got You')?.abilities?.[0].type).toBe('Free triggered action');
    expect(perkDef('Nope')).toBeNull();
  });

  const INDEX_PATH = 'public/foundry-items.json';
  it.skipIf(!existsSync(INDEX_PATH))('cards mirror the official abilities the compendium perks grant', () => {
    const index = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
    for (const [group, perks] of Object.entries(PERKS)) {
      for (const p of perks as Array<{ name: string; abilities?: any[] }>) {
        const doc = index.items[`perk:${dsid(p.name)}`];
        const grants = Object.values(doc?.system?.advancements || {}).some((a: any) => a.type === 'itemGrant');
        // Every perk whose official doc grants an ability has a card, and that card names an official ability.
        if (grants) {
          expect(p.abilities?.length, `${group}: ${p.name} grants an ability`).toBeGreaterThan(0);
          for (const a of p.abilities!) expect(index.items[`ability:${dsid(a.name)}`], `ability:${dsid(a.name)}`).toBeTruthy();
        }
      }
    }
  });

  it.skipIf(!existsSync(INDEX_PATH))('every perk resolves against the official compendium', () => {
    const index = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
    const missing: string[] = [];
    for (const [group, perks] of Object.entries(PERKS)) {
      for (const p of perks as Array<{ name: string }>) {
        if (!index.items[`perk:${dsid(p.name)}`]) missing.push(`${group}: ${p.name}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
