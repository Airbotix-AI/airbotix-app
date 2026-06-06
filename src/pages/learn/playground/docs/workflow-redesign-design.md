# Design — Playground workflow + UX redesign

> Status: **DRAFT for review** (mockups attached). Supersedes the entry-flow/orientation of the
> current split layout; the existing dark theme + sandbox + control channel are kept.

## 1. Why
The Playground currently drops the kid straight into a 3-pane editor. We want a Gemini-AI-Studio-style
flow that leads with **describe-a-game → AI builds it → play & iterate**, and makes the AI assistant
the primary surface, with code editing as an optional power-user view.

## 2. The flow (3 screens)
```
 Landing ──Enter──▶ Generating (blocking, stubbed) ──▶ Workspace
 (glowing prompt     (animation + staged status)        (Chat 2/3 + Runner 1/3;
  + starter chips)                                        Code is an optional tab)
```

## 3. Decisions (locked with user)
| Topic | Decision |
|---|---|
| Generation | **Simulated stub** — timed animation + a canned multi-file scaffold via the existing `runTurn` seam (`gameAgentStub`). No backend; real agent swaps in later. |
| **Layout modes** | **Two selectable layouts, toggled in a top bar; default = Window mode.** **Window mode:** three **draggable, stackable floating windows** — Chat, Code Editor, Game Runner (react-rnd; no taskbar/desktop icons). **Split mode:** the fixed split below (Chat 2/3 + Runner 1/3, Code as a tab). |
| Code view (Split mode) | **Tab-switch the left region** — `💬 Chat` ⇄ `</> Code`; the Game Runner stays on the right. Code hidden by default. (In Window mode, Code is its own window.) |
| Project files | **Real hierarchical project** — scaffold real folders/files (`src/scenes/*.js`, `assets/…`); nested tree + editor tabs + Files/Assets tabs are functional. (`VfsFile` already allows slash paths.) |
| Landing | **Animated glowing brand-gradient border + starter chips.** No big headline / no prominent Build button — submit on Enter + a subtle inline send. |
| Theme | **Dark** throughout (current `bg-ink` + `canvas-pure/<opacity>` palette). |

## 4. Screens

### 4.1 Landing
Dark, centered. A prompt box wrapped in an **animated rotating glow** (coral→sky→mint→bubblegum).
Placeholder "Describe a game and we'll build it…", a subtle inline send (→). Below: **starter chips**
(🏓 Pong, 🟩 Platformer, 🐦 Flappy, 🐍 Snake, 🌀 Maze) that prefill the prompt. Small Airbotix
wordmark. Enter (or →) → Generating.

### 4.2 Generating (blocking)
Echoes the kid's prompt; an **animated gradient orb/ring** + **staged status lines** that tick
(✓ Planning the game · ✓ Creating scenes & files · ⟳ Writing game.js… · Wiring up the stage).
Stubbed: runs a few seconds, non-dismissable, then → Workspace.

### 4.3 Workspace (re-oriented) — two layout modes + a toggle
A small **layout toggle** (top bar) switches between **⊞ Windows** and **◫ Split**. **Default =
Windows.** Both share the same panes (Chat, Code editor, Game Runner) and the same dark theme; only
the arrangement differs.

**Window mode (default).** Three **draggable, stackable floating windows** over the dark surface:
- **💬 Chat** — conversation history + pinned prompt (the primary surface).
- **</> Code Editor** — the rich editor (Files/Assets tabs, nested tree, editor tabs, Monaco, minimap).
- **🎮 Game Runner** — toolbar + scale-to-fit stage (placeholder when not running).
Each window has a titlebar (drag handle, minimize/maximize/close); they overlap/stack and can be
resized. (No taskbar / desktop icons — just the three windows + the toggle.)

**Split mode.** The fixed split:
- **Left 2/3 — AI assistant** with a `💬 Chat` / `</> Code` tab strip. **Chat (default):** history +
  pinned prompt. **Code (optional):** the rich editor swaps in (Files/Assets tabs, nested tree,
  multiple editor tabs with active/dirty/close, Monaco + minimap, status line).
- **Right 1/3 — Game Runner.** Not running → friendly **placeholder** ("Press ▶ to play"); running →
  scale-to-fit stage + toolbar (▶/⏸ 🔊 📱 ↻ ⌨) + status bar.

## 5. Implementation outline (after mockups approved)
- **Phase state machine** (`landing → generating → workspace`) in a `PlaygroundApp`; `/playground-sandbox`
  renders it (still DEV-only, no auth).
- New: `LandingScreen.tsx` (CSS-keyframe glow border + chips), `GeneratingScreen.tsx` (orb + staged
  status), a `LayoutToggle` (Windows ⇄ Split) + `layoutMode` state.
- **Window mode**: re-add `react-rnd` (pin `^2` + the `react-draggable` `4.5.0` override we found) and
  a light `Window` chrome + window store for the 3 windows (no taskbar/desktop icons this time).
- **Split mode**: the Chat/Code tab + `react-resizable-panels` split (already in place).
- **Reuse**: `AIChatPanel` + `useGameAgent` (primary), `GameRunnerPane` (+ not-running placeholder),
  `MonacoEditor`, `buildGamePreview`/`GameFrame`, `ResizeHandle`. Both modes render the same pane
  components — only the container (windows vs panels) differs.
- **Rich VFS**: upgrade `FileTree` → nested folders + Files/Assets tabs; add multi-tab editor state;
  `gameAgentStub` returns a multi-file/folder scaffold.

## 6. Verification
- Now: visual review of the 3 PNG mockups (`mockup-landing`, `mockup-generating`, `mockup-workspace`).
- Later: screenshot-vs-mockup + Playwright e2e (landing→generating→workspace, chat send, Code-tab
  editor, runner placeholder→running).
