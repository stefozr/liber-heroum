// wizard/Wizard.jsx — the orchestrator: main Wizard + CharacterPreview + isStepValid + the step map.
import React from 'react';
import { DS_LANGUAGES, DS_SKILL_GROUPS, DS_ANCESTRIES, DS_CULTURES, DS_CAREERS, DS_CLASSES, DS_KITS, DS_COMPLICATIONS, DS_STEPS } from '../data.jsx';import { OrnDivider, GlyphRow, Crest, renderGlyph, Pill, Tag, Button, IconButton, H1, H2, H3, H4Meta, Eyebrow, Deck, DropCap, StatTile, SelCard, Modal, PowerRoll, AbilityCard } from '../theme.jsx';import { classDef, ancestryDef, kitDef, kit2Def, careerDef, complicationDef, computeDerived, summarizeBenefits } from '../app.jsx';
import { timeString, parseCareerSkills } from './helpers.js';
import { StepHeader } from './StepHeader.jsx';
import { AncestryStep } from './steps/ancestry.jsx';
import { CultureStep } from './steps/culture.jsx';
import { CareerStep } from './steps/career.jsx';
import { ClassStep } from './steps/class.jsx';
import { ComplicationStep } from './steps/complication.jsx';
import { IdentityStep } from './steps/identity.jsx';
import { ReviewStep } from './steps/review.jsx';

const { useState, useEffect, useMemo, useRef, useCallback } = React;

function Wizard({ character, update, onExit, onComplete }) {
  const rawStep = character.wizardStep || 0;
  const stepIndex = Math.max(0, Math.min(DS_STEPS.length - 1, rawStep));
  const step = DS_STEPS[stepIndex];

  const setStep = (i) => {
    const clamped = Math.max(0, Math.min(DS_STEPS.length - 1, i));
    update(c => ({ ...c, wizardStep: clamped }));
  };

  const stepValid = useMemo(() => isStepValid(character, stepIndex), [character, stepIndex]);
  const incompleteSteps = useMemo(
    () => DS_STEPS.map((s, i) => ({ s, i })).filter(({ i }) => !isStepValid(character, i)),
    [character]
  );
  const allValid = incompleteSteps.length === 0;
  const [commitWarn, setCommitWarn] = useState(false);

  const isLast = stepIndex === DS_STEPS.length - 1;
  // The Hero Name is mandatory — block forward progress from the Identity step until it's filled.
  const nameMissing = step.id === 'identity' && !((character.identity.name || '').trim());
  const onContinue = () => {
    if (nameMissing) return;
    if (isLast) {
      if (allValid) onComplete(true);
      else setCommitWarn(true);
    } else {
      setStep(stepIndex + 1);
    }
  };
  const onBack = () => stepIndex === 0 ? onExit() : setStep(stepIndex - 1);

  const Step = STEP_COMPONENTS[step.id];

  // Each step starts at the top. Without this the scroll container (which is
  // reused across steps) carries the previous step's position over — so a long
  // earlier step would drop you partway down, or at the bottom of, the next one.
  const bodyRef = React.useRef(null);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [stepIndex]);

  return (
    <div className="wiz">
      {/* Top bar */}
      <div className="wiz-topbar" style={{gridTemplateColumns: '1fr auto'}}>
        <div className="left">
          <Crest glyph="✠" portrait={character.portrait || undefined} />
          <div>
            <div className="brand-text">DRAW · STEEL</div>
            <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-3)', letterSpacing:'0.18em', textTransform:'uppercase', marginTop:4}}>
              {character.identity.name || character.name || 'NEW HERO'}
            </div>
          </div>
        </div>
        <div className="right">
          <Pill kind="live">SAVED · {timeString()}</Pill>
          <Button small kind="ghost" onClick={onExit}>◂ ROSTER</Button>
        </div>
      </div>

      {/* Rail */}
      <div className="wiz-rail">
        {DS_STEPS.map((s, i) => {
          const valid = isStepValid(character, i);
          const visited = i < stepIndex;
          const isActive = i === stepIndex;
          // "done" only when the step is fully complete (all picks satisfied).
          // "visited" = user has moved past it but it's incomplete.
          const cls = ['rstep'];
          if (valid && !isActive) cls.push('done');
          if (visited && !valid && !isActive) cls.push('visited');
          if (isActive) cls.push('active');
          return (
            <div
              key={s.id}
              className={cls.join(' ')}
              onClick={() => setStep(i)}
            >
              <div className="rnum">{valid && !isActive ? '✓' : String(i+1).padStart(2,'0')}</div>
              <div className="rname">{s.name}</div>
            </div>
          );
        })}
      </div>

      {/* Step body */}
      <div className="wiz-step" ref={bodyRef}>
        <div className="step-bg" style={{ backgroundImage: `url(${step.bg})` }}></div>

        <div className="col-main">
          <StepHeader step={step} />
          <div style={{height: 8}}></div>
          <Step character={character} update={update} />
          <div style={{height: 60}}></div>
        </div>
      </div>

      {/* Footer */}
      <div className="wiz-footer">
        <Button kind="ghost" onClick={onBack}>◂ {stepIndex === 0 ? 'ROSTER' : DS_STEPS[stepIndex - 1].name.toUpperCase()}</Button>
        <div className="meta">Chapter {stepIndex + 1} of {DS_STEPS.length} · {step.name}</div>
        <Button kind="primary" onClick={onContinue} disabled={nameMissing}>
          {isLast ? 'COMMIT TO THE LIBER ▸' : 'CONTINUE ▸'}
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
            <div style={{flex:1}}></div>
            <Button kind="primary" onClick={() => { setCommitWarn(false); onComplete(false); }}>SAVE AS DRAFT ▸</Button>
          </>
        )}
      >
        <div style={{fontFamily:'var(--serif)', fontSize:14, color:'var(--ink-2)', lineHeight:1.6}}>
          A few rites remain unfinished. You can keep editing, or save this hero as a <b style={{color:'var(--gold-2)'}}>draft</b> and return to the Liber later — it won't be playable until completed.
        </div>
        <div style={{marginTop: 16}}>
          <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-3)', letterSpacing:'0.2em', textTransform:'uppercase', marginBottom: 8}}>Still to finish</div>
          <div className="stack-12">
            {incompleteSteps.map(({ s, i }) => (
              <div
                key={s.id}
                onClick={() => { setCommitWarn(false); setStep(i); }}
                className="card"
                style={{padding:'10px 14px', display:'flex', alignItems:'center', gap: 12, cursor:'pointer'}}
              >
                <div style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--rubric-2)', letterSpacing:'0.18em'}}>{String(i+1).padStart(2,'0')}</div>
                <div style={{fontFamily:'var(--display-2)', fontSize:14, fontWeight:700, letterSpacing:'0.08em', color:'var(--ink)'}}>{s.name}</div>
                <div style={{flex:1}}></div>
                <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-3)', letterSpacing:'0.16em'}}>FIX ▸</div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}


function isStepValid(c, idx) {
  const id = DS_STEPS[idx].id;
  switch (id) {
    case 'ancestry':
      return !!c.ancestry.id;
    case 'culture':
      return !!c.culture.environment && !!c.culture.organization && !!c.culture.upbringing && !!c.culture.language
        && !!(c.culture.skills?.environment) && !!(c.culture.skills?.organization) && !!(c.culture.skills?.upbringing);
    case 'career': {
      if (!c.career.id) return false;
      const car = careerDef(c);
      if (!car) return false;
      const parsed = parseCareerSkills(car);
      const skillCount = (c.career.skills || []).length;
      const requiredCount = parsed.auto.length + parsed.picks.reduce((s, p) => s + p.count, 0);
      if (skillCount < requiredCount) return false;
      if ((car.languages || 0) > 0 && (c.career.languages || []).length < car.languages) return false;
      if (!c.career.perk) return false;
      return true;
    }
    case 'class': {
      const cls = classDef(c);
      if (!cls) return false;
      if (cls.subclasses && !c.cclass.subclass) return false;
      if (cls.pickTwoDomains && (c.cclass.domains || []).length < 2) return false;
      // Conduit-style classes also choose a 1st-level domain feature + a domain ability.
      if (cls.pickTwoDomains && !c.cclass.domainFeature) return false;
      // The chosen domain feature grants a skill from its group.
      if (cls.pickTwoDomains && c.cclass.domainFeature?.skillGroup && !c.cclass.domainSkill) return false;
      if (cls.pickTwoDomains && !c.cclass.domainAbility) return false;
      // Censor: choose one domain → its 1st-level feature (auto) + a skill from the indicated group.
      if (cls.pickOneDomain && (c.cclass.domains || []).length < 1) return false;
      if (cls.pickOneDomain && !c.cclass.domainFeature) return false;
      if (cls.pickOneDomain && c.cclass.domainFeature?.skillGroup && !c.cclass.domainSkill) return false;
      const sigsRequired = cls.sigCount ?? 1;
      if ((c.cclass.signatures || []).length < sigsRequired) return false;
      if (cls.deep && !c.cclass.heroic3) return false;
      if (cls.deep && !c.cclass.heroic5) return false;
      if (cls.kitRequired && !c.kit.id) return false;
      if (cls.kit2Required && !c.kit2?.id) return false;
      // Prayer/Ward (Conduit) and Enchantment/Ward (Elementalist) feature choices.
      if (cls.prayers && !c.cclass.prayer) return false;
      if (cls.enchantments && !c.cclass.enchantment) return false;
      if (cls.wards && !c.cclass.ward) return false;
      // Point-buy: flex stats must spend the full budget, each within range.
      if (cls.flexCharOrder) {
        const chars = c.cclass.characteristics || {};
        const vals = cls.flexCharOrder.map(k => chars[k]);
        if (vals.some(v => typeof v !== 'number' || v < -1 || v > 2)) return false;
        const budget = Math.max(...(cls.charArrays || [[0]]).map(arr => arr.reduce((s, v) => s + v, 0)));
        if (vals.reduce((s, v) => s + v, 0) !== budget) return false;
      }
      return true;
    }
    case 'complication':
      return true; // optional
    case 'identity':
      return (c.identity.name || '').trim().length > 0;
    case 'review':
      return true;
    default:
      return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDE PREVIEW
// ─────────────────────────────────────────────────────────────────────────────

function CharacterPreview({ character }) {
  const cls = classDef(character);
  const anc = ancestryDef(character);
  const kit = kitDef(character);
  const kit2 = kit2Def(character);
  const heroName = character.identity.name || character.name || '— Unnamed —';
  const sub = [
    anc ? anc.name : 'Ancestry?',
    cls ? cls.name : 'Class?',
    cls && character.cclass.subclass ? (cls.subclasses && cls.subclasses.find(s => s.id === character.cclass.subclass || s.name === character.cclass.subclass)?.name) : null,
  ].filter(Boolean).join(' · ');
  const derived = computeDerived(character);

  return (
    <div className="stack-22">
      <div className="preview-portrait" style={character.portrait ? {backgroundImage: `url(${character.portrait})`} : (cls ? {backgroundImage: `url(${cls.img})`} : {})}>
        <div className="pp-meta">LV {String(character.level).padStart(2,'0')}</div>
        <div className="pp-name">{heroName}</div>
      </div>

      <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-3)', letterSpacing:'0.22em', textTransform:'uppercase', textAlign:'center'}}>
        {sub || 'Begin the rites'}
      </div>

      <OrnDivider glyph="✠" size="small" />

      <div>
        <H4Meta>Vitals</H4Meta>
        <div className="grid-3" style={{gap: 6}}>
          <StatTile label="Stamina" value={derived.staminaMax || '—'} gold />
          <StatTile label="Recoveries" value={derived.recoveries || '—'} />
          <StatTile label="Recovery" value={derived.recoveryValue || '—'} />
          <StatTile label="Speed" value={derived.speed || '—'} />
          <StatTile label="Stability" value={derived.stability ?? '—'} />
          <StatTile label="Winded" value={derived.winded || '—'} />
        </div>
      </div>

      <div>
        <H4Meta>Characteristics</H4Meta>
        <div className="grid-3" style={{gap: 6, gridTemplateColumns: 'repeat(5, 1fr)'}}>
          {['Might','Agility','Reason','Intuition','Presence'].map(k => (
            <div key={k} className="stat-tile" style={{textAlign:'center', padding:'10px 4px'}}>
              <div className="lbl" style={{fontSize: 8}}>{k.slice(0,3).toUpperCase()}</div>
              <div className="val" style={{fontSize: 18}}>
                {derived.chars[k] != null ? (derived.chars[k] > 0 ? '+' + derived.chars[k] : derived.chars[k]) : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {cls && (
        <div>
          <H4Meta>Heroic Resource</H4Meta>
          <div style={{
            padding:'10px 14px', border:'1px solid var(--rubric)',
            background:'rgba(193,74,58,0.08)',
          }}>
            <div style={{fontFamily:'var(--display)', fontSize:18, letterSpacing:'0.12em', color: 'var(--rubric-2)'}}>
              {cls.resource.toUpperCase()}
            </div>
            <div style={{fontFamily:'var(--hand)', fontStyle:'italic', fontSize:13, color: 'var(--ink-2)', marginTop: 2}}>
              The {cls.name.toLowerCase()}'s fuel for greatness.
            </div>
          </div>
        </div>
      )}

      {kit && (
        <div>
          <H4Meta>{kit2 ? 'Kits' : 'Kit'}</H4Meta>
          <div style={{padding:'10px 14px', border:'1px solid var(--line-2)', background:'var(--bg-2)'}}>
            <div style={{fontFamily:'var(--display)', fontSize:14, letterSpacing:'0.14em', color:'var(--gold-2)'}}>{kit.name.toUpperCase()}</div>
            <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-3)', letterSpacing:'0.16em', marginTop:4}}>
              {kit.armor} · {kit.weapon}
            </div>
            {kit2 && (
              <>
                <div style={{fontFamily:'var(--display)', fontSize:14, letterSpacing:'0.14em', color:'var(--gold-2)', marginTop:8, paddingTop:8, borderTop:'1px dashed var(--line)'}}>{kit2.name.toUpperCase()}</div>
                <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-3)', letterSpacing:'0.16em', marginTop:4}}>
                  {kit2.armor} · {kit2.weapon}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: ANCESTRY
// ─────────────────────────────────────────────────────────────────────────────

const STEP_COMPONENTS = {
  ancestry: AncestryStep,
  culture: CultureStep,
  career: CareerStep,
  class: ClassStep,
  complication: ComplicationStep,
  identity: IdentityStep,
  review: ReviewStep,
};


export { Wizard };
