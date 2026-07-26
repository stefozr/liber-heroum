// theme/styles.js — the Reliquary stylesheet (RELIQUARY_CSS) + the <style> injector.
// Kept as a JS string injected by ThemeStyles so the runtime theme toggle is unchanged.
import React from 'react';
import { MQ } from './breakpoints.js';

const RELIQUARY_CSS = `
/* All font sizes are rem against a 16px baseline; the global text-size knob
   is the "html { font-size }" rule in index.html. */
:root {
  --bg-0: #07091c;
  --bg-1: #0c1330;
  --bg-2: #141c3e;
  --bg-3: #1a2348;
  --bg-4: #232d56;
  --line: #2a3460;
  --line-2: #3a4577;
  --line-strong: #5a6caa;
  --ink: #f4ead2;
  --ink-2: #c8bda1;
  --ink-3: #8a7d61;
  --ink-4: #5b5240;
  --gold: #d4a945;
  --gold-2: #e9c46a;
  --gold-deep: #a8862f;
  --gold-glow: rgba(212,169,69,0.35);
  --rubric: #c14a3a;
  --rubric-2: #e36a55;
  --rubric-glow: rgba(193,74,58,0.4);
  --illum-blue: #5078b8;
  --illum-green: #7fa56d;
  --vellum: #f0e6cf;
  --serif: 'EB Garamond', Georgia, serif;
  --display: 'Cinzel Decorative', 'Cinzel', serif;
  --display-2: 'Cinzel', serif;
  --hand: 'IM Fell English', 'EB Garamond', serif;
  --mono: 'IBM Plex Mono', monospace;
  --surface-alpha: 1;
  /* Themed surface tints — overridden in body[data-theme="obsidian"].
     All multiply through --surface-alpha so the Tweaks opacity slider works. */
  --surface-top:     rgba(7,9,28, calc(0.85 * var(--surface-alpha)));
  --surface-panel:   rgba(7,9,28, calc(0.82 * var(--surface-alpha)));
  --surface-vital:   rgba(20,28,62, calc(0.92 * var(--surface-alpha)));
  --surface-counter: rgba(20,28,62, calc(0.85 * var(--surface-alpha)));
  --surface-fade-a:  rgba(7,9,28, calc(0.70 * var(--surface-alpha)));
  --surface-fade-b:  rgba(7,9,28, calc(0.85 * var(--surface-alpha)));
  --tint-accent:     rgba(212,169,69,0.06);
}

/* ───────── Theme: Obsidian & Bone ─────────
   Near-black, ivory ink, single dim bronze accent. */
body[data-theme="obsidian"] {
  --bg-0: #08080a;
  --bg-1: #0e0e12;
  --bg-2: #14141a;
  --bg-3: #1c1c24;
  --bg-4: #26262e;
  --line: #2a2a34;
  --line-2: #3c3c46;
  --line-strong: #555560;
  --ink: #ece4d2;
  --ink-2: #b5ad9e;
  --ink-3: #756f63;
  --ink-4: #463f37;
  --gold: #b08a48;
  --gold-2: #c89e5c;
  --gold-deep: #6e5424;
  --gold-glow: rgba(176,138,72,0.30);
  --rubric: #8a3a30;
  --rubric-2: #a6504a;
  --rubric-glow: rgba(138,58,48,0.30);
  --illum-blue: #5a6a80;
  --illum-green: #6a8070;
  --surface-top:     rgba(14,14,18, calc(0.82 * var(--surface-alpha)));
  --surface-panel:   rgba(14,14,18, calc(0.74 * var(--surface-alpha)));
  --surface-vital:   rgba(20,20,26, calc(0.80 * var(--surface-alpha)));
  --surface-counter: rgba(20,20,26, calc(0.74 * var(--surface-alpha)));
  --surface-fade-a:  rgba(8,8,10,   calc(0.62 * var(--surface-alpha)));
  --surface-fade-b:  rgba(8,8,10,   calc(0.92 * var(--surface-alpha)));
  --tint-accent:     rgba(176,138,72,0.05);
}

/* Surfaces in Obsidian use an alpha multiplier so backgrounds show through.
   --surface-alpha (0.4 – 1) is controlled from the Tweaks panel. */
body[data-theme="obsidian"] .orn-frame {
  background: linear-gradient(180deg,
    rgba(20,20,26, calc(0.78 * var(--surface-alpha))),
    rgba(14,14,18, calc(0.84 * var(--surface-alpha))));
  box-shadow: inset 0 0 0 4px rgba(176,138,72,0.06), 0 0 0 1px rgba(176,138,72,0.12);
}
body[data-theme="obsidian"] .card {
  background: linear-gradient(180deg,
    rgba(20,20,26, calc(0.94 * var(--surface-alpha))),
    rgba(14,14,18, calc(0.97 * var(--surface-alpha))));
}
body[data-theme="obsidian"] .card:hover {
  background: linear-gradient(180deg,
    rgba(28,28,36, calc(0.96 * var(--surface-alpha))),
    rgba(20,20,26, calc(0.98 * var(--surface-alpha))));
}
body[data-theme="obsidian"] .card.selected {
  background: linear-gradient(180deg,
    rgba(176,138,72,0.18),
    rgba(20,20,26, calc(0.97 * var(--surface-alpha))));
  box-shadow: 0 0 22px rgba(176,138,72,0.16), inset 0 0 0 1px rgba(176,138,72,0.18);
}
body[data-theme="obsidian"] .input-text,
body[data-theme="obsidian"] .input-area,
body[data-theme="obsidian"] .input-select {
  background: rgba(14,14,18, calc(0.72 * var(--surface-alpha)));
}
body[data-theme="obsidian"] .preview-portrait {
  background-color: rgba(20,20,26, calc(0.82 * var(--surface-alpha)));
}
body[data-theme="obsidian"] .modal-backdrop {
  background: rgba(8,8,10, calc(0.86 * var(--surface-alpha)));
}
body[data-theme="obsidian"] .modal {
  background: linear-gradient(180deg,
    rgba(20,20,26, calc(0.95 * var(--surface-alpha))),
    rgba(8,8,10, calc(0.95 * var(--surface-alpha))));
}
body[data-theme="obsidian"] .drop-cap {
  background: linear-gradient(180deg, rgba(176,138,72,0.08), rgba(138,58,48,0.04));
  text-shadow: 0 0 22px rgba(138,58,48,0.30);
}
body[data-theme="obsidian"] .orn-divider .line {
  opacity: 0.45;
}
body[data-theme="obsidian"] .orn-divider .glyph {
  opacity: 0.65;
}
body[data-theme="obsidian"] .glyph-row {
  opacity: 0.40;
}

/* Default focus rings */
*:focus { outline: none; }
*:focus-visible { outline: 1px solid var(--gold); outline-offset: 2px; }

/* Scrollbar */
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--line-2); border: 2px solid transparent; background-clip: padding-box; }
::-webkit-scrollbar-thumb:hover { background: var(--line-strong); background-clip: padding-box; border: 2px solid transparent; }

/* ───────── App shell ───────── */
.app {
  width: 100%; height: 100%; display: grid; overflow: hidden;
  background: var(--bg-0);
  position: relative;
}
.app .bg-paper {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    radial-gradient(60% 40% at 50% 0%, rgba(212,169,69,0.10), transparent 60%),
    radial-gradient(40% 30% at 0% 100%, rgba(193,74,58,0.06), transparent 60%),
    radial-gradient(40% 30% at 100% 100%, rgba(80,120,184,0.08), transparent 60%);
}
.app .bg-grain {
  position: fixed; inset: 0; pointer-events: none; z-index: 1; opacity: 0.4;
  background-image: repeating-linear-gradient(45deg, rgba(212,169,69,0.015) 0 2px, transparent 2px 14px);
  mix-blend-mode: screen;
}
body[data-theme="obsidian"] .app .bg-paper {
  background-image:
    radial-gradient(60% 40% at 50% 0%, rgba(176,138,72,0.06), transparent 60%),
    radial-gradient(40% 30% at 0% 100%, rgba(138,58,48,0.03), transparent 60%),
    radial-gradient(40% 30% at 100% 100%, rgba(176,138,72,0.04), transparent 60%);
}
body[data-theme="obsidian"] .app .bg-grain {
  opacity: 0.25;
  background-image: repeating-linear-gradient(45deg, rgba(176,138,72,0.012) 0 2px, transparent 2px 14px);
}

/* ───────── Ornate borders ───────── */
.orn-frame {
  position: relative;
  border: 1px solid var(--gold);
  background: linear-gradient(180deg, rgba(20,28,62,0.92), rgba(12,19,48,0.92));
  box-shadow: inset 0 0 0 4px rgba(212,169,69,0.08), 0 0 0 1px rgba(212,169,69,0.15);
}
.orn-frame.corners-tb::before, .orn-frame.corners-tb::after,
.orn-frame.corners-lr::before, .orn-frame.corners-lr::after {
  content: ''; position: absolute; width: 14px; height: 14px;
  border: 1px solid var(--gold); transform: rotate(45deg);
  background: var(--bg-1);
}
.orn-frame.corners-tb::before { top: -8px; left: 50%; margin-left: -7px; }
.orn-frame.corners-tb::after  { bottom: -8px; left: 50%; margin-left: -7px; }
.orn-frame.corners-lr::before { left: -8px; top: 50%; margin-top: -7px; }
.orn-frame.corners-lr::after  { right: -8px; top: 50%; margin-top: -7px; }

/* Corner brackets */
.bracket-corners { position: relative; }
.bracket-corners > .bc { position: absolute; width: 18px; height: 18px; pointer-events: none; }
.bracket-corners > .bc-tl { top: -1px; left: -1px; border-top: 2px solid var(--gold); border-left: 2px solid var(--gold); }
.bracket-corners > .bc-tr { top: -1px; right: -1px; border-top: 2px solid var(--gold); border-right: 2px solid var(--gold); }
.bracket-corners > .bc-bl { bottom: -1px; left: -1px; border-bottom: 2px solid var(--gold); border-left: 2px solid var(--gold); }
.bracket-corners > .bc-br { bottom: -1px; right: -1px; border-bottom: 2px solid var(--gold); border-right: 2px solid var(--gold); }

/* Diamond bullet */
.diamond {
  display: inline-block; width: 8px; height: 8px;
  background: var(--gold); transform: rotate(45deg);
  vertical-align: middle;
}

/* Ornate divider */
.orn-divider { display: flex; align-items: center; gap: 12px; }
.orn-divider .line { flex: 1; height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold) 30%, var(--gold) 70%, transparent);
  opacity: 0.7;
}
.orn-divider .glyph { font-family: var(--display); color: var(--gold); font-size: 0.875rem; opacity: 0.9; letter-spacing: 0.25em; }
.orn-divider.small .glyph { font-size: 0.6875rem; }
.orn-divider.large .glyph { font-size: 1.125rem; }

/* Glyph row (decorative) */
.glyph-row {
  font-family: var(--display); color: var(--gold);
  letter-spacing: 0.4em; font-size: 0.75rem; opacity: 0.55;
}

/* ───────── Buttons ───────── */
.btn {
  font-family: var(--display-2); font-weight: 600; font-size: 0.75rem;
  letter-spacing: 0.22em; text-transform: uppercase;
  padding: 13px 22px; background: transparent;
  border: 1px solid var(--line-strong);
  color: var(--ink-2); cursor: pointer;
  transition: all .15s; position: relative;
  display: inline-flex; align-items: center; gap: 10px;
}
.btn:hover { border-color: var(--gold); color: var(--ink); background: rgba(212,169,69,0.06); }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn.primary {
  background: linear-gradient(180deg, var(--gold-2), var(--gold-deep));
  border-color: var(--gold-2);
  color: #1a120a; font-weight: 700;
  box-shadow: 0 0 22px var(--gold-glow), inset 0 1px 0 rgba(255,255,255,0.25);
}
.btn.primary:hover { background: linear-gradient(180deg, #f0d480, #b8932f); color: #0b0e1f; }
.btn.danger { border-color: rgba(193,74,58,0.5); color: var(--rubric-2); }
.btn.danger:hover { border-color: var(--rubric); background: rgba(193,74,58,0.08); }
.btn.ghost { border-color: var(--line); }
.btn.small { padding: 8px 14px; font-size: 0.625rem; letter-spacing: 0.18em; }

.icon-btn {
  width: 36px; height: 36px; border: 1px solid var(--line-2); background: transparent;
  color: var(--ink-2); cursor: pointer; display: grid; place-items: center;
  font-family: var(--display); font-size: 0.875rem;
}
.icon-btn:hover { border-color: var(--gold); color: var(--ink); }

/* ───────── Pills / Tags ───────── */
.pill {
  font-family: var(--mono); font-size: 0.625rem; padding: 6px 11px;
  border: 1px solid var(--line-2); color: var(--ink-2);
  letter-spacing: 0.18em; text-transform: uppercase;
  display: inline-flex; align-items: center; gap: 8px;
}
.pill.live::before { content:''; width:6px; height:6px; border-radius:50%; background:var(--gold); box-shadow:0 0 8px var(--gold); }
.pill.muted { color: var(--ink-3); }
.pill.gold { border-color: var(--gold); color: var(--gold-2); }
.pill.rubric { border-color: var(--rubric); color: var(--rubric-2); }

.tag {
  font-family: var(--mono); font-size: 0.5625rem; padding: 3px 8px;
  border: 1px solid var(--line-2); color: var(--ink-3);
  letter-spacing: 0.2em; text-transform: uppercase;
}
.tag.gold { border-color: var(--gold); color: var(--gold-2); }
.tag.rubric { border-color: var(--rubric); color: var(--rubric-2); }

/* ───────── Crest / Sigils ───────── */
.crest {
  width: 44px; height: 44px; position: relative;
  display: grid; place-items: center;
  border: 1px solid var(--gold); color: var(--gold);
  font-family: var(--display); font-size: 1.375rem;
  background: radial-gradient(circle, rgba(212,169,69,0.18), transparent 70%), var(--bg-2);
  flex-shrink: 0;
}
.crest::before, .crest::after {
  content: ''; position: absolute; width: 8px; height: 8px;
  border: 1px solid var(--gold); transform: rotate(45deg);
  background: var(--bg-1);
}
.crest::before { top: -5px; left: 50%; margin-left: -4px; }
.crest::after  { bottom: -5px; left: 50%; margin-left: -4px; }
.crest.large { width: 60px; height: 60px; font-size: 1.875rem; }
.crest.small { width: 32px; height: 32px; font-size: 1rem; }
.crest.rubric { border-color: var(--rubric); color: var(--rubric); }
.crest.rubric::before, .crest.rubric::after { border-color: var(--rubric); }
.crest.portrait { background: var(--bg-2); overflow: hidden; }
.crest.portrait img {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; object-position: center top;
}

/* ───────── Cards ───────── */
.card {
  border: 2px double var(--line);
  background: linear-gradient(180deg, var(--bg-2), var(--bg-1));
  padding: 16px 18px; position: relative;
  transition: all .15s; cursor: pointer;
}
.card:hover { border-color: var(--gold-deep); background: linear-gradient(180deg, var(--bg-3), var(--bg-2)); }
.card.selected {
  border-color: var(--gold);
  background: linear-gradient(180deg, rgba(212,169,69,0.13), var(--bg-2));
  box-shadow: 0 0 24px rgba(212,169,69,0.18), inset 0 0 0 1px rgba(212,169,69,0.2);
}
.card.selected::after {
  content: '✠'; position: absolute; top: 6px; right: 10px;
  font-family: var(--display); color: var(--rubric); font-size: 0.875rem;
}
.card .c-stamp {
  position: absolute; top: 6px; right: 10px;
  font-family: var(--display); color: var(--gold); font-size: 0.6875rem; opacity: 0.4;
}
.card.selected .c-stamp { display: none; }

/* ───────── Header / titles ───────── */
.eyebrow {
  font-family: var(--mono); font-size: 0.625rem; color: var(--gold);
  letter-spacing: 0.3em; text-transform: uppercase;
}
.h1-display {
  font-family: var(--display); font-size: 2.75rem; font-weight: 600;
  letter-spacing: 0.04em; margin: 8px 0 6px; color: var(--ink); line-height: 1; text-wrap: balance;
}
.h1-display em { font-style: italic; font-family: var(--serif); font-weight: 500; color: var(--gold-2); }
.h2-display {
  font-family: var(--display); font-size: 1.625rem; font-weight: 600; letter-spacing: 0.06em;
  color: var(--ink); margin: 0;
}
.h3-display {
  font-family: var(--display-2); font-size: 1rem; font-weight: 600; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--gold-2); margin: 0;
}
.h4-meta {
  font-family: var(--mono); font-size: 0.625rem; color: var(--ink-3); letter-spacing: 0.3em;
  text-transform: uppercase; margin: 0 0 10px; font-weight: 500;
}
.deck {
  font-family: var(--serif); font-size: 1.0625rem; color: var(--ink-2); line-height: 1.55;
  font-style: italic; max-width: 720px;
}

.drop-cap {
  display: inline-block; font-family: var(--display); font-weight: 900;
  font-size: 4.875rem; line-height: 0.78; color: var(--rubric);
  margin-right: 10px; padding: 6px 12px 2px;
  border: 1px solid var(--gold);
  background: linear-gradient(180deg, rgba(212,169,69,0.10), rgba(193,74,58,0.06));
  text-shadow: 0 0 22px rgba(193,74,58,0.35);
  vertical-align: -14px;
}

/* ───────── Form inputs ───────── */
.input-row { display: flex; flex-direction: column; gap: 6px; }
.input-row > label { font-family: var(--mono); font-size: 0.625rem; color: var(--ink-3); letter-spacing: 0.24em; text-transform: uppercase; }
.input-text, .input-area, .input-select {
  font-family: var(--serif); font-size: 0.9375rem; color: var(--ink);
  padding: 11px 14px; background: var(--bg-1); border: 1px solid var(--line-2);
  width: 100%;
}
.input-text:focus, .input-area:focus, .input-select:focus { border-color: var(--gold); }
.input-area { min-height: 72px; resize: vertical; font-family: var(--serif); }

/* Skill chip selector (used in Culture step) */
.skill-chip-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 6px;
}
.skill-chip {
  font-family: var(--mono); font-size: 0.625rem; padding: 9px 10px;
  background: var(--bg-2); border: 1px solid var(--line-2); color: var(--ink-2);
  cursor: pointer; letter-spacing: 0.14em; text-transform: uppercase;
  transition: border-color .12s, color .12s, background .12s;
  text-align: left;
}
.skill-chip:hover { border-color: var(--line-strong); color: var(--ink); }
.skill-chip.on {
  border-color: var(--gold); color: var(--ink);
  background: linear-gradient(180deg, rgba(212,169,69,0.16), var(--bg-2));
  box-shadow: 0 0 12px var(--gold-glow);
}
.skill-chip.blocked {
  opacity: 0.4; cursor: not-allowed; text-decoration: line-through;
}
.skill-chip.blocked:hover { border-color: var(--line-2); color: var(--ink-2); }
.quick-pick-btn {
  font-family: var(--mono); font-size: 0.625rem; padding: 3px 8px;
  background: transparent; border: 1px solid var(--gold-deep); color: var(--gold-2);
  cursor: pointer; letter-spacing: 0.16em; text-transform: uppercase; margin-left: 4px;
}
.quick-pick-btn:hover { border-color: var(--gold); color: var(--ink); }

/* ───────── Roster / Wizard / Play page-level layouts ───────── */

/* Roster */
.roster {
  width: 100%; height: 100%; overflow: auto; position: relative; z-index: 2;
}
.roster-inner {
  max-width: 1240px; margin: 0 auto; padding: 60px 40px 80px;
}
.roster-hero {
  text-align: center; padding: 40px 0 28px; position: relative;
}
.roster-hero .glyphs-top { margin-bottom: 18px; }
.roster-hero h1 {
  font-family: var(--display); font-weight: 700; font-size: 4rem;
  letter-spacing: 0.12em; line-height: 0.95; margin: 0; color: var(--ink);
  text-shadow: 0 0 30px rgba(212,169,69,0.15);
}
.roster-hero .sub {
  font-family: var(--hand); font-style: italic; font-size: 1.375rem;
  color: var(--gold-2); margin-top: 14px; letter-spacing: 0.05em;
}
.roster-hero .meta {
  font-family: var(--mono); font-size: 0.625rem; color: var(--ink-3);
  letter-spacing: 0.32em; text-transform: uppercase; margin-top: 18px;
}
.roster-section-title {
  display: flex; align-items: center; justify-content: space-between;
  margin: 40px 0 18px;
}
.roster-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 18px;
}
/* Empty-state block, sat beside the "Forge a New Hero" card. Spans 2 tracks
   rather than all of them so it shares row 1 with that card instead of being
   pushed below it; the phone tier switches to 1 / -1 (see Responsive). */
.roster-empty {
  grid-column: span 2;
  border: 1px dashed var(--line-2); padding: 40px 24px; text-align: center;
  min-height: 230px; display: grid; place-items: center;
}
.hero-card {
  border: 1px solid var(--line-2); background: var(--bg-1);
  padding: 0; position: relative; overflow: hidden; cursor: pointer;
  transition: all .2s; min-height: 230px; display: flex; flex-direction: column;
}
.hero-card:hover { border-color: var(--gold); transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.4), 0 0 24px rgba(212,169,69,0.12); }
.hero-card .hc-img {
  height: 130px; background-size: cover; background-position: center;
  position: relative;
}
.hero-card .hc-img::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(12,19,48,0.2) 0%, var(--bg-1) 100%);
}
.hero-card .hc-body { padding: 14px 18px 16px; }
.hero-card .hc-name {
  font-family: var(--display); font-size: 1.375rem; letter-spacing: 0.06em; color: var(--ink);
}
.hero-card .hc-meta {
  font-family: var(--mono); font-size: 0.625rem; color: var(--ink-3);
  letter-spacing: 0.18em; text-transform: uppercase; margin-top: 4px;
}
.hero-card .hc-lvl {
  position: absolute; top: 10px; right: 12px;
  font-family: var(--display); font-size: 0.6875rem; letter-spacing: 0.22em; color: var(--gold);
  background: rgba(12,19,48,0.85); border: 1px solid var(--gold); padding: 4px 10px;
}
.hero-card .hc-bottom {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 16px; border-top: 1px solid var(--line);
  font-family: var(--mono); font-size: 0.625rem; color: var(--ink-3); letter-spacing: 0.16em;
}
.hero-card .hc-bottom .hc-del {
  background: transparent; border: none; color: var(--ink-3); cursor: pointer;
  font-family: var(--mono); font-size: 0.6875rem; padding: 4px 6px;
  position: relative;
}
/* Touch target without changing the visual size. */
.hero-card .hc-bottom .hc-del::after { content: ''; position: absolute; inset: -9px; }
.hero-card .hc-bottom .hc-del:hover { color: var(--rubric-2); }
.hero-card.hc-new {
  display: grid; place-items: center; min-height: 230px;
  border: 2px dashed var(--line-2); background: transparent;
  text-align: center; padding: 22px;
}
.hero-card.hc-new:hover { border-color: var(--gold); border-style: solid; background: rgba(212,169,69,0.04); }
.hero-card.hc-new .nm { font-family: var(--display); font-size: 1.125rem; letter-spacing: 0.18em; color: var(--gold-2); margin-top: 14px; }
.hero-card.hc-new .sub { font-family: var(--mono); font-size: 0.625rem; color: var(--ink-3); letter-spacing: 0.18em; margin-top: 6px; text-transform: uppercase; }
.hero-card.hc-new .cross {
  width: 48px; height: 48px; border: 1px solid var(--gold); color: var(--gold);
  display: grid; place-items: center; font-family: var(--display); font-size: 1.625rem;
}

/* Wizard */
.wiz {
  position: relative; z-index: 2; width: 100%; height: 100%;
  display: grid; grid-template-rows: auto auto 1fr auto; overflow: hidden;
  /* Grid children default to min-width:auto, so the topbar's content would
     otherwise widen .wiz past the viewport and get clipped. */
  min-width: 0;
}
.wiz > *, .wiz-topbar > *, .wiz-footer > * { min-width: 0; }
.wiz-topbar {
  display: grid; grid-template-columns: 1fr auto 1fr;
  align-items: center; padding: 16px 36px;
  border-bottom: 1px solid var(--line);
  background: rgba(7,9,28,0.72); backdrop-filter: blur(6px);
  position: relative; z-index: 10;
}
.wiz-topbar .left { display: flex; align-items: center; gap: 14px; }
.wiz-topbar .right { display: flex; gap: 10px; justify-content: flex-end; align-items: center; }
.wiz-topbar .brand-text { font-family: var(--display); font-weight: 700; font-size: 1rem; letter-spacing: 0.28em; color: var(--gold-2); white-space: nowrap; }
.wiz-topbar .brand-sub { font-family: var(--mono); font-size: 0.625rem; color: var(--ink-3); letter-spacing: 0.22em; text-transform: uppercase; margin-top: 2px; white-space: nowrap; }
.wiz-topbar .center {
  font-family: var(--display); font-size: 0.8125rem; letter-spacing: 0.34em; color: var(--gold);
  text-transform: uppercase;
}
/* Two-cell variant (no centre label) used by the wizard shell. */
.wiz-topbar-2 { grid-template-columns: 1fr auto; }

/* 5-up characteristics strip in the wizard preview card. Distinct from play's
   .chars-row, which lives in PLAY_CSS and is not mounted during the wizard. */
.chars-5 { display: grid; grid-template-columns: repeat(5, 1fr); }
.chars-5 .stat-tile .lbl { font-size: 0.5rem; }

/* Key/value rows in the career step. */
.wiz-kv { display: grid; grid-template-columns: 120px 1fr; gap: 4px 12px; align-items: baseline; }

/* Class flavour banner (crest beside prose). The crest is only 60px, so the two
   columns hold up on a phone — just the padding needs to come in. */
.class-banner {
  padding: 20px 24px; display: grid; grid-template-columns: auto 1fr;
  gap: 18px; align-items: center;
}

/* Step rail */
.wiz-rail {
  display: flex; padding: 0 36px; background: rgba(7,9,28,0.7);
  border-bottom: 1px solid var(--line); backdrop-filter: blur(4px);
  position: relative; z-index: 10;
  /* The 7 steps need ~1080px, and .wiz is overflow:hidden, so the rail clips
     rather than scrolls on narrow desktops. Scrollable unconditionally — a
     no-op at widths where the steps already fit. Scrollbar hidden because the
     rail is chrome, not content. */
  overflow-x: auto; overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; scroll-snap-type: x proximity;
}
.wiz-rail::-webkit-scrollbar { display: none; }
.wiz-rail .rstep {
  flex: 1; padding: 14px 8px 12px; border-bottom: 2px solid transparent;
  display: flex; align-items: center; gap: 10px; cursor: pointer;
  transition: all .15s; position: relative;
}
.wiz-rail .rstep + .rstep { border-left: 1px solid var(--line); padding-left: 16px; }
.wiz-rail .rstep:hover { background: rgba(212,169,69,0.04); }
.wiz-rail .rnum {
  font-family: var(--display); font-size: 0.6875rem; font-weight: 600;
  width: 26px; height: 26px; border: 1px solid var(--line-2);
  display: grid; place-items: center; color: var(--ink-3); flex-shrink: 0;
}
.wiz-rail .rname {
  font-family: var(--display-2); font-size: 0.6875rem; color: var(--ink-3);
  letter-spacing: 0.22em; text-transform: uppercase; font-weight: 500; white-space: nowrap;
}
.wiz-rail .rstep.done .rnum { background: var(--gold); border-color: var(--gold); color: var(--bg-0); }
.wiz-rail .rstep.done .rname { color: var(--ink-2); }
.wiz-rail .rstep.visited .rnum { border-color: var(--gold-deep); color: var(--gold-2); background: rgba(176,138,72,0.08); }
.wiz-rail .rstep.visited .rname { color: var(--gold-2); }
.wiz-rail .rstep.active { border-bottom-color: var(--gold); background: linear-gradient(180deg, transparent, rgba(212,169,69,0.10)); }
.wiz-rail .rstep.active .rnum { border-color: var(--gold); color: var(--gold); }
.wiz-rail .rstep.active .rname { color: var(--ink); }

/* Step body */
.wiz-step {
  display: block; min-height: 0; overflow: auto;
  position: relative;
}
.wiz-step .step-bg {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-size: cover; background-position: center top; opacity: 0.8;
}
.wiz-step .step-bg::after {
  content: ''; position: absolute; inset: 0;
  background:
    linear-gradient(180deg,
      rgba(8,8,10, calc(0.72 * var(--surface-alpha))) 0%,
      rgba(8,8,10, calc(0.80 * var(--surface-alpha))) 50%,
      rgba(8,8,10, calc(0.92 * var(--surface-alpha))) 90%,
      var(--bg-0) 100%);
}
.wiz-step .col-main {
  position: relative; z-index: 2;
  max-width: 1180px; margin: 0 auto;
  padding: 36px 44px 0;
}

.wiz-header { margin-bottom: 22px; }
.wiz-header .deck { margin-top: 10px; max-width: none; }

/* Footer */
.wiz-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 36px; border-top: 1px solid var(--line);
  background: rgba(7,9,28,0.85); backdrop-filter: blur(6px);
  position: relative; z-index: 5;
}
.wiz-footer .meta { font-family: var(--mono); font-size: 0.6875rem; color: var(--ink-3); letter-spacing: 0.22em; text-transform: uppercase; }

/* Point-buy characteristic picker */
.pb-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.pb-stat {
  border: 2px double var(--line); background: linear-gradient(180deg, var(--bg-2), var(--bg-1));
  padding: 14px 10px 12px; text-align: center; position: relative;
}
.pb-stat.fixed { border-color: var(--gold); box-shadow: inset 0 0 0 1px rgba(212,169,69,0.12); }
.pb-key { font-family: var(--mono); font-size: 0.625rem; color: var(--ink-3); letter-spacing: 0.18em; text-transform: uppercase; }
.pb-controls { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 8px; }
.pb-val { font-family: var(--display); font-size: 1.625rem; font-weight: 600; min-width: 44px; }
.pb-btn {
  width: 30px; height: 30px; flex: none; cursor: pointer;
  font-family: var(--display); font-size: 1.125rem; line-height: 1; color: var(--ink);
  background: transparent; border: 1px solid var(--line-2); border-radius: 2px;
  transition: border-color .12s, color .12s, box-shadow .12s, opacity .12s;
}
.pb-btn:hover:not(:disabled) { color: var(--gold-2); border-color: var(--gold); box-shadow: 0 0 10px var(--gold-glow); }
.pb-btn:disabled { opacity: 0.25; cursor: not-allowed; }
.pb-stat.fixed .pb-btn { display: none; }
.pb-lock { font-family: var(--mono); font-size: 0.5rem; color: var(--gold-2); letter-spacing: 0.22em; margin-top: 6px; }
.pb-reset {
  font-family: var(--mono); font-size: 0.5625rem; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--ink-3); background: transparent; border: 1px solid var(--line-2);
  border-radius: 2px; padding: 5px 10px; cursor: pointer; transition: color .12s, border-color .12s;
}
.pb-reset:hover { color: var(--gold-2); border-color: var(--gold); }
@media (max-width: 720px) { .pb-grid { grid-template-columns: repeat(3, 1fr); } }

/* Prayer / Ward picker */
.pw-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.pw-opt {
  border: 1px solid var(--line-2); background: rgba(255,255,255,0.015);
  padding: 9px 12px; cursor: pointer; transition: border-color .12s, box-shadow .12s, background .12s;
}
.pw-opt:hover { border-color: var(--gold); }
.pw-opt.selected { border-color: var(--gold); background: rgba(212,169,69,0.07); box-shadow: inset 0 0 0 1px var(--gold), 0 0 10px var(--gold-glow); }
.pw-name { font-family: var(--display-2); font-size: 0.8125rem; font-weight: 700; letter-spacing: 0.08em; color: var(--ink); }
.pw-text { font-family: var(--serif); font-size: 0.78125rem; color: var(--ink-2); line-height: 1.45; margin-top: 3px; }
@media (max-width: 560px) { .pw-grid { grid-template-columns: 1fr; } }

/* Grid (cards listing) */
.grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.stack { display: flex; flex-direction: column; }
.stack-8 > * + * { margin-top: 8px; }
.stack-12 > * + * { margin-top: 12px; }
.stack-16 > * + * { margin-top: 16px; }
.stack-22 > * + * { margin-top: 22px; }
.stack-32 > * + * { margin-top: 32px; }
.row { display: flex; }
.row-8 > * + * { margin-left: 8px; }
.row-12 > * + * { margin-left: 12px; }

/* Stat tile */
.stat-tile {
  background: var(--surface-vital); border: 1px solid var(--line-2);
  padding: 10px 12px;
}
.stat-tile .lbl { font-family: var(--mono); font-size: 0.5625rem; color: var(--ink-3); letter-spacing: 0.22em; text-transform: uppercase; }
.stat-tile .val { font-family: var(--display); font-size: 1.375rem; color: var(--ink); margin-top: 4px; font-weight: 600; }
.stat-tile .val .sub { font-family: var(--mono); font-size: 0.625rem; color: var(--ink-3); font-weight: 400; margin-left: 3px; }
.stat-tile.gold { border-color: var(--gold); }
.stat-tile.gold .val { color: var(--gold-2); }

/* Char preview side card */
.preview-portrait {
  height: 180px; background-size: cover; background-position: center;
  border: 1px solid var(--gold); position: relative;
  background-color: var(--bg-2);
}
.preview-portrait::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgba(12,19,48,0.95) 100%);
}
.preview-portrait .pp-name {
  position: absolute; bottom: 10px; left: 14px; right: 14px;
  font-family: var(--display); font-size: 1.25rem; letter-spacing: 0.08em; color: var(--ink);
  z-index: 2;
}
.preview-portrait .pp-meta {
  position: absolute; top: 10px; left: 14px;
  font-family: var(--mono); font-size: 0.5625rem; color: var(--gold-2);
  letter-spacing: 0.22em; text-transform: uppercase; z-index: 2;
  background: rgba(7,9,28,0.8); border: 1px solid var(--gold); padding: 3px 8px;
}
.preview-portrait.empty {
  background-image: linear-gradient(135deg, var(--bg-2), var(--bg-3));
  display: grid; place-items: center;
}
.preview-portrait.empty::before {
  content: '✠'; font-family: var(--display); font-size: 3.75rem; color: var(--gold); opacity: 0.3;
}

/* Portrait uploader (Identity step) */
.portrait-uploader {
  display: grid; grid-template-columns: 200px 1fr; gap: 22px; align-items: stretch;
}
.portrait-drop {
  position: relative;
  aspect-ratio: 3 / 4;
  border: 1px dashed var(--gold);
  background: linear-gradient(135deg, var(--bg-2), var(--bg-3));
  display: grid; place-items: center;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 120ms, background 120ms;
}
.portrait-drop:hover { border-color: var(--gold-2); border-style: solid; }
.portrait-drop.has-image { border-style: solid; background: var(--bg-1); }
.portrait-drop.dragover { border-color: var(--gold-2); background: var(--bg-1); }
.portrait-drop img {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover; object-position: center top;
}
.portrait-drop .portrait-empty {
  text-align: center;
  font-family: var(--mono); font-size: 0.625rem;
  color: var(--ink-3); letter-spacing: 0.22em; text-transform: uppercase;
  padding: 0 14px;
}
.portrait-drop .portrait-empty .glyph {
  font-family: var(--display); font-size: 3rem;
  color: var(--gold); opacity: 0.45;
  display: block; margin-bottom: 10px;
}
.portrait-drop .portrait-overlay {
  position: absolute; inset: auto 0 0 0;
  padding: 8px 10px;
  background: linear-gradient(180deg, transparent, rgba(7,9,28,0.92));
  font-family: var(--mono); font-size: 0.5625rem;
  color: var(--gold-2); letter-spacing: 0.2em; text-transform: uppercase;
  text-align: center;
  opacity: 0; transition: opacity 120ms;
  pointer-events: none;
}
.portrait-drop:hover .portrait-overlay { opacity: 1; }
.portrait-actions {
  display: flex; gap: 8px; margin-top: 10px;
}
.portrait-clear {
  font-family: var(--mono); font-size: 0.625rem;
  color: var(--ink-3); letter-spacing: 0.2em; text-transform: uppercase;
  background: transparent; border: 1px solid var(--line-2);
  padding: 6px 12px; cursor: pointer;
}
.portrait-clear:hover { color: var(--rubric-2); border-color: var(--rubric-2); }

/* Review portrait — circular medallion in the review header */
.review-portrait {
  width: 140px; aspect-ratio: 3 / 4;
  border: 1px solid var(--gold);
  background: linear-gradient(135deg, var(--bg-2), var(--bg-3));
  margin: 0 auto 14px;
  position: relative;
  overflow: hidden;
}
.review-portrait img {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover; object-position: center top;
}
.review-portrait .review-portrait-empty {
  position: absolute; inset: 0;
  display: grid; place-items: center;
  font-family: var(--display); font-size: 3.5rem;
  color: var(--gold); opacity: 0.35;
}

/* Modal */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(7,9,28,0.86); backdrop-filter: blur(4px);
  z-index: 100; display: grid; place-items: center; padding: 40px;
}
.modal {
  background: linear-gradient(180deg, var(--bg-1), var(--bg-0));
  border: 1px solid var(--gold);
  width: 100%; max-width: var(--modal-w, 720px);
  max-height: 90vh; max-height: 90dvh; overflow-y: auto;
  position: relative;
  box-shadow: 0 0 60px rgba(212,169,69,0.25), 0 0 0 1px rgba(212,169,69,0.2);
}
.modal::before, .modal::after {
  content: ''; position: absolute; width: 16px; height: 16px;
  border: 1px solid var(--gold); transform: rotate(45deg); background: var(--bg-1);
}
.modal::before { top: -9px; left: 50%; margin-left: -8px; }
.modal::after  { bottom: -9px; left: 50%; margin-left: -8px; }
.modal-head {
  padding: 24px 32px 16px;
  border-bottom: 1px solid var(--line);
  text-align: center;
}
.modal-body { padding: 22px 32px; }
.modal-foot { padding: 18px 32px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; }

/* Ability card */
.ability-card {
  border: 2px double var(--line-2);
  background: linear-gradient(180deg, var(--bg-2), var(--bg-1));
  padding: 14px 16px; position: relative;
}
.ability-card.sig { border-color: var(--gold); background: linear-gradient(180deg, rgba(212,169,69,0.08), var(--bg-1)); }
.ability-card.heroic { border-color: var(--rubric); background: linear-gradient(180deg, rgba(193,74,58,0.05), var(--bg-1)); }
.ability-card .ac-row {
  display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
}
.ability-card .ac-name {
  font-family: var(--display-2); font-size: 0.9375rem; font-weight: 700; letter-spacing: 0.12em;
  color: var(--ink); text-transform: uppercase;
}
.ability-card .ac-cost {
  font-family: var(--display); font-size: 0.6875rem; color: var(--rubric-2); letter-spacing: 0.18em;
}
.ability-card .ac-row .ac-name { min-width: 0; }
.ac-tags {
  display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end;
}
.ac-action {
  font-family: var(--mono); font-size: 0.53125rem; font-weight: 600;
  letter-spacing: 0.14em; text-transform: uppercase; white-space: nowrap;
  padding: 2px 7px; border: 1px solid currentColor; border-radius: 999px;
}
.ac-action.act-main      { color: oklch(0.68 0.13 35); }   /* main action — rubric/red */
.ac-action.act-maneuver  { color: oklch(0.74 0.11 85); }   /* maneuver — gold */
.ac-action.act-triggered { color: oklch(0.70 0.10 230); }  /* triggered — cool blue */
.ac-action.act-free      { color: oklch(0.72 0.11 150); }  /* free — green */
.ac-action.act-other     { color: var(--ink-3); }
.ability-card .ac-keywords {
  font-family: var(--mono); font-size: 0.5625rem; color: var(--ink-3);
  letter-spacing: 0.18em; text-transform: uppercase; margin-top: 4px;
}
.ability-card .ac-flavor {
  font-family: var(--hand); font-style: italic; font-size: 0.8125rem;
  color: var(--ink-2); margin: 8px 0; line-height: 1.4;
}
.ability-card .ac-meta {
  font-family: var(--mono); font-size: 0.625rem; color: var(--ink-3);
  display: grid; grid-template-columns: auto auto; gap: 4px 14px; margin-top: 6px;
  letter-spacing: 0.12em;
}
.ability-card .ac-meta b { color: var(--ink-2); font-weight: 500; }
.ability-card .ac-roll {
  margin-top: 10px; border-top: 1px dashed var(--line-2); padding-top: 10px;
  display: grid; grid-template-columns: 38px 1fr; gap: 6px 10px;
  font-family: var(--mono); font-size: 0.6875rem;
}
.ability-card .ac-roll .t { color: var(--gold); }
.ability-card .ac-roll .e { color: var(--ink); }
/* Tier color coding: 1 = weakest (≤11), 2 = solid (12–16), 3 = critical (17+) */
.ability-card .ac-roll .t.tier-1 { color: oklch(0.62 0.11 35); }
.ability-card .ac-roll .e.tier-1 { color: oklch(0.74 0.05 40); }
.ability-card .ac-roll .t.tier-2 { color: oklch(0.74 0.10 85); }
.ability-card .ac-roll .e.tier-2 { color: oklch(0.86 0.04 85); }
.ability-card .ac-roll .t.tier-3 { color: oklch(0.72 0.13 150); }
.ability-card .ac-roll .e.tier-3 { color: oklch(0.84 0.07 150); }
.ability-card .ac-roll .t { font-weight: 700; }
.ability-card .ac-effect {
  margin-top: 10px; font-family: var(--serif); font-size: 0.84375rem; color: var(--ink-2); line-height: 1.5;
}
.ability-card .ac-effect b { color: var(--gold-2); }

/* Kit cards — borrow the ability-card vocabulary so the info reads clearly */
.kit-card .ac-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.kit-card .ac-name {
  font-family: var(--display-2); font-size: 0.9375rem; font-weight: 700; letter-spacing: 0.10em;
  color: var(--ink); text-transform: uppercase; min-width: 0;
}
.kit-card .ac-row .tag { white-space: nowrap; flex-shrink: 0; }
.kit-card .ac-keywords {
  font-family: var(--mono); font-size: 0.5625rem; color: var(--ink-3);
  letter-spacing: 0.16em; text-transform: uppercase; margin-top: 4px;
}
.kit-card .ac-flavor {
  font-size: 0.8125rem; color: var(--ink-2); margin: 8px 0; line-height: 1.45;
}
.kit-card .kit-bonuses { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
.kit-card .kit-stat {
  display: inline-flex; align-items: baseline; gap: 5px;
  padding: 3px 8px; border: 1px solid var(--line-2);
  background: rgba(212,169,69,0.05);
}
.kit-card .kit-stat-v {
  font-family: var(--display-2); font-size: 0.75rem; font-weight: 700;
  color: var(--gold-2); letter-spacing: 0.02em;
}
.kit-card .kit-stat-l {
  font-family: var(--mono); font-size: 0.53125rem; color: var(--ink-3);
  letter-spacing: 0.10em; text-transform: uppercase;
}
.kit-card .kit-sig {
  margin-top: 12px; padding: 10px 12px;
  border: 2px double var(--gold);
  background: linear-gradient(180deg, rgba(212,169,69,0.08), var(--bg-1));
}
.kit-card .kit-sig-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.kit-card .kit-sig-name {
  font-family: var(--display-2); font-size: 0.8125rem; font-weight: 700; letter-spacing: 0.08em;
  color: var(--ink); text-transform: uppercase; min-width: 0;
}
.kit-card .kit-sig-badge {
  font-family: var(--display); font-size: 0.625rem; color: var(--gold-2);
  letter-spacing: 0.16em; text-transform: uppercase; white-space: nowrap; flex-shrink: 0;
}
.kit-card .kit-sig-kw {
  font-family: var(--mono); font-size: 0.5625rem; color: var(--ink-3);
  letter-spacing: 0.16em; text-transform: uppercase; margin-top: 5px;
}
.kit-card .kit-roll {
  margin-top: 9px; display: grid; grid-template-columns: 46px 1fr; gap: 5px 10px;
  font-family: var(--mono); font-size: 0.6875rem;
}
.kit-card .kit-roll .t { font-weight: 700; }
.kit-card .kit-roll .t.tier-1 { color: oklch(0.62 0.11 35); }
.kit-card .kit-roll .e.tier-1 { color: oklch(0.74 0.05 40); }
.kit-card .kit-roll .t.tier-2 { color: oklch(0.74 0.10 85); }
.kit-card .kit-roll .e.tier-2 { color: oklch(0.86 0.04 85); }
.kit-card .kit-roll .t.tier-3 { color: oklch(0.72 0.13 150); }
.kit-card .kit-roll .e.tier-3 { color: oklch(0.84 0.07 150); }
.kit-card .kit-sig-effect {
  margin-top: 9px; font-family: var(--serif); font-size: 0.78125rem; color: var(--ink-2); line-height: 1.5;
}
.kit-card .kit-sig-effect b { color: var(--gold-2); }

/* ══════════════════════ Responsive ══════════════════════
   Co-located deliberately: media queries add no specificity, so these must sit
   in the same stylesheet as the rules they override. See theme/breakpoints.js.
   RELIQUARY_CSS is the only sheet mounted on every screen, so anything shared
   across screens belongs here rather than in a per-screen sheet. */

${MQ.rail} {
  /* The 7-step rail needs ~1080px, so it runs out of room well before the
     tablet tier. Steps stop stretching and the rail scrolls instead. */
  .wiz-rail { padding: 0 16px; }
  .wiz-rail .rstep { flex: 0 0 auto; scroll-snap-align: center; }
}

${MQ.tab} {
  /* Column collapse. .grid-2/3/4 back ~34 call sites across 10 files, so this
     block alone reflows most of the wizard and review screens. */
  .grid-3, .grid-4 { grid-template-columns: repeat(2, 1fr); }

  /* Normalise the type floor: 0.5rem would land under 10.5px from here down.
     Promoting to 0.5625rem keeps every label at ~11px without hardcoding px,
     which would break the all-rem invariant this stylesheet documents. */
  .pb-lock { font-size: 0.5625rem; }

  /* Wide tracking is the third size lever after font-size and padding, and the
     cheapest: ~13% of the width of every label, at no legibility cost. */
  .eyebrow, .h4-meta, .roster-hero .meta, .wiz-topbar .center { letter-spacing: 0.16em; }
  .tag, .pill { letter-spacing: 0.14em; }
  .glyph-row { letter-spacing: 0.2em; }

  .h1-display { font-size: 2.25rem; }
  .roster-hero h1 { font-size: 2.5rem; }
  .drop-cap { font-size: 3.25rem; margin-right: 8px; vertical-align: -8px; }

  .roster-inner { padding: 40px 24px 60px; }
  .wiz-step .col-main { padding: 26px 24px 0; }
  .wiz-topbar, .wiz-footer { padding-left: 22px; padding-right: 22px; }
  .wiz-rail { padding: 0 12px; }

  /* Badge-only rail: 7 numbers plus one active label fit in ~500px, so the rail
     never needs scrolling on a phone. Doing this at the tablet tier rather than
     the phone tier is what makes the CSS-only solution complete. */
  .wiz-rail .rstep .rname { display: none; }
  .wiz-rail .rstep.active .rname { display: block; }
  .wiz-rail .rnum { width: 34px; height: 34px; }
  .wiz-rail .rstep + .rstep { padding-left: 12px; }

  .portrait-uploader { grid-template-columns: 1fr; }
  .modal-backdrop { padding: 24px 20px; }
  .modal-head { padding: 20px 22px 14px; }
  .modal-body { padding: 18px 22px; }
  .modal-foot { padding: 16px 22px; }
  .skill-chip-grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
}

${MQ.phone} {
  .grid-2, .grid-3 { grid-template-columns: 1fr; }
  .grid-4 { grid-template-columns: repeat(2, 1fr); }

  .h1-display { font-size: 1.875rem; }
  /* 2rem would measure ~361px against a 358px content box and overflow. */
  .roster-hero h1 { font-size: 1.75rem; }
  .roster-hero { padding: 24px 0 20px; }
  .roster-hero .sub { font-size: 1.0625rem; }
  .h2-display { font-size: 1.375rem; }
  .drop-cap { font-size: 2.75rem; }
  .deck { font-size: 1rem; }

  .roster-inner { padding: 28px max(16px, env(safe-area-inset-left)) 48px max(16px, env(safe-area-inset-right)); }
  .roster-section-title { margin: 28px 0 14px; }
  .wiz-step .col-main { padding: 20px 16px 0; }
  .wiz-topbar { grid-template-columns: 1fr auto; padding: 12px 14px; }
  .wiz-topbar .center { display: none; }
  .wiz-topbar .right { flex-wrap: wrap; justify-content: flex-end; }
  /* The SAVED pill restates what the app already shows; drop it before the
     ROSTER button, which is the only way out of the wizard. */
  .wiz-topbar .right .pill { display: none; }
  .wiz-topbar .brand-text, .wiz-topbar .left > div > div:last-child { font-size: 0.625rem; }
  .wiz-footer { padding: 14px; padding-bottom: calc(14px + env(safe-area-inset-bottom)); }
  .wiz-footer .meta { display: none; }

  /* The empty-state block spans 2 tracks on desktop. Once only one track fits,
     spanning 2 would create an implicit second column and overflow sideways. */
  .roster-empty { grid-column: 1 / -1; }

  /* Stays >=12px of padding so the modal's ::before/::after diamonds, which sit
     at -9px, are not clipped by the backdrop edge. */
  .modal-backdrop { padding: 16px 12px; }
  .modal { max-width: none; }
  .modal-head { padding: 18px 18px 12px; }
  .modal-body { padding: 16px 18px; }
  .modal-foot { padding: 14px 18px; flex-wrap: wrap; gap: 10px; }

  /* Card-internal key/value grids: two auto columns squeeze the value to nothing. */
  .ability-card .ac-meta { grid-template-columns: 1fr; gap: 2px; }
  .ac-roll { grid-template-columns: 1fr; gap: 2px; }
  .ac-roll .t { margin-top: 4px; }
  .kit-card .kit-roll { grid-template-columns: 1fr; gap: 2px; }
  .ability-card .ac-row { flex-wrap: wrap; gap: 6px; }

  /* 5 point-buy stats over 2 rows; the odd one out spans the full width. */
  .pb-grid { grid-template-columns: repeat(2, 1fr); }
  .pb-grid .pb-stat:nth-child(5) { grid-column: 1 / -1; }

  .review-portrait { width: 116px; }
  .preview-portrait { height: 150px; }
  .chars-5 { grid-template-columns: repeat(3, 1fr); }
  .wiz-kv { grid-template-columns: 1fr; gap: 2px 0; }
  .class-banner { padding: 14px 16px; gap: 12px; }

  /* Touch targets. 44px is the platform minimum; these all sit well under it. */
  .btn, .btn.small { min-height: 44px; }
  .icon-btn { width: 44px; height: 44px; }
  .skill-chip { min-height: 44px; }
  .quick-pick-btn, .pb-reset { min-height: 40px; padding-left: 12px; padding-right: 12px; }
  .pb-btn { width: 40px; height: 40px; }
  .input-text, .input-area, .input-select { padding: 13px 14px; }
}

/* Scroll containment: without this, reaching the end of an inner scroller hands
   the gesture to the page behind it. */
.roster, .wiz-step, .modal { overscroll-behavior: contain; }

${MQ.touch} {
  /* Hover-only reveals that are the ONLY cue for a real action. A capability
     query rather than a width one, so touch laptops get them too. */
  .portrait-drop .portrait-overlay { opacity: 1; }
  /* A disabled skill chip explains itself only through title=, which touch users
     never see. :has() targets exactly the grids that actually contain one, so no
     hint appears where nothing is blocked. Desktop keeps the per-chip tooltips,
     which are more specific than this general line. */
  .skill-chip-grid:has(.skill-chip.blocked, .skill-chip.auto)::after {
    content: 'Dimmed skills are already granted by another choice, or the pick is full.';
    grid-column: 1 / -1;
    font-family: var(--mono); font-size: 0.5625rem; color: var(--ink-3);
    letter-spacing: 0.1em; line-height: 1.5; margin-top: 2px; text-transform: none;
  }

  /* iOS keeps :hover applied after a tap until you tap elsewhere, so a lift
     transform sticks. Colour changes latch too but read as a selection hint;
     movement reads as a bug. Reset rather than relocate, so rule order is
     untouched — this block is last, and the selectors match exactly. */
  .hero-card:hover { transform: none; box-shadow: none; }
}
`;

// Render <style> tag once
const ThemeStyles = () => React.createElement('style', {}, RELIQUARY_CSS);

// ───────── UI primitives ─────────

export { RELIQUARY_CSS, ThemeStyles };
