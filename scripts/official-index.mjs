// Read side of public/foundry-items.json: look documents up, and render the official
// structured fields back into the strings the rulebook prints.
//
// The exporter (src/foundry-export.js) goes app → Foundry. This goes the other way, so the
// audit can compare like with like. Renderers here are the inverse of the vocabularies
// tallied from all 554 official abilities.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { htmlToLine, htmlToText, setApplyResolver } from './html-to-text.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Same normalizer as dsid() in src/foundry-export.js — keys must agree with the exporter.
export const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
// The official content uses UK spelling for a few names ("Judgement"); the book itself
// prints "Judgment". Try both.
const respell = (k) => k.replace(/judgment/g, 'judgement');

const CHAR_LETTER = { might: 'M', agility: 'A', reason: 'R', intuition: 'I', presence: 'P' };
const POTENCY_TIER = { '@potency.weak': 'WEAK', '@potency.average': 'AVERAGE', '@potency.strong': 'STRONG' };
const ACTION_TYPE = {
  main: 'Main action', maneuver: 'Maneuver', triggered: 'Triggered',
  freeTriggered: 'Free triggered action', move: 'Move action',
  freeManeuver: 'Free maneuver', none: '',
};
const COUNT_WORD = ['zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];

export function loadOfficial(file = join(ROOT, 'public', 'foundry-items.json')) {
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  const byId = new Map();
  const byKey = new Map();          // "type:slug" → [{ scope, doc }]
  const effectNames = new Map();    // ActiveEffect id → name, for [[/apply <id>]]
  for (const [key, value] of Object.entries(raw.items)) {
    const entries = Array.isArray(value) ? value : [{ scope: [], doc: value }];
    byKey.set(key, entries);
    for (const { doc } of entries) if (doc?._id) byId.set(doc._id, doc);
  }
  const collectEffects = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(collectEffects);
    if (node._id && node.name && (node.changes || node.system?.changes)) effectNames.set(node._id, node.name);
    Object.values(node).forEach(collectEffects);
  };
  collectEffects(raw.items);
  setApplyResolver((id) => effectNames.get(id));
  return {
    version: raw.version, ref: raw.ref, generated: raw.generated, byId, byKey,

    /** Look a document up by type + name, scoring collisions against a scope hint. */
    find(type, name, scope = []) {
      const slug = norm(name);
      for (const key of [`${type}:${slug}`, `${type}:${respell(slug)}`]) {
        const entries = byKey.get(key);
        if (!entries) continue;
        if (entries.length === 1) return entries[0].doc;
        const want = scope.map(norm);
        const scored = entries.map(e => ({
          doc: e.doc,
          score: (e.scope || []).filter(s => want.includes(s)).length,
        })).sort((a, b) => b.score - a.score);
        return scored[0].doc;
      }
      return null;
    },

    /** All docs of a type that name `dsid` as a prerequisite (i.e. belong to that class). */
    forClass(type, classId) {
      const out = new Map();
      for (const entries of byKey.values()) {
        for (const { doc } of entries) {
          if (doc?.type !== type || out.has(doc._id)) continue;
          if ((doc.system?.prerequisites?.dsid || []).includes(classId)) out.set(doc._id, doc);
        }
      }
      return [...out.values()];
    },
  };
}

// ───────────────────────── field renderers ─────────────────────────

/** power.roll.characteristics → "M", or "M or A" when the ability offers a choice. */
export function rollCharacteristics(doc) {
  return (doc.system?.power?.roll?.characteristics || []).map(c => CHAR_LETTER[c] || c);
}

export function renderDistance(d) {
  if (!d) return '';
  const { type, primary: p, secondary: s, tertiary: t } = d;
  switch (type) {
    case 'self': return 'Self';
    case 'melee': return `Melee ${p}`;
    case 'ranged': return `Ranged ${p}`;
    case 'meleeRanged': return `Melee ${p} or ranged ${s}`;
    case 'cube': return `${p} cube within ${s}`;
    case 'burst': return `${p} burst`;
    case 'aura': return `${p} aura`;
    case 'line': return `${p} × ${s} line within ${t}`;
    case 'wall': return `${p} wall within ${s}`;
    case 'special': return 'Special';
    default: return type || '';
  }
}

const TARGET_NOUN = {
  enemy: 'enemy', creature: 'creature', creatureObject: 'creature or object',
  ally: 'ally', object: 'object', enemyObject: 'enemy or object',
};
const pluralize = (noun) => (noun.endsWith('y') ? `${noun.slice(0, -1)}ies` : `${noun}s`);

const AREA_DISTANCE = new Set(['cube', 'burst', 'aura', 'line', 'wall']);

export function renderTarget(t, distance) {
  if (!t) return '';
  if (t.custom) return t.custom;
  // With no count, an area ability hits everyone in it; a targeted one hits one creature.
  const area = AREA_DISTANCE.has(distance?.type);
  switch (t.type) {
    case 'self': return 'Self';
    case 'selfOrAlly': return 'Self or one ally';
    case 'selfAlly': return t.value == null && area ? 'Self and each ally in the area' : 'Self and one ally';
    case 'selfOrCreature': return 'Self or one creature';
    case 'special': return 'Special';
    default: {
      const noun = TARGET_NOUN[t.type] || t.type || '';
      if (t.value == null) return area ? `Each ${noun} in the area` : `Each ${noun}`;
      const word = COUNT_WORD[t.value] || String(t.value);
      return t.value > 1 ? `${word} ${pluralize(noun)}` : `${word} ${noun}`;
    }
  }
}

export const renderActionType = (t) => ACTION_TYPE[t] ?? t ?? '';

/** ["melee","strike","weapon"] → ["Melee","Strike","Weapon"] (book capitalisation). */
export const renderKeywords = (kw) => (kw || []).map(k => k.replace(/^./, c => c.toUpperCase()));

function renderPotency(potency, fallbackChar) {
  if (!potency?.value) return '';
  const tier = POTENCY_TIER[potency.value] || potency.value;
  const raw = potency.characteristic;
  const char = raw && raw !== 'none' ? CHAR_LETTER[raw] || raw : fallbackChar;
  return char ? `${char} < ${tier}` : tier;
}

/**
 * Rebuild one tier's printed line, e.g. "2 + M holy damage; P < WEAK, slowed (save ends)".
 * The pieces live in separate power.effects entries; only tier1 usually carries the
 * display template, so later tiers reuse it with their own potency substituted.
 */
export function renderTier(doc, tierNo) {
  const chr = rollCharacteristics(doc).join(' or ');
  const effects = Object.values(doc.system?.power?.effects || {})
    .sort((a, b) => (a.sort || 0) - (b.sort || 0));
  const key = `tier${tierNo}`;
  const parts = [];

  for (const eff of effects) {
    const tier = eff[eff.type]?.[key];
    if (!tier) continue;
    // A template only present on tier 1 still describes tiers 2 and 3.
    const template = tier.display || eff[eff.type]?.tier1?.display || '';
    const potency = renderPotency(tier.potency, chr);

    if (eff.type === 'damage') {
      const value = String(tier.value ?? '').replace(/@chr/g, chr).trim();
      if (!value) continue;
      const types = (tier.types || []).join(' and ');
      parts.push(types ? `${value} ${types} damage` : `${value} damage`);
      continue;
    }
    if (eff.type === 'forced') {
      const move = (tier.movement || []).join(' or ');
      const vertical = (tier.properties || []).includes('vertical') ? 'vertical ' : '';
      const text = `${vertical}${move} ${tier.distance ?? ''}`.trim();
      parts.push(template ? template.replace(/\{\{forced\}\}/g, text).replace(/\{\{potency\}\}/g, potency) : text);
      continue;
    }
    if (eff.type === 'resource') {
      // Surges and the like: no display template, just an amount and a resource name.
      const amount = tier.amount;
      const noun = amount === 1 ? tier.type : `${tier.type}s`;
      const text = template
        ? template.replace(/\{\{potency\}\}/g, potency)
        : `Each target gains ${amount} ${noun}`;
      parts.push(text.trim());
      continue;
    }
    // applied / other render through their display template.
    const text = template.replace(/\{\{potency\}\}/g, potency).trim();
    if (text) parts.push(text);
    else if (potency) parts.push(potency);
  }
  return parts.join('; ').replace(/\s{2,}/g, ' ').trim();
}

/**
 * The prose printed under an ability, split the way the book prints it.
 * Foundry keys these effects semantically — `before…`/`after…` are the Effect paragraphs
 * and `spend…` is the "Spend N <resource>:" rider — so the split is exact, not guessed.
 * Effects under a random id are extra notes and join the Effect text.
 */
export function renderEffectParts(doc) {
  const entries = Object.entries(doc.system?.effects || {})
    .sort(([, a], [, b]) => (a.sort || 0) - (b.sort || 0));
  const effect = [];
  const spend = [];
  for (const [key, e] of entries) {
    const text = htmlToText(e.description);
    if (!text) continue;
    (key.startsWith('spend') ? spend : effect).push(text);
  }
  return { effect: effect.join('\n\n'), spend: spend.join('\n\n') };
}

/** Effect and Spend text joined — for similarity scoring against the app's fields. */
export function renderEffectText(doc) {
  const { effect, spend } = renderEffectParts(doc);
  return [effect, spend].filter(Boolean).join('\n\n');
}

/** One official ability flattened into the shape the app stores. */
export function officialAbility(doc) {
  const s = doc.system || {};
  const hasRoll = Object.keys(s.power?.effects || {}).length > 0;
  const parts = renderEffectParts(doc);
  return {
    spend: parts.spend,
    id: doc._id,
    name: doc.name,
    dsid: s._dsid,
    category: s.category || '',
    cost: s.resource == null || s.resource === '' ? null : Number(s.resource),
    keywords: renderKeywords(s.keywords),
    type: renderActionType(s.type),
    distance: renderDistance(s.distance),
    target: renderTarget(s.target, s.distance),
    trigger: htmlToLine(s.trigger || ''),
    powerRoll: rollCharacteristics(doc).join(' or '),
    tiers: hasRoll ? [1, 2, 3].map(n => renderTier(doc, n)) : null,
    effect: parts.effect,
    flavor: htmlToLine(s.story || ''),
    prerequisites: s.prerequisites?.dsid || [],
    page: s.source?.page || null,
    book: s.source?.book || null,
  };
}

/** One official feature/trait flattened the same way. */
export function officialFeature(doc) {
  const s = doc.system || {};
  return {
    id: doc._id,
    name: doc.name,
    dsid: s._dsid,
    text: htmlToText(s.description?.value || ''),
    page: s.source?.page || null,
    book: s.source?.book || null,
  };
}
