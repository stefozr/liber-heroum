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
import { DS_CLASSES } from '../data.jsx';
import { LEVELUP_DATA, makeContext, levelChoicesFor } from '../levelup.jsx';
import { newCharacter } from '../app.jsx';

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
    it(`${cls.id}: every official grant for levels 2-10 is reachable`, () => {
      const subs = (cls.subclasses || []).length ? cls.subclasses : [{ id: null, name: null }];
      const missing: string[] = [];

      for (const sub of subs) {
        // What the compendium grants this class/subclass, bucketed by level.
        const officialByLevel = new Map<number, Array<{ name: string; levels: Set<number> }>>();
        const levelsOfName = new Map<string, Set<number>>();
        const consume = (doc: Doc) => {
          for (const adv of Object.values<any>(doc?.system?.advancements || {})) {
            const level = adv.requirements?.level;
            if (!Number.isFinite(level)) continue;
            for (const p of adv.pool || []) {
              const d = byId.get(String(p.uuid).split('.').pop()!);
              if (!d) continue;
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
            if (!appLevels.has(slug(form))) appLevels.set(slug(form), level);
          }
        };
        for (const [name] of abilitiesOf(cls)) noteName(name, 1);
        for (const f of cls.features || []) if (f.name) noteName(f.name, 1);

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
          if (level < 2) continue;
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
