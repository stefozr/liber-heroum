// creator/OptionGrid.jsx — name-only choice buttons. The prose a classic card would
// print lives in the detail panel instead: hovering or focusing an option previews
// it there, clicking selects it and pins it. Below 1024px the selected option grows
// an ⓘ that opens the detail drawer (buttons can't nest, hence the .opt-cell wrapper).
import React from 'react';
import { SelCard, renderGlyph } from '../theme.jsx';
import { useDetail, usePreviewHandlers } from './detail-context.jsx';

function OptionButton({ id, label, sub, cost, badge, selected, dimmed, blocked, granted, warn, reason, detail, onSelect, info = true }) {
  const ctx = useDetail();
  const handlers = usePreviewHandlers(detail);
  const disabled = !!(blocked || granted);
  const cls = ['card-btn', 'opt-btn'];
  if (selected) cls.push('selected');
  if (dimmed && !selected) cls.push('dimmed');
  if (blocked) cls.push('blocked');
  if (granted) cls.push('granted');
  if (warn) cls.push('warn');
  const showInfo = info && detail && (selected || granted);
  return (
    <div id={id} className={`opt-cell${showInfo ? ' has-info' : ''}`}>
      <button
        type="button"
        className={cls.join(' ')}
        aria-pressed={!!(selected || granted)}
        disabled={disabled}
        title={reason || undefined}
        onClick={() => {
          if (disabled) return;
          onSelect && onSelect();
          if (detail && ctx) ctx.pin(detail);
        }}
        {...handlers}
      >
        <span className="opt-name">{label}{granted ? ' ✓' : ''}{cost != null && <span className="opt-cost">({cost})</span>}</span>
        {sub && <span className="opt-sub">{sub}</span>}
        {badge && <span className="tag gold opt-badge">{badge}</span>}
      </button>
      {showInfo && ctx && (
        <button type="button" className="opt-info" aria-label={`Details: ${typeof label === 'string' ? label : 'option'}`}
          onClick={() => ctx.openDrawer(detail)}>i</button>
      )}
    </div>
  );
}

function OptionGrid({ children, className = '', cols }) {
  return <div className={`opt-grid${cols ? ` cols-${cols}` : ''}${className ? ' ' + className : ''}`}>{children}</div>;
}

// The classic wizard's art poster (ancestries and classes), wired to the detail
// panel like an option button: hover/focus previews, a click selects and pins.
function PosterCard({ art, name, glyph, meta, resource, desc, wip, selected, dimmed, detail, onSelect }) {
  const ctx = useDetail();
  const handlers = usePreviewHandlers(detail);
  return (
    <SelCard className={`poster-card${dimmed && !selected ? ' dim' : ''}`} selected={selected}
      onClick={() => { onSelect(); if (detail && ctx) ctx.pin(detail); }} {...handlers}>
      <div className="pc-art" style={{ backgroundImage: `url(${art})` }} />
      {wip && <span className="pc-wip">WIP</span>}
      <div className="pc-scrim">
        <div className="pc-name-row">
          <div className="pc-name">{name}</div>
          <span className="c-stamp">{renderGlyph(glyph)}</span>
        </div>
        {meta && (
          <div className="pc-meta">
            {meta}
            {resource && <span className="pc-resource">{resource.toUpperCase()}</span>}
          </div>
        )}
        <div className="pc-desc-reveal"><div className="pc-desc">{desc}</div></div>
      </div>
    </SelCard>
  );
}

export { OptionButton, OptionGrid, PosterCard };
