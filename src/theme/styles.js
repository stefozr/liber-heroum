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
  --grad-masthead:   linear-gradient(100deg, rgba(7,9,28, calc(0.85 * var(--surface-alpha))), rgba(7,9,28,0.35));
  --tint-accent:     rgba(212,169,69,0.06);
  --selection-bg:    rgba(212,169,69,0.4);
  /* Component surfaces. Every themed gradient/shadow lives here as a whole-value
     token (Obsidian overrides the token, never the component rule) so a new
     component can't silently miss the theme. */
  --grad-frame:      linear-gradient(180deg, rgba(20,28,62,0.92), rgba(12,19,48,0.92));
  --shadow-frame:    inset 0 0 0 4px rgba(212,169,69,0.08), 0 0 0 1px rgba(212,169,69,0.15);
  --grad-card:       linear-gradient(180deg, var(--bg-2), var(--bg-1));
  --grad-card-hover: linear-gradient(180deg, var(--bg-3), var(--bg-2));
  --grad-card-sel:   linear-gradient(180deg, rgba(212,169,69,0.13), var(--bg-2));
  --shadow-card-sel: 0 0 24px rgba(212,169,69,0.18), inset 0 0 0 1px rgba(212,169,69,0.2);
  --surface-input:   var(--bg-1);
  --surface-backdrop: rgba(7,9,28,0.86);
  --grad-modal:      linear-gradient(180deg, var(--bg-1), var(--bg-0));
  --grad-dropcap:    linear-gradient(180deg, rgba(212,169,69,0.10), rgba(193,74,58,0.06));
  --shadow-dropcap:  0 0 22px rgba(193,74,58,0.35);
  --orn-line-alpha:  0.7;
  --orn-glyph-alpha: 0.9;
  --glyph-row-alpha: 0.55;
  --grad-paper:
    radial-gradient(60% 40% at 50% 0%, rgba(212,169,69,0.10), transparent 60%),
    radial-gradient(40% 30% at 0% 100%, rgba(193,74,58,0.06), transparent 60%),
    radial-gradient(40% 30% at 100% 100%, rgba(80,120,184,0.08), transparent 60%);
  --grad-grain:      repeating-linear-gradient(45deg, rgba(212,169,69,0.015) 0 2px, transparent 2px 14px);
  --grain-alpha:     0.4;
  /* Power-roll tier ramp (1 = weakest ≤11, 2 = solid 12–16, 3 = critical 17+).
     -t is the tier badge, -e the effect text. Theme-invariant. */
  --tier1-t: oklch(0.62 0.11 35);
  --tier1-e: oklch(0.74 0.05 40);
  --tier2-t: oklch(0.74 0.10 85);
  --tier2-e: oklch(0.86 0.04 85);
  --tier3-t: oklch(0.72 0.13 150);
  --tier3-e: oklch(0.84 0.07 150);
  /* Dark ink on the gold primary-button gradient. Theme-invariant. */
  --btn-primary-ink: #1a120a;
  --btn-primary-ink-hover: #0b0e1f;
  /* Type scale — a 16ths-of-a-rem ladder covering every text size at or below
     1rem. Display sizes above 1rem are art-directed one-offs and stay literal.
     Spacing has no token scale, but new spacing values should land on the 4pt grid. */
  --fs-1: 0.5rem;
  --fs-2: 0.5625rem;
  --fs-3: 0.625rem;
  --fs-4: 0.6875rem;
  --fs-5: 0.75rem;
  --fs-6: 0.8125rem;
  --fs-7: 0.875rem;
  --fs-8: 0.9375rem;
  --fs-9: 1rem;
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
  --surface-top:     rgba(14,14,18, calc(0.82 * var(--surface-alpha)));
  --surface-panel:   rgba(14,14,18, calc(0.74 * var(--surface-alpha)));
  --surface-vital:   rgba(20,20,26, calc(0.80 * var(--surface-alpha)));
  --surface-counter: rgba(20,20,26, calc(0.74 * var(--surface-alpha)));
  --grad-masthead:   linear-gradient(100deg, rgba(8,8,10, calc(0.92 * var(--surface-alpha))), rgba(8,8,10,0.35));
  --tint-accent:     rgba(176,138,72,0.05);
  --selection-bg:    rgba(176,138,72,0.4);
  /* Obsidian surfaces multiply through --surface-alpha so backgrounds show
     through (the alpha slider lives in the dev-only Tweaks panel). */
  --grad-frame:      linear-gradient(180deg, rgba(20,20,26, calc(0.78 * var(--surface-alpha))), rgba(14,14,18, calc(0.84 * var(--surface-alpha))));
  --shadow-frame:    inset 0 0 0 4px rgba(176,138,72,0.06), 0 0 0 1px rgba(176,138,72,0.12);
  --grad-card:       linear-gradient(180deg, rgba(20,20,26, calc(0.94 * var(--surface-alpha))), rgba(14,14,18, calc(0.97 * var(--surface-alpha))));
  --grad-card-hover: linear-gradient(180deg, rgba(28,28,36, calc(0.96 * var(--surface-alpha))), rgba(20,20,26, calc(0.98 * var(--surface-alpha))));
  --grad-card-sel:   linear-gradient(180deg, rgba(176,138,72,0.18), rgba(20,20,26, calc(0.97 * var(--surface-alpha))));
  --shadow-card-sel: 0 0 22px rgba(176,138,72,0.16), inset 0 0 0 1px rgba(176,138,72,0.18);
  --surface-input:   rgba(14,14,18, calc(0.72 * var(--surface-alpha)));
  --surface-backdrop: rgba(8,8,10, calc(0.86 * var(--surface-alpha)));
  --grad-modal:      linear-gradient(180deg, rgba(20,20,26, calc(0.95 * var(--surface-alpha))), rgba(8,8,10, calc(0.95 * var(--surface-alpha))));
  --grad-dropcap:    linear-gradient(180deg, rgba(176,138,72,0.08), rgba(138,58,48,0.04));
  --shadow-dropcap:  0 0 22px rgba(138,58,48,0.30);
  --orn-line-alpha:  0.45;
  --orn-glyph-alpha: 0.65;
  --glyph-row-alpha: 0.40;
  --grad-paper:
    radial-gradient(60% 40% at 50% 0%, rgba(176,138,72,0.06), transparent 60%),
    radial-gradient(40% 30% at 0% 100%, rgba(138,58,48,0.03), transparent 60%),
    radial-gradient(40% 30% at 100% 100%, rgba(176,138,72,0.04), transparent 60%);
  --grad-grain:      repeating-linear-gradient(45deg, rgba(176,138,72,0.012) 0 2px, transparent 2px 14px);
  --grain-alpha:     0.25;
}

/* Page behind the app — themed here; index.html carries #08080a/#ece4d2 literals
   only as the pre-CSS-mount fallback (they equal Obsidian's --bg-0/--ink).
   body, not html: the data-theme attribute lives on <body>, so only body's
   var(--bg-0) sees the theme override. html stays transparent (index.html keeps
   it that way too) and body's background propagates to the page canvas. */
body { background: var(--bg-0); color: var(--ink); }
body { -webkit-tap-highlight-color: rgba(212,169,69,0.15); }
/* tap-highlight can't reliably read var() on older Android WebViews — literal per theme. */
body[data-theme="obsidian"] { -webkit-tap-highlight-color: rgba(176,138,72,0.15); }
::selection { background: var(--selection-bg); color: #fff; }

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
  background-image: var(--grad-paper);
}
.app .bg-grain {
  position: fixed; inset: 0; pointer-events: none; z-index: 1; opacity: var(--grain-alpha);
  background-image: var(--grad-grain);
  mix-blend-mode: screen;
}

/* ───────── Ornate borders ───────── */
.orn-frame {
  position: relative;
  border: 1px solid var(--gold);
  background: var(--grad-frame);
  box-shadow: var(--shadow-frame);
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
  opacity: var(--orn-line-alpha);
}
.orn-divider .glyph { font-family: var(--display); color: var(--gold); font-size: var(--fs-7); opacity: var(--orn-glyph-alpha); letter-spacing: 0.25em; }
.orn-divider.small .glyph { font-size: var(--fs-4); }
.orn-divider.large .glyph { font-size: 1.125rem; }

/* Glyph row (decorative) */
.glyph-row {
  font-family: var(--display); color: var(--gold);
  letter-spacing: 0.4em; font-size: var(--fs-5); opacity: var(--glyph-row-alpha);
}

/* ───────── Buttons ───────── */
.btn {
  font-family: var(--display-2); font-weight: 600; font-size: var(--fs-5);
  letter-spacing: 0.22em; text-transform: uppercase;
  padding: 13px 22px; background: transparent;
  border: 1px solid var(--line-strong);
  color: var(--ink-2); cursor: pointer;
  transition: border-color .15s, color .15s, background .15s, opacity .15s; position: relative;
  display: inline-flex; align-items: center; gap: 10px;
}
.btn:hover { border-color: var(--gold); color: var(--ink); background: rgba(212,169,69,0.06); }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn.primary {
  background: linear-gradient(180deg, var(--gold-2), var(--gold-deep));
  border-color: var(--gold-2);
  color: var(--btn-primary-ink); font-weight: 700;
  box-shadow: 0 0 22px var(--gold-glow), inset 0 1px 0 rgba(255,255,255,0.25);
}
.btn.primary:hover { background: linear-gradient(180deg, #f0d480, #b8932f); color: var(--btn-primary-ink-hover); }
/* Filled tint, not a bare outline: a destructive action must carry more visual
   weight than the Cancel beside it. */
.btn.danger {
  border-color: var(--rubric); color: var(--rubric-2);
  background: linear-gradient(180deg, rgba(193,74,58,0.22), rgba(193,74,58,0.10));
}
.btn.danger:hover { border-color: var(--rubric-2); background: linear-gradient(180deg, rgba(193,74,58,0.32), rgba(193,74,58,0.16)); color: #f0d9d3; }
.btn.ghost { border-color: var(--line); }
.btn.small { padding: 8px 14px; font-size: var(--fs-3); letter-spacing: 0.18em; }

.icon-btn {
  width: 36px; height: 36px; border: 1px solid var(--line-2); background: transparent;
  color: var(--ink-2); cursor: pointer; display: grid; place-items: center;
  font-family: var(--display); font-size: var(--fs-7);
}
.icon-btn:hover { border-color: var(--gold); color: var(--ink); }

/* ───────── Pills / Tags ───────── */
.pill {
  font-family: var(--mono); font-size: var(--fs-3); padding: 6px 11px;
  border: 1px solid var(--line-2); color: var(--ink-2);
  letter-spacing: 0.18em; text-transform: uppercase; white-space: nowrap;
  display: inline-flex; align-items: center; gap: 8px;
}
.pill.live::before { content:''; width:6px; height:6px; border-radius:50%; background:var(--gold); box-shadow:0 0 8px var(--gold); }
.pill.muted { color: var(--ink-3); }
.pill.gold { border-color: var(--gold); color: var(--gold-2); }
.pill.rubric { border-color: var(--rubric); color: var(--rubric-2); }

.tag {
  font-family: var(--mono); font-size: var(--fs-2); padding: 3px 8px;
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
.crest.small { width: 32px; height: 32px; font-size: var(--fs-9); }
.crest.rubric { border-color: var(--rubric); color: var(--rubric); }
.crest.rubric::before, .crest.rubric::after { border-color: var(--rubric); }
.crest.portrait { background: var(--bg-2); overflow: hidden; }
.crest.portrait img {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; object-position: center top;
}

/* ───────── Cards ───────── */
/* Native <button> rendering an interactive card/row/rail-step. Placed BEFORE
   the component classes so their border/background/padding win the
   equal-specificity cascade. Real buttons give keyboard access (Tab, Enter,
   Space, disabled) that the old onClick divs never had. */
.card-btn {
  appearance: none; -webkit-appearance: none;
  background: none; border: 0; margin: 0; padding: 0; border-radius: 0;
  font: inherit; color: inherit; letter-spacing: inherit; line-height: inherit;
  text-align: inherit; width: 100%; display: block; cursor: pointer;
}

.card {
  border: 2px double var(--line);
  background: var(--grad-card);
  padding: 16px 18px; position: relative;
  transition: border-color .15s, background .15s, box-shadow .15s, opacity .15s; cursor: pointer;
  /* Pairs with the minmax(0, …) tracks below: the grid no longer grows to fit a
     stubborn card, so the card itself has to be allowed to shrink. */
  min-width: 0;
}
.card:hover { border-color: var(--gold-deep); background: var(--grad-card-hover); }
.card.selected {
  border-color: var(--gold);
  background: var(--grad-card-sel);
  box-shadow: var(--shadow-card-sel);
}
.card.selected::after {
  content: '✠'; position: absolute; top: 6px; right: 10px;
  font-family: var(--display); color: var(--rubric); font-size: var(--fs-7);
}
.card .c-stamp {
  position: absolute; top: 6px; right: 10px;
  font-family: var(--display); color: var(--gold); font-size: var(--fs-4); opacity: 0.4;
}
.card.selected .c-stamp { display: none; }
.card.blocked { opacity: 0.4; cursor: not-allowed; }
.card.blocked:hover { border-color: var(--line); background: var(--grad-card); }
/* Group already decided — fade the also-rans, but keep them live: hovering
   restores full strength and clicking switches the pick in one step. */
.card.dimmed { opacity: 0.5; }
.card.dimmed:hover { opacity: 1; }

/* ───────── Header / titles ───────── */
.eyebrow {
  font-family: var(--mono); font-size: var(--fs-3); color: var(--gold);
  letter-spacing: 0.3em; text-transform: uppercase;
}
/* font-variant-ligatures: none — at heading sizes with tight tracking, Cinzel
   Decorative's discretionary ligatures collapse "TH" runs into overlapped glyphs
   ("FROM TH̶E"). Plain letters read cleanly. */
.h1-display {
  font-family: var(--display); font-size: 2.75rem; font-weight: 600;
  letter-spacing: 0.04em; margin: 8px 0 6px; color: var(--ink); line-height: 1; text-wrap: balance;
  font-variant-ligatures: none;
}
.h1-display em { font-style: italic; font-family: var(--serif); font-weight: 500; color: var(--gold-2); }
.h2-display {
  font-family: var(--display); font-size: 1.625rem; font-weight: 600; letter-spacing: 0.06em;
  color: var(--ink); margin: 0;
  font-variant-ligatures: none;
}
.h3-display {
  font-family: var(--display-2); font-size: var(--fs-9); font-weight: 600; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--gold-2); margin: 0;
}
.h4-meta {
  font-family: var(--mono); font-size: var(--fs-3); color: var(--ink-3); letter-spacing: 0.3em;
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
  background: var(--grad-dropcap);
  text-shadow: var(--shadow-dropcap);
  vertical-align: -14px;
}

/* ───────── Form inputs ───────── */
.input-row { display: flex; flex-direction: column; gap: 6px; }
.input-row > label { font-family: var(--mono); font-size: var(--fs-3); color: var(--ink-3); letter-spacing: 0.24em; text-transform: uppercase; }
.input-text, .input-area, .input-select {
  font-family: var(--serif); font-size: var(--fs-8); color: var(--ink);
  padding: 11px 14px; background: var(--surface-input); border: 1px solid var(--line-2);
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
  font-family: var(--mono); font-size: var(--fs-3); padding: 9px 10px;
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
  font-family: var(--mono); font-size: var(--fs-3); padding: 5px 12px;
  background: rgba(212,169,69,0.10); border: 1px solid var(--gold); color: var(--gold-2);
  cursor: pointer; letter-spacing: 0.16em; text-transform: uppercase; margin-left: 4px;
}
.quick-pick-btn:hover { background: rgba(212,169,69,0.18); color: var(--ink); box-shadow: 0 0 12px var(--gold-glow); }

/* ───────── Roster / Wizard / Play page-level layouts ───────── */

/* Roster */
.roster {
  width: 100%; height: 100%; overflow: auto; position: relative; z-index: 2;
}
.roster-inner {
  max-width: 1240px; margin: 0 auto; padding: 40px 40px 80px;
}
.roster-hero {
  text-align: center; padding: 26px 0 20px; position: relative;
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
  font-family: var(--mono); font-size: var(--fs-3); color: var(--ink-3);
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
  transition: border-color .2s, transform .2s, box-shadow .2s, background .2s; min-height: 230px; display: flex; flex-direction: column;
}
.hero-card:hover { border-color: var(--gold); transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.4), 0 0 24px rgba(212,169,69,0.12); }
/* The stretched "open" overlay button; footer actions sit above it at z2. */
.hero-card .hc-open { position: absolute; inset: 0; z-index: 1; width: 100%; height: 100%; }
/* The card is overflow:hidden — pull the ring inside so it isn't clipped. */
.hero-card .hc-open:focus-visible { outline-offset: -3px; }
.hero-card:focus-within { border-color: var(--gold); }
.hero-card .hc-bottom .hc-actions { position: relative; z-index: 2; }
.hero-card .hc-img {
  /* center 20%: portrait art carries faces in the upper band; a dead-center crop
     of a 130px strip cuts them off. */
  height: 130px; background-size: cover; background-position: center 20%;
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
  font-family: var(--mono); font-size: var(--fs-3); color: var(--ink-3);
  letter-spacing: 0.18em; text-transform: uppercase; margin-top: 4px;
}
.hero-card .hc-lvl {
  position: absolute; top: 10px; right: 12px;
  /* --display-2 (plain Cinzel): the decorative face renders "LV 01" as "LV OI". */
  font-family: var(--display-2); font-size: var(--fs-4); letter-spacing: 0.22em; color: var(--gold);
  background: rgba(12,19,48,0.85); border: 1px solid var(--gold); padding: 4px 10px;
}
.hero-card .hc-bottom {
  display: flex; justify-content: space-between; align-items: center; flex-wrap: nowrap; gap: 6px;
  padding: 10px 16px; border-top: 1px solid var(--line);
  font-family: var(--mono); font-size: var(--fs-3); color: var(--ink-3); letter-spacing: 0.12em;
}
/* One line always: when the row runs out of room the status span ellipsizes
   (full text in its title) rather than pushing the actions to a second row. */
.hero-card .hc-bottom > span { min-width: 0; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* 16px gap clears the buttons' -7px horizontal hit-areas (7 + 7 < 16), so the
   touch targets never overlap. */
.hero-card .hc-bottom .hc-actions { display: flex; gap: 16px; align-items: center; flex-shrink: 0; margin-left: auto; }
.hero-card .hc-bottom .hc-del {
  /* Rubric at rest: destructive must not dress like its constructive neighbour. */
  background: transparent; border: none; color: var(--rubric-2); cursor: pointer;
  font-family: var(--mono); font-size: var(--fs-2); letter-spacing: 0.12em; text-transform: uppercase;
  /* No horizontal padding: the label's edge is the flex box edge, so it sits
     exactly on the container's 16px inset, mirroring the status text. */
  padding: 4px 0; white-space: nowrap;
  position: relative;
}
/* Touch target without changing the visual size. */
.hero-card .hc-bottom .hc-del::after { content: ''; position: absolute; inset: -9px -7px; }
.hero-card .hc-bottom .hc-del:hover { text-decoration: underline; text-underline-offset: 3px; }
/* The roster's primary action — dressed as the loudest card on the shelf. */
.hero-card.hc-new {
  display: grid; place-items: center; min-height: 230px;
  border: 2px double var(--gold-deep);
  background: linear-gradient(180deg, rgba(212,169,69,0.07), rgba(212,169,69,0.02));
  text-align: center; padding: 22px;
}
.hero-card.hc-new:hover {
  border-color: var(--gold); background: rgba(212,169,69,0.1);
  box-shadow: 0 8px 30px rgba(0,0,0,0.4), 0 0 28px var(--gold-glow);
}
.hero-card.hc-new .nm { font-family: var(--display); font-size: 1.125rem; letter-spacing: 0.18em; color: var(--gold-2); margin-top: 14px; }
.hero-card.hc-new .sub { font-family: var(--mono); font-size: var(--fs-3); color: var(--ink-3); letter-spacing: 0.18em; margin-top: 6px; text-transform: uppercase; }
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
.wiz > *, .wiz-footer > * { min-width: 0; }
/* ───────── Top bar (shared chrome: appbar / wizard / play — see TopBar) ───────── */
.topbar {
  display: grid; grid-template-columns: auto 1fr auto;
  align-items: center; gap: 18px;
  padding: 12px 28px;
  border-bottom: 1px solid var(--line);
  background: var(--surface-top); backdrop-filter: blur(6px);
  /* Above the per-screen fixed backdrops (.play-bg / .step-bg); dropdown menus
     (z 60) and modals (z 100) still win. */
  position: relative; z-index: 40;
  flex-shrink: 0; min-width: 0;
}
/* Grid/flex children default to min-width:auto, so a nowrap brand/hero line
   would widen its column and ride under the right-side buttons. */
.topbar > * { min-width: 0; }
.tb-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.tb-mark { flex-shrink: 0; }
.tb-mark-box {
  width: 36px; height: 36px; display: grid; place-items: center;
  border: 1px solid var(--gold); color: var(--gold);
  font-family: var(--display); font-size: var(--fs-9);
}
.tb-text { min-width: 0; }
.tb-brand {
  font-family: var(--display); font-weight: 700; font-size: var(--fs-8);
  letter-spacing: 0.26em; color: var(--gold-2);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tb-sub {
  font-family: var(--mono); font-size: var(--fs-3); color: var(--ink-3);
  letter-spacing: 0.2em; text-transform: uppercase; margin-top: 2px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tb-center { display: flex; align-items: center; min-width: 0; }
.tb-right { display: flex; align-items: center; gap: 10px; justify-content: flex-end; }
${MQ.rail} {
  .topbar { padding: 11px 16px; gap: 10px; }
}
${MQ.phone} {
  .topbar { padding: 10px 12px; padding-top: calc(10px + env(safe-area-inset-top)); gap: 8px; }
  .tb-left, .tb-right { gap: 8px; }
  .tb-right { flex-wrap: wrap; }
  /* SAVED/SAVING restate the norm on a cramped bar; a failed save must stay visible. */
  .tb-right .pill:not(.rubric) { display: none; }
  .tb-brand, .tb-sub { font-size: var(--fs-3); }
}

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
  transition: background .15s, border-color .15s, color .15s; position: relative;
}
.wiz-rail .rstep + .rstep { border-left: 1px solid var(--line); padding-left: 16px; }
.wiz-rail .rstep:hover { background: rgba(212,169,69,0.04); }
.wiz-rail .rnum {
  font-family: var(--display); font-size: var(--fs-4); font-weight: 600;
  width: 26px; height: 26px; border: 1px solid var(--line-2);
  display: grid; place-items: center; color: var(--ink-3); flex-shrink: 0;
}
.wiz-rail .rname {
  font-family: var(--display-2); font-size: var(--fs-4); color: var(--ink-3);
  letter-spacing: 0.22em; text-transform: uppercase; font-weight: 500; white-space: nowrap;
}
.wiz-rail .ropt { color: var(--ink-4); letter-spacing: 0.12em; }
.wiz-rail .rstep.done .rnum { background: var(--gold); border-color: var(--gold); color: var(--bg-0); }
.wiz-rail .rstep.done .rname { color: var(--ink-2); }
.wiz-rail .rstep.visited .rnum { border-color: var(--gold-deep); color: var(--gold-2); background: rgba(176,138,72,0.08); }
.wiz-rail .rstep.visited .rname { color: var(--gold-2); }
.wiz-rail .rstep.active { border-bottom-color: var(--gold); background: linear-gradient(180deg, transparent, rgba(212,169,69,0.10)); }
.wiz-rail .rstep.active .rnum { border-color: var(--gold); color: var(--gold); }
.wiz-rail .rstep.active .rname { color: var(--ink); }
/* Measured, not a device tier: the 7 steps + padding need ~1150px, so below that
   the rail scrolls (scrollbar hidden above). The right-edge fade is the only
   signal there are more chapters off-screen. */
@media (max-width: 1180px) {
  .wiz-rail {
    -webkit-mask-image: linear-gradient(90deg, #000 0, #000 calc(100% - 36px), transparent);
    mask-image: linear-gradient(90deg, #000 0, #000 calc(100% - 36px), transparent);
  }
}

/* Compact step navigator: swapped in for .wiz-rail at the tablet tier (see the
   media query below) — current step name plus prev/next arrows, instead of a
   row of badges whose names can't fit. */
.wiz-railbar {
  display: none; align-items: stretch;
  background: rgba(7,9,28,0.7); border-bottom: 1px solid var(--line);
  backdrop-filter: blur(4px); position: relative; z-index: 10;
}
.wiz-railbar .rb-arrow {
  width: 56px; min-height: 48px; background: transparent; border: none;
  color: var(--gold-2); font-family: var(--display); font-size: 1.125rem; cursor: pointer;
}
.wiz-railbar .rb-arrow:first-child { border-right: 1px solid var(--line); }
.wiz-railbar .rb-arrow:last-child { border-left: 1px solid var(--line); }
.wiz-railbar .rb-arrow:disabled { opacity: 0.3; cursor: default; }
.wiz-railbar .rb-label { flex: 1; min-width: 0; text-align: center; padding: 8px 10px 10px; }
.wiz-railbar .rb-count {
  font-family: var(--mono); font-size: var(--fs-2); color: var(--ink-3);
  letter-spacing: 0.22em; text-transform: uppercase;
}
.wiz-railbar .rb-name {
  font-family: var(--display-2); font-size: var(--fs-6); font-weight: 600; color: var(--ink);
  letter-spacing: 0.22em; text-transform: uppercase; margin-top: 3px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

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
.wiz-footer .meta { font-family: var(--mono); font-size: var(--fs-4); color: var(--ink-3); letter-spacing: 0.22em; text-transform: uppercase; }

/* Point-buy characteristic picker */
.pb-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
.pb-stat {
  border: 2px double var(--line); background: linear-gradient(180deg, var(--bg-2), var(--bg-1));
  padding: 14px 10px 12px; text-align: center; position: relative;
}
.pb-stat.fixed { border-color: var(--gold); box-shadow: inset 0 0 0 1px rgba(212,169,69,0.12); }
.pb-key { font-family: var(--mono); font-size: var(--fs-3); color: var(--ink-3); letter-spacing: 0.18em; text-transform: uppercase; }
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
.pb-lock { font-family: var(--mono); font-size: var(--fs-1); color: var(--gold-2); letter-spacing: 0.22em; margin-top: 6px; }
.pb-reset {
  font-family: var(--mono); font-size: var(--fs-2); letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--ink-3); background: transparent; border: 1px solid var(--line-2);
  border-radius: 2px; padding: 5px 10px; cursor: pointer; transition: color .12s, border-color .12s;
}
.pb-reset:hover { color: var(--gold-2); border-color: var(--gold); }
/* Measured one-off, deliberately between the tab and phone tiers: five point-buy
   tiles need ~720px before the 3-up wrap. */
@media (max-width: 720px) { .pb-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }

/* Prayer / Ward picker */
.pw-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.pw-opt {
  border: 1px solid var(--line-2); background: rgba(255,255,255,0.015);
  padding: 9px 12px; cursor: pointer; transition: border-color .12s, box-shadow .12s, background .12s;
}
.pw-opt:hover { border-color: var(--gold); }
.pw-opt.selected { border-color: var(--gold); background: rgba(212,169,69,0.07); box-shadow: inset 0 0 0 1px var(--gold), 0 0 10px var(--gold-glow); }
.pw-name { font-family: var(--display-2); font-size: var(--fs-6); font-weight: 700; letter-spacing: 0.08em; color: var(--ink); }
.pw-text { font-family: var(--serif); font-size: var(--fs-6); color: var(--ink-2); line-height: 1.45; margin-top: 3px; }
${MQ.phone} { .pw-grid { grid-template-columns: 1fr; } }

/* Grid (cards listing) */
/* minmax(0, 1fr), not 1fr — a bare 1fr is minmax(auto, 1fr), which floors every
   track at its widest child's min-content. One card with an unbreakable header
   then widens its whole column and the siblings shrink to pay for it, so the
   columns come out uneven. minmax(0, …) keeps every track exactly equal. */
.grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
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
.stat-tile .lbl { font-family: var(--mono); font-size: var(--fs-2); color: var(--ink-3); letter-spacing: 0.22em; text-transform: uppercase; }
.stat-tile .val { font-family: var(--display-2); font-size: 1.375rem; color: var(--ink); margin-top: 4px; font-weight: 600; }
.stat-tile .val .sub { font-family: var(--mono); font-size: var(--fs-3); color: var(--ink-3); font-weight: 400; margin-left: 3px; }
.stat-tile.gold { border-color: var(--gold); }
.stat-tile.gold .val { color: var(--gold-2); }
/* A value currently reduced by a live effect (e.g. Speed while Slowed). */
.stat-tile.rubric { border-color: var(--rubric); cursor: help; }
.stat-tile.rubric .val { color: var(--rubric-2); }

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
  font-family: var(--mono); font-size: var(--fs-3);
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
  font-family: var(--mono); font-size: var(--fs-2);
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
  font-family: var(--mono); font-size: var(--fs-3);
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

/* Sync error banner — fixed bottom-center so it clears the bottom-right tweaks
   panel; only ever rendered when a write has failed. */
.sync-pill {
  position: fixed; left: 50%; transform: translateX(-50%);
  bottom: calc(18px + env(safe-area-inset-bottom)); z-index: 3000;
  display: flex; gap: 8px; align-items: center;
  background: var(--bg-1); padding: 6px 8px; border: 1px solid var(--rubric);
  box-shadow: 0 6px 24px rgba(0,0,0,0.5);
  max-width: min(92vw, 560px);
}

/* Modal */
.modal-backdrop {
  position: fixed; inset: 0; background: var(--surface-backdrop); backdrop-filter: blur(4px);
  z-index: 100; display: grid; place-items: center; padding: 40px;
}
.modal {
  background: var(--grad-modal);
  border: 1px solid var(--gold);
  width: 100%; max-width: var(--modal-w, 720px);
  max-height: 90vh; max-height: 90dvh;
  /* Scrolling lives on .modal-body so head/foot stay pinned (a long level-up
     step must keep its STEP N OF M footer in view) and the ::before/::after
     diamond ornaments — drawn outside the box — stay unclipped. */
  display: flex; flex-direction: column;
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
  flex-shrink: 0;
}
.modal-body { padding: 22px 32px; overflow-y: auto; flex: 1; min-height: 0; }
.modal-foot { padding: 18px 32px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }

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
  font-family: var(--display-2); font-size: var(--fs-8); font-weight: 700; letter-spacing: 0.12em;
  color: var(--ink); text-transform: uppercase;
}
.ability-card .ac-cost {
  /* --display-2, not --display: the decorative face's glyph extents overflow the
     pill at this size, and it garbles digits (see .hc-lvl). */
  font-family: var(--display-2); font-size: var(--fs-3); line-height: 1.4; color: var(--rubric-2); letter-spacing: 0.18em;
  /* Bordered like .ac-action — bare dark-red text vanishes on the near-black card. */
  padding: 2px 7px; border: 1px solid currentColor; border-radius: 999px; white-space: nowrap;
}
.ability-card .ac-row .ac-name { min-width: 0; }
.ac-tags {
  display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end;
}
.ac-action {
  font-family: var(--mono); font-size: var(--fs-2); font-weight: 600;
  letter-spacing: 0.14em; text-transform: uppercase; white-space: nowrap;
  padding: 2px 7px; border: 1px solid currentColor; border-radius: 999px;
}
.ac-action.act-main      { color: oklch(0.68 0.13 35); }   /* main action — rubric/red */
.ac-action.act-maneuver  { color: var(--tier2-t); }         /* maneuver — gold */
.ac-action.act-triggered { color: oklch(0.70 0.10 230); }  /* triggered — cool blue */
.ac-action.act-free      { color: oklch(0.72 0.11 150); }  /* free — green */
.ac-action.act-other     { color: var(--ink-3); }
.ability-card .ac-keywords {
  font-family: var(--mono); font-size: var(--fs-2); color: var(--ink-3);
  letter-spacing: 0.18em; text-transform: uppercase; margin-top: 4px;
}
.ability-card .ac-flavor {
  font-family: var(--hand); font-style: italic; font-size: var(--fs-6);
  color: var(--ink-2); margin: 8px 0; line-height: 1.4;
}
.ability-card .ac-meta {
  font-family: var(--mono); font-size: var(--fs-3); color: var(--ink-3);
  display: grid; grid-template-columns: auto auto; gap: 4px 14px; margin-top: 6px;
  letter-spacing: 0.12em;
}
.ability-card .ac-meta b { color: var(--ink-2); font-weight: 500; }
.ability-card .ac-roll {
  margin-top: 10px; border-top: 1px dashed var(--line-2); padding-top: 10px;
  /* 46px matches .kit-roll — the bold mono "12–16" tier label needs ~45px. */
  display: grid; grid-template-columns: 46px 1fr; gap: 6px 10px;
  font-family: var(--mono); font-size: var(--fs-4);
}
.ability-card .ac-roll .t { color: var(--gold); }
.ability-card .ac-roll .e { color: var(--ink); }
/* Tier color coding via the --tier tokens in :root (shared with .kit-roll below). */
.ability-card .ac-roll .t.tier-1, .kit-card .kit-roll .t.tier-1 { color: var(--tier1-t); }
.ability-card .ac-roll .e.tier-1, .kit-card .kit-roll .e.tier-1 { color: var(--tier1-e); }
.ability-card .ac-roll .t.tier-2, .kit-card .kit-roll .t.tier-2 { color: var(--tier2-t); }
.ability-card .ac-roll .e.tier-2, .kit-card .kit-roll .e.tier-2 { color: var(--tier2-e); }
.ability-card .ac-roll .t.tier-3, .kit-card .kit-roll .t.tier-3 { color: var(--tier3-t); }
.ability-card .ac-roll .e.tier-3, .kit-card .kit-roll .e.tier-3 { color: var(--tier3-e); }
.ability-card .ac-roll .t { font-weight: 700; }
.ability-card .ac-effect {
  margin-top: 10px; font-family: var(--serif); font-size: var(--fs-7); color: var(--ink-2); line-height: 1.5;
  /* Official effect text carries real paragraph and bullet breaks — honour them without
     turning the string into markup. pre-line keeps wrapping intact. */
  white-space: pre-line;
}
.ability-card .ac-effect b { color: var(--gold-2); }

/* Feature benefit tables (FeatureTable) — e.g. the Fury's Growing Ferocity.
   Lives inside .trait-block / .orn-frame feature blocks, so it styles standalone
   rather than under .ability-card. Column width matches .ac-roll's rationale but
   stretches for labels like "12 (10th level)". */
.feat-table {
  margin-top: 8px; border-top: 1px dashed var(--line-2); padding-top: 8px;
  display: grid; grid-template-columns: minmax(46px, max-content) 1fr; gap: 6px 12px;
  align-items: baseline;
}
.feat-table .fth {
  font-family: var(--mono); font-size: var(--fs-3); color: var(--ink-3);
  letter-spacing: 0.18em; text-transform: uppercase;
}
.feat-table .ftl { font-family: var(--mono); font-size: var(--fs-4); color: var(--gold); font-weight: 700; }
.feat-table .ftv { font-family: var(--serif); font-size: var(--fs-7); color: var(--ink-2); line-height: 1.5; }
.feat-table .ft-gated { opacity: 0.55; }

/* Poster cards (ancestry + class pickers) — the artwork IS the card; name and
   the full untruncated blurb sit on a bottom scrim (2:3 leaves room for the
   longest blurb). Scrim text colors are fixed rather than --ink because the
   scrim is dark in both themes. Once a pick exists the other cards dim; hover
   restores them. */
.poster-card { position: relative; padding: 0; overflow: hidden; aspect-ratio: 2 / 3; display: flex; align-items: flex-end; }
.poster-card .pc-art {
  position: absolute; inset: 0;
  background-size: cover; background-position: center 18%;
  transition: transform .35s ease, filter .3s ease;
}
.poster-card:hover .pc-art { transform: scale(1.04); }
.poster-card.dim .pc-art { filter: grayscale(0.8) brightness(0.55); }
.poster-card.dim:hover .pc-art { filter: none; }
.poster-card .pc-scrim {
  position: relative; width: 100%;
  padding: 44px 16px 14px;
  background: linear-gradient(180deg, transparent, rgba(5,5,8,0.7) 28%, rgba(5,5,8,0.94));
  transition: opacity .3s ease;
}
.poster-card.dim .pc-scrim { opacity: 0.65; }
.poster-card.dim:hover .pc-scrim { opacity: 1; }
.poster-card .pc-name-row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.poster-card .pc-name { font-family: var(--display); font-size: 1.0625rem; letter-spacing: 0.10em; color: #ece4d2; }
.poster-card .pc-meta {
  font-family: var(--mono); font-size: var(--fs-2); color: rgba(236,228,210,0.62);
  letter-spacing: 0.18em; text-transform: uppercase; margin-top: 4px;
}
/* Roles are two-part ("Controller · Striker"), so appending the resource inline
   wraps on 5 of the 9 class cards and strands a separator at the end of the
   line — give it its own line on every card instead, and keep it gold. */
.poster-card .pc-resource { display: block; color: var(--gold-2); margin-top: 2px; }
.poster-card .pc-desc {
  font-family: var(--serif); font-size: var(--fs-6); color: rgba(236,228,210,0.85);
  margin-top: 8px; line-height: 1.45;
}
/* Stamps sit over artwork here — the glyph joins the name row instead of
   floating top-right, and both get a shadow to stay legible on light art. */
.poster-card .c-stamp { position: static; text-shadow: 0 1px 6px rgba(0,0,0,0.9); }
.poster-card .c-stamp svg { filter: drop-shadow(0 1px 3px rgba(0,0,0,0.9)); }
.poster-card.selected::after { text-shadow: 0 1px 6px rgba(0,0,0,0.9); }

/* Kit cards — borrow the ability-card vocabulary so the info reads clearly */
/* padding-right keeps the armor/order tag clear of the ✠ selection stamp. */
.kit-card .ac-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding-right: 16px; }
.kit-card .ac-name {
  font-family: var(--display-2); font-size: var(--fs-8); font-weight: 700; letter-spacing: 0.10em;
  color: var(--ink); text-transform: uppercase; min-width: 0;
}
.kit-card .ac-row .tag { white-space: nowrap; flex-shrink: 0; }
.kit-card .ac-keywords {
  font-family: var(--mono); font-size: var(--fs-2); color: var(--ink-3);
  letter-spacing: 0.16em; text-transform: uppercase; margin-top: 4px;
}
.kit-card .ac-flavor {
  font-size: var(--fs-6); color: var(--ink-2); margin: 8px 0; line-height: 1.45;
}
.kit-card .kit-bonuses { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
.kit-card .kit-stat {
  display: inline-flex; align-items: baseline; gap: 5px;
  padding: 3px 8px; border: 1px solid var(--line-2);
  background: rgba(212,169,69,0.05);
}
.kit-card .kit-stat-v {
  font-family: var(--display-2); font-size: var(--fs-5); font-weight: 700;
  color: var(--gold-2); letter-spacing: 0.02em;
}
.kit-card .kit-stat-l {
  font-family: var(--mono); font-size: var(--fs-2); color: var(--ink-3);
  letter-spacing: 0.10em; text-transform: uppercase;
}
.kit-card .kit-sig {
  margin-top: 12px; padding: 10px 12px;
  border: 2px double var(--gold);
  background: linear-gradient(180deg, rgba(212,169,69,0.08), var(--bg-1));
}
.kit-card .kit-sig-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.kit-card .kit-sig-name {
  font-family: var(--display-2); font-size: var(--fs-6); font-weight: 700; letter-spacing: 0.08em;
  color: var(--ink); text-transform: uppercase; min-width: 0;
}
.kit-card .kit-sig-badge {
  font-family: var(--display); font-size: var(--fs-3); color: var(--gold-2);
  letter-spacing: 0.16em; text-transform: uppercase; white-space: nowrap; flex-shrink: 0;
}
.kit-card .kit-sig-kw {
  font-family: var(--mono); font-size: var(--fs-2); color: var(--ink-3);
  letter-spacing: 0.16em; text-transform: uppercase; margin-top: 5px;
}
.kit-card .kit-roll {
  margin-top: 9px; display: grid; grid-template-columns: 46px 1fr; gap: 5px 10px;
  font-family: var(--mono); font-size: var(--fs-4);
}
.kit-card .kit-roll .t { font-weight: 700; }
/* Tier colors come from the shared .ac-roll/.kit-roll token rules above. */
.kit-card .kit-sig-effect {
  margin-top: 9px; font-family: var(--serif); font-size: var(--fs-6); color: var(--ink-2); line-height: 1.5;
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
  .grid-3, .grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }

  /* Normalise the type floor: 0.5rem would land under 10.5px from here down.
     Promoting to 0.5625rem keeps every label at ~11px without hardcoding px,
     which would break the all-rem invariant this stylesheet documents. */
  .pb-lock { font-size: var(--fs-2); }

  /* Wide tracking is the third size lever after font-size and padding, and the
     cheapest: ~13% of the width of every label, at no legibility cost. */
  .eyebrow, .h4-meta, .roster-hero .meta { letter-spacing: 0.16em; }
  .tag, .pill { letter-spacing: 0.14em; }
  .glyph-row { letter-spacing: 0.2em; }

  .h1-display { font-size: 2.25rem; }
  .roster-hero h1 { font-size: 2.5rem; }
  .drop-cap { font-size: 3.25rem; margin-right: 8px; vertical-align: -8px; }

  .roster-inner { padding: 40px 24px 60px; }
  .wiz-step .col-main { padding: 26px 24px 0; }
  .wiz-footer { padding-left: 22px; padding-right: 22px; }

  /* Swap the rail for the compact navigator: seven step names can't fit, and a
     badge-only rail read as a row of anonymous checkmarks. Both live in the DOM
     (Wizard.jsx renders each unconditionally); CSS picks per breakpoint. */
  .wiz-rail { display: none; }
  .wiz-railbar { display: flex; }

  .portrait-uploader { grid-template-columns: 1fr; }
  /* Stacked tier: the required name field outranks the optional portrait. */
  .portrait-uploader .id-fields { order: -1; }
  .modal-backdrop { padding: 24px 20px; }
  .modal-head { padding: 20px 22px 14px; }
  .modal-body { padding: 18px 22px; }
  .modal-foot { padding: 16px 22px; }
  .skill-chip-grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
}

${MQ.phone} {
  .grid-2, .grid-3 { grid-template-columns: minmax(0, 1fr); }
  .grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }

  .h1-display { font-size: 1.875rem; }
  /* 2rem would measure ~361px against a 358px content box and overflow. */
  .roster-hero h1 { font-size: 1.75rem; }
  .roster-hero { padding: 24px 0 20px; }
  .roster-hero .sub { font-size: 1.0625rem; }
  .h2-display { font-size: 1.375rem; }
  .drop-cap { font-size: 2.75rem; }
  .deck { font-size: var(--fs-9); }

  .roster-inner { padding: 28px max(16px, env(safe-area-inset-left)) 48px max(16px, env(safe-area-inset-right)); }
  .roster-section-title { margin: 28px 0 14px; }
  .wiz-step .col-main { padding: 20px 16px 0; }
  /* One row, not two: the ghost back button keeps ~1/3 (ellipsized when a long
     step name like "◂ COMPLICATION" won't fit) and CONTINUE fills the rest —
     stacked rows burned ~150px of a phone viewport. */
  .wiz-footer { padding: 14px; padding-bottom: calc(14px + env(safe-area-inset-bottom)); flex-wrap: nowrap; gap: 10px; }
  .wiz-footer .meta { display: none; }
  /* Back keeps its natural width (shrinking only under a truly long pair of
     labels); CONTINUE takes everything left. */
  .wiz-footer > :first-child { flex: 0 1 auto; min-width: 0; max-width: 45%; }
  /* block, not inline-flex: text-overflow only ellipsizes block containers. */
  .wiz-footer .btn.ghost { display: block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .wiz-footer .btn.primary { flex: 1 1 0; }

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
  .ability-card .ac-roll { grid-template-columns: 1fr; gap: 2px; }
  .ability-card .ac-roll .t { margin-top: 4px; }
  .kit-card .kit-roll { grid-template-columns: 1fr; gap: 2px; }
  .feat-table { grid-template-columns: 1fr; gap: 2px; }
  .feat-table .ftl { margin-top: 6px; }
  .ability-card .ac-row { flex-wrap: wrap; gap: 6px; }

  /* 5 point-buy stats over 2 rows; the odd one out spans the full width. */
  .pb-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pb-grid .pb-stat:nth-child(5) { grid-column: 1 / -1; }

  .review-portrait { width: 116px; }
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

/* Vestibular safety: neutralize every transition/animation app-wide. The
   !important + universal selector wins across all injected sheets regardless of
   mount order, so this one block covers PLAY_CSS/CAMPAIGN_CSS/etc. too. */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}

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
    font-family: var(--mono); font-size: var(--fs-2); color: var(--ink-3);
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
