# CLAUDE.md — Game Studio (`src/pages/learn/playground/`)

> Scoped context for AI tools working in this folder. Read **alongside** the
> repo-root `airbotix-app/CLAUDE.md` (project contracts) and the umbrella
> `airbotix-ai/CLAUDE.md` (platform rules). This file OVERRIDES neither — it adds
> game-studio specifics.
>
> ⚠️ **SELF-UPDATE MANDATE.** This document is the high-level map of this folder.
> Any change that makes a statement here false — a new/renamed/deleted file, a
> changed route, a different sandbox attribute, a new Phaser version, a backend
> contract change, the dev route going away — MUST update this file in the SAME
> change. If you touch the folder and this doc no longer matches, fix the doc.

## What this is

The **kid game studio**: kids vibe-code 2D games in JavaScript using
**Phaser 3** that run **locally in the browser**, sandboxed. It's a
specialization of the code studio (`src/pages/learn/code/`) — same AI-assisted
loop, same iframe security model, but the runtime hosts Phaser and a game
canvas instead of a generic HTML page.

The UI is a **3-phase flow**, driven by a small state machine in
`PlaygroundApp.tsx` (`landing → generating → workspace`):

1. **`LandingScreen`** — a Gemini-style entry: one prompt box wrapped in an
   animated rotating brand-gradient glow border (`.pg-glow` in `playground.css`,
   driven by a registered `@property --pg-a` conic rotation) plus starter game
   chips. Enter (no Shift) or the send button submits the prompt.
2. **`GeneratingScreen`** — a blocking "building your game" animation (a spinning
   brand-gradient orb `.pg-orb-spin` + a staged status list + progress bar). It
   runs `resolveProjectFiles({ projectId, prompt })` once (`panes/playgroundApi.ts`):
   with a `projectId` it loads the **real** files from the S3-backed backend
   (`GET /projects/:id/code/files`); without one — or if that fails — it falls
   back to the local `generateScaffold` stub. Then it advances to the workspace
   with the resulting VFS.
3. **`Workspace`** — the actual studio, in one of **two layout modes** chosen by a
   toggle (`LayoutToggle`, state in `playgroundStore.layoutMode`, **default =
   Window**):
   - **Window mode (default):** three draggable/stackable floating windows
     (`desktop/Window.tsx`, on **`react-rnd`**) over the dark surface, wrapping
     `ChatPane` / `CodeEditorPane` / `GameRunnerPane`. Per-window geometry + z are
     in `playgroundStore` (default layout — Code lower-left & wide, Chat
     center-top & focused, Game right — is seeded from the viewport at store
     init). The surface has **desktop shortcut icons** (`desktop/DesktopIcon`,
     bottom z-layer) to reopen windows, and a **bottom `Taskbar`**
     (`desktop/Taskbar`) to restore/switch/minimize + hold the `LayoutToggle`.
     **Maximize fills the whole surface** (above the taskbar).
   - **Split mode:** a `react-resizable-panels` horizontal group — a left region
     with a `💬 Chat` / `</> Code` tab strip + a `ResizeHandle` + the
     `GameRunnerPane` on the right.

The Game Runner pane hosts the sandboxed `GameFrame` with
pause/mute/screen-size/restart/console controls and a status bar; its stage
**scales to fit the pane, preserving aspect ratio** (whole game always visible,
no scroll) via a `ResizeObserver`. **Chat is now standalone** (`panes/ChatPane`)
— it is no longer docked inside the code editor.

The playground is **themeable (light + dark), light is the default**. A single
`data-theme` attribute on the `PlaygroundApp` root (from `playgroundStore.theme`)
flips a set of semantic CSS variables defined in `playground.css`
(`[data-theme='light'|'dark']`), which the Tailwind `pg-*` color tokens resolve
to (`tailwind.config.js`): `pg-bg` (app base) · `pg-desktop` (window backdrop) ·
`pg-surface` / `pg-surface-2` (raised panels / toolbars) · `pg-border` · `pg-text`
/ `pg-text-dim` / `pg-text-muted`. Translucent overlays use `pg-text/<n>` (ink in
light, near-white in dark). Brand tokens (`brand-sky`/`brand-mint`/…) stay
constant across themes. All three phases share one theme (set on the root),
Monaco follows it (`vs` light / `vs-dark` dark), and a `ThemeToggle` icon button
(Sun/Moon) sits on the Landing screen (top-right) and in the workspace `Taskbar`.
Light values come from DESIGN.md (canvas/ink/hairline/steel); dark values are the
studio chrome shades.

Reference-mockup specifics (`docs/virtual-desktop-mockup.svg`): the **window-mode
desktop backdrop** is a mint-wash→sky-wash gradient in light / deep flat in dark
(`.pg-desktop-bg`); each window carries a **brand identity** (`WINDOW_ACCENT` —
chat=sky, code=mint, game=coral) shared by the desktop tiles AND the active
taskbar button; the **Files/Assets tabs** are full pills (active = solid
brand-sky); the **editor file tabs** are soft pills (active filled). The **Game
Runner is ALWAYS dark** in both themes (a media-player surface) — its pane forces
`data-theme="dark"`, and in Window mode its window uses `variant="game"` (a
highlighted brand purple→sky `.pg-runner-bar` title bar over a dark body).

> **Windowing is BACK — but only as one of two layout modes.** An earlier
> iteration had fully removed the window layer in favor of a fixed split; the
> redesign re-introduces floating windows (`desktop/Window.tsx`, `react-rnd`) as
> the default mode, with the resizable split kept as the alternate mode. Window
> mode now also has **desktop shortcut icons + a bottom taskbar** (to restore
> minimized/closed windows and switch when maximized). All UI uses **modern
> `lucide-react` vector icons** (no emoji glyphs in the chrome).

Lives under the kid Learn surface (`/learn/*`, `<ProtectedRoute kind="kid">`).
Authoritative design: `docs/workflow-redesign-design.md` (+ the `mockup-*.png`
landing/generating/workspace mockups). The older `docs/virtual-desktop-design.md`
+ `docs/plans/` are **historical**.

> **Scope shipped: UI shell + real file READ.** The 3-phase flow, both layout
> modes, Monaco editor, Game Runner control channel, and the chat UX are all real.
> File **loading is real** — `resolveProjectFiles` reads a project's VFS from the
> S3-backed backend (`GET /projects/:id/code/files`, via `src/lib/api.ts`) when a
> `projectId` is present, falling back to the local `generateScaffold` scaffold
> otherwise. Still stubbed: the AI **turn** (`gameAgentStub`), file **write-back /
> save** (edits stay in memory), and **scaffold generation** (the no-project
> fallback). The DEV `/playground-sandbox` has no auth (reads `?projectId` to
> exercise the real load). See "Status & what's next".

## The security model (do NOT weaken)

The kid's (or AI-generated) game is **untrusted code** running on
`app.airbotix.ai`. It executes inside an **opaque-origin** `<iframe>`:

```
sandbox="allow-scripts allow-pointer-lock allow-orientation-lock"
```

- **NO `allow-same-origin`** — this is load-bearing. Without it the frame is a
  foreign origin: it cannot read the in-memory auth token, cookies, storage, or
  reach `parent.document`. The only channel out is `postMessage`.
- The pointer/orientation-lock grants are safe and useful for games.
- Never add `allow-same-origin`, `allow-forms`, or `allow-top-navigation` to
  make something easier. If you think you need same-origin, you're solving it
  wrong — see how Phaser is loaded below.

## How Phaser gets into the sandbox (the non-obvious part)

Phaser (~1.18 MB) is **self-hosted**, NOT inlined and NOT from a CDN
(platform rule: no Cloudflare/CDN; self-host on S3+CloudFront).

- Served from the app origin at `public/vendor/phaser-3.80.1.min.js`. The file is
  **NOT committed to git** — it's materialized from the `phaser` npm dependency by
  the **`vendor-phaser` Vite plugin** (`vite.config.ts`, `buildStart` → runs on
  every dev-server start AND build, so the file exists no matter how Vite is
  launched), git-ignored, and copied into the deploy artifact by Vite (`public/` →
  `dist/`). Git tracks only the version pin. See "Dependencies" for the upgrade
  procedure. **If this file is missing the game throws "Phaser is not defined".**
- Injected into the srcdoc as a classic `<script src="/vendor/...">`.
- An opaque-origin srcdoc frame may still **fetch public subresources**, and a
  srcdoc's relative/absolute-path URLs resolve against the **parent** origin —
  so `/vendor/...` loads from `app.airbotix.ai` without same-origin access.
- Classic external scripts run in document order before the next inline script,
  so `window.Phaser` is guaranteed ready when `game.js` runs. A guard logs a
  friendly error if Phaser failed to load.
- ⚠️ If a CSP is ever added to the app, it needs `script-src 'self'` so the
  frame can load the vendored file. Update this note if that lands.

## Dependencies

- `lucide-react` — modern vector icons used across the whole playground UI
  (window controls, titles, toolbars, toggle, file tree, send). No emoji glyphs
  in the chrome.
- `react-rnd` (**`^10`**, with a `react-draggable` `4.5.0` `overrides` pin in
  `package.json`) — the floating draggable/resizable windows of **Window mode**
  (`desktop/Window.tsx`). Re-added for the redesign.
- `react-resizable-panels` (**v2** — the v4 API differs; pin to `^2`) — the
  resizable panes of **Split mode** + the FileTree/editor split inside
  `CodeEditorPane` (`PanelGroup`/`Panel`/`PanelResizeHandle`).
- `@monaco-editor/react` + `monaco-editor` — the code editor. **Lazy-loaded**
  (own chunk) and **self-hosted workers** via Vite `?worker` imports
  (`MonacoEditor.tsx`) — no CDN, per platform rule.
- `@playwright/test` (devDep) — e2e at `e2e/playground.spec.ts` /
  `playwright.config.ts` (root); `npm run test:e2e`.

- `phaser` (**`3.80.1`**, a regular `dependency`) — Phaser is an **npm dep** but
  is **never imported into the JS bundle** (zero bundle-size impact). It's only a
  source for two files that the **`vendor-phaser` Vite plugin** (`vite.config.ts`)
  materializes into `public/vendor/` on every dev/build (git-ignored, served
  same-origin — no CDN): the **engine** `phaser-3.80.1.min.js` (loaded as a
  `<script>` into the sandbox) and the **types** `phaser-3.80.1.d.ts`
  (lazy-`fetch`ed into Monaco for IntelliSense; never bundled). **Upgrading:**
  `npm i phaser@<new>`, then bump `PHASER_VERSION` in `vite.config.ts` **and** the
  `/vendor/phaser-<v>…` constants in `buildGamePreview.ts` +
  `panes/MonacoEditor.tsx` (the plugin throws on a version/constant mismatch so a
  404'd asset can't ship).

## The control channel (pause / mute / stats)

The Game Runner controls the running game **without** weakening the sandbox —
everything stays on `postMessage`. `buildGamePreview.ts` injects a `GAME_CONTROL`
shim into the srcdoc that **wraps the `Phaser.Game` constructor** to capture the
kid's game instance (our vendored build has **no `Phaser.GAMES` registry**, so a
constructor wrapper is the only handle). The wrapper preserves `.prototype` +
statics, so `instanceof Phaser.Game` and `Phaser.Game.*` still work.

- **Parent → frame:** `{ __airbotixControl: true, action: 'pause'|'resume'|'mute'|'unmute' }`
  → `game.loop.sleep()/wake()` and `game.sound.mute`.
- **Frame → parent:** `{ __airbotixStat: true, fps, paused }` every ~500 ms.
- **Physics-debug toggle** (NOT postMessage — set before the game scripts run):
  `buildGameSrcDoc(files, { debug })` injects `window.__airbotixDebug`; the
  `Phaser.Game` constructor wrapper reads it and forces `physics.arcade.debug =
  true` regardless of the kid's config, drawing hitboxes/velocities. Driven by
  the Game Runner's `Bug` toolbar button (`GameRunnerPane` `debug` state →
  `GameFrame` `debug` prop → `BuildGameOptions.debug`).
- `GameFrame.tsx` posts control on `paused`/`muted` change **and re-asserts after
  a remount** (the first fresh stat triggers a re-assert, since the control
  effects fire before the new game instance exists). `isStatMessage` typeguards
  the inbound stat; `onFps`/`onConsoleCount` feed the status bar.
- All shim access is `try/catch`-wrapped (game may not exist yet / Phaser
  internals may differ). Keep it on `postMessage` only — never reach for
  `allow-same-origin` to "simplify" this.

## Debugging errors (kid-facing)

When a kid's game throws, the studio points them straight at the broken line and
offers an AI fix — all over `postMessage`, no sandbox weakening:

- **Filenames are real.** Each injected `<script>` gets a `//# sourceURL=<path>`
  (`buildGamePreview.ts`), so the browser attributes uncaught errors (and stack
  frames) to the kid's actual VFS file with the correct line number, instead of
  the anonymous assembled document. ⚠️ With `sourceURL`, line numbers are counted
  from the script's own text, so the kid's content must follow `<script>` with
  **no leading newline** — otherwise every reported line is off by one (the
  jump-to-error spec guards this).
- **Errors carry a location.** `CONSOLE_CAPTURE` (shared from `../code/buildPreview.ts`)
  posts `window.error` as `{ level:'error', text, loc:{ file, line, col } }`
  (`loc` from `ErrorEvent.filename/lineno`, which now equals the sourceURL path).
  `ConsoleLine.loc` is the typed shape.
- **Jump to the error.** The Game Runner console renders a `basename:line` button
  per located error → `GameRunnerPane.onOpenLocation(file, line)` →
  `Workspace.handleOpenLocation` (sets a monotonic-`nonce` `locationRequest` +
  focuses the Code window/tab) → `CodeEditorPane.openLocation` opens that file's
  tab and sets `jumpTo` → `MonacoEditor` `revealLineInCenter` + `setPosition` +
  `focus`. Guarded: only real VFS paths jump (a Phaser-internal / `about:srcdoc`
  origin has no matching file and is ignored).
- **Ask AI to fix.** The console header shows an **Ask AI to fix** button for the
  most recent error → `GameRunnerPane.onAskFix` → `Workspace.handleAskFix` sends
  a kid-framed prompt (error text + `file:line`) to the chat agent and focuses
  the Chat window/tab. (The agent turn is still the **stub** — the UX path is
  real, the fix is not yet.)

## Editor IntelliSense (Phaser types)

`MonacoEditor` lazily loads the **vendored** Phaser `.d.ts`
(`public/vendor/phaser-3.80.1.d.ts`, ~6 MB) the first time any editor mounts:
`fetch('/vendor/...')` (self-hosted, no CDN — same rule as the engine itself),
strip the leading `/// <reference types="./matter" />` (Matter types aren't
vendored), then `javascriptDefaults.addExtraLib(...)`. The file declares an
ambient global `namespace Phaser`, so this gives **hover docs, ⌘/Ctrl-click
go-to-definition, and `Phaser.` autocomplete** with zero extra global wiring. The
~6 MB `.d.ts` is parsed by the TS worker on its own thread and is **never bundled**
(runtime fetch, module-level once-guard). Semantic *validation* stays **off**
(`noSemanticValidation: true`) so kids still get no red squiggles — completion /
hover / definition work independently of diagnostics.

## Runtime contract (what kids write)

The studio **owns the host HTML**; kids only edit `game.js` (+ optional assets,
+ optional `style.css`). The contract their code relies on:

- `Phaser` is a **global**.
- Mount the game into the element with **`id="game"`** (full-bleed black stage).
- Assets referenced by quoted path in `game.js` (e.g.
  `this.load.image('hero', 'sprites/hero.png')`) are rewritten to inlined
  `data:` URLs at build time so they load at the opaque origin. PARTIAL/V0 — a
  dedicated preview origin is the V1 plan (mirrors the code studio's deferral).

## Files

Top-level flow + runtime (the core/novel pieces — shared with the code studio's model):

| File | Role | Keeper? |
|---|---|---|
| `PlaygroundApp.tsx` | Top-level state machine. Owns `phase` (`landing`/`generating`/`workspace`) + the lifted VFS + monotonic `runKey` + the optional `projectId` (prop, or `?projectId` query param in the dev sandbox) threaded to `GeneratingScreen`; renders `LandingScreen` → `GeneratingScreen` → `Workspace`. (Replaced the deleted `PlaygroundPage.tsx`.) | ✅ |
| `LandingScreen.tsx` | Gemini-style entry: a prompt box with the `.pg-glow` rotating-gradient halo + starter game chips; Enter / send → `onSubmit(prompt)`. | ✅ |
| `GeneratingScreen.tsx` | Blocking "building"/"loading" animation (spinning `.pg-orb-spin` orb + staged status + progress bar; caption reads "Loading your game…" when a `projectId` is set, else "Building…"). Calls `resolveProjectFiles({ projectId, prompt })` once, then `onDone(files)`. | ✅ |
| `Workspace.tsx` | The studio shell: thin top bar (`LayoutToggle`) + the active layout — Window mode (3 `<Window>`s) or Split mode (`PanelGroup` with a Chat/Code tab strip + `GameRunnerPane`). Reads `layoutMode` from the store. Owns the chat agent (`useGameAgent`, so history survives the layout toggle), the `locationRequest` for jump-to-error (`handleOpenLocation` → focuses Code), and `handleAskFix` (sends an error to the chat agent → focuses Chat). | ✅ |
| `LayoutToggle.tsx` | Segmented `⊞ Windows` / `◫ Split` control; sets `playgroundStore.layoutMode`. | ✅ |
| `ThemeToggle.tsx` | Sun/Moon icon button that flips `playgroundStore.theme` (light ⇄ dark). Rendered on the Landing screen (top-right) and in the `Taskbar` (next to `LayoutToggle`). | ✅ |
| `playgroundStore.ts` | Zustand store: `theme` (default `'light'`) + `setTheme`/`toggleTheme`; `layoutMode` (default `'window'`) + Window-mode geometry/z/open/min/max + `interacting` (drag overlay flag) for the 3 windows. The Code Editor launches **wide enough to DOUBLE the editor area** while its fixed file column keeps its width — `width = CODE_FILES_COL_W + 2·(W/3 − CODE_FILES_COL_W)` (the old `W/3` launch made the editor part read too narrow). `CODE_FILES_COL_W` must stay in sync with `FILES_DEFAULT_W` in `CodeEditorPane`. | ✅ |
| `playground.css` | The **theme tokens** (`[data-theme='light'|'dark']` CSS vars the `pg-*` Tailwind colors resolve to) + `.pg-canvas` (themed vignette) + the `pg-`-namespaced animations Tailwind can't express: the `.pg-glow` halo (`@property --pg-a` conic rotation), `.pg-orb-spin`, `.pg-shimmer`; honors `prefers-reduced-motion`. | ✅ |
| `buildGamePreview.ts` | Assembles the sandboxed Phaser `srcdoc` from the VFS. **Multi-file:** injects every text `.js` file as its own classic `<script>` in array order with the **entry (`main.js`, else `game.js`, else last) injected LAST** + a **`//# sourceURL=<path>`** per script (so errors report the kid's file/line), concatenates all `.css` into the stage `<style>`; global classes only, **no `import`/`export`**. Reuses `CONSOLE_CAPTURE` + `ASSET_MIME` from `../code/buildPreview.ts`. Also injects the **`GAME_CONTROL` shim** (incl. the `__airbotixDebug` physics-debug flag via `BuildGameOptions.debug`) and exports `StatMessage`/`isStatMessage`. | ✅ |
| `GameFrame.tsx` | Renders the sandboxed iframe + optional console panel + "Fix this error" hook. Posts control messages (`paused`/`muted`/`debug` via the `srcdoc`) and reads `__airbotixStat` to report `onFps`/`onConsoleCount`; surfaces console `loc` to its `onConsole` consumer. | ✅ |
| `screenPresets.ts` | Fixed stage-size presets (iPhone/iPad/720p/…) for the Game Runner dropdown. | ✅ |
| `starterGame.ts` | Original single-`game.js` Pong VFS. Superseded as the seed by `panes/starterProject.ts`; kept only as a reference. | reference |

Windowing (`desktop/`):

| File | Role | Keeper? |
|---|---|---|
| `Window.tsx` | A single floating window for Window mode, on **`react-rnd`** (uncontrolled drag, controlled only when maximized → fills the whole surface). Raised-contrast surface + border + shadow, **sky border when focused** (topmost z); lucide min/max/close; **double-click the title bar toggles maximize/restore**; **restore returns to the pre-maximize rect** (imperative `updatePosition`/`updateSize` via a ref in a `useLayoutEffect` — react-rnd's `default` only seeds first mount, so without this it'd snap to 0,0). `icon` is a `ReactNode`; reads/writes its rect/z in `playgroundStore`; a transparent overlay covers the body while any window is `interacting`. `variant="game"` → always-dark window (`data-theme="dark"`) with the highlighted `.pg-runner-bar` gradient title bar. | ✅ |
| `Taskbar.tsx` | Bottom dock: the **Airbotix logo** (`public/logo-{black,white}-horizontal.png` — the real site mark, theme-swapped: black on light, white on dark) + a "Playground" surface label + `LayoutToggle` + `ThemeToggle` + a button per window (restore/switch/minimize); active window highlighted with its brand accent (`WINDOW_ACCENT`). | ✅ |
| `DesktopIcon.tsx` | A desktop shortcut tile to (re)open/focus a window — app-icon style: raised `pg-surface` tile carrying the window's **brand-tinted glow** (`TILE_SHADOW`) with the (unchanged) lucide glyph in a soft `WINDOW_ACCENT.wash` chip; lifts on hover. Bottom z-layer (below windows). | ✅ |
| `windowMeta.tsx` | `WINDOW_META` (id → title + lucide `Icon`) + `WINDOW_ORDER` + `WINDOW_ACCENT` (per-window brand identity: chat=sky, code=mint, game=coral — border/icon/wash classes); shared by Window/Taskbar/DesktopIcon/Workspace. | ✅ |

Panes (`panes/`):

| File | Role | Keeper? |
|---|---|---|
| `ChatPane.tsx` | **Standalone chat** = `useGameAgent` + `AIChatPanel`. The chat is no longer docked in the code editor; it's its own window (Window mode) / its own `💬 Chat` tab (Split mode). | ✅ |
| `CodeEditorPane.tsx` | FileTree sidebar at a **fixed pixel width** (plain flex layout + a custom drag divider, NOT react-resizable-panels — so growing the window only widens the editor; the column keeps its width) and **collapsible** via a `PanelLeft` toggle in the tab strip + a **multi-tab** editor (tab strip with dirty `●` / close `×`; the active tab is a soft `brand-sky/15` pill (bold text) — clearly distinct, consistent with the FileTree active row; the strip has **no scrollbar** — drag to scroll, with fading edges signalling overflow, and the active tab auto-scrolls into view — plus ▶ Play + lazy Monaco) + a **status bar** (file path · `Ln/Col` · LANGUAGE; no "unsaved" — auto-save is planned). **No docked chat anymore.** Holds a per-tab local draft; ▶ Play commits all dirty drafts back to the VFS and runs. Accepts an `openLocation` (file+line+nonce) → opens that tab and feeds Monaco a `jumpTo` (jump-to-error). | ✅ |
| `GameRunnerPane.tsx` | Toolbar (pause/mute/screen-size/restart/**physics-debug** `Bug` toggle/console), a stage sized to the **selected screen-preset's aspect ratio**, scaled to fit the pane & centered/letterboxed against black (ResizeObserver re-fits on resize; the running game re-fits live with no reload), status bar. **Gated**: the game does NOT auto-run — until the kid presses ▶ (toolbar or placeholder button → local `started`), the stage shows a "Press ▶ to play" placeholder and the status reads "Idle"; once started it mounts `GameFrame` and the status shows Running/Paused · fps · logs · WxH. The console **auto-opens on the first problem of a run** — error OR warning (Phaser reports "Scene not found" etc. as `console.warn`); 0 → >0 edge only, later problems don't re-open it, a restart resets. Located errors get a `basename:line` jump button (`onOpenLocation`) and the console header an **Ask AI to fix** button for the last error (`onAskFix`). Props (`files`/`runKey`/`onRun`/`onOpenLocation`/`onAskFix`); ↻ starts when idle, else bumps `runKey`. | ✅ |
| `playgroundApi.ts` | Project file I/O. `loadGameFiles(projectId)` reads the **real** VFS from the S3-backed backend (delegates to the code studio's `readVfs` → `GET /projects/:id/code/files` via `src/lib/api.ts`; the browser never touches S3). `resolveProjectFiles({ projectId, prompt })` is the single entry the UI calls: real load when a project exists, else/on-failure the local scaffold. `GAME_PROJECT_KIND='game'`. | ✅ (load); swap-out fallback |
| `starterProject.ts` | The rich **hierarchical** **fallback** seed VFS `STARTER_PROJECT` (`main.js`, `src/scenes/Boot.js`/`Game.js`/`GameOver.js`, `assets/README.txt`, `style.css` — global classes, entry `main.js` last) + the **stub** `async generateScaffold(prompt)` (delays `SCAFFOLD_DELAY_MS`, stamps the prompt into `main.js`). Used by `resolveProjectFiles` only when there's no project/backend. Replaces `starterGame.ts` as the seed. | swap-out (generateScaffold) |
| `ResizeHandle.tsx` | Styled `PanelResizeHandle` — the draggable divider between resizable panes. | ✅ |
| `FileTree.tsx` | **Nested folder tree** (built from slash-delimited paths, folders-first, collapsible, default-expanded) with brand-sky **Files / Assets pill tabs**. Tab membership is by ROLE (`inTab`): anything under `assets/` or `kind:'asset'` → **Assets**, everything else → **Files** — so the `assets/` folder stays OUT of the Files tab. lucide file/folder icons; active-file highlight (sky tint). | ✅ |
| `MonacoEditor.tsx` | Monaco wrapper, **lazy-loaded** + **self-hosted workers** (Vite `?worker`, `loader.config({ monaco })` — no CDN). Lenient JS diagnostics for kids (`noSemanticValidation` — no red squiggles). **Phaser IntelliSense**: lazily `addExtraLib`s the vendored `/vendor/phaser-3.80.1.d.ts` on first mount → hover docs / go-to-definition / `Phaser.` autocomplete (never bundled; see "Editor IntelliSense"). **Minimap on** (`showSlider: 'always'` so the viewport rectangle tracks scrolling, not just on hover). Reports caret via `onCursorChange` (status bar); accepts a `jumpTo` (`revealLineInCenter` + `setPosition` + `focus`) for jump-to-error. **Follows the playground theme** (`vs` light / `vs-dark` dark) via `playgroundStore.theme`. | ✅ |
| `AIChatPanel.tsx` | Purely-presentational chat UI (kid/agent bubbles, tool chips). Takes `useGameAgent` state via props; never calls the hook itself. Badged "stub demo". | ✅ |
| `useGameAgent.ts` | Chat controller hook (send → pending → resolve, then apply+run). `runTurn` is the **swap seam** — defaults to the stub, later an adapter over the real backend. | ✅ |
| `gameAgentStub.ts` | The **local stub turn** (`runTurnStub`): no network, deterministically tweaks the first hex bg colour so the turn→VFS→run path is visibly exercised. Replaced by the real backend call later. | swap-out |

Reuses the `VfsFile` type from `../code/codeApi.ts` (game projects share the VFS
model with code projects).

> **`PlaygroundPage.tsx` was DELETED** — its role is now split across
> `PlaygroundApp` (state machine + VFS) and `Workspace` (layout). The `desktop/`
> folder is back but holds **only `Window.tsx`** (no `Desktop`/`Taskbar`/
> `DesktopIcon`/`ShareWindow`); the dev route now renders `PlaygroundApp`.

## Routes

- `/playground-sandbox` — **DEV-ONLY** (wrapped in `import.meta.env.DEV` in
  `src/app/router.tsx`, stripped from prod). No auth. Renders **`PlaygroundApp`**
  — it opens on the Landing screen; typing a prompt runs the generating screen,
  then lands in the workspace (Window mode by default; toggle to Split). See
  README. Append **`?projectId=<id>`** to exercise the real S3-backed file load
  (`GET /projects/:id/code/files`) against a running/mocked backend; without it
  the local scaffold is used. (The old `PlaygroundPage` route target was deleted.)
- Planned product routes (not yet built): `/learn/create/playground` (hub),
  `/learn/playground/:projectId` (studio, behind kid auth + backend),
  `/learn/playground/:projectId/play` (fullscreen).

Naming convention: the **playground** is the feature (routes/hub/api use
`playground`); a single **game** artifact keeps `game` (`GameFrame`,
`buildGamePreview`, the kid's `game.js`).

## Status & what's next

**Shipped (UI shell):**

- The **3-phase flow** (`PlaygroundApp`): Landing (glow prompt + chips) →
  Generating (orb + staged status, runs the stub scaffold) → Workspace.
- **Two layout modes** (`Workspace` + `LayoutToggle`, **default Window**): Window
  mode = 3 draggable `react-rnd` windows (`desktop/Window.tsx`); Split mode =
  `react-resizable-panels` with a Chat/Code tab + Game Runner.
- Standalone chat (`ChatPane`), a **multi-tab** Code Editor (lazy/self-hosted
  Monaco + nested FileTree with Files/Assets tabs), and a Game Runner with
  pause/mute/screen-size/restart/console + status bar (placeholder until ▶ Play).
- The sandbox runtime + control channel (`buildGamePreview.ts`, `GameFrame.tsx`),
  now **multi-file** (all `.js` injected, entry last).
- **Real file load** (`panes/playgroundApi.ts` `resolveProjectFiles`): reads a
  project's VFS from the S3-backed backend (`GET /projects/:id/code/files`) when a
  `projectId` is present, else the local hierarchical scaffold
  (`panes/starterProject.ts`). ▶ Play and the chat turn apply edits and re-run
  (edits stay in memory — no write-back yet).
- The AI chat **UX**, backed by the **local stub** (`gameAgentStub.ts` via the
  `runTurn` seam in `useGameAgent.ts`) — offline, no LLM. The no-project
  scaffold (`generateScaffold`) is likewise a **local stub**.
- **Light + dark theming** (light default) across all three phases + Monaco, via
  `data-theme` + `pg-*` tokens + `ThemeToggle` (see the theming paragraph above).
- Verified by **16 passing Playwright specs** (`e2e/playground.spec.ts`, run with
  `npm run test:e2e`): landing → generating → workspace, multi-file scaffold,
  **the Code Editor launches with the editor area doubled (file column fixed)**,
  layout toggle Window ⇄ Split, AI chat stub (+ chat doesn't auto-run), runner
  placeholder → Play, screen-size presets reshape the stage, a problem (error or
  warning) auto-opens the console, **jump-to-error (a located console error opens
  that file at that exact line)**, **Ask AI to fix (the error routes to the chat
  agent)**, **the editor lazy-loads the vendored Phaser `.d.ts`**, chat history
  persists across the layout toggle, theme default-light/toggles/carries into the
  workspace, the code editor (status bar + Files/Assets split + file-column
  toggle), window dbl-click maximize + restore-to-prior-position, and
  closed-window reopen.

**Not yet built / still future:**

1. **Real backend AI** — replace `runTurnStub` with an adapter over the backend
   code-session loop (`playgroundApi.ts` over `POST /projects/:id/code/turn`,
   etc.). The vibe-coding loop runs **server-side** (decision D-CODE1); the kid
   surface must NEVER call an LLM directly (platform contract §5).
2. **Project save / write-back** — file **read** is real (`resolveProjectFiles`
   → `GET /projects/:id/code/files`), but edits are **not persisted**: ▶ Play and
   chat turns mutate the in-memory VFS only. A write path (`PUT`/turn-commit back
   to the backend/S3) is still to build.
3. The authed product routes — `/learn/playground/:projectId` (studio, behind
   `<ProtectedRoute kind="kid">` + backend), plus the hub/fullscreen routes.
   `PlaygroundApp` is currently reachable only via the dev `/playground-sandbox`.
4. **Backend (`platform-backend/code-sessions`)**: a `game` project kind with a
   Phaser starter template + a Phaser-aware agent system prompt.
5. A **Share** feature (the old placeholder Share window was deleted; not built).
6. `docs/product/prd/learn-game-studio-prd.md` (mandatory PRD — must exist
   before code drifts from spec).

## Inherited rules (don't relitigate here)

- All AI traffic → `platform-backend /llm/*` (Stars metered, audited). No direct
  LLM calls from this folder.
- Design system tokens only (no raw hex / Tailwind defaults). For themeable
  surfaces use the `pg-*` tokens (which flip with `data-theme`); brand tokens and
  the game-stage `bg-black` stay constant. Don't reintroduce hardcoded chrome
  hexes (`#242133` etc.) — they don't theme.
- Never log PII (kid nickname, prompts, project content).
