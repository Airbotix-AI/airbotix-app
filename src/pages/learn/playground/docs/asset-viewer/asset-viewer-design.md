# Asset Viewer — design doc

> **Status:** DRAFT · 2026-06-06 · for discussion/review (no code yet)
> **Scope:** A powerful **Asset Viewer** for the Game Studio playground
> (`src/pages/learn/playground/`) — a 4th floating **window** in Window mode and a
> 4th **tab** in Split mode — that lets kids **browse/preview**, **edit/manage**,
> and **AI-generate** game assets in an organised way, and shows **how to use each
> asset in code**.
> **Owner:** Airbotix engineering
> **Mockups (this folder):** `mockup-asset-viewer-window.svg` ·
> `mockup-asset-viewer-split.svg` · `mockup-asset-detail.svg` (image/sprite) ·
> `mockup-asset-detail-audio.svg` · `mockup-asset-detail-video.svg`

---

## 1. Context & goal

Today the playground's "Assets" surface is the **Assets tab inside the Code
Editor's file tree** (`panes/FileTree.tsx`). It is **tree-only**: an asset is a row
with a small icon, and **clicking a binary asset opens its base64 data-URL in
Monaco** — useless for an image or a sound. There is no thumbnail grid, no preview,
no upload/import, no metadata (dimensions, duration), no AI generation, and no
hint about how to reference an asset from `game.js`.

That is fine for the Pong-sized starter. It falls apart for a real game. The newly
added **`docs/food-tycoon/`** package is the concrete stress test: a single game
needs dozens of assets across **characters, stations, ui, vfx, backgrounds, icons,
audio**, including **frame-based sprite strips** (4-frame worker walk cycles at
`96×128`/frame), and they have to be checked in isolation (transparent alpha, no
baked background, no neighbour bleed). A flat tree of base64 rows cannot support
that.

**Goal:** give the playground a first-class Asset Viewer that scales to a
food-tycoon-sized project — organised browsing with real previews, lightweight
editing/management, AI generation, optional frame-based animation preview, and a
copy-able "use this in code" snippet per asset — available identically in both
layout modes.

This is the **game-flavoured sibling** of the existing studio panes; it reuses the
same VFS model, the same `projectStore` mutation funnel, the same `pg-*`/brand
design tokens, and the same window/tab registry. **It does not change the VFS data
model.**

## 2. Scope

**In**

- **Browse + preview** — category grid of thumbnails; a **kind-aware detail view**
  for images/sprites, **audio** (waveform + transport), and **video** (player +
  scrub); **multi-background preview** (checkerboard / dark / white / green) for
  images, to expose matte edges and baked-in fills; metadata (dimensions, duration,
  size, type).
- **Edit / manage** — import (file picker + drag-drop + paste), rename, move
  between categories, delete, **replace-in-place**.
- **AI generation** — generate a new image/sound from a text prompt, and
  **regenerate a variation** of an existing asset — routed through
  `platform-backend /llm/*` (never a direct LLM call). Backend endpoint does not
  exist yet → ship a **local stub** behind a seam (§7).
- **Frame-based animation preview** — if an asset has a sidecar describing its
  frame grid, show an animation player (play/pause/step, baseline + origin overlay).
- **Code-reference helper** — per asset, a copy-able Phaser loader snippet and an
  "insert into editor" action (§6).

**Out** (stays in the standalone `docs/food-tycoon/` review app — do **not** port)

- Approval / QA **status** workflow (`approved`/`needs-fix`/`rejected`), review
  notes, compare-vs-reference / version history. The viewer is **generic** (any
  kid's project); food-tycoon is only the bar it must clear, not a feature spec.

## 3. Decisions

| # | Decision | Why |
|---|---|---|
| D1 | Add a 4th **window** (`assets`) + 4th **split tab** (`assets`) via the existing registry — not a sub-panel of the Code Editor. | Matches the user's ask ("separate window / its own tab"); the registry already supports it cleanly (§8). The Code Editor's Assets tab becomes redundant and can be removed in a follow-up. |
| D2 | **Reuse `VfsFile` unchanged** (`code/codeApi.ts`: `path`/`content`/`kind`/`size`). All metadata is **derived at view time**, not stored. | No schema change, no migration, no persistence churn. Keeps `projectStore`/IndexedDB/`buildGamePreview` untouched. |
| D3 | **Category = first path segment under `assets/`** (`assets/<category>/…`). Uncategorised assets → "Other". | Zero new data; mirrors food-tycoon's folder layout and Phaser's own asset-folder habit. The convention is the API. |
| D4 | **Frame-based animation = optional sidecar** `assets/<path>.anim.json` `{ frameWidth, frameHeight, frames, fps }`. | Explicit, maps 1:1 to `this.load.spritesheet(key, path, { frameWidth, frameHeight })`. Chosen over filename-encoding (e.g. `walk__4__96x128.png`) — a sidecar is readable, editable, and round-trips into the loader snippet. |
| D5 | **Code reference = the project-relative VFS path string.** | `buildGamePreview.ts` `inlineAssetRefs()` already rewrites any quoted VFS path → inlined `data:` URL at build time, so the path *is* the contract the kid types. We just show the right loader call around it. |
| D6 | **AI generation = backend contract + local deterministic stub** behind a `runGen` seam. | Honours platform §5 (kid surface never calls an LLM directly) and the no-direct-LLM rule in this folder's CLAUDE.md. Mirrors the existing chat stub (`gameAgentStub.ts` via the `runTurn` seam) so the UX path is real before the backend lands. |
| D7 | Use `pg-*` themeable tokens for chrome, an unused **brand accent** (`brand-bubblegum`) for the Asset Viewer's window/tile identity, and a fixed `bg-black`/checkerboard for the preview stage. | Consistent with `WINDOW_ACCENT` (chat=sky, code=mint, game=coral) and the design-system rule (no raw hex). |

## 4. Asset model & conventions (no schema change)

An **asset** is exactly what the file tree already considers one:
`file.kind === 'asset'` **or** `file.path` under `assets/` (see `FileTree.tsx`
`isAssetFile`). Binaries live as base64 `data:` URLs in `VfsFile.content`; text
assets (`.css`, `.txt`) stay plain text. The viewer reuses `ASSET_MIME`
(`code/buildPreview.ts`) and the extension→icon map (`FileTree.tsx FILE_ICON`).

**Supported kinds** (drive the detail view + code-ref):
- **image** — `png`/`jpg`/`jpeg`/`gif`/`svg`/`webp` (already in `ASSET_MIME`);
  a `.anim.json` sidecar promotes one to a **sprite strip**.
- **audio** — `mp3`/`wav`/`ogg`/`m4a` (already iconed in `FileTree`).
- **video** — `mp4`/`webm` — **new**: add these to `ASSET_MIME` (`video/mp4`,
  `video/webm`) + a `Film`/`Video` icon. Phaser loads them via `load.video`.
Unknown binary extensions fall back to a generic file card (preview = download/no
inline render).

**Categories (D3).** Group the asset list by the first segment under `assets/`:

```
assets/characters/worker_walk.png   → characters
assets/stations/coffee_locked.png   → stations
assets/ui/btn_buy.png               → ui
assets/vfx/coin_burst.png           → vfx
assets/backgrounds/scene.png        → backgrounds
assets/icons/coffee.png             → icons
assets/audio/ding.mp3               → audio
assets/logo.png                     → Other          (no sub-folder)
```

These are *derived*, not a fixed enum — any folder a kid makes becomes a group.
The known game categories above (matching food-tycoon) get friendly labels/icons;
unknown folders show the folder name.

**Derived metadata (no storage).** Computed lazily per asset and cached by
`path+size`:
- image `width×height` — decode the data-URL via an offscreen `Image` /
  `createImageBitmap`;
- audio `duration` — an offscreen `Audio` element's `loadedmetadata`;
- `size` — from `VfsFile.size`; `mime` — from extension via `ASSET_MIME`.

**Frame-based animation (D4).** A sprite-strip asset is animated **iff** a sibling
sidecar `assets/<path>.anim.json` exists:

```json
{ "frameWidth": 96, "frameHeight": 128, "frames": 4, "fps": 8 }
```

The viewer then offers the animation player (§6). Absent the sidecar, the asset is
a still image. The sidecar is itself a normal text VFS file (editable, persisted,
diffable) — nothing special in the data layer.

## 5. UX / layout

One component (`AssetViewerPane`) renders in both modes (mockups in this folder):

- **Window mode** (`mockup-asset-viewer-window.svg`): a floating **🗂 Asset
  Viewer** window beside Chat / Code / Game, with the bubblegum brand accent + a
  desktop shortcut tile + a taskbar button (all automatic from the registry).
- **Split mode** (`mockup-asset-viewer-split.svg`): a 4th **Assets** tab in the
  left tab strip (`💬 Chat / </> Code / 🗂 Assets`), Game Runner still on the right.

**Two regions inside the pane:**

1. **Left rail — categories + toolbar.** Category list with counts (All,
   Characters, Stations, UI, VFX, Backgrounds, Icons, Audio, Other); a search box
   (filter by filename); an **Import** button (file picker; the whole grid is also
   a drag-drop + paste target) and a **✨ Generate** button.
2. **Main — thumbnail grid.** Responsive cards: thumbnail (image render / audio
   waveform-or-note glyph / animated-badge for sprite strips), filename, `w×h` or
   duration. Selecting a card opens the **detail view**.

**Detail view** (`mockup-asset-detail.svg`) — a right drawer (Window mode) /
bottom-or-side panel (Split mode):
- **Multi-background preview** — toggle checkerboard / dark / white / green to
  catch matte edges, halos, and baked fills (the single most valuable QA affordance
  from the food-tycoon app, kept lightweight — no status, just *see* it).
- **Metadata** — path, category, type, dimensions/duration, size.
- **Code reference** (§6) — the loader snippet + **Copy** + **Insert into editor**.
- **Animation player** (if `.anim.json`) — play/pause/step, fps, frame counter,
  **baseline** + **origin** overlay so a foot-aligned walk cycle is verifiable.
- **AI panel** (§7) — prompt box, kind (image/audio), size, and
  **Regenerate variation** (passes this asset as `refAssetPath`).
- Manage actions — rename, move (category dropdown), replace, delete.

**The detail view adapts to the asset kind** (metadata, code-ref, manage and AI
panel are shared; the preview region swaps):

- **Image / sprite** (`mockup-asset-detail.svg`) — multi-background preview +
  optional animation player (above).
- **Audio** (`mockup-asset-detail-audio.svg`) — a **waveform** with a playhead +
  transport (play/pause, scrub, current/total time, loop, volume). Rendered with
  the repo's existing **`wavesurfer.js`** dependency (already in `package.json`) —
  no new dep. Metadata adds duration / sample rate / channels. Code-ref =
  `this.load.audio(...)`. AI panel = "describe a sound" (`kind: 'audio'`).
- **Video** (`mockup-asset-detail-video.svg`) — an inline **`<video>` player** with
  a big play overlay, a scrub timeline (frame thumbnails), mute + fullscreen, and a
  poster frame. Metadata adds dimensions / duration / fps. Code-ref =
  `this.load.video(...)`. AI panel for video is **marked future/stub** (heavier
  backend; the affordance is shown, generation deferred).

## 6. Code-reference helper (D5)

For a selected asset the detail view shows a ready-to-paste Phaser loader call,
with `<key>` defaulting to the slugified filename:

| Asset | Snippet |
|---|---|
| image | `this.load.image('worker', 'assets/characters/worker.png')` |
| audio | `this.load.audio('ding', 'assets/audio/ding.mp3')` |
| video | `this.load.video('intro', 'assets/video/intro.mp4')` |
| sprite strip (has `.anim.json`) | `this.load.spritesheet('worker_walk', 'assets/characters/worker_walk.png', { frameWidth: 96, frameHeight: 128 })` |

A **Copy** button and an **Insert into editor** action (reuses the existing
`Workspace.handleOpenLocation` → `CodeEditorPane.openLocation` path that
jump-to-error already uses) drop the line into the active editor tab. This closes
the loop: the kid *sees* the asset, copies the exact reference, and ▶ Play inlines
it — because `inlineAssetRefs()` matches that quoted path.

## 7. AI generation (D6)

**Contract** (new backend endpoint, to be built in `platform-backend`):

```
POST /llm/generate-asset
  { projectId, kind: 'image' | 'audio', prompt, refAssetPath?, size }
→ { dataUrl, mime, meta }
```

Routed only through `src/lib/api.ts` — the kid surface **never** calls an LLM
directly (platform §5 + this folder's CLAUDE.md). On return, the result is written
as a new asset via `projectStore.createFile('assets/<category>/<name>', 'asset',
dataUrl)` (or replaces the source on "Regenerate variation"), so it flows through
the same mutation funnel, history, and IndexedDB persistence as any other edit.

**Seam + stub.** A `runGen` seam mirrors `useGameAgent`'s `runTurn`: it defaults to
a local deterministic stub (`assetGenStub.ts`) that returns a placeholder swatch
(a small generated PNG data-URL tinted from a hash of the prompt) or a short tone,
with no network — so the create→preview→use path is exercised offline before the
backend exists. Swapping in the real adapter is a one-line change at the seam.

## 8. Implementation shape (future task — not built here)

The window/tab system is a typed registry, so adding a 4th surface is mechanical
(verified against `playgroundStore.ts`, `desktop/windowMeta.tsx`, `Workspace.tsx`):

| File | Change |
|---|---|
| `panes/AssetViewerPane.tsx` | **NEW** — left rail + grid + detail; used by both modes. |
| `panes/AssetPreview.tsx` | **NEW** — multi-background preview + sprite-strip animation player. |
| `panes/assetMeta.ts` | **NEW** — derive category / dimensions / duration / mime / code-ref; decode data-URLs (cached). |
| `assetGen.ts` + `assetGenStub.ts` | **NEW** — `runGen` seam + local stub (mirrors `useGameAgent`/`gameAgentStub`). |
| `playgroundStore.ts` | EDIT — add `'assets'` to `PgWindowId`; seed a rect in `defaultWindows()`. |
| `desktop/windowMeta.tsx` | EDIT — `WINDOW_META.assets` (title + lucide icon, e.g. `Images`/`Package`), `WINDOW_ACCENT.assets` (`brand-bubblegum`), add to `WINDOW_ORDER`. |
| `Workspace.tsx` | EDIT — `<DesktopIcon id="assets"/>` + `<Window id="assets">…`; extend `SplitTab` type, `SPLIT_TABS`, and the pane conditional. |
| reuse | `projectStore` CRUD (`createFile`/`rename`/`move`/`remove`), `FileTree`'s `FILE_ICON`, `code/buildPreview.ts` `ASSET_MIME`, `Workspace.handleOpenLocation` for insert-into-editor. |
| follow-up | drop the now-redundant **Assets tab** from `FileTree.tsx` (Files-only) once the viewer ships. |

Suggested milestones: **M1** register window+tab + empty pane → **M2** grid +
multi-bg preview + metadata + code-ref → **M3** import/rename/move/delete/replace →
**M4** AI-gen stub (+ Regenerate) → **M5** sprite-strip animation player.

Per this folder's **CLAUDE.md self-update mandate**, the implementing change must
also update `playground/CLAUDE.md` (new pane, new window id, Assets-tab removal).

## 9. Verification (for the implementation)

`npm run dev` → `/playground-sandbox` → run a game, then:
1. Open **Asset Viewer** in both Window and Split modes (registry wiring).
2. Import an image (picker + drag-drop + paste) → lands in the right category with
   decoded `w×h` + a copy-able code-ref.
3. Multi-background preview switches checkerboard/dark/white/green and exposes a
   baked fill on a deliberately bad asset.
4. Copy the code-ref, **Insert into editor**, ▶ Play → the asset loads (validates
   the `inlineAssetRefs` path contract end-to-end).
5. **✨ Generate** (stub) creates a placeholder asset in the current category;
   **Regenerate variation** on an existing asset passes `refAssetPath`.
6. A sprite strip with a `.anim.json` sidecar plays in the animation player with a
   correct baseline/origin overlay.
7. `npm run typecheck && npm run lint && npm run build` clean; new Playwright spec
   covers open-in-both-modes + import + code-ref insert.

## 10. Risks / open points (for review)

- **Backend endpoint not built.** AI generation is a stub until
  `POST /llm/generate-asset` lands; Stars metering/audit is the backend's job. The
  seam keeps the UI shippable meanwhile.
- **Memory / persistence size.** Assets are base64 in memory + IndexedDB (existing
  constraint). Many large images could bloat a project; propose a soft per-asset
  size warning on import. Server-side write-back is still future (shared with the
  rest of the studio).
- **Decoding cost.** Dimension/duration decode is lazy + cached; a huge project
  decodes only visible thumbnails.
- **Animation convention (D4)** — sidecar vs filename-encoding is the main thing to
  confirm. Sidecar recommended; open to a filename convention if you'd rather avoid
  extra files.
- **Assets-tab removal** — keep both, or remove the Code Editor's Assets tab once
  the viewer ships? (Recommend remove to avoid two asset surfaces.)
- **Design tokens** — preview stage uses a fixed checkerboard/`bg-black`; all chrome
  uses `pg-*`/brand tokens (no raw hex), per DESIGN.md.

## 11. Out of scope / not touched

The real `/llm/generate-asset` backend (platform-backend), the standalone
`docs/food-tycoon/` review app (stays separate as reference), and any change to
`VfsFile` / `projectStore` / persistence schema.

## 12. Sample assets (dev)

The starter project (`panes/starterProject.ts` → `sampleAssets.ts`) seeds one
example of every kind so the viewer is testable out of the box: image
(`assets/ui/coin.svg`), sprite (`assets/characters/hero_bounce.svg` +
`.anim.json`), audio (`assets/audio/chime.wav`), video
(`assets/video/intro.mp4`), text (`assets/README.txt`). Image/sprite/audio are
built as data URLs in code; the video is a pre-encoded mp4 in `sampleVideo.ts`,
regenerated with:

```
ffmpeg -f lavfi -i "testsrc2=size=128x128:rate=12:duration=2" \
  -pix_fmt yuv420p -c:v libx264 -crf 36 -movflags +faststart intro.mp4
# then base64 the bytes into sampleVideo.ts's SAMPLE_MP4_BASE64
```
