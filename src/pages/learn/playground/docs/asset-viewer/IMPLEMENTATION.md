# Asset Viewer — implementation plan (commit-by-commit + worktree parallelism)

> Companion to `asset-viewer-design.md`. Each numbered step = **one commit**.
> Conventional-commit messages match the repo (`feat(playground): …`).
> Branch: `feat/playground-asset-viewer` (off `main`).

## Honest parallelism assessment

This feature is **mostly a pipeline with parallel ends**, not an embarrassingly
parallel job. The reason: the new leaf modules are independent (new files, zero
shared edits → safe in parallel worktrees), but they all **funnel into one pane**
(`AssetViewerPane`), and **wiring** touches three shared files
(`playgroundStore.ts`, `windowMeta.tsx`, `Workspace.tsx`) that must be edited
serially or they'd conflict. So:

```
        ┌─ C2 assetMeta ─┐
WAVE 1 ─┼─ C3 assetGen  ─┼─► C5 AssetPreview ─► C6 AssetViewerPane ─► C7 wiring ─┬─► C8 FileTree cleanup ┐
(║ 3)   └─ C4 video mime ┘   (C2)                (C2+C3+C5)            (serial,    │   (║ 2, WAVE 5)        ├─► C10 CLAUDE.md
                                                                       shared)    └─► C9 e2e tests ───────┘
```

- **Wave 1 (parallel worktrees ×3):** C2, C3, C4 — new files + tiny additive
  edits, disjoint → merge clean.
- **Pipeline (serial):** C5 → C6 → C7. C7 is the only multi-shared-file commit.
- **Wave 5 (parallel worktrees ×2):** C8, C9 — disjoint (FileTree vs e2e spec).
- **C10:** doc, last.

Net: ~5 of 10 commits run in 2 parallel waves; the 3 pipeline commits are the
critical path. "As parallel as possible" honestly tops out here without inviting
`Workspace.tsx` merge conflicts.

## Worktree mechanics

Each parallel commit is built by an agent in its **own git worktree** (auto-created,
auto-cleaned). Because wave-1/wave-5 commits touch **disjoint files**, the main
process fast-forward-merges (or cherry-picks) each worktree branch onto the
integration branch with no conflicts. Every step ends green: `npm run typecheck &&
npm run lint` (and `npm test` where a spec exists) before its commit.

---

## Commits

### C1 — `docs(playground): asset viewer design doc + mockups`
The 6 files already authored in `docs/asset-viewer/` (design doc, IMPLEMENTATION,
5 SVG mockups). No code. *(Baseline of the branch.)*

### WAVE 1 — independent leaf modules (parallel worktrees)

#### C2 — `feat(playground): asset metadata helpers` *(worktree A)*
**New:** `panes/assetMeta.ts` + `panes/assetMeta.test.ts`.
- `categoryOf(path)` → first segment under `assets/` (else `"other"`).
- `assetKindOf(path)` → `'image' | 'sprite' | 'audio' | 'video' | 'text' | 'other'`
  (sprite = image **with** a sibling `<path>.anim.json`).
- `decodeImageMeta(dataUrl)` / `decodeAudioMeta(dataUrl)` (offscreen `Image`/`Audio`,
  cached by `path+size`).
- `parseAnimSidecar(file)` → `{ frameWidth, frameHeight, frames, fps }`.
- `codeRefFor(asset, anim?)` → the Phaser loader snippet (image/audio/video/
  spritesheet) + default `key` = slugified filename.
- Reuses `ASSET_MIME` + `VfsFile` from `../code`. **No deps on other new files.**
- *Verify:* vitest unit tests for category/kind/code-ref/sidecar; `typecheck`+`lint`.

#### C3 — `feat(playground): AI asset-generation seam + local stub` *(worktree B)*
**New:** `assetGen.ts` (the `runGen` seam, default = stub) + `assetGenStub.ts`
(deterministic placeholder PNG swatch / short tone from a prompt hash).
**Edit (additive):** `src/lib/api.ts` — add `generateAsset(req): Promise<GenResult>`
posting `POST /llm/generate-asset` (typed; never a direct LLM call).
- Mirrors `useGameAgent`/`gameAgentStub` (`runTurn` seam). Offline by default.
- *Verify:* unit test the stub is deterministic + returns a valid data-URL;
  `typecheck`+`lint`.

#### C4 — `feat(playground): support video assets (mp4/webm)` *(worktree C)*
**Edit (additive):** `code/buildPreview.ts` `ASSET_MIME` (+`mp4`→`video/mp4`,
`webm`→`video/webm`); `panes/FileTree.tsx` `FILE_ICON` (+ `mp4`/`webm` → a
`Film`/`Video` lucide icon).
- Smallest commit; isolated from C2/C3. (FileTree is also touched by C8, but C8 is
  wave 5 — no overlap in time.)
- *Verify:* `typecheck`+`lint`; existing e2e still green.

> **Merge point:** fast-forward C2, C3, C4 onto the integration branch (disjoint).

### PIPELINE — serial (each depends on the prior)

#### C5 — `feat(playground): kind-aware AssetPreview` *(depends on C2, C4)*
**New:** `panes/AssetPreview.tsx`.
- Branch on `assetKindOf`: **image** → multi-background stage (checker/dark/white/
  green) + optional **sprite** animation player (play/pause/step, baseline+origin
  overlay, driven by the sidecar); **audio** → **wavesurfer.js** waveform +
  transport (existing dep — no new package); **video** → inline `<video>` + scrub
  + poster.
- *Verify:* component renders each kind from a fixture VFS; `typecheck`+`lint`.

#### C6 — `feat(playground): AssetViewerPane — grid + detail + import + generate` *(depends on C2,C3,C5)*
**New:** `panes/AssetViewerPane.tsx` (used by both layout modes).
- Left rail (categories from `categoryOf` + counts + search + Import + ✨Generate),
  thumbnail grid, detail drawer hosting `AssetPreview` + metadata + **code-ref**
  (Copy / Insert-into-editor) + AI panel.
- Import = file picker + drag-drop + paste → `File`→base64 data-URL →
  `projectStore.createFile('assets/<cat>/<name>','asset',dataUrl)`.
- Generate/Regenerate → `assetGen.runGen` → `createFile`/replace.
- Manage = rename/move/replace/delete via `projectStore`.
- *Verify:* renders against a seeded multi-asset VFS; `typecheck`+`lint`.

#### C7 — `feat(playground): wire Asset Viewer as 4th window + split tab` *(depends on C6 — SERIAL, shared files)*
**Edit:** `playgroundStore.ts` (`PgWindowId` += `'assets'`; rect in
`defaultWindows()`), `desktop/windowMeta.tsx` (`WINDOW_META`/`WINDOW_ACCENT`
=`brand-bubblegum`/`WINDOW_ORDER`), `Workspace.tsx` (`<DesktopIcon id="assets"/>` +
`<Window id="assets">`; extend `SplitTab`, `SPLIT_TABS`, pane conditional).
- **The only commit editing 3 shared files — kept whole and serial on purpose.**
- *Verify:* `/playground-sandbox` shows the viewer in both modes; `typecheck`+`lint`.

### WAVE 5 — independent tail (parallel worktrees)

#### C8 — `refactor(playground): drop redundant Assets tab from FileTree` *(worktree D)*
**Edit:** `panes/FileTree.tsx` — remove the Files/**Assets** tab split (Files-only);
assets now live in the Asset Viewer. *(Pending your call in design §10 — default:
remove.)*
- *Verify:* existing FileTree e2e adjusted; `typecheck`+`lint`.

#### C9 — `test(playground): e2e for the Asset Viewer` *(worktree E)*
**New/Edit:** `e2e/playground.spec.ts` — open in both modes, import an image (lands
in category w/ dims + code-ref), Insert-into-editor + ▶ Play loads it, Generate
(stub) creates an asset, a sprite + sidecar plays.
- *Verify:* `npm run test:e2e` green.

> **Merge point:** C8, C9 disjoint → fast-forward both.

#### C10 — `docs(playground): update CLAUDE.md for the Asset Viewer`
**Edit:** `playground/CLAUDE.md` (self-update mandate) — new pane(s), new
`PgWindowId`, Assets-tab removal, the `.anim.json`/video conventions. No code.

---

## Final verification (whole feature)
`npm run typecheck && npm run lint && npm run build && npm test && npm run test:e2e`
then manual `/playground-sandbox` smoke per design §9.

## Open points that gate the build (from design §10)
1. **Animation = sidecar** (`.anim.json`) — recommended; assumed in C2/C5.
2. **Remove FileTree Assets tab** (C8) — recommended; flip to "keep both" if you'd
   rather. 
3. **Soft import size cap** — add a warning in C6 import path (esp. video).
