# Implementation plan — commit cards

> One card = one commit = one file (see `00-orchestration.md`). Paths are relative to
> `airbotix-app/`. "spec" points into `../virtual-desktop-design.md`. Each card is the brief handed
> to an Implementer subagent (plus the named files). `wt` = run in a worktree (parallel-safe).

Legend: **type** new|edit|del · **deps** = commit IDs that must be merged first.

---

## Wave 0 — Setup (sequential; no worktree — touches root/lockfile)

### C0.1 · `package.json` · edit
Add deps `react-rnd`, `@monaco-editor/react`, `monaco-editor`; devDep `@playwright/test`; script
`"test:e2e": "playwright test"`. Run `npm install`; commit lockfile too.
**Accept:** `npm install` clean; `npm run typecheck` still green (no usage yet).
**Review:** versions pinned to ranges matching repo style; no stray deps.

### C0.2 · `playwright.config.ts` (+ empty `e2e/`) · new
Root config: `baseURL: 'http://localhost:4321'`, `webServer: { command: 'npm run dev', port: 4321,
reuseExistingServer: true }`, chromium project.
**Accept:** `npx playwright test` runs (0 tests) without config error.
**Review:** webServer reuses dev server; no CI-only assumptions.

---

## Wave 1 — Leaves (parallel · wt) — deps: C0.1

### C1.1 · `src/pages/learn/playground/starterGame.ts` · new
Export `STARTER_GAME: VfsFile[]` — the Pong `game.js` (moved from `GameSandboxDevPage.tsx`), as a
single `{ path:'game.js', content, kind:'text', size }`. spec §2.
**Accept:** typechecks; `STARTER_GAME` importable. **Review:** Pong uses the `#game` mount + `new
Phaser.Game` contract; no asset refs.

### C1.2 · `src/pages/learn/playground/screenPresets.ts` · new
Export `SCREEN_PRESETS: { id; label; w; h }[]` — Original 754×533, iPhone 390×844, iPhone-ls
844×390, iPad 768×1024, iPad-ls 1024×768, 720p 1280×720, 1080p 1920×1080. spec §5.
**Accept:** typechecks. **Review:** ids stable/kebab; matches mockup dropdown.

### C1.3 · `src/pages/learn/playground/desktop/windowStore.ts` · new
Zustand store per spec §4: `WindowId`, `WindowRect`, `WindowState`, actions `openOrFocus, focus,
close, minimize, toggleMaximize, setRect`, `topZ`. Seed geometry comes from windowConfig (C2.1) —
store holds state only.
**Accept:** typechecks; actions pure/predictable. **Review:** focus bumps `topZ`; maximize
preserves restored rect; no React imports.

### C1.4 · `src/pages/learn/playground/buildGamePreview.ts` · edit
Add `GAME_CONTROL` shim (wrap `Phaser.Game` ctor; listen `__airbotixControl` pause/resume/mute/
unmute; emit `__airbotixStat` every 500ms). Inject after Phaser `<script>`+guard, before
`game.js`. Export `StatMessage` + `isStatMessage()`. spec §3.
**Accept:** typechecks; existing console path untouched; `/playground-sandbox` still runs Pong.
**Review:** **`Phaser.GAMES` not used** (absent in build) — ctor-wrap + try/catch; sandbox attrs
unchanged.

### C1.5 · `src/pages/learn/playground/windows/gameAgentStub.ts` · new
Export `TurnResult` type `{ summary; files: VfsFile[]; toolsFired?; changes? }` and a stub
`runTurn(prompt, files): Promise<TurnResult>` — canned placeholder reply + optional one
deterministic `game.js` tweak. spec §7.
**Accept:** typechecks; returns within a tick. **Review:** clearly labelled stub; no network; seam
matches future `runAgentTurn` signature.

### C1.6 · `src/pages/learn/playground/windows/FileTree.tsx` · new
Flat VFS list, emoji-by-extension, active-path highlight (mirror `code/FileTree.tsx`). Props:
`files, activePath, onSelect`. spec §2.
**Accept:** typechecks; renders list from `VfsFile[]`. **Review:** tokens only; mirrors code-studio
look.

### C1.7 · `src/pages/learn/playground/windows/ShareWindow.tsx` · new
Tiny "Share coming soon" card. spec §2.
**Accept:** typechecks; renders. **Review:** tokens; no dead props.

### C1.8 · `src/pages/learn/playground/windows/MonacoEditor.tsx` · new — deps: C0.1
Lazy-loadable Monaco wrapper: `loader.config({ monaco })`, `MonacoEnvironment.getWorker` via
`?worker` imports (editor + ts), JS config (minimap off, JetBrains Mono, lenient diagnostics).
Default export for `React.lazy`. spec §6.
**Accept:** `tsc` clean (worker `?worker` types via vite/client); imports don't break build.
**Review:** self-hosted workers (no CDN); default export; props `{ value, onChange }`.

---

## Wave 2 — Bindings (parallel · wt)

### C2.1 · `src/pages/learn/playground/desktop/windowConfig.ts` · new — deps: C1.3
Registry `WINDOW_CONFIG: Record<WindowId, { title; icon; defaultRect }>` (Code Editor, Game Runner,
Share). spec §4.
**Accept:** typechecks; keys = `WindowId`. **Review:** defaults match mockup placement.

### C2.2 · `src/pages/learn/playground/GameFrame.tsx` · edit — deps: C1.4
Add iframe `ref`; props `paused, muted, onFps, onConsoleCount`; post `__airbotixControl` on
paused/muted change (re-assert on first `__airbotixStat` after a `runKey` bump); read
`__airbotixStat`→`onFps`; emit `onConsoleCount(lines.length)`. Keep console behavior. spec §3.
**Accept:** typechecks; `/playground-sandbox` Pong still runs. **Review:** remount race handled;
`postMessage` targetOrigin `'*'`; no sandbox change.

### C2.3 · `src/pages/learn/playground/windows/useGameAgent.ts` · new — deps: C1.5
Hook per spec §7: `ChatItem[]`, `busy`, `error`, `send(text)`. Uses injected `runTurn` (default =
stub), calls `onApplyFiles(result.files)` + `onRun()`.
**Accept:** typechecks; send appends kid+pending then resolves. **Review:** `runTurn` is the single
swap seam; ChatItem mirrors code studio.

### C2.4 · `src/pages/learn/playground/desktop/Window.tsx` · new — deps: C0.1, C1.3
Reusable chrome on `<Rnd>` per spec §4: titlebar (`pg-titlebar` drag handle) + min/maximize/close,
`onMouseDown→focus`, `onDragStop/onResizeStop→setRect`, `style zIndex`, maximize → full desktop,
**drag overlay** while interacting. Props `{ id, title, icon, children }`.
**Accept:** typechecks. **Review:** overlay covers body during interact (iframe-stall fix); min/max
floors; reads state by id.

### C2.5 · `src/pages/learn/playground/desktop/DesktopIcon.tsx` · new — deps: C1.3
Shortcut (icon+label) → `openOrFocus(id)` on click/dblclick. Props `{ id, label, icon }`.
**Accept:** typechecks. **Review:** tokens; a11y (button, label).

---

## Wave 3 — Composites (parallel · wt)

### C3.1 · `src/pages/learn/playground/desktop/Taskbar.tsx` · new — deps: C1.3, C2.1
Bottom bar: one button per open window (from store+config); click toggles minimize/restore+focus.
spec §4 / mockup #10.
**Accept:** typechecks. **Review:** shows minimized windows; tokens.

### C3.2 · `src/pages/learn/playground/windows/GameRunnerWindow.tsx` · new — deps: C1.2, C2.2
Wraps `GameFrame`. Local state `paused, muted, presetId, showConsole, fps, logCount`. Toolbar
(play/pause, mute, preset `<select>`, restart=runKey bump, console toggle) + status bar
(Running/Paused · fps · logs). Stage container sized to preset (FIT). spec §5 / mockup #7–9.
**Accept:** typechecks; renders runner. **Review:** wires GameFrame control props + callbacks;
large presets scroll; tokens.

### C3.3 · `src/pages/learn/playground/windows/AIChatPanel.tsx` · new — deps: C2.3
Prompt box + chat history (mirror `code/CodeChat.tsx` look/tokens); calls `useGameAgent`. Collapsible.
spec §7 / mockup #6.
**Accept:** typechecks; bubbles render; send wired. **Review:** kid-right/agent-left bubbles; "stub
demo" tag; Enter-to-send.

---

## Wave 4 — Editor

### C4.1 · `src/pages/learn/playground/windows/CodeEditorWindow.tsx` · new — deps: C1.6, C1.8, C2.3, C3.3
Layout: FileTree + tabs + `React.lazy(MonacoEditor)` in `<Suspense>` + ▶ Play (writes VFS, bumps
runKey) + docked `AIChatPanel`. Edits lift to PlaygroundPage VFS. spec §2/§6/§7 / mockup #3–6.
**Accept:** typechecks; Monaco code-splits (separate chunk in build). **Review:** lazy boundary;
Play wiring; chat dock collapsible.

---

## Wave 5 — Assembly (sequential chain)

### C5.1 · `src/pages/learn/playground/desktop/Desktop.tsx` · new — deps: C2.1, C2.4, C2.5, C3.1, C3.2, C4.1, C1.7
Full-screen surface: background, `DesktopIcon`s, maps store→`<Window>` rendering the content
(`CodeEditorWindow`/`GameRunnerWindow`/`ShareWindow`), `<Taskbar>`, **global drag overlay** during
any window interaction. spec §4.
**Accept:** typechecks. **Review:** z-stacking root; overlay at desktop level; tokens.

### C5.2 · `src/pages/learn/playground/PlaygroundPage.tsx` · new — deps: C1.1, C5.1
Owns VFS (`useState` seeded `STARTER_GAME`) + `runKey`; passes VFS + run/apply actions down; mounts
`<Desktop>`. spec §2.
**Accept:** typechecks. **Review:** single source of truth for files+run; no backend calls.

### C5.3 · `src/app/router.tsx` · edit (+ del `GameSandboxDevPage.tsx`) · edit/del — deps: C5.2
Point the DEV-only route (`/playground-sandbox`, outside LearnLayout, `import.meta.env.DEV`) at
`<PlaygroundPage />`; remove the `GameSandboxDevPage` import; delete `GameSandboxDevPage.tsx`
(Pong now in `starterGame.ts`).
**Accept:** typechecks; `/playground-sandbox` renders the desktop. **Review:** dev-gating intact;
no dangling imports.

---

## Wave 6 — Close (parallel · wt)

### C6.1 · `e2e/playground.spec.ts` · new — deps: C5.3
Playwright specs per design §9.3: window drag/z-order/min-max + drag-over-iframe; control channel
(pause→`paused:true`/fps→0, resume, mute, restart, preset resize); AI chat send→reply→re-run.
**Accept:** `npm run test:e2e` green against dev server. **Review:** asserts `__airbotixStat`; no
flaky waits (use web-first assertions).

### C6.2 · `src/pages/learn/playground/{CLAUDE.md,README.md}` · edit (docs) — deps: C5.3
Per the self-update mandate: new file table, control protocol, window architecture, new deps + dev
route + Playwright, `GameSandboxDevPage` removed. (One docs commit.)
**Accept:** docs match shipped code. **Review:** no stale claims; links valid.

---

## Summary

22 commits · 7 waves. Parallel worktree batches: Wave 1 (8), Wave 2 (5), Wave 3 (3), Wave 6 (2).
Sequential: Wave 0 (2), Wave 5 (3), Wave 4 (1). Verifier runs at M1–M4 (see `00-orchestration.md`).
