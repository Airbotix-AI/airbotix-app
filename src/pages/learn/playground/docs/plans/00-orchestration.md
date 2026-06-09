# Implementation plan — Playground virtual desktop (orchestration)

> How we build the design in `../virtual-desktop-design.md`. This file is the **how**;
> `01-commits.md` is the **what** (the per-commit cards). Read both before starting.

## Principles

1. **One source file = one commit.** Each commit is small, independently reviewable, and goes
   through the full loop. No commit touches two files (the only exceptions are a file + its
   unavoidable companion, called out explicitly).
2. **Context separation via subagents.** Implementation, verification, and code review each run in
   a **fresh subagent** with only the context they need (the commit card + the relevant design-doc
   section + the file(s) involved) — never the whole conversation. This keeps each agent focused
   and lets them run in parallel.
3. **Parallelism via worktrees + dependency waves.** Commits are grouped into **waves**. Within a
   wave, commits touch disjoint files with no intra-wave dependencies, so they're implemented
   **concurrently**, each subagent in its own **git worktree** (`isolation: "worktree"`). Waves are
   merged in order; the next wave starts against the merged result.

## Branch & worktree model

- **Integration branch**: `feat/playground-desktop`, forked from the current `feat/game-studio`
  (which holds the sandboxed runtime). All waves merge here.
- **Per-commit branch**: each implementer subagent works in a worktree on `pg/<commit-id>`
  (e.g. `pg/c1-3-window-store`), branched from the tip of the integration branch.
- **Why worktrees**: parallel subagents get isolated checkouts → no working-tree collisions. Since
  each commit edits a distinct file, merges back are conflict-free by construction. The only
  shared-file commits (`package.json`, `router.tsx`) are singletons in their wave — never parallel
  with another edit to the same file.
- **Merge**: after a wave's subagents return, the orchestrator (main context) merges each
  `pg/*` branch into `feat/playground-desktop` in card order, then runs the wave gate.

## Subagent roles (separate context each)

| Role | When | Input | Output |
|---|---|---|---|
| **Implementer** | per commit (parallel, worktree) | commit card + design §refs + files it may touch | the file written, `tsc`/`eslint` clean for that file, committed on `pg/<id>` |
| **Reviewer** | per commit (after merge) | the commit diff + card acceptance criteria | findings: correctness, token compliance (no raw hex), reuse, sandbox safety, spec match |
| **Verifier** | per **milestone** (runnable checkpoint) | the integrated app | screenshot-vs-mockup deltas + Playwright e2e pass/fail report |

> Verification is **per-milestone**, not per-commit: a leaf module (e.g. `windowStore.ts`) renders
> nothing on its own. Single-file commits get implement + static-gate + review; the Verifier runs
> when an observable checkpoint is integrated (see Milestones).

## The loops

**Per-commit (every commit):**
```
Implementer(worktree) → tsc+eslint(file) → commit → merge to integration → Reviewer(diff)
                                                                              └─issues→ back to Implementer
```

**Per-milestone (at each runnable checkpoint):**
```
Verifier → npm run typecheck/lint/build → screenshot vs ../virtual-desktop-mockup.png
         → npm run test:e2e → report deltas
   deltas → Implementer fix-commit → re-Verify → show screenshot+e2e to user for sign-off
```

## Dependency waves

Disjoint files within a wave → built in parallel. Arrows = "depends on a prior wave".

```
Wave 0  Setup ........ package.json (deps), playwright.config.ts        [sequential — touches root/lockfile]
Wave 1  Leaves ....... starterGame, screenPresets, windowStore,         [~8 parallel worktrees]
                       buildGamePreview(edit), gameAgentStub,
                       FileTree, ShareWindow, MonacoEditor
Wave 2  Bindings ..... windowConfig, GameFrame(edit), useGameAgent,      [~5 parallel]
                       Window, DesktopIcon
Wave 3  Composites ... Taskbar, GameRunnerWindow, AIChatPanel            [~3 parallel]
Wave 4  Editor ....... CodeEditorWindow                                  [1]
Wave 5  Assembly ..... Desktop → PlaygroundPage → router(edit)+del dev   [sequential chain]
Wave 6  Close ........ e2e spec, CLAUDE.md+README update                 [~2 parallel]
```

Concurrency is capped by the runner (~min(16, cores−2)); a wave with 8 cards simply runs as slots
free up. Max parallelism is in Waves 1–2.

## Milestones (Verifier checkpoints) — map to design §8

- **M1 Shell** — after Wave 5 lands with a placeholder editor (textarea) + GameRunner = bare
  `<GameFrame>`. Verify: windows drag/resize/min/max/focus; Pong runs; taskbar.
- **M2 Control channel** — after Wave 3 `GameRunnerWindow` + Wave 1/2 edits integrate. Verify:
  pause freezes Pong, mute, fps, console toggle+count, presets, restart (Playwright asserts
  `__airbotixStat`).
- **M3 Monaco + chat** — after Wave 4. Verify: Monaco lazy-loads, edit+Play, chat send → reply →
  re-run.
- **M4 Polish** — after Wave 6. Full smoke + e2e + docs.

> Note: M-numbers are *checkpoints*, not strictly wave-ordered — e.g. M1's "placeholder editor"
> means Wave 4's real `CodeEditorWindow` is swapped in for M3. Build the shell with a stub editor
> first so M1 is viewable early, then replace it.

## Conventions (all implementers must follow)

- K-12 design tokens only — no raw hex, no Tailwind defaults (`bg-blue-500`). Reviewer greps for
  violations.
- Reuse existing code: `VfsFile` from `code/codeApi.ts`; console protocol from `code/buildPreview.ts`;
  chat UI patterns from `code/CodeChat.tsx`; `runKey` re-run trick.
- Strict sandbox unchanged — never add `allow-same-origin`. Control channel is `postMessage` only.
- Each file ≤ ~1000 lines (repo rule); TS interfaces for all data; named constants.
- Commit message: `feat(playground): <file> — <one-line>` (or `chore`/`test`/`docs`), ending with
  the Co-Authored-By trailer.

## Definition of done (per commit)
`tsc --noEmit` clean · `eslint --max-warnings 0` clean · token grep empty · Reviewer sign-off ·
(at milestone) screenshot matches mockup + `test:e2e` green.

## Execution note
This plan is designed to be driven by the **Workflow** tool (parallel worktree agents per wave,
with `agentType` for reviewer/verifier roles) once approved — or run wave-by-wave with parallel
`Agent` calls. Either way the orchestrator stays in the loop and shows you each milestone.
