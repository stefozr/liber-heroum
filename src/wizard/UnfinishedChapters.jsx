// wizard/UnfinishedChapters.jsx — the "still to finish" chapter list: one card per
// unfinished chapter with every missing pick spelled out. Shared by the commit
// modal and the Review step's closing block.
import React from 'react';
import { SelCard } from '../theme.jsx';

function UnfinishedChapters({ incompleteSteps, onGoToStep }) {
  return (
    <div className="stack-12">
      {incompleteSteps.map(({ s, i, issues }) => (
        <SelCard
          key={s.id}
          onClick={() => onGoToStep && onGoToStep(i)}
          style={{padding:'10px 14px', display:'flex', alignItems:'flex-start', gap: 12, textAlign:'left'}}
        >
          <div style={{fontFamily:'var(--mono)', fontSize: '0.6875rem', color:'var(--rubric-2)', letterSpacing:'0.18em'}}>{String(i+1).padStart(2,'0')}</div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontFamily:'var(--display-2)', fontSize: '0.875rem', fontWeight:700, letterSpacing:'0.08em', color:'var(--ink)'}}>{s.name}</div>
            {(issues || []).map((issue, k) => (
              <div key={k} style={{fontFamily:'var(--mono)', fontSize: '0.625rem', letterSpacing:'0.16em', color:'var(--ink-3)', marginTop: 4}}>
                <span style={{color:'var(--rubric-2)'}}>·</span> {issue}
              </div>
            ))}
          </div>
          <div style={{fontFamily:'var(--mono)', fontSize: '0.625rem', color:'var(--ink-3)', letterSpacing:'0.16em'}}>FIX ▸</div>
        </SelCard>
      ))}
    </div>
  );
}

export { UnfinishedChapters };
