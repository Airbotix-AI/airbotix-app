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
   runs the **stubbed** `generateScaffold(prompt)` once, then advances to the
   workspace with the resulting VFS.
3. **`Workspace`** — the actual studio, in one of **two layout modes** chosen by a
   toggle (`LayoutToggle`, state in `playgroundStore.layoutMode`, **default =
   Window**):
   - **Window mode (default):** three draggable/stackable floating windows
     (`desktop/Window.tsx`, on **`react-rnd`**) over the dark surface, wrapping
     `ChatPane` / `CodeEditorPane` / `GameRunnerPane`. Per-window geometry + z are
     in `playgroundStore`. Dark windows only — **no taskbar / desktop icons**.
   - **Split mode:** a `react-resizable-panels` horizontal group — a left region
     with a `💬 Chat` / `</> Code` tab strip + a `ResizeHandle` + the
     `GameRunnerPane` on the right.

The Game Runner pane hosts the sandboxed `GameFrame` with
pause/mute/screen-size/restart/console controls and a status bar; its stage
**scales to fit the pane, preserving aspect ratio** (whole game always visible,
no scroll) via a `ResizeObserver`. **Chat is now standalone** (`panes/ChatPane`)
— it is no longer docked inside the code editor.

The whole playground is **dark-themed**: `bg-ink` base, `canvas-pure/<opacity>`
for raised surfaces + borders, `text-canvas-pure`/`text-stone2`/`text-steel`
text, with `brand-sky`/`brand-mint` accents (Monaco runs the `vs-dark` theme).

> **Windowing is BACK — but only as one of two layout modes.** An earlier
> iteration had fully removed the window layer in favor of a fixed split; the
> redesign re-introduces floating windows (`desktop/Window.tsx`, `react-rnd`) as
> the default mode, with the resizable split kept as the alternate mode. There is
> still **no taskbar, no desktop icons, and no `Desktop`/`ShareWindow`** — just
> three windows + the `LayoutToggle`.

Lives under the kid Learn surface (`/learn/*`, `<ProtectedRoute kind="kid">`).
Authoritative design: `docs/workflow-redesign-design.md` (+ the `mockup-*.png`
landing/generating/workspace mockups). The older `docs/virtual-desktop-design.md`
+ `docs/plans/` are **historical**.

> **Scope shipped: UI shell only.** The 3-phase flow, both layout modes, Monaco
> editor, Game Runner control channel, and the chat UX are all real. Scaffold
> generation is a **local stub** (`generateScaffold`, no network), the VFS is
> **local** (no save/load), and there's **no auth/backend**. See "Status & what's
> next".

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

- Vendored at `public/vendor/phaser-3.80.1.min.js`, served from the app origin.
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

Phaser stays vendored (above), not an npm dep.

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
- `GameFrame.tsx` posts control on `paused`/`muted` change **and re-asserts after
  a remount** (the first fresh stat triggers a re-assert, since the control
  effects fire before the new game instance exists). `isStatMessage` typeguards
  the inbound stat; `onFps`/`onConsoleCount` feed the status bar.
- All shim access is `try/catch`-wrapped (game may not exist yet / Phaser
  internals may differ). Keep it on `postMessage` only — never reach for
  `allow-same-origin` to "simplify" this.

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
| `PlaygroundApp.tsx` | Top-level state machine. Owns `phase` (`landing`/`generating`/`workspace`) + the lifted VFS + monotonic `runKey`; renders `LandingScreen` → `GeneratingScreen` → `Workspace`. (Replaced the deleted `PlaygroundPage.tsx`.) | ✅ |
| `LandingScreen.tsx` | Gemini-style entry: a prompt box with the `.pg-glow` rotating-gradient halo + starter game chips; Enter / send → `onSubmit(prompt)`. | ✅ |
| `GeneratingScreen.tsx` | Blocking "building" animation (spinning `.pg-orb-spin` orb + staged status + progress bar). Calls the **stub** `generateScaffold(prompt)` once, then `onDone(files)`. | ✅ |
| `Workspace.tsx` | The studio shell: thin top bar (`LayoutToggle`) + the active layout — Window mode (3 `<Window>`s) or Split mode (`PanelGroup` with a Chat/Code tab strip + `GameRunnerPane`). Reads `layoutMode` from the store. | ✅ |
| `LayoutToggle.tsx` | Segmented `⊞ Windows` / `◫ Split` control; sets `playgroundStore.layoutMode`. | ✅ |
| `playgroundStore.ts` | Zustand store: `layoutMode` (default `'window'`) + Window-mode geometry/z/open/min/max + `interacting` (drag overlay flag) for the 3 windows. | ✅ |
| `playground.css` | `pg-`-namespaced CSS the Tailwind utilities can't express: the `.pg-glow` halo (`@property --pg-a` conic rotation), `.pg-orb-spin`, `.pg-shimmer`; honors `prefers-reduced-motion`. | ✅ |
| `buildGamePreview.ts` | Assembles the sandboxed Phaser `srcdoc` from the VFS. **Multi-file:** injects every text `.js` file as its own classic `<script>` in array order with the **entry (`main.js`, else `game.js`, else last) injected LAST**, concatenates all `.css` into the stage `<style>`; global classes only, **no `import`/`export`**. Reuses `CONSOLE_CAPTURE` + `ASSET_MIME` from `../code/buildPreview.ts`. Also injects the **`GAME_CONTROL` shim** and exports `StatMessage`/`isStatMessage`. | ✅ |
| `GameFrame.tsx` | Renders the sandboxed iframe + optional console panel + "Fix this error" hook. Posts control messages (`paused`/`muted`) and reads `__airbotixStat` to report `onFps`/`onConsoleCount`. | ✅ |
| `screenPresets.ts` | Fixed stage-size presets (iPhone/iPad/720p/…) for the Game Runner dropdown. | ✅ |
| `starterGame.ts` | Original single-`game.js` Pong VFS. Superseded as the seed by `panes/starterProject.ts`; kept only as a reference. | reference |

Windowing (`desktop/`):

| File | Role | Keeper? |
|---|---|---|
| `Window.tsx` | A single floating window for Window mode, on **`react-rnd`** (uncontrolled drag, controlled only when maximized). Dark title-bar (icon + label + min/max/close), reads/writes its rect/z in `playgroundStore`; a transparent overlay covers the body while any window is `interacting` so a drag across the game iframe doesn't stall. **No taskbar / desktop icons.** | ✅ |

Panes (`panes/`):

| File | Role | Keeper? |
|---|---|---|
| `ChatPane.tsx` | **Standalone chat** = `useGameAgent` + `AIChatPanel`. The chat is no longer docked in the code editor; it's its own window (Window mode) / its own `💬 Chat` tab (Split mode). | ✅ |
| `CodeEditorPane.tsx` | FileTree sidebar + a **multi-tab** editor (tab strip with active / dirty `●` / close `×` per open tab + ▶ Play + lazy Monaco). **No docked chat anymore.** Holds a per-tab local draft; ▶ Play commits all dirty drafts back to the VFS and runs. | ✅ |
| `GameRunnerPane.tsx` | Toolbar (pause/mute/screen-size/restart/console), an **aspect-preserving scale-to-fit** stage (ResizeObserver), status bar. **Gated**: the game does NOT auto-run — until the kid presses ▶ (toolbar or placeholder button → local `started`), the stage shows a "Press ▶ to play" placeholder and the status reads "Idle"; once started it mounts `GameFrame` and the status shows Running/Paused · fps · logs · WxH. Props (`files`/`runKey`/`onRestart`); ↻ starts when idle, else bumps `runKey`. | ✅ |
| `starterProject.ts` | The rich **hierarchical** seed VFS `STARTER_PROJECT` (`main.js`, `src/scenes/Boot.js`/`Game.js`/`GameOver.js`, `assets/README.txt`, `style.css` — global classes, entry `main.js` last) + the **stub** `async generateScaffold(prompt)` (delays ~1.8s, stamps the prompt into `main.js`, returns the project). Replaces `starterGame.ts` as the seed. | swap-out (generateScaffold) |
| `ResizeHandle.tsx` | Styled `PanelResizeHandle` — the draggable divider between resizable panes. | ✅ |
| `FileTree.tsx` | **Nested folder tree** (built from slash-delimited paths, folders-first, collapsible, default-expanded) with **📄 Files / 🧊 Assets tabs** (filters by `kind`); emoji per extension, active-file highlight. | ✅ |
| `MonacoEditor.tsx` | Monaco wrapper, **lazy-loaded** + **self-hosted workers** (Vite `?worker`, `loader.config({ monaco })` — no CDN). Lenient JS diagnostics for kids. | ✅ |
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
  README. (The old `PlaygroundPage` route target was deleted.)
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
- A **local**, rich hierarchical VFS (`panes/starterProject.ts`); ▶ Play and the
  chat turn apply edits and re-run.
- The AI chat **UX**, backed by the **local stub** (`gameAgentStub.ts` via the
  `runTurn` seam in `useGameAgent.ts`) — offline, no LLM. Scaffold generation is
  likewise a **local stub** (`generateScaffold`).
- Verified by **5 passing Playwright specs** (`e2e/playground.spec.ts`, run with
  `npm run test:e2e`): landing → generating → workspace, multi-file scaffold,
  layout toggle Window ⇄ Split, AI chat stub, runner placeholder → Play.

**Not yet built / still future:**

1. **Real backend AI** — replace `runTurnStub` with an adapter over the backend
   code-session loop (`playgroundApi.ts` over `POST /projects/:id/code/turn`,
   etc.). The vibe-coding loop runs **server-side** (decision D-CODE1); the kid
   surface must NEVER call an LLM directly (platform contract §5).
2. **Project save/load** — the VFS is in-memory only; no persistence.
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
- Design system tokens only (no raw hex / Tailwind defaults).
- Never log PII (kid nickname, prompts, project content).
