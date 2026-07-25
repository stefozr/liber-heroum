// wizard/steps/skill-swap.jsx — duplicate-grant substitution ("choose another instead").
// When an auto-granted skill duplicates one the hero already holds, official rules let
// them pick another skill from the same group. Rendered by the career and class steps.
import React from 'react';
import { DS_SKILL_GROUPS } from '../../data.jsx';
import { groupsOfSkill } from '../helpers.js';

// collisions: [{ skill, source }] · swaps: { skill: replacement } · taken: Map<name, source>
// ownNames: skills already held by this step (grants + choices) · onSwap(skill, name|null)
function SkillSwapBlock({ collisions, swaps, taken, ownNames, onSwap }) {
  if (!collisions.length) return null;
  return (
    <div className="stack-12" style={{ marginTop: 14 }}>
      {collisions.map(({ skill, source }) => {
        const groups = groupsOfSkill(skill);
        const pool = Array.from(new Set(groups.flatMap(g => DS_SKILL_GROUPS[g] || [])));
        const chosen = swaps[skill] || null;
        const otherSwaps = Object.entries(swaps).filter(([k]) => k !== skill).map(([, v]) => v);
        return (
          <div key={skill}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.625rem', color: 'var(--rubric-2, var(--gold-2))', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 6 }}>
              {skill} is already granted by {source} — choose another {groups.join(' or ')} skill instead
              {chosen ? <b style={{ color: 'var(--gold-2)' }}> · {chosen}</b> : ''}
            </div>
            <div className="skill-chip-grid">
              {pool.filter(s => s !== skill).map(s => {
                const on = chosen === s;
                const blocked = !on && (taken.has(s) || ownNames.includes(s) || otherSwaps.includes(s));
                return (
                  <button
                    type="button"
                    key={s}
                    className={`skill-chip${on ? ' on' : ''}${blocked ? ' blocked' : ''}`}
                    onClick={() => !blocked && onSwap(skill, on ? null : s)}
                    disabled={blocked}
                    title={blocked ? (taken.has(s) ? `Already chosen — ${taken.get(s)}` : 'Already chosen') : ''}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { SkillSwapBlock };
