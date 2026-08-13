import React from 'react';
import { OrnDivider, GlyphRow, Pill, Button, H2, Modal } from './theme.jsx';
import { heroName } from './campaigns.jsx';
import { RulesGlossary, RulesButton } from './rules.jsx';
import { classDef, ancestryDef } from './app.jsx';
import { wizardProgress } from './wizard.jsx';
// roster.jsx — Character roster (multi-character) screen.

function RosterScreen({ characters, campaigns = [], userCampaigns = [], onOpen, onCreate, onDelete, onAssign, onSetVisibility }) {
  const completed = characters.filter(c => c.status === 'complete');
  const inProgress = characters.filter(c => c.status !== 'complete');
  const campById = React.useMemo(
    () => Object.fromEntries((campaigns || []).map(c => [c.id, c.name])),
    [campaigns]
  );
  const [rulesOpen, setRulesOpen] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState(null);
  const [assignFor, setAssignFor] = React.useState(null);
  const pendingName = pendingDelete && (pendingDelete.identity?.name || pendingDelete.name || 'Unnamed Hero');

  return (
    <div className="roster">
      <div className="roster-inner">
        <div className="roster-hero">
          <div className="glyphs-top"><GlyphRow>✠ · ❦ · ✦ · ❦ · ✠</GlyphRow></div>
          <h1>LIBER HEROUM</h1>
          <div className="sub">A Chronicle of Heroes, Drawn from Steel</div>
          <div className="meta">A Draw Steel Character Manager · v 1.6</div>
          <div style={{marginTop: 22, display:'flex', justifyContent:'center'}}>
            <RulesButton onClick={() => setRulesOpen(true)}>Rules Glossary</RulesButton>
          </div>
        </div>

        <OrnDivider glyph="❦  ✠  ❦" />

        <div className="roster-section-title">
          <H2>Your Heroes</H2>
          <Pill kind="muted">{characters.length} TOTAL</Pill>
        </div>

        <div className="roster-grid">
          <button type="button" className="card-btn hero-card hc-new" onClick={onCreate}>
            <div className="cross">✠</div>
            <div className="nm">Forge a New Hero</div>
            <div className="sub">Begin the seven rites of creation</div>
          </button>

          {characters.length === 0 && (
            <div className="roster-empty">
              <div>
                <div style={{fontFamily:'var(--display)', fontSize: '1.125rem', letterSpacing:'0.16em', color:'var(--gold-2)', marginBottom: 10}}>
                  The book is empty.
                </div>
                <div style={{fontFamily:'var(--hand)', fontStyle:'italic', color:'var(--ink-2)', fontSize: '1rem'}}>
                  Your first hero awaits a name.
                </div>
              </div>
            </div>
          )}

          {inProgress.map(c => (
            <HeroCard key={c.id} character={c} campaignName={c.campaignId ? campById[c.campaignId] : null} onOpen={() => onOpen(c.id)} onAssign={() => setAssignFor(c)} onDelete={() => setPendingDelete(c)} onSetVisibility={onSetVisibility && ((v) => onSetVisibility(c.id, v))} />
          ))}
          {completed.map(c => (
            <HeroCard key={c.id} character={c} campaignName={c.campaignId ? campById[c.campaignId] : null} onOpen={() => onOpen(c.id)} onAssign={() => setAssignFor(c)} onDelete={() => setPendingDelete(c)} onSetVisibility={onSetVisibility && ((v) => onSetVisibility(c.id, v))} />
          ))}
        </div>

        <div style={{marginTop: 50, textAlign: 'center'}}>
          <GlyphRow>✠ · ❦ · ✠ · ❦ · ✠</GlyphRow>
          <div style={{
            fontFamily:'var(--hand)', fontStyle:'italic',
            color:'var(--ink-3)', fontSize: '0.8125rem', marginTop: 14, letterSpacing: '0.04em',
          }}>
            "Tell me, who would you save? Knowing the cost?"
          </div>
        </div>
      </div>

      <RulesGlossary open={rulesOpen} onClose={() => setRulesOpen(false)} />

      <AssignToCampaignModal
        // Look the hero up fresh so the visibility chips reflect a flip immediately
        // (assignFor is the object captured when the modal opened).
        character={assignFor ? characters.find(c => c.id === assignFor.id) || assignFor : null}
        campaigns={userCampaigns}
        onClose={() => setAssignFor(null)}
        onAssign={(charId, campId) => { onAssign(charId, campId); setAssignFor(null); }}
        onSetVisibility={onSetVisibility}
      />

      <Modal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Erase from the Chronicle?"
        width={460}
        footer={(
          <>
            <Button kind="ghost" onClick={() => setPendingDelete(null)}>◂ KEEP</Button>
            <div style={{flex:1}}></div>
            <Button kind="danger" onClick={() => { const id = pendingDelete.id; setPendingDelete(null); onDelete(id); }}>ERASE FOREVER ✕</Button>
          </>
        )}
      >
        <div style={{textAlign:'center'}}>
          <div style={{fontFamily:'var(--display)', fontSize: '1.5rem', color:'var(--gold-2)', letterSpacing:'0.08em', marginBottom:14}}>{pendingName}</div>
          <div style={{fontFamily:'var(--serif)', fontSize: '0.9375rem', color:'var(--ink-2)', lineHeight:1.6, maxWidth:340, margin:'0 auto'}}>
            This hero and all their deeds will be struck from the Liber Heroum. This cannot be undone.
          </div>
        </div>
      </Modal>
    </div>
  );
}

function HeroCard({ character, campaignName, onOpen, onAssign, onDelete, onSetVisibility }) {
  const c = character;
  const cls = classDef(c);
  const anc = ancestryDef(c);
  const heroName = c.identity.name || c.name || 'Unnamed Hero';
  // Portrait, else class art, else ancestry art — a hero with only chapter one
  // done still gets a face on the shelf.
  const bg = c.portrait || (cls && cls.img) || (anc && anc.img) || null;
  const meta = [
    anc && anc.name,
    cls && cls.name,
    c.cclass.subclass && cls && cls.subclasses && cls.subclasses.find(s => s.id === c.cclass.subclass || s.name === c.cclass.subclass)?.name,
  ].filter(Boolean).join(' · ') || 'Begin the rites';
  const status = c.status === 'complete' ? 'CHRONICLED' : 'IN PROGRESS';
  const progress = wizardProgress(c);
  const stepPct = Math.round(progress.done / progress.total * 100);

  return (
    <div className="hero-card">
      {/* Stretched overlay: the card's "open" action as a real, focusable button.
          A <button> card proper would be invalid HTML — the footer holds two
          nested buttons — so those sit above this overlay at a higher z-index. */}
      <button type="button" className="card-btn hc-open" onClick={onOpen} aria-label={`Open ${heroName}`} />
      <div className="hc-img" style={bg ? {backgroundImage: `url(${bg})`} : {background: 'linear-gradient(135deg, var(--bg-2), var(--bg-3))'}}>
        {/* zIndex lifts the crest above the bottom scrim; the padding keeps it in
            the scrim-free upper half so it reads instead of drowning. */}
        {!bg && <div style={{
          position:'absolute', inset:0, display:'grid', placeItems:'center', zIndex:1,
          paddingBottom:30, fontFamily:'var(--display)', fontSize: '3.75rem', color:'var(--gold)', opacity:0.4,
        }}>✠</div>}
      </div>
      <div className="hc-lvl">LV {String(c.level).padStart(2,'0')}</div>
      {campaignName && (
        <div style={{
          position:'absolute', top:10, left:12, zIndex:2,
          fontFamily:'var(--mono)', fontSize: '0.5625rem', letterSpacing:'0.16em', textTransform:'uppercase',
          color:'var(--gold-2)', background:'rgba(8,8,10,0.82)', border:'1px solid var(--gold-deep)',
          padding:'4px 9px', maxWidth:'70%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
        }} title={campaignName}>✦ {campaignName}</div>
      )}
      {campaignName && c.visibility === 'public' && (
        <div style={{
          position:'absolute', top:38, left:12, zIndex:2,
          fontFamily:'var(--mono)', fontSize: '0.5625rem', letterSpacing:'0.16em', textTransform:'uppercase',
          color:'var(--gold-2)', background:'rgba(8,8,10,0.82)', border:'1px solid var(--gold-deep)',
          padding:'4px 9px',
        }} title="Every member of this campaign may edit this hero">⚭ PUBLIC</div>
      )}
      <div className="hc-body">
        <div className="hc-name">{heroName}</div>
        <div className="hc-meta">{meta}</div>
      </div>
      <div className="hc-bottom">
        <span title={c.status === 'complete' ? 'This hero is complete and ready for play' : 'Chapters of the creation wizard finished'}>{status}{c.status !== 'complete' ? ` · ${stepPct}%` : ''}</span>
        <div className="hc-actions">
          <button
            className="hc-camp"
            onClick={(e) => { e.stopPropagation(); onAssign && onAssign(); }}
            title={campaignName ? 'Move to another campaign' : 'Add to a campaign'}>
            {campaignName ? '⚚ move' : '✦ campaign'}
          </button>
          {/* Visibility only matters once the hero sits at a table. */}
          {c.campaignId && onSetVisibility && (
            <button
              className="hc-camp"
              onClick={(e) => { e.stopPropagation(); onSetVisibility(c.visibility === 'public' ? 'private' : 'public'); }}
              title={c.visibility === 'public'
                ? 'The whole party may edit this hero — make it private'
                : 'Only you and the Director may edit this hero — make it public'}>
              {c.visibility === 'public' ? '⚭ public' : '🗝 private'}
            </button>
          )}
          <button className="hc-del" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            ✦ remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────── Add / move a hero to one of your campaigns ─────────
// Lists the campaigns you belong to; the one the hero already sits in is shown
// as "Already here" and cannot be re-picked.
function AssignToCampaignModal({ character, campaigns = [], onClose, onAssign, onSetVisibility }) {
  if (!character) return null;
  const name = character.identity?.name || character.name || 'this hero';
  const current = character.campaignId || null;
  const visibility = character.visibility || 'private';
  const visChip = (value, label) => {
    const on = visibility === value;
    return (
      <button
        type="button"
        onClick={() => { if (!on) onSetVisibility(character.id, value); }}
        style={{
          fontFamily: 'var(--mono)', fontSize: '0.625rem', letterSpacing: '0.14em', textTransform: 'uppercase',
          padding: '7px 12px', cursor: on ? 'default' : 'pointer',
          color: on ? 'var(--gold-2)' : 'var(--ink-2)',
          background: on ? 'rgba(8,8,10,0.82)' : 'transparent',
          border: `1px solid ${on ? 'var(--gold-deep)' : 'var(--line-2)'}`,
        }}>
        {label}
      </button>
    );
  };

  return (
    <Modal
      open={!!character}
      onClose={onClose}
      title={current ? 'Move to a Campaign' : 'Add to a Campaign'}
      width={520}
      footer={(
        <>
          <Button kind="ghost" onClick={onClose}>◂ CLOSE</Button>
          <div style={{ flex: 1 }}></div>
          {current && (
            <Button kind="danger" small onClick={() => onAssign(character.id, null)}>Unbind from campaign</Button>
          )}
        </>
      )}
    >
      <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--ink-2)', fontSize: '0.875rem', marginBottom: 16, lineHeight: 1.55 }}>
        Choose a table to bring <b style={{ color: 'var(--gold-2)', fontStyle: 'normal' }}>{name}</b> to.
        A hero sits at one table at a time.
      </div>

      {onSetVisibility && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.5625rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
            Who may edit this sheet
          </span>
          {visChip('private', '🗝 Just me & the Director')}
          {visChip('public', '⚭ The whole party')}
        </div>
      )}

      {campaigns.length === 0 ? (
        <div style={{ border: '1px dashed var(--line-2)', padding: '28px 20px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: '1rem', letterSpacing: '0.1em', color: 'var(--gold-2)' }}>NO CAMPAIGNS YET</div>
          <div style={{ fontFamily: 'var(--hand)', fontStyle: 'italic', color: 'var(--ink-2)', fontSize: '0.9375rem', marginTop: 8 }}>
            Start or join a campaign from the Campaigns tab, then return here.
          </div>
        </div>
      ) : (
        <div className="stack-8">
          {campaigns.map(camp => {
            const here = current === camp.id;
            return (
              <button
                type="button"
                key={camp.id}
                disabled={here || undefined}
                className="card-btn assign-row"
                style={here ? { opacity: 0.5, cursor: 'default', borderStyle: 'dashed' } : {}}
                onClick={() => { if (!here) onAssign(character.id, camp.id); }}>
                <div className="crest small">✠</div>
                <div style={{ minWidth: 0 }}>
                  <div className="ar-name">{camp.name}</div>
                  <div className="ar-meta">{camp.memberIds.length} at the table</div>
                </div>
                <span className="ar-where" style={here ? { color: 'var(--ink-3)' } : {}}>
                  {here ? 'Already here' : 'Add →'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

Object.assign(window, { RosterScreen });
export { RosterScreen };
