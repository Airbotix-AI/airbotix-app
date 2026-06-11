# AGENTS.md — Try Demo Mode (`src/pages/try/`)

> Scoped rules for the public no-signup demos (`/try/playground`, `/try/blocks`).
> PRD: umbrella `docs/product/prd/try-demo-mode-prd.md`. Read with the repo-root
> `AGENTS.md` (demo-parity mandate) and `CLAUDE.md`.

## What this folder is

The **demo layer only**. The demos render the REAL `PlaygroundApp` and
`BlocksStudioPage` unchanged; this folder adds:

- `demoMode.tsx` — the context the studios read (`useDemoMode()`, null = off);
- `demoAdapters.ts` — installs/uninstalls the in-memory overrides behind the
  studios' EXISTING boundary seams (`setDemoProjectFiles`,
  `setDemoMemoryPersistence`, `setDemoRunTurn`, `setDemoBlocksAdapter`);
- `demoStarter.playground.ts` + `demoScript.playground.ts` + `scriptedAgent.ts`
  — the bundled catcher starter and the versioned 3-step scripted AI
  (D-DEMO-04), replayed through the real `RunTurn` seam and store funnel;
- `demoStory.blocks.ts` — the bundled 3-page "Cat's Day Out" `BlocksProject`;
- `DemoTourOverlay.tsx` / `DemoBanner.tsx` / `Try*Page.tsx` — the guided tour
  (D-DEMO-05) + demo banner + public pages.

## Non-negotiable rules (D-DEMO-01…08)

1. **Never rebuild, fork, or restyle studio UI here.** If the demo needs the
   studio to behave differently, the only permitted change is a tiny,
   behaviour-neutral injection point in the studio (optional context read /
   optional prop that defaults to today's behaviour) — everything else belongs
   in this folder.
2. **Zero network to `/projects*`, `/llm/*`, `/auth*`** from demo flows, and
   **zero IndexedDB/localStorage** persistence of demo project state. In-memory
   only; reload = pristine.
3. **Nothing invented.** The scripted agent replays real turn-shaped diffs only;
   it must never fake an ability the product lacks. Blocks has no AI — do not
   add one here.
4. **Parity upkeep (D-DEMO-07).** If the studios change (behaviour, routes,
   selectors, starter/runtime contract, block catalogue/model), update the demo
   script / story / overlay copy AND run the demo tests in the same task:
   `npx vitest run src/pages/try`. The script/story tests are the drift alarm —
   never delete or weaken them to make a studio change pass.
5. AI gate (D-DEMO-06): after the script, every chat send gets the contact-us
   reply (`CONTACT_GATE_MESSAGE`) pointing to airbotix.ai/book + /contact.
   Keep those destinations in sync with marketing.
