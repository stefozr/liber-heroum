// Layer A — data schema & integrity. Pure enumeration over every game-data table:
// bonus-field whitelists, level-up option completeness for every class × subclass,
// domain-map coverage, and cross-references between tables. These tests are what turn
// a data typo (wrong key, empty option list, dangling name) into a red suite.
import { describe, it, expect } from 'vitest';
import {
  DS_ANCESTRIES, DS_CULTURES, DS_CAREERS, DS_CLASSES, DS_KITS, DS_COMPLICATIONS,
  DS_SKILL_GROUPS, DS_LANGUAGES, DS_DEAD_LANGUAGES, DS_LEVEL_BONUSES, kitPoolFor,
} from '../data.jsx';
import {
  LEVELUP_DATA, makeContext, levelChoicesFor, deriveGroupName,
  DOMAIN_1ST_FEATURES, DOMAIN_2_ABILITIES, DOMAIN_4_FEATURES, CENSOR_DOMAIN_1,
} from '../levelup.jsx';
import { PERKS, parseCareerSkills, classSkillPicks, pickPool } from '../wizard/helpers.js';
import { newCharacter } from '../app.jsx';

const ALL_SKILLS = new Set(Object.values(DS_SKILL_GROUPS).flat());
const GROUP_NAMES = new Set(Object.keys(DS_SKILL_GROUPS));
const ALL_DOMAINS = ['Creation','Death','Fate','Knowledge','Life','Love','Nature','Protection','Storm','Sun','Trickery','War'];
const CHAR_NAMES = new Set(['Might','Agility','Reason','Intuition','Presence','highest']);
const KINDS = new Set(['ability','feature','perk','skill-group','char-bonus']);

// Character context for a class/subclass — what makeContext hands to option functions.
function ctxFor(clsId: string, sub: string | null = null, domains: string[] = []) {
  const c: any = newCharacter('u-test', null);
  c.cclass.id = clsId;
  c.cclass.subclass = sub;
  c.cclass.domains = domains;
  return makeContext(c);
}
const subIdsOf = (cls: any) => (cls.subclasses || []).map((s: any) => s.id || s.name);
// A context per subclass (or one generic context for subclass-less classes). Conduit
// gets two domains so its condition-gated choices are included.
function contextsOf(cls: any) {
  const domains = cls.pickTwoDomains ? ['Life', 'Protection'] : cls.pickOneDomain ? ['War'] : [];
  const subs = subIdsOf(cls);
  return subs.length ? subs.map((s: string) => ctxFor(cls.id, s, domains)) : [ctxFor(cls.id, null, domains)];
}

// ─── Bonus-field whitelist: walk every data tree for `bonuses` objects ───
describe('bonus fields use only known stat keys', () => {
  const STAT_KEYS = new Set(['sta','sta_per','sta_lvl','spd','spdMin','stab','stabLvl','disengage','rec','recBonusChar','spdChar','stabChar','disChar']);
  const KIT_KEYS = new Set([...STAT_KEYS, 'melee', 'ranged', 'rngDist', 'mDist']);
  const CHAR_VALUED = new Set(['recBonusChar','spdChar','stabChar','disChar']);

  function collectBonuses(node: any, path: string, out: Array<[string, any]>) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((v, i) => collectBonuses(v, `${path}[${i}]`, out)); return; }
    for (const [k, v] of Object.entries(node)) {
      if (k === 'bonuses' && v && typeof v === 'object') out.push([`${path}.${k}`, v]);
      else collectBonuses(v, `${path}.${k}${(node as any).name ? `(${(node as any).name})` : ''}`, out);
    }
  }

  const tables: Array<[string, any, Set<string>]> = [
    ['DS_ANCESTRIES', DS_ANCESTRIES, STAT_KEYS],
    ['DS_CLASSES', DS_CLASSES, STAT_KEYS],
    ['DS_KITS', DS_KITS, KIT_KEYS],
    ['DS_COMPLICATIONS', DS_COMPLICATIONS, STAT_KEYS],
    ['DS_LEVEL_BONUSES', DS_LEVEL_BONUSES, STAT_KEYS],
  ];
  for (const [name, table, allowed] of tables) {
    it(`${name} bonuses are well-formed`, () => {
      const found: Array<[string, any]> = [];
      collectBonuses(table, name, found);
      expect(found.length).toBeGreaterThan(0);
      for (const [path, b] of found) {
        for (const [k, v] of Object.entries(b)) {
          expect(allowed.has(k), `${path} has unknown bonus key "${k}"`).toBe(true);
          if (CHAR_VALUED.has(k)) {
            expect(CHAR_NAMES.has(v as string), `${path}.${k} names unknown characteristic "${v}"`).toBe(true);
          } else if (k === 'melee' || k === 'ranged') {
            expect(typeof v, `${path}.${k} should be a damage string`).toBe('string');
          } else {
            expect(typeof v, `${path}.${k} should be a number`).toBe('number');
          }
        }
      }
    });
  }
});

// ─── distanceBonus fields: keyword-gated ability distance increases ───
describe('distanceBonus fields are well-formed', () => {
  function collectDistanceBonuses(node: any, path: string, out: Array<[string, any]>) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((v, i) => collectDistanceBonuses(v, `${path}[${i}]`, out)); return; }
    for (const [k, v] of Object.entries(node)) {
      if (k === 'distanceBonus' && v && typeof v === 'object') out.push([`${path}.${k}`, v]);
      else collectDistanceBonuses(v, `${path}.${k}${(node as any).name ? `(${(node as any).name})` : ''}`, out);
    }
  }

  it('DS_CLASSES distanceBonus entries carry keywords + numeric amount', () => {
    const found: Array<[string, any]> = [];
    collectDistanceBonuses(DS_CLASSES, 'DS_CLASSES', found);
    // Acolyte of the Mystery, Prayer of Distance, Enchantment of Distance, Distance Augmentation.
    expect(found.length).toBe(4);
    for (const [path, b] of found) {
      expect(Array.isArray(b.keywords) && b.keywords.length > 0, `${path} needs a non-empty keywords array`).toBe(true);
      for (const k of b.keywords) expect(typeof k, `${path} keyword should be a string`).toBe('string');
      expect(typeof b.amount === 'number' && b.amount > 0, `${path} needs a positive numeric amount`).toBe(true);
      expect(Object.keys(b).sort()).toEqual(['amount', 'keywords']);
    }
  });
});

// ─── LEVELUP_DATA completeness: every class × subclass × level 2–10 ───
describe('level-up data completeness', () => {
  for (const cls of DS_CLASSES as any[]) {
    it(`${cls.id}: levels 2–10 exist with resolvable, non-empty choices for every subclass`, () => {
      const table = (LEVELUP_DATA as any)[cls.id];
      expect(table, `LEVELUP_DATA.${cls.id} missing`).toBeDefined();
      for (const ctx of contextsOf(cls)) {
        for (let l = 2; l <= 10; l++) {
          const data = table[l];
          expect(data, `${cls.id} L${l} missing`).toBeDefined();
          expect(data.staminaGain, `${cls.id} L${l} staminaGain drifted from starting.staminaPer`).toBe(cls.starting.staminaPer);
          // Auto grants resolve to arrays.
          const autoF = typeof data.autoFeatures === 'function' ? data.autoFeatures(ctx) : (data.autoFeatures || []);
          expect(Array.isArray(autoF), `${cls.id} L${l} autoFeatures didn't resolve for ${ctx.sub}`).toBe(true);
          const autoA = typeof data.autoAbilities === 'function' ? data.autoAbilities(ctx) : (data.autoAbilities || []);
          expect(Array.isArray(autoA), `${cls.id} L${l} autoAbilities didn't resolve for ${ctx.sub}`).toBe(true);
          for (const ch of levelChoicesFor(cls, l, ctx)) {
            expect(KINDS.has(ch.kind), `${cls.id} L${l} ${ch.id} has unknown kind "${ch.kind}"`).toBe(true);
            const opts = (typeof ch.options === 'function' ? ch.options(ctx) : ch.options) || [];
            // The bug class: an empty option list makes the flow's CONTINUE button dead.
            expect(opts.length, `${cls.id} L${l} ${ch.id} has NO options for subclass ${ctx.sub}`).toBeGreaterThan(0);
            // Multi-picks (count > 1) must be satisfiable: enough distinct options.
            if (ch.count != null) {
              expect(typeof ch.count === 'number' && ch.count >= 2, `${cls.id} L${l} ${ch.id} has invalid count "${ch.count}"`).toBe(true);
              expect(opts.length, `${cls.id} L${l} ${ch.id} has fewer options than its count`).toBeGreaterThanOrEqual(ch.count);
            }
            if (ch.kind === 'perk') {
              for (const opt of opts) {
                const group = (PERKS as any)[deriveGroupName(opt)];
                expect(group?.length, `${cls.id} L${l} ${ch.id} option "${opt.name}" resolves to no PERKS group`).toBeGreaterThan(0);
              }
            }
            if (ch.kind === 'skill-group') {
              for (const opt of opts) {
                const group = (DS_SKILL_GROUPS as any)[opt.id];
                expect(group?.length, `${cls.id} L${l} ${ch.id} option "${opt.name}" (id ${opt.id}) resolves to no skill group`).toBeGreaterThan(0);
              }
            }
            if (ch.kind === 'char-bonus') {
              expect(opts.map((o: any) => o.id).sort()).toEqual(['Agility','Intuition','Might','Presence','Reason']);
            }
          }
        }
      }
    });
  }

  it('conduit with fewer than two domains skips the condition-gated domain feature', () => {
    const cls: any = (DS_CLASSES as any[]).find(c => c.id === 'conduit');
    const one = levelChoicesFor(cls, 2, ctxFor('conduit', null, ['Life']));
    expect(one.some((ch: any) => ch.id === 'domain-feature-2')).toBe(false);
    const two = levelChoicesFor(cls, 2, ctxFor('conduit', null, ['Life', 'Protection']));
    expect(two.some((ch: any) => ch.id === 'domain-feature-2')).toBe(true);
  });

  it('censor domain-feature choices resolve for every domain', () => {
    const cls: any = (DS_CLASSES as any[]).find(c => c.id === 'censor');
    for (const d of ALL_DOMAINS) {
      for (const l of [4, 7]) {
        const ctx = ctxFor('censor', 'exorcist', [d]);
        const ch = levelChoicesFor(cls, l, ctx).find((x: any) => x.kind === 'feature');
        if (!ch) continue;
        const opts = (typeof ch.options === 'function' ? ch.options(ctx) : ch.options) || [];
        expect(opts.length, `censor L${l} domain feature empty for ${d}`).toBeGreaterThan(0);
      }
    }
  });

  it('conduit domain choices resolve for every domain pair member', () => {
    const cls: any = (DS_CLASSES as any[]).find(c => c.id === 'conduit');
    for (const d of ALL_DOMAINS) {
      const ctx = ctxFor('conduit', null, [d, d === 'War' ? 'Life' : 'War']);
      for (const l of [2, 4]) {
        for (const ch of levelChoicesFor(cls, l, ctx).filter((x: any) => x.kind === 'feature' || x.id.startsWith('domain-ability'))) {
          const opts = (typeof ch.options === 'function' ? ch.options(ctx) : ch.options) || [];
          expect(opts.length, `conduit L${l} ${ch.id} empty for domains [${ctx.domains}]`).toBeGreaterThan(0);
        }
      }
    }
  });
});

// ─── Domain maps cover all 12 domains ───
describe('domain maps', () => {
  const maps: Array<[string, any]> = [
    ['DOMAIN_1ST_FEATURES', DOMAIN_1ST_FEATURES],
    ['DOMAIN_2_ABILITIES', DOMAIN_2_ABILITIES],
    ['DOMAIN_4_FEATURES', DOMAIN_4_FEATURES],
    ['CENSOR_DOMAIN_1', CENSOR_DOMAIN_1],
  ];
  for (const [name, map] of maps) {
    it(`${name} covers all 12 domains`, () => {
      for (const d of ALL_DOMAINS) {
        expect(map[d], `${name} missing ${d}`).toBeDefined();
        const entries = Array.isArray(map[d]) ? map[d] : [map[d]];
        expect(entries.length).toBeGreaterThan(0);
      }
    });
  }
  it('every domain feature skillGroup is a real skill group', () => {
    for (const map of [DOMAIN_1ST_FEATURES, CENSOR_DOMAIN_1] as any[]) {
      for (const d of ALL_DOMAINS) {
        const f = map[d];
        if (f?.skillGroup) expect(GROUP_NAMES.has(f.skillGroup), `${d}: skillGroup "${f.skillGroup}"`).toBe(true);
      }
    }
  });
});

// ─── Cross-references between tables ───
describe('cross-references', () => {
  it('class skill metadata references real skills and groups', () => {
    for (const cls of DS_CLASSES as any[]) {
      for (const s of cls.grantedSkills || []) expect(ALL_SKILLS.has(s), `${cls.id} grants unknown skill "${s}"`).toBe(true);
      for (const s of cls.quickSkills || []) expect(ALL_SKILLS.has(s), `${cls.id} quick-suggests unknown skill "${s}"`).toBe(true);
      for (const p of cls.skillPicks || []) {
        expect(p.count).toBeGreaterThan(0);
        for (const g of p.groups || []) expect(GROUP_NAMES.has(g), `${cls.id} pick group "${g}"`).toBe(true);
        for (const s of p.options || []) expect(ALL_SKILLS.has(s), `${cls.id} pick option "${s}"`).toBe(true);
        expect(pickPool(p).length, `${cls.id} has an empty skill pick pool`).toBeGreaterThan(0);
      }
      expect((cls.skillPicks || []).length, `${cls.id} has no class skill picks`).toBeGreaterThan(0);
      for (const sub of cls.subclasses || []) {
        if (sub.skill) expect(ALL_SKILLS.has(sub.skill), `${cls.id}/${sub.id} grants unknown skill "${sub.skill}"`).toBe(true);
        if (sub.skillGroup) expect(GROUP_NAMES.has(sub.skillGroup), `${cls.id}/${sub.id} skillGroup "${sub.skillGroup}"`).toBe(true);
        // A subclass grants at most one of: a fixed skill or a group pick (some grant neither).
        expect(!(sub.skill && sub.skillGroup), `${cls.id}/${sub.id} grants both a skill and a skill group`).toBe(true);
      }
    }
  });

  it('kit metadata: every kitRequired class has a valid quick kit and non-empty pools per subclass', () => {
    for (const cls of DS_CLASSES as any[]) {
      if (!cls.kitRequired) continue;
      const subs = subIdsOf(cls).length ? subIdsOf(cls) : [null];
      for (const sub of subs) {
        expect(kitPoolFor(cls, sub).length, `${cls.id}/${sub} kit pool empty`).toBeGreaterThan(0);
      }
      if (cls.quickKit) {
        expect((DS_KITS as any[]).some(k => k.name === cls.quickKit), `${cls.id} quickKit "${cls.quickKit}" unknown`).toBe(true);
      }
    }
  });

  it('careers: parsed skills resolve, perk group exists, quickPerk is in the group', () => {
    for (const car of DS_CAREERS as any[]) {
      const parsed = parseCareerSkills(car);
      for (const s of parsed.auto) expect(ALL_SKILLS.has(s), `${car.id} auto skill "${s}"`).toBe(true);
      for (const p of parsed.picks) expect(pickPool(p).length, `${car.id} empty pick pool`).toBeGreaterThan(0);
      expect((PERKS as any)[car.perk]?.length, `${car.id} perk group "${car.perk}"`).toBeGreaterThan(0);
      if (car.quickPerk) {
        expect((PERKS as any)[car.perk].some((p: any) => p.name === car.quickPerk), `${car.id} quickPerk "${car.quickPerk}" not in ${car.perk}`).toBe(true);
      }
      expect(car.incidents.length, `${car.id} should have 6 incidents`).toBe(6);
    }
  });

  it('cultures: aspect skill pools resolve to real skills', () => {
    const cul: any = DS_CULTURES;
    for (const listName of ['environments', 'organizations', 'upbringings']) {
      for (const def of cul[listName]) {
        const pool: string[] = def.skills || (def.skillGroups || []).flatMap((g: string) => (DS_SKILL_GROUPS as any)[g] || []);
        expect(pool.length, `${listName}/${def.id} empty skill pool`).toBeGreaterThan(0);
        for (const s of def.skills || []) expect(ALL_SKILLS.has(s), `${listName}/${def.id} skill "${s}"`).toBe(true);
        expect(pool.includes(def.quick), `${listName}/${def.id} quick skill "${def.quick}" not in its own pool`).toBe(true);
        for (const g of def.skillGroups || []) expect(GROUP_NAMES.has(g), `${listName}/${def.id} group "${g}"`).toBe(true);
      }
    }
    for (const a of cul.archetypes) {
      expect(cul.environments.some((e: any) => e.id === a.env), `archetype ${a.name} env`).toBe(true);
      expect(cul.organizations.some((o: any) => o.id === a.org), `archetype ${a.name} org`).toBe(true);
      expect(cul.upbringings.some((u: any) => u.id === a.upb), `archetype ${a.name} upb`).toBe(true);
    }
  });

  it('DS_LEVEL_BONUSES rows reference real classes/subclasses and levels 2–10', () => {
    for (const row of DS_LEVEL_BONUSES as any[]) {
      const cls = (DS_CLASSES as any[]).find(c => c.id === row.cls);
      expect(cls, `row "${row.name}" references unknown class ${row.cls}`).toBeDefined();
      if (row.sub) expect(subIdsOf(cls).includes(row.sub), `row "${row.name}" references unknown subclass ${row.sub}`).toBe(true);
      expect(row.level).toBeGreaterThanOrEqual(2);
      expect(row.level).toBeLessThanOrEqual(10);
    }
  });

  it('complications: 100 entries with d100 exactly 1..100', () => {
    expect((DS_COMPLICATIONS as any[]).length).toBe(100);
    const rolls = (DS_COMPLICATIONS as any[]).map(c => c.d100).sort((a, b) => a - b);
    expect(rolls).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
  });

  it('complications: grant fields reference real skills, groups and languages', () => {
    const ALL_LANGS = new Set([...(DS_LANGUAGES as string[]), ...(DS_DEAD_LANGUAGES as string[])]);
    for (const comp of DS_COMPLICATIONS as any[]) {
      for (const s of comp.skills || []) {
        expect(ALL_SKILLS.has(s), `${comp.id} grants unknown skill "${s}"`).toBe(true);
      }
      for (const ch of comp.skillChoices || []) {
        expect(ch.count, `${comp.id} skillChoices count`).toBeGreaterThanOrEqual(1);
        expect(!!ch.options !== !!ch.groups, `${comp.id} skillChoices needs exactly one of options/groups`).toBe(true);
        const pool = ch.options
          || Array.from(new Set((ch.groups || []).flatMap((g: string) => (DS_SKILL_GROUPS as any)[g] || [])));
        for (const g of ch.groups || []) expect(GROUP_NAMES.has(g), `${comp.id} unknown skill group "${g}"`).toBe(true);
        for (const s of ch.options || []) expect(ALL_SKILLS.has(s), `${comp.id} unknown option skill "${s}"`).toBe(true);
        expect(pool.length, `${comp.id} skillChoices pool smaller than count`).toBeGreaterThanOrEqual(ch.count);
      }
      if (comp.languageChoice) {
        expect(comp.languageChoice.count).toBeGreaterThanOrEqual(1);
        for (const l of comp.languageChoice.options || []) {
          expect(ALL_LANGS.has(l), `${comp.id} grants unknown language "${l}"`).toBe(true);
        }
      }
      for (const a of comp.abilities || []) {
        expect(typeof a.name, `${comp.id} ability without a name`).toBe('string');
        expect(typeof a.type, `${comp.id}/${a.name} ability without a type`).toBe('string');
        if (a.tiers) expect(a.tiers.length, `${comp.id}/${a.name} tier count`).toBe(3);
      }
    }
  });

  it('ancestries: signature skill/option choices reference real groups', () => {
    for (const anc of DS_ANCESTRIES as any[]) {
      expect(anc.points, `${anc.id} has no trait point budget`).toBeGreaterThan(0);
      for (const t of anc.traits || []) {
        expect([1, 2].includes(t.cost), `${anc.id}/${t.name} cost ${t.cost}`).toBe(true);
      }
      const sigs = anc.signatures || (anc.signature ? [anc.signature] : []);
      expect(sigs.length, `${anc.id} has no signature`).toBeGreaterThan(0);
      for (const sig of sigs) {
        for (const g of sig.skillChoice?.groups || []) expect(GROUP_NAMES.has(g), `${anc.id}/${sig.name} group "${g}"`).toBe(true);
        if (sig.optionChoice) expect(sig.optionChoice.options.length).toBeGreaterThan(0);
      }
    }
  });

  it('perk groups are non-empty and names are unique across all groups', () => {
    const names = Object.values(PERKS as any).flat().map((p: any) => p.name);
    expect(new Set(names).size).toBe(names.length);
    for (const [group, list] of Object.entries(PERKS as any)) {
      expect((list as any[]).length, `PERKS.${group} empty`).toBeGreaterThan(0);
    }
  });
});
