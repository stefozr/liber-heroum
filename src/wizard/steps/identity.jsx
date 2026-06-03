// wizard/steps/identity.jsx — IdentityStep (split out of the former wizard.jsx).
import React from 'react';
import { DS_LANGUAGES, DS_SKILL_GROUPS, DS_ANCESTRIES, DS_CULTURES, DS_CAREERS, DS_CLASSES, DS_KITS, DS_COMPLICATIONS, DS_STEPS } from '../../data.jsx';
import { OrnDivider, GlyphRow, Crest, renderGlyph, Pill, Tag, Button, IconButton, H1, H2, H3, H4Meta, Eyebrow, Deck, DropCap, StatTile, SelCard, Modal, PowerRoll, AbilityCard } from '../../theme.jsx';
import { classDef, ancestryDef, kitDef, kit2Def, careerDef, complicationDef, computeDerived, summarizeBenefits } from '../../app.jsx';
import { timeString, parseCareerSkills, PERKS, CHAR_MIN, CHAR_MAX, charBudget, defaultFlexValues, parseKitSig, fmtKitDmg } from '../helpers.js';
import { StepHeader } from '../StepHeader.jsx';

const { useState, useEffect, useMemo, useRef, useCallback } = React;

function IdentityStep({ character, update }) {
  const id = character.identity || {};
  const setF = (k, v) => update(c => ({ ...c, identity: { ...c.identity, [k]: v }, name: k === 'name' ? v : c.name }));
  const fileRef = React.useRef(null);
  const [dragOver, setDragOver] = React.useState(false);

  const readImage = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => update(c => ({ ...c, portrait: e.target.result }));
    reader.readAsDataURL(file);
  };

  return (
    <div className="stack-22">
      <div className="portrait-uploader">
        <div>
          <div
            className={`portrait-drop${character.portrait ? ' has-image' : ''}${dragOver ? ' dragover' : ''}`}
            onClick={() => fileRef.current && fileRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files && e.dataTransfer.files[0];
              if (f) readImage(f);
            }}
          >
            {character.portrait ? (
              <>
                <img src={character.portrait} alt="Portrait" />
                <div className="portrait-overlay">Replace portrait</div>
              </>
            ) : (
              <div className="portrait-empty">
                <span className="glyph">✠</span>
                Upload<br/>portrait
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{display:'none'}}
              onChange={(e) => readImage(e.target.files && e.target.files[0])}
            />
          </div>
          {character.portrait && (
            <div className="portrait-actions">
              <button className="portrait-clear" onClick={() => update(c => ({ ...c, portrait: '' }))}>Remove</button>
            </div>
          )}
        </div>

        <div className="stack-22" style={{justifyContent:'center'}}>
          <div className="input-row">
            <label>Hero Name <span style={{color:'var(--rubric-2)'}}>*</span></label>
            <input className="input-text" placeholder="e.g. Aelric of Greycloister" value={id.name || ''} onChange={(e) => setF('name', e.target.value)} />
          </div>

          <div className="grid-3" style={{gap:18}}>
            <div className="input-row">
              <label>Age</label>
              <input className="input-text" value={id.age || ''} onChange={(e) => setF('age', e.target.value)} />
            </div>
            <div className="input-row">
              <label>Height</label>
              <input className="input-text" value={id.height || ''} onChange={(e) => setF('height', e.target.value)} />
            </div>
            <div className="input-row">
              <label>Weight</label>
              <input className="input-text" value={id.weight || ''} onChange={(e) => setF('weight', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="input-row">
        <label>Appearance</label>
        <textarea className="input-area" placeholder="A description of your hero — features, dress, bearing, scars…" value={id.appearance || ''} onChange={(e) => setF('appearance', e.target.value)} />
      </div>

      <div className="input-row">
        <label>Backstory</label>
        <textarea className="input-area" style={{minHeight: 110}} placeholder="Where did you come from? Who made you who you are? What do you fear?" value={id.backstory || ''} onChange={(e) => setF('backstory', e.target.value)} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 8: REVIEW
// ─────────────────────────────────────────────────────────────────────────────

export { IdentityStep };
