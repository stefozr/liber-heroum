import React from 'react';
import { DS_ANCESTRIES, DS_CAREERS, DS_CLASSES, DS_KITS, DS_COMPLICATIONS, DS_LEVEL_BONUSES, DS_STEPS } from './data.jsx';
import { ThemeStyles, Pill, Button } from './theme.jsx';
import { DS } from './backend.jsx';
import { AccountStyles, AuthScreen, NotInvitedScreen, DisplayNamePrompt, AppBar, Masthead } from './auth.jsx';
import { AdminScreen } from './admin.jsx';
import { CampaignStyles, CampaignHub, CampaignDetail } from './campaigns.jsx';
// Dev-only design-host tweaks panel (H16): lazy so the module — and its foreign
// light-mode design system — is excluded from production bundles entirely.
const TweaksHost = import.meta.env.DEV ? React.lazy(() => import('./tweaks-host.jsx')) : null;
import { RosterScreen } from './roster.jsx';
import { Wizard } from './wizard.jsx';
import { PlayView } from './play.jsx';
import { careerAutoCollisions, effectiveCareerSkills, classGrantCollisions, effectiveClassGrants, effectiveComplicationSkills, formerLifeDef, resolvedAncestryTraits, ancestrySignatures, parseCareerSkills } from './wizard/helpers.js';
import { LEVELUP_DATA } from './levelup.jsx';
// app.jsx — main app shell: routing, character state, localStorage persistence.

const { useState, useEffect, useMemo, useReducer, useCallback } = React;

// ───────── persistence ─────────
// All reads/writes go through the backend seam (backend.jsx → window.DS), which
// now speaks to Supabase. Character ids are client-supplied text (the DB column
// is text), so the wizard can create a hero locally and upsert it as-is.
const LS_VIEW = `${DS.K.session}/view`;   // last view is a per-device UI preference
const NOOP_UPDATE = () => {};             // read-only PlayView: mutations are no-ops

// ── Hash router (deep links) ──
// '#/hero/<id>' | '#/campaign/<id>' | '#/campaigns' | '#/admin' | '#/'.
// Only '#/'-prefixed hashes are ours — the OAuth callback ('#access_token=…')
// must pass through untouched for supabase-js to consume.
function parseHash(h) {
  if (!h || !h.startsWith('#/')) return null;
  const [seg, id] = h.slice(2).replace(/\/+$/, '').split('/');
  if (!seg) return { view: 'roster' };
  if (seg === 'campaigns') return { view: 'campaigns' };
  if (seg === 'admin') return { view: 'admin' };
  if (seg === 'hero' && id) return { view: 'hero', id: decodeURIComponent(id) };
  if (seg === 'campaign' && id) return { view: 'campaign', id: decodeURIComponent(id) };
  return null;
}
// wizard and play both serialize to '#/hero/<id>' — the URL deliberately never
// encodes editability; opening it re-derives wizard-vs-play via openCharacter.
function navToHash({ view, activeId, activeCampaignId }) {
  if ((view === 'wizard' || view === 'play') && activeId) return `#/hero/${encodeURIComponent(activeId)}`;
  if (view === 'campaign' && activeCampaignId) return `#/campaign/${encodeURIComponent(activeCampaignId)}`;
  if (view === 'campaigns') return '#/campaigns';
  if (view === 'admin') return '#/admin';
  return '#/';
}

// Pure editability rule (mirrors the characters_update RLS policy): a hero may be edited
// by its owner, the director of its campaign, or a global admin. Everyone else may only
// view. Exported for unit testing; the App wraps it in a useCallback over current state.
function canEditCharacterFor(ch, user, campaigns) {
  if (!ch || !user) return false;
  if (ch.ownerId === user.id) return true;
  if (user.isAdmin) return true;
  const camp = ch.campaignId ? (campaigns || []).find(c => c.id === ch.campaignId) : null;
  return !!(camp && camp.gmId === user.id);
}

function uid() {
  return 'c' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

// ───────── Empty character template ─────────
function newCharacter(ownerId = null, campaignId = null) {
  return {
    id: uid(),
    ownerId,         // which account this hero belongs to
    campaignId,      // which campaign it's brought to (null = personal roster only)
    createdAt: Date.now(),
    lastModified: Date.now(),
    status: 'in-progress',
    level: 1,
    wizardStep: 0,

    name: '',
    portrait: '',

    ancestry: { id: null, traits: [], formerLife: null, prevLifeTraits: {}, sigSkills: {}, sigOptions: {}, traitSkills: {}, traitOptions: {} },
    culture: { language: 'Caelian', environment: null, organization: null, upbringing: null, archetype: null, skills: {} },
    career: { id: null, incident: '', taken: '', languages: [], skills: [], perk: '' },
    cclass: { id: null, subclass: null, domains: [], characteristics: {}, charArrayIndex: 0, signatures: [], heroic3: null, heroic5: null, skills: [], deity: '', charModel: 'v2' },
    kit: { id: null },
    kit2: { id: null },
    complication: { id: null, custom: '', skills: {}, languages: [] },
    identity: { name: '', pronouns: '', age: '', height: '', weight: '', appearance: '', backstory: '', deity: '' },
    levelChoices: {},

    // play-state
    play: {
      stamina: null, // current
      resource: 0,   // current Heroic Resource
      recoveriesUsed: 0,
      victories: 0,
      surges: 0,
      heroTokens: 0,
      renownAdj: 0,  // Director-awarded delta on top of the derived renown base
      wealthAdj: 0,  // Director-awarded delta on top of the derived wealth base
      xp: 0,         // grows when a respite converts victories
      conditions: {},
      notes: '',
    },
  };
}

// ───────── Derived stats ─────────
function classDef(c) { return c.cclass.id ? DS_CLASSES.find(x => x.id === c.cclass.id) : null; }
function ancestryDef(c) { return c.ancestry.id ? DS_ANCESTRIES.find(x => x.id === c.ancestry.id) : null; }
function kitDef(c) { return c.kit.id ? DS_KITS.find(x => x.id === c.kit.id) : null; }
function kit2Def(c) { return c.kit2?.id ? DS_KITS.find(x => x.id === c.kit2.id) : null; }
function careerDef(c) { return c.career.id ? DS_CAREERS.find(x => x.id === c.career.id) : null; }
function complicationDef(c) { return c.complication.id ? DS_COMPLICATIONS.find(x => x.id === c.complication.id) : null; }

// ───────── Characteristic level bonuses (derived, never baked into the point-buy) ─────────
// The wizard's point-buy lives in c.cclass.characteristics as the level-1 base. Level-up
// increases are NOT written there; instead they're replayed here from the character's level
// and stored level choices, so re-editing in the wizard always sees a valid level-1 spread.
const CHAR_KEYS = ['Might', 'Agility', 'Reason', 'Intuition', 'Presence'];
// Characteristics picked via any char-bonus choice recorded at level l. Choice ids vary
// by class and level (char-bonus-4 today), so match on the choice's kind, not its id.
function charBonusPicksAt(d, c, l) {
  const picks = c.levelChoices && c.levelChoices[l] && c.levelChoices[l].picks;
  if (!d || !picks) return [];
  const out = [];
  for (const ch of d.choices || []) {
    if (ch.kind !== 'char-bonus') continue;
    const pick = picks[ch.id];
    if (!pick) continue;
    const k = pick.id || pick.name || pick;
    if (CHAR_KEYS.includes(k)) out.push(k);
  }
  return out;
}
function levelCharBonuses(c) {
  const out = { Might: 0, Agility: 0, Reason: 0, Intuition: 0, Presence: 0 };
  const cls = classDef(c);
  const data = (cls && typeof window !== 'undefined' && window.LEVELUP_DATA) ? window.LEVELUP_DATA[cls.id] : null;
  if (!cls || !data) return out;
  const base = { Might: 0, Agility: 0, Reason: 0, Intuition: 0, Presence: 0, ...(c.cclass.characteristics || {}) };
  const total = { ...base };
  const lvl = c.level || 1;
  for (let l = 2; l <= lvl; l++) {
    const d = data[l];
    if (!d) continue;
    if (d.autoCharacteristicIncrease) {
      for (const [k, v] of Object.entries(d.autoCharacteristicIncrease)) {
        if (k === 'max' || !CHAR_KEYS.includes(k)) continue;
        total[k] = Math.max(total[k], v);
      }
    }
    if (d.autoCharIncreaseAll) {
      const { delta, max } = d.autoCharIncreaseAll;
      for (const k of CHAR_KEYS) total[k] = Math.min(max, total[k] + delta);
    }
    for (const k of charBonusPicksAt(d, c, l)) total[k] = Math.min(3, total[k] + 1);
  }
  for (const k of CHAR_KEYS) out[k] = total[k] - base[k];
  return out;
}

// One-time migration: older saves baked level-up increases directly into
// c.cclass.characteristics. Recover the true level-1 base so the wizard validates again
// and computeDerived doesn't double-count. Marked with charModel:'v2' to stay idempotent.
function migrateCharacterChars(c) {
  if (!c || !c.cclass) return c;
  if (c.cclass.charModel === 'v2') return c;
  const cls = classDef(c);
  const lvl = c.level || 1;
  if (!cls || lvl <= 1 || !c.cclass.characteristics) {
    return { ...c, cclass: { ...c.cclass, charModel: 'v2' } };
  }
  const data = (typeof window !== 'undefined' && window.LEVELUP_DATA) ? window.LEVELUP_DATA[cls.id] : null;
  const baked = { ...c.cclass.characteristics };
  const base = { ...baked };
  // Fixed/primary characteristics revert to their level-1 fixed value.
  const fixed = cls.fixedChars || {};
  for (const k of Object.keys(fixed)) base[k] = fixed[k];
  // Flex characteristics: subtract the additive bonuses (all-stat +1s and char-bonus picks).
  const flex = cls.flexCharOrder || [];
  if (data) {
    for (const k of flex) {
      let b = 0;
      for (let l = 2; l <= lvl; l++) {
        const d = data[l];
        if (!d) continue;
        if (d.autoCharIncreaseAll) b += d.autoCharIncreaseAll.delta;
        if (charBonusPicksAt(d, c, l).includes(k)) b += 1;
      }
      base[k] = (baked[k] || 0) - b;
    }
  }
  // Safety: if the recovered flex spread is invalid, fall back to a clean default.
  if (flex.length && cls.charArrays) {
    const vals = flex.map(k => base[k]);
    const budget = Math.max(...cls.charArrays.map(arr => arr.reduce((s, v) => s + v, 0)));
    const bad = vals.some(v => typeof v !== 'number' || v < -1 || v > 2) || vals.reduce((s, v) => s + v, 0) !== budget;
    if (bad) {
      const arr = cls.charArrays.find(a => a.reduce((s, v) => s + v, 0) === budget) || cls.charArrays[0];
      flex.forEach((k, i) => { base[k] = arr[i] != null ? arr[i] : 0; });
    }
  }
  return { ...c, cclass: { ...c.cclass, characteristics: base, charModel: 'v2' } };
}

// Every always-on stat bonus the character has picked up outside their kit:
// ancestry traits, the chosen prayer/ward/enchantment/augmentation, always-on
// class features (Null Speed), the complication, and level-gated subclass
// features from DS_LEVEL_BONUSES. Kits stay separate — Field Arsenal merges
// the two kits' bonuses via max, while everything here stacks additively.
function collectStatBonuses(c) {
  const cls = classDef(c);
  const anc = ancestryDef(c);
  const comp = complicationDef(c);
  const lvl = c.level || 1;
  const out = [];

  if (anc) {
    // Resolves the revenant's 'Previous Life' entries to the borrowed trait, so its
    // bonuses count too.
    for (const t of resolvedAncestryTraits(c)) if (t.bonuses) out.push(t.bonuses);
  }
  if (cls) {
    for (const f of cls.features || []) if (f.bonuses) out.push(f.bonuses);
    // Chosen "choose one" options (prayer/ward/enchantment/augmentation/triggered).
    const pick = (list, chosen) => {
      const o = chosen && (list || []).find(x => x.name === chosen);
      if (o?.bonuses) out.push(o.bonuses);
    };
    pick(cls.prayers, c.cclass?.prayer);
    pick(cls.wards, c.cclass?.ward);
    pick(cls.enchantments, c.cclass?.enchantment);
    pick(cls.triggereds, c.cclass?.triggeredAction);
    for (const row of DS_LEVEL_BONUSES) {
      if (row.cls !== cls.id || lvl < row.level) continue;
      if (row.sub && row.sub !== c.cclass?.subclass) continue;
      out.push(row.bonuses);
    }
  }
  if (comp?.bonuses) out.push(comp.bonuses);
  // Level-up picks (features/abilities chosen in the level-up flow) that carry stat
  // bonuses. None of the current LEVELUP_DATA options do, but the pipeline honors them.
  for (let l = 2; l <= lvl; l++) {
    const picks = c.levelChoices?.[l]?.picks;
    if (!picks) continue;
    for (const p of Object.values(picks)) if (p?.bonuses) out.push(p.bonuses);
  }
  return out;
}

function computeDerived(c) {
  const cls = classDef(c);
  const kit = kitDef(c);
  const kit2 = kit2Def(c);
  const anc = ancestryDef(c);
  // Field Arsenal: a tactician equips two kits. When both grant the same
  // benefit, you take the higher — so merge each numeric bonus via max.
  const kb = (key) => Math.max(kit?.bonuses?.[key] || 0, kit2?.bonuses?.[key] || 0);

  const lvl = c.level || 1;
  const echelon = lvl <= 3 ? 1 : lvl <= 6 ? 2 : lvl <= 9 ? 3 : 4;

  // Characteristics first — several bonuses scale with a characteristic score.
  const base = { Might: 0, Agility: 0, Reason: 0, Intuition: 0, Presence: 0, ...c.cclass.characteristics };
  const charBonuses = levelCharBonuses(c);
  const chars = {};
  for (const k of ['Might', 'Agility', 'Reason', 'Intuition', 'Presence']) chars[k] = (base[k] || 0) + (charBonuses[k] || 0);
  const highest = Math.max(...Object.values(chars));
  const charVal = (name) => (name === 'highest' ? highest : chars[name] || 0);

  const bonuses = collectStatBonuses(c);
  const sum = (key) => bonuses.reduce((s, b) => s + (b[key] || 0), 0);
  const sumChar = (key) => bonuses.reduce((s, b) => s + (b[key] ? charVal(b[key]) : 0), 0);

  let staminaMax = 0;
  if (cls) {
    staminaMax = cls.starting.stamina1 + (lvl - 1) * cls.starting.staminaPer;
  }
  // Per-echelon stamina: best-of-kits + everything else (traits, augmentations, ...).
  staminaMax += (kb('sta_per') + sum('sta_per')) * echelon;
  staminaMax += sum('sta') + sum('sta_lvl') * lvl;

  const recoveries = (cls ? cls.starting.recoveries : 0) + sum('rec');

  // Speed: "you have speed N" traits (spdMin) upgrade the ancestry base
  // (official data: upgrade @ initial phase); additive bonuses stack on top.
  let speedBase = anc ? anc.speed : 5;
  for (const b of bonuses) if (b.spdMin) speedBase = Math.max(speedBase, b.spdMin);
  const speed = speedBase + kb('spd') + sum('spd') + sumChar('spdChar');

  const stability = (anc ? anc.stability : 0) + kb('stab') + sum('stab') + sumChar('stabChar') + sum('stabLvl') * lvl;

  const disengage = 1 + kb('disengage') + sum('disengage') + sumChar('disChar');

  const recoveryValue = Math.floor(staminaMax / 3)
    + bonuses.reduce((s, b) => s + (b.recBonusChar ? charVal(b.recBonusChar) : 0), 0);
  const winded = Math.floor(staminaMax / 2);

  // A revenant's size is the former life's size (Former Life signature trait).
  const size = (formerLifeDef(c) || anc)?.size || '1M';

  // Renown/Wealth bases: careers and complications grant flat amounts; wealth
  // starts at 1 and rises by 1 at every odd level from 3 (3/5/7/9). Director
  // adjustments live in c.play.renownAdj / wealthAdj on top of these.
  const car = careerDef(c);
  const comp = complicationDef(c);
  const renownBase = (car?.renown || 0) + (comp?.renown || 0);
  const wealthBase = 1 + (car?.wealth || 0) + (comp?.wealth || 0) + Math.floor((lvl - 1) / 2);

  return {
    staminaMax, recoveries, recoveryValue, winded,
    speed, stability, disengage, size, renownBase, wealthBase,
    chars, highest, echelon,
    potency: cls ? {
      weak: highest - 2, average: highest - 1, strong: highest,
    } : { weak: 0, average: 0, strong: 0 },
  };
}

// Current Renown / Wealth / XP: derived base + Director adjustment. Renown can't
// drop below 0; wealth can (Indebted starts at −5 — debt is a real state).
function playCurrencies(c, derived = computeDerived(c)) {
  const p = c.play || {};
  return {
    renown: Math.max(0, (derived.renownBase || 0) + (p.renownAdj || 0)),
    wealth: (derived.wealthBase || 0) + (p.wealthAdj || 0),
    xp: p.xp || 0,
  };
}

// ───────── Sync error banner ─────────
// Fixed bottom-center alert for failed writes. Renders nothing unless a write
// actually failed — the quiet path stays quiet. Autosave errors surface here on
// chrome views only (wizard/play carry their own SavePill in the top bar);
// op errors (delete/assign/campaign) surface everywhere.
function SyncPill({ saveState, syncError, onRetry, onDismiss }) {
  const autosaveFailed = saveState?.status === 'error';
  if (!autosaveFailed && !syncError) return null;
  return (
    <div className="sync-pill" role="alert">
      <Pill kind="rubric">⚠ {syncError ? syncError.msg : 'AUTOSAVE FAILED — CHANGES MAY BE LOST'}</Pill>
      {autosaveFailed && !syncError && <Button small kind="ghost" onClick={onRetry}>RETRY</Button>}
      {syncError && <Button small kind="ghost" onClick={onDismiss} title="Dismiss">✕</Button>}
    </div>
  );
}

// ───────── App ─────────
function App() {
  // ── identity (Supabase Auth manages the single signed-in user) ──
  const [currentUser, setCurrentUser] = useState(null);
  const [booting, setBooting] = useState(true);

  // ── data (RLS-scoped to what the signed-in user is allowed to see) ──
  const [users, setUsers] = useState([]);           // profiles: me + co-members (for avatars)
  const [characters, setCharacters] = useState([]);
  const [campaigns, setCampaigns] = useState([]);

  // ── navigation ──
  // A '#/'-hash captured at first render is a deep link: it outranks the
  // remembered LS_VIEW and is resolved against loaded data once boot completes.
  // Starting at 'roster' while one is pending keeps the boot guards inert.
  const pendingNavRef = React.useRef(parseHash(window.location.hash));
  const [activeId, setActiveId] = useState(null);
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [backView, setBackView] = useState({ view: 'roster' }); // where a hero editor returns to
  const [view, setView] = useState(() =>
    pendingNavRef.current ? 'roster' : (localStorage.getItem(LS_VIEW) || 'roster'));

  useEffect(() => { localStorage.setItem(LS_VIEW, view); }, [view]);

  const active = useMemo(() => characters.find(c => c.id === activeId) || null, [characters, activeId]);
  const activeCampaign = useMemo(() => campaigns.find(c => c.id === activeCampaignId) || null, [campaigns, activeCampaignId]);

  // A hero is editable by its owner, the director of its campaign, or a global admin.
  // The party may still VIEW each other's sheets read-only (RLS allows select); only
  // these three may write (mirrors the characters_update RLS policy).
  const canEditCharacter = useCallback(
    (ch) => canEditCharacterFor(ch, currentUser, campaigns),
    [currentUser, campaigns]
  );

  // Ref mirror of activeId so the realtime callback isn't stale without resubscribing.
  const activeIdRef = React.useRef(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  // ── boot + auth lifecycle ──
  // Loads the RLS-scoped store on boot and on a fresh sign-in. A token refresh
  // (user→user) deliberately does NOT reload, so it can't clobber an in-flight
  // optimistic edit, nor yank the user back to the roster mid-session.
  const refreshStore = useCallback(async () => {
    const { profiles, characters: chs, campaigns: cps } = await DS.loadAll();
    setUsers(profiles);
    setCharacters(chs.map(c => normalizeSkills(normalizeLanguages(migrateCharacterChars(c)))));
    setCampaigns(cps);
  }, []);

  const bootedRef = React.useRef(false);
  const hadUserRef = React.useRef(false);
  useEffect(() => {
    const unsub = DS.onAuthChange(async (user) => {
      const had = hadUserRef.current;
      hadUserRef.current = !!user;
      setCurrentUser(user);
      if (user) {
        // Non-whitelisted users see the NotInvitedScreen; RLS would return empty
        // sets anyway, so skip the dead queries.
        if (user.isAllowed && (!bootedRef.current || !had)) {
          try { await refreshStore(); } catch (e) { console.error('Failed to load your data', e); }
        }
        if (bootedRef.current && !had) { setActiveId(null); setActiveCampaignId(null); setView('roster'); }
      } else {
        setUsers([]); setCharacters([]); setCampaigns([]);
        setActiveId(null); setActiveCampaignId(null);
      }
      bootedRef.current = true;
      setBooting(false);
    });
    return unsub;
  }, [refreshStore]);

  // ── live sync: merge other clients' character changes in realtime ──
  // A player viewing the Director's edits (or vice-versa) sees them within ~1s. We skip the
  // hero the user is actively EDITING so an echo of their own save can't clobber in-progress
  // local state; everything else (incl. a hero we're only viewing read-only) is applied.
  useEffect(() => {
    if (booting || !currentUser || !currentUser.isAllowed) return;
    const off = DS.subscribeCharacters(
      (row) => setCharacters(prev => {
        if (row.id === activeIdRef.current && canEditCharacter(row)) return prev;
        const merged = normalizeSkills(normalizeLanguages(migrateCharacterChars(row)));
        const i = prev.findIndex(c => c.id === row.id);
        return i === -1 ? [...prev, merged] : prev.map(c => (c.id === row.id ? merged : c));
      }),
      (id) => setCharacters(prev => prev.filter(c => c.id !== id)),
    );
    return off;
  }, [booting, currentUser, canEditCharacter]);

  // ── warm the wizard's opening art while the app idles ──
  // The twelve ancestry posters and the chapter-one backdrop are static and
  // shared by every hero, so fetch them once right after sign-in: the first
  // wizard open then paints from browser cache instead of streaming ~1MB of
  // art while the user watches the grid fill in.
  useEffect(() => {
    if (booting || !currentUser?.isAllowed) return;
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const handle = idle(() => {
      for (const url of [DS_STEPS[0].bg, ...DS_ANCESTRIES.map(a => a.img)]) {
        if (url) { const img = new Image(); img.src = url; }
      }
    });
    return () => cancel(handle);
  }, [booting, currentUser]);

  // ── debounced per-character save (replaces the old whole-array write-through) ──
  // saveState drives the wizard's save pill: 'pending' while an edit is debouncing
  // or in flight, 'saved' (+timestamp) once Supabase confirms, 'error' on failure.
  const saveTimer = React.useRef(null);
  const pendingSave = React.useRef(null);
  const [saveState, setSaveState] = useState({ status: 'saved', at: null });
  // The character that most recently failed to save, kept for a user-driven retry.
  const lastFailedSave = React.useRef(null);
  const runSave = useCallback((ch) => {
    DS.upsertCharacter(ch)
      .then(() => { lastFailedSave.current = null; setSaveState({ status: 'saved', at: Date.now() }); })
      .catch(e => { console.error('Save failed', e); lastFailedSave.current = ch; setSaveState({ status: 'error', at: Date.now() }); });
  }, []);
  const retrySave = useCallback(() => {
    if (lastFailedSave.current) runSave(lastFailedSave.current);
  }, [runSave]);

  // One-slot error banner for the fire-and-forget writes (delete / assign /
  // campaign edits). Character autosave keeps its own saveState — mixing them
  // would make the wizard pill lie about the character when a campaign write fails.
  const [syncError, setSyncError] = useState(null);   // { msg, at } | null
  const reportSyncError = useCallback((msg) => setSyncError({ msg, at: Date.now() }), []);
  useEffect(() => {
    if (!syncError) return;
    const t = setTimeout(() => setSyncError(null), 8000);
    return () => clearTimeout(t);
  }, [syncError]);
  const queueSave = useCallback((c) => {
    pendingSave.current = c;
    setSaveState(s => (s.status === 'pending' ? s : { status: 'pending', at: s.at }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const ch = pendingSave.current; pendingSave.current = null; saveTimer.current = null;
      if (ch) runSave(ch);
    }, 600);
  }, [runSave]);
  const flushSave = useCallback(() => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    const ch = pendingSave.current; pendingSave.current = null;
    if (ch) runSave(ch);
  }, [runSave]);

  // A refresh/close inside the debounce window (or mid-flight) would silently drop
  // the last edit — the normal supabase fetch dies with the document. Hand any
  // pending save to a keepalive request the browser completes across the unload.
  // visibilitychange('hidden') also covers mobile tab-switches, where pagehide
  // may never fire before the process is culled.
  useEffect(() => {
    const flushKeepalive = () => {
      const ch = pendingSave.current;
      if (!ch) return;
      pendingSave.current = null;
      if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
      // If the page survives (tab switch rather than close), reflect the outcome
      // in the pill; if it's truly unloading these callbacks simply never run.
      DS.upsertCharacterKeepalive(ch)
        .then(() => { lastFailedSave.current = null; setSaveState({ status: 'saved', at: Date.now() }); })
        .catch(e => { console.error('Save failed', e); lastFailedSave.current = ch; setSaveState({ status: 'error', at: Date.now() }); });
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flushKeepalive(); };
    window.addEventListener('pagehide', flushKeepalive);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flushKeepalive);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Heroes belonging to the signed-in account (for the personal roster).
  const myCharacters = useMemo(
    () => (currentUser ? characters.filter(c => c.ownerId === currentUser.id) : []),
    [characters, currentUser]
  );
  const myCampaigns = useMemo(
    () => (currentUser ? campaigns.filter(c => c.memberIds.includes(currentUser.id)) : []),
    [campaigns, currentUser]
  );

  // ── character mutations ──
  // updateActive is the high-frequency path (every wizard keystroke). It updates
  // local state optimistically and debounces the network upsert via queueSave.
  const updateActive = useCallback((mutator) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeId) return c;
      const next = { ...(typeof mutator === 'function' ? mutator(c) : mutator), lastModified: Date.now() };
      queueSave(next);
      return next;
    }));
  }, [activeId, queueSave]);

  const createCharacter = useCallback((campaignId = null, back = { view: 'roster' }) => {
    if (!currentUser) return;
    const ch = newCharacter(currentUser.id, campaignId);
    setCharacters(prev => [...prev, ch]);
    setActiveId(ch.id);
    setBackView(back);
    setView('wizard');
    // Through the pill machinery: a failed create shows SAVE FAILED in the
    // wizard the user just landed in, and any subsequent edit re-upserts anyway.
    runSave(ch);
  }, [currentUser, runSave]);

  const openCharacter = useCallback((id, back = { view: 'roster' }) => {
    const ch = characters.find(c => c.id === id);
    if (!ch) return;
    setActiveId(id);
    setBackView(back);
    // Non-editors (other players viewing a party sheet) always land on the read-only
    // play view — never the wizard, even for an in-progress hero — so they can't edit.
    const editable = canEditCharacter(ch);
    setView(editable && ch.status !== 'complete' ? 'wizard' : 'play');
  }, [characters, canEditCharacter]);

  const deleteCharacter = useCallback((id) => {
    if (pendingSave.current && pendingSave.current.id === id) pendingSave.current = null;
    let removed = null;
    setCharacters(prev => { removed = prev.find(c => c.id === id) || null; return prev.filter(c => c.id !== id); });
    if (activeId === id) { setActiveId(null); setView('roster'); }
    DS.deleteCharacter(id).catch(e => {
      console.error('Delete failed', e);
      reportSyncError('ERASE FAILED — HERO RESTORED');
      // Optimistic removal diverged from the server; put the hero back.
      setCharacters(prev => (removed && !prev.some(c => c.id === id) ? [...prev, removed] : prev));
    });
  }, [activeId, reportSyncError]);

  const assignCharacter = useCallback((charId, campaignId) => {
    const before = characters.find(c => c.id === charId);
    if (!before) return;
    const next = { ...before, campaignId, lastModified: Date.now() };
    setCharacters(prev => prev.map(c => (c.id === charId ? next : c)));
    DS.upsertCharacter(next).catch(e => {
      console.error('Assign failed', e);
      reportSyncError('COULD NOT MOVE HERO — CHANGE UNDONE');
      setCharacters(prev => prev.map(c => (c.id === charId ? { ...c, campaignId: before.campaignId ?? null } : c)));
    });
  }, [characters, reportSyncError]);

  // ── navigation helpers ──
  const goBackFromHero = useCallback(() => {
    flushSave();   // ensure the last wizard/play edit is persisted before leaving
    if (backView && backView.view === 'campaign') {
      setActiveCampaignId(backView.campaignId);
      setView('campaign');
    } else if (backView && backView.view === 'admin') {
      setView('admin');
    } else {
      setView('roster');
    }
  }, [backView, flushSave]);

  const onNav = useCallback((target) => {
    flushSave();   // commit any debounced edit before the screen changes
    if (target === 'campaigns') { setActiveCampaignId(null); }
    setView(target);
  }, [flushSave]);

  const openCampaign = useCallback((id) => { setActiveCampaignId(id); setView('campaign'); }, []);

  // ── deep-link resolution ──
  // Runs once, on the first render after boot completes — refreshStore() is
  // awaited before setBooting(false), so characters/campaigns are loaded. Every
  // branch sets view together with a valid id (or bounces with a notice), so the
  // boot guards below never observe an inconsistent pair.
  const resolvingNavRef = React.useRef(false); // suppresses one history-mirror write
  useEffect(() => {
    if (booting) return;
    const nav = pendingNavRef.current;
    if (!nav) return;
    pendingNavRef.current = null;   // one-shot, even when the link can't be honored
    if (!currentUser || !currentUser.isAllowed) return; // auth/invite screens win
    if (nav.view === 'hero') {
      const ch = characters.find(c => c.id === nav.id);
      if (!ch) { reportSyncError("THAT HERO ISN'T IN YOUR CHRONICLE"); return; }
      resolvingNavRef.current = true;
      openCharacter(nav.id, ch.campaignId && campaigns.some(c => c.id === ch.campaignId)
        ? { view: 'campaign', campaignId: ch.campaignId }
        : { view: 'roster' });
    } else if (nav.view === 'campaign') {
      if (!campaigns.some(c => c.id === nav.id)) { reportSyncError("THAT CAMPAIGN ISN'T IN YOUR CHRONICLE"); setView('campaigns'); return; }
      resolvingNavRef.current = true;
      setActiveCampaignId(nav.id);
      setView('campaign');
    } else if (nav.view === 'admin') {
      if (currentUser.isAdmin) { resolvingNavRef.current = true; setView('admin'); }
    } else if (nav.view === 'campaigns') {
      resolvingNavRef.current = true;
      setView('campaigns');
    } // 'roster' → already there
  }, [booting, currentUser, characters, campaigns, openCharacter, reportSyncError]);

  // ── auth actions ──
  // These throw on failure; the auth surfaces catch and surface the message. Success
  // is observed via DS.onAuthChange (above), which loads the store and navigates.
  const doProvider = useCallback((provider) => DS.signInWithProvider(provider), []);
  const signOut = useCallback(() => DS.signOut(), []);
  // Persist the chosen display name, then update local state optimistically (the
  // updateUser call also refires onAuthChange, but this makes the prompt close instantly).
  const setDisplayName = useCallback(async (name) => {
    await DS.setDisplayName(name);
    setCurrentUser(u => u ? { ...u, displayName: name.trim(), displayNameSet: true } : u);
  }, []);

  // ── campaign actions ──
  // Creation and joins go through RPCs (DS) and return the canonical campaign;
  // the rest update optimistically and fire the matching DS call. Releasing
  // heroes keeps them on their owners' rosters (campaignId → null), never deletes.
  const createCampaign = useCallback(async ({ name, description }) => {
    if (!currentUser) return;
    const camp = await DS.createCampaign({ name, description });
    setCampaigns(prev => [...prev, camp]);
    setActiveCampaignId(camp.id);
    setView('campaign');
  }, [currentUser]);

  const joinCampaign = useCallback(async (code) => {
    if (!currentUser) return;
    const camp = await DS.joinByCode(code);   // throws with a friendly message if not found
    setCampaigns(prev => (prev.some(c => c.id === camp.id)
      ? prev.map(c => c.id === camp.id ? camp : c)
      : [...prev, camp]));
    setActiveCampaignId(camp.id);
    setView('campaign');
  }, [currentUser]);

  const updateCampaign = useCallback((id, patch) => {
    const before = campaigns.find(c => c.id === id);
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    DS.updateCampaign(id, patch).catch(e => {
      console.error('Campaign update failed', e);
      reportSyncError('CAMPAIGN UPDATE FAILED — CHANGE UNDONE');
      if (before) setCampaigns(prev => prev.map(c => (c.id === id ? before : c)));
    });
  }, [campaigns, reportSyncError]);

  const regenSigil = useCallback(async (id) => {
    const code = await DS.regenInviteCode(id);
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, inviteCode: code } : c));
  }, []);

  const releaseHeroes = useCallback((campaignId, ownerId = null) => {
    setCharacters(prev => prev.map(c =>
      (c.campaignId === campaignId && (ownerId == null || c.ownerId === ownerId))
        ? { ...c, campaignId: null } : c));
  }, []);

  const leaveCampaign = useCallback(async (id) => {
    if (!currentUser) return;
    await DS.leaveCampaign(id);
    releaseHeroes(id, currentUser.id);
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, memberIds: c.memberIds.filter(m => m !== currentUser.id) } : c));
    setActiveCampaignId(null);
    setView('campaigns');
  }, [currentUser, releaseHeroes]);

  const removeMember = useCallback(async (campaignId, userId) => {
    await DS.removeMember(campaignId, userId);
    releaseHeroes(campaignId, userId);
    setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, memberIds: c.memberIds.filter(m => m !== userId) } : c));
  }, [releaseHeroes]);

  const deleteCampaign = useCallback(async (id) => {
    await DS.disbandCampaign(id);
    releaseHeroes(id, null);
    setCampaigns(prev => prev.filter(c => c.id !== id));
    setActiveCampaignId(null);
    setView('campaigns');
  }, [releaseHeroes]);

  // Boot guards: keep view consistent with what exists.
  useEffect(() => {
    if ((view === 'wizard' || view === 'play') && !active) setView('roster');
    if (view === 'campaign' && !activeCampaign) setView('campaigns');
    if (view === 'admin' && currentUser && !currentUser.isAdmin) setView('roster');
  }, [active, activeCampaign, view, currentUser]);

  // ─── Browser history integration ───
  // In-app navigation is a pure function of (view, activeId, activeCampaignId), so we
  // mirror each change into a history entry — the browser/mouse Back button then steps
  // through screens instead of leaving the app. Each entry also writes its '#/…' hash
  // (hash, not path: GitHub Pages has no SPA fallback), which is what makes screens
  // deep-linkable — popstate still reads history.state; the hash is only parsed on a
  // cold load. Hand-editing the hash mid-session is ignored (a state-less entry), same
  // as before. poppingRef suppresses the echo when a popstate-driven setState
  // re-triggers the sync effect; historyReadyRef makes the first authed screen a
  // replaceState baseline and pushes thereafter.
  const poppingRef = React.useRef(false);
  const historyReadyRef = React.useRef(false);

  useEffect(() => {
    const onPop = (e) => {
      const s = e.state && e.state.dsNav;
      if (!s) return;   // not one of ours → let the browser navigate away
      flushSave();   // commit any debounced edit before Back/Forward changes screens
      poppingRef.current = true;
      setView(s.view);
      setActiveId(s.activeId ?? null);
      setActiveCampaignId(s.activeCampaignId ?? null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [flushSave]);

  useEffect(() => {
    if (booting || !currentUser) {
      historyReadyRef.current = false;
      // Signed out: a stale '#/hero/…' over the auth screen is noise — scrub it.
      // The '#/' check guarantees an OAuth '#access_token' fragment is never touched.
      if (!booting && window.location.hash.startsWith('#/')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      return;
    }
    if (poppingRef.current) { poppingRef.current = false; return; }  // came from Back/Forward
    // A resolving deep link renders one roster-shaped commit before the resolved
    // screen; writing the baseline for it would wedge a synthetic '#/' entry
    // under every refreshed deep link. Skip exactly that commit.
    if (resolvingNavRef.current) { resolvingNavRef.current = false; return; }
    const loc = { dsNav: { view, activeId, activeCampaignId } };
    const hash = navToHash({ view, activeId, activeCampaignId });
    if (!historyReadyRef.current) {
      window.history.replaceState(loc, '', hash);   // baseline entry for this session
      historyReadyRef.current = true;
    } else {
      window.history.pushState(loc, '', hash);
    }
  }, [view, activeId, activeCampaignId, booting, currentUser]);

  // ─── Surface opacity ───
  // The :root default is 1; the app is designed at 0.85 and every --surface-*
  // token multiplies through this. (data-theme is stamped by index.html; in dev
  // the TweaksHost can override both live.)
  useEffect(() => {
    document.body.style.setProperty('--surface-alpha', '0.85');
  }, []);

  // The roster / campaign views share the top app bar; the wizard & play views
  // own their full chrome and stand alone.
  const chromeView = view === 'roster' || view === 'campaigns' || view === 'campaign' || view === 'admin';

  return (
    <>
      <ThemeStyles />
      <AccountStyles />
      <CampaignStyles />
      <div className="app">
        <div className="bg-paper"></div>
        <div className="bg-grain"></div>

        {booting ? (
          <div className="auth-wrap"><div className="auth-card">
            <Masthead heading={false} sub="Opening the Liber Heroum…" />
          </div></div>
        ) : !currentUser ? (
          <AuthScreen onProvider={doProvider} />
        ) : !currentUser.isAllowed ? (
          <NotInvitedScreen user={currentUser} onSignOut={signOut} />
        ) : !currentUser.displayNameSet ? (
          <DisplayNamePrompt defaultName={currentUser.displayName} onConfirm={setDisplayName} />
        ) : chromeView ? (
          <div className="ds-shell">
            <AppBar
              view={view}
              onNav={onNav}
              heroCount={myCharacters.length}
              campaignCount={myCampaigns.length}
              user={currentUser}
              onSignOut={signOut}
              onRename={setDisplayName}
              isAdmin={currentUser.isAdmin}
              allCount={characters.length}
            />
            <div className="ds-shell-body">
              {view === 'roster' && (
                <RosterScreen
                  characters={myCharacters}
                  campaigns={campaigns}
                  userCampaigns={myCampaigns}
                  onOpen={(id) => openCharacter(id, { view: 'roster' })}
                  onCreate={() => createCharacter(null, { view: 'roster' })}
                  onDelete={deleteCharacter}
                  onAssign={assignCharacter}
                />
              )}
              {view === 'campaigns' && (
                <CampaignHub
                  user={currentUser}
                  campaigns={campaigns}
                  users={users}
                  chars={characters}
                  onOpen={openCampaign}
                  onCreate={createCampaign}
                  onJoin={joinCampaign}
                />
              )}
              {view === 'campaign' && activeCampaign && (
                <CampaignDetail
                  campaign={activeCampaign}
                  user={currentUser}
                  users={users}
                  chars={characters}
                  onOpenHero={(id) => openCharacter(id, { view: 'campaign', campaignId: activeCampaign.id })}
                  onAssign={assignCharacter}
                  onCreateHero={(cid) => createCharacter(cid, { view: 'campaign', campaignId: cid })}
                  onUpdate={updateCampaign}
                  onRegen={regenSigil}
                  onRemoveMember={removeMember}
                  onLeave={leaveCampaign}
                  onDelete={deleteCampaign}
                  onBack={() => onNav('campaigns')}
                />
              )}
              {view === 'admin' && currentUser.isAdmin && (
                <AdminScreen
                  characters={characters}
                  users={users}
                  onOpen={(id) => openCharacter(id, { view: 'admin' })}
                  onDelete={deleteCharacter}
                />
              )}
            </div>
          </div>
        ) : view === 'wizard' && active ? (
          <Wizard
            character={active}
            update={updateActive}
            saveState={saveState}
            onExit={goBackFromHero}
            onComplete={(isComplete = true) => {
              if (isComplete) {
                updateActive(c => ({ ...c, status: 'complete' }));
                setView('play');
              } else {
                updateActive(c => ({ ...c, status: 'in-progress' }));
                goBackFromHero();
              }
            }}
          />
        ) : view === 'play' && active ? (
          (() => {
            const editable = canEditCharacter(active);
            return (
              <PlayView
                character={active}
                update={editable ? updateActive : NOOP_UPDATE}
                onExit={goBackFromHero}
                onEdit={editable ? () => setView('wizard') : null}
                canEdit={editable}
                saveState={editable ? saveState : null}
                owner={users.find(u => u.id === active.ownerId) || null}
                onError={reportSyncError}
              />
            );
          })()
        ) : null}

        {currentUser?.isAllowed && (
          <SyncPill
            saveState={view === 'wizard' || view === 'play' ? null : saveState}
            syncError={syncError}
            onRetry={retrySave}
            onDismiss={() => setSyncError(null)}
          />
        )}

        {TweaksHost && currentUser && (
          <React.Suspense fallback={null}>
            <TweaksHost />
          </React.Suspense>
        )}
      </div>
    </>
  );
}


// Choice-bearing class features (feature.choose) → the pick slots they own.
// Each slot: [display label, class option-array key, cclass state key].
// Keep in sync with PrayerWardPicker's CONFIG in wizard/steps/class.jsx.
const CLASS_CHOICE_SLOTS = {
  prayerWard:  [['Prayer', 'prayers', 'prayer'], ['Ward', 'wards', 'ward']],
  triggered:   [['Triggered Action', 'triggereds', 'triggeredAction']],
  enchantWard: [['Enchantment', 'enchantments', 'enchantment'], ['Ward', 'wards', 'ward']],
  augmentWard: [['Augmentation', 'enchantments', 'enchantment'], ['Ward', 'wards', 'ward']],
  augment:     [['Augmentation', 'enchantments', 'enchantment']],
};

// Chosen options for one choice-bearing class feature → [{ label, name, text }].
function chosenFeatureOptions(c, cls, f) {
  const out = [];
  for (const [label, clsKey, stateKey] of (CLASS_CHOICE_SLOTS[f.choose] || [])) {
    const chosen = c.cclass?.[stateKey];
    if (!chosen) continue;
    const opt = (cls[clsKey] || []).find(x => x.name === chosen);
    out.push({ label, name: chosen, text: opt ? opt.text : '' });
  }
  return out;
}

// ───────── Keyword-gated ability distance bonuses ─────────
// Always-on features that increase ability distance by keyword (Acolyte of the
// Mystery, Prayer/Enchantment of Distance, Distance Augmentation) carry a
// machine-readable `distanceBonus: { keywords, amount }` in the data. Kit
// rngDist/mDist are deliberately excluded: kit signature strings already print
// final distances, and the kit stat row displays those bonuses.
function collectDistanceBonuses(c) {
  const out = [];
  const cls = classDef(c);
  if (!cls) return out;
  const sub = (cls.subclasses || []).find(s => s.id === c.cclass?.subclass || s.name === c.cclass?.subclass);
  if (sub?.acolyte?.distanceBonus) out.push(sub.acolyte.distanceBonus);
  for (const f of cls.features || []) {
    for (const [, clsKey, stateKey] of CLASS_CHOICE_SLOTS[f.choose] || []) {
      const chosen = c.cclass?.[stateKey];
      const opt = chosen && (cls[clsKey] || []).find(x => x.name === chosen);
      if (opt?.distanceBonus) out.push(opt.distanceBonus);
    }
  }
  return out;
}

// Bump the ranged components of an ability's distance string when the ability
// carries every keyword a bonus requires. Handles "Ranged N", "Melee N or
// Ranged N", and "… within N" area shapes; Melee/Self/aura/burst untouched.
function applyDistanceBonuses(a, bonuses) {
  if (!a?.distance || !a.keywords?.length || !bonuses?.length) return a;
  const total = bonuses
    .filter(b => b.keywords.every(k => a.keywords.includes(k)))
    .reduce((s, b) => s + b.amount, 0);
  if (!total) return a;
  const distance = a.distance.replace(/\b(Ranged|within)\s+(\d+)/gi, (m, w, n) => `${w} ${+n + total}`);
  return distance === a.distance ? a : { ...a, distance };
}

// ───────── Summarise benefits (skills / languages / perks / class features) ─────────
function summarizeBenefits(c) {
  const cls = classDef(c);
  const anc = ancestryDef(c);
  const car = careerDef(c);
  const cu  = c.culture || {};

  // Skills: collect descriptions from each source. Prefer concrete picks where stored.
  const skills = [];
  // Duplicate-grant swaps display as "Original \u2192 Replacement".
  const swapLabel = (originals, effective) => originals.map((s, i) => (effective[i] !== s ? `${s} \u2192 ${effective[i]}` : s));
  if (cls) {
    const sub = (cls.subclasses || []).find(s => s.id === c.cclass?.subclass || s.name === c.cclass?.subclass);
    const granted = [...(cls.grantedSkills || []), ...(sub?.skill ? [sub.skill] : [])];
    const clsSkills = [...swapLabel(granted, effectiveClassGrants(c)), ...(c.cclass?.skills || [])];
    if (clsSkills.length) skills.push({ source: cls.name, text: clsSkills.join(' \u00b7 ') });
    else if (cls.quickSkills?.length) skills.push({ source: cls.name, text: 'Suggested: ' + cls.quickSkills.join(' \u00b7 ') });
  }
  if (car) {
    const carPicks = (c.career?.skills || []);
    if (carPicks.length) skills.push({ source: car.name, text: swapLabel(carPicks, effectiveCareerSkills(c)).join(' \u00b7 ') });
    else skills.push({ source: car.name, text: car.skills });
  }
  if (cu && cu.skills && Object.keys(cu.skills).length) {
    const cuSkills = Object.values(cu.skills).filter(Boolean).join(' \u00b7 ');
    if (cuSkills) skills.push({ source: 'Culture', text: cuSkills });
  }
  // Skill granted by a Conduit domain feature.
  if (c.cclass?.domainSkill && c.cclass?.domainFeature) {
    skills.push({ source: `${c.cclass.domainFeature.domain} Domain`, text: c.cclass.domainSkill });
  }
  if (anc) {
    // Ancestry signature/trait skill choices (Silver Tongue, Passionate Artisan) \u2014
    // show the picked skills, not the rules prompt.
    for (const sig of ancestrySignatures(anc)) {
      if (!sig.skillChoice) continue;
      const picked = ((c.ancestry?.sigSkills || {})[sig.name] || []).filter(Boolean);
      skills.push({ source: `${anc.name} \u2014 ${sig.name}`,
        text: picked.length ? picked.join(' \u00b7 ')
          : `+${sig.skillChoice.count} ${sig.skillChoice.groups.join('/')} of your choice` });
    }
    for (const t of resolvedAncestryTraits(c)) {
      if (!t.skillChoice) continue;
      skills.push({ source: `${anc.name} \u2014 ${t.name}`,
        text: t.chosen?.length ? t.chosen.join(' \u00b7 ')
          : `+${t.skillChoice.count} ${t.skillChoice.groups.join('/')} of your choice` });
    }
  }
  const comp = complicationDef(c);
  if (comp) {
    // Fixed grants with duplicate-grant swaps shown as "Original → Replacement".
    const parts = swapLabel(comp.skills || [], effectiveComplicationSkills(c));
    (comp.skillChoices || []).forEach((ch, i) => {
      const picked = (c.complication?.skills || {})[i] || [];
      parts.push(...picked);
      if (picked.length < ch.count) parts.push(`+${ch.count - picked.length} of your choice`);
    });
    if (parts.length) skills.push({ source: comp.name, text: parts.join(' \u00b7 ') });
  }

  // Languages — show actual picks if any, otherwise the +N text.
  const languages = [];
  languages.push({ source: 'Standard', text: 'Caelian' });
  // Everyone knows Caelian, so a Caelian culture pick would render as a duplicate row.
  if (cu && cu.language && cu.language !== 'Caelian') languages.push({ source: 'Culture', text: cu.language });
  if (car && car.languages > 0) {
    const picks = c.career?.languages || [];
    if (picks.length) languages.push({ source: car.name, text: picks.join(' \u00b7 ') });
    else languages.push({ source: car.name, text: `+${car.languages} of your choice` });
  }
  if (comp?.languageChoice) {
    const picks = c.complication?.languages || [];
    if (picks.length) languages.push({ source: comp.name, text: picks.join(' \u00b7 ') });
    else languages.push({ source: comp.name, text: `+${comp.languageChoice.count} of your choice` });
  }

  // Perk
  let perk = null;
  if (car) {
    const chosen = c.career?.perk || null;
    let desc = null;
    if (chosen && window.PERKS && window.PERKS[car.perk]) {
      const found = window.PERKS[car.perk].find(p => p.name === chosen);
      if (found) desc = found.text;
    }
    perk = { group: car.perk, chosen, desc };
  }

  // Class features (incl. resource and subclass label)
  const features = [];
  const classAbilities = [];
  if (cls) {
    features.push({ name: 'Heroic Resource', text: cls.resource });
    if (cls.features?.length) {
      for (const f of cls.features) {
        if (f.ability) {
          // Active class abilities are surfaced in the Abilities panel, not as text.
          let ability = f.ability;
          if (cls.id === 'censor' && f.name === 'Judgment' && cls.judgmentOrder?.[c.cclass?.subclass]) {
            ability = { ...ability, orderBenefit: cls.judgmentOrder[c.cclass.subclass] };
          }
          classAbilities.push(ability);
        } else if (CLASS_CHOICE_SLOTS[f.choose]) {
          // Chosen options surface as their own entries with full rules text
          // (e.g. "Prayer: Steel"). Unchosen features keep the prompt text.
          const picks = chosenFeatureOptions(c, cls, f);
          if (picks.length) for (const p of picks) features.push({ name: `${p.label}: ${p.name}`, text: p.text });
          else features.push({ name: f.name, text: f.text });
        } else {
          features.push({ name: f.name, text: f.text });
        }
      }
    }
    if (c.cclass?.subclass && cls.subclasses) {
      const sub = cls.subclasses.find(s => s.id === c.cclass.subclass || s.name === c.cclass.subclass);
      if (sub) {
        features.push({ name: `${cls.subclassName || 'Subclass'} \u2014 ${sub.name}`, text: sub.text });
        // Subclass-specific level-1 passives and abilities (e.g. Elementalist specializations).
        if (sub.acolyte) features.push({ name: sub.acolyte.name, text: sub.acolyte.text });
        if (sub.features) for (const sf of sub.features) features.push({ name: sf.name, text: sf.text });
        if (sub.abilities) for (const sa of sub.abilities) classAbilities.push(sa);
      }
    }
    if (cls.pickTwoDomains && (c.cclass?.domains?.length)) {
      features.push({ name: 'Domains', text: c.cclass.domains.join(', ') });
    }
    if (cls.pickOneDomain && (c.cclass?.domains?.length)) {
      features.push({ name: 'Domain', text: c.cclass.domains.join(', ') });
    }
    if (c.cclass?.domainFeature) {
      const df = c.cclass.domainFeature;
      features.push({ name: `${df.domain}: ${df.name}`, text: df.text });
    }
  }

  // Complication-granted abilities, deduped by name against class/subclass abilities.
  // Grounded's Motivate Earth carries an official rider: if the hero also gains the
  // feature from their class, it becomes usable at range instead of a second copy.
  for (const a of comp?.abilities || []) {
    const existing = classAbilities.findIndex(x => x.name === a.name);
    if (existing >= 0) {
      if (a.name === 'Motivate Earth') {
        // modifiedFields marks app-side changes that must survive the Foundry export's
        // official-doc substitution (see ABILITY_OVERRIDE_FIELDS in foundry-export.js).
        classAbilities[existing] = { ...classAbilities[existing],
          distance: 'Ranged 5',
          keywords: (classAbilities[existing].keywords || []).map(k => (k === 'Melee' ? 'Ranged' : k)),
          modifiedFields: ['distance', 'keywords'] };
      }
    } else {
      classAbilities.push(a);
    }
  }

  // Ancestry-granted abilities (Dragon Breath, Shadowmeld, …). Choice-bearing traits
  // (Psionic Gift) contribute only the chosen ability.
  const ancestryAbilities = [];
  if (anc) {
    for (const sig of ancestrySignatures(anc)) ancestryAbilities.push(...(sig.abilities || []));
    for (const t of resolvedAncestryTraits(c)) {
      if (!t.abilities) continue;
      if (t.optionChoice) ancestryAbilities.push(...t.abilities.filter(a => (t.chosen || []).includes(a.name)));
      else ancestryAbilities.push(...t.abilities);
    }
  }

  return { skills, languages, perk, features, classAbilities, ancestryAbilities };
}

// ───────── Duplicate-prevention: a single source of truth for committed skills/perks ─────────
// A hero can't hold the same skill (or perk) twice, but they're chosen across several
// independent slots (culture, career, class domain, ancestry signatures, level-up). These
// collectors gather every *concrete* pick tagged with a stable `key`, so a picker can
// exclude its own slot and grey out anything already taken elsewhere.

// Fixed slot rank for duplicate resolution — the order the wizard grants skills in.
// When a pick duplicates a grant (or an earlier pick), the earlier slot keeps the
// name and the later pick is the invalid side; grants themselves resolve through the
// swap chain in wizard/helpers.js, which encodes the same order.
const SKILL_RANK = { ancestry: 0, culture: 1, career: 2, class: 3, complication: 4, level: 5 };

// Returns [{ name, source, key, kind, rank, idx }] — every skill the character holds,
// tagged 'grant' (auto-granted, resolves via skillSwaps) or 'pick' (player-chosen,
// resolves by choosing another). `idx` is the position in the slot's stored array for
// slots where grants and picks share one flat list (career) and a prune must be
// positional rather than by name.
function collectSkillEntries(c) {
  const out = [];
  const push = (name, source, key, kind, rank, idx) => { if (name) out.push({ name, source, key, kind, rank, idx }); };
  Object.entries((c.culture && c.culture.skills) || {}).forEach(([k, s]) => push(s, 'Culture', 'culture:' + k, 'pick', SKILL_RANK.culture));
  // Career skills with duplicate-grant swaps applied ("choose another instead").
  // The stored list holds autos and picks in one flat array and effectiveCareerSkills
  // maps it element-wise, so zip positionally and tag the parsed autos as grants.
  {
    const car = careerDef(c);
    const autos = car ? [...parseCareerSkills(car).auto] : [];
    const eff = effectiveCareerSkills(c);
    ((c.career && c.career.skills) || []).forEach((raw, i) => {
      const ai = autos.indexOf(raw);
      if (ai !== -1) autos.splice(ai, 1); // positional first-match for repeated names
      push(eff[i], 'Career', 'career', ai !== -1 ? 'grant' : 'pick', SKILL_RANK.career, i);
    });
  }
  if (c.cclass && c.cclass.domainSkill) push(c.cclass.domainSkill, 'Domain', 'domain', 'pick', SKILL_RANK.class);
  Object.entries((c.ancestry && c.ancestry.sigSkills) || {}).forEach(([sig, arr]) =>
    (arr || []).forEach(s => push(s, sig, 'sig:' + sig, 'pick', SKILL_RANK.ancestry)));
  Object.entries((c.ancestry && c.ancestry.traitSkills) || {}).forEach(([trait, arr]) =>
    (arr || []).forEach(s => push(s, trait, 'trait:' + trait, 'pick', SKILL_RANK.ancestry)));
  const cls = classDef(c);
  if (cls) {
    // Class skills: grants (with swaps applied) and the picker's choices.
    for (const s of effectiveClassGrants(c)) push(s, cls.name, 'class', 'grant', SKILL_RANK.class);
    for (const s of c.cclass?.skills || []) push(s, cls.name, 'class', 'pick', SKILL_RANK.class);
  }
  const lvl = cls && LEVELUP_DATA[cls.id];
  if (lvl) Object.entries(c.levelChoices || {}).forEach(([L, stored]) => {
    for (const ch of ((lvl[L] && lvl[L].choices) || [])) {
      if (ch.kind !== 'skill-group') continue;
      const p = stored && stored.picks && stored.picks[ch.id];
      if (p && p.chosen) push(p.chosen, 'Level ' + L, 'lvl:' + L + ':' + ch.id, 'pick', SKILL_RANK.level);
    }
  });
  const comp = complicationDef(c);
  if (comp) {
    // Fixed grants read through duplicate-grant swaps (comp step is the last granter).
    for (const s of effectiveComplicationSkills(c)) push(s, comp.name, 'comp:fixed', 'grant', SKILL_RANK.complication);
    (comp.skillChoices || []).forEach((ch, i) =>
      (((c.complication && c.complication.skills) || {})[i] || []).forEach(s => push(s, comp.name, 'comp:' + i, 'pick', SKILL_RANK.complication)));
  }
  return out;
}

// Returns [{ name, source, key }] — one entry per skill the character currently holds.
function collectSkillPicks(c) {
  return collectSkillEntries(c).map(({ name, source, key }) => ({ name, source, key }));
}

// Picks that duplicate a skill held elsewhere → [{ name, key, source, holder, idx }].
// A pick collides with a grant at the same or an earlier rank (the grant always keeps
// the name — swaps live on the grant side), or with a kept pick at an earlier rank.
// Picks colliding with a LATER slot's grant are deliberately not flagged: that
// collision belongs to the grant's "choose another instead" swap prompt, and flagging
// both sides would demand two replacements for one duplicate. includeLaterGrants
// widens the check to any-rank grants for the load-time repair pass, where an
// unresolved swap means the duplicate is real and the pick is the prunable side.
function duplicateSkillPicks(c, { includeLaterGrants = false } = {}) {
  const entries = collectSkillEntries(c);
  const grants = entries.filter(e => e.kind === 'grant');
  const picks = entries.filter(e => e.kind === 'pick').sort((a, b) => a.rank - b.rank);
  const kept = new Map();
  const dups = [];
  for (const p of picks) {
    const g = grants.find(x => x.name === p.name && (includeLaterGrants || x.rank <= p.rank));
    const holder = g ? g.source : kept.get(p.name);
    if (holder !== undefined) dups.push({ name: p.name, key: p.key, source: p.source, holder, idx: p.idx });
    else kept.set(p.name, p.source);
  }
  return dups;
}

// Returns [{ name, source, key }] — one entry per perk the character currently holds.
function collectPerkPicks(c) {
  const out = [];
  const push = (name, source, key) => { if (name) out.push({ name, source, key }); };
  if (c.career && c.career.perk) push(c.career.perk, 'Career', 'career');
  const cls = classDef(c);
  const lvl = cls && LEVELUP_DATA[cls.id];
  if (lvl) Object.entries(c.levelChoices || {}).forEach(([L, stored]) => {
    for (const ch of ((lvl[L] && lvl[L].choices) || [])) {
      if (ch.kind !== 'perk') continue;
      const p = stored && stored.picks && stored.picks[ch.id];
      if (p && p.chosen) push(p.chosen, 'Level ' + L, 'lvl:' + L + ':' + ch.id);
    }
  });
  return out;
}

// Map of name → source for every skill held EXCEPT the given slot key (so a picker can
// keep its own selection togglable while blocking duplicates from other slots).
function skillsTakenExcept(c, ownKey) {
  const m = new Map();
  for (const p of collectSkillPicks(c)) if (p.key !== ownKey) m.set(p.name, p.source);
  return m;
}
function perksTakenExcept(c, ownKey) {
  const m = new Map();
  for (const p of collectPerkPicks(c)) if (p.key !== ownKey) m.set(p.name, p.source);
  return m;
}

// Returns [{ name, source, key }] — one entry per language the character currently knows.
// Sources: the standard tongue (Caelian), the culture pick, and career bonus languages.
function collectLanguagePicks(c) {
  const out = [];
  const push = (name, source, key) => { if (name) out.push({ name, source, key }); };
  push('Caelian', 'Standard', 'standard');
  push(c.culture && c.culture.language, 'Culture', 'culture');
  for (const l of (c.career && c.career.languages) || []) push(l, 'Career', 'career');
  for (const l of (c.complication && c.complication.languages) || []) push(l, 'Complication', 'complication');
  return out;
}

// Map of name → source for every language known EXCEPT the given slot key(s).
// ownKey accepts a string or an array of keys (culture also owns 'standard' —
// Caelian is its model default, so the culture picker must keep it selectable).
function languagesTakenExcept(c, ownKey) {
  const own = Array.isArray(ownKey) ? ownKey : [ownKey];
  const m = new Map();
  for (const p of collectLanguagePicks(c)) if (!own.includes(p.key)) m.set(p.name, p.source);
  return m;
}

// Repair drafts saved before languages had cross-slot blocking: a language held by
// culture (or Caelian itself) could also sit in career.languages, where its chip was
// filtered out of the picker — impossible to remove, and silently deduped on export.
// Pruning it here lets the career step honestly show the freed slot. Idempotent.
function normalizeLanguages(c) {
  let out = c;
  const carLangs = c && c.career && c.career.languages;
  if (carLangs && carLangs.length) {
    const cleaned = carLangs.filter(l => l !== 'Caelian' && l !== (c.culture && c.culture.language));
    if (cleaned.length !== carLangs.length) out = { ...out, career: { ...out.career, languages: cleaned } };
  }
  const compLangs = c && c.complication && c.complication.languages;
  if (compLangs && compLangs.length) {
    const known = new Set(['Caelian', c.culture && c.culture.language, ...((out.career && out.career.languages) || [])]);
    const cleaned = compLangs.filter(l => !known.has(l));
    if (cleaned.length !== compLangs.length) out = { ...out, complication: { ...out.complication, languages: cleaned } };
  }
  return out;
}

// Remove one duplicate pick from its slot. Emptying the stored value re-opens the
// wizard's existing "N of M picked" prompt for that slot, and the pick's skillPicks
// bookkeeping goes with it. Returns the character unchanged if nothing matched.
function pruneSkillPick(c, d) {
  const key = d.key;
  if (key === 'career') {
    const arr = c.career.skills || [];
    if (arr[d.idx] !== d.name) return c; // stale index — the caller recomputes
    const picks = { ...(c.career.skillPicks || {}) };
    delete picks[d.name];
    return { ...c, career: { ...c.career, skills: arr.filter((_, i) => i !== d.idx), skillPicks: picks } };
  }
  if (key === 'class') {
    const arr = c.cclass.skills || [];
    const cleaned = arr.filter(s => s !== d.name);
    if (cleaned.length === arr.length) return c;
    const picks = { ...(c.cclass.skillPicks || {}) };
    delete picks[d.name];
    return { ...c, cclass: { ...c.cclass, skills: cleaned, skillPicks: picks } };
  }
  if (key === 'domain') return { ...c, cclass: { ...c.cclass, domainSkill: null } };
  if (key.startsWith('culture:')) {
    const k = key.slice('culture:'.length);
    return { ...c, culture: { ...c.culture, skills: { ...c.culture.skills, [k]: null } } };
  }
  if (key.startsWith('sig:') || key.startsWith('trait:')) {
    const field = key.startsWith('sig:') ? 'sigSkills' : 'traitSkills';
    const name = key.slice(key.indexOf(':') + 1);
    const arr = ((c.ancestry[field] || {})[name] || []).filter(s => s !== d.name);
    return { ...c, ancestry: { ...c.ancestry, [field]: { ...c.ancestry[field], [name]: arr } } };
  }
  if (key.startsWith('comp:')) {
    const i = key.slice('comp:'.length);
    const arr = (((c.complication && c.complication.skills) || {})[i] || []).filter(s => s !== d.name);
    return { ...c, complication: { ...c.complication, skills: { ...c.complication.skills, [i]: arr } } };
  }
  if (key.startsWith('lvl:')) {
    const rest = key.slice('lvl:'.length);
    const L = rest.slice(0, rest.indexOf(':'));
    const chId = rest.slice(rest.indexOf(':') + 1);
    const lc = c.levelChoices && c.levelChoices[L];
    if (!lc || !lc.picks || !(chId in lc.picks)) return c;
    const picks = { ...lc.picks };
    delete picks[chId];
    return { ...c, levelChoices: { ...c.levelChoices, [L]: { ...lc, picks } } };
  }
  return c;
}

// Repair pass for stored duplicate skill picks (the skills mirror of
// normalizeLanguages): a hero saved with an unresolved duplicate — the "save as
// draft" escape, a legacy save, or free rail navigation reordering the grants —
// keeps the granted copy and sheds the pick, so the wizard honestly reports the
// freed slot on the next edit. One prune per iteration: removing a pick can make a
// stored grant swap stale (the collision disappears and the grant reverts at read
// time), so positions and effective names are recomputed until no duplicate remains.
// Identity-preserving when the character is already clean.
function normalizeSkills(c) {
  let out = c;
  for (;;) {
    const dups = duplicateSkillPicks(out, { includeLaterGrants: true });
    if (!dups.length) return out;
    const next = pruneSkillPick(out, dups[0]);
    if (next === out) return out; // nothing prunable — never true for pick-side dups
    out = next;
  }
}

// Expose helpers globally for other files
Object.assign(window, {
  newCharacter, classDef, ancestryDef, kitDef, kit2Def, careerDef, complicationDef, computeDerived,
  summarizeBenefits, collectSkillPicks, collectPerkPicks, skillsTakenExcept, perksTakenExcept,
  collectSkillEntries, duplicateSkillPicks, normalizeSkills,
  collectLanguagePicks, languagesTakenExcept, normalizeLanguages,
  collectDistanceBonuses, applyDistanceBonuses,
});
export { newCharacter, classDef, ancestryDef, kitDef, kit2Def, careerDef, complicationDef, computeDerived, playCurrencies, summarizeBenefits, chosenFeatureOptions };
export { collectDistanceBonuses, applyDistanceBonuses };
export { collectSkillPicks, collectPerkPicks, skillsTakenExcept, perksTakenExcept };
export { collectSkillEntries, duplicateSkillPicks, normalizeSkills };
export { collectLanguagePicks, languagesTakenExcept, normalizeLanguages };
export { canEditCharacterFor };
export { parseHash, navToHash };
export { App };
