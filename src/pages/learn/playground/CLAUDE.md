# CLAUDE.md — Game Studio (`src/pages/learn/playground/`)

> Scoped map for AI tools in this folder. Read with the repo-root
> `airbotix-app/CLAUDE.md` and the umbrella `airbotix-ai/CLAUDE.md`.
>
> ⚠️ **RULES FOR THIS DOC.** (1) **Keep it under 100 lines** — high-level +
> load-bearing facts ONLY; no per-file tables, no changelog, no "what's next"
> (history lives in git + `CHANGELOG.md`); when you add, cut something else.
> (2) **Self-update** — any change that makes a statement here false (a route,
> sandbox attribute, the Phaser version, a load-bearing contract) MUST update this
> file in the same change.

## What this is

Kids vibe-code 2D **Phaser** games that run **locally, sandboxed**. A specialization
of the code studio (`../code/`) — same AI loop + iframe model, runtime hosts Phaser +
a game canvas. Under the kid Learn surface (`/learn/*`, `<ProtectedRoute kind="kid">`).

## 3-phase flow (`PlaygroundApp.tsx`: `landing → generating → workspace`)

- **`LandingScreen`** — prompt box (`.pg-glow` halo) + starter chips → submit.
- **`GeneratingScreen`** — fires the **streaming** first turn (`streamAgentTurn`, SSE
  `POST …/code/turn/stream`); phases **thinking → building → done** reveal files as they
  stream; a stream failure falls back to `resolveProjectFiles` so the kid is never trapped.
- **`Workspace`** — two layout modes (`LayoutToggle`, default **Window**): floating
  `react-rnd` windows (`desktop/`) OR a `react-resizable-panels` split. Panes:
  `ChatPane` / `CodeEditorPane` / `GameRunnerPane` / `AssetViewerPane` / `HelpPane`.
  Windows = `PgWindowId`+`WINDOW_ORDER`/`WINDOW_META`/`WINDOW_ACCENT` (add an id + pane →
  flows through desktop/taskbar/split). `HelpPane` = the **Game Guide** (`panes/help/`:
  curated kid-tiered Phaser/game-basics corpus + `helpApi` search seam; help=sunshine,
  solid-chip glyph; fetches the backend corpus via `GET /help/docs` (single source); PRD `learn-game-studio-help-prd.md`).

The VFS is owned by `projectStore` (the single funnel for every mutation — edits,
AI turns, file CRUD); edit history in `historyStore`; local cache in IndexedDB
(`projectPersistence`). Theme: `data-theme` on the root flips `pg-*` tokens (light
default); brand tokens stay constant.

## Security model (do NOT weaken)

The kid's / AI's game is **untrusted code** in an **opaque-origin** iframe:
`sandbox="allow-scripts allow-pointer-lock allow-orientation-lock"`. **NO
`allow-same-origin`** (load-bearing — the frame can't read the auth token, cookies, or
`parent.document`; only channel out is `postMessage`). Never add it / `allow-forms` / `allow-top-navigation`.

## How Phaser loads (non-obvious)

Phaser **4.1.0**, self-hosted (no CDN), **not bundled / not committed**. The
`vendor-phaser` Vite plugin (`vite.config.ts`, `buildStart`) materializes the engine
`public/vendor/phaser-<v>.min.js` + `phaser-<v>.d.ts` on every dev/build, injected as a
classic `<script src="/vendor/…">` → `window.Phaser` global. Missing file → "Phaser is
not defined". **Upgrade:** `npm i phaser@<new>`, then bump `PHASER_VERSION`
(`vite.config.ts`) + the `/vendor/phaser-<v>…` constants in `buildGamePreview.ts` +
`panes/MonacoEditor.tsx` (the plugin throws on mismatch).

## Control channel (pause / mute / stats) — `postMessage` only

`buildGamePreview.ts` injects a `GAME_CONTROL` shim that **wraps the `Phaser.Game`
constructor** (no `Phaser.GAMES` registry in the vendored build) to grab the instance.
- Parent→frame: `{__airbotixControl, action:'pause'|'resume'|'mute'|'unmute'|'snapshot'}`.
- Frame→parent: `{__airbotixStat, fps, paused}` ~500 ms; `{__airbotixSnapshot, dataUrl}` on request.
- Physics-debug: `window.__airbotixDebug` injected before scripts run (`BuildGameOptions.debug`).

## AI turn flow (the kid surface NEVER calls an LLM — platform §5)

All turns run server-side via `../code/codeApi`:
- **Initial build:** `GeneratingScreen` → `streamAgentTurn` (SSE); backend builds the
  whole game and auto-applies (even Pro).
- **Chat edits:** `useGameAgent` → classify (`…/turn/classify`, safeguarding) →
  `runTurn` (`…/code/turn`). The game agent **always auto-applies** (the kid's ask IS
  the go-ahead) — no agency beat, no plan→approve gate (those belong to the code studio).
- **One turn → one message.** While a turn runs, the pending bubble is the **`WorkingCard`**
  (`WorkingCard.tsx`): ONE spinning arc-breathing ring (SVG, `pg-ring-arc`) + ONE
  current-state line — the latest real tool/action delta's label (`turnProgress.ts`, fed via
  `streamTurn`'s `onDelta`); generic rotating fillers only before the first delta lands
  (never falsely specific copy) — plus a clock. It resolves into exactly ONE settled message. A self-verify auto-fix
  (`/code/verify-fix`) runs as a **silent "fixing 🔧" beat** in the same card (apply silently
  on success; a single warm co-debug message only when it can't fix). Stars metered
  server-side; undo is local; `client_actions` run via `executeClientActions`.

## Runtime contract (what the agent/kid writes)

`Phaser` global; mount into `id="game"`; global classes, **no import/export**; entry
`main.js` injected LAST. The agent uses the Phaser-3-style API (backward-compatible on
the 4.x engine) and builds visuals from shapes. Each `<script>` carries
`//# sourceURL=<path>` so errors report the kid's file/line (jump-to-error + Ask-AI-to-fix);
SYNTAX errors never get sourceURL (the script doesn't parse), so `GameFrame` maps their
srcdoc line back to file:line via `buildGamePreview`'s script ranges (`resolveErrorLoc`).
Assets: image/audio/video; sibling `<path>.anim.json` = sprite strip. (The Game Guide's
`phaser/runtime-contract` doc mirrors THIS — keep in sync, D‑HELP‑06.)

## Editor IntelliSense

`MonacoEditor` lazy-`fetch`es the vendored `phaser-<v>.d.ts` (~7 MB) once, strips the
`/// <reference types="./matter" />`, `addExtraLib` → hover/go-to-def/autocomplete; never
bundled; semantic validation off (no red squiggles for kids).

## Route & naming

`/learn/playground/:projectId` — the **only** entry (authed kid; `LearnPlaygroundPage`
→ `PlaygroundApp`); `/learn/playground/new` = create/landing (project created on prompt
submit). Dev/e2e reach it via a route-mocked harness (`e2e/helpers.ts`). Naming: the
**feature** is `playground`; a single game artifact keeps `game`.

## Inherited rules (don't relitigate here)

- All AI traffic → `platform-backend` (Stars metered, audited); no direct LLM calls here.
- Design-system tokens only — `pg-*` for themeable chrome (flip with `data-theme`),
  brand tokens + the game-stage `bg-black` constant; no raw hex.
- Never log PII (kid nickname, prompts, project content).
