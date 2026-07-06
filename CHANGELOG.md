# Changelog

All notable changes to airbotix-app (Portal + Learn SPA) are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/); entries are grouped
by date (AEST), newest first. Update this file in the **same commit** as the code change.

## 2026-07-06

### Changed
- **Playground Class asset tab reaches full parity with My-assets — renders `model` (glb 3D), `other` (data/fonts/shaders) + sprite sheets.**
  The backend asset libraries were widened to the playground's full importable set, so `GET /projects/:id/class-assets`
  can now include `kind: 'model' | 'other'` (a sprite arrives as an `image` PLUS a sibling `<name>.anim.json` `other`
  item). `ClassAssetView.kind` widens to `'image'|'audio'|'video'|'model'|'other'`. The Class grid now HIDES `.anim.json`
  sidecar cards, labels an image-with-sidecar as a "sprite sheet", renders `model` via the same lazy `modelThumbnail`
  three renderer My-assets uses (3D-cube icon fallback while it loads / on failure), and gives `other` a `File` icon;
  `KIND_ICON` gains `model`/`other`. The detail view renders a glb through the same lazy `ModelPreview` three stage
  (never crashes for glb) and `other` as a file icon + name + size. "Add to my game" copies bytes into
  `assets/class/<name>` for EVERY kind (a glb copies like an image, loaded from the VFS via THREE.GLTFLoader); for a
  sprite it ALSO fetches + copies the sibling `.anim.json` sidecar to `assets/class/<name>.anim.json` (from the sidecar
  item's own signed URL) so the sprite animates exactly like a My-assets sprite. Covered by
  `AssetViewerPane.classAssets.test.tsx` (model/other render, sidecar hidden + "sprite sheet" label, model detail no
  crash, sprite add copies BOTH files) and `playgroundApi.test.ts` (widened kinds pass through).
- **Playground Class asset tab now shows merged course-pack defaults + class assets, labelled by origin (D-CSA-3).**
  `GET /projects/:id/class-assets` now returns one flat list that merges the bound course pack's
  admin-curated DEFAULTS (`source:'course'`, first — no `class_id`) with the class's own teacher
  assets (`source:'class'`). `ClassAssetView` gains a required `source: 'class' | 'course'` and
  makes `class_id` optional. The Asset Viewer's Class tab labels each grid card with a tiny origin
  badge (`data-testid="class-asset-source"` → "Course" / "Class") and the detail "Source" row now
  reflects the origin ("Course library (set by Airbotix)" vs "Class library (from your teacher)").
  The "Add to my game" copy-into-VFS flow is unchanged (the merge is transparent to it); the
  existing `class.asset_added/removed/assets_copied` WS refetch already covers course-default
  changes (backend fans the same events out). Covered by `AssetViewerPane.classAssets.test.tsx`
  (course-first ordering, per-card origin badges, detail source labels) and `playgroundApi.test.ts`.

## 2026-07-05

### Fixed
- **Playground/code chat: a safety-screen OUTAGE no longer blames the kid's picture (D-PAP-46).**
  The backend now distinguishes a classifier outage (`422 MODERATION_UNAVAILABLE`) from a real
  content reject. `useGameAgent` maps it to the new `IMAGE_CHECK_HICCUP_MESSAGE` ("Our picture
  checker had a hiccup — nothing wrong with your picture! Try again in a moment. 🛠️") and — unlike
  a real reject (which clears via `imageRejectNonce`) — hands the unjudged, already-uploaded refs
  back through the new `imageRestore` nonce: `AIChatPanel` RE-STAGES them `ready` (submit had
  cleared the composer), so one tap retries with no re-upload (text-only turns get a generic
  "safety check had a hiccup" line; `useCodeStudio` maps the code too). Covered by
  `useGameAgent.test.ts` (hiccup copy, reject nonce untouched, `imageRestore` carries the refs,
  0 Stars) and `AIChatPanel.test.tsx` (restore re-stages `ready` + resend carries the same S3 ref).

## 2026-07-04

### Fixed
- **Stale-verdict guard + frame-source check (adversarial review findings).** (1) A run-report
  POST is held open for the whole server-side fix turn; if the kid sent a chat turn meanwhile,
  the late `fixing` verdict used to apply the fix turn's OLDER files over the kid's newer turn
  and hijack the armed chain — `useVerification` now discards any verdict whose chain is no
  longer armed. (2) `GameFrame` ignores messages from any window other than its own iframe
  (cross-frame report pollution guard; sourceless synthetic events — jsdom — still pass).
- **Verification restarts now guarantee a live GameFrame (D-PAP-40).** In the default Window
  layout the Game window launches CLOSED (chat-first), and a closed/minimized window mounts no
  `GameFrame` — so the verification loop's restart (resume-verify on workspace mount, i.e. the
  initial build's auto-run) observed nothing and no RunReport ever posted: the first turn's
  `verify_status` stayed `pending` forever. `useVerification`'s `restartGame` now goes through
  `ensureGameRunnerVisible()` (new `playgroundStore` helper): it opens the Game window only when
  it is NOT on screen, and no-ops in split mode and on an already-visible window — so a silent
  fix beat still never yanks the window forward. The open is deliberately **without raising**
  (never `openOrFocus`): the default game rect overlaps the chat's right edge, and raising it
  sat the game stage OVER the chat's send button — the kid literally couldn't click Send
  (caught by the harness's chat-send-clicking journeys: `safeguarding`, `sharing-remix`,
  `teacher-kid-classroom`). The seeded z-order keeps the chat on top where they overlap.

### Added
- **Playground post-apply verification loop — FE half (playground-ai-prompt-prd D-PAP-40/41/44).**
  After an applied game turn (`verification: 'pending'` on the turn result), the studio now runs
  the game **instrumented**, builds a structured **RunReport** (v1, mirrored from
  `platform-backend/src/code-sessions/run-report.ts`), and POSTs it to
  `…/code/turn/:turnId/run-report`; the **server adjudicates**. Product behaviour is locked:
  verification is **SILENT on success and on auto-fix** — a `fixing` verdict applies the fix
  turn's files quietly (same files+version funnel as chat turns), restarts the game, and reports
  `attempt+1`; only the **co-debug** hand-off surfaces (one warm bubble carrying the server's
  message). Resume-verify: on workspace mount, `GET …/code/verify-state` picks up a still-pending
  turn (closed tab) and re-runs at `attempts+1`. Pieces:
  - `buildGamePreview.ts`: both control shims' `__airbotixStat` now carries the **engine's
    cumulative `frames`** counter (Phaser `loop.frame` / three `renderer.info.render.frame` —
    never rAF, which ticks while frozen); a new engine-agnostic **RUN_PROBE** answers
    `{action:'report'}` with an 8×8 canvas sample (`{__airbotixRunReport, canvas}` — any probe
    failure degrades, never breaks the game); a three-only **THREE_LOADER_GUARD** wraps
    `GLTFLoader`/`TextureLoader.load` to post `{__airbotixAsset, url, len, ok, error?}` and
    `console.error('[airbotix] …')` BEFORE the app's own onError can swallow the failure;
    `buildGamePreview()` returns an **assetManifest** (data:-URL prefix+length per inlined asset)
    so a reported data: URL maps back to the kid's path. Phaser srcdoc unchanged beyond
    `frames` + RUN_PROBE; scriptRanges (kid file:line resolution) regression-tested with the new
    parts.
  - NEW `runReport.ts`: the FE RunReport mirror + pure `createRunCollector` (console
    classification incl. rejection/window-error routing, caps 6/4/3/3×300 chars with transparent
    `dropped` counts, de-dupe, asset-outcome mapping — raw un-inlined paths → `missing-ref`).
    Curated failure **warns are PROMOTED to `consoleErrors`** (Phaser reports missing
    textures/scenes via `console.warn`, and the backend's clean-run predicate treats warns as
    advisory — a broken game must not verify clean).
  - `GameFrame.tsx`: optional `onRunReport`/`reportAttempt` — per run it feeds the collector,
    asks the probe after a 4 s observation window, and emits the finalized report exactly once
    (probe silent ≥1.5 s → `probeError: 'no-response'`).
  - NEW `panes/useVerification.ts`: the loop driver (arm per applied turn, post per attempt,
    in-flight + stale-attempt guards, client-side 3-reports-per-chain cap, resume-verify).
  - `code/codeApi.ts`: `postRunReport` + `getVerifyState` + the `verification` field on the
    turn-result mirror.
  - `PlaygroundApp.tsx`: entering the workspace after generation now **auto-runs** the game, so
    the first build plays (and gets verified via resume-verify) without pressing ▶.

### Changed
- **`verifyRoundtrip.extractRuntimeErrors` accepts curated failure warns** (`/^\[airbotix\]/`,
  `Failed to load|process`, `Texture … missing|not found`, `Scene … not found`) — generic kid
  `console.warn` still never triggers a Stars-charged fix.
- **The raw console-error auto-fix path (`/code/verify-fix`) is retired for game projects**: the
  runner no longer wires `onRuntimeErrors` → `autoFixFromErrors`; game verification goes through
  the server-adjudicated run-report loop. The code path stays compiling (and the co-debug bubble
  copy now comes from the server).

## 2026-07-03

### Fixed
- **2D→3D conversion no longer deletes the kid's imported assets (Game Studio, D-3D-08 ×
  D-3D-09).** Converting a game between engines ("make it 3D") rebuilds it on a clean
  starter, and `resetEngine` was replacing the *entire* VFS with just that starter — so a
  `.glb` (or any image/audio) the kid had just imported vanished the moment they went 3D to
  use it. The engine switch now drops only the old engine's **code** and carries the kid's
  uploaded **assets** (anything `kind:'asset'` or under `assets/`) across the rebuild; the
  port prompt also names the preserved assets so the agent can wire the model into the new
  3D game. New shared `isAssetFile` helper (`panes/assetMeta.ts`) is the single definition of
  "is an asset" (the Asset Viewer's local `isAsset` now delegates to it). Tests:
  `useGameAgent.test.ts` (engine switch preserves `assets/` files + drops old code + names
  them in the port prompt); harness `kid-playground-model` extended to prove a just-imported
  `.glb` survives the 2D→3D switch end-to-end (real `PATCH engine` + saveVfs, DB `vfs_version`
  bump, authed `GET …/code/files` still lists the model, card still in the Assets pane).
- **Turn-result assets no longer come back as un-renderable raw base64 (`code/codeApi.ts`).** A
  turn result carries the FULL post-turn VFS (`readAllFiles`), and the backend returns binary
  assets as raw base64 — but only the snapshot/save reads mapped `toStudioContent` (which wraps
  them back into the `data:` URLs the `VfsFile` contract requires); the four turn-result paths
  (`runAgentTurn`, `streamAgentTurn`, `approveTurn`, `reportRuntimeErrors`) returned them raw. So
  after any AI turn, an imported image/audio/`.glb` that rode along in the VFS landed in the
  studio store as bare base64 and failed to render ("Couldn't open this 3D model"). This was most
  visible right after the 2D→3D switch (its rebuild turn re-applies the whole VFS incl. the
  just-preserved model). All four paths now normalize via a shared `toStudioTurnResult`
  (`changes[].after` left as raw base64 — the diff view expects that). Test: `codeApi.test.ts`
  (turn-result asset base64 → `data:` URL; text + `changes[].after` untouched).

### Added
- **GLB 3D-model assets in the Game Studio Asset Viewer (learn-game-studio-3d-prd D-3D-09,
  resolves OQ-3D-2).** Kids can now (1) **import** animated `.glb` models from local
  (file picker / drag-drop — `glb` joins `IMPORTABLE_EXTENSIONS`, same ≤50 MB confirmed-upload
  reveal), (2) **preview** them in a new lazy-loaded three.js stage (`panes/ModelPreview.tsx`:
  lit scene, orbit controls, auto-framing) with **every animation clip listed as a switchable
  chip** (first clip autoplays, crossfade on switch, play/pause; own chunk — three.js stays out
  of the main bundle), and (3) **reference** them in the AI chat — new `AssetKind 'model'` with a
  kind-aware "Copy 3D model reference" (bare VFS path, D-ASSET-15 contract). The sandbox chain:
  `GLTFLoader` is now bundled into the vendored `window.THREE` global (`vite.config.ts`
  `THREE_ADDONS`), and `.glb` is inlined as `model/gltf-binary` data URLs (`ASSET_MIME` +
  `BINARY_ASSET_MIME`) so a three game loads a referenced model with `THREE.GLTFLoader`.
  Tests: `assetMeta.test.ts` (model kind + label), `buildGamePreview.test.ts` (glb inlining),
  a new Asset Viewer GLB import e2e (upload → clips switch → chat ref) and a 3D game-smoke e2e
  (a three game loads the animated `.glb` via the global, plays a clip, runs clean); fixture
  `e2e/fixtures/spin.glb` (+ its deterministic generator `make-spin-glb.mjs`).
  Preview polish (user feedback): animation chips show the **short kid-facing label** — the last
  `|` segment of rig-namespaced exporter names ("CharacterArmature|Death" → "Death"; full name on
  the tooltip, collisions keep full names — `clipLabels` in `assetMeta.ts`); clips live in their
  own **Animations panel** (count + play/pause + scrollable chips + hint) instead of a loose chip
  row; the stage gains **zoom in / zoom out / reset-view** buttons; and a **"Copy name"** button
  copies the active clip's FULL name (what `AnimationClip.findByName` needs) for the AI chat.
  Fixture clips renamed to `CharacterArmature|Spin`/`|Bob` so the e2e proves shortening + full-name
  copy against realistic exporter output.

### Changed
- **One inline Copy behaviour everywhere in the Asset Viewer (user feedback).** The reference
  blocks (My assets / Library / Class) now use the same "Copied!"-on-the-button pattern as the
  Animations "Copy name" — a shared `CopyButton` component (clipboard write + 1.5 s check-icon
  confirmation) replaces the three hand-rolled Copy buttons and the copy-ref snackbar; the
  snackbar stays for import/upload/class-add outcomes. e2e assert the inline `Copied!` state and
  read the clipboard for the exact reference.
- **3D model grid cards show the actual model (user feedback).** The Asset Viewer card for a
  `.glb` renders a real framed still of the model (new lazily-imported `modelThumbnail.ts`: one
  shared offscreen WebGL renderer, serialised renders, cached by content, icon fallback for
  unparsable files) instead of the generic box icon. Shared scene plumbing (guarded loading
  manager, stage lights, auto-framing) extracted to `modelScene.ts`, now used by both
  `ModelPreview` and the thumbnailer — three.js remains a lazy chunk, out of the main bundle.
- **Asset Viewer feedback is a snackbar, never a banner (user feedback).** Every Asset Viewer
  operation notice ("Reference copied…", import results/blocks, upload failures, class-asset
  add/errors) previously rendered as a layout-shifting banner strip across the top of the pane;
  it is now a floating, auto-dismissing (3 s) snackbar pill at the bottom of the pane
  (`role="status"`, `aria-live="polite"`, success/error tone icons, `pg-snack-in` slide-up honoring
  `prefers-reduced-motion`). e2e assertions pinned to the `asset-snackbar` testid so a banner
  regression fails the suite.

### Fixed
- **`GLTFLoader is not available` / 3D models not loading — stale immutable cache of the vendored
  engine (learn-game-studio-3d-prd D-3D-09).** The self-hosted `/vendor/` engine globals had a
  FIXED, version-only filename yet shipped `immutable, max-age=1yr` (deploy.yml) with CloudFront
  invalidation covering only `/index.html` — so the D-3D-09 deploy that added `GLTFLoader` to the
  `window.THREE` bundle overwrote the same URL, and any browser/edge that had cached the pre-GLTFLoader
  bytes kept serving them for a year (a `THREE` with no `GLTFLoader` → the sandbox game threw; the
  model never loaded). Refreshing flipped it because different caches were hit. Fix: the
  `vendor-engines` plugin now emits **content-hashed** filenames (`three-<v>-<hash>.global.js`,
  `phaser-<v>-<hash>.min.js`/`.d.ts`) so the URL changes iff the bytes do — `immutable` becomes
  correct and a stale cache can never mask an engine change. The app reads the resolved URLs from a
  new `virtual:engine-vendors` module (`buildGamePreview.ts` + `MonacoEditor.tsx`) instead of
  hardcoding paths; no engine-path constants remain. Guarded by the 3D game-smoke e2e (asserts the
  srcdoc loads a `three-<v>-<8hex>.global.js` URL) + the `.d.ts` lazy-load e2e (hash-tolerant).
- **Detail-view 3D preview intermittently showed "Couldn't open this 3D model" while the list
  thumbnail rendered fine.** `ModelPreview` loaded the model with `GLTFLoader.load(blobURL)` — a
  real `fetch()` of an object URL, with a blob lifecycle that could race StrictMode/cleanup and that
  a strict `connect-src` CSP can block — whereas the working grid thumbnail parses the raw bytes.
  `ModelPreview` now uses the same `GLTFLoader.parse(arrayBuffer)` path (no blob URL, no network
  fetch, same sub-resource guard), so the detail stage is as robust as the thumbnail. Covered by the
  cross-repo `kid-playground-model` journey (the stage renders + clips switch after a real reload).
- **e2e mock harness caught up with the direct-to-S3 asset save + chat-ref copy.** The
  route-mocked backend (`e2e/helpers.ts`) never mocked `vfs/assets/sign-upload`/the S3 PUT, so
  every Asset Viewer import e2e silently failed since the presigned-upload save shipped; it now
  mirrors the real sign → PUT bytes → save-with-references flow (CORS included) and rebuilds
  asset content from the uploaded bytes. Also updated three stale specs: copy-ref expectations
  (loader snippet → bare chat reference + new notice, PR #86 behaviour) and the `.txt` import
  test (text files are BLOCKED from import by design — asserts the block notice). Added a
  GET `/projects/:id` mock (regex-scoped so Vite module URLs under `…/projects/…` aren't
  swallowed) with a new `engine` option for three-engine specs, and the game-signal recorder now
  captures info logs (`__smokeLogs`).

### Changed
- **Class-code login (`/learn/class-code`) now requires a display name.** The "What do you want
  to be called?" field was labelled `(optional)`; a kid could join with no name. It is now
  required (trimmed, 1–40 chars) with an inline validation error ("Please tell us your name."),
  matching the "At class" request form which already required a typed name. Added
  `ClassCodePage.test.tsx` covering the empty-name block, the removed `(optional)` label, and a
  successful submit.

### Fixed
- **Login mode toggle restyled to match the Learn design language.** The "Family code / At class"
  tabs were a heavy ink-filled pill next to a flat sky wash — off-style for the kid surface.
  Now a proper segmented control: warm `surface` track with a white active pill (`bg-canvas-pure` +
  `shadow-card-soft`), same recipe as the My Works segment chips.
- **Login toggle uses Lucide icons, not emoji.** The 👪 / 🏫 emoji became line icons (`Users` /
  `School` from `lucide-react`, 16px, matching the app's icon set) for a cleaner, on-brand look.

## 2026-07-02

### Added
- **"At class" login mode on `/learn/login` (auth-system-prd §5.3).** The kid login page now has
  a two-tab toggle: "👪 Family code" (unchanged) and "🏫 At class" — for enrolled kids who forgot
  their family code/PIN while at class. The kid types the class code from the board + their name
  (free text), which creates a pending login request; a friendly waiting screen ("✋ Ask your
  teacher to let you in!") polls every 3s until the teacher approves from teacher-console, then
  the kid lands in `/learn` on their REAL account (own projects/stars, short 4h session). Denied /
  expired / offline states get kid-friendly copy; the pending request survives reloads via
  sessionStorage; a `consumed` poll (tokens already taken by another tab / pre-reload poll)
  recovers through silent `/auth/refresh?kind=kid`. New `ClassLoginForm` + `ClassLoginWaiting`
  components, `createClassLoginRequest` / `pollClassLoginRequest` in `useAuth`, response types in
  `auth/types.ts`, and a 7-case component test (`ClassLoginFlow.test.tsx`). The one-shot workshop
  flow at `/learn/class-code` is unchanged.

## 2026-07-02 (Playground chat composer: attach-button polish)

### Changed
- The chat composer's attach-a-picture button is now a proper round chip (bordered, surface
  background, sky accent on hover) instead of a bare icon, and the composer row gained symmetric
  left padding — so it visually pairs with the round send button instead of hugging the border.

## 2026-06-30 (Playground AI chat: image input — upload + clipboard paste, FE half)

### Added
- **Kids can attach pictures to a playground chat turn so Airo "sees" them** (playground-ai-prompt-prd
  D-PAP-33..37, dark-launch). The composer (`AIChatPanel`) gains a picture button (`chat-attach-btn`) +
  hidden multi-file `<input accept=image/png,image/jpeg,image/webp,image/gif multiple>` and an `onPaste`
  handler that pulls image files off the clipboard. Each attachment shows a thumbnail strip above the
  textarea (`chat-attachment`, remove via `chat-attachment-remove`) — a spinner while it uploads, a red
  rejected state on failure. Send allows **text OR images**, is blocked while any attachment is still
  uploading, and clears both on send. The attached pictures render in the kid bubble from a **local
  preview URL** (the S3 key never reaches the bubble). All image affordances are hidden under `readOnly`
  (teacher viewer) and when the dark-launch flag is off.
- `codeApi`: `ChatImageRef = { s3_key; mime }`; `signChatImageUpload(projectId, { contentType, sizeBytes })`
  (POST `…/code/chat-image/sign-upload`, same `SignedUpload` shape the asset save uses); `uploadChatImage`
  (client MIME allow-list + ≤5 MB + optional canvas downscale to ≤1536px, presign, then a raw browser→S3
  PUT via the new shared `putToSignedUrl` — also reused by `uploadAssetToS3`). `runAgentTurn` /
  `streamAgentTurn` carry `images?` in the body **only when non-empty** (max 4). The kid still NEVER calls
  an LLM directly — only `platform-backend` (CLAUDE.md #5).
- `useGameAgent`: `send(text, opts?: { guided?; images? })` — relaxes the empty-text guard for an
  image-only ask, **skips the text classify** when there are no words, threads the S3 refs into
  `deps.runTurn`, and renders the local previews in the kid bubble. A `MODERATION_REJECTED` error with
  `details.modality:'image'` maps to an image-specific friendly message (`IMAGE_REJECT_MESSAGE`);
  `IMAGE_INPUT_DISABLED` (flag off) maps to the "pictures aren't available right now" message
  (`IMAGE_DISABLED_MESSAGE`) and latches the affordance hidden. Both paths charge **0 Stars**, leave no
  broken pending bubble, and clear the staged image(s).

### Tests
- `codeApi.test.ts`: `images` in the turn body only when present (omitted for text / empty list);
  `signChatImageUpload` + `uploadChatImage` presign→PUT path; MIME / oversize client-guards reject before
  any network call; S3 PUT failure surfaces an `ApiError`.
- `useGameAgent.test.ts`: image refs (not preview URLs) forwarded to `deps.runTurn`; image-only send skips
  classify; image reject → image copy + 0 Stars + staged image cleared; text reject keeps the generic
  copy; `IMAGE_INPUT_DISABLED` → not-available copy + affordance hidden.
- `AIChatPanel.test.tsx`: paste → thumbnail (uploading → ready); remove; send disabled while uploading;
  image-only send forwards refs + preview and clears the strip; picker via the hidden input; `readOnly`
  and flag-off hide the picture button; non-image paste ignored; reject-nonce clears the strip; kid bubble
  renders attached previews.

## 2026-06-29 (Fix: large asset thumbnails/previews broke in the asset viewer)

### Fixed
- **A large uploaded image rendered in the game but its asset-viewer thumbnail + detail preview were
  broken** (Chrome `blocked:other`). Cause: a multi-MB asset's `data:` URL is refused by the DOM
  `<img>`/`<video>`/`<audio>`, even though the sandboxed game's Phaser loader tolerates it — so the same
  asset worked in-game but not in the viewer. Now the asset viewer renders media from a short-lived
  `blob:` URL (`useObjectUrl` → `URL.createObjectURL`), which the DOM loads reliably and far more cheaply
  (no re-decode of a megabytes-long attribute each render); the object URL is revoked on unmount. The
  runtime/game is unchanged (still inlines `data:` URLs). Applied to the grid thumbnail (`Thumb`), the
  detail preview (`AssetPreview`: image/sprite/video/audio/lightbox), and dimension decoding. Library
  assets (CloudFront URLs) pass through unchanged.

### Tests
- `useObjectUrl.test.ts`: data: → blob: + revoke-on-unmount; non-data URL passthrough; throw → safe
  fallback to the data URL.

## 2026-06-29 (Game studio: tighten the asset importer to supported types only)

### Changed
- The import file picker now offers **only the types that can actually be saved** — its `accept` is
  derived from the single `IMPORTABLE_EXTENSIONS` list (no `image/*` wildcard). **`.svg` is excluded**
  (it's script-capable + the backend treats it as scanned text, so it was never uploadable as an asset);
  previously the picker offered it and the import then failed the save. Executable text (`.js/.html/.css`)
  stays blocked with a clear message (also covers drag-drop).

## 2026-06-29 (Game studio: import data files — JSON, fonts, shaders — as assets)

### Added
- The asset importer now accepts **non-executable data files** alongside media: `.json` (sprite
  atlas / tilemap / level data), `.xml`, `.csv`, fonts (`.ttf/.otf/.woff/.woff2`), `.fnt`, shaders
  (`.glsl/.frag/.vert`), `.atlas`. They import + upload like images and inline as data: URLs at
  runtime (Phaser `load.json`/`load.atlas`/`load.bitmapFont` accept data: URLs). MIME maps
  (`binaryAssetMime`, `ASSET_MIME`) extended so they round-trip across reload.
- Import **type guard** (`IMPORTABLE_EXTENSIONS`) + a broadened `accept` filter: unsupported /
  executable files (`.js/.html/.css/…`) are blocked at import with a clear "not a supported file
  type" message (also covers drag-drop, which ignores `accept`).

### Fixed
- `toStudioContent` now gates the base64→data: URL conversion on `kind === 'asset'`, so a `.anim.json`
  **text** sidecar (whose extension matches the JSON MIME) is no longer mis-wrapped as a data URL.

### Tests
- `AssetViewerPane.classAssets.test.tsx`: a `.json` import is accepted (kind `asset`); a `.js` import
  is blocked with the type message and nothing reaches the VFS.

## 2026-06-28 (Game studio: raise the asset import cap to 50 MB)

### Changed
- **`AssetViewerPane` import cap 16 MB → 50 MB** (`MAX_ASSET_BYTES` / `MAX_ASSET_LABEL`), matching the
  backend `MAX_FILE_BYTES` raise. Over-cap files are still hard-blocked at import with a clear
  "max 50 MB" message (never imported then lost). Feasible now that asset bytes upload direct-to-S3
  rather than as base64 in the save body.

### Tests
- `AssetViewerPane.classAssets.test.tsx`: the over-cap block boundary updated to >50 MB / "max 50 MB".

## 2026-06-27 (Game studio: assets upload direct to S3, not via nginx)

### Changed
- **Asset bytes now upload straight to S3 (presigned PUT); the VFS save sends a reference.** Previously a
  save serialised every asset as base64 in the JSON body and re-sent the whole VFS — so a >1 MB asset hit
  nginx's 1 MB request cap (413). Now `saveVfs` uploads any **dirty** asset (newly imported / renamed)
  to S3 via a presigned PUT (`POST …/vfs/assets/sign-upload` → raw `fetch` PUT, bypassing nginx + the
  JSON body), then saves a manifest of **text inline + assets as references** (`{path, uploaded:true}`).
  Clean assets (already in S3 at their path) are referenced, not re-uploaded.
- **`PlaygroundApp` tracks which asset paths are confirmed in S3** (`syncedAssetsRef`, seeded on load +
  after each successful save). On save it computes the dirty set; rename/move is handled automatically
  (the new path isn't synced → uploaded). AI-turn assets are marked synced (the backend already wrote
  them). `importFiles` is unchanged — the confirmed-upload seam reveals the asset only once the save
  (incl. its upload) succeeds, and rolls back on failure.
- The load path + runtime are **unchanged**: the GET still returns assets as base64 (responses aren't
  body-limited), `toStudioContent` wraps them back into `data:` URLs, and the sandbox still inlines those
  URLs — so the security model (no S3/signed URL inside the iframe) holds by construction. Removed the now
  unused `toBackendContent` (data-URL→base64 stripper).

### Tests
- `codeApi.test.ts`: a dirty asset is presigned + PUT to S3 then sent as a reference (no base64 in the
  save); a clean asset is referenced without re-uploading; text saves inline as `{path, content}`.

## 2026-06-26 (Asset import: confirmed-upload model + "Uploading…" indicator)

### Changed
- **An imported local asset now appears in "Mine" only AFTER its upload is confirmed.** Previously
  `importFiles` added the file to the VFS optimistically (it showed instantly, then the debounced save
  ran later — so a failed save left a phantom asset that vanished on reload). Now the import:
  1. reads the file and adds it to the VFS but keeps it **hidden** (`pendingPaths`) until confirmed;
  2. **awaits the backend save** via a new `onSaveNow` seam (`PlaygroundApp.flushSave`, threaded through
     `Workspace`); 3. **reveals** the asset on `saved`, or **rolls it back** (removes it) with a clear
     error on any other result. So an asset is never shown as available unless the backend stored it.
- **Added a clear "Uploading …" indicator**: the Import button shows a spinner + "Uploading…" and is
  disabled, with an "Uploading <name>…" line below, for the whole read+upload — no more silent freeze
  on a large (up to 16 MB) file.

### Tests
- `AssetViewerPane.classAssets.test.tsx`: a confirmed (`saved`) import is hidden during upload then
  revealed + persisted; a failed (`rejected`) upload shows an error and leaves nothing in the grid or
  the VFS (rolled back). `PlaygroundApp.flushSave` now returns its `SaveResult`.

## 2026-06-26 (Fix: imported assets vanished on reload — size cap + honest save, D-CODE-Q6)

### Fixed
- **An imported image showed in "Mine" but disappeared after refreshing the project.** The Asset
  Viewer only *warned* at 4 MB and imported anything, but the backend rejected any file over its
  500 KB cap (`VFS_FILE_TOO_LARGE`, HTTP 400) — and `saveProject` mislabelled that permanent 400 as a
  transient **"queued"** ("Saved on this device"). The next load read the server VFS (which never
  stored the asset) and overwrote the local cache, so the image was gone. Two fixes:
  - **`AssetViewerPane` now hard-blocks over-cap imports** (`MAX_ASSET_BYTES`, 16 MB to match the
    backend) with a clear message naming the file(s) and the limit — instead of importing then losing them.
  - **`saveProject` distinguishes a permanent 4xx from a transient network failure**: a 4xx returns a
    new `rejected` result (was lumped into `queued`). `PlaygroundApp` maps it to a new **`error`** save
    status and the Taskbar shows "Couldn't save" (⚠) — never a false "Saved on this device".

### Changed
- Raised the import cap from a 4 MB *soft warning* to a **16 MB hard block** so kids can import large
  sprite sheets / short audio (paired with the backend cap raise to 16 MB / 48 MB-project). INTERIM —
  true 50 MB sprites/video is a presigned direct-to-S3 upload follow-up (the whole VFS is re-sent as
  base64 on every save, so 50 MB doesn't fit the current path).

### Tests
- `AssetViewerPane.classAssets.test.tsx`: an over-cap (>16 MB) import is blocked with a clear message
  and adds nothing to the VFS. `projectPersistence.test.ts`: a permanent 4xx save returns `rejected`
  (not `queued`).

## 2026-06-26 (Fix: /try blocks demo broke network isolation → red CI)

### Fixed
- **The `/try/blocks` demo fired a real `GET /projects/:id`**, breaking its "zero network" contract
  (try-demo-mode-prd D-DEMO-02) and turning `TryBlocksPage.test.tsx` red on `main`. `useProjectBackTo`
  (the Blocks/Code studios' class-aware Home link) ran its react-query fetch even under the demo, which
  has no class and overrides Home itself. It now **disables the query in demo mode** (`useDemoMode()`),
  so the demo makes no network call and the back-link falls back correctly. Restores green CI for the repo.

## 2026-06-26 (Game Studio: modern "AI is thinking" indicator)

### Changed
- **Replaced the spinning brand orb in the game-studio chat with a modern treatment.** While an AI
  turn runs, the `WorkingCard` (and its `ThinkingBubble` fallback) now show a **breathing
  brand-gradient dot** (`.pg-breathe-dot` — scale + soft glow, no rotation) beside a **shimmering
  status line** (`.pg-shimmer-text` — a brand-tinted highlight band sweeps across the dim copy via
  `background-clip:text`). The "fixing 🔧" beat tints the dot warm amber. Both animations are held
  still under `prefers-reduced-motion` (the shimmer falls back to solid dim text). Removes the old
  `pg-orb-spin` / `pg-ring-arc` SVG ring from these two components.
- **Dropped the trailing emoji from every status line** in the indicator (`turnProgress.ts` step /
  filler / file labels + `ThinkingBubble` `THINKING_LINES`) — e.g. "Thinking it through 🤔" → "Thinking
  it through", "Adding Aliens ✍️" → "Adding Aliens". Cleaner copy alongside the new shimmer. (The
  *leading* file-row icons in the settled message's change list, `fileEmoji`, are unrelated and unchanged.)

### Tests
- `WorkingCard.test.tsx`: asserts the breathing dot (`pg-breathe-dot`, `working-dot` test id)
  replaces the spinning ring (no `pg-orb-spin` / `pg-ring-arc`), the label shimmers (`pg-shimmer-text`),
  and the fixing beat switches the dot to `pg-breathe-dot--fixing`. `AIChatPanel.test.tsx` unchanged + green.

## 2026-06-24 (Learn: unify the kid create entry points, D-MC-14)

### Fixed
- **"My Works" → "+ New project" no longer opens a drifted, partly-broken modal.** The
  `ProjectsListPage` `NewProjectModal` had its own `Image/Story/Music/Blank` starter list that had
  diverged from the Create tab's shared `CREATE_TOOLS` registry — it omitted Voice/Video/Code/Blocks,
  and its **"Story" tile routed to `/learn/create/story`, which is not a registered route**: it POSTed
  an orphan `line_a_creative` project and then dead-ended on `NotFoundPage`.

### Changed
- **"+ New project" now navigates to the Create tab (`/learn/create`)** — the single create surface
  (rendered from `CREATE_TOOLS`, shared with the in-class "Create for this class" sheet), so the tool
  list can no longer drift between entry points. Deleted the bespoke `NewProjectModal` + `STARTER_TILES`.
- Removed the redundant **"📂 My Works" page heading** from `ProjectsListPage`.

### Tests
- `ProjectsListPage.test.tsx`: asserts "+ New project" routes to `/learn/create` (no `/projects` POST,
  no "What are you making?" modal) and that the "My Works" heading is gone. Existing grouping / ⋯
  placement / wall-event tests unchanged and green.

## 2026-06-23 (Game Guide → full concept-first KB with interactive diagrams, D-HELP-08)

### Added
- **Interactive diagrams** (`panes/help/helpDiagrams.tsx`): a curated set of pokeable widgets on
  the existing `diagram` block — `coords-explorer` (drag x/y, toggle 2D/3D for z), `sprite-vs-mesh`,
  `camera-view` (pan vs orbit), `game-loop-stepper`, `collision-overlap`, `gravity-jump`,
  `scene-tree` — plus new static concept SVGs (engine-parts, materials-lights, input-keys, velocity,
  tween-curve, hud-score, win-lose, levels, juice). Theme-aware, keyboard-accessible, caption fallback.

### Changed
- **Help pane is now a 3-level tree** (branch → section → doc) sorted by `order` (`HelpPane.tsx`);
  `helpTypes.ts` gains `section?`/`order?` + the concept-branch `Pillar` union. The corpus is
  fetched as before; both 2D + 3D content always shows (engine-agnostic, D-HELP-08).
- Regenerated the bundled demo corpus (`pages/try/demoHelp.playground.ts`) as a verbatim copy of the
  new backend corpus (drift alarm green).

### Tests
- `helpDiagrams.test.tsx` (new): diagrams render + respond (toggle 3D, Step, expand tree, unknown-key
  fallback). `helpApi.test.ts` / `HelpPane.test.tsx` / `demoHelp.playground.test.ts` /
  `demoAdapters.test.ts` migrated to the new ids/structure. (Pre-existing `TryBlocksPage` zero-network
  flake unaffected.)

## 2026-06-23 (Game Studio 3D — fix the real switch root cause: runner snapshot, D-3D-08)

### Fixed
- **The actual cause of "Phaser/THREE is not defined" on a 2D⇄3D switch (both directions).**
  `GameRunnerPane` runs a `runKey`-gated SNAPSHOT of the VFS, but the `engine` prop is live — so
  on a switch the engine flipped while the runner kept the OLD engine's snapshot files, running
  them under the new global. Now the runner **re-snapshots when `engine` changes** too (not only
  on a runKey bump), so the iframe reloads the clean target-engine files together with the new
  global. (Earlier `flushSync`/reset fixes were necessary but insufficient — the runner ignored
  the live files.) Verified end-to-end in a real browser: toggling phaser→3D→2D on the **mounted**
  runner renders a canvas each time with zero "is not defined" errors. The DEV `/playground-sandbox`
  now drives `GameRunnerPane` (engine as a prop, no remount) so it reproduces the studio switch.

## 2026-06-23 (Game Studio 3D — fix switch crash + atomic engine flip, D-3D-08)

### Fixed
- **Full-screen crash on the switch rebuild** (`Cannot read properties of null (reading 'split')`
  in `AIChatPanel.changedLineRange`). A whole-game rebuild creates NEW files whose diff `before`
  is null; `changedLineRange`/`buildChangedFiles` now coerce null `before`/`after` to `''` instead
  of `.split(null)`. (Regression test added.)
- **"Phaser is not defined" still flashed on confirm** — the switch updated the engine (React
  state) and the VFS (Zustand store) in separate ticks, so the runner briefly rendered the old 2D
  files under the new 3D global. The engine flip + clean-starter apply now run inside a single
  `flushSync`, so the runner only ever renders a consistent (engine, files) pair.

## 2026-06-23 (Game Studio 3D — fix the 2D⇄3D switch runtime + rebuild, D-3D-08)

### Fixed
- **Switch confirm emitted "Phaser is not defined" + restarted the old game; the rebuild
  then failed (twice).** The switch flipped the runner to three.js while the VFS still held
  the 2D Phaser files, so they ran under the 3D global; and the rebuild agent saw those 2D
  files and tried to edit them. Now confirming a switch **resets the VFS to the target engine's
  clean starter** (`resetEngine` = PATCH engine + `saveVfs` the starter) and flips the runner +
  shows that starter together — so no old files run under the new engine — then the agent
  rebuilds from the clean scaffold using a **port prompt** that carries the original game idea
  (the landing prompt), not the raw "make it 3D".

## 2026-06-23 (Game Studio 3D — wire engine end-to-end + 2D⇄3D switch, D-3D-07/08)

### Fixed
- **"Create a 3D game" was broken** — the create call hardcoded `template: 'phaser_blank'`, so a
  3D project was seeded with the 2D Phaser scaffold (stray `src/scenes/`), and the runtime never
  knew the engine so it loaded the Phaser global → the agent's three.js code threw "THREE is not
  available". Now `createGameProject` omits the template (the backend infers 2D/3D from the prompt
  and seeds the matching blank starter, D-3D-07), and the project's `engine` is loaded and threaded
  PlaygroundApp → Workspace → GameRunnerPane → GameFrame so the runner injects the right vendored
  global + control shim.

### Added
- **Kid-confirmed 2D⇄3D engine switch (D-3D-08).** Saying "make it 3D" / "turn it back to 2D" on an
  existing game is detected as a switch intent (`panes/engineSwitch.ts`: needs a switch verb + a
  clear other-engine cue, so "add 3D shadows" stays a normal edit) and — unlike every other game
  turn — is NOT auto-applied. It stages a **confirm card** ("Rebuild your whole game?") via the
  existing `pending`/`PendingCard` gate; on confirm it flips the engine (`PATCH /projects/:id`),
  re-points the runner, and rebuilds by re-running the request through the now-3D agent; on cancel
  nothing changes. `CodeProject.engine` + `setProjectEngine` added to the API client.
- **Second game engine — three.js (3D) runtime foundation** (`learn-game-studio-3d-prd.md`
  M3D-1/M3D-2, frontend slice). Phaser (2D) stays the default and is byte-identical.
  - `vite.config.ts`: generalized the `vendor-phaser` plugin → **`vendor-engines`**. Phaser's UMD
    global is still copied verbatim; **three.js (ESM-only since r160) is esbuild-bundled into a
    `window.THREE` global IIFE** (+ a curated addon set, currently `OrbitControls`) at
    `public/vendor/three-<v>.global.js` on every dev/build. Version-pinned (`THREE_VERSION`,
    throws on drift) — **no CDN** (platform rule), same contract as Phaser.
  - `buildGamePreview.ts`: introduced an **`EngineProfile`** (D-3D-03) that parameterizes only the
    engine-coupled srcdoc pieces — the vendored `<script src>`, the load guard, and the control
    shim. `BuildGameOptions.engine?: 'phaser' | 'three'` (default `phaser`, back-compat). Added the
    **three.js control shim** (D-3D-04): no `Phaser.Game` to wrap, so pause/resume/mute/snapshot
    ride a documented `window.__game` contract and FPS is read from the renderer's own frame
    counter (a stalled game reads 0) — **same `postMessage` wire protocol** as Phaser.
  - Installed `three@0.184.0` + `@types/three`.
  - `GameFrame` accepts an `engine` prop (default `phaser`) threaded into the builder; added
    `threeStarter.ts` (a lit, orbit-able spinning-cube three.js starter that follows the
    `window.__game` runtime contract — basis for the future `three_spin` template).
  - **DEV-only `/playground-sandbox`** route (`EngineSandboxDevPage`, `import.meta.env.DEV`-gated,
    excluded from prod) — a no-auth harness that runs the REAL `GameFrame` for either engine via a
    2D/3D toggle (`?engine=phaser|three`). Verified in headless Chromium: both engines render a
    canvas with positive FPS (Phaser 60, three.js 119) and zero game console errors.

### Tests
- `buildGamePreview.test.ts`: engine-profile suite — `engine` omitted ≡ `phaser` (byte-identical),
  `three` loads the three global + three control shim and not Phaser, kid script ranges +
  `//# sourceURL` + sandbox shell stay engine-agnostic, and both engines speak the same control
  wire protocol. (9/9 green; typecheck + production build green with the three global vendored.)

## 2026-06-22 (Live Mode — live focus presence, D-LIVE-3)

### Added
- **Report the kid's currently-open project to the teacher (D-LIVE-3).** New
  `src/pages/learn/liveClass/reportFocus.ts`: `useReportFocus(projectId, kind, title?, readOnly?)` emits
  `class.kid_focus { project_id, kind, title }` on the **kid** socket on mount and clears it (`project_id:null`)
  on unmount; **no-op outside a live class (`useKidClassId()` falsy) or in the teacher read-only viewer
  (`readOnly`)**. A module-level shared focus ref is re-emitted on the existing 10s heartbeat in `LearnLayout`
  so a teacher who opens Live Mode mid-session syncs within ~10s. Wired into the three VFS studios:
  `BlocksStudioPage` (kind `blocks`, project name as title), `code/CodeStudioPage` (kind `code`, `studio.title`),
  `playground/PlaygroundApp` (kind `game`). Compliance: ids + kind + title only, never file contents (C5).

### Tests
- `reportFocus.test.tsx`: emits on mount with project + kind + title; clears on unmount; no-op when not in a
  class / in readOnly / no projectId; the heartbeat re-emit (`reEmitFocus`) replays the current focus.

## 2026-06-22 (Live Mode — raise-hand + teacher nudge banner)

### Added
- **One-tap raise-hand in the Blocks + Game studios (D-LIVE-1, learn-game-studio J4).** New shared store/hook
  `src/pages/learn/liveClass/raiseHand.ts` (Zustand) — `raise()` / `lowerOwn()` emit `class.raise_hand` /
  `class.lower_hand` on the **kid** socket (no payload — the server takes class+kid from the JWT), and a
  `class.hand_lowered` listener syncs the button back to idle when the **teacher** lowers it. New
  `RaiseHandButton` (testids `ask-teacher` → `raise-hand-waiting`; a calm persistent "✋ Hand up · tap to
  lower" cue, not an alarm) wired into the Blocks studio top bar (`BlocksStudioPage`) and the Game studio
  taskbar (`desktop/Taskbar`, covers both Window + Split layouts). **Hidden in the teacher read-only viewer
  and when the kid is not in a class.**
- **In-class signal via the JWT `class_id` claim.** New `getKidClassId()` / `useKidClassId()` selectors in
  `authStore` decode the (unverified, UX-only) kid token to know whether the kid is in a live class — the
  same claim the WS gateway auto-joins on. Server remains authz source of truth.
- **Transient teacher→kid nudge banner (D-LIVE-2).** New `NudgeBanner` (hosted once in `LearnLayout`, like
  the heartbeat, so it shows across every studio) listens for `kid.nudge` and shows "✋ coming to help!"
  (canned) or the teacher's short note with an [OK] dismiss + auto-dismiss. **One-way only** — there is no
  reply control / text input (not a chat, no DMs).
- Tests: `raiseHand`/`RaiseHandButton` (visibility gating + raise/lower emits + teacher-lowered sync),
  `NudgeBanner` (canned vs note copy, no-reply one-way shape, dismiss), `authStore` (`class_id` claim decode,
  malformed-token safety).
## 2026-06-23

### Added
- **Game Studio Asset Viewer: a "Class" tab for the teacher's class shared asset library**
  (class-shared-assets-prd). When a kid's game project belongs to a class, the Asset Viewer
  shows a new **Class** source tab alongside Library / My assets, listing the media a teacher
  prepared for that class (`GET /projects/:id/class-assets` → `ClassAssetView[]`, via the
  shared `api` client). The tab appears **only** when the backend returns assets — the gate
  returns `[]` unless the project is class work for a class the kid is enrolled in (server is
  the source of truth for authz), so the frontend simply hides the tab when the list is empty
  (and never restores a persisted `class` source when none exist). Each asset previews by its
  short-lived signed `download_url`; **"Add to my game"** downloads those bytes, converts them
  to a `data:` URL, and copies them into the VFS at `assets/class/<name>` (deduped like an
  import) so the asset becomes a normal "My asset" — the signed URL is **never** referenced
  inside the sandboxed game (playground security model: a class asset enters the game only as
  a VFS file, exactly like an import). Copy-code-ref is offered too. In the teacher live
  read-only viewer (D-LV-6) "Add to my game" is hidden; preview/copy stay. New
  `panes/ClassAssets.tsx` (grid + detail), `listClassAssets` / `fetchAssetDataUrl` /
  `ClassAssetView` in `panes/playgroundApi.ts`, and `CLASS_ASSET_DIR` / `classAssetCodeRef`
  in `panes/assetMeta.ts`. Covered by `AssetViewerPane.classAssets.test.tsx`,
  `playgroundApi.test.ts`, and the umbrella harness journey `kid-class-asset`.
- **Class tab auto-refreshes live when the teacher changes the library** (class-shared-assets-prd):
  `Workspace` subscribes (via `useWsEvent`) to `class.asset_added` / `class.asset_removed` /
  `class.assets_copied` and invalidates the `['project', id, 'class-assets']` query, so a kid
  with the Asset Viewer open sees a newly-uploaded asset appear (or a removed one disappear)
  without reloading. The backend pushes a `class_id`-only signal to the enrolled kid's private
  socket room. Proven by the `kid-class-asset` journey (teacher uploads while the kid views →
  grid grows, no reload).

### Added
- **Full-screen image lightbox in the Asset Viewer** — image previews (My assets, Library, and
  Class) gain an **Enlarge** affordance (also click the image) that opens a zoomable full-screen
  overlay: zoom via +/− buttons, the mouse wheel, or the +/− keys; drag to pan; reset; close on
  ✕ / backdrop / Esc. New `panes/ImageLightbox.tsx` (rendered through a portal to `<body>` so the
  playground's transformed `react-rnd` window can't clip it). Covered by `ImageLightbox.test.tsx`,
  a wiring case in `AssetViewerPane.classAssets.test.tsx`, and the `kid-class-asset` journey.

### Changed
- **"Use it in your code" → "Copy {image/sound/video} reference"** in the Asset Viewer detail
  (all sources). Kids vibe-code through the chat, not by hand-pasting Phaser code, so the copied
  payload is now just the asset's **bare reference** — its VFS path (e.g. `assets/class/hero.png`),
  or the stable URL for a shared-library asset — instead of a `this.load.image(...)` snippet. The
  kid pastes it into the chat and the agent reads/loads it. Heading is kind-aware (`referenceLabel`);
  helpers renamed `codeRefFor`/`libraryCodeRef`/`classAssetCodeRef` →
  `assetChatRef`/`libraryChatRef`/`classAssetChatRef` in `assetMeta.ts`; a hint line tells the kid
  to paste it into the chat. ("Add to my game" still injects real loader code via `assetInsert.ts`.)
- **Asset Viewer source tabs fit one line with the Class tab present** — labels shortened
  ("My assets" → **"Mine"**) and made `whitespace-nowrap`/`truncate` so Library / Mine / Class
  no longer wrap in the narrow rail (testids unchanged: `asset-source-mine` etc.).

### Fixed
- **WS socket reuse (`lib/ws.ts`)**: `getSocket` no longer tears down a still-connecting socket
  on every call — it reuses the existing socket unless the token genuinely changed (a new
  login). Several concurrent subscribers (IncidentBanner + the playground Class-asset listeners)
  calling `getSocket` during the connect window caused a connect/disconnect storm that left
  listeners bound to discarded socket instances (so live events never arrived). New `ws.test.ts`.

## 2026-06-22

### Fixed
- **Game Studio: an unavailable AI/safety service now shows a general error page, not the
  "your idea was a bit too rough" safety deflection.** When the input safety gate could not
  run (a classifier outage, or — common in local dev — the LLM provider not configured),
  the backend used to fail closed with `MODERATION_REJECTED`, indistinguishable from a real
  content block. So *every* prompt, however gentle, opened the workspace with the "too rough"
  message. The backend now returns a distinct `SAFETY_UNAVAILABLE` (503) for the
  service-can't-run case; `GeneratingScreen` routes it to `onError('service')` and
  `PlaygroundApp`'s `LoadErrorScreen` shows a general "something went wrong, try again"
  page (a real content refusal still opens the studio with the gentle deflection). The
  chat-edit path already maps 503 → a general "couldn't reach the AI" message. Covered by
  `GeneratingScreen.test.tsx` (`SAFETY_UNAVAILABLE` → error page, no workspace) and the
  umbrella harness journey `kid-playground-safety-unavailable`.

## 2026-06-21 (Blocks read-only viewer — edit controls DISABLED, not hidden — D-LV-6)

### Fixed
- **Teacher read-only Blocks studio now mirrors the kid's layout.** Read-only (`readOnly`) mode
  previously **HID** the edit-area controls (block palette, category bar, trash bin, add/remove
  character, add/remove page, scene/background picker, undo/redo), which broke the layout — an empty
  coding band and missing palette that no longer matched what the kid sees. These controls are now
  **RENDERED-but-DISABLED**: visible, inert (`pointer-events-none cursor-default`, `disabled` /
  `aria-disabled`), and subtly dimmed (`opacity-60`) via the shared `READONLY_EDIT_DISABLED` treatment.
  The viewed CONTENT (stage, characters, script chain, page thumbnails) stays full-opacity. The Home/back
  button stays HIDDEN (the viewer banner provides Back; a second back is wrong). Mutation handlers were
  already store-gated, so this is purely a stop-hiding + disable-visual change. `BlocksStudioPage.tsx`,
  `BlocksStudioPage.test.tsx` (read-only asserts controls PRESENT but non-interactive; kid mode stays
  interactive + Home present; mutation/autosave no-op proofs kept).
- **No more teacher 403s in the read-only Blocks viewer (kid-scoped write/read leaks).** Two calls fired
  for a teacher that only a kid may make: (1) the **on-load cover-thumbnail refresh** (`saveThumbnail`, a
  kid-scoped write) ran unconditionally — now gated behind `!readOnly`; (2) the **Share panel** ran its
  kid-scoped `getShareLink` query on mount — `BlocksSharePanel` now takes a `readOnly` prop that disables
  the query (`enabled: !readOnly`) and renders the Share button disabled + dimmed (visible for layout
  parity, never opens the sheet). Verified in a real browser: the teacher read-only Blocks viewer now
  loads with **zero 403s** and a layout identical to the kid's. `BlocksStudioPage.tsx`, `BlocksSharePanel.tsx`.

## 2026-06-20 (Class create sheet — second-level menu + Game Playground; "Tiny Game" rename)

### Added
- **"Create for this class" sheet now has a second-level menu (my-classes-prd §3.3).** Tapping the
  **Code Studio** tool no longer creates a blank `code` project directly — it opens an in-sheet sub-menu
  (with a `← Back`) offering **Web Code** (`{ kind:'code', template:'blank' }` → `/learn/code/:id`,
  today's behaviour) and **Game Playground** (`{ kind:'game', template:'phaser_blank' }` →
  `/learn/playground/:id`, matching `createGameProject` in `PlaygroundApp`). A game is now creatable
  directly from a class. All other tools (Blocks / Image / Music / Voice / Video) still create directly.
  Sub-types modelled via `CODE_SUBTYPES` / `SUBTYPES_BY_TOOL` in `CreateForClassSheet`; leaf create
  buttons keep `data-testid="create-tool"`, the sub-menu opener is `create-tool-submenu`, the back affordance
  `create-subtool-back`. New `CreateForClassSheet.test.tsx`.

### Changed
- **"Tiny Game" → "Game Playground" (display only).** The Code hub starter and all user-facing copy now
  read **Game Playground**; the internal template id `tiny_game` (routing / testids / template lookup) is
  unchanged. `codeApi.ts` starter `title`, plus clarifying comments in `router.tsx`,
  `LearnPlaygroundPage.tsx`, `CodeHubPage.tsx`. `codeApi.test.ts` asserts the renamed starter title.

## 2026-06-20 (Teacher LIVE viewer — render the kid's STUDIO EDITOR read-only — D-LV-6)

### Changed
- **Teacher LIVE viewer chrome → full-bleed "Style B" banner.** Dropped the bolted-on header + the
  bordered card frame around the studio. `TeacherProjectLivePage` is now **full-bleed** (`fixed inset-0`,
  breaking out of the centered TeacherLayout container) with a slim dark **"← · ● LIVE · You're watching
  <kid>'s project — <title> · 🔒 Read-only"** banner above the kid's own studio bar — so the teacher sees
  the studio exactly as the student does, with the live/read-only context on top. The studio's own
  **Home/back is hidden in `readOnly`** (blocks 🏠 now gated; code already gated) so the banner's Back is
  the only navigation (no bouncing a teacher into the kid Learn hub). `TeacherProjectLivePage.test` updated
  for the banner.

- **Teacher LIVE viewer now renders the kid's STUDIO EDITOR read-only**, not the read-only player
  (teacher-live-project-view-prd D-LV-6, supersedes the "render the player" part of v0.2). The teacher sees
  EXACTLY what the student sees while **building**: `game`→`PlaygroundApp`, `code`→`CodeStudioPage`,
  `blocks`→`BlocksStudioPage` — each with a new `readOnly` mode. `TeacherProjectLivePage` loads
  `GET /projects/:id` and renders the matching studio with `readOnly` + the projectId; it **remounts the
  studio** on each `project.vfs.changed` for this project so the kid's latest VFS re-loads live.
- Added a `readOnly?: boolean` prop to **`PlaygroundApp` / `Workspace` / `useGameAgent`**,
  **`CodeStudioPage` / `useCodeStudio` / `CodeChat`**, and **`BlocksStudioPage` / `blocksStore`**. In read-only:
  - **Every mutation entry point is gated.** Game: AI turns (send / confirm / reject / asset-gen / raise-hand /
    auto-fix), file create/rename/delete/move (FileTree), Monaco edits (editor `readOnly`), idle-autosave +
    all VFS/UI/chat persistence, asset upload / add-to-game / generate/remix. Code: chat composer + send +
    approve/reject (no-op + composer removed). Blocks: a single store gate on `_commit`/`undo`/`redo` makes
    every program mutation a no-op so `dirty` never advances (autosave can never fire), plus the palette,
    category bar, trash bin, add/remove character, add/remove page, scene picker, friend picker, undo/redo,
    block drag/tap-to-edit, and sprite drag are all disabled/hidden.
  - **Running stays live** (▶ Go! / Run anew / Play / tap-sprite-to-run / mute / theme) — non-destructive viewing.
  - **The kid-only wallet query is skipped** for a teacher (`user`) principal (game + code) — no family, no crash;
    balance is hidden ("—").
- The hard data backstop is unchanged: `PUT …/code/files` excludes `teacher`, so a teacher literally cannot save;
  the read-only client gating is the UX + defence-in-depth layer over it.
- The teacher-console deep-link (`…/teacher/projects/:id/live`) is unchanged and still works.

### Fixed
- **No dead edit affordances in the game read-only viewer (D-LV-6).** Two controls still rendered for a teacher
  even though their handlers were already gated (they call a no-op `send`), so a click did nothing — now they are
  hidden in `readOnly`: the Monaco **"✨ Explain this"** selection toolbar (its content widget + selection
  listener are no longer registered) and the Game Runner's **"Ask AI to fix"** console button.
- `useGameAgent` `cancelPending` / `lowerHand` / `retryLast` now early-return in `readOnly` (matching the other
  entry points) so the read-only contract is uniform and obvious, not merely inert-by-consequence.

### Tests
- `PlaygroundApp.readOnly.test.tsx` (new): a teacher (`user` principal, `family_id:null`) renders the game studio
  read-only without crashing and the kid-only **wallet + class** queries never fire; Monaco is non-editable, the
  FileTree CRUD buttons are absent + rows not draggable, and **no persist request is issued on mount**. Asserts the
  kid path is unchanged (editable Monaco, CRUD present, wallet/class queries fire).
- `GameRunnerPane.test.tsx`: asserts "Ask AI to fix" is hidden in `readOnly` (console still opens) and present for the kid.

## 2026-06-20 (Teacher — read-only LIVE project viewer — D-LV-1…5)

### Added
- **Teacher read-only LIVE project viewer** at `/teacher/projects/:projectId/live` (under `TeacherLayout`,
  `<ProtectedRoute kind="user">`). A teacher opens an enrolled kid's **class** project and watches it render
  **live, read-only** — no editor, no co-edit. Reuses the existing per-kind read-only renderers:
  `game`→`ReadOnlyGameFrame`, `code`→`PreviewFrame`, `blocks`→`ReadOnlyBlocksPlayer` (same wiring as
  `PublicPlayPage`; no duplication). Loads `GET /projects/:id` (kind/title/owner nickname) +
  `GET /projects/:id/code/files`, subscribes to the generalized **`project.vfs.changed`** WS event on the
  teacher socket and **refetches the VFS** so the renderer re-renders live for all three kinds. A small
  "👁 Watching live — read-only" header. `creative`/unknown kind → an honest "Live view isn't available for
  this project type yet" message (no crash); a 403/404 (server-enforced class-scope, D-LV-5) → a friendly error.

### Changed
- `useWsEvent` takes an optional `kind` (default `'kid'`) so the teacher (`user`) viewer can subscribe on
  the teacher socket.

## 2026-06-20 (Blocks Studio — autosave no longer reverts edits)

### Fixed
- **Blocks Studio: added/edited blocks no longer silently revert a few seconds later.**
  Autosaves weren't serialized. The save-version (`versionRef`) only advances when a save
  *returns*, so an edit made while a save was still in flight scheduled a second save that
  reused the same stale base `version` → the backend 409'd → the conflict handler reloaded
  the server's older snapshot via `load()`, discarding the in-flight edits (the canvas
  "travelled back in time"). Intermittent because it only triggered when an edit landed
  during an in-flight save (network-latency dependent). `BlocksStudioPage` now serializes
  autosaves with an in-flight mutex (`savingRef`) plus a trailing re-save (`pendingRef`):
  only one save runs at a time, and edits that arrive mid-save are persisted in a follow-up
  round using the version the previous save returned — eliminating the self-conflict.
  Genuine multi-device conflicts still surface kept-newest. Covered by a new
  `BlocksStudioPage` autosave-serialization test (red without the fix, green with it).

## 2026-06-19 (Learn — live wall-placement refresh)

### Fixed
- **Kid "My Works" now reacts to teacher wall placement live** —
  `ProjectsListPage` (`/learn/projects`) subscribes to the `wall.placement_changed`
  WS event (emitted to the kid socket by platform-backend `wall.service`
  `teacherPublish`/`teacherRemove`) and invalidates the kid projects query
  (`['projects','kid',kidId]`) so the placement badge updates without a manual
  refresh when a teacher publishes/removes a project to/from the class wall
  (`teacher-class-work-prd.md` §12.3, acceptance #5). Uses the standard
  `useWsEvent` idiom. New component test fires the event and asserts My Works
  refetches.

## 2026-06-16 (Teacher — "Student work" review view)

### Added
- **"Student work" view** in the teacher dashboard `ClassDashboardPage`
  (`/teacher/classes/:classId`) — `teacher-class-work-prd.md` §3/§6. A
  between-sessions REVIEW gallery: a `Live | Student work` tab; the Student-work
  tab renders, per enrolled kid, that kid's **class-work + on-the-wall** projects
  (thumbnail, title, kind, working/finished status, 🏫 on-wall badge) from the new
  `GET /classes/:id/student-work` (`getStudentWork` in `classApi.ts`). Opening a
  card reuses the EXISTING per-kid read-only route
  (`/teacher/classes/:classId/kids/:kidId` → `LiveViewPage`) — no new viewer. The
  live raised-hands queue is unchanged (the "who needs help" signal stays put,
  D-TCW-2). Design-system classes only (no raw hex); nickname-only — never kid
  PII; personal projects are never shown (server-enforced). New
  `StudentWorkView.tsx` + `StudentWorkView.test.tsx` (renders per-kid cards,
  asserts the GET call, opens a project via the existing route, empty state).

### Fixed
- **Student-work thumbnail** rendered the project's `thumbnail_s3_key` through a
  non-existent `/artifacts/:key` route (no such served path — the backend exposes
  artifacts only via signed download URLs), so previews always 404'd to the "no
  preview yet" fallback. Now renders the bare key as `<img src>`, matching the
  sibling kid `WorkCard`.

## 2026-06-16 (Learn — "My Classes" kid surface + project placement lifecycle)

### Added
- **My Classes** kid surface (my-classes-prd §2–§4), translating the approved
  `mocks/my-classes/` design to React + the K-12 design system (no raw hex):
  - **My Classes list** (`ClassroomListPage`) — enriched cards from
    `GET /classes/mine` (`ClassMineSummary`: cover, teacher + avatar, classmate
    count, progress bar, live/next chip, stars). **Active** + **Finished**
    sections; existing empty state preserved. `classCover.ts` gives each class a
    stable K-12 gradient + emoji fallback when there's no `cover_image_url`.
  - **Class hub** (`ClassHubPage`, replaces `ClassWallViewPage` at
    `/learn/classroom/:classId`) — tabbed shell: **Wall** (existing wall +
    6-emoji `ReactionBar`) · **My work** (the kid's projects for this class) ·
    **Lessons** · **Next class** (NO Classmates tab, D-MC-12). Lessons / Next
    class show a graceful "coming soon" until the kid sessions/progress reads
    exist (deferred — see below). In-place **"Create for this class"** sheet
    (`CreateForClassSheet`) — course-allowed tool gating is a TODO (backend
    `allowed_kinds` not built); shows the kid's permitted Create tools, defaults
    new work to **class work**.
  - **My Works** (`ProjectsListPage`) regrouped (my-classes-prd §3.4): segmented
    tabs **All · Personal · <each enrolled class>**; cards open the studio; a
    **⋯** placement menu wired to `PATCH /projects/:id/placement`
    (`WorkCard` + `usePlacement`): Personal → "Use for a class" (class picker);
    Class work → "Share with the whole class" (existing wall path) + "Move to
    Personal"; On the wall → "Take off the wall" + "Move to Personal". A `public`
    (internet-visible) work is its own honest, **non-mutable** placement ("Shared
    to the world" 🌐 badge, no ⋯ menu) — changing it stays behind the teacher+parent
    double-consent gate, never the kid menu (my-classes-prd §11). Visibility badge
    (Personal / Class work / On the wall / Public, Lucide icons) is separate from the
    Working/Finished status tag. Destructive "Move to Personal" requires a confirm
    (PRD §3.2); "Use for a class" shows the teacher-visibility consequence.

### Changed
- **Learn top-nav label** `Class wall` → **`My Classes`** (route
  `/learn/classroom` unchanged).
- **Create tab** (`CreateHubPage`) reframed as **personal-only** (default 🔒
  private); the in-class create flow lives in the hub sheet (no jump to Create).
  Tool list extracted to shared `create/createTools.ts` (reused by the sheet).
- `classroomApi.ts` — added `ClassMineSummary` + `listMyClasses()`, the
  `PATCH /projects/:id/placement` mover (`updatePlacement`, `PlacementAction`),
  and the four-state `ProjectVisibility` (`private | class_work | class | public`).

### Deferred / stubbed
- **Lessons** + **Next class** hub tabs render "coming soon" — they need the kid
  curriculum/progress + redacted sessions reads (my-classes-prd §6 V2). No
  fabricated data.
- **Course-allowed project kinds** in the "Create for this class" sheet (D-MC-11)
  — `CoursePack.allowed_kinds` isn't built; the sheet shows the kid's full
  permitted tool set with a code TODO.
- **Class-association from the "Create for this class" sheet** — the tool links
  still route to the bare studio route with no `class_id`, so work made there is
  not yet auto-attached to the class. The sheet copy is intentionally framed as
  intent ("can see it to help"), not a guarantee; flagged with a code TODO until
  the studios accept class context.

### Fixed
- **Privacy (review blocker):** a `public` (internet-visible) project was
  collapsed into the `on_wall` placement — it rendered the class-only "On the
  wall" badge and offered `take_off_wall` / `move_to_personal` on a
  double-consent project. `placementOf()` now maps `visibility:'public'` to a
  distinct `public` placement with an honest "Shared to the world" badge and
  **no** kid-mutable ⋯ menu (my-classes-prd §11; placement contract defines
  `take_off_wall`/`move_to_personal` only for `class`/`class_work`). Covered by
  new `WorkCard.test.tsx` cases.
- **Design-system:** removed the last inline hex tints (`text-[#8A6A00]` /
  `text-[#9A2861]`) from the placement badges (`WorkCard`) and the
  "Create for this class" sheet icon — now `text-ink` on the wash background, the
  established K-12 convention (DESIGN.md: no raw hex).

### Tests
- Component tests (vitest + Testing Library, `@/lib/api` mocked, no network):
  `ClassroomListPage.test.tsx` (enriched cards + Active/Finished + empty),
  `ProjectsListPage.test.tsx` (grouping + ⋯ placement menu asserting the PATCH
  action/class_id + destructive confirm), `ClassHubPage.test.tsx` (tab switching,
  no Classmates tab, coming-soon, create sheet), and a focused
  `WorkCard.test.tsx` (empty class-picker state, delete-only personal menu,
  outside-click close, class_work/on_wall menu actions, and the `public`
  honest-badge / no-mutable-actions privacy cases).
- **Harness:** the new frontend↔backend contracts (enriched `GET /classes/mine`
  / `PATCH /projects/:id/placement`) are logged as a blocked L3 gap in the
  umbrella `harness/COVERAGE.md` (backend endpoints not yet implemented — this is
  a FE-only diff with mocks-as-contract).

## 2026-06-16 (Learn + Portal — adopt the Lesson(content)/Mission(task) model split)

### Changed
- **Adopt the platform Mission/Lesson model split** (platform-backend
  `refactor/mission-to-lesson`). A pack's course content is now an ordered list of
  **Lessons (课节)** — `CoursePack → lessons[]` — and the kid's **Mission** is the TASK
  inside a Lesson (`Lesson → missions[]`). This supersedes PR #77, which had bluntly
  renamed **all** kid-facing "Mission" copy to "Lesson"; that was too broad under the new
  model. Reconciled to the real semantics:
  - **Content shape:** `course-packs` list & detail now consume `lessons[]` (each Lesson =
    `{ id, slug, title, description, order_index, missions: [] }`) instead of a flat
    `missions[]`. The pack content size = `lessons.length` (the numeric `mission_count` is
    still the total task count, no longer surfaced in copy).
  - **Catalog / 课节 = "Lesson":** Learn nav "Lessons", the catalog list, pack-detail
    headings, and per-pack/per-course counts stay "Lesson(s)" and now count Lessons.
  - **Task = "Mission" (restored):** in-classroom step eyebrows `Lesson step → Mission step`
    (`MissionCodeStep`, `MissionShareStep`), the code-step "meets the lesson → meets the
    mission" check, and the parent growth-tracker task studio (`kidGrowth.ts`: label
    `Lessons → Missions`, noun `lessons → missions`; key `mission` unchanged).
  - **Pack detail reworked** to `pack → Lessons (课节) → each Lesson's Mission task(s)`:
    every Lesson renders its nested Mission tasks, each with its own "Start →".
  - **Parent Portal course card** now shows `lessons.length` "lessons" (course-content
    count) instead of `mission_count`.
- **Renamed for clarity** (route id `/learn/missions` unchanged as the internal identifier):
  `MissionsListPage → LessonsCatalogPage`, `MissionDetailPage → PackLessonsPage`.

### Added
- `src/pages/learn/PackLessonsPage.test.tsx` — component test for the new
  pack → Lessons → Mission-task shape (lesson-count headline + nested task rendering).

### Changed (tests)
- `src/app/learnLessonCopy.test.tsx` now asserts the **split**: the catalog nav says
  "Lessons" (课节) while the kid TASK studio says "Missions".

## 2026-06-15 (test infra)

### Fixed
- **Vitest no longer collects specs from nested `.claude/worktrees/`.** A gitignored
  git worktree under `.claude/worktrees/` leaked its own copy of the unit tests (run
  twice) and its Playwright `e2e/` specs into `npm run test`, where the e2e specs fail
  under jsdom (`HTMLCanvasElement.getContext not implemented`). The existing `e2e/**`
  exclude only matched the repo root, not nested worktree copies. Added `**/.claude/**`
  to `test.exclude` in `vite.config.ts` so the unit run is the real specs only.

## 2026-06-13 (Portal — tutoring page English localisation)

### Changed
- **Tutoring page (`/portal/tutoring`) fully localised to English.** All hardcoded Chinese
  UI copy translated — bill intro, "Your classes", Private/Official badges, "Teachers:",
  "Upcoming sessions" + empty state, course-outline toggle, "Amount due" / "Pay" / "Redirecting…"
  / all-caught-up message, "Lesson charges" table (Class / Students / Rate/hour / Duration /
  Amount / Status headers, Paid/Due badges). Session date formatting switched from `zh-CN`
  to `en-AU` locale.

## 2026-06-13 (Try demos — share is now a guided beat, D-DEMO-09)

### Added
- **The `/try/playground` and `/try/blocks` demos now WALK the share flow** instead of
  hiding it (supersedes D-DEMO-08's share-hiding; PRD `try-demo-mode-prd.md` v0.10). The
  tour opens the REAL `ShareLinkPanel` / `BlocksSharePanel`, fires the real "ask a grown-up"
  request → genuine `pending` state, simulates the grown-up's approval (the one
  preview-framed beat — "let's pretend they approved 👍", never a faked backend response)
  → `active` link, then opens `/play/:shareId` in a REAL new tab: the unmodified
  `PublicPlayPage` (now with the D-GAME10e brand frame). Playground gains a 4-card share
  block (tour 16→20 cards); blocks a matching block before free explore.
- **`setDemoShareAdapter` seam** (`sharingApi.ts`): an in-memory share lifecycle
  (`none → pending → active`) so the real panels render their real states with ZERO network
  to `/projects*`/`/share*`. Reset on entry, pristine on reload.
- **Bundled public snapshots** (`demoSnapshot.playground.ts` + `demoSnapshot.blocks.ts`):
  `readPublicSnapshot` resolves the two fixed demo shareIds (`try-demo-playground`,
  `try-demo-blocks`) from build-time constants with ZERO network — so a real new tab (a
  fresh JS context with no demo install) renders the real public play page offline. Reuses
  the demo's own starter game / "Cat's Day Out" story — genuine product content, no PII.

### Changed
- The real share panels read `useDemoMode()` and hand the tour their open/request/approve/
  open-recipient affordances via a new `bindShareControls` context seam; in demo the panel's
  auto-close on outside-click/backdrop is suppressed so the tour's Next never dismisses it
  mid-beat. All off-by-default — zero change to the authed product (demo context is `null`
  there). `Taskbar` surfaces the Share button in the project-less playground demo via a
  fixed demo share project id.

## 2026-06-13 (Public play page — brand frame polish)

### Fixed
- **Public play brand logo now vertically centred.** The base `logo-white-horizontal.png`
  carries ~99px of empty canvas below the ink (artwork in y[3–200] of a 300px-tall image),
  so an `items-center` logo sat visibly high. Added a tightly-trimmed asset
  `logo-white-horizontal-trim.png` (888×201, no padding) used only by `PlayBrandBar`, so
  centring is correct with no magic offset.
- **Public play brand frame: larger, aligned logo + correct "Make your own" target.**
  The AirBotix logo in `PlayBrandBar` was too small (`h-4`) and read as misaligned next to
  the "· shared creation" label; it's now `h-7` on a slightly taller (`h-14`) bar, vertically
  centred and balanced. The "Make your own" CTA now points to the marketing **`/programs`**
  page (was `/try`) — `marketingHref('/programs')`, so prod → `airbotix.ai/programs` and dev
  → the marketing server's `/programs`. Test + e2e assertions updated to `/programs`.

## 2026-06-13

### Fixed
- **Game Studio: a manual edit made right after an AI turn no longer reverts ("we kept
  your newest copy").** An applied AI turn bumps `Project.vfs_version` server-side, but
  the turn result carried no version, so the studio's save-version (`versionRef`) went
  stale; the next autosave sent a stale `expected_version` → 409 → the server's pre-turn
  copy won, silently reverting the kid's edit. The backend now returns `version` in the
  turn result (`AgentTurnResult`), `useGameAgent` passes it to `onApplyFiles`, and
  `PlaygroundApp` adopts it into `versionRef` (new `applyTurnFiles`) so the post-turn save
  is no longer stale. Genuine multi-device conflicts still surface kept-newest. Covered by
  harness journey `kid-game-edit-after-turn` (red without the fix, green with it).
## 2026-06-13 (Public play page — brand frame + dark container)

### Added
- **Brand frame on the public play page (`/play/:shareId`).** A slim `PlayBrandBar`
  now sits ABOVE the play surface (never an overlay — it cannot intercept a game/sprite
  tap): the AirBotix logo links back to the marketing site, and one soft, **first-party**
  "Make your own" CTA links to `/programs`. Both open a **new tab**, so a logged-out visitor
  (e.g. grandma, or a friend the kid shared with) never loses the running game. No kid
  PII, no auth, no LLM, no third-party ads (minors-compliance C14). New `src/lib/marketing.ts`
  resolves the marketing origin (prod → airbotix.ai, dev → :3000, `VITE_MARKETING_URL`
  override), mirroring the demo's exit URL. (learn-game-studio-prd D-GAME10e.)

### Changed
- **The public play container now defaults to the DARK theme on both surfaces.**
  `ReadOnlyBlocksPlayer` was hard-pinned to `data-theme="light"`; the public player (its
  only consumer) now renders dark, so the bright scene art floats on a dark frame and
  matches the game canvas. Scene art is constant across themes; only the chrome follows
  `data-theme`. The 410 gone state is deliberately left frame-less (a flat, PII-free dead end).

### Tests
- `PublicPlayPage.test.tsx` — the brand frame renders above the game canvas and the blocks
  player, with the logo + first-party `/try` CTA both new-tab; the blocks player defaults to
  dark; the gone state stays frame-less. `e2e/sharing-remix.spec.ts` J8 asserts the frame is
  the only chrome (studio testids still absent).

## 2026-06-12 (Game Studio — WorkingCard simplified: one ring, one line)

### Changed
- **The in-chat WorkingCard is now ONE line with ONE indicator.** The old card stacked a
  heading ("Working on it…"), a determinate progress bar (% from completed-step count,
  capped at 92% — read as real progress a turn doesn't have), and a growing step list.
  Now: a single spinning brand ring whose arc breathes (SVG `stroke-dasharray` animation,
  new `pg-ring-arc`; amber tones during the silent "fixing" beat) next to the current-state
  label — the latest real tool-delta label (e.g. "Adding Aliens ✍️"), or generic rotating
  fillers (`currentStateLabel`, 4s cadence) before the first delta lands. The heading was
  redundant with the state line; the bar was a second indicator with too much movement.
  Header clock stays; the "live" badge and per-step timers are gone too — the animated
  ring already signals liveness.

## 2026-06-12 
### Fixed (playground syntax-error locations, D-PAP-30)
- Syntax errors in a game now reach the console — and the AI self-fix
  round-trip — with the kid's real **file:line**. A script that fails to parse
  never gets its `//# sourceURL` applied, so the browser reported
  `about:srcdoc:N` (or nothing); `buildGamePreview` now returns each script's
  line range inside the srcdoc and `GameFrame` resolves error locations through
  it (`resolveErrorLoc`), dropping untranslatable host-chrome locations rather
  than misleading the fixer.

### Changed (blocks scroll polish)
- Every scrolling studio zone (character/page rails, category bar, palette,
  program area) now uses `FadeScroller`: native scrollbars are hidden (the
  custom `::-webkit-scrollbar` theme rendered as permanent gray bars on
  tablets); an iOS-style overlay thumb hugging the card edge (2px, inside the
  rounded corners) appears while scrolling and fades away when idle; and the
  edges fade ONLY towards hidden content (scroll-position-driven mask vars) —
  at a resting end nothing looks cut off. Same only-where-hidden fade idea as
  the playground HistoryPanel, generalised with the overlay thumb.

### Fixed (blocks portrait layout)
- Blocks Studio portrait/tablet layout no longer collapses: the zone-tag chips
  (D-BLK-13) kept their landscape column-header style (`width: 100%`) inside the
  portrait horizontal strips, so each tag swallowed its whole row and pushed the
  character thumbs, page thumbs and all six category buttons off-screen. In
  portrait the tags are now compact leading chips.
- Narrow portrait screens (≲530px) no longer clip ▶ Go! / the bin off the right
  edge: the studio's grid rows now shrink to the column (`min-width: 0`) and the
  toolbar title block truncates instead of widening the app.

### Fixed (tour navigation & placement)
- "Change a number" (blocks tour) anchors to the SIDES only — anchoring above the
  track covered the palette the card tells the user to drag from (caught by the
  harness journey's real palette click); falls back to its static top-right.

- Blocks demo: the story plays only on the FIRST arrival at the Press-Go card —
  after browsing Back, going forward just navigates (frontier semantics, like the
  playground), and a user's own Go press on a revisit is plain exploration.
- Tour cards no longer flash in from screen corners when a step's target is still
  resolving (an opening window, a not-yet-popped toolbar): the card HOLDS its last
  position until the new anchor lands ('pending' vs 'no-fit' anchor states).
- Landing card never touches the prompt box: anchors LEFT only, with fit decisions
  using the card's nominal width (a first-frame narrow measurement could approve a
  side the full card then overflowed onto the target); narrow viewports use the
  beside-input left column.


### Changed (anchored tour cards)
- **Tour cards now sit CLOSE to the spotlight area** (both demos): the card anchors
  beside the spotlit rect like a popover — first side with room (below → above →
  right → left), centred on the target, viewport-clamped — and FLIP-glides as the
  spotlight moves (in-flight overrides, dragged windows, layout flips). Cards can
  prefer/exclude sides (`anchorPrefer`): the landing card anchors LEFT of the
  prompt box and never 'above' (the studio logo lives there). Static placements
  remain only as fallback for no-spotlight cards (intro, finale), narrow-viewport
  misses, and during the opening sweep.


### Changed (Cat's Day Out — the run owns the spotlight)
- The "Press ▶ Go!" card now PLAYS the story properly: its Next presses the REAL
  Go button for the user (label "▶ Press Go!"), and whether Go was pressed by the
  tour or by the user's own finger, the spotlight moves to the STAGE for the whole
  run ("Playing… 🎬" while the animation lasts) and the tour advances itself when
  the story finishes — onto a card that also spotlights the stage, so the handoff
  is zero-movement. Two inert seams in the studio (`bindBlocksGo`, `onStoryRun`
  around the real flag-run lifecycle).


### Changed (tour polish — motion & dark theme)
- **Tour cards GLIDE between positions** (FLIP, 350ms) when a step or a
  Windows↔Split flip repositions them — no more teleporting; reduced-motion safe.
- **Spotlight redesigned as DE-EMPHASIS — both themes**: everything outside the
  rounded cut-out is softened behind an evenodd clip-path hole — 1px blur (text
  stays readable), theme-tuned dim, and dark = full grayscale while light keeps
  its hues at saturate 0.35 ("less colorful", not gray). The spotlight area is
  the only place with full fidelity. The ink box-shadow scrim is retired; the
  modal intro backdrop uses the same treatment (plus a light tint). Both demos
  share the effect.
- **Tour cards match the studio theme**: dark workspaces get an ink card with light
  text + hairline ring (titles explicitly colored — a global heading rule was
  leaving them ink-on-ink), still highly visible over the de-emphasized backdrop.

(theme-aware demo tour scrim)

### Fixed
- **The demo tour's spotlight scrim now reads on dark UIs.** The scrim was
  ink@50% (`shadow-spotlight-scrim`) — fine over the light studio, imperceptible
  over dark panels, so a dark-mode tour appeared to highlight nothing. The demo
  pages now pass `darkUi` from their studio's LIVE theme store
  (`usePlaygroundStore.theme` / `useBlocksTheme`) and the overlay picks the new
  `shadow-spotlight-scrim-dark` token (black@70%) — the modal backdrop follows
  the same rule (`bg-black/70` on dark). Store subscription, so a mid-tour
  theme flip re-picks the scrim immediately.

## 2026-06-12 (Guide pane dark-mode theming)

### Fixed
- **Game Guide dark mode:** the playground theme blocks now pin `color-scheme`
  (`light`/`dark` per `data-theme`), so UA-rendered chrome — native scrollbars
  on Windows / "always show" macOS, form-control internals — follows the
  workspace theme instead of staying light over the dark UI. The Guide's two
  scroll containers (nav + reader) also adopt the themed `.pg-scroll` slim bar
  (the chat-log convention); the pane's chrome/doc body/search/diagrams were
  already `pg-*`-tokened and verified readable in dark.

## 2026-06-12 (layout-proof demo tour)

### Fixed
- **The playground demo tour now works in BOTH workspace layouts** (Windows AND
  Split), including a Windows↔Split flip at ANY tour step:
  - Panel spotlights are layout-proof selector pairs
    (`[data-window="…"], [data-pane="…"]` via `panelSpotlight`): the floating
    window in Window mode, the split region in Split mode. New inert
    `data-pane` seams mark the split layout's tab region + Game pane
    (`Workspace.tsx`); `spotlightPanel` parses either form.
  - `focusPanel` (and the chat/editor handlers built on it) reads the layout at
    CALL time, so a handler the tour holds across a mid-tour flip routes through
    the layout actually on screen (split → the real Chat/Code/Assets/Guide tab,
    via the same setter the tab strip uses; `game` is a no-op there).
  - A mid-tour layout flip re-fronts the surface the visible card (or in-flight
    override) spotlights — same rule as back/forward browsing.
  - Asset generate/remix land their details AFTER My Assets is re-surfaced (the
    split layout unmounts the pane while the chat has the stage; the remount
    must re-bind the seam before the details open).
- **Pending editor jumps survive a fresh Monaco mount.** `@monaco-editor/react`
  freezes `onMount` at first render, so the "pending jump lands once the editor
  exists" fallback read a permanently-stale `jumpTo` — a changed-file tap /
  explain-select that OPENED the editor (always in Split mode, first open in
  Window mode) lost its jump+highlight/selection. Now read through a ref.

### CI
- e2e: `try-demo-smoke` gains a full 16-card SPLIT-layout tour walk with
  mid-tour Windows↔Split flips (spotlight re-resolution asserted at the error
  card); unit: `tourSpotlights.layout.test.tsx` renders the real Workspace
  shell in both layouts and asserts every panel spotlight resolves + live
  focusPanel routing through a pre-flip handler.

## 2026-06-12 (Guide pane — responsive)

### Fixed
- **The Guide reads well at ANY width.** Below 480px the two-column layout
  collapsed text into a sliver; the pane now goes single-column — the reader
  full-width, with a "☰ Topics" header chip flipping to the full-width topic
  list + search (mobile-docs pattern). Applies wherever the Guide is narrow:
  its chat-respecting spawn column, user resizes, the demo tour. Unit-tested
  (collapse threshold, toggle round-trip, wide layout untouched).
- The DEMO tour opens the Guide WIDE (560–720px via the real window-resize
  affordance, rect set pre-mount — react-rnd seeds geometry at mount only), so
  the tour showcases the two-column layout: topics and content together. Real
  users' own opens keep the chat-respecting spawn + responsive collapse.

## 2026-06-12 (Guide placement)

### Fixed
- **The Guide window never buries the conversation's latest messages.**
  (1) Spawn: TOP-LEFT of the chat — a reading column fully beside it when ≥250px
  fits (the chat launch x nudged 0.29→0.31W to make that true on common laptops),
  else a short top strip that leaves the chat's input + newest replies clear.
  (2) Layout flips: entering window mode with an open Guide overlapping the chat
  (e.g. dragged there) relocates it to the no-overlap spot, computed against where
  the chat ACTUALLY is. Placement + flip behaviour unit-tested.
- **Tour spotlights are always visible**: every card advance fronts the surface its
  spotlight points at (window mode: on top of all windows; split: its tab active) —
  universal guarantee, idempotent with the action/restart/flip refocus paths.
- **Split mode: tour cards never sit on the conversation's tail.** The chat fills
  the left region in split, so `bottom-left` cards are remapped to a new `top-left`
  placement (over the OLDEST messages) — the latest reply + input stay readable.

## 2026-06-12 (clean demo console)

### Fixed
- **No more scary DevTools noise on the public demos.** (1) Browser-extension
  noise guard, first script in every game/preview srcdoc: wallet extensions
  (Coinbase, MetaMask, …) inject providers into every frame, and inside our
  deliberately opaque-origin sandbox their `localStorage` touch throws an
  uncaught SecurityError — now cancelled before the browser logs it, and
  filtered from the kid-facing runner console. Page-world only (isolated
  content-script errors are browser-level and unreachable by any site). The
  sandbox itself is untouched — never "fix" this with `allow-same-origin`.
  (2) `/try/*` skips the app's `/auth/refresh` bootstrap — anonymous by design
  (D-DEMO-01), so the two guaranteed 401s are gone from the demo console.

## 2026-06-12

### Changed (tour pacing & navigation)
- Back/forward browsing re-fronts the window each card's spotlight points at —
  the discussed surface is always on top, not whatever the last action left focused.
  Element-level spotlights map to their HOST window (✨ toolbar → Code Editor,
  generate/remix prompts → Asset Viewer, console → Game Runner).
- Scripted replies take a readable beat (700ms → 1.8s) so the "Airo is working…"
  state is actually seen.
- Asset generation/remix now plays fully in the chat (spotlit from the click):
  the "Conjuring…" progress and the finished sticker bubble are seen scrolled
  into view, held ~1.6s, and only then does My Assets surface with the card swap.


### Fixed (spotlight timing)
- In-flight tour steps spotlight the surface where the action is HAPPENING from
  the moment Next is CLICKED, instead of jumping only when the result settled:
  chat for the scripted asks + the explain fire (before the message even sends),
  the Asset Viewer for generate and remix (while the art is being made). The
  engine raises a spotlight override at fire-time; the following card spotlights
  the same surface, so it lands with zero mask movement — killing the jank at
  the busiest moment of the turn.


### Changed (playground tour v3 — 16 cards, real Asset Viewer UI, jank pass)
- **Tour grows 13 → 16 cards** (`demoTour.playground.ts`, PRD §3 v0.9): the
  explain beat is two cards (select the snippet → the live "✨ Explain this"
  toolbar pops + is spotlighted → fire its real handler), and the beautify loop
  drives the Asset Viewer's REAL UI — the tour types the wish into the pane's
  real generate box (new card, prompt-box spotlight), submits its real
  ✨ Generate, opens the sticker's real details view with the remix wish typed
  into the real Remix bar (new card), submits the real Remix, then opens the
  landed remix's own details. New tiny default-off seams: `bindAssetPane` /
  `bindAssetRemix` (`demoMode.tsx`; registered by `AssetViewerPane`/`RemixBar`
  only under the demo provider).
- **Conversation cards spotlight the chat** ("One ask → one change",
  "Keep score", "Code that explains itself") and the after-edit auto-restart
  re-fronts the panel the next card spotlights (`restartThenRefocus` — the
  restart focuses the Game Runner, which used to bury the chat).
- **Jank pass**: heavy actions (chat sends, Monaco jumps, focus changes) defer
  behind a double-rAF so the card/spotlight transition paints first
  (`tourSequencing.ts`); the spotlight ring transitions ONLY its box geometry
  (not the giant scrim shadow) and ignores zero-size targets; cards remount per
  step with a 200ms rise/fade entrance (`animate-tour-card-in`, reduced-motion
  safe); two window focuses never land in the same frame.
- `capture-try-scenes.mjs` walk is now title-driven (`nextUntil`) so card-count
  changes don't break it; e2e smoke + umbrella harness journey updated to the
  16-card flow; new unit tests (`tourSequencing.test.ts`,
  `demoAssetPaneSeam.test.tsx`, tour-data v3 suite).

### Added (marketing-preview parity)
- `scripts/capture-try-scenes.mjs` — one-command recapture of the marketing /try
  preview scenes from the live demos (1600px JPEG q80 → `airbotix/public/media/try/`).
  AGENTS.md (root rule 3 + `src/pages/try/`) now mandates recapturing whenever the
  workspace UX changes (either studio or future demos); PRD D-DEMO-07 extended (v0.8).


### Added (tour spotlight)
- `DemoTourOverlay` steps can carry a `spotlight` selector: everything except the
  area the step points at is dimmed — one ring div whose giant box-shadow is the
  scrim, so the cut-out has properly ROUNDED corners — purely visual (nothing is
  blocked, the studio stays interactive). Every spotlight OPENS from the full
  viewport and shrinks onto its target (500ms ease-out; animates between targets
  on step change; reduced-motion safe); re-measures on resize/scroll. Wired into
  the Cat's Day Out tour: Go button, stage, "What they do" tracks, Pages rail
  (cards repositioned off their spotlights).
- Spotlight wired across the **Game Playground tour** too: every card except the
  free-explore finale highlights where to look (landing prompt box, Game Runner,
  Code Editor, Asset Viewer, console, Guide — via a new `data-window` attribute on
  the studio's floating windows + a `landing-prompt-box` testid, both inert).
  The mask now also TRACKS moving targets (light 250ms poll with change-detection)
  since playground windows are draggable.


### Fixed (zone labels refinement)
- Rail tags (Characters/Pages) no longer overflow their narrow columns — stacked
  variant (emoji above one tiny word, spanning the column like a header) with
  ellipsis as a safety net; the block-category bar gained its missing tag
  ("🧰 Kinds", full-width header above the buttons; aria updated to match).


### Added
- **Blocks Studio zone labels (clarity pass).** Every studio area now wears a small
  emoji-first name tag for pre-readers (ages 5–8): 🎬 Stage, 🐱 Characters, 📖 Pages,
  🧩 Blocks (palette), ✨ What they do (program area). Chips are decoration only
  (`pointer-events: none`, `aria-hidden`; each zone carries a matching `aria-label`),
  theme-aware via the existing `--bsx-*` tokens, tinted with the same category colour
  as each zone's wash, hidden in present mode and while a block drag is live, and
  shrink to emoji-only under 640px. The program empty-state copy now matches its label
  ("Tap a 🚩 block to pick what ⟨name⟩ does ✨"). `/try/blocks` inherits via parity.

### Changed
- `/try/blocks` always opens in the LIGHT theme (the story art is daylight-first),
  regardless of system preference or a stored studio override — store-only set on
  demo install, never written to localStorage, so a real user's saved theme is
  untouched.


### Fixed (review pass)
- Tour robustness guards from the adversarial review: the landing "Create the game" fires
  once per (long) recovery window — a slow build can no longer be double-submitted; asset
  generate/remix retries are throttled to ~2s (was every 250ms) so a failed generation
  can't spam the chat.


### Changed
- **`/try/playground` tour refinement pass (try-demo-mode-prd §3 v0.6, 8 tweaks).**
  (1) Only the tour card creates the game: the landing's own send button is disabled and
  Enter is inert while the demo locks the prompt (2-line conditional in `LandingScreen`).
  (2) The generating phase now plays the REAL first-build progress UI: a `demoBuild` branch
  in `GeneratingScreen` feeds the bundled starter's files through the same thinking →
  building (file-by-file reveal) → done pipeline a real streamed turn drives, and the new
  canned `firstTurnReply` seeds the workspace chat exactly like a real first turn (no more
  generic loading screen + starter message). (3) The acting window always comes to front:
  scripted chat asks focus the Chat window before sending (diff/explain/asset/guide/run
  already focused theirs). (4) The explain step now SHOWS the real "✨ Explain this"
  floating toolbar first: the editor jump gained an optional `select` mode
  (`openFileAt(..., select)` → Monaco `setSelection` through the REAL selection pipeline,
  so the toolbar pops over the snippet), holds the beat ~1.6s, then fires the toolbar's own
  handler. (5) "Make it beautiful" is now a 3-card loop that closes: generate the apple
  sticker → remix it golden → a new scripted edit wires the remixed asset in as the game's
  apple (+ auto-restart, so the user sees THEIR art in-game). Demo generations serve
  hand-crafted SVG art (gradient/shaded apple + golden sparkly remix + a glossy generic
  fallback, `demoAssets.playground.ts`) via a new `setDemoAssetGen` seam — the real offline
  stub's deterministic swatches are untouched. (7) The console's real "Ask AI to fix"
  button continues the script: the scripted agent recognises the console's fix-request
  prompt (`consoleFixTrigger` + `isConsoleFixPrompt`, drift-alarmed against the exported
  `fixPrompt`) and replays the fix turn + advances the tour — no contact-us dead end.
  (8) The demo Game Guide now bundles the REAL corpus (verbatim copy of
  `platform-backend/src/help/help-content.ts`, drift-alarmed in tests against the sibling
  source) and the guide step opens directly on the most diagram-rich page
  (`engine/scenes-and-the-game-loop`, 2 diagrams) via a new `openGuide` studio control.
  Tour is now 13 cards; script v3 (6 steps). e2e smoke updated (13-card walk + landing
  inert + console-button path); unit tests cover every new seam.

### Fixed
- **Game Runner console now auto-scrolls to the latest output.** The console's scroll
  container had no scroll management: it opened scrolled to the TOP, so the newest line —
  including the very error that auto-opened it — could sit out of view, and new output kept
  appending below the fold. The line list is now a `ConsoleList` component on the chat's
  `useStickToBottom` state machine: opening the panel starts pinned at the latest line, new
  lines keep the view glued while the kid is at/near the bottom, and a deliberate scroll-up
  releases the pin (no yanking). Component tests cover open-at-bottom, follow, and no-yank.

### Added
- **`/try/playground` T1 v2 full product tour** (try-demo-mode-prd §3 v0.5, 11 steps): the demo
  now starts on the REAL landing phase (prompt pre-filled + locked, chips/mic hidden; the step-1
  card sits beside the input and is not skippable; "Create the game" drives the real create flow
  via a `bindLandingSubmit` seam); workspace entry auto-opens the Game Runner and starts the game;
  every scripted change auto-restarts it through the real run path. New tour beats: code-editor
  diff jump+highlight (the real changed-file-row path), select-code → "✨ Explain this" (scripted
  plain-words answer matching the real `buildExplainPrompt`), Asset Viewer generate + remix via the
  existing offline stubs, a deliberate bug turn (undefined method → real console error) followed by
  a scripted fix turn, and an in-studio Game Guide step served by a bundled offline corpus (new
  `setDemoHelpCorpus` seam in `helpApi.ts` — zero `GET /help/docs`). Tour data lives in
  `demoTour.playground.ts` (copy/placement/action per card); the script is versioned v2 with
  `edit` + `explain` step kinds (`demoScript.playground.ts`).
- Emoji-art demo starter: the catcher's sprites are now real VFS assets (`assets/apple.svg` 🍎,
  `assets/basket.svg` 🧺) loaded by the game AND listed in the Asset Viewer, so the art on screen
  is the art in the viewer.
- New studio injection points (all optional-context reads, default off): `LandingScreen` locked
  prompt + submit bind; `Workspace` `bindStudioControls` (run/restart, panel focus, editor jump,
  explain-this, asset generate); `helpApi` demo-corpus seam. `buildExplainPrompt` moved verbatim
  from `Workspace.tsx` to `panes/explainPrompt.ts` so the demo can match the real prompt.

### Changed
- Tour overlay (`DemoTourOverlay`): step-aware card placements (`beside-input` / `bottom-left` /
  `bottom-right` / `top-right` / `center`) so a card never covers the surface its step points at;
  the Next pill truncates inside the card instead of overflowing on long labels; per-step
  `hideSkip` (used by the mandatory landing step).
- `playwright.config.ts`: `PW_PORT` env override so ad-hoc e2e runs never reuse a developer's
  running dev server on the default port 4321.
- `e2e/try-demo-smoke.spec.ts` walks the full v2 tour end-to-end (locked landing → auto-run →
  scripted asks with restarts → diff → explain → asset magic → error→fix → guide → free explore →
  AI gate) and now also forbids `/help/*` requests.
- Demo banner (`/try/*`) copy made concise: "🎈 Demo mode · Questions? Contact us →", now
  linking to the marketing site's contact page (`airbotix.ai/contact`) instead of `/book`;
  blocks tour final step aligned ("Contact us from the banner above"). The nothing-is-saved
  message stays in the tour copy.
- `/try/blocks` tour copy rewritten: concise, user-journey guidance only — dropped the
  meta/technical reassurances ("not a mock-up", "real product") from every card.
- `/try/playground` tour copy given the same treatment (no "locks the prompt", "scripted",
  "Monaco", persistence/reset talk); both tours' final card now ends with the contact-us
  pointer and (blocks) a tablet/touch encouragement. "Nothing is saved" removed from all
  guidance per product direction — the demo banner + PRD carry the persistence truth.
- Tour overlay polish: buttons never wrap mid-label (single-line pills), controls row
  wraps gracefully, all controls are ≥44px touch targets for tablets; final-step button
  shortened to "Explore freely ✨".

### Added
- Demo Home exit (`/try/blocks`): the studio's 🏠 button leaves to the marketing "Try it"
  page — mode-aware default: prod builds → `airbotix.ai/try`, dev builds → the local marketing dev server (`localhost:3000/try`); `VITE_MARKETING_URL` overrides — instead of the authed
  hub — one `demo?.exitHref` seam in the Blocks toolbar.

## 2026-06-11 (Try Demo Mode — public /try/* demos)

### Added
- **Try Demo Mode** (`try-demo-mode-prd.md`): public, no-auth demo routes that render the **real,
  unmodified studios** — `/try/playground` (Game Playground) and `/try/blocks` (Blocks Studio) —
  mounted top-level like `/play/:shareId`. New demo layer in `src/pages/try/`:
  - `DemoModeProvider`/`useDemoMode` context (null = off everywhere outside `/try/*`);
  - in-memory demo adapters (D-DEMO-02): bundled fruit-catcher starter VFS behind
    `resolveProjectFiles`, an in-memory Map behind ALL `projectPersistence` reads/writes (no
    IndexedDB), an in-memory blocks adapter behind `loadBlocksProject`/`saveBlocksProject` serving
    the bundled 3-page **"Cat's Day Out"** `BlocksProject` (validated by the real parser, played by
    the real interpreter) — zero `/projects*`/`/llm/*` calls, pristine reset on every entry/reload;
  - **scripted demo agent** (D-DEMO-04) behind the existing `gameAgentStub` `RunTurn` seam: locked
    initial prompt + 3 canned turns (fall speed → score ×10 → bigger basket + "You win!") whose
    diffs flow through the real store funnel (undo/history identical to production); any other
    prompt — and everything after the script — gets the **contact-us gate** reply (D-DEMO-06,
    airbotix.ai/book + /contact);
  - `DemoTourOverlay` (D-DEMO-05; modal intro + floating step cards, progress dots,
    Next/Back/Skip) and the `DemoBanner` "nothing is saved · Book a chat" strip (D-DEMO-08; cloud
    share is hidden in the blocks demo).
  Tiny behaviour-neutral injection points only (all default "off"): demo seams in
  `playgroundApi`/`projectPersistence`/`gameAgentStub`/`blocksApi`, optional demo context reads in
  `PlaygroundApp` (locked prompt → straight to build) and `Workspace` (tour drives the real chat
  `send`), an optional `projectId` prop + share gate in `BlocksStudioPage`, and one scoped
  `.bsx-demo-host` height rule in `blocks.css`.
- **`AGENTS.md` demo-parity mandate** (D-DEMO-07): new repo-root `AGENTS.md` + scoped
  `src/pages/try/AGENTS.md` — any studio behaviour/route/selector change must update the demo
  script/story/overlay and re-run the demo tests in the same task.
- Tests: scripted-agent sequence + gate (drift alarms on the starter/script anchors), blocks story
  round-trip through `parseProject` + real-interpreter playthrough, in-memory adapter semantics
  (no fetch, reset-on-reinstall), tour overlay flow, public-route + no-network page tests for both
  demos, and a no-mock e2e smoke (`e2e/try-demo-smoke.spec.ts`: full tour → 3 scripted turns →
  AI gate; blocks Go/run + page navigation + share hidden; zero forbidden requests).

## 2026-06-11 (Blocks Studio — stable fullscreen)

### Fixed
- **Blocks Studio no longer flickers out of fullscreen and snaps back on the next tap.** The
  immersive page-scroll lock + first-gesture `requestFullscreen` lived on the studio component, so
  any transient remount (e.g. the periodic auth refresh briefly swapping the route through
  `ProtectedRoute`) ran the unmount cleanup — exiting fullscreen — and re-armed the one-shot enter,
  which the next tap re-triggered. Moved this lifecycle into **`LearnLayout`**, which stays mounted
  across the studio's remounts and keys off the route, so a remount can't drop/re-request fullscreen.
  Once the user (or browser) leaves fullscreen, we no longer auto-yank them back in.

## 2026-06-11 (Blocks Studio — closer to ScratchJr)

### Fixed
- **The Page block (Go to Page) only lets you pick a page that exists.** Its number stepper was
  capped at the generic 1–9; it now caps at the project's page count (and the editor reads
  "Which page? (1–N)"). `setParam` gained an optional `max`.

### Added
- **Four ScratchJr blocks that were missing** (`blocksModel.ts`, `interpreter.ts`):
  - **Set Speed** (🐢/🚶/🐇) — tap to cycle slow/normal/fast; scales that character's motion (slow 2×,
    fast 0.5×).
  - **On Bump** (💥) — a hat that fires when this character collides with another (grid-cell overlap,
    once per contact).
  - **Send Message** (📤) + **Get Message** (📥) — six colours; sending fires every Get-Message script
    of the same colour across the page (ScratchJr-style broadcast). Tap to cycle the colour.
  Message/bump-triggered scripts run concurrently and are awaited before the run ends (capped for
  safety). Still missing vs ScratchJr (by request): Play Recorded Sound; and Repeat/Forever as true
  nesting C-blocks (our ♾️ Again loops the whole track — the C-block needs the nestable-block model,
  PRD M3).

## 2026-06-11 (Blocks Studio — parallel tracks fix)

### Fixed
- **Multiple 🚩 tracks on one character now run in parallel without clobbering each other.**
  The interpreter captured a sprite-state snapshot at the start of each step and re-emitted the
  whole object after animating, so a second track (e.g. a Hop) snapped the first track's changes
  (e.g. a Move) back — only the last script appeared to run. Each block now merges just its delta
  onto the **latest** committed state (`interpreter.ts`), so concurrent tracks accumulate (matching
  ScratchJr's green-flag behaviour). Hop only touches y; Go Home stays a full explicit reset.
  Tests: 2 new parallel-track cases.
- **The "currently running" glow now lights up every track at once.** The run-highlight map was keyed
  by character, so two tracks on the same character overwrote each other's active block — only one lit
  at a time, making parallel runs look sequential. It's now keyed per **script** (like ScratchJr, which
  highlights the running block in every thread). Harness: `kid-blocks-parallel`.

## 2026-06-11 (Blocks Studio — refinement pass)

### Added
- **Share / view-only play** for Blocks Studio — the SAME parent-approval flow + play-count as
  Game Studio (reuses the kind-agnostic share API: ask → grown-up approves → frozen snapshot →
  live `/play/:shareId`). New `BlocksSharePanel` (theme-aware) in the toolbar; the public play page
  renders a new **read-only `ReadOnlyBlocksPlayer`** (big stage + Play button, no editing chrome,
  no auth) detected from `project.blocks.json` in the frozen snapshot.
- **Drag a block across tracks.** With multiple 🚩 tracks, a body block can now be dragged from one
  track into another (new `blocksStore.moveBlockAcross`); the insertion bar shows in the target track.
- **Number +/− sound effects** (`sfx.numUp/numDown`) and a **mute/unmute toggle** in the toolbar
  (persisted), plus an undo/redo cue.
- **Bigger emoji library** — 8 clear, evenly-sized categories (~130 emoji): Animals, Critters, Sea,
  People, Fantasy, Vehicles, Food, Fun. Category tabs are now a fixed equal size.

### Changed
- **Tablet block drag is hold-to-lift.** A quick swipe on a block now SCROLLS the palette / program;
  a short hold lifts it to drag (then JS locks page-scroll). Fixes blocks getting stuck on tablets
  and the scroll-vs-drag conflict. Mouse still drags on a small move.
- **One generic starter.** The Create hub offers a single "New project" card; every new project opens
  on a working scene — a cat that **chases a bouncing ball** (both loop forever) — to remix.
- **Unlimited pages** (was capped at 4).
- **Page thumbnails mirror each page's scene** (animated background), not a flat blue/space swatch.
- **Reset** got a proper icon (`RotateCcw`) + a friendly confirmation card.
- The stage **background button** is a themed glass chip with a clear picture icon (flips with the theme).
- **Landscape coding band**: all six categories show in a compact 2×3 grid (no scroll) and the band is
  taller so several tracks are visible at once.

### Fixed
- **Tapping a character no longer triggers the browser's text-selection / "Search" callout** (and no
  double-tap zoom in the studio): `user-select`/`-webkit-touch-callout`/`touch-action` hardened, inputs
  re-enable text.

### Changed (toolbar + picker follow-ups)
- **Toolbar redesigned to fewer buttons.** Secondary actions (Day/Night, Reset, Big screen) collapse
  into a **⋯ More** menu so the bar no longer squashes in portrait; ▶ Go! never wraps to two lines.
- **The currently-running block now lights up** as the program executes (live `lit` glow, wired from a
  new interpreter `onStep` callback).
- **Friend-picker categories all fit** (a 4-column wrapping grid) — no horizontal scroll.
- **Mute button shows its state** with a distinct coral wash when sounds are off.

## 2026-06-10 (Magic card dark-theme fix)

### Fixed
- **Magic Generation card now follows the dark theme** (`MagicGenerationCard.tsx`). The card's
  inner panel, prompt chip, Cancel/Dismiss buttons, orb/reference rings, and progress track were
  hardcoded light (`from-white`, `bg-white`, `#fff`, `#EDE9F7`) while the text used themeable
  `pg-*` tokens — so in dark theme the bright panel stayed light and the heading (`text-pg-text`)
  flipped light and rendered invisibly on it. Replaced the hardcoded surfaces with themeable
  `pg-surface`/`pg-surface-2`/`pg-text` tokens so the whole card flips with the workspace theme.
  Added `MagicGenerationCard.test.tsx`.

### CI
- **Unblock lint (`eslint . --max-warnings 0`)** — `WorkingCard.tsx` exported the `formatSecs`
  helper alongside the component, tripping `react-refresh/only-export-components` and failing CI on
  `main` since the one-message-turn change. Moved `formatSecs` into the pure-logic `turnProgress.ts`
  (next to its sibling time helpers); `WorkingCard` + its test now import it from there.

## 2026-06-10 (Airo — named helper + avatar)

### Added
- **The playground chat helper is now "Airo"** (named from Airbotix) with a friendly robot
  **avatar** (`AiroAvatar.tsx` — self-contained SVG: brand sky→purple head, glowing antenna,
  mint eyes). Replaces the generic "AI Helper" label + plain circle in the chat header and on
  every settled message; the kid-safety disclosure now reads "I'm Airo, a robot helper — not a
  person." (Parent-facing audit copy stays "AI helper" for clarity.)

## 2026-06-10 (one-turn-one-message working card)

### Added
- **Honest in-flight `WorkingCard` for every chat turn** (`WorkingCard.tsx`, `turnProgress.ts`).
  Replaces the fake-cycling `ThinkingBubble` (which "did NOT report real server stages") with a
  card that shows REAL steps built from the agent's actual tool/action deltas — "Adding Aliens ✍️",
  "Making sure it works 🚀" — deduped by file, with a per-step timer and a total clock. A file
  re-write (a syntax-fix pass) shows as a calm "fixing" beat on its row, never an error dump.

### Changed
- **One turn now resolves to exactly ONE message.** The pending bubble is the `WorkingCard` while
  the turn works; the first summary token flips it to the single settled message (`useGameAgent`).
- **Self-verify auto-fix is no longer a second message.** A successful repair (`/code/verify-fix`)
  applies **silently** behind a transient "Fixing a little glitch 🔧" card — no extra chat bubble,
  so a kid request reads as one message + a game that now works. Only an exhausted/co-debug fix
  surfaces a single warm "let's fix this together 🔧" message. This removes the old "responded,
  but still thinking" gap (the auto-fix used to append `AUTOFIX_TEXT` + its own result bubble).
- **Settled message restyled to the feature-focused design** (`AIChatPanel.tsx`). The done message
  is now a raised card with an "AI Helper" header, dark **feature-focused change rows** (the friendly
  change leads, e.g. "The aliens shoot lasers now", with the file name riding quietly beneath + a
  chevron that opens the editor), and a "WHAT NEXT?" label above outlined chips — matching the mockup.
- **Change highlight clears on click** (`MonacoEditor.tsx`). Tapping a changed-file row still opens
  the editor and highlights the changed lines, but the highlight now disappears the moment the kid
  clicks anywhere in the code (it returns next time a change row is tapped).

## 2026-06-10 (blocked-build explanation)

### Added
- **A safety-refused first build now explains itself + offers a way forward** instead of dropping
  the kid into a silent empty project. When the opening turn is rejected by the moderation gate
  (`MODERATION_REJECTED`), `GeneratingScreen` flags `blocked` on the scaffold hand-off; `useGameAgent`
  then seeds the chat with a friendly note ("our safety helper thought the idea sounded a bit too
  rough… your project is open and ready") plus 2–3 tappable gentler game ideas (spaceship dodging
  asteroids, plane racing through rings, catch the falling treats). Tapping a chip sends that prompt
  and builds the game — the kid is never stuck. Threaded `blockedSeed` through PlaygroundApp → Workspace
  → useGameAgent.

## 2026-06-10 (guided chip loop)

### Changed
- **Tapping a next-step chip now continues the guided build loop** (playground-ai-prompt-prd.md
  D-PAP-29). A tapped chip sends its prompt as a **`guided`** step (`AIChatPanel.tsx` →
  `useGameAgent.ts` → `codeApi.ts` POST `guided:true`), so the teacher re-offers a fresh set
  of options for the next phase instead of treating the tap as a "clear instruction" that
  ended the loop after one step. Free-typed messages stay un-guided. The guided flag is
  preserved on retry.
- **A self-verify auto-fix no longer wipes the kid's still-unused next-step chips**
  (D-PAP-29 sticky). The last-message-only clear in `useGameAgent.applyResult` is skipped
  for an auto-fix turn (`keepOtherNextSteps`), so a background repair firing right after a
  build can't erase options the kid was about to tap. New unit tests in `useGameAgent.test.ts`
  + `AIChatPanel.test.tsx`.

## 2026-06-10 (playground chat resume)

### Fixed
- **Chat history is now persisted across exit/resume** (J9). The conversation lived only in
  React state, so reopening a project lost every prior turn. The chat is now cached device-local
  in IndexedDB (`projectPersistence.ts`, `chat:` prefix — same store as the VFS/workspace-UI
  cache), restored on resume (`PlaygroundApp` `onDone`), and re-seeded into the agent
  (`useGameAgent` `initialChat`, which takes precedence over the first-turn/intro seed). The rich
  per-message data (next-step chips, per-file change rows, file notes) survives — the backend's
  CodeAgentTurn only records prompt+summary, so the log is kept client-side.
- **The canned "your game starter is ready to play" message no longer reappears on resume.** On a
  resume the blank prompt fell through to `buildIntro('')`, re-injecting the starter as if the
  project were brand new. The seed now requires a non-empty prompt (and restored history wins), so
  the starter shows only as the first message of a genuinely new project.

## 2026-06-10 (playground theming fixes)

### Fixed
- **Share-link popup was nearly invisible** (`ShareLinkPanel.tsx`). The popup portals into
  `document.body` — OUTSIDE the playground's `data-theme` root — so the `--pg-*` tokens (scoped
  to `[data-theme]`) were undefined there, rendering the surface/border transparent and the text
  near-invisible. The portal now carries `data-theme={theme}` (restoring the token cascade) and
  uses the raised `bg-pg-surface` instead of the page-matching `bg-pg-desktop`, so it lifts off
  the backdrop with a visible boundary.

### Changed
- **Themed chat scrollbar.** New reusable `.pg-scroll` utility (`playground.css`) — a slim (8px),
  rounded, transparent-track scrollbar whose thumb is toned from `--pg-text-muted` and brightens on
  hover, so it matches both light/dark chrome instead of the heavy default OS bar. Applied to the
  chat log (`AIChatPanel.tsx`).

## 2026-06-10 (playground next-step chips)

### Changed
- **Playground chat: next-step chips now appear only on the latest turn.** When a new
  teacher turn settles, any next-step option chips carried by an earlier chat bubble are
  cleared, so suggestions never linger on a stale message (`useGameAgent.ts`). Pairs with
  the backend making `next_steps` conditional — the kid sees options only when they
  haven't already given a clear next step (playground-ai-prompt-prd.md D-PAP-26).

## 2026-06-09 (safety gaps)

### Added
- **Parent "see what they tried" view** (`AuditPage.tsx`). `safety.pattern.escalated` events now render a distinct coral card with an expandable category summary (icon + label + count per rejection category, time window). Fetches from the new `/families/:familyId/kids/:kidId/safety-summary` endpoint (§8 D-PF12).

### Fixed
- **`auditCopy.ts` `describeSafety()` used wrong event type names.** The function had fictitious event strings (`safety.regex.rejected`, `safety.pii.input_blocked`, `safety.topic.rejected`, `safety.injection.blocked`) that the backend never emits. Corrected to match actual backend events: `safety.prompt.rejected` (with `payload.stage` discrimination), `safety.pii.blocked`, `safety.pii.warned`. Added `safety.pii.warn_acknowledged`, `safety.prompt.aborted`, `safety.response.rejected`, `safety.response.redacted` cards. Parent audit page now shows correct friendly copy for all safety events.
- **`dismissWarn()` in `useCodeStudio.ts` and `useGameAgent.ts` never emitted `safety.prompt.aborted`** (PRD §7). Both now fire `POST /safety/prompt-aborted` (fire-and-forget) when the kid dismisses the warn dialog without retrying.
## 2026-06-10

### Added
- **Tutoring page now shows the family's classes** (`/portal/tutoring`, O-5 read-only view).
  Above the bill, one card per enrolled kid+class: class name + 私教/官方课 badge + whose class,
  the **teaching team**, **接下来的课** (upcoming scheduled sessions, up to 5), and a collapsible
  **课程大纲** (published lesson outline — titles + one-liners; unpublished packs show nothing).
  Backed by `GET /tutoring/families/:id/classes`.
- **"✨ Explain this" selection toolbar in the code editor** (`learn-game-studio-prd.md`).
  Selecting a block of code in Monaco surfaces a floating "Explain this" pill (a content
  widget anchored to the selection); clicking it hands the snippet to the AI chat, which
  answers in plain words. The prompt asks the agent not to edit; under the playground
  teacher model the turn auto-applies with no agency gate, so a plain `send` answers
  directly. The backend already has the full file as context, so only the snippet is sent
  (capped at 1200 chars). Files: `panes/MonacoEditor.tsx` (the toolbar content widget),
  `panes/CodeEditorPane.tsx` (prop pass-through), `Workspace.tsx` (prompt + chat focus).
  Tests: `e2e/playground.spec.ts` (select→explain→reply).

## 2026-06-09

### Changed
- **e2e specs rewired to the chat-hosted asset flow.** `e2e/asset-gen.spec.ts` +
  `e2e/playground.spec.ts` no longer drive the removed in-pane `asset-add-to-game` /
  `library-add-to-game` detail flow. Generate/Remix now assert the **chat** surface:
  the finished asset is a tappable `chat-asset-open` card; tapping it opens the asset in
  the viewer (`asset-codeRef`). Stars-debit + remix `ref_url` assertions kept; the Library
  test now proves the URL-form code-ref (referenced, not inlined). Dropped the stale
  add-to-game CTA screenshot test + baseline. (Matches the cross-repo `kid-playground-asset`
  harness journey, also rewired.)
- **Chat generation UX polish.** The Asset Viewer's Generate/Remix no longer shows a
  "sent to chat" banner — instead it **brings the Chat to front** (and the chat
  auto-scrolls to the new message). A **remix** now shows the **reference asset** in the
  in-flight chat card. The finished-asset chat card drops the "Add to my game" button,
  shows the asset **larger**, and is **tap-to-open** in the Asset Viewer. Also removed the
  "Add to my game" button from the Asset Viewer detail screens (confusing) — the AI wires
  assets into the game from chat; the copy-able code-ref remains for manual use.
- **AI asset generation now lives in the CHAT** (learn-game-studio-assets-prd §3) — the
  single home for all AI conversation. A typed message is classified server-side as an
  **asset** request vs a **game-code** change (`/turn/classify` returns `intent`) and
  routed: an asset request generates as a chat message (the `MagicGenerationCard` while
  it runs, then the finished asset with **Add to my game**); a code request runs the
  usual game turn. Generation and code turns **share one in-flight lock** (one AI thing
  at a time). The Asset Viewer's **Generate / Remix** buttons now post into the chat
  (`onRequestAssetGen` → `useGameAgent.requestAssetGen`) instead of rendering their own
  card — both entry points, one place out. The `generationStore` engine + magic-card
  visual are reused; the Asset Viewer's pinned card was removed.

### Fixed
- **Imported text assets preview as readable text again.** Local import (D-ASSET A4)
  stores every file as a `data:` URL, so a `.txt`'s content was a base64 data URL and the
  Asset Viewer text preview showed the encoded string. Added `dataUrlToText` (decodes
  base64/percent-encoded text data URLs, UTF-8 safe; passes raw AI/editor text through)
  and use it in `AssetPreview`.
- **Generated/imported assets now persist across exit & resume.** Two causes: (1) the
  debounced autosave was cancelled when leaving the project — added `flushSave()` in
  `PlaygroundApp` that commits any pending save on exit (and reused it for the debounce);
  (2) asset content round-trip mangled the bytes — the studio VFS uses `data:` URLs but
  the backend stores raw base64, so `codeApi` now converts binary-asset content at the
  API boundary (strip on save, re-wrap on load). SVG (backend-text) round-trips verbatim.

### Added
- **Global "Magic Generation" state (`generationStore`).** AI asset generation is now an
  app-level Zustand store that owns the async call AND the completion (writing the asset
  into the VFS), so a single in-flight generation survives the Asset Viewer pane closing/
  reopening — one generation at a time, cancellable (abort signal threaded through
  `runGen`/`api.generateAsset`). Paired with a magical animated card (`MagicGenerationCard`).
- **Asset Library expanded from ~68 to ~280 curated emoji** across faces / characters /
  animals / food / plants / weather / items / vehicles / sports / music / symbols.

### Removed
- **Playground: dropped the seeded `assets/README.txt`** from the starter project — new
  game projects start with a truly empty `assets/`.

### Added
- **Self-verify round-trip — the studio reports runtime errors so the agent auto-fixes**
  (`playground/verifyRoundtrip.ts`, `panes/GameRunnerPane.tsx`, `panes/useGameAgent.ts`, `panes/gameAgent.ts`,
  `Workspace.tsx`, `code/codeApi.ts`; `playground-ai-prompt-prd.md` MP3 / D-PAP-09,13,23). The game runs in
  the opaque-origin sandbox, so the captured console is the only runtime-error signal. `extractRuntimeErrors`
  pulls the real `error`-level lines (drops logs/warnings + the shim's "ready", formats `text (file:line)`,
  de-dupes, caps at 6); `GameRunnerPane` reports them once per distinct (run, error-set) via `onRuntimeErrors`;
  `useGameAgent.autoFixFromErrors` posts them to the backend (`reportRuntimeErrors` → `POST …/code/verify-fix`),
  applies the returned fix turn, or shows the **"let's debug this together"** message once the backend has
  exhausted its ≤2 attempts (`co_debug`). The auto-fix budget resets on each fresh kid-initiated turn. New
  `VerifyFixResult` type + `reportRuntimeErrors` injected through the `GameAgentDeps` seam. Covered by
  `verifyRoundtrip.test.ts`; the full apply→run→report→re-run round-trip is exercised by the umbrella harness.
- **Resume recap — "welcome back, here's where we left off"** (`playground/ResumeRecap.tsx`,
  `PlaygroundApp.tsx`, `Workspace.tsx`, `panes/ChatPane.tsx`, `code/codeApi.ts`; `playground-ai-prompt-prd.md`
  MP5 / D-PAP-19,22). On a genuine resume (a real game project reopened with no fresh first turn), the studio
  fetches the project's persisted `learning_context` (`getProject`) and shows a dismissible welcome-back card
  above the chat: the game summary, the concepts the kid has learned (chips), and what they were about to do
  next, with a **"Keep building →"** continue button. Best-effort + non-blocking — the kid can ignore it and
  just start typing; a fetch failure simply skips the card. `CodeProject`/`AgentTurnResult` gain
  `learning_context`. Covered by `ResumeRecap.test.tsx` (summary/concepts/next render, summary-only, continue tap).
- **Game-agent UI tool handlers — the teacher can drive the studio** (`playground/executeClientActions.ts`,
  `Workspace.tsx`, `panes/CodeEditorPane.tsx`, `panes/MonacoEditor.tsx`, `code/codeApi.ts`, `playground.css`;
  `playground-ai-prompt-prd.md` MP4 / D-PAP-08, App. A). `ClientAction` now models the full Group A–D
  surface; `executeClientActions` dispatches the **Group A teaching tools**: `open_file` /
  `jump_to_line` / `highlight_code` all route through a shared `openFile(path, fromLine?, toLine?)` so the
  studio opens the file the agent just changed and **highlights the exact line range** (Monaco whole-line
  `pg-code-highlight` decoration), plus `set_theme` / `set_layout` (wired to the playground store) and
  optional `show_console` / `physics_debug` / `set_screen_size` / `open_history` / `open_asset_viewer`
  handlers. The console's jump-to-error and the agent's open/highlight now share one location path
  (`handleOpenLocation` gains an optional `toLine`). Handlers are optional and unknown/unwired actions are
  ignored (forward-compatible), so the backend can expose the whole surface while the studio honours only
  what it can today. Covered by `executeClientActions.test.ts` (routing, mode→bool/enum mapping, invalid
  mode rejection, path-less no-op, asset-viewer fallback).

### CI
- **Fixed the playground e2e harness logging the kid out mid-test** (`e2e/helpers.ts`). The
  Workspace's ShareLinkPanel fetches `GET /projects/:id/share` on mount; unmocked, it hit the real
  backend, 401'd, and tripped `api()`'s `clearToken` → the kid bounced to `/learn/login`, unmounting
  the studio (the intermittent "element detached from the DOM" flake — machine-dependent: only bites
  where a real `:3001` backend is up). Now mocked as "not shared". Also abort the streaming first turn
  (`POST /code/turn/stream`, GeneratingScreen) so it deterministically falls back to the seeded
  `GET /code/files` instead of racing a real backend. `create-game` now passes reliably (4.3s vs prior
  timeouts). (Note: `real-ai-turn` still has a separate, pre-existing intermittent flake under
  investigation.)

### Added
- **Teacher next-step option chips in the playground chat** (`panes/AIChatPanel.tsx`,
  `panes/useGameAgent.ts`, `code/codeApi.ts`; `playground-ai-prompt-prd.md` §11.4 / D-PAP-06).
  A settled agent turn now carries the backend's `next_steps` (`{label, prompt, tag:'concept'|'fun'}`)
  onto its chat bubble and renders them as **tappable chips** — concept chips (sky/✨) and fun chips
  (bubblegum/🪄); tapping one sends its `prompt` as the next turn. `AgentTurnResult` gains
  `next_steps` + `history_label` (FE1 of the teacher model). Covered by a new `AIChatPanel.test.tsx`
  + a `useGameAgent` data-flow assertion. (History-label wiring + removing the old Lite/Pro
  agency/approval beats land in follow-ups.)

### Added
- **Private tutoring (parent portal)** (`private-tutoring-prd.md` §5, §8). New `/portal/tutoring`
  page: shows outstanding per-session charges bound to each class, totals what's owed, and starts
  an Airwallex checkout to pay all outstanding charges at once (mirrors the wallet topup flow).
  "Tutoring" nav item added.
- **Game Guide SVG concept diagrams (D-HELP-07).** New `panes/help/helpDiagrams.tsx` —
  a registry of type-safe React SVGs (xy-coordinates, game-loop, gravity-and-jump,
  collision-overlap, sprite-shapes, scene-flow) keyed by the corpus `diagram` block.
  Rendered in a captioned, theme-aware (`currentColor`) card with `role="img"` + the
  `alt` label — no HTML injection. Unknown key → alt caption fallback.
- **Playground Asset Viewer: shared read-only Library tab (zero-host emoji).** The
  pane now has a **Library | My assets** source switch (D-ASSET-6). Library browses the
  emoji provider — thumbnails load cross-origin from the CDN, category chips + search
  filter it, and a read-only detail offers **Add to my game**. "Add to game" for a
  library asset injects a **URL-form** loader (`this.load.setCORS('anonymous');
  this.load.image(key, '<cdn url>')`) via `addLibraryAssetToGame` — the asset is
  referenced by URL and never copied into the VFS, so it stays immutable + shared. The
  game preview leaves `https://` URLs un-rewritten (only VFS paths inline to data URLs),
  and the cross-origin texture is loaded `crossOrigin:'anonymous'` so the canvas isn't
  tainted (D-ASSET-7). New e2e proves browse → add → the game runs clean loading the
  emoji by URL. See PRD `learn-game-studio-assets-prd.md` A2 / §4.4.
- **Playground shared asset Library — foundation (zero-host emoji provider).** New
  `assetLibrary.ts`: a curated, kid-appropriate **emoji** catalog (characters /
  animals / food / nature / items / symbols) exposed as read-only `LibraryAsset`
  records referenced by URL — never copied into the VFS. URLs are derived from the
  emoji codepoint via `twemojiUrl()` (pinned `jdecked/twemoji@15.1.0`, VS16 stripped),
  so the asset the kid browses is exactly what the game loads (WYSIWYG). `searchLibrary()`
  filters by category + name/tags (the same shape the `search_assets` agent tool will
  use). This is the data layer for the Library source tab (Asset Viewer UI wiring lands
  next). Zero hosting (D-ASSET-11/12); hosted Kenney CC0 is the v2 provider. See PRD
  `learn-game-studio-assets-prd.md` A2 / §4.4.

### Added
- **Playground: AI remix of any image (A5, D-ASSET-5).** Image detail views (both My
  assets and the Library) now have a **Remix with AI** box: describe a change ("make it
  blue") and the AI returns a variation that lands in **My assets/generated**. Remix of
  a project asset sends `ref_asset_path`; remix of a Library asset sends its `ref_url` —
  the backend does image-to-image. The offline stub folds the reference into its hash so
  a remix is a deterministic variation. e2e proves a Library remix posts the `ref_url`
  and the result appears under My assets.

### Changed
- **Playground: `generateAsset` now sends the snake_case backend contract**
  (`project_id` / `ref_asset_path` / `ref_url`). The camelCase `GenAssetRequest` seam was
  never wired to the real DTO (asset-gen had been stub/mock only); A3/A5 make the path
  real, so the client maps the fields. Backwards-compatible for the mocked e2e.
- **Playground: hardened local asset import** (A4). Imports now fail soft (a calm
  "couldn't import that file" notice instead of a silent hang on a bad read), always
  target **My assets** (`assets/imported/`, or the open VFS category), and a drop/paste
  while browsing the read-only Library switches back to My assets so the imported file
  is actually visible.
- **Playground asset generation is now prompt-only — removed the image/audio
  dropdown** (D-ASSET-4). The kid describes what they want in one box ("a pixel
  coin", "a jump sound") and the AI decides the kind: the real backend infers it
  server-side (`/llm/generate-asset` `kind` is now optional), and the offline stub
  uses the same keyword heuristic (`inferStubKind`). The generated file's extension
  is derived from the returned mime / reported kind instead of the picker. See PRD
  `learn-game-studio-assets-prd.md` A3.

### Removed
- **Playground: dropped the seeded sample/test assets and the read-only "preloaded"
  lock.** New game projects no longer ship `coin.svg` / `hero_bounce` sprite /
  `chime.wav` / `intro.mp4` in their VFS — those were test fixtures. The Asset Viewer
  now treats every VFS asset as the kid's own (full CRUD; no `Lock` badge / "Sample —
  read-only" state). Deleted `sampleAssets.ts`, `sampleVideo.ts`, and
  `sampleAssets.test.ts`; removed `withPreloadedAssets`/`isPreloadedAsset` seeding +
  save-time filtering from `PlaygroundApp`. The shared **Library** source (Kenney CC0 +
  emoji, referenced by URL) replaces "something to start with" — see PRD
  `learn-game-studio-assets-prd.md` A0 / D-ASSET-3, D-ASSET-6. New projects start with
  an empty `assets/` (plus the `README.txt` scaffold note); Import / ✨ Generate still
  populate it. Removed the now-obsolete "samples are read-only" e2e.

### Changed
- **Game Guide pane now fetches the backend corpus (MH0 frontend-swap).** `HelpPane`
  loads `GET /help/docs` via TanStack Query and renders + searches it client-side; the
  bundled `panes/help/helpContent.ts` is **deleted** so platform-backend is the single
  source (D‑HELP‑02). New `helpTypes.ts` (shared shape) + `helpApi` becomes
  `loadHelpCorpus` + pure `searchDocs`/`getDoc`. Loading/error states added. This also
  unblocks comprehensive, clearly-tiered content (authored once, server-side). E2E mocks
  `GET /help/docs` in `mockBackendAsKid`.

### Added
- **Game Guide — `open_help` client action (MH2a, frontend)**. Extends the agent's
  `ClientAction` channel (`code/codeApi.ts`) with `open_help { target: docId, anchor? }`,
  dispatched by `executeClientActions` → a new `openHelp` handler that surfaces the Guide
  (window or Split tab) and jumps it to the passage. `HelpPane` gains a `request` prop
  (nonce-keyed, mirroring the editor's jump-to-error seam) that drives the navigation.
  This is the frontend half of HJ2: once the backend (MH2b) emits `open_help`, the kid's
  Guide opens at the cited passage. Tested: `executeClientActions.test.ts` (dispatch +
  no-target ignore + `focus_panel` to help) and `e2e/help-guide.spec.ts` HJ2 (a mocked
  turn returning `open_help` opens the Guide at the gravity passage, no VFS changes).
  The backend `search_help`/`read_help` tools + system prompt remain MH2b.
- **Game Guide — in-studio help (MH1, frontend)** for the Game Studio playground
  (PRD `docs/product/prd/learn-game-studio-help-prd.md`). A 5th playground window
  (`help`, "Guide", `BookOpen`, `brand-sunshine` accent) reachable from a desktop tile
  (Window mode) and a Split tab. Renders a curated, kid-tiered (Lite/Pro) corpus —
  Phaser 4, game basics, game-engine basics — authored as typed structured content
  (`panes/help/helpContent.ts`, no markdown/sanitizer dep) behind a `helpApi` data seam
  (client-side lexical search today; MH0 swaps it to `GET /help/docs*`). New:
  `panes/HelpPane.tsx`, `panes/help/{helpContent,helpApi}.ts`; wired through
  `playgroundStore` (`PgWindowId`), `windowMeta`, `DesktopIcon` (sunshine-contrast
  exception: solid chip + `text-ink` glyph), `Workspace`. The AI `search_help`/`read_help`
  tools + the `open_help` client action are MH2 (backend, not in this change). Tested:
  `helpContent.test.ts` (corpus invariants + the HJ6 runtime-contract/Phaser-major sync
  guard, D‑HELP‑06), `helpApi.test.ts` (search + tier filtering), `e2e/help-guide.spec.ts`
  (HJ1: open from desktop → browse → search → read → tier toggle).

### Fixed
- **Help search tokenizer strips punctuation** (`helpApi.searchHelp`) so a kid query like
  "how do I jump?" matches the "jump" tag (not "jump?"). Kept in sync with the backend
  `HelpSearchService` tokenizer (so the agent's `search_help` and the pane's own search rank
  identically).
- **e2e harness: `mockBackendAsKid` now mocks `GET /projects/*/share` → 404** ("no share
  yet"). `ShareLinkPanel` queries it on every real-project workspace; left unmocked it
  401'd → the api client cleared the kid token → a delayed bounce to `/learn/login` that
  fast specs happened to beat (and which flaked the `create-game` openCode spec). Share-
  specific specs still override with their own route (matched most-recent-first).

### Changed
- **Playground share-link control moved to the bottom bar (Taskbar), status-aware.**
  The share control used to float top-right over the desktop surface (Window mode) or
  sit in the split tab strip; it now lives on the bottom bar in **both** layout modes,
  rendered once. The button itself reflects the live share status — neutral **Share**,
  a sunshine **Waiting for grown-up** beat while a parent-approval is pending, and a
  mint **Link live** pill showing the play count once approved — and the status is
  polled even while the panel is closed, so an out-of-band parent approval (Portal)
  lights it up on its own. Clicking opens a popup rendered into `document.body` (floats
  above the desktop windows + taskbar, never clipped) anchored just above the button;
  clicking outside it or pressing Escape dismisses it. Re-enabled the previously
  `fixme`'d share-link UI e2e (now green from a direct studio load).
- **Upgraded the game runtime to Phaser 4.1.0** (from 3.80.1). Phaser 4's full build
  (`dist/phaser.min.js`) is still a UMD that sets `window.Phaser`, so the opaque-origin
  sandbox keeps loading it as a classic global `<script>` (no `allow-same-origin`, no
  CDN — the `vendor-phaser` Vite plugin re-materializes the engine + `.d.ts` into
  `public/vendor/`). Bumped `PHASER_VERSION` + the `/vendor/phaser-<v>.*` constants in
  `vite.config.ts`, `buildGamePreview.ts`, `MonacoEditor.tsx`. The `Phaser.Game`
  constructor-wrapper control channel (pause/mute/stats) still works. Verified by the
  `game-smoke` e2e (starter game runs, fps > 0, zero console errors) and the Phaser
  `.d.ts` IntelliSense e2e. The agent system prompt deliberately keeps teaching the
  Phaser-3-style game API — it's backward-compatible, runs on the Phaser 4 engine, and
  is the most reliable surface for the model to generate.
- **Playground "building your game" screen — total redesign around real progress.**
  The old screen showed a spinning orb + a fake timed progress bar + canned "Writing
  the code…" steps that didn't reflect anything real (the backend generated the whole
  game in one non-streaming call, so the first ~20–30s had no signal). `GeneratingScreen`
  now drives **three honest phases off the streamed turn**: **thinking** (turn running,
  no file yet → a fun looping platformer **build-stage** animation + rotating kid
  build-tips, since there's genuinely nothing real to show), **building** (each file
  reveals in a live list the instant the AI starts writing it — see the backend
  streaming change), and **done** (the AI's moderated reply + a short celebratory beat,
  then handoff). Stream failure still falls back to the seeded template (kid never
  trapped); resume/project-less sessions load behind the same stage. New pure-CSS
  build-stage animation in `playground.css` §5 (honors `prefers-reduced-motion`).
  Covered by `GeneratingScreen.test.tsx` (thinking → progressive file reveal → ready
  → handoff).

## 2026-06-11

### Changed
- `CLAUDE.md` rewritten for the `airbotix-ai` umbrella era: this repo is documented as
  an umbrella submodule, product-context paths now point at the umbrella root `docs/`
  (the old `~/Documents/sites/airbotix/docs/...` paths are gone), and the
  same-commit `CHANGELOG.md` rule is stated up front. Docs only, no code change.

## 2026-06-08

### Fixed
- **Playground AI chat error copy now distinguishes "couldn't reach the server" from
  "the server errored."** `useGameAgent.friendlyError` previously collapsed every
  unhandled turn failure into "Could not reach the AI" — so a real backend 5xx
  (e.g. the dev backend mid-restart) misread as a connectivity problem. Now a
  transport failure (`fetch` rejected → no `ApiError`) or a gateway-down
  502/503/504 keeps the "Could not reach the AI. Try again." copy, while any other
  reached-but-failed status shows a distinct "The AI ran into a problem. Try again
  in a moment." Covered by new `useGameAgent.test.ts` cases (transport vs 5xx vs 503).

## 2026-06-07

### Added
- Parent Portal **Courses** page (`/portal/courses`): browse published course packs and
  request a seat for a kid. Submits to `POST /bookings` (`source=parent_portal`) so the
  request lands in the super-admin Bookings inbox.
- **My Family is now a growth surface, not a settings form** (`parent-portal-growth-report-prd.md`): tapping a kid lands on a warm **growth report** (`/portal/family/:kidId`, new `KidGrowthPage`) — a one-sentence headline, highlight tiles (creations / day-streak / minutes exploring / studios tried), a 28-day daily-activity sparkline, and a friendly "what they've been making" breakdown — instead of the profile editor. The family list now shows a per-kid growth teaser (`KidGrowthTeaser`) + sparkline with a "See growth →" action, kids first and the family code demoted below. A brand-new kid shows an encouraging **🌱 early state** (reuses the onboarding `KidLoginHelper` with the copyable family code) rather than "No data". Profile / Reset PIN / Delete move verbatim to `/portal/family/:kidId/settings`. Growth derived purely from the existing usage endpoints (`/kids/:id/usage`, `/usage/trend`) in new pure helpers (`kidGrowth.ts`, +Vitest); shared `TrendBars` extracted to `src/components/`. Frontend-only, no backend change.
- Parent onboarding clarity pass (follow-up to the welcome flow): the welcome tour
  gained a concrete **"What your child will make & learn"** slide (Image/Music/Voice,
  Video, Code & Games + the skills built) and is now **re-openable any time** via a
  **"How it works"** button on the Dashboard (`openWelcomeTour`), not just on first
  login. New reusable **`StarsExplainer`** ("what are Stars?", qualitative — no hard
  $ conversion) on the top-up + wallet pages and a clearer checklist subtitle. The
  kid-login helper now shows a **QR code + "Copy login link"** (`/learn/login?family_code=…`)
  so parents don't dictate a code and kids don't type one; the kid login page pre-fills
  the family code from that query param. City is now a **dropdown of major AU cities
  (+ "Other")** on register + settings instead of free text. Adds `qrcode.react`.
- Parent-portal first-login onboarding (`parent-portal-onboarding-prd.md`): a one-time,
  skippable 3-slide **WelcomeWizard** ("what Airbotix is / you're in control / 3 next steps")
  and a persistent, data-driven **GettingStartedCard** checklist on the Dashboard (log kid in →
  add Stars → optional spending limits), plus a **KidLoginHelper** modal showing the copyable
  family code + plain-language login steps. Frontend-only: completion derived from existing
  family/wallet/payment-methods/auto-topup queries + per-parent (`sub`-keyed) localStorage flags
  (`src/lib/onboardingStorage.ts`); pure logic in `onboardingState.ts` with Vitest coverage.
  Mounted in `DashboardPage` (parent-with-family branch only). Payment step is gentle / never
  blocking (D-ONB2-02).

### Changed
- **Stars economy re-pegged: 1 star = A$0.02 (was A$1)** — mirrors platform-backend.
  Top-up packs now credit 500 / 1750 / 3250 / 7000★ (Starter/Family/Mega/School,
  incl. bonus), auto-topup SKUs + threshold options realigned to 50★ per A$, and
  Studio per-action costs updated (image 4→8★, video 5→40★; chat/voice/code/music
  unchanged) so a single chat costs ≈ A$0.02 and a $10 pack lasts hundreds of turns.
- **Activity page (`/portal/audit`) now speaks plain language.** It previously dumped
  raw machine `event_type` strings (`wallet.topup_initiated`) and the full JSON payload
  (`pack_sku`, `payment_intent_id`, `amount_aud_cents`…) — unreadable for parents. Each
  event is now mapped to a friendly icon + headline + detail line (e.g. 💳 *Top-up started
  · 10 Stars · $10.00 AUD*) via a new `src/lib/auditCopy.ts` table covering wallet / LLM /
  approval / project / auth / class / safety / family / incident events, with a title-cased
  fallback so no unmapped event ever leaks a raw `dotted.snake_case` string. The raw
  `event_type` + JSON is preserved behind a collapsed **"Technical details"** disclosure
  for auditability. Actor labels are now parent-facing ("You" / "Your child" / "AI helper").
  Vitest coverage in `auditCopy.test.ts`. Step toward the richer §4.6 vision (session
  grouping / filters / export remain unbuilt).
- `.gitignore`: explicitly ignore the compiled `vite.config.js` / `vite.config.d.ts`
  (stray `tsc -b` outputs) so they never get committed alongside `vite.config.ts`.

### CI
- `ci.yml` now actually runs the unit tests: the job runs `lint → typecheck →
  test → build` (was build-only, so the Vitest suite never ran in CI).

## 2026-06-06

### Added
- Portal onboarding captures the parent name + an editable display name.
- Playground v2 desktop workspace: window / split layout, Monaco code editor,
  Phaser game runner, standalone chat pane, taskbar + desktop icons, error
  debugging (jump-to-error + Ask AI to fix), light/dark theme, and S3-backed
  editor files.

### Fixed
- Playground UX polish: Monaco hover/suggest tooltips no longer clipped, robust
  Phaser vendoring at build time, wider editor launch, chat keeps focus/history,
  smoother generating screen.
