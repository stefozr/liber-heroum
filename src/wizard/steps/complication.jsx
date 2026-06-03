// wizard/steps/complication.jsx — ComplicationStep (split out of the former wizard.jsx).
import React from 'react';
import { DS_LANGUAGES, DS_SKILL_GROUPS, DS_ANCESTRIES, DS_CULTURES, DS_CAREERS, DS_CLASSES, DS_KITS, DS_COMPLICATIONS, DS_STEPS } from '../../data.jsx';
import { OrnDivider, GlyphRow, Crest, renderGlyph, Pill, Tag, Button, IconButton, H1, H2, H3, H4Meta, Eyebrow, Deck, DropCap, StatTile, SelCard, Modal, PowerRoll, AbilityCard } from '../../theme.jsx';
import { classDef, ancestryDef, kitDef, kit2Def, careerDef, complicationDef, computeDerived, summarizeBenefits } from '../../app.jsx';
import { timeString, parseCareerSkills, PERKS, CHAR_MIN, CHAR_MAX, charBudget, defaultFlexValues, parseKitSig, fmtKitDmg } from '../helpers.js';
import { StepHeader } from '../StepHeader.jsx';

const { useState, useEffect, useMemo, useRef, useCallback } = React;

function ComplicationStep({ character, update }) {
  const sel = character.complication.id;
  const pick = (id) => update(c => ({ ...c, complication: { id, custom: '' } }));
  const skip = () => update(c => ({ ...c, complication: { id: null, custom: '' } }));
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
        <div style={{fontFamily:'var(--hand)', fontStyle:'italic', fontSize:15, color:'var(--ink-2)'}}>
          Roll the dice and let fate decide, or browse and choose the thread you'll carry.
        </div>
        <div style={{display:'flex', gap:10}}>
          <Button kind={sel ? 'ghost' : 'primary'} small onClick={skip}>SKIP COMPLICATIONS</Button>
          <Button kind="ghost" small onClick={roll}>⚄ ROLL d100</Button>
        </div>
      </div>

      <H3>Or choose one</H3>
      <div className="grid-2">
        {DS_COMPLICATIONS.map(c => (
          <SelCard key={c.id} id={'comp-' + c.id} selected={sel === c.id} onClick={() => pick(c.id)}>
            <div style={{fontFamily:'var(--display)', fontSize:16, letterSpacing:'0.10em', color:'var(--ink)'}}>{c.name}</div>
            <div style={{marginTop: 10, display:'grid', gridTemplateColumns:'auto 1fr', gap: '4px 12px', alignItems:'start'}}>
              <Tag kind="gold">Benefit</Tag>
              <div style={{fontFamily:'var(--serif)', fontSize:13.5, color:'var(--ink-2)', lineHeight:1.5}}>{c.benefit}</div>
              <Tag kind="rubric">Drawback</Tag>
              <div style={{fontFamily:'var(--serif)', fontSize:13.5, color:'var(--ink-2)', lineHeight:1.5}}>{c.drawback}</div>
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
