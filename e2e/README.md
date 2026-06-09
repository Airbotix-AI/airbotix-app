# e2e — Playground verification harness

Playwright specs run against the Vite dev server on the authed
`/learn/playground/:projectId` route, via a route-mocked authed harness
(`helpers.ts`) that drives `/learn/playground/new` + `/learn/create/code` — there
is no separate no-auth route (config: `../playwright.config.ts`, port `4321`).

```bash
npm run test:e2e            # run everything headless
npm run verify             # full gate: typecheck → lint → test → build → test:e2e
```

## Specs

| File | What it guards |
|---|---|
| `playground.spec.ts` | Studio behaviour (landing, editor, file tree, runner, assets, history…). |
| `game-smoke.spec.ts` | **M0 game-smoke** — the starter game RUNS: zero console errors + a live canvas (fps > 0). |
| `visual.spec.ts` | **M0 visual-regression** — stable baseline screenshots of the landing screen. |

### How `game-smoke` gets its signal

The sandboxed game iframe posts two message kinds to its parent (the page window),
see `src/pages/learn/playground/buildGamePreview.ts`:

- `{ __airbotixConsole, level, text, loc }` — every console call.
- `{ __airbotixStat, fps, paused }` — every ~500ms while the loop runs.

`game-smoke.spec.ts` installs a page init-script that records every error-level
console message and the max observed `fps`, then polls: **fps > 0** AND
**errors == []**. The runtime's `ready` handshake is posted at `info` level (not
`error`), so it never counts as a failure — a genuine `console.error` from the
game would. Deterministic — it waits on those conditions, never on a fixed sleep.

## Visual-regression baselines

Baseline PNGs live in `e2e/__screenshots__/` (committed). Flake controls:
pinned `1280×800` viewport, `animations: 'disabled'`, forced light theme, a small
`maxDiffPixelRatio` (0.01), and only **stable containers** are captured (never
Monaco, the game iframe, or chat timestamps).

### Updating baselines after an intentional UI change

```bash
npm run test:e2e -- visual.spec.ts --update-snapshots
```

Then review and commit the regenerated PNGs under `e2e/__screenshots__/`. Do not
update baselines to make an unexpected diff pass — investigate the diff first.

> Because `snapshotPathTemplate` drops the OS/arch key, CI must pin the Playwright
> version to match the committed baselines, or the tight `maxDiffPixelRatio: 0.01`
> tolerance will compare against renderers the baselines were never generated on.
