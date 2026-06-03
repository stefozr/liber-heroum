// wizard/steps/class.jsx — ClassStep (split out of the former wizard.jsx).
import React from 'react';
import { DS_LANGUAGES, DS_SKILL_GROUPS, DS_ANCESTRIES, DS_CULTURES, DS_CAREERS, DS_CLASSES, DS_KITS, DS_COMPLICATIONS, DS_STEPS } from '../../data.jsx';
import { OrnDivider, GlyphRow, Crest, renderGlyph, Pill, Tag, Button, IconButton, H1, H2, H3, H4Meta, Eyebrow, Deck, DropCap, StatTile, SelCard, Modal, PowerRoll, AbilityCard } from '../../theme.jsx';
import { classDef, ancestryDef, kitDef, kit2Def, careerDef, complicationDef, computeDerived, summarizeBenefits, skillsTakenExcept } from '../../app.jsx';
import { timeString, parseCareerSkills, PERKS, CHAR_MIN, CHAR_MAX, charBudget, defaultFlexValues, parseKitSig, fmtKitDmg } from '../helpers.js';
import { StepHeader } from '../StepHeader.jsx';

const { useState, useEffect, useMemo, useRef, useCallback } = React;

function ClassStep({ character, update }) {
  const sel = character.cclass.id;
  const cls = classDef(character);
  const setCls = (id) => update(c => {
    if (c.cclass.id === id) return c; // re-selecting the same class changes nothing
    return {
    ...c,
    level: 1,
    levelChoices: {},
    cclass: {
      ...c.cclass,
      id,
      subclass: null, domains: [],
      domainFeature: null, domainAbility: null, domainSkill: null,
      characteristics: {}, charArrayIndex: 0,
      signatures: [], heroic3: null, heroic5: null,
      levelAbilities: {},
      prayer: null, ward: null, enchantment: null, triggeredAction: null,
    },
    // Reset all play-state resources to their defaults (Heroic Resource is class-specific).
    play: {
      ...c.play,
      stamina: null,
      resource: 0,
      recoveriesUsed: 0,
      victories: 0,
      surges: 0,
      heroTokens: 0,
      conditions: {},
    },
  };
  });

  return (
    <div className="stack-22">
      <H3>Choose your Class</H3>
      <div className="grid-3">
        {DS_CLASSES.map(c => (
          <SelCard key={c.id} selected={sel === c.id} onClick={() => setCls(c.id)} style={{paddingBottom: 14}}>
            <div style={{display:'flex', gap:14, alignItems:'flex-start'}}>
              <Crest glyph={c.glyph} />
              <div style={{flex:1, minWidth:0}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:8}}>
                  <div style={{fontFamily:'var(--display)', fontSize:18, letterSpacing:'0.10em', color:'var(--ink)'}}>{c.name}</div>
                  <Tag kind="gold">{c.resource.toUpperCase()}</Tag>
                </div>
                <div style={{fontFamily:'var(--mono)', fontSize:9, color:'var(--ink-3)', letterSpacing:'0.18em', textTransform:'uppercase', marginTop:5}}>
                  {c.role}{!c.deep && ' · BASICS ONLY'}
                </div>
              </div>
            </div>
            <div style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-2)', marginTop:10, lineHeight:1.45}}>
              {c.blurb}
            </div>
          </SelCard>
        ))}
      </div>

      {cls && (
        <>
          <OrnDivider glyph={`❦  ${cls.name.toUpperCase()}  ❦`} />

          {/* Class flavor banner */}
          <div className="orn-frame" style={{padding: '20px 24px', display:'grid', gridTemplateColumns:'auto 1fr', gap: 18, alignItems:'center'}}>
            <Crest glyph={cls.glyph} size="large" />
            <div>
              <H2>{cls.name}</H2>
              <div style={{fontFamily:'var(--hand)', fontStyle:'italic', color:'var(--gold-2)', fontSize: 16, marginTop: 4}}>"{cls.quote}"</div>
              <div style={{fontFamily:'var(--serif)', fontSize:14, color:'var(--ink-2)', marginTop: 10, lineHeight:1.55}}>{cls.longBlurb}</div>
            </div>
          </div>

          {/* Subclass picker */}
          <ClassSubclassPicker character={character} update={update} />

          {/* Censor domain picker */}
          <CensorDomainPicker character={character} update={update} />

          {/* Characteristics */}
          <CharacteristicPicker character={character} update={update} />

          {/* Class features summary */}
          {cls.features && (
            <div>
              <H3>Class Features</H3>
              <div className="stack-12" style={{marginTop: 10}}>
                {cls.features.map(f => {
                  // Censor: the Judgment card carries an order-specific benefit once an order is chosen.
                  const ability = (f.ability && cls.id === 'censor' && f.name === 'Judgment' && cls.judgmentOrder?.[character.cclass.subclass])
                    ? { ...f.ability, orderBenefit: cls.judgmentOrder[character.cclass.subclass] }
                    : f.ability;
                  return ability ? (
                    <AbilityCard key={f.name} ability={ability} kind="sig" />
                  ) : (
                    <div key={f.name} className="orn-frame" style={{padding:'14px 18px'}}>
                      <div style={{fontFamily:'var(--display-2)', fontSize:13, fontWeight:700, letterSpacing:'0.14em', color:'var(--gold-2)'}}>{f.name.toUpperCase()}</div>
                      <div style={{fontFamily:'var(--serif)', fontSize:14, color:'var(--ink-2)', marginTop: 6, lineHeight:1.55}}>{f.text}</div>
                      {(f.choose === 'prayerWard' || f.choose === 'enchantWard' || f.choose === 'augmentWard' || f.choose === 'triggered') && <PrayerWardPicker character={character} update={update} cls={cls} feature={f} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ability picks (only for deep classes) */}
          {cls.deep && <AbilityPicker character={character} update={update} />}

          {/* Kit picker for steel-wielding classes */}
          {cls.kitRequired && <ClassKitPicker character={character} update={update} />}
        </>
      )}
    </div>
  );
}


function PrayerWardPicker({ character, update, cls, feature }) {
  // Config per feature.choose: [ [label, classArrayKey, stateKey], ... ]
  const CONFIG = {
    prayerWard: [['Prayer', 'prayers', 'prayer'], ['Conduit Ward', 'wards', 'ward']],
    triggered: [['Triggered Action', 'triggereds', 'triggeredAction']],
    enchantWard: [['Enchantment', 'enchantments', 'enchantment'], ['Elementalist Ward', 'wards', 'ward']],
    augmentWard: [['Augmentation', 'enchantments', 'enchantment'], ['Talent Ward', 'wards', 'ward']],
  };
  const groups = CONFIG[feature?.choose] || CONFIG.prayerWard;
  const setKey = (stateKey, name) => update(c => ({ ...c, cclass: { ...c.cclass, [stateKey]: c.cclass[stateKey] === name ? null : name } }));

  const Group = ({ label, options, current, onPick }) => (
    <div>
      <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-3)', letterSpacing:'0.2em', textTransform:'uppercase', marginBottom: 8}}>{label} <span style={{color:'var(--gold-2)'}}>· Pick 1</span></div>
      <div className="pw-grid">
        {options.map(o => {
          const on = current === o.name;
          return (
            <div key={o.name} className={`pw-opt ${on ? 'selected' : ''}`} onClick={() => onPick(o.name)}>
              <div className="pw-name">{o.name}</div>
              <div className="pw-text">{o.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="stack-12" style={{marginTop: 14}}>
      {groups.map(([label, clsKey, stateKey]) => (
        <Group
          key={stateKey}
          label={label}
          options={cls[clsKey] || []}
          current={character.cclass[stateKey]}
          onPick={(name) => setKey(stateKey, name)}
        />
      ))}
    </div>
  );
}


function ClassSubclassPicker({ character, update }) {
  const cls = classDef(character);
  // Render when the class has a subclass list OR uses the two-domain model (e.g. Conduit).
  if (!cls || (!cls.subclasses && !cls.pickTwoDomains)) return null;

  const isMulti = cls.pickTwoDomains;
  const setSub = (id) => update(c => ({ ...c, cclass: { ...c.cclass, subclass: id } }));
  const toggleDomain = (name) => update(c => {
    const cur = c.cclass.domains || [];
    // Dropping a domain clears any domain feature/ability tied to it.
    const clean = (next) => {
      let df = c.cclass.domainFeature;
      let da = c.cclass.domainAbility;
      let ds = c.cclass.domainSkill;
      if (df && !next.includes(df.domain)) { df = null; ds = null; }
      if (da && !next.includes(da.domain)) da = null;
      return { ...c, cclass: { ...c.cclass, domains: next, domainFeature: df, domainAbility: da, domainSkill: ds } };
    };
    if (cur.includes(name)) return clean(cur.filter(x => x !== name));
    if (cur.length >= 2) return clean([cur[1], name]);
    return clean([...cur, name]);
  });
  const setDomainFeature = (domain) => update(c => {
    const f = window.DOMAIN_1ST_FEATURES?.[domain];
    return { ...c, cclass: { ...c.cclass, domainFeature: f ? { domain, name: f.name, text: f.text, skillGroup: f.skillGroup } : null, domainSkill: null } };
  });
  const setDomainAbility = (domain) => update(c => {
    const list = window.DOMAIN_2_ABILITIES?.[domain] || [];
    const ab = list[0];
    return { ...c, cclass: { ...c.cclass, domainAbility: ab ? { domain, name: ab.name } : null } };
  });
  const setDomainSkill = (skill) => update(c => ({ ...c, cclass: { ...c.cclass, domainSkill: c.cclass.domainSkill === skill ? null : skill } }));

  if (cls.pickTwoDomains) {
    const chosenDomains = character.cclass.domains || [];
    const ready = chosenDomains.length === 2;
    const curFeature = character.cclass.domainFeature;
    const curAbility = character.cclass.domainAbility;
    return (
      <div className="stack-22">
        <div>
          <H3>{cls.subclassName} <span style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-3)', letterSpacing:'0.18em', textTransform:'uppercase', marginLeft: 8}}>Pick 2</span></H3>
          <div className="grid-4" style={{marginTop: 10}}>
            {cls.domains.map(d => {
              const on = chosenDomains.includes(d);
              return (
                <div key={d} className={`card ${on ? 'selected' : ''}`} onClick={() => toggleDomain(d)} style={{padding:'10px 12px', textAlign:'center'}}>
                  <div style={{fontFamily:'var(--display-2)', fontSize:13, letterSpacing:'0.14em', color:'var(--ink)', fontWeight:700}}>{d}</div>
                </div>
              );
            })}
          </div>
        </div>

        {ready && (
          <div>
            <H3>Domain Feature <span style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-3)', letterSpacing:'0.18em', textTransform:'uppercase', marginLeft: 8}}>Pick 1</span></H3>
            <Deck>At 1st level you gain the 1st-level feature of one of your two domains. The other follows at 2nd level.</Deck>
            <div className="grid-2" style={{marginTop: 12, gap: 10}}>
              {chosenDomains.map(d => {
                const f = window.DOMAIN_1ST_FEATURES?.[d];
                if (!f) return null;
                const on = curFeature?.domain === d;
                return (
                  <div key={d} className={`card ${on ? 'selected' : ''}`} onClick={() => setDomainFeature(d)} style={{padding:'14px 16px'}}>
                    <div style={{fontFamily:'var(--mono)', fontSize:9, color:'var(--gold-2)', letterSpacing:'0.2em', textTransform:'uppercase'}}>{d}</div>
                    <div style={{fontFamily:'var(--display-2)', fontSize:14, fontWeight:700, letterSpacing:'0.08em', color:'var(--ink)', marginTop:4}}>{f.name}</div>
                    <div style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-2)', marginTop:6, lineHeight:1.5}}>{f.text}</div>
                  </div>
                );
              })}
            </div>
            {curFeature?.skillGroup && (() => {
              const group = curFeature.skillGroup;
              const skills = (window.DS_SKILL_GROUPS?.[group]) || [];
              const cur = character.cclass.domainSkill;
              const takenElsewhere = skillsTakenExcept(character, 'domain');
              return (
                <div style={{marginTop: 16}}>
                  <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-3)', letterSpacing:'0.2em', textTransform:'uppercase', marginBottom: 8}}>
                    {group} Skill <span style={{color:'var(--gold-2)'}}>· Pick 1</span> <span style={{color:'var(--ink-3)', textTransform:'none', letterSpacing:'0.04em'}}>— granted by {curFeature.name}</span>
                  </div>
                  <div className="skill-chip-grid">
                    {skills.map(s => {
                      const on = cur === s;
                      const blocked = !on && takenElsewhere.has(s);
                      return (
                        <button
                          type="button"
                          key={s}
                          className={`skill-chip${on ? ' on' : ''}${blocked ? ' blocked' : ''}`}
                          onClick={() => !blocked && setDomainSkill(s)}
                          disabled={blocked}
                          title={blocked ? `Already chosen — ${takenElsewhere.get(s)}` : ''}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {ready && (
          <div>
            <H3>Domain Ability <span style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-3)', letterSpacing:'0.18em', textTransform:'uppercase', marginLeft: 8}}>Pick 1</span></H3>
            <Deck>Each domain grants a signature {cls.resource}-fueled ability. Choose one tied to your domains.</Deck>
            <div className="grid-2" style={{marginTop: 12, gap: 12}}>
              {chosenDomains.flatMap(d => (window.DOMAIN_2_ABILITIES?.[d] || []).map(a => {
                const on = curAbility?.domain === d && curAbility?.name === a.name;
                return (
                  <AbilityCard
                    key={d + a.name}
                    ability={a}
                    kind="heroic"
                    onClick={() => setDomainAbility(d)}
                    selected={on}
                    dimmed={curAbility && !on}
                  />
                );
              }))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <H3>{cls.subclassName}</H3>
      <div className="grid-3" style={{marginTop:10}}>
        {cls.subclasses.map(s => (
          <SelCard key={s.id || s.name} selected={character.cclass.subclass === (s.id || s.name)} onClick={() => setSub(s.id || s.name)}>
            <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between'}}>
              <div style={{fontFamily:'var(--display)', fontSize:16, letterSpacing:'0.10em'}}>{s.name}</div>
              {s.tag && <Tag>{s.tag}</Tag>}
            </div>
            <div style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-2)', marginTop:8, lineHeight:1.5}}>{s.text}</div>
            {s.skill && <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--gold-2)', letterSpacing:'0.18em', marginTop:8, textTransform:'uppercase'}}>+ Skill: {s.skill}</div>}
          </SelCard>
        ))}
      </div>
    </div>
  );
}

// Censor: pick one domain → its 1st-level feature (auto) + a skill from the indicated group.

function CensorDomainPicker({ character, update }) {
  const cls = classDef(character);
  if (!cls || !cls.pickOneDomain) return null;

  const chosen = (character.cclass.domains || [])[0] || null;
  const curFeature = character.cclass.domainFeature;
  const curSkill = character.cclass.domainSkill;

  const pickDomain = (d) => update(c => {
    if ((c.cclass.domains || [])[0] === d) {
      return { ...c, cclass: { ...c.cclass, domains: [], domainFeature: null, domainSkill: null } };
    }
    const f = (window.CENSOR_DOMAIN_1 || window.DOMAIN_1ST_FEATURES || {})[d];
    return { ...c, cclass: { ...c.cclass, domains: [d],
      domainFeature: f ? { domain: d, name: f.name, text: f.text, skillGroup: f.skillGroup } : null,
      domainSkill: null } };
  });
  const setDomainSkill = (s) => update(c => ({ ...c, cclass: { ...c.cclass, domainSkill: c.cclass.domainSkill === s ? null : s } }));

  return (
    <div className="stack-22">
      <div>
        <H3>Deity &amp; Domain <span style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-3)', letterSpacing:'0.18em', textTransform:'uppercase', marginLeft: 8}}>Pick 1</span></H3>
        <Deck>Pick one domain from your deity&rsquo;s portfolio. It grants a 1st-level domain feature and a skill, and shapes the features you gain as you rise in level.</Deck>
        <div className="grid-4" style={{marginTop: 10}}>
          {cls.domains.map(d => {
            const on = chosen === d;
            return (
              <div key={d} className={`card ${on ? 'selected' : ''}`} onClick={() => pickDomain(d)} style={{padding:'10px 12px', textAlign:'center'}}>
                <div style={{fontFamily:'var(--display-2)', fontSize:13, letterSpacing:'0.14em', color:'var(--ink)', fontWeight:700}}>{d}</div>
              </div>
            );
          })}
        </div>
      </div>

      {chosen && curFeature && (
        <div>
          <H3>Domain Feature <span style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-3)', letterSpacing:'0.18em', textTransform:'uppercase', marginLeft: 8}}>From {chosen}</span></H3>
          <div className="orn-frame" style={{padding:'14px 18px', marginTop:10}}>
            <div style={{fontFamily:'var(--mono)', fontSize:9, color:'var(--gold-2)', letterSpacing:'0.2em', textTransform:'uppercase'}}>{chosen}</div>
            <div style={{fontFamily:'var(--display-2)', fontSize:14, fontWeight:700, letterSpacing:'0.08em', color:'var(--ink)', marginTop:4}}>{curFeature.name}</div>
            <div style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-2)', marginTop:6, lineHeight:1.5}}>{curFeature.text}</div>
          </div>

          {curFeature.skillGroup && (() => {
            const group = curFeature.skillGroup;
            const skills = (window.DS_SKILL_GROUPS?.[group]) || [];
            const takenElsewhere = skillsTakenExcept(character, 'domain');
            return (
              <div style={{marginTop: 16}}>
                <div style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--ink-3)', letterSpacing:'0.2em', textTransform:'uppercase', marginBottom: 8}}>
                  {group} Skill <span style={{color:'var(--gold-2)'}}>· Pick 1</span> <span style={{color:'var(--ink-3)', textTransform:'none', letterSpacing:'0.04em'}}>— granted by {curFeature.name}</span>
                </div>
                <div className="skill-chip-grid">
                  {skills.map(s => {
                    const on = curSkill === s;
                    const blocked = !on && takenElsewhere.has(s);
                    return (
                      <button
                        type="button"
                        key={s}
                        className={`skill-chip${on ? ' on' : ''}${blocked ? ' blocked' : ''}`}
                        onClick={() => !blocked && setDomainSkill(s)}
                        disabled={blocked}
                        title={blocked ? `Already chosen — ${takenElsewhere.get(s)}` : ''}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// Point-buy budget for a class = the most generous of its standard arrays.

function CharacteristicPicker({ character, update }) {
  const cls = classDef(character);
  if (!cls || !cls.flexCharOrder) return null;

  const flex = cls.flexCharOrder;
  const fixed = cls.fixedChars || {};
  const budget = charBudget(cls);
  const chars = character.cclass.characteristics || {};

  // Initialise once per class with a valid default spread.
  useEffect(() => {
    if (cls && (!character.cclass.characteristics || Object.keys(character.cclass.characteristics).length === 0)) {
      update(c => ({ ...c, cclass: { ...c.cclass, characteristics: { ...fixed, ...defaultFlexValues(cls) } } }));
    }
    // eslint-disable-next-line
  }, [cls?.id]);

  const flexVals = flex.map(k => (typeof chars[k] === 'number' ? chars[k] : 0));
  const spent = flexVals.reduce((s, v) => s + v, 0);
  const remaining = budget - spent;

  const setStat = (key, val) => {
    val = Math.max(CHAR_MIN, Math.min(CHAR_MAX, val));
    update(c => ({ ...c, cclass: { ...c.cclass, characteristics: { ...fixed, ...c.cclass.characteristics, [key]: val } } }));
  };
  const reset = () => update(c => ({ ...c, cclass: { ...c.cclass, characteristics: { ...fixed, ...defaultFlexValues(cls) } } }));

  const fixedLabel = Object.entries(fixed).map(([k, v]) => `${k} ${v >= 0 ? '+' : ''}${v}`).join(', ');
  const ALL = ['Might', 'Agility', 'Reason', 'Intuition', 'Presence'];

  return (
    <div>
      <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', flexWrap:'wrap', gap: 10}}>
        <H3>Characteristic Array</H3>
        <div style={{display:'flex', alignItems:'center', gap: 12}}>
          <Pill kind={remaining > 0 ? 'gold' : 'muted'}>{remaining} POINTS LEFT</Pill>
          <button type="button" className="pb-reset" onClick={reset}>RESET</button>
        </div>
      </div>
      <Deck>{fixedLabel ? `Your ${cls.name} starts with ${fixedLabel}. ` : ''}Spend {budget} point{budget === 1 ? '' : 's'} across the rest — each from {CHAR_MIN >= 0 ? '+' : ''}{CHAR_MIN} to +{CHAR_MAX}. Drop a score to fund another.</Deck>

      <div className="pb-grid" style={{marginTop: 16}}>
        {ALL.map(k => {
          const isFixed = k in fixed;
          const val = isFixed ? fixed[k] : (typeof chars[k] === 'number' ? chars[k] : 0);
          const canInc = !isFixed && val < CHAR_MAX && remaining > 0;
          const canDec = !isFixed && val > CHAR_MIN;
          return (
            <div key={k} className={`pb-stat ${isFixed ? 'fixed' : ''}`}>
              <div className="pb-key">{k}</div>
              <div className="pb-controls">
                <button type="button" className="pb-btn" disabled={!canDec} onClick={() => setStat(k, val - 1)} aria-label={`Lower ${k}`}>−</button>
                <div className="pb-val" style={{color: val > 0 ? 'var(--gold-2)' : val < 0 ? 'var(--rubric-2)' : 'var(--ink)'}}>{val >= 0 ? '+' + val : val}</div>
                <button type="button" className="pb-btn" disabled={!canInc} onClick={() => setStat(k, val + 1)} aria-label={`Raise ${k}`}>+</button>
              </div>
              {isFixed && <div className="pb-lock">FIXED</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}


function AbilityPicker({ character, update }) {
  const cls = classDef(character);
  if (!cls || !cls.deep) return null;

  const sigsRequired = cls.sigCount ?? 1;
  const sigsChosen = character.cclass.signatures || [];
  const toggleSig = (name) => {
    if (sigsChosen.includes(name)) {
      update(c => ({ ...c, cclass: { ...c.cclass, signatures: c.cclass.signatures.filter(x => x !== name) } }));
    } else if (sigsChosen.length < sigsRequired) {
      update(c => ({ ...c, cclass: { ...c.cclass, signatures: [...c.cclass.signatures, name] } }));
    } else if (sigsRequired === 1) {
      update(c => ({ ...c, cclass: { ...c.cclass, signatures: [name] } }));
    }
  };

  const setH3 = (n) => update(c => ({ ...c, cclass: { ...c.cclass, heroic3: n } }));
  const setH5 = (n) => update(c => ({ ...c, cclass: { ...c.cclass, heroic5: n } }));

  return (
    <div className="stack-22">
      {sigsRequired > 0 ? (
      <div>
        <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between'}}>
          <H3>Signature Abilities</H3>
          <Pill kind="gold">{sigsChosen.length} / {sigsRequired} CHOSEN</Pill>
        </div>
        <div className="grid-2" style={{marginTop:12}}>
          {cls.signatures.map(a => (
            <AbilityCard
              key={a.name}
              ability={a}
              kind="sig"
              onClick={() => toggleSig(a.name)}
              selected={sigsChosen.includes(a.name)}
              dimmed={sigsChosen.length >= sigsRequired && !sigsChosen.includes(a.name)}
            />
          ))}
        </div>
      </div>
      ) : cls.signatureNote ? (
      <div>
        <H3>Signature Abilities <span style={{fontFamily:'var(--mono)', fontSize:11, color:'var(--ink-3)', letterSpacing:'0.18em', textTransform:'uppercase', marginLeft: 8}}>From your kits</span></H3>
        <Deck>{cls.signatureNote}</Deck>
      </div>
      ) : null}

      <div>
        <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between'}}>
          <H3>3-{cls.resource} Heroic Ability</H3>
          <Pill kind="gold">{character.cclass.heroic3 ? 1 : 0} / 1 CHOSEN</Pill>
        </div>
        <div className="grid-2" style={{marginTop:12}}>
          {cls.heroic3.map(a => (
            <AbilityCard
              key={a.name}
              ability={a}
              kind="heroic"
              onClick={() => setH3(a.name)}
              selected={character.cclass.heroic3 === a.name}
              dimmed={character.cclass.heroic3 && character.cclass.heroic3 !== a.name}
            />
          ))}
        </div>
      </div>

      <div>
        <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between'}}>
          <H3>5-{cls.resource} Heroic Ability</H3>
          <Pill kind="gold">{character.cclass.heroic5 ? 1 : 0} / 1 CHOSEN</Pill>
        </div>
        <div className="grid-2" style={{marginTop:12}}>
          {cls.heroic5.map(a => (
            <AbilityCard
              key={a.name}
              ability={a}
              kind="heroic"
              onClick={() => setH5(a.name)}
              selected={character.cclass.heroic5 === a.name}
              dimmed={character.cclass.heroic5 && character.cclass.heroic5 !== a.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5: KIT
// ─────────────────────────────────────────────────────────────────────────────
// Parse a kit signature string ("Name — distance; X/Y/Z + stat damage; effect")
// into the pieces an ability card shows: name, distance, power-roll tiers, and effect.

function ClassKitPicker({ character, update }) {
  const cls = classDef(character);
  const sel = character.kit.id;
  const sel2 = character.kit2?.id;
  const setKit = (id) => update(c => ({ ...c, kit: { id } }));
  const sug = cls && cls.quickKit;
  const sug2 = cls && cls.quickKit2;
  const dual = cls && cls.kit2Required;

  // Dual-kit (e.g. Tactician's Field Arsenal): one selection group, pick two.
  // Clicking toggles a kit in/out of the pair; picking a third drops the oldest.
  const pickDual = (id) => update(c => {
    const k1 = c.kit.id, k2 = c.kit2?.id;
    if (id === k1) return { ...c, kit: { id: k2 || '' }, kit2: { id: '' } };
    if (id === k2) return { ...c, kit2: { id: '' } };
    if (!k1) return { ...c, kit: { id } };
    if (!k2) return { ...c, kit2: { id } };
    return { ...c, kit: { id: k2 }, kit2: { id } };
  });
  // Order badge (1st / 2nd) for a kit id in the dual selection.
  const orderOf = (id) => (id === sel ? 1 : id === sel2 ? 2 : 0);

  const KitGrid = ({ selected, onPick, disabledId, dualSel }) => (
    <div className="grid-3" style={{marginTop: 14}}>
      {DS_KITS.map(k => {
        const blocked = disabledId && k.id === disabledId;
        const order = dualSel ? orderOf(k.id) : 0;
        const isSel = dualSel ? order > 0 : selected === k.id;
        const sig = parseKitSig(k.sig);
        return (
          <SelCard key={k.id} selected={isSel} onClick={() => !blocked && onPick(k.id)} style={blocked ? {opacity:0.32, cursor:'not-allowed'} : undefined}>
            <div className="kit-card">
              <div className="ac-row">
                <span className="ac-name">{k.name}</span>
                {order > 0
                  ? <Tag kind="gold">{order === 1 ? '1ST KIT' : '2ND KIT'}</Tag>
                  : <Tag kind="gold">{k.armor}</Tag>}
              </div>
              <div className="ac-keywords">{k.weapon} Weapon · {k.armor} Armor</div>
              <div className="ac-flavor" style={{fontFamily:'var(--serif)', fontStyle:'normal'}}>{k.desc}</div>
              <div className="kit-bonuses">
                {k.bonuses.sta_per ? <span className="kit-stat"><span className="kit-stat-v">+{k.bonuses.sta_per}</span><span className="kit-stat-l">Stamina / lvl</span></span> : null}
                {k.bonuses.spd ? <span className="kit-stat"><span className="kit-stat-v">+{k.bonuses.spd}</span><span className="kit-stat-l">Speed</span></span> : null}
                {k.bonuses.stab ? <span className="kit-stat"><span className="kit-stat-v">+{k.bonuses.stab}</span><span className="kit-stat-l">Stability</span></span> : null}
                {fmtKitDmg(k.bonuses.melee) ? <span className="kit-stat"><span className="kit-stat-v">{fmtKitDmg(k.bonuses.melee)}</span><span className="kit-stat-l">Melee dmg</span></span> : null}
                {fmtKitDmg(k.bonuses.ranged) ? <span className="kit-stat"><span className="kit-stat-v">{fmtKitDmg(k.bonuses.ranged)}</span><span className="kit-stat-l">Ranged dmg</span></span> : null}
              </div>
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
                    {sig.rows.map(([t, e], i) => (
                      <React.Fragment key={i}>
                        <span className={`t tier-${i + 1}`}>{t}</span>
                        <span className={`e tier-${i + 1}`}>{e}</span>
                      </React.Fragment>
                    ))}
                  </div>
                )}
                {sig.effect && <div className="kit-sig-effect"><b>Effect.</b> {sig.effect}</div>}
              </div>
            </div>
          </SelCard>
        );
      })}
    </div>
  );

  return (
    <div className="stack-22">
      <div>
        <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between'}}>
          <H3>{dual ? 'Choose Two Kits' : 'Choose your Kit'}</H3>
          {dual
            ? (sug || sug2) && <Pill kind="gold">SUGGESTED · {[sug, sug2].filter(Boolean).join(' + ').toUpperCase()}</Pill>
            : sug && <Pill kind="gold">SUGGESTED · {sug.toUpperCase()}</Pill>}
        </div>
        <Deck>{dual
          ? `Field Arsenal lets the ${cls.name.toLowerCase()} equip two kits at once, gaining both signature abilities. Pick any two below — when both grant the same benefit, you take the higher of the two.`
          : `A kit is the ${cls ? cls.name.toLowerCase() : ''}'s fighting style — armor, weapons, and a signature technique. Bonuses apply to weapon abilities that match the kit.`}</Deck>
        {dual
          ? <KitGrid onPick={pickDual} dualSel />
          : <KitGrid selected={sel} onPick={setKit} />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 6: COMPLICATION
// ─────────────────────────────────────────────────────────────────────────────

export { ClassStep };
