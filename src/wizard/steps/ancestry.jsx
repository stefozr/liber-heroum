// wizard/steps/ancestry.jsx — AncestryStep (split out of the former wizard.jsx).
import React from 'react';
import { DS_LANGUAGES, DS_SKILL_GROUPS, DS_ANCESTRIES, DS_CULTURES, DS_CAREERS, DS_CLASSES, DS_KITS, DS_COMPLICATIONS, DS_STEPS } from '../../data.jsx';
import { OrnDivider, GlyphRow, Crest, renderGlyph, Pill, Tag, Button, IconButton, H1, H2, H3, H4Meta, Eyebrow, Deck, DropCap, StatTile, SelCard, Modal, PowerRoll, AbilityCard } from '../../theme.jsx';
import { classDef, ancestryDef, kitDef, kit2Def, careerDef, complicationDef, computeDerived, summarizeBenefits, skillsTakenExcept } from '../../app.jsx';
import { timeString, parseCareerSkills, PERKS, CHAR_MIN, CHAR_MAX, charBudget, defaultFlexValues, parseKitSig, fmtKitDmg, resolvedAncestryTraits, ancestryPoints, ancestrySignatures } from '../helpers.js';
import { StepHeader } from '../StepHeader.jsx';

const { useState, useEffect, useMemo, useRef, useCallback } = React;

function AncestryStep({ character, update }) {
  const sel = character.ancestry.id;
  const setAnc = (id) => update(c => ({ ...c, ancestry: { ...c.ancestry, id, traits: [], formerLife: null, prevLifeTraits: {}, sigSkills: {}, sigOptions: {}, traitSkills: {}, traitOptions: {} } }));

  const anc = ancestryDef(character);
  const spent = (character.ancestry.traits || []).reduce((sum, name) => {
    const t = anc && anc.traits.find(t => t.name === name);
    return sum + (t ? t.cost : 0);
  }, 0);
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

  return (
    <div className="stack-22">
      <H3>Choose your Ancestry</H3>
      <div className="grid-3">
        {DS_ANCESTRIES.map(a => (
          <SelCard key={a.id} className={`poster-card${sel && sel !== a.id ? ' dim' : ''}`} selected={sel === a.id} onClick={() => setAnc(a.id)}>
            <div className="pc-art" style={{backgroundImage:`url(${a.img})`}} />
            <div className="pc-scrim">
              <div className="pc-name-row">
                <div className="pc-name">{a.name}</div>
                <span className="c-stamp">{a.glyph}</span>
              </div>
              <div className="pc-desc">{a.desc}</div>
            </div>
          </SelCard>
        ))}
      </div>

      {anc && (
        <>
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
              <div style={{fontFamily:'var(--serif)', fontSize: '0.875rem', color:'var(--ink-2)', marginTop:8, lineHeight:1.55}}>
                {sig.text}
              </div>
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
                <Pill kind={remaining === 0 ? 'gold' : ''}>
                  {remaining} / {budget} PTS REMAINING
                </Pill>
              </div>
            </div>
            <div className="grid-2">
              {anc.traits.map(t => {
                const isOn = (character.ancestry.traits || []).includes(t.name);
                const overBudget = !isOn && t.cost > remaining;
                const isQuick = (anc.quick || []).includes(t.name);
                return (
                  <div
                    key={t.name}
                    className={`card ${isOn ? 'selected' : ''}`}
                    onClick={() => toggleTrait(t.name)}
                    style={{ opacity: overBudget ? 0.5 : 1, cursor: overBudget ? 'not-allowed' : 'pointer' }}
                  >
                    <div style={{display:'flex', justifyContent:'space-between', gap:10, alignItems:'baseline'}}>
                      <div style={{display:'flex', alignItems:'baseline', gap:8}}>
                        <div style={{fontFamily:'var(--display)', fontSize: '0.875rem', letterSpacing:'0.12em', color:'var(--ink)'}}>{t.name}</div>
                        {isQuick && <Tag kind="gold">Suggested</Tag>}
                      </div>
                      <Tag kind="gold">{t.cost} PT</Tag>
                    </div>
                    <div style={{fontFamily:'var(--serif)', fontSize: '0.8125rem', color:'var(--ink-2)', marginTop:8, lineHeight:1.5}}>{t.text}</div>
                  </div>
                );
              })}
            </div>

            {isRevenant && ['Previous Life: 1pt', 'Previous Life: 2pt'].map(plName => {
              if (!(character.ancestry.traits || []).includes(plName)) return null;
              const cost = plName.includes('1pt') ? 1 : 2;
              const key = `${cost}pt`;
              const pool = formerAnc ? formerAnc.traits.filter(t => t.cost === cost) : [];
              const chosen = prevLifeTraits[key] || null;
              return (
                <div key={plName} className="orn-frame" style={{padding:'18px 22px', marginTop:14}}>
                  <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:10, flexWrap:'wrap'}}>
                    <H3>{plName} — Borrow from <span style={{color:'var(--gold-2)'}}>{formerAnc ? formerAnc.name : 'Former Life'}</span></H3>
                    <Pill kind={chosen ? 'gold' : ''}>{chosen ? 'CHOSEN' : `PICK ${cost}-PT TRAIT`}</Pill>
                  </div>
                  {!formerAnc ? (
                    <div style={{fontFamily:'var(--hand)', fontStyle:'italic', color:'var(--ink-3)', fontSize: '0.875rem', marginTop:10}}>
                      Choose your Former Life ancestry above to borrow a {cost}-point trait from it.
                    </div>
                  ) : pool.length === 0 ? (
                    <div style={{fontFamily:'var(--hand)', fontStyle:'italic', color:'var(--ink-3)', fontSize: '0.875rem', marginTop:10}}>
                      {formerAnc.name} has no {cost}-point traits to borrow.
                    </div>
                  ) : (
                    <div className="grid-2" style={{marginTop:14}}>
                      {pool.map(t => {
                        const on = chosen === t.name;
                        return (
                          <div
                            key={t.name}
                            className={`card ${on ? 'selected' : ''}`}
                            onClick={() => setPrevLifeTrait(cost, t.name)}
                            style={{cursor:'pointer'}}
                          >
                            <div style={{display:'flex', justifyContent:'space-between', gap:10, alignItems:'baseline'}}>
                              <div style={{fontFamily:'var(--display)', fontSize: '0.875rem', letterSpacing:'0.12em', color:'var(--ink)'}}>{t.name}</div>
                              <Tag kind="gold">{t.cost} PT</Tag>
                            </div>
                            <div style={{fontFamily:'var(--serif)', fontSize: '0.8125rem', color:'var(--ink-2)', marginTop:8, lineHeight:1.5}}>{t.text}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Choice-bearing purchased/borrowed traits (Prismatic Scales, Psionic Gift,
                Passionate Artisan) get their picker below the trait grid. */}
            {resolvedAncestryTraits(character)
              .filter(t => !t.placeholder && (t.skillChoice || t.optionChoice))
              .map(t => {
                const count = (t.skillChoice || t.optionChoice).count;
                const done = (t.chosen || []).length >= count;
                return (
                  <div key={`choice-${t.name}`} className="orn-frame" style={{padding:'18px 22px', marginTop:14}}>
                    <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:10, flexWrap:'wrap'}}>
                      <H3>{t.name}{t.borrowedFrom ? <span style={{color:'var(--gold-2)'}}> — borrowed from {t.borrowedFrom}</span> : ''}</H3>
                      <Pill kind={done ? 'gold' : ''}>{done ? 'CHOSEN' : `PICK ${count}`}</Pill>
                    </div>
                    <div style={{fontFamily:'var(--serif)', fontSize: '0.8125rem', color:'var(--ink-2)', marginTop:8, lineHeight:1.5}}>{t.text}</div>
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
                  </div>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}

// Chip grid for a "choose N skills from these groups" choice, with cross-slot dedupe.
function SkillChoicePicker({ character, slotKey, choice, picked, toggle }) {
  const { groups, count } = choice;
  const pool = Array.from(new Set(groups.flatMap(g => DS_SKILL_GROUPS[g] || [])));
  const groupLabel = groups.join(' / ');
  // Skills held in any other slot (other signatures/traits, culture, career, domain, level-ups).
  const takenElsewhere = skillsTakenExcept(character, slotKey);
  return (
    <div style={{marginTop:16}}>
      <div style={{fontFamily:'var(--mono)', fontSize: '0.625rem', color:'var(--ink-3)', letterSpacing:'0.22em', textTransform:'uppercase', marginBottom:8}}>
        Choose {count} {groupLabel} skill{count > 1 ? 's' : ''} — picked <b style={{color: picked.length === count ? 'var(--gold-2)' : 'var(--ink)'}}>{picked.length}</b> / {count}
      </div>
      <div className="skill-chip-grid">
        {pool.map(s => {
          const on = picked.includes(s);
          const elsewhere = !on && takenElsewhere.has(s);
          const blocked = elsewhere || (!on && picked.length >= count);
          return (
            <button
              type="button"
              key={s}
              className={`skill-chip${on ? ' on' : ''}${blocked ? ' blocked' : ''}`}
              onClick={() => !blocked && toggle(s)}
              disabled={blocked}
              title={elsewhere ? `Already chosen — ${takenElsewhere.get(s)}` : ''}
            >
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// "Choose N of these options" — cards when options carry text, chips otherwise.
function OptionChoicePicker({ choice, options, picked, toggle }) {
  const { label, count } = choice;
  const norm = (options || []).map(o => typeof o === 'string' ? { name: o, text: null } : o);
  const detailed = norm.some(o => o.text);
  if (detailed) {
    return (
      <div style={{marginTop:16}}>
        <div style={{fontFamily:'var(--mono)', fontSize: '0.625rem', color:'var(--ink-3)', letterSpacing:'0.22em', textTransform:'uppercase', marginBottom:10}}>
          {label} — {count === 1 ? 'choose one' : `choose ${count} (${picked.length}/${count})`}
        </div>
        <div className="grid-2">
          {norm.map(o => {
            const on = picked.includes(o.name);
            const blocked = !on && count > 1 && picked.length >= count;
            return (
              <div
                key={o.name}
                className={`card ${on ? 'selected' : ''}`}
                onClick={() => !blocked && toggle(o.name)}
                style={{ opacity: blocked ? 0.5 : 1, cursor: blocked ? 'not-allowed' : 'pointer' }}
              >
                <div style={{fontFamily:'var(--display)', fontSize: '0.875rem', letterSpacing:'0.12em', color:'var(--ink)'}}>{o.name}</div>
                {o.text && <div style={{fontFamily:'var(--serif)', fontSize: '0.8125rem', color:'var(--ink-2)', marginTop:8, lineHeight:1.5}}>{o.text}</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <div style={{marginTop:16}}>
      <div style={{fontFamily:'var(--mono)', fontSize: '0.625rem', color:'var(--ink-3)', letterSpacing:'0.22em', textTransform:'uppercase', marginBottom:8}}>
        {label} — {count === 1 ? 'choose one' : `choose ${count}`}{count > 1 ? ` (${picked.length}/${count})` : ''}
      </div>
      <div className="skill-chip-grid">
        {norm.map(o => {
          const on = picked.includes(o.name);
          const blocked = !on && count > 1 && picked.length >= count;
          return (
            <button
              type="button"
              key={o.name}
              className={`skill-chip${on ? ' on' : ''}${blocked ? ' blocked' : ''}`}
              onClick={() => !blocked && toggle(o.name)}
              disabled={blocked}
            >
              {o.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: CULTURE
// ─────────────────────────────────────────────────────────────────────────────

export { AncestryStep };
