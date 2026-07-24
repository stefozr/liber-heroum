// Perk data integrity — every perk in the app must be a real Draw Steel perk
// (i.e. resolve against the official compendium index), and every career's
// quick-build perk must exist in the group that career grants.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { PERKS } from '../wizard/helpers.js';
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

  const INDEX_PATH = 'public/foundry-items.json';
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
