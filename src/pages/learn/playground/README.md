# Game Studio

Kids vibe-code 2D JavaScript games with **Phaser 3** that run **locally in the
browser**, fully sandboxed. Part of the kid Learn surface (`/learn/*`).

This is the game-flavored sibling of the [code studio](../code/). It reuses that
studio's iframe security model and (eventually) its server-side AI coding loop,
but the preview hosts Phaser + a game canvas instead of a generic web page.

> For the architectural deep-dive and the rules AI assistants must follow, see
> [`CLAUDE.md`](./CLAUDE.md) in this folder.

## How it works (1-minute version)

The UI is a **virtual desktop**: a backdrop with draggable/resizable floating
windows (Code Editor / Game Runner / Share), three shortcut icons, and a taskbar.

1. A kid's game is just a `game.js` file (a Phaser scene). The studio owns the
   surrounding HTML.
2. The **Code Editor** window has a file tree, a Monaco editor, and a docked AI
   chat panel. Editing + ▶ Play (or an AI turn) update the in-memory project
   files and re-run the game.
3. `buildGamePreview.ts` assembles a single self-contained HTML document
   (`srcdoc`): a `#game` mount point, the vendored Phaser `<script>`, a console
   shim, a control shim, then the kid's `game.js`.
4. The **Game Runner** window renders that document via `GameFrame.tsx` in a
   locked-down `<iframe>` (`sandbox="allow-scripts …"`, **no**
   `allow-same-origin`) — the game runs JS and nothing else, can't reach the app,
   cookies, or the auth token. The runner adds pause/mute, screen-size presets, a
   restart, a console toggle, and a status bar (Running/Paused · fps · logs).
5. `console.log`/errors inside the game are forwarded out via `postMessage` and
   shown in the console panel; an error can be sent back to the AI to fix.

### The runtime contract for `game.js`

- `Phaser` is available as a **global** — don't `import` it.
- Mount your game into the element with `id="game"`.
- To use an image/sound, add it as a project asset and reference it by its path
  string (`this.load.image('hero', 'sprites/hero.png')`); the build inlines it.

## Files

```
playground/
├── CLAUDE.md             # AI-assistant context + self-update mandate
├── README.md             # this file
├── PlaygroundPage.tsx    # top-level page: owns the local VFS + run state
├── buildGamePreview.ts   # builds the sandboxed Phaser srcdoc + control shim
├── GameFrame.tsx         # renders the sandbox iframe + console + control channel
├── starterGame.ts        # the Pong seed game (one game.js)
├── screenPresets.ts      # screen-size presets for the Game Runner
├── desktop/              # the window shell
│   ├── windowStore.ts    #   Zustand store for window state (+ drag overlay flag)
│   ├── windowConfig.ts   #   per-window title/icon/default geometry
│   ├── Window.tsx        #   draggable/resizable window chrome (react-rnd)
│   ├── DesktopIcon.tsx   #   shortcut tile
│   ├── Taskbar.tsx       #   bottom taskbar
│   └── Desktop.tsx       #   composes backdrop + icons + windows + taskbar
└── windows/              # the window bodies
    ├── CodeEditorWindow.tsx  # file tree + Monaco + docked AI chat + ▶ Play
    ├── FileTree.tsx          # file list sidebar
    ├── MonacoEditor.tsx      # lazy, self-hosted Monaco
    ├── AIChatPanel.tsx       # chat UI (presentational)
    ├── useGameAgent.ts       # chat controller (runTurn swap seam)
    ├── gameAgentStub.ts      # the local stub AI turn (no network)
    ├── GameRunnerWindow.tsx  # toolbar + game stage + status bar
    └── ShareWindow.tsx       # placeholder ("coming soon")
```

Phaser itself is vendored (self-hosted, not a CDN) at
`public/vendor/phaser-3.80.1.min.js`. Monaco is an npm dep but lazy-loaded with
self-hosted workers (also no CDN). The dev-only `GameSandboxDevPage.tsx` was
deleted — its Pong now lives in `starterGame.ts`.

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

You'll get the **full virtual desktop**: the Code Editor (Monaco + file tree +
AI chat) and the Game Runner open by default, running a playable Pong (move the
green paddle with the **mouse** or **↑/↓**). Drag/resize/minimize the windows,
edit `game.js` and hit ▶ Play, use pause/mute/screen-size/restart/console in the
runner, and send the AI a prompt (the reply is a clearly-labelled **stub**). The
project files are in-memory only — no save.

### Run the e2e tests

```bash
# from airbotix-app/
npm run test:e2e
```

This runs the Playwright specs in `e2e/playground.spec.ts` (config:
`playwright.config.ts`) against the dev `/playground-sandbox` route — it boots
the dev server itself. Covers the desktop shell, the fps + pause/resume control
channel, screen presets, minimize/restore, and the stub chat turn.

### Why this is safe to ship

The `/playground-sandbox` route is wrapped in `import.meta.env.DEV` in
`src/app/router.tsx`, so it is **compiled out of production builds**. It's the
no-auth way to view the desktop locally until the authed
`/learn/playground/:projectId` route (backend + kid auth) lands.

## Not built yet

- **Real backend AI** — the chat turn is a local stub today. The real loop runs
  **server-side** (`platform-backend/code-sessions`) via a future
  `playgroundApi.ts` over the `runTurn` seam; the kid surface never calls an LLM
  directly (all AI goes through `platform-backend /llm/*`).
- **Project save/load** — the VFS is in-memory only.
- The product pages/routes: `PlaygroundHubPage` (`/learn/create/playground`),
  the authed studio (`/learn/playground/:projectId`), and the fullscreen
  `.../play` route.
- Backend `game` project kind + Phaser-aware agent prompt.
- The **Share** window (placeholder today).
- `docs/product/prd/learn-game-studio-prd.md`.
