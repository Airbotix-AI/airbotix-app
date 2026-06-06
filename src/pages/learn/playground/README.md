# Game Studio

Kids vibe-code 2D JavaScript games with **Phaser 3** that run **locally in the
browser**, fully sandboxed. Part of the kid Learn surface (`/learn/*`).

This is the game-flavored sibling of the [code studio](../code/). It reuses that
studio's iframe security model and (eventually) its server-side AI coding loop,
but the preview hosts Phaser + a game canvas instead of a generic web page.

> For the architectural deep-dive and the rules AI assistants must follow, see
> [`CLAUDE.md`](./CLAUDE.md) in this folder.

## How it works (1-minute version)

The Playground is a **3-phase flow** (`PlaygroundApp.tsx`):

1. **Landing** — a Gemini-style prompt box (with an animated rotating
   brand-gradient glow border) and a row of starter game chips. Describe a game
   and hit Enter / the send button.
2. **Generating** — a blocking "building your game" animation (a spinning
   gradient orb + a staged status list + progress bar) while the (stubbed)
   scaffold generator runs, then it advances to the workspace.
3. **Workspace** — the studio, in one of **two layout modes** picked by the
   top-right toggle (**default: Windows**):
   - **Windows** — three draggable, stackable floating windows: **💬 Chat**,
     **</> Code Editor**, **🎮 Game Runner** (no taskbar / desktop icons).
   - **Split** — a resizable split: a left region with a **💬 Chat / </> Code**
     tab strip and the **Game Runner** on the right.

Inside the workspace:

1. The generated game is a small **multi-file** Phaser project (`main.js` +
   `src/scenes/*.js` + a stylesheet); the studio owns the surrounding HTML.
2. **Chat** is its own pane now (a window, or the Chat tab). The **Code Editor**
   has a nested file tree (Files / Assets tabs) and a multi-tab Monaco editor.
   Editing + ▶ Play (or an AI turn) update the in-memory files and re-run.
3. `buildGamePreview.ts` assembles a single self-contained HTML document
   (`srcdoc`): a `#game` mount point, the vendored Phaser `<script>`, a console
   shim, a control shim, then **every `.js` file** (entry `main.js` last).
4. The **Game Runner** renders that document via `GameFrame.tsx` in a
   locked-down `<iframe>` (`sandbox="allow-scripts …"`, **no**
   `allow-same-origin`) — the game runs JS and nothing else, can't reach the app,
   cookies, or the auth token. It shows a "Press ▶ to play" placeholder until you
   start it, then adds pause/mute, screen-size presets, a restart, a
   physics-debug toggle (draw hitboxes), a console toggle, and a status bar
   (Running/Paused · fps · logs).
5. `console.log`/errors inside the game are forwarded out via `postMessage` and
   shown in the console panel. Each error knows its **file and line** (every
   script carries a `//# sourceURL`), so the console offers a `file:line` button
   that **jumps to it in the editor**, plus an **Ask AI to fix** button that
   sends the error to the chat. The editor also has Phaser **autocomplete /
   hover docs / go-to-definition** (the vendored `phaser.d.ts` loaded into
   Monaco).

### The runtime contract for game code

- `Phaser` is available as a **global** — don't `import`/`export` (no module
  system in the sandbox; scenes are global classes, the entry `main.js` runs
  last and builds `new Phaser.Game(...)`).
- Mount your game into the element with `id="game"`.
- To use an image/sound, add it as a project asset and reference it by its path
  string (`this.load.image('hero', 'assets/hero.png')`); the build inlines it.

## Files

```
playground/
├── CLAUDE.md             # AI-assistant context + self-update mandate
├── README.md             # this file
├── PlaygroundApp.tsx     # top-level state machine: landing → generating → workspace + owns the VFS + run state
├── LandingScreen.tsx     # phase 1: glow prompt box + starter chips
├── GeneratingScreen.tsx  # phase 2: building animation; runs the stub scaffold
├── Workspace.tsx         # phase 3: the studio shell (Windows / Split layout)
├── LayoutToggle.tsx      # ⊞ Windows / ◫ Split segmented toggle
├── playgroundStore.ts    # Zustand: layout mode (default window) + window geometry
├── playground.css        # pg-* animations (glow halo, orb spin, shimmer)
├── buildGamePreview.ts   # builds the sandboxed Phaser srcdoc + control shim (multi-file)
├── GameFrame.tsx         # renders the sandbox iframe + console + control channel
├── screenPresets.ts      # screen-size presets for the Game Runner
├── starterGame.ts        # legacy single-game.js Pong (superseded by panes/starterProject.ts)
├── desktop/
│   └── Window.tsx            # a floating draggable window (react-rnd) for Windows mode
└── panes/                # the panes + their parts
    ├── ChatPane.tsx          # standalone AI chat (useGameAgent + AIChatPanel)
    ├── CodeEditorPane.tsx    # file tree + multi-tab Monaco editor + ▶ Play (no docked chat)
    ├── GameRunnerPane.tsx    # toolbar + scale-to-fit game stage + status bar (placeholder until ▶)
    ├── starterProject.ts     # rich multi-file seed project + the stub generateScaffold()
    ├── ResizeHandle.tsx      # draggable divider between resizable panes
    ├── FileTree.tsx          # nested folder tree + Files/Assets tabs
    ├── MonacoEditor.tsx      # lazy, self-hosted Monaco
    ├── AIChatPanel.tsx       # chat UI (presentational)
    ├── useGameAgent.ts       # chat controller (runTurn swap seam)
    └── gameAgentStub.ts      # the local stub AI turn (no network)
```

Phaser itself is vendored (self-hosted, not a CDN) at
`public/vendor/phaser-3.80.1.min.js`. Monaco is an npm dep but lazy-loaded with
self-hosted workers (also no CDN). Windows mode uses `react-rnd@^10`; Split mode
+ the editor split use `react-resizable-panels@^2`.

## Run it in dev (no auth, no backend)

The real studio will sit behind kid auth (`<ProtectedRoute kind="kid">`), which
needs the backend running and a logged-in kid. To let you **see the sandboxed
runtime without any of that**, there's a dev-only route that bypasses auth.

```bash
# from airbotix-app/
npm run dev
```

Then open:

```
http://localhost:4321/playground-sandbox
```

> Port is **4321** (set in `vite.config.ts`), not Vite's default 5173.

You'll land on the **Landing** screen: type a prompt (or tap a starter chip) and
hit Enter → the **Generating** animation runs → the **Workspace** opens. It opens
in **Windows** mode (three floating windows — Chat, Code Editor, Game Runner);
use the top-right toggle to switch to **Split**. The generated project is a
multi-file Pong scaffold (move the green paddle with the **mouse** or **↑/↓**).
Edit a file and hit ▶ Play, press ▶ in the runner to start it, use
pause/mute/screen-size/restart/console, and send the AI a prompt (both the reply
and the scaffold are clearly-labelled **stubs**). The project files are in-memory
only — no save.

### Run the e2e tests

```bash
# from airbotix-app/
npm run test:e2e
```

This runs the Playwright specs in `e2e/playground.spec.ts` (config:
`playwright.config.ts`) against the dev `/playground-sandbox` route — it boots
the dev server itself. Sixteen specs: landing → generating → workspace, the
multi-file scaffold, the Code Editor launch width (editor area doubled, file
column fixed), the layout toggle (Windows ⇄ Split), the stub AI chat turn,
the runner placeholder → Play, screen-size presets reshape the stage, a problem
(error or warning) auto-opens the console, jump-to-error (a located error opens
that file at that line), Ask AI to fix (error → chat agent), the editor
lazy-loading the Phaser `.d.ts`, chat-history persistence across the layout
toggle, the theme toggle (default light, carries into the workspace), the code
editor (status bar + Files/Assets split + file-column toggle), window dbl-click
maximize + restore-to-prior-position, and closed-window reopen.

### Why this is safe to ship

The `/playground-sandbox` route is wrapped in `import.meta.env.DEV` in
`src/app/router.tsx`, so it is **compiled out of production builds**. It's the
no-auth way to view the playground locally until the authed
`/learn/playground/:projectId` route (backend + kid auth) lands.

## Not built yet

- **Real backend AI** — both the chat turn and the scaffold generation
  (`generateScaffold`) are local stubs today. The real loop runs **server-side**
  (`platform-backend/code-sessions`) via a future `playgroundApi.ts` over the
  `runTurn` seam; the kid surface never calls an LLM directly (all AI goes
  through `platform-backend /llm/*`).
- **Project save/load** — the VFS is in-memory only.
- The **authed product route** — `/learn/playground/:projectId` behind
  `<ProtectedRoute kind="kid">` + backend (plus a hub and a fullscreen
  `.../play` route). `PlaygroundApp` is dev-only for now.
- Backend `game` project kind + Phaser-aware agent prompt.
- `docs/product/prd/learn-game-studio-prd.md`.
