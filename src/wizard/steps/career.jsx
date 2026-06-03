// wizard/steps/career.jsx — CareerStep (split out of the former wizard.jsx).
import React from 'react';
import { DS_LANGUAGES, DS_SKILL_GROUPS, DS_ANCESTRIES, DS_CULTURES, DS_CAREERS, DS_CLASSES, DS_KITS, DS_COMPLICATIONS, DS_STEPS } from '../../data.jsx';
import { OrnDivider, GlyphRow, Crest, renderGlyph, Pill, Tag, Button, IconButton, H1, H2, H3, H4Meta, Eyebrow, Deck, DropCap, StatTile, SelCard, Modal, PowerRoll, AbilityCard } from '../../theme.jsx';
import { classDef, ancestryDef, kitDef, kit2Def, careerDef, complicationDef, computeDerived, summarizeBenefits, skillsTakenExcept } from '../../app.jsx';
import { timeString, parseCareerSkills, PERKS, CHAR_MIN, CHAR_MAX, charBudget, defaultFlexValues, parseKitSig, fmtKitDmg } from '../helpers.js';
import { StepHeader } from '../StepHeader.jsx';

const { useState, useEffect, useMemo, useRef, useCallback } = React;

function CareerStep({ character, update }) {
  const sel = character.career.id;
  const setCareer = (id) => update(c => {
    const newCar = DS_CAREERS.find(x => x.id === id);
    const parsed = newCar ? parseCareerSkills(newCar) : { auto: [], picks: [] };
    return { ...c, career: { ...c.career, id, incident: '', taken: '', skills: [...parsed.auto], languages: [], perk: '' } };
  });
  const setIncident = (v) => update(c => ({ ...c, career: { ...c.career, incident: v } }));
  const setTaken = (v) => update(c => ({ ...c, career: { ...c.career, taken: v } }));
  const setCarSkills = (arr) => update(c => ({ ...c, career: { ...c.career, skills: arr } }));
  const setCarLangs = (arr) => update(c => ({ ...c, career: { ...c.career, languages: arr } }));
  const setPerkName = (v) => update(c => ({ ...c, career: { ...c.career, perk: v } }));

  const car = careerDef(character);
  const parsed = car ? parseCareerSkills(car) : null;
  const carSkills = character.career.skills || [];
  // Skills held in any OTHER slot (culture, class domain, ancestry sigs, level-ups) — can't pick them again here.
  const takenElsewhere = skillsTakenExcept(character, 'career');
  const carLangs = character.career.languages || [];
  const cu = character.culture || {};
  const knownLangs = new Set(['Caelian', cu.language].filter(Boolean));

  const toggleSkill = (pickIdx, skillName) => {
    // Skills are stored as a flat array, but we tag them with their pickIdx to keep counts right.
    // Use shape: { skill, slot } where slot is "pickIdx" for pick choices or "auto" for auto-granted.
    // To keep storage simple, we'll just store skill names. UI computes which are auto vs pick-driven.
    const isOn = carSkills.includes(skillName);
    if (isOn) {
      setCarSkills(carSkills.filter(s => s !== skillName));
    } else {
      setCarSkills([...carSkills, skillName]);
    }
  };
  const toggleLang = (L) => {
    const on = carLangs.includes(L);
    if (on) setCarLangs(carLangs.filter(x => x !== L));
    else setCarLangs([...carLangs, L]);
  };

  return (
    <div className="stack-22">
      <H3>Choose your Career</H3>
      <div className="grid-3">
        {DS_CAREERS.map(ca => (
          <SelCard key={ca.id} selected={sel === ca.id} onClick={() => setCareer(ca.id)}>
            <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between'}}>
              <div style={{fontFamily:'var(--display)', fontSize:16, letterSpacing:'0.10em'}}>{ca.name}</div>
              <Tag>{ca.perk}</Tag>
            </div>
            <div style={{fontFamily:'var(--mono)', fontSize:9, color:'var(--ink-3)', letterSpacing:'0.16em', textTransform:'uppercase', marginTop:4}}>
              SKILLS: {ca.skills.split(';')[0]}
            </div>
            <div style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-2)', marginTop:8, lineHeight:1.5}}>
              {ca.desc}
            </div>
          </SelCard>
        ))}
      </div>

      {car && parsed && (
        <>
          <OrnDivider glyph={`❦  ${car.name.toUpperCase()}  ❦`} />

          <div className="grid-2" style={{gap: 16}}>
            <div className="orn-frame bracket-corners" style={{padding:'18px 22px'}}>
              <H3>Benefits</H3>
              <div className="stack-8" style={{marginTop: 10}}>
                <KV k="Skills" v={car.skills} />
                <KV k="Quick Build" v={car.quick} />
                {car.languages > 0 && <KV k="Languages" v={`+${car.languages}`} />}
                {car.renown > 0 && <KV k="Renown" v={`+${car.renown}`} />}
                {car.wealth > 0 && <KV k="Wealth" v={`+${car.wealth}`} />}
                {car.projectPoints && <KV k="Project Points" v={car.projectPoints} />}
                <KV k="Perk Group" v={car.perk} />
              </div>
              {car.questions && car.questions.length > 0 && (
                <div style={{marginTop: 16}}>
                  <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--gold-2)', letterSpacing:'0.22em', textTransform:'uppercase', marginBottom: 8}}>Define Your Career</div>
                  <ul style={{margin:0, paddingLeft: 18, fontFamily:'var(--serif)', fontStyle:'italic', fontSize:13, color:'var(--ink-2)', lineHeight:1.6}}>
                    {car.questions.map((q, i) => <li key={i} style={{marginBottom: 3}}>{q}</li>)}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <H3>Inciting Incident</H3>
              <Deck>What turned you from a comfortable life to the path of a hero?</Deck>
              <div className="stack-8" style={{marginTop: 12}}>
                {car.incidents.map(inc => {
                  const incName = typeof inc === 'string' ? inc : inc.name;
                  const incText = typeof inc === 'string' ? null : inc.text;
                  return (
                    <div key={incName} className={`card ${character.career.incident === incName ? 'selected' : ''}`} onClick={() => setIncident(incName)} style={{padding:'10px 14px'}}>
                      <div style={{fontFamily:'var(--display-2)', fontSize:12, letterSpacing:'0.14em', color:'var(--ink)', fontWeight:600, textTransform:'uppercase'}}>{incName}</div>
                      {incText && <div style={{fontFamily:'var(--serif)', fontSize:12.5, color:'var(--ink-2)', lineHeight:1.5, marginTop:5}}>{incText}</div>}
                    </div>
                  );
                })}
                <Button kind="ghost" small onClick={() => {
                  const pick = car.incidents[Math.floor(Math.random() * car.incidents.length)];
                  setIncident(typeof pick === 'string' ? pick : pick.name);
                }}>
                  ⚄ Roll 1d6
                </Button>
              </div>
            </div>
          </div>

          {/* Skills picker */}
          <div className="orn-frame" style={{padding:'18px 22px'}}>
            <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between'}}>
              <H3>Career Skills</H3>
              <button type="button" className="quick-pick-btn" onClick={() => {
                // Quick build: apply autos + the career's `quick` field as a comma/dot-separated guess
                const quickList = (car.quick || '').split(/[·\u00b7,;]/).map(s => s.trim()).filter(Boolean);
                // Skip any skill already held in another slot — quick build mustn't create duplicates.
                const next = [...new Set([...parsed.auto, ...quickList])].filter(s => !takenElsewhere.has(s));
                setCarSkills(next);
              }}>Use Quick Build</button>
            </div>
            <Deck>Granted: <b style={{color:'var(--gold-2)'}}>{parsed.auto.join(', ') || 'none'}</b>. Pick your remaining skill choices below.</Deck>
            <div className="stack-12" style={{marginTop: 14}}>
              {parsed.picks.map((p, idx) => {
                const pool = p.options ? p.options : Array.from(new Set(p.groups.flatMap(g => DS_SKILL_GROUPS[g] || [])));
                const pickedCount = carSkills.filter(s => pool.includes(s) && !parsed.auto.includes(s)).length;
                return (
                  <div key={idx}>
                    <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-3)', letterSpacing:'0.22em', textTransform:'uppercase', marginBottom:6}}>
                      {p.label} — picked <b style={{color: pickedCount === p.count ? 'var(--gold-2)' : 'var(--ink)'}}>{pickedCount}</b> / {p.count}
                    </div>
                    <div className="skill-chip-grid">
                      {pool.map(s => {
                        const on = carSkills.includes(s);
                        const isAuto = parsed.auto.includes(s);
                        const elsewhere = !on && !isAuto && takenElsewhere.has(s);
                        // Block selecting more than count for this pick, or a skill held in another slot.
                        const blocked = elsewhere || (!on && !isAuto && pickedCount >= p.count);
                        return (
                          <button
                            type="button"
                            key={s}
                            className={`skill-chip${on ? ' on' : ''}${isAuto ? ' auto' : ''}${blocked ? ' blocked' : ''}`}
                            onClick={() => !isAuto && !blocked && toggleSkill(idx, s)}
                            disabled={isAuto || blocked}
                            title={isAuto ? 'Granted by career' : elsewhere ? `Already chosen — ${takenElsewhere.get(s)}` : blocked ? `Already picked ${p.count}` : ''}
                          >
                            {s}{isAuto ? ' \u2713' : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {parsed.picks.length === 0 && (
                <div style={{fontFamily:'var(--hand)', fontStyle:'italic', color:'var(--ink-3)', fontSize:13}}>No skill choices to make.</div>
              )}
            </div>
          </div>

          {/* Languages picker */}
          {car.languages > 0 && (
            <div className="orn-frame" style={{padding:'18px 22px'}}>
              <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between'}}>
                <H3>Additional Languages</H3>
                <span style={{fontFamily:'var(--mono)', fontSize:10, color: carLangs.length === car.languages ? 'var(--gold-2)' : 'var(--ink-3)', letterSpacing:'0.22em', textTransform:'uppercase'}}>
                  {carLangs.length} / {car.languages}
                </span>
              </div>
              <Deck>You already know Caelian{cu.language ? ` and ${cu.language}` : ''}. Choose {car.languages} more.</Deck>
              <div className="skill-chip-grid" style={{marginTop: 12}}>
                {DS_LANGUAGES.filter(L => !knownLangs.has(L)).map(L => {
                  const on = carLangs.includes(L);
                  const blocked = !on && carLangs.length >= car.languages;
                  return (
                    <button
                      type="button"
                      key={L}
                      className={`skill-chip${on ? ' on' : ''}${blocked ? ' blocked' : ''}`}
                      onClick={() => !blocked && toggleLang(L)}
                      disabled={blocked}
                    >
                      {L}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Perk picker */}
          <div className="orn-frame" style={{padding:'18px 22px'}}>
            <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:10, flexWrap:'wrap'}}>
              <H3>{car.perk} Perk</H3>
              {car.quickPerk && <Pill kind="gold">QUICK BUILD · {car.quickPerk.toUpperCase()}</Pill>}
            </div>
            <Deck>Choose a perk from the <b style={{color:'var(--gold-2)'}}>{car.perk}</b> group.</Deck>
            <div className="stack-8" style={{marginTop: 12}}>
              {(PERKS[car.perk] || []).map(p => {
                const isQuick = car.quickPerk === p.name;
                return (
                <div
                  key={p.name}
                  className={`card ${character.career.perk === p.name ? 'selected' : ''}`}
                  onClick={() => setPerkName(p.name)}
                  style={{padding: '12px 16px'}}
                >
                  <div style={{display:'flex', alignItems:'baseline', gap:8}}>
                    <div style={{fontFamily:'var(--display-2)', fontSize:13, fontWeight:700, letterSpacing:'0.14em', color:'var(--ink)', textTransform:'uppercase'}}>{p.name}</div>
                    {isQuick && <Tag kind="gold">Suggested</Tag>}
                  </div>
                  <div style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-2)', lineHeight:1.55, marginTop:6}}>{p.text}</div>
                </div>
                );
              })}
            </div>
          </div>

          <div className="input-row">
            <label>What Was Taken From You?</label>
            <textarea
              className="input-area"
              placeholder="An heirloom sword. A locket of royalty. Your mother. A future you'll never have. Your name. Hope itself…"
              value={character.career.taken}
              onChange={(e) => setTaken(e.target.value)}
            />
          </div>
        </>
      )}
    </div>
  );
}

// Parse a career's `skills` description into auto-granted skills + remaining picks.
// Examples handled:
//   "Sneak; one interpersonal + one intrigue"
//   "Two crafting"
//   "Music or Perform; two more interpersonal"
//   "Endurance; two crafting/exploration"
//   "Religion; two more lore"

function KV({ k, v }) {
  return (
    <div style={{display:'grid', gridTemplateColumns:'120px 1fr', gap: 12, padding:'4px 0', borderBottom: '1px dashed var(--line)'}}>
      <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-3)', letterSpacing:'0.18em', textTransform:'uppercase'}}>{k}</div>
      <div style={{fontFamily:'var(--serif)', fontSize:13.5, color:'var(--ink)'}}>{v}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4: CLASS  (the big one)
// ─────────────────────────────────────────────────────────────────────────────

export { CareerStep };
