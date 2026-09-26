// wizard/steps/identity.jsx — IdentityStep (split out of the former wizard.jsx).
import React from 'react';
import { DS_LANGUAGES, DS_SKILL_GROUPS, DS_ANCESTRIES, DS_CULTURES, DS_CAREERS, DS_CLASSES, DS_KITS, DS_COMPLICATIONS, DS_STEPS } from '../../data.jsx';
import { OrnDivider, GlyphRow, Crest, renderGlyph, Pill, Tag, Button, IconButton, H1, H2, H3, H4Meta, Eyebrow, Deck, DropCap, StatTile, SelCard, Modal, PowerRoll, AbilityCard } from '../../theme.jsx';
import { classDef, ancestryDef, kitDef, kit2Def, careerDef, complicationDef, computeDerived, summarizeBenefits } from '../../app.jsx';
import { timeString, parseCareerSkills, PERKS, CHAR_MIN, CHAR_MAX, charBudget, defaultFlexValues, parseKitSig, fmtKitDmg } from '../helpers.js';
import { StepHeader } from '../StepHeader.jsx';
import { DS } from '../../backend.jsx';

const { useState, useEffect, useMemo, useRef, useCallback } = React;

// Shrink a chosen image to at most MAX_EDGE px on its long edge before upload:
// a phone photo is several MB and the sheet shows it at 96px. Falls back to the
// original file when the canvas path is unavailable (jsdom) or anything fails.
const MAX_EDGE = 1024;
async function shrinkImage(file) {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 400 * 1024) { bmp.close?.(); return file; }
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bmp.width * scale));
    canvas.height = Math.max(1, Math.round(bmp.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close?.();
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise(res => canvas.toBlob(res, type, 0.88));
    return blob || file;
  } catch {
    return file;
  }
}

function IdentityStep({ character, update }) {
  const id = character.identity || {};
  const setF = (k, v) => update(c => ({ ...c, identity: { ...c.identity, [k]: v }, name: k === 'name' ? v : c.name }));
  const fileRef = React.useRef(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // The portrait is uploaded to Storage and only its URL is kept on the hero.
  // Storing the image inline (a base64 data URL) used to push the row past
  // Realtime's 1 MiB record cap and break live sync for that hero — see
  // backend.jsx subscribeCharacters.
  const readImage = async (file) => {
    if (!file || !file.type.startsWith('image/') || uploading) return;
    setUploading(true);
    setUploadError(null);
    try {
      const blob = await shrinkImage(file);
      const url = await DS.uploadPortrait(blob);
      update(c => ({ ...c, portrait: url }));
    } catch (e) {
      console.error('Portrait upload failed', e);
      setUploadError('The portrait could not be uploaded. Try again in a moment.');
    } finally {
      setUploading(false);
    }
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
                <div className="portrait-overlay">{uploading ? 'Uploading…' : 'Replace portrait'}</div>
              </>
            ) : (
              <div className="portrait-empty">
                <span className="glyph">✠</span>
                {uploading ? 'Uploading…' : <>Upload<br/>portrait</>}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{display:'none'}}
              onChange={(e) => { readImage(e.target.files && e.target.files[0]); e.target.value = ''; }}
            />
          </div>
          {character.portrait && (
            <div className="portrait-actions">
              <button className="portrait-clear" onClick={() => update(c => ({ ...c, portrait: '' }))}>Remove</button>
            </div>
          )}
          {uploadError && (
            <div role="alert" style={{fontFamily:'var(--serif)', fontStyle:'italic', fontSize:'0.8125rem', color:'var(--rubric-2)', marginTop:6}}>
              {uploadError}
            </div>
          )}
        </div>

        <div className="stack-22 id-fields" style={{justifyContent:'center'}}>
          <div className="input-row">
            <label htmlFor="hero-name">Hero Name <span style={{color:'var(--rubric-2)'}}>*</span></label>
            <input id="hero-name" className="input-text" placeholder="e.g. Aelric of Greycloister" value={id.name || ''} onChange={(e) => setF('name', e.target.value)} />
            {!(id.name || '').trim() && (
              <div style={{fontFamily:'var(--serif)', fontStyle:'italic', fontSize:'0.8125rem', color:'var(--rubric-2)', marginTop:6}}>
                A hero needs a name before the rites can continue.
              </div>
            )}
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
