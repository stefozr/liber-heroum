// wizard/helpers.js — pure helpers + shared constants for the creation wizard.
import { DS_SKILL_GROUPS } from '../data.jsx';

function timeString() {
  const d = new Date();
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

// Curated perks per group, with concise descriptions. Player picks one — no free-text.

const PERKS = {
  Crafting: [
    { name: 'Area of Expertise',     text: 'Your mastery of one craft outshines the rest. Treat one crafting skill as a specialty when bringing it to bear.' },
    { name: 'Artisan',                text: 'You retain a network of fellow makers willing to consult, trade favors, and share workshop space.' },
    { name: 'Field Engineer',        text: 'You can improvise repairs, bridges, or shelter from whatever the land provides — quickly and reliably.' },
    { name: 'Tinker',                 text: 'You build small devices, traps, and gadgets that solve niche problems without much fuss.' },
    { name: 'Quartermaster',         text: 'You always know where the supplies are. Rations, tools, and consumables stretch further in your hands.' },
    { name: 'Repairs Specialist',    text: 'Broken gear in your hands becomes serviceable again with surprisingly little effort or time.' },
  ],
  Exploration: [
    { name: 'Wood Wise',              text: 'You read forests and the lives within them; tracking, foraging, and quiet travel come naturally.' },
    { name: 'Monster Whisperer',     text: 'You recognize the hungers and habits of creatures — beast, fey, or otherwise — at a glance.' },
    { name: 'Friend Catapult',       text: 'You can hurl an ally — willing or not — farther and safer than seems physically reasonable.' },
    { name: 'Brawny',                 text: 'Lifting, hauling, and bracing tasks come easily. Heavy gates and stuck doors yield to you alone.' },
    { name: 'Camouflage Hunter',     text: 'You blend into your terrain; even sharp-eyed predators struggle to track or fix on you.' },
    { name: 'Put Your Back Into It!', text: 'When you spend effort over a long task, you go further than most expect.' },
    { name: 'Teamwork',               text: 'Coordinated tasks with allies gain a tangible edge in your hands; you instinctively close gaps in a plan.' },
    { name: 'Pathfinder',             text: 'You read trails and landscapes. Rarely lost, rarely surprised, and never long without a route.' },
    { name: 'Stargazer',              text: 'You navigate by celestial signs and read omens scribed in the night sky that others miss.' },
    { name: 'Mountaineer',            text: 'Cliffs and crevasses bend to your patience and judgement. You climb where others must search for a path.' },
  ],
  Interpersonal: [
    { name: 'Spot the Tell',         text: 'A glance tells you when someone lies, hides intent, or is about to bolt.' },
    { name: 'Harmonizer',             text: 'Tense rooms calm in your presence; quarrels find footing again when you join them.' },
    { name: 'Engrossing Monologue',  text: 'Audiences cannot help but listen when you speak at length. Crowds quiet, guards forget.' },
    { name: 'Networker',              text: 'You can always find a contact in any city given a day and a clean coat.' },
    { name: 'Voice of Authority',    text: 'Strangers instinctively defer to you, at least until they learn better.' },
    { name: 'Trusted Confidant',     text: 'People share secrets with you they wouldn\u2019t share with kin. Your discretion is known.' },
  ],
  Intrigue: [
    { name: 'Forgettable Face',      text: 'You slip witnesses\u2019 memories within minutes of meeting them. Few can describe you to others.' },
    { name: 'Criminal Contacts',     text: 'In any city, a backroom door opens for the right knock — and the right name dropped first.' },
    { name: 'False Identity',        text: 'You maintain a believable second life — papers, contacts, reputation, and small tells included.' },
    { name: 'Discreet',               text: 'You move and act without leaving evident traces. Soft entries, softer exits.' },
    { name: 'Quick Hands',           text: 'Petty theft, small sleights, and quiet locks are within your reach without much practice.' },
    { name: 'Soft Footfall',         text: 'You move silently when patience allows. Floors, leaves, and gravel forgive you.' },
  ],
  Lore: [
    { name: 'I\u2019ve Read About This Place', text: 'Strange locales remind you of texts you\u2019ve studied; you recall pertinent details when needed.' },
    { name: 'Expert Sage',           text: 'You can produce a relevant book or scroll from a vast personal library — given access to it.' },
    { name: 'Polyglot',               text: 'You parse foreign tongues faster than scholars expect. Old dialects yield to your ear.' },
    { name: 'Cartographer',           text: 'You sketch and read maps with uncanny accuracy, even from memory of a glanced original.' },
    { name: 'Arcane Reader',          text: 'You decipher magic notation common to most schools, even if you cannot cast from it.' },
    { name: 'Lore-Keeper',            text: 'You remember names, dates, and chains of cause across kingdoms and generations.' },
  ],
  Supernatural: [
    { name: 'Ritualist',              text: 'You can run smaller rituals — wards, blessings, brief glimpses — without exhausting yourself.' },
    { name: 'Arcane Trick',          text: 'A small, repeatable bit of magic — harmless but useful: light, sound, sleight, change of voice.' },
    { name: 'Whispered Names',       text: 'You catch fragments of supernatural conversations at the edge of hearing, especially near old places.' },
    { name: 'Spirit-Touched',        text: 'Spirits sense and often pause for you; some answer questions, when politely asked.' },
    { name: 'Saint\u2019s Favor',     text: 'Your patron\u2019s blessing makes minor miracles possible at need — never spectacular, always timely.' },
    { name: 'Echo of Magic',         text: 'You sense lingering magic for hours after it was used nearby, and can tell its broad shape.' },
  ],
};


const CHAR_MIN = -1, CHAR_MAX = 2;

function charBudget(cls) {
  if (!cls || !cls.charArrays) return 0;
  return Math.max(...cls.charArrays.map(arr => arr.reduce((s, v) => s + v, 0)));
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

export { timeString, parseCareerSkills, PERKS, CHAR_MIN, CHAR_MAX, charBudget, defaultFlexValues, parseKitSig, fmtKitDmg };
