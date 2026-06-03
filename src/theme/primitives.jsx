// theme/primitives.jsx — shared UI primitives. Internal helpers (CREST_ICONS,
// renderGlyph, actionTagClass) and cross-refs (Modal→H2, AbilityCard→Tag/PowerRoll)
// are co-located so the set is self-contained.
import React from 'react';

function OrnDivider({ glyph = '❦  ✠  ❦', size = '' }) {
  return (
    <div className={`orn-divider ${size}`}>
      <span className="line"></span>
      <span className="glyph">{glyph}</span>
      <span className="line"></span>
    </div>);

}

function GlyphRow({ children = '✠ · ❦ · ✠ · ❦ · ✠ · ❦ · ✠' }) {
  return <div className="glyph-row">{children}</div>;
}

function Crest({ glyph = '✠', size = '', tone = '', portrait }) {
  if (portrait) {
    return (
      <div className={`crest portrait ${size} ${tone}`}>
        <img src={portrait} alt="" />
      </div>
    );
  }
  return <div className={`crest ${size} ${tone}`}>{renderGlyph(glyph)}</div>;
}

// Themed crest icons (monochrome, inherit gold via currentColor). Sized in em so they
// track each crest's font-size. Use a glyph value of "icon:<name>" to render one.
const CREST_ICONS = {
  shield: (
    <g fill="currentColor">
      <path d="M12 2.3 L19.4 5.1 V11 c0 4.8 -3.3 8.6 -7.4 10.7 C7.9 19.6 4.6 15.8 4.6 11 V5.1 Z" />
    </g>
  ),
  sun: (
    <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none">
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
      <line x1="12" y1="1.8" x2="12" y2="4.4" />
      <line x1="12" y1="19.6" x2="12" y2="22.2" />
      <line x1="1.8" y1="12" x2="4.4" y2="12" />
      <line x1="19.6" y1="12" x2="22.2" y2="12" />
      <line x1="4.8" y1="4.8" x2="6.6" y2="6.6" />
      <line x1="17.4" y1="17.4" x2="19.2" y2="19.2" />
      <line x1="4.8" y1="19.2" x2="6.6" y2="17.4" />
      <line x1="17.4" y1="6.6" x2="19.2" y2="4.8" />
    </g>
  ),
  drop: (
    <g fill="currentColor">
      <path d="M12 2.4 C12 2.4 5.4 10.6 5.4 15 a6.6 6.6 0 0 0 13.2 0 C18.6 10.6 12 2.4 12 2.4 Z" />
    </g>
  ),
  bolt: (
    <g fill="currentColor">
      <path d="M13.3 2 L4.6 13.6 H10.4 L8.7 22 L19.4 9.6 H13.2 L15.4 2 Z" />
    </g>
  ),
  fist: (
    <g fill="currentColor">
      <rect x="6" y="10" width="12" height="9.6" rx="2.6" />
      <rect x="6.5" y="7.7" width="2.5" height="3.6" rx="1.25" />
      <rect x="9.2" y="6.9" width="2.5" height="4.4" rx="1.25" />
      <rect x="11.9" y="6.9" width="2.5" height="4.4" rx="1.25" />
      <rect x="14.6" y="7.7" width="2.5" height="3.6" rx="1.25" />
      <rect x="4.3" y="11.4" width="3.2" height="3.6" rx="1.6" />
    </g>
  ),
};

function renderGlyph(glyph) {
  if (typeof glyph === 'string' && glyph.startsWith('icon:')) {
    const name = glyph.slice(5);
    const icon = CREST_ICONS[name];
    if (icon) {
      return (
        <svg viewBox="0 0 24 24" width="1em" height="1em" style={{ display: 'block', width: '1em', height: '1em' }} aria-hidden="true">
          {icon}
        </svg>
      );
    }
  }
  return glyph;
}

function Pill({ children, kind = '' }) {
  return <span className={`pill ${kind}`}>{children}</span>;
}

function Tag({ children, kind = '' }) {
  return <span className={`tag ${kind}`}>{children}</span>;
}

function Button({ children, onClick, kind = '', disabled, small, style }) {
  return (
    <button
      type="button"
      className={`btn ${kind} ${small ? 'small' : ''}`}
      onClick={onClick}
      disabled={disabled}
      style={style}>
      
      {children}
    </button>);

}

function IconButton({ children, onClick, title }) {
  return (
    <button type="button" className="icon-btn" onClick={onClick} title={title}>{children}</button>);

}

function H1({ children }) {return <h1 className="h1-display">{children}</h1>;}
function H2({ children }) {return <h2 className="h2-display">{children}</h2>;}
function H3({ children }) {return <h3 className="h3-display">{children}</h3>;}
function H4Meta({ children }) {return <h4 className="h4-meta">{children}</h4>;}
function Eyebrow({ children }) {return <div className="eyebrow">{children}</div>;}
function Deck({ children }) {return <div className="deck">{children}</div>;}

function DropCap({ letter, children }) {
  return (
    <>
      <span className="drop-cap">{letter}</span>
      {children}
    </>);

}

function StatTile({ label, value, sub, gold }) {
  return (
    <div className={`stat-tile ${gold ? 'gold' : ''}`}>
      <div className="lbl">{label}</div>
      <div className="val">{value}{sub && <span className="sub">{sub}</span>}</div>
    </div>);

}

// Selectable card (used in grids)
function SelCard({ selected, onClick, children, style, id }) {
  return (
    <div id={id} className={`card ${selected ? 'selected' : ''}`} onClick={onClick} style={style}>
      {children}
    </div>);

}

function Modal({ open, onClose, title, children, footer, width }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={(e) => {if (e.target === e.currentTarget) onClose && onClose();}}>
      <div className="modal" style={width ? { maxWidth: width } : {}}>
        {title &&
        <div className="modal-head">
            <div className="glyph-row" style={{ marginBottom: 8 }}>✠ · ❦ · ✠</div>
            <H2>{title}</H2>
          </div>
        }
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>);

}

// Power-roll table renderer for ability cards
function PowerRoll({ rows }) {
  return (
    <div className="ac-roll">
      {rows.map(([t, e], i) =>
      <React.Fragment key={i}>
          <span className={`t tier-${i + 1}`}>{t}</span>
          <span className={`e tier-${i + 1}`}>{e}</span>
        </React.Fragment>
      )}
    </div>);

}

// Map an ability's action type to a color-coded class for its header tag.
function actionTagClass(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('free')) return 'act-free';
  if (t.includes('triggered')) return 'act-triggered';
  if (t.includes('maneuver')) return 'act-maneuver';
  if (t.includes('main action')) return 'act-main';
  return 'act-other';
}

function AbilityCard({ ability, kind = '', onClick, selected, dimmed }) {
  const a = ability;
  const style = {};
  if (onClick) style.cursor = 'pointer';
  if (dimmed) style.opacity = 0.6;
  if (selected) {
    style.outline = `1px solid ${kind === 'heroic' ? 'var(--rubric)' : 'var(--gold)'}`;
    style.outlineOffset = '2px';
  }
  return (
    <div className={`ability-card ${kind}`} onClick={onClick} style={style}>
      <div className="ac-row">
        <span className="ac-name">{a.name}</span>
        <span className="ac-tags">
          {a.type && <span className={`ac-action ${actionTagClass(a.type)}`}>{a.type}</span>}
          {a.cost ? <span className="ac-cost">{a.cost} {a.resource || ''}</span>
            : a.badge ? <Tag kind="gold">{a.badge}</Tag>
            : a.noBadge ? null
            : <Tag kind="gold">SIG</Tag>}
        </span>
      </div>
      <div className="ac-keywords">{(a.keywords || []).join(' · ')}</div>
      {a.flavor && <div className="ac-flavor">"{a.flavor}"</div>}
      <div className="ac-meta">
        {a.trigger && <><b>Trigger</b><span>{a.trigger}</span></>}
        {a.distance && <><b>Distance</b><span>{a.distance}</span></>}
        {a.target && <><b>Target</b><span>{a.target}</span></>}
      </div>
      {(a.powerRoll || (a.tiers && a.tiers.length)) &&
      <>
          <div style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>{a.powerRoll ? `Power Roll + ${a.powerRoll}` : 'Power Roll'}</div>
          <PowerRoll rows={a.tiers} />
        </>
      }
      {a.effect && <div className="ac-effect"><b>Effect.</b> {a.effect}</div>}
      {a.spend && <div className="ac-effect"><b>Spend {a.spendCost || 1} {a.resource || ''}.</b> {a.spend}</div>}
      {a.orderBenefit && <div className="ac-effect"><b>Order Benefit.</b> {a.orderBenefit}</div>}
    </div>);

}

// Expose to window so other files can use these in shared scope

export { OrnDivider, GlyphRow, Crest, renderGlyph, Pill, Tag, Button, IconButton, H1, H2, H3, H4Meta, Eyebrow, Deck, DropCap, StatTile, SelCard, Modal, PowerRoll, AbilityCard };
