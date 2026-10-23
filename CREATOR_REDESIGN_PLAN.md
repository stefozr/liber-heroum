# Codex-style character creator for Liber Heroum (side-by-side prototype)

## Context

The current creation wizard (`src/wizard/Wizard.jsx` + `src/wizard/steps/*.jsx`) is seven long single-column chapters. Each chapter puts a poster/card grid at the top and the real mechanics (skill picks, traits, subclass, kits, abilities) several viewports below; the class step runs 15–30 screens. The UX audit (UX_AUDIT.md) patched this with auto-scroll, a sticky class docket and "N choices remain", but the shape stayed: the fantasy is sold up top, the mechanics are hidden below, and skill/language picks are scattered across five chapters with their own inline chip grids.

The Codex app's creator (screenshots in `Extra/New Design/*.png`) solves the same problem with a different information architecture:

- **Header** with horizontal step tabs that carry a status line ("Not started", "Done", "Optional", "N left") and a Save and Close button.
- **Left sidebar**: a live hero summary (portrait, M/A/R/I/P, name, "Level 1 Devil Tactician", stamina) plus a Culture / Career / Kit / Complication key-value list.
- **Main column**: the step intro, a grid of name-only option buttons, an informational "Skills & Languages" box saying what the pick grants, then "Your choices" framed sub-sections each with its own status word.
- **Right sidebar**: a detail panel showing the hovered item, else the selected item, else the step's rules intro, with art on top.
- **A dedicated Skills & Languages step** listing every source of skills/languages, how many each grants, with cross-source dedupe.

Decisions already made with the user:

1. **Side-by-side prototype.** The new creator ships as a separate layout behind a toggle; the existing wizard and its 594 tests stay untouched (shared logic may be lifted into modules both import). Compare on the same hero, then delete the loser.
2. **Keep Liber Heroum's art direction.** Tokens, Cinzel/Garamond/mono, ornaments, ancestry/class art. Adopt the Codex layout and IA, not its flat look.
3. **Skill and language picks happen only in the Skills & Languages step.** Other steps show an informational box only.

Intended outcome: a working prototype of the new creator that the user can drive end to end on a real hero (desktop, tablet and phone), to judge whether the layout improves the creation UX before committing to it.

## Design decisions

| Decision | Choice | Why |
|---|---|---|
| Review step | Keep a lightweight 8th tab `review` rendering the existing `ReviewStep` unchanged; the commit action ("COMMIT TO THE LIBER ▸") and the existing "This Hero Isn't Finished" modal live on that tab. "Save and Close" in the header is plain `onExit` (status stays in-progress). | Protects the hero plate, `onComplete(true/false)`, `status:'complete'` and `wizardProgress` without reimplementing them. |
| Step index | New `creatorStep` + `creatorVisited` fields on the hero (read with defaults; not added to `newCharacter` so schema/snapshot tests stay put). `wizardStep` untouched. | The two step lists differ (8 vs 7). |
| Issue re-bucketing | `stepIssueEntries(c, idx)` → `[{ text, topic }]` in `Wizard.jsx`; `stepIssues` becomes `entries.map(e => e.text)`. | Old wizard and its string-asserting tests are untouched; the creator maps by topic. |
| Mutations | Lift every `update(c => …)` body from the step files into pure `(c, …args) => c'` functions in a new `src/wizard/mutations.js`; both wizards call them. | No copy-paste; the existing interaction tests verify the refactor. |
| Characteristics | Keep the point-buy `.pb-grid` as the control, and add the official arrays as one-click buttons above it (Codex "1, 1, -1" style) that just set the flex values. | Arrays cover 90% of picks; point-buy stays for the rest; validation already accepts both. |
| Art | Poster grids go away in the creator; ancestry/class art moves to the top of the right detail panel. No fixed `.step-bg` photo in the creator (three panels over a full-bleed photo fight for contrast); the app's paper/grain stays. | Matches the screenshots; keeps LH's art direction. |
| Header | Two rows: a `TopBar` (brand, hero name, SavePill, SAVE AND CLOSE) above a full-width step-tab strip. | At 1rem = 21.6px, eight Cinzel tabs with status lines need ~1440px; a single Codex-style row can't fit. |
| Footer | Keep a slim Back / "Step N of 8 · M choices remain" / CONTINUE footer (reusing `.wiz-footer`). | The audit valued the validated Continue path; Codex's header-only navigation loses it. |
| Detail panel on touch | Tap selects and pins; the panel is a slide-over drawer (≤1024) or bottom sheet (≤560) opened by a per-section "details ▸" link, an ⓘ on the selected option, or a header button. | Tap-to-preview/second-tap-to-select would make every pick two taps. |

## Step list and status model

`src/creator/steps.js`:

```js
export const CREATOR_STEPS = [
  { id: 'ancestry',     name: 'Ancestry',           wizardId: 'ancestry' },
  { id: 'culture',      name: 'Culture',            wizardId: 'culture' },
  { id: 'career',       name: 'Career',             wizardId: 'career' },
  { id: 'class',        name: 'Class',              wizardId: 'class' },
  { id: 'skills',       name: 'Skills & Languages', wizardId: null, deck: '…picked here in one place…' },
  { id: 'complication', name: 'Complication',       wizardId: 'complication', optional: true },
  { id: 'identity',     name: 'Identity',           wizardId: 'identity' },
  { id: 'review',       name: 'Review',             wizardId: 'review' },
];
```
Intro copy (`title`/`deck`/`bg`) for the seven shared steps is looked up from `DS_STEPS` by `wizardId`; only `skills` carries its own deck.

### `stepIssueEntries` topics (edit in `src/wizard/Wizard.jsx`)

Mechanical change: `issues.push('…')` → `push(topic, '…')`; `swapIssues`/`dupPickIssues` return `topic: 'skill'`; early returns become entries. `perkPickIssues` in `app.jsx` gets a sibling `perkPickIssueEntries` (ownSkill → skill, Linguist languages → language). Also export `unresolvedSwaps` and `stepSummary` from Wizard.jsx (the creator reuses both).

| topic `skill` | topic `language` | topic `other` (stays in its step) |
|---|---|---|
| sig/trait "skill not picked / N of M skills picked"; culture aspect skill not picked; career "Skills: N of M"; Area of Expertise / Specialist follow-up; career/class/complication swap issues; all dup-pick issues; class "Class skills: N of M"; conduit/censor "Domain skill not picked"; complication "Skill(s) … picked"; complication ownSkillChoices | culture "Language not chosen"; career languages; Linguist languages; complication languageChoice; complication languageLoss | everything else: headline picks, sig/trait option choices, former life, ancestry points, perk choice, subclass/domains/domain feature/domain ability, abilities, kits, companion, minions, prayer/ward/etc., characteristics, complication option/ability/trait picks, name |

Because `Ancestry not chosen` / `Career not chosen` / `Class not chosen` return early, an unchosen source contributes no skill entries: skill sources appear on the Skills tab as you choose them.

### `src/creator/status.js`

- `creatorIssueEntries(c, stepId)`: for `skills` → union of `skill`/`language` entries from the five source steps, each tagged with `source` (chapter name) for display as `${source}: ${text}`; for a source step → its entries minus those topics; `review` → `[]`; identity → as is.
- `creatorStarted(c, stepId)`: ancestry/career/class/complication = headline id set; culture = any aspect set; skills = any slot has a pick; identity and review = always started.
- `creatorStepStatus(c, stepId)` → `{ state: 'not-started'|'optional'|'in-progress'|'done', left }`. Complication with no id → `optional`. Review → `left` = number of other steps with issues. Tab rendering: done → ✓ "Done"; optional → number "Optional"; not-started → number "Not started"; in-progress → number "N left".
- Invariant (tested): the multiset of issue texts over `CREATOR_STEPS` equals that over `DS_STEPS`, so the commit gate (`allValid`) is unchanged and roster `wizardProgress` stays correct.

## Skill & language slot model — `src/creator/skill-slots.js`

`skillSlots(c)` returns ordered descriptors (ancestry → culture → career → class → complication):

```ts
{ id, key /* the skillsTakenExcept key: 'sig:<n>' | 'trait:<n>' | 'culture:environment|organization|upbringing' | 'career' | 'class' | 'domain' | 'comp:fixed' | 'comp:<i>'; null for ownSkill/swap */,
  step, source /* "Devil — Silver Tongue", "Culture — Urban", "Aristocrat", "Tactician", "Vanguard doctrine", "Creation domain — Hands of the Maker", "Grifter" */,
  kind: 'grant'|'pick'|'ownSkill'|'swap', granted: string[], picks: [{ idx, count, groups?, options?, label, pool }],
  picked: string[], pickedIdx: Map, taken: Map /* skillsTakenExcept(c, key) */, done, issues: string[], pending?,
  toggle: (c, name, idx?) => c, blockedReason: (name, idx?) => string|null,
  collision?, pool?, chosen?, ownNames? /* swap kind */ }
```

Slot sources and the existing logic each lifts: ancestry signatures (`sigSkills`, `toggleSigSkill`), choice traits via `resolvedAncestryTraits` (`traitSkills`), the three culture aspects (`culture.skills[key]`, pool from `sel.skills ?? skillGroups` as culture.jsx:74), career (`parseCareerSkills` autos as `granted`, picks with `pickPool`, attribution via `attributeCareerSkills`, `toggleCareerSkill`, plus a `quickBuild`), career swap slots per `careerAutoCollisions`, perk ownSkill (`PERK_CHOICES`, pool `heldSkillsFor`), class picks (`classGrantedSkills` as granted, `classSkillPicks` groups, `toggleClassSkill`, `quickBuild`), the subclass skill-group pick as its own "<Sub> doctrine" slot (the trailing `classSkillPicks` entry), class swap slots, domain skill (`cclass.domainSkill`; emitted with `pending` and `done:true` until a domain feature exists), complication fixed grants + swaps, `comp:<i>` choices, and `comp:own:<i>` ownSkill picks.

`blockedReason` mirrors today's chip rules: a picked name is never blocked (always removable); granted → "Granted by …"; `taken.has` → "Already chosen — <source>"; held by a sibling group of the same slot; group at capacity → "Already picked N". Dup-pick issues (`duplicateSkillPicks(c).filter(d => d.key === slot.key)`) land in `slot.issues`, make `done:false`, and keep the chip enabled so it can be deselected.

`languageSlots(c)` → `standard` (grant Caelian), `culture` (single value, taken = `languagesTakenExcept(c, ['culture','standard'])`), `career` (count `car.languages`), `perk:career` (Linguist, 2), `complication` (count, pool `options ?? DS_LANGUAGES`), `forgotten` (kind `loss`, pool = known names).

Helpers: `slotsForStep(c, stepId)` (filter by step, used by each step's info box) and `skillInfoLines(c, stepId)` → `[{ label, text }]` ("Silver Tongue Skill: Choose 1 skill from the Interpersonal skill group", "Tactician Skill: Lead", "Choose a Language", "Sneak is already granted by Ancestry — choose another intrigue skill"), with picked values appended once chosen. Invariant (tested): all slots `done` ⇔ `creatorIssues(c,'skills')` empty.

## Shared mutations — `src/wizard/mutations.js`

Pure `(c, …) => c` functions, returning `c` itself on no-op; imports only data + helpers (never app.jsx; the two quick-build functions take the `taken` map as an argument). Lift, keeping behaviour identical:

- ancestry.jsx 16–122: `setAncestry`, `setFormerLife`, `setPrevLifeTrait`, `toggleSigSkill`, `toggleSigOption`, `toggleTraitSkill`, `toggleTraitOption`, `toggleAncestryTrait` (computes remaining points inside).
- culture.jsx 13–42: `setCultureField`, `setCultureAspect`, `toggleCultureSkill`, `applyCultureArchetype`.
- career.jsx 16–105, 190–196: `setCareer` (reseeds autos), `setCareerIncident`, `setCareerTaken`, `toggleCareerLanguage`, `setCareerPerk`, `togglePerkPick`, `setCareerSwap`, `toggleCareerSkill`, `applyCareerQuickBuild(c, taken)`.
- class.jsx: `setClass` (also resets level/levelChoices/play), `setSubclass` (kit/skill/swap/minion pruning), `toggleDomain`, `setDomainFeature`, `setDomainAbility`, `setDomainSkill`, `pickCensorDomain`, `setClassChoice(stateKey, name)`, `setCompanion`, `setCompanionOption`, `toggleMinion`, `setClassSwap`, `toggleClassSkill`, `applyClassQuickBuild(c, taken)`, `setCharacteristic`, `resetCharacteristics`, `ensureCharacteristics`, `toggleSignature`, `setHeroic3`, `setHeroic5`, `setKit`, `pickDualKit`.
- complication.jsx 17–61: `blankComplication`, `setComplication`, `skipComplication`, `toggleComplicationChoiceSkill`, `toggleComplicationLanguage`, `setComplicationSwap`, `toggleComplicationIn`, `setComplicationText`, `setComplicationAbility`, `toggleForgottenLanguage`, `toggleComplicationTrait`.
- identity.jsx 39: `setIdentityField`.

Scroll side effects (`scrollWizardTo`, `scrollToComp`) stay in the old components. `PW_CONFIG` stays in class.jsx. Old step files become one-liners like `update(c => mut.setCareer(c, id))`.

## Routing and the toggle

- `src/creator/preference.js`: `getCreatorPref()`/`setCreatorPref(v)` on localStorage key `lh:creator` (`'wizard'` default | `'codex'`), `editorViewFor(pref)` → `'wizard'|'creator'`.
- `app.jsx`: `creatorPref` state; `createCharacter` (~676), `openCharacter` (~688) and PlayView `onEdit` (~1096) use `editorViewFor(creatorPref)`; `navToHash` (~45), the boot guard (~914) and the SyncPill condition (~1114) treat `'creator'` like `'wizard'`; mount `<Creator …/>` beside the Wizard (~1066) with identical props. Deep links stay `#/hero/<id>` and resolve to whichever creator is active.
- Roster: a small two-option switch ("Classic wizard / Codex layout") in the "Your Heroes" title row next to the `N TOTAL` pill; props `creatorPref`, `onSetCreatorPref`. Also a ghost "Open in classic wizard" / "Open in Codex layout" link in each creator's header so the same hero can be flipped in place.
- `Creator.jsx`: `stepIndex = clamp(c.creatorStep || 0)`; `setStep` writes `creatorStep`/`creatorVisited` like Wizard.jsx:24-33; provides a `CreatorContext { character, update, goToStep(id), setDetail }`; class step gets `classSections(c)` minus `class-sec-skills`/`class-sec-domain-skill`; runs `ensureCharacteristics` once per class so the sidebar never shows zeros.

## Left-sidebar data — `src/creator/summary.js`

`heroSummary(c)` → `{ name, portrait, subtitle: "Level 1 Devil Tactician", chars (from computeDerived), stamina {current,max}, recoveries, speed, stability, size, kv: [['Culture', stepSummary(c,'culture')], ['Career', …], ['Kit', kit + kit2 names], ['Complication', …]] }`. Art fallback portrait → class → ancestry as roster.jsx does.

## Layout and components — `src/creator/`

```
src/creator/
  Creator.jsx            shell: grid, step routing, DetailProvider, drawer state, footer, commit modal
  CreatorHeader.jsx      TopBar row + StepTabs strip + compact navbar (≤900) + step-list Modal
  StepTabs.jsx           tab buttons: badge (number / ✓), name, status line
  HeroSummary.jsx        left: portrait card with M/A/R/I/P chips, name, "Level 1 Devil Tactician", stamina bar
  KeyValueList.jsx       left: Culture / Career / Kit / Complication
  ChoiceSection.jsx      framed section: title + status word + hint (+ "details ▸" on narrow tiers)
  OptionGrid.jsx / OptionButton.jsx   name-only <button> grid (cost tag, 1ST/2ND badge, granted ✓, ⓘ cell)
  InfoBox.jsx            the informational "Skills & Languages" box
  DetailPanel.jsx        right column / drawer; resolves the detail target to a renderer
  detail-context.jsx     DetailProvider + useDetailTarget()
  detail/renderers.jsx   DETAIL_RENDERERS registry; detail/DetailImage.jsx (flicker-free image swap)
  steps/{Ancestry,Culture,Career,Class,Skills,Complication,Identity,Review}Main.jsx
  steps.js status.js skill-slots.js summary.js preference.js context.js   (state side, above)
  creator-styles.js      CREATOR_CSS + <CreatorStyles/>
```

**Shell** (`.cr`): `display:grid; grid-template-rows: auto auto minmax(0,1fr) auto; grid-template-columns: var(--cr-left,300px) minmax(0,1fr) var(--cr-right,440px); grid-template-areas: "top top top" "tabs tabs tabs" "left main right" "foot foot foot"`. Left, main and right are independent `overflow-y:auto` scrollers, so the header and sidebars stay while the main column scrolls (the Class 3/4 screenshots). Copy from Wizard.jsx: scroll-to-top on step change (87-90), active-tab `scrollIntoView` (97-100), class-poster prefetch one step ahead (102-113), footer (194-216) and the commit-warning Modal (218-239). Mount `<CreatorStyles/>` and `<SheetStyles/>` once at the top.

**Header**: row 1 is `TopBar` with `brand="CREATE YOUR HERO"`, `sub` = hero name + "Level 1 hero", `right` = `SavePill` + ghost `SAVE AND CLOSE` (→ `onExit`) + a ghost "Classic wizard" link that flips the preference and view. Row 2 is `<nav aria-label="Creation steps" class="cr-tabs">` of `button.card-btn.cr-tab.{state}` with `aria-current="step"`, a 26px badge reusing the `.wiz-rail .rnum` look (gold-filled ✓ when done), the step name (title case, not uppercase; "Skills" short label for the strip) and the status line coloured done `var(--tier3-t)`, in-progress `var(--gold-2)`, else `var(--ink-3)`. Strip is `overflow-x:auto; scrollbar-width:none` with the `.wiz-rail` right-edge mask fade below a measured `@media (max-width:1400px)`. At ≤900 a `.wiz-railbar`-style navbar replaces it; its centre label is a button opening a `Modal` listing all steps with number/✓, name and status (rows call `goToStep`). Both stay in the DOM; CSS swaps them (tests can assert every step name).

**OptionButton**: `button.card-btn.opt-btn` with `aria-pressed`, `disabled` when blocked/granted (+ `title` reason), `onPointerEnter/Leave` guarded by `pointerType==='mouse'` → `preview(detail)`, `onFocus/Blur` → focus preview, `onClick` → select + pin. States in tokens only: rest `1px solid var(--line-2)` / `var(--grad-card)` / `--display-2` 600 `--fs-5` centred, min-height 44px; hover/focus-visible `--gold-deep` / `--grad-card-hover`; selected `--gold` / `--grad-card-sel` / `--shadow-card-sel` / `--gold-2` text; dimmed `opacity:.55` (hover restores); blocked `opacity:.4; line-through`; granted = selected colours + ✓, `cursor:default`. `.opt-cost` "(2)" in mono `--fs-3`; `.opt-badge` = `.tag.gold`. Not a SelCard variant: `.card` paints a double border, 16px padding and the ✠ stamp that would all need overriding. `OptionGrid` wraps each button in `div.opt-cell` so the narrow-tier ⓘ (`button.opt-info`, shown only for the selected option at ≤1024) can be a sibling, since buttons can't nest.

**ChoiceSection**: `<section class="cr-sec" id=…>` head = `h3.cr-sec-title` + `span.cr-sec-status.{choose|done|points|optional|granted}` + optional right-slot button (d6/d100 roll) + (≤1024) `button.cr-sec-details`; then `.cr-sec-hint` (hand italic `--ink-3`, "Quick build: X" appended) and children. Framed with `1px solid var(--line-2)` + `var(--grad-card)`; the step's headline pick uses `variant="bare"` (only "Your choices" sub-sections are boxed, as in the screenshots). Each step main emits `.cr-choices-head` ("Your choices") before its first framed section.

**InfoBox** (`.cr-infobox`): border `var(--line-strong)`, centred display-2 title "Skills & Languages" in `--gold-2`, rows `<b>Label:</b> text` from `skillInfoLines(c, stepId)`, ending with a `button.cr-infobox-go` "choose on the Skills step ▸" → `goToStep('skills')`.

**HeroSummary**: art fallback as roster.jsx:146-149 (portrait → class cardImg/img → ancestry img → ✠ watermark) in a 2:3 card with a bottom scrim; five `.hs-chip` "M +2" (from `heroSummary(c).chars`, "+0" until a class); name (display-2 `--fs-7`); level line (mono `--fs-2`); stamina bar + "21/21". **KeyValueList**: `.cr-kv` rows, mono label / serif value, "—" when unset.

**DetailPanel**: `<aside class="cr-right" role="complementary" aria-label="Details">`, own scroller. `DetailImage` = 3:2 box, `object-fit:cover; object-position:center 18%`, keeps the previous image painted until the next `onLoad`. Renderer registry (all reuse existing primitives):

| kind | top image | body |
|---|---|---|
| stepIntro | — | step name + `DS_STEPS[i].deck` (default when nothing is hovered/pinned) |
| ancestry | `a.img` | name, `desc`, height/weight/lifespan (ancestry.jsx 231-237), signature trait via `TraitProse`/`TraitAbilityCards`, points note |
| trait / sig / formerLife | — / `a.img` | name + cost tag, `TraitProse`, `TraitAbilityCards`, "borrowed from" note |
| archetype / aspect | — | names + `renderRich(desc)`; aspect adds "Skill: choose 1 from X · Quick build: Y" |
| career / incident / perk | — | `renderRich(desc)`, benefits KV (career.jsx 142-149), defining questions; incident text; perk `TraitProse` + cards |
| class | `cls.cardImg` | name, role · resource, quote in `--hand`, `longBlurb`, then the 1st-level features list (`AbilityCard kind="sig"` for `f.ability` with `riderBySub` applied, else name + `renderRich(text)` + `FeatureTable`) |
| subclass / domain / domainFeature / domainAbility / featureOption | — | text + granted feature/ability cards (class.jsx 142-162, `DOMAIN_1ST_FEATURES` / `CENSOR_DOMAIN_1`) |
| charArray | — | five-row score table (fixed + array over `flexCharOrder`) and the budget note |
| ability | — | `AbilityCard` (sig/heroic) |
| kit | — | `KitDetails` + kit features/tables (class.jsx 966-972) |
| companion / minion | — | `StatblockCard` (`staminaNote="= yours"` for companions) |
| complication | — | Benefit/Drawback tags + `renderRich` (complication.jsx 236-243), granted `AbilityCard`s |
| skill / language | — | name, group(s), "held by / also offered by …" from `skillsTakenExcept` / `languagesTakenExcept` |
| identity | — | live hero-plate preview (review.jsx 73-93 without the tiles) while the name is typed |
| review | — | `UnfinishedChapters` when incomplete, else the "rites are complete" copy |

## Detail-panel semantics — `detail-context.jsx`

`current = hover ?? focus ?? pinned ?? stepIntro`. `preview(d)` sets hover after 60ms, `previewEnd()` clears after 120ms (no flashing between adjacent buttons). `focus`/`blur` from keyboard Tab preview without moving focus. `pin(d)` is called by a step after a selecting click and reset on step mount to the step's headline selection (chosen class → class detail, else intro). Touch: pointer events ignore non-mouse pointers, so a tap only selects + pins; the drawer opens from "details ▸", the ⓘ cell, or the header details button (long-press is optional polish, 450ms with move cancel and `-webkit-touch-callout:none`). Drawer state `{ target, returnTo }` lives in the provider.

## Responsive plan (all rules in `CREATOR_CSS`, media queries in the same string)

| tier | query | layout |
|---|---|---|
| ≥1440 | default | 300 / fluid / 440; `.opt-grid` auto-fill minmax(148px,1fr) → 4-up |
| 1280–1439 | `@media (max-width:1439px)` (measured one-off, commented like the existing 1180/720) | `--cr-left:260px; --cr-right:380px`; summary card 150px |
| 1025–1279 | `@media (max-width:1279px)` | columns `minmax(0,1fr) var(--cr-right)`, areas `"top top" "tabs tabs" "left left" "main right" "foot foot"`; `.cr-left` becomes a horizontal strip (56px portrait, name/level inline, KV rows inline with `·`) |
| ≤1024 | `${MQ.rail}` | one column `"top" "tabs" "left" "main" "foot"`; `.cr-right` becomes a fixed slide-over drawer (`width:min(440px,92vw)`, `translateX(100%)` → `.open`), `.cr-backdrop` with `var(--surface-backdrop)`, drawer head with ✕; `.cr-sec-details`/`.opt-info` shown; header "≡ details" IconButton |
| ≤900 | `${MQ.tab}` | `.cr-tabs{display:none} .cr-navbar{display:flex}`; main padding 20px |
| ≤560 | `${MQ.phone}` | `.opt-grid` 2-up; 44px tap floors; drawer becomes a bottom sheet (`height:72dvh; translateY(100%)`); summary strip wraps to two lines; footer uses the existing `.wiz-footer` phone rules (class `wiz-footer cr-footer`) |
| touch | `${MQ.touch}` | `.opt-btn:hover` reset to rest; blocked-chip hint line as `.skill-chip-grid:has(.blocked)::after` does |

Reused as-is: `.card-btn`, `.btn*`, `.pill`, `.tag`, `.topbar/.tb-*` tiers, `.wiz-railbar .rb-*`, `.wiz-footer` + phone rules, `.orn-frame`, `.skill-chip*` (swap blocks and point-buy only), `.pb-grid/*`, `.ability-card`, `.kit-card`, SHEET_CSS, `.input-*`, `.portrait-*`, `.review-portrait`, `.modal*`, `.grid-2/3/4`, `.h2-display/.h3-display`, `.rt-*`. Only `var(--*)` colours in CREATOR_CSS; the one literal is the dark art scrim (same as `.pc-scrim`).

Two small lifts in existing files: `scrollWizardTo(id, scrollerSelector = '.wiz-step')` in helpers.js so the creator passes `'.cr-main'`; and `review.jsx` gains an optional `onEditStep(id)` prop that the "edit ▸" links prefer over `onGoToStep(index)`, so the creator's `incompleteSteps` rows can carry creator indices while edit links resolve by step id (the Skills step has no `DS_STEPS` index).

## Per-step presentation

Status words: "Choose one" / "Choose N" / "N points to spend" while open, green "Done" when satisfied, "Optional", "Granted". Class sections take `done` from `classSections(c)`; other steps from the same predicates `creatorStepStatus` uses.

- **Ancestry**: bare "Choose your ancestry" grid (`DS_ANCESTRIES`); InfoBox (signature/trait skill slots); framed: "Signature trait: X" only when it has an `optionChoice` (Wyrmplate, Runic Carving); "Former life" (revenant); "Purchased {Ancestry} traits" with `cost` tags, "N points to spend", `blocked` when over budget, quick-build hint; "Previous Life (N pt)" per purchased PL trait; one section per purchased trait with an `optionChoice` (Prismatic Scales, Psionic Gift). No skill pickers here.
- **Culture**: no "Ancestry cultures" grid (LH has none; comment it). "Archetypical cultures" (bare, Optional → Done), head "Or build your own culture from three aspects", InfoBox (three aspect skill slots + culture language), then Environment / Organization / Upbringing sections (hint = `skillLabel` + quick build). Native language → Skills step.
- **Career**: bare career grid; InfoBox (autos as "You gain: Sneak", picks, languages, perk follow-ups); "Inciting incident" with "⚄ Roll 1d6" in the head; "{Group} perk" with quick-build hint; "What was taken from you" textarea (Optional). Swap prompts → Skills step.
- **Class** (ids keep the `class-sec-*` anchors): bare class grid (WIP badge); InfoBox (granted, picks, subclass skill, domain skill); `{subclassName}`; Domains (Choose 2, cols 4) → Domain feature → Domain ability (Conduit); Deity & Domain (Censor); **Characteristics**: `cls.charArrays` as buttons labelled "1, 1, −1" with `A +1 · R +1 · I −1` sub-labels plus a "Custom" button revealing the lifted `.pb-grid` point-buy (selected = `matchesCharArray`; Custom when valid but not an array); Kit / Choose two kits (1ST/2ND badges, suggested hint); Companion + its option; Portfolio minions (Choose 2 per tier); one section per `PW_CONFIG[f.choose]` entry in feature order (Triggered action = Optional); Signature ability(ies) (or `signatureNote`); 3-/5-resource heroic abilities. No `ClassDocket`; class skill picks → Skills step.
- **Skills & Languages**: one framed section per `skillSlots(c)` descriptor (title = `source`, status Choose N / Done / Granted, hint = groups / "Granted by …" / quick build, options = pool as OptionButtons with `blocked` + `title` from `blockedReason`, `granted` ✓ disabled, a Quick build button where the slot exposes one); a swap slot renders as "Choose another {group} skill instead of {skill}"; then head "Languages" and one section per `languageSlots(c)` (Caelian as granted). Detail renderers `skill`/`language`.
- **Complication**: bare grid with **"No Complication"** first (`selected` when no id, → `skipComplication`), "⚄ Roll d100" in the head (roll → `scrollWizardTo('comp-'+id, '.cr-main')`); InfoBox (fixed skills, skill/language choices, language loss → Skills step); framed sub-sections for the non-slot follow-ups: `optionChoices`, `ownSkillChoices` (over `heldSkillsFor`), `abilityChoices` (names; detail `ability`), `traitChoice` (cost tags, points), `textChoices` (`TextChoiceField`, Optional).
- **Identity**: render the existing `IdentityStep` unchanged; detail panel = live hero-plate preview.
- **Review**: render the existing `ReviewStep` with `incompleteSteps` built over `CREATOR_STEPS`, `onGoToStep(i)` = creator index, `onEditStep(id)`; footer primary "COMMIT TO THE LIBER ▸" + the existing commit modal.

## Footer and accessibility

Footer = `.wiz-footer cr-footer`: ghost "◂ {prev}" (invisible placeholder on step 1), `aria-live="polite"` meta "Step 3 of 8 · Career · 2 choices remain ▾", primary CONTINUE (Identity: disabled + title until named; Complication: "CONTINUE · NO COMPLICATION ▸"; Review: commit). Tabs are a `<nav>` of buttons with `aria-current` (not an ARIA tablist; steps are routes). Options carry `aria-pressed`; blocked/granted are real `disabled` with `title`. Drawer: `role="dialog" aria-modal`, focus the ✕ on open, `inert` on the siblings, Escape closes (keydown listener as ClassDocket.jsx:50-55), focus returns to `returnTo`. Hover/focus previews never move focus. Both themes via tokens only; global `prefers-reduced-motion` covers transitions.

## Implementation order

1. **Lift mutations** → `src/wizard/mutations.js`; rewrite the six old step files to call it. Full suite stays green (this is the regression net).
2. **Structured issues** → `stepIssueEntries` + exports (`unresolvedSwaps`, `stepSummary`) in Wizard.jsx; `perkPickIssueEntries` in app.jsx; re-exports in wizard.jsx; `scrollWizardTo` selector param; `onEditStep` in review.jsx. Suite unchanged.
3. **Step + status model** → `creator/steps.js`, `creator/status.js`, `src/__tests__/creator-status.test.ts`.
4. **Slot model** → `creator/skill-slots.js`, `src/__tests__/creator-skills.test.ts`.
5. **Summary data + preference** → `creator/summary.js`, `creator/preference.js`.
6. **Shell, styles, header, sidebars** → `creator-styles.js`, `Creator.jsx`, `CreatorHeader.jsx`, `StepTabs.jsx`, `HeroSummary.jsx`, `KeyValueList.jsx`; mount in app.jsx (`view === 'creator'`, routing, hash, boot guard, SyncPill) and the roster switch. Verify the grid at 1440/1279/1024/900/560 with placeholder columns.
7. **Detail context, panel, primitives** → `detail-context.jsx`, `DetailPanel.jsx`, `DetailImage.jsx`, `renderers.jsx` (stepIntro/ancestry/trait first), `OptionGrid/OptionButton/ChoiceSection/InfoBox`.
8. **Steps** in order: Ancestry → Culture, Career → Class (arrays + Custom point-buy) → Skills & Languages → Complication → Identity, Review. Add the matching renderers as each step needs them.
9. **Narrow-tier affordances**: ⓘ cells, "details ▸", header button, drawer focus management, bottom sheet.
10. **Tests** → `src/__tests__/creator.test.tsx` (render every step for `hero()` and for `buildValidCharacter` across every class and ancestry; every `.opt-btn` is `button[aria-pressed]`; hover/focus/pin with fake timers; drawer Escape + focus return under a `matchMedia` mock; tabs write `creatorStep` and leave `wizardStep` alone; Save and Close → `onExit`; commit → `onComplete(true)` / modal → `onComplete(false)`; career card reseeds autos and subclass prunes kits, mirroring wizard.test.tsx:77 and :480) + the deep-link case for `lh:creator=codex`.
11. **Polish**: prefetch, reduced motion, both themes, delete the harness.

## Verification

- `npm run test` (old suites untouched and green; new creator suites), `npm run typecheck`, `npm run build && npm run smoke`.
- Runtime, per `.claude/skills/verify/SKILL.md`: throwaway harness at the repo root importing `Creator` + `ThemeStyles` with factory heroes (`hero()`, Devil Tactician Aristocrat, a Conduit, a Beastheart, a Summoner, a Revenant), Playwright installed in the scratchpad. Screenshots at 1440 / 1280 / 1024 / 900 / 560 / 390 for ancestry, class (scrolled to Kit), skills and complication, in both themes. Overflow check: any element whose bounding rect exceeds `window.innerWidth` without an `overflow-x:auto|scroll` ancestor fails (the tab strip may scroll). Also: zero console errors; `.cr-right` off-screen at ≤1024 until opened; hovering "Devil" swaps the panel image within 200ms; Tab cycle reaches tabs → options → footer; `hasTouch` at 390: tap selects, ⓘ opens the sheet, Escape/✕ closes and focus returns.
- Manual pass on the same hero in both creators: flip the roster switch, reopen from the roster, confirm identical `stepIssues`, identical commit behaviour, and that the old wizard still shows its inline skill pickers.

## Risks

- **Import cycles**: `creator/*` → `app.jsx` is the same cycle Wizard.jsx already lives in; safe only while nothing is read at module top level. `mutations.js`/`helpers.js` must never import `app.jsx` (quick-build functions take the `taken` map as an argument).
- **Identical issue texts** from different sources on the Skills tab ("Language not chosen" from culture and complication): display with the `source` prefix; parity tests compare texts only.
- **`classSections` includes skill decisions**: the creator filters `class-sec-skills` / `class-sec-domain-skill`; `classSections` itself is untouched so creation-matrix tests keep passing.
- **`ensureCharacteristics`** must run once per class in the creator's class step or the sidebar shows zeros and the characteristic issue fires.
- **Load-time repair passes** (`normalizeSkills`/`normalizeLanguages`) can prune between renders: recompute slot descriptors from `c` every render, never memoise across heroes.
- **`creatorStep` out of range**: clamp as Wizard.jsx:21 does. `LS_VIEW` may persist `'creator'`; the boot guard bounces to roster like `'wizard'`.
- **Smoke test** only mounts the auth gate; the render tests and the Playwright harness are the creator's coverage.

