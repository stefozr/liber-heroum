// creator/ChoiceSection.jsx — one decision on a step: a title, a status word
// ("Choose one", "Done", "2 points to spend", "Optional"), a hint, the options.
// The step's headline pick is `bare`; the "Your choices" follow-ups are framed.
import React from 'react';
import { useDetail } from './detail-context.jsx';

const NUMS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];

// The status word for a pick of `count` with `got` made.
function pickStatus({ count = 1, got = 0, done, optional = false }) {
  const finished = done ?? got >= count;
  if (finished) return { kind: 'done', label: 'Done' };
  if (optional) return { kind: 'optional', label: 'Optional' };
  if (count === 1) return { kind: 'choose', label: 'Choose one' };
  const left = count - got;
  return { kind: 'choose', label: got > 0 ? `Choose ${NUMS[left] || left} more` : `Choose ${NUMS[count] || count}` };
}

function ChoiceSection({ id, title, status, hint, actions, detail, variant = 'framed', issues = [], children, className = '' }) {
  const ctx = useDetail();
  const done = status?.kind === 'done' || status?.kind === 'granted';
  return (
    <section className={`cr-sec ${variant}${done ? ' is-done' : ''}${className ? ' ' + className : ''}`} id={id}>
      <div className="cr-sec-head">
        <h3 className="cr-sec-title">{title}</h3>
        {status && <span className={`cr-sec-status ${status.kind}`}>{status.label}</span>}
        {(actions || (detail && ctx)) && (
          <div className="cr-sec-actions">
            {actions}
            {detail && ctx && (
              <button type="button" className="cr-sec-details" onClick={() => ctx.openDrawer(detail)}>details ▸</button>
            )}
          </div>
        )}
      </div>
      {hint && <div className="cr-sec-hint">{hint}</div>}
      {issues.map(t => <div key={t} className="cr-sec-issue">{t}</div>)}
      <div className="cr-sec-body">{children}</div>
    </section>
  );
}

function ChoicesHead({ children = 'Your choices' }) {
  return <h2 className="cr-choices-head">{children}</h2>;
}

export { ChoiceSection, ChoicesHead, pickStatus };
