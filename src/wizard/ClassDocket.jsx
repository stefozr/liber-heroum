// wizard/ClassDocket.jsx — the class step's decision docket: what this class asks
// of you, in the order it asks, and what is still outstanding.
//
// The class step runs 15–30 viewport-heights for the heavier classes and asks for
// between 6 and 12 separate decisions, so a pick made three screens down is easy to
// miss entirely. This pins to the top of the step and stays there: a live count, one
// chip per decision, and a click that scrolls to the section (every section id from
// classSections() is a real anchor in the step).
//
// The head is a disclosure, following Panel in play.jsx: open by default on a screen
// wide enough for the chips to wrap, shut by default on a phone, where they'd
// otherwise take four rows of a bar that never leaves the screen. Shut, the bar is
// one line — class name, count, chevron — and the full list is one tap away, laid
// out as a vertical checklist (see the phone tier of .cls-docket in theme/styles.js).
//
// Sibling to UnfinishedChapters.jsx, which does the same job at chapter scale on the
// Review step. Styling matches the wizard rail's ✓ vocabulary.
import React, { useState, useEffect } from 'react';
import { BP } from '../theme/breakpoints.js';
import { scrollWizardTo } from './helpers.js';

const CHIPS_ID = 'cls-docket-chips';
const PHONE_Q = `(max-width: ${BP.phone}px)`;
// matchMedia is absent under jsdom (helpers.js guards the same way for reduced
// motion) — treat its absence as "not a phone", i.e. the docket starts open.
const phoneNow = () => typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia(PHONE_Q).matches;

function ClassDocket({ className, sections }) {
  const [phone, setPhone] = useState(phoneNow);
  const [open, setOpen] = useState(() => !phoneNow());

  // Re-apply the per-tier default when the breakpoint flips (rotation, a resized
  // window), so a desktop-width docket is never left collapsed with no list.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(PHONE_Q);
    if (!mql.addEventListener) return;
    const onChange = (e) => { setPhone(e.matches); setOpen(!e.matches); };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // Escape closes it, as with any disclosure. Deliberately NOT close-on-scroll:
  // expanding a sticky element makes the browser's scroll anchoring correct the
  // scroller, which fires 'scroll' — indistinguishable from a user gesture, so
  // the panel shut itself the instant it opened. The two ways out that matter
  // are the head and picking a row, and both are taps the user already makes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!sections?.length) return null;
  const done = sections.filter(s => s.done).length;
  const allDone = done === sections.length;
  // Collapse first: React flushes this before scrollWizardTo's rAF measures, so
  // the target lands where it will sit once the panel is out of the way.
  const jump = (id) => { if (phone) setOpen(false); scrollWizardTo(id); };
  return (
    <div className={`cls-docket${open ? '' : ' shut'}`}>
      <button
        type="button"
        className="cd-head"
        aria-expanded={open}
        aria-controls={CHIPS_ID}
        onClick={() => setOpen(o => !o)}
      >
        <span className="cd-name">{className}</span>
        <span className={`cd-count${allDone ? ' all-done' : ''}`}>
          {allDone ? 'every choice made' : `${done} of ${sections.length} chosen`}
        </span>
        <span className={`cd-chevron ${open ? 'up' : 'down'}`} aria-hidden="true">▾</span>
      </button>
      <div className="cd-chips" id={CHIPS_ID}>
        {sections.map(s => (
          <button
            type="button"
            key={s.id}
            className={`cd-chip${s.done ? ' done' : ''}`}
            onClick={() => jump(s.id)}
            title={s.done ? `${s.label} — chosen. Jump to it.` : `${s.label} — not yet chosen. Jump to it.`}
          >
            <span className="cd-mark" aria-hidden="true">{s.done ? '✓' : '○'}</span>
            {s.label}
            {s.detail && <span className="cd-detail">{s.detail}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export { ClassDocket };
