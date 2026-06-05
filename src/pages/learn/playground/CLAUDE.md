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

Lives under the kid Learn surface (`/learn/*`, `<ProtectedRoute kind="kid">`).

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

| File | Role | Keeper? |
|---|---|---|
| `buildGamePreview.ts` | Assembles the sandboxed Phaser `srcdoc` from the VFS. The core/novel piece. Reuses `CONSOLE_CAPTURE` + `ASSET_MIME` from `../code/buildPreview.ts` (single source of truth for the console protocol). | ✅ |
| `GameFrame.tsx` | Renders the sandboxed iframe + optional console panel + "Fix this error" hook. Mirror of `../code/PreviewFrame.tsx`. | ✅ |
| `GameSandboxDevPage.tsx` | **DEV-ONLY** proof harness with a hardcoded Pong. Not product, not behind auth. Delete once `PlaygroundStudioPage` lands. | ❌ throwaway |

Reuses the `VfsFile` type from `../code/codeApi.ts` (game projects share the VFS
model with code projects).

## Routes

- `/playground-sandbox` — **DEV-ONLY** (wrapped in `import.meta.env.DEV` in
  `src/app/router.tsx`, stripped from prod). No auth. See README for viewing.
- Planned product routes (not yet built): `/learn/create/playground` (hub),
  `/learn/playground/:projectId` (studio), `/learn/playground/:projectId/play`
  (fullscreen).

Naming convention: the **playground** is the feature (routes/hub/api use
`playground`); a single **game** artifact keeps `game` (`GameFrame`,
`buildGamePreview`, the kid's `game.js`).

## Status & what's next

Built: the sandbox runtime (`buildGamePreview.ts`), the frame (`GameFrame.tsx`),
and a dev proof harness. **Not yet built:**

1. `PlaygroundStudioPage` / `PlaygroundHubPage` / `PlaygroundPlayPage` + product routes.
2. `playgroundApi.ts` wrapping the backend code-session endpoints
   (`POST /projects/:id/code/turn`, etc.) — the **vibe-coding loop runs
   server-side** (decision D-CODE1); the kid surface must NEVER call an LLM
   directly (platform contract §5).
3. **Backend (`platform-backend/code-sessions`)**: a `game` project kind with a
   Phaser starter template + a Phaser-aware agent system prompt.
4. `docs/product/prd/learn-game-studio-prd.md` (mandatory PRD — must exist
   before code drifts from spec).

## Inherited rules (don't relitigate here)

- All AI traffic → `platform-backend /llm/*` (Stars metered, audited). No direct
  LLM calls from this folder.
- Design system tokens only (no raw hex / Tailwind defaults).
- Never log PII (kid nickname, prompts, project content).
