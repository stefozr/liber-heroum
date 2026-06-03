import React from 'react';
import { OrnDivider, Pill, Button, H3, Modal } from './theme.jsx';
import { Avatar, AuthField } from './auth.jsx';
import { classDef, ancestryDef } from './app.jsx';
// campaigns.jsx — the campaign hub + a campaign's detail page (party, members, sigil).
// "Director" is Draw Steel's name for the GM.

const { useState: useCmpState } = React;

const CAMPAIGN_CSS = `
.cmp-screen { width: 100%; height: 100%; overflow: auto; position: relative; z-index: 2; }
.cmp-inner { max-width: 1180px; margin: 0 auto; padding: 46px 40px 80px; }

.cmp-page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 8px; flex-wrap: wrap; }
.cmp-page-head .titles h1 {
  font-family: var(--display); font-weight: 700; font-size: 40px; letter-spacing: 0.06em;
  color: var(--ink); margin: 0; line-height: 1;
}
.cmp-page-head .titles .sub { font-family: var(--hand); font-style: italic; font-size: 18px; color: var(--gold-2); margin-top: 10px; }
.cmp-actions { display: flex; gap: 10px; }

.cmp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 18px; margin-top: 30px; }
.cmp-card {
  border: 1px solid var(--line-2); background: linear-gradient(180deg, var(--bg-2), var(--bg-1));
  padding: 0; cursor: pointer; transition: all .18s; position: relative; overflow: hidden;
  display: flex; flex-direction: column; min-height: 188px;
}
.cmp-card:hover { border-color: var(--gold); transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,0,0,0.45), 0 0 22px rgba(176,138,72,0.12); }
.cmp-card .cc-band {
  height: 6px; background: linear-gradient(90deg, var(--gold-deep), var(--gold-2), var(--gold-deep));
}
.cmp-card .cc-body { padding: 18px 20px 14px; flex: 1; }
.cmp-card .cc-role {
  font-family: var(--mono); font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase;
  border: 1px solid var(--line-2); color: var(--ink-3); padding: 3px 9px; display: inline-block;
}
.cmp-card .cc-role.director { border-color: var(--gold); color: var(--gold-2); }
.cmp-card .cc-name { font-family: var(--display); font-size: 24px; letter-spacing: 0.04em; color: var(--ink); margin-top: 12px; line-height: 1.1; }
.cmp-card .cc-desc { font-family: var(--serif); font-size: 14px; color: var(--ink-2); line-height: 1.5; margin-top: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.cmp-card .cc-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 11px 20px; border-top: 1px solid var(--line);
  font-family: var(--mono); font-size: 10px; color: var(--ink-3); letter-spacing: 0.14em; text-transform: uppercase;
}
.cmp-card .cc-avatars { display: flex; }
.cmp-card .cc-avatars .ds-avatar { margin-left: -7px; border-color: var(--bg-1); box-shadow: 0 0 0 1px var(--line-2); }
.cmp-card .cc-avatars .ds-avatar:first-child { margin-left: 0; }
.cmp-card .cc-more { margin-left: 5px; }

.cmp-empty {
  border: 1px dashed var(--line-2); padding: 50px 30px; text-align: center; margin-top: 30px;
}
.cmp-empty .e-glyph { font-family: var(--display); font-size: 40px; color: var(--gold); opacity: 0.4; }
.cmp-empty .e-title { font-family: var(--display); font-size: 20px; letter-spacing: 0.12em; color: var(--gold-2); margin-top: 14px; }
.cmp-empty .e-sub { font-family: var(--hand); font-style: italic; color: var(--ink-2); font-size: 16px; margin-top: 8px; }

/* Detail */
.cmp-back {
  background: transparent; border: none; cursor: pointer; color: var(--ink-3);
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase;
  padding: 0; margin-bottom: 22px; display: inline-flex; gap: 8px; align-items: center;
}
.cmp-back:hover { color: var(--gold-2); }

.cmp-detail-head {
  border: 1px solid var(--line-2); background: linear-gradient(180deg, rgba(20,20,26,0.7), rgba(14,14,18,0.6));
  padding: 24px 26px; position: relative;
}
.cmp-detail-head .role-tag {
  font-family: var(--mono); font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase;
  border: 1px solid var(--line-2); color: var(--ink-3); padding: 4px 10px;
}
.cmp-detail-head .role-tag.director { border-color: var(--gold); color: var(--gold-2); }
.cmp-detail-head h1 { font-family: var(--display); font-weight: 700; font-size: 36px; letter-spacing: 0.05em; color: var(--ink); margin: 12px 0 0; line-height: 1.05; }
.cmp-detail-head .desc { font-family: var(--serif); font-size: 15px; color: var(--ink-2); line-height: 1.6; margin-top: 12px; max-width: 720px; }
.cmp-detail-head .head-tools { position: absolute; top: 22px; right: 24px; display: flex; gap: 8px; }

.cmp-sigil {
  display: inline-flex; align-items: stretch; margin-top: 18px; border: 1px solid var(--gold-deep);
}
.cmp-sigil .sg-label { font-family: var(--mono); font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink-3); display: grid; place-items: center; padding: 0 12px; border-right: 1px solid var(--line); background: rgba(0,0,0,0.2); }
.cmp-sigil .sg-code { font-family: var(--display); font-size: 18px; letter-spacing: 0.3em; color: var(--gold-2); padding: 9px 16px; }
.cmp-sigil .sg-copy {
  background: transparent; border: none; border-left: 1px solid var(--line); cursor: pointer;
  font-family: var(--mono); font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--ink-3); padding: 0 14px;
}
.cmp-sigil .sg-copy:hover { color: var(--gold-2); background: rgba(176,138,72,0.06); }

.cmp-sec-head { display: flex; align-items: center; justify-content: space-between; margin: 40px 0 16px; gap: 16px; }

.member-rail { display: flex; flex-wrap: wrap; gap: 10px; }
.member-chip {
  display: flex; align-items: center; gap: 10px; border: 1px solid var(--line-2);
  background: rgba(255,255,255,0.012); padding: 8px 12px 8px 8px;
}
.member-chip .mc-name { font-family: var(--display-2); font-size: 13px; letter-spacing: 0.04em; color: var(--ink); }
.member-chip .mc-tag { font-family: var(--mono); font-size: 8px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-3); margin-top: 2px; }
.member-chip .mc-tag.director { color: var(--gold-2); }
.member-chip .mc-kick { background: transparent; border: none; cursor: pointer; color: var(--ink-4); font-size: 14px; padding: 0 2px 0 6px; }
.member-chip .mc-kick:hover { color: var(--rubric-2); }

.party-group { margin-bottom: 26px; }
.party-group .pg-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.party-group .pg-head .pg-name { font-family: var(--display-2); font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold-2); }
.party-group .pg-head .pg-you { font-family: var(--mono); font-size: 8.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-3); border: 1px solid var(--line-2); padding: 2px 7px; }
.party-group .pg-line { flex: 1; height: 1px; background: var(--line); }

.party-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.ph-card {
  border: 1px solid var(--line-2); background: var(--bg-1); cursor: pointer; overflow: hidden;
  display: flex; transition: all .16s; min-height: 92px;
}
.ph-card:hover { border-color: var(--gold); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.4); }
.ph-card .ph-img { width: 84px; flex-shrink: 0; background-size: cover; background-position: center top; background-color: var(--bg-3); }
.ph-card .ph-img.empty { display: grid; place-items: center; color: var(--gold); opacity: 0.4; font-family: var(--display); font-size: 26px; }
.ph-card .ph-body { padding: 11px 14px; flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
.ph-card .ph-name { font-family: var(--display); font-size: 17px; letter-spacing: 0.03em; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ph-card .ph-meta { font-family: var(--mono); font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-3); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ph-card .ph-foot { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.ph-card .ph-lvl { font-family: var(--display); font-size: 10px; letter-spacing: 0.16em; color: var(--gold); }
.ph-card .ph-status { font-family: var(--mono); font-size: 8px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-3); margin-left: auto; }
.ph-card .ph-status.wip { color: var(--rubric-2); }
.ph-card .ph-edit { font-family: var(--mono); font-size: 8px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold-2); border: 1px solid var(--gold-deep); padding: 2px 6px; }

.add-hero-card {
  border: 1px dashed var(--line-2); background: transparent; cursor: pointer;
  display: grid; place-items: center; min-height: 92px; text-align: center; padding: 14px;
  transition: all .16s;
}
.add-hero-card:hover { border-color: var(--gold); border-style: solid; background: rgba(176,138,72,0.04); }
.add-hero-card .ah-glyph { font-family: var(--display); font-size: 22px; color: var(--gold); }
.add-hero-card .ah-text { font-family: var(--display-2); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold-2); margin-top: 6px; }

.assign-row {
  display: flex; align-items: center; gap: 12px; border: 1px solid var(--line-2);
  padding: 10px 12px; cursor: pointer; transition: border-color .14s, background .14s;
}
.assign-row:hover { border-color: var(--gold); background: rgba(176,138,72,0.05); }
.assign-row .ar-name { font-family: var(--display-2); font-size: 14px; color: var(--ink); }
.assign-row .ar-meta { font-family: var(--mono); font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-3); margin-top: 3px; }
.assign-row .ar-where { margin-left: auto; font-family: var(--mono); font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold-2); }

/* Roster hero-card "add to campaign" control */
.hc-camp {
  background: transparent; border: none; cursor: pointer; color: var(--ink-3);
  font-family: var(--mono); font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase;
  padding: 4px 6px; transition: color .12s;
}
.hc-camp:hover { color: var(--gold-2); }
`;

const CampaignStyles = () => React.createElement('style', { id: 'ds-campaign-css' }, CAMPAIGN_CSS);

// Short class/ancestry summary for a hero (reuses the global defs from app.jsx/data.jsx)
function heroSummary(c) {
  const cls = (typeof classDef === 'function') ? classDef(c) : null;
  const anc = (typeof ancestryDef === 'function') ? ancestryDef(c) : null;
  const parts = [anc && anc.name, cls && cls.name].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Unfinished';
}
function heroName(c) { return c.identity?.name || c.name || 'Unnamed Hero'; }
function heroPortrait(c) {
  const cls = (typeof classDef === 'function') ? classDef(c) : null;
  return c.portrait || (cls ? cls.img : null);
}

// ───────── Compact party hero card ─────────
function PartyHeroCard({ character, canEdit, onOpen }) {
  const c = character;
  const bg = heroPortrait(c);
  const wip = c.status !== 'complete';
  return (
    <div className="ph-card" onClick={onOpen}>
      <div className={`ph-img ${bg ? '' : 'empty'}`} style={bg ? { backgroundImage: `url(${bg})` } : {}}>{bg ? '' : '✠'}</div>
      <div className="ph-body">
        <div className="ph-name">{heroName(c)}</div>
        <div className="ph-meta">{heroSummary(c)}</div>
        <div className="ph-foot">
          <span className="ph-lvl">LVL {c.level || 1}</span>
          {canEdit && <span className="ph-edit">{wip ? 'Resume' : 'Edit'}</span>}
          <span className={`ph-status ${wip ? 'wip' : ''}`}>{wip ? 'In Progress' : 'Chronicled'}</span>
        </div>
      </div>
    </div>
  );
}

// ───────── Campaign hub ─────────
function CampaignHub({ user, campaigns, users, chars, onOpen, onCreate, onJoin }) {
  const [createOpen, setCreateOpen] = useCmpState(false);
  const [joinOpen, setJoinOpen] = useCmpState(false);
  const [name, setName] = useCmpState('');
  const [desc, setDesc] = useCmpState('');
  const [code, setCode] = useCmpState('');
  const [error, setError] = useCmpState('');

  const userById = React.useMemo(() => Object.fromEntries((users || []).map(u => [u.id, u])), [users]);
  const mine = campaigns.filter(c => c.memberIds.includes(user.id));

  const submitCreate = () => {
    if (!name.trim()) { setError('Your campaign needs a name.'); return; }
    onCreate({ name, description: desc });
    setName(''); setDesc(''); setError(''); setCreateOpen(false);
  };
  const submitJoin = () => {
    setError('');
    try { onJoin(code); setCode(''); setJoinOpen(false); }
    catch (e) { setError(e.message || 'No campaign answers to that sigil.'); }
  };

  return (
    <div className="cmp-screen">
      <div className="cmp-inner">
        <div className="cmp-page-head">
          <div className="titles">
            <h1>Campaigns</h1>
            <div className="sub">The companies you keep, and the tables you hold</div>
          </div>
          <div className="cmp-actions">
            <Button kind="ghost" onClick={() => { setError(''); setJoinOpen(true); }}>Join by Sigil</Button>
            <Button kind="primary" onClick={() => { setError(''); setCreateOpen(true); }}>✦ Found a Campaign</Button>
          </div>
        </div>

        <OrnDivider glyph="❦  ✠  ❦" />

        {mine.length === 0 ? (
          <div className="cmp-empty">
            <div className="e-glyph">✠</div>
            <div className="e-title">NO BANNERS RAISED</div>
            <div className="e-sub">Found a campaign to lead as Director, or join a friend's table with its sigil.</div>
          </div>
        ) : (
          <div className="cmp-grid">
            {mine.map(c => {
              const isGM = c.gmId === user.id;
              const members = c.memberIds.map(id => userById[id]).filter(Boolean);
              const heroCount = chars.filter(ch => ch.campaignId === c.id).length;
              const shown = members.slice(0, 5);
              return (
                <div key={c.id} className="cmp-card" onClick={() => onOpen(c.id)}>
                  <div className="cc-band"></div>
                  <div className="cc-body">
                    <span className={`cc-role ${isGM ? 'director' : ''}`}>{isGM ? '✦ Director' : 'Player'}</span>
                    <div className="cc-name">{c.name}</div>
                    {c.description && <div className="cc-desc">{c.description}</div>}
                  </div>
                  <div className="cc-foot">
                    <div className="cc-avatars">
                      {shown.map(m => <Avatar key={m.id} user={m} size={24} />)}
                      {members.length > shown.length && <span className="cc-more">+{members.length - shown.length}</span>}
                    </div>
                    <span>{heroCount} {heroCount === 1 ? 'hero' : 'heroes'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Found a campaign */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Found a Campaign"
        width={520}
        footer={(
          <>
            <Button kind="ghost" onClick={() => setCreateOpen(false)}>◂ CANCEL</Button>
            <div style={{ flex: 1 }}></div>
            <Button kind="primary" onClick={submitCreate}>RAISE THE BANNER ✦</Button>
          </>
        )}
      >
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--ink-2)', fontSize: 14, marginBottom: 16, lineHeight: 1.55 }}>
          You'll be its Director. A sigil will be minted that you can share so players may bring their heroes.
        </div>
        <div className="stack-12">
          <AuthField label="Campaign name" value={name} onChange={setName} placeholder="e.g. The Ashen Crown" autoFocus onEnter={submitCreate} />
          <div className="input-row">
            <label>The premise <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--ink-4)' }}>(optional)</span></label>
            <textarea className="input-area" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="A line or two to set the table…" />
          </div>
        </div>
        {error && <div className="auth-error">{error}</div>}
      </Modal>

      {/* Join by sigil */}
      <Modal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        title="Join by Sigil"
        width={460}
        footer={(
          <>
            <Button kind="ghost" onClick={() => setJoinOpen(false)}>◂ CANCEL</Button>
            <div style={{ flex: 1 }}></div>
            <Button kind="primary" onClick={submitJoin}>JOIN THE TABLE →</Button>
          </>
        )}
      >
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--ink-2)', fontSize: 14, marginBottom: 16, lineHeight: 1.55 }}>
          Ask your Director for the campaign sigil — a short code like <b style={{ color: 'var(--gold-2)', fontStyle: 'normal' }}>ABC-DEF</b> — and enter it below.
        </div>
        <div className="input-row">
          <label>Campaign sigil</label>
          <input
            className="input-text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC-DEF"
            autoFocus
            style={{ fontFamily: 'var(--display)', fontSize: 20, letterSpacing: '0.24em', textAlign: 'center' }}
            onKeyDown={(e) => { if (e.key === 'Enter') submitJoin(); }}
          />
        </div>
        {error && <div className="auth-error">{error}</div>}
      </Modal>
    </div>
  );
}

// ───────── Campaign detail ─────────
function CampaignDetail({
  campaign, user, users, chars,
  onOpenHero, onAssign, onCreateHero, onUpdate, onRegen, onRemoveMember, onLeave, onDelete, onBack,
}) {
  const isGM = campaign.gmId === user.id;
  const userById = React.useMemo(() => Object.fromEntries((users || []).map(u => [u.id, u])), [users]);

  const [copied, setCopied] = useCmpState(false);
  const [settingsOpen, setSettingsOpen] = useCmpState(false);
  const [assignOpen, setAssignOpen] = useCmpState(false);
  const [confirm, setConfirm] = useCmpState(null); // {kind:'leave'|'delete'|'kick', userId?}
  const [editName, setEditName] = useCmpState(campaign.name);
  const [editDesc, setEditDesc] = useCmpState(campaign.description || '');

  React.useEffect(() => { setEditName(campaign.name); setEditDesc(campaign.description || ''); }, [campaign.id]);

  const campChars = chars.filter(c => c.campaignId === campaign.id);
  const myUnassigned = chars.filter(c => c.ownerId === user.id && c.campaignId !== campaign.id);
  const members = campaign.memberIds.map(id => userById[id]).filter(Boolean);

  const copyCode = () => {
    const t = campaign.inviteCode;
    try { navigator.clipboard.writeText(t); } catch {}
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  };

  // Order party groups: the Director first, then everyone else; current user's
  // own heroes always reachable via the "add" affordance even with none yet.
  const ownerOrder = [campaign.gmId, ...campaign.memberIds.filter(id => id !== campaign.gmId)];
  const groups = ownerOrder.map(ownerId => ({
    owner: userById[ownerId],
    heroes: campChars.filter(c => c.ownerId === ownerId),
  })).filter(g => g.owner);

  return (
    <div className="cmp-screen">
      <div className="cmp-inner">
        <button className="cmp-back" onClick={onBack}>◂ All Campaigns</button>

        <div className="cmp-detail-head">
          {isGM && (
            <div className="head-tools">
              <Button kind="ghost" small onClick={() => setSettingsOpen(true)}>⚙ Manage</Button>
            </div>
          )}
          <span className={`role-tag ${isGM ? 'director' : ''}`}>{isGM ? '✦ You are Director' : 'You are a Player'}</span>
          <h1>{campaign.name}</h1>
          {campaign.description && <div className="desc">{campaign.description}</div>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <div className="cmp-sigil">
              <span className="sg-label">Sigil</span>
              <span className="sg-code">{campaign.inviteCode}</span>
              <button className="sg-copy" onClick={copyCode}>{copied ? '✓ Copied' : 'Copy'}</button>
            </div>
            <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13.5, color: 'var(--ink-3)' }}>
              Share this so players can join the table.
            </span>
          </div>
        </div>

        {/* Members */}
        <div className="cmp-sec-head">
          <H3>The Table</H3>
          <Pill kind="muted">{members.length} {members.length === 1 ? 'Member' : 'Members'}</Pill>
        </div>
        <div className="member-rail">
          {members.map(m => {
            const mGM = m.id === campaign.gmId;
            return (
              <div key={m.id} className="member-chip">
                <Avatar user={m} size={34} />
                <div>
                  <div className="mc-name">{m.displayName}{m.id === user.id ? ' (you)' : ''}</div>
                  <div className={`mc-tag ${mGM ? 'director' : ''}`}>{mGM ? 'Director' : 'Player'}</div>
                </div>
                {isGM && !mGM && (
                  <button className="mc-kick" title="Remove from campaign" onClick={() => setConfirm({ kind: 'kick', userId: m.id })}>✕</button>
                )}
              </div>
            );
          })}
        </div>

        {/* Party */}
        <div className="cmp-sec-head">
          <H3>The Party</H3>
          <Pill kind="muted">{campChars.length} {campChars.length === 1 ? 'Hero' : 'Heroes'}</Pill>
        </div>

        {groups.map(g => {
          const isMe = g.owner.id === user.id;
          const canEdit = isGM || isMe;
          return (
            <div key={g.owner.id} className="party-group">
              <div className="pg-head">
                <Avatar user={g.owner} size={22} />
                <span className="pg-name">{g.owner.displayName}{g.owner.id === campaign.gmId ? " · Director" : ''}</span>
                {isMe && <span className="pg-you">You</span>}
                <span className="pg-line"></span>
              </div>
              <div className="party-grid">
                {g.heroes.map(c => (
                  <PartyHeroCard key={c.id} character={c} canEdit={canEdit} onOpen={() => onOpenHero(c.id)} />
                ))}
                {isMe && (
                  <div className="add-hero-card" onClick={() => (myUnassigned.length ? setAssignOpen(true) : onCreateHero(campaign.id))}>
                    <div>
                      <div className="ah-glyph">✠</div>
                      <div className="ah-text">{myUnassigned.length ? 'Add a Hero' : 'Forge a Hero'}</div>
                    </div>
                  </div>
                )}
                {g.heroes.length === 0 && !isMe && (
                  <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--ink-3)', fontSize: 14, alignSelf: 'center' }}>
                    No heroes brought to the table yet.
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: 44, textAlign: 'center' }}>
          {!isGM && <Button kind="danger" small onClick={() => setConfirm({ kind: 'leave' })}>Leave this campaign</Button>}
        </div>
      </div>

      {/* Assign existing hero */}
      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Bring a Hero to the Table"
        width={520}
        footer={(
          <>
            <Button kind="ghost" onClick={() => setAssignOpen(false)}>◂ CLOSE</Button>
            <div style={{ flex: 1 }}></div>
            <Button kind="primary" onClick={() => { setAssignOpen(false); onCreateHero(campaign.id); }}>✠ Forge a New One</Button>
          </>
        )}
      >
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--ink-2)', fontSize: 14, marginBottom: 16 }}>
          Choose one of your heroes to add to <b style={{ color: 'var(--gold-2)', fontStyle: 'normal' }}>{campaign.name}</b>.
        </div>
        <div className="stack-8">
          {myUnassigned.map(c => {
            const inOther = c.campaignId && c.campaignId !== campaign.id;
            return (
              <div key={c.id} className="assign-row" onClick={() => { onAssign(c.id, campaign.id); setAssignOpen(false); }}>
                <Avatar user={user} size={30} />
                <div>
                  <div className="ar-name">{heroName(c)}</div>
                  <div className="ar-meta">{heroSummary(c)} · Lvl {c.level || 1}</div>
                </div>
                {inOther && <span className="ar-where">moves tables</span>}
              </div>
            );
          })}
        </div>
      </Modal>

      {/* GM settings */}
      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Manage Campaign"
        width={540}
        footer={(
          <>
            <Button kind="danger" onClick={() => { setSettingsOpen(false); setConfirm({ kind: 'delete' }); }}>Disband ✕</Button>
            <div style={{ flex: 1 }}></div>
            <Button kind="ghost" onClick={() => setSettingsOpen(false)}>CLOSE</Button>
            <Button kind="primary" onClick={() => { onUpdate(campaign.id, { name: editName.trim() || campaign.name, description: editDesc.trim() }); setSettingsOpen(false); }}>SAVE</Button>
          </>
        )}
      >
        <div className="stack-12">
          <AuthField label="Campaign name" value={editName} onChange={setEditName} />
          <div className="input-row">
            <label>The premise</label>
            <textarea className="input-area" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
          </div>
          <div className="input-row">
            <label>Campaign sigil</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div className="cmp-sigil" style={{ marginTop: 0 }}>
                <span className="sg-code">{campaign.inviteCode}</span>
              </div>
              <Button kind="ghost" small onClick={() => onRegen(campaign.id)}>↻ Mint a new sigil</Button>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.1em', marginTop: 6 }}>
              The old sigil stops working once you mint a new one.
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirmations */}
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.kind === 'delete' ? 'Disband the Campaign?' : confirm?.kind === 'leave' ? 'Leave the Table?' : 'Remove from Campaign?'}
        width={460}
        footer={(
          <>
            <Button kind="ghost" onClick={() => setConfirm(null)}>◂ KEEP</Button>
            <div style={{ flex: 1 }}></div>
            <Button kind="danger" onClick={() => {
              const c = confirm; setConfirm(null);
              if (c.kind === 'delete') onDelete(campaign.id);
              else if (c.kind === 'leave') onLeave(campaign.id);
              else if (c.kind === 'kick') onRemoveMember(campaign.id, c.userId);
            }}>
              {confirm?.kind === 'delete' ? 'DISBAND ✕' : confirm?.kind === 'leave' ? 'LEAVE' : 'REMOVE'}
            </Button>
          </>
        )}
      >
        <div style={{ textAlign: 'center', fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
          {confirm?.kind === 'delete' && <>This dissolves <b style={{ color: 'var(--gold-2)' }}>{campaign.name}</b> for everyone. Heroes return to their owners' rosters, unbound. This cannot be undone.</>}
          {confirm?.kind === 'leave' && <>You'll leave <b style={{ color: 'var(--gold-2)' }}>{campaign.name}</b>. Your heroes return to your roster, unbound from this table.</>}
          {confirm?.kind === 'kick' && <>Remove <b style={{ color: 'var(--gold-2)' }}>{userById[confirm.userId]?.displayName}</b> from the campaign? Their heroes return to their own roster.</>}
        </div>
      </Modal>
    </div>
  );
}

Object.assign(window, { CampaignStyles, CampaignHub, CampaignDetail, PartyHeroCard, heroSummary, heroName, heroPortrait });
export { CampaignStyles, CampaignHub, CampaignDetail, PartyHeroCard, heroSummary, heroName, heroPortrait };
