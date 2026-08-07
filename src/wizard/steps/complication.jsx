// wizard/steps/complication.jsx — ComplicationStep (split out of the former wizard.jsx).
import React from 'react';
import { DS_LANGUAGES, DS_SKILL_GROUPS, DS_ANCESTRIES, DS_CULTURES, DS_CAREERS, DS_CLASSES, DS_KITS, DS_COMPLICATIONS, DS_STEPS } from '../../data.jsx';
import { OrnDivider, GlyphRow, Crest, renderGlyph, Pill, Tag, Button, IconButton, H1, H2, H3, H4Meta, Eyebrow, Deck, DropCap, StatTile, SelCard, Modal, PowerRoll, AbilityCard } from '../../theme.jsx';
import { classDef, ancestryDef, kitDef, kit2Def, careerDef, complicationDef, computeDerived, summarizeBenefits, skillsTakenExcept, languagesTakenExcept } from '../../app.jsx';
import { timeString, parseCareerSkills, complicationGrantCollisions, PERKS, CHAR_MIN, CHAR_MAX, charBudget, defaultFlexValues, parseKitSig, fmtKitDmg } from '../helpers.js';
import { StepHeader } from '../StepHeader.jsx';
import { SkillSwapBlock } from './skill-swap.jsx';

const { useState, useEffect, useMemo, useRef, useCallback } = React;

function ComplicationStep({ character, update }) {
  const sel = character.complication.id;
  const pick = (id) => update(c => ({ ...c, complication: { id, custom: '', skills: {}, skillSwaps: {}, languages: [] } }));
  const skip = () => update(c => ({ ...c, complication: { id: null, custom: '', skills: {}, skillSwaps: {}, languages: [] } }));
  const comp = complicationDef(character);
  const compSkills = character.complication.skills || {};
  const compLangs = character.complication.languages || [];
  const toggleChoiceSkill = (i, count, s) => update(c => {
    const cur = { ...(c.complication.skills || {}) };
    const arr = cur[i] || [];
    cur[i] = arr.includes(s) ? arr.filter(x => x !== s) : (arr.length >= count ? arr : [...arr, s]);
    return { ...c, complication: { ...c.complication, skills: cur } };
  });
  const toggleLang = (count, L) => update(c => {
    const cur = c.complication.languages || [];
    const next = cur.includes(L) ? cur.filter(x => x !== L) : (cur.length >= count ? cur : [...cur, L]);
    return { ...c, complication: { ...c.complication, languages: next } };
  });
  // Fixed grants duplicated by an earlier slot — official rules allow a same-group swap.
  const collisions = comp ? complicationGrantCollisions(character) : [];
  const swaps = character.complication.skillSwaps || {};
  const setSwap = (skill, name) => update(c => {
    const next = { ...(c.complication.skillSwaps || {}) };
    if (name) next[skill] = name; else delete next[skill];
    return { ...c, complication: { ...c.complication, skillSwaps: next } };
  });
  const hasGrants = comp && ((comp.skills || []).length || (comp.skillChoices || []).length || comp.languageChoice || (comp.abilities || []).length);
  // Scroll the wizard body so a freshly-rolled complication card is brought into view.
  const scrollToComp = (id) => {
    requestAnimationFrame(() => {
      const el = document.getElementById('comp-' + id);
      if (!el) return;
      const scroller = el.closest('.wiz-step');
      if (!scroller) return;
      const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      scroller.scrollTo({ top: top - 80, behavior: 'smooth' });
    });
  };
  const roll = () => {
    const r = Math.floor(Math.random() * 100) + 1;
    const c = DS_COMPLICATIONS.find(x => x.d100 === r) || DS_COMPLICATIONS[r % DS_COMPLICATIONS.length];
    pick(c.id);
    scrollToComp(c.id);
  };

  return (
    <div className="stack-22">
      <div className="orn-frame bracket-corners" style={{padding:'18px 22px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap'}}>
        <div style={{fontFamily:'var(--hand)', fontStyle:'italic', fontSize: '0.9375rem', color:'var(--ink-2)'}}>
          Roll the dice and let fate decide, or browse and choose the thread you'll carry.
        </div>
        <div style={{display:'flex', gap:10}}>
          <Button kind="ghost" small onClick={skip}>SKIP COMPLICATIONS</Button>
          <Button kind="ghost" small onClick={roll}>⚄ ROLL d100</Button>
        </div>
      </div>

      {hasGrants && (
        <div className="orn-frame" style={{padding:'18px 22px'}}>
          <H3>Granted by <span style={{color:'var(--gold-2)'}}>{comp.name}</span></H3>

          {(comp.skills || []).length > 0 && (
            <div style={{marginTop:12, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap'}}>
              <Tag kind="gold">Skills</Tag>
              {(comp.skills || []).map(s => (
                <span key={s} className="skill-chip on" style={{cursor:'default'}}>
                  {swaps[s] && collisions.some(x => x.skill === s) ? `${s} → ${swaps[s]}` : s}
                </span>
              ))}
            </div>
          )}
          <SkillSwapBlock
            collisions={collisions}
            swaps={swaps}
            taken={skillsTakenExcept(character, 'comp:fixed')}
            ownNames={[...(comp.skills || []), ...Object.values(compSkills).flat()]}
            onSwap={setSwap}
          />

          {(comp.skillChoices || []).map((ch, i) => {
            const pool = ch.options || Array.from(new Set((ch.groups || []).flatMap(g => DS_SKILL_GROUPS[g] || [])));
            const picked = compSkills[i] || [];
            const label = ch.options ? 'listed' : (ch.groups || []).join(' / ');
            const takenElsewhere = skillsTakenExcept(character, 'comp:' + i);
            return (
              <div key={i} style={{marginTop:16}}>
                <div style={{fontFamily:'var(--mono)', fontSize: '0.625rem', color:'var(--ink-3)', letterSpacing:'0.22em', textTransform:'uppercase', marginBottom:8}}>
                  Choose {ch.count} {label} skill{ch.count > 1 ? 's' : ''} — picked <b style={{color: picked.length === ch.count ? 'var(--gold-2)' : 'var(--ink)'}}>{picked.length}</b> / {ch.count}
                </div>
                <div className="skill-chip-grid">
                  {pool.map(s => {
                    const on = picked.includes(s);
                    const elsewhere = !on && takenElsewhere.has(s);
                    const blocked = elsewhere || (!on && picked.length >= ch.count);
                    return (
                      <button
                        type="button"
                        key={s}
                        className={`skill-chip${on ? ' on' : ''}${blocked ? ' blocked' : ''}`}
                        onClick={() => !blocked && toggleChoiceSkill(i, ch.count, s)}
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
          })}

          {comp.languageChoice && (() => {
            const { count, options } = comp.languageChoice;
            const pool = options || DS_LANGUAGES;
            const langsElsewhere = languagesTakenExcept(character, 'complication');
            return (
              <div style={{marginTop:16}}>
                <div style={{fontFamily:'var(--mono)', fontSize: '0.625rem', color:'var(--ink-3)', letterSpacing:'0.22em', textTransform:'uppercase', marginBottom:8}}>
                  Choose {count} {options ? 'dead ' : ''}language{count > 1 ? 's' : ''} — picked <b style={{color: compLangs.length === count ? 'var(--gold-2)' : 'var(--ink)'}}>{compLangs.length}</b> / {count}
                </div>
                <div className="skill-chip-grid">
                  {pool.map(L => {
                    const on = compLangs.includes(L);
                    const blocked = !on && (langsElsewhere.has(L) || compLangs.length >= count);
                    return (
                      <button
                        type="button"
                        key={L}
                        className={`skill-chip${on ? ' on' : ''}${blocked ? ' blocked' : ''}`}
                        onClick={() => !blocked && toggleLang(count, L)}
                        disabled={blocked}
                        title={!on && langsElsewhere.has(L) ? `Already known — ${langsElsewhere.get(L)}` : ''}
                      >
                        {L}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {(comp.abilities || []).length > 0 && (
            <div style={{marginTop:16, display:'grid', gap:14}}>
              {(comp.abilities || []).map(a => <AbilityCard key={a.name} ability={a} kind="sig" />)}
            </div>
          )}
        </div>
      )}

      <H3>Or choose one</H3>
      <div className="grid-2">
        {DS_COMPLICATIONS.map(c => (
          <SelCard key={c.id} id={'comp-' + c.id} selected={sel === c.id} onClick={() => pick(c.id)}>
            <div style={{fontFamily:'var(--display)', fontSize: '1rem', letterSpacing:'0.10em', color:'var(--ink)', paddingRight:16}}>{c.name}</div>
            <div style={{marginTop: 10, display:'grid', gridTemplateColumns:'auto 1fr', gap: '4px 12px', alignItems:'start'}}>
              <Tag kind="gold">Benefit</Tag>
              <div style={{fontFamily:'var(--serif)', fontSize: 'var(--fs-7)', color:'var(--ink-2)', lineHeight:1.5}}>{c.benefit}</div>
              <Tag kind="rubric">Drawback</Tag>
              <div style={{fontFamily:'var(--serif)', fontSize: 'var(--fs-7)', color:'var(--ink-2)', lineHeight:1.5}}>{c.drawback}</div>
            </div>
          </SelCard>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 7: IDENTITY
// ─────────────────────────────────────────────────────────────────────────────

export { ComplicationStep };
