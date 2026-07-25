// wizard/helpers.js — pure helpers + shared constants for the creation wizard.
import { DS_SKILL_GROUPS } from '../data.jsx';
import { DS_CAREERS } from '../data/careers.js';
import { DS_CLASSES } from '../data/classes.js';

function timeString(at) {
  const d = at != null ? new Date(at) : new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}


function parseCareerSkills(career) {
  const text = career.skills || '';
  const allSkills = new Set(Object.values(DS_SKILL_GROUPS).flat());
  const groupNames = Object.keys(DS_SKILL_GROUPS);
  const auto = [];
  const picks = [];
  const parts = text.split(';').map(s => s.trim()).filter(Boolean);
  const numWord = { one: 1, two: 2, three: 3, four: 4 };

  for (const part of parts) {
    // Direct skill name (possibly multi-word)
    if (allSkills.has(part)) { auto.push(part); continue; }
    // "Music or Perform" — pick-one alternative between known skills
    if (/\bor\b/i.test(part) && !/^(one|two|three)\b/i.test(part)) {
      const opts = part.split(/\s+or\s+/i).map(s => s.trim());
      if (opts.every(o => allSkills.has(o))) { picks.push({ count: 1, options: opts, label: opts.join(' or ') }); continue; }
    }
    // "one interpersonal + one intrigue" or "two crafting/exploration" or "two more lore"
    const subs = part.split(/\s*\+\s*/);
    for (const sp of subs) {
      const m = sp.match(/^(one|two|three|four)\s+(?:more\s+)?([\w\/-]+)/i);
      if (m) {
        const n = numWord[m[1].toLowerCase()] || 1;
        const tokens = m[2].toLowerCase().split('/');
        const groups = tokens.filter(g => groupNames.includes(g));
        if (groups.length) {
          picks.push({ count: n, groups, label: `${m[1]} ${tokens.join(' or ')}` });
        }
      }
    }
  }
  return { auto, picks };
}

// Resolve a pick group's selectable pool: every member of its named groups plus any
// extra named options (Tactician's list, Shadow's Criminal Underworld).
function pickPool(p) {
  return Array.from(new Set([...(p.groups || []).flatMap(g => DS_SKILL_GROUPS[g] || []), ...(p.options || [])]));
}

// Class skill choice groups for a class + chosen subclass: the class's own skillPicks
// plus one extra single pick when the subclass grants a skill-group choice
// (Tactician doctrines). Same {count, groups, options?, label} shape as career picks.
const NUM_NAMES = ['zero', 'one', 'two', 'three', 'four', 'five'];
function classSkillPicks(cls, sub) {
  const picks = (cls?.skillPicks || []).map(p => ({
    ...p,
    label: p.label || `${NUM_NAMES[p.count] || p.count} from ${(p.groups || []).join(' or ')}${p.options?.length ? ' (or the listed extras)' : ''}`,
  }));
  if (sub?.skillGroup) {
    picks.push({ count: 1, groups: [sub.skillGroup], label: `one ${sub.skillGroup} — from ${sub.name}` });
  }
  return picks;
}

// Skills a class auto-grants (class grants + the chosen subclass's fixed skill).
function classGrantedSkills(cls, sub) {
  return [...(cls?.grantedSkills || []), ...(sub?.skill ? [sub.skill] : [])];
}

// ── Duplicate-grant substitution ("choose another instead") ──
// Auto-granted skills (career autos, class/subclass grants) can duplicate a skill the
// hero already holds. Official rule: gain another skill from the same group instead.
// The LATER-granting step resolves the collision (ancestry → culture → career → class);
// the replacement lives in career.skillSwaps / cclass.skillSwaps as { original: swap }
// and is applied at read time, so the stored skill lists stay untouched.

// Group names that contain the given skill (Track and Handle Animals live in two).
function groupsOfSkill(name) {
  return Object.keys(DS_SKILL_GROUPS).filter(g => DS_SKILL_GROUPS[g].includes(name));
}

// Skills held by slots earlier than the career step: ancestry sig picks + culture.
function heldBeforeCareer(c) {
  const held = new Map();
  Object.values(c.ancestry?.sigSkills || {}).forEach(arr => (arr || []).forEach(s => { if (s) held.set(s, 'Ancestry'); }));
  Object.values(c.culture?.skills || {}).forEach(s => { if (s) held.set(s, 'Culture'); });
  return held;
}

// Career auto-granted skills duplicated by an earlier slot → [{ skill, source }].
function careerAutoCollisions(c) {
  const car = DS_CAREERS.find(x => x.id === c.career?.id);
  if (!car) return [];
  const held = heldBeforeCareer(c);
  return parseCareerSkills(car).auto
    .filter(s => held.has(s))
    .map(s => ({ skill: s, source: held.get(s) }));
}

// The career's skills with valid swaps applied (only colliding autos may swap).
function effectiveCareerSkills(c) {
  const skills = c.career?.skills || [];
  const swaps = c.career?.skillSwaps || {};
  const colliding = new Set(careerAutoCollisions(c).map(x => x.skill));
  return skills.map(s => (colliding.has(s) && swaps[s]) ? swaps[s] : s);
}

// Class + subclass granted skills duplicated by any earlier slot → [{ skill, source }].
function classGrantCollisions(c) {
  const cls = DS_CLASSES.find(x => x.id === c.cclass?.id);
  if (!cls) return [];
  const sub = (cls.subclasses || []).find(s => (s.id || s.name) === c.cclass?.subclass);
  const held = heldBeforeCareer(c);
  for (const s of effectiveCareerSkills(c)) if (!held.has(s)) held.set(s, 'Career');
  return classGrantedSkills(cls, sub)
    .filter(s => held.has(s))
    .map(s => ({ skill: s, source: held.get(s) }));
}

// The class grants with valid swaps applied.
function effectiveClassGrants(c) {
  const cls = DS_CLASSES.find(x => x.id === c.cclass?.id);
  if (!cls) return [];
  const sub = (cls.subclasses || []).find(s => (s.id || s.name) === c.cclass?.subclass);
  const swaps = c.cclass?.skillSwaps || {};
  const colliding = new Set(classGrantCollisions(c).map(x => x.skill));
  return classGrantedSkills(cls, sub).map(s => (colliding.has(s) && swaps[s]) ? swaps[s] : s);
}

// Attribute each chosen career skill to exactly one pick group. Storage stays a flat
// name array (everything downstream consumes it), but a couple of skills live in two
// groups (Track: exploration+intrigue, Handle Animals: exploration+interpersonal) — so
// without attribution a single pick would light up in both groups' lists.
// `skillPicks` ({ name: pickIdx }) records where the user actually clicked; skills
// without a valid entry (legacy saves, quick build) fall back to the first pool that
// contains them and still has capacity. Returns Map<skillName, pickIdx>.
function attributeCareerSkills(parsed, skills, skillPicks) {
  const map = new Map();
  if (!parsed || !parsed.picks.length) return map;
  const chosen = (skills || []).filter(s => !parsed.auto.includes(s));
  const picked = skillPicks || {};
  const pools = parsed.picks.map(pickPool);
  const counts = parsed.picks.map(() => 0);
  for (const s of chosen) {
    const idx = picked[s];
    if (typeof idx === 'number' && pools[idx] && pools[idx].includes(s)) {
      map.set(s, idx);
      counts[idx]++;
    }
  }
  for (const s of chosen) {
    if (map.has(s)) continue;
    let idx = pools.findIndex((pool, i) => pool.includes(s) && counts[i] < parsed.picks[i].count);
    if (idx === -1) idx = pools.findIndex(pool => pool.includes(s));
    if (idx === -1) continue;
    map.set(s, idx);
    counts[idx]++;
  }
  return map;
}

// Official perks per group, full rules text (source: Draw Steel via forgesteel data,
// github.com/andyaiken/forgesteel). Names must match the official compendium so the
// FoundryVTT export can substitute the official documents. Player picks one.

const PERKS = {
  Crafting: [
    { name: 'Area of Expertise', text: 'Choose one skill you already have from the crafting skill group. Whenever you obtain a tier 1 outcome on an easy or medium test using this skill, you treat it as a tier 2 outcome instead. Additionally, if you spend 1 minute inspecting an object related to the chosen skill, you can estimate its value and learn of any flaws in its construction.' },
    { name: 'Expert Artisan', text: 'Whenever you make a test as part of a crafting or research project that uses a skill you already have from the crafting skill group, you can make the power roll twice and use either roll.' },
    { name: 'Handy', text: 'Whenever you make a test to craft something and don’t have a skill that applies to the test, you gain a +1 bonus to the power roll.' },
    { name: 'Improvisation Creation', text: 'Without needing to make a test—and even without tools—you can quickly jury-rig or repair a mundane item or piece of equipment related to a skill you have from the crafting skill group. That item lasts for 1 hour or works for one use or activation (whichever comes first, as the Director determines), then breaks beyond repair. For example, if you have the Carpentry skill, you could repair a rickety wooden bridge long enough for a group of creatures to cross it, or build a simple shovel made of wood that can be used for 1 hour.' },
    { name: 'Inspired Artisan', text: 'When you make a project roll using a skill from the crafting skill group, you can spend a hero token to make another project roll for the same project as part of the same respite activity. You can’t use this perk more than once per respite.' },
    { name: 'Traveling Artisan', text: 'On any day when you don’t take a respite, you can spend 1 uninterrupted hour working on a crafting project using a skill you have from the crafting skill group. If you do so, you gain 1d10 project points toward that project.' },
  ],
  Exploration: [
    { name: 'Brawny', text: 'Whenever you fail a Might test, you can lose Stamina equal to 1d6 + your level to improve the outcome of the test by one tier. You can use this perk only once per test.' },
    { name: 'Camouflage Hunter', text: 'Whenever you are in wilderness, once you are hidden from a creature, you don’t need cover or concealment to stay hidden from them.' },
    { name: 'Danger Sense', text: 'Whenever you are in a natural environment (but not in a settlement in that environment), you gain an edge on tests made using the Alertness skill, and you can’t be surprised. Additionally, you have a connection to nature that warns you if any natural disaster is imminent within the next 72 hours, though you don’t know exactly what it will entail (an earthquake, a wildfire, and so forth).' },
    { name: 'Friend Catapult', text: 'Maneuver. You grab a willing adjacent ally or object of your size or smaller, then vertical push that target up to a number of squares equal to twice your Might score. If a creature you push falls as a result of this movement, the effective distance of the fall is reduced by a number of squares equal to twice your Might score. When you use this perk, you can’t use it again until you earn 1 or more Victories.' },
    { name: 'I’ve Got You', text: 'Free triggered action. Trigger: a willing ally lands on you or adjacent to you when they fall. Effect: you catch your ally. Neither of you takes damage from the fall.' },
    { name: 'Monster Whisperer', text: 'You can use the Handle Animals skill to interact with nonsapient creatures who are not animals.' },
    { name: 'Put Your Back Into It', text: 'During montage tests, whenever you make a test to assist a test and obtain a tier 1 outcome, the assisted test doesn’t take a bane. Additionally, once per montage test, you can turn an ally’s tier 1 test outcome into a tier 2 outcome.' },
    { name: 'Team Leader', text: 'At the start of a group test or montage test, you can spend a hero token. If you do, all participants make tests as if they also had any skill you have from the exploration group.' },
    { name: 'Teamwork', text: 'When you take your first turn during a montage test, you can both make a test and assist another hero’s test.' },
    { name: 'Wood Wise', text: 'When you make a test using a skill from the exploration skill group and at least one of the d10s rolled is a 1, you can reroll one d10. You can use this perk only once per test.' },
  ],
  Interpersonal: [
    { name: 'Charming Liar', text: 'If you fail a test using the Lie skill, you don’t suffer any consequences associated with the failure. Additionally, during a negotiation, you can be caught in one lie without negative consequences. When you use either benefit of this perk, you can’t use this perk again until you earn 1 or more Victories.' },
    { name: 'Dazzler', text: 'Whenever a creature watches you sing, dance, or perform a role (as an actor, not just in disguise) for 1 uninterrupted minute or more, you gain an edge on any test made to influence that creature for 1 hour after the performance ends.' },
    { name: 'Engrossing Monologue', text: 'Whenever you are not in combat, you can shout to get the attention of hearing creatures within 10 squares of you. Each such creature who is not hostile toward you listens to what you have to say for 1 uninterrupted minute or more, or until they sense danger or any form of imminent harm. While creatures are listening to you, each of your allies gains an edge on tests made to avoid being noticed by those creatures.' },
    { name: 'Harmonizer', text: 'You can make a Presence test using the Music skill to influence creatures who don’t have emotions or can’t understand you. Additionally, once during a negotiation when an ally makes an argument, you can play music to give that ally an edge on their test.' },
    { name: 'Lie Detector', text: 'In response to another creature communicating information to you, you can spend a hero token to determine whether that information contained any knowing lies. If so, you know what the lies are, but not what the truth is.' },
    { name: 'Open Book', text: 'Whenever you speak one-on-one with a creature, you can ask them one question about themself that might typically offend them or raise suspicion. If they choose not to answer honestly, they simply deflect or redirect the question, with no further complications. If they choose to answer honestly, the creature can immediately ask you a question about yourself in turn, which you must answer honestly.' },
    { name: 'Pardon My Friend', text: 'When an ally within 5 squares fails a Presence test, you can step in and make a Presence test that takes a bane, with your roll replacing the ally’s roll. This perk can be used only once per test, even if more than one character has it.' },
    { name: 'Power Player', text: 'Whenever you make a test that uses the Brag, Flirt, or Intimidate skills, you can use Might instead of any other characteristic the test calls for.' },
    { name: 'So, Tell Me ...', text: 'Whenever you succeed on a Presence test to influence one or more creatures, you can ask one creature you influenced a follow-up question after the test resolves, which they must answer honestly. At the Director’s discretion, the creature doesn’t have to answer the question completely—or at all—if the response would put them or a loved one in danger.' },
    { name: 'Spot The Tell', text: 'Whenever you make a test to read a person and obtain a tier 3 outcome, you notice several tells that give away their true feelings. Any test you make to read that person in the future gains an edge.' },
  ],
  Intrigue: [
    { name: 'Criminal Contacts', text: 'You have access to a network of criminal contacts. As a respite activity while you take a respite in a settlement, you can ask a question of your contacts by making a Presence test. On a tier 2 outcome, you learn one piece of information that would be common among criminals—the secret entrances into a building, the location of a local criminal in hiding, the name of a local thieves’ guild leader, and so forth. On a tier 3 outcome, you can instead gain knowledge that would be uncommon among criminals as long as such information exists—the location of a local treasure cache, the location of a murder weapon used in a noble’s assassination, the name of an NPC secretly bankrolling a local assassin’s guild, and so forth.' },
    { name: 'Forgettable Face', text: 'If you spend 10 minutes or less interacting with a creature who hasn’t met you before, you can cause them to forget your face when you part. If asked to describe you, the creature gives only a vague, blank, and unhelpful description. Additionally, if you spend 1 hour or more assembling a disguise, you automatically obtain a tier 2 outcome on any test that could make use of the Disguise skill. If you have the Disguise skill, you automatically obtain a tier 3 outcome on the test.' },
    { name: 'Gum Up The Works', text: 'Triggered action. Trigger: a mundane trap activates within 3 squares of you. Effect: you can move up to 3 squares toward the trap. If this movement brings you adjacent to any of the trap’s mechanisms, you can jam the trap, preventing it from activating. As long as you stay adjacent to the mechanism, the trap can’t go off unless an attempt to disarm it fails.' },
    { name: 'Lucky Dog', text: 'Whenever you fail a test using any skill from the intrigue skill group, you can lose Stamina equal to 1d6 + your level to improve the outcome of the test by one tier. You can use this perk only once per test.' },
    { name: 'Master of Disguise', text: 'You can don or remove a disguise as part of any test you make using the Hide skill, or while using the Hide maneuver.' },
    { name: 'Slipped Lead', text: 'You gain an edge on tests made to escape bonds. Given 1 uninterrupted minute, you can escape any mundane bonds without making a test. Additionally, it’s not immediately obvious when you’ve escaped bonds until you do something that makes it clear you have done so (cast them off, use an ability that harms one or more creatures, and so forth).' },
  ],
  Lore: [
    { name: 'But I Know Who Does', text: 'Whenever you fail a test to recall lore using a skill from the lore skill group, you instinctively recall the nearest location where the information you seek might be found. This could be the tower of a local sage, a library in a nearby city, somewhere deep in a dungeon, or any other location of the Director’s determination. The Director can decide that certain lore can’t be revealed this way.' },
    { name: 'Eidetic Memory', text: 'Your mind is an encyclopedia, though not always an easy one to organize. When you finish a respite, choose one skill from the lore skill group that you don’t have. You have that skill until you finish your next respite. Additionally, if you spend 1 uninterrupted minute or more reading any page of text, you can memorize its contents, allowing you to memorize entire books with sufficient time.' },
    { name: 'Expert Sage', text: 'Whenever you make a test as part of a crafting or research project using a skill from the lore skill group, you can make the power roll twice and use either roll.' },
    { name: 'I’ve Read About This Place', text: 'Each time you enter a settlement you’ve never been to before, you can ask the Director one of the following questions:\n• Who is the most influential public figure in this settlement?\n• Who in this settlement would be the friendliest to us right now?\n• What does this settlement need most from outsiders?\nIf the Director doesn’t have an answer to the question you ask, or doesn’t want to answer, you can instead ask a different question.' },
    { name: 'Linguist', text: 'You have an ear for languages. You automatically learn two new languages, as long as you have regularly heard those languages spoken or seen them written before. Additionally, if you spend 7 days or more in a place where you regularly hear or read a language you don’t know, you can pick up enough of that language to hold a conversation or understand basic written information. Having picked up a language this way, you can subsequently learn it using the Learn New Language research project at half the usual project goal cost.' },
    { name: 'Polymath', text: 'Whenever you make a test to recall lore and don’t have a skill that applies to the test, you gain a +1 bonus to the power roll.' },
    { name: 'Specialist', text: 'You are a leading expert on a particular subject. Choose one skill you have from the lore skill group. You always have a double edge on tests made to recall lore using this skill. Additionally, your specialist knowledge grants you notoriety in fields related to the chosen skill. You treat your Renown as 1 higher when negotiating with an NPC who knows your reputation, or 2 higher if they have the same skill you chose for this perk.' },
    { name: 'Traveling Sage', text: 'On any day when you don’t take a respite, you can spend 1 uninterrupted hour working on a research project using a skill you have from the lore skill group. If you do so, you gain 1d10 project points toward that project.' },
  ],
  Supernatural: [
    { name: 'Arcane Trick', text: 'Main action (Magic, Self). Choose one of the following effects:\n• You teleport a size 1S or smaller object adjacent to you into an unoccupied space adjacent to you.\n• Until the start of your next turn, a part of your body shoots a shower of harmless noisy sparks that light up each square adjacent to you.\n• You ignite or snuff out (your choice) every mundane light source of 1L or smaller adjacent to you.\n• You transform up to 1 pound of edible food you touch to make it taste delicious or disgusting.\n• Until the start of your next turn, you make your body exude a particular odor you’ve smelled before. This smell can be sensed by each creature within 5 squares of you, but can’t impose any condition or other drawback on those creatures.\n• You place a small magical inscription on the surface of a mundane object you touch, or you can remove an inscription that was made by you or by another creature using Arcane Trick.\n• You touch a size 1T object to cover it with an illusion that makes it look like a different object. Any creature who handles the object becomes aware of the illusion. The illusion ends when you stop touching the object.' },
    { name: 'Creature Sense', text: 'Maneuver. Choose a creature within 10 squares. If that creature is your level or lower, you learn the keywords in their stat block (Demon, Humanoid, Undead, and so forth).' },
    { name: 'Familiar', text: 'A supernatural spirit who has taken the form of a specific small animal or animated object has chosen to be your familiar—or to adopt you as their familiar. The familiar can hold small objects in their mouth or claws, but can’t perform activities that would typically require hands. They can’t harm other creatures or objects. They can flank in combat, but only with you. While you and your familiar are within 10 squares of each other, you can communicate telepathically and share each other’s senses. If your familiar is destroyed, you can restore them as a respite activity, or by spending a Recovery as a main action to bring them back into existence in an unoccupied space adjacent to you.' },
    { name: 'Invisible Force', text: 'Maneuver (Psionic, Ranged 10; one size 1T unattended object). You can grab or manipulate the target object with your mind, moving the object up to a number of squares equal to your Reason, Intuition, or Presence score (your choice). You can use this ability to turn doorknobs, pull levers, and so forth. You can manipulate any small movable piece of a larger object as long as the piece is unattended and size 1T. You can’t use this ability to break a smaller piece off a larger object.' },
    { name: 'Psychic Whisper', text: 'Maneuver (Psionic, Ranged 10; one ally who understands at least one language). You send a telepathic message to them that takes 10 seconds or less to speak. The target knows who the message is from and can decide to ignore it and subsequent messages.' },
    { name: 'Ritualist', text: 'You can spend 1 uninterrupted minute to perform a magic ritual of blessing, targeting yourself or one willing creature you touch. The target has a double edge on the next test they make within the next minute. A target can’t use this benefit on an activity that takes longer than 1 minute.' },
    { name: 'Thingspeaker', text: 'When you hold an object in your hand for 1 uninterrupted minute, you can sense whether it bears emotional resonance (treasured gifts, murder weapons, personal keepsakes). If the Director determines the object bears emotional resonance, you learn the most dominant emotion associated with it, then receive a vision that answers one of the following questions:\n• What was the name of the person whose emotion is imprinted on this object?\n• Why does this emotion linger on the object?\n• How long has it been since the object was held by the person whose emotion lingers on it?\nAfter asking one question, you can choose to delve deeper by asking one additional question from the list, but you are then overcome with emotions that do not belong to you. You take a bane on Intuition and Presence tests until you finish a respite, and you can’t use this perk again while you suffer this bane.' },
  ],
};


const CHAR_MIN = -1, CHAR_MAX = 2;

function charBudget(cls) {
  if (!cls || !cls.charArrays) return 0;
  return Math.max(...cls.charArrays.map(arr => arr.reduce((s, v) => s + v, 0)));
}
// True when the flex values are a permutation of one of the class's official arrays.
// Official arrays don't all share a total (e.g. [2,-1,-1] vs [1,1,-1]) — a lesser-sum
// array is still a legal build even though it underspends the point-buy budget.
function matchesCharArray(cls, vals) {
  const key = [...vals].sort((a, b) => a - b).join(',');
  return (cls?.charArrays || []).some(arr => [...arr].sort((a, b) => a - b).join(',') === key);
}

// A valid default allocation that spends the full budget (mirrors the best array).

function defaultFlexValues(cls) {
  if (!cls || !cls.charArrays) return {};
  const budget = charBudget(cls);
  const best = cls.charArrays.find(arr => arr.reduce((s, v) => s + v, 0) === budget) || cls.charArrays[0];
  const flex = cls.flexCharOrder || [];
  const out = {};
  flex.forEach((k, j) => { out[k] = best[j] ?? 0; });
  return out;
}


function parseKitSig(sig) {
  const [namePart, ...rest] = (sig || '').split(/\s*—\s*/);
  const name = (namePart || '').trim();
  const detail = rest.join(' — ').trim();
  const tier = detail.match(/(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)([^;.]*)/);
  if (!tier) return { name, distance: null, rows: null, effect: detail || null };
  const [, t1, t2, t3, descRaw] = tier;
  const desc = (descRaw || '').replace(/[,;.]+$/, '').trim();
  const suffix = desc ? ` ${desc}` : '';
  const distance = detail.slice(0, tier.index).replace(/[,;:\s]+$/, '').trim() || null;
  const effect = detail.slice(tier.index + tier[0].length).replace(/^[\s,;.]+/, '').trim() || null;
  const rows = [['\u2264 11', `${t1}${suffix}`], ['12\u201316', `${t2}${suffix}`], ['\u2265 17', `${t3}${suffix}`]];
  return { name, distance, rows, effect };
}

// Collapse a uniform damage triple ("+2/+2/+2") to a single value; keep tier-varied ones
// ("+0/+0/+4") as-is. Returns null for empty/"—".

function fmtKitDmg(v) {
  if (!v || v === '\u2014') return null;
  const m = String(v).match(/^([+-]?\d+)\/([+-]?\d+)\/([+-]?\d+)$/);
  if (m && m[1] === m[2] && m[2] === m[3]) return m[1];
  return v;
}

// STEP 5: COMPLICATION (Kit folded into Class step for steel-wielders)

export { timeString, parseCareerSkills, attributeCareerSkills, pickPool, classSkillPicks, classGrantedSkills, groupsOfSkill, careerAutoCollisions, effectiveCareerSkills, classGrantCollisions, effectiveClassGrants, PERKS, CHAR_MIN, CHAR_MAX, charBudget, matchesCharArray, defaultFlexValues, parseKitSig, fmtKitDmg };
