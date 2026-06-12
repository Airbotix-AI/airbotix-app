# Changelog

All notable changes to airbotix-app (Portal + Learn SPA) are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/); entries are grouped
by date (AEST), newest first. Update this file in the **same commit** as the code change.

## 2026-06-12 
### Changed (Cat's Day Out — the run owns the spotlight)
- The "Press ▶ Go!" card now PLAYS the story properly: its Next presses the REAL
  Go button for the user (label "▶ Press Go!"), and whether Go was pressed by the
  tour or by the user's own finger, the spotlight moves to the STAGE for the whole
  run ("Playing… 🎬" while the animation lasts) and the tour advances itself when
  the story finishes — onto a card that also spotlights the stage, so the handoff
  is zero-movement. Two inert seams in the studio (`bindBlocksGo`, `onStoryRun`
  around the real flag-run lifecycle).


### Changed (tour polish — motion & dark theme)
- **Tour cards GLIDE between positions** (FLIP, 350ms) when a step or a
  Windows↔Split flip repositions them — no more teleporting; reduced-motion safe.
- **Spotlight redesigned as DE-EMPHASIS — both themes**: everything outside the
  rounded cut-out is softened behind an evenodd clip-path hole — 1px blur (text
  stays readable), theme-tuned dim, and dark = full grayscale while light keeps
  its hues at saturate 0.35 ("less colorful", not gray). The spotlight area is
  the only place with full fidelity. The ink box-shadow scrim is retired; the
  modal intro backdrop uses the same treatment (plus a light tint). Both demos
  share the effect.
- **Tour cards match the studio theme**: dark workspaces get an ink card with light
  text + hairline ring (titles explicitly colored — a global heading rule was
  leaving them ink-on-ink), still highly visible over the de-emphasized backdrop.

(theme-aware demo tour scrim)

### Fixed
- **The demo tour's spotlight scrim now reads on dark UIs.** The scrim was
  ink@50% (`shadow-spotlight-scrim`) — fine over the light studio, imperceptible
  over dark panels, so a dark-mode tour appeared to highlight nothing. The demo
  pages now pass `darkUi` from their studio's LIVE theme store
  (`usePlaygroundStore.theme` / `useBlocksTheme`) and the overlay picks the new
  `shadow-spotlight-scrim-dark` token (black@70%) — the modal backdrop follows
  the same rule (`bg-black/70` on dark). Store subscription, so a mid-tour
  theme flip re-picks the scrim immediately.

## 2026-06-12 (Guide pane dark-mode theming)

### Fixed
- **Game Guide dark mode:** the playground theme blocks now pin `color-scheme`
  (`light`/`dark` per `data-theme`), so UA-rendered chrome — native scrollbars
  on Windows / "always show" macOS, form-control internals — follows the
  workspace theme instead of staying light over the dark UI. The Guide's two
  scroll containers (nav + reader) also adopt the themed `.pg-scroll` slim bar
  (the chat-log convention); the pane's chrome/doc body/search/diagrams were
  already `pg-*`-tokened and verified readable in dark.

## 2026-06-12 (layout-proof demo tour)

### Fixed
- **The playground demo tour now works in BOTH workspace layouts** (Windows AND
  Split), including a Windows↔Split flip at ANY tour step:
  - Panel spotlights are layout-proof selector pairs
    (`[data-window="…"], [data-pane="…"]` via `panelSpotlight`): the floating
    window in Window mode, the split region in Split mode. New inert
    `data-pane` seams mark the split layout's tab region + Game pane
    (`Workspace.tsx`); `spotlightPanel` parses either form.
  - `focusPanel` (and the chat/editor handlers built on it) reads the layout at
    CALL time, so a handler the tour holds across a mid-tour flip routes through
    the layout actually on screen (split → the real Chat/Code/Assets/Guide tab,
    via the same setter the tab strip uses; `game` is a no-op there).
  - A mid-tour layout flip re-fronts the surface the visible card (or in-flight
    override) spotlights — same rule as back/forward browsing.
  - Asset generate/remix land their details AFTER My Assets is re-surfaced (the
    split layout unmounts the pane while the chat has the stage; the remount
    must re-bind the seam before the details open).
- **Pending editor jumps survive a fresh Monaco mount.** `@monaco-editor/react`
  freezes `onMount` at first render, so the "pending jump lands once the editor
  exists" fallback read a permanently-stale `jumpTo` — a changed-file tap /
  explain-select that OPENED the editor (always in Split mode, first open in
  Window mode) lost its jump+highlight/selection. Now read through a ref.

### CI
- e2e: `try-demo-smoke` gains a full 16-card SPLIT-layout tour walk with
  mid-tour Windows↔Split flips (spotlight re-resolution asserted at the error
  card); unit: `tourSpotlights.layout.test.tsx` renders the real Workspace
  shell in both layouts and asserts every panel spotlight resolves + live
  focusPanel routing through a pre-flip handler.

## 2026-06-12 (Guide placement)

### Fixed
- **The Guide window never buries the conversation's latest messages.**
  (1) Spawn: TOP-LEFT of the chat — a reading column fully beside it when ≥250px
  fits (the chat launch x nudged 0.29→0.31W to make that true on common laptops),
  else a short top strip that leaves the chat's input + newest replies clear.
  (2) Layout flips: entering window mode with an open Guide overlapping the chat
  (e.g. dragged there) relocates it to the no-overlap spot, computed against where
  the chat ACTUALLY is. Placement + flip behaviour unit-tested.
- **Tour spotlights are always visible**: every card advance fronts the surface its
  spotlight points at (window mode: on top of all windows; split: its tab active) —
  universal guarantee, idempotent with the action/restart/flip refocus paths.
- **Split mode: tour cards never sit on the conversation's tail.** The chat fills
  the left region in split, so `bottom-left` cards are remapped to a new `top-left`
  placement (over the OLDEST messages) — the latest reply + input stay readable.

## 2026-06-12 (clean demo console)

### Fixed
- **No more scary DevTools noise on the public demos.** (1) Browser-extension
  noise guard, first script in every game/preview srcdoc: wallet extensions
  (Coinbase, MetaMask, …) inject providers into every frame, and inside our
  deliberately opaque-origin sandbox their `localStorage` touch throws an
  uncaught SecurityError — now cancelled before the browser logs it, and
  filtered from the kid-facing runner console. Page-world only (isolated
  content-script errors are browser-level and unreachable by any site). The
  sandbox itself is untouched — never "fix" this with `allow-same-origin`.
  (2) `/try/*` skips the app's `/auth/refresh` bootstrap — anonymous by design
  (D-DEMO-01), so the two guaranteed 401s are gone from the demo console.

## 2026-06-12

### Changed (tour pacing & navigation)
- Back/forward browsing re-fronts the window each card's spotlight points at —
  the discussed surface is always on top, not whatever the last action left focused.
  Element-level spotlights map to their HOST window (✨ toolbar → Code Editor,
  generate/remix prompts → Asset Viewer, console → Game Runner).
- Scripted replies take a readable beat (700ms → 1.8s) so the "Airo is working…"
  state is actually seen.
- Asset generation/remix now plays fully in the chat (spotlit from the click):
  the "Conjuring…" progress and the finished sticker bubble are seen scrolled
  into view, held ~1.6s, and only then does My Assets surface with the card swap.


### Fixed (spotlight timing)
- In-flight tour steps spotlight the surface where the action is HAPPENING from
  the moment Next is CLICKED, instead of jumping only when the result settled:
  chat for the scripted asks + the explain fire (before the message even sends),
  the Asset Viewer for generate and remix (while the art is being made). The
  engine raises a spotlight override at fire-time; the following card spotlights
  the same surface, so it lands with zero mask movement — killing the jank at
  the busiest moment of the turn.


### Changed (playground tour v3 — 16 cards, real Asset Viewer UI, jank pass)
- **Tour grows 13 → 16 cards** (`demoTour.playground.ts`, PRD §3 v0.9): the
  explain beat is two cards (select the snippet → the live "✨ Explain this"
  toolbar pops + is spotlighted → fire its real handler), and the beautify loop
  drives the Asset Viewer's REAL UI — the tour types the wish into the pane's
  real generate box (new card, prompt-box spotlight), submits its real
  ✨ Generate, opens the sticker's real details view with the remix wish typed
  into the real Remix bar (new card), submits the real Remix, then opens the
  landed remix's own details. New tiny default-off seams: `bindAssetPane` /
  `bindAssetRemix` (`demoMode.tsx`; registered by `AssetViewerPane`/`RemixBar`
  only under the demo provider).
- **Conversation cards spotlight the chat** ("One ask → one change",
  "Keep score", "Code that explains itself") and the after-edit auto-restart
  re-fronts the panel the next card spotlights (`restartThenRefocus` — the
  restart focuses the Game Runner, which used to bury the chat).
- **Jank pass**: heavy actions (chat sends, Monaco jumps, focus changes) defer
  behind a double-rAF so the card/spotlight transition paints first
  (`tourSequencing.ts`); the spotlight ring transitions ONLY its box geometry
  (not the giant scrim shadow) and ignores zero-size targets; cards remount per
  step with a 200ms rise/fade entrance (`animate-tour-card-in`, reduced-motion
  safe); two window focuses never land in the same frame.
- `capture-try-scenes.mjs` walk is now title-driven (`nextUntil`) so card-count
  changes don't break it; e2e smoke + umbrella harness journey updated to the
  16-card flow; new unit tests (`tourSequencing.test.ts`,
  `demoAssetPaneSeam.test.tsx`, tour-data v3 suite).

### Added (marketing-preview parity)
- `scripts/capture-try-scenes.mjs` — one-command recapture of the marketing /try
  preview scenes from the live demos (1600px JPEG q80 → `airbotix/public/media/try/`).
  AGENTS.md (root rule 3 + `src/pages/try/`) now mandates recapturing whenever the
  workspace UX changes (either studio or future demos); PRD D-DEMO-07 extended (v0.8).


### Added (tour spotlight)
- `DemoTourOverlay` steps can carry a `spotlight` selector: everything except the
  area the step points at is dimmed — one ring div whose giant box-shadow is the
  scrim, so the cut-out has properly ROUNDED corners — purely visual (nothing is
  blocked, the studio stays interactive). Every spotlight OPENS from the full
  viewport and shrinks onto its target (500ms ease-out; animates between targets
  on step change; reduced-motion safe); re-measures on resize/scroll. Wired into
  the Cat's Day Out tour: Go button, stage, "What they do" tracks, Pages rail
  (cards repositioned off their spotlights).
- Spotlight wired across the **Game Playground tour** too: every card except the
  free-explore finale highlights where to look (landing prompt box, Game Runner,
  Code Editor, Asset Viewer, console, Guide — via a new `data-window` attribute on
  the studio's floating windows + a `landing-prompt-box` testid, both inert).
  The mask now also TRACKS moving targets (light 250ms poll with change-detection)
  since playground windows are draggable.


### Fixed (zone labels refinement)
- Rail tags (Characters/Pages) no longer overflow their narrow columns — stacked
  variant (emoji above one tiny word, spanning the column like a header) with
  ellipsis as a safety net; the block-category bar gained its missing tag
  ("🧰 Kinds", full-width header above the buttons; aria updated to match).


### Added
- **Blocks Studio zone labels (clarity pass).** Every studio area now wears a small
  emoji-first name tag for pre-readers (ages 5–8): 🎬 Stage, 🐱 Characters, 📖 Pages,
  🧩 Blocks (palette), ✨ What they do (program area). Chips are decoration only
  (`pointer-events: none`, `aria-hidden`; each zone carries a matching `aria-label`),
  theme-aware via the existing `--bsx-*` tokens, tinted with the same category colour
  as each zone's wash, hidden in present mode and while a block drag is live, and
  shrink to emoji-only under 640px. The program empty-state copy now matches its label
  ("Tap a 🚩 block to pick what ⟨name⟩ does ✨"). `/try/blocks` inherits via parity.

### Changed
- `/try/blocks` always opens in the LIGHT theme (the story art is daylight-first),
  regardless of system preference or a stored studio override — store-only set on
  demo install, never written to localStorage, so a real user's saved theme is
  untouched.


### Fixed (review pass)
- Tour robustness guards from the adversarial review: the landing "Create the game" fires
  once per (long) recovery window — a slow build can no longer be double-submitted; asset
  generate/remix retries are throttled to ~2s (was every 250ms) so a failed generation
  can't spam the chat.


### Changed
- **`/try/playground` tour refinement pass (try-demo-mode-prd §3 v0.6, 8 tweaks).**
  (1) Only the tour card creates the game: the landing's own send button is disabled and
  Enter is inert while the demo locks the prompt (2-line conditional in `LandingScreen`).
  (2) The generating phase now plays the REAL first-build progress UI: a `demoBuild` branch
  in `GeneratingScreen` feeds the bundled starter's files through the same thinking →
  building (file-by-file reveal) → done pipeline a real streamed turn drives, and the new
  canned `firstTurnReply` seeds the workspace chat exactly like a real first turn (no more
  generic loading screen + starter message). (3) The acting window always comes to front:
  scripted chat asks focus the Chat window before sending (diff/explain/asset/guide/run
  already focused theirs). (4) The explain step now SHOWS the real "✨ Explain this"
  floating toolbar first: the editor jump gained an optional `select` mode
  (`openFileAt(..., select)` → Monaco `setSelection` through the REAL selection pipeline,
  so the toolbar pops over the snippet), holds the beat ~1.6s, then fires the toolbar's own
  handler. (5) "Make it beautiful" is now a 3-card loop that closes: generate the apple
  sticker → remix it golden → a new scripted edit wires the remixed asset in as the game's
  apple (+ auto-restart, so the user sees THEIR art in-game). Demo generations serve
  hand-crafted SVG art (gradient/shaded apple + golden sparkly remix + a glossy generic
  fallback, `demoAssets.playground.ts`) via a new `setDemoAssetGen` seam — the real offline
  stub's deterministic swatches are untouched. (7) The console's real "Ask AI to fix"
  button continues the script: the scripted agent recognises the console's fix-request
  prompt (`consoleFixTrigger` + `isConsoleFixPrompt`, drift-alarmed against the exported
  `fixPrompt`) and replays the fix turn + advances the tour — no contact-us dead end.
  (8) The demo Game Guide now bundles the REAL corpus (verbatim copy of
  `platform-backend/src/help/help-content.ts`, drift-alarmed in tests against the sibling
  source) and the guide step opens directly on the most diagram-rich page
  (`engine/scenes-and-the-game-loop`, 2 diagrams) via a new `openGuide` studio control.
  Tour is now 13 cards; script v3 (6 steps). e2e smoke updated (13-card walk + landing
  inert + console-button path); unit tests cover every new seam.

### Fixed
- **Game Runner console now auto-scrolls to the latest output.** The console's scroll
  container had no scroll management: it opened scrolled to the TOP, so the newest line —
  including the very error that auto-opened it — could sit out of view, and new output kept
  appending below the fold. The line list is now a `ConsoleList` component on the chat's
  `useStickToBottom` state machine: opening the panel starts pinned at the latest line, new
  lines keep the view glued while the kid is at/near the bottom, and a deliberate scroll-up
  releases the pin (no yanking). Component tests cover open-at-bottom, follow, and no-yank.

### Added
- **`/try/playground` T1 v2 full product tour** (try-demo-mode-prd §3 v0.5, 11 steps): the demo
  now starts on the REAL landing phase (prompt pre-filled + locked, chips/mic hidden; the step-1
  card sits beside the input and is not skippable; "Create the game" drives the real create flow
  via a `bindLandingSubmit` seam); workspace entry auto-opens the Game Runner and starts the game;
  every scripted change auto-restarts it through the real run path. New tour beats: code-editor
  diff jump+highlight (the real changed-file-row path), select-code → "✨ Explain this" (scripted
  plain-words answer matching the real `buildExplainPrompt`), Asset Viewer generate + remix via the
  existing offline stubs, a deliberate bug turn (undefined method → real console error) followed by
  a scripted fix turn, and an in-studio Game Guide step served by a bundled offline corpus (new
  `setDemoHelpCorpus` seam in `helpApi.ts` — zero `GET /help/docs`). Tour data lives in
  `demoTour.playground.ts` (copy/placement/action per card); the script is versioned v2 with
  `edit` + `explain` step kinds (`demoScript.playground.ts`).
- Emoji-art demo starter: the catcher's sprites are now real VFS assets (`assets/apple.svg` 🍎,
  `assets/basket.svg` 🧺) loaded by the game AND listed in the Asset Viewer, so the art on screen
  is the art in the viewer.
- New studio injection points (all optional-context reads, default off): `LandingScreen` locked
  prompt + submit bind; `Workspace` `bindStudioControls` (run/restart, panel focus, editor jump,
  explain-this, asset generate); `helpApi` demo-corpus seam. `buildExplainPrompt` moved verbatim
  from `Workspace.tsx` to `panes/explainPrompt.ts` so the demo can match the real prompt.

### Changed
- Tour overlay (`DemoTourOverlay`): step-aware card placements (`beside-input` / `bottom-left` /
  `bottom-right` / `top-right` / `center`) so a card never covers the surface its step points at;
  the Next pill truncates inside the card instead of overflowing on long labels; per-step
  `hideSkip` (used by the mandatory landing step).
- `playwright.config.ts`: `PW_PORT` env override so ad-hoc e2e runs never reuse a developer's
  running dev server on the default port 4321.
- `e2e/try-demo-smoke.spec.ts` walks the full v2 tour end-to-end (locked landing → auto-run →
  scripted asks with restarts → diff → explain → asset magic → error→fix → guide → free explore →
  AI gate) and now also forbids `/help/*` requests.
- Demo banner (`/try/*`) copy made concise: "🎈 Demo mode · Questions? Contact us →", now
  linking to the marketing site's contact page (`airbotix.ai/contact`) instead of `/book`;
  blocks tour final step aligned ("Contact us from the banner above"). The nothing-is-saved
  message stays in the tour copy.
- `/try/blocks` tour copy rewritten: concise, user-journey guidance only — dropped the
  meta/technical reassurances ("not a mock-up", "real product") from every card.
- `/try/playground` tour copy given the same treatment (no "locks the prompt", "scripted",
  "Monaco", persistence/reset talk); both tours' final card now ends with the contact-us
  pointer and (blocks) a tablet/touch encouragement. "Nothing is saved" removed from all
  guidance per product direction — the demo banner + PRD carry the persistence truth.
- Tour overlay polish: buttons never wrap mid-label (single-line pills), controls row
  wraps gracefully, all controls are ≥44px touch targets for tablets; final-step button
  shortened to "Explore freely ✨".

### Added
- Demo Home exit (`/try/blocks`): the studio's 🏠 button leaves to the marketing "Try it"
  page — mode-aware default: prod builds → `airbotix.ai/try`, dev builds → the local marketing dev server (`localhost:3000/try`); `VITE_MARKETING_URL` overrides — instead of the authed
  hub — one `demo?.exitHref` seam in the Blocks toolbar.

## 2026-06-11 (Try Demo Mode — public /try/* demos)

### Added
- **Try Demo Mode** (`try-demo-mode-prd.md`): public, no-auth demo routes that render the **real,
  unmodified studios** — `/try/playground` (Game Playground) and `/try/blocks` (Blocks Studio) —
  mounted top-level like `/play/:shareId`. New demo layer in `src/pages/try/`:
  - `DemoModeProvider`/`useDemoMode` context (null = off everywhere outside `/try/*`);
  - in-memory demo adapters (D-DEMO-02): bundled fruit-catcher starter VFS behind
    `resolveProjectFiles`, an in-memory Map behind ALL `projectPersistence` reads/writes (no
    IndexedDB), an in-memory blocks adapter behind `loadBlocksProject`/`saveBlocksProject` serving
    the bundled 3-page **"Cat's Day Out"** `BlocksProject` (validated by the real parser, played by
    the real interpreter) — zero `/projects*`/`/llm/*` calls, pristine reset on every entry/reload;
  - **scripted demo agent** (D-DEMO-04) behind the existing `gameAgentStub` `RunTurn` seam: locked
    initial prompt + 3 canned turns (fall speed → score ×10 → bigger basket + "You win!") whose
    diffs flow through the real store funnel (undo/history identical to production); any other
    prompt — and everything after the script — gets the **contact-us gate** reply (D-DEMO-06,
    airbotix.ai/book + /contact);
  - `DemoTourOverlay` (D-DEMO-05; modal intro + floating step cards, progress dots,
    Next/Back/Skip) and the `DemoBanner` "nothing is saved · Book a chat" strip (D-DEMO-08; cloud
    share is hidden in the blocks demo).
  Tiny behaviour-neutral injection points only (all default "off"): demo seams in
  `playgroundApi`/`projectPersistence`/`gameAgentStub`/`blocksApi`, optional demo context reads in
  `PlaygroundApp` (locked prompt → straight to build) and `Workspace` (tour drives the real chat
  `send`), an optional `projectId` prop + share gate in `BlocksStudioPage`, and one scoped
  `.bsx-demo-host` height rule in `blocks.css`.
- **`AGENTS.md` demo-parity mandate** (D-DEMO-07): new repo-root `AGENTS.md` + scoped
  `src/pages/try/AGENTS.md` — any studio behaviour/route/selector change must update the demo
  script/story/overlay and re-run the demo tests in the same task.
- Tests: scripted-agent sequence + gate (drift alarms on the starter/script anchors), blocks story
  round-trip through `parseProject` + real-interpreter playthrough, in-memory adapter semantics
  (no fetch, reset-on-reinstall), tour overlay flow, public-route + no-network page tests for both
  demos, and a no-mock e2e smoke (`e2e/try-demo-smoke.spec.ts`: full tour → 3 scripted turns →
  AI gate; blocks Go/run + page navigation + share hidden; zero forbidden requests).

## 2026-06-11 (Blocks Studio — stable fullscreen)

### Fixed
- **Blocks Studio no longer flickers out of fullscreen and snaps back on the next tap.** The
  immersive page-scroll lock + first-gesture `requestFullscreen` lived on the studio component, so
  any transient remount (e.g. the periodic auth refresh briefly swapping the route through
  `ProtectedRoute`) ran the unmount cleanup — exiting fullscreen — and re-armed the one-shot enter,
  which the next tap re-triggered. Moved this lifecycle into **`LearnLayout`**, which stays mounted
  across the studio's remounts and keys off the route, so a remount can't drop/re-request fullscreen.
  Once the user (or browser) leaves fullscreen, we no longer auto-yank them back in.

## 2026-06-11 (Blocks Studio — closer to ScratchJr)

### Fixed
- **The Page block (Go to Page) only lets you pick a page that exists.** Its number stepper was
  capped at the generic 1–9; it now caps at the project's page count (and the editor reads
  "Which page? (1–N)"). `setParam` gained an optional `max`.

### Added
- **Four ScratchJr blocks that were missing** (`blocksModel.ts`, `interpreter.ts`):
  - **Set Speed** (🐢/🚶/🐇) — tap to cycle slow/normal/fast; scales that character's motion (slow 2×,
    fast 0.5×).
  - **On Bump** (💥) — a hat that fires when this character collides with another (grid-cell overlap,
    once per contact).
  - **Send Message** (📤) + **Get Message** (📥) — six colours; sending fires every Get-Message script
    of the same colour across the page (ScratchJr-style broadcast). Tap to cycle the colour.
  Message/bump-triggered scripts run concurrently and are awaited before the run ends (capped for
  safety). Still missing vs ScratchJr (by request): Play Recorded Sound; and Repeat/Forever as true
  nesting C-blocks (our ♾️ Again loops the whole track — the C-block needs the nestable-block model,
  PRD M3).

## 2026-06-11 (Blocks Studio — parallel tracks fix)

### Fixed
- **Multiple 🚩 tracks on one character now run in parallel without clobbering each other.**
  The interpreter captured a sprite-state snapshot at the start of each step and re-emitted the
  whole object after animating, so a second track (e.g. a Hop) snapped the first track's changes
  (e.g. a Move) back — only the last script appeared to run. Each block now merges just its delta
  onto the **latest** committed state (`interpreter.ts`), so concurrent tracks accumulate (matching
  ScratchJr's green-flag behaviour). Hop only touches y; Go Home stays a full explicit reset.
  Tests: 2 new parallel-track cases.
- **The "currently running" glow now lights up every track at once.** The run-highlight map was keyed
  by character, so two tracks on the same character overwrote each other's active block — only one lit
  at a time, making parallel runs look sequential. It's now keyed per **script** (like ScratchJr, which
  highlights the running block in every thread). Harness: `kid-blocks-parallel`.

## 2026-06-11 (Blocks Studio — refinement pass)

### Added
- **Share / view-only play** for Blocks Studio — the SAME parent-approval flow + play-count as
  Game Studio (reuses the kind-agnostic share API: ask → grown-up approves → frozen snapshot →
  live `/play/:shareId`). New `BlocksSharePanel` (theme-aware) in the toolbar; the public play page
  renders a new **read-only `ReadOnlyBlocksPlayer`** (big stage + Play button, no editing chrome,
  no auth) detected from `project.blocks.json` in the frozen snapshot.
- **Drag a block across tracks.** With multiple 🚩 tracks, a body block can now be dragged from one
  track into another (new `blocksStore.moveBlockAcross`); the insertion bar shows in the target track.
- **Number +/− sound effects** (`sfx.numUp/numDown`) and a **mute/unmute toggle** in the toolbar
  (persisted), plus an undo/redo cue.
- **Bigger emoji library** — 8 clear, evenly-sized categories (~130 emoji): Animals, Critters, Sea,
  People, Fantasy, Vehicles, Food, Fun. Category tabs are now a fixed equal size.

### Changed
- **Tablet block drag is hold-to-lift.** A quick swipe on a block now SCROLLS the palette / program;
  a short hold lifts it to drag (then JS locks page-scroll). Fixes blocks getting stuck on tablets
  and the scroll-vs-drag conflict. Mouse still drags on a small move.
- **One generic starter.** The Create hub offers a single "New project" card; every new project opens
  on a working scene — a cat that **chases a bouncing ball** (both loop forever) — to remix.
- **Unlimited pages** (was capped at 4).
- **Page thumbnails mirror each page's scene** (animated background), not a flat blue/space swatch.
- **Reset** got a proper icon (`RotateCcw`) + a friendly confirmation card.
- The stage **background button** is a themed glass chip with a clear picture icon (flips with the theme).
- **Landscape coding band**: all six categories show in a compact 2×3 grid (no scroll) and the band is
  taller so several tracks are visible at once.

### Fixed
- **Tapping a character no longer triggers the browser's text-selection / "Search" callout** (and no
  double-tap zoom in the studio): `user-select`/`-webkit-touch-callout`/`touch-action` hardened, inputs
  re-enable text.

### Changed (toolbar + picker follow-ups)
- **Toolbar redesigned to fewer buttons.** Secondary actions (Day/Night, Reset, Big screen) collapse
  into a **⋯ More** menu so the bar no longer squashes in portrait; ▶ Go! never wraps to two lines.
- **The currently-running block now lights up** as the program executes (live `lit` glow, wired from a
  new interpreter `onStep` callback).
- **Friend-picker categories all fit** (a 4-column wrapping grid) — no horizontal scroll.
- **Mute button shows its state** with a distinct coral wash when sounds are off.

## 2026-06-10 (Magic card dark-theme fix)

### Fixed
- **Magic Generation card now follows the dark theme** (`MagicGenerationCard.tsx`). The card's
  inner panel, prompt chip, Cancel/Dismiss buttons, orb/reference rings, and progress track were
  hardcoded light (`from-white`, `bg-white`, `#fff`, `#EDE9F7`) while the text used themeable
  `pg-*` tokens — so in dark theme the bright panel stayed light and the heading (`text-pg-text`)
  flipped light and rendered invisibly on it. Replaced the hardcoded surfaces with themeable
  `pg-surface`/`pg-surface-2`/`pg-text` tokens so the whole card flips with the workspace theme.
  Added `MagicGenerationCard.test.tsx`.

### CI
- **Unblock lint (`eslint . --max-warnings 0`)** — `WorkingCard.tsx` exported the `formatSecs`
  helper alongside the component, tripping `react-refresh/only-export-components` and failing CI on
  `main` since the one-message-turn change. Moved `formatSecs` into the pure-logic `turnProgress.ts`
  (next to its sibling time helpers); `WorkingCard` + its test now import it from there.

## 2026-06-10 (Airo — named helper + avatar)

### Added
- **The playground chat helper is now "Airo"** (named from Airbotix) with a friendly robot
  **avatar** (`AiroAvatar.tsx` — self-contained SVG: brand sky→purple head, glowing antenna,
  mint eyes). Replaces the generic "AI Helper" label + plain circle in the chat header and on
  every settled message; the kid-safety disclosure now reads "I'm Airo, a robot helper — not a
  person." (Parent-facing audit copy stays "AI helper" for clarity.)

## 2026-06-10 (one-turn-one-message working card)

### Added
- **Honest in-flight `WorkingCard` for every chat turn** (`WorkingCard.tsx`, `turnProgress.ts`).
  Replaces the fake-cycling `ThinkingBubble` (which "did NOT report real server stages") with a
  card that shows REAL steps built from the agent's actual tool/action deltas — "Adding Aliens ✍️",
  "Making sure it works 🚀" — deduped by file, with a per-step timer and a total clock. A file
  re-write (a syntax-fix pass) shows as a calm "fixing" beat on its row, never an error dump.

### Changed
- **One turn now resolves to exactly ONE message.** The pending bubble is the `WorkingCard` while
  the turn works; the first summary token flips it to the single settled message (`useGameAgent`).
- **Self-verify auto-fix is no longer a second message.** A successful repair (`/code/verify-fix`)
  applies **silently** behind a transient "Fixing a little glitch 🔧" card — no extra chat bubble,
  so a kid request reads as one message + a game that now works. Only an exhausted/co-debug fix
  surfaces a single warm "let's fix this together 🔧" message. This removes the old "responded,
  but still thinking" gap (the auto-fix used to append `AUTOFIX_TEXT` + its own result bubble).
- **Settled message restyled to the feature-focused design** (`AIChatPanel.tsx`). The done message
  is now a raised card with an "AI Helper" header, dark **feature-focused change rows** (the friendly
  change leads, e.g. "The aliens shoot lasers now", with the file name riding quietly beneath + a
  chevron that opens the editor), and a "WHAT NEXT?" label above outlined chips — matching the mockup.
- **Change highlight clears on click** (`MonacoEditor.tsx`). Tapping a changed-file row still opens
  the editor and highlights the changed lines, but the highlight now disappears the moment the kid
  clicks anywhere in the code (it returns next time a change row is tapped).

## 2026-06-10 (blocked-build explanation)

### Added
- **A safety-refused first build now explains itself + offers a way forward** instead of dropping
  the kid into a silent empty project. When the opening turn is rejected by the moderation gate
  (`MODERATION_REJECTED`), `GeneratingScreen` flags `blocked` on the scaffold hand-off; `useGameAgent`
  then seeds the chat with a friendly note ("our safety helper thought the idea sounded a bit too
  rough… your project is open and ready") plus 2–3 tappable gentler game ideas (spaceship dodging
  asteroids, plane racing through rings, catch the falling treats). Tapping a chip sends that prompt
  and builds the game — the kid is never stuck. Threaded `blockedSeed` through PlaygroundApp → Workspace
  → useGameAgent.

## 2026-06-10 (guided chip loop)

### Changed
- **Tapping a next-step chip now continues the guided build loop** (playground-ai-prompt-prd.md
  D-PAP-29). A tapped chip sends its prompt as a **`guided`** step (`AIChatPanel.tsx` →
  `useGameAgent.ts` → `codeApi.ts` POST `guided:true`), so the teacher re-offers a fresh set
  of options for the next phase instead of treating the tap as a "clear instruction" that
  ended the loop after one step. Free-typed messages stay un-guided. The guided flag is
  preserved on retry.
- **A self-verify auto-fix no longer wipes the kid's still-unused next-step chips**
  (D-PAP-29 sticky). The last-message-only clear in `useGameAgent.applyResult` is skipped
  for an auto-fix turn (`keepOtherNextSteps`), so a background repair firing right after a
  build can't erase options the kid was about to tap. New unit tests in `useGameAgent.test.ts`
  + `AIChatPanel.test.tsx`.

## 2026-06-10 (playground chat resume)

### Fixed
- **Chat history is now persisted across exit/resume** (J9). The conversation lived only in
  React state, so reopening a project lost every prior turn. The chat is now cached device-local
  in IndexedDB (`projectPersistence.ts`, `chat:` prefix — same store as the VFS/workspace-UI
  cache), restored on resume (`PlaygroundApp` `onDone`), and re-seeded into the agent
  (`useGameAgent` `initialChat`, which takes precedence over the first-turn/intro seed). The rich
  per-message data (next-step chips, per-file change rows, file notes) survives — the backend's
  CodeAgentTurn only records prompt+summary, so the log is kept client-side.
- **The canned "your game starter is ready to play" message no longer reappears on resume.** On a
  resume the blank prompt fell through to `buildIntro('')`, re-injecting the starter as if the
  project were brand new. The seed now requires a non-empty prompt (and restored history wins), so
  the starter shows only as the first message of a genuinely new project.

## 2026-06-10 (playground theming fixes)

### Fixed
- **Share-link popup was nearly invisible** (`ShareLinkPanel.tsx`). The popup portals into
  `document.body` — OUTSIDE the playground's `data-theme` root — so the `--pg-*` tokens (scoped
  to `[data-theme]`) were undefined there, rendering the surface/border transparent and the text
  near-invisible. The portal now carries `data-theme={theme}` (restoring the token cascade) and
  uses the raised `bg-pg-surface` instead of the page-matching `bg-pg-desktop`, so it lifts off
  the backdrop with a visible boundary.

### Changed
- **Themed chat scrollbar.** New reusable `.pg-scroll` utility (`playground.css`) — a slim (8px),
  rounded, transparent-track scrollbar whose thumb is toned from `--pg-text-muted` and brightens on
  hover, so it matches both light/dark chrome instead of the heavy default OS bar. Applied to the
  chat log (`AIChatPanel.tsx`).

## 2026-06-10 (playground next-step chips)

### Changed
- **Playground chat: next-step chips now appear only on the latest turn.** When a new
  teacher turn settles, any next-step option chips carried by an earlier chat bubble are
  cleared, so suggestions never linger on a stale message (`useGameAgent.ts`). Pairs with
  the backend making `next_steps` conditional — the kid sees options only when they
  haven't already given a clear next step (playground-ai-prompt-prd.md D-PAP-26).

## 2026-06-09 (safety gaps)

### Added
- **Parent "see what they tried" view** (`AuditPage.tsx`). `safety.pattern.escalated` events now render a distinct coral card with an expandable category summary (icon + label + count per rejection category, time window). Fetches from the new `/families/:familyId/kids/:kidId/safety-summary` endpoint (§8 D-PF12).

### Fixed
- **`auditCopy.ts` `describeSafety()` used wrong event type names.** The function had fictitious event strings (`safety.regex.rejected`, `safety.pii.input_blocked`, `safety.topic.rejected`, `safety.injection.blocked`) that the backend never emits. Corrected to match actual backend events: `safety.prompt.rejected` (with `payload.stage` discrimination), `safety.pii.blocked`, `safety.pii.warned`. Added `safety.pii.warn_acknowledged`, `safety.prompt.aborted`, `safety.response.rejected`, `safety.response.redacted` cards. Parent audit page now shows correct friendly copy for all safety events.
- **`dismissWarn()` in `useCodeStudio.ts` and `useGameAgent.ts` never emitted `safety.prompt.aborted`** (PRD §7). Both now fire `POST /safety/prompt-aborted` (fire-and-forget) when the kid dismisses the warn dialog without retrying.
## 2026-06-10

### Added
- **Tutoring page now shows the family's classes** (`/portal/tutoring`, O-5 read-only view).
  Above the bill, one card per enrolled kid+class: class name + 私教/官方课 badge + whose class,
  the **teaching team**, **接下来的课** (upcoming scheduled sessions, up to 5), and a collapsible
  **课程大纲** (published lesson outline — titles + one-liners; unpublished packs show nothing).
  Backed by `GET /tutoring/families/:id/classes`.
- **"✨ Explain this" selection toolbar in the code editor** (`learn-game-studio-prd.md`).
  Selecting a block of code in Monaco surfaces a floating "Explain this" pill (a content
  widget anchored to the selection); clicking it hands the snippet to the AI chat, which
  answers in plain words. The prompt asks the agent not to edit; under the playground
  teacher model the turn auto-applies with no agency gate, so a plain `send` answers
  directly. The backend already has the full file as context, so only the snippet is sent
  (capped at 1200 chars). Files: `panes/MonacoEditor.tsx` (the toolbar content widget),
  `panes/CodeEditorPane.tsx` (prop pass-through), `Workspace.tsx` (prompt + chat focus).
  Tests: `e2e/playground.spec.ts` (select→explain→reply).

## 2026-06-09

### Changed
- **e2e specs rewired to the chat-hosted asset flow.** `e2e/asset-gen.spec.ts` +
  `e2e/playground.spec.ts` no longer drive the removed in-pane `asset-add-to-game` /
  `library-add-to-game` detail flow. Generate/Remix now assert the **chat** surface:
  the finished asset is a tappable `chat-asset-open` card; tapping it opens the asset in
  the viewer (`asset-codeRef`). Stars-debit + remix `ref_url` assertions kept; the Library
  test now proves the URL-form code-ref (referenced, not inlined). Dropped the stale
  add-to-game CTA screenshot test + baseline. (Matches the cross-repo `kid-playground-asset`
  harness journey, also rewired.)
- **Chat generation UX polish.** The Asset Viewer's Generate/Remix no longer shows a
  "sent to chat" banner — instead it **brings the Chat to front** (and the chat
  auto-scrolls to the new message). A **remix** now shows the **reference asset** in the
  in-flight chat card. The finished-asset chat card drops the "Add to my game" button,
  shows the asset **larger**, and is **tap-to-open** in the Asset Viewer. Also removed the
  "Add to my game" button from the Asset Viewer detail screens (confusing) — the AI wires
  assets into the game from chat; the copy-able code-ref remains for manual use.
- **AI asset generation now lives in the CHAT** (learn-game-studio-assets-prd §3) — the
  single home for all AI conversation. A typed message is classified server-side as an
  **asset** request vs a **game-code** change (`/turn/classify` returns `intent`) and
  routed: an asset request generates as a chat message (the `MagicGenerationCard` while
  it runs, then the finished asset with **Add to my game**); a code request runs the
  usual game turn. Generation and code turns **share one in-flight lock** (one AI thing
  at a time). The Asset Viewer's **Generate / Remix** buttons now post into the chat
  (`onRequestAssetGen` → `useGameAgent.requestAssetGen`) instead of rendering their own
  card — both entry points, one place out. The `generationStore` engine + magic-card
  visual are reused; the Asset Viewer's pinned card was removed.

### Fixed
- **Imported text assets preview as readable text again.** Local import (D-ASSET A4)
  stores every file as a `data:` URL, so a `.txt`'s content was a base64 data URL and the
  Asset Viewer text preview showed the encoded string. Added `dataUrlToText` (decodes
  base64/percent-encoded text data URLs, UTF-8 safe; passes raw AI/editor text through)
  and use it in `AssetPreview`.
- **Generated/imported assets now persist across exit & resume.** Two causes: (1) the
  debounced autosave was cancelled when leaving the project — added `flushSave()` in
  `PlaygroundApp` that commits any pending save on exit (and reused it for the debounce);
  (2) asset content round-trip mangled the bytes — the studio VFS uses `data:` URLs but
  the backend stores raw base64, so `codeApi` now converts binary-asset content at the
  API boundary (strip on save, re-wrap on load). SVG (backend-text) round-trips verbatim.

### Added
- **Global "Magic Generation" state (`generationStore`).** AI asset generation is now an
  app-level Zustand store that owns the async call AND the completion (writing the asset
  into the VFS), so a single in-flight generation survives the Asset Viewer pane closing/
  reopening — one generation at a time, cancellable (abort signal threaded through
  `runGen`/`api.generateAsset`). Paired with a magical animated card (`MagicGenerationCard`).
- **Asset Library expanded from ~68 to ~280 curated emoji** across faces / characters /
  animals / food / plants / weather / items / vehicles / sports / music / symbols.

### Removed
- **Playground: dropped the seeded `assets/README.txt`** from the starter project — new
  game projects start with a truly empty `assets/`.

### Added
- **Self-verify round-trip — the studio reports runtime errors so the agent auto-fixes**
  (`playground/verifyRoundtrip.ts`, `panes/GameRunnerPane.tsx`, `panes/useGameAgent.ts`, `panes/gameAgent.ts`,
  `Workspace.tsx`, `code/codeApi.ts`; `playground-ai-prompt-prd.md` MP3 / D-PAP-09,13,23). The game runs in
  the opaque-origin sandbox, so the captured console is the only runtime-error signal. `extractRuntimeErrors`
  pulls the real `error`-level lines (drops logs/warnings + the shim's "ready", formats `text (file:line)`,
  de-dupes, caps at 6); `GameRunnerPane` reports them once per distinct (run, error-set) via `onRuntimeErrors`;
  `useGameAgent.autoFixFromErrors` posts them to the backend (`reportRuntimeErrors` → `POST …/code/verify-fix`),
  applies the returned fix turn, or shows the **"let's debug this together"** message once the backend has
  exhausted its ≤2 attempts (`co_debug`). The auto-fix budget resets on each fresh kid-initiated turn. New
  `VerifyFixResult` type + `reportRuntimeErrors` injected through the `GameAgentDeps` seam. Covered by
  `verifyRoundtrip.test.ts`; the full apply→run→report→re-run round-trip is exercised by the umbrella harness.
- **Resume recap — "welcome back, here's where we left off"** (`playground/ResumeRecap.tsx`,
  `PlaygroundApp.tsx`, `Workspace.tsx`, `panes/ChatPane.tsx`, `code/codeApi.ts`; `playground-ai-prompt-prd.md`
  MP5 / D-PAP-19,22). On a genuine resume (a real game project reopened with no fresh first turn), the studio
  fetches the project's persisted `learning_context` (`getProject`) and shows a dismissible welcome-back card
  above the chat: the game summary, the concepts the kid has learned (chips), and what they were about to do
  next, with a **"Keep building →"** continue button. Best-effort + non-blocking — the kid can ignore it and
  just start typing; a fetch failure simply skips the card. `CodeProject`/`AgentTurnResult` gain
  `learning_context`. Covered by `ResumeRecap.test.tsx` (summary/concepts/next render, summary-only, continue tap).
- **Game-agent UI tool handlers — the teacher can drive the studio** (`playground/executeClientActions.ts`,
  `Workspace.tsx`, `panes/CodeEditorPane.tsx`, `panes/MonacoEditor.tsx`, `code/codeApi.ts`, `playground.css`;
  `playground-ai-prompt-prd.md` MP4 / D-PAP-08, App. A). `ClientAction` now models the full Group A–D
  surface; `executeClientActions` dispatches the **Group A teaching tools**: `open_file` /
  `jump_to_line` / `highlight_code` all route through a shared `openFile(path, fromLine?, toLine?)` so the
  studio opens the file the agent just changed and **highlights the exact line range** (Monaco whole-line
  `pg-code-highlight` decoration), plus `set_theme` / `set_layout` (wired to the playground store) and
  optional `show_console` / `physics_debug` / `set_screen_size` / `open_history` / `open_asset_viewer`
  handlers. The console's jump-to-error and the agent's open/highlight now share one location path
  (`handleOpenLocation` gains an optional `toLine`). Handlers are optional and unknown/unwired actions are
  ignored (forward-compatible), so the backend can expose the whole surface while the studio honours only
  what it can today. Covered by `executeClientActions.test.ts` (routing, mode→bool/enum mapping, invalid
  mode rejection, path-less no-op, asset-viewer fallback).

### CI
- **Fixed the playground e2e harness logging the kid out mid-test** (`e2e/helpers.ts`). The
  Workspace's ShareLinkPanel fetches `GET /projects/:id/share` on mount; unmocked, it hit the real
  backend, 401'd, and tripped `api()`'s `clearToken` → the kid bounced to `/learn/login`, unmounting
  the studio (the intermittent "element detached from the DOM" flake — machine-dependent: only bites
  where a real `:3001` backend is up). Now mocked as "not shared". Also abort the streaming first turn
  (`POST /code/turn/stream`, GeneratingScreen) so it deterministically falls back to the seeded
  `GET /code/files` instead of racing a real backend. `create-game` now passes reliably (4.3s vs prior
  timeouts). (Note: `real-ai-turn` still has a separate, pre-existing intermittent flake under
  investigation.)

### Added
- **Teacher next-step option chips in the playground chat** (`panes/AIChatPanel.tsx`,
  `panes/useGameAgent.ts`, `code/codeApi.ts`; `playground-ai-prompt-prd.md` §11.4 / D-PAP-06).
  A settled agent turn now carries the backend's `next_steps` (`{label, prompt, tag:'concept'|'fun'}`)
  onto its chat bubble and renders them as **tappable chips** — concept chips (sky/✨) and fun chips
  (bubblegum/🪄); tapping one sends its `prompt` as the next turn. `AgentTurnResult` gains
  `next_steps` + `history_label` (FE1 of the teacher model). Covered by a new `AIChatPanel.test.tsx`
  + a `useGameAgent` data-flow assertion. (History-label wiring + removing the old Lite/Pro
  agency/approval beats land in follow-ups.)

### Added
- **Private tutoring (parent portal)** (`private-tutoring-prd.md` §5, §8). New `/portal/tutoring`
  page: shows outstanding per-session charges bound to each class, totals what's owed, and starts
  an Airwallex checkout to pay all outstanding charges at once (mirrors the wallet topup flow).
  "Tutoring" nav item added.
- **Game Guide SVG concept diagrams (D-HELP-07).** New `panes/help/helpDiagrams.tsx` —
  a registry of type-safe React SVGs (xy-coordinates, game-loop, gravity-and-jump,
  collision-overlap, sprite-shapes, scene-flow) keyed by the corpus `diagram` block.
  Rendered in a captioned, theme-aware (`currentColor`) card with `role="img"` + the
  `alt` label — no HTML injection. Unknown key → alt caption fallback.
- **Playground Asset Viewer: shared read-only Library tab (zero-host emoji).** The
  pane now has a **Library | My assets** source switch (D-ASSET-6). Library browses the
  emoji provider — thumbnails load cross-origin from the CDN, category chips + search
  filter it, and a read-only detail offers **Add to my game**. "Add to game" for a
  library asset injects a **URL-form** loader (`this.load.setCORS('anonymous');
  this.load.image(key, '<cdn url>')`) via `addLibraryAssetToGame` — the asset is
  referenced by URL and never copied into the VFS, so it stays immutable + shared. The
  game preview leaves `https://` URLs un-rewritten (only VFS paths inline to data URLs),
  and the cross-origin texture is loaded `crossOrigin:'anonymous'` so the canvas isn't
  tainted (D-ASSET-7). New e2e proves browse → add → the game runs clean loading the
  emoji by URL. See PRD `learn-game-studio-assets-prd.md` A2 / §4.4.
- **Playground shared asset Library — foundation (zero-host emoji provider).** New
  `assetLibrary.ts`: a curated, kid-appropriate **emoji** catalog (characters /
  animals / food / nature / items / symbols) exposed as read-only `LibraryAsset`
  records referenced by URL — never copied into the VFS. URLs are derived from the
  emoji codepoint via `twemojiUrl()` (pinned `jdecked/twemoji@15.1.0`, VS16 stripped),
  so the asset the kid browses is exactly what the game loads (WYSIWYG). `searchLibrary()`
  filters by category + name/tags (the same shape the `search_assets` agent tool will
  use). This is the data layer for the Library source tab (Asset Viewer UI wiring lands
  next). Zero hosting (D-ASSET-11/12); hosted Kenney CC0 is the v2 provider. See PRD
  `learn-game-studio-assets-prd.md` A2 / §4.4.

### Added
- **Playground: AI remix of any image (A5, D-ASSET-5).** Image detail views (both My
  assets and the Library) now have a **Remix with AI** box: describe a change ("make it
  blue") and the AI returns a variation that lands in **My assets/generated**. Remix of
  a project asset sends `ref_asset_path`; remix of a Library asset sends its `ref_url` —
  the backend does image-to-image. The offline stub folds the reference into its hash so
  a remix is a deterministic variation. e2e proves a Library remix posts the `ref_url`
  and the result appears under My assets.

### Changed
- **Playground: `generateAsset` now sends the snake_case backend contract**
  (`project_id` / `ref_asset_path` / `ref_url`). The camelCase `GenAssetRequest` seam was
  never wired to the real DTO (asset-gen had been stub/mock only); A3/A5 make the path
  real, so the client maps the fields. Backwards-compatible for the mocked e2e.
- **Playground: hardened local asset import** (A4). Imports now fail soft (a calm
  "couldn't import that file" notice instead of a silent hang on a bad read), always
  target **My assets** (`assets/imported/`, or the open VFS category), and a drop/paste
  while browsing the read-only Library switches back to My assets so the imported file
  is actually visible.
- **Playground asset generation is now prompt-only — removed the image/audio
  dropdown** (D-ASSET-4). The kid describes what they want in one box ("a pixel
  coin", "a jump sound") and the AI decides the kind: the real backend infers it
  server-side (`/llm/generate-asset` `kind` is now optional), and the offline stub
  uses the same keyword heuristic (`inferStubKind`). The generated file's extension
  is derived from the returned mime / reported kind instead of the picker. See PRD
  `learn-game-studio-assets-prd.md` A3.

### Removed
- **Playground: dropped the seeded sample/test assets and the read-only "preloaded"
  lock.** New game projects no longer ship `coin.svg` / `hero_bounce` sprite /
  `chime.wav` / `intro.mp4` in their VFS — those were test fixtures. The Asset Viewer
  now treats every VFS asset as the kid's own (full CRUD; no `Lock` badge / "Sample —
  read-only" state). Deleted `sampleAssets.ts`, `sampleVideo.ts`, and
  `sampleAssets.test.ts`; removed `withPreloadedAssets`/`isPreloadedAsset` seeding +
  save-time filtering from `PlaygroundApp`. The shared **Library** source (Kenney CC0 +
  emoji, referenced by URL) replaces "something to start with" — see PRD
  `learn-game-studio-assets-prd.md` A0 / D-ASSET-3, D-ASSET-6. New projects start with
  an empty `assets/` (plus the `README.txt` scaffold note); Import / ✨ Generate still
  populate it. Removed the now-obsolete "samples are read-only" e2e.

### Changed
- **Game Guide pane now fetches the backend corpus (MH0 frontend-swap).** `HelpPane`
  loads `GET /help/docs` via TanStack Query and renders + searches it client-side; the
  bundled `panes/help/helpContent.ts` is **deleted** so platform-backend is the single
  source (D‑HELP‑02). New `helpTypes.ts` (shared shape) + `helpApi` becomes
  `loadHelpCorpus` + pure `searchDocs`/`getDoc`. Loading/error states added. This also
  unblocks comprehensive, clearly-tiered content (authored once, server-side). E2E mocks
  `GET /help/docs` in `mockBackendAsKid`.

### Added
- **Game Guide — `open_help` client action (MH2a, frontend)**. Extends the agent's
  `ClientAction` channel (`code/codeApi.ts`) with `open_help { target: docId, anchor? }`,
  dispatched by `executeClientActions` → a new `openHelp` handler that surfaces the Guide
  (window or Split tab) and jumps it to the passage. `HelpPane` gains a `request` prop
  (nonce-keyed, mirroring the editor's jump-to-error seam) that drives the navigation.
  This is the frontend half of HJ2: once the backend (MH2b) emits `open_help`, the kid's
  Guide opens at the cited passage. Tested: `executeClientActions.test.ts` (dispatch +
  no-target ignore + `focus_panel` to help) and `e2e/help-guide.spec.ts` HJ2 (a mocked
  turn returning `open_help` opens the Guide at the gravity passage, no VFS changes).
  The backend `search_help`/`read_help` tools + system prompt remain MH2b.
- **Game Guide — in-studio help (MH1, frontend)** for the Game Studio playground
  (PRD `docs/product/prd/learn-game-studio-help-prd.md`). A 5th playground window
  (`help`, "Guide", `BookOpen`, `brand-sunshine` accent) reachable from a desktop tile
  (Window mode) and a Split tab. Renders a curated, kid-tiered (Lite/Pro) corpus —
  Phaser 4, game basics, game-engine basics — authored as typed structured content
  (`panes/help/helpContent.ts`, no markdown/sanitizer dep) behind a `helpApi` data seam
  (client-side lexical search today; MH0 swaps it to `GET /help/docs*`). New:
  `panes/HelpPane.tsx`, `panes/help/{helpContent,helpApi}.ts`; wired through
  `playgroundStore` (`PgWindowId`), `windowMeta`, `DesktopIcon` (sunshine-contrast
  exception: solid chip + `text-ink` glyph), `Workspace`. The AI `search_help`/`read_help`
  tools + the `open_help` client action are MH2 (backend, not in this change). Tested:
  `helpContent.test.ts` (corpus invariants + the HJ6 runtime-contract/Phaser-major sync
  guard, D‑HELP‑06), `helpApi.test.ts` (search + tier filtering), `e2e/help-guide.spec.ts`
  (HJ1: open from desktop → browse → search → read → tier toggle).

### Fixed
- **Help search tokenizer strips punctuation** (`helpApi.searchHelp`) so a kid query like
  "how do I jump?" matches the "jump" tag (not "jump?"). Kept in sync with the backend
  `HelpSearchService` tokenizer (so the agent's `search_help` and the pane's own search rank
  identically).
- **e2e harness: `mockBackendAsKid` now mocks `GET /projects/*/share` → 404** ("no share
  yet"). `ShareLinkPanel` queries it on every real-project workspace; left unmocked it
  401'd → the api client cleared the kid token → a delayed bounce to `/learn/login` that
  fast specs happened to beat (and which flaked the `create-game` openCode spec). Share-
  specific specs still override with their own route (matched most-recent-first).

### Changed
- **Playground share-link control moved to the bottom bar (Taskbar), status-aware.**
  The share control used to float top-right over the desktop surface (Window mode) or
  sit in the split tab strip; it now lives on the bottom bar in **both** layout modes,
  rendered once. The button itself reflects the live share status — neutral **Share**,
  a sunshine **Waiting for grown-up** beat while a parent-approval is pending, and a
  mint **Link live** pill showing the play count once approved — and the status is
  polled even while the panel is closed, so an out-of-band parent approval (Portal)
  lights it up on its own. Clicking opens a popup rendered into `document.body` (floats
  above the desktop windows + taskbar, never clipped) anchored just above the button;
  clicking outside it or pressing Escape dismisses it. Re-enabled the previously
  `fixme`'d share-link UI e2e (now green from a direct studio load).
- **Upgraded the game runtime to Phaser 4.1.0** (from 3.80.1). Phaser 4's full build
  (`dist/phaser.min.js`) is still a UMD that sets `window.Phaser`, so the opaque-origin
  sandbox keeps loading it as a classic global `<script>` (no `allow-same-origin`, no
  CDN — the `vendor-phaser` Vite plugin re-materializes the engine + `.d.ts` into
  `public/vendor/`). Bumped `PHASER_VERSION` + the `/vendor/phaser-<v>.*` constants in
  `vite.config.ts`, `buildGamePreview.ts`, `MonacoEditor.tsx`. The `Phaser.Game`
  constructor-wrapper control channel (pause/mute/stats) still works. Verified by the
  `game-smoke` e2e (starter game runs, fps > 0, zero console errors) and the Phaser
  `.d.ts` IntelliSense e2e. The agent system prompt deliberately keeps teaching the
  Phaser-3-style game API — it's backward-compatible, runs on the Phaser 4 engine, and
  is the most reliable surface for the model to generate.
- **Playground "building your game" screen — total redesign around real progress.**
  The old screen showed a spinning orb + a fake timed progress bar + canned "Writing
  the code…" steps that didn't reflect anything real (the backend generated the whole
  game in one non-streaming call, so the first ~20–30s had no signal). `GeneratingScreen`
  now drives **three honest phases off the streamed turn**: **thinking** (turn running,
  no file yet → a fun looping platformer **build-stage** animation + rotating kid
  build-tips, since there's genuinely nothing real to show), **building** (each file
  reveals in a live list the instant the AI starts writing it — see the backend
  streaming change), and **done** (the AI's moderated reply + a short celebratory beat,
  then handoff). Stream failure still falls back to the seeded template (kid never
  trapped); resume/project-less sessions load behind the same stage. New pure-CSS
  build-stage animation in `playground.css` §5 (honors `prefers-reduced-motion`).
  Covered by `GeneratingScreen.test.tsx` (thinking → progressive file reveal → ready
  → handoff).

## 2026-06-08

### Fixed
- **Playground AI chat error copy now distinguishes "couldn't reach the server" from
  "the server errored."** `useGameAgent.friendlyError` previously collapsed every
  unhandled turn failure into "Could not reach the AI" — so a real backend 5xx
  (e.g. the dev backend mid-restart) misread as a connectivity problem. Now a
  transport failure (`fetch` rejected → no `ApiError`) or a gateway-down
  502/503/504 keeps the "Could not reach the AI. Try again." copy, while any other
  reached-but-failed status shows a distinct "The AI ran into a problem. Try again
  in a moment." Covered by new `useGameAgent.test.ts` cases (transport vs 5xx vs 503).

## 2026-06-07

### Added
- Parent Portal **Courses** page (`/portal/courses`): browse published course packs and
  request a seat for a kid. Submits to `POST /bookings` (`source=parent_portal`) so the
  request lands in the super-admin Bookings inbox.
- **My Family is now a growth surface, not a settings form** (`parent-portal-growth-report-prd.md`): tapping a kid lands on a warm **growth report** (`/portal/family/:kidId`, new `KidGrowthPage`) — a one-sentence headline, highlight tiles (creations / day-streak / minutes exploring / studios tried), a 28-day daily-activity sparkline, and a friendly "what they've been making" breakdown — instead of the profile editor. The family list now shows a per-kid growth teaser (`KidGrowthTeaser`) + sparkline with a "See growth →" action, kids first and the family code demoted below. A brand-new kid shows an encouraging **🌱 early state** (reuses the onboarding `KidLoginHelper` with the copyable family code) rather than "No data". Profile / Reset PIN / Delete move verbatim to `/portal/family/:kidId/settings`. Growth derived purely from the existing usage endpoints (`/kids/:id/usage`, `/usage/trend`) in new pure helpers (`kidGrowth.ts`, +Vitest); shared `TrendBars` extracted to `src/components/`. Frontend-only, no backend change.
- Parent onboarding clarity pass (follow-up to the welcome flow): the welcome tour
  gained a concrete **"What your child will make & learn"** slide (Image/Music/Voice,
  Video, Code & Games + the skills built) and is now **re-openable any time** via a
  **"How it works"** button on the Dashboard (`openWelcomeTour`), not just on first
  login. New reusable **`StarsExplainer`** ("what are Stars?", qualitative — no hard
  $ conversion) on the top-up + wallet pages and a clearer checklist subtitle. The
  kid-login helper now shows a **QR code + "Copy login link"** (`/learn/login?family_code=…`)
  so parents don't dictate a code and kids don't type one; the kid login page pre-fills
  the family code from that query param. City is now a **dropdown of major AU cities
  (+ "Other")** on register + settings instead of free text. Adds `qrcode.react`.
- Parent-portal first-login onboarding (`parent-portal-onboarding-prd.md`): a one-time,
  skippable 3-slide **WelcomeWizard** ("what Airbotix is / you're in control / 3 next steps")
  and a persistent, data-driven **GettingStartedCard** checklist on the Dashboard (log kid in →
  add Stars → optional spending limits), plus a **KidLoginHelper** modal showing the copyable
  family code + plain-language login steps. Frontend-only: completion derived from existing
  family/wallet/payment-methods/auto-topup queries + per-parent (`sub`-keyed) localStorage flags
  (`src/lib/onboardingStorage.ts`); pure logic in `onboardingState.ts` with Vitest coverage.
  Mounted in `DashboardPage` (parent-with-family branch only). Payment step is gentle / never
  blocking (D-ONB2-02).

### Changed
- **Stars economy re-pegged: 1 star = A$0.02 (was A$1)** — mirrors platform-backend.
  Top-up packs now credit 500 / 1750 / 3250 / 7000★ (Starter/Family/Mega/School,
  incl. bonus), auto-topup SKUs + threshold options realigned to 50★ per A$, and
  Studio per-action costs updated (image 4→8★, video 5→40★; chat/voice/code/music
  unchanged) so a single chat costs ≈ A$0.02 and a $10 pack lasts hundreds of turns.
- **Activity page (`/portal/audit`) now speaks plain language.** It previously dumped
  raw machine `event_type` strings (`wallet.topup_initiated`) and the full JSON payload
  (`pack_sku`, `payment_intent_id`, `amount_aud_cents`…) — unreadable for parents. Each
  event is now mapped to a friendly icon + headline + detail line (e.g. 💳 *Top-up started
  · 10 Stars · $10.00 AUD*) via a new `src/lib/auditCopy.ts` table covering wallet / LLM /
  approval / project / auth / class / safety / family / incident events, with a title-cased
  fallback so no unmapped event ever leaks a raw `dotted.snake_case` string. The raw
  `event_type` + JSON is preserved behind a collapsed **"Technical details"** disclosure
  for auditability. Actor labels are now parent-facing ("You" / "Your child" / "AI helper").
  Vitest coverage in `auditCopy.test.ts`. Step toward the richer §4.6 vision (session
  grouping / filters / export remain unbuilt).
- `.gitignore`: explicitly ignore the compiled `vite.config.js` / `vite.config.d.ts`
  (stray `tsc -b` outputs) so they never get committed alongside `vite.config.ts`.

### CI
- `ci.yml` now actually runs the unit tests: the job runs `lint → typecheck →
  test → build` (was build-only, so the Vitest suite never ran in CI).

## 2026-06-06

### Added
- Portal onboarding captures the parent name + an editable display name.
- Playground v2 desktop workspace: window / split layout, Monaco code editor,
  Phaser game runner, standalone chat pane, taskbar + desktop icons, error
  debugging (jump-to-error + Ask AI to fix), light/dark theme, and S3-backed
  editor files.

### Fixed
- Playground UX polish: Monaco hover/suggest tooltips no longer clipped, robust
  Phaser vendoring at build time, wider editor launch, chat keeps focus/history,
  smoother generating screen.
