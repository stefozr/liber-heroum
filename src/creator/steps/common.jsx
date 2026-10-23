// creator/steps/common.jsx — pieces every creator step uses.
import React from 'react';
import { CREATOR_STEPS, creatorStepIntro } from '../steps.js';

// The step's eyebrow, title and rules deck at the top of the main column.
function StepIntro({ stepId }) {
  const step = CREATOR_STEPS.find(s => s.id === stepId);
  const intro = creatorStepIntro(step);
  return (
    <header className="cr-intro">
      <div className="eyebrow">{intro.eyebrow || `Step ${CREATOR_STEPS.indexOf(step) + 1}`} · {step.name}</div>
      <h1 className="h1-display">{intro.title}</h1>
      <div className="deck">{intro.deck}</div>
    </header>
  );
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Options given as strings or { name, text } objects.
const normOptions = (options) => (options || []).map(o => (typeof o === 'string' ? { name: o, text: null } : o));

export { StepIntro, plural, normOptions };
