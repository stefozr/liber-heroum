// wizard/steps/review.jsx — ReviewStep (split out of the former wizard.jsx).
import React from 'react';
import { DS_LANGUAGES, DS_SKILL_GROUPS, DS_ANCESTRIES, DS_CULTURES, DS_CAREERS, DS_CLASSES, DS_KITS, DS_COMPLICATIONS, DS_STEPS } from '../../data.jsx';
import { OrnDivider, GlyphRow, Crest, renderGlyph, Pill, Tag, Button, IconButton, H1, H2, H3, H4Meta, Eyebrow, Deck, DropCap, StatTile, SelCard, Modal, PowerRoll, AbilityCard } from '../../theme.jsx';
import { classDef, ancestryDef, kitDef, kit2Def, careerDef, complicationDef, computeDerived, summarizeBenefits } from '../../app.jsx';
import { timeString, parseCareerSkills, PERKS, CHAR_MIN, CHAR_MAX, charBudget, defaultFlexValues, parseKitSig, fmtKitDmg } from '../helpers.js';
import { StepHeader } from '../StepHeader.jsx';

const { useState, useEffect, useMemo, useRef, useCallback } = React;

function ReviewStep({ character, update }) {
  const cls = classDef(character);
  const anc = ancestryDef(character);
  const kit = kitDef(character);
  const kit2 = kit2Def(character);
  const car = careerDef(character);
  const comp = complicationDef(character);
  const derived = computeDerived(character);
  const cu = character.culture;
  const benefits = summarizeBenefits(character);

  // Readable label for the chosen subclass / domains / order, used under the hero's name and on the Class card.
  const subLabel = (() => {
    if (!cls) return null;
    if (cls.subclasses && character.cclass.subclass) {
      const s = cls.subclasses.find(x => (x.id || x.name) === character.cclass.subclass);
      return s ? s.name : character.cclass.subclass;
    }
    if (cls.pickTwoDomains && (character.cclass.domains || []).length) return (character.cclass.domains).join(' & ');
    if (cls.pickOneDomain && (character.cclass.domains || []).length) return (character.cclass.domains)[0];
    return null;
  })();
  const fmtChar = (v) => v == null ? '—' : (v > 0 ? '+' + v : v);
  const chars = character.cclass.characteristics || {};
  const featureChoices = ['prayer','ward','enchantment','triggeredAction']
    .map(k => character.cclass[k]).filter(Boolean);

  return (
    <div className="stack-22">
      <div className="orn-frame bracket-corners" style={{padding: '22px 28px', textAlign:'center'}}>
        <GlyphRow>✠ · ❦ · ✦ · ❦ · ✠</GlyphRow>
        <div style={{height: 10}}></div>
        {character.portrait ? (
          <div className="review-portrait">
            <img src={character.portrait} alt="Portrait" />
          </div>
        ) : (
          <div className="review-portrait">
            <div className="review-portrait-empty">✠</div>
          </div>
        )}
        <H1>{character.identity.name || 'Unnamed Hero'}</H1>
        <div style={{fontFamily:'var(--hand)', fontStyle:'italic', color:'var(--gold-2)', fontSize: 17, marginTop: 6, letterSpacing:'0.04em'}}>
          {[anc && anc.name, cls && cls.name, car && car.name].filter(Boolean).join(' · ')}
        </div>
        {subLabel && (
          <div style={{fontFamily:'var(--mono)', fontSize:10.5, color:'var(--ink-3)', letterSpacing:'0.22em', textTransform:'uppercase', marginTop: 6}}>
            {(cls.subclassName || 'Subclass')}: <span style={{color:'var(--ink-2)'}}>{subLabel}</span>
          </div>
        )}
        <div style={{marginTop: 14}}><OrnDivider glyph="✠" size="small" /></div>
        <div className="grid-3" style={{gap: 10, marginTop: 16, maxWidth: 700, margin: '16px auto 0'}}>
          <StatTile label="Stamina" value={derived.staminaMax || '—'} gold />
          <StatTile label="Recoveries" value={derived.recoveries || '—'} />
          <StatTile label="Speed" value={derived.speed || '—'} />
        </div>
      </div>

      <div className="grid-2" style={{gap: 16}}>
        <ReviewBlock title="Ancestry" body={anc ? (
          <>
            <div style={{fontFamily:'var(--display)', fontSize:16, color:'var(--ink)', letterSpacing:'0.10em'}}>{anc.name}</div>
            <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--gold-2)', letterSpacing:'0.18em', marginTop:6}}>SIG: {(anc.signatures || [anc.signature]).map(s => s.name).join(' · ').toUpperCase()}</div>
            {Object.values(character.ancestry.sigSkills || {}).flat().filter(Boolean).length > 0 && (
              <div style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-2)', marginTop:8}}>
                Signature skill: <b style={{color:'var(--gold-2)'}}>{Object.values(character.ancestry.sigSkills || {}).flat().filter(Boolean).join(', ')}</b>
              </div>
            )}
            {Object.values(character.ancestry.sigOptions || {}).flat().filter(Boolean).length > 0 && (
              <div style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-2)', marginTop:8}}>
                {(anc.signatures || [anc.signature]).find(s => s.optionChoice)?.optionChoice.label || 'Choice'}: <b style={{color:'var(--gold-2)'}}>{Object.values(character.ancestry.sigOptions || {}).flat().filter(Boolean).join(', ')}</b>
              </div>
            )}
            {anc.id === 'revenant' && character.ancestry.formerLife && (
              <div style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-2)', marginTop:8}}>
                Former Life: <b style={{color:'var(--gold-2)'}}>{(DS_ANCESTRIES.find(a => a.id === character.ancestry.formerLife) || {}).name}</b>
                {Object.entries(character.ancestry.prevLifeTraits || {}).filter(([, v]) => v).map(([, v]) => (
                  <span key={v}> · borrowed {v}</span>
                ))}
              </div>
            )}
            {character.ancestry.traits?.length > 0 && (
              <div style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-2)', marginTop:8}}>
                Traits: {character.ancestry.traits.join(', ')}
              </div>
            )}
          </>
        ) : '—'} />

        <ReviewBlock title="Culture" body={cu.environment ? (
          <>
            <div style={{fontFamily:'var(--display-2)', fontSize:13, letterSpacing:'0.14em', color:'var(--ink)', fontWeight:600}}>{cu.archetype || 'Custom'}</div>
            <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-3)', letterSpacing:'0.16em', marginTop: 6, textTransform:'uppercase'}}>
              {[cu.environment, cu.organization, cu.upbringing].filter(Boolean).join(' · ')}
            </div>
            {cu.skills && Object.values(cu.skills).filter(Boolean).length > 0 && (
              <div style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-2)', marginTop:8}}>
                Skills: {Object.values(cu.skills).filter(Boolean).join(', ')}
              </div>
            )}
            <div style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-2)', marginTop:6}}>
              Languages: Caelian + {cu.language}
            </div>
          </>
        ) : '—'} />

        <ReviewBlock title="Career" body={car ? (
          <>
            <div style={{fontFamily:'var(--display-2)', fontSize:13, letterSpacing:'0.14em', color:'var(--ink)', fontWeight:600}}>{car.name}</div>
            {character.career.incident && (
              <div style={{fontFamily:'var(--hand)', fontStyle:'italic', color:'var(--gold-2)', fontSize:13, marginTop:6}}>{character.career.incident}</div>
            )}
            {character.career.perk && (
              <div style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-2)', marginTop:6}}>Perk: {character.career.perk}</div>
            )}
            {character.career.taken && (
              <div style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-2)', marginTop:6, lineHeight:1.5}}>What was taken: {character.career.taken}</div>
            )}
          </>
        ) : '—'} />

        <ReviewBlock title="Class" body={cls ? (
          <>
            <div style={{fontFamily:'var(--display-2)', fontSize:13, letterSpacing:'0.14em', color:'var(--ink)', fontWeight:600}}>{cls.name}</div>
            <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--gold-2)', letterSpacing:'0.18em', marginTop: 6, textTransform:'uppercase'}}>
              Resource · {cls.resource}
            </div>
            {subLabel && (
              <div style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-2)', marginTop:6}}>
                {(cls.subclassName || (cls.pickTwoDomains || cls.pickOneDomain ? 'Domains' : 'Subclass'))}: {subLabel}
              </div>
            )}
            {character.cclass.domainFeature?.name && (
              <div style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-2)', marginTop:4}}>
                Domain feature: {character.cclass.domainFeature.name}{character.cclass.domainSkill ? ` (${character.cclass.domainSkill})` : ''}
              </div>
            )}
            {featureChoices.length > 0 && (
              <div style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-2)', marginTop:4}}>
                Features: {featureChoices.join(', ')}
              </div>
            )}
            {cls.flexCharOrder && Object.keys(chars).length > 0 && (
              <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-3)', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:8, display:'flex', gap:10, flexWrap:'wrap'}}>
                {['Might','Agility','Reason','Intuition','Presence'].map(k => (
                  <span key={k}>{k.slice(0,3)} <b style={{color: chars[k] > 0 ? 'var(--gold-2)' : 'var(--ink-2)'}}>{fmtChar(chars[k])}</b></span>
                ))}
              </div>
            )}
          </>
        ) : '—'} />

        <ReviewBlock title="Kit" body={kit ? (
          <>
            <div style={{fontFamily:'var(--display-2)', fontSize:13, letterSpacing:'0.14em', color:'var(--ink)', fontWeight:600}}>{kit.name}</div>
            <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-3)', letterSpacing:'0.16em', marginTop:6, textTransform:'uppercase'}}>{kit.armor} · {kit.weapon}</div>
            <div style={{fontFamily:'var(--hand)', fontStyle:'italic', fontSize:13, color:'var(--gold-2)', marginTop:5}}>{parseKitSig(kit.sig).name}</div>
            {kit2 && (
              <>
                <div style={{fontFamily:'var(--display-2)', fontSize:13, letterSpacing:'0.14em', color:'var(--ink)', fontWeight:600, marginTop:8}}>{kit2.name}</div>
                <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-3)', letterSpacing:'0.16em', marginTop:6, textTransform:'uppercase'}}>{kit2.armor} · {kit2.weapon}</div>
                <div style={{fontFamily:'var(--hand)', fontStyle:'italic', fontSize:13, color:'var(--gold-2)', marginTop:5}}>{parseKitSig(kit2.sig).name}</div>
              </>
            )}
          </>
        ) : '—'} />

        <ReviewBlock title="Complication" body={comp ? (
          <>
            <div style={{fontFamily:'var(--display-2)', fontSize:13, letterSpacing:'0.14em', color:'var(--ink)', fontWeight:600}}>{comp.name}</div>
            <div style={{fontFamily:'var(--serif)', fontSize:12.5, color:'var(--ink-2)', marginTop:6, lineHeight:1.45}}>+ {comp.benefit}</div>
            <div style={{fontFamily:'var(--serif)', fontSize:12.5, color:'var(--ink-2)', marginTop:6, lineHeight:1.45}}>− {comp.drawback}</div>
          </>
        ) : 'None — a simpler life.'} />
      </div>

      {/* Skills, Languages & Perk */}
      {(benefits.skills.length > 0 || benefits.languages.length > 0 || benefits.perk) && (
        <div className="orn-frame" style={{padding:'16px 22px'}}>
          <H4Meta>Skills, Languages & Perk</H4Meta>
          <div className="grid-2" style={{gap: 18, marginTop: 8}}>
            <div>
              <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--gold-2)', letterSpacing:'0.22em', textTransform:'uppercase', marginBottom: 6}}>Skills</div>
              {benefits.skills.length === 0 && <div style={{fontFamily:'var(--hand)', fontStyle:'italic', color:'var(--ink-3)', fontSize:13}}>None granted.</div>}
              {benefits.skills.map((s, i) => (
                <div key={i} style={{marginBottom: 7}}>
                  <div style={{fontFamily:'var(--mono)', fontSize:9, color:'var(--ink-3)', letterSpacing:'0.18em', textTransform:'uppercase'}}>{s.source}</div>
                  <div style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-2)', lineHeight:1.5}}>{s.text}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--gold-2)', letterSpacing:'0.22em', textTransform:'uppercase', marginBottom: 6}}>Languages</div>
              {benefits.languages.map((l, i) => (
                <div key={i} style={{marginBottom: 6}}>
                  <div style={{fontFamily:'var(--mono)', fontSize:9, color:'var(--ink-3)', letterSpacing:'0.18em', textTransform:'uppercase'}}>{l.source}</div>
                  <div style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-2)'}}>{l.text}</div>
                </div>
              ))}
              {benefits.perk && (
                <div style={{marginTop: 14}}>
                  <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--gold-2)', letterSpacing:'0.22em', textTransform:'uppercase', marginBottom: 6}}>Perk</div>
                  <div style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-2)'}}>
                    {benefits.perk.chosen
                      ? <><b style={{color:'var(--ink)'}}>{benefits.perk.chosen}</b> <span style={{color:'var(--ink-3)', fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.16em'}}>({benefits.perk.group})</span></>
                      : <><b style={{color:'var(--ink)'}}>{benefits.perk.group}</b> <span style={{color:'var(--ink-3)'}}> perk group</span></>}
                  </div>
                  {benefits.perk.chosen && benefits.perk.desc && (
                    <div style={{fontFamily:'var(--serif)', fontSize:12.5, color:'var(--ink-2)', lineHeight:1.5, marginTop: 5}}>{benefits.perk.desc}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Class Features */}
      {benefits.features.length > 0 && (
        <div className="orn-frame" style={{padding:'16px 22px'}}>
          <H4Meta>Class Features</H4Meta>
          <div className="grid-2" style={{gap:14, marginTop: 8}}>
            {benefits.features.map(f => (
              <div key={f.name} style={{padding:'8px 0'}}>
                <div style={{fontFamily:'var(--display-2)', fontSize:13, fontWeight:700, letterSpacing:'0.14em', color:'var(--ink)', textTransform:'uppercase'}}>{f.name}</div>
                <div style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-2)', marginTop:4, lineHeight:1.55}}>{f.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {character.cclass.signatures?.length > 0 && cls && cls.deep && (
        <div>
          <H3>Heroic Abilities</H3>
          <div className="grid-2" style={{marginTop: 12, gap: 12}}>
            {character.cclass.signatures.map(name => {
              const a = cls.signatures.find(x => x.name === name);
              return a ? <AbilityCard key={name} ability={a} kind="sig" /> : null;
            })}
            {character.cclass.heroic3 && (() => {
              const a = cls.heroic3.find(x => x.name === character.cclass.heroic3);
              return a ? <AbilityCard ability={a} kind="heroic" /> : null;
            })()}
            {character.cclass.heroic5 && (() => {
              const a = cls.heroic5.find(x => x.name === character.cclass.heroic5);
              return a ? <AbilityCard ability={a} kind="heroic" /> : null;
            })()}
            {character.cclass.domainAbility && (() => {
              const da = character.cclass.domainAbility;
              const a = (window.DOMAIN_2_ABILITIES?.[da.domain] || []).find(x => x.name === da.name);
              return a ? <AbilityCard key={da.name} ability={a} kind="heroic" /> : null;
            })()}
          </div>
        </div>
      )}

      <div className="orn-frame" style={{padding: '20px 24px', textAlign:'center'}}>
        <GlyphRow>✠ · ❦ · ✠</GlyphRow>
        <div style={{fontFamily:'var(--hand)', fontStyle:'italic', color:'var(--ink-2)', fontSize: 16, marginTop: 10, maxWidth: 600, margin: '10px auto 0', lineHeight: 1.55}}>
          The rites are complete. Commit to the Liber Heroum, and your hero takes their first breath as a stalwart of Orden.
        </div>
      </div>
    </div>
  );
}


function ReviewBlock({ title, body }) {
  return (
    <div className="orn-frame" style={{padding:'16px 20px', minHeight: 120}}>
      <H4Meta>{title}</H4Meta>
      <div>{body}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step component lookup
// ─────────────────────────────────────────────────────────────────────────────

export { ReviewStep };
