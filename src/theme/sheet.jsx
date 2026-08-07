// theme/sheet.jsx — character-sheet fragments shared by PlayView and the wizard's
// Review step: ancestry signatures + purchased traits, and the full kit write-up.
// Their CSS lives here (SHEET_CSS) rather than in PLAY_CSS so the wizard, which
// never mounts PlayStyles, can render them styled.
import React from 'react';
import { MQ } from './breakpoints.js';
import { DS_ANCESTRIES } from '../data.jsx';
import { parseKitSig, fmtKitDmg, formerLifeDef, resolvedAncestryTraits, ancestrySignatures } from '../wizard/helpers.js';

const SHEET_CSS = `
.trait-block { padding: 10px 0; border-bottom: 1px dashed var(--line); }
.trait-block:last-child { border-bottom: none; padding-bottom: 0; }
.trait-block:first-child { padding-top: 0; }
.trait-name {
  font-family: var(--display-2); font-size: var(--fs-6); font-weight: 700; letter-spacing: 0.14em;
  color: var(--ink); display: flex; align-items: center; gap: 8px; text-transform: uppercase;
}
.sig-tag, .cost-tag {
  font-family: var(--mono); font-size: var(--fs-2); padding: 2px 6px;
  border: 1px solid var(--gold); color: var(--gold-2); letter-spacing: 0.18em;
  text-transform: uppercase; font-weight: 500;
}
.cost-tag { border-color: var(--line-2); color: var(--ink-3); }
.trait-text { font-family: var(--serif); font-size: var(--fs-7); color: var(--ink-2); line-height: 1.55; margin-top: 6px; }
.sig-option-row { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
.sig-option-label { font-family: var(--mono); font-size: var(--fs-3); color: var(--ink-3); letter-spacing: 0.18em; text-transform: uppercase; }
.sig-option-select {
  font-family: var(--display-2); font-size: var(--fs-6); font-weight: 700; letter-spacing: 0.08em;
  color: var(--gold-2); background: var(--panel, transparent); border: 1px solid var(--gold);
  padding: 5px 10px; cursor: pointer; text-transform: uppercase;
}
.sig-option-select:focus { outline: none; border-color: var(--gold-2); }
.kit-meta-line { font-family: var(--mono); font-size: var(--fs-3); color: var(--gold-2); letter-spacing: 0.16em; text-transform: uppercase; margin-top: 5px; }
.kv-row { display: grid; grid-template-columns: 120px 1fr 120px 1fr; gap: 4px 12px; align-items: baseline; font-family: var(--mono); font-size: var(--fs-4); }
/* Two-column variant used for kit source rows. */
.kv-row.kv-src { grid-template-columns: 110px 1fr; }
.kv-row .k { color: var(--ink-3); letter-spacing: 0.18em; font-size: var(--fs-3); text-transform: uppercase; }
.kv-row .v { color: var(--ink); }

${MQ.rail} {
  /* At 1024 the play sheet's right column is only ~390px. */
  .kv-row { grid-template-columns: 90px 1fr; }
}

${MQ.phone} {
  .kv-row, .kv-row.kv-src { grid-template-columns: 1fr; gap: 2px 0; }
  .kv-row .k { margin-top: 6px; }
}
`;

function SheetStyles() {
  return <style>{SHEET_CSS}</style>;
}

// Ancestry signature traits + purchased traits, in full (text, costs, choices).
// `interactive` keeps the option <select> live (Play); off, choices render as
// static text (Review — the picks were made in earlier wizard steps).
function AncestryTraitsList({ character, update, interactive = false }) {
  const anc = DS_ANCESTRIES.find(a => a.id === character?.ancestry?.id);
  if (!anc) return null;
  return (
    <>
      {ancestrySignatures(anc).map(sig => (
        <div className="trait-block" key={sig.name}>
          <div className="trait-name">{sig.name} <span className="sig-tag">SIG</span></div>
          <div className="trait-text">{sig.text}</div>
          {sig.name === 'Former Life' && formerLifeDef(character) && (
            <div className="trait-text" style={{ marginTop: 6 }}>
              Former Life: <b>{formerLifeDef(character).name}</b> — Size {formerLifeDef(character).size}
            </div>
          )}
          {sig.optionChoice && (() => {
            const norm = sig.optionChoice.options.map(o => typeof o === 'string' ? { name: o, text: null } : o);
            const picked = (character.ancestry.sigOptions || {})[sig.name] || [];
            const active = norm.find(o => o.name === picked[0]);
            const setOpt = (o) => update && update(c => ({ ...c, ancestry: { ...c.ancestry, sigOptions: { ...(c.ancestry.sigOptions || {}), [sig.name]: [o] } } }));
            return (
              <>
                <div className="sig-option-row">
                  <span className="sig-option-label">{sig.optionChoice.label}</span>
                  {interactive ? (
                    <select className="sig-option-select" value={picked[0] || ''} onChange={(e) => setOpt(e.target.value)}>
                      <option value="" disabled>Choose…</option>
                      {norm.map(o => <option key={o.name} value={o.name}>{o.name}</option>)}
                    </select>
                  ) : (
                    <span className="sig-option-select" style={{ cursor: 'default' }}>{picked[0] || '—'}</span>
                  )}
                </div>
                {active && active.text && <div className="trait-text" style={{marginTop:6}}>{active.text}</div>}
              </>
            );
          })()}
        </div>
      ))}
      {resolvedAncestryTraits(character).map((t, i) => (
        <div className="trait-block" key={`${t.name}-${i}`}>
          <div className="trait-name">
            {t.name} <span className="cost-tag">{t.cost} PT</span>
            {t.borrowedFrom && <span className="sig-tag">PREVIOUS LIFE — {t.borrowedFrom.toUpperCase()}</span>}
          </div>
          <div className="trait-text">{t.text}</div>
          {t.chosen?.length > 0 && (
            <div className="trait-text" style={{ marginTop: 6 }}>
              {t.choiceLabel}: <b>{t.chosen.join(', ')}</b>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

// One kit, in full: description, stat bonuses, and the signature ability's
// parsed power-roll card. `divider` separates a second kit from the first.
function KitDetails({ kit, divider = false }) {
  const kt = kit;
  const b = kt.bonuses || {};
  const sig = parseKitSig(kt.sig);
  const meleeDmg = fmtKitDmg(b.melee);
  const rangedDmg = fmtKitDmg(b.ranged);
  return (
    <React.Fragment>
      <div className="trait-block" style={divider ? {marginTop:18, paddingTop:18, borderTop:'1px dashed var(--line)'} : undefined}>
        <div className="trait-name">{kt.name}</div>
        <div className="kit-meta-line">{kt.weapon} Weapon · {kt.armor} Armor</div>
        <div className="trait-text">{kt.desc}</div>
      </div>
      <div className="trait-block">
        <div className="kv-row">
          <span className="k">Armor</span><span className="v">{kt.armor}</span>
          <span className="k">Weapon</span><span className="v">{kt.weapon}</span>
          {meleeDmg && <><span className="k">Melee Damage</span><span className="v">{meleeDmg}</span></>}
          {rangedDmg && <><span className="k">Ranged Damage</span><span className="v">{rangedDmg}</span></>}
          {b.mDist && <><span className="k">Melee Reach</span><span className="v">+{b.mDist}</span></>}
          {b.rngDist && <><span className="k">Ranged Distance</span><span className="v">{b.rngDist}</span></>}
          {b.sta_per ? <><span className="k">Stamina / Echelon</span><span className="v">+{b.sta_per}</span></> : null}
          {b.spd ? <><span className="k">Speed</span><span className="v">+{b.spd}</span></> : null}
          {b.stab ? <><span className="k">Stability</span><span className="v">+{b.stab}</span></> : null}
          {b.disengage ? <><span className="k">Disengage</span><span className="v">+{b.disengage}</span></> : null}
        </div>
      </div>
      <div className="kit-card" style={{marginTop: 4}}>
        <div className="kit-sig">
          <div className="kit-sig-head">
            <span className="kit-sig-name">{sig.name}</span>
            <span className="ac-tags">
              <span className="ac-action act-main">Main Action</span>
              <span className="kit-sig-badge">⚔ Signature</span>
            </span>
          </div>
          {sig.distance && <div className="kit-sig-kw">{sig.distance}</div>}
          {sig.rows && (
            <div className="kit-roll">
              {sig.rows.map(([t, e], ri) => (
                <React.Fragment key={ri}>
                  <span className={`t tier-${ri + 1}`}>{t}</span>
                  <span className={`e tier-${ri + 1}`}>{e}</span>
                </React.Fragment>
              ))}
            </div>
          )}
          {sig.effect && <div className="kit-sig-effect"><b>Effect.</b> {sig.effect}</div>}
        </div>
      </div>
    </React.Fragment>
  );
}

export { SHEET_CSS, SheetStyles, AncestryTraitsList, KitDetails };
