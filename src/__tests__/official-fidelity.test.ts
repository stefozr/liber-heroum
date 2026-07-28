// Layer C — fidelity to the official Draw Steel data. Where data-schema.test.ts proves the
// game tables are internally consistent, this proves they match the published game.
//
// Ground truth is public/foundry-items.json: the Draw Steel system compendium, vendored
// under the Draw Steel Creator License and already shipped for the FoundryVTT exporter.
// The rulebook PDF and the premium Heroes journals are licensed content that must stay out
// of the repo, so the prose-level audit lives in scripts/audit-official.mjs and writes to
// the gitignored reference/ directory. What runs here is the mechanical layer only.
//
// Regenerate the ground truth with: node scripts/extract-foundry-official.mjs
// Re-run the full audit with:       node scripts/audit-official.mjs
import { describe, it, expect } from 'vitest';
import official from '../../public/foundry-items.json';
import divergenceFile from './official-divergences.json';
import { DS_CLASSES, DS_ANCESTRIES, DS_COMPLICATIONS, DS_SKILL_GROUPS, DS_LANGUAGES, DS_DEAD_LANGUAGES } from '../data.jsx';
import { LEVELUP_DATA, makeContext, levelChoicesFor } from '../levelup.jsx';
import { newCharacter } from '../app.jsx';
import { ancestrySignatures, ancestryPoints } from '../wizard/helpers.js';

// ─── index the official documents ───

type Doc = any;
const byKey = new Map<string, Doc[]>();
const byId = new Map<string, Doc>();
for (const [key, value] of Object.entries((official as any).items)) {
  const entries = Array.isArray(value) ? value : [{ scope: [], doc: value }];
  byKey.set(key, entries as any[]);
  for (const e of entries as any[]) if (e.doc?._id) byId.set(e.doc._id, e.doc);
}

const slug = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
// The compendium uses UK spelling for a couple of names the book prints in US spelling.
const respell = (k: string) => k.replace(/judgment/g, 'judgement');

function findDoc(type: string, name: string, scope: string[] = []): Doc | null {
  for (const key of [`${type}:${slug(name)}`, `${type}:${respell(slug(name))}`]) {
    const entries = byKey.get(key);
    if (!entries) continue;
    if (entries.length === 1) return entries[0].doc;
    const want = scope.map(slug);
    return [...entries]
      .sort((a, b) => (b.scope || []).filter((s: string) => want.includes(s)).length
        - (a.scope || []).filter((s: string) => want.includes(s)).length)[0].doc;
  }
  return null;
}

// ─── renderers: official structured fields → the strings the app stores ───

const CHAR_LETTER: Record<string, string> = {
  might: 'M', agility: 'A', reason: 'R', intuition: 'I', presence: 'P',
};
const CHAR_CANON: Record<string, string> = {
  ...CHAR_LETTER, m: 'M', a: 'A', r: 'R', i: 'I', p: 'P',
};
const canonChars = (s: unknown) => String(s ?? '').toLowerCase().split(/\s*(?:or|,|\/)\s*/)
  .map(x => CHAR_CANON[x.trim()] || x.trim()).filter(Boolean).join('|');

const squash = (s: unknown) => String(s ?? '')
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, '-')
  .replace(/\s+/g, ' ').trim().toLowerCase();

const DAMAGE_TYPES = ['acid', 'cold', 'corruption', 'fire', 'holy', 'lightning', 'poison', 'psychic', 'sonic'];

/**
 * The mechanically load-bearing part of a tier: numbers, damage types, potency and forced
 * movement. Wording is deliberately excluded — that's what the prose audit is for.
 */
function tierSignature(text: string) {
  const s = squash(text);
  return [
    (s.match(/\d+/g) || []).join(','),
    DAMAGE_TYPES.filter(t => s.includes(t)).join(','),
    (s.match(/[mapri]\s*<\s*(?:weak|average|strong)/g) || []).map(x => x.replace(/\s+/g, '')).join(','),
    (s.match(/\b(push|pull|slide)\b/g) || []).join(','),
  ].join('|');
}

/** Rebuild a tier line from the compendium's structured power-roll effects. */
function officialTier(doc: Doc, tierNo: number): string {
  const chr = (doc.system?.power?.roll?.characteristics || []).map((c: string) => CHAR_LETTER[c] || c).join(' or ');
  const parts: string[] = [];
  for (const eff of Object.values<any>(doc.system?.power?.effects || {})) {
    const tier = eff[eff.type]?.[`tier${tierNo}`];
    if (!tier) continue;
    if (eff.type === 'damage') {
      const value = String(tier.value ?? '').replace(/@chr/g, chr).trim();
      if (value) parts.push(`${value} ${(tier.types || []).join(' and ')} damage`);
      continue;
    }
    // Only tier 1 usually carries the display template; later tiers reuse it with their
    // own potency substituted. Mirrors renderTier() in scripts/official-index.mjs.
    const template = tier.display || eff[eff.type]?.tier1?.display || '';
    const tierName = { '@potency.weak': 'WEAK', '@potency.average': 'AVERAGE', '@potency.strong': 'STRONG' }[
      tier.potency?.value as string] || '';
    const potChar = tier.potency?.characteristic && tier.potency.characteristic !== 'none'
      ? CHAR_LETTER[tier.potency.characteristic] || tier.potency.characteristic : chr;
    const potency = tierName ? `${potChar} < ${tierName}` : '';
    if (eff.type === 'forced') {
      const moved = `${(tier.movement || []).join(' or ')} ${tier.distance ?? ''}`.trim();
      parts.push(template
        ? String(template).replace(/\{\{forced\}\}/g, moved).replace(/\{\{potency\}\}/g, potency)
        : moved);
      continue;
    }
    if (eff.type === 'resource') {
      const amount = tier.amount;
      parts.push(template
        ? String(template).replace(/\{\{potency\}\}/g, potency)
        : `Each target gains ${amount} ${amount === 1 ? tier.type : `${tier.type}s`}`);
      continue;
    }
    // An applied effect with no template still imposes its potency.
    const text = String(template).replace(/\{\{potency\}\}/g, potency).trim();
    if (text) parts.push(text);
    else if (potency) parts.push(potency);
  }
  return parts.join('; ');
}

// ─── collect every ability the app can grant ───

const isAbility = (n: any) => n && typeof n === 'object' && typeof n.name === 'string'
  && (n.tiers || n.keywords || n.powerRoll || n.distance || n.spend);

const tierTexts = (tiers: any): string[] => {
  if (!tiers) return [];
  if (Array.isArray(tiers)) return tiers.map((t: any) => (Array.isArray(t) ? t[1] : t) || '');
  return [tiers.t1 || '', tiers.t2 || '', tiers.t3 || ''];
};

const ALL_DOMAINS = ['Creation', 'Death', 'Fate', 'Knowledge', 'Life', 'Love',
  'Nature', 'Protection', 'Storm', 'Sun', 'Trickery', 'War'];

function contextsFor(cls: any) {
  const domainSets = cls.pickTwoDomains ? ALL_DOMAINS.map(d => [d, d === 'War' ? 'Life' : 'War'])
    : cls.pickOneDomain ? ALL_DOMAINS.map(d => [d]) : [[]];
  const subs = (cls.subclasses || []).map((s: any) => s.id);
  const out: Array<{ sub: string | null; ctx: any }> = [];
  for (const sub of subs.length ? subs : [null]) {
    for (const domains of domainSets) {
      const c: any = newCharacter('fidelity', null);
      c.cclass.id = cls.id;
      c.cclass.subclass = sub;
      c.cclass.domains = domains;
      out.push({ sub, ctx: makeContext(c) });
    }
  }
  return out;
}

/** Every ability reachable for a class, level 1 and level-up, deduped by name. */
function abilitiesOf(cls: any) {
  const found = new Map<string, { ability: any; scope: string[] }>();
  const remember = (ab: any, scope: string[]) => {
    if (isAbility(ab) && !found.has(ab.name)) found.set(ab.name, { ability: ab, scope });
  };
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    remember(node, [cls.name]);
    Object.values(node).forEach(walk);
  };
  walk(cls);

  const table = (LEVELUP_DATA as any)[cls.id] || {};
  for (const { sub, ctx } of contextsFor(cls)) {
    const scope = [cls.name, (cls.subclasses || []).find((s: any) => s.id === sub)?.name].filter(Boolean);
    for (let level = 2; level <= 10; level++) {
      const entry = table[level];
      if (!entry) continue;
      const resolve = (v: any) => (typeof v === 'function' ? v(ctx) : v) || [];
      for (const ab of resolve(entry.autoAbilities)) remember(ab, scope);
      for (const ch of levelChoicesFor(cls, level, ctx)) {
        if (ch.kind !== 'ability') continue;
        for (const ab of resolve(ch.options)) remember(ab, scope);
      }
    }
  }
  return found;
}

/**
 * Places where the vendored compendium contradicts the printed rulebook and the app
 * follows the book. Generated by scripts/audit-official.mjs from the extracted PDF, so the
 * exemptions stay evidence-backed rather than hand-waved — and so nobody "fixes" the app
 * back to the compendium's error.
 */
const divergences: Record<string, { class: string; fields: string[] }> =
  (divergenceFile as any).divergences;

/**
 * The same thing, hand-checked, for the few abilities whose stat block the PDF's
 * two-column layout interleaves badly enough that the audit can't read it automatically.
 * Each was confirmed by eye against the page cited.
 */
const MANUALLY_VERIFIED: Record<string, string[]> = {
  // Heroes p.103 prints "Area, Magic Main action"; the compendium has no keywords at all.
  'Wellspring of Grace': ['keywords'],
  // Heroes p.120 prints "Fire, Magic, Ranged, Void"; the compendium says Weapon.
  'Translated Through Flame': ['keywords'],
  // Heroes p.50 prints the potency + prone rider only at tier 3; the compendium's
  // applied-effect data carries a dangling potency (no effect text) at tiers 1-2.
  'Concussive Slam': ['tier'],
};

const exempt = (name: string, field: string) =>
  divergences[name]?.fields.includes(field) || MANUALLY_VERIFIED[name]?.includes(field);

describe('official fidelity — every app ability exists in the compendium', () => {
  for (const cls of DS_CLASSES as any[]) {
    it(`${cls.id}: all abilities resolve`, () => {
      const unresolved: string[] = [];
      for (const [name, { scope }] of abilitiesOf(cls)) {
        if (!findDoc('ability', name, scope) && !findDoc('feature', name, scope)) unresolved.push(name);
      }
      expect(unresolved, `${cls.id} has abilities with no official counterpart`).toEqual([]);
    });
  }
});

describe('official fidelity — ability mechanics', () => {
  for (const cls of DS_CLASSES as any[]) {
    it(`${cls.id}: keywords, power roll and tier values match`, () => {
      const problems: string[] = [];
      for (const [name, { ability, scope }] of abilitiesOf(cls)) {
        const doc = findDoc('ability', name, scope);
        if (!doc) continue;                       // resolution is covered by the suite above

        // Keywords. The app writes an em-dash where the book prints "no keywords".
        const appKw = (ability.keywords || []).filter((k: string) => k !== '—')
          .map((k: string) => k.toLowerCase()).sort();
        const offKw = [...(doc.system?.keywords || [])].sort();
        if (appKw.join(',') !== offKw.join(',') && !exempt(name, 'keywords')) {
          problems.push(`${name}: keywords [${appKw}] vs official [${offKw}]`);
        }

        // Power-roll characteristic.
        const offChars = canonChars((doc.system?.power?.roll?.characteristics || []).join(' or '));
        if (ability.powerRoll && offChars && canonChars(ability.powerRoll) !== offChars
            && !exempt(name, 'power roll')) {
          problems.push(`${name}: power roll ${canonChars(ability.powerRoll)} vs official ${offChars}`);
        }

        // Tier numbers, damage types and potency.
        const appTiers = tierTexts(ability.tiers);
        if (Object.keys(doc.system?.power?.effects || {}).length && appTiers.some(Boolean)) {
          for (let i = 0; i < 3; i++) {
            const off = officialTier(doc, i + 1);
            if (!off) continue;
            if (tierSignature(appTiers[i] || '') !== tierSignature(off) && !exempt(name, 'tier')) {
              problems.push(`${name} tier ${i + 1}: "${appTiers[i]}" vs official "${off}"`);
            }
          }
        }
      }
      expect(problems, `${cls.id} ability mechanics drifted from the compendium`).toEqual([]);
    });
  }
});

describe('official fidelity — class chassis', () => {
  for (const cls of DS_CLASSES as any[]) {
    it(`${cls.id}: stamina, recoveries, resources and characteristics match`, () => {
      const doc = findDoc('class', cls.name);
      expect(doc, `no official class document for ${cls.name}`).toBeTruthy();
      const s = doc.system;
      expect(cls.starting.stamina1).toBe(s.stamina.starting);
      expect(cls.starting.staminaPer).toBe(s.stamina.level);
      expect(cls.starting.recoveries).toBe(s.recoveries);
      expect(cls.resource).toBe(s.primary);
      expect(cls.turnGain).toBe(s.turnGain);
      expect(cls.epicResource).toBe(s.epic);
      expect(Object.keys(cls.fixedChars).map(c => c.toLowerCase()).sort())
        .toEqual([...s.characteristics.core].sort());
    });
  }
});

describe('official fidelity — level-up progression', () => {
  for (const cls of DS_CLASSES as any[]) {
    it(`${cls.id}: every official grant for levels 1-10 is reachable`, () => {
      const subs = (cls.subclasses || []).length ? cls.subclasses : [{ id: null, name: null }];
      const missing: string[] = [];

      for (const sub of subs) {
        // What the compendium grants this class/subclass, bucketed by level.
        const officialByLevel = new Map<number, Array<{ name: string; levels: Set<number> }>>();
        const levelsOfName = new Map<string, Set<number>>();
        const consume = (doc: Doc) => {
          for (const adv of Object.values<any>(doc?.system?.advancements || {})) {
            // Some subclasses (e.g. the Mastermind doctrine) encode their level 1
            // grants with a null level requirement.
            const level = Number.isFinite(adv.requirements?.level) ? adv.requirements.level : 1;
            for (const p of adv.pool || []) {
              const d = byId.get(String(p.uuid).split('.').pop()!);
              if (!d) continue;
              // Kit grants are the kit picker's job, and subclass docs (colleges,
              // doctrines, domains, …) are the subclass/domain picker's job.
              if (d.type === 'kit' || d.type === 'subclass') continue;
              if (!officialByLevel.has(level)) officialByLevel.set(level, []);
              officialByLevel.get(level)!.push({ name: d.name, levels: new Set() });
              if (!levelsOfName.has(slug(d.name))) levelsOfName.set(slug(d.name), new Set());
              levelsOfName.get(slug(d.name))!.add(level);
            }
          }
        };
        consume(findDoc('class', cls.name));
        if (sub.name) consume(findDoc('subclass', sub.name));

        // What the app can grant, by level. Level 1 content lives on the class record.
        const appLevels = new Map<string, number>();
        const noteName = (n: string, level: number) => {
          // Domain options are labelled "Life: Blessing of Life" in the picker.
          for (const form of [n, n.replace(/^[A-Z][a-z]+:\s*/, '')]) {
            const k = slug(form);
            if (!appLevels.has(k)) appLevels.set(k, level);
            // The compendium uses UK spelling (Judgement) where the app follows the book (Judgment).
            if (!appLevels.has(respell(k))) appLevels.set(respell(k), level);
          }
        };
        for (const [name] of abilitiesOf(cls)) noteName(name, 1);
        // Level 1 content lives in named entries scattered across the class record —
        // features, subclass features/abilities, enchantments, wards, prayers,
        // augmentations, the Elementalist acolyte — so walk the whole record, the
        // same way abilitiesOf() does.
        const walkNames = (node: any) => {
          if (!node || typeof node !== 'object') return;
          if (Array.isArray(node)) return node.forEach(walkNames);
          if (typeof node.name === 'string' && node.name) noteName(node.name, 1);
          Object.values(node).forEach(walkNames);
        };
        walkNames(cls);
        // The heroic resource is modeled as class chrome (resource/turnGain fields),
        // not as a named feature.
        if (cls.resource) noteName(cls.resource, 1);
        // The Censor's domain pool docs are choice containers; the pick and its
        // content ship via pickOneDomain + CENSOR_DOMAIN_1 in the wizard.
        for (const d of cls.domains || []) noteName(d, 1);
        // The Conduit's prayers and wards drop the shared prefix/suffix because the
        // picker groups them under a "Prayer / Ward" heading.
        for (const p of cls.prayers || []) noteName(`Prayer of ${p.name}`, 1);
        for (const w of cls.wards || []) noteName(`${w.name} Ward`, 1);
        // The Censor's order benefit ships as judgmentOrder text merged into the
        // Judgment card rather than a standalone feature.
        if (sub.id && (cls as any).judgmentOrder?.[sub.id]) noteName(`${sub.name} Judgement Benefit`, 1);

        const table = (LEVELUP_DATA as any)[cls.id] || {};
        for (const { sub: ctxSub, ctx } of contextsFor(cls)) {
          if (ctxSub !== sub.id) continue;
          for (let level = 2; level <= 10; level++) {
            const entry = table[level];
            if (!entry) continue;
            const resolve = (v: any) => (typeof v === 'function' ? v(ctx) : v) || [];
            for (const f of resolve(entry.autoFeatures)) if (f?.name) noteName(f.name, level);
            for (const a of resolve(entry.autoAbilities)) if (a?.name) noteName(a.name, level);
            for (const ch of levelChoicesFor(cls, level, ctx)) {
              for (const o of resolve(ch.options)) if (o?.name) noteName(o.name, level);
            }
          }
        }

        for (const [level, grants] of officialByLevel) {
          for (const g of grants) {
            if (appLevels.has(slug(g.name))) continue;
            missing.push(`${cls.id}${sub.id ? `/${sub.id}` : ''} L${level}: ${g.name}`);
          }
        }
      }
      expect([...new Set(missing)], `${cls.id} is missing official level-up content`).toEqual([]);
    });
  }
});

describe('official fidelity — signature badge', () => {
  // AbilityCard (theme/primitives.jsx) defaults every costless ability with no explicit
  // badge/noBadge to a gold SIG tag. That default must agree with the compendium's
  // system.category, or class features like Mark read as signature abilities.
  // Inertial Step is the one known inconsistency: the book lists it among the null's
  // signature abilities (Heroes p.151) but the compendium leaves its category blank.
  const BLANK_CATEGORY_SIGNATURES = new Set(['Inertial Step']);
  for (const cls of DS_CLASSES as any[]) {
    it(`${cls.id}: default SIG badge matches official category`, () => {
      const problems: string[] = [];
      for (const [name, { ability, scope }] of abilitiesOf(cls)) {
        if (ability.cost) continue;
        const doc = findDoc('ability', name, scope);
        if (!doc) continue;
        const showsSig = !ability.badge && !ability.noBadge;
        const isSig = doc.system?.category === 'signature' || BLANK_CATEGORY_SIGNATURES.has(name);
        if (showsSig !== isSig) {
          problems.push(`${name}: card ${showsSig ? 'shows' : 'hides'} SIG but official category is '${doc.system?.category || ''}'`);
        }
      }
      expect(problems, `${cls.id} signature badges disagree with the compendium`).toEqual([]);
    });
  }
});

// ─── complications: every official advancement is mirrored by machine-readable grant data ───

// camelCase ids the compendium uses for skills/languages → the display names the app stores.
const camel = (name: string) => String(name).replace(/[^A-Za-z0-9 ]/g, '').trim().split(/\s+/)
  .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())).join('');
const SKILL_BY_CAMEL = new Map<string, string>(
  [...new Set(Object.values(DS_SKILL_GROUPS as any).flat())].map((s: any) => [camel(s), s]));
const LANG_BY_CAMEL = new Map<string, string>(
  [...(DS_LANGUAGES as string[]), ...(DS_DEAD_LANGUAGES as string[])].map(l => [camel(l), l]));

/**
 * Places where the app intentionally follows the printed book over the compendium's
 * advancement data, or where the compendium models a grant the app keeps as prose.
 */
const COMPLICATION_EXCEPTIONS: Record<string, string[]> = {
  // Heroes p.239 prints "you gain three skills of your choice"; the compendium advancement
  // says chooseN 2. The app follows the book.
  'ivory-tower': ['skill-count'],
  // The compendium grants Motivate Earth through an itemGrant with an empty pool, so the
  // generic walk can't see it; asserted by name below instead.
  'grounded': ['item-grant'],
  // Heroes p.236 grants one lore skill; the compendium models only the Study Lore project
  // (projects aren't part of the extract), so the app's skillChoices entry is book-backed.
  'consuming-interest': ['app-extra-skill'],
};
const compExempt = (id: string, field: string) => COMPLICATION_EXCEPTIONS[id]?.includes(field);

const compDoc = (comp: any): Doc | null =>
  (byKey.get(`complication:${comp.id}`)?.[0]?.doc) || findDoc('complication', comp.name);

describe('official fidelity — complication grants', () => {
  it('every official skill/language/ability advancement is mirrored in DS_COMPLICATIONS', () => {
    const problems: string[] = [];
    for (const comp of DS_COMPLICATIONS as any[]) {
      const doc = compDoc(comp);
      if (!doc) continue;
      for (const adv of Object.values<any>(doc.system?.advancements || {})) {
        if (adv.type === 'skill') {
          const choices: string[] = (adv.skills?.choices || []).map((s: string) => SKILL_BY_CAMEL.get(s) || s);
          const groups: string[] = adv.skills?.groups || [];
          if (choices.length && (!adv.chooseN || adv.chooseN >= choices.length)) {
            // Fixed grant: every listed skill.
            for (const s of choices) {
              if (!(comp.skills || []).includes(s)) problems.push(`${comp.id}: missing fixed skill "${s}"`);
            }
          } else if (choices.length) {
            // Choose-N from an explicit option list.
            const match = (comp.skillChoices || []).find((ch: any) =>
              ch.options && [...ch.options].sort().join() === [...choices].sort().join() && ch.count === adv.chooseN);
            if (!match) problems.push(`${comp.id}: no skillChoices entry for choose ${adv.chooseN} of [${choices}]`);
          } else if (groups.length) {
            // Choose-N from skill groups. An empty groups list means "any group".
            const match = (comp.skillChoices || []).find((ch: any) =>
              (ch.groups || []).slice().sort().join() === groups.slice().sort().join()
              && (ch.count === adv.chooseN || compExempt(comp.id, 'skill-count')));
            if (!match) problems.push(`${comp.id}: no skillChoices entry for choose ${adv.chooseN} from [${groups}]`);
          } else if (adv.chooseN) {
            // Any-group choice (ivory-tower): expect a skillChoices entry spanning all groups.
            const match = (comp.skillChoices || []).find((ch: any) =>
              (ch.groups || []).length === Object.keys(DS_SKILL_GROUPS as any).length
              && (ch.count === adv.chooseN || compExempt(comp.id, 'skill-count')));
            if (!match) problems.push(`${comp.id}: no all-groups skillChoices entry for choose ${adv.chooseN}`);
          }
        }
        if (adv.type === 'language') {
          const lc = comp.languageChoice;
          if (!lc || lc.count !== adv.chooseN) {
            problems.push(`${comp.id}: languageChoice missing or count != ${adv.chooseN}`);
          } else if ((adv.languages || []).length) {
            const want = (adv.languages || []).map((l: string) => LANG_BY_CAMEL.get(l) || l).sort().join();
            const have = (lc.options || []).slice().sort().join();
            if (want !== have) problems.push(`${comp.id}: languageChoice options drift from official list`);
          }
        }
        if (adv.type === 'itemGrant' && !compExempt(comp.id, 'item-grant')) {
          for (const p of adv.pool || []) {
            const d = byId.get(String(p.uuid).split('.').pop()!);
            if (!d || d.type !== 'ability') continue; // project/treasure grants stay prose
            if (!(comp.abilities || []).some((a: any) => a.name === d.name)) {
              problems.push(`${comp.id}: missing granted ability "${d.name}"`);
            }
          }
        }
      }
    }
    expect(problems, 'complication grants drifted from the compendium').toEqual([]);
  });

  it('grounded grants Motivate Earth (empty itemGrant pool in the compendium)', () => {
    const grounded: any = (DS_COMPLICATIONS as any[]).find(c => c.id === 'grounded');
    expect((grounded.abilities || []).map((a: any) => a.name)).toEqual(['Motivate Earth']);
  });

  it('every app-side grant field is backed by an official advancement (no invented grants)', () => {
    const problems: string[] = [];
    for (const comp of DS_COMPLICATIONS as any[]) {
      const hasGrant = (comp.skills || []).length || (comp.skillChoices || []).length
        || comp.languageChoice || (comp.abilities || []).length;
      if (!hasGrant) continue;
      const doc = compDoc(comp);
      const advs = Object.values<any>(doc?.system?.advancements || {});
      const hasType = (t: string) => advs.some(a => a.type === t);
      if (((comp.skills || []).length || (comp.skillChoices || []).length)
          && !hasType('skill') && !compExempt(comp.id, 'app-extra-skill')) {
        problems.push(`${comp.id}: app grants skills but the compendium has no skill advancement`);
      }
      if (comp.languageChoice && !hasType('language')) {
        problems.push(`${comp.id}: app grants a language but the compendium has no language advancement`);
      }
      if ((comp.abilities || []).length && !hasType('itemGrant')) {
        problems.push(`${comp.id}: app grants abilities but the compendium has no itemGrant advancement`);
      }
    }
    expect(problems, 'app grants something the compendium does not').toEqual([]);
  });
});

describe('official fidelity — complication ability mechanics', () => {
  // The same keyword / power-roll / tier audit the class abilities get.
  const MECH_EXCEPTIONS: Record<string, string[]> = {
    // The compendium encodes Psychic Blast's scaling damage twice per tier — once as
    // display text and once as a min(@level, @spend.0) formula — so the rebuilt official
    // tier double-counts numbers the app's single book line doesn't have.
    'Psychic Blast': ['tier'],
    // Stone Eyes' tier 2/3 potency characteristic is blank in the compendium, so the
    // rebuild falls back to the full roll list ("M or P < AVERAGE"); the book (and tier 1's
    // explicit characteristic) say Might. The app follows the book.
    'Stone Eyes': ['tier'],
  };
  const mechExempt = (name: string, field: string) => MECH_EXCEPTIONS[name]?.includes(field);

  it('complication abilities match their official docs', () => {
    const problems: string[] = [];
    for (const comp of DS_COMPLICATIONS as any[]) {
      for (const ability of comp.abilities || []) {
        const doc = findDoc('ability', ability.name);
        if (!doc) { problems.push(`${comp.id}/${ability.name}: no official ability doc`); continue; }

        const appKw = (ability.keywords || []).filter((k: string) => k !== '—')
          .map((k: string) => k.toLowerCase()).sort();
        const offKw = [...(doc.system?.keywords || [])].sort();
        if (appKw.join(',') !== offKw.join(',') && !mechExempt(ability.name, 'keywords')) {
          problems.push(`${ability.name}: keywords [${appKw}] vs official [${offKw}]`);
        }

        const offChars = canonChars((doc.system?.power?.roll?.characteristics || []).join(' or '));
        if (ability.powerRoll && offChars && canonChars(ability.powerRoll) !== offChars
            && !mechExempt(ability.name, 'power roll')) {
          problems.push(`${ability.name}: power roll ${canonChars(ability.powerRoll)} vs official ${offChars}`);
        }

        const appTiers = tierTexts(ability.tiers);
        if (Object.keys(doc.system?.power?.effects || {}).length && appTiers.some(Boolean)) {
          for (let i = 0; i < 3; i++) {
            const off = officialTier(doc, i + 1);
            if (!off) continue;
            if (tierSignature(appTiers[i] || '') !== tierSignature(off) && !mechExempt(ability.name, 'tier')) {
              problems.push(`${ability.name} tier ${i + 1}: "${appTiers[i]}" vs official "${off}"`);
            }
          }
        }
      }
    }
    expect(problems, 'complication ability mechanics drifted from the compendium').toEqual([]);
  });
});

// ─── ancestry fidelity ───

// App shorthand / compendium typos, canonicalized in both directions:
const ANCESTRY_TRAIT_ALIASES: Record<string, string> = {
  // App shorthand vs the official long form (Heroes p.71).
  'previous-life-1pt': 'previous-life-1-point',
  'previous-life-2pt': 'previous-life-2-points',
  // The compendium misspells the Wode Elf copy 'Otherwordly Grace'; the High Elf copy
  // and the book (Heroes p.75) both print 'Otherworldly'. The app follows the book.
  // ('All Is A Feather' vs 'All Is a Feather' needs no entry — slug() lowercases.)
  'otherwordly-grace': 'otherworldly-grace',
};
const canonTrait = (n: string) => { const k = slug(n); return ANCESTRY_TRAIT_ALIASES[k] || k; };

// Exact-name lookup — findDoc is ambiguous for Revenant, whose 'Revenant (Small)'
// variant is indexed under the same slug.
const ancestryDoc = (name: string) =>
  [...byId.values()].find((d: any) => d.type === 'ancestry' && d.name === name);
const advOf = (doc: Doc, advName: string) =>
  Object.values<any>(doc?.system?.advancements || {}).find(a => a.name === advName);
const poolDocs = (adv: any) =>
  ((adv?.pool || []) as any[]).map(p => byId.get(String(p.uuid).split('.').pop()!)).filter(Boolean);

describe('official fidelity — ancestry traits', () => {
  for (const anc of DS_ANCESTRIES as any[]) {
    it(`${anc.id}: signature/purchased trait sets, costs and budget match`, () => {
      const doc = ancestryDoc(anc.name);
      expect(doc, `no official ancestry document for ${anc.name}`).toBeTruthy();
      expect(ancestrySignatures(anc).map(s => canonTrait(s.name)).sort())
        .toEqual(poolDocs(advOf(doc, 'Signature Trait')).map((d: any) => canonTrait(d.name)).sort());
      const purchased = advOf(doc, 'Purchased Traits');
      const purchDocs = poolDocs(purchased);
      expect((anc.traits || []).map((t: any) => canonTrait(t.name)).sort())
        .toEqual(purchDocs.map((d: any) => canonTrait(d.name)).sort());
      for (const d of purchDocs) {
        const app = anc.traits.find((t: any) => canonTrait(t.name) === canonTrait(d.name));
        expect(app?.cost, `${anc.id}/${d.name} cost`).toBe(d.system.points);
      }
      expect(anc.points, `${anc.id} point budget`).toBe(purchased.chooseN);
    });
  }

  it('revenant (small): the official 3-point budget is covered by ancestryPoints', () => {
    // The compendium ships 'Revenant (Small)' as a separate 13th ancestry; the app
    // models it as revenant + a size-1S former life instead of an extra roster entry.
    const small = ancestryDoc('Revenant (Small)');
    expect(small).toBeTruthy();
    const revenant: any = (DS_ANCESTRIES as any[]).find(a => a.id === 'revenant');
    expect(advOf(small, 'Purchased Traits').chooseN).toBe(revenant.points + 1);
    const big = ancestryDoc('Revenant');
    const names = (d: Doc, adv: string) => poolDocs(advOf(d, adv)).map((x: any) => slug(x.name)).sort();
    expect(names(small, 'Purchased Traits')).toEqual(names(big, 'Purchased Traits'));
    expect(names(small, 'Signature Trait')).toEqual(names(big, 'Signature Trait'));
    const c: any = newCharacter('t', null);
    c.ancestry.id = 'revenant';
    c.ancestry.formerLife = 'polder';
    expect(ancestryPoints(c)).toBe(3);
    c.ancestry.formerLife = 'human';
    expect(ancestryPoints(c)).toBe(2);
  });
});

describe('official fidelity — ancestry ability grants', () => {
  // Pair every official trait/signature doc with its app entry.
  const pairsFor = (anc: any) => {
    const doc = ancestryDoc(anc.name);
    if (!doc) return [];
    return [
      ...poolDocs(advOf(doc, 'Signature Trait')).map((d: any) =>
        ({ d, app: ancestrySignatures(anc).find(s => canonTrait(s.name) === canonTrait(d.name)) })),
      ...poolDocs(advOf(doc, 'Purchased Traits')).map((d: any) =>
        ({ d, app: (anc.traits || []).find((t: any) => canonTrait(t.name) === canonTrait(d.name)) })),
    ];
  };
  const abilityGrants = (d: Doc) =>
    Object.values<any>(d.system?.advancements || {}).filter(a => a.type === 'itemGrant')
      .map(g => ({ g, abilities: poolDocs(g).filter((x: any) => x.type === 'ability') }))
      .filter(x => x.abilities.length);

  it('every official trait/signature ability grant is mirrored in the app data', () => {
    const problems: string[] = [];
    for (const anc of DS_ANCESTRIES as any[]) {
      for (const { d, app } of pairsFor(anc)) {
        for (const { g, abilities } of abilityGrants(d)) {
          const appAbilities = ((app as any)?.abilities || []).map((a: any) => slug(a.name));
          for (const granted of abilities) {
            if (!appAbilities.includes(slug(granted.name))) {
              problems.push(`${anc.id}/${d.name}: missing ability ${granted.name}`);
            }
          }
          if (g.chooseN === 1 && (app as any)?.optionChoice?.count !== 1) {
            problems.push(`${anc.id}/${d.name}: official chooseN 1 not mirrored by optionChoice`);
          }
        }
      }
    }
    expect(problems, 'official ancestry ability grants missing from the app').toEqual([]);
  });

  it('no invented grants: every app ancestry ability maps to an official grant', () => {
    const problems: string[] = [];
    for (const anc of DS_ANCESTRIES as any[]) {
      const officialGrants = new Set<string>();
      for (const { d } of pairsFor(anc)) {
        for (const { abilities } of abilityGrants(d)) {
          for (const x of abilities) officialGrants.add(slug(x.name));
        }
      }
      for (const e of [...ancestrySignatures(anc), ...(anc.traits || [])] as any[]) {
        for (const a of e.abilities || []) {
          if (!officialGrants.has(slug(a.name))) {
            problems.push(`${anc.id}/${e.name}: app grants ${a.name} with no official counterpart`);
          }
        }
      }
    }
    expect(problems, 'app ancestry abilities with no official grant').toEqual([]);
  });
});

describe('official fidelity — ancestry ability mechanics and badge', () => {
  for (const anc of DS_ANCESTRIES as any[]) {
    const entries = ([...ancestrySignatures(anc), ...(anc.traits || [])] as any[]).filter(e => e.abilities);
    if (!entries.length) continue;
    it(`${anc.id}: ancestry abilities match their official docs`, () => {
      const problems: string[] = [];
      for (const e of entries) for (const ability of e.abilities) {
        const doc = findDoc('ability', ability.name, [anc.name]);
        if (!doc) { problems.push(`${ability.name}: no official ability doc`); continue; }

        const appKw = (ability.keywords || []).filter((k: string) => k !== '—')
          .map((k: string) => k.toLowerCase()).sort();
        const offKw = [...(doc.system?.keywords || [])].sort();
        if (appKw.join(',') !== offKw.join(',') && !exempt(ability.name, 'keywords')) {
          problems.push(`${ability.name}: keywords [${appKw}] vs official [${offKw}]`);
        }

        const offChars = canonChars((doc.system?.power?.roll?.characteristics || []).join(' or '));
        if (ability.powerRoll && offChars && canonChars(ability.powerRoll) !== offChars
            && !exempt(ability.name, 'power roll')) {
          problems.push(`${ability.name}: power roll ${canonChars(ability.powerRoll)} vs official ${offChars}`);
        }

        const appTiers = tierTexts(ability.tiers);
        if (Object.keys(doc.system?.power?.effects || {}).length && appTiers.some(Boolean)) {
          for (let i = 0; i < 3; i++) {
            const off = officialTier(doc, i + 1);
            if (!off) continue;
            if (tierSignature(appTiers[i] || '') !== tierSignature(off) && !exempt(ability.name, 'tier')) {
              problems.push(`${ability.name} tier ${i + 1}: "${appTiers[i]}" vs official "${off}"`);
            }
          }
        }

        // The default SIG tag must agree with the official category, like class abilities.
        const showsSig = !ability.cost && !ability.badge && !ability.noBadge;
        const isSig = doc.system?.category === 'signature';
        if (showsSig !== isSig) {
          problems.push(`${ability.name}: card ${showsSig ? 'shows' : 'hides'} SIG but official category is '${doc.system?.category || ''}'`);
        }
      }
      expect(problems, `${anc.id} ancestry abilities drifted from the compendium`).toEqual([]);
    });
  }
});
