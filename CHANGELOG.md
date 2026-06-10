# Changelog

All notable changes to airbotix-app (Portal + Learn SPA) are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/); entries are grouped
by date (AEST), newest first. Update this file in the **same commit** as the code change.

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
