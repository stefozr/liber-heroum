// creator/creator-styles.js — CREATOR_CSS: the Codex-style creator's layout.
// Three independent scrollers (hero summary · choices · details) under a two-row
// header (top bar + step tabs), over a slim footer. Colours are theme tokens only,
// so both themes follow; every media query lives in this string beside the rules
// it overrides (see theme/breakpoints.js for why).
import React from 'react';
import { MQ } from '../theme/breakpoints.js';

const CREATOR_CSS = `
.cr {
  --cr-left: 300px; --cr-right: 440px;
  position: relative; z-index: 2; width: 100%; height: 100%;
  display: grid; min-width: 0; overflow: hidden;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  /* The vw caps keep a sidebar dragged wide on a big screen from crowding a smaller one. */
  grid-template-columns: min(var(--cr-left), 28vw) minmax(0, 1fr) min(var(--cr-right), 40vw);
  grid-template-areas: "top top top" "tabs tabs tabs" "left main right" "foot foot foot";
}
.cr > * { min-width: 0; }

/* The step's backdrop art, full-bleed behind the whole creator: the classic wizard's
   art and opacity (.wiz-step .step-bg) under a darker veil than the wizard's, since
   here the art sits behind three columns of text. z-index:-1 works because
   .cr is its own stacking context (position:relative; z-index:2): the layer paints
   beneath every grid child without changing any child's positioning. Absolutely
   positioned, it is not a grid item, so it covers the shell at every breakpoint. */
.cr-bg {
  position: absolute; inset: 0; z-index: -1; pointer-events: none;
  background-size: cover; background-position: center top; opacity: 0.8;
}
.cr-bg::after {
  content: ''; position: absolute; inset: 0;
  background:
    linear-gradient(180deg,
      rgba(8,8,10, calc(0.84 * var(--surface-alpha))) 0%,
      rgba(8,8,10, calc(0.89 * var(--surface-alpha))) 50%,
      rgba(8,8,10, calc(0.95 * var(--surface-alpha))) 90%,
      var(--bg-0) 100%);
}
.cr > .topbar { grid-area: top; }
.cr-tabs, .cr-navbar { grid-area: tabs; }
.cr-left { grid-area: left; }
.cr-main { grid-area: main; }
.cr-right { grid-area: right; }
.cr > .cr-footer { grid-area: foot; }

/* Sidebar resize handles: thin strips on each sidebar's inner edge, laid over its
   grid area (outside the scrollers, so they never scroll away). */
.cr-resize { z-index: 5; width: 9px; cursor: col-resize; touch-action: none; position: relative; outline: none; }
.cr-resize-left { grid-area: left; justify-self: end; margin-right: -5px; }

/* Posters: the description lives in the detail panel, so the card stays art + name
   (the classic reveal would cover a narrow card's art with text). */
.cr-posters .pc-desc-reveal { display: none; }
/* Point-buy in the narrower main column: wrap rather than crush the steppers. */
.cr-main .pb-grid { grid-template-columns: repeat(auto-fit, minmax(132px, 1fr)); }
.cr-resize-right { grid-area: right; justify-self: start; margin-left: -5px; }
.cr-resize::after {
  content: ''; position: absolute; top: 0; bottom: 0; left: 4px; width: 1px;
  background: transparent; transition: background .15s, box-shadow .15s;
}
.cr-resize:hover::after, .cr-resize:focus-visible::after, .cr-resize:active::after { background: var(--gold); box-shadow: 0 0 8px var(--gold-glow); }

/* ── Step tabs ── */
.cr-tabs {
  display: flex; background: var(--surface-top); border-bottom: 1px solid var(--line);
  backdrop-filter: blur(4px); position: relative; z-index: 10;
  overflow-x: auto; overflow-y: hidden; scrollbar-width: none; -webkit-overflow-scrolling: touch;
  scroll-snap-type: x proximity;
}
.cr-tabs::-webkit-scrollbar { display: none; }
.cr-tab {
  /* width:auto undoes .card-btn's width:100%, which would make each tab span the strip. */
  flex: 1 1 0; min-width: max-content; width: auto; display: flex; align-items: center; gap: 10px;
  padding: 10px 14px 9px; border-bottom: 2px solid transparent; text-align: left;
  transition: background .15s, border-color .15s; scroll-snap-align: center;
}
.cr-tab + .cr-tab { border-left: 1px solid var(--line); }
.cr-tab:hover { background: var(--tint-accent); }
.cr-tab:focus-visible { outline: 1px solid var(--gold); outline-offset: -3px; }
.cr-tab .ct-badge {
  font-family: var(--display); font-size: var(--fs-4); font-weight: 600;
  width: 26px; height: 26px; border: 1px solid var(--line-2); flex-shrink: 0;
  display: grid; place-items: center; color: var(--ink-3);
}
.cr-tab .ct-text { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.cr-tab .ct-name {
  font-family: var(--display-2); font-size: var(--fs-6); font-weight: 600; color: var(--ink-2);
  letter-spacing: 0.06em; white-space: nowrap;
}
.cr-tab .ct-status {
  font-family: var(--mono); font-size: var(--fs-2); letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--ink-3); white-space: nowrap;
}
.cr-tab.done .ct-badge { background: var(--gold); border-color: var(--gold); color: var(--bg-0); }
.cr-tab.done .ct-status { color: var(--tier3-t); }
.cr-tab.in-progress .ct-badge { border-color: var(--gold-deep); color: var(--gold-2); }
.cr-tab.in-progress .ct-status { color: var(--gold-2); }
.cr-tab.active { border-bottom-color: var(--gold); background: linear-gradient(180deg, transparent, var(--tint-accent)); }
.cr-tab.active .ct-name { color: var(--ink); }
.cr-tab.active .ct-badge { border-color: var(--gold); }
.cr-tab.active.done .ct-badge { color: var(--bg-0); }
/* Measured: the seven tabs with their status lines need ~1206px at the root font
   ladder, so below that the strip scrolls and fades at its right edge. */
@media (max-width: 1220px) {
  .cr-tabs {
    -webkit-mask-image: linear-gradient(90deg, #000 0, #000 calc(100% - 36px), transparent);
    mask-image: linear-gradient(90deg, #000 0, #000 calc(100% - 36px), transparent);
  }
  .cr-tab { flex: 0 0 auto; }
}

/* Compact navigator (≤900): the wizard's railbar, whose label opens the step list. */
.cr-navbar { display: none; }
.cr-navbar .rb-label { appearance: none; -webkit-appearance: none; background: transparent; border: 0; color: inherit; cursor: pointer; font: inherit; }
.cr-navbar .rb-label:hover .rb-name { color: var(--gold-2); }
.cr-steplist { display: flex; flex-direction: column; }
.cr-steplist .cr-tab { border-left: 0 !important; border-bottom: 1px solid var(--line); min-height: 52px; padding: 10px 6px; }
.cr-steplist .cr-tab.active { border-bottom-color: var(--line); background: var(--tint-accent); }

/* ── The three columns ── */
.cr-left, .cr-main, .cr-right { min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.cr-left {
  border-right: 1px solid var(--line); background: var(--surface-panel);
  padding: 22px 20px 28px; display: flex; flex-direction: column; gap: 18px;
}
.cr-main { position: relative; }
.cr-main-inner { max-width: 980px; margin: 0 auto; padding: 30px 36px 60px; }
.cr-right { border-left: 1px solid var(--line); background: var(--surface-panel); }

/* Hero summary card */
.hs-card {
  position: relative; aspect-ratio: 2 / 3; width: 100%; max-width: 260px; margin: 0 auto; flex-shrink: 0;
  border: 1px solid var(--line-2); background: var(--grad-card); overflow: hidden;
}
.hs-card img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 18%; }
.hs-card .hs-mark {
  position: absolute; inset: 0; display: grid; place-items: center;
  font-family: var(--display); font-size: 3.75rem; color: var(--gold); opacity: 0.35;
}
.hs-card .hs-scrim {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 40px 10px 10px;
  background: linear-gradient(180deg, transparent, rgba(8,8,10,0.88));
}
.hs-chips { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; }
.hs-chips-strip { display: none; }
.hs-chip {
  border: 1px solid var(--line-2); background: var(--surface-panel); text-align: center; padding: 4px 0 3px;
  font-family: var(--mono); font-size: var(--fs-3); color: var(--ink-2); letter-spacing: 0.06em;
}
.hs-chip b { display: block; font-family: var(--display); font-size: var(--fs-8); color: var(--ink); font-weight: 600; }
.hs-chip.pos b { color: var(--gold-2); }
.hs-chip.neg b { color: var(--rubric-2); }
.hs-id { text-align: center; }
.hs-name { font-family: var(--display-2); font-size: var(--fs-9); font-weight: 600; color: var(--ink); letter-spacing: 0.06em; overflow-wrap: anywhere; }
.hs-name.empty { color: var(--ink-3); font-style: italic; font-family: var(--hand); font-weight: 400; letter-spacing: 0; }
.hs-level { font-family: var(--mono); font-size: var(--fs-2); color: var(--gold-2); letter-spacing: 0.18em; text-transform: uppercase; margin-top: 4px; }
.hs-vitals { display: flex; flex-direction: column; gap: 6px; }
.hs-stamina-row { display: flex; justify-content: space-between; gap: 8px; font-family: var(--mono); font-size: var(--fs-2); color: var(--ink-3); letter-spacing: 0.18em; text-transform: uppercase; }
.hs-stamina-row b { color: var(--ink); font-family: var(--display); font-size: var(--fs-6); letter-spacing: 0.04em; }
.hs-bar { height: 6px; border: 1px solid var(--line-2); background: var(--bg-1); }
.hs-bar > span { display: block; height: 100%; background: linear-gradient(90deg, var(--gold-deep), var(--gold)); }
.hs-stats { display: flex; justify-content: space-between; gap: 6px; font-family: var(--mono); font-size: var(--fs-2); color: var(--ink-3); letter-spacing: 0.14em; text-transform: uppercase; }
.hs-stats b { color: var(--ink-2); }
.cr-kv { display: flex; flex-direction: column; border-top: 1px solid var(--line); }
.cr-kv-row { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 10px; padding: 9px 0; border-bottom: 1px dashed var(--line); align-items: baseline; }
.cr-kv-row dt { font-family: var(--mono); font-size: var(--fs-2); color: var(--ink-3); letter-spacing: 0.12em; text-transform: uppercase; }
.cr-kv-row dd { margin: 0; font-family: var(--serif); font-size: var(--fs-7); color: var(--ink); overflow-wrap: anywhere; }
.cr-kv-row dd.unset { color: var(--ink-4); }

/* ── Main column ── */
.cr-intro { margin-bottom: 24px; }
.cr-intro .h1-display { font-size: 2.125rem; margin: 6px 0 8px; }
.cr-intro .deck { max-width: none; }
.cr-pick-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.cr-choices-head {
  font-family: var(--display); font-size: 1.25rem; font-weight: 600; color: var(--ink); letter-spacing: 0.06em;
  margin: 30px 0 14px; padding-top: 18px; border-top: 1px solid var(--line);
}
.cr-subhead { font-family: var(--display-2); font-size: var(--fs-9); color: var(--gold-2); letter-spacing: 0.14em; text-transform: uppercase; margin: 26px 0 12px; }
.cr-stack { display: flex; flex-direction: column; gap: 14px; }

.cr-sec { position: relative; }
.cr-sec.framed { border: 1px solid var(--line-2); background: var(--grad-card), var(--bg-1); padding: 16px 18px 18px; }
.cr-sec.framed.is-done { border-color: var(--line); }
.cr-sec-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 4px; }
.cr-sec-title { font-family: var(--display-2); font-size: var(--fs-8); font-weight: 600; color: var(--ink); letter-spacing: 0.08em; margin: 0; }
.cr-sec.bare > .cr-sec-head .cr-sec-title { font-family: var(--display-2); font-size: var(--fs-9); color: var(--gold-2); letter-spacing: 0.18em; text-transform: uppercase; }
.cr-sec-status { font-family: var(--mono); font-size: var(--fs-2); letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold-2); }
.cr-sec-status.done, .cr-sec-status.granted { color: var(--tier3-t); }
.cr-sec-status.optional { color: var(--ink-3); }
.cr-sec-status.blocked { color: var(--rubric-2); }
.cr-sec-actions { margin-left: auto; display: flex; gap: 8px; align-items: center; }
.cr-sec-details { display: none; }
.cr-sec-hint { font-family: var(--hand); font-style: italic; font-size: var(--fs-7); color: var(--ink-3); margin: 2px 0 12px; line-height: 1.45; }
.cr-sec-issue { font-family: var(--serif); font-style: italic; font-size: var(--fs-6); color: var(--rubric-2); margin: 0 0 10px; }
.cr-sec-body > * + * { margin-top: 12px; }
.cr-pending { font-family: var(--hand); font-style: italic; font-size: var(--fs-7); color: var(--ink-3); }
.cr-link {
  appearance: none; background: transparent; border: 0; padding: 0; cursor: pointer; font-style: normal;
  font-family: var(--mono); font-size: var(--fs-3); color: var(--gold-2); letter-spacing: 0.16em; text-transform: uppercase;
}
.cr-link:hover { color: var(--ink); }
.cr-group-label { font-family: var(--mono); font-size: var(--fs-3); color: var(--ink-3); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 8px; }
.cr-group-label b { color: var(--gold-2); font-weight: 500; }

/* Option buttons: name-only choices; the detail panel carries the prose. */
.opt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 8px; }
.opt-grid.cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.opt-grid.wide { grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); }
.opt-cell { position: relative; min-width: 0; display: flex; }
.opt-btn {
  flex: 1; min-height: 44px; min-width: 0; padding: 9px 12px;
  border: 1px solid var(--line-2); background: var(--grad-card), var(--bg-1); color: var(--ink);
  font-family: var(--display-2); font-weight: 600; font-size: var(--fs-5); letter-spacing: 0.04em;
  text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
  transition: border-color .12s, background .12s, box-shadow .12s, color .12s;
}
.opt-btn .opt-name { overflow-wrap: anywhere; line-height: 1.25; }
.opt-btn .opt-sub { font-family: var(--mono); font-weight: 400; font-size: var(--fs-2); color: var(--ink-3); letter-spacing: 0.12em; text-transform: uppercase; }
.opt-btn .opt-cost { font-family: var(--mono); font-weight: 400; font-size: var(--fs-3); color: var(--gold-2); margin-left: 4px; }
.opt-btn .opt-badge { margin-top: 2px; }
.opt-btn:hover, .opt-btn:focus-visible { border-color: var(--gold-deep); background: var(--grad-card-hover), var(--bg-1); }
.opt-btn:focus-visible { outline: 1px solid var(--gold); outline-offset: 2px; }
.opt-btn.selected { border-color: var(--gold); background: var(--grad-card-sel), var(--bg-1); box-shadow: var(--shadow-card-sel); color: var(--gold-2); }
.opt-btn.selected .opt-sub { color: var(--gold-2); opacity: 0.8; }
.opt-btn.dimmed { color: var(--ink-3); border-color: var(--line); }
.opt-btn.dimmed:hover, .opt-btn.dimmed:focus-visible { color: var(--ink); border-color: var(--gold-deep); }
.opt-btn.blocked { color: var(--ink-4); border-color: var(--line); text-decoration: line-through; cursor: not-allowed; }
.opt-btn.blocked:hover { color: var(--ink-4); border-color: var(--line); background: var(--grad-card), var(--bg-1); }
.opt-btn.granted { border-color: var(--gold-deep); background: var(--grad-card-sel), var(--bg-1); color: var(--gold-2); cursor: default; text-decoration: none; }
.opt-btn.granted:hover { border-color: var(--gold-deep); background: var(--grad-card-sel), var(--bg-1); }
.opt-btn.warn { border-color: var(--rubric); }
.opt-btn .opt-left { font-size: var(--fs-2); }
.opt-info { display: none; }

/* The informational "Skills & Languages" box on the source steps. */
.cr-infobox { border: 1px solid var(--line-strong); padding: 14px 18px 12px; background: var(--bg-1); margin: 20px 0 6px; }
.cr-infobox-title { text-align: center; font-family: var(--display-2); font-weight: 600; font-size: var(--fs-8); color: var(--gold-2); letter-spacing: 0.14em; margin-bottom: 10px; }
.cr-infobox-row { font-family: var(--serif); font-size: var(--fs-8); color: var(--ink-2); line-height: 1.5; padding: 2px 0; text-align: center; }
.cr-infobox-row b { color: var(--ink); font-weight: 600; }
.cr-infobox-row.done { color: var(--ink-3); }
.cr-infobox-row .ok { color: var(--tier3-t); margin-right: 6px; }


/* ── Detail panel ── */
.dp-head { display: none; }
.dp-body { padding: 20px 22px 32px; }
.dp-kicker { font-family: var(--mono); font-size: var(--fs-2); color: var(--gold-2); letter-spacing: 0.22em; text-transform: uppercase; margin-bottom: 6px; }
.dp-title { font-family: var(--display); font-size: 1.375rem; font-weight: 600; color: var(--ink); letter-spacing: 0.04em; margin: 0 0 10px; line-height: 1.15; }
.dp-quote { font-family: var(--hand); font-style: italic; color: var(--gold-2); font-size: var(--fs-9); margin: 0 0 12px; }
.dp-text { font-family: var(--serif); font-size: var(--fs-8); color: var(--ink-2); line-height: 1.6; }
.dp-text p { margin: 0 0 10px; }
.dp-meta { display: flex; flex-wrap: wrap; gap: 6px 16px; font-family: var(--mono); font-size: var(--fs-2); color: var(--ink-3); letter-spacing: 0.16em; text-transform: uppercase; margin: 12px 0; }
.dp-meta b { color: var(--ink-2); font-weight: 500; }
.dp-section { margin-top: 18px; }
.dp-section-title { font-family: var(--display-2); font-size: var(--fs-6); font-weight: 700; color: var(--gold-2); letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 8px; }
.dp-section > * + * { margin-top: 10px; }
.dp-feature { border-left: 2px solid var(--line-2); padding-left: 12px; }
.dp-feature-name { font-family: var(--display-2); font-size: var(--fs-6); font-weight: 700; color: var(--ink); letter-spacing: 0.1em; text-transform: uppercase; }
.dp-feature .dp-text { font-size: var(--fs-7); margin-top: 4px; }
.dp-list { margin: 0; padding-left: 18px; font-family: var(--serif); font-style: italic; font-size: var(--fs-7); color: var(--ink-2); line-height: 1.6; }
.dp-table { display: grid; grid-template-columns: auto 1fr; gap: 4px 14px; font-family: var(--serif); font-size: var(--fs-7); color: var(--ink-2); }
.dp-table dt { font-family: var(--mono); font-size: var(--fs-2); color: var(--ink-3); letter-spacing: 0.18em; text-transform: uppercase; align-self: center; }
.dp-table dd { margin: 0; color: var(--ink); }
.dp-empty { font-family: var(--hand); font-style: italic; color: var(--ink-3); font-size: var(--fs-7); }
.cr-backdrop { display: none; }
.cr-detailbtn { display: none !important; align-items: center; justify-content: center; font-size: var(--fs-9); }

/* Footer: the wizard's (.wiz-footer + its phone rules), placed in the grid. */
.cr-footer .meta button { appearance: none; background: none; border: 0; padding: 0; font: inherit; color: inherit; letter-spacing: inherit; text-transform: inherit; cursor: pointer; }

/* ── 1280–1439: narrower sidebars. Measured one-off, like the wizard's 1180. ── */
@media (max-width: 1439px) {
  .cr { --cr-left: 260px; --cr-right: 380px; }
  .hs-card { max-width: 200px; }
  .cr-main-inner { padding: 26px 28px 56px; }
}

/* ── 1025–1279: the summary becomes a strip above the choices. ── */
@media (max-width: 1279px) {
  .cr-resize-left { display: none; }
  .cr {
    grid-template-columns: minmax(0, 1fr) min(var(--cr-right), 40vw);
    grid-template-rows: auto auto auto minmax(0, 1fr) auto;
    grid-template-areas: "top top" "tabs tabs" "left left" "main right" "foot foot";
  }
  .cr-left {
    flex-direction: row; align-items: center; gap: 14px; padding: 10px 20px;
    border-right: 0; border-bottom: 1px solid var(--line); overflow: visible;
  }
  .hs-card { width: 56px; max-width: none; flex-shrink: 0; margin: 0; }
  .hs-card .hs-scrim { display: none; }
  .hs-card .hs-mark { font-size: 1.5rem; }
  .hs-id { text-align: left; min-width: 0; flex: 0 1 240px; }
  .hs-name { font-size: var(--fs-8); overflow-wrap: normal; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hs-level { margin-top: 2px; }
  .hs-card .hs-chips { display: none; }
  .hs-chips-strip { display: flex; gap: 4px; flex-shrink: 0; }
  .hs-chip { min-width: 40px; padding: 3px 4px; }
  .hs-vitals { min-width: 120px; flex: 0 1 160px; }
  .hs-stats { display: none; }
  .cr-kv { flex-direction: row; flex-wrap: wrap; border-top: 0; gap: 2px 14px; min-width: 0; flex: 1 1 auto; }
  .cr-kv-row { display: flex; gap: 6px; padding: 0; border: 0; }
  .cr-kv-row dd { font-size: var(--fs-6); }
}

/* ── ≤1024: one column; the detail panel becomes a slide-over drawer. ── */
${MQ.rail} {
  .cr-resize-right { display: none; }
  .cr {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: "top" "tabs" "left" "main" "foot";
  }
  .cr-right {
    position: fixed; top: 0; right: 0; bottom: 0; z-index: 90;
    width: min(440px, 92vw); border-left: 1px solid var(--gold-deep);
    background: var(--grad-modal); transform: translateX(100%); visibility: hidden;
    transition: transform .22s ease, visibility 0s linear .22s;
  }
  .cr-right.open { transform: none; visibility: visible; transition: transform .22s ease; }
  .cr-backdrop.open { display: block; position: fixed; inset: 0; z-index: 85; background: var(--surface-backdrop); }
  .dp-head {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    position: sticky; top: 0; z-index: 2; padding: 10px 12px 10px 18px;
    background: var(--surface-top); border-bottom: 1px solid var(--line); backdrop-filter: blur(6px);
    font-family: var(--mono); font-size: var(--fs-3); color: var(--ink-3); letter-spacing: 0.2em; text-transform: uppercase;
  }
  .cr-sec-details, .opt-info { display: inline-flex; }
  .cr-sec-details {
    appearance: none; background: transparent; border: 1px solid var(--line-2); cursor: pointer;
    font-family: var(--mono); font-size: var(--fs-2); color: var(--gold-2); letter-spacing: 0.16em; text-transform: uppercase;
    padding: 5px 9px; min-height: 30px; align-items: center;
  }
  .opt-info {
    appearance: none; flex: 0 0 auto; width: 34px; margin-left: -1px;
    border: 1px solid var(--gold); background: var(--grad-card-sel), var(--bg-1); color: var(--gold-2); cursor: pointer;
    align-items: center; justify-content: center; font-family: var(--serif); font-style: italic; font-size: var(--fs-8);
  }
  .opt-cell:not(.has-info) .opt-info { display: none; }
  .cr-detailbtn { display: inline-flex !important; }
}

/* ── ≤900: the compact navigator replaces the tab strip. ── */
${MQ.tab} {
  .cr-tabs { display: none; }
  .cr-navbar { display: flex; }
  .cr-main-inner { padding: 20px 20px 48px; }
  /* One row: art, M/A/R/I/P, name, stamina. The key picks are on the classic sheet. */
  .cr-left { padding: 8px 20px; }
  .cr-kv, .hs-stats, .hs-bar { display: none; }
  .hs-vitals { flex: 0 0 auto; min-width: 0; margin-left: auto; }
  .hs-stamina-row { flex-direction: column; align-items: flex-end; gap: 0; }
  .cr-intro .h1-display { font-size: 1.75rem; }
  .tb-right .cr-switch { display: none; }
}

/* ── ≤560: two-up options, a bottom sheet for details. ── */
${MQ.phone} {
  /* Posters two-up rather than one full-width card per row. */
  .grid-3.cr-posters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .opt-grid, .opt-grid.wide { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .opt-grid.cols-1 { grid-template-columns: minmax(0, 1fr); }
  .cr-main-inner { padding: 16px 16px 40px; }
  .cr-sec.framed { padding: 14px 14px 16px; }
  .cr-left { padding: 8px 16px; gap: 6px 10px; flex-wrap: wrap; }
  .cr-topbar .tb-right { flex-wrap: nowrap; }
  .hs-card { width: 40px; }
  .hs-id { flex: 1 1 0; }
  .hs-chips-strip { order: 3; flex-basis: 100%; }
  .hs-chip { flex: 1; min-width: 0; padding: 2px 0; }
  .hs-chip b { font-size: var(--fs-6); display: inline; margin-left: 4px; }
  .cr-right {
    top: auto; left: 0; width: 100%; height: 72dvh; border-left: 0; border-top: 1px solid var(--gold-deep);
    transform: translateY(100%);
  }
  .cr-right.open { transform: none; }
  .cr-sec-details { min-height: 40px; }
  .cr-intro .h1-display { font-size: 1.5rem; }
  .cr-choices-head { font-size: 1.0625rem; }
}

/* Touch: hover is not a preview, and a stuck :hover must not look like a pick. */
${MQ.touch} {
  .opt-btn:hover { border-color: var(--line-2); background: var(--grad-card), var(--bg-1); }
  .opt-btn.selected:hover { border-color: var(--gold); background: var(--grad-card-sel), var(--bg-1); }
  .opt-btn.dimmed:hover { color: var(--ink-3); border-color: var(--line); }
  .opt-btn.granted:hover { border-color: var(--gold-deep); background: var(--grad-card-sel), var(--bg-1); }
}
`;

const CreatorStyles = () => React.createElement('style', {}, CREATOR_CSS);

export { CREATOR_CSS, CreatorStyles };
