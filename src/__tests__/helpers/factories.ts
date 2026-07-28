// Shared test factories: build wizard-complete characters for any class/subclass spec
// and walk them through the level-up flow via the same pure reducer the UI uses.
import { newCharacter, classDef, collectSkillPicks, collectPerkPicks } from '../../app.jsx';

import {
  DS_ANCESTRIES, DS_CULTURES, DS_CAREERS, DS_CLASSES, DS_SKILL_GROUPS, DS_LANGUAGES, DS_COMPLICATIONS, kitPoolFor,
} from '../../data.jsx';
import {
  parseCareerSkills, classSkillPicks, classGrantedSkills, pickPool, defaultFlexValues, PERKS,
  groupsOfSkill, careerAutoCollisions, classGrantCollisions,
  resolvedAncestryTraits, ancestrySignatures,
} from '../../wizard/helpers.js';
import {
  LEVELUP_DATA, makeContext, levelChoicesFor, applyLevelUp, deriveGroupName,
  DOMAIN_1ST_FEATURES, DOMAIN_2_ABILITIES, CENSOR_DOMAIN_1,
} from '../../levelup.jsx';

export function hero(over: any = {}) {
  const c: any = newCharacter('u-test', null);
  Object.assign(c, over);
  return c;
}

const resolveOptions = (choice: any, ctx: any) =>
  (typeof choice.options === 'function' ? choice.options(ctx) : choice.options) || [];

// A valid pick for any level-up choice kind. For two-tier kinds (perk / skill-group) the
// stored shape is { ...categoryOption, chosen } — mirror the UI, skipping items the
// character already holds so dedupe rules stay satisfied.
export function firstPickFor(choice: any, ctx: any, character: any = null) {
  const opts = resolveOptions(choice, ctx);
  if (!opts.length) return null;
  if (choice.kind === 'perk') {
    const takenPerks = new Set(character ? collectPerkPicks(character).map((p: any) => p.name) : []);
    for (const opt of opts) {
      const group = (PERKS as any)[deriveGroupName(opt)] || [];
      const item = group.find((p: any) => !takenPerks.has(p.name));
      if (item) return { ...opt, chosen: item.name, chosenText: item.text };
    }
    return null;
  }
  if (choice.kind === 'skill-group') {
    const takenSkills = new Set(character ? collectSkillPicks(character).map((p: any) => p.name) : []);
    for (const opt of opts) {
      const group = (DS_SKILL_GROUPS as any)[opt.id] || [];
      const item = group.find((s: string) => !takenSkills.has(s));
      if (item) return { ...opt, chosen: item, chosenText: '' };
    }
    return null;
  }
  return opts[0];
}

// Picks for every choice the level-up flow would present at `level`, using `strategy`:
//   undefined      → first valid option everywhere
//   { [choiceId]: pick } → explicit pick per choice id, first-valid for the rest
//   (choice, ctx, character) => pick → callback per choice
export function picksForLevel(character: any, level: number, strategy?: any) {
  const cls = classDef(character);
  const ctx = makeContext(character);
  const picks: any = {};
  for (const ch of levelChoicesFor(cls, level, ctx)) {
    let v;
    if (typeof strategy === 'function') v = strategy(ch, ctx, character);
    else if (strategy && ch.id in strategy) v = strategy[ch.id];
    if (v === undefined) v = firstPickFor(ch, ctx, character);
    if (v != null) picks[ch.id] = v;
  }
  return picks;
}

// Walk the character from its current level up to `target`, applying every level's
// choices through the same pure reducer the LevelUpFlow modal uses.
export function levelTo(character: any, target: number, strategy?: any) {
  let c = character;
  for (let l = (c.level || 1) + 1; l <= target; l++) {
    c = applyLevelUp(c, l, picksForLevel(c, l, strategy));
  }
  return c;
}

// ── Wizard-complete character builder ──
// Performs the same state transitions the step handlers do, defaulting every
// unspecified axis to its first valid option, so isStepValid passes for all 7 steps.
export function buildValidCharacter(spec: any = {}) {
  const c = hero();
  const taken = new Set<string>();
  const firstFree = (pool: string[]) => pool.find(s => !taken.has(s)) || pool[0];
  const take = (s: string | undefined) => { if (s) taken.add(s); return s; };

  // Resolve the class up front and reserve its auto-granted skills, so earlier steps'
  // default picks don't collide with them (a player planning a build does the same).
  const cls: any = DS_CLASSES.find((x: any) => x.id === (spec.cls || spec.class)) || DS_CLASSES.find((x: any) => x.id === 'fury');
  const sub: any = cls.subclasses
    ? (cls.subclasses.find((s: any) => (s.id || s.name) === spec.subclass) || cls.subclasses[0])
    : null;
  classGrantedSkills(cls, sub).forEach((s: string) => taken.add(s));

  // 1 · Ancestry
  const anc: any = DS_ANCESTRIES.find((a: any) => a.id === (spec.ancestry || 'human')) || DS_ANCESTRIES[0];
  c.ancestry.id = anc.id;
  if (anc.id === 'revenant') c.ancestry.formerLife = spec.formerLife || DS_ANCESTRIES.find((a: any) => a.id !== 'revenant')!.id;
  if (spec.traits) c.ancestry.traits = [...spec.traits];
  // Each purchased 'Previous Life: Npt' trait needs its borrowed former-life trait
  // chosen (mirrors setPrevLifeTrait in the ancestry step).
  if (anc.id === 'revenant') {
    const former: any = DS_ANCESTRIES.find((a: any) => a.id === c.ancestry.formerLife);
    c.ancestry.prevLifeTraits = spec.prevLifeTraits ? { ...spec.prevLifeTraits } : {};
    for (const cost of [1, 2]) {
      if (!c.ancestry.prevLifeTraits[`${cost}pt`] && (c.ancestry.traits || []).includes(`Previous Life: ${cost}pt`)) {
        const pick = (former?.traits || []).find((t: any) => t.cost === cost);
        if (pick) c.ancestry.prevLifeTraits[`${cost}pt`] = pick.name;
      }
    }
  }
  // Signature choices (devil skill, dragon-knight Wyrmplate, dwarf rune) and trait
  // choices (Prismatic Scales, Psionic Gift, Passionate Artisan) — the ancestry gate
  // requires them, so fill first-valid picks (mirrors the ancestry step togglers).
  c.ancestry.sigSkills = spec.sigSkills ? { ...spec.sigSkills } : {};
  c.ancestry.traitSkills = spec.traitSkills ? { ...spec.traitSkills } : {};
  c.ancestry.traitOptions = spec.traitOptions ? { ...spec.traitOptions } : {};
  if (spec.sigOptions) c.ancestry.sigOptions = { ...spec.sigOptions };
  const optionNames = (choice: any, def: any) =>
    (choice.options || (def.abilities || []).map((a: any) => a.name)).map((o: any) => (typeof o === 'string' ? o : o.name));
  for (const sig of ancestrySignatures(anc)) {
    if (sig.skillChoice && !c.ancestry.sigSkills[sig.name]) {
      const pool = sig.skillChoice.groups.flatMap((g: string) => (DS_SKILL_GROUPS as any)[g] || []);
      c.ancestry.sigSkills[sig.name] = pool.filter((s: string) => !taken.has(s)).slice(0, sig.skillChoice.count);
      c.ancestry.sigSkills[sig.name].forEach(take);
    }
    if (sig.optionChoice && !c.ancestry.sigOptions[sig.name]) {
      c.ancestry.sigOptions[sig.name] = optionNames(sig.optionChoice, sig).slice(0, sig.optionChoice.count);
    }
  }
  for (const t of resolvedAncestryTraits(c)) {
    if (t.skillChoice && !c.ancestry.traitSkills[t.name]) {
      const pool = t.skillChoice.groups.flatMap((g: string) => (DS_SKILL_GROUPS as any)[g] || []);
      c.ancestry.traitSkills[t.name] = pool.filter((s: string) => !taken.has(s)).slice(0, t.skillChoice.count);
      c.ancestry.traitSkills[t.name].forEach(take);
    }
    if (t.optionChoice && !c.ancestry.traitOptions[t.name]) {
      c.ancestry.traitOptions[t.name] = optionNames(t.optionChoice, t).slice(0, t.optionChoice.count);
    }
  }

  // 2 · Culture (aspects are stored by id; each aspect grants one skill from its pool)
  const cul: any = DS_CULTURES;
  c.culture.environment = spec.environment || cul.environments[0].id;
  c.culture.organization = spec.organization || cul.organizations[0].id;
  c.culture.upbringing = spec.upbringing || cul.upbringings[0].id;
  c.culture.skills = {};
  for (const [key, listName] of [['environment', 'environments'], ['organization', 'organizations'], ['upbringing', 'upbringings']] as const) {
    const def = (cul[listName] as any[]).find((x: any) => x.id === c.culture[key]);
    const pool: string[] = def?.skills || (def?.skillGroups || []).flatMap((g: string) => (DS_SKILL_GROUPS as any)[g] || []);
    c.culture.skills[key] = take(firstFree(pool));
  }

  // 3 · Career — default to one whose auto-granted skills don't collide with the
  // class's grants (the app has no "choose another instead" substitution for grants).
  const car: any = spec.career
    ? DS_CAREERS.find((x: any) => x.id === spec.career)
    : DS_CAREERS.find((x: any) => parseCareerSkills(x).auto.every((s: string) => !taken.has(s))) || DS_CAREERS[0];
  c.career.id = car.id;
  const parsed = parseCareerSkills(car);
  c.career.skills = [...parsed.auto];
  parsed.auto.forEach((s: string) => taken.add(s));
  c.career.skillPicks = {};
  parsed.picks.forEach((p: any, idx: number) => {
    const pool = pickPool(p).filter(s => !taken.has(s) && !c.career.skills.includes(s));
    for (const s of pool.slice(0, p.count)) {
      c.career.skills.push(take(s));
      c.career.skillPicks[s!] = idx;
    }
  });
  const inc = car.incidents[0];
  c.career.incident = typeof inc === 'string' ? inc : inc.name;
  c.career.languages = [];
  // DS_LANGUAGES minus Caelian/culture language — first N.
  if (car.languages > 0) {
    c.career.languages = (DS_LANGUAGES as string[]).filter(L => L !== 'Caelian' && L !== c.culture.language).slice(0, car.languages);
  }
  c.career.perk = spec.perk || ((PERKS as any)[car.perk] || [])[0]?.name || '';

  // 4 · Class (cls/sub resolved above; granted skills already reserved)
  c.cclass.id = cls.id;
  if (cls.subclasses) c.cclass.subclass = sub.id || sub.name;

  if (cls.pickTwoDomains) {
    const domains = spec.domains || cls.domains.slice(0, 2);
    c.cclass.domains = [...domains];
    const fd = domains[0];
    const f = (DOMAIN_1ST_FEATURES as any)[fd];
    c.cclass.domainFeature = { domain: fd, name: f.name, text: f.text, skillGroup: f.skillGroup };
    if (f.skillGroup) c.cclass.domainSkill = take(firstFree((DS_SKILL_GROUPS as any)[f.skillGroup] || []));
    const ab = ((DOMAIN_2_ABILITIES as any)[fd] || [])[0];
    c.cclass.domainAbility = ab ? { domain: fd, name: ab.name } : null;
  }
  if (cls.pickOneDomain) {
    const d = spec.domain || cls.domains[0];
    c.cclass.domains = [d];
    const f = ((CENSOR_DOMAIN_1 as any) || (DOMAIN_1ST_FEATURES as any))[d];
    c.cclass.domainFeature = { domain: d, name: f.name, text: f.text, skillGroup: f.skillGroup };
    if (f.skillGroup) c.cclass.domainSkill = take(firstFree((DS_SKILL_GROUPS as any)[f.skillGroup] || []));
  }

  // Characteristics: the default full-budget allocation, plus fixed scores.
  c.cclass.characteristics = { ...(cls.fixedChars || {}), ...defaultFlexValues(cls) };

  // Signature + heroic abilities.
  const sigCount = cls.sigCount ?? 1;
  c.cclass.signatures = (cls.signatures || []).slice(0, sigCount).map((a: any) => a.name);
  if (cls.deep) {
    c.cclass.heroic3 = (cls.heroic3 || [])[0]?.name || null;
    c.cclass.heroic5 = (cls.heroic5 || [])[0]?.name || null;
  }

  // Prayer / ward / enchantment / augmentation / triggered choices.
  if (cls.prayers?.length) c.cclass.prayer = spec.prayer || cls.prayers[0].name;
  if (cls.wards?.length) c.cclass.ward = spec.ward || cls.wards[0].name;
  if (cls.enchantments?.length) c.cclass.enchantment = spec.enchantment || cls.enchantments[0].name;
  if (cls.triggereds?.length) c.cclass.triggeredAction = spec.triggeredAction || cls.triggereds[0].name;

  // Class skills: granted are implicit (reserved above); fill every pick group (incl. the subclass's).
  c.cclass.skills = [];
  c.cclass.skillPicks = {};
  classSkillPicks(cls, sub).forEach((p: any, idx: number) => {
    const pool = pickPool(p).filter(s => !taken.has(s) && !c.cclass.skills.includes(s));
    for (const s of pool.slice(0, p.count)) {
      c.cclass.skills.push(take(s));
      c.cclass.skillPicks[s!] = idx;
    }
  });

  // Kits, scoped to the subclass's pool.
  if (cls.kitRequired) {
    const pool = kitPoolFor(cls, c.cclass.subclass);
    c.kit = { id: spec.kit || pool[0].id };
    if (cls.kit2Required) c.kit2 = { id: spec.kit2 || pool[1].id };
  }

  // 5 · Complication (optional — only when asked for), filling any required
  // skill/language picks the same way the wizard's complication step would.
  if (spec.complication) {
    c.complication.id = spec.complication;
    const comp: any = DS_COMPLICATIONS.find((x: any) => x.id === spec.complication);
    if (comp) {
      (comp.skills || []).forEach((s: string) => taken.add(s));
      c.complication.skills = {};
      (comp.skillChoices || []).forEach((ch: any, i: number) => {
        const pool: string[] = ch.options || Array.from(new Set((ch.groups || []).flatMap((g: string) => (DS_SKILL_GROUPS as any)[g] || [])));
        const picks = pool.filter(s => !taken.has(s)).slice(0, ch.count);
        picks.forEach(s => taken.add(s));
        c.complication.skills[i] = picks;
      });
      if (comp.languageChoice) {
        const known = new Set(['Caelian', c.culture.language, ...c.career.languages]);
        const pool: string[] = comp.languageChoice.options || (DS_LANGUAGES as string[]);
        c.complication.languages = pool.filter(L => !known.has(L)).slice(0, comp.languageChoice.count);
      }
    }
  }

  // 6 · Identity
  c.identity.name = spec.name || 'Test Hero';
  c.name = c.identity.name;

  // 7 · Resolve any remaining duplicate-grant collisions with a same-group swap
  // (explicit specs like { cls: 'shadow', career: 'agent' } can force one).
  resolveGrantSwaps(c);

  return c;
}

// Fill career/class skillSwaps for every current duplicate-grant collision, picking the
// first same-group skill the character doesn't already hold anywhere.
export function resolveGrantSwaps(c: any) {
  const held = () => new Set(collectSkillPicks(c).map((p: any) => p.name));
  for (const [collide, slot] of [
    [careerAutoCollisions, 'career'],
    [classGrantCollisions, 'cclass'],
  ] as const) {
    for (const { skill } of collide(c)) {
      if ((c[slot].skillSwaps || {})[skill]) continue;
      const pool = groupsOfSkill(skill).flatMap((g: string) => (DS_SKILL_GROUPS as any)[g] || []);
      const used = held();
      const rep = pool.find((s: string) => s !== skill && !used.has(s));
      c[slot].skillSwaps = { ...(c[slot].skillSwaps || {}), [skill]: rep };
    }
  }
  return c;
}

export { makeContext, levelChoicesFor, applyLevelUp, LEVELUP_DATA };
