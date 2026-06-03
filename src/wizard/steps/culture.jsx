// wizard/steps/culture.jsx — CultureStep (split out of the former wizard.jsx).
import React from 'react';
import { DS_LANGUAGES, DS_SKILL_GROUPS, DS_ANCESTRIES, DS_CULTURES, DS_CAREERS, DS_CLASSES, DS_KITS, DS_COMPLICATIONS, DS_STEPS } from '../../data.jsx';
import { OrnDivider, GlyphRow, Crest, renderGlyph, Pill, Tag, Button, IconButton, H1, H2, H3, H4Meta, Eyebrow, Deck, DropCap, StatTile, SelCard, Modal, PowerRoll, AbilityCard } from '../../theme.jsx';
import { classDef, ancestryDef, kitDef, kit2Def, careerDef, complicationDef, computeDerived, summarizeBenefits, skillsTakenExcept } from '../../app.jsx';
import { timeString, parseCareerSkills, PERKS, CHAR_MIN, CHAR_MAX, charBudget, defaultFlexValues, parseKitSig, fmtKitDmg } from '../helpers.js';
import { StepHeader } from '../StepHeader.jsx';

const { useState, useEffect, useMemo, useRef, useCallback } = React;

function CultureStep({ character, update }) {
  const cu = character.culture || {};
  const setField = (k, v) => update(c => ({ ...c, culture: { ...c.culture, [k]: v } }));
  const setAspect = (key, itemId, item) => update(c => {
    const prevSkills = c.culture.skills || {};
    const skillsCopy = { ...prevSkills };
    // Clear the picked skill for this aspect; the skill group set may have changed.
    delete skillsCopy[key];
    return { ...c, culture: { ...c.culture, [key]: itemId, skills: skillsCopy } };
  });
  const setSkill = (key, skill) => update(c => ({
    ...c, culture: { ...c.culture, skills: { ...(c.culture.skills || {}), [key]: skill } },
  }));

  const apply = (arche) => update(c => ({
    ...c, culture: {
      ...c.culture,
      environment: arche.env, organization: arche.org, upbringing: arche.upb,
      archetype: arche.name,
      skills: {}, // archetype resets skill picks — choose them next
    }
  }));

  const aspects = [
    { key: 'environment', name: 'Environment', items: DS_CULTURES.environments },
    { key: 'organization', name: 'Organization', items: DS_CULTURES.organizations },
    { key: 'upbringing', name: 'Upbringing', items: DS_CULTURES.upbringings },
  ];

  return (
    <div className="stack-22">
      <div>
        <H3>Quick Start: Archetypes</H3>
        <Deck>Pick an archetype to populate all three aspects at once, then customize.</Deck>
        <div className="grid-3" style={{marginTop:12, gap:8}}>
          {DS_CULTURES.archetypes.map(a => (
            <div key={a.name} className={`card ${cu.archetype === a.name ? 'selected' : ''}`} onClick={() => apply(a)} style={{padding:'10px 14px'}}>
              <div style={{fontFamily:'var(--display-2)', fontSize:13, letterSpacing:'0.12em', color:'var(--ink)', fontWeight:600}}>{a.name}</div>
              <div style={{fontFamily:'var(--mono)', fontSize:9, color:'var(--ink-3)', letterSpacing:'0.16em', textTransform:'uppercase', marginTop:3}}>
                {a.env} · {a.org} · {a.upb}
              </div>
            </div>
          ))}
        </div>
      </div>

      <OrnDivider glyph="❦  ✠  ❦" />

      {aspects.map(({ key, name, items }) => {
        const sel = items.find(it => it.id === cu[key]);
        const picked = (cu.skills || {})[key] || null;
        const skillPool = sel ? Array.from(new Set(sel.skills ? sel.skills : sel.skillGroups.flatMap(g => DS_SKILL_GROUPS[g] || []))) : [];
        const skillLabel = sel ? (sel.skillLabel || sel.skillGroups.join(' / ')) : '';
        // Skills held in any other slot (the other two aspects, career, class domain, ancestry, level-ups).
        const takenElsewhere = skillsTakenExcept(character, 'culture:' + key);
        const quickBlocked = sel ? takenElsewhere.has(sel.quick) : false;
        return (
          <div key={key}>
            <H3>{name}</H3>
            <div className="grid-3" style={{marginTop:10}}>
              {items.map(it => (
                <SelCard key={it.id} selected={cu[key] === it.id} onClick={() => setAspect(key, it.id, it)}>
                  <div style={{fontFamily:'var(--display)', fontSize:15, letterSpacing:'0.12em', color:'var(--ink)'}}>{it.name}</div>
                  <div style={{fontFamily:'var(--mono)', fontSize:9, color:'var(--gold-2)', letterSpacing:'0.18em', textTransform:'uppercase', marginTop:4}}>
                    SKILL: {it.skillLabel || it.skillGroups.join(' / ')} · Quick: {it.quick}
                  </div>
                  <div style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-2)', marginTop:8, lineHeight:1.5}}>
                    {it.desc}
                  </div>
                </SelCard>
              ))}
            </div>

            {sel && (
              <div className="orn-frame" style={{marginTop: 14, padding:'14px 18px'}}>
                <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 10}}>
                  <H4Meta>Choose a {sel.name} Skill</H4Meta>
                  <div style={{fontFamily:'var(--hand)', fontStyle:'italic', fontSize:13, color:'var(--ink-3)'}}>
                    From: {skillLabel}{!picked && !quickBlocked && ' \u2014 quick pick: '}
                    {!picked && !quickBlocked && <button type="button" className="quick-pick-btn" onClick={() => setSkill(key, sel.quick)}>{sel.quick}</button>}
                  </div>
                </div>
                <div className="skill-chip-grid">
                  {skillPool.map(s => {
                    const on = picked === s;
                    const blocked = !on && takenElsewhere.has(s);
                    return (
                      <button
                        type="button"
                        key={s}
                        className={`skill-chip${on ? ' on' : ''}${blocked ? ' blocked' : ''}`}
                        onClick={() => !blocked && setSkill(key, s)}
                        disabled={blocked}
                        title={blocked ? `Already chosen \u2014 ${takenElsewhere.get(s)}` : ''}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div>
        <H3>Native Language</H3>
        <Deck>All player characters know Caelian in addition to their culture's language.</Deck>
        <div className="grid-4" style={{marginTop:12}}>
          {DS_LANGUAGES.map(L => (
            <div key={L} className={`card ${cu.language === L ? 'selected' : ''}`} onClick={() => setField('language', L)} style={{padding:'10px 12px'}}>
              <div style={{fontFamily:'var(--display-2)', fontSize:12, letterSpacing:'0.14em', color:'var(--ink)', fontWeight:600}}>{L}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3: CAREER
// ─────────────────────────────────────────────────────────────────────────────

export { CultureStep };
