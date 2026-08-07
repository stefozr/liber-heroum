// theme/tabs.jsx — accessible tab strip + panel pair. Panels stay mounted and
// hide with the `hidden` attribute so their internal state (panel collapse,
// scroll position) survives tab switches. CSS lives here (TABS_CSS) so any
// screen can use the primitive without depending on another view's stylesheet.
import React, { useRef, useState, useEffect } from 'react';
import { MQ } from './breakpoints.js';

const TABS_CSS = `
/* Full-width segmented control — the sheet's primary navigation, so the active
   segment borrows the .btn.primary gold fill (the app's loudest control) and
   the whole bar reads as a row of buttons rather than labels. */
.lh-tabs {
  display: flex; width: 100%; min-width: 0;
  /* Fallback for very narrow viewports: segments floor at max-content, so the
     bar scrolls rather than crushing the labels. */
  overflow-x: auto; scrollbar-width: none;
}
.lh-tabs::-webkit-scrollbar { display: none; }
/* Right-edge fade only while the bar actually overflows (class set from a
   ResizeObserver) — a static mask would permanently dim the last segment,
   since the segments stretch to fill the full bar width. */
.lh-tabs.scrollable {
  -webkit-mask-image: linear-gradient(90deg, #000 0, #000 calc(100% - 28px), transparent);
  mask-image: linear-gradient(90deg, #000 0, #000 calc(100% - 28px), transparent);
}
.lh-tab {
  flex: 1 1 auto; min-width: max-content;
  display: inline-flex; align-items: center; justify-content: center; gap: 9px;
  font-family: var(--display-2); font-size: var(--fs-6); font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--ink-2); background: var(--bg-2); border: 1px solid var(--line-2);
  padding: 13px 18px; cursor: pointer;
  transition: color .14s, border-color .14s, box-shadow .14s;
}
/* Join the segments: collapse shared borders; the active segment sits on top so
   its gold border wins over its neighbours'. */
.lh-tab + .lh-tab { margin-left: -1px; }
.lh-tab:hover { color: var(--ink); border-color: var(--gold-deep); position: relative; z-index: 1; }
.lh-tab.on {
  position: relative; z-index: 2;
  background: linear-gradient(180deg, var(--gold-2), var(--gold-deep));
  border-color: var(--gold-2);
  color: var(--btn-primary-ink);
  box-shadow: 0 0 22px var(--gold-glow), inset 0 1px 0 rgba(255,255,255,0.25);
}
.lh-tab:focus-visible { outline: 2px solid var(--gold); outline-offset: -3px; position: relative; z-index: 3; }
.lh-tab-glyph { font-size: 1.1em; letter-spacing: 0; line-height: 1; }

${MQ.phone} {
  .lh-tab { min-height: 44px; padding: 10px 8px; letter-spacing: 0.08em; gap: 6px; }
}
`;

function TabsStyles() {
  return <style>{TABS_CSS}</style>;
}

// Tab strip. tabs: [{ id, label }]. Selection follows focus (automatic
// activation): ArrowLeft/ArrowRight wrap, Home/End jump. Roving tabindex keeps
// the strip a single tab stop.
function Tabs({ tabs, value, onChange, idBase }) {
  const btnRefs = useRef({});
  const listRef = useRef(null);
  const [scrollable, setScrollable] = useState(false);
  useEffect(() => {
    const el = listRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const check = () => setScrollable(el.scrollWidth > el.clientWidth + 1);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    check();
    return () => ro.disconnect();
  }, []);
  const move = (nextIdx) => {
    const t = tabs[nextIdx];
    onChange(t.id);
    btnRefs.current[t.id]?.focus();
  };
  const onKeyDown = (e) => {
    const idx = tabs.findIndex(t => t.id === value);
    if (idx < 0) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); move((idx + 1) % tabs.length); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); move((idx - 1 + tabs.length) % tabs.length); }
    else if (e.key === 'Home') { e.preventDefault(); move(0); }
    else if (e.key === 'End') { e.preventDefault(); move(tabs.length - 1); }
  };
  return (
    <div role="tablist" ref={listRef} className={`lh-tabs ${scrollable ? 'scrollable' : ''}`} onKeyDown={onKeyDown}>
      {tabs.map(t => {
        const on = t.id === value;
        return (
          <button
            type="button"
            key={t.id}
            ref={(el) => { btnRefs.current[t.id] = el; }}
            role="tab"
            id={`${idBase}-tab-${t.id}`}
            aria-selected={on}
            aria-controls={`${idBase}-panel-${t.id}`}
            tabIndex={on ? 0 : -1}
            className={`lh-tab ${on ? 'on' : ''}`}
            onClick={() => onChange(t.id)}
          >
            {t.glyph && <span className="lh-tab-glyph" aria-hidden="true">{t.glyph}</span>}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// Always rendered; hidden (not unmounted) when inactive.
function TabPanel({ id, idBase, active, className, children }) {
  return (
    <div
      role="tabpanel"
      id={`${idBase}-panel-${id}`}
      aria-labelledby={`${idBase}-tab-${id}`}
      hidden={!active}
      className={className}
    >
      {children}
    </div>
  );
}

export { TABS_CSS, TabsStyles, Tabs, TabPanel };
