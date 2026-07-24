// foundry-export.js — convert a character into a FoundryVTT actor document importable
// via the actor sidebar's "Import Data", targeting the Draw Steel system v1.1.x
// (MetaMorphic-Digital/draw-steel, Foundry v14). Pure module: no React, no DOM except
// downloadJson. Only *persisted* Foundry fields are written — derived values (stamina
// max, recoveries max, potency) are recomputed by Foundry from the embedded class item.
import {
  classDef, ancestryDef, kitDef, kit2Def, careerDef, complicationDef,
  computeDerived, summarizeBenefits, collectSkillPicks, collectPerkPicks,
} from './app.jsx';
import { parseKitSig, PERKS } from './wizard/helpers.js';
import { DS_CULTURES } from './data/cultures.js';
import { DS_SKILL_GROUPS } from './data/skills.js';

// ───────── id / slug / naming helpers ─────────

const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function randomId() {
  let s = '';
  for (let i = 0; i < 16; i++) s += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  return s;
}

// Draw Steel content id: lowercase-kebab of the name.
function dsid(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unnamed';
}

// The system's ids for skills/languages are camelCase of the printed name.
function camelId(name) {
  const words = String(name || '').replace(/[^A-Za-z0-9 ]/g, '').trim().split(/\s+/).filter(Boolean);
  return words.map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())).join('');
}
const skillId = camelId;
const langId = camelId;

// Known Foundry skill ids — the app's skill lists mirror the system's, so their
// camelCase forms are the valid id set. Anything else is dropped from skills.value.
const FOUNDRY_SKILL_IDS = new Set(Object.values(DS_SKILL_GROUPS).flat().map(skillId));

// ───────── HTML helpers (biography / item descriptions) ─────────

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function para(text) {
  return text ? `<p>${esc(text)}</p>` : '';
}
function section(title, text) {
  return text ? `<h3>${esc(title)}</h3>${para(text)}` : '';
}

// ───────── parsers ─────────

const CHAR_WORDS = { m: 'might', a: 'agility', r: 'reason', i: 'intuition', p: 'presence' };
const ALL_CHARS = ['might', 'agility', 'reason', 'intuition', 'presence'];
const DAMAGE_TYPES = ['acid', 'cold', 'corruption', 'fire', 'holy', 'lightning', 'poison', 'psychic', 'sonic'];

// 'Might' / 'M' / 'might' → 'might'; unknown → null.
function charKey(word) {
  const w = String(word || '').trim().toLowerCase();
  if (ALL_CHARS.includes(w)) return w;
  return CHAR_WORDS[w] || null;
}

// App distance strings → Foundry distance object.
function parseDistance(str) {
  const d = { type: 'self', primary: '', secondary: '', tertiary: '' };
  const s = String(str || '').trim().toLowerCase();
  if (!s || s === 'self') return d;
  let m;
  if ((m = s.match(/^melee\s*(\d+)?\s*(?:or|\/)\s*ranged\s*(\d+)/))) {
    return { ...d, type: 'meleeRanged', primary: m[1] || '1', secondary: m[2] };
  }
  if ((m = s.match(/^melee\s*(\d+)?/))) return { ...d, type: 'melee', primary: m[1] || '1' };
  if ((m = s.match(/^ranged\s*(\d+)/))) return { ...d, type: 'ranged', primary: m[1] };
  if ((m = s.match(/^(\d+)\s*cubes?\s+within\s+(\d+)/))) return { ...d, type: 'cube', primary: m[1], secondary: m[2] };
  if ((m = s.match(/^(\d+)\s*burst/))) return { ...d, type: 'burst', primary: m[1] };
  if ((m = s.match(/^(\d+)\s*aura/))) return { ...d, type: 'aura', primary: m[1] };
  if ((m = s.match(/^(\d+)\s*[x×]\s*(\d+)\s*line\s+within\s+(\d+)/))) {
    return { ...d, type: 'line', primary: m[1], secondary: m[2], tertiary: m[3] };
  }
  if ((m = s.match(/^(\d+)\s*wall\s+within\s+(\d+)/))) return { ...d, type: 'wall', primary: m[1], secondary: m[2] };
  return { ...d, type: 'special' };
}

// App target strings → Foundry target object. Original text is kept in `custom`.
function parseTarget(str) {
  const raw = String(str || '').trim();
  const s = raw.toLowerCase();
  const out = { type: 'self', value: null, custom: raw };
  if (!s || s === 'self') return out;
  const counts = { one: 1, two: 2, three: 3, four: 4, five: 5 };
  // Count word usually leads ("One creature…") but can sit mid-string ("Self or one ally").
  const cm = s.match(/^(each|every|all)\b/) || s.match(/\b(one|two|three|four|five)\b/);
  if (cm && counts[cm[1]]) out.value = counts[cm[1]];
  if (/creature(s)? or object/.test(s)) out.type = 'creatureObject';
  else if (/self (or|and) (one )?all(y|ies)/.test(s)) out.type = 'selfOrAlly';
  else if (/enem(y|ies)/.test(s)) out.type = 'enemy';
  else if (/all(y|ies)/.test(s)) out.type = 'ally';
  else if (/creature/.test(s)) out.type = 'creature';
  else if (/object/.test(s)) out.type = 'object';
  else out.type = 'special';
  return out;
}

// One tier's text → { damage: {value, types} | null, potency: {value, characteristic} | null,
//                     rest: string, chars: [charKeys...] }
// e.g. '5 + M holy; P<AVERAGE, slowed (save)' →
//   damage {value:'5 + @chr', types:['holy']}, potency {'@potency.average','presence'}, rest 'P<AVERAGE, slowed (save)'
function parseTierClause(text) {
  const out = { damage: null, potency: null, rest: '', chars: [] };
  const clauses = String(text || '').split(';').map(t => t.trim()).filter(Boolean);
  const rest = [];
  const charAlt = '(?:[MARIP]|might|agility|reason|intuition|presence|characteristic)';
  const dmgRe = new RegExp(
    `^(\\d+)(?:\\s*\\+\\s*(${charAlt}(?:\\s*(?:or|,|\\/)\\s*${charAlt})*))?` +
    `(?:\\s+(${DAMAGE_TYPES.join('|')}))?(?:\\s+damage)?\\s*\\.?$`, 'i');
  const potRe = /(?:^|\b)(?:if\s+)?([MARIP])\s*<\s*(WEAK|AVERAGE|STRONG|W|A|S|\d+)\b/i;
  const POT = { w: '@potency.weak', weak: '@potency.weak', a: '@potency.average', average: '@potency.average', s: '@potency.strong', strong: '@potency.strong' };

  for (const [i, clause] of clauses.entries()) {
    const dm = i === 0 ? clause.match(dmgRe) : null;
    if (dm) {
      const [, base, charPart, dtype] = dm;
      let chrs = [];
      if (charPart) {
        if (/characteristic/i.test(charPart)) chrs = [...ALL_CHARS];
        else chrs = charPart.split(/\s*(?:or|,|\/)\s*/i).map(charKey).filter(Boolean);
      }
      out.damage = { value: base + (chrs.length ? ' + @chr' : ''), types: dtype ? [dtype.toLowerCase()] : [] };
      out.chars = chrs;
      continue;
    }
    const pm = clause.match(potRe);
    if (pm && !out.potency) {
      out.potency = {
        characteristic: charKey(pm[1]) || 'none',
        value: POT[pm[2].toLowerCase()] || String(pm[2]),
      };
    }
    rest.push(clause);
  }
  out.rest = rest.join('; ');
  return out;
}

const EMPTY_POTENCY = { value: '', characteristic: 'none' };

// Normalized tiers ([[label, text] × 3]) → power-roll effects collection (hybrid):
// a 'damage' effect when all three tiers parse as damage, plus/or an 'other' effect
// carrying any leftover text verbatim. Also returns the characteristic keys seen.
function parseTiers(tiers, powerRoll) {
  const parsed = tiers.map(t => parseTierClause(t ? t[1] : ''));
  const chars = new Set();
  const pr = charKey(powerRoll);
  if (pr) chars.add(pr);
  for (const p of parsed) for (const k of p.chars) chars.add(k);

  const effects = {};
  const allDamage = parsed.every(p => p.damage);
  if (allDamage) {
    const id = randomId();
    const eff = { type: 'damage', _id: id, name: 'Damage', img: null, sort: 0, damage: {} };
    parsed.forEach((p, i) => {
      eff.damage[`tier${i + 1}`] = {
        value: p.damage.value, types: p.damage.types,
        potency: p.potency || EMPTY_POTENCY, ignoredImmunities: [],
      };
    });
    effects[id] = eff;
  }
  const leftovers = parsed.map(p => (allDamage ? p.rest : String(tiers[parsed.indexOf(p)]?.[1] || '').trim()));
  if (leftovers.some(Boolean)) {
    const id = randomId();
    const eff = { type: 'other', _id: id, name: 'Effect', img: null, sort: allDamage ? 1 : 0, other: {} };
    parsed.forEach((p, i) => {
      eff.other[`tier${i + 1}`] = {
        display: allDamage ? p.rest : String(tiers[i]?.[1] || '').trim(),
        potency: allDamage ? EMPTY_POTENCY : (p.potency || EMPTY_POTENCY),
      };
    });
    effects[id] = eff;
  }
  return { effects, characteristics: [...chars] };
}

// ───────── official compendium substitution ─────────
// public/foundry-items.json (built by scripts/extract-foundry-official.mjs) indexes the
// official Draw Steel system compendium items by "<type>:<name-slug>". When an exported
// item has an official counterpart we embed the official document (icons, formatted HTML,
// advancements, ActiveEffects) instead of the generated one.

// App spelling → official spelling.
const ALIASES = {
  'culture:traveling-entertainers': 'culture:travelling-entertainers',
};
// The official content uses UK spelling for some names ("Judgement").
const respell = (key) => key.replace(/judgment/g, 'judgement');

let _officialIndexPromise = null;
function loadOfficialIndex() {
  if (!_officialIndexPromise) {
    const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || './';
    _officialIndexPromise = fetch(base + 'foundry-items.json')
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return _officialIndexPromise;
}

function lookupOfficial(index, type, name) {
  const key = `${type}:${dsid(name)}`;
  for (const k of [key, ALIASES[key], respell(key)]) {
    if (k && index.items[k]) return index.items[k];
  }
  return null;
}

// Returns a fresh embeddable copy of the official item matching (type, name), or the
// generated fallback. `name` may be an array of candidate names, tried in order (used
// for options the app names differently, e.g. prayer 'Steel' → official 'Prayer of
// Steel'). Collision entries ({scope, doc}[]) are disambiguated by overlap with ctx
// (normalized class/subclass/ancestry names).
function officialOrGenerated(index, type, name, generated, ctx = [], level = 1) {
  if (!index || !index.items || !name) return generated;
  const candidates = Array.isArray(name) ? name : [name];
  let entry = null;
  // Exhaust all candidates on the primary type before the ability fallback — the
  // Conduit ward 'Sanctuary' must reach 'Sanctuary Ward' (feature) rather than
  // being captured by the unrelated official ability named 'Sanctuary'.
  for (const candidate of candidates) {
    entry = lookupOfficial(index, type, candidate);
    if (entry) break;
  }
  if (!entry && type === 'feature') {
    // Some app "features" (e.g. Judgment, triggered actions) are abilities officially.
    for (const candidate of candidates) {
      entry = lookupOfficial(index, 'ability', candidate);
      if (entry) break;
    }
  }
  if (!entry) return generated;

  let doc = entry;
  if (Array.isArray(entry)) {
    let best = entry[0];
    let bestScore = -1;
    for (const e of entry) {
      const score = (e.scope || []).filter(s => ctx.includes(s)).length;
      if (score > bestScore) { best = e; bestScore = score; }
    }
    doc = best.doc;
  }
  const clone = JSON.parse(JSON.stringify(doc));
  clone._id = randomId();
  delete clone._key;
  delete clone.folder;
  if (clone.type === 'class') clone.system.level = level;
  return clone;
}

// ───────── item builders ─────────

function baseItem(name, type, sort) {
  return { _id: randomId(), name, type, img: '', system: {}, effects: [], flags: {}, sort };
}

function descriptionItem(name, type, sort, html, extraSystem) {
  const item = baseItem(name, type, sort);
  item.system = { _dsid: dsid(name), description: { value: html || '' }, ...(extraSystem || {}) };
  return item;
}

// App tiers may be [[label,text]×3] or {t1,t2,t3} — normalize to the array form.
function normalizeTiers(tiers) {
  if (!tiers) return null;
  if (Array.isArray(tiers)) return tiers;
  return [['≤ 11', tiers.t1 || ''], ['12–16', tiers.t2 || ''], ['≥ 17', tiers.t3 || '']];
}

const ABILITY_TYPE_MAP = {
  'main action': 'main', 'action': 'main', 'maneuver': 'maneuver',
  'triggered': 'triggered', 'triggered action': 'triggered',
  'free triggered': 'freeTriggered', 'free triggered action': 'freeTriggered',
  'free maneuver': 'freeManeuver', 'move': 'move', 'no action': 'none',
};

// App ability object (from src/data/classes.js `ab()` and friends) → Foundry ability item.
function abilityItem(a, category, sort) {
  const item = baseItem(a.name, 'ability', sort);
  const tiers = normalizeTiers(a.tiers);
  const distance = parseDistance(a.distance);

  let power = { roll: { formula: '', characteristics: [], reactive: false }, effects: {} };
  if (tiers && tiers.some(t => t && t[1])) {
    const { effects, characteristics } = parseTiers(tiers, a.powerRoll);
    power = { roll: { formula: '@chr', characteristics, reactive: false }, effects };
  }

  // Effect / spend riders → the system's special-effects collection.
  const specialEffects = {};
  const addSpecial = (type, name, description, extra) => {
    if (!description) return;
    const id = randomId();
    specialEffects[id] = {
      _id: id, type, name, img: null, sort: Object.keys(specialEffects).length,
      description: para(description), before: false, ...(extra || {}),
    };
  };
  addSpecial('base', 'Effect', a.effect);
  if (a.orderBenefit) addSpecial('base', 'Order Benefit', a.orderBenefit);
  if (a.spend) addSpecial('spend', 'Spend', a.spend, { resource: { value: a.spendCost || 1, multiple: false } });

  item.system = {
    _dsid: dsid(a.name),
    story: a.flavor || '',
    keywords: (a.keywords || []).map(k => String(k).toLowerCase()),
    type: ABILITY_TYPE_MAP[String(a.type || '').toLowerCase()] || 'main',
    category: category || '',
    resource: a.cost || null,
    trigger: a.trigger || '',
    distance,
    damageDisplay: distance.type === 'ranged' ? 'ranged' : 'melee',
    target: parseTarget(a.target),
    power,
    effects: specialEffects,
  };
  return item;
}

// '+2/+2/+2' | '+0/+0/+4' → {tier1,tier2,tier3}; '—'/missing → zeros.
function damageTriple(v) {
  const m = String(v || '').match(/^([+-]?\d+)\/([+-]?\d+)\/([+-]?\d+)$/);
  if (!m) return { tier1: 0, tier2: 0, tier3: 0 };
  return { tier1: +m[1], tier2: +m[2], tier3: +m[3] };
}

function kitItem(k, sort) {
  const armor = String(k.armor || 'none').toLowerCase();
  const item = descriptionItem(k.name, 'kit', sort, para(k.desc));
  item.system._dsid = k.id;
  item.system.equipment = {
    armor: (armor.match(/^(none|light|medium|heavy)/) || ['', 'none'])[1],
    weapon: String(k.weapon || '').split(/\s*\+\s*/).map(w => w.trim().toLowerCase()).filter(Boolean),
    shield: /shield/i.test(armor),
  };
  item.system.bonuses = {
    stamina: k.bonuses?.sta_per || 0,
    speed: k.bonuses?.spd || 0,
    stability: k.bonuses?.stab || 0,
    disengage: k.bonuses?.disengage || 0,
    melee: { damage: damageTriple(k.bonuses?.melee), distance: k.bonuses?.mDist || 0 },
    ranged: { damage: damageTriple(k.bonuses?.ranged), distance: k.bonuses?.rngDist || 0 },
  };
  return item;
}

// Kit signature string → ability-shaped object (mirrors mkKitSig in play.jsx).
function kitSigAbility(kt) {
  const s = parseKitSig(kt.sig);
  if (!s.name) return null;
  return {
    name: s.name, flavor: '', keywords: ['Weapon'], type: 'Main action',
    distance: s.distance || undefined, tiers: s.rows || undefined,
    powerRoll: '', effect: s.effect || undefined,
  };
}

// ───────── biography / physique helpers ─────────

// '180 lb' → {value:180, units:'lb'}; `5'10"` → {value:70, units:'inches'};
// non-numeric text is preserved losslessly in units.
function parseMeasure(str, defaultUnits) {
  const raw = String(str || '').trim();
  if (!raw) return { value: null, units: defaultUnits };
  let m = raw.match(/^(\d+)\s*'\s*(\d+)?\s*"?$/);
  if (m) return { value: +m[1] * 12 + (+m[2] || 0), units: 'inches' };
  m = raw.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (m) return { value: +m[1], units: m[2].trim() || defaultUnits };
  return { value: null, units: raw };
}

function biographyHtml(c) {
  const id = c.identity || {};
  const lead = [
    id.pronouns && `Pronouns: ${id.pronouns}`,
    (id.deity || c.cclass?.deity) && `Deity: ${id.deity || c.cclass.deity}`,
    c.career?.incident && `Inciting incident: ${c.career.incident}`,
  ].filter(Boolean).join(' · ');
  return [
    para(lead),
    section('Appearance', id.appearance),
    section('Backstory', id.backstory),
    section('Notes', c.play?.notes),
  ].join('');
}

// ───────── main converter ─────────

function characterToFoundryHero(c, officialIndex = null) {
  const cls = classDef(c);
  const anc = ancestryDef(c);
  const kit = kitDef(c);
  const kit2 = kit2Def(c);
  const car = careerDef(c);
  const comp = complicationDef(c);
  const derived = computeDerived(c);
  const benefits = summarizeBenefits(c);
  const name = c.identity?.name || c.name || 'Unnamed Hero';
  const img = c.portrait || 'icons/svg/mystery-man.svg';

  // Disambiguation context for official-index collisions (domain features shared
  // between classes, same-named ancestry traits, ...).
  const subDef = cls && c.cclass?.subclass
    ? (cls.subclasses || []).find(s => s.id === c.cclass.subclass || s.name === c.cclass.subclass)
    : null;
  const ctx = [cls?.name, subDef?.name, anc?.name].filter(Boolean).map(dsid);
  const official = (type, itemName, generated) =>
    officialOrGenerated(officialIndex, type, itemName, generated, ctx, c.level || 1);

  // ── embedded items ──
  const items = [];
  let sort = 0;
  const add = (item) => { if (item) { item.sort = ++sort * 100; items.push(item); } return item; };

  if (cls) {
    const generated = descriptionItem(cls.name, 'class', 0, para(cls.longBlurb || cls.blurb), {
      level: c.level || 1,
      primary: cls.resource || '',
      epic: '',
      turnGain: '2',
      minimum: '0',
      characteristics: { core: Object.keys(cls.fixedChars || {}).map(k => k.toLowerCase()) },
      stamina: { starting: cls.starting?.stamina1 ?? 20, level: cls.starting?.staminaPer ?? 0 },
      recoveries: cls.starting?.recoveries ?? 8,
    });
    generated.system._dsid = cls.id;
    add(official('class', cls.name, generated));
  }

  const sub = subDef;
  if (sub) {
    const parts = [para(sub.text), sub.acolyte ? section(sub.acolyte.name, sub.acolyte.text) : '']
      .concat((sub.features || []).map(f => section(f.name, f.text)));
    add(official('subclass', sub.name, descriptionItem(sub.name, 'subclass', 0, parts.join(''))));
  }

  if (anc) {
    add(official('ancestry', anc.name, descriptionItem(anc.name, 'ancestry', 0, para(anc.desc))));
    if (anc.signature?.name) {
      add(official('ancestryTrait', anc.signature.name,
        descriptionItem(anc.signature.name, 'ancestryTrait', 0, para(anc.signature.text))));
    }
    for (const tName of (c.ancestry?.traits || [])) {
      const t = (anc.traits || []).find(x => x.name === tName);
      add(official('ancestryTrait', tName, descriptionItem(tName, 'ancestryTrait', 0, para(t?.text || ''))));
    }
  }

  {
    const cu = c.culture || {};
    const findIn = (arr, id) => (arr || []).find(x => x.id === id || x.name === id) || null;
    const env = findIn(DS_CULTURES.environments, cu.environment);
    const org = findIn(DS_CULTURES.organizations, cu.organization);
    const upb = findIn(DS_CULTURES.upbringings, cu.upbringing);
    if (env || org || upb || cu.archetype) {
      const html = [
        cu.archetype ? para(`Archetype: ${cu.archetype}`) : '',
        env ? section(`Environment — ${env.name}`, env.desc) : '',
        org ? section(`Organization — ${org.name}`, org.desc) : '',
        upb ? section(`Upbringing — ${upb.name}`, upb.desc) : '',
        cu.language ? para(`Language: ${cu.language}`) : '',
      ].join('');
      // Only archetype cultures have official counterparts; aspect composites stay generated.
      const generated = descriptionItem(cu.archetype || 'Culture', 'culture', 0, html);
      add(cu.archetype ? official('culture', cu.archetype, generated) : generated);
    }
  }

  if (car) {
    const incident = (car.incidents || []).find(i => i.name === c.career?.incident);
    add(official('career', car.name, descriptionItem(car.name, 'career', 0,
      para(car.desc) + (incident ? section(`Inciting Incident — ${incident.name}`, incident.text) : ''))));
  }

  if (comp) {
    add(official('complication', comp.name, descriptionItem(comp.name, 'complication', 0,
      section('Benefit', comp.benefit) + section('Drawback', comp.drawback) + para(c.complication?.custom))));
  }

  const kitItems = [kit, kit2].filter(Boolean).map(k => add(official('kit', k.name, kitItem(k, 0))));

  // Perks: career perk + level-up perks; text looked up across all PERKS groups.
  const perkText = (pname) => {
    for (const group of Object.values(PERKS)) {
      const found = group.find(p => p.name === pname);
      if (found) return found.text;
    }
    return '';
  };
  for (const p of collectPerkPicks(c)) {
    add(official('perk', p.name, descriptionItem(p.name, 'perk', 0, para(perkText(p.name)))));
  }

  // "Choose one" class features (prayers/wards/enchantments/augmentations/triggered
  // actions): export each CHOSEN option as its own item — they have official
  // counterparts, unlike the composite summary summarizeBenefits builds. Candidate
  // names bridge the app's short names to official ones ('Steel' → 'Prayer of Steel').
  // Slot/field mapping mirrors CONFIG in src/wizard/steps/class.jsx.
  const wardCandidates = (n) => [n, `${n} Ward`];
  const CHOOSE_SLOTS = {
    prayerWard: [
      { field: 'prayer', options: 'prayers', candidates: (n) => [`Prayer of ${n}`, n] },
      { field: 'ward', options: 'wards', candidates: wardCandidates },
    ],
    triggered: [
      { field: 'triggeredAction', options: 'triggereds', candidates: (n) => [n] },
    ],
    enchantWard: [
      { field: 'enchantment', options: 'enchantments', candidates: (n) => [n] },
      { field: 'ward', options: 'wards', candidates: wardCandidates },
    ],
    augmentWard: [
      // The Talent's augmentation is stored in the `enchantment` field.
      { field: 'enchantment', options: 'enchantments', candidates: (n) => [n] },
      { field: 'ward', options: 'wards', candidates: wardCandidates },
    ],
    // Null: augmentation only (shares the enchantment field), no ward.
    augment: [
      { field: 'enchantment', options: 'enchantments', candidates: (n) => [n] },
    ],
  };
  const expandedComposites = new Set();
  for (const f of (cls?.features || [])) {
    const slots = f.choose && CHOOSE_SLOTS[f.choose];
    if (!slots) continue;
    for (const slot of slots) {
      const chosen = c.cclass?.[slot.field];
      if (!chosen) continue;
      expandedComposites.add(f.name);
      const opt = (cls[slot.options] || []).find(o => o.name === chosen);
      add(official('feature', slot.candidates(chosen),
        descriptionItem(chosen, 'feature', 0, para(opt?.text || ''))));
    }
  }

  // Class/subclass/domain features (text-only; active abilities are exported below).
  // officialOrGenerated also tries ability: for features that are abilities officially.
  // The "Subclass Name — Pick" composite summarizeBenefits builds is skipped: the
  // official subclass document is already exported above and covers it.
  const subComposite = sub ? `${cls?.subclassName || 'Subclass'} — ${sub.name}` : null;
  for (const f of (benefits.features || [])) {
    if (f.name === 'Heroic Resource' || f.name === subComposite || expandedComposites.has(f.name)) continue;
    // Domain features arrive as "Creation: Hands of the Maker" — the official
    // items key off the bare name, so try it stripped of the domain prefix too.
    const bare = f.name.replace(/^[A-Za-z]+:\s+/, '');
    const names = bare !== f.name ? [f.name, bare] : [f.name];
    add(official('feature', names, descriptionItem(f.name, 'feature', 0, para(f.text || ''))));
  }

  // Abilities, mirroring the Play view's collections (play.jsx:51-97).
  const seenAbilities = new Set();
  const addAbility = (a, category) => {
    if (!a || !a.name || seenAbilities.has(a.name)) return;
    seenAbilities.add(a.name);
    add(official('ability', a.name, abilityItem(a, category, 0)));
  };
  if (cls) {
    for (const a of (cls.signatures || []).filter(a => (c.cclass?.signatures || []).includes(a.name))) {
      addAbility(a, 'signature');
    }
    const h3 = (cls.heroic3 || []).find(x => x.name === c.cclass?.heroic3);
    if (h3) addAbility(h3, 'heroic');
    const h5 = (cls.heroic5 || []).find(x => x.name === c.cclass?.heroic5);
    if (h5) addAbility(h5, 'heroic');
  }
  for (const a of (benefits.classAbilities || [])) addAbility(a, a.cost ? 'heroic' : '');
  if (c.cclass?.domainAbility && typeof window !== 'undefined' && window.DOMAIN_2_ABILITIES) {
    const da = c.cclass.domainAbility;
    const found = (window.DOMAIN_2_ABILITIES[da.domain] || []).find(a => a.name === da.name);
    if (found) addAbility(found, found.cost ? 'heroic' : '');
  }
  const la = c.cclass?.levelAbilities || {};
  for (const lvl of Object.keys(la).sort((a, b) => +a - +b)) {
    for (const a of (la[lvl] || [])) addAbility(a, a.cost ? 'heroic' : '');
  }
  for (const kt of [kit, kit2].filter(Boolean)) addAbility(kitSigAbility(kt), 'signature');

  // ── skills / languages ──
  const skillNames = [
    ...(cls?.quickSkills || []),
    ...(sub?.skill ? [sub.skill] : []),
    ...collectSkillPicks(c).map(p => p.name),
  ];
  const skills = [...new Set(skillNames.map(skillId).filter(id => FOUNDRY_SKILL_IDS.has(id)))];

  const langNames = new Set(['Caelian']);
  if (c.culture?.language) langNames.add(c.culture.language);
  for (const l of (c.career?.languages || [])) langNames.add(l);
  const languages = [...new Set([...langNames].map(langId).filter(Boolean))];

  // ── actor system ──
  const system = {
    characteristics: Object.fromEntries(
      Object.entries(derived.chars).map(([k, v]) => [k.toLowerCase(), { value: v }])),
    stamina: { value: c.play?.stamina ?? derived.staminaMax, temporary: 0 },
    recoveries: { value: Math.max(0, derived.recoveries - (c.play?.recoveriesUsed || 0)) },
    hero: {
      primary: { value: c.play?.resource || 0 },
      epic: { value: 0 },
      surges: c.play?.surges || 0,
      xp: 0,
      victories: c.play?.victories || 0,
      renown: car?.renown || 0,
      wealth: 1 + (car?.wealth || 0),
      preferredKit: kitItems[0]?._id || '',
    },
    skills: { value: skills },
    biography: {
      value: biographyHtml(c),
      languages,
      age: String(c.identity?.age || ''),
      height: parseMeasure(c.identity?.height, 'inches'),
      weight: parseMeasure(c.identity?.weight, 'pounds'),
    },
    // Base values only: kits, traits, complications, and feature picks are all
    // embedded as items whose official ActiveEffects re-apply their bonuses in
    // Foundry — exporting derived totals here would double-count them.
    movement: { value: anc?.speed ?? 5, types: ['walk'], hover: false, disengage: 1 },
    combat: {
      size: (() => {
        const m = String(anc?.size || '1M').match(/^(\d+)\s*([TSMLH]?)$/i);
        return { value: m ? +m[1] : 1, letter: m ? (m[2] || '').toUpperCase() || 'M' : 'M' };
      })(),
      stability: anc?.stability ?? 0,
      turns: 1,
    },
  };

  // No prototypeToken: Foundry v14's import validation requires a complete token
  // schema (e.g. texture.depth), so we let Foundry fill its own defaults instead.
  return {
    name,
    type: 'hero',
    img,
    system,
    items,
    effects: [],
    flags: {},
    ownership: { default: 0 },
  };
}

// ───────── download helper ─────────

function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export {
  characterToFoundryHero, downloadJson, loadOfficialIndex, officialOrGenerated,
  parseTiers, parseTierClause, parseDistance, parseTarget,
  skillId, langId, randomId, dsid,
};
