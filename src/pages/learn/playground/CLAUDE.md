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
  `POST …/code/turn/stream`); thinking → building → done reveal files as they stream; a stream
  failure falls back to `resolveProjectFiles` (never trapped). Entering the workspace
  **auto-runs** the game, so the first build plays and gets verified (D-PAP-40).
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

## How the engines load (non-obvious) — Phaser (2D) + three.js (3D)

Two engines, both **self-hosted globals** (no CDN), **not committed**, materialized by the
`vendor-engines` Vite plugin (`vite.config.ts`, `buildStart`) on every dev/build, injected as a
classic `<script src="/vendor/…">`. `BuildGameOptions.engine` (`'phaser'`|`'three'`, default
`phaser`) picks the `EngineProfile` in `buildGamePreview.ts`; everything else in the srcdoc is
engine-agnostic. Filenames are **content-hashed** (`three-<v>-<hash>.global.js`), resolved via
`virtual:engine-vendors` (imported by `buildGamePreview.ts` + `MonacoEditor.tsx`) — hashing is
**load-bearing for cache-busting** (files ship `immutable, max-age=1yr`; a fixed name would serve
a STALE engine after a deploy, e.g. a pre-GLTFLoader `THREE`).
- **Phaser 4.1.0** — UMD copied verbatim → `public/vendor/phaser-<v>-<hash>.min.js` + `.d.ts` →
  `window.Phaser`. Missing → "Phaser is not defined".
- **three.js 0.184.0** — ESM-only since r160, so **esbuild-bundled into a `window.THREE` global
  IIFE** (+ addons `OrbitControls`, `GLTFLoader`) → `public/vendor/three-<v>-<hash>.global.js`.
  Missing → "Could not load the 3D game engine". (D-3D-02; idiomatic ESM deferred, OQ-3D-5.)
- **Upgrade:** `npm i <engine>@<new>` + bump its `*_VERSION` (`vite.config.ts`); no path constants
  to update (the plugin throws on version drift).

## Control channel (pause / mute / stats / run report) — `postMessage` only

`buildGamePreview.ts` injects a per-engine control shim — **same wire protocol for both engines**:
- Parent→frame: `{__airbotixControl, action:'pause'|'resume'|'mute'|'unmute'|'snapshot'|'report'}`.
- Frame→parent: `{__airbotixStat, fps, paused, frames}` ~500 ms (`frames` = the ENGINE's cumulative
  frame counter — never rAF, which ticks while frozen); `{__airbotixSnapshot, dataUrl, composited?}`
  on request — with an overlay the reply is COMPOSITED (canvas + `#overlay` DOM via an in-frame SVG
  foreignObject shim → `composited:true`; ANY failure falls back to the raw canvas, `composited:false`);
  `{__airbotixRunReport, canvas:{present,nonBlank,sampled}}` answering `report` (engine-agnostic
  `RUN_PROBE`, 8×8 canvas sample; probe failure degrades, never breaks the game); **three only**
  `{__airbotixAsset, url, len, ok, error?}` per GLTF/Texture load (`THREE_LOADER_GUARD` — posts +
  `console.error('[airbotix]…')` BEFORE the app's onError can swallow it; the truncated data: url
  maps back to the kid path via `buildGamePreview`'s `assetManifest` prefix+length).
- **Phaser** (`GAME_CONTROL`): **wraps the `Phaser.Game` constructor** (no `Phaser.GAMES` registry
  in the vendored build) to grab the instance; physics-debug via `window.__airbotixDebug`
  (`BuildGameOptions.debug`).
- **three.js** (`THREE_CONTROL`): no `Phaser.Game` to wrap — the game publishes
  `window.__game = { pause(), resume(), renderer, setMuted? }`; snapshot reads the WebGL canvas
  (`preserveDrawingBuffer:true` required) and FPS is derived from `renderer.info.render.frame`
  (a stalled game reads 0 — the game-run oracle's signal). (D-3D-04.)
- **Audio** (`AUDIO_CONTROL`, engine-agnostic, injected BEFORE the engine): the engine shims only
  freeze the game LOOP — Web Audio runs on the AudioContext clock, so pause/mute must silence audio
  separately. This patches `AudioContext` (master gain + tracking) so `pause`→`suspend()`+pause media,
  `mute`→gain 0 + `media.muted`, catching Phaser WebAudio, three.js `AudioListener` & raw audio alike.
  It ALSO patches `HTMLMediaElement.prototype.play` to track every element that plays — including a
  bare `new Audio(src)` BGM never appended to the DOM (invisible to `querySelectorAll`) — and remembers
  the latest mute/pause intent so audio that starts AFTER a toggle is born silenced too.

## AI turn flow (the kid surface NEVER calls an LLM — platform §5)

All turns run server-side via `../code/codeApi`:
- **Initial build:** `GeneratingScreen` → `streamAgentTurn` (SSE); backend builds the
  whole game and auto-applies (even Pro).
- **Chat edits:** `useGameAgent` → classify (`…/turn/classify`, safeguarding, free) →
  pre-turn flush → `runTurn` (`…/code/turn`). The flush sits right before the PAID POST, so
  a stop mid-classify never bumps `vfs_version`. The game agent **always auto-applies** (the
  kid's ask IS the go-ahead) — no agency beat, no plan→approve gate (code-studio only).
- **Turn hygiene (D-HARN-02/03/05; state in `panes/useTurnHygiene.ts`, chips in
  `panes/chatChips.tsx`):** ONE idempotency key per logical turn — each retryable bubble
  carries its own `{prompt, turnKey}` payload and its chip replays THAT turn (server replays,
  never double-charges); a busy `send()` queues exactly ONE next message (`chat-queued-pill` →
  auto-send on settle, never a silent drop); a 180 s silent-turn watchdog cancels every long
  paid await (send / rebuild / approve / warn-ack) cleanly into calm retry copy; a FAILED
  pre-turn flush BLOCKS every FRESH paid turn (plan-approve alone stays best-effort).
- **Question turns + fix evidence (D-HARN-07/11a):** a settled turn with ZERO changes +
  `next_steps` is a QUESTION — its chips are ANSWER options ("Pick one:", sent
  `guided:false`; with-changes chips stay `guided:true`; seed bubbles with `actions` stay
  guided). Ask-AI-fix sends multi-error + newest-stack evidence under the STABLE
  `My game has an error` prefix (backend keys fix context on it; stacks NEVER enter the
  RunReport wire).
- **One turn → one message.** The pending bubble is the **`WorkingCard`** (`WorkingCard.tsx`):
  ONE breathing brand-gradient dot (`pg-breathe-dot`, no spin) + ONE shimmering current-state line
  (`pg-shimmer-text`) — the latest real tool/action delta's label (`turnProgress.ts`, via
  `streamTurn` `onDelta`; generic fillers only before the first delta — never falsely specific
  copy) + a clock. It resolves into exactly ONE settled message.
- **Post-apply verification (D-PAP-40/44):** an applied turn with `verification:'pending'`
  makes the studio run the game instrumented and POST a structured **RunReport**
  (`runReport.ts` collector → `…/turn/:turnId/run-report`); the **server adjudicates**.
  Silent on success AND on auto-fix (a `fixing` verdict applies files quietly, restarts,
  reports `attempt+1`); the **co-debug hand-off is the ONLY visible surface** (one warm
  bubble, server copy). Resume-verify: `GET …/code/verify-state` on workspace mount; loop
  driver `panes/useVerification.ts`. `screenshot_requested` (turn result + verify-state,
  D-HARN-21b) → the report carries a downscaled composited screenshot (`reportScreenshot.ts`,
  ≤480px JPEG); ANY capture failure omits the field — the report still posts. The raw
  `/code/verify-fix` console-error path is RETIRED for games. Stars metered server-side;
  undo is local; `client_actions` run via `executeClientActions`.

## Runtime contract (what the agent/kid writes)

`Phaser` global; mount into `id="game"`; global classes, **no import/export**; entry
`main.js` injected LAST. The agent uses the Phaser-3-style API (backward-compatible on
the 4.x engine) and builds visuals from shapes. Each `<script>` carries
`//# sourceURL=<path>` so errors report the kid's file/line (jump-to-error + Ask-AI-to-fix);
SYNTAX errors never get sourceURL (the script doesn't parse), so `GameFrame` maps their
srcdoc line back to file:line via `buildGamePreview`'s script ranges (`resolveErrorLoc`).
**`overlay.html`** (root, reserved — D-GAME13) = the ONE HTML fragment rendered: DOMParser-sanitized
(scripts stripped, markup repaired) + asset-inlined, injected as `<div id="overlay">` above `#game`
BEFORE kid scripts (getElementById works at script time), with pass-through base CSS
(`pointer-events:none`; buttons/`[data-ui]` opt in, ≥44px) BEFORE kid css so kid css wins. Every
other `.html` file is INERT; no overlay ⇒ **byte-identical srcdoc** (snapshot-pinned).
Assets: image/audio/video + `.glb` 3D models (three engine only — `THREE.GLTFLoader`, D-3D-09);
sibling `<path>.anim.json` = sprite strip. (The Game Guide's
`phaser/runtime-contract` doc mirrors THIS — keep in sync, D‑HELP‑06.)

## Editor IntelliSense

`MonacoEditor` lazy-`fetch`es the vendored `phaser-<v>.d.ts` (~7 MB) once, strips its matter
reference, `addExtraLib` → hover/autocomplete; semantic validation off (no red squiggles for kids).

## Route & naming

`/learn/playground/:projectId` — the **only** entry (authed kid; `LearnPlaygroundPage` →
`PlaygroundApp`); `/learn/playground/new` = create/landing. Dev/e2e reach it via a route-mocked
harness (`e2e/helpers.ts`). Naming: the **feature** is `playground`; a game artifact keeps `game`.

## Inherited rules (don't relitigate here)

- All AI traffic → `platform-backend` (Stars metered, audited); no direct LLM calls here.
- Design-system tokens only — `pg-*` for themeable chrome (flip with `data-theme`),
  brand tokens + the game-stage `bg-black` constant; no raw hex.
- Never log PII (kid nickname, prompts, project content).
