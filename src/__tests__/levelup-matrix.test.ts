// Layer D — level-up exhaustiveness. Every class × subclass walks levels 2→10 through
// applyLevelUp (the same pure reducer the modal uses); at each level every option of
// every choice is applied once and its stored shape asserted, then the walk continues
// on a canonical pick. Plus: characteristic math, edit semantics, and dedupe plumbing.
import { describe, it, expect } from 'vitest';
import { DS_CLASSES, DS_SKILL_GROUPS } from '../data.jsx';
import { classDef, computeDerived, collectSkillPicks, collectPerkPicks } from '../app.jsx';
import { LEVELUP_DATA, makeContext, levelChoicesFor, applyLevelUp, deleteLevelProgression, deriveGroupName } from '../levelup.jsx';
import { PERKS } from '../wizard/helpers.js';
import { buildValidCharacter, picksForLevel, firstPickFor, levelTo } from './helpers/factories';

const ALL_SKILLS = new Set(Object.values(DS_SKILL_GROUPS).flat());
const ALL_PERKS = new Set(Object.values(PERKS as any).flat().map((p: any) => p.name));

// ─── The walk: every option of every choice at every level, per class × subclass ───
describe('level-up walk 2→10', () => {
  for (const cls of DS_CLASSES as any[]) {
    const subs = (cls.subclasses || [null]).map((s: any) => s && (s.id || s.name));
    for (const sub of subs) {
      it(`${cls.id}${sub ? ` / ${sub}` : ''}: every option at every level applies and stores correctly`, () => {
        let c = buildValidCharacter({ cls: cls.id, subclass: sub });
        for (let l = 2; l <= 10; l++) {
          const ctx = makeContext(c);
          const choices = levelChoicesFor(cls, l, ctx);
          const canonical = picksForLevel(c, l);
          // Every required choice must be satisfiable — a dead CONTINUE button otherwise.
          for (const ch of choices) {
            expect(canonical[ch.id], `${cls.id}/${sub} L${l} ${ch.id} has no satisfiable pick`).toBeTruthy();
          }
          for (const ch of choices) {
            const opts = (typeof ch.options === 'function' ? ch.options(ctx) : ch.options) || [];
            for (const opt of opts) {
              let pick: any = opt;
              if (ch.kind === 'perk') {
                const group = (PERKS as any)[deriveGroupName(opt)] || [];
                pick = { ...opt, chosen: group[0]?.name, chosenText: group[0]?.text };
              } else if (ch.kind === 'skill-group') {
                const group = (DS_SKILL_GROUPS as any)[opt.id] || [];
                pick = { ...opt, chosen: group[0], chosenText: '' };
              }
              const next = applyLevelUp(c, l, { ...canonical, [ch.id]: pick });
              expect(next.level, `${cls.id}/${sub} L${l} did not advance`).toBe(l);
              const stored = next.levelChoices[l].picks[ch.id];
              if (ch.kind === 'perk') {
                expect(ALL_PERKS.has(stored.chosen), `${cls.id}/${sub} L${l} ${ch.id} stored unknown perk "${stored.chosen}"`).toBe(true);
              } else if (ch.kind === 'skill-group') {
                expect(ALL_SKILLS.has(stored.chosen), `${cls.id}/${sub} L${l} ${ch.id} stored unknown skill "${stored.chosen}"`).toBe(true);
              } else {
                expect(stored, `${cls.id}/${sub} L${l} ${ch.id} stored pick`).toEqual(opt);
              }
              if (ch.kind === 'ability') {
                expect(next.cclass.levelAbilities[l].some((a: any) => a.name === opt.name),
                  `${cls.id}/${sub} L${l} ability "${opt.name}" not in levelAbilities`).toBe(true);
              }
              // The derived pipeline stays consistent for every substituted pick.
              expect(Number.isFinite(computeDerived(next).staminaMax)).toBe(true);
            }
          }
          // Continue the walk on the canonical picks.
          const before = computeDerived(c).staminaMax;
          c = applyLevelUp(c, l, canonical);
          expect(c.level).toBe(l);
          expect(c.play.stamina, `fresh level-up should reset current stamina`).toBeNull();
          const after = computeDerived(c).staminaMax;
          expect(after, `${cls.id}/${sub} L${l} stamina should grow`).toBeGreaterThan(before);
          // Auto abilities land in levelAbilities even without ability choices.
          const data = (LEVELUP_DATA as any)[cls.id][l];
          const autoA = typeof data.autoAbilities === 'function' ? data.autoAbilities(makeContext(c)) : (data.autoAbilities || []);
          for (const a of autoA) {
            expect(c.cclass.levelAbilities[l].some((x: any) => x.name === a.name), `${cls.id}/${sub} L${l} auto ability "${a.name}"`).toBe(true);
          }
        }
        // The full walk never stores a duplicate perk or skill.
        const perks = collectPerkPicks(c).map((p: any) => p.name);
        expect(new Set(perks).size, `${cls.id}/${sub} duplicate perks: ${perks}`).toBe(perks.length);
        const skills = collectSkillPicks(c).map((p: any) => p.name);
        expect(new Set(skills).size, `${cls.id}/${sub} duplicate skills: ${skills}`).toBe(skills.length);
      });
    }
  }
});

// ─── Characteristic math ───
describe('level-up characteristic math', () => {
  it('char-bonus: each of the 5 characteristics gains exactly +1 (capped at 3)', () => {
    for (const clsId of ['conduit', 'elementalist']) {
      const before = buildValidCharacter({ cls: clsId });
      const at3 = levelTo(before, 3);
      const chars3 = computeDerived(at3).chars;
      for (const k of ['Might', 'Agility', 'Reason', 'Intuition', 'Presence']) {
        const c = applyLevelUp(at3, 4, picksForLevel(at3, 4, { 'char-bonus-4': { id: k, name: k } }));
        const chars4 = computeDerived(c).chars;
        const cls: any = (DS_CLASSES as any[]).find(x => x.id === clsId);
        const data = (LEVELUP_DATA as any)[clsId][4];
        // Expected: L4 raise-to floors first, then the picked +1 capped at 3.
        const raised: any = { ...chars3 };
        for (const [rk, rv] of Object.entries(data.autoCharacteristicIncrease || {})) {
          if (rk === 'max') continue;
          raised[rk] = Math.max(raised[rk], rv as number);
        }
        raised[k] = Math.min(3, raised[k] + 1);
        expect(chars4, `${clsId} char-bonus → ${k}`).toEqual(raised);
      }
    }
  });

  it('L4 autoCharacteristicIncrease is raise-to, not additive', () => {
    const c = levelTo(buildValidCharacter({ cls: 'fury' }), 4);
    const chars = computeDerived(c).chars;
    // Fury fixes Might 2 / Agility 2 at creation; L4 raises both to 3 — not to 5.
    expect(chars.Might).toBe(3);
    expect(chars.Agility).toBe(3);
  });

  it('L7 autoCharIncreaseAll adds +1 to every characteristic, capped at 4', () => {
    const at6 = levelTo(buildValidCharacter({ cls: 'fury' }), 6);
    const chars6 = computeDerived(at6).chars;
    const at7 = applyLevelUp(at6, 7, picksForLevel(at6, 7));
    const chars7 = computeDerived(at7).chars;
    for (const k of Object.keys(chars6)) {
      expect(chars7[k], `L7 ${k}`).toBe(Math.min(4, chars6[k] + 1));
    }
  });

  it('L10 raise-to-5 lands the class primaries on exactly 5', () => {
    const c = levelTo(buildValidCharacter({ cls: 'fury' }), 10);
    const chars = computeDerived(c).chars;
    expect(chars.Might).toBe(5);
    expect(chars.Agility).toBe(5);
    // Non-primaries: raise-to 3 at L4 never applied to them; they got the L7 +1 (cap 4).
    for (const k of ['Reason', 'Intuition', 'Presence']) {
      expect(chars[k]).toBeLessThanOrEqual(4);
    }
    // The level-1 point-buy stays untouched — increases are derived, never baked in.
    expect(Math.max(...Object.values(c.cclass.characteristics as any) as number[])).toBeLessThanOrEqual(2);
  });
});

// ─── Edit semantics ───
describe('editing a past level', () => {
  it('re-applying with different picks replaces (never duplicates) that level', () => {
    const at3 = levelTo(buildValidCharacter({ cls: 'censor' }), 3);
    const cls: any = classDef(at3);
    const ctx = makeContext(at3);
    const abilityChoice = levelChoicesFor(cls, 3, ctx).find((ch: any) => ch.kind === 'ability');
    const opts = (typeof abilityChoice.options === 'function' ? abilityChoice.options(ctx) : abilityChoice.options);
    const other = opts[1];
    const edited = applyLevelUp({ ...at3, play: { ...at3.play, stamina: 17 } }, 3, { [abilityChoice.id]: other }, { isEditing: true });
    expect(edited.level, 'editing must not change the level').toBe(3);
    expect(edited.play.stamina, 'editing must not touch current vitals').toBe(17);
    expect(edited.levelChoices[3].picks[abilityChoice.id]).toEqual(other);
    expect(edited.cclass.levelAbilities[3].filter((a: any) => a.name === other.name)).toHaveLength(1);
    expect(edited.cclass.levelAbilities[3].some((a: any) => a.name === opts[0].name)).toBe(false);
  });

  it('clearing every ability pick removes the levelAbilities entry', () => {
    // Censor L3 grants only an ability choice and no autoAbilities.
    const at3 = levelTo(buildValidCharacter({ cls: 'censor' }), 3);
    expect(at3.cclass.levelAbilities[3]?.length).toBeGreaterThan(0);
    const edited = applyLevelUp(at3, 3, {}, { isEditing: true });
    expect(edited.cclass.levelAbilities[3]).toBeUndefined();
  });

  it('a fresh level-up resets current stamina to heal to the new max', () => {
    const c = buildValidCharacter({ cls: 'fury' });
    c.play.stamina = 5;
    const up = applyLevelUp(c, 2, picksForLevel(c, 2));
    expect(up.play.stamina).toBeNull();
  });
});

// ─── Dedupe plumbing ───
describe('dedupe across levels', () => {
  it('level-up perk and skill picks are visible to the collectors with lvl: keys', () => {
    const c = levelTo(buildValidCharacter({ cls: 'fury' }), 4);
    const perkKeys = collectPerkPicks(c).map((p: any) => p.key);
    expect(perkKeys.some((k: string) => k.startsWith('lvl:2:'))).toBe(true);
    expect(perkKeys.some((k: string) => k.startsWith('lvl:4:'))).toBe(true);
    const skillKeys = collectSkillPicks(c).map((p: any) => p.key);
    expect(skillKeys.some((k: string) => k.startsWith('lvl:4:'))).toBe(true);
  });

  it('the factory strategy never re-picks a held perk, so a full walk stays duplicate-free', () => {
    // (The per-class walk asserts this too; this pins the helper itself.)
    const c = levelTo(buildValidCharacter({ cls: 'censor' }), 10);
    const names = collectPerkPicks(c).map((p: any) => p.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBeGreaterThanOrEqual(6); // career + L2/4/6/8/10 perks
  });
});

// ─── Conduit condition gating end-to-end ───
describe('conduit domain-count condition', () => {
  it('with two domains the L2 domain feature choice exists and applies', () => {
    const c = buildValidCharacter({ cls: 'conduit', domains: ['Life', 'Protection'] });
    const cls: any = classDef(c);
    const choices = levelChoicesFor(cls, 2, makeContext(c));
    expect(choices.some((ch: any) => ch.id === 'domain-feature-2')).toBe(true);
    const up = applyLevelUp(c, 2, picksForLevel(c, 2));
    expect(up.levelChoices[2].picks['domain-feature-2']).toBeTruthy();
  });
  it('with one domain the choice is skipped and the level still applies', () => {
    const c = buildValidCharacter({ cls: 'conduit' });
    c.cclass.domains = ['Life'];
    const cls: any = classDef(c);
    expect(levelChoicesFor(cls, 2, makeContext(c)).some((ch: any) => ch.id === 'domain-feature-2')).toBe(false);
    const up = applyLevelUp(c, 2, picksForLevel(c, 2));
    expect(up.level).toBe(2);
    expect(up.levelChoices[2].picks['domain-feature-2']).toBeUndefined();
  });
});

// ─── Deleting level progressions (rollback) ───
describe('deleteLevelProgression', () => {
  it('deleting a mid level cascades: from 2 on a level-4 hero rolls back to level 1', () => {
    const at4 = levelTo(buildValidCharacter({ cls: 'fury' }), 4);
    const back = deleteLevelProgression({ ...at4, play: { ...at4.play, stamina: 17, xp: 3, victories: 2 } }, 2);
    expect(back.level).toBe(1);
    expect(back.levelChoices).toEqual({});
    expect(back.cclass.levelAbilities).toEqual({});
    // Current stamina resets to the "full" sentinel (max just dropped)…
    expect(back.play.stamina).toBeNull();
    // …but respite-earned resources are untouched.
    expect(back.play.xp).toBe(3);
    expect(back.play.victories).toBe(2);
    // Derived stats come back down with the level.
    expect(computeDerived(back).staminaMax).toBeLessThan(computeDerived(at4).staminaMax);
  });

  it('deleting the top level keeps the levels beneath it intact', () => {
    const at4 = levelTo(buildValidCharacter({ cls: 'fury' }), 4);
    const back = deleteLevelProgression(at4, 4);
    expect(back.level).toBe(3);
    expect(Object.keys(back.levelChoices).map(Number).sort()).toEqual([2, 3]);
    expect(back.levelChoices[2]).toEqual(at4.levelChoices[2]);
    expect(back.cclass.levelAbilities[4]).toBeUndefined();
    // Freed perks/skills drop out of the collectors again.
    expect(collectPerkPicks(back).some((p: any) => p.key.startsWith('lvl:4:'))).toBe(false);
  });

  it('survives the persistence round-trip that stringifies the level keys', () => {
    const at4 = levelTo(buildValidCharacter({ cls: 'fury' }), 4);
    const back = deleteLevelProgression(JSON.parse(JSON.stringify(at4)), 3);
    expect(back.level).toBe(2);
    expect(Object.keys(back.levelChoices)).toEqual(['2']);
    expect(Object.keys(back.cclass.levelAbilities).every(k => Number(k) < 3)).toBe(true);
  });

  it('does not mutate the input character', () => {
    const at3 = levelTo(buildValidCharacter({ cls: 'censor' }), 3);
    const frozen = JSON.stringify(at3);
    deleteLevelProgression(at3, 2);
    expect(JSON.stringify(at3)).toBe(frozen);
  });
});
