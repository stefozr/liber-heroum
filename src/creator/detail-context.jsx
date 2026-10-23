// creator/detail-context.jsx — what the right-hand detail panel shows.
//
//   current = hover ?? focus ?? pinned ?? fallback ?? intro
//
// Hovering (mouse only) or keyboard-focusing an option previews it; clicking one
// pins it. `fallback` is the step's headline pick (the chosen class on the class
// step) and `intro` its rules text, so the panel is never empty. Hover is
// debounced — 60ms in, 120ms out — so sweeping across a grid doesn't flash.
// Below 1024px the panel is a drawer: opening it remembers the element to return
// focus to when it closes.
import React from 'react';

const { useState, useRef, useCallback, useMemo, useEffect } = React;

const DetailContext = React.createContext(null);
const useDetail = () => React.useContext(DetailContext);

const IN_MS = 60, OUT_MS = 120;

function DetailProvider({ stepId, fallback, intro, children }) {
  const [hover, setHover] = useState(null);
  const [focus, setFocus] = useState(null);
  const [pinned, setPinned] = useState(null);
  const [drawer, setDrawer] = useState(null); // { returnTo } while the drawer is open
  const inTimer = useRef(null);
  const outTimer = useRef(null);

  const clear = (t) => { if (t.current) { clearTimeout(t.current); t.current = null; } };
  useEffect(() => () => { clear(inTimer); clear(outTimer); }, []);

  // A new step starts from its own headline pick.
  useEffect(() => { setPinned(null); setHover(null); setFocus(null); }, [stepId]);

  const preview = useCallback((d) => {
    clear(outTimer);
    clear(inTimer);
    inTimer.current = setTimeout(() => { inTimer.current = null; setHover(d); }, IN_MS);
  }, []);
  const previewEnd = useCallback(() => {
    clear(inTimer);
    clear(outTimer);
    outTimer.current = setTimeout(() => { outTimer.current = null; setHover(null); }, OUT_MS);
  }, []);
  const focusPreview = useCallback((d) => setFocus(d), []);
  const focusEnd = useCallback(() => setFocus(null), []);
  const pin = useCallback((d) => { setPinned(d); clear(inTimer); setHover(null); }, []);
  const openDrawer = useCallback((d) => {
    if (d) { setPinned(d); setHover(null); setFocus(null); }
    setDrawer({ returnTo: typeof document !== 'undefined' ? document.activeElement : null });
  }, []);
  const closeDrawer = useCallback(() => {
    setDrawer(prev => {
      const el = prev?.returnTo;
      if (el && typeof el.focus === 'function') setTimeout(() => el.focus(), 0);
      return null;
    });
  }, []);

  const current = hover || focus || pinned || fallback || intro;
  const value = useMemo(() => ({
    current, pinned, preview, previewEnd, focusPreview, focusEnd, pin,
    drawerOpen: !!drawer, openDrawer, closeDrawer,
  }), [current, pinned, drawer, preview, previewEnd, focusPreview, focusEnd, pin, openDrawer, closeDrawer]);
  return <DetailContext.Provider value={value}>{children}</DetailContext.Provider>;
}

const isTouch = (e) => e.pointerType === 'touch' || e.pointerType === 'pen';

function focusVisible(el) {
  try { return !!el.matches(':focus-visible'); } catch { return true; }
}

// Handlers that make an element preview `detail` on mouse hover and keyboard focus.
// Touch pointers are ignored: a tap selects (and pins) instead of previewing.
function usePreviewHandlers(detail) {
  const ctx = useDetail();
  if (!ctx || !detail) return {};
  return {
    onPointerEnter: (e) => { if (!isTouch(e)) ctx.preview(detail); },
    onPointerLeave: (e) => { if (!isTouch(e)) ctx.previewEnd(); },
    // Keyboard focus only: a mouse click also focuses the button, but it pins.
    onFocus: (e) => { if (focusVisible(e.target)) ctx.focusPreview(detail); },
    onBlur: () => ctx.focusEnd(),
  };
}

export { DetailProvider, useDetail, usePreviewHandlers, IN_MS, OUT_MS };
