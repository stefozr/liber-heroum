---
name: verify
description: Build, run, and drive Liber Heroum (Draw Steel character manager) to verify changes at runtime.
---

# Verifying Liber Heroum

Vite + React app with a Supabase backend.

## Build / launch

- `npm install` then `npm run dev` (background) → serves at http://localhost:5173/.
- Supabase env comes from `.env` (copy `.env.example`). **Without `.env` the app still boots** — `src/supabaseClient.ts` falls back to a placeholder client and logs `[supabase] Missing VITE_SUPABASE_URL...` to the console. You get the auth/login screen ("LIBER HEROUM — Enter the Chronicle") but cannot go past it.
- Screens beyond auth (roster, wizard, play, campaigns) require a real Supabase project + OAuth login (Discord/Google) — not drivable headlessly without credentials.

## Drive

- No Playwright in the repo. Install it in the session scratchpad (`npm install playwright --no-save`) and `npx playwright install chromium`, then drive http://localhost:5173/ with a small script. Note: `npx playwright` alone installs the package into the npx cache where scripts can't import it — install into the script's directory.
- The auth screen exercises `index.html` base styles, `src/theme/styles.js` (RELIQUARY_CSS, injected via a `<style>` tag by ThemeStyles), and `src/auth.jsx`.
- Useful checks via `page.evaluate`: computed `font-size` of `document.documentElement`. All app font sizes are rem against a root ladder in `index.html` that steps down by viewport width — 135% / 128% / 122%, resolving to **21.6px above 900px, 20.48px at ≤900px, 19.52px at ≤560px**. Breakpoints are defined once in `src/theme/breakpoints.js` and mirrored as literals in `index.html`.
- Responsive checks: drive 360 / 390 / 560 / 561 / 820 / 900 / 901 / 1000 / 1440 — the breakpoint boundaries matter far more than device names, and 901–1024 is where the app bar and play top bar run out of room.
  **`document.documentElement.scrollWidth` is not a sufficient test.** Every shell (`.app`, `.wiz`, `.play`, `.ds-shell`) is `overflow:hidden`, so overflowing content is silently clipped and never widens the document — the check passes while the UI is broken. Instead walk `document.querySelectorAll('*')` and flag any element whose `getBoundingClientRect().right` exceeds `window.innerWidth`, skipping elements that have an ancestor with `overflow-x: auto|scroll` (the wizard rail and the app-bar tabs are meant to scroll).
  Screens past auth need Supabase OAuth, so the practical way to drive them is a throwaway harness page at the repo root that imports the real screen components (`RosterScreen`, `Wizard`, `PlayView`, `CampaignDetail`, `RulesGlossary`) with a character built the way `src/__tests__/helpers/factories.ts` does, mirroring `index.html`'s base styles.

## Other checks

- `npm run typecheck`, `npm run test` (vitest, jsdom), `npm run smoke` (node smoke.mjs).
