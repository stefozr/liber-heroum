// creator/DetailPanel.jsx — the right-hand column: the current detail target, as
// text (the art lives on the poster cards and the hero summary, not here).
// From 1024px down the same element is a slide-over drawer (a bottom sheet on a
// phone), opened from a section's "details ▸", an option's ⓘ or the header button.
import React from 'react';
import { useDetail } from './detail-context.jsx';
import { useCreator } from './context.js';
import { DETAIL_RENDERERS } from './detail/renderers.jsx';

const { useEffect, useRef } = React;

function DetailPanel() {
  const { character } = useCreator();
  const { current, drawerOpen, closeDrawer } = useDetail();
  const closeRef = useRef(null);
  const asideRef = useRef(null);

  // Drawer: focus the close button on open, Escape closes, the rest of the page
  // is inert while it is open, and focus returns to the opener on close.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeDrawer(); } };
    document.addEventListener('keydown', onKey);
    const siblings = Array.from(asideRef.current?.parentElement?.children || []).filter(el => el !== asideRef.current && !el.classList.contains('cr-backdrop'));
    siblings.forEach(el => el.setAttribute('inert', ''));
    return () => {
      document.removeEventListener('keydown', onKey);
      siblings.forEach(el => el.removeAttribute('inert'));
    };
  }, [drawerOpen, closeDrawer]);

  const Renderer = DETAIL_RENDERERS[current?.kind] || null;
  return (
    <>
      <div className={`cr-backdrop${drawerOpen ? ' open' : ''}`} onClick={closeDrawer} aria-hidden="true" />
      <aside
        ref={asideRef}
        className={`cr-right${drawerOpen ? ' open' : ''}`}
        aria-label="Details"
        {...(drawerOpen ? { role: 'dialog', 'aria-modal': 'true' } : { role: 'complementary' })}
      >
        <div className="dp-head">
          <span>Details</span>
          <button ref={closeRef} type="button" className="icon-btn" aria-label="Close details" onClick={closeDrawer}>✕</button>
        </div>
        <div className="dp-body">
          {Renderer ? <Renderer target={current} character={character} /> : null}
        </div>
      </aside>
    </>
  );
}

export { DetailPanel };
