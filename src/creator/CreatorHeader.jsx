// creator/CreatorHeader.jsx — two rows: the top bar (brand, hero, save state,
// SAVE AND CLOSE) and the step strip. At ≤900px a compact navigator replaces the
// strip; its label opens the full step list. Both stay in the DOM, CSS swaps them.
import React from 'react';
import { Crest, SavePill, Button, TopBar, Modal } from '../theme.jsx';
import { CREATOR_STEPS } from './steps.js';
import { creatorStepStatus, statusLabel } from './status.js';
import { StepTabs, StepList } from './StepTabs.jsx';
import { useDetail } from './detail-context.jsx';

function CreatorHeader({ character, stepIndex, setStep, saveState, onExit, onHome, onSwitchLayout, activeTabRef }) {
  const [listOpen, setListOpen] = React.useState(false);
  const detail = useDetail();
  const step = CREATOR_STEPS[stepIndex];
  const status = creatorStepStatus(character, step.id);
  const isLast = stepIndex === CREATOR_STEPS.length - 1;
  return (
    <>
      <TopBar
        className="cr-topbar"
        onHome={onHome}
        mark={<Crest glyph="✠" portrait={character.portrait || undefined} />}
        brand="CREATE YOUR HERO"
        sub={<>{character.identity?.name || character.name || 'NEW HERO'} · LEVEL {character.level || 1}</>}
        right={<>
          <SavePill saveState={saveState || { status: 'saved', at: null }} />
          <button type="button" className="icon-btn cr-detailbtn" onClick={() => detail.openDrawer()} title="Show details" aria-label="Show details">≡</button>
          {onSwitchLayout && <Button small kind="ghost" className="cr-switch" onClick={onSwitchLayout} title="Open this hero in the classic wizard">CLASSIC WIZARD</Button>}
          <Button small kind="ghost" onClick={onExit}>SAVE AND CLOSE</Button>
        </>}
      />
      <StepTabs character={character} stepIndex={stepIndex} onSelect={setStep} activeRef={activeTabRef} />
      <div className="wiz-railbar cr-navbar">
        <button type="button" className="rb-arrow" aria-label="Previous step"
          disabled={stepIndex === 0} onClick={() => setStep(stepIndex - 1)}>◂</button>
        <button type="button" className="rb-label" onClick={() => setListOpen(true)} aria-haspopup="dialog">
          <div className="rb-count">Step {stepIndex + 1} of {CREATOR_STEPS.length} · {statusLabel(status)}</div>
          <div className="rb-name">{step.name} ▾</div>
        </button>
        <button type="button" className="rb-arrow" aria-label="Next step"
          disabled={isLast} onClick={() => setStep(stepIndex + 1)}>▸</button>
      </div>
      <Modal open={listOpen} onClose={() => setListOpen(false)} title="Creation Steps" width={460}
        footer={<Button kind="ghost" onClick={() => setListOpen(false)}>CLOSE</Button>}>
        <StepList character={character} stepIndex={stepIndex} onSelect={(i) => { setListOpen(false); setStep(i); }} />
      </Modal>
    </>
  );
}

export { CreatorHeader };
