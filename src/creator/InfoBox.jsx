// creator/InfoBox.jsx — the "Skills & Languages" note on a source step: how many
// skills and languages it grants. They are chosen on the Skills & Languages step.
import React from 'react';
import { useCreator } from './context.js';
import { stepGrantCounts } from './skill-slots.js';

function InfoBox({ stepId }) {
  const { character } = useCreator();
  const { skills, languages, forget } = stepGrantCounts(character, stepId);
  if (!skills && !languages && !forget) return null;
  const parts = [
    skills > 0 && <span key="s"><b>Skills:</b> {skills}</span>,
    languages > 0 && <span key="l"><b>Languages:</b> {languages}</span>,
    forget > 0 && <span key="f"><b>Forget:</b> {forget} language{forget === 1 ? '' : 's'}</span>,
  ].filter(Boolean);
  return (
    <aside className="cr-infobox" aria-label="Skills and languages from this step">
      <div className="cr-infobox-title">Skills &amp; Languages</div>
      <div className="cr-infobox-row">
        {parts.map((p, i) => <React.Fragment key={i}>{i > 0 && ' · '}{p}</React.Fragment>)}
      </div>
    </aside>
  );
}

export { InfoBox };
