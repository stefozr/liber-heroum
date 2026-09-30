// wizard/steps/ancestry.jsx — AncestryStep (split out of the former wizard.jsx).
import React from 'react';
import { DS_LANGUAGES, DS_SKILL_GROUPS, DS_ANCESTRIES, DS_CULTURES, DS_CAREERS, DS_CLASSES, DS_KITS, DS_COMPLICATIONS, DS_STEPS } from '../../data.jsx';
import { OrnDivider, GlyphRow, Crest, renderGlyph, renderRich, Pill, Tag, Button, IconButton, H1, H2, H3, H4Meta, Eyebrow, Deck, DropCap, StatTile, SelCard, CardDrawer, Modal, PowerRoll, AbilityCard } from '../../theme.jsx';
import { classDef, ancestryDef, kitDef, kit2Def, careerDef, complicationDef, computeDerived, summarizeBenefits, skillsTakenExcept } from '../../app.jsx';
import { timeString, parseCareerSkills, PERKS, CHAR_MIN, CHAR_MAX, charBudget, defaultFlexValues, parseKitSig, fmtKitDmg, resolvedAncestryTraits, ancestryPoints, ancestrySpent, ancestrySignatures, orderTraitCards, scrollWizardTo } from '../helpers.js';
import { StepHeader } from '../StepHeader.jsx';
import { TraitProse, TraitAbilityCards } from '../../theme/sheet.jsx';
import { SkillChoicePicker, OptionChoicePicker } from './pickers.jsx';

const { useState, useEffect, useMemo, useRef, useCallback } = React;

function AncestryStep({ character, update }) {
  const sel = character.ancestry.id;
  // Re-clicking the already-selected ancestry must not wipe the trait picks.
  const setAnc = (id) => {
    // The signature trait and the trait-point budget live below the poster grid —
    // bring them into view on a fresh pick, or the points go unspent.
    if (id !== character.ancestry.id) scrollWizardTo('ancestry-config');
    update(c => c.ancestry.id === id ? c
      : ({ ...c, ancestry: { ...c.ancestry, id, traits: [], formerLife: null, prevLifeTraits: {}, sigSkills: {}, sigOptions: {}, traitSkills: {}, traitOptions: {} } }));
  };

  const anc = ancestryDef(character);
  const spent = ancestrySpent(character);
  const budget = anc ? ancestryPoints(character) : 0;
  const remaining = budget - spent;

  // ── Revenant: Former Life machinery ──
  const isRevenant = anc && anc.id === 'revenant';
  const formerLifeId = character.ancestry.formerLife || null;
  const formerAnc = formerLifeId ? DS_ANCESTRIES.find(a => a.id === formerLifeId) : null;
  const prevLifeTraits = character.ancestry.prevLifeTraits || {};

  // Drop trait-choice picks that belong to a borrowed (former-life) trait no longer held.
  const pruneBorrowedChoices = (ancestry) => {
    const own = new Set((DS_ANCESTRIES.find(a => a.id === ancestry.id)?.traits || []).map(t => t.name));
    const kept = new Set([...own, ...Object.values(ancestry.prevLifeTraits || {}).filter(Boolean)]);
    const prune = (map) => Object.fromEntries(Object.entries(map || {}).filter(([k]) => kept.has(k)));
    return { ...ancestry, traitSkills: prune(ancestry.traitSkills), traitOptions: prune(ancestry.traitOptions) };
  };

  const setFormerLife = (id) => update(c => {
    let ancestry = pruneBorrowedChoices({ ...c.ancestry, formerLife: id, prevLifeTraits: {} });
    // A smaller budget (leaving a 1S former life) can strand an overspent build —
    // drop the most recently purchased traits until it fits.
    const nextBudget = ancestryPoints({ ...c, ancestry });
    const costOf = (n) => (DS_ANCESTRIES.find(a => a.id === ancestry.id)?.traits || []).find(t => t.name === n)?.cost || 0;
    let traits = [...(ancestry.traits || [])];
    while (traits.reduce((s, n) => s + costOf(n), 0) > nextBudget) traits.pop();
    return { ...c, ancestry: { ...ancestry, traits } };
  });
  const setPrevLifeTrait = (cost, traitName) => update(c => {
    const cur = c.ancestry.prevLifeTraits || {};
    const key = `${cost}pt`;
    const next = { ...cur, [key]: cur[key] === traitName ? null : traitName };
    return { ...c, ancestry: pruneBorrowedChoices({ ...c.ancestry, prevLifeTraits: next }) };
  });

  // ── Signature-granted skill choices (e.g. Devil's Silver Tongue) ──
  const sigSkills = character.ancestry.sigSkills || {};
  const toggleSigSkill = (sigName, count, skill) => update(c => {
    const cur = (c.ancestry.sigSkills || {})[sigName] || [];
    let next;
    if (cur.includes(skill)) next = cur.filter(s => s !== skill);
    else if (cur.length >= count) return c; // at capacity
    else next = [...cur, skill];
    return { ...c, ancestry: { ...c.ancestry, sigSkills: { ...(c.ancestry.sigSkills || {}), [sigName]: next } } };
  });

  // ── Signature-granted option choices (e.g. Dragon Knight's Wyrmplate damage immunity) ──
  const sigOptions = character.ancestry.sigOptions || {};
  const toggleSigOption = (sigName, count, opt) => update(c => {
    const cur = (c.ancestry.sigOptions || {})[sigName] || [];
    let next;
    if (cur.includes(opt)) next = cur.filter(o => o !== opt);
    else if (count === 1) next = [opt];
    else if (cur.length >= count) return c;
    else next = [...cur, opt];
    return { ...c, ancestry: { ...c.ancestry, sigOptions: { ...(c.ancestry.sigOptions || {}), [sigName]: next } } };
  });

  // ── Trait-granted choices (Prismatic Scales, Psionic Gift, Passionate Artisan) ──
  const toggleTraitSkill = (traitName, count, skill) => update(c => {
    const cur = (c.ancestry.traitSkills || {})[traitName] || [];
    let next;
    if (cur.includes(skill)) next = cur.filter(s => s !== skill);
    else if (cur.length >= count) return c; // at capacity
    else next = [...cur, skill];
    return { ...c, ancestry: { ...c.ancestry, traitSkills: { ...(c.ancestry.traitSkills || {}), [traitName]: next } } };
  });
  const toggleTraitOption = (traitName, count, opt) => update(c => {
    const cur = (c.ancestry.traitOptions || {})[traitName] || [];
    let next;
    if (cur.includes(opt)) next = cur.filter(o => o !== opt);
    else if (count === 1) next = [opt];
    else if (cur.length >= count) return c;
    else next = [...cur, opt];
    return { ...c, ancestry: { ...c.ancestry, traitOptions: { ...(c.ancestry.traitOptions || {}), [traitName]: next } } };
  });

  const toggleTrait = (traitName) => {
    if (!anc) return;
    const t = anc.traits.find(tr => tr.name === traitName);
    const isOn = (character.ancestry.traits || []).includes(traitName);
    if (isOn) {
      update(c => {
        // Clear any linked Previous Life pick and trait choices when the trait is removed.
        const nextPL = { ...(c.ancestry.prevLifeTraits || {}) };
        if (traitName === 'Previous Life: 1pt') delete nextPL['1pt'];
        if (traitName === 'Previous Life: 2pt') delete nextPL['2pt'];
        const nextTS = { ...(c.ancestry.traitSkills || {}) };
        const nextTO = { ...(c.ancestry.traitOptions || {}) };
        delete nextTS[traitName];
        delete nextTO[traitName];
        return { ...c, ancestry: { ...c.ancestry, traits: c.ancestry.traits.filter(x => x !== traitName), prevLifeTraits: nextPL, traitSkills: nextTS, traitOptions: nextTO } };
      });
    } else {
      if (t.cost > remaining) return;
      update(c => ({ ...c, ancestry: { ...c.ancestry, traits: [...(c.ancestry.traits || []), traitName] } }));
    }
  };

  // Follow-up picks a purchased trait unlocks — rendered as a drawer right under
  // its card in the grid (and, for a borrowed trait, under its card in the
  // Previous Life drawer). Cards are buttons, so the pickers can't nest inside.
  const choiceTraits = resolvedAncestryTraits(character).filter(t => !t.placeholder && (t.skillChoice || t.optionChoice));
  const traitChoiceDrawer = (name) => {
    const t = choiceTraits.find(x => x.name === name);
    if (!t) return null;
    const count = (t.skillChoice || t.optionChoice).count;
    const done = (t.chosen || []).length >= count;
    return (
      <CardDrawer title={<>
        <span>{t.skillChoice ? 'Skill' : t.optionChoice.label || 'Option'}{t.borrowedFrom ? <span style={{color:'var(--ink-3)'}}> — borrowed from {t.borrowedFrom}</span> : ''}</span>
        <Pill kind={done ? 'gold' : ''}>{done ? 'CHOSEN' : `PICK ${count}`}</Pill>
      </>}>
        {t.skillChoice && (
          <SkillChoicePicker
            character={character}
            slotKey={'trait:' + t.name}
            choice={t.skillChoice}
            picked={(character.ancestry.traitSkills || {})[t.name] || []}
            toggle={(s) => toggleTraitSkill(t.name, t.skillChoice.count, s)}
          />
        )}
        {t.optionChoice && (
          <OptionChoicePicker
            choice={t.optionChoice}
            options={t.optionChoice.options || (t.abilities || []).map(a => a.name)}
            picked={(character.ancestry.traitOptions || {})[t.name] || []}
            toggle={(o) => toggleTraitOption(t.name, t.optionChoice.count, o)}
          />
        )}
        <TraitAbilityCards trait={t} />
      </CardDrawer>
    );
  };
  const PREV_LIFE_TRAITS = ['Previous Life: 1pt', 'Previous Life: 2pt'];
  const prevLifeDrawer = (plName) => {
    const cost = plName.includes('1pt') ? 1 : 2;
    const key = `${cost}pt`;
    const pool = formerAnc ? formerAnc.traits.filter(t => t.cost === cost) : [];
    const chosen = prevLifeTraits[key] || null;
    return (
      <CardDrawer title={<>
        <span>Borrow from <span style={{color:'var(--gold-2)'}}>{formerAnc ? formerAnc.name : 'Former Life'}</span></span>
        <Pill kind={chosen ? 'gold' : ''}>{chosen ? 'CHOSEN' : `PICK ${cost}-PT TRAIT`}</Pill>
      </>}>
        {!formerAnc ? (
          <div style={{fontFamily:'var(--hand)', fontStyle:'italic', color:'var(--ink-3)', fontSize: '0.875rem'}}>
            Choose your Former Life ancestry above to borrow a {cost}-point trait from it.
          </div>
        ) : pool.length === 0 ? (
          <div style={{fontFamily:'var(--hand)', fontStyle:'italic', color:'var(--ink-3)', fontSize: '0.875rem'}}>
            {formerAnc.name} has no {cost}-point traits to borrow.
          </div>
        ) : (
          <div className="grid-2 grid-drawers">
            {pool.map(t => {
              const on = chosen === t.name;
              return (
                <React.Fragment key={t.name}>
                <SelCard selected={on} onClick={() => setPrevLifeTrait(cost, t.name)}>
                  <div style={{display:'flex', justifyContent:'space-between', gap:10, alignItems:'baseline'}}>
                    <div style={{fontFamily:'var(--display)', fontSize: '0.875rem', letterSpacing:'0.12em', color:'var(--ink)'}}>{t.name}</div>
                    <Tag kind="gold">{t.cost} PT</Tag>
                  </div>
                  <TraitProse trait={t} style={{fontFamily:'var(--serif)', fontSize: '0.8125rem', color:'var(--ink-2)', marginTop:8, lineHeight:1.5}} />
                  <TraitAbilityCards trait={t} />
                </SelCard>
                {on && traitChoiceDrawer(t.name)}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </CardDrawer>
    );
  };


  return (
    <div className="stack-22">
      <H3>Choose your Ancestry</H3>
      {!anc && (
        <div style={{ fontFamily: 'var(--hand)', fontStyle: 'italic', color: 'var(--ink-3)', fontSize: '0.875rem', marginTop: -12 }}>
          Each ancestry grants points to spend on traits — you'll pick those below once you choose.
        </div>
      )}
      <div className="grid-3">
        {DS_ANCESTRIES.map(a => (
          <SelCard key={a.id} className={`poster-card${sel && sel !== a.id ? ' dim' : ''}`} selected={sel === a.id} onClick={() => setAnc(a.id)}>
            <div className="pc-art" style={{backgroundImage:`url(${a.img})`}} />
            <div className="pc-scrim">
              <div className="pc-name-row">
                <div className="pc-name">{a.name}</div>
                <span className="c-stamp">{a.glyph}</span>
              </div>
              <div className="pc-desc-reveal"><div className="pc-desc">{a.desc}</div></div>
            </div>
          </SelCard>
        ))}
      </div>

      {anc && (
        <>
          <div id="ancestry-config" />
          <OrnDivider glyph={`❦  ${anc.name.toUpperCase()}  ❦`} />

          {(anc.height || anc.lifespan) && (
            <div style={{fontFamily:'var(--mono)', fontSize: '0.625rem', color:'var(--ink-3)', letterSpacing:'0.16em', textTransform:'uppercase', display:'flex', gap:18, flexWrap:'wrap'}}>
              {anc.height && <span>Height: <b style={{color:'var(--ink-2)'}}>{isRevenant && formerAnc ? formerAnc.height : anc.height}</b></span>}
              {anc.weight && <span>Weight: <b style={{color:'var(--ink-2)'}}>{isRevenant && formerAnc ? formerAnc.weight : anc.weight}</b></span>}
              {anc.lifespan && <span>Life Expectancy: <b style={{color:'var(--ink-2)'}}>{anc.lifespan}</b></span>}
            </div>
          )}

          {ancestrySignatures(anc).map((sig, i) => (
            <div key={sig.name} className="orn-frame bracket-corners" style={{padding: '22px 24px'}}>
              <H3>Signature Trait: <span style={{color:'var(--gold-2)'}}>{sig.name}</span></H3>
              <TraitProse trait={{ ...sig, chosen: sigOptions[sig.name] || [] }} style={{fontFamily:'var(--serif)', fontSize: '0.875rem', color:'var(--ink-2)', marginTop:8, lineHeight:1.55}} />
              {sig.skillChoice && (
                <SkillChoicePicker
                  character={character}
                  slotKey={'sig:' + sig.name}
                  choice={sig.skillChoice}
                  picked={sigSkills[sig.name] || []}
                  toggle={(s) => toggleSigSkill(sig.name, sig.skillChoice.count, s)}
                />
              )}
              {sig.optionChoice && (
                <OptionChoicePicker
                  choice={sig.optionChoice}
                  options={sig.optionChoice.options}
                  picked={sigOptions[sig.name] || []}
                  toggle={(o) => toggleSigOption(sig.name, sig.optionChoice.count, o)}
                />
              )}
              <TraitAbilityCards trait={{ ...sig, chosen: sigOptions[sig.name] || [] }} />
            </div>
          ))}

          {isRevenant && (
            <div className="orn-frame bracket-corners" style={{padding: '22px 24px'}}>
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap'}}>
                <H3>Former Life: <span style={{color:'var(--gold-2)'}}>{formerAnc ? formerAnc.name : 'Choose an Ancestry'}</span></H3>
                {formerAnc && <Pill kind="gold">SIZE {formerAnc.size} · SPD 5 · STAB {formerAnc.stability}</Pill>}
              </div>
              <Deck>The ancestry you were before you died. It sets your size; your speed is always 5. You gain none of its traits unless you buy a <b style={{color:'var(--gold-2)'}}>Previous Life</b> trait below.</Deck>
              <div className="skill-chip-grid" style={{marginTop:14}}>
                {DS_ANCESTRIES.filter(a => a.id !== 'revenant').map(a => (
                  <button
                    type="button"
                    key={a.id}
                    className={`skill-chip${formerLifeId === a.id ? ' on' : ''}`}
                    onClick={() => setFormerLife(a.id)}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:10}}>
              <H3>Purchased Traits</H3>
              <div style={{display:'flex', alignItems:'center', gap:10}}>
                {anc.quick && anc.quick.length > 0 && <Pill kind="gold">QUICK BUILD · {anc.quick.join(' + ').toUpperCase()}</Pill>}
                <Pill kind={remaining === 0 ? 'gold' : 'rubric'}>
                  {remaining} / {budget} PTS REMAINING{remaining > 0 ? ' · SPEND ALL TO COMPLETE' : ''}
                </Pill>
              </div>
            </div>
            <div className="grid-2 grid-drawers">
              {orderTraitCards(anc.traits).map(t => {
                const isOn = (character.ancestry.traits || []).includes(t.name);
                const overBudget = !isOn && t.cost > remaining;
                const isQuick = (anc.quick || []).includes(t.name);
                return (
                  <React.Fragment key={t.name}>
                  <SelCard
                    selected={isOn}
                    blocked={overBudget}
                    onClick={() => toggleTrait(t.name)}
                  >
                    <div style={{display:'flex', justifyContent:'space-between', gap:10, alignItems:'baseline'}}>
                      <div style={{display:'flex', alignItems:'baseline', gap:8}}>
                        <div style={{fontFamily:'var(--display)', fontSize: '0.875rem', letterSpacing:'0.12em', color:'var(--ink)'}}>{t.name}</div>
                        {isQuick && <Tag kind="gold">Suggested</Tag>}
                      </div>
                      <Tag kind="gold">{t.cost} PT</Tag>
                    </div>
                    <TraitProse trait={t} style={{fontFamily:'var(--serif)', fontSize: '0.8125rem', color:'var(--ink-2)', marginTop:8, lineHeight:1.5}} />
                    <TraitAbilityCards trait={t} />
                  </SelCard>
                  {isOn && traitChoiceDrawer(t.name)}
                  {isOn && isRevenant && PREV_LIFE_TRAITS.includes(t.name) && prevLifeDrawer(t.name)}
                  </React.Fragment>
                );
              })}
            </div>

          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: CULTURE
// ─────────────────────────────────────────────────────────────────────────────

export { AncestryStep };
