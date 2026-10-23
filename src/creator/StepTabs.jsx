// creator/StepTabs.jsx — the step strip: number (✓ when done), name, status line.
// A <nav> of buttons with aria-current — the steps are routes, not an ARIA tablist.
import React from 'react';
import { CREATOR_STEPS } from './steps.js';
import { creatorStepStatus, statusLabel } from './status.js';

function StepTab({ step, index, active, status, onClick, tabRef, short = true }) {
  const done = status.state === 'done';
  return (
    <button
      type="button"
      ref={tabRef}
      className={`card-btn cr-tab ${status.state}${active ? ' active' : ''}`}
      aria-current={active ? 'step' : undefined}
      onClick={onClick}
    >
      <span className="ct-badge" aria-hidden="true">{done ? '✓' : index + 1}</span>
      <span className="ct-text">
        <span className="ct-name">{short ? step.short : step.name}</span>
        <span className="ct-status">{statusLabel(status)}</span>
      </span>
    </button>
  );
}

function StepTabs({ character, stepIndex, onSelect, activeRef }) {
  return (
    <nav className="cr-tabs" aria-label="Creation steps">
      {CREATOR_STEPS.map((s, i) => (
        <StepTab key={s.id} step={s} index={i} active={i === stepIndex}
          status={creatorStepStatus(character, s.id)} onClick={() => onSelect(i)}
          tabRef={i === stepIndex ? activeRef : null} />
      ))}
    </nav>
  );
}

// The full list, for the compact navigator's modal (≤900px).
function StepList({ character, stepIndex, onSelect }) {
  return (
    <nav className="cr-steplist" aria-label="Creation steps">
      {CREATOR_STEPS.map((s, i) => (
        <StepTab key={s.id} step={s} index={i} active={i === stepIndex} short={false}
          status={creatorStepStatus(character, s.id)} onClick={() => onSelect(i)} />
      ))}
    </nav>
  );
}

export { StepTabs, StepList };
