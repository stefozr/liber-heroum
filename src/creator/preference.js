// creator/preference.js — which creation layout opens a hero: the Codex-style
// creator (default) or the classic wizard. A per-browser preference; app.jsx only
// honours it for admins, who alone see the switch.
const KEY = 'lh:creator';
const PREFS = ['wizard', 'codex'];

function getCreatorPref() {
  try {
    const v = window.localStorage.getItem(KEY);
    return PREFS.includes(v) ? v : 'codex';
  } catch {
    return 'codex';
  }
}

function setCreatorPref(v) {
  try { window.localStorage.setItem(KEY, PREFS.includes(v) ? v : 'codex'); } catch { /* storage blocked: session-only */ }
}

// The two sidebars' widths, as the user dragged them: { left?, right? } in px. A
// side left unset keeps the stylesheet's width for the viewport.
const PANE_KEY = 'lh:creator:panes';
const PANE_LIMITS = { left: { min: 220, max: 420, def: 300 }, right: { min: 300, max: 640, def: 440 } };

function getPaneWidths() {
  try {
    const v = JSON.parse(window.localStorage.getItem(PANE_KEY) || '{}');
    const out = {};
    for (const side of ['left', 'right']) {
      const n = Number(v?.[side]);
      if (v?.[side] != null && Number.isFinite(n)) out[side] = Math.max(PANE_LIMITS[side].min, Math.min(PANE_LIMITS[side].max, Math.round(n)));
    }
    return out;
  } catch {
    return {};
  }
}

function setPaneWidths(widths) {
  try { window.localStorage.setItem(PANE_KEY, JSON.stringify(widths || {})); } catch { /* storage blocked: session-only */ }
}

// The app view an editable, unfinished hero opens in.
const editorViewFor = (pref) => (pref === 'codex' ? 'creator' : 'wizard');
const isEditorView = (view) => view === 'wizard' || view === 'creator';

export { getCreatorPref, setCreatorPref, editorViewFor, isEditorView, getPaneWidths, setPaneWidths, PANE_LIMITS };
