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

The UI is a **virtual desktop** (`react-rnd`): a `Desktop` backdrop with
draggable/resizable floating windows, three shortcut icons (Code Editor / Game
Runner / Share), and a bottom taskbar. Windows are managed by a Zustand window
store. The Code Editor hosts a (lazy, self-hosted) Monaco editor + a file tree +
a docked AI chat panel; the Game Runner hosts the sandboxed `GameFrame` with
pause/mute/screen-size/restart/console controls and a status bar.

Lives under the kid Learn surface (`/learn/*`, `<ProtectedRoute kind="kid">`).
The design + plan docs are in `docs/` (`virtual-desktop-design.md`,
`docs/plans/`); they are the source of truth for this iteration's scope.

> **Scope shipped (commit C6.2): UI shell only.** The desktop, windows, Monaco
> editor, Game Runner control channel, and the chat UX are all real. The AI turn
> is a **local stub** (no network), the VFS is **local** (seeded with Pong, no
> save/load), and there's **no auth/backend**. See "Status & what's next".

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

## Dependencies (added for the desktop shell)

- `react-rnd` — drag/resize for the floating `<Window>`s.
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

Sandbox runtime (the core/novel pieces — shared with the code studio's model):

| File | Role | Keeper? |
|---|---|---|
| `buildGamePreview.ts` | Assembles the sandboxed Phaser `srcdoc` from the VFS. Reuses `CONSOLE_CAPTURE` + `ASSET_MIME` from `../code/buildPreview.ts` (single source of truth for the console protocol). Now also injects the **`GAME_CONTROL` shim** (pause/mute/stat channel) and exports `StatMessage`/`isStatMessage`. | ✅ |
| `GameFrame.tsx` | Renders the sandboxed iframe + optional console panel + "Fix this error" hook. Now posts control messages (`paused`/`muted`) and reads `__airbotixStat` to report `onFps`/`onConsoleCount`. | ✅ |
| `starterGame.ts` | Canonical Pong seed VFS (one `game.js`). Moved here when `GameSandboxDevPage.tsx` was deleted; `PlaygroundPage` seeds its VFS from this. | ✅ |
| `screenPresets.ts` | Fixed stage-size presets (iPhone/iPad/720p/…) for the Game Runner dropdown. | ✅ |
| `PlaygroundPage.tsx` | Top-level page. Single source of truth for the local VFS + monotonic `runKey`; renders `<Desktop>`. No backend/auth wiring this iteration. | ✅ |

Virtual desktop shell (`desktop/`):

| File | Role | Keeper? |
|---|---|---|
| `windowStore.ts` | Zustand store for window runtime state (open/minimized/maximized, z-order, rect) + the `interacting` flag driving the cross-window drag overlay. Pure store, no JSX. | ✅ |
| `windowConfig.ts` | Per-window registry: title, emoji icon, default first-open geometry. Data-driven so icon/window/taskbar read one source. | ✅ |
| `Window.tsx` | Reusable floating-window chrome — `<Rnd>` drag/resize + titlebar (min/max/close) + the per-window drag overlay (covers iframe children while any window is dragged). | ✅ |
| `DesktopIcon.tsx` | Kid-friendly shortcut tile; click/double-click `openOrFocus`es the matching window. | ✅ |
| `Taskbar.tsx` | Bottom bar (exactly 48px — kept in lockstep with `Window`'s maximize allowance): one pill per open window; click focuses / minimizes / restores. | ✅ |
| `Desktop.tsx` | Surface composition: gradient backdrop, shortcut column, the three `<Window>`s, taskbar. Opens code+game on mount. | ✅ |

Windows (`windows/`):

| File | Role | Keeper? |
|---|---|---|
| `CodeEditorWindow.tsx` | Code Editor body: FileTree sidebar + center editor (tab row + ▶ Play + lazy Monaco) + docked AI chat. Holds a local draft; ▶ Play / AI turn are the commit points back to the VFS. | ✅ |
| `FileTree.tsx` | File list sidebar (emoji per extension, active-file highlight). | ✅ |
| `MonacoEditor.tsx` | Monaco wrapper, **lazy-loaded** + **self-hosted workers** (Vite `?worker`, `loader.config({ monaco })` — no CDN). Lenient JS diagnostics for kids. | ✅ |
| `AIChatPanel.tsx` | Purely-presentational chat UI (kid/agent bubbles, tool chips). Takes `useGameAgent` state via props; never calls the hook itself. Badged "stub demo". | ✅ |
| `useGameAgent.ts` | Chat controller hook (send → pending → resolve, then apply+run). `runTurn` is the **swap seam** — defaults to the stub, later an adapter over the real backend. | ✅ |
| `gameAgentStub.ts` | The **local stub turn** (`runTurnStub`): no network, deterministically tweaks `game.js`'s first hex bg colour so the turn→VFS→run path is visibly exercised. Replaced by the real backend call later. | swap-out |
| `GameRunnerWindow.tsx` | Game Runner body: toolbar (pause/mute/screen-size/restart/console), FIT-scaled stage hosting `GameFrame`, status bar (Running/Paused · fps · logs · WxH). | ✅ |
| `ShareWindow.tsx` | Placeholder "coming soon" body — the Share feature isn't built. | placeholder |

Reuses the `VfsFile` type from `../code/codeApi.ts` (game projects share the VFS
model with code projects).

> **`GameSandboxDevPage.tsx` was DELETED** (commit C6.2). Its hardcoded Pong moved
> to `starterGame.ts`; the dev route now renders the real `PlaygroundPage`.

## Routes

- `/playground-sandbox` — **DEV-ONLY** (wrapped in `import.meta.env.DEV` in
  `src/app/router.tsx`, stripped from prod). No auth. Now renders the full
  **`PlaygroundPage`** (the virtual desktop), seeded with the local Pong VFS.
  (It previously rendered the now-deleted `GameSandboxDevPage`.) See README.
- Planned product routes (not yet built): `/learn/create/playground` (hub),
  `/learn/playground/:projectId` (studio, behind kid auth + backend),
  `/learn/playground/:projectId/play` (fullscreen).

Naming convention: the **playground** is the feature (routes/hub/api use
`playground`); a single **game** artifact keeps `game` (`GameFrame`,
`buildGamePreview`, the kid's `game.js`).

## Status & what's next

**Shipped (commit C6.2 — UI shell):**

- The sandbox runtime + control channel (`buildGamePreview.ts`, `GameFrame.tsx`).
- The full virtual desktop: window store + chrome (`desktop/`), Code Editor with
  lazy/self-hosted Monaco + file tree + docked chat (`windows/`), Game Runner with
  pause/mute/screen-size/restart/console + status bar.
- A **local** VFS seeded with Pong (`starterGame.ts`); ▶ Play and the chat turn
  apply edits and re-run.
- The AI chat **UX**, backed by the **local stub** (`gameAgentStub.ts` via the
  `runTurn` seam in `useGameAgent.ts`) — offline, no LLM.
- Verified by **5 passing Playwright specs** (`e2e/playground.spec.ts`, run with
  `npm run test:e2e`): desktop shell, fps + pause/resume control channel, screen
  presets, minimize/restore, stub chat turn.

**Not yet built / still future:**

1. **Real backend AI** — replace `runTurnStub` with an adapter over the backend
   code-session loop (`playgroundApi.ts` over `POST /projects/:id/code/turn`,
   etc.). The vibe-coding loop runs **server-side** (decision D-CODE1); the kid
   surface must NEVER call an LLM directly (platform contract §5).
2. **Project save/load** — the VFS is in-memory only; no persistence.
3. The authed product routes — `/learn/playground/:projectId` (studio, behind
   `<ProtectedRoute kind="kid">` + backend), plus the hub/fullscreen routes.
   `PlaygroundPage` is currently reachable only via the dev `/playground-sandbox`.
4. **Backend (`platform-backend/code-sessions`)**: a `game` project kind with a
   Phaser starter template + a Phaser-aware agent system prompt.
5. The **Share** window (currently a placeholder).
6. `docs/product/prd/learn-game-studio-prd.md` (mandatory PRD — must exist
   before code drifts from spec).

## Inherited rules (don't relitigate here)

- All AI traffic → `platform-backend /llm/*` (Stars metered, audited). No direct
  LLM calls from this folder.
- Design system tokens only (no raw hex / Tailwind defaults).
- Never log PII (kid nickname, prompts, project content).
