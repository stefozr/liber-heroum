// creator/skill-slots.js — every source of skills and languages as one ordered list
// of descriptors, for the creator's Skills & Languages step and the informational
// boxes on the other steps. Recomputed from the hero on every render (load-time
// repair passes can prune picks between renders), never memoised across heroes.
//
// Each descriptor wraps logic that already exists — the pools, attribution, swap
// chain and duplicate checks the classic wizard's chip grids use — and its `done`
// mirrors the matching skill/language clause of stepIssueEntries, so "every slot
// done" ⇔ "no skill or language issues" (creator-skills.test.ts holds that).
import { DS_SKILL_GROUPS, DS_LANGUAGES, DS_CULTURES } from '../data.jsx';
import {
  ancestryDef, careerDef, classDef, complicationDef, skillsTakenExcept, languagesTakenExcept,
  duplicateSkillPicks, heldSkillsFor, complicationOwnSkillPicks, collectLanguagePicks,
} from '../app.jsx';
import {
  parseCareerSkills, attributeCareerSkills, pickPool, classSkillPicks, classGrantedSkills, groupsOfSkill,
  careerAutoCollisions, classGrantCollisions, complicationGrantCollisions, resolvedAncestryTraits, ancestrySignatures, PERK_CHOICES,
} from '../wizard/helpers.js';
import { unresolvedSwaps } from '../wizard/Wizard.jsx';
import * as mut from '../wizard/mutations.js';

const groupPool = (groups) => Array.from(new Set((groups || []).flatMap(g => DS_SKILL_GROUPS[g] || [])));
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five'];
const numWord = (n) => NUM[n] || String(n);
const plural = (n, word) => `${numWord(n)} ${word}${n === 1 ? '' : 's'}`;

const ASPECTS = [
  { key: 'environment', name: 'Environment', list: 'environments' },
  { key: 'organization', name: 'Organization', list: 'organizations' },
  { key: 'upbringing', name: 'Upbringing', list: 'upbringings' },
];

// A pick slot over one or more groups. `attr` maps a picked name to the group it
// counts toward (career/class attribution); single-group slots attribute to 0.
function pickSlot({ id, key, step, source, granted = [], grantFlags = new Map(), groups, picked, attr, taken, dupIssues = [], toggle, done, quickBuild = null, quickLabel = null, note = null }) {
  const attribution = attr || new Map(picked.map(n => [n, 0]));
  const inGroup = (idx) => picked.filter(n => attribution.get(n) === idx);
  const issues = dupIssues.map(d => `Duplicate skill: ${d.name} already held by ${d.holder} — choose another`);
  const dupNames = new Set(dupIssues.map(d => d.name));
  return {
    id, key, step, source, kind: 'pick', granted, grantFlags, note,
    groups: groups.map((g, idx) => ({ ...g, idx, picked: inGroup(idx) })),
    picked, taken, issues, dupNames,
    done: done && issues.length === 0,
    toggle, quickBuild, quickLabel,
    isOn: (name, idx = 0) => attribution.get(name) === idx,
    blockedReason(name, idx = 0) {
      if (attribution.get(name) === idx) return null; // a pick is always removable
      if (granted.includes(name)) return `Granted by ${source}`;
      if (picked.includes(name)) return `Already chosen — ${source}`;
      if (taken.has(name)) return `Already chosen — ${taken.get(name)}`;
      const g = groups[idx];
      if (g && inGroup(idx).length >= g.count) return `Already picked ${g.count}`;
      return null;
    },
  };
}

// The collision helpers name the holding step ("Career"); say which career or class.
function holderName(c, source) {
  if (source === 'Career') return careerDef(c)?.name || source;
  if (source === 'Class') return classDef(c)?.name || source;
  return source;
}

// A slot's auto-grants that another source already holds → Map<skill, { reason, open }>
// for the chip (`open` until a replacement is chosen); the "Granted: …" note names the
// same state in words.
function grantFlags(c, collisions, swaps) {
  return new Map(collisions.map(({ skill, source }) => [skill, swaps[skill]
    ? { reason: `Also granted by ${holderName(c, source)} — replaced by ${swaps[skill]}`, open: false }
    : { reason: `Also granted by ${holderName(c, source)} — choose a replacement below`, open: true }]));
}

function grantNote(c, granted, collisions, swaps) {
  const holder = new Map(collisions.map(x => [x.skill, holderName(c, x.source)]));
  const label = (s) => !holder.has(s) ? s
    : swaps[s] ? `${s} → ${swaps[s]}`
    : `${s} (already from ${holder.get(s)} — pick a replacement below)`;
  return `Granted: ${granted.map(label).join(', ')}`;
}

// The "choose another instead" slot for one duplicated auto-grant.
function swapSlots({ step, source, collisions, swaps, ownKey, ownNames, c, setSwap }) {
  if (!collisions.length) return [];
  const taken = skillsTakenExcept(c, ownKey);
  const unresolved = unresolvedSwaps(c, collisions, swaps, ownKey, ownNames);
  return collisions.map(({ skill, source: holder }) => {
    const groups = groupsOfSkill(skill);
    const pool = groupPool(groups).filter(s => s !== skill);
    const chosen = (swaps || {})[skill] || null;
    const otherSwaps = Object.entries(swaps || {}).filter(([k]) => k !== skill).map(([, v]) => v);
    return {
      id: `swap:${ownKey}:${skill}`, key: null, step, source, kind: 'swap',
      collision: { skill, source: holder }, holder: holderName(c, holder), groupNames: groups, pool, chosen,
      picked: chosen ? [chosen] : [], granted: [], taken, issues: [],
      done: !unresolved.includes(skill),
      toggle: (cc, name) => setSwap(cc, skill, (cc_swaps(cc, ownKey)[skill] === name) ? null : name),
      isOn: (name) => chosen === name,
      blockedReason(name) {
        if (chosen === name) return null;
        if (taken.has(name)) return `Already chosen — ${taken.get(name)}`;
        if (ownNames.includes(name) || otherSwaps.includes(name)) return 'Already chosen';
        return null;
      },
    };
  });
}

// The stored swaps map for a swap owner, read from a (possibly newer) hero.
function cc_swaps(c, ownKey) {
  if (ownKey === 'career') return c.career?.skillSwaps || {};
  if (ownKey === 'class') return c.cclass?.skillSwaps || {};
  return c.complication?.skillSwaps || {};
}

// "Choose N of your skills" (Area of Expertise, Rival): the pool is skills already held.
function ownSkillSlot({ id, step, source, label, note, count, groups, pool, picked, toggle }) {
  const got = picked.filter(s => pool.includes(s));
  return {
    id, key: null, step, source, kind: 'ownSkill', label, note, granted: [],
    groups: [{ idx: 0, count, groups, label: `${label} — choose ${numWord(count)} of your ${(groups || []).join(' / ')} skills`.replace(/ {2,}/g, ' '), pool, picked: got }],
    picked: got, taken: new Map(), issues: [],
    done: pool.length < count || got.length >= count,
    pending: pool.length === 0 ? `This pick draws on the ${(groups || []).join(' / ')} skills you gain elsewhere — none yet.` : null,
    toggle,
    isOn: (name) => got.includes(name),
    blockedReason: (name) => (got.includes(name) ? null : got.length >= count ? `Already picked ${count}` : null),
  };
}

function skillSlots(c) {
  const out = [];

  // ── Ancestry: signature and purchased-trait skill choices ──
  const anc = ancestryDef(c);
  if (anc) {
    const dups = duplicateSkillPicks(c);
    for (const sig of ancestrySignatures(anc)) {
      if (!sig.skillChoice) continue;
      const key = 'sig:' + sig.name;
      const picked = ((c.ancestry.sigSkills || {})[sig.name] || []).filter(Boolean);
      const { count, groups } = sig.skillChoice;
      out.push(pickSlot({
        id: key, key, step: 'ancestry', source: `${anc.name} — ${sig.name}`,
        groups: [{ count, groups, label: `Choose ${numWord(count)} skill${count === 1 ? '' : 's'} from the ${groups.join(' or ')} skill group`, pool: groupPool(groups) }],
        picked, taken: skillsTakenExcept(c, key), dupIssues: dups.filter(d => d.key === key),
        toggle: (cc, name) => mut.toggleSigSkill(cc, sig.name, count, name),
        done: picked.length >= count,
      }));
    }
    for (const t of resolvedAncestryTraits(c)) {
      if (t.placeholder || !t.skillChoice) continue;
      const key = 'trait:' + t.name;
      const picked = (t.chosen || []).filter(Boolean);
      const { count, groups } = t.skillChoice;
      out.push(pickSlot({
        id: key, key, step: 'ancestry', source: `${t.borrowedFrom || anc.name} — ${t.name}`,
        groups: [{ count, groups, label: `Choose ${numWord(count)} skill${count === 1 ? '' : 's'} from the ${groups.join(' or ')} skill group`, pool: groupPool(groups) }],
        picked, taken: skillsTakenExcept(c, key), dupIssues: dups.filter(d => d.key === key),
        toggle: (cc, name) => mut.toggleTraitSkill(cc, t.name, count, name),
        done: picked.length >= count,
      }));
    }
  }

  // ── Culture: one skill per aspect. The culture chapter has no "not chosen" early
  // return, so an unchosen aspect still owes its skill — it shows as pending. ──
  {
    const cu = c.culture || {};
    const dups = duplicateSkillPicks(c);
    for (const { key: aspect, name, list } of ASPECTS) {
      const key = 'culture:' + aspect;
      const sel = (DS_CULTURES[list] || []).find(it => it.id === cu[aspect]);
      const cur = (cu.skills || {})[aspect] || null;
      const taken = skillsTakenExcept(c, key);
      if (!sel) {
        out.push({
          id: key, key, step: 'culture', source: `Culture — ${name}`, kind: 'pick', granted: [], groups: [], picked: [],
          taken, issues: [], done: false, pending: `Choose your ${name.toLowerCase()} on the Culture step to unlock this skill.`,
          toggle: (cc) => cc, isOn: () => false, blockedReason: () => null,
        });
        continue;
      }
      const pool = Array.from(new Set(sel.skills ? sel.skills : groupPool(sel.skillGroups)));
      const label = sel.skillLabel || (sel.skillGroups || []).join(' / ');
      const quickOk = sel.quick && !taken.has(sel.quick);
      out.push(pickSlot({
        id: key, key, step: 'culture', source: `${sel.name} (${name.toLowerCase()})`,
        groups: [{ count: 1, groups: sel.skillGroups, label: `Choose one skill from ${label}`, pool }],
        picked: cur ? [cur] : [], taken, dupIssues: dups.filter(d => d.key === key),
        toggle: (cc, s) => mut.toggleCultureSkill(cc, aspect, s),
        done: !!cur,
        quickBuild: quickOk && !cur ? (cc) => mut.toggleCultureSkill(cc, aspect, sel.quick) : null,
        quickLabel: sel.quick || null,
      }));
    }
  }

  // ── Career: autos (granted), pick groups, duplicate-grant swaps, perk own-skill ──
  const car = careerDef(c);
  if (car) {
    const parsed = parseCareerSkills(car);
    const skills = c.career.skills || [];
    const attr = attributeCareerSkills(parsed, skills, c.career.skillPicks);
    const required = parsed.auto.length + parsed.picks.reduce((s, p) => s + p.count, 0);
    const picked = skills.filter(s => !parsed.auto.includes(s));
    const swaps = c.career.skillSwaps || {};
    const collisions = careerAutoCollisions(c);
    const takenCareer = skillsTakenExcept(c, 'career');
    out.push(pickSlot({
      id: 'career', key: 'career', step: 'career', source: car.name,
      granted: parsed.auto, grantFlags: grantFlags(c, collisions, swaps), note: parsed.auto.length ? grantNote(c, parsed.auto, collisions, swaps) : null,
      groups: parsed.picks.map(p => ({ count: p.count, groups: p.groups, options: p.options, label: `Choose ${p.label}`, pool: pickPool(p) })),
      picked, attr, taken: takenCareer, dupIssues: duplicateSkillPicks(c).filter(d => d.key === 'career'),
      toggle: (cc, name, idx) => {
        const ccar = careerDef(cc);
        const cp = ccar ? parseCareerSkills(ccar) : parsed;
        const isOn = attributeCareerSkills(cp, cc.career.skills || [], cc.career.skillPicks).get(name) === idx;
        return mut.toggleCareerSkill(cc, idx, name, isOn);
      },
      done: skills.length >= required,
      quickBuild: parsed.picks.length && car.quick ? (cc) => mut.applyCareerQuickBuild(cc, skillsTakenExcept(cc, 'career')) : null,
      quickLabel: car.quick || null,
    }));
    out.push(...swapSlots({ step: 'career', source: car.name, collisions, swaps, ownKey: 'career', ownNames: skills, c, setSwap: mut.setCareerSwap }));
    const spec = c.career.perk && PERK_CHOICES[c.career.perk];
    if (spec?.ownSkill) {
      const { count, groups, label, note } = spec.ownSkill;
      out.push(ownSkillSlot({
        id: 'perk:career:skill', step: 'career', source: `${c.career.perk} perk`, label, note, count, groups,
        pool: heldSkillsFor(c, { groups }), picked: (c.career.perkPicks?.skills || []),
        toggle: (cc, s) => mut.togglePerkPick(cc, 'skills', count, s),
      }));
    }
  }

  // ── Class: grants, pick groups (incl. a subclass's skill-group pick), swaps, domain skill ──
  const cls = classDef(c);
  if (cls) {
    const sub = (cls.subclasses || []).find(s => (s.id || s.name) === c.cclass.subclass);
    const picks = classSkillPicks(cls, sub);
    const granted = classGrantedSkills(cls, sub);
    const chosen = c.cclass.skills || [];
    const swaps = c.cclass.skillSwaps || {};
    const collisions = classGrantCollisions(c);
    const need = picks.reduce((s, p) => s + p.count, 0);
    if (picks.length || granted.length) {
      out.push(pickSlot({
        id: 'class', key: 'class', step: 'class', source: sub?.skillGroup ? `${cls.name} · ${sub.name}` : cls.name,
        granted, grantFlags: grantFlags(c, collisions, swaps), note: granted.length ? grantNote(c, granted, collisions, swaps) : null,
        groups: picks.map(p => ({ count: p.count, groups: p.groups, options: p.options, label: `Choose ${p.label}`, pool: pickPool(p) })),
        picked: chosen, attr: attributeCareerSkills({ auto: granted, picks }, chosen, c.cclass.skillPicks),
        taken: skillsTakenExcept(c, 'class'), dupIssues: duplicateSkillPicks(c).filter(d => d.key === 'class'),
        toggle: (cc, name, idx) => {
          const ccls = classDef(cc);
          const csub = (ccls?.subclasses || []).find(s => (s.id || s.name) === cc.cclass.subclass);
          const cpicks = classSkillPicks(ccls, csub);
          const isOn = attributeCareerSkills({ auto: classGrantedSkills(ccls, csub), picks: cpicks }, cc.cclass.skills || [], cc.cclass.skillPicks).get(name) === idx;
          return mut.toggleClassSkill(cc, idx, name, isOn);
        },
        done: chosen.length >= need,
        quickBuild: picks.length && cls.quickSkills?.length ? (cc) => mut.applyClassQuickBuild(cc, skillsTakenExcept(cc, 'class')) : null,
        quickLabel: cls.quickSkills?.length ? cls.quickSkills.join(', ') : null,
      }));
    }
    out.push(...swapSlots({ step: 'class', source: cls.name, collisions, swaps, ownKey: 'class', ownNames: [...granted, ...chosen], c, setSwap: mut.setClassSwap }));
    if (cls.pickTwoDomains || cls.pickOneDomain) {
      const df = c.cclass.domainFeature;
      if (!df) {
        // Listed from the start like the class docket does: the skill a domain
        // feature grants only becomes choosable once the feature is picked.
        out.push({
          id: 'domain', key: 'domain', step: 'class', source: 'Domain skill', kind: 'pick', granted: [], groups: [], picked: [],
          taken: new Map(), issues: [], done: true, pending: `Choose your domain${cls.pickTwoDomains ? ' feature' : ''} on the Class step — it may grant a skill.`,
          toggle: (cc) => cc, isOn: () => false, blockedReason: () => null,
        });
      } else if (df.skillGroup) {
        const cur = c.cclass.domainSkill;
        out.push(pickSlot({
          id: 'domain', key: 'domain', step: 'class', source: `${df.domain} domain — ${df.name}`,
          groups: [{ count: 1, groups: [df.skillGroup], label: `Choose one skill from the ${df.skillGroup} skill group`, pool: groupPool([df.skillGroup]) }],
          picked: cur ? [cur] : [], taken: skillsTakenExcept(c, 'domain'), dupIssues: duplicateSkillPicks(c).filter(d => d.key === 'domain'),
          toggle: (cc, s) => mut.setDomainSkill(cc, s),
          done: !!cur,
        }));
      }
    }
  }

  // ── Complication: fixed grants (+ swaps), skill choices, own-skill picks ──
  const comp = complicationDef(c);
  if (comp) {
    const fixed = comp.skills || [];
    const swaps = c.complication.skillSwaps || {};
    const collisions = complicationGrantCollisions(c);
    if (fixed.length) {
      out.push({
        id: 'comp:fixed', key: 'comp:fixed', step: 'complication', source: comp.name, kind: 'grant',
        granted: fixed, grantFlags: grantFlags(c, collisions, swaps), note: grantNote(c, fixed, collisions, swaps),
        groups: [], picked: [], taken: new Map(), issues: [], done: true,
        toggle: (cc) => cc, isOn: () => false, blockedReason: () => null,
      });
    }
    const ownNames = [...fixed, ...Object.values(c.complication.skills || {}).flat()];
    out.push(...swapSlots({ step: 'complication', source: comp.name, collisions, swaps, ownKey: 'comp:fixed', ownNames, c, setSwap: mut.setComplicationSwap }));
    const dups = duplicateSkillPicks(c);
    (comp.skillChoices || []).forEach((ch, i) => {
      const key = 'comp:' + i;
      const pool = ch.options || groupPool(ch.groups);
      const picked = ((c.complication.skills || {})[i] || []);
      const what = ch.options ? 'the listed' : `the ${(ch.groups || []).join(' or ')}`;
      out.push(pickSlot({
        id: key, key, step: 'complication', source: ch.label ? `${comp.name} — ${ch.label}` : comp.name, note: ch.note || null,
        groups: [{ count: ch.count, groups: ch.groups, options: ch.options, label: `Choose ${numWord(ch.count)} skill${ch.count === 1 ? '' : 's'} from ${what} skill${ch.options ? 's' : ' group'}`, pool }],
        picked, taken: skillsTakenExcept(c, key), dupIssues: dups.filter(d => d.key === key),
        toggle: (cc, s) => mut.toggleComplicationChoiceSkill(cc, i, ch.count, s),
        done: picked.length >= ch.count,
      }));
    });
    const own = complicationOwnSkillPicks(c);
    (comp.ownSkillChoices || []).forEach((ch, i) => {
      out.push(ownSkillSlot({
        id: 'comp:own:' + i, step: 'complication', source: `${comp.name} — ${ch.label}`, label: ch.label, note: ch.note, count: ch.count, groups: ch.groups,
        pool: heldSkillsFor(c, { groups: ch.groups, excludeKeyPrefix: ch.excludeOwnGrants ? 'comp:' : null }), picked: own[i] || [],
        toggle: (cc, s) => mut.toggleComplicationIn(cc, 'ownSkills', i, ch.count, s),
      }));
    });
  }

  return out;
}

// A language slot: choose `count` from `pool`, with cross-slot dedupe via `taken`.
function langSlot({ id, step, source, count, pool = DS_LANGUAGES, picked, taken, toggle, kind = 'pick', label = null, single = false }) {
  const full = picked.length >= count;
  return {
    id: 'lang:' + id, key: id, lang: true, step, source, kind, granted: [], label,
    groups: [{ idx: 0, count, label: label || `${kind === 'loss' ? 'Forget' : 'Choose'} ${plural(count, 'language')}`, pool, picked }],
    picked, taken, issues: [], done: full,
    toggle,
    isOn: (L) => picked.includes(L),
    blockedReason(L) {
      if (picked.includes(L)) return null;
      if (taken.has(L)) return `Already known — ${taken.get(L)}`;
      if (full && !single) return `Already picked ${count}`;
      return null;
    },
  };
}

function languageSlots(c) {
  const out = [];
  out.push({
    id: 'lang:standard', key: 'standard', lang: true, step: 'culture', source: 'Every hero', kind: 'grant', granted: ['Caelian'],
    note: 'All heroes know Caelian, the common tongue.', groups: [], picked: [], taken: new Map(), issues: [], done: true,
    toggle: (cc) => cc, isOn: () => false, blockedReason: () => null,
  });
  const cu = c.culture || {};
  // A single pick: choosing another language swaps rather than refusing.
  out.push(langSlot({
    id: 'culture', step: 'culture', source: 'Culture — native language', count: 1, single: true,
    picked: cu.language ? [cu.language] : [], taken: languagesTakenExcept(c, ['culture', 'standard']),
    toggle: (cc, L) => mut.setCultureField(cc, 'language', cc.culture.language === L ? '' : L),
    label: 'Choose your culture’s language',
  }));
  const car = careerDef(c);
  if (car && (car.languages || 0) > 0) {
    out.push(langSlot({
      id: 'career', step: 'career', source: car.name, count: car.languages,
      picked: c.career.languages || [], taken: languagesTakenExcept(c, 'career'),
      toggle: (cc, L) => {
        const cur = cc.career.languages || [];
        if (!cur.includes(L) && cur.length >= car.languages) return cc;
        return mut.toggleCareerLanguage(cc, L);
      },
    }));
  }
  const spec = c.career?.perk && PERK_CHOICES[c.career.perk];
  if (spec?.languages) {
    const count = spec.languages.count;
    out.push(langSlot({
      id: 'perk:career', step: 'career', source: `${c.career.perk} perk`, count,
      picked: c.career.perkPicks?.languages || [], taken: languagesTakenExcept(c, 'perk:career'),
      toggle: (cc, L) => mut.togglePerkPick(cc, 'languages', count, L),
    }));
  }
  const comp = complicationDef(c);
  if (comp?.languageChoice) {
    const { count, options } = comp.languageChoice;
    out.push(langSlot({
      id: 'complication', step: 'complication', source: comp.name, count, pool: options || DS_LANGUAGES,
      picked: c.complication.languages || [], taken: languagesTakenExcept(c, 'complication'),
      toggle: (cc, L) => mut.toggleComplicationLanguage(cc, count, L),
      label: `Choose ${plural(count, options ? 'dead language' : 'language')}`,
    }));
  }
  if (comp?.languageLoss) {
    const { count, label } = comp.languageLoss;
    const forgotten = c.complication.forgottenLanguages || [];
    out.push(langSlot({
      id: 'forgotten', step: 'complication', source: `${comp.name} — ${label}`, count, kind: 'loss',
      pool: Array.from(new Set([...collectLanguagePicks(c).map(p => p.name), ...forgotten])),
      picked: forgotten, taken: new Map(),
      toggle: (cc, L) => mut.toggleForgottenLanguage(cc, count, L),
      label: `Forget ${plural(count, 'language')}`,
    }));
  }
  return out;
}

const allSlots = (c) => [...skillSlots(c), ...languageSlots(c)];
const slotsForStep = (c, stepId) => allSlots(c).filter(s => s.step === stepId);

// How many skills and languages a step grants, for its "Skills & Languages" box:
// { skills, languages, forget }. A swap or an own-skill pick adds no new skill (it
// replaces or reuses one); an unchosen culture aspect still owes its one skill.
function stepGrantCounts(c, stepId) {
  const sumGroups = (s) => (s.groups || []).reduce((n, g) => n + g.count, 0);
  let skills = 0, languages = 0, forget = 0;
  for (const s of skillSlots(c)) {
    if (s.step !== stepId || s.kind === 'swap' || s.kind === 'ownSkill') continue;
    if (s.pending) { if (s.key?.startsWith('culture:')) skills += 1; continue; }
    skills += (s.granted?.length || 0) + sumGroups(s);
  }
  for (const s of languageSlots(c)) {
    if (s.step !== stepId) continue;
    if (s.kind === 'loss') forget += sumGroups(s);
    else languages += (s.granted?.length || 0) + sumGroups(s);
  }
  return { skills, languages, forget };
}

export { skillSlots, languageSlots, allSlots, slotsForStep, stepGrantCounts };
