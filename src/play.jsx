import React from 'react';
import { OrnDivider, GlyphRow, renderGlyph, renderRich, Pill, SavePill, Button, TopBar, H3, H4Meta, StatTile, Modal, AbilityCard } from './theme.jsx';
import { heroName } from './campaigns.jsx';
import { ManeuversPanel, RulesGlossary } from './rules.jsx';
import { LevelUpFlow, LevelUpStyles, LEVELUP_DATA, collectLevelUpFeatures } from './levelup.jsx';
import { DOMAIN_2_ABILITIES } from './data/conduit-domains.js';
import { classDef, ancestryDef, kitDef, kit2Def, careerDef, complicationDef, computeDerived, summarizeBenefits, collectDistanceBonuses, applyDistanceBonuses } from './app.jsx';
import { PERKS, kitSigAbility, normalizeAbilityTiers } from './wizard/helpers.js';
import { SheetStyles, AncestryTraitsList, KitDetails } from './theme/sheet.jsx';
import { Tabs, TabPanel, TabsStyles } from './theme/tabs.jsx';
import { characterToFoundryHero, downloadJson, loadOfficialIndex } from './foundry-export.js';
import { DS } from './backend.jsx';
import { MQ } from './theme/breakpoints.js';
// play.jsx — Play view (at-the-table digital sheet) + Level-up modal.

// Hooks used bare in this file (see note in wizard.jsx) — provide them under ES modules.
const { useState, useEffect } = React;

// Sheet tabs. The active tab is a per-device, per-hero UI preference, so it
// lives in localStorage under the session prefix (same convention as LS_VIEW).
const PLAY_TABS = [
  { id: 'character', label: 'Character', glyph: '✠' },
  { id: 'combat', label: 'Combat', glyph: '⚔' },
  { id: 'progression', label: 'Progression', glyph: '▲' },
];
const tabKey = (heroId) => `${DS.K.session}/playTab/${heroId}`;

// Phone-only overflow menu for the top bar, which cannot fit six buttons on a
// narrow screen. CSS shows this and hides the .collapsible buttons below the
// breakpoint, and the reverse above it. Modelled on AccountMenu in auth.jsx.
function TopBarMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);

  useEffect(() => {
    if (!open) return;
    // pointerdown covers mouse, touch and pen in one listener.
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="pt-menu-wrap" ref={ref}>
      <button type="button" className="pt-menu-btn" aria-label="More actions"
              aria-haspopup="menu" aria-expanded={open}
              onClick={() => setOpen(o => !o)}>⋯</button>
      {open && (
        <div className="pt-menu" role="menu">
          {items.map(a => (
            <button key={a.id} type="button" role="menuitem" className="pt-menu-item"
                    /* close first, so an action that opens a modal does not leave
                       the dropdown live underneath it */
                    onClick={() => { setOpen(false); a.onClick(); }}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PlayView({ character, update, onExit, onEdit, canEdit = true, saveState = null, owner = null, onError = () => {} }) {
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

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const v = localStorage.getItem(tabKey(character.id));
      return PLAY_TABS.some(t => t.id === v) ? v : 'character';
    } catch { return 'character'; }
  });
  useEffect(() => {
    try { localStorage.setItem(tabKey(character.id), activeTab); } catch {}
  }, [activeTab, character.id]);

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

  // Named so the top-bar action list can reference it from one place. Closes over
  // the local heroName above, which shadows the campaigns.jsx import of the same name.
  const exportFoundry = async () => {
    try {
      // Official compendium index (null → generated-item fallback).
      const idx = await loadOfficialIndex();
      const file = heroName.trim().replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'hero';
      downloadJson(characterToFoundryHero(character, idx), `${file}-foundryvtt.json`);
    } catch (err) {
      console.error('[foundry-export]', err);
      onError('EXPORT FAILED — NO FOUNDRY FILE WAS SAVED');
    }
  };

  // Ability collections. Keyword-gated distance bonuses (Acolyte of the Mystery,
  // Prayer/Enchantment of Distance, …) apply to every card except kit signatures,
  // whose printed strings already carry the kit's distance bonus.
  const distBonuses = collectDistanceBonuses(character);
  const boost = (a) => applyDistanceBonuses(a, distBonuses);
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
  const kitSig = kit ? kitSigAbility(kit) : null;
  const kitSig2 = kit2 ? kitSigAbility(kit2) : null;

  // Conduit domain ability (chosen at creation), normalized for AbilityCard.
  const domainAbilities = [];
  if (character.cclass.domainAbility) {
    const da = character.cclass.domainAbility;
    const found = (DOMAIN_2_ABILITIES[da.domain] || []).find(a => a.name === da.name);
    if (found) domainAbilities.push(normalizeAbilityTiers(found, 'I'));
  }

  // Abilities learned via level-up flow (stored in cclass.levelAbilities[level])
  const levelAbilities = [];
  const la = character.cclass.levelAbilities || {};
  for (const lvl of Object.keys(la).sort((a, b) => +a - +b)) {
    for (const a of (la[lvl] || [])) {
      levelAbilities.push(normalizeAbilityTiers(a, a.resource === 'Piety' ? 'I' : 'M'));
    }
  }

  // Progression history — levels the player has resolved choices for, newest first.
  const levelChoiceMap = character.levelChoices || {};
  const lvlData = cls ? (LEVELUP_DATA[cls.id] || null) : null;
  const progressionLevels = Object.keys(levelChoiceMap)
    .map(Number)
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b);

  // Build a readable list of {label, value, kind} for a stored level's picks.
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
      out.push({ label: ch.label, value, kind: ch.kind, text: p.chosenText || null });
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
      if (!text && PERKS[group]) {
        const found = PERKS[group].find(x => x.name === p.chosen);
        if (found) text = found.text;
      }
      levelUpPerks.push({ level: lvl, name: p.chosen, group, text });
    }
  }

  // Class features gained through level-ups (shared collector — also feeds the export).
  const levelUpFeatures = collectLevelUpFeatures(character);

  // Abilities panel groups, in Draw Steel reading order. Kit signatures skip
  // boost() — their printed strings already carry the kit's distance bonus.
  const abilityGroups = [
    { label: 'Signature', items: signatures, kind: 'sig' },
    kit && kitSig && { label: `Kit — ${kit.name}`, items: [kitSig], kind: 'sig', noBoost: true },
    kit2 && kitSig2 && { label: `Kit — ${kit2.name}`, items: [kitSig2], kind: 'sig', noBoost: true },
    { label: 'Heroic', items: heroic, kind: 'heroic' },
    { label: 'Class & Subclass', items: benefits.classAbilities || [], kind: 'sig' },
    { label: 'Ancestry', items: benefits.ancestryAbilities || [], kind: 'sig' },
    { label: 'Domain', items: domainAbilities, kind: 'heroic' },
    { label: 'Learned by Level-Up', items: levelAbilities, kind: 'heroic' },
  ].filter(g => g && g.items.length > 0);

  // One Progression-tab row per level, merging the pick log with the perks,
  // features and abilities that level granted (each shown in full on its own
  // tab — the timeline answers "what did I get at level N?" in one place).
  // Picks of those kinds are filtered out so nothing is listed twice.
  const timelineFor = (lvl) => ({
    picks: summarizeLevelPicks(lvl).filter(s => !['perk', 'feature', 'ability'].includes(s.kind)),
    perks: levelUpPerks.filter(p => p.level === lvl),
    features: levelUpFeatures.filter(f => f.level === lvl),
    abilities: ((character.cclass.levelAbilities || {})[lvl] || []).map(a => ({ name: a.name, text: a.flavor || a.effect || null })),
  });

  // Single source of truth for the top-bar actions. `pinned` entries stay visible
  // on phones; the rest collapse into the ⋯ menu. Both renderers below map this
  // same array, so the handlers are shared by reference rather than duplicated.
  const topActions = [
    { id: 'rules', label: 'RULES', onClick: () => setRulesOpen(true) },
    { id: 'bio', label: 'BIOGRAPHY', onClick: () => setBioOpen(true) },
    { id: 'export', label: 'EXPORT', onClick: exportFoundry,
      title: 'Download as a FoundryVTT (Draw Steel system) actor file' },
    canEdit && onEdit && { id: 'edit', label: 'EDIT', onClick: onEdit },
    canEdit && { id: 'levelup', label: 'LEVEL UP ▲', kind: 'primary', pinned: true,
      onClick: () => setLevelUpOpen(true) },
    { id: 'exit', label: '◂ ROSTER', onClick: onExit },
  ].filter(Boolean);

  return (
    <div className={`play${canEdit ? '' : ' play-readonly'}`}>
      <PlayStyles />
      <SheetStyles />
      <LevelUpStyles />
      <TabsStyles />

      {/* Top bar */}
      <TopBar
        className="play-top"
        mark={
          <span className="tb-mark-box">
            <svg viewBox="0 0 100 100" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
              <polygon points="50,4 91,28 91,72 50,96 9,72 9,28" />
              <polygon points="50,4 73,40 50,60 27,40" />
              <path d="M9,28 L27,40 M91,28 L73,40 M50,60 L50,96 M27,40 L9,72 M73,40 L91,72 M27,40 L50,96 M73,40 L50,96" />
            </svg>
          </span>
        }
        brand="DRAW · STEEL"
        sub="Character Sheet"
        right={<>
          <SavePill saveState={saveState} />
          {!canEdit && (
            <span className="play-readonly-tag" title="Only the owner or Director can edit this hero">
              👁 Viewing{owner?.displayName ? ` · kept by ${owner.displayName}` : ''}
            </span>
          )}
          {/* Rendered twice on purpose: as buttons for wide viewports and as menu
              items for narrow ones, with CSS choosing between them. That keeps the
              breakpoint in the stylesheet only, so it cannot drift from a JS copy.
              Note the non-pinned labels therefore appear twice in the DOM — a
              getByText() query against PlayView would match both. */}
          {topActions.map(a => (
            <Button key={a.id} kind={a.kind || 'ghost'} small title={a.title}
                    className={a.pinned ? undefined : 'collapsible'} onClick={a.onClick}>
              {a.label}
            </Button>
          ))}
          <TopBarMenu items={topActions.filter(a => !a.pinned)} />
        </>}
      />

      <div className="play-bg" style={cls ? { backgroundImage: `url(${cls.img})` } : {}}></div>

      {/* Pinned region — masthead, vitals and the tab strip stay visible while
          the active tab's content scrolls beneath. */}
      <div className="play-pinned">
        <div className="play-pinned-inner">
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
              accent="var(--tier3-t)"
              onAdj={canEdit ? adjStamina : null}
              onSet={canEdit ? setStamina : null}
            />
            <VitalGauge
              label={cls?.resource || 'Resource'}
              value={character.play.resource || 0}
              max={12}
              accent="var(--gold)"
              onAdj={canEdit ? adjResource : null}
              onSet={canEdit ? setResource : null}
            />
            <CounterBox label="Recoveries" value={(derived.recoveries || 0) - (character.play.recoveriesUsed || 0)} total={derived.recoveries} onPlus={canEdit ? () => setPlay(p => ({ ...p, recoveriesUsed: Math.max(0, (p.recoveriesUsed || 0) - 1) })) : null} onMinus={canEdit ? () => setPlay(p => ({ ...p, recoveriesUsed: Math.min(derived.recoveries, (p.recoveriesUsed || 0) + 1) })) : null} />
            <CounterBox label="Surges" value={character.play.surges || 0} onPlus={canEdit ? () => adjSurges(1) : null} onMinus={canEdit ? () => adjSurges(-1) : null} />
            <CounterBox label="Victories" value={character.play.victories || 0} onPlus={canEdit ? () => adjVictories(1) : null} onMinus={canEdit ? () => adjVictories(-1) : null} />
            <CounterBox label="Hero Tokens" value={character.play.heroTokens || 0} onPlus={canEdit ? () => adjHero(1) : null} onMinus={canEdit ? () => adjHero(-1) : null} />
          </div>

          {/* Conditions — live session toggles like the vitals, so they stay
              visible on every tab. Scrolls sideways when the row runs out. */}
          <div className="cond-strip">
            {['Bleeding','Dazed','Frightened','Grabbed','Prone','Restrained','Slowed','Taunted','Weakened'].map(cond => {
              const on = !!character.play.conditions[cond];
              return (
                <button
                  type="button"
                  key={cond}
                  className={`cond ${on ? 'on' : ''}`}
                  aria-pressed={on}
                  disabled={!canEdit}
                  onClick={() => setPlay(p => ({ ...p, conditions: { ...p.conditions, [cond]: !p.conditions[cond] } }))}
                >
                  {cond}
                </button>
              );
            })}
          </div>

          <Tabs tabs={PLAY_TABS} value={activeTab} onChange={setActiveTab} idBase="play" />
        </div>
      </div>

      {/* Body — the active tab's content. Inactive panels stay mounted (hidden)
          so panel collapse state survives tab switches. */}
      <div className="play-body">
        <div className="play-content">
          <TabPanel id="combat" idBase="play" active={activeTab === 'combat'}>
          <div className="play-grid">
            {/* LEFT column */}
            <div className="play-col-l">
              {/* Abilities, grouped by where they come from */}
              <Panel title="Abilities" collapsible>
                {abilityGroups.map(g => (
                  <div className="abil-group" key={g.label}>
                    <div className="abil-group-head">{g.label}</div>
                    <div className="stack-12">
                      {g.items.map(a => (
                        <AbilityCard key={a.name} ability={g.noBoost ? a : boost(a)} kind={g.kind} />
                      ))}
                    </div>
                  </div>
                ))}
                {abilityGroups.length === 0 && (
                  <div className="empty-note">No abilities yet — this class is in basics-only mode. Use Edit to add more.</div>
                )}
              </Panel>

            </div>

            {/* RIGHT column */}
            <div className="play-col-r">
              {/* Default maneuvers — available to every creature */}
              <ManeuversPanel />
            </div>
          </div>
          </TabPanel>

          <TabPanel id="character" idBase="play" active={activeTab === 'character'}>
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
                <div className="potency-row"
                  title={`Potency thresholds — an ability that reads "M < WEAK" compares the target's Might against your weak number (${derived.potency.weak}).`}>
                  <span>WEAK {derived.potency.weak}</span>
                  <span>AVERAGE {derived.potency.average}</span>
                  <span className="strong">STRONG {derived.potency.strong}</span>
                </div>
              </Panel>

              {/* Skills, Languages & Perk */}
              {(benefits.skills.length > 0 || benefits.languages.length > 1 || benefits.perk) && (
                <Panel title="Skills, Languages & Perk" collapsible>
                  {benefits.skills.length > 0 && (
                    <div className="trait-block">
                      <div className="trait-name">Skills</div>
                      {benefits.skills.map((s, i) => (
                        <div className="kv-row kv-src" key={i} style={{marginTop: i === 0 ? 4 : 6}}>
                          <span className="k">{s.source}</span><span className="v" style={{fontFamily:'var(--serif)', fontSize: '0.8125rem', color:'var(--ink-2)', lineHeight:1.5}}>{s.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="trait-block">
                    <div className="trait-name">Languages</div>
                    {benefits.languages.map((l, i) => (
                      <div className="kv-row kv-src" key={i} style={{marginTop: i === 0 ? 4 : 6}}>
                        <span className="k">{l.source}</span><span className="v" style={{fontFamily:'var(--serif)', fontSize: '0.8125rem', color:'var(--ink-2)'}}>{l.text}</span>
                      </div>
                    ))}
                  </div>
                  {benefits.perk && (
                    <div className="trait-block">
                      <div className="trait-name">Perk</div>
                      <div className="trait-text">
                        {benefits.perk.chosen
                          ? <><b style={{color:'var(--gold-2)'}}>{benefits.perk.chosen}</b> <span style={{color:'var(--ink-3)', fontFamily:'var(--mono)', fontSize: '0.625rem', letterSpacing:'0.18em'}}>({benefits.perk.group})</span></>
                          : <><b style={{color:'var(--gold-2)'}}>{benefits.perk.group}</b> <span style={{color:'var(--ink-3)'}}>perk group</span></>}
                      </div>
                      {benefits.perk.chosen && benefits.perk.desc && (
                        <div className="trait-text" style={{marginTop: 5, color:'var(--ink-2)', whiteSpace:'pre-line'}}>{benefits.perk.desc}</div>
                      )}
                      {levelUpPerks.map((lp, i) => (
                        <div className="perk-leveled" key={`${lp.level}-${lp.name}-${i}`}>
                          <div className="trait-text">
                            <b style={{color:'var(--gold-2)'}}>{lp.name}</b>{' '}
                            <span style={{color:'var(--ink-3)', fontFamily:'var(--mono)', fontSize: '0.625rem', letterSpacing:'0.18em'}}>({lp.group})</span>
                            <span className="perk-lvl-tag">LV {lp.level}</span>
                          </div>
                          {lp.text && <div className="trait-text" style={{marginTop: 5, color:'var(--ink-2)', whiteSpace:'pre-line'}}>{lp.text}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              )}

              {/* Class features */}
              {(benefits.features.length > 0 || levelUpFeatures.length > 0) && (
                <Panel title="Class Features" collapsible>
                  {benefits.features.map(f => (
                    <div className="trait-block" key={f.name}>
                      <div className="trait-name">{f.name}</div>
                      <div className="trait-text">{renderRich(f.text)}</div>
                    </div>
                  ))}
                  {levelUpFeatures.map((f, i) => (
                    <div className="trait-block" key={`lu-${f.level}-${f.name}-${i}`}>
                      <div className="trait-name">{f.name} <span className="perk-lvl-tag">LV {f.level}</span></div>
                      {f.text && <div className="trait-text">{renderRich(f.text)}</div>}
                    </div>
                  ))}
                </Panel>
              )}
            </div>

            {/* RIGHT column */}
            <div className="play-col-r">
              {/* Derived stat tiles */}
              <Panel title="Stats" collapsible>
                <div className="grid-3" style={{gap:8}}>
                  <StatTile label="Recovery" value={derived.recoveryValue} />
                  <StatTile label="Winded" value={derived.winded} />
                  <StatTile label="Speed" value={derived.speed} />
                  <StatTile label="Stability" value={derived.stability} />
                  <StatTile label="Disengage" value={derived.disengage} />
                  <StatTile label="Size" value={derived.size} />
                  <StatTile label="Echelon" value={derived.echelon} />
                </div>
              </Panel>

              {/* Traits */}
              {anc && (
                <Panel title="Ancestry Traits" collapsible>
                  <AncestryTraitsList character={character} update={update} interactive={canEdit} />
                </Panel>
              )}

              {/* Kit */}
              {kit && (
                <Panel title={kit2 ? 'Kits' : 'Kit'} collapsible>
                  {[kit, kit2].filter(Boolean).map((kt, i) => (
                    <KitDetails key={kt.id} kit={kt} divider={i > 0} />
                  ))}
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
          </TabPanel>

          {/* Progression — one row per level merging picks, perks, features and
              learned abilities, so "what did I get at level N?" has one answer.
              The full write-ups live on the Combat / Character tabs. */}
          <TabPanel id="progression" idBase="play" active={activeTab === 'progression'}>
          <div className="prog-timeline">
            <Panel title="Level History" collapsible>
              <div className="prog-list">
                {/* Creation row — where the hero started. */}
                <div className="prog-row">
                  <div className="prog-badge">Lv 1</div>
                  <div className="prog-detail">
                    {[
                      ['Ancestry', anc?.name],
                      ['Class', [cls?.name, subclassName].filter(Boolean).join(' · ')],
                      ['Career', car?.name],
                      ['Kit', [kit?.name, kit2?.name].filter(Boolean).join(' · ')],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div className="prog-pick" key={k}>
                        <span className="prog-pick-k">{k}</span>
                        <span className="prog-pick-v">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {progressionLevels.map(lvl => {
                  const t = timelineFor(lvl);
                  const editable = canEdit && !!(lvlData && lvlData[lvl]);
                  const rows = [
                    ...t.picks.map(s => [s.label, s.value, s.text]),
                    ...t.features.map(f => ['Feature', f.name, f.text]),
                    ...t.perks.map(p => ['Perk', p.group ? `${p.name} (${p.group})` : p.name, p.text]),
                    ...t.abilities.map(a => ['Ability', a.name, a.text]),
                  ];
                  return (
                    <div className="prog-row" key={lvl}>
                      <div className="prog-badge">Lv {lvl}</div>
                      <div className="prog-detail">
                        {rows.length > 0 ? rows.map(([k, v, text], i) => (
                          <div className="prog-pick" key={i}>
                            <span className="prog-pick-k">{k}</span>
                            <span className="prog-pick-v">{v}</span>
                            {text && <span className="prog-pick-text">{renderRich(text)}</span>}
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
                {progressionLevels.length === 0 && (
                  <div className="empty-note">No level-ups yet — LEVEL UP ▲ records each level's choices here.</div>
                )}
              </div>
            </Panel>
          </div>
          </TabPanel>

          <div style={{padding:'20px 0 40px', textAlign:'center'}}>
            <GlyphRow>✠ · ❦ · ✠ · ❦ · ✠</GlyphRow>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal open={bioOpen} onClose={() => setBioOpen(false)} title={character.identity?.name || 'Biography'} width={620}
        footer={(
          <>
            {canEdit && onEdit && (
              <Button kind="ghost" onClick={() => { setBioOpen(false); onEdit(); }}>EDIT ▸</Button>
            )}
            <div style={{ flex: 1 }}></div>
            <Button kind="primary" onClick={() => setBioOpen(false)}>CLOSE</Button>
          </>
        )}>
        <BiographyContent character={character} canEdit={canEdit && !!onEdit} />
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
  // Red is an alarm, not a theme: the bar only turns rubric at or below the
  // winded threshold (and while dying); a healthy hero reads the accent (green
  // for stamina, gold for the heroic resource).
  const hurt = winded != null && value <= winded;
  const barColor = hurt ? 'var(--rubric)' : accent;
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
              style={{color: barColor, fontWeight: 700}}
              onClick={beginEdit}
              title={onSet ? 'Click to edit' : undefined}
            >{value}</span>
          )}
          <span className="muted"> / {max}</span>
        </div>
      </div>
      <div className="vital-bar">
        <div className="vital-fill" style={{width: pct + '%', background: barColor, boxShadow: `0 0 12px ${barColor}`}}></div>
        {winded > 0 && max > 0 && <div className="winded-mark" style={{left: `${(winded / max) * 100}%`}} title={`Winded at ${winded}`}></div>}
      </div>
      <div className="vital-ctl">
        <button disabled={!onAdj} onClick={() => onAdj && onAdj(-5)}>−5</button>
        <button disabled={!onAdj} onClick={() => onAdj && onAdj(-1)}>−1</button>
        <button disabled={!onAdj} onClick={() => onAdj && onAdj(+1)}>+1</button>
        <button disabled={!onAdj} onClick={() => onAdj && onAdj(+5)}>+5</button>
      </div>
    </div>
  );
}

function CounterBox({ label, value, total, onPlus, onMinus }) {
  return (
    <div className="counter">
      <div className="cnt-lbl">{label}</div>
      <div className="cnt-val">{value}{total != null && <span className="cnt-tot"> / {total}</span>}</div>
      <div className="cnt-ctl">
        <button disabled={!onMinus} onClick={onMinus}>−</button>
        <button disabled={!onPlus} onClick={onPlus}>+</button>
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

function BiographyContent({ character, canEdit = false }) {
  const id = character.identity || {};
  const car = careerDef(character);
  // Empty fields render as muted prompts (for the hero's own keeper) instead of
  // silently vanishing — an owner shouldn't wonder whether the app lost them.
  const emptyNote = (what) => canEdit
    ? <div style={{fontFamily:'var(--hand)', fontStyle:'italic', color:'var(--ink-3)', fontSize: '0.875rem'}}>{what} not yet written — EDIT returns to the wizard.</div>
    : null;
  return (
    <div className="stack-12">
      {id.pronouns && (
        <div style={{textAlign:'center'}}>
          <div style={{fontFamily:'var(--hand)', fontStyle:'italic', color:'var(--gold-2)', fontSize: '0.9375rem'}}>{id.pronouns}</div>
        </div>
      )}
      <OrnDivider glyph="✠" size="small" />
      <div className="grid-3" style={{gap: 10}}>
        <StatTile label="Age" value={id.age || '—'} />
        <StatTile label="Height" value={id.height || '—'} />
        <StatTile label="Weight" value={id.weight || '—'} />
      </div>
      {id.deity && <Pill kind="gold">DEITY · {id.deity}</Pill>}
      {id.appearance ? (
        <div>
          <H4Meta>Appearance</H4Meta>
          <div style={{fontFamily:'var(--serif)', fontSize: '0.875rem', color:'var(--ink-2)', lineHeight:1.55}}>{id.appearance}</div>
        </div>
      ) : emptyNote('Appearance')}
      {id.backstory ? (
        <div>
          <H4Meta>Backstory</H4Meta>
          <div style={{fontFamily:'var(--serif)', fontSize: '0.875rem', color:'var(--ink-2)', lineHeight:1.55, whiteSpace:'pre-wrap'}}>{id.backstory}</div>
        </div>
      ) : emptyNote('Backstory')}
      {car && character.career.incident && (
        <div>
          <H4Meta>Inciting Incident</H4Meta>
          <div style={{fontFamily:'var(--display-2)', fontSize: '0.8125rem', color:'var(--ink)', fontWeight:600, letterSpacing:'0.12em'}}>{character.career.incident}</div>
        </div>
      )}
      {character.career.taken && (
        <div>
          <H4Meta>What Was Taken</H4Meta>
          <div style={{fontFamily:'var(--serif)', fontSize: '0.875rem', color:'var(--ink-2)', lineHeight:1.55, fontStyle:'italic'}}>{character.career.taken}</div>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// PlayView CSS
// ─────────────────────────────────────────────────────────────────────────────
const PLAY_CSS = `
.play {
  position: relative; z-index: 2; width: 100%; height: 100%;
  display: grid; grid-template-rows: auto auto 1fr; overflow: hidden;
  /* Grid and flex children default to min-width:auto, so a wide row would push
     this past the viewport and get clipped rather than fitting. */
  min-width: 0;
}
/* Bar geometry/type comes from the shared .topbar (theme/styles.js); only the
   play-specific rules (collapsible buttons, ⋯ menu, readonly tag) live here. */

/* Pinned region — its own grid row, so scrolled tab content clips beneath it.
   z-index lifts it above the fixed class-art background. min-width: 0 because,
   unlike .play-body (a scroll container, automatic minimum size 0), this item
   defaults to min-width auto — the unshrinkable vitals tiles would floor the
   shared column track past the viewport and widen every row, top bar included. */
.play-pinned { position: relative; z-index: 2; min-width: 0; }
.play-pinned-inner { max-width: 1320px; margin: 0 auto; padding: 20px 32px 0; }

.hero-masthead {
  display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 22px;
  border: 1px solid var(--gold-deep);
  background: var(--grad-masthead);
  padding: 18px 24px; margin-bottom: 14px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 6px 30px rgba(0,0,0,0.45);
}
.hb-portrait {
  width: 96px; height: 96px; flex: none;
  border: 1px solid var(--gold); background: linear-gradient(135deg, var(--bg-2), var(--bg-3));
  background-size: cover; background-position: center top;
  display: grid; place-items: center;
  box-shadow: 0 0 22px var(--gold-glow), inset 0 0 0 1px rgba(0,0,0,0.5);
}
.hb-portrait .hb-glyph { font-family: var(--display); font-size: 2.875rem; color: var(--gold); opacity: 0.45; }
.hb-eyebrow { font-family: var(--mono); font-size: var(--fs-3); letter-spacing: 0.28em; text-transform: uppercase; color: var(--gold-2); margin-bottom: 6px; }
.hb-name { font-family: var(--display); font-size: 2.5rem; line-height: 1; letter-spacing: 0.04em; color: var(--ink); text-wrap: balance; font-variant-ligatures: none; }
.hb-meta { font-family: var(--display-2); font-size: var(--fs-8); letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-2); margin-top: 10px; }
.hb-meta .hb-sub { color: var(--gold-2); }
.hb-level { text-align: center; flex: none; padding-left: 22px; border-left: 1px solid var(--line-2); }
.hb-level-num { font-family: var(--display-2); font-size: 2.875rem; line-height: 1; color: var(--gold-2); }
.hb-level-lbl { font-family: var(--mono); font-size: var(--fs-2); letter-spacing: 0.28em; text-transform: uppercase; color: var(--ink-3); margin-top: 4px; }

.play-body {
  position: relative; overflow-y: auto;
}
.play-bg {
  /* fixed, not absolute: .play-body scrolls, and the art must stay locked
     to the viewport (same pattern as the wizard's .step-bg). */
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
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
  max-width: 1320px; margin: 0 auto; padding: 20px 32px 28px;
}

.vitals {
  /* The 2:2:1:1:1:1 ratio only holds with minmax(0, …); bare fr units floor each
     track at its content and the gauges stop being twice the width of a tile. */
  display: grid; gap: 12px; margin-bottom: 14px;
  grid-template-columns: minmax(0, 2fr) minmax(0, 2fr) repeat(4, minmax(0, 1fr));
}
/* Read-only viewer (not owner/director/admin): the session trackers are inert. The
   underlying update is already a no-op; this makes the controls look non-interactive. */
.play-readonly .vitals button,
.play-readonly .vitals input { pointer-events: none; opacity: 0.5; }
.play-readonly-tag {
  font-family: var(--mono); font-size: var(--fs-3); letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--ink-3); border: 1px solid var(--line-2); border-radius: 3px;
  padding: 4px 8px; margin-right: 6px; white-space: nowrap;
}
.vital {
  border: 1px solid var(--gold);
  background: var(--surface-vital);
  padding: 12px 14px;
  /* Bottom-pin the control row so −5/−1/+1/+5 lines up with the counter tiles'
     +/− buttons; the leftover height distributes between head, bar and controls. */
  display: flex; flex-direction: column; justify-content: space-between;
}
.vital-head { display: flex; justify-content: space-between; align-items: baseline; }
.vital-lbl { font-family: var(--mono); font-size: var(--fs-3); color: var(--ink-3); letter-spacing: 0.22em; text-transform: uppercase; }
/* Numerals render in plain Cinzel (--display-2): Cinzel Decorative's "1" reads
   as a Roman numeral I at these sizes. Same for every numeric readout below. */
.vital-num { font-family: var(--display-2); font-size: 1.375rem; color: var(--ink); }
.vital-num .muted { color: var(--ink-3); font-weight: 400; }
.vital-cur.editable { cursor: text; border-bottom: 1px dashed transparent; transition: border-color .15s; }
.vital-cur.editable:hover { border-bottom-color: var(--gold-deep); }
.vital-edit {
  width: 2.6em; font-family: var(--display-2); font-size: 1.375rem; line-height: 1;
  color: var(--ink); background: rgba(0,0,0,0.45); border: 1px solid var(--gold-deep);
  text-align: right; padding: 0 2px; -moz-appearance: textfield;
}
.vital-edit:focus { outline: none; border-color: var(--gold); box-shadow: 0 0 10px var(--gold-glow); }
.vital-edit::-webkit-outer-spin-button, .vital-edit::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
/* The hatch keeps an empty gauge visible — a 0-width fill on a plain dark track
   used to vanish into the panel. */
.vital-bar {
  height: 10px; margin-top: 6px; position: relative;
  border: 1px solid var(--line-2);
  background: repeating-linear-gradient(45deg, rgba(236,228,210,0.06) 0 4px, transparent 4px 8px) rgba(0,0,0,0.4);
}
.vital-fill { height: 100%; transition: width .3s; }
.winded-mark { position: absolute; top: -2px; bottom: -2px; width: 1px; background: var(--rubric); box-shadow: 0 0 6px var(--rubric); }
.vital-ctl { display: flex; gap: 4px; margin-top: 8px; }
/* Both button rows share one explicit height so the gauge and counter controls
   read as a single line across the vitals strip. */
.vital-ctl button {
  flex: 1; height: 1.5rem; padding: 0; background: var(--bg-2); border: 1px solid var(--line-2);
  color: var(--ink-2); font-family: var(--mono); font-size: var(--fs-4); font-weight: 600;
  cursor: pointer; letter-spacing: 0.06em;
}
.vital-ctl button:hover:not(:disabled) { border-color: var(--gold); color: var(--ink); }
.vital-ctl button:disabled, .cnt-ctl button:disabled { opacity: 0.4; cursor: default; }

.counter {
  border: 1px solid var(--line-2);
  background: var(--surface-counter);
  padding: 12px 14px; display: flex; flex-direction: column;
  align-items: center; text-align: center;
}
.cnt-lbl { font-family: var(--mono); font-size: var(--fs-3); color: var(--ink-3); letter-spacing: 0.22em; text-transform: uppercase; }
/* margin-top: auto bottom-anchors the number next to the controls, so a
   wrapping label (HERO TOKENS) can't push it out of line with its siblings. */
.cnt-val { font-family: var(--display-2); font-size: 1.625rem; color: var(--gold-2); margin: 4px 0 6px; margin-top: auto; font-weight: 700; }
.cnt-tot { font-size: var(--fs-7); color: var(--ink-3); font-weight: 400; }
.cnt-ctl { display: flex; gap: 4px; width: 100%; }
.cnt-ctl button {
  flex: 1; height: 1.5rem; padding: 0; background: var(--bg-2); border: 1px solid var(--line-2);
  color: var(--ink-2); font-family: var(--mono); font-size: var(--fs-6); cursor: pointer;
}
.cnt-ctl button:hover:not(:disabled) { border-color: var(--gold); color: var(--ink); }

.play-grid {
  display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 20px;
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
.panel-title { font-family: var(--display-2); font-size: var(--fs-6); font-weight: 700; letter-spacing: 0.24em; color: var(--gold-2); text-transform: uppercase; }
.panel-orn { font-family: var(--display); font-size: var(--fs-7); color: var(--gold); opacity: 0.5; }
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
  font-family: var(--display); font-size: var(--fs-7); color: var(--gold); opacity: 0.55;
  transition: transform 180ms ease, opacity 180ms ease, color 180ms ease;
  line-height: 1;
}
.panel-chevron.down { transform: rotate(0deg); }
.panel-chevron.up { transform: rotate(180deg); }

/* minmax(0, …) — the boxes are labelled with full characteristic names, so a bare
   1fr floors each track at "Intuition"/"Presence" and the five come out unequal. */
.chars-row { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
.char-box { border: 1px solid var(--line-2); background: var(--bg-2); padding: 10px 6px; text-align: center; }
.ch-name { font-family: var(--mono); font-size: var(--fs-2); color: var(--ink-3); letter-spacing: 0.22em; text-transform: uppercase; }
.ch-val { font-family: var(--display-2); font-size: 2rem; font-weight: 700; color: var(--ink); margin-top: 6px; }
/* A reference legend, not controls — plain text so it can't read as pressed buttons. */
.potency-row {
  display: flex; gap: 16px; margin-top: 12px; flex-wrap: wrap;
  font-family: var(--mono); font-size: var(--fs-3); color: var(--ink-3);
  letter-spacing: 0.18em; text-transform: uppercase; cursor: help;
}
.potency-row .strong { color: var(--gold-2); }

.empty-note { font-family: var(--hand); font-style: italic; color: var(--ink-3); font-size: var(--fs-7); padding: 14px; text-align: center; }

/* Source-group headers inside the Abilities panel */
.abil-group + .abil-group { margin-top: 18px; }
.abil-group-head {
  font-family: var(--mono); font-size: var(--fs-2); letter-spacing: 0.24em;
  text-transform: uppercase; color: var(--gold-2);
  padding-bottom: 6px; border-bottom: 1px solid var(--line); margin-bottom: 10px;
}

/* Pinned conditions strip — one scrollable row beside the other live trackers,
   with the same right-edge fade as the vitals and tab strips. */
.cond-strip {
  display: flex; gap: 6px; margin-bottom: 14px;
  overflow-x: auto; scrollbar-width: none;
  -webkit-mask-image: linear-gradient(90deg, #000 0, #000 calc(100% - 28px), transparent);
  mask-image: linear-gradient(90deg, #000 0, #000 calc(100% - 28px), transparent);
}
.cond-strip::-webkit-scrollbar { display: none; }
.cond-strip .cond { flex: 0 0 auto; }
.cond {
  font-family: var(--mono); font-size: var(--fs-3); padding: 8px 6px;
  background: var(--bg-2); border: 1px solid var(--line-2); color: var(--ink-2);
  cursor: pointer; letter-spacing: 0.18em; text-transform: uppercase;
  transition: border-color .12s, background .12s, color .12s, box-shadow .12s;
}
/* The ○/● telegraphs "toggle" — without it the off state is identical to the
   app's inert pills and nobody discovers these are pressable. */
.cond::before { content: '○ '; color: var(--ink-3); }
.cond.on::before { content: '● '; color: #fff; }
.cond:hover { border-color: var(--line-strong); }
.cond.on { background: var(--rubric); border-color: var(--rubric); color: #fff; box-shadow: 0 0 10px var(--rubric-glow); }
.cond:disabled { opacity: 0.5; cursor: default; }

/* .trait-block / .trait-name / .sig-tag / .cost-tag / .trait-text / .sig-option-* /
   .kit-meta-line / .kv-row live in theme/sheet.jsx (SHEET_CSS) — shared with Review. */
.perk-leveled { margin-top: 10px; padding-top: 10px; border-top: 1px dotted var(--line); }
.perk-lvl-tag {
  display: inline-block; margin-left: 8px; vertical-align: middle;
  font-family: var(--mono); font-size: var(--fs-2); letter-spacing: 0.16em;
  color: var(--gold-2); border: 1px solid var(--line-2); border-radius: 2px;
  padding: 2px 6px; line-height: 1;
}

/* Progression tab — full-width timeline; each level's entries flow into columns. */
.prog-list { display: flex; flex-direction: column; gap: 12px; }
.prog-row {
  display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: start;
  padding: 12px 0; border-bottom: 1px dashed var(--line);
}
.prog-row:last-child { border-bottom: none; padding-bottom: 0; }
.prog-row:first-child { padding-top: 0; }
.prog-badge {
  font-family: var(--display-2); font-size: var(--fs-6); letter-spacing: 0.06em;
  color: var(--gold-2); border: 1px solid var(--line-2); border-radius: 2px;
  padding: 4px 8px; white-space: nowrap; line-height: 1;
}
.prog-detail {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px 20px; align-items: start; min-width: 0;
}
.prog-pick { display: flex; flex-direction: column; gap: 1px; }
.prog-pick-text {
  font-family: var(--serif); font-size: var(--fs-5); color: var(--ink-2);
  line-height: 1.5; margin-top: 3px; white-space: pre-line;
}
.prog-pick-k {
  font-family: var(--mono); font-size: var(--fs-2); letter-spacing: 0.2em;
  text-transform: uppercase; color: var(--ink-3);
}
.prog-pick-v { font-family: var(--serif); font-size: var(--fs-6); color: var(--ink); line-height: 1.4; }
.prog-edit {
  font-family: var(--mono); font-size: var(--fs-2); letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--ink-2); background: transparent; border: 1px solid var(--line-2);
  border-radius: 2px; padding: 5px 10px; cursor: pointer; white-space: nowrap;
  transition: border-color .12s, color .12s, box-shadow .12s;
}
.prog-edit:hover { color: var(--gold-2); border-color: var(--gold); box-shadow: 0 0 12px var(--gold-glow); }

/* Top-bar overflow menu (phone only — see Responsive below) */
.pt-menu-wrap { position: relative; display: none; }
.pt-menu-btn {
  width: 40px; height: 40px; flex: none; cursor: pointer;
  background: transparent; border: 1px solid var(--line-2); color: var(--ink-2);
  font-family: var(--display); font-size: 1.125rem; line-height: 1;
  display: grid; place-items: center;
}
.pt-menu-btn[aria-expanded="true"] { border-color: var(--gold); color: var(--gold-2); }
.pt-menu {
  position: absolute; top: calc(100% + 8px); right: 0; z-index: 60;
  min-width: 200px; display: flex; flex-direction: column;
  background: linear-gradient(180deg, var(--bg-2), var(--bg-0));
  border: 1px solid var(--gold);
  box-shadow: 0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(176,138,72,0.2);
}
.pt-menu-item {
  background: transparent; border: none; cursor: pointer;
  text-align: left; padding: 13px 16px; min-height: 44px;
  font-family: var(--display-2); font-size: var(--fs-4);
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-2);
}
.pt-menu-item + .pt-menu-item { border-top: 1px solid var(--line); }

/* ══════════════════════ Responsive ══════════════════════ */

${MQ.rail} {
  /* Swap the button row for the ⋯ menu. Measured, not a device tier: branding
     plus six buttons needs ~930px, so the bar overflows well above the tablet
     breakpoint. This is the only place the threshold is expressed — play.jsx
     renders both branches and lets CSS pick. */
  .play-top .tb-right > .btn.collapsible { display: none; }
  .pt-menu-wrap { display: block; }
  /* The desktop tracks also run out of room here: at 901-1024px the 6-card
     vitals row and the 2-column grid collide labels with values. Same
     collapse as the tablet tier, one breakpoint earlier. */
  .play-grid { grid-template-columns: minmax(0, 1fr); }
  .play-pinned-inner { padding: 16px 20px 0; }
  /* The vitals live in the pinned region now, so they must not wrap into a
     second row: one horizontally scrollable strip, right-edge fade signalling
     the rest (same pattern as the tab strip and the app-bar nav). */
  .vitals {
    display: flex; gap: 8px;
    overflow-x: auto; scrollbar-width: none;
    -webkit-mask-image: linear-gradient(90deg, #000 0, #000 calc(100% - 28px), transparent);
    mask-image: linear-gradient(90deg, #000 0, #000 calc(100% - 28px), transparent);
  }
  .vitals::-webkit-scrollbar { display: none; }
  .vitals .vital { flex: 0 0 240px; }
  .vitals .counter { flex: 0 0 104px; }
}

${MQ.tab} {
  .play-grid { grid-template-columns: 1fr; }
  /* Compact in place rather than reflowing the level below the name — the
     masthead is pinned, so extra rows cost scroll room on every tab. */
  .hero-masthead { gap: 16px; padding: 12px 16px; }
  .hb-portrait { width: 72px; height: 72px; }
  .hb-name { font-size: 1.75rem; }
  .hb-level-num { font-size: 1.75rem; }
  .play-content { padding: 18px 20px 22px; }
}

${MQ.phone} {
  /* The action buttons need the room more than the brand does. */
  .play-top .tb-text { display: none; }

  .chars-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .cond { padding: 8px 8px; letter-spacing: 0.12em; }
  .prog-row { grid-template-columns: auto 1fr; }
  .prog-row .prog-edit { grid-column: 1 / -1; justify-self: start; margin-top: 8px; }

  .hero-masthead { gap: 10px; padding: 8px 10px; margin-bottom: 10px; }
  .hb-portrait { width: 44px; height: 44px; }
  .hb-portrait .hb-glyph { font-size: 1.25rem; }
  .hb-eyebrow { display: none; }
  .hb-name { font-size: 1.25rem; }
  .hb-meta { letter-spacing: 0.1em; font-size: var(--fs-3); margin-top: 4px; }
  .hb-level { padding-left: 10px; }
  .hb-level-num { font-size: 1.375rem; }
  .vitals .vital { flex: 0 0 220px; }
  .vitals .counter { flex: 0 0 96px; }

  .play-pinned-inner { padding: 10px max(14px, env(safe-area-inset-left)) 0 max(14px, env(safe-area-inset-right)); }
  .play-content { padding: 14px max(14px, env(safe-area-inset-left)) 32px max(14px, env(safe-area-inset-right)); }
  .panel-body { padding: 14px; }

  /* The most-tapped controls on the sheet; the desktop height is far under 44px. */
  .vital-ctl button, .cnt-ctl button { height: 2rem; }
}

${MQ.touch} {
  /* The dashed underline is the only cue that stamina is tap-to-edit. */
  .vital-cur.editable { border-bottom-color: var(--gold-deep); }
}
`;

const PlayStyles = () => React.createElement('style', {}, PLAY_CSS);

Object.assign(window, { PlayView });
export { PlayView };
