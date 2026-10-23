// creator/Creator.jsx — the Codex-style character creator: a side-by-side prototype
// of the classic Wizard (see CREATOR_REDESIGN_PLAN.md). Same props, same hero, same
// commit gate; a different layout — step tabs with status lines above three columns
// (live hero summary · the step's choices · details of whatever is hovered or
// picked), and every skill and language pick gathered on one Skills step.
import React from 'react';
import { DS_CLASSES } from '../data.jsx';
import { Button, Modal } from '../theme.jsx';
import { SheetStyles } from '../theme/sheet.jsx';
import { classDef } from '../app.jsx';
import { UnfinishedChapters } from '../wizard/UnfinishedChapters.jsx';
import * as mut from '../wizard/mutations.js';
import { CREATOR_STEPS, creatorStepIndex, creatorStepIntro } from './steps.js';
import { creatorIssues } from './status.js';
import { CreatorContext } from './context.js';
import { DetailProvider } from './detail-context.jsx';
import { CreatorStyles } from './creator-styles.js';
import { CreatorHeader } from './CreatorHeader.jsx';
import { HeroSummary } from './HeroSummary.jsx';
import { DetailPanel } from './DetailPanel.jsx';
import { STEP_MAINS, headlineDetail } from './steps/index.js';
import { PaneResizer } from './PaneResizer.jsx';
import { getPaneWidths, setPaneWidths } from './preference.js';

const { useState, useEffect, useMemo, useRef, useCallback } = React;
const LAST = CREATOR_STEPS.length - 1;
const clamp = (i) => Math.max(0, Math.min(LAST, i));

function Creator({ character, update, saveState, onExit, onComplete, onHome = null, onSwitchLayout = null }) {
  const stepIndex = clamp(character.creatorStep || 0);
  const step = CREATOR_STEPS[stepIndex];

  // Its own step index: the creator has eight steps to the wizard's seven, so the
  // two layouts never fight over wizardStep.
  const setStep = useCallback((i) => {
    const n = clamp(i);
    update(c => ({
      ...c,
      creatorStep: n,
      creatorVisited: (c.creatorVisited || []).includes(n) ? c.creatorVisited : [...(c.creatorVisited || []), n].sort((a, b) => a - b),
    }));
  }, [update]);
  const goToStep = useCallback((id) => setStep(creatorStepIndex(id)), [setStep]);

  // Seed the characteristic spread once per class, so the summary never shows a
  // class with zeros and the step doesn't open on a "points not spent" issue.
  const cls = classDef(character);
  useEffect(() => {
    if (cls?.flexCharOrder && Object.keys(character.cclass.characteristics || {}).length === 0) {
      update(c => mut.ensureCharacteristics(c));
    }
    // eslint-disable-next-line
  }, [cls?.id]);

  const incompleteSteps = useMemo(
    () => CREATOR_STEPS.map((s, i) => ({ s, i, issues: creatorIssues(character, s.id) }))
      .filter(({ issues }) => issues.length > 0),
    [character]
  );
  const allValid = incompleteSteps.length === 0;
  const stepIssueCount = incompleteSteps.find(x => x.i === stepIndex)?.issues.length || 0;
  const [commitWarn, setCommitWarn] = useState(false);

  // Identity is the last step, so its button commits. The commit is a soft gate:
  // an unfinished (or unnamed) hero gets the warning, which can save a draft.
  const isLast = stepIndex === LAST;
  const onContinue = () => {
    if (isLast) {
      if (allValid) onComplete(true);
      else setCommitWarn(true);
    } else {
      setStep(stepIndex + 1);
    }
  };

  // Each step starts at the top of the main column.
  const mainRef = useRef(null);
  useEffect(() => { if (mainRef.current) mainRef.current.scrollTop = 0; }, [stepIndex]);
  // Keep the active tab in view where the strip scrolls (optional call: jsdom has none).
  const activeTabRef = useRef(null);
  useEffect(() => { activeTabRef.current?.scrollIntoView?.({ inline: 'center', block: 'nearest' }); }, [stepIndex]);
  // Warm the next step's backdrop, so CONTINUE doesn't flash a bare gradient — and,
  // one step ahead of Class, its posters, so the class grid doesn't pop in.
  useEffect(() => {
    const next = CREATOR_STEPS[stepIndex + 1];
    if (!next || typeof Image === 'undefined') return;
    const bg = creatorStepIntro(next).bg;
    if (bg) { const img = new Image(); img.src = bg; }
    if (next.id === 'class') for (const c of DS_CLASSES) if (c.cardImg) { const img = new Image(); img.src = c.cardImg; }
  }, [stepIndex]);
  const bg = creatorStepIntro(step).bg;

  // Sidebar widths the user dragged to (per browser); unset sides follow the stylesheet.
  const shellRef = useRef(null);
  const [panes, setPanes] = useState(getPaneWidths);
  const commitPane = useCallback((side, w) => {
    setPanes(prev => {
      const next = { ...prev };
      if (w == null) delete next[side]; else next[side] = w;
      setPaneWidths(next);
      return next;
    });
  }, []);
  const paneStyle = {
    ...(panes.left ? { '--cr-left': `${panes.left}px` } : {}),
    ...(panes.right ? { '--cr-right': `${panes.right}px` } : {}),
  };

  const ctx = useMemo(() => ({ character, update, goToStep, setStep, stepId: step.id }), [character, update, goToStep, setStep, step.id]);
  const Main = STEP_MAINS[step.id];

  return (
    <CreatorContext.Provider value={ctx}>
      <DetailProvider stepId={step.id} fallback={headlineDetail(character, step.id)} intro={{ kind: 'intro', stepId: step.id }}>
        <div className="cr" ref={shellRef} style={paneStyle}>
          <CreatorStyles />
          <SheetStyles />
          {bg && <div className="cr-bg" aria-hidden="true" style={{ backgroundImage: `url(${bg})` }} />}
          <CreatorHeader character={character} stepIndex={stepIndex} setStep={setStep} saveState={saveState}
            onExit={onExit} onHome={onHome} onSwitchLayout={onSwitchLayout} activeTabRef={activeTabRef} />
          <HeroSummary character={character} />
          <main className="cr-main" ref={mainRef} aria-label={step.name}>
            <div className="cr-main-inner">
              <Main />
            </div>
          </main>
          <PaneResizer side="left" shellRef={shellRef} width={panes.left} onCommit={commitPane} />
          <DetailPanel />
          <PaneResizer side="right" shellRef={shellRef} width={panes.right} onCommit={commitPane} />
          <div className="wiz-footer cr-footer">
            {stepIndex === 0
              ? <div aria-hidden="true" style={{ visibility: 'hidden' }}><Button kind="ghost">◂ BACK</Button></div>
              : <Button kind="ghost" onClick={() => setStep(stepIndex - 1)}>◂ {CREATOR_STEPS[stepIndex - 1].short.toUpperCase()}</Button>}
            <div className="meta" aria-live="polite">
              Step {stepIndex + 1} of {CREATOR_STEPS.length} · {step.name}
              {stepIssueCount > 0 && (
                <span style={{ color: 'var(--gold-2)' }}> · {stepIssueCount} choice{stepIssueCount === 1 ? '' : 's'} remain{stepIssueCount === 1 ? 's' : ''}</span>
              )}
            </div>
            <Button kind="primary" onClick={onContinue}>
              {isLast ? 'COMMIT TO THE LIBER ▸'
                : step.id === 'complication' && !character.complication?.id ? 'CONTINUE · NO COMPLICATION ▸'
                : 'CONTINUE ▸'}
            </Button>
          </div>

          <Modal
            open={commitWarn}
            onClose={() => setCommitWarn(false)}
            title="This Hero Isn't Finished"
            width={560}
            footer={(
              <>
                <Button kind="ghost" onClick={() => setCommitWarn(false)}>◂ KEEP EDITING</Button>
                <div style={{ flex: 1 }}></div>
                <Button kind="primary" onClick={() => { setCommitWarn(false); onComplete(false); }}>SAVE AS DRAFT ▸</Button>
              </>
            )}
          >
            <div style={{ fontFamily: 'var(--serif)', fontSize: '0.875rem', color: 'var(--ink-2)', lineHeight: 1.6 }}>
              A few rites remain unfinished. You can keep editing, or save this hero as a <b style={{ color: 'var(--gold-2)' }}>draft</b> and return to the Liber later — it won't be playable until completed.
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '0.625rem', color: 'var(--ink-3)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Still to finish</div>
              <UnfinishedChapters incompleteSteps={incompleteSteps} onGoToStep={(i) => { setCommitWarn(false); setStep(i); }} />
            </div>
          </Modal>
        </div>
      </DetailProvider>
    </CreatorContext.Provider>
  );
}

export { Creator };
