// creator/status.js — what each creator step still owes, and the status line its
// tab shows ("Not started", "Optional", "N left", "Done").
//
// Issues come from the classic wizard's stepIssueEntries, re-bucketed by topic:
// skill and language lines move from their chapter to the Skills & Languages step,
// everything else stays where it was. The union over CREATOR_STEPS is therefore the
// same multiset of texts as over DS_STEPS (the wizard's Review chapter owes none),
// so the commit gate and the roster's progress figure mean the same thing in both
// layouts (creator-status.test.ts).
import { DS_STEPS } from '../data.jsx';
import { stepIssueEntries } from '../wizard/Wizard.jsx';
import { allSlots } from './skill-slots.js';

const SOURCE_STEPS = ['ancestry', 'culture', 'career', 'class', 'complication'];
const PICK_TOPICS = ['skill', 'language'];
const dsIndex = (id) => DS_STEPS.findIndex(s => s.id === id);

// [{ text, topic, source? }] — `source` (the chapter name) is set on the Skills step,
// where two chapters can owe identically-worded lines ("Language not chosen").
function creatorIssueEntries(c, stepId) {
  if (stepId === 'skills') {
    const out = [];
    for (const id of SOURCE_STEPS) {
      const name = DS_STEPS[dsIndex(id)].name;
      for (const e of stepIssueEntries(c, dsIndex(id))) {
        if (PICK_TOPICS.includes(e.topic)) out.push({ ...e, source: name });
      }
    }
    return out;
  }
  const entries = stepIssueEntries(c, dsIndex(stepId));
  return SOURCE_STEPS.includes(stepId) ? entries.filter(e => !PICK_TOPICS.includes(e.topic)) : entries;
}

// Display lines: the Skills step prefixes each with the chapter it comes from.
function creatorIssues(c, stepId) {
  return creatorIssueEntries(c, stepId).map(e => (e.source ? `${e.source}: ${e.text}` : e.text));
}

// Whether the user has made the step's headline decision yet.
function creatorStarted(c, stepId) {
  switch (stepId) {
    case 'ancestry': return !!c.ancestry?.id;
    case 'culture': return !!(c.culture?.environment || c.culture?.organization || c.culture?.upbringing || c.culture?.archetype);
    case 'career': return !!c.career?.id;
    case 'class': return !!c.cclass?.id;
    case 'complication': return !!c.complication?.id;
    // Culture's language defaults to Caelian on a new hero — that isn't a choice made.
    case 'skills': return allSlots(c).some(s => s.kind !== 'grant' && s.picked.length > 0 && !(s.id === 'lang:culture' && s.picked[0] === 'Caelian'));
    case 'identity': return !!(c.identity?.name || '').trim();
    default: return true;
  }
}

// { state: 'not-started' | 'optional' | 'in-progress' | 'done', left }
function creatorStepStatus(c, stepId) {
  const left = creatorIssueEntries(c, stepId).length;
  if (stepId === 'complication' && !c.complication?.id) return { state: 'optional', left: 0 };
  if (!creatorStarted(c, stepId)) return { state: 'not-started', left };
  return { state: left ? 'in-progress' : 'done', left };
}

// The tab's status line.
function statusLabel({ state, left }) {
  if (state === 'done') return 'Done';
  if (state === 'optional') return 'Optional';
  if (state === 'not-started') return 'Not started';
  return `${left} left`;
}

export { creatorIssueEntries, creatorIssues, creatorStarted, creatorStepStatus, statusLabel };
