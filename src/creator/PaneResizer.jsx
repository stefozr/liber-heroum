// creator/PaneResizer.jsx — the drag handle on a sidebar's inner edge. Dragging
// writes the width straight onto the shell's --cr-left / --cr-right (no re-render
// per frame) and commits it on release; ←/→ nudge it 16px; Enter or a double-click
// returns the sidebar to its default width. The main column keeps at least 420px.
import React from 'react';
import { PANE_LIMITS } from './preference.js';

const MAIN_MIN = 420;
const STEP = 16;

function PaneResizer({ side, shellRef, width, onCommit }) {
  const lim = PANE_LIMITS[side];
  const prop = side === 'left' ? '--cr-left' : '--cr-right';
  const drag = React.useRef(null);

  const paneEl = (s) => shellRef.current?.querySelector(s === 'left' ? '.cr-left' : '.cr-right');
  const measured = () => Math.round(paneEl(side)?.getBoundingClientRect().width || 0) || width || lim.def;
  // Keep the main column usable: the widest this side may be next to the other one.
  const clamp = (w) => {
    // Matches the stylesheet's min(var(--cr-*), NNvw) caps, so what is stored is what shows.
    let max = Math.min(lim.max, Math.floor(window.innerWidth * (side === 'left' ? 0.28 : 0.4)) || lim.max);
    const shell = shellRef.current?.getBoundingClientRect();
    const other = paneEl(side === 'left' ? 'right' : 'left')?.getBoundingClientRect();
    if (shell?.width && other) max = Math.min(max, shell.width - other.width - MAIN_MIN);
    return Math.round(Math.max(lim.min, Math.min(Math.max(lim.min, max), w)));
  };

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { last: measured() };
  };
  const onPointerMove = (e) => {
    if (!drag.current || !shellRef.current) return;
    const rect = shellRef.current.getBoundingClientRect();
    const w = clamp(side === 'left' ? e.clientX - rect.left : rect.right - e.clientX);
    drag.current.last = w;
    shellRef.current.style.setProperty(prop, `${w}px`);
  };
  const onPointerUp = (e) => {
    if (!drag.current) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    const w = drag.current.last;
    drag.current = null;
    onCommit(side, w);
  };
  const onKeyDown = (e) => {
    // The handle sits on the sidebar's inner edge: → widens the left one, ← the right.
    const grow = side === 'left' ? 'ArrowRight' : 'ArrowLeft';
    const shrink = side === 'left' ? 'ArrowLeft' : 'ArrowRight';
    if (e.key === grow || e.key === shrink) {
      e.preventDefault();
      onCommit(side, clamp(measured() + (e.key === grow ? STEP : -STEP)));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onCommit(side, null);
    }
  };

  return (
    <div
      className={`cr-resize cr-resize-${side}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={side === 'left' ? 'Resize hero summary' : 'Resize details'}
      aria-valuemin={lim.min}
      aria-valuemax={lim.max}
      aria-valuenow={width || lim.def}
      title="Drag to resize · double-click to reset"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={() => onCommit(side, null)}
      onKeyDown={onKeyDown}
    />
  );
}

export { PaneResizer };
