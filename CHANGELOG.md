# Changelog

All notable changes to airbotix-app (Portal + Learn SPA) are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/); entries are grouped
by date (AEST), newest first. Update this file in the **same commit** as the code change.

## 2026-06-09

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
