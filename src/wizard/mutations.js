// wizard/mutations.js — the creation steps' hero edits as pure (c, …args) => c'
// functions, shared by the classic wizard and the Codex-style creator so the two
// layouts can't drift on what a click does. Each returns `c` itself on a no-op.
// Imports data + helpers only — never app.jsx (helpers.js is imported by app.jsx,
// and this module must stay out of that cycle). Quick-build functions therefore
// take the `taken` map (skillsTakenExcept) as an argument.
import { DS_ANCESTRIES, DS_CAREERS, DS_CLASSES, kitPoolFor } from '../data.jsx';
import { parseCareerSkills, pickPool, classSkillPicks, classGrantedSkills, CHAR_MIN, CHAR_MAX, defaultFlexValues, ancestryPoints, ancestrySpent } from './helpers.js';

const clsOf = (c) => (c.cclass?.id ? DS_CLASSES.find(x => x.id === c.cclass.id) : null);

// Toggle `v` in an array capped at `count` (a full array ignores new values).
const toggleCapped = (arr, v, count) => (arr.includes(v) ? arr.filter(x => x !== v) : (arr.length >= count ? arr : [...arr, v]));
// Same, but a single-pick list swaps instead of refusing (option choices).
const toggleSwapOne = (arr, v, count) => {
  if (arr.includes(v)) return arr.filter(x => x !== v);
  if (count === 1) return [v];
  if (arr.length >= count) return arr;
  return [...arr, v];
};

// ── Ancestry ────────────────────────────────────────────────────────────────

// Re-clicking the already-selected ancestry must not wipe the trait picks.
function setAncestry(c, id) {
  if (c.ancestry.id === id) return c;
  return { ...c, ancestry: { ...c.ancestry, id, traits: [], formerLife: null, prevLifeTraits: {}, sigSkills: {}, sigOptions: {}, traitSkills: {}, traitOptions: {} } };
}

// Drop trait-choice picks that belong to a borrowed (former-life) trait no longer held.
function pruneBorrowedChoices(ancestry) {
  const own = new Set((DS_ANCESTRIES.find(a => a.id === ancestry.id)?.traits || []).map(t => t.name));
  const kept = new Set([...own, ...Object.values(ancestry.prevLifeTraits || {}).filter(Boolean)]);
  const prune = (map) => Object.fromEntries(Object.entries(map || {}).filter(([k]) => kept.has(k)));
  return { ...ancestry, traitSkills: prune(ancestry.traitSkills), traitOptions: prune(ancestry.traitOptions) };
}

function setFormerLife(c, id) {
  const ancestry = pruneBorrowedChoices({ ...c.ancestry, formerLife: id, prevLifeTraits: {} });
  // A smaller budget (leaving a 1S former life) can strand an overspent build —
  // drop the most recently purchased traits until it fits.
  const nextBudget = ancestryPoints({ ...c, ancestry });
  const costOf = (n) => (DS_ANCESTRIES.find(a => a.id === ancestry.id)?.traits || []).find(t => t.name === n)?.cost || 0;
  const traits = [...(ancestry.traits || [])];
  while (traits.reduce((s, n) => s + costOf(n), 0) > nextBudget) traits.pop();
  return { ...c, ancestry: { ...ancestry, traits } };
}

function setPrevLifeTrait(c, cost, traitName) {
  const cur = c.ancestry.prevLifeTraits || {};
  const key = `${cost}pt`;
  const next = { ...cur, [key]: cur[key] === traitName ? null : traitName };
  return { ...c, ancestry: pruneBorrowedChoices({ ...c.ancestry, prevLifeTraits: next }) };
}

// Signature-granted skill choices (e.g. Devil's Silver Tongue).
function toggleSigSkill(c, sigName, count, skill) {
  const cur = (c.ancestry.sigSkills || {})[sigName] || [];
  if (!cur.includes(skill) && cur.length >= count) return c; // at capacity
  return { ...c, ancestry: { ...c.ancestry, sigSkills: { ...(c.ancestry.sigSkills || {}), [sigName]: toggleCapped(cur, skill, count) } } };
}

// Signature-granted option choices (e.g. Dragon Knight's Wyrmplate damage immunity).
function toggleSigOption(c, sigName, count, opt) {
  const cur = (c.ancestry.sigOptions || {})[sigName] || [];
  const next = toggleSwapOne(cur, opt, count);
  if (next === cur) return c;
  return { ...c, ancestry: { ...c.ancestry, sigOptions: { ...(c.ancestry.sigOptions || {}), [sigName]: next } } };
}

// Trait-granted choices (Prismatic Scales, Psionic Gift, Passionate Artisan).
function toggleTraitSkill(c, traitName, count, skill) {
  const cur = (c.ancestry.traitSkills || {})[traitName] || [];
  if (!cur.includes(skill) && cur.length >= count) return c; // at capacity
  return { ...c, ancestry: { ...c.ancestry, traitSkills: { ...(c.ancestry.traitSkills || {}), [traitName]: toggleCapped(cur, skill, count) } } };
}

function toggleTraitOption(c, traitName, count, opt) {
  const cur = (c.ancestry.traitOptions || {})[traitName] || [];
  const next = toggleSwapOne(cur, opt, count);
  if (next === cur) return c;
  return { ...c, ancestry: { ...c.ancestry, traitOptions: { ...(c.ancestry.traitOptions || {}), [traitName]: next } } };
}

// Buy or refund a purchased trait. Buying is refused when it would overspend.
function toggleAncestryTrait(c, traitName) {
  const anc = DS_ANCESTRIES.find(a => a.id === c.ancestry?.id);
  if (!anc) return c;
  const t = anc.traits.find(tr => tr.name === traitName);
  if (!t) return c;
  if ((c.ancestry.traits || []).includes(traitName)) {
    // Clear any linked Previous Life pick and trait choices when the trait is removed.
    const nextPL = { ...(c.ancestry.prevLifeTraits || {}) };
    if (traitName === 'Previous Life: 1pt') delete nextPL['1pt'];
    if (traitName === 'Previous Life: 2pt') delete nextPL['2pt'];
    const nextTS = { ...(c.ancestry.traitSkills || {}) };
    const nextTO = { ...(c.ancestry.traitOptions || {}) };
    delete nextTS[traitName];
    delete nextTO[traitName];
    return { ...c, ancestry: { ...c.ancestry, traits: c.ancestry.traits.filter(x => x !== traitName), prevLifeTraits: nextPL, traitSkills: nextTS, traitOptions: nextTO } };
  }
  if (t.cost > ancestryPoints(c) - ancestrySpent(c)) return c;
  return { ...c, ancestry: { ...c.ancestry, traits: [...(c.ancestry.traits || []), traitName] } };
}

// ── Culture ─────────────────────────────────────────────────────────────────

const CULTURE_ARCHETYPE_FIELD = { environment: 'env', organization: 'org', upbringing: 'upb' };

function setCultureField(c, k, v) {
  return { ...c, culture: { ...c.culture, [k]: v } };
}

// `archetypes` is DS_CULTURES.archetypes (passed in so this module needn't load it).
function setCultureAspect(c, key, itemId, archetypes = []) {
  const skillsCopy = { ...(c.culture.skills || {}) };
  // Clear the picked skill for this aspect; the skill group set may have changed.
  delete skillsCopy[key];
  // If the manual pick diverges from the applied archetype, stop highlighting
  // its chip as if it still described this culture.
  const arche = archetypes.find(a => a.name === c.culture.archetype);
  const archetype = arche && arche[CULTURE_ARCHETYPE_FIELD[key]] === itemId ? c.culture.archetype : null;
  return { ...c, culture: { ...c.culture, [key]: itemId, skills: skillsCopy, archetype } };
}

// Toggle: clicking the picked skill releases it.
function toggleCultureSkill(c, key, skill) {
  const skills = { ...(c.culture.skills || {}) };
  if (skills[key] === skill) delete skills[key];
  else skills[key] = skill;
  return { ...c, culture: { ...c.culture, skills } };
}

function applyCultureArchetype(c, arche) {
  return {
    ...c, culture: {
      ...c.culture,
      environment: arche.env, organization: arche.org, upbringing: arche.upb,
      archetype: arche.name,
      skills: {}, // archetype resets skill picks — choose them next
    },
  };
}

// ── Career ──────────────────────────────────────────────────────────────────

// Picking a career reseeds its auto-granted skills and clears every follow-up.
function setCareer(c, id) {
  const newCar = DS_CAREERS.find(x => x.id === id);
  const parsed = newCar ? parseCareerSkills(newCar) : { auto: [], picks: [] };
  return { ...c, career: { ...c.career, id, incident: '', taken: '', skills: [...parsed.auto], skillPicks: {}, skillSwaps: {}, languages: [], perk: '', perkPicks: { skills: [], languages: [] } } };
}

function setCareerIncident(c, v) { return { ...c, career: { ...c.career, incident: v } }; }
function setCareerTaken(c, v) { return { ...c, career: { ...c.career, taken: v } }; }

// Uncapped like the classic chip grid: the picker blocks chips at capacity.
function toggleCareerLanguage(c, L) {
  const cur = c.career.languages || [];
  return { ...c, career: { ...c.career, languages: cur.includes(L) ? cur.filter(x => x !== L) : [...cur, L] } };
}

// Re-clicking the chosen perk keeps its follow-up picks.
function setCareerPerk(c, v) {
  return c.career.perk === v ? c : { ...c, career: { ...c.career, perk: v, perkPicks: { skills: [], languages: [] } } };
}

function togglePerkPick(c, field, count, v) {
  const cur = { skills: [], languages: [], ...(c.career.perkPicks || {}) };
  cur[field] = toggleCapped(cur[field] || [], v, count);
  return { ...c, career: { ...c.career, perkPicks: cur } };
}

function setCareerSwap(c, skill, name) {
  const next = { ...(c.career.skillSwaps || {}) };
  if (name) next[skill] = name; else delete next[skill];
  return { ...c, career: { ...c.career, skillSwaps: next } };
}

// isOn: whether the skill is currently attributed to this pick group (the caller
// derives it from attributeCareerSkills, which decides where a dual-group skill sits).
function toggleCareerSkill(c, pickIdx, skillName, isOn) {
  const skills = c.career.skills || [];
  const picks = { ...(c.career.skillPicks || {}) };
  let next;
  if (isOn) {
    next = skills.filter(s => s !== skillName);
    delete picks[skillName];
  } else if (skills.includes(skillName)) {
    return c;   // already held by a sibling pick group — rendered blocked
  } else {
    next = [...skills, skillName];
    picks[skillName] = pickIdx;
  }
  return { ...c, career: { ...c.career, skills: next, skillPicks: picks } };
}

// Autos + the career's `quick` field, skipping skills held in another slot.
// No explicit attribution — attributeCareerSkills assigns each to the first pick with room.
function applyCareerQuickBuild(c, taken) {
  const car = DS_CAREERS.find(x => x.id === c.career?.id);
  if (!car) return c;
  const parsed = parseCareerSkills(car);
  const quickList = (car.quick || '').split(/[··,;]/).map(s => s.trim()).filter(Boolean);
  const next = [...new Set([...parsed.auto, ...quickList])].filter(s => !taken.has(s));
  return { ...c, career: { ...c.career, skills: next, skillPicks: {} } };
}

// ── Class ───────────────────────────────────────────────────────────────────

function setClass(c, id) {
  if (c.cclass.id === id) return c; // re-selecting the same class changes nothing
  return {
    ...c,
    level: 1,
    levelChoices: {},
    cclass: {
      ...c.cclass,
      id,
      subclass: null, domains: [],
      domainFeature: null, domainAbility: null, domainSkill: null,
      characteristics: {}, charArrayIndex: 0,
      signatures: [], heroic3: null, heroic5: null,
      skills: [], skillPicks: {}, skillSwaps: {},
      levelAbilities: {},
      prayer: null, ward: null, enchantment: null, triggeredAction: null,
      companion: null, companionOptions: {}, formation: null, quickCommand: null, minions: { sig: [], t3: [] },
    },
    // Reset all play-state resources to their defaults (Heroic Resource is class-specific).
    play: {
      ...c.play,
      stamina: null,
      resource: 0,
      recoveriesUsed: 0,
      victories: 0,
      surges: 0,
      heroTokens: 0,
      conditions: {},
      companionStamina: null,
      rampage: 0,
      squads: [],
    },
  };
}

function setSubclass(c, id) {
  const cls = clsOf(c);
  if (!cls) return c;
  // Subclass can scope the kit pool (e.g. Fury's Stormwight) — drop kit picks
  // that fall outside the new subclass's pool.
  const pool = kitPoolFor(cls, id);
  const keep = (kit) => (kit?.id && pool.some(k => k.id === kit.id)) ? kit : { id: null };
  // Subclass can also grant a skill pick (Tactician doctrines) — drop chosen class
  // skills that no longer fit any pick pool under the new subclass.
  const newSub = (cls.subclasses || []).find(s => (s.id || s.name) === id);
  const pools = classSkillPicks(cls, newSub).map(pickPool);
  const skills = (c.cclass.skills || []).filter(s => pools.some(p => p.includes(s)));
  const skillPicks = Object.fromEntries(Object.entries(c.cclass.skillPicks || {}).filter(([s]) => skills.includes(s)));
  // Duplicate-grant swaps only survive for skills the new subclass still grants.
  const grants = classGrantedSkills(cls, newSub);
  const skillSwaps = Object.fromEntries(Object.entries(c.cclass.skillSwaps || {}).filter(([s]) => grants.includes(s)));
  // Summoner: the circle IS the portfolio — minion picks don't carry across circles.
  const minions = cls.minionPicks ? { sig: [], t3: [] } : c.cclass.minions;
  return { ...c, cclass: { ...c.cclass, subclass: id, skills, skillPicks, skillSwaps, minions }, kit: keep(c.kit), kit2: keep(c.kit2) };
}

// Conduit: pick two domains; dropping one clears the feature/ability tied to it.
function toggleDomain(c, name) {
  const cur = c.cclass.domains || [];
  const clean = (next) => {
    let df = c.cclass.domainFeature;
    let da = c.cclass.domainAbility;
    let ds = c.cclass.domainSkill;
    if (df && !next.includes(df.domain)) { df = null; ds = null; }
    if (da && !next.includes(da.domain)) da = null;
    return { ...c, cclass: { ...c.cclass, domains: next, domainFeature: df, domainAbility: da, domainSkill: ds } };
  };
  if (cur.includes(name)) return clean(cur.filter(x => x !== name));
  if (cur.length >= 2) return clean([cur[1], name]);
  return clean([...cur, name]);
}

function setDomainFeature(c, domain) {
  const f = (typeof window !== 'undefined' ? window.DOMAIN_1ST_FEATURES : null)?.[domain];
  return { ...c, cclass: { ...c.cclass, domainFeature: f ? { domain, name: f.name, text: f.text, skillGroup: f.skillGroup } : null, domainSkill: null } };
}

function setDomainAbility(c, domain) {
  const list = (typeof window !== 'undefined' ? window.DOMAIN_2_ABILITIES : null)?.[domain] || [];
  const ab = list[0];
  return { ...c, cclass: { ...c.cclass, domainAbility: ab ? { domain, name: ab.name } : null } };
}

function setDomainSkill(c, skill) {
  return { ...c, cclass: { ...c.cclass, domainSkill: c.cclass.domainSkill === skill ? null : skill } };
}

// Censor: one domain → its 1st-level feature (auto); re-picking it clears it.
function pickCensorDomain(c, d) {
  if ((c.cclass.domains || [])[0] === d) {
    return { ...c, cclass: { ...c.cclass, domains: [], domainFeature: null, domainSkill: null } };
  }
  const w = typeof window !== 'undefined' ? window : {};
  const f = (w.CENSOR_DOMAIN_1 || w.DOMAIN_1ST_FEATURES || {})[d];
  return { ...c, cclass: { ...c.cclass, domains: [d],
    domainFeature: f ? { domain: d, name: f.name, text: f.text, skillGroup: f.skillGroup } : null,
    domainSkill: null } };
}

// Feature-embedded single picks (prayer, ward, formation, …); re-picking clears.
function setClassChoice(c, stateKey, name) {
  return { ...c, cclass: { ...c.cclass, [stateKey]: c.cclass[stateKey] === name ? null : name } };
}

// Beastheart: the pick also resets any per-companion option.
function setCompanion(c, id) {
  return { ...c, cclass: { ...c.cclass, companion: c.cclass.companion === id ? null : id, companionOptions: {} } };
}

function setCompanionOption(c, optId, val) {
  return { ...c, cclass: { ...c.cclass, companionOptions: { ...(c.cclass.companionOptions || {}), [optId]: val } } };
}

// Summoner portfolio minions, `need` per tier.
function toggleMinion(c, tier, id, need) {
  const cur = (c.cclass.minions || {})[tier] || [];
  let next;
  if (cur.includes(id)) next = cur.filter(x => x !== id);
  else if (cur.length < need) next = [...cur, id];
  else return c;
  return { ...c, cclass: { ...c.cclass, minions: { ...(c.cclass.minions || { sig: [], t3: [] }), [tier]: next } } };
}

function setClassSwap(c, skill, name) {
  const next = { ...(c.cclass.skillSwaps || {}) };
  if (name) next[skill] = name; else delete next[skill];
  return { ...c, cclass: { ...c.cclass, skillSwaps: next } };
}

// isOn: as toggleCareerSkill — whether the skill is attributed to this pick group.
function toggleClassSkill(c, pickIdx, skillName, isOn) {
  const skills = c.cclass.skills || [];
  const sp = { ...(c.cclass.skillPicks || {}) };
  let next;
  if (isOn) {
    next = skills.filter(s => s !== skillName);
    delete sp[skillName];
  } else if (skills.includes(skillName)) {
    return c;   // already held by a sibling pick group — rendered blocked
  } else {
    next = [...skills, skillName];
    sp[skillName] = pickIdx;
  }
  return { ...c, cclass: { ...c.cclass, skills: next, skillPicks: sp } };
}

// The class's suggested skills, minus grants and skills held in another slot.
function applyClassQuickBuild(c, taken) {
  const cls = clsOf(c);
  if (!cls?.quickSkills?.length) return c;
  const sub = (cls.subclasses || []).find(s => (s.id || s.name) === c.cclass.subclass);
  const granted = classGrantedSkills(cls, sub);
  const next = cls.quickSkills.filter(s => !granted.includes(s) && !taken.has(s));
  return { ...c, cclass: { ...c.cclass, skills: next, skillPicks: {} } };
}

function setCharacteristic(c, key, val) {
  const cls = clsOf(c);
  const fixed = cls?.fixedChars || {};
  const v = Math.max(CHAR_MIN, Math.min(CHAR_MAX, val));
  return { ...c, cclass: { ...c.cclass, characteristics: { ...fixed, ...c.cclass.characteristics, [key]: v } } };
}

function resetCharacteristics(c) {
  const cls = clsOf(c);
  if (!cls) return c;
  return { ...c, cclass: { ...c.cclass, characteristics: { ...(cls.fixedChars || {}), ...defaultFlexValues(cls) } } };
}

// Seed a valid default spread once per class (no-op when scores already exist).
function ensureCharacteristics(c) {
  const cls = clsOf(c);
  if (!cls || !cls.flexCharOrder) return c;
  if (c.cclass.characteristics && Object.keys(c.cclass.characteristics).length > 0) return c;
  return resetCharacteristics(c);
}

function toggleSignature(c, name) {
  const cls = clsOf(c);
  const required = cls?.sigCount ?? 1;
  const chosen = c.cclass.signatures || [];
  if (chosen.includes(name)) return { ...c, cclass: { ...c.cclass, signatures: chosen.filter(x => x !== name) } };
  if (chosen.length < required) return { ...c, cclass: { ...c.cclass, signatures: [...chosen, name] } };
  if (required === 1) return { ...c, cclass: { ...c.cclass, signatures: [name] } };
  return c;
}

function setHeroic3(c, n) { return { ...c, cclass: { ...c.cclass, heroic3: n } }; }
function setHeroic5(c, n) { return { ...c, cclass: { ...c.cclass, heroic5: n } }; }
function setKit(c, id) { return { ...c, kit: { id } }; }

// Dual-kit (e.g. Tactician's Field Arsenal): clicking toggles a kit in/out of the
// pair; picking a third drops the oldest.
function pickDualKit(c, id) {
  const k1 = c.kit.id, k2 = c.kit2?.id;
  if (id === k1) return { ...c, kit: { id: k2 || '' }, kit2: { id: '' } };
  if (id === k2) return { ...c, kit2: { id: '' } };
  if (!k1) return { ...c, kit: { id } };
  if (!k2) return { ...c, kit2: { id } };
  return { ...c, kit: { id: k2 }, kit2: { id } };
}

// ── Complication ────────────────────────────────────────────────────────────

function blankComplication(id) {
  return { id, custom: '', skills: {}, skillSwaps: {}, languages: [], ownSkills: {}, options: {}, texts: {}, abilityPicks: {}, forgottenLanguages: [], traits: [] };
}

// Re-clicking the chosen complication keeps its picks.
function setComplication(c, id) {
  return c.complication.id === id ? c : { ...c, complication: blankComplication(id) };
}

function skipComplication(c) {
  return { ...c, complication: blankComplication(null) };
}

function toggleComplicationChoiceSkill(c, i, count, s) {
  const cur = { ...(c.complication.skills || {}) };
  cur[i] = toggleCapped(cur[i] || [], s, count);
  return { ...c, complication: { ...c.complication, skills: cur } };
}

function toggleComplicationLanguage(c, count, L) {
  return { ...c, complication: { ...c.complication, languages: toggleCapped(c.complication.languages || [], L, count) } };
}

function setComplicationSwap(c, skill, name) {
  const next = { ...(c.complication.skillSwaps || {}) };
  if (name) next[skill] = name; else delete next[skill];
  return { ...c, complication: { ...c.complication, skillSwaps: next } };
}

// Toggle a value in a keyed array under c.complication[field] (ownSkills, options).
function toggleComplicationIn(c, field, key, count, value) {
  const cur = { ...(c.complication[field] || {}) };
  cur[key] = toggleCapped(cur[key] || [], value, count);
  return { ...c, complication: { ...c.complication, [field]: cur } };
}

function setComplicationText(c, i, v) {
  return { ...c, complication: { ...c.complication, texts: { ...(c.complication.texts || {}), [i]: v } } };
}

function setComplicationAbility(c, id, name) {
  return { ...c, complication: { ...c.complication, abilityPicks: { ...(c.complication.abilityPicks || {}), [id]: name } } };
}

function toggleForgottenLanguage(c, count, L) {
  return { ...c, complication: { ...c.complication, forgottenLanguages: toggleCapped(c.complication.forgottenLanguages || [], L, count) } };
}

function toggleComplicationTrait(c, name) {
  const cur = c.complication.traits || [];
  return { ...c, complication: { ...c.complication, traits: cur.includes(name) ? cur.filter(x => x !== name) : [...cur, name] } };
}

// ── Identity ────────────────────────────────────────────────────────────────

function setIdentityField(c, k, v) {
  return { ...c, identity: { ...c.identity, [k]: v }, name: k === 'name' ? v : c.name };
}

export {
  setAncestry, setFormerLife, setPrevLifeTrait, toggleSigSkill, toggleSigOption, toggleTraitSkill, toggleTraitOption, toggleAncestryTrait,
  setCultureField, setCultureAspect, toggleCultureSkill, applyCultureArchetype,
  setCareer, setCareerIncident, setCareerTaken, toggleCareerLanguage, setCareerPerk, togglePerkPick, setCareerSwap, toggleCareerSkill, applyCareerQuickBuild,
  setClass, setSubclass, toggleDomain, setDomainFeature, setDomainAbility, setDomainSkill, pickCensorDomain, setClassChoice,
  setCompanion, setCompanionOption, toggleMinion, setClassSwap, toggleClassSkill, applyClassQuickBuild,
  setCharacteristic, resetCharacteristics, ensureCharacteristics, toggleSignature, setHeroic3, setHeroic5, setKit, pickDualKit,
  blankComplication, setComplication, skipComplication, toggleComplicationChoiceSkill, toggleComplicationLanguage, setComplicationSwap,
  toggleComplicationIn, setComplicationText, setComplicationAbility, toggleForgottenLanguage, toggleComplicationTrait,
  setIdentityField,
};
