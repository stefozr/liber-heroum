# Liber Heroum — UX/UI Audit

**Date:** 2026-08-07 · **Build:** v1.2 (`main` @ 76312e0)
**Method:** Runtime audit. Every screen was rendered with real components and fixture heroes via a throwaway harness, screenshotted at 1440 / 1000 / 901 / 820 / 560 / 390 / 360 px, tab-order-tested, network-weighed, and font-fallback-tested. Every finding below was **reproduced on screen** or verified at an exact `file:line`. Findings that didn't survive verification were dropped.

**Framing:** There's no trial to convert here — this is an invite-only tool for one table. So "conversion" means: *an invited friend signs in, forges a hero without help, and reaches the play sheet impressed.* Both passes judge that funnel.

> **Fix status (2026-08-07, same day):** the recommended attack-order scope was implemented and runtime-verified —
> **✅ Fixed: C1 C2 C3 C4 C5 C6 C7 C8 · H1 H2 H5 H6 H10 H11 H12.**
> Verification highlights: full keyboard path (Tab → Enter selects cards, rail/roster/level-up all buttons); fully-valid draft shows 100% and copy says "seven rites"; Forge card is the gold primary; 901px play sheet clean; "12–16" on one line; art payload 33 MB → 4.8 MB on disk (roster images 6.6 MB → 0.46 MB); sticky modal footers; conditional Review copy; Caelian dedupe; invite-only notice + copy-email on the invite wall; save failures now visible (SavePill on play, SyncPill + rollback for delete/assign/campaign writes).
>
> **Round 3 (2026-08-07):** every remaining 🟠 High closed plus the cheap 🟢 polish —
> **✅ Fixed: H3 H4 H7 H8 H9 H13 H14 H15 H16 H17 · N4 N6 N7 N8 N9 N10 N11 N12 N13 N14 N15.**
> Highlights: `@chr`/`@P` leaks expanded/removed with a data-lint test guarding regressions; `**bold**` now renders as real bold; read-only sheets truly disable every tracker and read "👁 Viewing · kept by ⟨owner⟩"; hash deep links (`#/hero/id`, `#/campaign/id`) with cold-boot resolution + tests; tweaks panel stripped from prod bundles (verified absent in dist); Cinzel-Decorative numerals moved to plain Cinzel and TH-ligatures disabled; stamina gold until winded with hatched empty tracks; "Start a Campaign" + hub sigil caption; nav edge-fade; rules filter + edge masks; review tile relabel + per-chapter edit ▸ links; phone wizard footer on one row; prefers-reduced-motion honored.
> ~~Still open (deferred by choice): N1 (type scale), N2 (shared TopBar), N3 (token hygiene), N5 (theme-var background).~~
>
> **Round 4 (2026-08-07):** the four deferred items closed, plus the C2 residue —
> **✅ Fixed: N1 N2 N3 N5 · C2 (Foundry-export alert → SyncPill).** Nothing from the audit remains open.

---

## Pass 1 — The Designer's Teardown

*Persona: founder/designer who's shipped three SaaS products and studies Linear, Superhuman, Vercel, Raycast frame by frame.*

**First, what I can't take away from you.** The art direction is coherent and confident in a way 95% of side projects never reach. Gold-on-obsidian, three disciplined type voices (mono for meta, Cinzel for names, Garamond for prose), a consistent ornament vocabulary, real per-breakpoint layouts instead of squished desktop. The responsive sweep found **zero horizontal overflow at any width**, the console is **silent on every screen**, and when I blocked Google Fonts entirely the app degraded to Georgia without a single broken layout. That's rare. This does not look vibe-coded. Which is why the misses below stand out — the frame promises a AAA product and the details keep breaking the promise.

### The funnel is upside down
- The auth screen sells nothing. "The keeping of heroes, bound across many hands" is lovely and tells a stranger *nothing* about what they're signing into — and it doesn't warn them the door is locked. They OAuth through Discord, grant scopes, and *then* hit "Invitation Required," where the **only gold primary button in the entire entry funnel is SIGN OUT** (`src/auth.jsx:320`). The most conversion-hostile screen I've seen this year: the app's strongest CTA styling is spent on *leaving*.
- Empty roster, first login: the single bright-gold button, dead center, is **RULES GLOSSARY**. The actual activation event — *Forge a New Hero* — is a dashed ghost card, bottom-left, with mono microtext (`src/roster.jsx:28-45`). On a 390px phone the entire first viewport is masthead + version number + RULES GLOSSARY; the forge card is a scroll away. You built a beautiful front door and put the doorbell around the side.
- The masthead spends ~65% of a desktop viewport on brand ceremony *on every roster visit*. Linear gives you your issues; you give me your logo.

### The wizard sells the fantasy and hides the mechanics
- **Selection cards are `<div onClick>`** with no `role`, no `tabIndex` (`src/theme/primitives.jsx:144-155`), and the global `*:focus { outline:none }` (`src/theme/styles.js:137`) finishes the job. Measured: the complete Tab cycle on the Ancestry step is *scroll-container → ROSTER → CONTINUE → body*. Twelve ancestry cards, seven rail steps — none focusable. **A keyboard user cannot create a character. Period.**
- The step rail lies on first run: a fresh hero shows `01 02 03 04 ✓ 06 ✓` — gold checkmarks on Complication and Review that the user has never seen, and numbering with visible holes. A check means "done" everywhere on Earth; here it means "vacuously valid." At 1000px the rail also clips REVIEW mid-checkbox with no scroll affordance.
- Class is the money step and its mechanics are buried three viewports below the poster grid — aspects, skills, and the genuinely excellent **USE QUICK BUILD** button (the single best newbie affordance in the app, hidden in a panel corner most users will never scroll to). CONTINUE never gates, so nothing pulls you down there.
- Review's closing panel says **"The rites are complete"** over a hero whose Career, Class, and Kit read `—` (reproduced in DOM). The commit modal then correctly says the opposite. Two adjacent components disagree about the core fact of the page.
- The Identity step blocks CONTINUE with **zero message** — a disabled button and a tiny red `*`, with the required name field below the fold on phone while the disabled button stays visible.

### The play sheet is the best screen — and ships broken at 901px
- Hierarchy is genuinely strong: name → red stamina → gauges; ability cards color-coded by type with tiered power-roll rows. This screen understands mid-combat scanning.
- But at 901px: STAMINA label collides with `21/21`, RECOVERIES' fraction splits across lines, INTUITION clips to INTUITIO, condition chips overrun their borders. The window between 900 and ~1024 — every split-screen laptop — ships visibly broken.
- The middle power-roll tier wraps to `12–` / `16` **on every viewport including 1440px desktop** — on the single most-read element of the sheet — while the same data renders fine in the Kit panel.
- Content-pipeline leaks on the leveled sheet: a raw **`@chr` template token** ("slide 4 + @chr") and **unrendered `**Strained:**` markdown** in ability text. Nothing says "generated by a script that nobody proofread" faster.
- Stamina is *red at full health*. Red is the universal alarm color; a resting sheet should not look wounded. The Cinzel numeral 1 reads as Roman "I" everywhere it appears — "SIZE 1M" reads *IM*, level 1 reads *LV I*.

### Death by a thousand tokens
- **49 distinct font sizes** including `0.53125rem`-style 32nds-of-a-rem (`src/theme/styles.js:877,991`, `src/theme/sheet.jsx:26-33`); ~28 distinct padding values; **419 inline `style={{}}` objects** carrying typography ad hoc (73 in `review.jsx` alone). There is no scale, just measurements.
- Three top bars (AppBar / wizard / play) re-implement the same brand bar with three paddings, three brand sizes, three letter-spacings. The `.btn.primary` gradient is hand-copied in `rules.jsx` with three different ink colors. Dead tokens (`--vellum`, `--illum-blue/green`), oklch one-offs outside the token system, `transition: all`, and not one `prefers-reduced-motion` block in the repo.
- **33 MB of PNG art** ships while optimized WebP twins of the same images sit in the same tree unused: measured at runtime, the roster pulls **6.6 MB of PNG**, every wizard step pulls a ~2 MB PNG backdrop, the play sheet 1.6 MB — all as CSS `background-image`, so no lazy loading, no `srcset`, ever.
- A **foreign design system ships to every user**: the light, rounded, iOS-styled tweaks panel (`src/tweaks-panel.jsx:60-160`) renders for all logged-in users (`src/app.jsx:747`) but only opens via a dev postMessage — so the app's only theme switch *effectively doesn't exist* for users, while its system-sans/green-toggle CSS rides along in the bundle.

---

## Pass 2 — First Contact

*Persona: a player whose Director sent them a link. Never seen the app. Narrated in order; 😕 = confusion, 🚪 = wanted to leave.*

1. **The door.** Gorgeous wordmark. "Continue with Discord" — fine. But what *is* this? The subtitle is poetry, not an answer. 😕 I OAuth anyway because my friend sent it.
2. *(If my email isn't whitelisted:)* "Invitation Required. Ask the keeper of this chronicle to add you." Who is the keeper? There's no button to ask, no link, only SIGN OUT. 🚪 **This is where an uninvited friend's journey ends, permanently, after granting Discord access.**
3. **Name prompt.** Clear, prefilled, one field. Good.
4. **Empty roster.** "The book is empty. Your first hero awaits a name." — I like this place already. The big gold button says RULES GLOSSARY, so I click it 😕 and I'm in a 13-section rules reference before I've done anything. Close. *Then* I find the dashed "Forge a New Hero" card. It says **"Begin the eight rites of creation"** — okay, eight steps.
5. **Chapter 1, Ancestry.** The footer says **"CHAPTER 1 OF 7."** 😕 Seven or eight? (It's seven — `src/roster.jsx:44` says eight, and the progress bar divides by 8 at `src/roster.jsx:124`, so a hero on the final chapter shows **75%**, and no hero ever shows 100%.) The intro says "spend your ancestry points" but I see no points, no costs, no budget anywhere on the screen. 😕 The cards are beautiful; nothing says they're clickable, but I try, and grayscaling-the-rest is a satisfying confirm. The rail shows checkmarks on chapters I've never opened. 😕
6. **Culture.** The intro lists *four* things (language, environment, organization, upbringing); the archetype quick-picker fills *three*; I never see a language choice at all. 😕 (Consequence, verified on Review: my sheet lists **"Caelian + Caelian"** — the same language twice.) The archetype chips never show which one I picked. 😕
7. **Career.** Best grid so far, scannable, I pick Agent. The intro promised an "inciting incident" — no idea where that happens; I hit CONTINUE. 😕 (It's below 18 cards; nothing near my selected card points down.)
8. **Class.** Fury looks incredible. I pick it, CONTINUE lights up (it was never dark), and I move on — **never seeing** the aspect choice, the skill picks, or the QUICK BUILD button three screens below. 😕 Nothing tells me I left decisions on the table.
9. **Complication.** "Optional." First word. A skip button AND a continue button, both gold. 😕 Which one skips? Do they differ? I press SKIP, apparently that just… also continues.
10. **Identity.** Portrait upload is huge and fun. CONTINUE is dead and *nothing tells me why*. 😕 On my phone the name field — the one thing blocking me — is below the fold. I nearly file this as "app is broken." 🚪-adjacent.
11. **Review.** The hero plate with my name in huge Cinzel is a real payoff moment — this is why I'll show friends. But "STAMINA" glows gold among seven plain tiles for no stated reason, "RECOVERIES 10" sits next to "RECOVERY 7" 😕, my Kit says "NONE · BOW" 😕, my culture is titled "CUSTOM" 😕, and the closing text says my rites are complete (they aren't — see the modal that contradicts it when I click).
12. **The sheet.** Stamina found in one second. Steppers are perfect on the phone at the table. But: nine condition chips that don't look pressable (they are toggles — `src/play.jsx:369-378`), a "SIG" pill I decode only later, "M < WEAK" notation with no help anywhere, and my exit is a button labeled **"◂ LIBER."** 😕 I'd never guess that's Home.
13. **A friend's sheet.** I open Whisper (read-only). Every stepper and counter looks *exactly* as pressable as on my own sheet; the only tell is a quiet "👁 VIEWING" tag. I tap +1 stamina to see what happens. 😕 Nothing says whose hero this is, either.
14. **Campaigns.** "**Found a Campaign**" — I read this as "we found a campaign for you." 😕 Twice. The Join modal, to its credit, explains "sigil" perfectly in one sentence — best explainer in the app; it's just one level too deep. And on my phone, the third nav tab is literally the letter "A" — the tab bar clips mid-word with no scroll hint. 😕
15. **Verdict.** I'd stay — the craft is obvious and my Director is here. But I completed a hero with unmade class choices, a duplicate language, and a progress bar stuck at 75%, and I only trust the app as far as my Director's enthusiasm. Every 😕 above is a support question in your Discord.

---

## Consolidated Findings

*Severity rubric — 🔴 **Critical**: blocks or loses a first-time user, breaks data trust, or excludes a class of users. 🟠 **High Impact**: visible jank or confusion that erodes the premium promise. 🟢 **Nice to Have**: hygiene, consistency, polish.*

### 🔴 Critical

| # | Finding | Evidence | Fix |
|---|---------|----------|-----|
| ✅ C1 | **Keyboard users cannot create a character.** All selection cards are `<div onClick>` — no role/tabIndex/keydown; global focus outline suppressed. Measured Tab cycle on Ancestry: scroll-div → ROSTER → CONTINUE → body. | `src/theme/primitives.jsx:144-155`, `src/theme/styles.js:137`; runtime tab-order test | Make `SelCard` render `<button>` (or add `role="option"`, `tabIndex=0`, Enter/Space handler); same for `.hero-card`, `.hc-new`, `.cmp-card`, rail steps. One primitive fixes the whole app. |
| ✅ C2 | **Silent data loss outside the wizard.** Non-wizard write failures only `console.error`; user sees nothing. Foundry export failure is a raw `alert()`. | `src/app.jsx:451,469,476,538`; `src/play.jsx:104` | Route all writes through the wizard's existing save-pill machinery (SAVING…/SAVED/SAVE FAILED already exists — reuse it as a global toast). |
| ✅ C3 | **The progress bar lies twice and the step count contradicts itself.** Progress = `wizardStep/8` for a 7-step wizard (max ever shown: 75%) *and* hardcodes 0% until a class is chosen — a hero with 3 finished chapters shows 0%. Roster says "eight rites"; wizard footer says "CHAPTER n OF 7." | `src/roster.jsx:44,124`; reproduced on screen (fully-valid hero on Review = "75%") | Compute % from `isStepValid` count / `DS_STEPS.length` (both already exist — `src/wizard/Wizard.jsx:211`, `src/data/steps.js`); fix the copy to seven. |
| ✅ C4 | **Wizard lets you finish without making the choices that matter.** CONTINUE never gates (except name); class aspects/skills/quick-build sit 3 viewports under the poster grid with no signpost; career's incident likewise. Users ship half-configured heroes and Review's closing copy says "The rites are complete" even when Career/Class/Kit are `—`. | Screenshots `wizard-3@*`; DOM-verified copy on incomplete Review | (a) On selecting a class/career, auto-scroll or anchor-link to its config panel; (b) badge the footer "2 choices remaining"; (c) make Review's closing line conditional on actual validity; (d) promote QUICK BUILD next to the card grid. |
| ✅ C5 | **The invite dead-end burns real invitees.** Strangers learn the app is invite-only only *after* OAuth, and the screen's one gold primary is SIGN OUT with no way to request access or copy the keeper's contact. | `src/auth.jsx:320`; screenshot | Say "invite-only" on the auth screen itself; on NotInvited, demote Sign Out to ghost and add a primary "Copy my email to send to your Director" (or mailto). |
| ✅ C6 | **First-run CTA inversion.** Only gold primary on the (empty) roster is RULES GLOSSARY; Forge a New Hero is a dashed ghost card below it — on phone, below the fold. | `src/roster.jsx:28-45`; screenshots `roster-empty@*` | Swap the styling: Forge = gold primary (especially when `characters.length === 0`), glossary = ghost/launcher. Collapse the masthead after first visit. |
| ✅ C7 | **The play sheet ships broken at 901–1024px.** Label/value collisions (STAMINA21/21), split fractions (10 / newline 10), clipped characteristic names, chip overflow. | Screenshot `play@boundary.png` | Move the gauge-row and characteristics-row collapse breakpoint from 900 up to ~1024 (`src/theme/breakpoints.js` `rail`), matching what the top bar already does. |
| ✅ C8 | **Identity blocks CONTINUE with zero explanation** — disabled button + red asterisk only; on phone the required field is below the fold while the dead button is visible. | Runtime check (`disabled:true`, no title); screenshots `wizard-5-fresh@*` | Inline "A hero needs a name" under the field + `title` on the disabled button; on phone, move Name above the portrait uploader. |

### 🟠 High Impact

| # | Finding | Evidence | Fix |
|---|---------|----------|-----|
| ✅ H1 | Step-rail semantics: fresh hero shows `01 02 03 04 ✓ 06 ✓` — checkmarks on never-visited optional/vacuous steps, holes in numbering; rail clips REVIEW at 1000px with no scroll affordance. | `wizard-0-fresh@desktop/laptop` | Reserve ✓ for *visited-and-valid*; show `05`/`07` otherwise (e.g. hollow diamond for "optional, untouched"). Add edge-fade to the scrollable rail. |
| ✅ H2 | Power-roll middle tier wraps `12–` / `16` on every ability card at every width incl. desktop — the most-read element in play. Kit panel renders the same data correctly. | `play@desktop-scroll1/2/3` vs kit panel | Widen the tier column / `white-space: nowrap` on the range cell (compare `.kit-roll` vs `.ac-roll` widths, `src/theme/styles.js:908-921`). |
| ✅ H3 | Content-pipeline leaks in shipped rules text: raw `@chr` token ("slide 4 + @chr"), unrendered `**Strained:**` markdown, lowercase telegraphic "splash damage = your stat." | `play-leveled@desktop-scroll1/2` | Add a data lint (grep for `@`, `**`, sentence-case check) over ability/effect strings; fix the three found. |
| ✅ H4 | Read-only sheets look 100% editable: steppers/counters/condition chips render identically; only tell is a quiet 👁 VIEWING chip; no owner attribution anywhere. | `play-readonly@*` vs `play@*` | Dim + `disabled` the controls under `!canEdit`, and put "WHISPER — kept by Mara Quill" in the masthead. |
| ✅ H5 | **Perf: 33 MB of PNGs ship while their WebP twins sit unused.** Measured: roster = 6.6 MB images, each wizard step ≈ 2 MB PNG backdrop, play bg 1.6 MB. All CSS backgrounds — no lazy-load, no srcset, cached or not it's paid on first visit per image. | `du` on `public/assets`; runtime network weighing | Point `img:`/`bg:` fields at the existing `.webp` files (`Censor.png` 2.0 MB → `cards/censor.webp` 150 KB), convert `sections/*.png`, and preload only the current step's backdrop. |
| ✅ H6 | Level-up modal opens with no footer/step indicator visible (you can't tell it's a 3-step flow or how to proceed); `5 FEROCITY` cost is dark-red-on-black (worst contrast in app); perk cards show no selection affordance; CONTINUE silently disabled again. | `levelup@*`, `x-levelup-step1` | Make the modal footer sticky ("STEP 1 OF 3 · CONTINUE"); lift cost chip to `--rubric-2`; give perk cards the wizard's selected-state treatment. |
| ✅ H7 | Jargon with no in-place help: CHRONICLED, SIG, KEEPERS, "QUICK:", Echelon, "◂ LIBER" as the exit, and the WEAK/AVERAGE/STRong legend chips that look like pressed buttons. Conditions chips *are* toggles but look inert. | Agent-verified screenshots; `src/play.jsx:369-378` | One pass: rename exit to "◂ ROSTER" (wizard already uses it), CHRONICLED → "COMPLETE ✓" or keep + tooltip, style the legend as plain text, give condition chips a hover/border affordance. |
| ✅ H8 | "Found a Campaign" reads as *discovered*, not *establish*, on first contact — button, empty-state line, and modal title all hinge on the ambiguity. The Join modal's sigil explainer is excellent but lives one level too deep. | `campaigns@*`, `x-campaigns-found` | "Start a Campaign" (keep "found" in the flavor line if you love it); surface "a sigil is a short invite code" as a caption on the hub itself. |
| ✅ H9 | Phone nav truncates to a single letter ("A" for ALL HEROES) with no scroll affordance — reads as broken, not scrollable. Same at 390 on campaigns/admin. | `roster@phone`, `campaigns@phone`, `admin@phone` | Edge-fade + reduce tab padding at ≤560px, or icon-only tabs with labels under. |
| ✅ H10 | Culture step: intro promises four forces, archetypes fill three, language is never visibly chosen → Review shows **"Caelian + Caelian."** Archetype chips give zero selected-state feedback. | `wizard-1@*`; DOM-verified duplicate on Review | Add the language picker (or drop it from the intro copy); dedupe culture language against standard in review + data; give archetype chips a selected state. |
| ✅ H11 | Complication: SKIP COMPLICATIONS (gold, above fold) vs CONTINUE (gold, footer) — two exits, difference unexplained, and the brightest CTA on a content step is the one that bypasses the content. | `wizard-4@*` | Make Skip a ghost button; after any selection, swap footer to "CONTINUE WITH ⟨name⟩". |
| ✅ H12 | On return visits to a step with a selection, the entire first viewport is grayscale cards (selected card off-screen) — reads as a disabled page; no "Selected: Human" summary above the fold. Phone wizard also loses the SAVED chip entirely. | `wizard-0-filled@*`, phone shots | Pin a small "✠ HUMAN — change" chip in the step header when a pick exists; keep a compact save-state dot in the phone railbar. |
| ✅ H13 | Numeral 1 renders as Roman "I" in display type everywhere (LV I, SIZE IM); "THE" collapses into overlapped glyphs at title sizes (ERASE FROM TH̶E, SSYL OF TH̶E RIFT). | Multiple screenshots | Use `font-feature-settings`/`font-variant-numeric: lining-nums` (or Cinzel non-decorative) for numerals; add letter-spacing or a non-ligature feature setting for display-size runs containing "TH". |
| ✅ H14 | Stamina reads red at full health; resource gauge at 0 is a near-invisible dark track. | `play@desktop` | Gold/neutral bar ≥ winded threshold, red only when winded/dying (the sheet already knows WINDED 10); give empty gauges a visible hatched track. |
| ✅ H15 | Destructive actions sit flush against constructive ones in identical tiny mono style: "✦ ADD TO CAMPAIGN ✦ REMOVE" on hero cards; admin's red ✕ overlaps hero names at desktop. | `roster@desktop-scroll1`, `admin@desktop` | Color REMOVE `--rubric`, add gap; reserve name width for the corner control on admin cards. |
| ✅ H16 | The app's only theme switch is unreachable (tweaks panel opens solely via design-host postMessage) while its foreign light-mode design system ships to all users. | `src/app.jsx:747`, `src/tweaks-panel.jsx:60-160,233` | Either expose Obsidian/Reliquary in the account menu (it's two radio buttons) or strip the panel from prod builds. |
| ✅ H17 | No URLs: view state never reaches the address bar (hand-rolled pushState mirror carries state objects only) — no deep link to a hero/campaign, no shareable/bookmarkable anything, refresh relies on localStorage. | `src/app.jsx:590-617` | Encode `view/activeId/campaignId` into the hash (`#/hero/abc`) in the existing mirror — small change, big trust win. |

### 🟢 Nice to Have

| # | Finding | Evidence | Fix |
|---|---------|----------|-----|
| ✅ N1 | No type/spacing scale: 49 font sizes (incl. 32nds-of-a-rem like `0.53125rem`), ~28 padding values, 419 inline style objects. | `styles.js:877,991`, `sheet.jsx:26-33`, `review.jsx` | Define ~8 size tokens + 4pt spacing scale; sweep inline styles into classes opportunistically. |
| ✅ N2 | Three top-bar implementations drift (28/36/28px padding, three brand sizes/letter-spacings); `.btn.primary` gradient duplicated with 3 ink colors; `.rules-launcher.large` clones it unshared. | `auth.jsx:19-81`, `styles.js:236-242,516`, `rules.jsx:461-471`, `play.jsx:710-740` | Extract one `<TopBar>` and one primary-button mixin. |
| ✅ N3 | Token hygiene: dead `--vellum`/`--illum-*`/`--surface-fade-a`; oklch one-offs outside the token system duplicated between `.ac-roll`/`.kit-roll`; `MQ.hover` never used; 2 breakpoint literals escape `breakpoints.js`. | `styles.js:29-44,881-913,1017-22`, `breakpoints.js:30`, `styles.js:679,691`, `levelup.jsx:1531` | Delete dead tokens, hoist tier ramps to tokens, inline-or-use `MQ.hover`. |
| ✅ N4 | `transition: all` on btn/card/hero-card/cmp-card; zero `prefers-reduced-motion` despite lifts, zooms, 0.35s filters. | `styles.js:231,306,450`, `campaigns.jsx:25` | Name the transitioned properties; add one global reduced-motion block. |
| ✅ N5 | `index.html` hardcodes Obsidian colors — switching to Reliquary leaves the page-behind-the-app black; Obsidian override re-declares 12 component gradients so new components silently miss the theme. | `index.html:20`, `styles.js:84-134` | Set `html` background from a CSS var stamped by the theme effect; fold overrides into tokens. |
| ✅ N6 | Rules modal: content scrolls flush under the top ornament (POWER ROLL collides); bottom ornament strikes through the last text line at 390; no search across 13 sections. | `rules@desktop-scroll1`, `rules@phone` | Top/bottom padding masks; add a filter input to the rail. |
| ✅ N7 | Review polish: STAMINA tile gold-highlighted among plain tiles with no stated reason; RECOVERIES 10 beside RECOVERY 7; Kit meta "NONE · BOW" (unlabeled armor); culture titled "CUSTOM"; ragged 3+4 tile grid; perk prose dump unbalances the column; summary cards have no "edit this chapter" affordance. | `wizard-6-review@*` | Label tiles ("RECOVERY VALUE"), "Armor: none · Weapon: bow", title culture from its aspects, clamp perk text, make each summary card link to its rail step. |
| ✅ N8 | Biography modal shows one field, hides empty ones without hint, no edit path from the modal; hero name duplicated. | `x-play-biography` | Show empty fields as muted prompts with an EDIT button when `canEdit`. |
| ✅ N9 | Campaign detail on tablet truncates hero cards hard ("BRAKKA S…", "LVL" / "I" two-line wrap); hub avatars clip each other; desktop card grid huddles left in a void; MANAGE stacks above the page's own title on phone. | `campaign@tablet`, `campaigns@desktop`, `campaign@phone` | Raise card min-width for the 2-up grid; avatar overlap margin; cap grid track count. |
| ✅ N10 | Modal micro-drift: stray `◂`/`→` glyph baselines in Cancel/submit buttons (both campaign modals); ornament sizes drift between the three near-identical modals; delete-confirm's danger button is ghost-red while KEEP is equal-weight ghost. | `x-campaigns-found/join`, `x-roster-remove-confirm` | Normalize on the shared `Modal` + `Button` primitives (they exist — use them everywhere). |
| ✅ N11 | Director's silent power: Directors see Edit on every member's hero, same weight as their own (intentional — `canEdit = isGM \|\| isMe`). | `src/campaigns.jsx:455` | Keep the power, mark it: "Edit (as Director)" or a director-tint on the affordance. |
| ✅ N12 | Wizard copy promises what the screen doesn't show: "spend your ancestry points" with no visible budget near the cards; career's "inciting incident" unmentioned near the selected card. | `wizard-0-fresh@*`, `wizard-2@*` | Show a points chip on the ancestry header once a pick exists; add "incident ↓" hint on the selected career card. |
| ✅ N13 | Admin screen: nothing says it's admin-only; "KEEPERS" noun appears nowhere else (campaigns say "members"). | `admin@desktop` | Subtitle "Visible to admins only"; unify on one noun. |
| ✅ N14 | Phone wizard footer stacks back-button above CONTINUE, neither full width, ~150px spent. | `wizard-1@phone` | Row layout: ghost back at 1/3, CONTINUE fills the rest. |
| ✅ N15 | Roster hero-card art crops portraits at `center 18%` regardless of subject; "Unnamed Hero" card art is a near-empty navy field. | `roster@desktop-scroll1` | Per-image `background-position` in data, or a subtle crest watermark fallback. |

---

## Completion Log — what was actually shipped

*Both fix passes ran on 2026-08-07. Where the implementation diverged from the table's suggested fix, the divergence is noted. Every item below was re-verified at runtime (Playwright against real components + factory heroes) in addition to the automated suite.*

### Round 1-2 — Criticals + first High wave (C1–C8, H1, H2, H5, H6, H10–H12)

- **C1** — `SelCard` and every clickable-div site (~20) became native `<button>`s via a `.card-btn` UA reset; `AbilityCard` renders a button only when clickable; `.hero-card` (which nests two footer buttons) got a stretched-overlay `hc-open` button instead. Verified: full Tab order, Enter selects cards.
- **C2** — delete/assign/campaign writes are optimistic with rollback + a bottom-center `SyncPill` (RETRY/✕); character autosave kept its own `SavePill`, now also shown on the play sheet and kept visible on phones. Foundry-export alert untouched (out of scope).
- **C3** — roster % = `wizardProgress()` (valid chapters ÷ `DS_STEPS.length`); "eight rites" → "seven rites". Fully-valid draft reads 100%.
- **C4** — class/career picks auto-scroll to their config anchors (`scrollWizardTo`); footer flags "· choices remain ▾"; Review's closing copy is conditional and links each unfinished chapter; QUICK BUILD styled as a real gold button.
- **C5** — auth screen states invite-only up front; NotInvited demotes Sign out to ghost and adds a primary "Copy my email for the Director".
- **C6** — Forge a New Hero is the gold-framed primary card; Rules Glossary demoted to outline; masthead padding trimmed.
- **C7** — `MQ.rail` (≤1024px) gained the play-grid + vitals collapse rules; 901px verified clean.
- **C8** — inline "A hero needs a name…" hint, label/input association, tooltip on the disabled CONTINUE, name field ordered above the portrait on phones.
- **H1** — rail ✓ = *visited-and-valid*; visits persist on the character (`wizardVisited`, seeded for legacy drafts) so navigating back no longer strips checkmarks; "Complication · optional" affix; right-edge scroll fade.
- **H2** — `.ac-roll` tier track widened to match `.kit-roll` (+ fixed a latent phone-override specificity bug). "12–16" renders on one line at every width.
- **H5** — 16 PNGs converted to WebP (repo script `scripts/convert-webp.mjs`, kept + npm `assets:webp`); ancestry/class posters later capped at 720px. Assets 33 MB → ~4 MB; roster image payload 6.6 MB → 0.46 MB; ancestry posters idle-prefetched at app start, class posters one chapter ahead.
- **H6** — all modals scroll in `.modal-body` with pinned head/foot; cost chip got the bordered pill treatment; blocked steps say "choose an option to continue"; stray `·` bullets removed.
- **H10** — Caelian never duplicates (Review line + `summarizeBenefits`); archetype chips clear when aspects diverge (and always show selection).
- **H11** — SKIP is always ghost; footer reads "CONTINUE · NO COMPLICATION ▸" until one is chosen.
- **H12** — topbar shows the current chapter's pick ("✦ HUMAN"); phone topbar keeps SAVE FAILED visible (`.pill:not(.rubric)` hidden instead of all pills).

### Round 3 — remaining Highs + cheap 🟢 tier

- **H3** — `@chr` expanded to the ability's own characteristic (`Slide 4 + R`) in `classes.js` + `levelup-talent.jsx`; the four Censor edicts' appended `2d6+N*@P` formula fragments deleted. **Divergence:** the 45 `**bold**` markers were *not* stripped — a `renderRich()` helper (primitives.jsx) renders `**…**` as real `<b>` at every effect/feature site, preserving the official bold labels. New guard: `src/__tests__/data-lint.test.ts` fails on `@`-tokens and unbalanced `**` across all data tables + `LEVELUP_DATA`.
- **H4** — when `!canEdit`: gauges/counters receive null handlers (buttons carry real `disabled`), condition chips disable, the per-level EDIT button hides, trait `<select>`s go read-only (`interactive={canEdit}`), and the tag reads "👁 Viewing · kept by ⟨owner⟩" (App passes the owner profile). New read-only regression test in `play.test.tsx`.
- **H7** — "◂ LIBER" → "◂ ROSTER"; CHRONICLED kept (brand voice) with explanatory `title` in roster + campaigns; SIG badge tooltip ("Signature ability — usable at will, no cost"); KEEPERS → OWNERS (+ "Ask your Director" on the invite wall); "Quick:" → "Quick build:"; potency legend is plain text with an "M < WEAK" explainer tooltip; condition chips gained ○/● toggle glyphs + `aria-pressed`.
- **H8** — "Start a Campaign" (button, modal title, empty state, roster modal); "RAISE THE BANNER" kept as the submit flavor; sigil caption ("a short invite code — ask your Director") on the hub itself.
- **H9** — `.ds-nav` right-edge mask fade (wiz-rail pattern, kept inside ACCOUNT_CSS for cascade order) + tighter tab tracking at ≤560px.
- **H13** — numeric readouts (stat tiles, LV badges, gauge/counter values, characteristic values, prog badges) moved from Cinzel Decorative to plain Cinzel (`--display-2`); `font-variant-ligatures: none` on `.h1-display`/`.h2-display`/`.hb-name`/`.cc-name`/`.auth-title` kills the TH-glyph collision.
- **H14** — stamina accent is gold; the fill (and value) turn rubric only at/below the winded threshold (already-derived `derived.winded`); empty tracks show a faint 45° hatch; `winded/max` guards added.
- **H15** — `.hc-del` rubric at rest + underline hover; action gap 10→22px (the −9px hit-areas used to overlap); admin cards reserve 42px right padding so names can't run under the ✕.
- **H16** — **decision: strip from prod** (user's pick). Tweaks panel moved to `src/tweaks-host.jsx`, loaded via `React.lazy` only when `import.meta.env.DEV`; App owns `--surface-alpha: 0.85` itself (load-bearing). Verified absent from the production bundle (no `__activate_edit_mode` in dist).
- **H17** — hash deep links: `#/hero/<id>`, `#/campaign/<id>`, `#/campaigns`, `#/admin`, `#/`. The existing history mirror now writes the hash on every entry; the hash is parsed once at cold boot (only `#/`-prefixed — OAuth `#access_token` fragments pass through), resolved after data loads, with hero links re-derived through the `openCharacter` permission rule and unknown ids surfacing a SyncPill notice. Stale hashes scrubbed on sign-out. Covered by `src/__tests__/deep-link.test.tsx` (parse/format tables + 6 App-mount cases). Known limits (by design): hand-edited hashes mid-session are ignored; a fresh OAuth round trip drops the deep link.
- **N4** — all 8 `transition: all` rules name their properties; one global `prefers-reduced-motion` block (RELIQUARY_CSS, `!important` so it wins across every injected sheet); `scrollWizardTo` falls back to instant scrolling under reduced motion.
- **N6** — `.rg-body` top/bottom mask fades (prose dissolves before the corner diamonds); filter input above the section list (works in the phone drawer too), matching titles + entry text.
- **N7** — Recovery Value tile relabeled and seated next to Recoveries; "Armor: ⟨x⟩ · Weapon: ⟨y⟩"; hand-built cultures titled by their aspect names instead of "Custom"; perk prose clamped to 4 lines (full text in `title`); every summary card carries an "edit ▸" corner link via the existing `onGoToStep`.
- **N8** — biography modal titles itself with the hero's name (duplicate big-name line removed); empty Appearance/Backstory show "not yet written" prompts for editors; ghost EDIT button in the footer returns to the wizard; unguarded pronouns div fixed.
- **N9** — tablet party grid 240→300px min (2-up, names intact); `.ph-foot` wraps with nowrap chips; avatar overlap −7→−4px; desktop `.cmp-grid` capped at 440px tracks + centered; MANAGE moved after the `<h1>` in DOM order so phones stack it below the title.
- **N10** — primary modal CTAs all end "▸"; `.btn.danger` got a filled red tint so ERASE/DISBAND outweigh their cancels; rules-modal diamonds resized 12px→16px to match `.modal`.
- **N11** — `PartyHeroCard` takes `editLabel`: "Edit" (own), "Edit · Director" (campaign), "Edit · Admin" (admin screen).
- **N12** — ancestry grid: "Each ancestry grants points to spend on traits…" before a pick; career grid: "Picking a career reveals its skills, languages, and inciting incident below."
- **N13** — admin subtitle "Every hero in the chronicle — visible to admins only"; noun unified on OWNERS.
- **N14** — phone wizard footer is a single row: back at natural width (ellipsizing only under pressure), CONTINUE fills the remainder (~75px vs ~150px stacked).
- **N15** — roster art falls back portrait → class → **ancestry** (previously unused); the ✠ watermark lifted above the scrim, brightened, and nudged into the scrim-free band; crop moved to `center 20%`.

### Round 4 — the deferred hygiene tier (N1, N2, N3, N5) + C2 residue

- **C2 residue** — the Foundry-export `alert()` (the last `alert` in src) now reports through the SyncPill: `PlayView` takes an `onError` prop (default no-op) wired to `reportSyncError`; failure reads "EXPORT FAILED — NO FOUNDRY FILE WAS SAVED".
- **N3** — dead tokens deleted (`--vellum`, `--illum-blue/green`, `--surface-fade-a`); `--surface-fade-b` + its unthemed partner rgba folded into a whole-value `--grad-masthead` token; the byte-identical `.ac-roll`/`.kit-roll` oklch tier ramps hoisted to `--tier{1,2,3}-{t,e}` tokens (one merged rule); `act-maneuver` aligned to `--tier2-t`; `MQ.hover` deleted (never used); the two `560px` literals (`.pw-grid`, levelup `.skill-pick-grid`) now use `${MQ.phone}`; the deliberate 1180/720px one-offs kept with comments.
- **N5** — the page canvas is themed: `body { background: var(--bg-0); color: var(--ink) }` in RELIQUARY_CSS (on `body`, not `html` — `data-theme` lives on `<body>`, so `html` can't see the override; `html` stays transparent and body's background propagates to the canvas). `index.html` keeps `#08080a/#ece4d2` as the pre-CSS-mount fallback only. `::selection` runs through `--selection-bg`; tap-highlight moved into the sheet as per-theme literals (var() is unreliable for that property on old Android). All **14** Obsidian component-override blocks (the audit's 12 + `.bg-paper`/`.bg-grain`) folded into whole-value tokens (`--grad-frame/card/card-hover/card-sel/modal/dropcap/paper/grain`, `--surface-input/portrait/backdrop`, `--shadow-*`, `--orn-*-alpha`) — the obsidian section is now a pure token block, so a new component can't silently miss the theme.
- **N1** — 9 font-size tokens (`--fs-1` 0.5rem … `--fs-9` 1rem, a 16ths-of-a-rem ladder). Every ≤1rem `font-size` literal in every CSS string swept onto them (176 declarations across 8 sheets); the five 32nds-of-a-rem sizes rounded **up** to the nearest 16th (≤6%, ~0.7px) and the 12 inline 32nds converted too — zero fractional-32nd sizes remain outside the dev-only tweaks panel. Display sizes >1rem stay art-directed literals. **Divergence (user's pick):** no `--space-*` tokens / padding rounding — the ~28 padding values are measured one-offs; a comment at the token block asks new spacing to land on the 4pt grid.
- **N2** — one `<TopBar>` primitive (left mark/brand/sub · center · right slots, `auto 1fr auto` grid) renders all three bars; unified metrics: `12px 28px` padding (4pt grid), `var(--surface-top)` background (fixes `.ds-appbar`'s Obsidian-literal `rgba(8,8,10,0.78)` — it was mis-themed under Reliquary), blur 6, z 40, brand `--fs-8`/0.26em. Shared MQ tiers live in the same RELIQUARY_CSS string; screen-specific rules (collapsible buttons, nav fade, brand-hiding) hang off the passthrough classNames. The wizard's inline hero-name style became the `.tb-sub` slot; dead CSS deleted (`.wiz-topbar` 3-col variant + `.brand-sub`, `.rules-launcher.large` — its only call site never passed `large`). `.btn.primary` inks tokenized (`--btn-primary-ink`, `--btn-primary-ink-hover`). The auth masthead's 4 verbatim copies became one `<Masthead>` (auth gate, name prompt, invite wall, boot splash).

**Verification (round 4):** 594/594 vitest, typecheck clean, prod build + smoke pass, and a Playwright harness sweep (real AppBar/Wizard/PlayView/AuthScreen with factory heroes) across **both themes** × appbar/wizard/play/auth × 1440/900/390 — no overflow, no console errors, all three bars on the shared geometry, body/canvas correctly themed in each theme, tier tokens resolving on rendered cards. The sweep caught (and the fix landed) one regression: the first cut set the themed background on `html`, which can't see `body[data-theme]` — Obsidian's canvas went navy until the rule moved to `body`.

### Also fixed along the way (user-reported, post-round-2)
1. Rail checkmarks no longer vanish when navigating back to Ancestry (`wizardVisited` persisted on the character; positional "seen" clause removed).
2. Unspent ancestry points now hold the step incomplete (`isStepValid` enforces the budget, with an escape hatch when no affordable trait remains) — heroes can't commit as CHRONICLED with points left over; the pill warns "SPEND ALL TO COMPLETE". Re-clicking the selected ancestry no longer wipes trait picks.
3. Ancestry posters resized to 720px (1.68 MB → 1.03 MB) and idle-prefetched at app start, so the chapter opens from cache.
4. The step-0 footer no longer duplicates the topbar's ◂ ROSTER button.

**Verification (round 3):** 594/594 vitest (23 files, incl. new `data-lint`, `deep-link`, read-only-play tests), typecheck clean, prod-bundle smoke pass, tweaks code confirmed absent from dist, and a Playwright sweep over play (editable/read-only/leveled-Talent), roster, campaign hub + detail (1440/900/390), rules modal, wizard steps 0/2/4/6 and the phone footer — zero console errors.

## What's Already Excellent (don't lose these while fixing)

- **Zero console errors, zero layout overflow across 7 viewports** — the responsive engineering is real (gauge regrouping at tablet, full-width steppers on phone, rules drawer at 390, 44px touch targets, safe-area insets).
- **Graceful font degradation**: Google Fonts blocked → clean Georgia fallback, no tofu, no layout shift worth the name.
- Play-sheet hierarchy (stamina-first), ability color coding, and the −5/−1/+1/+5 steppers are genuinely best-in-class for at-the-table use.
- The chapter framing ("Blood & Bone" … "Liber Heroum"), drop caps, autosave pill, "None — a simpler life." empty states, named-consequence delete modals, and the Join-by-Sigil explainer are the craft moments that make this feel loved. The Review hero plate is the shareable moment — protect it.
- The commit flow's soft gate (modal with per-chapter FIX ▸ links + SAVE AS DRAFT) is the right pattern — it just needs the Review copy (C4) to stop contradicting it.

## Suggested attack order

1. **C1** (one primitive → whole-app keyboard access) · **C3** (three-line fix, ends the progress lie) · **C6** (style swap) — a day of work, disproportionate trust gained.
2. **C7 + H2** (two breakpoint/width fixes make play polished at every size) · **C8 + H6** (kill both silent-disable moments).
3. **C4 + H1 + H10-H12** — the wizard-integrity cluster.
4. **H5** (point data at existing WebPs — biggest perf win per minute of work) · **C2** (reuse save pill globally).
5. Everything else as touched.

*Generated from a live runtime audit: throwaway harness rendering real components with factory-built heroes (since removed); Playwright sweep across 1440/1000/901/820/560/390/360; tab-order, network-weight, and font-block probes. No code was changed.*
