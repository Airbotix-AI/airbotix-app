# Game Studio

Kids vibe-code 2D JavaScript games with **Phaser 3** that run **locally in the
browser**, fully sandboxed. Part of the kid Learn surface (`/learn/*`).

This is the game-flavored sibling of the [code studio](../code/). It reuses that
studio's iframe security model and (eventually) its server-side AI coding loop,
but the preview hosts Phaser + a game canvas instead of a generic web page.

> For the architectural deep-dive and the rules AI assistants must follow, see
> [`CLAUDE.md`](./CLAUDE.md) in this folder.

## How it works (1-minute version)

1. A kid's game is just a `game.js` file (a Phaser scene). The studio owns the
   surrounding HTML.
2. `buildGamePreview.ts` assembles a single self-contained HTML document
   (`srcdoc`): a `#game` mount point, the vendored Phaser `<script>`, a console
   shim, then the kid's `game.js`.
3. `GameFrame.tsx` loads that document into a locked-down `<iframe>`
   (`sandbox="allow-scripts"`, **no** `allow-same-origin`). The game can run JS
   and nothing else — it can't reach the app, cookies, or the auth token.
4. `console.log`/errors inside the game are forwarded out via `postMessage` and
   shown in a console panel; an error can be sent back to the AI to fix.

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
├── buildGamePreview.ts   # builds the sandboxed Phaser srcdoc  (keeper)
├── GameFrame.tsx         # renders the sandbox iframe + console (keeper)
└── GameSandboxDevPage.tsx# DEV-ONLY Pong proof harness         (throwaway)
```

Phaser itself is vendored (self-hosted, not a CDN) at
`public/vendor/phaser-3.80.1.min.js`.

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

You'll get a playable Pong (move the green paddle with the **mouse** or **↑/↓**)
running inside the sandbox, plus the live console panel and a "Play again"
button. This exercises the real `buildGamePreview.ts` + `GameFrame.tsx` — only
the Pong scene and the page wrapper are throwaway.

### Why this is safe to ship

The `/playground-sandbox` route is wrapped in `import.meta.env.DEV` in
`src/app/router.tsx`, so it is **compiled out of production builds**. It exists
purely as a local proof harness and will be removed once `PlaygroundStudioPage`
lands.

## Not built yet

- The product pages/routes: `PlaygroundHubPage` (`/learn/create/playground`),
  `PlaygroundStudioPage` (`/learn/playground/:projectId`), `PlaygroundPlayPage`
  (`.../play`).
- `playgroundApi.ts` — the client wrapper over the **server-side** AI coding loop
  (`platform-backend/code-sessions`). The kid surface never calls an LLM
  directly; all AI goes through `platform-backend /llm/*`.
- Backend `game` project kind + Phaser-aware agent prompt.
- `docs/product/prd/learn-game-studio-prd.md`.
