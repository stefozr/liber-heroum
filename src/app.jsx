import React from 'react';
import { DS_ANCESTRIES, DS_CAREERS, DS_CLASSES, DS_KITS, DS_COMPLICATIONS } from './data.jsx';
import { ThemeStyles } from './theme.jsx';
import { DS } from './backend.jsx';
import { AccountStyles, AuthScreen, DisplayNamePrompt, AppBar } from './auth.jsx';
import { AdminScreen } from './admin.jsx';
import { CampaignStyles, CampaignHub, CampaignDetail } from './campaigns.jsx';
import { useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakRadio } from './tweaks-panel.jsx';
import { RosterScreen } from './roster.jsx';
import { Wizard } from './wizard.jsx';
import { PlayView } from './play.jsx';
// app.jsx — main app shell: routing, character state, localStorage persistence.

const { useState, useEffect, useMemo, useReducer, useCallback } = React;

// ───────── persistence ─────────
// All reads/writes go through the backend seam (backend.jsx → window.DS), which
// now speaks to Supabase. Character ids are client-supplied text (the DB column
// is text), so the wizard can create a hero locally and upsert it as-is.
const LS_VIEW = `${DS.K.session}/view`;   // last view is a per-device UI preference

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

    ancestry: { id: null, traits: [], traitChoice: null, formerLife: null, prevLifeTraits: {}, sigSkills: {}, sigOptions: {} },
    culture: { language: 'Caelian', environment: null, organization: null, upbringing: null, archetype: null, skills: {} },
    career: { id: null, incident: '', taken: '', languages: [], skills: [], perk: '' },
    cclass: { id: null, subclass: null, domains: [], characteristics: {}, charArrayIndex: 0, signatures: [], heroic3: null, heroic5: null, skills: [], deity: '', charModel: 'v2' },
    kit: { id: null },
    kit2: { id: null },
    complication: { id: null, custom: '' },
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
    const pick = c.levelChoices && c.levelChoices[l] && c.levelChoices[l].picks && c.levelChoices[l].picks['char-bonus-4'];
    if (pick) {
      const k = pick.id || pick.name || pick;
      if (CHAR_KEYS.includes(k)) total[k] = Math.min(3, total[k] + 1);
    }
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
        const pick = c.levelChoices && c.levelChoices[l] && c.levelChoices[l].picks && c.levelChoices[l].picks['char-bonus-4'];
        if (pick && (pick.id || pick.name || pick) === k) b += 1;
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

  let staminaMax = 0;
  if (cls) {
    staminaMax = cls.starting.stamina1 + (lvl - 1) * cls.starting.staminaPer;
  }
  // Kit stamina per echelon (best of equipped kits)
  if (kit || kit2) {
    staminaMax += kb('sta_per') * echelon;
  }
  // Ancestry: Spark Off Your Skin / Staying Power-style
  if (anc) {
    for (const t of c.ancestry.traits || []) {
      // approximate +6 Stamina effects
      if (/Spark Off Your Skin/.test(t)) staminaMax += 6 * echelon;
    }
  }

  let recoveries = cls ? cls.starting.recoveries : 0;
  if (anc && (c.ancestry.traits || []).includes('Staying Power')) recoveries += 2;

  let speed = anc ? anc.speed : 5;
  if (anc && (c.ancestry.traits || []).includes('Beast Legs')) speed = Math.max(speed, 6);
  if (anc && (c.ancestry.traits || []).includes('Swift')) speed = Math.max(speed, 6);
  if (anc && (c.ancestry.traits || []).includes('Lightning Nimbleness')) speed = Math.max(speed, 7);
  if (kit || kit2) speed += kb('spd');

  let stability = anc ? anc.stability : 0;
  if (anc && (c.ancestry.traits || []).includes('Grounded')) stability += 1;
  if (anc && (c.ancestry.traits || []).includes('Curse of Stone')) stability += 1;
  if (kit || kit2) stability += kb('stab');

  const base = { Might: 0, Agility: 0, Reason: 0, Intuition: 0, Presence: 0, ...c.cclass.characteristics };
  const bonuses = levelCharBonuses(c);
  const chars = {};
  for (const k of ['Might', 'Agility', 'Reason', 'Intuition', 'Presence']) chars[k] = (base[k] || 0) + (bonuses[k] || 0);
  const highest = Math.max(...Object.values(chars));
  const recoveryValue = Math.floor(staminaMax / 3);
  const winded = Math.floor(staminaMax / 2);

  return {
    staminaMax, recoveries, recoveryValue, winded,
    speed, stability,
    chars, highest, echelon,
    potency: cls ? {
      weak: highest - 2, average: highest - 1, strong: highest,
    } : { weak: 0, average: 0, strong: 0 },
  };
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
  const [activeId, setActiveId] = useState(null);
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [backView, setBackView] = useState({ view: 'roster' }); // where a hero editor returns to
  const [view, setView] = useState(() => localStorage.getItem(LS_VIEW) || 'roster');

  useEffect(() => { localStorage.setItem(LS_VIEW, view); }, [view]);

  const active = useMemo(() => characters.find(c => c.id === activeId) || null, [characters, activeId]);
  const activeCampaign = useMemo(() => campaigns.find(c => c.id === activeCampaignId) || null, [campaigns, activeCampaignId]);

  // ── boot + auth lifecycle ──
  // Loads the RLS-scoped store on boot and on a fresh sign-in. A token refresh
  // (user→user) deliberately does NOT reload, so it can't clobber an in-flight
  // optimistic edit, nor yank the user back to the roster mid-session.
  const refreshStore = useCallback(async () => {
    const { profiles, characters: chs, campaigns: cps } = await DS.loadAll();
    setUsers(profiles);
    setCharacters(chs.map(migrateCharacterChars));
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
        if (!bootedRef.current || !had) {
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

  // ── debounced per-character save (replaces the old whole-array write-through) ──
  const saveTimer = React.useRef(null);
  const pendingSave = React.useRef(null);
  const queueSave = useCallback((c) => {
    pendingSave.current = c;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const ch = pendingSave.current; pendingSave.current = null; saveTimer.current = null;
      if (ch) DS.upsertCharacter(ch).catch(e => console.error('Save failed', e));
    }, 600);
  }, []);
  const flushSave = useCallback(() => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    const ch = pendingSave.current; pendingSave.current = null;
    if (ch) DS.upsertCharacter(ch).catch(e => console.error('Save failed', e));
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
    DS.upsertCharacter(ch).catch(e => console.error('Create failed', e));
  }, [currentUser]);

  const openCharacter = useCallback((id, back = { view: 'roster' }) => {
    const ch = characters.find(c => c.id === id);
    if (!ch) return;
    setActiveId(id);
    setBackView(back);
    setView(ch.status === 'complete' ? 'play' : 'wizard');
  }, [characters]);

  const deleteCharacter = useCallback((id) => {
    if (pendingSave.current && pendingSave.current.id === id) pendingSave.current = null;
    setCharacters(prev => prev.filter(c => c.id !== id));
    if (activeId === id) { setActiveId(null); setView('roster'); }
    DS.deleteCharacter(id).catch(e => console.error('Delete failed', e));
  }, [activeId]);

  const assignCharacter = useCallback((charId, campaignId) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== charId) return c;
      const next = { ...c, campaignId, lastModified: Date.now() };
      DS.upsertCharacter(next).catch(e => console.error('Assign failed', e));
      return next;
    }));
  }, []);

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
    if (target === 'campaigns') { setActiveCampaignId(null); }
    setView(target);
  }, []);

  const openCampaign = useCallback((id) => { setActiveCampaignId(id); setView('campaign'); }, []);

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
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    DS.updateCampaign(id, patch).catch(e => console.error('Campaign update failed', e));
  }, []);

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
  // through screens instead of leaving the app. We keep the URL unchanged (GitHub Pages
  // has no SPA fallback, and the OAuth flow uses the hash), storing nav state only in
  // history.state. poppingRef suppresses the echo when a popstate-driven setState
  // re-triggers the sync effect; historyReadyRef makes the first authed screen a
  // replaceState baseline and pushes thereafter.
  const poppingRef = React.useRef(false);
  const historyReadyRef = React.useRef(false);

  useEffect(() => {
    const onPop = (e) => {
      const s = e.state && e.state.dsNav;
      if (!s) return;   // not one of ours → let the browser navigate away
      poppingRef.current = true;
      setView(s.view);
      setActiveId(s.activeId ?? null);
      setActiveCampaignId(s.activeCampaignId ?? null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (booting || !currentUser) { historyReadyRef.current = false; return; }
    if (poppingRef.current) { poppingRef.current = false; return; }  // came from Back/Forward
    const loc = { dsNav: { view, activeId, activeCampaignId } };
    if (!historyReadyRef.current) {
      window.history.replaceState(loc, '');   // baseline entry for this session
      historyReadyRef.current = true;
    } else {
      window.history.pushState(loc, '');
    }
  }, [view, activeId, activeCampaignId, booting, currentUser]);

  // ─── Tweaks: theme + surface opacity ───
  const [tw, setTweak] = useTweaks({
    theme: 'obsidian',
    surfaceAlpha: 0.85,
  });
  useEffect(() => {
    document.body.dataset.theme = tw.theme;
    document.body.style.setProperty('--surface-alpha', String(tw.surfaceAlpha));
  }, [tw.theme, tw.surfaceAlpha]);

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
            <div className="auth-crown">✠ · ❦ · ✦ · ❦ · ✠</div>
            <div className="auth-sub" style={{ marginTop: 24 }}>Opening the Liber Heroum…</div>
          </div></div>
        ) : !currentUser ? (
          <AuthScreen onProvider={doProvider} />
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
          <PlayView
            character={active}
            update={updateActive}
            onExit={goBackFromHero}
            onEdit={() => setView('wizard')}
          />
        ) : null}

        {currentUser && (
          <TweaksPanel>
            <TweakSection label="Theme" />
            <TweakRadio
              label="Scheme"
              value={tw.theme}
              options={[
                { value: 'obsidian',  label: 'Obsidian' },
                { value: 'reliquary', label: 'Reliquary' },
              ]}
              onChange={(v) => setTweak('theme', v)}
            />
            <TweakSlider
              label="Surface opacity"
              value={tw.surfaceAlpha}
              min={0.4} max={1} step={0.05}
              onChange={(v) => setTweak('surfaceAlpha', v)}
            />
          </TweaksPanel>
        )}
      </div>
    </>
  );
}


// ───────── Summarise benefits (skills / languages / perks / class features) ─────────
function summarizeBenefits(c) {
  const cls = classDef(c);
  const anc = ancestryDef(c);
  const car = careerDef(c);
  const cu  = c.culture || {};

  // Skills: collect descriptions from each source. Prefer concrete picks where stored.
  const skills = [];
  if (cls && cls.quickSkills?.length) skills.push({ source: cls.name, text: cls.quickSkills.join(' \u00b7 ') });
  if (car) {
    const carPicks = (c.career?.skills || []);
    if (carPicks.length) skills.push({ source: car.name, text: carPicks.join(' \u00b7 ') });
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
  if (anc && anc.signature?.text && /skill/i.test(anc.signature.text)) {
    // Ancestry signatures like Silver Tongue grant a skill choice.
    skills.push({ source: anc.name + ' \u2014 ' + anc.signature.name, text: anc.signature.text });
  }

  // Languages — show actual picks if any, otherwise the +N text.
  const languages = [];
  languages.push({ source: 'Standard', text: 'Caelian' });
  if (cu && cu.language) languages.push({ source: 'Culture', text: cu.language });
  if (car && car.languages > 0) {
    const picks = c.career?.languages || [];
    if (picks.length) languages.push({ source: car.name, text: picks.join(' \u00b7 ') });
    else languages.push({ source: car.name, text: `+${car.languages} of your choice` });
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
        } else if (f.choose === 'prayerWard') {
          const parts = [];
          if (c.cclass?.prayer) parts.push(`Prayer: ${c.cclass.prayer}`);
          if (c.cclass?.ward) parts.push(`Ward: ${c.cclass.ward}`);
          features.push({ name: f.name, text: parts.length ? parts.join(' \u00b7 ') : f.text });
        } else if (f.choose === 'enchantWard') {
          const parts = [];
          if (c.cclass?.enchantment) parts.push(`Enchantment: ${c.cclass.enchantment}`);
          if (c.cclass?.ward) parts.push(`Ward: ${c.cclass.ward}`);
          features.push({ name: f.name, text: parts.length ? parts.join(' \u00b7 ') : f.text });
        } else if (f.choose === 'augmentWard') {
          const parts = [];
          if (c.cclass?.enchantment) parts.push(`Augmentation: ${c.cclass.enchantment}`);
          if (c.cclass?.ward) parts.push(`Ward: ${c.cclass.ward}`);
          features.push({ name: f.name, text: parts.length ? parts.join(' \u00b7 ') : f.text });
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

  return { skills, languages, perk, features, classAbilities };
}

// Expose helpers globally for other files
Object.assign(window, {
  newCharacter, classDef, ancestryDef, kitDef, kit2Def, careerDef, complicationDef, computeDerived,
  summarizeBenefits,
});
export { newCharacter, classDef, ancestryDef, kitDef, kit2Def, careerDef, complicationDef, computeDerived, summarizeBenefits };
export { App };
