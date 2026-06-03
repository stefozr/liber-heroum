// backend.jsx — the persistence + identity seam (Supabase implementation).
//
// ─────────────────────────────────────────────────────────────────────────────
//  Everything above this file talks ONLY through `DS`. Previously DS simulated a
//  shared server in localStorage; it now speaks to Supabase (Postgres + Auth +
//  Storage) with Row-Level Security enforcing who can read/edit what. The shapes
//  handed back to the screens are unchanged:
//    • Profile   { id, displayName, provider, avatar, email? }
//    • Campaign  { id, name, description, gmId, inviteCode, createdAt, memberIds[] }
//    • Character  the full nested blob (stored in characters.data jsonb)
//
//  Sync vs async: the pure helpers (uid/initialsOf/avatarColors/PROVIDERS) stay
//  synchronous. Everything that touches the network is async (returns a Promise).
//  See ../SETUP.md for the project + auth provider setup, and supabase/migration.sql
//  for the schema/RLS this code assumes.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabaseClient.ts';

const NS = 'draw-steel/v2';
const K = { session: `${NS}/session` };   // retained only as a per-device UI-pref key prefix

// ── tiny utils ────────────────────────────────────────────────────────────
function uid(prefix = 'x') {
  return prefix + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

// ── identity helpers (deterministic avatar: initials + hue from the user id) ──
function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '✦';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function hueOf(seed) {
  let h = 0;
  const s = String(seed || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}
function avatarColors(seed) {
  const h = hueOf(seed);
  return { bg: `oklch(0.32 0.06 ${h})`, ink: `oklch(0.90 0.06 ${h})`, ring: `oklch(0.55 0.10 ${h})` };
}

const PROVIDERS = {
  discord: { label: 'Discord', mark: 'D' },
  google:  { label: 'Google',  mark: 'G' },
};

// Client-side normalize of an invite code for display/compare (the authoritative
// lookup lives in the join_campaign RPC).
function findByCode(campaigns, code) {
  const norm = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return campaigns.find(c => c.inviteCode.replace(/[^A-Z0-9]/g, '') === norm) || null;
}

// ── shape mappers (DB row ⇄ app object) ─────────────────────────────────────
function hydrateChar(row) {
  return {
    ...row.data,
    id: row.id,
    ownerId: row.owner_id,
    campaignId: row.campaign_id,
    status: row.status,
    level: row.level,
  };
}
function charRow(c) {
  return {
    id: c.id,
    owner_id: c.ownerId,
    campaign_id: c.campaignId ?? null,
    name: (c.identity && c.identity.name) || c.name || null,
    status: c.status,
    level: c.level,
    data: c,
    updated_at: new Date().toISOString(),
  };
}
function hydrateCampaign(row, memberIds) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    gmId: row.gm_id,
    inviteCode: row.invite_code,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    memberIds: memberIds && memberIds.length ? memberIds : [row.gm_id],
  };
}

// ── identity / session ──────────────────────────────────────────────────────
async function currentProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  let { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!prof) {
    // The signup trigger normally creates this; upsert defensively if it's missing.
    const m = user.user_metadata || {};
    const displayName = m.display_name || m.full_name || m.name || (user.email ? user.email.split('@')[0] : 'Hero');
    await supabase.from('profiles').upsert({
      id: user.id, display_name: displayName, provider: (user.app_metadata && user.app_metadata.provider) || 'email',
    });
    ({ data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle());
  }
  return {
    id: user.id,
    email: user.email,
    displayName: (prof && prof.display_name) || user.email || 'Hero',
    provider: (prof && prof.provider) || 'email',
    avatar: prof && prof.avatar,
  };
}

async function init() {
  return currentProfile();
}

// Subscribe to auth changes. The Supabase callback runs while a lock is held, so
// we defer the (async, network-touching) profile fetch to avoid a deadlock.
function onAuthChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(async () => {
      cb(session ? await currentProfile() : null, _event);
    }, 0);
  });
  return () => data.subscription.unsubscribe();
}

async function signUpEmail({ email, password, displayName }) {
  if (!displayName || !displayName.trim()) throw new Error('Choose a name fellow heroes will know you by.');
  const { error } = await supabase.auth.signUp({
    email: String(email || '').trim(),
    password,
    options: { data: { display_name: displayName.trim() } },
  });
  if (error) throw new Error(error.message);
}

async function signInEmail({ email, password }) {
  const { error } = await supabase.auth.signInWithPassword({ email: String(email || '').trim(), password });
  if (error) throw new Error(error.message);
}

async function signInWithProvider(provider) {
  const redirectTo = window.location.href.split('#')[0];
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
  if (error) throw new Error(error.message);
}

async function signOut() {
  await supabase.auth.signOut();
}

// ── load everything the current user is allowed to see ──────────────────────
async function loadAll() {
  const { data: { user } } = await supabase.auth.getUser();
  const [charsRes, campsRes, memsRes] = await Promise.all([
    supabase.from('characters').select('*'),
    supabase.from('campaigns').select('*'),
    supabase.from('campaign_members').select('campaign_id,user_id,role'),
  ]);
  if (charsRes.error) throw new Error(charsRes.error.message);

  const membersByCampaign = {};
  for (const m of memsRes.data || []) (membersByCampaign[m.campaign_id] ||= []).push(m.user_id);

  const characters = (charsRes.data || []).map(hydrateChar);
  const campaigns = (campsRes.data || []).map(r => hydrateCampaign(r, membersByCampaign[r.id]));

  // Profiles needed to render members + party owners.
  const ids = new Set();
  campaigns.forEach(c => c.memberIds.forEach(id => ids.add(id)));
  characters.forEach(c => { if (c.ownerId) ids.add(c.ownerId); });
  if (user) ids.add(user.id);

  let profiles = [];
  if (ids.size) {
    const { data: profRows } = await supabase.from('profiles').select('*').in('id', [...ids]);
    profiles = (profRows || []).map(p => ({ id: p.id, displayName: p.display_name, provider: p.provider, avatar: p.avatar }));
  }
  const me = profiles.find(p => p.id === (user && user.id));
  if (me && user) me.email = user.email;

  return { profiles, characters, campaigns };
}

// ── character mutations ─────────────────────────────────────────────────────
async function upsertCharacter(c) {
  const { error } = await supabase.from('characters').upsert(charRow(c));
  if (error) throw new Error(error.message);
}
async function deleteCharacter(id) {
  const { error } = await supabase.from('characters').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

async function uploadPortrait(file) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');
  const ext = (file.name && file.name.includes('.')) ? file.name.split('.').pop() : 'png';
  const path = `${user.id}/${uid('p')}.${ext}`;
  const { error } = await supabase.storage.from('portraits').upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('portraits').getPublicUrl(path);
  return data.publicUrl;
}

// ── campaign mutations ──────────────────────────────────────────────────────
async function createCampaign({ name, description }) {
  const { data, error } = await supabase.rpc('create_campaign', { p_name: name, p_description: description || '' });
  if (error) throw new Error(error.message);
  return hydrateCampaign(data, [data.gm_id]);
}

async function joinByCode(code) {
  const { data, error } = await supabase.rpc('join_campaign', { p_code: code });
  if (error) throw new Error(error.message);
  const { data: mems } = await supabase.from('campaign_members').select('user_id').eq('campaign_id', data.id);
  return hydrateCampaign(data, (mems || []).map(m => m.user_id));
}

async function updateCampaign(id, patch) {
  const upd = {};
  if (patch.name !== undefined) upd.name = patch.name;
  if (patch.description !== undefined) upd.description = patch.description;
  if (!Object.keys(upd).length) return;
  const { error } = await supabase.from('campaigns').update(upd).eq('id', id);
  if (error) throw new Error(error.message);
}

async function regenInviteCode(id) {
  const { data, error } = await supabase.rpc('regen_invite_code', { p_campaign: id });
  if (error) throw new Error(error.message);
  return data; // new code string
}

async function leaveCampaign(id) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('characters').update({ campaign_id: null }).eq('campaign_id', id).eq('owner_id', user.id);
  const { error } = await supabase.from('campaign_members').delete().eq('campaign_id', id).eq('user_id', user.id);
  if (error) throw new Error(error.message);
}

async function removeMember(campaignId, userId) {
  // Director-only (enforced by RLS). Release the kicked member's heroes first.
  await supabase.from('characters').update({ campaign_id: null }).eq('campaign_id', campaignId).eq('owner_id', userId);
  const { error } = await supabase.from('campaign_members').delete().eq('campaign_id', campaignId).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

async function disbandCampaign(id) {
  // FK `on delete set null` releases every character back to its owner's roster.
  const { error } = await supabase.from('campaigns').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

const DS = {
  K, uid,
  initialsOf, avatarColors, hueOf, PROVIDERS, findByCode,
  init, onAuthChange,
  signUpEmail, signInEmail, signInWithProvider, signOut,
  loadAll,
  upsertCharacter, deleteCharacter, uploadPortrait,
  createCampaign, joinByCode, updateCampaign, regenInviteCode,
  leaveCampaign, removeMember, disbandCampaign,
};

if (typeof window !== 'undefined') window.DS = DS;
export { DS };
