# AGENTS.md — Try Demo Mode (`src/pages/try/`)

> Scoped rules for the public no-signup demos (`/try/playground`, `/try/blocks`).
> PRD: umbrella `docs/product/prd/try-demo-mode-prd.md`. Read with the repo-root
> `AGENTS.md` (demo-parity mandate) and `CLAUDE.md`.

## What this folder is

The **demo layer only**. The demos render the REAL `PlaygroundApp` and
`BlocksStudioPage` unchanged; this folder adds:

- `demoMode.tsx` — the context the studios read (`useDemoMode()`, null = off),
  incl. the bind seams (`bindLandingSubmit`, `bindChatSend`,
  `bindStudioControls`) through which the studios hand the tour their REAL
  affordances;
- `demoAdapters.ts` — installs/uninstalls the in-memory overrides behind the
  studios' EXISTING boundary seams (`setDemoProjectFiles`,
  `setDemoMemoryPersistence`, `setDemoRunTurn`, `setDemoHelpCorpus`,
  `setDemoBlocksAdapter`);
- `demoStarter.playground.ts` (emoji-art catcher starter — its sprites are real
  VFS assets surfaced in the Asset Viewer) + `demoScript.playground.ts`
  (versioned 6-step script: edit ×2 → explain → wire-remixed-asset →
  deliberate-bug → fix; also carries the locked prompt, the canned first-build
  reply, and the tour's asset/remix prompts + the remix output path) +
  `scriptedAgent.ts` — replayed through the real `RunTurn` seam and store funnel
  (D-DEMO-04). The fix step ALSO fires from the console's real "Ask AI to fix"
  button (`consoleFixTrigger` + `isConsoleFixPrompt`, drift-alarmed against the
  REAL `fixPrompt` in `GameRunnerPane`);
- `demoTour.playground.ts` — the T1 v3 16-card tour DATA (copy + placement +
  spotlight + action per card); `TryPlaygroundPage.tsx` is the engine that fires
  the actions, and `tourSequencing.ts` holds its timing rules (actions defer
  behind a double-rAF so card/spotlight transitions paint first; an after-edit
  restart re-fronts the panel the next card spotlights);
- `demoHelp.playground.ts` — the REAL Game Guide corpus, bundled (a verbatim
  copy of `platform-backend/src/help/help-content.ts`, served via
  `setDemoHelpCorpus` through the pane's real loader; the copy is drift-alarmed
  against the backend source in `demoHelp.playground.test.ts`);
- `demoAssets.playground.ts` — hand-crafted offline asset art (the tour's apple
  sticker + golden remix, and a glossy generic fallback) behind the
  `setDemoAssetGen` seam, so the e2e/dev stub's swatches stay untouched;
- `demoStory.blocks.ts` — the bundled 3-page "Cat's Day Out" `BlocksProject`;
- `DemoTourOverlay.tsx` / `DemoBanner.tsx` / `Try*Page.tsx` — the guided tour
  (D-DEMO-05, step-aware placements) + demo banner + public pages. The overlay's
  spotlight scrim + modal backdrop are THEME-AWARE: each page passes `darkUi`
  from its studio's LIVE theme store (`usePlaygroundStore.theme` /
  `useBlocksTheme`) — ink@50% is imperceptible over a dark UI, so dark gets the
  `shadow-spotlight-scrim-dark` token (black@70%). Never read a media query for
  this; the studio theme is a store toggle.

## T1 v3 tour step map (PRD §3 — keep in sync with `demoTour.playground.ts`)

The landing's own submit button/Enter are INERT in the demo (only card 0's
"Create the game", bound to the same real `submit`, creates the game), and the
generating phase plays the REAL progress UI (the bundled starter's files reveal
one-by-one through GeneratingScreen's real thinking → building → done arc; the
canned `firstTurnReply` seeds the chat like a real first turn).

| Card | PRD step | Action (`Next` at the frontier) | Real affordance driven |
|---|---|---|---|
| 0 | 1 landing start | `landing-create` | REAL landing phase: locked prompt, card `beside-input`, **not skippable**, submit via `bindLandingSubmit` |
| 1 | 2 meet your game | `script` step 0 (faster apples) | workspace entry auto-ran the game (`runGame` = editor ▶ Play path); chat focused before every scripted send |
| 2 | 3 one ask → one change (spotlights CHAT) | `show-diff` step 0 | `openFileAt` — the changed-file-row jump+highlight |
| 3 | 4 see the line | `script` step 1 (score +10) | chat send via `bindChatSend` |
| 4 | 5 keep score (spotlights CHAT) | `explain-select` step 2 | `openFileAt(..., select)` runs the REAL selection pipeline → the live "✨ Explain this" toolbar pops over the snippet (no turn fires) |
| 5 | 6a toolbar card (spotlights the toolbar) | `explain-fire` step 2 | `explainSelection` — the toolbar's own handler (prompt = `buildExplainPrompt`, byte-identical to a real tap) |
| 6 | 6b explain card (spotlights CHAT) | `asset-prompt` | Asset Viewer focused; the tour types the wish into the pane's REAL generate box (`bindAssetPane.setGeneratePrompt`) |
| 7 | 7a prompt-box card (spotlights the box) | `asset-generate` | the pane's REAL ✨ Generate submit (`bindAssetPane.submitGenerate`, crafted offline art) |
| 8 | 7a sticker card | `asset-details` | the pane's REAL open-details path + the remix wish typed into the details' REAL Remix bar (`bindAssetRemix.setPrompt`) |
| 9 | 7b details card (spotlights the remix box) | `asset-remix` | the Remix bar's REAL submit (`bindAssetRemix.submit`); the landed remix's own details open |
| 10 | 7b remix card | `script` step 3 (wire asset) | the remixed sticker becomes the game's apple → auto-restart shows it live |
| 11 | 7c in-game card | `script` step 4 (deliberate bug) | the diff calls an undefined method → REAL console error |
| 12 | 8 error card | `script` step 5 (fix) | scripted fix turn repairs it — ALSO fires from the console's real "Ask AI to fix" button (`consoleFixTrigger`) |
| 13 | 9 fixed card | `open-guide` | `openGuide('engine/scenes-and-the-game-loop')` — the REAL corpus's most diagram-rich page |
| 14 | 10 guide card | `advance` | — |
| 15 | 11 free explore | `finish` | AI gate (D-DEMO-06) takes over |

Every `edit` script step auto-restarts the game (`runGame`) after its diff lands,
then re-fronts the panel the NEXT card spotlights (the restart focuses the Game
Runner — `restartThenRefocus`, two frames apart, never the same frame); every
step focuses the window it acts on first (chat / code / assets / help / game),
deferred behind a double-rAF so the card/spotlight transition paints first.

**The tour is layout-proof — keep it that way.** The Workspace has TWO layouts
(the taskbar's Windows ↔ Split toggle) and the user may flip at ANY step. Panel
spotlights MUST be the `panelSpotlight(id)` pair (`[data-window="…"],
[data-pane="…"]` — the floating window, or the split region marked by the inert
`data-pane` seams in `Workspace.tsx`); `spotlightPanel` parses either form. The
bound `focusPanel` routes per the LIVE layout (split → the real Chat / Code /
Assets / Guide tab; `game` is a no-op there), and a mid-tour flip re-fronts the
visible card's surface (`TryPlaygroundPage`'s layout subscription). Split mode
REMOUNTS panes on tab switches — anything driven through a pane binding after a
chat-focused wait must re-surface the pane first (see `runAssetStep`'s landed
beat). Covered by `tourSpotlights.layout.test.tsx` + the split-layout walk in
`e2e/try-demo-smoke.spec.ts`.

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

## Marketing previews (airbotix.ai/try) — same parity rule

The marketing `/try` page previews these demos with REAL captures
(`airbotix/public/media/try/*.jpg`, played by `TryScenePlayer` with per-scene
zoom origins). They are a derived artifact of this folder + the studios:
**any visible UX change here or in the studios ⇒ recapture in the same task**
via `node scripts/capture-try-scenes.mjs` (see repo-root `AGENTS.md` rule 3).
Adding a demo? Extend the capture script AND the marketing page's scenes.
