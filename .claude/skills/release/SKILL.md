---
name: release
description: Bump the Liber Heroum app version and write player-facing release notes from the uncommitted working tree. Use when the user asks to bump the version, cut a release, or write release notes / patch notes for players.
---

# Cutting a Liber Heroum release

Two steps: bump the version string, then write player-facing release notes for whatever is currently uncommitted.

## 1. Bump the version

- The version lives in **`src/roster.jsx`** as the string `A Draw Steel Character Manager · v X.Y` (a `.meta` div near the top). It is NOT in `package.json` — do not touch that.
- Use the version the user named; if they didn't name one, increment the minor (1.5 → 1.6) and say so.
- Verify with a grep that exactly one `v X.Y` occurrence existed before the edit, then run `npx vitest run` after (nothing pins the string today, but the suite is cheap insurance).

## 2. Write the release notes

**Scope: the uncommitted working tree only** (modified + untracked files), unless the user says otherwise. Nothing from past commits.

Gather the inventory with an Explore agent (the diff is usually large): `git status --short`, `git diff`, and read untracked files directly. Have it classify changes into user-visible features, user-visible fixes, and internal-only (tests/refactors/migrations) — with evidence per item — and flag ambiguities.

Then write the notes:

- **Audience is the players at the table.** No file paths, no function names, no test counts. Describe what a player sees or can now do, in their vocabulary (sheet, combat tab, level up, Director).
- **Group under `New` / `Improved` / `Fixed`**, plus a short **`Good to know`** section for caveats (e.g. app-generated Foundry exports, manual steps the sheet doesn't automate).
- Classes or content flagged `wip: true` in `src/data/classes.js` get framed as **playtest/WIP** content — the UI shows a WIP tag, so the notes should match.
- Exclude internal-only changes entirely. Exclude admin/Director-only features by default, but mention the omission to the user so they can opt them in.
- `supabase/migration.sql` changes are operator-facing: never in the player notes, but remind the user the migration must be run if one is pending.
- Default delivery is the bullet list **in chat** for copy-paste; only create a file or artifact if the user asks.
- After the notes, tell the user in one or two sentences what judgment calls you made (what you framed as playtest, what you left out) so they can adjust.
