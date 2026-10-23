// creator/steps.js — the Codex-style creator's step list. Six steps map onto the
// classic wizard's chapters (DS_STEPS, via wizardId) and reuse their intro copy;
// Skills & Languages is the creator's own, where every skill and language pick lives.
// It follows every step that grants one (the complication included), and there is
// no Review step: the hero is committed from Identity, the last step.
import { DS_STEPS } from '../data.jsx';

const CREATOR_STEPS = [
  { id: 'ancestry',     name: 'Ancestry',           short: 'Ancestry',     wizardId: 'ancestry' },
  { id: 'culture',      name: 'Culture',            short: 'Culture',      wizardId: 'culture' },
  { id: 'career',       name: 'Career',             short: 'Career',       wizardId: 'career' },
  { id: 'class',        name: 'Class',              short: 'Class',        wizardId: 'class' },
  { id: 'complication', name: 'Complication',       short: 'Complication', wizardId: 'complication', optional: true },
  // Its art is the classic wizard's Review backdrop, which the creator has no other use for.
  { id: 'skills',       name: 'Skills & Languages', short: 'Skills',       wizardId: null,
    title: 'Tongue & Craft', bg: 'assets/sections/Summary.webp',
    deck: 'Every skill and language your choices grant is picked here, in one place. Each source says how many it gives; a skill held by one source is blocked everywhere else, and a duplicate grant lets you choose another instead.' },
  { id: 'identity',     name: 'Identity',           short: 'Identity',     wizardId: 'identity' },
];

// The step's intro copy: the wizard chapter's title/deck/bg, or the step's own.
function creatorStepIntro(step) {
  const ds = step.wizardId ? DS_STEPS.find(s => s.id === step.wizardId) : null;
  return { title: step.title || ds?.title || step.name, deck: step.deck || ds?.deck || '', bg: step.bg || ds?.bg || null, eyebrow: ds?.eyebrow || null };
}

const creatorStepIndex = (id) => CREATOR_STEPS.findIndex(s => s.id === id);

export { CREATOR_STEPS, creatorStepIntro, creatorStepIndex };
