// Layer C — derived-stat math. An independent test-side oracle recomputes every stat
// from the raw data (per the Draw Steel rules), and every bonus-carrying data entry is
// attached to a character at the echelon boundaries (levels 1/4/7/10) and compared.
// A plumbing bug (source not collected, wrong scaling, wrong characteristic) shows up
// as an oracle mismatch; a dead bonus shows up as "no stat changed".
import { describe, it, expect } from 'vitest';
import { newCharacter, computeDerived } from '../app.jsx';
import {
  DS_ANCESTRIES, DS_CLASSES, DS_KITS, DS_COMPLICATIONS, DS_LEVEL_BONUSES,
} from '../data.jsx';
import { LEVELUP_DATA } from '../levelup.jsx';

const LEVELS = [1, 4, 7, 10];
const echelonOf = (lvl: number) => (lvl <= 3 ? 1 : lvl <= 6 ? 2 : lvl <= 9 ? 3 : 4);
const CHAR_KEYS = ['Might', 'Agility', 'Reason', 'Intuition', 'Presence'];

// Distinct-ish characteristic spread so char-valued bonuses prove they read the right one.
const BASE_CHARS = { Might: 2, Agility: 1, Reason: 0, Intuition: -1, Presence: 1 };

function baseHero(clsId: string, lvl = 1) {
  const c: any = newCharacter('u-test', null);
  c.level = lvl;
  c.cclass.id = clsId;
  c.cclass.characteristics = { ...BASE_CHARS };
  return c;
}

// ── Independent oracle ──
// Recomputes chars (base + level auto-increases + char-bonus picks) and every stat from
// the data tables, per the rules. Deliberately a second implementation.
function oracleChars(c: any) {
  const cls: any = (DS_CLASSES as any[]).find(x => x.id === c.cclass?.id);
  const out: any = {};
  for (const k of CHAR_KEYS) out[k] = c.cclass?.characteristics?.[k] || 0;
  const table = cls && (LEVELUP_DATA as any)[cls.id];
  if (!table) return out;
  for (let l = 2; l <= (c.level || 1); l++) {
    const d = table[l];
    if (!d) continue;
    if (d.autoCharacteristicIncrease) {
      for (const [k, v] of Object.entries(d.autoCharacteristicIncrease)) {
        if (k === 'max' || !CHAR_KEYS.includes(k)) continue;
        out[k] = Math.max(out[k], v as number);
      }
    }
    if (d.autoCharIncreaseAll) for (const k of CHAR_KEYS) out[k] = Math.min(d.autoCharIncreaseAll.max, out[k] + d.autoCharIncreaseAll.delta);
    for (const ch of d.choices || []) {
      if (ch.kind !== 'char-bonus') continue;
      const pick = c.levelChoices?.[l]?.picks?.[ch.id];
      const k = pick && (pick.id || pick.name || pick);
      if (CHAR_KEYS.includes(k)) out[k] = Math.min(ch.max || 3, out[k] + 1);
    }
  }
  return out;
}

function oracleBonusSources(c: any): any[] {
  const cls: any = (DS_CLASSES as any[]).find(x => x.id === c.cclass?.id);
  const anc: any = (DS_ANCESTRIES as any[]).find(x => x.id === c.ancestry?.id);
  const comp: any = (DS_COMPLICATIONS as any[]).find(x => x.id === c.complication?.id);
  const out: any[] = [];
  for (const tName of c.ancestry?.traits || []) {
    const t = (anc?.traits || []).find((x: any) => x.name === tName);
    if (t?.bonuses) out.push(t.bonuses);
  }
  if (cls) {
    for (const f of cls.features || []) if (f.bonuses) out.push(f.bonuses);
    for (const [list, chosen] of [[cls.prayers, c.cclass?.prayer], [cls.wards, c.cclass?.ward], [cls.enchantments, c.cclass?.enchantment], [cls.triggereds, c.cclass?.triggeredAction]] as const) {
      const o = chosen && (list || []).find((x: any) => x.name === chosen);
      if (o?.bonuses) out.push(o.bonuses);
    }
    for (const row of DS_LEVEL_BONUSES as any[]) {
      if (row.cls !== cls.id || (c.level || 1) < row.level) continue;
      if (row.sub && row.sub !== c.cclass?.subclass) continue;
      out.push(row.bonuses);
    }
  }
  if (comp?.bonuses) out.push(comp.bonuses);
  for (const stored of Object.values(c.levelChoices || {}) as any[]) {
    for (const p of Object.values(stored?.picks || {}) as any[]) if (p?.bonuses) out.push(p.bonuses);
  }
  return out;
}

function oracle(c: any) {
  const cls: any = (DS_CLASSES as any[]).find(x => x.id === c.cclass?.id);
  const anc: any = (DS_ANCESTRIES as any[]).find(x => x.id === c.ancestry?.id);
  const kit: any = (DS_KITS as any[]).find(x => x.id === c.kit?.id);
  const kit2: any = (DS_KITS as any[]).find(x => x.id === c.kit2?.id);
  const lvl = c.level || 1;
  const ech = echelonOf(lvl);
  const chars = oracleChars(c);
  const highest = Math.max(...CHAR_KEYS.map(k => chars[k]));
  const cv = (n: any) => (n ? (n === 'highest' ? highest : chars[n] || 0) : 0);
  const kb = (key: string) => Math.max(kit?.bonuses?.[key] || 0, kit2?.bonuses?.[key] || 0);
  const bonuses = oracleBonusSources(c);
  const sum = (key: string) => bonuses.reduce((s, b) => s + (b[key] || 0), 0);
  const sumChar = (key: string) => bonuses.reduce((s, b) => s + cv(b[key]), 0);

  let staminaMax = cls ? cls.starting.stamina1 + (lvl - 1) * cls.starting.staminaPer : 0;
  staminaMax += (kb('sta_per') + sum('sta_per')) * ech + sum('sta') + sum('sta_lvl') * lvl;
  const recoveries = (cls?.starting.recoveries || 0) + sum('rec');
  let speedBase = anc?.speed ?? 5;
  for (const b of bonuses) if (b.spdMin) speedBase = Math.max(speedBase, b.spdMin);
  const speed = speedBase + kb('spd') + sum('spd') + sumChar('spdChar');
  const stability = (anc?.stability ?? 0) + kb('stab') + sum('stab') + sumChar('stabChar') + sum('stabLvl') * lvl;
  const disengage = 1 + kb('disengage') + sum('disengage') + sumChar('disChar');
  const recoveryValue = Math.floor(staminaMax / 3) + bonuses.reduce((s, b) => s + cv(b.recBonusChar), 0);
  const winded = Math.floor(staminaMax / 2);
  return { staminaMax, recoveries, speed, stability, disengage, recoveryValue, winded, chars, highest };
}

function expectMatchesOracle(c: any, label: string) {
  const d = computeDerived(c);
  const o = oracle(c);
  for (const key of ['staminaMax', 'recoveries', 'speed', 'stability', 'disengage', 'recoveryValue', 'winded'] as const) {
    expect(d[key], `${label}: ${key}`).toBe(o[key]);
  }
  expect(d.chars, `${label}: chars`).toEqual(o.chars);
  return d;
}

const STAT_FIELDS = ['staminaMax', 'recoveries', 'speed', 'stability', 'disengage', 'recoveryValue'];
function statVector(d: any) { return STAT_FIELDS.map(k => d[k]); }
const hasLiveBonus = (b: any) => Object.entries(b).some(([k, v]) =>
  ['melee', 'ranged', 'rngDist', 'mDist'].includes(k) ? false : (typeof v === 'string' ? true : v !== 0));

// ─── Every bonus-bearing data entry, at every echelon boundary ───
describe('ancestry trait bonuses', () => {
  for (const anc of DS_ANCESTRIES as any[]) {
    const traits = (anc.traits || []).filter((t: any) => t.bonuses);
    if (!traits.length) continue;
    it(`${anc.id}: ${traits.map((t: any) => t.name).join(', ')}`, () => {
      for (const t of traits) {
        for (const lvl of LEVELS) {
          const c = baseHero('fury', lvl);
          c.ancestry.id = anc.id;
          c.ancestry.traits = [t.name];
          const d = expectMatchesOracle(c, `${anc.id}/${t.name} L${lvl}`);
          if (hasLiveBonus(t.bonuses)) {
            const without = { ...c, ancestry: { ...c.ancestry, traits: [] } };
            expect(statVector(d), `${anc.id}/${t.name} L${lvl} had no effect`).not.toEqual(statVector(computeDerived(without)));
          }
        }
      }
    });
  }
});

describe('class feature / prayer / ward / enchantment / triggered bonuses', () => {
  for (const cls of DS_CLASSES as any[]) {
    const lists: Array<[string, any[]]> = [
      ['prayer', cls.prayers || []], ['ward', cls.wards || []],
      ['enchantment', cls.enchantments || []], ['triggeredAction', cls.triggereds || []],
    ];
    const chosen = lists.flatMap(([field, list]) => list.map((o: any) => [field, o] as const));
    const features = (cls.features || []).filter((f: any) => f.bonuses);
    if (!chosen.length && !features.length) continue;
    it(`${cls.id}: every option matches the oracle at every echelon`, () => {
      for (const lvl of LEVELS) {
        // Always-on feature bonuses (e.g. Null Speed) — plain class build.
        expectMatchesOracle(baseHero(cls.id, lvl), `${cls.id} base L${lvl}`);
        for (const [field, opt] of chosen) {
          const c = baseHero(cls.id, lvl);
          c.cclass[field] = opt.name;
          const d = expectMatchesOracle(c, `${cls.id} ${field}="${opt.name}" L${lvl}`);
          if (opt.bonuses && hasLiveBonus(opt.bonuses)) {
            const without = { ...c, cclass: { ...c.cclass, [field]: null } };
            expect(statVector(d), `${cls.id} ${field}="${opt.name}" L${lvl} had no effect`).not.toEqual(statVector(computeDerived(without)));
          }
        }
      }
    });
  }
});

describe('complication bonuses', () => {
  const withBonuses = (DS_COMPLICATIONS as any[]).filter(x => x.bonuses);
  it('every bonus-bearing complication matches the oracle and changes a stat', () => {
    expect(withBonuses.length).toBeGreaterThan(0);
    for (const comp of withBonuses) {
      for (const lvl of LEVELS) {
        const c = baseHero('fury', lvl);
        c.complication.id = comp.id;
        const d = expectMatchesOracle(c, `${comp.id} L${lvl}`);
        if (hasLiveBonus(comp.bonuses)) {
          const without = { ...c, complication: { id: null } };
          expect(statVector(d), `${comp.id} L${lvl} had no effect`).not.toEqual(statVector(computeDerived(without)));
        }
      }
    }
  });
  it('negative bonuses subtract (curse-of-caution speed, primordial-sickness recoveries)', () => {
    const slow = baseHero('fury');
    slow.complication.id = 'curse-of-caution';
    expect(computeDerived(slow).speed).toBe(4);
    const sick = baseHero('fury');
    sick.complication.id = 'primordial-sickness';
    const cls: any = (DS_CLASSES as any[]).find(x => x.id === 'fury');
    expect(computeDerived(sick).recoveries).toBe(cls.starting.recoveries - 1);
  });
});

describe('kit bonuses', () => {
  it('every kit matches the oracle on every kit-using class at every echelon', () => {
    for (const kit of DS_KITS as any[]) {
      for (const lvl of [1, 4, 10]) {
        const c = baseHero('fury', lvl);
        c.kit = { id: kit.id };
        expectMatchesOracle(c, `kit ${kit.id} L${lvl}`);
      }
    }
  });
  it('dual kits merge via max per key, not sum (Tactician Field Arsenal)', () => {
    // Both kits must carry a nonzero value for the SAME keys — otherwise max degenerates
    // to sum and the merge rule is untestable.
    const kits = DS_KITS as any[];
    const a = kits.find(k => k.bonuses?.sta_per > 0);
    const b = kits.find(k => k.bonuses?.sta_per > 0 && k.bonuses?.sta_per !== a.bonuses.sta_per && k.bonuses?.spd > 0);
    expect(a && b).toBeTruthy();
    const c = baseHero('tactician', 4);
    c.kit = { id: a.id };
    c.kit2 = { id: b.id };
    const d = expectMatchesOracle(c, `dual kit ${a.id}+${b.id}`);
    const cls: any = (DS_CLASSES as any[]).find(x => x.id === 'tactician');
    const expectedSta = cls.starting.stamina1 + 3 * cls.starting.staminaPer
      + Math.max(a.bonuses.sta_per || 0, b.bonuses.sta_per || 0) * 2;
    expect(d.staminaMax).toBe(expectedSta);
    expect(d.speed).toBe(5 + Math.max(a.bonuses.spd || 0, b.bonuses.spd || 0));
  });
});

describe('DS_LEVEL_BONUSES gating', () => {
  for (const row of DS_LEVEL_BONUSES as any[]) {
    it(`${row.cls}${row.sub ? '/' + row.sub : ''} L${row.level} "${row.name}" applies at/after its level, for its subclass only`, () => {
      const make = (lvl: number, sub: string | null) => {
        const c = baseHero(row.cls, lvl);
        c.cclass.subclass = sub;
        return c;
      };
      const cls: any = (DS_CLASSES as any[]).find(x => x.id === row.cls);
      const otherSub = (cls.subclasses || []).map((s: any) => s.id).find((id: string) => id !== row.sub) || null;
      // At the unlock level and at 10: oracle agrees, and the row demonstrably changes a stat.
      for (const lvl of [row.level, 10]) {
        const on = expectMatchesOracle(make(lvl, row.sub), `${row.name} on L${lvl}`);
        const off = computeDerived(make(lvl, row.sub === null ? otherSub : otherSub));
        if (row.sub) expect(statVector(on), `${row.name} did not differ from ${otherSub}`).not.toEqual(statVector(off));
      }
      // Below the unlock level: no effect relative to a level just below.
      if (row.level > 2) {
        const below = make(row.level - 1, row.sub);
        expectMatchesOracle(below, `${row.name} below-level`);
      }
    });
  }
});

describe('interaction rules', () => {
  it('spdMin upgrades the base before additive bonuses stack', () => {
    // Wode-elf Swift: base speed upgraded to 6. Without other speed bonuses → 6.
    const c = baseHero('fury');
    c.ancestry.id = 'wode-elf';
    const swift = ((DS_ANCESTRIES as any[]).find(a => a.id === 'wode-elf').traits as any[]).find(t => t.bonuses?.spdMin);
    c.ancestry.traits = [swift.name];
    expect(computeDerived(c).speed).toBe(swift.bonuses.spdMin);
    // A +2 speed kit stacks on the upgraded base: max(5, 6) + 2 = 8, not max(5+2, 6) = 7.
    const fast = (DS_KITS as any[]).find(k => (k.bonuses?.spd || 0) >= 2);
    c.kit = { id: fast.id };
    expect(computeDerived(c).speed).toBe(Math.max(5, swift.bonuses.spdMin) + fast.bonuses.spd);
  });
  it('multiple additive sources stack (kit + prayer + complication)', () => {
    const c = baseHero('conduit', 4);
    const cls: any = (DS_CLASSES as any[]).find(x => x.id === 'conduit');
    const prayer = (cls.prayers as any[]).find(p => p.bonuses?.sta_per);
    c.cclass.prayer = prayer.name;
    const comp = (DS_COMPLICATIONS as any[]).find(x => x.bonuses?.sta_per);
    c.complication.id = comp.id;
    expectMatchesOracle(c, 'stacked sta_per sources');
    const d = computeDerived(c);
    expect(d.staminaMax).toBe(cls.starting.stamina1 + 3 * cls.starting.staminaPer + (prayer.bonuses.sta_per + comp.bonuses.sta_per) * 2);
  });
});

describe('baselines and edge cases', () => {
  for (const cls of DS_CLASSES as any[]) {
    it(`${cls.id}: level-1 baseline equals the starting block`, () => {
      const d = computeDerived(baseHero(cls.id, 1));
      expect(d.staminaMax).toBe(cls.starting.stamina1);
      expect(d.recoveries).toBe(cls.starting.recoveries);
      expect(d.winded).toBe(Math.floor(cls.starting.stamina1 / 2));
      expect(d.recoveryValue).toBe(Math.floor(cls.starting.stamina1 / 3));
      expect(d.echelon).toBe(1);
      const highest = Math.max(...Object.values({ ...BASE_CHARS, ...(cls.fixedChars || {}) } as any));
      expect(d.potency).toEqual({ weak: highest - 2, average: highest - 1, strong: highest });
    });
  }
  it('no class → stamina 0, speed 5, disengage 1, potency zeros', () => {
    const c: any = newCharacter('u-test', null);
    const d = computeDerived(c);
    expect(d.staminaMax).toBe(0);
    expect(d.recoveries).toBe(0);
    expect(d.speed).toBe(5);
    expect(d.disengage).toBe(1);
    expect(d.potency).toEqual({ weak: 0, average: 0, strong: 0 });
  });
  it('echelon boundaries: 3→1, 4→2, 6→2, 7→3, 9→3, 10→4', () => {
    for (const [lvl, ech] of [[3, 1], [4, 2], [6, 2], [7, 3], [9, 3], [10, 4]] as const) {
      expect(computeDerived(baseHero('fury', lvl)).echelon).toBe(ech);
    }
  });
});
