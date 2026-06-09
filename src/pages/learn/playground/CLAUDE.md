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
- **`GeneratingScreen`** — fires the **streaming** first turn (`streamAgentTurn`,
  SSE `POST …/code/turn/stream`); phases **thinking → building → done** reveal real
  files as they stream; a stream failure falls back to `resolveProjectFiles` so the
  kid is never trapped. Build-stage animation in `playground.css` §5.
- **`Workspace`** — two layout modes (`LayoutToggle`, default **Window**): floating
  `react-rnd` windows (`desktop/`) OR a `react-resizable-panels` split. Panes:
  `ChatPane` / `CodeEditorPane` / `GameRunnerPane` / `AssetViewerPane`.

The VFS is owned by `projectStore` (the single funnel for every mutation — edits,
AI turns, file CRUD); edit history in `historyStore`; local cache in IndexedDB
(`projectPersistence`). Theme: `data-theme` on the root flips `pg-*` tokens (light
default); brand tokens stay constant.

## Security model (do NOT weaken)

The kid's / AI's game is **untrusted code** in an **opaque-origin** iframe:
`sandbox="allow-scripts allow-pointer-lock allow-orientation-lock"`. **NO
`allow-same-origin`** (load-bearing — the frame can't read the auth token, cookies, or
`parent.document`; only channel out is `postMessage`). Never add `allow-same-origin` / `allow-forms` / `allow-top-navigation`.

## How Phaser loads (non-obvious)

Phaser **4.1.0**, self-hosted (no CDN), **not bundled / not committed**. The
`vendor-phaser` Vite plugin (`vite.config.ts`, `buildStart`) materializes the engine
`public/vendor/phaser-<v>.min.js` + types `phaser-<v>.d.ts` on every dev/build. Injected
as a classic `<script src="/vendor/…">` → `window.Phaser` global (srcdoc absolute URLs
resolve against the parent origin). Missing file → "Phaser is not defined".
**Upgrade:** `npm i phaser@<new>`, then bump `PHASER_VERSION` (`vite.config.ts`) + the
`/vendor/phaser-<v>…` constants in `buildGamePreview.ts` + `panes/MonacoEditor.tsx`
(the plugin throws on mismatch).

## Control channel (pause / mute / stats) — `postMessage` only

`buildGamePreview.ts` injects a `GAME_CONTROL` shim that **wraps the `Phaser.Game`
constructor** (no `Phaser.GAMES` registry in the vendored build) to grab the instance.
- Parent→frame: `{__airbotixControl, action:'pause'|'resume'|'mute'|'unmute'|'snapshot'}`.
- Frame→parent: `{__airbotixStat, fps, paused}` ~500 ms; `{__airbotixSnapshot, dataUrl}` on request.
- Physics-debug: `window.__airbotixDebug` injected before scripts run (`BuildGameOptions.debug`).
Never reach for `allow-same-origin` to "simplify" this.

## AI turn flow (the kid surface NEVER calls an LLM — platform §5)

All turns run server-side via `../code/codeApi`:
- **Initial build:** `GeneratingScreen` → `streamAgentTurn` (SSE) — the backend builds
  a whole game and auto-applies (even Pro).
- **Chat edits:** `useGameAgent` → classify (`…/turn/classify`, safeguarding) →
  `runTurn` (`…/code/turn`). Lite (8–11) gets the "Do it / Show me first" agency beat;
  Pro (12–17) multi-file edits stage behind a plan→approve gate (`…/turn/:id/approve`).
  Stars metered server-side; undo is local; `client_actions` run via `executeClientActions`.

## Runtime contract (what the agent/kid writes)

`Phaser` global; mount into `id="game"`; global classes, **no import/export**; entry
`main.js` injected LAST. The agent uses the Phaser-3-style API (backward-compatible on
the 4.x engine) and builds visuals from shapes. Each `<script>` carries
`//# sourceURL=<path>` so errors report the kid's real file/line (powers jump-to-error
+ Ask-AI-to-fix). Assets: image/audio/video; a sibling `<path>.anim.json` = sprite strip.

## Editor IntelliSense

`MonacoEditor` lazy-`fetch`es the vendored `phaser-<v>.d.ts` (~7 MB) once, strips the
`/// <reference types="./matter" />` line, `addExtraLib` → hover / go-to-def / autocomplete.
Never bundled; semantic validation stays off (no red squiggles for kids).

## Route & naming

`/learn/playground/:projectId` — the **only** entry (authed kid; `LearnPlaygroundPage`
→ `PlaygroundApp`; keeps the Learn top nav). `/learn/playground/new` = create/landing
(project created on prompt submit). Dev/e2e reach it via a route-mocked harness
(`e2e/helpers.ts`). Naming: the **feature** is `playground`; a single game artifact
keeps `game` (`GameFrame`, `buildGamePreview`, the kid's `game.js`).

## Inherited rules (don't relitigate here)

- All AI traffic → `platform-backend` (Stars metered, audited); no direct LLM calls here.
- Design-system tokens only — `pg-*` for themeable chrome (flip with `data-theme`),
  brand tokens + the game-stage `bg-black` constant; no raw hex.
- Never log PII (kid nickname, prompts, project content).
