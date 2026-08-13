import React from 'react';
import { OrnDivider, GlyphRow, renderGlyph, renderRich, Pill, SavePill, Button, TopBar, H3, H4Meta, StatTile, Modal, FeatureTable, AbilityCard } from './theme.jsx';
import { heroName } from './campaigns.jsx';
import { ManeuversPanel, RulesGlossary, DS_RULES } from './rules.jsx';
import { LevelUpFlow, LevelUpStyles, LEVELUP_DATA, collectLevelUpFeatures, deleteLevelProgression } from './levelup.jsx';
import { DOMAIN_2_ABILITIES } from './data/conduit-domains.js';
import { classDef, ancestryDef, kitDef, kit2Def, careerDef, complicationDef, computeDerived, playCurrencies, summarizeBenefits, collectDistanceBonuses, applyDistanceBonuses } from './app.jsx';
import { companionById, minionById, collectMinionIds } from './data.jsx';
import { PERKS, kitSigAbility, normalizeAbilityTiers } from './wizard/helpers.js';
import { SheetStyles, AncestryTraitsList, KitDetails, StatblockCard } from './theme/sheet.jsx';
import { Tabs, TabPanel, TabsStyles } from './theme/tabs.jsx';
import { characterToFoundryHero, downloadJson, loadOfficialIndex } from './foundry-export.js';
import { DS } from './backend.jsx';
import { MQ } from './theme/breakpoints.js';
// play.jsx — Play view (at-the-table digital sheet) + Level-up modal.

// Hooks used bare in this file (see note in wizard.jsx) — provide them under ES modules.
const { useState, useEffect, useRef } = React;

// Sheet tabs. The active tab is a per-device, per-hero UI preference, so it
// lives in localStorage under the session prefix (same convention as LS_VIEW).
const PLAY_TABS = [
  { id: 'character', label: 'Character', glyph: '✠' },
  { id: 'combat', label: 'Combat', glyph: '⚔' },
  { id: 'progression', label: 'Progression', glyph: '▲' },
];
const tabKey = (heroId) => `${DS.K.session}/playTab/${heroId}`;

// The condition strip comes from the rules glossary, so chip names (which double
// as play.conditions keys) and tooltip text always match the official entries.
const CONDITIONS = DS_RULES.find(s => s.id === 'conditions')?.entries || [];

// The only conditions with a flat numeric effect: a speed cap ("has speed 0" /
// "has speed 2 unless their speed is already lower"). The rest are roll
// mechanics (banes, edges, action economy) the tooltip explains instead.
// ── Summoner squad math — pure, exported for tests ──
// A squad pools its minions' Stamina; the alive count is always derived from the
// pool (never stored), so summon/dismiss/damage are plain pool arithmetic.
function perMinionStamina(minion, character) {
  const base = parseInt(minion?.stamina, 10) || 1;
  const elite = String(character?.cclass?.formation || '').startsWith('Elite') ? 3 : 0;
  return base + elite;
}
function minionMax(character) {
  return 8 + (String(character?.cclass?.formation || '').startsWith('Horde') ? 4 : 0);
}
function squadAlive(squad, per) {
  return Math.max(0, Math.ceil((squad?.stamina || 0) / Math.max(1, per)));
}
// One minion dies per per-minion-Stamina chunk removed from the pool; damage
// beyond the pool is reported as excess (the summoner takes 2 + level, unless
// Leader formation) but never auto-applied to the hero.
function applySquadDamage(squad, dmg, per) {
  const pool = squad?.stamina || 0;
  const hit = Math.max(0, Math.floor(dmg) || 0);
  const stamina = Math.max(0, pool - hit);
  const before = squadAlive(squad, per);
  const after = Math.max(0, Math.ceil(stamina / Math.max(1, per)));
  return { stamina, deaths: before - after, excess: Math.max(0, hit - pool) };
}

const CONDITION_SPEED = { Grabbed: 0, Restrained: 0, Slowed: 2 };
function conditionedSpeed(speed, conditions) {
  let s = speed;
  for (const [name, cap] of Object.entries(CONDITION_SPEED)) {
    if (conditions?.[name]) s = Math.min(s, cap);
  }
  return s;
}

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

function PlayView({ character, update, onExit, onEdit, canEdit = true, saveState = null, owner = null, isOwner = true, canSetVisibility = false, onSetVisibility = null, canPreviewReadonly = false, previewReadonly = false, onTogglePreviewReadonly = null, onError = () => {} }) {
  const cls = classDef(character);
  const anc = ancestryDef(character);
  const kit = kitDef(character);
  const kit2 = kit2Def(character);
  const comp = complicationDef(character);
  const car = careerDef(character);
  const derived = computeDerived(character);
  const benefits = summarizeBenefits(character);
  // Active conditions cap the *displayed* speed only — computeDerived stays
  // condition-free because the wizard review, level-up projections, and the
  // Foundry export all read it and must show the unconditioned character.
  const condSpeed = conditionedSpeed(derived.speed, character.play.conditions);
  const speedConds = Object.keys(CONDITION_SPEED).filter(n => character.play.conditions?.[n]);

  const [levelUpOpen, setLevelUpOpen] = useState(false);
  const [editLevel, setEditLevel] = useState(null);
  const [pendingDeleteLevel, setPendingDeleteLevel] = useState(null);
  const [bioOpen, setBioOpen] = useState(false);
  const [respiteOpen, setRespiteOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [portraitOpen, setPortraitOpen] = useState(false);

  // ESC closes the enlarged portrait — it's a bare backdrop overlay (no Modal
  // chrome), so it handles its own key, same idiom as the rules glossary.
  useEffect(() => {
    if (!portraitOpen) return;
    const fn = (e) => { if (e.key === 'Escape') setPortraitOpen(false); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [portraitOpen]);

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const v = localStorage.getItem(tabKey(character.id));
      return PLAY_TABS.some(t => t.id === v) ? v : 'character';
    } catch { return 'character'; }
  });
  useEffect(() => {
    try { localStorage.setItem(tabKey(character.id), activeTab); } catch {}
  }, [activeTab, character.id]);

  // The sheet scrolls as one page and the tab strip scrolls away with it, but
  // all tabs share the scroller's position. After a user tab switch, if the
  // strip has been scrolled past, snap it back to the top of the scrollport so
  // the new tab starts at its beginning instead of mid-page (or clamped to the
  // bottom of a shorter tab). Near the top, do nothing — no jump.
  const bodyRef = useRef(null);
  const tabsRef = useRef(null);
  const tabSwitched = useRef(false);
  const changeTab = (id) => { tabSwitched.current = true; setActiveTab(id); };
  useEffect(() => {
    if (!tabSwitched.current) return;   // initial mount / restored tab: leave scroll alone
    tabSwitched.current = false;
    const scroller = bodyRef.current, tabs = tabsRef.current;
    if (!scroller || !tabs) return;
    const tabsTop = tabs.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    if (scroller.scrollTop > tabsTop) scroller.scrollTop = tabsTop;
  }, [activeTab]);

  // Initialise current stamina if undefined (skip for read-only viewers — not our sheet).
  useEffect(() => {
    if (canEdit && character.play.stamina == null && derived.staminaMax) {
      update(c => ({ ...c, play: { ...c.play, stamina: derived.staminaMax } }));
    }
    // eslint-disable-next-line
  }, [derived.staminaMax]);

  const setPlay = (mut) => update(c => ({ ...c, play: typeof mut === 'function' ? mut(c.play) : { ...c.play, ...mut } }));

  // Hover tooltip (conditions, potency legend): one fixed-position box fed by
  // whichever trigger is hovered or focused. Fixed (not absolute) so no header
  // stacking context or clipping ancestor can cut it off; rendered at the
  // view root.
  const [hoverTip, setHoverTip] = useState(null);
  const showTip = (name, text) => (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const below = r.bottom < window.innerHeight * 0.6;
    setHoverTip({
      name,
      text,
      left: Math.min(Math.max(8, r.left + r.width / 2 - 190), Math.max(8, window.innerWidth - 396)),
      top: below ? r.bottom + 8 : null,
      bottom: below ? null : window.innerHeight - r.top + 8,
    });
  };
  const hideTip = () => setHoverTip(null);

  const adjStamina = (delta) => setPlay(p => ({ ...p, stamina: Math.max(-derived.winded, Math.min(derived.staminaMax, (p.stamina ?? derived.staminaMax) + delta)) }));
  const setStamina = (val) => setPlay(p => ({ ...p, stamina: Math.max(0, Math.min(derived.staminaMax, Math.floor(val))) }));
  // Beastheart: ferocity spent by either partner becomes companion rampage, so the
  // stepper's actual clamped decrease auto-feeds the meter. The type-in editor
  // (setResource) is the correction channel and deliberately leaves rampage alone.
  const isBeastheart = cls?.id === 'beastheart';
  const isSummoner = cls?.id === 'summoner';
  const adjResource = (delta) => setPlay(p => {
    const cur = p.resource || 0;
    const next = Math.max(0, cur + delta);
    const spent = cur - next;
    return { ...p, resource: next, ...(isBeastheart && spent > 0 ? { rampage: (p.rampage || 0) + spent } : {}) };
  });
  const setResource = (val) => setPlay(p => ({ ...p, resource: Math.max(0, Math.floor(val)) }));
  const adjVictories = (delta) => setPlay(p => ({ ...p, victories: Math.max(0, (p.victories || 0) + delta) }));
  const adjSurges = (delta) => setPlay(p => ({ ...p, surges: Math.max(0, (p.surges || 0) + delta) }));
  const adjHero = (delta) => setPlay(p => ({ ...p, heroTokens: Math.max(0, (p.heroTokens || 0) + delta) }));

  // Renown/Wealth show derived-base + Director delta; the steppers move the
  // delta. Renown can't go below 0 (clamp the delta, not the display, so a
  // no-op minus doesn't drift the stored adjustment). Wealth may go negative.
  const currencies = playCurrencies(character, derived);
  const adjRenown = (delta) => setPlay(p => {
    const next = Math.max(-(derived.renownBase || 0), (p.renownAdj || 0) + delta);
    return { ...p, renownAdj: next === 0 ? 0 : next };  // normalize Math.max's −0
  });
  const adjWealth = (delta) => setPlay(p => ({ ...p, wealthAdj: (p.wealthAdj || 0) + delta }));

  // Respite (rules glossary): regain all Stamina and Recoveries; Victories
  // convert into XP. stamina:null is the existing "full" sentinel (lazy-filled
  // above), the same reset applyLevelUp uses.
  const takeRespite = () => {
    setPlay(p => ({
      ...p,
      stamina: null,
      recoveriesUsed: 0,
      xp: (p.xp || 0) + (p.victories || 0),
      victories: 0,
      // Master-class trackers reset with the encounter/day.
      companionStamina: null,
      rampage: 0,
      squads: [],
    }));
    setRespiteOpen(false);
  };

  const heroName = character.identity.name || character.name || 'Unnamed Hero';
  const subclassName = (cls && cls.subclasses && cls.subclasses.find(s => s.id === character.cclass.subclass || s.name === character.cclass.subclass)?.name) || character.cclass.subclass;

  // Named so the top-bar action list can reference it from one place. Closes over
  // the local heroName above, which shadows the campaigns.jsx import of the same name.
  const exportFoundry = async () => {
    try {
      // The official compendium index ships with the app — a null index means the
      // fetch broke and every item would silently export as a generated "custom"
      // one. Abort instead; the load isn't memoized on failure, so retry works.
      const idx = await loadOfficialIndex();
      if (!idx) {
        onError('EXPORT ABORTED — OFFICIAL COMPENDIUM FAILED TO LOAD, RETRY');
        return;
      }
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
      if (Array.isArray(p)) value = p.map(o => o.name || o.id).join(' · ');
      else if (p.chosen) value = `${p.chosen} (${typeof p.name === 'string' ? p.name.replace(/\s*(Perk|Skill)$/i, '') : p.chosen})`;
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
  // on phones; the rest collapse into the ⋯ menu. (Nothing is pinned right now —
  // BIOGRAPHY and LEVEL UP live in the masthead — but the mechanism remains.)
  // Both renderers below map this same array, so the handlers are shared by
  // reference rather than duplicated.
  const topActions = [
    { id: 'rules', label: 'RULES', onClick: () => setRulesOpen(true) },
    { id: 'export', label: 'EXPORT', onClick: exportFoundry,
      title: 'Download as a FoundryVTT (Draw Steel system) actor file' },
    // Admin testing aid — listed regardless of canEdit so the preview can be exited.
    canPreviewReadonly && onTogglePreviewReadonly && {
      id: 'preview',
      label: previewReadonly ? 'EXIT READ-ONLY' : 'VIEW READ-ONLY',
      title: previewReadonly
        ? 'Return to the editable sheet'
        : 'Preview this sheet exactly as a read-only viewer sees it',
      onClick: onTogglePreviewReadonly,
    },
    canSetVisibility && onSetVisibility && {
      id: 'visibility',
      label: character.visibility === 'public' ? 'MAKE PRIVATE' : 'MAKE PUBLIC',
      title: character.visibility === 'public'
        ? 'The whole party can edit this sheet — restrict it to you and the Director'
        : 'Let every member of this campaign edit this sheet',
      onClick: () => onSetVisibility(character.visibility === 'public' ? 'private' : 'public'),
    },
    canEdit && onEdit && { id: 'edit', label: 'EDIT', onClick: onEdit },
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
            <span className="play-readonly-tag" title="This sheet is private — only the owner or Director can edit it">
              👁 Viewing{owner?.displayName ? ` · kept by ${owner.displayName}` : ''}
            </span>
          )}
          {canEdit && !isOwner && character.visibility === 'public' && owner?.displayName && (
            <span className="play-readonly-tag" title="This sheet is public — every campaign member may edit it">
              ⚭ Party-editable · kept by {owner.displayName}
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

      {/* Body — the whole sheet scrolls as one page: masthead, vitals,
          conditions, and the tab strip scroll away with the content. */}
      {/* onScroll: a fixed tooltip would drift from its scrolled-away trigger. */}
      <div className="play-body" ref={bodyRef} onScroll={hoverTip ? hideTip : undefined}>
      <div className="play-head">
        <div className="play-head-inner">
          {/* Hero masthead (named to avoid ad-blocker cosmetic filters on "banner") */}
          <div className="hero-masthead">
            {character.portrait ? (
              <button type="button" className="hb-portrait has-img"
                style={{ backgroundImage: `url(${character.portrait})` }}
                onClick={() => setPortraitOpen(true)} aria-label="Enlarge portrait"></button>
            ) : (
              <div className="hb-portrait">
                <span className="hb-glyph">{renderGlyph(cls?.glyph || '✠')}</span>
              </div>
            )}
            <div className="hb-text">
              <div className="hb-eyebrow">{[anc?.name].filter(Boolean).join(' · ') || 'Hero'}</div>
              <div className="hb-name">{heroName}</div>
              <div className="hb-meta">
                {cls?.name || 'Unclassed'}
                {character.cclass.subclass && <span className="hb-sub"> · {subclassName || character.cclass.subclass}</span>}
              </div>
            </div>
            {/* Ledger — Renown/Wealth from derived base + Director delta; XP only
                grows via the respite conversion, so it renders without steppers. */}
            <div className="hb-ledger">
              <HBStat label="Renown" value={currencies.renown}
                onSet={canEdit ? (n) => adjRenown(n - currencies.renown) : null} />
              <HBStat label="Wealth" value={currencies.wealth}
                onSet={canEdit ? (n) => adjWealth(n - currencies.wealth) : null} />
              <HBStat label="XP" value={currencies.xp} />
            </div>
            <div className="hb-actions">
              {canEdit && (
                <Button kind="primary" small onClick={() => setLevelUpOpen(true)}>LEVEL UP ▲</Button>
              )}
              <Button kind="ghost" small onClick={() => setBioOpen(true)}>BIOGRAPHY</Button>
              {canEdit && (
                <Button kind="ghost" small onClick={() => setRespiteOpen(true)}>RESPITE ❧</Button>
              )}
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

          {/* Conditions — live session toggles like the vitals, shown above
              every tab. Wraps when the row runs out. Hover/focus
              handlers live on the wrapper span so tooltips still work on the
              read-only sheet, where the buttons are disabled (disabled buttons
              swallow mouse events). No title= — the custom tip replaces it. */}
          <div className="cond-strip">
            {CONDITIONS.map(entry => {
              const cond = entry.name;
              const on = !!character.play.conditions[cond];
              return (
                <span key={cond} className="cond-wrap"
                  onMouseEnter={showTip(entry.name, entry.text)} onMouseLeave={hideTip}>
                  <button
                    type="button"
                    className={`cond ${on ? 'on' : ''}`}
                    aria-pressed={on}
                    disabled={!canEdit}
                    onFocus={showTip(entry.name, entry.text)}
                    onBlur={hideTip}
                    onClick={() => setPlay(p => ({ ...p, conditions: { ...p.conditions, [cond]: !p.conditions[cond] } }))}
                  >
                    {cond}
                  </button>
                </span>
              );
            })}
          </div>

          <div ref={tabsRef}>
            <Tabs tabs={PLAY_TABS} value={activeTab} onChange={changeTab} idBase="play" />
          </div>
        </div>
      </div>

      {/* The active tab's content. Inactive panels stay mounted (hidden)
          so panel collapse state survives tab switches. */}
        <div className="play-content">
          <TabPanel id="combat" idBase="play" active={activeTab === 'combat'}>
          <div className="play-grid">
            {/* LEFT column */}
            <div className="play-col-l">
              {/* Master-class trackers — the most-touched combat surface for these classes */}
              {isBeastheart && <CompanionPanel character={character} derived={derived} canEdit={canEdit} setPlay={setPlay} />}
              {isSummoner && <MinionsPanel character={character} derived={derived} canEdit={canEdit} setPlay={setPlay} showTip={showTip} hideTip={hideTip} />}

              {/* Abilities, grouped by where they come from */}
              <Panel title="Abilities" collapsible>
                {abilityGroups.map(g => (
                  <div className="abil-group" key={g.label}>
                    <div className="abil-group-head">
                      <span className="agh-line" aria-hidden="true"></span>
                      <span className="agh-label">{g.label}</span>
                      <span className="agh-line" aria-hidden="true"></span>
                    </div>
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
                {/* Custom hover tips, not title= — same style as the conditions. */}
                <div className="potency-row">
                  {[
                    ['Weak', derived.potency.weak, 'your highest characteristic − 2'],
                    ['Average', derived.potency.average, 'your highest characteristic − 1'],
                    ['Strong', derived.potency.strong, 'your highest characteristic'],
                  ].map(([name, val, formula]) => {
                    const show = showTip(`${name} ${val}`,
                      `Potency threshold — an ability that reads "M < ${name.toUpperCase()}" applies its potency effect when the target's Might is less than ${val}. ${name} is ${formula}.`);
                    return (
                      <span
                        key={name}
                        className={name === 'Strong' ? 'strong' : undefined}
                        tabIndex={0}
                        onMouseEnter={show} onMouseLeave={hideTip}
                        onFocus={show} onBlur={hideTip}
                      >
                        {name.toUpperCase()} {val}
                      </span>
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
                      {f.table && <FeatureTable table={f.table} level={character.level} />}
                    </div>
                  ))}
                  {levelUpFeatures.map((f, i) => (
                    <div className="trait-block" key={`lu-${f.level}-${f.name}-${i}`}>
                      <div className="trait-name">{f.name} <span className="perk-lvl-tag">LV {f.level}</span></div>
                      {f.text && <div className="trait-text">{renderRich(f.text)}</div>}
                      {f.table && <FeatureTable table={f.table} level={character.level} />}
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
                  <StatTile label="Speed" value={condSpeed}
                    sub={condSpeed !== derived.speed ? `/${derived.speed}` : undefined}
                    rubric={condSpeed !== derived.speed}
                    title={condSpeed !== derived.speed ? `Speed ${condSpeed} while ${speedConds.join(' + ')} — normally ${derived.speed}` : undefined} />
                  <StatTile label="Stability" value={derived.stability} />
                  <StatTile label="Disengage" value={derived.disengage} />
                  <StatTile label="Size" value={derived.size} />
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
                      {(editable || canEdit) && (
                        <div className="prog-actions">
                          {editable && (
                            <button type="button" className="prog-edit" onClick={() => setEditLevel(lvl)} title={`Edit Level ${lvl} selections`}>
                              EDIT
                            </button>
                          )}
                          {/* Deleting works even for levels with no LEVELUP_DATA mapping —
                              the rollback only trims stored state, so canEdit is enough. */}
                          {canEdit && (
                            <button type="button" className="prog-edit prog-del" onClick={() => setPendingDeleteLevel(lvl)} title={`Delete Level ${lvl} progression`}>
                              DELETE
                            </button>
                          )}
                        </div>
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

      <Modal open={respiteOpen} onClose={() => setRespiteOpen(false)} title="Take a Respite" width={440}
        footer={(
          <>
            <Button kind="ghost" onClick={() => setRespiteOpen(false)}>CANCEL</Button>
            <div style={{ flex: 1 }}></div>
            <Button kind="primary" onClick={takeRespite}>TAKE RESPITE ❧</Button>
          </>
        )}>
        <p className="respite-lede">
          An uninterrupted 24-hour rest in a safe place. At its end:
        </p>
        <ul className="respite-list">
          <li>Convert <strong>{character.play.victories || 0} {(character.play.victories || 0) === 1 ? 'Victory' : 'Victories'}</strong> into XP{(character.play.victories || 0) > 0 && <> — XP becomes <strong>{(character.play.xp || 0) + (character.play.victories || 0)}</strong></>}</li>
          <li>Restore Stamina to <strong>{derived.staminaMax}</strong></li>
          <li>Regain all <strong>{derived.recoveries}</strong> Recoveries</li>
          {isBeastheart && <li>Companion Stamina restored, Rampage cleared</li>}
          {isSummoner && <li>All minions dismissed</li>}
        </ul>
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

      <Modal open={pendingDeleteLevel != null} onClose={() => setPendingDeleteLevel(null)} title="Undo this Ascension?" width={460}
        footer={(
          <>
            <Button kind="ghost" onClick={() => setPendingDeleteLevel(null)}>◂ KEEP</Button>
            <div style={{ flex: 1 }}></div>
            <Button kind="danger" onClick={() => { const lvl = pendingDeleteLevel; setPendingDeleteLevel(null); update(c => deleteLevelProgression(c, lvl)); }}>DELETE ✕</Button>
          </>
        )}>
        {pendingDeleteLevel != null && (
          <div style={{textAlign:'center'}}>
            <div style={{fontFamily:'var(--display)', fontSize:'1.5rem', color:'var(--gold-2)', letterSpacing:'0.08em', marginBottom:14}}>
              {pendingDeleteLevel < character.level
                ? `Levels ${pendingDeleteLevel}–${character.level}`
                : `Level ${pendingDeleteLevel}`}
            </div>
            <div style={{fontFamily:'var(--serif)', fontSize:'0.9375rem', color:'var(--ink-2)', lineHeight:1.6, maxWidth:360, margin:'0 auto'}}>
              {pendingDeleteLevel < character.level && (
                <>Later levels are built on this one, so they fall with it. </>
              )}
              Everything gained at {pendingDeleteLevel < character.level
                ? `levels ${Array.from({ length: character.level - pendingDeleteLevel + 1 }, (_, i) => pendingDeleteLevel + i).join(', ')}`
                : `level ${pendingDeleteLevel}`} — abilities, features, perks, skills,
              characteristic increases and stamina — will be removed, and{' '}
              <strong>{heroName}</strong> returns to level {pendingDeleteLevel - 1}.
              This cannot be undone.
            </div>
          </div>
        )}
      </Modal>

      <RulesGlossary open={rulesOpen} onClose={() => setRulesOpen(false)} />

      {/* Enlarged portrait — a bare lightbox on the shared backdrop; the full
          Modal's parchment chrome would fight the artwork. */}
      {portraitOpen && character.portrait && (
        <div className="modal-backdrop portrait-lightbox" onClick={() => setPortraitOpen(false)}>
          <img src={character.portrait} alt={`${heroName} — portrait`} onClick={(e) => e.stopPropagation()} />
          <button type="button" className="pl-close" onClick={() => setPortraitOpen(false)} aria-label="Close">{'×'}</button>
        </div>
      )}

      {hoverTip && (
        <div
          className="play-tip"
          role="tooltip"
          style={{ left: hoverTip.left, top: hoverTip.top ?? 'auto', bottom: hoverTip.bottom ?? 'auto' }}
        >
          <div className="pt-name">{hoverTip.name}</div>
          {(Array.isArray(hoverTip.text) ? hoverTip.text : [hoverTip.text]).map((p, i) => (
            <p className="pt-text" key={i}>{p}</p>
          ))}
        </div>
      )}
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

// Masthead ledger stat: display-font number over a mono label, like .hb-level.
// Clicking the number swaps it for a type-in field — Enter or blur commits,
// Escape cancels, and invalid/empty/unchanged drafts commit nothing. Read-only
// sheets (and the respite-only XP) get a bare figure with no click affordance.
function HBStat({ label, value, onSet }) {
  const editable = !!onSet;
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const skip = React.useRef(false); // Escape must not commit through the blur that follows
  const start = () => { setDraft(String(value)); setEditing(true); };
  const commit = () => {
    const n = Math.round(Number(draft));
    if (draft.trim() !== '' && Number.isFinite(n) && n !== value) onSet(n);
    setEditing(false);
  };
  return (
    <div className="hb-stat">
      <div className="hb-stat-row">
        {editing ? (
          <input className="hb-stat-input" type="text" inputMode="numeric"
            aria-label={`${label} value`} value={draft} autoFocus
            onFocus={(e) => e.target.select()}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => { if (skip.current) { skip.current = false; return; } commit(); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              else if (e.key === 'Escape') { skip.current = true; setEditing(false); }
            }} />
        ) : editable ? (
          <button type="button" className="hb-stat-num" aria-label={`Edit ${label}`} onClick={start}>{value}</button>
        ) : (
          <div className="hb-stat-num">{value}</div>
        )}
      </div>
      <div className="hb-stat-lbl">{label}</div>
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

// ── Beastheart: the companion is a second creature — its own Stamina gauge
// (max = the hero's), a Rampage meter feeding the threshold table, and the
// full stat block with level-gated advancements. ──
function CompanionPanel({ character, derived, canEdit, setPlay }) {
  const comp = companionById(character.cclass?.companion);
  const cls = classDef(character);
  if (!comp) return null;
  const play = character.play || {};
  const rampage = play.rampage || 0;
  const value = play.companionStamina ?? derived.staminaMax;
  const rampageTable = (cls?.features || []).find(f => f.name === 'Rampage')?.table;
  const attuned = Object.values(character.cclass?.companionOptions || {}).filter(Boolean);
  const adjComp = canEdit ? (delta) => setPlay(p => ({ ...p, companionStamina: Math.max(-derived.winded, Math.min(derived.staminaMax, (p.companionStamina ?? derived.staminaMax) + delta)) })) : null;
  const setComp = canEdit ? (val) => setPlay(p => ({ ...p, companionStamina: Math.max(0, Math.min(derived.staminaMax, Math.floor(val))) })) : null;
  const adjRampage = canEdit ? (d) => setPlay(p => ({ ...p, rampage: Math.max(0, (p.rampage || 0) + d) })) : null;
  const endEncounter = canEdit ? () => setPlay(p => ({ ...p, resource: 0, rampage: 0 })) : null;
  return (
    <Panel title={`Companion — ${comp.name}`} collapsible>
      <div className="stack-12">
        <VitalGauge
          label="Companion Stamina"
          value={value}
          max={derived.staminaMax}
          winded={derived.winded}
          accent="var(--tier3-t)"
          onAdj={adjComp}
          onSet={setComp}
        />
        {value <= 0 && (
          <div className="empty-note">
            {value <= -derived.winded
              ? 'Your companion is dead — Heart of the Beast (5 ferocity) can restore them to life.'
              : 'Your companion is dying.'}
          </div>
        )}
        <div className="mc-row">
          <CounterBox label="Rampage" value={rampage} onPlus={adjRampage ? () => adjRampage(1) : null} onMinus={adjRampage ? () => adjRampage(-1) : null} />
          {rampage >= 8 && <Pill kind="rubric">RAMPAGING</Pill>}
          <div style={{ flex: 1 }}></div>
          <Button kind="ghost" small onClick={endEncounter} disabled={!endEncounter} title="End of encounter: ferocity and rampage are lost">END ENCOUNTER ✕</Button>
        </div>
        {rampageTable && <FeatureTable table={rampageTable} level={character.level || 1} reached={rampage} />}
        <StatblockCard block={comp} level={character.level || 1} staminaNote="= yours">
          {attuned.length > 0 && (
            <div className="kit-meta-line">Attuned: {attuned.join(', ')}</div>
          )}
        </StatblockCard>
      </div>
    </Panel>
  );
}

// ── Summoner: up to two squads of same-name minions with pooled Stamina.
// Summon/dismiss move whole per-minion chunks; the damage entry runs the
// chunk-death math and reports excess without auto-applying it to the hero. ──
function MinionsPanel({ character, derived, canEdit, setPlay, showTip, hideTip }) {
  const cls = classDef(character);
  const play = character.play || {};
  const squads = play.squads || [];
  // Squad-able minions the character knows (signature + picked tiers); fixtures
  // and champions have no essence cost and are not squads.
  const known = collectMinionIds(character).map(id => minionById(id)).filter(m => m && m.cost);
  const max = minionMax(character);
  const totalAlive = squads.reduce((s, sq) => s + squadAlive(sq, perMinionStamina(minionById(sq.minionId), character)), 0);
  const formation = character.cclass?.formation || '—';
  const quickCommand = character.cclass?.quickCommand || '—';
  const formationDef = (cls?.formations || []).find(f => f.name === formation);
  const qcDef = (cls?.quickCommands || []).find(f => f.name === quickCommand);
  const freePerTurn = String(formation).startsWith('Horde') ? 4 : 3;
  const setSquads = (fn) => setPlay(p => ({ ...p, squads: fn(p.squads || []) }));
  const addSquad = canEdit ? () => setSquads(sqs => sqs.length >= 2 ? sqs : [
    ...sqs,
    { id: `sq-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`, minionId: known[0]?.id || null, stamina: 0 },
  ]) : null;
  const endEncounter = canEdit ? () => setPlay(p => ({ ...p, resource: 0, squads: [] })) : null;
  const squadTypes = [...new Set(squads.map(sq => sq.minionId).filter(Boolean))];
  return (
    <Panel title="Minions" collapsible>
      <div className="stack-12">
        <div className="mc-stats">
          <StatTile label="Summoner’s Range" value={5 + (derived.chars?.Reason || 0)} />
          <StatTile label="Minions" value={totalAlive} sub={` / ${max}`} />
          <span onMouseEnter={formationDef ? showTip(formationDef.name, formationDef.text) : undefined} onMouseLeave={hideTip}>
            <StatTile label="Formation" value={String(formation).replace(/ Formation$/, '')} />
          </span>
          <span onMouseEnter={qcDef ? showTip(qcDef.name, qcDef.text) : undefined} onMouseLeave={hideTip}>
            <StatTile label="Quick Command" value={quickCommand} />
          </span>
        </div>
        <div className="empty-note">
          Start of combat: 2 free signature minions · start of turn: +2 essence, {freePerTurn} free signature minions.
        </div>
        {squads.map(sq => (
          <SquadRow
            key={sq.id}
            squad={sq}
            character={character}
            known={known}
            canEdit={canEdit}
            canSummon={totalAlive < max}
            onChange={(next) => setSquads(sqs => sqs.map(x => x.id === sq.id ? next : x))}
            onRemove={() => setSquads(sqs => sqs.filter(x => x.id !== sq.id))}
          />
        ))}
        <div className="mc-row">
          <Button kind="ghost" small onClick={addSquad} disabled={!addSquad || squads.length >= 2}>ADD SQUAD ✚</Button>
          <div style={{ flex: 1 }}></div>
          <Button kind="ghost" small onClick={endEncounter} disabled={!endEncounter} title="End of combat: minions are dismissed and essence is lost">END ENCOUNTER ✕</Button>
        </div>
        {squadTypes.map(id => {
          const m = minionById(id);
          return m ? (
            <details className="sb-details" key={id}>
              <summary>{m.name} — stat block</summary>
              <StatblockCard block={m} level={character.level || 1} />
            </details>
          ) : null;
        })}
      </div>
    </Panel>
  );
}

function SquadRow({ squad, character, known, canEdit, canSummon, onChange, onRemove }) {
  const minion = minionById(squad.minionId);
  const per = perMinionStamina(minion, character);
  const alive = squadAlive(squad, per);
  const [dmg, setDmg] = useState('');
  const [note, setNote] = useState(null);
  const leader = String(character.cclass?.formation || '').startsWith('Leader');
  const summon = canEdit && canSummon && minion && alive < 8 ? () => onChange({ ...squad, stamina: (squad.stamina || 0) + per }) : null;
  const dismiss = canEdit && alive > 0 ? () => onChange({ ...squad, stamina: Math.max(0, (squad.stamina || 0) - per) }) : null;
  const applyDamage = () => {
    const n = parseInt(dmg, 10);
    if (!Number.isFinite(n) || n <= 0) return;
    const r = applySquadDamage(squad, n, per);
    onChange({ ...squad, stamina: r.stamina });
    const bits = [];
    if (r.deaths > 0) bits.push(`${r.deaths} ${r.deaths === 1 ? 'minion dies' : 'minions die'}`);
    if (r.excess > 0 && !leader) bits.push(`excess ${r.excess} — you take ${2 + (character.level || 1)}`);
    if (r.excess > 0 && leader) bits.push('excess ignored (Leader Formation)');
    setNote(bits.length ? bits.join(' · ') : 'the squad holds');
    setDmg('');
  };
  return (
    <div className="squad-row">
      <div className="mc-row">
        <select
          className="sig-option-select"
          value={squad.minionId || ''}
          disabled={!canEdit || (squad.stamina || 0) > 0}
          title={(squad.stamina || 0) > 0 ? 'Dismiss the squad before changing its minion type' : undefined}
          onChange={(e) => onChange({ ...squad, minionId: e.target.value, stamina: 0 })}>
          <option value="" disabled>Choose minion…</option>
          {known.map(m => <option key={m.id} value={m.id}>{m.name} · {m.cost.essence} essence</option>)}
        </select>
        <button type="button" className="icon-btn" disabled={!onRemove || !canEdit} onClick={onRemove} title="Disband this squad">✕</button>
      </div>
      <div className="mc-row">
        <span className="sq-fig">⛊ {alive} / 8</span>
        <span className="sq-fig muted">pool {squad.stamina || 0}{minion ? ` (${per}/minion)` : ''}</span>
        <div className="cnt-ctl">
          <button disabled={!dismiss} onClick={dismiss} title="Dismiss / lose one minion">−1</button>
          <button disabled={!summon} onClick={summon} title="Summon one minion">+1</button>
        </div>
        <input
          className="sq-dmg"
          type="number"
          min="1"
          placeholder="dmg"
          value={dmg}
          disabled={!canEdit || alive === 0}
          onChange={(e) => setDmg(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') applyDamage(); }}
        />
        <Button kind="ghost" small onClick={applyDamage} disabled={!canEdit || alive === 0}>APPLY</Button>
      </div>
      {note && <div className="empty-note">{note}</div>}
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
  display: grid; grid-template-rows: auto 1fr; overflow: hidden;
  /* Grid and flex children default to min-width:auto, so a wide row would push
     this past the viewport and get clipped rather than fitting. */
  min-width: 0;
}
/* Bar geometry/type comes from the shared .topbar (theme/styles.js); only the
   play-specific rules (collapsible buttons, ⋯ menu, readonly tag) live here. */

/* Sheet head — masthead, vitals, conditions, and the tab strip. Scrolls away
   with the rest of the sheet; z-index lifts it above the fixed class-art
   background. min-width: 0 so the unshrinkable vitals tiles can't widen it
   past the viewport. */
.play-head { position: relative; z-index: 2; min-width: 0; }
.play-head-inner { max-width: 1320px; margin: 0 auto; padding: 20px 32px 16px; }

.hero-masthead {
  display: grid; grid-template-columns: auto 1fr auto auto auto; align-items: center; gap: 22px;
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
/* Clickable portrait + lightbox. The thumb becomes a <button> when an image
   exists; the reset keeps the grid cell at the exact thumb size in every tier. */
button.hb-portrait { padding: 0; cursor: zoom-in; }
.portrait-lightbox { cursor: zoom-out; }
.portrait-lightbox img {
  max-width: min(92vw, 720px); max-height: 88dvh; object-fit: contain;
  border: 1px solid var(--gold); background: var(--bg-2);
  box-shadow: 0 0 44px var(--gold-glow), 0 18px 60px rgba(0,0,0,0.6);
  cursor: default;
}
.portrait-lightbox .pl-close {
  position: absolute; top: 14px; right: 18px;
  background: none; border: none; padding: 6px; cursor: pointer;
  font-size: 1.75rem; line-height: 1; color: var(--ink-2);
}
.portrait-lightbox .pl-close:hover { color: var(--gold-2); }
/* The lone 1fr track competes with four fixed ones; min-width:auto would let a
   long name push the row past the viewport (same reasoning as .play above). */
.hb-text { min-width: 0; }
.hb-eyebrow { font-family: var(--mono); font-size: var(--fs-3); letter-spacing: 0.28em; text-transform: uppercase; color: var(--gold-2); margin-bottom: 6px; }
.hb-name { font-family: var(--display); font-size: 2.5rem; line-height: 1; letter-spacing: 0.04em; color: var(--ink); text-wrap: balance; font-variant-ligatures: none; }
.hb-meta { font-family: var(--display-2); font-size: var(--fs-8); letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-2); margin-top: 10px; }
.hb-meta .hb-sub { color: var(--gold-2); }
/* Three stacked buttons must fit beside the 96px portrait without growing the
   masthead: tighter gap and vertical padding keep the stack at ~94px. */
.hb-actions { display: flex; flex-direction: column; gap: 8px; align-items: stretch; flex: none; }
/* .btn is inline-flex without justify-content; stretched to a common width the
   shorter label would sit flush left. */
.hb-actions .btn { justify-content: center; padding-top: 6px; padding-bottom: 6px; }
/* The bare ghost variant vanishes against --grad-masthead; give it the same
   filled-tint treatment as .btn.danger, in the masthead's gold. The resting
   tint outshines the global .btn:hover wash (and outranks it on specificity),
   so it needs its own brighter hover, like .btn.danger:hover. */
.hb-actions .btn.ghost {
  background: linear-gradient(180deg, rgba(212,169,69,0.14), rgba(212,169,69,0.05));
  border-color: var(--gold-deep);
  color: var(--ink);
}
.hb-actions .btn.ghost:hover {
  background: linear-gradient(180deg, rgba(212,169,69,0.24), rgba(212,169,69,0.10));
  border-color: var(--gold);
}
.hb-level { text-align: center; flex: none; padding-left: 22px; border-left: 1px solid var(--line-2); }
.hb-level-num { font-family: var(--display-2); font-size: 2.875rem; line-height: 1; color: var(--gold-2); }
.hb-level-lbl { font-family: var(--mono); font-size: var(--fs-2); letter-spacing: 0.28em; text-transform: uppercase; color: var(--ink-3); margin-top: 4px; }

/* Ledger — Renown/Wealth/XP as .hb-level-style stat blocks (smaller numbers so
   Level stays the dominant figure), hairline dividers; .hb-level supplies the
   divider after XP. Editable numbers render as buttons (click → type-in field);
   the dotted underline is the only resting affordance so the ledger still reads
   as plain figures. */
.hb-ledger { display: flex; align-items: center; flex: none; }
.hb-stat { text-align: center; padding: 0 16px; border-left: 1px solid var(--line-2); }
.hb-stat:first-child { border-left: 0; }
.hb-stat-row { display: flex; align-items: center; justify-content: center; gap: 6px; }
.hb-stat-num { font-family: var(--display-2); font-size: 1.5rem; line-height: 1;
  color: var(--gold-2); min-width: 1.4em; }
button.hb-stat-num {
  background: none; border: none; padding: 0; cursor: pointer;
  text-decoration: underline dotted var(--line-2); text-underline-offset: 5px;
}
button.hb-stat-num:hover { color: var(--gold); text-decoration-color: var(--gold); }
/* The type-in field mirrors the number's font metrics so the row doesn't jump. */
.hb-stat-input {
  font-family: var(--display-2); font-size: 1.5rem; line-height: 1;
  width: 3.5ch; padding: 0; text-align: center;
  color: var(--ink); background: var(--bg-2);
  border: 1px solid var(--gold); outline: none;
}
.hb-stat-lbl { font-family: var(--mono); font-size: var(--fs-2); letter-spacing: 0.28em;
  text-transform: uppercase; color: var(--ink-3); margin-top: 4px; }

/* Respite confirm modal body */
.respite-lede { color: var(--ink-2); margin: 0 0 12px; }
.respite-list { margin: 0; padding-left: 20px; color: var(--ink-2); }
.respite-list li { margin: 6px 0; }
.respite-list strong { color: var(--gold-2); font-weight: 600; }

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
  max-width: 1320px; margin: 0 auto; padding: 16px 32px 28px;
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
.play-readonly .squad-row button,
.play-readonly .squad-row input,
.play-readonly .squad-row select,
.play-readonly .mc-row button { pointer-events: none; opacity: 0.5; }

/* Master-class trackers (Beastheart companion, Summoner minion squads). */
.mc-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.mc-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; }
.squad-row { border: 1px solid var(--line); padding: 10px 12px; display: grid; gap: 8px; }
.sq-fig { font-family: var(--mono); font-size: var(--fs-5); color: var(--ink); }
.sq-fig.muted { color: var(--ink-3); font-size: var(--fs-3); }
.sq-dmg {
  width: 64px; font-family: var(--mono); font-size: var(--fs-5); color: var(--ink);
  background: transparent; border: 1px solid var(--line-2); padding: 5px 8px;
}
.sq-dmg:focus { outline: none; border-color: var(--gold); }
.sb-details summary {
  font-family: var(--mono); font-size: var(--fs-3); color: var(--ink-3);
  letter-spacing: 0.18em; text-transform: uppercase; cursor: pointer; padding: 4px 0;
}
.sb-details[open] summary { color: var(--gold-2); }
.sb-details > .statblock { margin-top: 8px; }
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

/* Source-group headers inside the Abilities panel — ornamental rule-and-label
   rows that scroll with their group. */
.abil-group + .abil-group { margin-top: 18px; }
.abil-group-head {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 0; margin-bottom: 10px;
}
.abil-group-head .agh-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, var(--line-2)); }
.abil-group-head .agh-line:last-child { background: linear-gradient(90deg, var(--line-2), transparent); }
.abil-group-head .agh-label {
  font-family: var(--display-2); font-size: var(--fs-6); font-weight: 700;
  letter-spacing: 0.2em; text-transform: uppercase; color: var(--gold-2);
  text-align: center;
}
/* Ornament glyphs live in pseudo-elements: they stay out of textContent, so the
   header still reads as exactly its label (screen readers, tests). */
.abil-group-head .agh-label::before { content: '❦'; margin-right: 10px; opacity: 0.55; }
.abil-group-head .agh-label::after { content: '❦'; margin-left: 10px; opacity: 0.55; }

/* Conditions strip — wraps into extra rows beside the other live trackers so
   every chip stays visible; no scroll, so no fade mask (a mask on a row that
   doesn't overflow would permanently dim the last chip). */
.cond-strip {
  display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px;
}
/* The wrapper is the flex item (and the tooltip hover target — it keeps firing
   on the read-only sheet where the button itself is disabled). */
.cond-strip .cond-wrap { flex: 0 0 auto; display: inline-flex; }
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

/* Hover tooltip (conditions, potency legend) — position: fixed so no header
   stacking context or clipping ancestor can cut it off; pointer-events: none
   so it never traps the cursor. */
.play-tip {
  position: fixed; z-index: 60; width: max-content; max-width: 380px;
  border: 1px solid var(--gold-deep); background: var(--bg-1);
  box-shadow: 0 12px 34px rgba(0,0,0,0.55);
  padding: 12px 16px; pointer-events: none;
}
.play-tip .pt-name {
  font-family: var(--mono); font-size: var(--fs-3); color: var(--gold-2);
  letter-spacing: 0.24em; text-transform: uppercase; margin-bottom: 7px;
}
.play-tip .pt-text {
  font-family: var(--serif); font-size: var(--fs-6); color: var(--ink-2);
  line-height: 1.5; margin: 0;
}
.play-tip .pt-text + .pt-text { margin-top: 7px; }

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
.prog-actions { display: flex; flex-direction: column; gap: 6px; align-items: stretch; }
.prog-del:hover { color: var(--rubric-2); border-color: var(--rubric); box-shadow: 0 0 12px rgba(193,74,58,0.35); }

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
     plus four buttons still crowds the bar once the save pill and read-only
     tag join in. This is the only place the threshold is expressed — play.jsx
     renders both branches and lets CSS pick. */
  .play-top .tb-right > .btn.collapsible { display: none; }
  .pt-menu-wrap { display: block; }
  /* The desktop tracks also run out of room here: at 901-1024px the 6-card
     vitals row and the 2-column grid collide labels with values. Same
     collapse as the tablet tier, one breakpoint earlier. */
  .play-grid { grid-template-columns: minmax(0, 1fr); }
  .play-head-inner { padding: 16px 20px 14px; }
  /* Two rows instead of a scroll strip: the gauges split the top row, the four
     counters share the second — everything visible without horizontal scroll.
     minmax(0, …) for the same reason as the desktop rule above. */
  .vitals { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .vitals .vital { grid-column: span 2; }
}

${MQ.tab} {
  .play-grid { grid-template-columns: 1fr; }
  /* Compact in place rather than reflowing the level below the name — extra
     masthead rows push the vitals and tabs further down the page. */
  .hero-masthead { gap: 16px; padding: 12px 16px; }
  .hb-portrait { width: 72px; height: 72px; }
  .hb-name { font-size: 1.75rem; }
  .hb-level-num { font-size: 1.75rem; }
  .hb-stat { padding: 0 10px; }
  .hb-stat-num, .hb-stat-input { font-size: 1.25rem; }
  .hb-stat-lbl { letter-spacing: 0.16em; }
  .play-content { padding: 18px 20px 22px; }
  /* At 561px a counter track is ~121px; RECOVERIES at the default 0.22em
     tracking is ~105px against ~91px of inner width — 0.1em fits it. */
  .cnt-lbl { letter-spacing: 0.1em; }
}

${MQ.phone} {
  /* The action buttons need the room more than the brand does. */
  .play-top .tb-text { display: none; }

  .chars-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .cond { padding: 8px 8px; letter-spacing: 0.12em; }
  .prog-row { grid-template-columns: auto 1fr; }
  .prog-row .prog-actions { grid-column: 1 / -1; justify-self: start; margin-top: 8px; flex-direction: row; }

  /* Unlike the tablet tier, the actions do reflow to a second row here: two
     44px-tall buttons cannot share a row with a 44px portrait, and the extra
     masthead row is net-neutral — these buttons vacated the top bar. */
  .hero-masthead { gap: 10px; padding: 8px 10px; margin-bottom: 10px; grid-template-columns: auto 1fr auto; }
  .hb-actions { grid-column: 1 / -1; grid-row: 2; flex-direction: row; gap: 6px; }
  /* Three labels share ~332px: at the default 0.18em tracking the longest
     (biography) is wider than a third of that, so the other two wrap into
     two-line blobs. Tighter tracking + slim padding keeps each on one line;
     nowrap so a near-miss overflows the border a pixel instead of stacking. */
  .hb-actions .btn { flex: 1; padding-left: 4px; padding-right: 4px; letter-spacing: 0.08em; white-space: nowrap; min-width: 0; }
  .hb-portrait { width: 44px; height: 44px; }
  .hb-portrait .hb-glyph { font-size: 1.25rem; }
  .hb-eyebrow { display: none; }
  .hb-name { font-size: 1.25rem; }
  .hb-meta { letter-spacing: 0.1em; font-size: var(--fs-3); margin-top: 4px; }
  .hb-level { padding-left: 10px; }
  .hb-level-num { font-size: 1.375rem; }
  /* The ledger takes its own full-width row under the actions — a footer strip
     of the masthead card (same net-neutral-row argument as .hb-actions above). */
  .hb-ledger {
    grid-column: 1 / -1; grid-row: 3;
    justify-content: space-around;
    border-top: 1px solid var(--line-2); padding-top: 8px;
  }
  .hb-stat { border-left: 0; padding: 0; }
  .hb-stat-num, .hb-stat-input { font-size: 1.375rem; }
  /* Gauges stack full-width, counters go 2×2: four-across would leave ~23px
     buttons and clip RECOVERIES; side-by-side gauges leave ~31px buttons. */
  .vitals { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .vitals .vital { grid-column: 1 / -1; }
  .vital, .counter { padding: 10px 12px; }

  .play-head-inner { padding: 10px max(14px, env(safe-area-inset-left)) 12px max(14px, env(safe-area-inset-right)); }
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
export { PlayView, conditionedSpeed, perMinionStamina, minionMax, squadAlive, applySquadDamage };
