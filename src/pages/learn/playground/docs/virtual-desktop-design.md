# Design — Playground virtual-desktop UI shell

> Status: **DRAFT for discussion** (not yet implemented). Owner: TBD.
> Scope of this doc: the kid-facing virtual desktop for the game playground.

## 1. Context & goal

The game playground (`src/pages/learn/playground/`) today has only a sandboxed Phaser
runtime (`buildGamePreview.ts` + `GameFrame.tsx`) and a throwaway Pong dev page. We want
the **studio UI**: a kid-facing **virtual desktop** — a full-screen surface with draggable/
resizable floating windows and shortcut icons, modelled on the phaser.io editor reference.

Three "apps":
1. **Code Editor** (Monaco) — edit `game.js`, browse files/assets, ▶ Play to run, **+ an AI
   chat panel** (prompt box + chat history) for AI-driven game development (IDE-copilot style).
2. **Game Runner** — runs the game; pause/resume, mute, screen-size presets, restart, console.
3. **Share** — placeholder this iteration.

Plus **3 desktop shortcut icons** (Code Editor, Game Runner, Share) and a taskbar.

### Iteration scope: UI SHELL ONLY (AI turn stubbed)
Works on **in-browser VFS state** seeded with a starter game (Pong). **No real backend, no auth,
no save/load.** The AI chat is fully built UX-wise but its "turn" is a **local stub** (canned
responses + the same turn→VFS→run wiring), so the desktop is fully demoable offline; the real
server-side agent is wired in a later iteration. The desktop is the real `PlaygroundPage`; for
now it's viewable through the existing dev (no-auth) route.

### Decisions locked
| Topic | Decision |
|---|---|
| Window system | **`react-rnd`** (new dep) + custom chrome / store / taskbar / icons |
| Code editor | **Monaco** (`@monaco-editor/react` + `monaco-editor`, new deps), lazy-loaded, self-hosted workers (no CDN) |
| AI chat | **Panel inside the Code Editor window** (IDE-copilot style). Turn is a **local stub** this iteration; real server-side agent later. |
| Verification | Per-milestone visual loop (headless-Chrome screenshot vs mockup) + **Playwright** interaction tests (new dev-dep). See §9. |
| Name | **"Playground"** — all code stays in `src/pages/learn/playground/`. ("workspace" is a different existing feature at `/learn/workspace`.) |

### Key technical finding
`Phaser.GAMES` is **absent** in `public/vendor/phaser-3.80.1.min.js` (verified by grep). So the
control channel cannot read a global game registry. Instead the injected shim **wraps the
`Phaser.Game` constructor** to capture the kid's instance, then uses:
- `game.loop.sleep()` / `game.loop.wake()` — pause / resume
- `game.sound.mute = bool` — mute
- `game.loop.actualFps` — fps readout

The strict sandbox is unchanged (`allow-scripts` only, no `allow-same-origin`); all
parent↔frame communication stays on `postMessage`.

---

## 2. File plan

### New dependencies (`package.json`)
- Runtime: `react-rnd`, `@monaco-editor/react`, `monaco-editor`.
  No `vite.config.ts` change (Monaco workers via Vite-native `?worker` imports). `tsconfig.json`
  unchanged unless `tsc -b` complains about a worker import (contingency: add `"WebWorker"` to `lib`).
- Dev (interaction tests): `@playwright/test`. Adds root `playwright.config.ts` (baseURL
  `http://localhost:4321`, `webServer` runs `npm run dev`), `e2e/playground.spec.ts`, and a
  `test:e2e` script. (airbotix-app has no browser-automation dep today; the marketing repo already
  uses Playwright.)

### New files — all under `src/pages/learn/playground/`
| File | Role |
|---|---|
| `PlaygroundPage.tsx` | Page; owns VFS (`useState<VfsFile[]>` seeded from `starterGame.ts`) + `runKey`. Single source of truth for files + run. Mounts `<Desktop>`. |
| `starterGame.ts` | `STARTER_GAME: VfsFile[]` — Pong `game.js` moved here from the dev page. |
| `screenPresets.ts` | `SCREEN_PRESETS`: Original 754×533, iPhone 390×844, iPhone-landscape 844×390, iPad 768×1024, iPad-landscape 1024×768, 720p 1280×720, 1080p 1920×1080. |
| `desktop/windowStore.ts` | zustand store (shape in §4). |
| `desktop/windowConfig.ts` | Registry: `id → { title, icon, defaultRect }` (data-driven). |
| `desktop/Desktop.tsx` | Full-screen surface: background, icons, maps store → `<Window>`s, `<Taskbar>`, global drag overlay. |
| `desktop/DesktopIcon.tsx` | Shortcut (icon+label) → `openOrFocus(id)`. |
| `desktop/Window.tsx` | Reusable chrome on `<Rnd>`: titlebar (min/maximize/close), focus on pointerdown, body slot. |
| `desktop/Taskbar.tsx` | Bottom bar, one button per open window; toggle minimize/restore + focus. |
| `windows/CodeEditorWindow.tsx` | Layout: FileTree + tabs + lazy Monaco + ▶ Play, with the **AI chat panel** docked on one side (collapsible). |
| `windows/MonacoEditor.tsx` | Lazy boundary: `loader.config({ monaco })` + `MonacoEnvironment.getWorker` via `?worker`; JS config. |
| `windows/FileTree.tsx` | Flat VFS list, emoji-by-extension (mirror `code/FileTree.tsx`). |
| `windows/AIChatPanel.tsx` | Prompt box + chat history (mirror `code/CodeChat.tsx` look + tokens). Calls `useGameAgent`. |
| `windows/useGameAgent.ts` | Chat state (`ChatItem[]`, busy, error) + `send()`. Pluggable `runTurn` — **stub now**, swap to `runAgentTurn` (codeApi) later. On result: lift updated VFS + bump runKey. |
| `windows/gameAgentStub.ts` | The mock `runTurn`: canned assistant summary + (optional) one deterministic edit to prove the turn→VFS→run path. Clearly labelled placeholder. |
| `windows/GameRunnerWindow.tsx` | Wraps `GameFrame`; toolbar + status bar (§5). |
| `windows/ShareWindow.tsx` | Tiny "share coming soon" placeholder. |

### Edited / deleted files
| File | Change |
|---|---|
| `buildGamePreview.ts` | Add `GAME_CONTROL` shim (after Phaser `<script>` + guard, before `game.js`). Export `StatMessage` + `isStatMessage()`. |
| `GameFrame.tsx` | Add iframe `ref`; props `paused`, `muted`, `onFps`, `onConsoleCount`; post control on change (re-assert after runKey remount); read `__airbotixStat`. |
| `src/app/router.tsx` | Point the existing DEV-only route (`/playground-sandbox`, outside `LearnLayout`, `import.meta.env.DEV`-gated) at `<PlaygroundPage />`; drop `GameSandboxDevPage` import. |
| `GameSandboxDevPage.tsx` | **Delete** (superseded; Pong moves to `starterGame.ts`). |
| `CLAUDE.md` + `README.md` | **Mandatory** (self-update mandate): file table, control protocol, `Phaser.Game`-wrap note, window architecture, new deps, dev route now renders the desktop. |

---

## 3. Control channel protocol (in `buildGamePreview.ts`)

```
Parent → frame:  { __airbotixControl: true, action: 'pause'|'resume'|'mute'|'unmute' }
Frame → parent:  { __airbotixStat: true, fps: number, paused: boolean }   // every ~500ms
```

`GAME_CONTROL` shim (pseudocode):
```js
var _OrigGame = Phaser.Game, __game = null;
Phaser.Game = function (cfg) { __game = new _OrigGame(cfg); return __game; };
Phaser.Game.prototype = _OrigGame.prototype;            // keep instanceof + statics

window.addEventListener('message', function (e) {
  var m = e.data; if (!m || m.__airbotixControl !== true || !__game) return;
  try {
    if (m.action === 'pause')  __game.loop.sleep();
    if (m.action === 'resume') __game.loop.wake();
    if (m.action === 'mute')   __game.sound.mute = true;
    if (m.action === 'unmute') __game.sound.mute = false;
  } catch (_) {}
});

setInterval(function () {
  if (!__game) return;
  try { parent.postMessage({ __airbotixStat: true,
    fps: Math.round(__game.loop.actualFps || 0), paused: !__game.loop.running }, '*'); } catch (_) {}
}, 500);
```
Parent posts via `iframe.contentWindow.postMessage(msg, '*')`.

**Handled in React, no message:**
- **Restart** = `runKey` bump → iframe remounts.
- **Screen-size** = set the stage-container `div`'s w/h to the preset; Phaser `Scale.FIT`
  adapts. Large presets sit inside a scroll/center wrapper.

---

## 4. Window store + `<Window>` API

```ts
type WindowId = 'code' | 'game' | 'share';
interface WindowRect { x:number; y:number; w:number; h:number }
interface WindowState {
  id: WindowId; open: boolean; minimized: boolean; maximized: boolean;
  zIndex: number; rect: WindowRect;   // last restored geometry
}
// store: { windows: Record<WindowId, WindowState>; topZ: number;
//          openOrFocus, focus, close, minimize, toggleMaximize, setRect }
```
- **Focus / z-order**: `focus(id)` → `zIndex = ++topZ`; pointerdown on a window focuses it.
- **Icons**: `openOrFocus` sets `open=true, minimized=false`, then focus.
- **`<Window props={ id, title, icon, children }>`**: reads its state; renders nothing if
  `!open || minimized`. Wraps body in `<Rnd dragHandleClassName="pg-titlebar" bounds="parent"
  onDragStop/onResizeStop→setRect onMouseDown→focus minWidth=320 minHeight=240
  style={{zIndex}}>`. Maximized → full desktop minus taskbar, drag/resize disabled.

---

## 5. Game Runner window

Local state: `paused`, `muted`, `presetId`, `showConsole`, `fps`, `logCount`.
- **Toolbar**: ▶/⏸ (paused) · 🔊 (muted) · 📱 preset `<select>` · ↻ restart (runKey bump) ·
  ▭ console toggle.
- **Status bar**: `Paused/Running` · `<fps> fps` · `<logCount> logs`.
- `fps` ← `onFps`; `logCount` ← `onConsoleCount`; `showConsole` → `GameFrame.showConsole`.
- ▶ Play (in Code Editor) writes edited `game.js` into the lifted VFS and bumps `runKey`.

---

## 6. Monaco under Vite

- `CodeEditorWindow` uses `React.lazy(() => import('./MonacoEditor'))` + `<Suspense>` so Monaco
  is a **separate chunk**, fetched only when the editor opens.
- Workers self-hosted (no CDN): `monaco-editor/esm/vs/editor/editor.worker?worker` +
  `monaco-editor/esm/vs/language/typescript/ts.worker?worker` via `MonacoEnvironment.getWorker`.
- `loader.config({ monaco })` forces the locally bundled `monaco-editor`.
- JS editor config: `language="javascript"`, minimap off, JetBrains Mono, lenient diagnostics,
  word wrap on.

---

## 7. AI chat panel (stubbed this iteration)

Docked inside the Code Editor window; mirrors the existing code studio chat.

- **`ChatItem`** (mirror `code/useCodeStudio`): `{ id, role: 'kid'|'agent', text, pending?,
  toolsFired?, changes? }` (drop the Stars field for the stub).
- **`useGameAgent(files, onApplyFiles, onRun)`**: holds `chat`, `busy`, `error`; `send(text)`
  pushes a kid item + a pending agent item, awaits `runTurn(text, files)`, replaces the pending
  item with the summary, then `onApplyFiles(result.files)` + `onRun()` (bump runKey).
- **`runTurn` seam** — the whole point of the stub design: one function signature
  `(prompt, files) => Promise<{ summary; files; toolsFired?; changes? }>`. Stub now
  (`gameAgentStub.ts`); later swapped for `runAgentTurn` from `code/codeApi.ts`
  (`POST /projects/:id/code/turn` → `AgentTurnResult.files`). UI + wiring stay identical — only
  `runTurn` changes.
- **Stub behavior**: returns a clearly-placeholder assistant message ("AI isn't connected yet —
  here's a demo edit") + optionally one deterministic tweak to `game.js` (e.g. change the stage
  background colour) so the turn→VFS→run path is visibly exercised. No Stars, no network.
- **UI** (`AIChatPanel.tsx`): reuse `code/CodeChat.tsx` structure + tokens — history bubbles
  (kid right `bg-grad-sky`, agent left `bg-surface`), textarea + Enter-to-send, busy state.
  Collapsible within the Code Editor window.

> Real AI later needs platform-backend code-sessions to add a `game` project kind + Phaser-aware
> agent prompt (cross-repo), plus auth + Stars metering. The stub keeps this iteration offline.

---

## 8. Build order (early viewable milestone)

1. **Shell** — add react-rnd; store/config/Window(+overlay)/Icon/Taskbar/Desktop/PlaygroundPage/
   starterGame/screenPresets/ShareWindow. CodeEditor = placeholder textarea; GameRunner =
   `<GameFrame>` only. Point dev route at PlaygroundPage. → drag/resize/focus/min/max, Pong runs.
2. **Control channel** — edit `buildGamePreview.ts` + `GameFrame.tsx`; build the GameRunner
   toolbar + status. → pause freezes Pong, mute, fps ~60, console toggle + count, presets, restart.
3. **Monaco + chat** — add deps; `MonacoEditor` (lazy + workers) + FileTree + tabs; ▶ Play writes
   VFS. Add `AIChatPanel` + `useGameAgent` + `gameAgentStub` docked in the Code Editor window;
   sending a prompt runs the stub turn → applies VFS → runs the game.
4. **Polish + docs** — Share/taskbar polish, z-index/overlay edges; update CLAUDE.md + README.

Each milestone closes with the §9 loop: screenshot-vs-mockup + the relevant Playwright specs +
static gates green, shown for sign-off before moving on. (Playwright is added in milestone 1 so
the window specs exist from the start; control-channel + chat specs land with milestones 2–3.)

---

## 9. Verification methodology

Visual/interactive work runs a **per-milestone feedback loop**, not just an end test. Each of the
4 milestones is a checkpoint; the cycle is:

```
edit → static gate → run → screenshot → compare vs references → diff → fix → repeat
```

A milestone is "done" only when its screenshot matches the mockup, its Playwright specs pass, and
the static gates are green. I surface a screenshot + e2e result at each milestone for sign-off —
so "verify against the design" happens 4 times, not once.

### 9.1 Static gate (before looking at pixels)
- `npm run typecheck` + `eslint --max-warnings 0` must pass.
- Token compliance: `grep -rE 'bg-(blue|gray|red|green|slate|zinc)-[0-9]|#[0-9a-fA-F]{6}'
  src/pages/learn/playground` must be empty (K-12 tokens only, no raw hex / Tailwind defaults).

### 9.2 Visual check — screenshot vs mockup
- Run dev (`:4321`), open `/playground-sandbox` (DEV-only, no auth/backend).
- Headless-Chrome screenshot at a fixed viewport (and at each screen-size preset for the runner):
  `chrome --headless --window-size=1700,1080 --screenshot=shot.png file://…` (the exact mechanism
  used to render this mockup).
- Compare against the **three references**: `docs/virtual-desktop-mockup.png` (visual target),
  this design doc (spec), the §8 milestone list (scope). Record concrete deltas (spacing, tokens,
  missing controls), fix, re-capture until it matches.

### 9.3 Interaction tests — Playwright (`e2e/playground.spec.ts`)
Covers behavior screenshots can't. Highest-value target = the game **control channel** (the
trickiest, most-likely-to-silently-break piece):
- **Windows**: drag → stored rect changes; click → comes to front (z-index); minimize → hidden +
  taskbar entry → restore; maximize → fills desktop; drag a window **across the Game Runner
  iframe** without stalling (validates the overlay).
- **Control channel**: click ⏸ → next `__airbotixStat` reports `paused:true` / fps→0; ▶ resumes;
  🔊 mutes; ↻ remounts the game; preset → stage box resizes.
- **AI chat**: send a prompt → kid bubble + stub assistant reply appear, and the game re-runs
  (runKey bumped).

### 9.4 Manual-only (can't automate well)
Drag latency/smoothness, real frame-rate feel, font rendering in your actual browser — I capture
states; you spot-check. Flagged explicitly when relevant.

### 9.5 Smoke checklist (per milestone, on `/playground-sandbox`)
- Desktop + 3 icons (Code Editor / Game Runner / Share) + taskbar.
- Game Runner: Pong runs; ⏸ freezes & ▶ resumes (status flips); 🔊 mutes; fps ~60; console
  toggle shows panel + log count; preset dropdown resizes stage (FIT scales); ↻ restarts.
- Code Editor: Monaco lazy-loads, file tree shows `game.js`, edit + ▶ Play updates the runner.
  AI chat: prompt + send → kid bubble + (stub) assistant reply, game re-runs.
- Windows: drag titlebar **across the game iframe without stalling**, resize, minimize → taskbar →
  restore, maximize → fills desktop, close; click brings to front.
- `npm run typecheck`, `npm run build` (shows a separate Monaco chunk), and `npm run test:e2e` pass.

---

## 10. Risks / open points

1. **`Phaser.GAMES` absent** → constructor-wrap capture (chosen); guard all access in try/catch.
2. **iframe swallows mousemove** → transparent full-desktop **drag overlay** during any drag/
   resize. Most important correctness detail — without it, dragging a window over the game
   iframe stalls.
3. **Remount race** (control posted before game exists) → re-assert paused/muted on first
   `__airbotixStat` after a runKey bump.
4. **Monaco bundle (~3–5 MB incl. workers)** → must be lazy/code-split; self-hosted workers.
5. **Touch targets** for tablet kids → generous titlebar button padding.
6. **Design tokens only** — chrome/desktop/taskbar use `canvas`/`surface`/`hairline`/`ink`/
   `wash-*` + `shadow-card-soft`/`shadow-sticker` + `rounded-2xl`; no raw hex.

### To discuss
- Dev route: reuse `/playground-sandbox` (least churn) vs rename to `/playground`.
- Delete `GameSandboxDevPage` now, or keep alongside during the iteration?
- Starter game: Pong, or a simpler "tap to move" starter that's easier for kids to read/edit?
- Window defaults: which window opens on first load, and default geometry/tiling.
- AI chat panel: default open or collapsed in the Code Editor window? Should the stub turn make a
  real (deterministic) edit to `game.js`, or only reply with text?
- Real AI is a separate later task: cross-repo platform-backend `game` project kind + Phaser-aware
  agent prompt, plus auth + Stars metering. Confirm it's out of scope for this iteration.
