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
- Useful checks via `page.evaluate`: computed `font-size` of `document.documentElement` (the global text-size knob in `index.html` is `html { font-size: 120% }`; all app font sizes are rem).

## Other checks

- `npm run typecheck`, `npm run test` (vitest, jsdom), `npm run smoke` (node smoke.mjs).
