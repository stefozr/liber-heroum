// wizard/Wizard.jsx — the orchestrator: main Wizard + CharacterPreview + isStepValid + the step map.
import React from 'react';
import { DS_LANGUAGES, DS_SKILL_GROUPS, DS_ANCESTRIES, DS_CULTURES, DS_CAREERS, DS_CLASSES, DS_KITS, DS_COMPLICATIONS, DS_STEPS, kitPoolFor } from '../data.jsx';import { OrnDivider, GlyphRow, Crest, renderGlyph, Pill, SavePill, Tag, Button, IconButton, TopBar, H1, H2, H3, H4Meta, Eyebrow, Deck, DropCap, StatTile, SelCard, Modal, PowerRoll, AbilityCard } from '../theme.jsx';import { classDef, ancestryDef, kitDef, kit2Def, careerDef, complicationDef, computeDerived, summarizeBenefits, skillsTakenExcept } from '../app.jsx';
import { timeString, parseCareerSkills, classSkillPicks, classGrantedSkills, matchesCharArray, groupsOfSkill, careerAutoCollisions, classGrantCollisions, complicationGrantCollisions, resolvedAncestryTraits, ancestrySignatures, ancestryPoints, ancestrySpent } from './helpers.js';
import { StepHeader } from './StepHeader.jsx';
import { UnfinishedChapters } from './UnfinishedChapters.jsx';
import { AncestryStep } from './steps/ancestry.jsx';
import { CultureStep } from './steps/culture.jsx';
import { CareerStep } from './steps/career.jsx';
import { ClassStep } from './steps/class.jsx';
import { ComplicationStep } from './steps/complication.jsx';
import { IdentityStep } from './steps/identity.jsx';
import { ReviewStep } from './steps/review.jsx';

const { useState, useEffect, useMemo, useRef, useCallback } = React;

function Wizard({ character, update, saveState, onExit, onComplete }) {
  const rawStep = character.wizardStep || 0;
  const stepIndex = Math.max(0, Math.min(DS_STEPS.length - 1, rawStep));
  const step = DS_STEPS[stepIndex];

  const setStep = (i) => {
    const clamped = Math.max(0, Math.min(DS_STEPS.length - 1, i));
    update(c => ({
      ...c,
      wizardStep: clamped,
      wizardVisited: (c.wizardVisited || []).includes(clamped)
        ? c.wizardVisited
        : [...(c.wizardVisited || []), clamped].sort((a, b) => a - b),
    }));
  };

  // Steps the user has actually been shown, persisted on the character so the
  // history survives closing and reopening a draft. A ✓ in the rail means "seen
  // and complete" — a fresh hero must not open with checkmarks on chapters it
  // has never visited, and going back to chapter one must not strip the marks
  // from chapters already worked through. Drafts saved before wizardVisited
  // existed are seeded with everything up to their saved chapter.
  const visitedRef = useRef(null);
  if (visitedRef.current === null) {
    visitedRef.current = new Set(
      character.wizardVisited || Array.from({ length: stepIndex + 1 }, (_, i) => i)
    );
  }
  visitedRef.current.add(stepIndex);
  const seenStep = (i) => visitedRef.current.has(i);

  // Write the seed (legacy drafts) and the opening chapter back to the character
  // once per mount, so the very first visit is also remembered.
  useEffect(() => {
    const saved = character.wizardVisited || [];
    if (visitedRef.current.size !== saved.length) {
      const merged = [...new Set([...saved, ...visitedRef.current])].sort((a, b) => a - b);
      update(c => ({ ...c, wizardVisited: merged }));
    }
  }, []);

  const stepValid = useMemo(() => isStepValid(character, stepIndex), [character, stepIndex]);
  const incompleteSteps = useMemo(
    () => DS_STEPS.map((s, i) => ({ s, i, issues: stepIssues(character, i) })).filter(({ issues }) => issues.length > 0),
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

  // Between ~900px and ~1080px the rail scrolls, and the step is advanced from the
  // footer rather than by touching the rail — so without this the newly-active step
  // can sit off-screen. No-op at desktop widths, where nothing overflows.
  // The optional call is required, not defensive: jsdom has no scrollIntoView and
  // this effect runs on mount, which wizard.test.tsx does many times over.
  const activeStepRef = React.useRef(null);
  useEffect(() => {
    activeStepRef.current?.scrollIntoView?.({ inline: 'center', block: 'nearest' });
  }, [stepIndex]);

  // Warm the next chapter's backdrop so CONTINUE doesn't flash a bare gradient
  // while a fresh background streams in — and, one chapter ahead of Class, its
  // nine poster cards, the only other image grid that pops in. (Inert under jsdom.)
  useEffect(() => {
    const next = DS_STEPS[stepIndex + 1];
    if (next?.bg) { const img = new Image(); img.src = next.bg; }
    if (next?.id === 'class') {
      for (const cls of DS_CLASSES) {
        if (cls.cardImg) { const img = new Image(); img.src = cls.cardImg; }
      }
    }
  }, [stepIndex]);

  return (
    <div className="wiz">
      {/* Top bar */}
      <TopBar
        className="wiz-topbar"
        mark={<Crest glyph="✠" portrait={character.portrait || undefined} />}
        brand="DRAW · STEEL"
        sub={<>
          {character.identity.name || character.name || 'NEW HERO'}
          {stepSummary(character, step.id) && (
            <span style={{color:'var(--gold-2)'}}> ✦ {stepSummary(character, step.id)}</span>
          )}
        </>}
        right={<>
          <SavePill saveState={saveState || { status: 'saved', at: null }} />
          <Button small kind="ghost" onClick={onExit}>◂ ROSTER</Button>
        </>}
      />

      {/* Rail */}
      <div className="wiz-rail">
        {DS_STEPS.map((s, i) => {
          const valid = isStepValid(character, i);
          const seen = seenStep(i);
          const isActive = i === stepIndex;
          // "done" only when the step was seen AND is fully complete — optional or
          // vacuously-valid chapters keep their number until the user opens them.
          // "visited" = user has been there but it's incomplete.
          const done = valid && seen && !isActive;
          const cls = ['rstep'];
          if (done) cls.push('done');
          if (seen && !valid && !isActive) cls.push('visited');
          if (isActive) cls.push('active');
          return (
            <button
              type="button"
              key={s.id}
              className={'card-btn ' + cls.join(' ')}
              aria-current={isActive ? 'step' : undefined}
              ref={isActive ? activeStepRef : null}
              onClick={() => setStep(i)}
            >
              <div className="rnum">{done ? '✓' : String(i+1).padStart(2,'0')}</div>
              <div className="rname">{s.name}{s.id === 'complication' ? <span className="ropt"> · optional</span> : null}</div>
            </button>
          );
        })}
      </div>

      {/* Compact rail (≤900px): CSS swaps this in for .wiz-rail. Both stay in the
          DOM — wizard.test.tsx asserts every step name renders. Arrows are free
          navigation like rail clicks; the footer CONTINUE remains the validated path. */}
      <div className="wiz-railbar">
        <button type="button" className="rb-arrow" aria-label="Previous chapter"
                disabled={stepIndex === 0} onClick={() => setStep(stepIndex - 1)}>◂</button>
        <div className="rb-label">
          <div className="rb-count">Chapter {stepIndex + 1} of {DS_STEPS.length}</div>
          <div className="rb-name">{step.name}</div>
        </div>
        <button type="button" className="rb-arrow" aria-label="Next chapter"
                disabled={isLast} onClick={() => setStep(stepIndex + 1)}>▸</button>
      </div>

      {/* Step body */}
      <div className="wiz-step" ref={bodyRef}>
        <div className="step-bg" style={{ backgroundImage: `url(${step.bg})` }}></div>

        <div className="col-main">
          <StepHeader step={step} />
          <div style={{height: 8}}></div>
          <Step character={character} update={update}
            {...(step.id === 'review' ? { incompleteSteps, onGoToStep: setStep } : {})} />
          <div style={{height: 60}}></div>
        </div>
      </div>

      {/* Footer */}
      <div className="wiz-footer">
        {/* On chapter one the back button would duplicate the topbar's ◂ ROSTER —
            an invisible stand-in keeps the space-between footer from shifting. */}
        {stepIndex === 0
          ? <div aria-hidden="true" style={{ visibility: 'hidden' }}><Button kind="ghost">◂ ROSTER</Button></div>
          : <Button kind="ghost" onClick={onBack}>◂ {DS_STEPS[stepIndex - 1].name.toUpperCase()}</Button>}
        <div className="meta">
          Chapter {stepIndex + 1} of {DS_STEPS.length} · {step.name}
          {!stepValid && !isLast && <span style={{color:'var(--gold-2)'}}> · choices remain ▾</span>}
        </div>
        <Button kind="primary" onClick={onContinue} disabled={nameMissing}
          title={nameMissing ? 'Name your hero to continue' : undefined}>
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
            <div style={{flex:1}}></div>
            <Button kind="primary" onClick={() => { setCommitWarn(false); onComplete(false); }}>SAVE AS DRAFT ▸</Button>
          </>
        )}
      >
        <div style={{fontFamily:'var(--serif)', fontSize: '0.875rem', color:'var(--ink-2)', lineHeight:1.6}}>
          A few rites remain unfinished. You can keep editing, or save this hero as a <b style={{color:'var(--gold-2)'}}>draft</b> and return to the Liber later — it won't be playable until completed.
        </div>
        <div style={{marginTop: 16}}>
          <div style={{fontFamily:'var(--mono)', fontSize: '0.625rem', color:'var(--ink-3)', letterSpacing:'0.2em', textTransform:'uppercase', marginBottom: 8}}>Still to finish</div>
          <UnfinishedChapters incompleteSteps={incompleteSteps}
            onGoToStep={(i) => { setCommitWarn(false); setStep(i); }} />
        </div>
      </Modal>
    </div>
  );
}


// Every duplicate-grant collision must carry a valid swap: a distinct same-group skill
// that isn't held by any other slot or by this step's own grants/choices.
// Returns the colliding skill names still lacking a valid swap.
function unresolvedSwaps(c, collisions, swaps, ownKey, ownNames) {
  if (!collisions.length) return [];
  const taken = skillsTakenExcept(c, ownKey);
  const used = [];
  const unresolved = [];
  for (const { skill } of collisions) {
    const swap = (swaps || {})[skill];
    const pool = groupsOfSkill(skill).flatMap(g => DS_SKILL_GROUPS[g] || []);
    if (!swap || swap === skill || !pool.includes(swap)
        || taken.has(swap) || ownNames.includes(swap) || used.includes(swap)) {
      unresolved.push(skill);
      continue;
    }
    used.push(swap);
  }
  return unresolved;
}

function swapsResolved(c, collisions, swaps, ownKey, ownNames) {
  return unresolvedSwaps(c, collisions, swaps, ownKey, ownNames).length === 0;
}

// Everything still missing from a chapter, as short human-readable lines.
// Empty array ⇔ the step is valid — isStepValid is defined as exactly that.
function stepIssues(c, idx) {
  const id = DS_STEPS[idx].id;
  const swapIssues = (...args) => unresolvedSwaps(c, ...args).map(skill => `Duplicate skill: swap for ${skill} not chosen`);
  switch (id) {
    case 'ancestry': {
      if (!c.ancestry.id) return ['Ancestry not chosen'];
      const issues = [];
      const anc = DS_ANCESTRIES.find(a => a.id === c.ancestry.id);
      // Every signature-level choice must be fully picked (Silver Tongue skill,
      // Wyrmplate immunity, Runic Carving rune).
      for (const sig of ancestrySignatures(anc)) {
        if (sig.skillChoice) {
          const got = ((c.ancestry.sigSkills || {})[sig.name] || []).filter(Boolean).length;
          const count = sig.skillChoice.count;
          if (got < count) issues.push(count === 1 ? `${sig.name}: skill not picked` : `${sig.name}: ${got} of ${count} skills picked`);
        }
        if (sig.optionChoice) {
          const got = ((c.ancestry.sigOptions || {})[sig.name] || []).filter(Boolean).length;
          const count = sig.optionChoice.count;
          if (got < count) issues.push(count === 1 ? `${sig.name}: choice not made` : `${sig.name}: ${got} of ${count} choices made`);
        }
      }
      if (c.ancestry.id === 'revenant') {
        // A revenant needs a former life, and each purchased 'Previous Life' trait
        // needs its borrowed trait chosen (when the former ancestry offers one).
        const former = DS_ANCESTRIES.find(a => a.id === c.ancestry.formerLife);
        if (!former) issues.push('Former life not chosen');
        else {
          const pl = c.ancestry.prevLifeTraits || {};
          for (const [name, cost] of [['Previous Life: 1pt', 1], ['Previous Life: 2pt', 2]]) {
            if ((c.ancestry.traits || []).includes(name)
                && (former.traits || []).some(t => t.cost === cost)
                && !pl[`${cost}pt`]) issues.push(`Previous Life (${cost}pt): borrowed trait not chosen`);
          }
        }
      }
      // Every purchased (or borrowed) choice-bearing trait must be fully picked.
      for (const t of resolvedAncestryTraits(c)) {
        if (t.placeholder) continue; // unpicked Previous Life — the revenant gate owns it
        if (t.skillChoice && (t.chosen || []).length < t.skillChoice.count) {
          const got = (t.chosen || []).length, count = t.skillChoice.count;
          issues.push(count === 1 ? `${t.name}: skill not picked` : `${t.name}: ${got} of ${count} skills picked`);
        }
        if (t.optionChoice) {
          const pool = t.optionChoice.options || (t.abilities || []).map(a => a.name);
          if (pool.length >= t.optionChoice.count && (t.chosen || []).length < t.optionChoice.count) issues.push(`${t.name}: choice not made`);
        }
      }
      // Every ancestry point must be spent. The step only stays incomplete while
      // an affordable unpurchased trait actually exists, so odd budgets (1 point
      // left, only 2-point traits remaining) can't dead-end the chapter.
      const remaining = ancestryPoints(c) - ancestrySpent(c);
      if (remaining > 0) {
        const owned = new Set(c.ancestry.traits || []);
        if ((anc.traits || []).some(t => !owned.has(t.name) && t.cost <= remaining)) {
          issues.push(`${remaining} ancestry ${remaining === 1 ? 'point' : 'points'} unspent`);
        }
      }
      return issues;
    }
    case 'culture': {
      const issues = [];
      if (!c.culture.environment) issues.push('Environment not chosen');
      if (!c.culture.organization) issues.push('Organization not chosen');
      if (!c.culture.upbringing) issues.push('Upbringing not chosen');
      if (!c.culture.language) issues.push('Language not chosen');
      if (!(c.culture.skills?.environment)) issues.push('Environment skill not picked');
      if (!(c.culture.skills?.organization)) issues.push('Organization skill not picked');
      if (!(c.culture.skills?.upbringing)) issues.push('Upbringing skill not picked');
      return issues;
    }
    case 'career': {
      if (!c.career.id) return ['Career not chosen'];
      const car = careerDef(c);
      if (!car) return ['Career not chosen'];
      const issues = [];
      const parsed = parseCareerSkills(car);
      const skillCount = (c.career.skills || []).length;
      const requiredCount = parsed.auto.length + parsed.picks.reduce((s, p) => s + p.count, 0);
      if (skillCount < requiredCount) issues.push(`Skills: ${skillCount} of ${requiredCount} picked`);
      if ((car.languages || 0) > 0 && (c.career.languages || []).length < car.languages) {
        const got = (c.career.languages || []).length;
        issues.push(car.languages === 1 ? 'Language not chosen' : `Languages: ${got} of ${car.languages} picked`);
      }
      if (!c.career.perk) issues.push('Perk not chosen');
      // Auto-granted duplicates need their "choose another instead" swap.
      issues.push(...swapIssues(careerAutoCollisions(c), c.career.skillSwaps, 'career', c.career.skills || []));
      return issues;
    }
    case 'class': {
      const cls = classDef(c);
      if (!cls) return ['Class not chosen'];
      const issues = [];
      if (cls.subclasses && !c.cclass.subclass) issues.push('Subclass not chosen');
      if (cls.pickTwoDomains && (c.cclass.domains || []).length < 2) issues.push(`Domains: ${(c.cclass.domains || []).length} of 2 chosen`);
      // Conduit-style classes also choose a 1st-level domain feature + a domain ability.
      if (cls.pickTwoDomains && !c.cclass.domainFeature) issues.push('Domain feature not chosen');
      // The chosen domain feature grants a skill from its group.
      if (cls.pickTwoDomains && c.cclass.domainFeature?.skillGroup && !c.cclass.domainSkill) issues.push('Domain skill not picked');
      if (cls.pickTwoDomains && !c.cclass.domainAbility) issues.push('Domain ability not chosen');
      // Censor: choose one domain → its 1st-level feature (auto) + a skill from the indicated group.
      if (cls.pickOneDomain && (c.cclass.domains || []).length < 1) issues.push('Domain not chosen');
      if (cls.pickOneDomain && !c.cclass.domainFeature) issues.push('Domain feature not chosen');
      if (cls.pickOneDomain && c.cclass.domainFeature?.skillGroup && !c.cclass.domainSkill) issues.push('Domain skill not picked');
      const sigsRequired = cls.sigCount ?? 1;
      const sigsGot = (c.cclass.signatures || []).length;
      if (sigsGot < sigsRequired) {
        issues.push(sigsRequired === 1 ? 'Signature ability not chosen' : `Signature abilities: ${sigsGot} of ${sigsRequired} picked`);
      }
      if (cls.deep && !c.cclass.heroic3) issues.push(`3-${cls.resource} heroic ability not chosen`);
      if (cls.deep && !c.cclass.heroic5) issues.push(`5-${cls.resource} heroic ability not chosen`);
      // Kit picks must come from the pool the chosen subclass allows
      // (Fury's Stormwight is limited to stormwight kits).
      const kitPool = kitPoolFor(cls, c.cclass.subclass);
      const inKitPool = (id) => kitPool.some(k => k.id === id);
      if (cls.kitRequired && !(c.kit.id && inKitPool(c.kit.id))) issues.push(c.kit.id ? 'Kit not in the allowed pool' : 'Kit not chosen');
      if (cls.kit2Required && !(c.kit2?.id && inKitPool(c.kit2.id))) issues.push(c.kit2?.id ? 'Second kit not in the allowed pool' : 'Second kit not chosen');
      // Prayer/Ward (Conduit) and Enchantment/Ward (Elementalist) feature choices.
      if (cls.prayers && !c.cclass.prayer) issues.push('Prayer not chosen');
      if (cls.enchantments && !c.cclass.enchantment) issues.push('Enchantment not chosen');
      if (cls.wards && !c.cclass.ward) issues.push('Ward not chosen');
      // Class skill picks (plus the subclass's skill-group pick, e.g. Tactician doctrines).
      {
        const sub = (cls.subclasses || []).find(s => (s.id || s.name) === c.cclass.subclass);
        const needSkills = classSkillPicks(cls, sub).reduce((s, p) => s + p.count, 0);
        const gotSkills = (c.cclass.skills || []).length;
        if (gotSkills < needSkills) issues.push(`Class skills: ${gotSkills} of ${needSkills} picked`);
        // Grant duplicates need their "choose another instead" swap.
        const ownNames = [...classGrantedSkills(cls, sub), ...(c.cclass.skills || [])];
        issues.push(...swapIssues(classGrantCollisions(c), c.cclass.skillSwaps, 'class', ownNames));
      }
      // Point-buy: flex stats spend the full budget, each within range — OR match one of
      // the official arrays exactly (some official arrays total less than the budget).
      if (cls.flexCharOrder) {
        const chars = c.cclass.characteristics || {};
        const vals = cls.flexCharOrder.map(k => chars[k]);
        if (vals.some(v => typeof v !== 'number' || v < -1 || v > 2)) issues.push('Characteristics out of range');
        else {
          const budget = Math.max(...(cls.charArrays || [[0]]).map(arr => arr.reduce((s, v) => s + v, 0)));
          if (vals.reduce((s, v) => s + v, 0) !== budget && !matchesCharArray(cls, vals)) issues.push('Characteristic points not fully spent');
        }
      }
      return issues;
    }
    case 'complication': {
      // Skipping is always valid, but a chosen complication must have its picks filled.
      if (!c.complication.id) return [];
      const comp = complicationDef(c);
      if (!comp) return [];
      const issues = [];
      for (let i = 0; i < (comp.skillChoices || []).length; i++) {
        const got = (((c.complication.skills) || {})[i] || []).length;
        const count = comp.skillChoices[i].count;
        if (got < count) issues.push(count === 1 ? 'Skill not picked' : `Skills: ${got} of ${count} picked`);
      }
      if (comp.languageChoice && ((c.complication.languages || []).length < comp.languageChoice.count)) {
        const got = (c.complication.languages || []).length;
        issues.push(comp.languageChoice.count === 1 ? 'Language not chosen' : `Languages: ${got} of ${comp.languageChoice.count} picked`);
      }
      // Fixed grants colliding with an earlier slot must carry a same-group swap.
      const ownNames = [...(comp.skills || []), ...Object.values(c.complication.skills || {}).flat()];
      issues.push(...swapIssues(complicationGrantCollisions(c), c.complication.skillSwaps, 'comp:fixed', ownNames));
      return issues;
    }
    case 'identity':
      return (c.identity.name || '').trim().length > 0 ? [] : ['Hero not yet named'];
    case 'review':
      return [];
    default:
      return ['Unknown chapter'];
  }
}

function isStepValid(c, idx) {
  return stepIssues(c, idx).length === 0;
}

// Chapters fully complete out of the total — drives the % on roster hero cards.
function wizardProgress(character) {
  const done = DS_STEPS.filter((_, i) => isStepValid(character, i)).length;
  return { done, total: DS_STEPS.length };
}

// The current chapter's headline pick, shown in the top bar so a returning user
// sees "you already chose Human here" without scrolling to the selected card.
function stepSummary(c, stepId) {
  switch (stepId) {
    case 'ancestry': return ancestryDef(c)?.name || null;
    case 'culture': {
      const cul = DS_CULTURES;
      const names = [
        cul.environments.find(x => x.id === c.culture.environment)?.name,
        cul.organizations.find(x => x.id === c.culture.organization)?.name,
        cul.upbringings.find(x => x.id === c.culture.upbringing)?.name,
      ].filter(Boolean);
      return names.length ? names.join(' · ') : null;
    }
    case 'career': return careerDef(c)?.name || null;
    case 'class': {
      const cls = classDef(c);
      if (!cls) return null;
      const sub = cls.subclasses && cls.subclasses.find(s => (s.id || s.name) === c.cclass.subclass);
      return sub ? `${cls.name} · ${sub.name}` : cls.name;
    }
    case 'complication': return complicationDef(c)?.name || null;
    default: return null;
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

      <div style={{fontFamily:'var(--mono)', fontSize: '0.625rem', color:'var(--ink-3)', letterSpacing:'0.22em', textTransform:'uppercase', textAlign:'center'}}>
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
        <div className="chars-5" style={{gap: 6}}>
          {['Might','Agility','Reason','Intuition','Presence'].map(k => (
            <div key={k} className="stat-tile" style={{textAlign:'center', padding:'10px 4px'}}>
              <div className="lbl">{k.slice(0,3).toUpperCase()}</div>
              <div className="val" style={{fontSize: '1.125rem'}}>
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
            <div style={{fontFamily:'var(--display)', fontSize: '1.125rem', letterSpacing:'0.12em', color: 'var(--rubric-2)'}}>
              {cls.resource.toUpperCase()}
            </div>
            <div style={{fontFamily:'var(--hand)', fontStyle:'italic', fontSize: '0.8125rem', color: 'var(--ink-2)', marginTop: 2}}>
              The {cls.name.toLowerCase()}'s fuel for greatness.
            </div>
          </div>
        </div>
      )}

      {kit && (
        <div>
          <H4Meta>{kit2 ? 'Kits' : 'Kit'}</H4Meta>
          <div style={{padding:'10px 14px', border:'1px solid var(--line-2)', background:'var(--bg-2)'}}>
            <div style={{fontFamily:'var(--display)', fontSize: '0.875rem', letterSpacing:'0.14em', color:'var(--gold-2)'}}>{kit.name.toUpperCase()}</div>
            <div style={{fontFamily:'var(--mono)', fontSize: '0.625rem', color:'var(--ink-3)', letterSpacing:'0.16em', marginTop:4}}>
              {kit.armor} · {kit.weapon}
            </div>
            {kit2 && (
              <>
                <div style={{fontFamily:'var(--display)', fontSize: '0.875rem', letterSpacing:'0.14em', color:'var(--gold-2)', marginTop:8, paddingTop:8, borderTop:'1px dashed var(--line)'}}>{kit2.name.toUpperCase()}</div>
                <div style={{fontFamily:'var(--mono)', fontSize: '0.625rem', color:'var(--ink-3)', letterSpacing:'0.16em', marginTop:4}}>
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


export { Wizard, isStepValid, stepIssues, wizardProgress };
