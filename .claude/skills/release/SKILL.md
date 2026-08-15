---
name: release
description: Cut a Liber Heroum release — bump the app version, commit and push, and write player-facing release notes covering everything since the last version bump. Use when the user asks to bump the version, cut a release, or write release notes / patch notes for players.
---

# Cutting a Liber Heroum release

Four steps, in this order: find the baseline, bump the version, commit and push, write the
notes.

## 1. Find the baseline — do this FIRST, before editing anything

A release covers **everything since the last version bump**: the commits that landed since
it, plus whatever is still uncommitted.

Find that bump by pickaxing the version line itself. Commit subjects are not a reliable
marker here — past releases read `Release v1.6: …`, `Bump the app version to 1.5` and
`…; v1.3`, so no `--grep` catches them all. The line does:

```powershell
$BASE = git log -1 --format=%H -G"Draw Steel Character Manager" -- src/roster.jsx
```

**Capture `$BASE` before you touch the version string.** Bump first and the pickaxe finds
your own new commit, the range comes back empty, and the notes silently cover nothing.
This is the one mistake in this skill that produces no error — only quietly incomplete
notes.

Then look at what you're releasing:

```powershell
git log --no-merges --oneline "$BASE..HEAD"
git status --short
```

If both are empty there is nothing to release — say so and stop.

## 2. Bump the version

- The version lives in **`src/roster.jsx`** as the string `A Draw Steel Character Manager · v X.Y` (a `.meta` div near the top). It is NOT in `package.json` — do not touch that.
- Use the version the user named; if they didn't name one, increment the minor (1.5 → 1.6) and say so.
- Verify with a grep that exactly one `v X.Y` occurrence existed before the edit.

## 3. Verify, commit, push

- Run `npm run typecheck` and `npm run test` **before** committing. `.github/workflows/deploy.yml`
  runs both on every push to `main` and a failure blocks the deploy, so catching it here is
  cheaper than a failed release run.
- Stage everything and commit as `Release vX.Y: <short summary of the headline items>`,
  matching the style of `a2c8f10`. Pass the message as a single-quoted PowerShell
  here-string (the closing `'@` must sit at column 0), and end it with the
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>` trailer.
- Releases go directly on **`main`** — that is this repo's convention (every past bump is a
  plain commit on `main`; the history is linear, no branches, no merges) and `main` is what
  `deploy.yml` watches. Do not open a branch or a PR for a release.
- **Show the user the commit subject and `git status --short`, and get confirmation before
  `git push`.** Pushing publishes the app to GitHub Pages — it is a live deploy for
  players, not a private action.

## 4. Write the release notes

**Scope: `$BASE..HEAD`.** After step 3 that one range holds both the commits that were
already in and everything that was uncommitted when you started. If the user asked for
notes only — no bump, no commit — then scope is `$BASE..HEAD` **plus** the working tree
(`git status --short`, `git diff`, and read untracked files directly).

Gather the inventory with an Explore agent (the range is usually large). Give it:

- `git log --no-merges --format="%h %s%n%b" "$BASE..HEAD"` — subjects and bodies are the
  highest-signal input; this repo writes descriptive commit messages.
- `git diff --stat "$BASE..HEAD"`, then targeted `git diff "$BASE..HEAD" -- <path>` for
  anything a message leaves ambiguous.

Have it classify changes into user-visible features, user-visible fixes, and internal-only
(tests/refactors/migrations) — with evidence per item — and flag ambiguities. Two rules for
reading a multi-commit range:

- **A commit message states intent; the diff is the evidence.** A user-facing-sounding
  subject can cover an entirely internal change, and vice versa. Classify from the diff.
- **Merge related commits into one bullet.** The notes are grouped by what a player
  experiences, not one line per commit — several commits refining the same feature are one
  bullet. A fix to something introduced *inside the same range* is not news: describe the
  end state, not the path to it.

Then write the notes:

- **Audience is the players at the table.** No file paths, no function names, no test counts. Describe what a player sees or can now do, in their vocabulary (sheet, combat tab, level up, Director).
- **Group under `New` / `Improved` / `Fixed`**, plus a short **`Good to know`** section for caveats (e.g. app-generated Foundry exports, manual steps the sheet doesn't automate).
- Classes or content flagged `wip: true` in `src/data/classes.js` get framed as **playtest/WIP** content — the UI shows a WIP tag, so the notes should match.
- Exclude internal-only changes entirely. Exclude admin/Director-only features by default, but mention the omission to the user so they can opt them in.
- `supabase/migration.sql` changes are operator-facing: never in the player notes, but remind the user the migration must be run if one is pending.
- Default delivery is the bullet list **in chat** for copy-paste; only create a file or artifact if the user asks.
- After the notes, tell the user in one or two sentences what judgment calls you made (what you framed as playtest, what you left out) so they can adjust.
