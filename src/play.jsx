import React from 'react';
import { OrnDivider, GlyphRow, renderGlyph, Pill, Button, H3, H4Meta, StatTile, Modal, AbilityCard } from './theme.jsx';
import { heroName } from './campaigns.jsx';
import { ManeuversPanel, RulesGlossary } from './rules.jsx';
import { LevelUpFlow, LevelUpStyles } from './levelup.jsx';
import { classDef, ancestryDef, kitDef, kit2Def, careerDef, complicationDef, computeDerived, summarizeBenefits } from './app.jsx';
import { parseKitSig, PERKS } from './wizard/helpers.js';
// play.jsx — Play view (at-the-table digital sheet) + Level-up modal.

// Hooks used bare in this file (see note in wizard.jsx) — provide them under ES modules.
const { useState, useEffect } = React;

function PlayView({ character, update, onExit, onEdit, canEdit = true }) {
  const cls = classDef(character);
  const anc = ancestryDef(character);
  const kit = kitDef(character);
  const kit2 = kit2Def(character);
  const comp = complicationDef(character);
  const car = careerDef(character);
  const derived = computeDerived(character);
  const benefits = summarizeBenefits(character);

  const [levelUpOpen, setLevelUpOpen] = useState(false);
  const [editLevel, setEditLevel] = useState(null);
  const [bioOpen, setBioOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  // Initialise current stamina if undefined (skip for read-only viewers — not our sheet).
  useEffect(() => {
    if (canEdit && character.play.stamina == null && derived.staminaMax) {
      update(c => ({ ...c, play: { ...c.play, stamina: derived.staminaMax } }));
    }
    // eslint-disable-next-line
  }, [derived.staminaMax]);

  const setPlay = (mut) => update(c => ({ ...c, play: typeof mut === 'function' ? mut(c.play) : { ...c.play, ...mut } }));

  const adjStamina = (delta) => setPlay(p => ({ ...p, stamina: Math.max(-derived.winded, Math.min(derived.staminaMax, (p.stamina ?? derived.staminaMax) + delta)) }));
  const setStamina = (val) => setPlay(p => ({ ...p, stamina: Math.max(0, Math.min(derived.staminaMax, Math.floor(val))) }));
  const adjResource = (delta) => setPlay(p => ({ ...p, resource: Math.max(0, (p.resource || 0) + delta) }));
  const setResource = (val) => setPlay(p => ({ ...p, resource: Math.max(0, Math.floor(val)) }));
  const adjVictories = (delta) => setPlay(p => ({ ...p, victories: Math.max(0, (p.victories || 0) + delta) }));
  const adjSurges = (delta) => setPlay(p => ({ ...p, surges: Math.max(0, (p.surges || 0) + delta) }));
  const adjHero = (delta) => setPlay(p => ({ ...p, heroTokens: Math.max(0, (p.heroTokens || 0) + delta) }));

  const heroName = character.identity.name || character.name || 'Unnamed Hero';
  const subclassName = (cls && cls.subclasses && cls.subclasses.find(s => s.id === character.cclass.subclass || s.name === character.cclass.subclass)?.name) || character.cclass.subclass;
  const aspectAction = (cls && cls.aspectActions && character.cclass.subclass) ? cls.aspectActions[character.cclass.subclass] : null;

  // Ability collections
  const signatures = (cls && cls.signatures || []).filter(a => (character.cclass.signatures || []).includes(a.name));
  const heroic = [];
  if (cls && cls.heroic3) {
    const h3 = cls.heroic3.find(x => x.name === character.cclass.heroic3);
    if (h3) heroic.push(h3);
  }
  if (cls && cls.heroic5) {
    const h5 = cls.heroic5.find(x => x.name === character.cclass.heroic5);
    if (h5) heroic.push(h5);
  }
  const mkKitSig = (kt) => {
    const s = parseKitSig(kt.sig);
    return {
      name: s.name, flavor: '', keywords: ['Weapon'], type: 'Main action', badge: 'SIG',
      distance: s.distance || undefined,
      tiers: s.rows || undefined,
      powerRoll: s.rows ? '' : undefined,
      effect: s.effect || undefined,
    };
  };
  const kitSig = kit ? mkKitSig(kit) : null;
  const kitSig2 = kit2 ? mkKitSig(kit2) : null;

  // Conduit domain ability (chosen at creation), normalized for AbilityCard.
  const domainAbilities = [];
  if (character.cclass.domainAbility && window.DOMAIN_2_ABILITIES) {
    const da = character.cclass.domainAbility;
    const found = (window.DOMAIN_2_ABILITIES[da.domain] || []).find(a => a.name === da.name);
    if (found) {
      const normalized = found.tiers && !Array.isArray(found.tiers)
        ? { ...found, tiers: [['\u2264 11', found.tiers.t1], ['12\u201316', found.tiers.t2], ['\u2265 17', found.tiers.t3]], powerRoll: found.powerRoll || 'I' }
        : found;
      domainAbilities.push(normalized);
    }
  }

  // Abilities learned via level-up flow (stored in cclass.levelAbilities[level])
  const levelAbilities = [];
  const la = character.cclass.levelAbilities || {};
  for (const lvl of Object.keys(la).sort((a, b) => +a - +b)) {
    for (const a of (la[lvl] || [])) {
      const normalized = a.tiers && !Array.isArray(a.tiers)
        ? { ...a, tiers: [['\u2264 11', a.tiers.t1], ['12\u201316', a.tiers.t2], ['\u2265 17', a.tiers.t3]], powerRoll: a.powerRoll || (a.resource === 'Piety' ? 'I' : 'M') }
        : a;
      levelAbilities.push(normalized);
    }
  }

  // Progression history — levels the player has resolved choices for, newest first.
  const levelChoiceMap = character.levelChoices || {};
  const lvlData = (cls && window.LEVELUP_DATA && window.LEVELUP_DATA[cls.id]) ? window.LEVELUP_DATA[cls.id] : null;
  const progressionLevels = Object.keys(levelChoiceMap)
    .map(Number)
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b);

  // Build a readable list of {label, value} for a stored level's picks.
  const summarizeLevelPicks = (lvl) => {
    const stored = levelChoiceMap[lvl];
    const dataForLvl = lvlData && lvlData[lvl];
    if (!stored || !dataForLvl) return [];
    const out = [];
    for (const ch of (dataForLvl.choices || [])) {
      const p = stored.picks?.[ch.id];
      if (!p) continue;
      let value;
      if (p.chosen) value = `${p.chosen} (${typeof p.name === 'string' ? p.name.replace(/\s*(Perk|Skill)$/i, '') : p.chosen})`;
      else value = p.name || p.id || String(p);
      out.push({ label: ch.label, value });
    }
    return out;
  };

  // Collect perks gained through level-ups (kind: 'perk' choices), newest level first.
  const levelUpPerks = [];
  for (const lvl of progressionLevels) {
    const stored = levelChoiceMap[lvl];
    const dataForLvl = lvlData && lvlData[lvl];
    if (!stored || !dataForLvl) continue;
    for (const ch of (dataForLvl.choices || [])) {
      if (ch.kind !== 'perk') continue;
      const p = stored.picks?.[ch.id];
      if (!p || !p.chosen) continue;
      const group = typeof p.name === 'string' ? p.name.replace(/\s*Perk$/i, '') : (p.id || '');
      let text = p.chosenText || null;
      if (!text && window.PERKS && window.PERKS[group]) {
        const found = window.PERKS[group].find(x => x.name === p.chosen);
        if (found) text = found.text;
      }
      levelUpPerks.push({ level: lvl, name: p.chosen, group, text });
    }
  }

  // Collect class features gained through level-ups: auto-granted features plus
  // any 'feature'-kind choice picks (e.g. domain features), oldest level first.
  const levelUpFeatures = [];
  {
    const ctx = window.makeContext ? window.makeContext(character) : {};
    const ascending = [...progressionLevels].sort((a, b) => a - b);
    for (const lvl of ascending) {
      const stored = levelChoiceMap[lvl];
      const dataForLvl = lvlData && lvlData[lvl];
      if (!dataForLvl) continue;
      const auto = typeof dataForLvl.autoFeatures === 'function' ? dataForLvl.autoFeatures(ctx) : (dataForLvl.autoFeatures || []);
      for (const f of auto) {
        if (f && f.name) levelUpFeatures.push({ level: lvl, name: f.name, text: f.text });
      }
      for (const ch of (dataForLvl.choices || [])) {
        if (ch.kind !== 'feature') continue;
        const p = stored?.picks?.[ch.id];
        if (!p) continue;
        levelUpFeatures.push({ level: lvl, name: p.name || p.id, text: p.body || p.text || '' });
      }
    }
  }

  return (
    <div className={`play${canEdit ? '' : ' play-readonly'}`}>
      <PlayStyles />
      <LevelUpStyles />

      {/* Top bar */}
      <div className="play-top">
        <div className="left">
          <Button kind="ghost" small onClick={onExit}>◂ LIBER</Button>
          <div className="brand-mark">
            <span className="brand-glyph">
              <svg viewBox="0 0 100 100" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
                <polygon points="50,4 91,28 91,72 50,96 9,72 9,28" />
                <polygon points="50,4 73,40 50,60 27,40" />
                <path d="M9,28 L27,40 M91,28 L73,40 M50,60 L50,96 M27,40 L9,72 M73,40 L91,72 M27,40 L50,96 M73,40 L50,96" />
              </svg>
            </span>
            <div>
              <div className="brand-name">DRAW · STEEL</div>
              <div className="brand-sub">Character Sheet</div>
            </div>
          </div>
        </div>
        <div className="center"></div>
        <div className="right">
          {!canEdit && <span className="play-readonly-tag" title="Only the owner or Director can edit this hero">👁 Viewing</span>}
          <Button kind="ghost" small onClick={() => setRulesOpen(true)}>RULES</Button>
          <Button kind="ghost" small onClick={() => setBioOpen(true)}>BIOGRAPHY</Button>
          {canEdit && onEdit && <Button kind="ghost" small onClick={onEdit}>EDIT</Button>}
          {canEdit && <Button kind="primary" small onClick={() => setLevelUpOpen(true)}>LEVEL UP ▲</Button>}
        </div>
      </div>

      {/* Body */}
      <div className="play-body">
        <div className="play-bg" style={cls ? { backgroundImage: `url(${cls.img})` } : {}}></div>

        <div className="play-content">
          {/* Hero masthead (named to avoid ad-blocker cosmetic filters on "banner") */}
          <div className="hero-masthead">
            <div className={`hb-portrait ${character.portrait ? 'has-img' : ''}`}
              style={character.portrait ? { backgroundImage: `url(${character.portrait})` } : {}}>
              {!character.portrait && <span className="hb-glyph">{renderGlyph(cls?.glyph || '✠')}</span>}
            </div>
            <div className="hb-text">
              <div className="hb-eyebrow">{[anc?.name].filter(Boolean).join(' · ') || 'Hero'}</div>
              <div className="hb-name">{heroName}</div>
              <div className="hb-meta">
                {cls?.name || 'Unclassed'}
                {character.cclass.subclass && <span className="hb-sub"> · {subclassName || character.cclass.subclass}</span>}
              </div>
            </div>
            <div className="hb-level">
              <div className="hb-level-num">{character.level}</div>
              <div className="hb-level-lbl">Level</div>
            </div>
          </div>

          {/* Vitals strip */}
          <div className="vitals">
            <VitalGauge
              label="Stamina"
              value={character.play.stamina ?? derived.staminaMax}
              max={derived.staminaMax}
              winded={derived.winded}
              accent="var(--rubric)"
              onAdj={adjStamina}
              onSet={setStamina}
            />
            <VitalGauge
              label={cls?.resource || 'Resource'}
              value={character.play.resource || 0}
              max={12}
              accent="var(--gold)"
              onAdj={adjResource}
              onSet={setResource}
            />
            <CounterBox label="Recoveries" value={(derived.recoveries || 0) - (character.play.recoveriesUsed || 0)} total={derived.recoveries} onPlus={() => setPlay(p => ({ ...p, recoveriesUsed: Math.max(0, (p.recoveriesUsed || 0) - 1) }))} onMinus={() => setPlay(p => ({ ...p, recoveriesUsed: Math.min(derived.recoveries, (p.recoveriesUsed || 0) + 1) }))} />
            <CounterBox label="Surges" value={character.play.surges || 0} onPlus={() => adjSurges(1)} onMinus={() => adjSurges(-1)} />
            <CounterBox label="Victories" value={character.play.victories || 0} onPlus={() => adjVictories(1)} onMinus={() => adjVictories(-1)} />
            <CounterBox label="Hero Tokens" value={character.play.heroTokens || 0} onPlus={() => adjHero(1)} onMinus={() => adjHero(-1)} />
          </div>

          <div className="play-grid">
            {/* LEFT column */}
            <div className="play-col-l">
              {/* Characteristics */}
              <Panel title="Characteristics" collapsible>
                <div className="chars-row">
                  {['Might','Agility','Reason','Intuition','Presence'].map(k => (
                    <div key={k} className="char-box">
                      <div className="ch-name">{k}</div>
                      <div className="ch-val">{fmt(derived.chars[k])}</div>
                    </div>
                  ))}
                </div>
                <div className="potency-row">
                  <Pill kind="muted">WEAK {derived.potency.weak}</Pill>
                  <Pill kind="muted">AVERAGE {derived.potency.average}</Pill>
                  <Pill kind="gold">STRONG {derived.potency.strong}</Pill>
                </div>
              </Panel>

              {/* Vital tiles */}
              <Panel title="Vitals" collapsible>
                <div className="grid-3" style={{gap:8}}>
                  <StatTile label="Recovery" value={derived.recoveryValue} />
                  <StatTile label="Winded" value={derived.winded} />
                  <StatTile label="Speed" value={derived.speed} />
                  <StatTile label="Stability" value={derived.stability} />
                  <StatTile label="Size" value={anc?.size || '1M'} />
                  <StatTile label="Echelon" value={derived.echelon} />
                </div>
              </Panel>

              {/* Abilities */}
              <Panel title="Abilities" collapsible>
                <div className="stack-12">
                  {signatures.map(a => (
                    <AbilityCard key={a.name} ability={a} kind="sig" />
                  ))}
                  {(benefits.classAbilities || []).map(a => (
                    <AbilityCard key={a.name} ability={a} kind="sig" />
                  ))}
                  {kitSig && (
                    <AbilityCard ability={kitSig} kind="sig" />
                  )}
                  {kitSig2 && (
                    <AbilityCard ability={kitSig2} kind="sig" />
                  )}
                  {heroic.map(a => (
                    <AbilityCard key={a.name} ability={a} kind="heroic" />
                  ))}
                  {levelAbilities.map(a => (
                    <AbilityCard key={a.name} ability={a} kind="heroic" />
                  ))}
                  {domainAbilities.map(a => (
                    <AbilityCard key={a.name} ability={a} kind="heroic" />
                  ))}
                  {aspectAction && (
                    <AbilityCard key={aspectAction.name} ability={aspectAction} kind="heroic" />
                  )}
                  {(signatures.length + heroic.length + levelAbilities.length + domainAbilities.length + (benefits.classAbilities || []).length) === 0 && (
                    <div className="empty-note">No abilities yet — this class is in basics-only mode. Use Edit to add more.</div>
                  )}
                </div>
              </Panel>

              {/* Default maneuvers — available to every creature */}
              <ManeuversPanel />
            </div>

            {/* RIGHT column */}
            <div className="play-col-r">
              {/* Conditions */}
              <Panel title="Conditions" collapsible>
                <div className="cond-grid">
                  {['Bleeding','Dazed','Frightened','Grabbed','Prone','Restrained','Slowed','Taunted','Weakened'].map(cond => {
                    const on = !!character.play.conditions[cond];
                    return (
                      <button
                        type="button"
                        key={cond}
                        className={`cond ${on ? 'on' : ''}`}
                        onClick={() => setPlay(p => ({ ...p, conditions: { ...p.conditions, [cond]: !p.conditions[cond] } }))}
                      >
                        {cond}
                      </button>
                    );
                  })}
                </div>
              </Panel>

              {/* Skills, Languages & Perk */}
              {(benefits.skills.length > 0 || benefits.languages.length > 1 || benefits.perk) && (
                <Panel title="Skills, Languages & Perk" collapsible>
                  {benefits.skills.length > 0 && (
                    <div className="trait-block">
                      <div className="trait-name">Skills</div>
                      {benefits.skills.map((s, i) => (
                        <div className="kv-row" key={i} style={{gridTemplateColumns:'110px 1fr', marginTop: i === 0 ? 4 : 6}}>
                          <span className="k">{s.source}</span><span className="v" style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-2)', lineHeight:1.5}}>{s.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="trait-block">
                    <div className="trait-name">Languages</div>
                    {benefits.languages.map((l, i) => (
                      <div className="kv-row" key={i} style={{gridTemplateColumns:'110px 1fr', marginTop: i === 0 ? 4 : 6}}>
                        <span className="k">{l.source}</span><span className="v" style={{fontFamily:'var(--serif)', fontSize:13, color:'var(--ink-2)'}}>{l.text}</span>
                      </div>
                    ))}
                  </div>
                  {benefits.perk && (
                    <div className="trait-block">
                      <div className="trait-name">Perk</div>
                      <div className="trait-text">
                        {benefits.perk.chosen
                          ? <><b style={{color:'var(--gold-2)'}}>{benefits.perk.chosen}</b> <span style={{color:'var(--ink-3)', fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em'}}>({benefits.perk.group})</span></>
                          : <><b style={{color:'var(--gold-2)'}}>{benefits.perk.group}</b> <span style={{color:'var(--ink-3)'}}>perk group</span></>}
                      </div>
                      {benefits.perk.chosen && benefits.perk.desc && (
                        <div className="trait-text" style={{marginTop: 5, color:'var(--ink-2)'}}>{benefits.perk.desc}</div>
                      )}
                      {levelUpPerks.map((lp, i) => (
                        <div className="perk-leveled" key={`${lp.level}-${lp.name}-${i}`}>
                          <div className="trait-text">
                            <b style={{color:'var(--gold-2)'}}>{lp.name}</b>{' '}
                            <span style={{color:'var(--ink-3)', fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em'}}>({lp.group})</span>
                            <span className="perk-lvl-tag">LV {lp.level}</span>
                          </div>
                          {lp.text && <div className="trait-text" style={{marginTop: 5, color:'var(--ink-2)'}}>{lp.text}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              )}

              {/* Progression — review & edit past level-up selections */}
              {progressionLevels.length > 0 && (
                <Panel title="Progression" collapsible>
                  <div className="prog-list">
                    {progressionLevels.map(lvl => {
                      const summary = summarizeLevelPicks(lvl);
                      const editable = !!(lvlData && lvlData[lvl]);
                      return (
                        <div className="prog-row" key={lvl}>
                          <div className="prog-badge">Lv {lvl}</div>
                          <div className="prog-detail">
                            {summary.length > 0 ? summary.map((s, i) => (
                              <div className="prog-pick" key={i}>
                                <span className="prog-pick-k">{s.label}</span>
                                <span className="prog-pick-v">{s.value}</span>
                              </div>
                            )) : (
                              <div className="prog-pick"><span className="prog-pick-v" style={{color:'var(--ink-3)', fontStyle:'italic'}}>No tracked choices.</span></div>
                            )}
                          </div>
                          {editable && (
                            <button type="button" className="prog-edit" onClick={() => setEditLevel(lvl)} title={`Edit Level ${lvl} selections`}>
                              EDIT
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              )}

              {/* Traits */}
              {anc && (
                <Panel title="Ancestry Traits" collapsible>
                  {(anc.signatures || [anc.signature]).map(sig => (
                    <div className="trait-block" key={sig.name}>
                      <div className="trait-name">{sig.name} <span className="sig-tag">SIG</span></div>
                      <div className="trait-text">{sig.text}</div>
                      {sig.optionChoice && (() => {
                        const norm = sig.optionChoice.options.map(o => typeof o === 'string' ? { name: o, text: null } : o);
                        const picked = (character.ancestry.sigOptions || {})[sig.name] || [];
                        const active = norm.find(o => o.name === picked[0]);
                        const setOpt = (o) => update(c => ({ ...c, ancestry: { ...c.ancestry, sigOptions: { ...(c.ancestry.sigOptions || {}), [sig.name]: [o] } } }));
                        return (
                          <>
                            <div className="sig-option-row">
                              <span className="sig-option-label">{sig.optionChoice.label}</span>
                              <select className="sig-option-select" value={picked[0] || ''} onChange={(e) => setOpt(e.target.value)}>
                                <option value="" disabled>Choose…</option>
                                {norm.map(o => <option key={o.name} value={o.name}>{o.name}</option>)}
                              </select>
                            </div>
                            {active && active.text && <div className="trait-text" style={{marginTop:6}}>{active.text}</div>}
                          </>
                        );
                      })()}
                    </div>
                  ))}
                  {(character.ancestry.traits || []).map(tn => {
                    const t = anc.traits.find(x => x.name === tn);
                    if (!t) return null;
                    return (
                      <div className="trait-block" key={tn}>
                        <div className="trait-name">{t.name} <span className="cost-tag">{t.cost} PT</span></div>
                        <div className="trait-text">{t.text}</div>
                      </div>
                    );
                  })}
                </Panel>
              )}

              {/* Class features */}
              {(benefits.features.length > 0 || levelUpFeatures.length > 0) && (
                <Panel title="Class Features" collapsible>
                  {benefits.features.map(f => (
                    <div className="trait-block" key={f.name}>
                      <div className="trait-name">{f.name}</div>
                      <div className="trait-text">{f.text}</div>
                    </div>
                  ))}
                  {levelUpFeatures.map((f, i) => (
                    <div className="trait-block" key={`lu-${f.level}-${f.name}-${i}`}>
                      <div className="trait-name">{f.name} <span className="perk-lvl-tag">LV {f.level}</span></div>
                      {f.text && <div className="trait-text">{f.text}</div>}
                    </div>
                  ))}
                </Panel>
              )}

              {/* Kit */}
              {kit && (
                <Panel title={kit2 ? 'Kits' : 'Kit'} collapsible>
                  {[kit, kit2].filter(Boolean).map((kt, i) => {
                    const b = kt.bonuses || {};
                    const sig = parseKitSig(kt.sig);
                    const meleeDmg = fmt2KitDmg(b.melee);
                    const rangedDmg = fmt2KitDmg(b.ranged);
                    return (
                    <React.Fragment key={kt.id}>
                      <div className="trait-block" style={i > 0 ? {marginTop:18, paddingTop:18, borderTop:'1px dashed var(--line)'} : undefined}>
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
                  })}
                </Panel>
              )}

              {/* Complication */}
              {comp && (
                <Panel title="Complication" collapsible>
                  <div className="trait-block">
                    <div className="trait-name">{comp.name}</div>
                    <div className="trait-text"><b style={{color:'var(--gold-2)'}}>Benefit.</b> {comp.benefit}</div>
                    <div className="trait-text"><b style={{color:'var(--rubric-2)'}}>Drawback.</b> {comp.drawback}</div>
                  </div>
                </Panel>
              )}
            </div>
          </div>

          <div style={{padding:'20px 0 40px', textAlign:'center'}}>
            <GlyphRow>✠ · ❦ · ✠ · ❦ · ✠</GlyphRow>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal open={bioOpen} onClose={() => setBioOpen(false)} title="Biography" width={620}
        footer={<Button kind="primary" onClick={() => setBioOpen(false)}>CLOSE</Button>}>
        <BiographyContent character={character} />
      </Modal>

      <LevelUpFlow
        open={levelUpOpen}
        onClose={() => setLevelUpOpen(false)}
        character={character}
        update={update}
      />

      <LevelUpFlow
        open={editLevel != null}
        editLevel={editLevel}
        onClose={() => setEditLevel(null)}
        character={character}
        update={update}
      />

      <RulesGlossary open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}

function fmt(n) { return n == null ? '—' : (n > 0 ? '+' + n : n); }

function VitalGauge({ label, value, max, winded, accent, onAdj, onSet }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const inputRef = React.useRef(null);

  const beginEdit = () => {
    if (!onSet) return;
    setDraft(String(value));
    setEditing(true);
  };
  const commit = () => {
    const n = parseInt(draft, 10);
    if (!isNaN(n)) onSet(Math.max(0, n));
    setEditing(false);
  };
  React.useEffect(() => {
    if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [editing]);

  return (
    <div className="vital">
      <div className="vital-head">
        <div className="vital-lbl">{label}</div>
        <div className="vital-num">
          {editing ? (
            <input
              ref={inputRef}
              className="vital-edit"
              type="number"
              min="0"
              max={max}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                else if (e.key === 'Escape') setEditing(false);
              }}
            />
          ) : (
            <span
              className={onSet ? 'vital-cur editable' : 'vital-cur'}
              style={{color: accent, fontWeight: 700}}
              onClick={beginEdit}
              title={onSet ? 'Click to edit' : undefined}
            >{value}</span>
          )}
          <span className="muted"> / {max}</span>
        </div>
      </div>
      <div className="vital-bar">
        <div className="vital-fill" style={{width: pct + '%', background: accent, boxShadow: `0 0 12px ${accent}`}}></div>
        {winded && <div className="winded-mark" style={{left: `${(winded / max) * 100}%`}} title={`Winded at ${winded}`}></div>}
      </div>
      <div className="vital-ctl">
        <button onClick={() => onAdj(-5)}>−5</button>
        <button onClick={() => onAdj(-1)}>−1</button>
        <button onClick={() => onAdj(+1)}>+1</button>
        <button onClick={() => onAdj(+5)}>+5</button>
      </div>
    </div>
  );
}

// Show a kit's damage triple, collapsing uniform triples ("+2/+2/+2" → "+2") and
// keeping tier-varied ones ("+0/+0/+4") intact. Returns null for empty/"—".
function fmt2KitDmg(v) {
  if (!v || v === '\u2014') return null;
  const m = String(v).match(/^([+-]?\d+)\/([+-]?\d+)\/([+-]?\d+)$/);
  if (m && m[1] === m[2] && m[2] === m[3]) return m[1];
  return v;
}

function CounterBox({ label, value, total, onPlus, onMinus }) {
  return (
    <div className="counter">
      <div className="cnt-lbl">{label}</div>
      <div className="cnt-val">{value}{total != null && <span className="cnt-tot"> / {total}</span>}</div>
      <div className="cnt-ctl">
        <button onClick={onMinus}>−</button>
        <button onClick={onPlus}>+</button>
      </div>
    </div>
  );
}

function Panel({ title, children, collapsible, defaultCollapsed = false }) {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
  if (!collapsible) {
    return (
      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">{title}</div>
          <div className="panel-orn">❦</div>
        </div>
        <div className="panel-body">{children}</div>
      </div>
    );
  }
  return (
    <div className={`panel ${collapsed ? 'collapsed' : ''}`}>
      <button
        type="button"
        className="panel-head panel-head-btn"
        onClick={() => setCollapsed(c => !c)}
        aria-expanded={!collapsed}
      >
        <div className="panel-title">{title}</div>
        <div className={`panel-chevron ${collapsed ? 'down' : 'up'}`} aria-hidden="true">▾</div>
      </button>
      {!collapsed && <div className="panel-body">{children}</div>}
    </div>
  );
}

function BiographyContent({ character }) {
  const id = character.identity || {};
  const car = careerDef(character);
  return (
    <div className="stack-12">
      <div style={{textAlign:'center'}}>
        <div className="h2-display">{id.name || 'Unnamed'}</div>
        <div style={{fontFamily:'var(--hand)', fontStyle:'italic', color:'var(--gold-2)', fontSize:15, marginTop:6}}>{id.pronouns}</div>
      </div>
      <OrnDivider glyph="✠" size="small" />
      <div className="grid-3" style={{gap: 10}}>
        {id.age && <StatTile label="Age" value={id.age} />}
        {id.height && <StatTile label="Height" value={id.height} />}
        {id.weight && <StatTile label="Weight" value={id.weight} />}
      </div>
      {id.deity && <Pill kind="gold">DEITY · {id.deity}</Pill>}
      {id.appearance && (
        <div>
          <H4Meta>Appearance</H4Meta>
          <div style={{fontFamily:'var(--serif)', fontSize:14, color:'var(--ink-2)', lineHeight:1.55}}>{id.appearance}</div>
        </div>
      )}
      {id.backstory && (
        <div>
          <H4Meta>Backstory</H4Meta>
          <div style={{fontFamily:'var(--serif)', fontSize:14, color:'var(--ink-2)', lineHeight:1.55, whiteSpace:'pre-wrap'}}>{id.backstory}</div>
        </div>
      )}
      {car && character.career.incident && (
        <div>
          <H4Meta>Inciting Incident</H4Meta>
          <div style={{fontFamily:'var(--display-2)', fontSize:13, color:'var(--ink)', fontWeight:600, letterSpacing:'0.12em'}}>{character.career.incident}</div>
        </div>
      )}
      {character.career.taken && (
        <div>
          <H4Meta>What Was Taken</H4Meta>
          <div style={{fontFamily:'var(--serif)', fontSize:14, color:'var(--ink-2)', lineHeight:1.55, fontStyle:'italic'}}>{character.career.taken}</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL UP MODAL
// ─────────────────────────────────────────────────────────────────────────────
function LevelUpModal({ open, onClose, character, update }) {
  const cls = classDef(character);
  const nextLevel = character.level + 1;
  const maxLevel = 10;

  if (!open || nextLevel > maxLevel) {
    return (
      <Modal open={open && nextLevel > maxLevel} onClose={onClose} title="The Apex"
        footer={<Button kind="primary" onClick={onClose}>CLOSE</Button>}>
        <div style={{textAlign:'center'}}>
          <GlyphRow>✠ · ❦ · ✠</GlyphRow>
          <div style={{fontFamily:'var(--hand)', fontStyle:'italic', fontSize:18, color:'var(--ink-2)', marginTop:14, lineHeight:1.5}}>
            You stand at the height of mortal power. There are no more rungs to climb — only legends to write.
          </div>
        </div>
      </Modal>
    );
  }

  const benefitsAtLevel = computeLevelUpBenefits(character, nextLevel);

  const apply = () => {
    update(c => {
      const next = { ...c, level: nextLevel };
      // Apply characteristic increases
      if (benefitsAtLevel.charIncrease) {
        const chars = { ...next.cclass.characteristics };
        // +1 to each characteristic (Draw Steel granularly handled per class — we apply +1 to top 3)
        const sorted = Object.entries(chars).sort((a,b) => b[1] - a[1]).slice(0, 3);
        sorted.forEach(([k]) => { chars[k] = (chars[k] || 0) + 1; });
        next.cclass = { ...next.cclass, characteristics: chars };
      }
      // Stamina is recomputed via computeDerived; restore current play stamina to max for fresh level
      next.play = { ...next.play, stamina: null };
      return next;
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Level ${nextLevel}`} width={680}
      footer={(
        <>
          <Button kind="ghost" onClick={onClose}>NOT YET</Button>
          <Button kind="primary" onClick={apply}>ASCEND ▲</Button>
        </>
      )}>
      <div className="stack-16">
        <div style={{textAlign:'center'}}>
          <div style={{fontFamily:'var(--hand)', fontStyle:'italic', fontSize:18, color:'var(--gold-2)', lineHeight: 1.5, maxWidth: 480, margin: '0 auto'}}>
            "Your Victories carry you to a new rung of power. Take a breath. The world has shifted."
          </div>
        </div>
        <OrnDivider glyph={`Lv ${character.level}  →  Lv ${nextLevel}`} size="small" />

        <H3>What you gain</H3>

        <div className="stack-12">
          <BenefitRow icon="⌬" title="Stamina" body={
            cls ? `+${cls.starting.staminaPer} maximum Stamina. (Total: ${cls.starting.stamina1 + (nextLevel - 1) * cls.starting.staminaPer})` : '—'
          } />

          {benefitsAtLevel.charIncrease && (
            <BenefitRow icon="✦" title="Characteristic Increase" body="Your three highest characteristics each gain +1." />
          )}
          {benefitsAtLevel.newAbility && (
            <BenefitRow icon="✠" title="New Heroic Ability" body={`You unlock a new ${benefitsAtLevel.newAbility.cost}-${cls?.resource || 'resource'} ability. Pick one when next you train.`} />
          )}
          {benefitsAtLevel.perk && (
            <BenefitRow icon="❦" title="Perk" body="Choose a new perk from your class's available categories." />
          )}
          {benefitsAtLevel.skill && (
            <BenefitRow icon="✚" title="Skill Increase" body="Gain an additional skill of your choice." />
          )}
          {benefitsAtLevel.subclassFeature && (
            <BenefitRow icon="◈" title={`${cls?.subclassName || 'Subclass'} Feature`} body="Your subclass grants you a new feature at this level." />
          )}
        </div>

        <div className="orn-frame" style={{padding: '14px 18px'}}>
          <H4Meta>Note</H4Meta>
          <div style={{fontFamily:'var(--serif)', fontSize:13.5, color:'var(--ink-2)', lineHeight:1.55}}>
            This prototype applies Stamina and characteristic increases mechanically. Other choices (new ability picks, perk selections, subclass features) should be made with your Director and recorded by hand — full level-up flows arrive in a future chapter.
          </div>
        </div>
      </div>
    </Modal>
  );
}

function BenefitRow({ icon, title, body }) {
  return (
    <div style={{display:'grid', gridTemplateColumns:'40px 1fr', gap: 14, alignItems:'flex-start'}}>
      <div style={{width:36, height:36, border:'1px solid var(--gold)', display:'grid', placeItems:'center', fontFamily:'var(--display)', fontSize:18, color:'var(--gold)'}}>{icon}</div>
      <div>
        <div style={{fontFamily:'var(--display-2)', fontSize:13, fontWeight:700, letterSpacing:'0.16em', color:'var(--ink)'}}>{title.toUpperCase()}</div>
        <div style={{fontFamily:'var(--serif)', fontSize:14, color:'var(--ink-2)', lineHeight:1.55, marginTop: 4}}>{body}</div>
      </div>
    </div>
  );
}

function computeLevelUpBenefits(character, nextLevel) {
  // Simplified — based on common Draw Steel patterns from the censor/conduit/fury tables.
  return {
    charIncrease: [4,7,10].includes(nextLevel),
    perk: [2,4,6,8,10].includes(nextLevel),
    skill: [4,7,10].includes(nextLevel),
    subclassFeature: [2,3,5,7,8].includes(nextLevel),
    newAbility: nextLevel === 3 ? { cost: 7 } : nextLevel === 5 ? { cost: 9 } : nextLevel === 8 ? { cost: 11 } : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PlayView CSS
// ─────────────────────────────────────────────────────────────────────────────
const PLAY_CSS = `
.play {
  position: relative; z-index: 2; width: 100%; height: 100%;
  display: grid; grid-template-rows: auto 1fr; overflow: hidden;
}
.play-top {
  display: grid; grid-template-columns: 1fr auto 1fr;
  align-items: center; padding: 14px 28px;
  border-bottom: 1px solid var(--line);
  background: var(--surface-top); backdrop-filter: blur(6px);
}
.play-top .left, .play-top .right { display: flex; align-items: center; gap: 12px; }
.play-top .right { justify-content: flex-end; }
.play-top .center { display: flex; justify-content: center; }

.brand-mark { display: flex; align-items: center; gap: 11px; }
.brand-mark .brand-glyph {
  font-family: var(--display); font-size: 22px; color: var(--gold);
  width: 40px; height: 40px; display: grid; place-items: center;
  border: 1px solid var(--gold-deep); background: var(--surface-vital, rgba(176,138,72,0.05));
}
.brand-mark .brand-name { font-family: var(--display); font-size: 16px; letter-spacing: 0.24em; color: var(--gold-2); white-space: nowrap; }
.brand-mark .brand-sub { font-family: var(--mono); font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-3); margin-top: 2px; }

.hero-masthead {
  display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 22px;
  border: 1px solid var(--gold-deep);
  background: linear-gradient(100deg, var(--surface-fade-b), rgba(7,9,28,0.35));
  padding: 18px 24px; margin-bottom: 24px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 6px 30px rgba(0,0,0,0.45);
}
.hb-portrait {
  width: 96px; height: 96px; flex: none;
  border: 1px solid var(--gold); background: linear-gradient(135deg, var(--bg-2), var(--bg-3));
  background-size: cover; background-position: center top;
  display: grid; place-items: center;
  box-shadow: 0 0 22px var(--gold-glow), inset 0 0 0 1px rgba(0,0,0,0.5);
}
.hb-portrait .hb-glyph { font-family: var(--display); font-size: 46px; color: var(--gold); opacity: 0.45; }
.hb-eyebrow { font-family: var(--mono); font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase; color: var(--gold-2); margin-bottom: 6px; }
.hb-name { font-family: var(--display); font-size: 40px; line-height: 1; letter-spacing: 0.04em; color: var(--ink); text-wrap: balance; }
.hb-meta { font-family: var(--display-2); font-size: 15px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-2); margin-top: 10px; }
.hb-meta .hb-sub { color: var(--gold-2); }
.hb-level { text-align: center; flex: none; padding-left: 22px; border-left: 1px solid var(--line-2); }
.hb-level-num { font-family: var(--display); font-size: 46px; line-height: 1; color: var(--gold-2); }
.hb-level-lbl { font-family: var(--mono); font-size: 9px; letter-spacing: 0.28em; text-transform: uppercase; color: var(--ink-3); margin-top: 4px; }

.play-body {
  position: relative; overflow-y: auto;
}
.play-bg {
  position: absolute; inset: 0; pointer-events: none;
  background-size: cover; background-position: center top; opacity: 0.8;
}
.play-bg::after {
  content: ''; position: absolute; inset: 0;
  background:
    linear-gradient(180deg,
      rgba(8,8,10, calc(0.72 * var(--surface-alpha, 1))) 0%,
      rgba(8,8,10, calc(0.80 * var(--surface-alpha, 1))) 50%,
      rgba(8,8,10, calc(0.92 * var(--surface-alpha, 1))) 90%,
      var(--bg-0) 100%);
}
.play-content {
  position: relative; z-index: 2;
  max-width: 1320px; margin: 0 auto; padding: 28px 32px;
}

.vitals {
  display: grid; grid-template-columns: 2fr 2fr 1fr 1fr 1fr 1fr; gap: 12px;
  margin-bottom: 24px;
}
/* Read-only viewer (not owner/director/admin): the session trackers are inert. The
   underlying update is already a no-op; this makes the controls look non-interactive. */
.play-readonly .vitals button,
.play-readonly .vitals input { pointer-events: none; opacity: 0.5; }
.play-readonly-tag {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--ink-3); border: 1px solid var(--line-2); border-radius: 3px;
  padding: 4px 8px; margin-right: 6px; white-space: nowrap;
}
.vital {
  border: 1px solid var(--gold);
  background: var(--surface-vital);
  padding: 12px 14px;
}
.vital-head { display: flex; justify-content: space-between; align-items: baseline; }
.vital-lbl { font-family: var(--mono); font-size: 10px; color: var(--ink-3); letter-spacing: 0.22em; text-transform: uppercase; }
.vital-num { font-family: var(--display); font-size: 22px; color: var(--ink); }
.vital-num .muted { color: var(--ink-3); font-weight: 400; }
.vital-cur.editable { cursor: text; border-bottom: 1px dashed transparent; transition: border-color .15s; }
.vital-cur.editable:hover { border-bottom-color: var(--gold-deep); }
.vital-edit {
  width: 2.6em; font-family: var(--display); font-size: 22px; line-height: 1;
  color: var(--ink); background: rgba(0,0,0,0.45); border: 1px solid var(--gold-deep);
  text-align: right; padding: 0 2px; -moz-appearance: textfield;
}
.vital-edit:focus { outline: none; border-color: var(--gold); box-shadow: 0 0 10px var(--gold-glow); }
.vital-edit::-webkit-outer-spin-button, .vital-edit::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.vital-bar { height: 10px; background: rgba(0,0,0,0.4); border: 1px solid var(--line); margin-top: 6px; position: relative; }
.vital-fill { height: 100%; transition: width .3s; }
.winded-mark { position: absolute; top: -2px; bottom: -2px; width: 1px; background: var(--rubric); box-shadow: 0 0 6px var(--rubric); }
.vital-ctl { display: flex; gap: 4px; margin-top: 8px; }
.vital-ctl button {
  flex: 1; padding: 5px 0; background: var(--bg-2); border: 1px solid var(--line-2);
  color: var(--ink-2); font-family: var(--mono); font-size: 11px; font-weight: 600;
  cursor: pointer; letter-spacing: 0.06em;
}
.vital-ctl button:hover { border-color: var(--gold); color: var(--ink); }

.counter {
  border: 1px solid var(--line-2);
  background: var(--surface-counter);
  padding: 12px 14px; display: flex; flex-direction: column;
  align-items: center; text-align: center;
}
.cnt-lbl { font-family: var(--mono); font-size: 10px; color: var(--ink-3); letter-spacing: 0.22em; text-transform: uppercase; }
.cnt-val { font-family: var(--display); font-size: 26px; color: var(--gold-2); margin: 4px 0 6px; font-weight: 700; }
.cnt-tot { font-size: 14px; color: var(--ink-3); font-weight: 400; }
.cnt-ctl { display: flex; gap: 4px; margin-top: auto; width: 100%; }
.cnt-ctl button {
  flex: 1; padding: 5px 0; background: var(--bg-2); border: 1px solid var(--line-2);
  color: var(--ink-2); font-family: var(--mono); font-size: 13px; cursor: pointer;
}
.cnt-ctl button:hover { border-color: var(--gold); color: var(--ink); }

.play-grid {
  display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px;
}
.play-col-l, .play-col-r { display: flex; flex-direction: column; gap: 18px; }

.panel {
  border: 1px solid var(--line-2);
  background: var(--surface-panel); backdrop-filter: blur(4px);
}
.panel-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 18px; border-bottom: 1px solid var(--line);
  background: linear-gradient(90deg, var(--tint-accent), transparent);
}
.panel-title { font-family: var(--display-2); font-size: 13px; font-weight: 700; letter-spacing: 0.24em; color: var(--gold-2); text-transform: uppercase; }
.panel-orn { font-family: var(--display); font-size: 14px; color: var(--gold); opacity: 0.5; }
.panel-body { padding: 16px 18px; }
.panel-head-btn {
  appearance: none; -webkit-appearance: none; background: linear-gradient(90deg, var(--tint-accent), transparent);
  border: 0; border-bottom: 1px solid var(--line); width: 100%; cursor: pointer;
  font: inherit; color: inherit; text-align: left;
}
.panel-head-btn:hover { background: linear-gradient(90deg, var(--tint-accent-strong, var(--tint-accent)), transparent); }
.panel-head-btn:hover .panel-chevron { color: var(--gold-2); opacity: 1; }
.panel-head-btn:focus-visible { outline: 1px solid var(--gold); outline-offset: -2px; }
.panel.collapsed { padding-bottom: 0; }
.panel.collapsed .panel-head, .panel.collapsed .panel-head-btn { border-bottom: 0; }
.panel-chevron {
  font-family: var(--display); font-size: 14px; color: var(--gold); opacity: 0.55;
  transition: transform 180ms ease, opacity 180ms ease, color 180ms ease;
  line-height: 1;
}
.panel-chevron.down { transform: rotate(0deg); }
.panel-chevron.up { transform: rotate(180deg); }

.chars-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.char-box { border: 1px solid var(--line-2); background: var(--bg-2); padding: 10px 6px; text-align: center; }
.ch-name { font-family: var(--mono); font-size: 9px; color: var(--ink-3); letter-spacing: 0.22em; text-transform: uppercase; }
.ch-val { font-family: var(--display); font-size: 32px; font-weight: 700; color: var(--ink); margin-top: 6px; }
.potency-row { display: flex; gap: 6px; margin-top: 12px; flex-wrap: wrap; }

.empty-note { font-family: var(--hand); font-style: italic; color: var(--ink-3); font-size: 14px; padding: 14px; text-align: center; }

.cond-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.cond {
  font-family: var(--mono); font-size: 10px; padding: 8px 6px;
  background: var(--bg-2); border: 1px solid var(--line-2); color: var(--ink-2);
  cursor: pointer; letter-spacing: 0.18em; text-transform: uppercase;
  transition: all .12s;
}
.cond:hover { border-color: var(--line-strong); }
.cond.on { background: var(--rubric); border-color: var(--rubric); color: #fff; box-shadow: 0 0 10px var(--rubric-glow); }

.trait-block { padding: 10px 0; border-bottom: 1px dashed var(--line); }
.trait-block:last-child { border-bottom: none; padding-bottom: 0; }
.trait-block:first-child { padding-top: 0; }
.perk-leveled { margin-top: 10px; padding-top: 10px; border-top: 1px dotted var(--line); }
.perk-lvl-tag {
  display: inline-block; margin-left: 8px; vertical-align: middle;
  font-family: var(--mono); font-size: 9px; letter-spacing: 0.16em;
  color: var(--gold-2); border: 1px solid var(--line-2); border-radius: 2px;
  padding: 2px 6px; line-height: 1;
}
.trait-name {
  font-family: var(--display-2); font-size: 13px; font-weight: 700; letter-spacing: 0.14em;
  color: var(--ink); display: flex; align-items: center; gap: 8px; text-transform: uppercase;
}
.sig-tag, .cost-tag {
  font-family: var(--mono); font-size: 9px; padding: 2px 6px;
  border: 1px solid var(--gold); color: var(--gold-2); letter-spacing: 0.18em;
  text-transform: uppercase; font-weight: 500;
}
.cost-tag { border-color: var(--line-2); color: var(--ink-3); }
.trait-text { font-family: var(--serif); font-size: 13.5px; color: var(--ink-2); line-height: 1.55; margin-top: 6px; }
.sig-option-row { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
.sig-option-label { font-family: var(--mono); font-size: 9.5px; color: var(--ink-3); letter-spacing: 0.18em; text-transform: uppercase; }
.sig-option-select {
  font-family: var(--display-2); font-size: 12.5px; font-weight: 700; letter-spacing: 0.08em;
  color: var(--gold-2); background: var(--panel, transparent); border: 1px solid var(--gold);
  padding: 5px 10px; cursor: pointer; text-transform: uppercase;
}
.sig-option-select:focus { outline: none; border-color: var(--gold-2); }
.kit-meta-line { font-family: var(--mono); font-size: 9.5px; color: var(--gold-2); letter-spacing: 0.16em; text-transform: uppercase; margin-top: 5px; }

/* Progression panel */
.prog-list { display: flex; flex-direction: column; gap: 12px; }
.prog-row {
  display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: start;
  padding: 12px 0; border-bottom: 1px dashed var(--line);
}
.prog-row:last-child { border-bottom: none; padding-bottom: 0; }
.prog-row:first-child { padding-top: 0; }
.prog-badge {
  font-family: var(--display); font-size: 13px; letter-spacing: 0.06em;
  color: var(--gold-2); border: 1px solid var(--line-2); border-radius: 2px;
  padding: 4px 8px; white-space: nowrap; line-height: 1;
}
.prog-detail { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.prog-pick { display: flex; flex-direction: column; gap: 1px; }
.prog-pick-k {
  font-family: var(--mono); font-size: 9px; letter-spacing: 0.2em;
  text-transform: uppercase; color: var(--ink-3);
}
.prog-pick-v { font-family: var(--serif); font-size: 13px; color: var(--ink); line-height: 1.4; }
.prog-edit {
  font-family: var(--mono); font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--ink-2); background: transparent; border: 1px solid var(--line-2);
  border-radius: 2px; padding: 5px 10px; cursor: pointer; white-space: nowrap;
  transition: border-color .12s, color .12s, box-shadow .12s;
}
.prog-edit:hover { color: var(--gold-2); border-color: var(--gold); box-shadow: 0 0 12px var(--gold-glow); }
.kv-row { display: grid; grid-template-columns: 120px 1fr 120px 1fr; gap: 4px 12px; align-items: baseline; font-family: var(--mono); font-size: 11px; }
.kv-row .k { color: var(--ink-3); letter-spacing: 0.18em; font-size: 10px; text-transform: uppercase; }
.kv-row .v { color: var(--ink); }
`;

const PlayStyles = () => React.createElement('style', {}, PLAY_CSS);

Object.assign(window, { PlayView });
export { PlayView };
