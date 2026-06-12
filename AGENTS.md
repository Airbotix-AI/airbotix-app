# AGENTS.md — Airbotix-AI/airbotix-app

> Rules for ALL AI coding agents working in this repo (Claude Code, Cursor,
> Codex, Gemini…). Read together with `CLAUDE.md` (repo context) and the
> umbrella `airbotix-ai/CLAUDE.md` + `rules/` (platform-wide mandates: tests on
> every behavioural change, `CHANGELOG.md` in the same commit, K-12 design
> tokens only, no direct LLM calls from the kid surface, never log PII).

## Demo parity (MANDATORY — try-demo-mode-prd.md §2 D-DEMO-07)

The public `/try/playground` and `/try/blocks` demos (`src/pages/try/`) render
the **real, unmodified** Game Playground and Blocks Studio. The demo layer is
only: API-adapter seams at the existing boundary files (`panes/playgroundApi.ts`,
`projectPersistence.ts`, `panes/gameAgentStub.ts`, `blocksApi.ts`), the scripted
agent + bundled story data, and the tour overlay. **The demo is the product** —
hand-built lookalike UIs are forbidden.

Because the demos ride the real studio code, **any change to Game Studio or
Blocks Studio behaviour, routes, selectors, or contracts MUST, in the same
task**:

1. update the demo script / bundled story / overlay copy in `src/pages/try/`
   (`demoScript.playground.ts`, `demoStarter.playground.ts`,
   `demoStory.blocks.ts`, tour copy in `Try*Page.tsx`) if the change touches
   anything they replay or describe;
2. run the demo unit tests (`npx vitest run src/pages/try`) and the demo
   harness journeys (`try-demo-playground` / `try-demo-blocks` in the umbrella
   `harness/`, once landed) and keep them green;
3. **recapture the marketing previews.** The airbotix.ai `/try` page plays
   REAL screenshots of these demos as animated scenes
   (`airbotix/src/components/TryScenePlayer.tsx` → `airbotix/public/media/try/`).
   Any visible workspace-UX change — Game Playground, Blocks Studio, or a
   future demo — makes those captures stale. Run
   `node scripts/capture-try-scenes.mjs` (app dev server running), review the
   image diff, check the zoom origins/captions in the marketing `Try.tsx`
   still point at the right UI, and commit the refreshed images in the
   `airbotix` repo as part of the same task. New demos must be added to the
   capture script and given scenes on the marketing page.

Hard demo invariants (never weaken): demo routes are public (no auth), make
**zero** `/projects*` / `/llm/*` network calls, persist **nothing** (in-memory
only, pristine on reload), and never expose a capability the real product
doesn't have. See `src/pages/try/AGENTS.md` for the scoped rules.
