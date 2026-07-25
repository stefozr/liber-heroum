// Layer B — creation exhaustiveness. Every option of every wizard choice point produces
// a character that validates, driven per-axis from a canonical base build (a full
// cartesian product is astronomically large; interactions get targeted combos instead).
import { describe, it, expect } from 'vitest';
import {
  DS_ANCESTRIES, DS_CULTURES, DS_CAREERS, DS_CLASSES, DS_KITS, DS_COMPLICATIONS,
  DS_SKILL_GROUPS, DS_STEPS, kitPoolFor,
} from '../data.jsx';
import { isStepValid } from '../wizard.jsx';
import { collectSkillPicks } from '../app.jsx';
import { PERKS, parseCareerSkills, classSkillPicks, pickPool, charBudget } from '../wizard/helpers.js';
import { buildValidCharacter, hero, resolveGrantSwaps } from './helpers/factories';

const STEP_INDEX = Object.fromEntries((DS_STEPS as any[]).map((s: any, i: number) => [s.id, i]));
const CLASS_STEP = STEP_INDEX['class'];

function invalidSteps(c: any): string[] {
  return (DS_STEPS as any[]).map((s: any, i: number) => (isStepValid(c, i) ? null : s.id)).filter(Boolean) as string[];
}
function expectComplete(c: any, label: string) {
  expect(invalidSteps(c), `${label} should validate every step`).toEqual([]);
}

describe('baseline', () => {
  it('the default factory character validates all 7 steps', () => {
    expectComplete(buildValidCharacter(), 'default build');
  });
  it('an empty character fails exactly the required steps', () => {
    const c = hero();
    expect(invalidSteps(c).sort()).toEqual(['ancestry', 'career', 'class', 'culture', 'identity'].sort());
  });
});

// ─── Class × subclass: every combination builds a fully valid hero ───
describe('every class × subclass', () => {
  for (const cls of DS_CLASSES as any[]) {
    const subs = (cls.subclasses || [null]).map((s: any) => s && (s.id || s.name));
    for (const sub of subs) {
      it(`${cls.id}${sub ? ` / ${sub}` : ''} builds complete`, () => {
        const c = buildValidCharacter({ cls: cls.id, subclass: sub });
        expect(c.cclass.id).toBe(cls.id);
        if (sub) expect(c.cclass.subclass).toBe(sub);
        if (cls.kitRequired) {
          const pool = kitPoolFor(cls, sub);
          expect(pool.some((k: any) => k.id === c.kit.id)).toBe(true);
        }
        expectComplete(c, `${cls.id}/${sub}`);
      });
    }
  }
});

// ─── Class step: every selectable option per class ───
describe('class step options', () => {
  for (const cls of DS_CLASSES as any[]) {
    const label = cls.id;
    it(`${label}: every signature / heroic3 / heroic5 option validates`, () => {
      const sigCount = cls.sigCount ?? 1;
      for (const sig of cls.signatures || []) {
        const c = buildValidCharacter({ cls: cls.id });
        // Put the option under test first, fill the rest of the requirement from siblings.
        const rest = (cls.signatures || []).filter((a: any) => a.name !== sig.name).slice(0, Math.max(0, sigCount - 1));
        c.cclass.signatures = [sig.name, ...rest.map((a: any) => a.name)];
        expectComplete(c, `${label} signature "${sig.name}"`);
      }
      for (const h of cls.heroic3 || []) {
        const c = buildValidCharacter({ cls: cls.id });
        c.cclass.heroic3 = h.name;
        expectComplete(c, `${label} heroic3 "${h.name}"`);
      }
      for (const h of cls.heroic5 || []) {
        const c = buildValidCharacter({ cls: cls.id });
        c.cclass.heroic5 = h.name;
        expectComplete(c, `${label} heroic5 "${h.name}"`);
      }
    });

    if (cls.prayers?.length || cls.wards?.length || cls.enchantments?.length || cls.triggereds?.length) {
      it(`${label}: every prayer / ward / enchantment / triggered option validates`, () => {
        for (const [key, list] of [['prayer', cls.prayers], ['ward', cls.wards], ['enchantment', cls.enchantments], ['triggeredAction', cls.triggereds]] as const) {
          for (const opt of list || []) {
            const c = buildValidCharacter({ cls: cls.id, [key]: opt.name });
            expect(c.cclass[key]).toBe(opt.name);
            expectComplete(c, `${label} ${key} "${opt.name}"`);
          }
        }
      });
    }

    if (cls.kitRequired) {
      it(`${label}: every kit in every subclass's pool validates — and out-of-pool kits fail`, () => {
        const subs = (cls.subclasses || [null]).map((s: any) => s && (s.id || s.name));
        for (const sub of subs) {
          const pool = kitPoolFor(cls, sub);
          for (const kit of pool) {
            const c = buildValidCharacter({ cls: cls.id, subclass: sub, kit: kit.id, kit2: cls.kit2Required ? pool.find((k: any) => k.id !== kit.id)?.id : undefined });
            expectComplete(c, `${label}/${sub} kit "${kit.id}"`);
          }
          // Any kit outside the pool must be rejected by the class step.
          const outside = (DS_KITS as any[]).find(k => !pool.some((p: any) => p.id === k.id));
          if (outside) {
            const c = buildValidCharacter({ cls: cls.id, subclass: sub });
            c.kit = { id: outside.id };
            expect(isStepValid(c, CLASS_STEP), `${label}/${sub} accepted out-of-pool kit "${outside.id}"`).toBe(false);
          }
        }
      });
    }

    it(`${label}: every official characteristic array validates in any assignment order`, () => {
      const flex = cls.flexCharOrder || [];
      for (const arr of cls.charArrays || []) {
        // As-given order…
        const c = buildValidCharacter({ cls: cls.id });
        c.cclass.characteristics = { ...(cls.fixedChars || {}) };
        flex.forEach((k: string, i: number) => { c.cclass.characteristics[k] = arr[i] ?? 0; });
        expectComplete(c, `${label} charArray [${arr}]`);
        // …and reversed (official arrays may be assigned to any characteristic).
        const c2 = buildValidCharacter({ cls: cls.id });
        c2.cclass.characteristics = { ...(cls.fixedChars || {}) };
        const rev = [...arr].reverse();
        flex.forEach((k: string, i: number) => { c2.cclass.characteristics[k] = rev[i] ?? 0; });
        expectComplete(c2, `${label} charArray reversed [${rev}]`);
      }
      // A spread that neither spends the budget nor matches an official array must fail.
      const c = buildValidCharacter({ cls: cls.id });
      c.cclass.characteristics = { ...(cls.fixedChars || {}) };
      flex.forEach((k: string) => { c.cclass.characteristics[k] = -1; });
      expect(isStepValid(c, CLASS_STEP), `${label} accepted an all-minimum spread`).toBe(false);
      // Out-of-range flex values must fail.
      const c2 = buildValidCharacter({ cls: cls.id });
      c2.cclass.characteristics = { ...c2.cclass.characteristics, [flex[0]]: 3 };
      expect(isStepValid(c2, CLASS_STEP), `${label} accepted a flex value above CHAR_MAX`).toBe(false);
    });

    it(`${label}: every class-skill pool option validates; missing skills fail`, () => {
      const subs = (cls.subclasses || [null]).map((s: any) => s && (s.id || s.name));
      for (const sub of subs) {
        const subDef = (cls.subclasses || []).find((s: any) => (s.id || s.name) === sub);
        const picks = classSkillPicks(cls, subDef);
        const base = buildValidCharacter({ cls: cls.id, subclass: sub });
        picks.forEach((p: any, idx: number) => {
          const pool = pickPool(p);
          for (const s of pool) {
            const c = buildValidCharacter({ cls: cls.id, subclass: sub });
            // Swap the option under test into this pick group (count is preserved).
            const mine = c.cclass.skills.filter((x: string) => c.cclass.skillPicks[x] === idx);
            if (!c.cclass.skills.includes(s)) {
              c.cclass.skills = [...c.cclass.skills.filter((x: string) => x !== mine[0]), s];
              delete c.cclass.skillPicks[mine[0]];
              c.cclass.skillPicks[s] = idx;
            }
            expect(isStepValid(c, CLASS_STEP), `${cls.id}/${sub} class skill "${s}" (group ${idx})`).toBe(true);
          }
        });
        // Clearing the picks must invalidate the step.
        const cleared = { ...base, cclass: { ...base.cclass, skills: [], skillPicks: {} } };
        expect(isStepValid(cleared, CLASS_STEP), `${cls.id}/${sub} validated with no class skills`).toBe(false);
      }
    });

    it(`${label}: validation actually requires each class-step field`, () => {
      const c = buildValidCharacter({ cls: cls.id });
      const breakField = (mutate: (x: any) => void, what: string) => {
        const copy = JSON.parse(JSON.stringify(c));
        mutate(copy);
        expect(isStepValid(copy, CLASS_STEP), `${label}: removing ${what} should invalidate the class step`).toBe(false);
      };
      if (cls.subclasses) breakField(x => { x.cclass.subclass = null; }, 'subclass');
      if ((cls.sigCount ?? 1) > 0) breakField(x => { x.cclass.signatures = []; }, 'signatures');
      if (cls.deep) breakField(x => { x.cclass.heroic3 = null; }, 'heroic3');
      if (cls.deep) breakField(x => { x.cclass.heroic5 = null; }, 'heroic5');
      if (cls.kitRequired) breakField(x => { x.kit = { id: null }; }, 'kit');
      if (cls.kit2Required) breakField(x => { x.kit2 = { id: null }; }, 'kit2');
      if (cls.prayers?.length) breakField(x => { x.cclass.prayer = null; }, 'prayer');
      if (cls.wards?.length) breakField(x => { x.cclass.ward = null; }, 'ward');
      if (cls.enchantments?.length) breakField(x => { x.cclass.enchantment = null; }, 'enchantment');
      if (cls.pickTwoDomains) {
        breakField(x => { x.cclass.domains = []; }, 'domains');
        breakField(x => { x.cclass.domainFeature = null; }, 'domainFeature');
        breakField(x => { x.cclass.domainSkill = null; }, 'domainSkill');
        breakField(x => { x.cclass.domainAbility = null; }, 'domainAbility');
      }
      if (cls.pickOneDomain) {
        breakField(x => { x.cclass.domains = []; }, 'domain');
        breakField(x => { x.cclass.domainFeature = null; }, 'domainFeature');
        breakField(x => { x.cclass.domainSkill = null; }, 'domainSkill');
      }
    });
  }
});

// ─── Conduit: all 66 domain pairs ───
describe('conduit domain pairs', () => {
  const cls: any = (DS_CLASSES as any[]).find(c => c.id === 'conduit');
  it('every one of the 66 pairs builds complete', () => {
    const domains = cls.domains as string[];
    let pairs = 0;
    for (let i = 0; i < domains.length; i++) {
      for (let j = i + 1; j < domains.length; j++) {
        pairs++;
        const c = buildValidCharacter({ cls: 'conduit', domains: [domains[i], domains[j]] });
        expect(c.cclass.domains).toEqual([domains[i], domains[j]]);
        expectComplete(c, `conduit [${domains[i]}, ${domains[j]}]`);
      }
    }
    expect(pairs).toBe(66);
  });
});

// ─── Censor: all 12 domains × 3 orders ───
describe('censor domains × orders', () => {
  const cls: any = (DS_CLASSES as any[]).find(c => c.id === 'censor');
  for (const sub of cls.subclasses) {
    it(`${sub.id}: every domain builds complete`, () => {
      for (const d of cls.domains) {
        const c = buildValidCharacter({ cls: 'censor', subclass: sub.id, domain: d });
        expect(c.cclass.domains).toEqual([d]);
        expect(c.cclass.domainFeature?.domain).toBe(d);
        expectComplete(c, `censor/${sub.id} domain ${d}`);
      }
    });
  }
});

// ─── Ancestries: every ancestry, trait, former life, signature choice ───
describe('ancestries', () => {
  for (const anc of DS_ANCESTRIES as any[]) {
    it(`${anc.id}: builds complete, and every purchasable trait validates`, () => {
      expectComplete(buildValidCharacter({ ancestry: anc.id }), anc.id);
      for (const t of anc.traits || []) {
        expectComplete(buildValidCharacter({ ancestry: anc.id, traits: [t.name] }), `${anc.id} + ${t.name}`);
      }
    });
  }
  it('revenant: every former life validates', () => {
    for (const other of (DS_ANCESTRIES as any[]).filter(a => a.id !== 'revenant')) {
      const c = buildValidCharacter({ ancestry: 'revenant', formerLife: other.id });
      expect(c.ancestry.formerLife).toBe(other.id);
      expectComplete(c, `revenant ← ${other.id}`);
    }
  });
  it('signature skill choices: every option is a real, selectable skill', () => {
    for (const anc of DS_ANCESTRIES as any[]) {
      const sigs = anc.signatures || (anc.signature ? [anc.signature] : []);
      for (const sig of sigs) {
        if (!sig.skillChoice) continue;
        const pool = sig.skillChoice.groups.flatMap((g: string) => (DS_SKILL_GROUPS as any)[g] || []);
        for (const s of pool) {
          const c = buildValidCharacter({ ancestry: anc.id });
          c.ancestry.sigSkills = { [sig.name]: [s] };
          expectComplete(c, `${anc.id} sig skill ${s}`);
        }
      }
    }
  });
});

// ─── Culture: every aspect option and every skill in each aspect's pool ───
describe('culture', () => {
  const cul: any = DS_CULTURES;
  for (const [key, listName] of [['environment', 'environments'], ['organization', 'organizations'], ['upbringing', 'upbringings']] as const) {
    it(`every ${key} and each of its pool skills validates`, () => {
      for (const def of cul[listName]) {
        const c = buildValidCharacter({ [key]: def.id });
        expect(c.culture[key]).toBe(def.id);
        expectComplete(c, `${key}=${def.id}`);
        const pool: string[] = def.skills || (def.skillGroups || []).flatMap((g: string) => (DS_SKILL_GROUPS as any)[g] || []);
        for (const s of pool) {
          const c2 = buildValidCharacter({ [key]: def.id });
          c2.culture.skills[key] = s;
          // Forcing the pick may duplicate an auto-grant — resolve the required swap,
          // exactly as the wizard now demands.
          resolveGrantSwaps(c2);
          expectComplete(c2, `${key}=${def.id} skill=${s}`);
        }
      }
    });
  }
  it('every archetype resolves to a valid env/org/upb combination', () => {
    for (const a of cul.archetypes) {
      const c = buildValidCharacter({ environment: a.env, organization: a.org, upbringing: a.upb });
      expectComplete(c, `archetype ${a.name}`);
    }
  });
});

// ─── Careers: every career, incident, perk, and pick-group option ───
describe('careers', () => {
  for (const car of DS_CAREERS as any[]) {
    it(`${car.id}: builds complete; every incident and perk validates`, () => {
      expectComplete(buildValidCharacter({ career: car.id }), car.id);
      for (const inc of car.incidents) {
        const c = buildValidCharacter({ career: car.id });
        c.career.incident = typeof inc === 'string' ? inc : inc.name;
        expectComplete(c, `${car.id} incident`);
      }
      for (const p of (PERKS as any)[car.perk] || []) {
        expectComplete(buildValidCharacter({ career: car.id, perk: p.name }), `${car.id} perk ${p.name}`);
      }
    });
    it(`${car.id}: every skill pick-group option validates; undercounting fails`, () => {
      const parsed = parseCareerSkills(car);
      parsed.picks.forEach((p: any, idx: number) => {
        for (const s of pickPool(p)) {
          const c = buildValidCharacter({ career: car.id });
          if (!c.career.skills.includes(s)) {
            const mine = c.career.skills.filter((x: string) => c.career.skillPicks[x] === idx && !parsed.auto.includes(x));
            c.career.skills = [...c.career.skills.filter((x: string) => x !== mine[0]), s];
            delete c.career.skillPicks[mine[0]];
            c.career.skillPicks[s] = idx;
          }
          expect(isStepValid(c, STEP_INDEX['career']), `${car.id} pick "${s}"`).toBe(true);
        }
      });
      const c = buildValidCharacter({ career: car.id });
      c.career.skills = c.career.skills.slice(0, -1);
      expect(isStepValid(c, STEP_INDEX['career']), `${car.id} accepted too few skills`).toBe(false);
    });
  }
});

// ─── Duplicate-grant substitution ("choose another instead") ───
describe('duplicate-grant skill swaps', () => {
  it('Agent + Shadow: class step requires a swap for Sneak, then validates', () => {
    const c = buildValidCharacter({ cls: 'shadow', subclass: 'caustic-alchemy', career: 'agent' });
    // The factory resolved it — verify the shape, then verify it was actually required.
    expect(c.cclass.skillSwaps.Sneak).toBeTruthy();
    expect((DS_SKILL_GROUPS as any).intrigue).toContain(c.cclass.skillSwaps.Sneak);
    expectComplete(c, 'agent shadow with swap');
    const without = { ...c, cclass: { ...c.cclass, skillSwaps: {} } };
    expect(isStepValid(without, CLASS_STEP), 'collision without swap must invalidate').toBe(false);
  });

  it('career resolves a collision with an earlier culture pick; class outranks career', () => {
    // Culture picks Sneak (urban env pool), then Agent's auto Sneak collides → career side.
    const c = buildValidCharacter({ cls: 'fury', career: 'agent', environment: 'urban' });
    c.culture.skills.environment = 'Sneak';
    c.career.skillSwaps = {};
    expect(isStepValid(c, STEP_INDEX['career'])).toBe(false);
    resolveGrantSwaps(c);
    expect(c.career.skillSwaps.Sneak).toBeTruthy();
    expectComplete(c, 'culture-vs-career collision');
    // Career auto vs class grant: the LATER step (class) substitutes; career reports none.
    const d = buildValidCharacter({ cls: 'shadow', subclass: 'black-ash', career: 'agent' });
    expect(Object.keys(d.career.skillSwaps || {})).toEqual([]);
    expect(Object.keys(d.cclass.skillSwaps)).toContain('Sneak');
  });

  it('an invalid swap fails validation: wrong group, already-held, or same-skill', () => {
    const c = buildValidCharacter({ cls: 'shadow', subclass: 'caustic-alchemy', career: 'agent' });
    const bad = (swap: any) => {
      const x = { ...c, cclass: { ...c.cclass, skillSwaps: { Sneak: swap } } };
      return isStepValid(x, CLASS_STEP);
    };
    expect(bad('Brag'), 'wrong group (interpersonal for an intrigue dupe)').toBe(false);
    expect(bad('Hide'), 'already granted by the class itself').toBe(false);
    expect(bad('Sneak'), 'swapping to the duplicate itself').toBe(false);
    const takenByCareer = c.career.skills.find((s: string) => (DS_SKILL_GROUPS as any).intrigue.includes(s) && s !== 'Sneak');
    if (takenByCareer) expect(bad(takenByCareer), `held by career (${takenByCareer})`).toBe(false);
  });

  it('a stale swap is ignored once the collision disappears', () => {
    const c = buildValidCharacter({ cls: 'fury', career: 'agent', environment: 'urban' });
    c.culture.skills.environment = 'Sneak';
    resolveGrantSwaps(c);
    const replacement = c.career.skillSwaps.Sneak;
    // Collision live: career emits the replacement, culture holds Sneak.
    let names = collectSkillPicks(c).map((p: any) => p.name);
    expect(names).toContain(replacement);
    expect(names.filter((n: string) => n === 'Sneak')).toHaveLength(1);
    // Remove the collision (change the culture pick) — the swap goes stale and is ignored.
    c.culture.skills.environment = 'Alertness';
    names = collectSkillPicks(c).map((p: any) => p.name);
    expect(names).toContain('Sneak');
    expect(names).not.toContain(replacement);
    expectComplete(c, 'stale swap ignored');
  });
});

// ─── Complications: all 100 ───
describe('complications', () => {
  it('every complication builds complete', () => {
    for (const comp of DS_COMPLICATIONS as any[]) {
      expectComplete(buildValidCharacter({ complication: comp.id }), `complication ${comp.id}`);
    }
  });
  it('skipping the complication is valid', () => {
    const c = buildValidCharacter();
    c.complication = { id: null, custom: '' };
    expectComplete(c, 'no complication');
  });
});
