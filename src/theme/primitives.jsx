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

// Autosave status pill (wizard + play top bars). Renders nothing without a state,
// so screens that don't receive one (read-only sheets, tests) are unaffected.
function SavePill({ saveState }) {
  if (!saveState) return null;
  if (saveState.status === 'error') return <Pill kind="rubric">SAVE FAILED</Pill>;
  if (saveState.status === 'pending') return <Pill kind="muted">SAVING…</Pill>;
  const at = saveState.at
    ? ` · ${new Date(saveState.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
    : '';
  return <Pill kind="live">SAVED{at}</Pill>;
}

function Tag({ children, kind = '', title }) {
  return <span className={`tag ${kind}`} title={title}>{children}</span>;
}

function Button({ children, onClick, kind = '', disabled, small, style, className, title }) {
  return (
    <button
      type="button"
      className={`btn ${kind} ${small ? 'small' : ''}${className ? ' ' + className : ''}`}
      onClick={onClick}
      disabled={disabled}
      style={style}
      title={title}>

      {children}
    </button>);

}

function IconButton({ children, onClick, title }) {
  return (
    <button type="button" className="icon-btn" onClick={onClick} title={title}>{children}</button>);

}

// Shared chrome bar (roster/campaign appbar, wizard, play sheet). Pure layout
// shell: `mark` is a free node (✠ box, Crest, svg …) — wrap plain glyphs in
// .tb-mark-box for the standard bordered square. Screen-specific rules hang off
// the passthrough className (.ds-appbar / .wiz-topbar / .play-top).
function TopBar({ mark, brand, sub, center, right, className = '' }) {
  return (
    <div className={`topbar${className ? ' ' + className : ''}`}>
      <div className="tb-left">
        {mark && <div className="tb-mark">{mark}</div>}
        <div className="tb-text">
          <div className="tb-brand">{brand}</div>
          {sub && <div className="tb-sub">{sub}</div>}
        </div>
      </div>
      <div className="tb-center">{center}</div>
      <div className="tb-right">{right}</div>
    </div>
  );
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

// `rubric` marks a value under a negative live effect (e.g. Speed while Slowed).
function StatTile({ label, value, sub, gold, rubric, title }) {
  return (
    <div className={`stat-tile ${gold ? 'gold' : ''}${rubric ? ' rubric' : ''}`} title={title}>
      <div className="lbl">{label}</div>
      <div className="val">{value}{sub && <span className="sub">{sub}</span>}</div>
    </div>);

}

// Selectable card (used in grids). A real <button> so every choice in the app
// is keyboard-operable; .card-btn resets the UA button chrome and the .card
// classes paint over it.
// `dimmed` is visual-only (no disabled): the group's pick is made, but clicking
// still switches to this card in one step. `blocked` means the pick is invalid.
function SelCard({ selected, onClick, children, style, id, className, blocked, dimmed, title }) {
  return (
    <button
      type="button"
      id={id}
      title={title}
      disabled={blocked || undefined}
      aria-pressed={!!selected}
      className={`card-btn card ${selected ? 'selected' : ''}${blocked ? ' blocked' : ''}${dimmed ? ' dimmed' : ''}${className ? ' ' + className : ''}`}
      onClick={onClick}
      style={style}>

      {children}
    </button>);

}

function Modal({ open, onClose, title, children, footer, width }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={(e) => {if (e.target === e.currentTarget) onClose && onClose();}}>
      {/* width feeds a custom property rather than an inline max-width, so the
          phone breakpoint can override it with a plain rule. An inline style
          would need !important to beat. */}
      <div className="modal" style={width ? { '--modal-w': typeof width === 'number' ? `${width}px` : width } : undefined}>
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

// Official rules text carries **bold** spans (e.g. "**Strained:**", "**Persistent 1:**").
// Render them as real <b> runs instead of leaking the asterisks; everything else
// passes through as plain text (no other markup is ever interpreted).
function renderRich(text) {
  if (typeof text !== 'string' || !text.includes('**')) return text;
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) => (i % 2 === 1 ? <b key={i}>{part}</b> : part));
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
  // Clickable ability cards (class-step ability pickers) become real buttons;
  // display-only ones (play sheet, inside level-up's own .lvl-opt button) stay divs.
  const Root = onClick ? 'button' : 'div';
  return (
    <Root {...(onClick ? { type: 'button', 'aria-pressed': !!selected } : {})}
      className={`${onClick ? 'card-btn ' : ''}ability-card ${kind}`} onClick={onClick} style={style}>
      <div className="ac-row">
        <span className="ac-name">{a.name}</span>
        <span className="ac-tags">
          {a.type && <span className={`ac-action ${actionTagClass(a.type)}`}>{a.type}</span>}
          {a.cost ? <span className="ac-cost">{a.cost} {a.resource || ''}</span>
            : a.badge ? <Tag kind="gold">{a.badge}</Tag>
            : a.noBadge ? null
            : <Tag kind="gold" title="Signature ability — usable at will, no cost">SIG</Tag>}
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
          <div style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: '0.625rem', color: 'var(--ink-3)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>{a.powerRoll ? `Power Roll + ${a.powerRoll}` : 'Power Roll'}</div>
          <PowerRoll rows={a.tiers} />
        </>
      }
      {a.effect && <div className="ac-effect"><b>Effect.</b> {renderRich(a.effect)}</div>}
      {a.spend && <div className="ac-effect"><b>Spend {a.spendCost || 1} {a.resource || ''}.</b> {renderRich(a.spend)}</div>}
      {a.orderBenefit && <div className="ac-effect"><b>Order Benefit.</b> {renderRich(a.orderBenefit)}</div>}
    </Root>);

}

// Expose to window so other files can use these in shared scope

export { OrnDivider, GlyphRow, Crest, renderGlyph, renderRich, Pill, SavePill, Tag, Button, IconButton, TopBar, H1, H2, H3, H4Meta, Eyebrow, Deck, DropCap, StatTile, SelCard, Modal, PowerRoll, AbilityCard };
