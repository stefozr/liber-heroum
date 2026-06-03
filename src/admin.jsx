import React from 'react';
import { H2, Pill, Button, Modal, OrnDivider, GlyphRow } from './theme.jsx';
import { Avatar } from './auth.jsx';
import { PartyHeroCard, heroName } from './campaigns.jsx';
// admin.jsx — the superuser "All Heroes" oversight screen: every character in the
// system, grouped by its owner. Reuses the campaign party-group chrome + PartyHeroCard.
// Gated by currentUser.isAdmin in app.jsx; RLS (is_admin()) is the real enforcement.

const { useState, useMemo } = React;

const ADMIN_CSS = `
.adm-wrap { height: 100%; overflow: auto; padding: 32px 28px 80px; }
.adm-inner { max-width: 1100px; margin: 0 auto; }
.adm-head { text-align: center; margin-bottom: 8px; }
.adm-head h2 { margin-bottom: 0; }
.adm-card-wrap { position: relative; }
.adm-del {
  position: absolute; top: 8px; right: 8px; z-index: 5;
  width: 26px; height: 26px; display: grid; place-items: center; cursor: pointer;
  background: rgba(8,8,10,0.72); border: 1px solid var(--line-2); color: var(--rubric-2);
  font-family: var(--mono); font-size: 12px; transition: border-color .14s, background .14s;
}
.adm-del:hover { border-color: var(--rubric); background: rgba(138,58,48,0.18); }
`;

function AdminScreen({ characters, users, onOpen, onDelete }) {
  const [pendingDelete, setPendingDelete] = useState(null);
  const userById = useMemo(() => Object.fromEntries((users || []).map(u => [u.id, u])), [users]);

  // Group every character by owner; an owner without a fetched profile gets a stub.
  const groups = useMemo(() => {
    const by = {};
    for (const c of characters) (by[c.ownerId] ||= []).push(c);
    return Object.entries(by)
      .map(([ownerId, heroes]) => ({
        owner: userById[ownerId] || { id: ownerId, displayName: 'Unknown keeper' },
        heroes,
      }))
      .sort((a, b) => String(a.owner.displayName).localeCompare(String(b.owner.displayName)));
  }, [characters, userById]);

  return (
    <div className="adm-wrap">
      <style>{ADMIN_CSS}</style>
      <div className="adm-inner">
        <div className="adm-head">
          <GlyphRow>✠ · ❦ · ✦ · ❦ · ✠</GlyphRow>
          <H2>All Heroes</H2>
          <div style={{ marginTop: 8 }}>
            <Pill kind="muted">{characters.length} {characters.length === 1 ? 'HERO' : 'HEROES'} · {groups.length} {groups.length === 1 ? 'KEEPER' : 'KEEPERS'}</Pill>
          </div>
        </div>

        <OrnDivider glyph="❦  ✠  ❦" />

        {groups.length === 0 ? (
          <div style={{ textAlign: 'center', fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--ink-3)', marginTop: 30 }}>
            No heroes have been forged yet.
          </div>
        ) : groups.map(g => (
          <div key={g.owner.id} className="party-group">
            <div className="pg-head">
              <Avatar user={g.owner} size={22} />
              <span className="pg-name">{g.owner.displayName}</span>
              <Pill kind="muted">{g.heroes.length}</Pill>
              <span className="pg-line"></span>
            </div>
            <div className="party-grid">
              {g.heroes.map(c => (
                <div key={c.id} className="adm-card-wrap">
                  <button className="adm-del" title="Delete hero" onClick={(e) => { e.stopPropagation(); setPendingDelete(c); }}>✕</button>
                  <PartyHeroCard character={c} canEdit onOpen={() => onOpen(c.id)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={!!pendingDelete}
        title="Delete this hero?"
        onClose={() => setPendingDelete(null)}
        footer={<>
          <Button kind="ghost" onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button kind="danger" onClick={() => { onDelete(pendingDelete.id); setPendingDelete(null); }}>Delete forever</Button>
        </>}>
        Permanently delete <b style={{ color: 'var(--gold-2)' }}>{pendingDelete && heroName(pendingDelete)}</b>?
        This removes it for its owner too and cannot be undone.
      </Modal>
    </div>
  );
}

Object.assign(window, { AdminScreen });
export { AdminScreen };
