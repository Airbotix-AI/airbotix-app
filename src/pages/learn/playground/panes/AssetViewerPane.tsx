// The Asset Viewer pane (design §5–7) — used identically by Window mode (a
// floating window) and Split mode (the "Assets" tab). Organised browsing +
// preview, edit/manage, and AI generation, over the existing VFS. All mutations
// go through projectStore (the single funnel); nothing here changes the VFS
// schema. Sidecar `.anim.json` files are hidden from the grid (they're metadata
// for their sibling sprite).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import clsx from 'clsx';
import {
  AlertTriangle,
  ArrowLeft,
  Box,
  CheckCircle2,
  Film,
  Image as ImageIcon,
  Loader2,
  Music,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react';

import { useDemoMode } from '@/pages/try/demoMode';
import type { VfsFile } from '../../code/codeApi';
import { type SaveResult } from '../projectPersistence';
import {
  ASSET_LIBRARY,
  LIBRARY_CATEGORIES,
  searchLibrary,
  type LibraryAsset,
} from '../assetLibrary';
import { useProjectStore } from '../projectStore';
import { readWorkspaceSlice, writeWorkspaceSlice } from '../workspaceUiStore';
import { AssetPreview } from './AssetPreview';
import { CopyButton } from './CopyButton';
import { useObjectUrl } from './useObjectUrl';
import { EnlargeButton, ImageLightbox } from './ImageLightbox';
import { ClassAssetDetailView, ClassAssetsGrid } from './ClassAssets';
import { type ClassAssetView } from './playgroundApi';
import {
  animSidecarPath,
  assetChatRef,
  assetKindOf,
  categoryOf,
  decodeImageMeta,
  formatBytes,
  isAssetFile,
  libraryChatRef,
  parseAnimSidecar,
  referenceLabel,
  type AssetKind,
  type ImageMeta,
} from './assetMeta';
import { ASSET_GENERATION_ENABLED } from '../featureFlags';

interface AssetViewerPaneProps {
  files: VfsFile[];
  /**
   * The real backend project. When set, AI generation routes through
   * platform-backend (Stars-metered, content-filtered, audited — PRD J5); when
   * absent (a project-less session) the offline stub runs behind the same UI.
   */
  projectId?: string;
  /**
   * Commit a VFS change back to the page-level source of truth — used by the
   * one-tap "Add to my game" to write the loader + use into a scene. When absent
   * (read-only contexts), the add-to-game button is hidden.
   */
  onApplyFiles?: (files: VfsFile[]) => void;
  /**
   * Save the project NOW and report the result (the page-level flushSave). A local
   * import adds the asset to the VFS, then awaits this; the asset is REVEALED only
   * on `saved`, and rolled back (removed) on any other result — so an asset never
   * shows as available unless the backend actually stored it. Absent in contexts
   * with no backend save (the asset reveals immediately, the prior behaviour).
   */
  onSaveNow?: () => Promise<SaveResult>;
  /**
   * Generate / remix into the CHAT (D-ASSET §3 "both entry points → one place
   * out"). The Generate prompt + Remix buttons post the request into the chat so
   * it shares the one-AI-at-a-time lock and shows in the conversation.
   */
  onRequestAssetGen?: (prompt: string, ref?: { refAssetPath?: string; refUrl?: string }) => void;
  /** A request to open a specific asset's detail (from a chat "done" card tap). */
  openAsset?: { path: string; nonce: number } | null;
  /**
   * The class-shared assets a teacher prepared for this project's class
   * (class-shared-assets-prd). The backend gate returns these ONLY when the
   * project is class work for a class the kid is enrolled in (else `[]`), so the
   * "Class" source tab is shown ONLY when this is non-empty.
   */
  classAssets?: ClassAssetView[];
  /** Teacher live read-only viewer (D-LV-6): hide every mutation affordance —
   *  import/upload (file input + drag-drop/paste), Generate, Remix, rename, delete.
   *  Viewing / opening / previewing assets stays enabled. */
  readOnly?: boolean;
}

const ALL = '__all__';
/** Which source the Asset Viewer is browsing (D-ASSET-6 + class-shared-assets). */
type AssetSource = 'mine' | 'library' | 'class';
/** Snackbar tone — success (confirmations) vs error (blocked/failed operations). */
type SnackTone = 'success' | 'error';
/** How long a snackbar stays up before auto-dismissing. */
const SNACK_MS = 3000;
// Hard per-file import cap. MUST match the backend MAX_FILE_BYTES
// (platform-backend/src/tools/vfs.constants.ts, 50 MB): the save rejects anything
// larger (the presigned sign-upload declares the size, and the save HEAD-verifies
// the uploaded object), so we block it HERE with a clear message rather than
// importing it, showing it in "Mine", then losing it when the save is rejected.
const MAX_ASSET_BYTES = 50 * 1024 * 1024;
const MAX_ASSET_LABEL = '50 MB';
const ANIM_SUFFIX = '.anim.json';

// Importable asset file types: media + non-executable DATA (game data, fonts,
// shaders). Code/text (.js/.html/.css/.md/.txt) is NOT importable — it's authored
// in the editor and runs through the kid-safety scan. Mirrors the backend's
// uploadable set (ALLOWED_EXTENSIONS minus the scanned-text ones). `accept` gates
// the file picker; this set re-checks drag-drop (which ignores `accept`).
// Importable asset file types: media + non-executable DATA. EXCLUDES executable
// text (.js/.html/.css) AND script-capable `.svg` — the backend rejects those as
// assets (they're scanned text), so offering them in the picker would only let a
// file be chosen that then fails the save. `accept` is derived from this one list
// (no `image/*` wildcard, which would re-admit svg).
const IMPORTABLE_EXTENSIONS = [
  'png', 'jpg', 'jpeg', 'gif', 'webp',
  'mp3', 'wav', 'ogg', 'm4a', 'mp4', 'webm',
  'glb', // 3D model (binary glTF) — previewed + loaded by the three engine (D-3D-09)
  'json', 'xml', 'csv', 'ttf', 'otf', 'woff', 'woff2', 'fnt', 'glsl', 'frag', 'vert', 'atlas',
] as const;
const IMPORTABLE_SET = new Set<string>(IMPORTABLE_EXTENSIONS);
const ACCEPT_ATTR = IMPORTABLE_EXTENSIONS.map((e) => `.${e}`).join(',');
const extensionOf = (name: string): string => name.split('.').pop()?.toLowerCase() ?? '';
const isImportable = (f: File): boolean => IMPORTABLE_SET.has(extensionOf(f.name));

/** The notice after an import: confirms what landed and names anything blocked for
 *  being over the {@link MAX_ASSET_LABEL} cap or an unsupported file type. */
function importNotice(okCount: number, tooBig: File[], badType: File[] = []): string {
  const reasons: string[] = [];
  if (tooBig.length) reasons.push(`${tooBig.length} too big (max ${MAX_ASSET_LABEL})`);
  if (badType.length) reasons.push(`${badType.length} not a supported file type`);
  if (reasons.length === 0) return 'Imported.';
  const blocked = [...tooBig, ...badType].map((f) => `“${f.name}”`).join(', ');
  if (okCount === 0) return `Couldn't import ${blocked}: ${reasons.join(', ')}.`;
  return `Imported ${okCount}. Skipped ${blocked}: ${reasons.join(', ')}.`;
}

function isDisplayable(f: VfsFile): boolean {
  return isAssetFile(f) && !f.path.endsWith(ANIM_SUFFIX);
}

function basename(path: string): string {
  return path.split('/').pop() ?? path;
}

function uniquePath(desired: string, taken: Set<string>): string {
  if (!taken.has(desired)) return desired;
  const dot = desired.lastIndexOf('.');
  const stem = dot > 0 ? desired.slice(0, dot) : desired;
  const ext = dot > 0 ? desired.slice(dot) : '';
  let n = 1;
  while (taken.has(`${stem}-${n}${ext}`)) n += 1;
  return `${stem}-${n}${ext}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

const KIND_ICON: Record<AssetKind, typeof ImageIcon> = {
  image: ImageIcon,
  sprite: ImageIcon,
  audio: Music,
  video: Film,
  model: Box,
  text: ImageIcon,
  other: ImageIcon,
};

function Thumb({ asset, kind }: { asset: VfsFile; kind: AssetKind }) {
  // Render from a blob: URL — a large `data:` URL is refused by the DOM <img>
  // (Chrome: blocked:other), even though the game's loader handles it. See useObjectUrl.
  const src = useObjectUrl(asset.content);
  if (kind === 'image' || kind === 'sprite') {
    return <img src={src} alt="" className="h-full w-full object-contain" />;
  }
  if (kind === 'video') {
    return <video src={src} className="h-full w-full object-contain" muted />;
  }
  if (kind === 'model') {
    return <ModelThumb content={asset.content} />;
  }
  const Icon = KIND_ICON[kind];
  return (
    <div className="flex h-full w-full items-center justify-center text-brand-sky">
      <Icon size={40} />
    </div>
  );
}

/**
 * A 3D model's grid thumbnail: a rendered still of the actual model (D-3D-09c),
 * produced by the lazily-imported `modelThumbnail` renderer (three stays out of
 * the main bundle) and cached by content. Falls back to the kind icon while
 * rendering and for unparsable models.
 */
function ModelThumb({ content }: { content: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void import('./modelThumbnail').then(({ modelThumbnail }) =>
      modelThumbnail(content).then((u) => {
        if (live) setUrl(u);
      }),
    );
    return () => {
      live = false;
    };
  }, [content]);
  if (!url) {
    return (
      <div className="flex h-full w-full items-center justify-center text-brand-sky">
        <Box size={40} />
      </div>
    );
  }
  return <img src={url} alt="" data-testid="model-thumb" className="h-full w-full object-contain" />;
}

export function AssetViewerPane({
  files,
  onSaveNow,
  onRequestAssetGen,
  openAsset,
  readOnly,
  classAssets,
}: AssetViewerPaneProps) {
  const createFile = useProjectStore((s) => s.createFile);
  const rename = useProjectStore((s) => s.rename);
  const remove = useProjectStore((s) => s.remove);

  // The Class source exists only when the backend gate returned class assets
  // (class-shared-assets-prd): the project is class work for a class the kid is
  // enrolled in. Otherwise the tab is hidden entirely. Memoised so the empty-list
  // fallback keeps a stable identity across renders (downstream useMemo deps).
  const classList = useMemo(() => classAssets ?? [], [classAssets]);
  const hasClassAssets = classList.length > 0;

  // Persisted Asset Viewer selections (J9 "resume where I left off").
  const assetSeed = useRef(
    readWorkspaceSlice('asset-viewer', {
      assetSource: 'mine' as AssetSource,
      assetCategory: ALL,
      assetQuery: '',
      assetSelectedPath: null as string | null,
    }),
  ).current;
  // Which source the pane is browsing: the kid's own VFS assets, the shared
  // read-only Library (D-ASSET-6), or the per-class shared assets. Library + class
  // assets are read-only sources; only "mine" lives in the VFS. Never restore to
  // `class` when no class assets exist (the tab wouldn't be rendered).
  const [source, setSource] = useState<AssetSource>(() =>
    assetSeed.assetSource === 'class' && !hasClassAssets ? 'mine' : assetSeed.assetSource,
  );
  // If class assets disappear while we're on the Class source (e.g. a refetch
  // emptied them), fall back to My assets so we never render an orphaned source.
  useEffect(() => {
    if (source === 'class' && !hasClassAssets) {
      setSource('mine');
      setCategory(ALL);
      setSelectedClassId(null);
    }
  }, [source, hasClassAssets]);
  const [category, setCategory] = useState<string>(() => assetSeed.assetCategory);
  const [query, setQuery] = useState(() => assetSeed.assetQuery);
  const [selectedPath, setSelectedPath] = useState<string | null>(() => assetSeed.assetSelectedPath);
  const [selectedLibId, setSelectedLibId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  useEffect(() => {
    writeWorkspaceSlice('asset-viewer', {
      assetSource: source,
      assetCategory: category,
      assetQuery: query,
      assetSelectedPath: selectedPath,
    });
  }, [source, category, query, selectedPath]);
  // Open a specific asset on request (a chat "done" card tap, §3): switch to My
  // assets and reveal its detail. The nonce re-fires even for the same path.
  useEffect(() => {
    if (!openAsset) return;
    setSource('mine');
    setCategory(ALL);
    setSelectedLibId(null);
    setSelectedClassId(null);
    setSelectedPath(openAsset.path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAsset?.nonce]);
  // Feedback for every Asset Viewer operation (import / copy-ref / add / delete
  // errors) is a SNACKBAR floating inside the pane — never a layout-shifting
  // banner. Auto-dismisses; a new message replaces the current one.
  const [snack, setSnack] = useState<{ text: string; tone: SnackTone } | null>(null);
  const snackTimer = useRef<number | undefined>(undefined);
  const showSnack = useCallback((text: string, tone: SnackTone = 'success') => {
    setSnack({ text, tone });
    window.clearTimeout(snackTimer.current);
    snackTimer.current = window.setTimeout(() => setSnack(null), SNACK_MS);
  }, []);
  useEffect(() => () => window.clearTimeout(snackTimer.current), []);
  // The file name(s) currently being read + uploaded (null when idle). Drives the
  // "Uploading …" indicator + disables the Import button. The asset only appears
  // in the grid once its upload is CONFIRMED (see `importFiles`).
  const [uploading, setUploading] = useState<string[] | null>(null);
  // VFS paths that are imported-but-not-yet-confirmed: held in the VFS so they're
  // in the save payload, but HIDDEN from the grid until the backend stores them
  // (removed entirely on a failed save). So an asset never shows as available
  // unless it actually uploaded.
  const [pendingPaths, setPendingPaths] = useState<Set<string>>(() => new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI generate form — one prompt box; the AI decides image vs audio (D-ASSET-4).
  // The in-flight generation itself is GLOBAL (generationStore) so it survives
  // this pane closing/reopening (§3 "Magic Generation").
  const [genPrompt, setGenPrompt] = useState('');
  // Hide imports whose upload hasn't confirmed yet — they're in the VFS (so the
  // save includes them) but mustn't show as available until the backend stores them.
  const assets = useMemo(
    () => files.filter((f) => isDisplayable(f) && !pendingPaths.has(f.path)),
    [files, pendingPaths],
  );

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of assets) {
      const c = categoryOf(a.path);
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [assets]);

  const visible = useMemo(
    () =>
      assets.filter(
        (a) =>
          (category === ALL || categoryOf(a.path) === category) &&
          basename(a.path).toLowerCase().includes(query.toLowerCase()),
      ),
    [assets, category, query],
  );

  const selected = selectedPath ? (files.find((f) => f.path === selectedPath) ?? null) : null;

  // ── Library (shared, read-only) browse state ──────────────────────────────
  const libCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of ASSET_LIBRARY) counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
    return LIBRARY_CATEGORIES.map((c) => [c, counts.get(c) ?? 0] as [string, number]);
  }, []);
  const libVisible = useMemo(
    () => searchLibrary(query, category === ALL ? null : category),
    [query, category],
  );
  const selectedLib = selectedLibId
    ? (ASSET_LIBRARY.find((a) => a.id === selectedLibId) ?? null)
    : null;

  // ── Class (shared, read-only) browse state ────────────────────────────────
  // The Class source has no categories (a flat per-class list); only the search
  // box filters it (by name).
  const classVisible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? classList.filter((a) => a.name.toLowerCase().includes(q)) : classList;
  }, [classList, query]);
  const selectedClass = selectedClassId
    ? (classList.find((a) => a.id === selectedClassId) ?? null)
    : null;

  // Switching source resets category + clears any open detail so the sources
  // (whose categories differ) never show a mismatched selection.
  function switchSource(next: AssetSource) {
    setSource(next);
    setCategory(ALL);
    setQuery('');
    setSelectedPath(null);
    setSelectedLibId(null);
    setSelectedClassId(null);
  }

  // Browsing a category (or searching) always returns to the grid — never leaves
  // you stuck on the previously-opened asset's detail screen.
  function showCategory(c: string) {
    setCategory(c);
    setSelectedPath(null);
    setSelectedLibId(null);
    setSelectedClassId(null);
  }

  const takenPaths = useMemo(() => new Set(files.map((f) => f.path)), [files]);

  async function importFiles(list: FileList | File[]) {
    // Imports always go to MY assets. Land in the selected VFS category when one
    // is open, else `imported`. (The Library is read-only — D-ASSET-6.)
    const targetDir = source === 'mine' && category !== ALL ? category : 'imported';
    // Hard-block unsupported types + over-cap files: the backend rejects both, so
    // importing them would only fail the save. Block with a clear message before
    // reading anything. (Type guard also covers drag-drop, which ignores `accept`.)
    const incoming = Array.from(list);
    const badType = incoming.filter((f) => !isImportable(f));
    const importable = incoming.filter(isImportable);
    const tooBig = importable.filter((f) => f.size > MAX_ASSET_BYTES);
    const accepted = importable.filter((f) => f.size <= MAX_ASSET_BYTES);
    if (accepted.length === 0) {
      showSnack(importNotice(0, tooBig, badType), 'error');
      return;
    }

    // 1) Read + add each file to the VFS. Mark the path PENDING *before* createFile
    //    so it's hidden from the grid the instant it enters the VFS (no flash of an
    //    unconfirmed asset) — the two updates batch into one render.
    setUploading(accepted.map((f) => f.name));
    const added: string[] = [];
    try {
      for (const file of accepted) {
        const dataUrl = await fileToDataUrl(file);
        const path = uniquePath(`assets/${targetDir}/${file.name}`, takenPaths);
        takenPaths.add(path);
        added.push(path);
        setPendingPaths((prev) => new Set([...prev, path]));
        createFile(path, 'asset', dataUrl);
      }
    } catch {
      added.forEach(remove); // roll back anything already added
      setPendingPaths((prev) => {
        const next = new Set(prev);
        added.forEach((p) => next.delete(p));
        return next;
      });
      setUploading(null);
      showSnack("Couldn't import that file — please try a different one.", 'error');
      return;
    }

    // 2) Confirm with the backend. The asset is REVEALED only if the save actually
    //    stored it; on any other result it's removed entirely (never shown as a
    //    fake-available asset). With no save seam (e.g. a project-less session) the
    //    upload is implicitly confirmed.
    const result: SaveResult = onSaveNow ? await onSaveNow() : { status: 'saved', version: 0 };
    setUploading(null);
    setPendingPaths((prev) => {
      const next = new Set(prev);
      added.forEach((p) => next.delete(p));
      return next;
    });

    if (result.status === 'saved') {
      if (source !== 'mine') {
        setSource('mine');
        setCategory(ALL);
        setSelectedLibId(null);
      }
      // Partial imports (some files skipped) read as a problem to fix → error tone.
      showSnack(
        importNotice(accepted.length, tooBig, badType),
        tooBig.length || badType.length ? 'error' : 'success',
      );
    } else {
      added.forEach(remove); // rollback — nothing reaches the grid unless stored
      showSnack(
        result.status === 'rejected'
          ? "Couldn't upload that file — it may be too big or unsupported."
          : "Couldn't upload — check your connection and try again.",
        'error',
      );
    }
  }

  // Generate / remix go INTO THE CHAT (D-ASSET §3): post the request so it shares
  // the one-AI-at-a-time lock and shows in the conversation. The new asset lands in
  // My assets when the chat turn completes.
  const onGenerate = useCallback(() => {
    if (!genPrompt.trim()) return;
    onRequestAssetGen?.(genPrompt.trim());
    setGenPrompt('');
  }, [genPrompt, onRequestAssetGen]);

  function onRemix(prompt: string, ref: { refAssetPath?: string; refUrl?: string }) {
    if (!prompt.trim()) return;
    onRequestAssetGen?.(prompt.trim(), ref);
  }

  // Try-demo seam (try-demo-mode-prd §3 step 7a): register the pane's REAL
  // affordances — the generate bar's prompt setter, the exact submit its
  // "✨ Generate" button calls, and the open-details path an asset-card tap
  // runs — so the tour drives this real UI. No-op outside the demo provider
  // (`useDemoMode()` is null everywhere else).
  const demo = useDemoMode();
  useEffect(() => {
    demo?.bindAssetPane?.({
      setGeneratePrompt: setGenPrompt,
      submitGenerate: onGenerate,
      openAssetDetails: (path) => {
        setSource('mine');
        setCategory(ALL);
        setSelectedLibId(null);
        setSelectedPath(path);
      },
    });
    // `onGenerate` is recreated per render, so this re-binds every render —
    // the registered submit always closes over the current prompt state.
  }, [demo, onGenerate]);

  // AI generation entry points (✨ Generate + Remix) are gated by the feature
  // flag. The public demo tour (`demo` != null) drives them through an offline
  // seam, so it bypasses the flag and keeps showcasing the feature.
  const genEntriesEnabled = ASSET_GENERATION_ENABLED || Boolean(demo);

  return (
    <div
      className="relative flex h-full w-full bg-pg-bg text-pg-text"
      // Drop / paste to import are gated in the read-only viewer (D-LV-6) — a
      // teacher must never add assets to the kid's project.
      onDragOver={readOnly ? undefined : (e) => e.preventDefault()}
      onDrop={
        readOnly
          ? undefined
          : (e) => {
              e.preventDefault();
              if (e.dataTransfer.files.length) void importFiles(e.dataTransfer.files);
            }
      }
      onPaste={
        readOnly
          ? undefined
          : (e) => {
              const imgs = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith('image/'));
              if (imgs.length) void importFiles(imgs);
            }
      }
    >
      {/* Left rail: source tabs + categories + actions */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-pg-border bg-pg-surface">
        <div className="flex flex-col gap-3 p-3">
          <SourceTabs source={source} onSource={switchSource} hasClassAssets={hasClassAssets} />
          <div className="flex items-center gap-2 rounded-lg border border-pg-border bg-pg-surface-2 px-2 py-1.5">
            <Search size={15} className="text-pg-text-muted" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedPath(null);
                setSelectedLibId(null);
                setSelectedClassId(null);
              }}
              placeholder={
                source === 'library'
                  ? 'Search the library…'
                  : source === 'class'
                    ? 'Search class assets…'
                    : 'Search assets…'
              }
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-pg-text-muted"
            />
          </div>
        </div>
        <nav className="min-h-0 flex-1 overflow-auto px-2 text-[13px]">
          <CategoryRow
            label={source === 'class' ? 'Class assets' : source === 'library' ? 'All' : 'All assets'}
            count={
              source === 'class'
                ? classList.length
                : source === 'library'
                  ? ASSET_LIBRARY.length
                  : assets.length
            }
            active={category === ALL}
            onClick={() => showCategory(ALL)}
          />
          {/* The Class source is a flat per-class list — no sub-categories. */}
          {source !== 'class' &&
            (source === 'library' ? libCategories : categories).map(([c, n]) => (
              <CategoryRow
                key={c}
                label={c}
                count={n}
                active={category === c}
                onClick={() => showCategory(c)}
              />
            ))}
        </nav>
        {source === 'mine' && !readOnly && (
          <div className="border-t border-pg-border p-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!!uploading}
                aria-busy={!!uploading}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-pg-border py-2 text-[12px] font-bold hover:bg-pg-text/5 disabled:opacity-70"
              >
                {uploading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Uploading…
                  </>
                ) : (
                  <>
                    <Upload size={15} /> Import
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPT_ATTR}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) void importFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </div>
            {/* The asset isn't in the grid yet — show the upload in progress here so
                it's clear something's happening until the backend confirms it. */}
            {uploading && (
              <div
                data-testid="asset-uploading"
                className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] font-bold text-pg-text-dim"
              >
                <Loader2 size={12} className="animate-spin text-brand-sky" />
                Uploading {uploading.join(', ')}…
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Snackbar — floats at the bottom of the PANE (not a layout banner). */}
      {snack && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
          <div
            data-testid="asset-snackbar"
            role="status"
            aria-live="polite"
            className="pg-snack pointer-events-auto flex max-w-full items-center gap-2 rounded-full bg-pg-text px-4 py-2 text-[12.5px] font-bold text-pg-bg shadow-lg"
          >
            {snack.tone === 'success' ? (
              <CheckCircle2 size={15} className="shrink-0 text-brand-mint" />
            ) : (
              <AlertTriangle size={15} className="shrink-0 text-brand-sunshine" />
            )}
            <span className="truncate">{snack.text}</span>
          </div>
        </div>
      )}

      {/* Main: grid OR detail */}
      <div className="flex min-w-0 flex-1 flex-col">
        {source === 'class' ? (
          selectedClass ? (
            <ClassAssetDetailView
              asset={selectedClass}
              items={classList}
              onBack={() => setSelectedClassId(null)}
            />
          ) : (
            <ClassAssetsGrid items={classVisible} onSelect={setSelectedClassId} />
          )
        ) : source === 'library' ? (
          selectedLib ? (
            <LibraryDetailView
              asset={selectedLib}
              busy={false}
              readOnly={readOnly}
              remixEnabled={genEntriesEnabled}
              onRemix={(p) => void onRemix(p, { refUrl: selectedLib.url })}
              onBack={() => setSelectedLibId(null)}
            />
          ) : (
            <LibraryGrid items={libVisible} onSelect={setSelectedLibId} />
          )
        ) : selected ? (
          <DetailView
            asset={selected}
            files={files}
            busy={false}
            readOnly={readOnly}
            remixEnabled={genEntriesEnabled}
            onRemix={(p) => void onRemix(p, { refAssetPath: selected.path })}
            onBack={() => setSelectedPath(null)}
            onRename={(to) => {
              rename(selected.path, to);
              setSelectedPath(to);
            }}
            onDelete={() => {
              remove(selected.path);
              setSelectedPath(null);
            }}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Generate is hidden in the read-only viewer (D-LV-6) and when the
                asset-generation feature is disabled (featureFlags). */}
            {!readOnly && genEntriesEnabled && (
              <GenerateBar prompt={genPrompt} onPrompt={setGenPrompt} onGenerate={onGenerate} />
            )}
            <div className="min-h-0 flex-1 overflow-auto p-4">
              {visible.length === 0 ? (
                <p className="mt-8 text-center text-[13px] text-pg-text-muted">
                  {genEntriesEnabled
                    ? 'No assets here yet — Import or ✨ Generate to add some.'
                    : 'No assets here yet — Import to add some.'}
                </p>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                  {visible.map((a) => {
                    const kind = assetKindOf(a.path, files);
                    return (
                      <button
                        key={a.path}
                        type="button"
                        data-testid="asset-card"
                        onClick={() => setSelectedPath(a.path)}
                        className="flex flex-col overflow-hidden rounded-xl border border-pg-border bg-pg-surface text-left transition-colors hover:border-brand-bubblegum/60"
                      >
                        <div className="relative h-28 bg-pg-surface-2 p-2">
                          <Thumb asset={a} kind={kind} />
                        </div>
                        <div className="px-2.5 py-2">
                          <p className="truncate text-[12.5px] font-bold">{basename(a.path)}</p>
                          <p className="text-[11px] text-pg-text-muted">
                            {kind}
                            {kind === 'sprite' ? ' · strip' : ''}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


/**
 * The source switch: Library | My assets, plus a Class tab that appears ONLY
 * when the project's class shared assets exist (class-shared-assets-prd).
 */
function SourceTabs({
  source,
  onSource,
  hasClassAssets,
}: {
  source: AssetSource;
  onSource: (s: AssetSource) => void;
  hasClassAssets: boolean;
}) {
  const tab = (id: AssetSource, label: string) => (
    <button
      type="button"
      data-testid={`asset-source-${id}`}
      aria-pressed={source === id}
      onClick={() => onSource(id)}
      className={clsx(
        'min-w-0 flex-1 truncate whitespace-nowrap rounded-lg px-1.5 py-1.5 text-center text-[12.5px] font-extrabold transition-colors',
        source === id ? 'bg-brand-bubblegum text-white' : 'text-pg-text-dim hover:bg-pg-text/5',
      )}
    >
      {label}
    </button>
  );
  // Labels stay short ("Mine", not "My assets") so all three fit one line in the
  // narrow (w-56) rail without wrapping when the Class tab is present.
  return (
    <div className="flex items-center gap-1 rounded-xl border border-pg-border bg-pg-surface-2 p-1">
      {tab('library', 'Library')}
      {tab('mine', 'Mine')}
      {hasClassAssets && tab('class', 'Class')}
    </div>
  );
}

/** Remix an image with AI — a prompt describing the change → a new variation. */
function RemixBar({ busy, onRemix }: { busy: boolean; onRemix: (prompt: string) => void }) {
  const [p, setP] = useState('');
  const go = useCallback(() => {
    if (p.trim()) {
      onRemix(p.trim());
      setP('');
    }
  }, [p, onRemix]);
  // Try-demo seam (try-demo-mode-prd §3 step 7b): hand the tour this bar's real
  // input setter + submit. No-op outside the demo provider.
  const demo = useDemoMode();
  useEffect(() => {
    // `go` is recreated per render → re-binds every render (fresh prompt closure).
    demo?.bindAssetRemix?.({ setPrompt: setP, submit: go });
  }, [demo, go]);
  return (
    <div className="rounded-xl border border-pg-border bg-pg-surface p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-extrabold">
        <Wand2 size={14} className="text-brand-bubblegum" /> Remix with AI
      </div>
      <div className="flex items-center gap-2">
        <input
          value={p}
          data-testid="asset-remix-prompt"
          onChange={(e) => setP(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') go();
          }}
          placeholder="Describe the change — e.g. 'make it blue'"
          className="min-w-0 flex-1 rounded-lg border border-pg-border bg-pg-surface-2 px-3 py-1.5 text-[13px] outline-none placeholder:text-pg-text-muted"
        />
        <button
          type="button"
          data-testid="asset-remix"
          onClick={go}
          disabled={busy || !p.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-bubblegum px-3 py-1.5 text-[12.5px] font-extrabold text-white disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
          Remix
        </button>
      </div>
    </div>
  );
}

/** The read-only Library grid (emoji thumbnails loaded from the CDN by URL). */
function LibraryGrid({ items, onSelect }: { items: LibraryAsset[]; onSelect: (id: string) => void }) {
  if (items.length === 0) {
    return (
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <p className="mt-8 text-center text-[13px] text-pg-text-muted">No library assets match your search.</p>
      </div>
    );
  }
  return (
    <div className="min-h-0 flex-1 overflow-auto p-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3">
        {items.map((a) => (
          <button
            key={a.id}
            type="button"
            data-testid="library-card"
            onClick={() => onSelect(a.id)}
            className="flex flex-col overflow-hidden rounded-xl border border-pg-border bg-pg-surface text-left transition-colors hover:border-brand-bubblegum/60"
          >
            <div className="flex h-20 items-center justify-center bg-pg-surface-2 p-2">
              <img
                src={a.thumbUrl}
                alt={a.name}
                crossOrigin="anonymous"
                loading="lazy"
                className="h-12 w-12 object-contain"
              />
            </div>
            <div className="px-2 py-1.5">
              <p className="truncate text-[12px] font-bold">{a.name}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/** The read-only Library asset detail: preview + Remix + copy code-ref. */
function LibraryDetailView({
  asset,
  busy,
  readOnly,
  remixEnabled = true,
  onRemix,
  onBack,
}: {
  asset: LibraryAsset;
  busy: boolean;
  readOnly?: boolean;
  remixEnabled?: boolean;
  onRemix: (prompt: string) => void;
  onBack: () => void;
}) {
  const snippet = libraryChatRef(asset.name, asset.kind, asset.url);
  const [lightbox, setLightbox] = useState(false);
  const isImage = asset.kind === 'image' || asset.kind === 'sprite';
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      {lightbox && isImage && (
        <ImageLightbox src={asset.url} alt={asset.name} onClose={() => setLightbox(false)} />
      )}
      <div className="flex items-center gap-2 border-b border-pg-border px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-semibold text-pg-text-dim hover:text-pg-text"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <span className="truncate text-[14px] font-extrabold">{asset.name}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-full bg-pg-text/10 px-2 py-0.5 text-[11px] font-bold capitalize text-pg-text-dim">
            Library
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div className="relative flex items-center justify-center rounded-xl border border-pg-border bg-pg-surface-2 p-6">
          <img
            src={asset.url}
            alt={asset.name}
            crossOrigin="anonymous"
            onClick={isImage ? () => setLightbox(true) : undefined}
            className={clsx('h-28 w-28 object-contain', isImage && 'cursor-zoom-in')}
          />
          {isImage && (
            <span className="absolute right-2 top-2">
              <EnlargeButton onClick={() => setLightbox(true)} />
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <dl className="rounded-xl border border-pg-border bg-pg-surface p-3 text-[12.5px]">
            <Row k="Name" v={asset.name} />
            <Row k="Category" v={asset.category} />
            <Row k="License" v={asset.license} />
            <Row k="Source" v="Shared library (read-only)" />
          </dl>

          {asset.kind === 'image' && !readOnly && remixEnabled && (
            <RemixBar busy={busy} onRemix={onRemix} />
          )}

          <div className="rounded-xl border border-pg-border bg-pg-surface p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12.5px] font-extrabold">{referenceLabel(asset.kind)}</span>
              <CopyButton text={snippet} />
            </div>
            <p className="mb-2 text-[11.5px] text-pg-text-muted">
              Paste this into the chat to ask the AI to use it.
            </p>
            <pre
              data-testid="library-codeRef"
              className="whitespace-pre-wrap break-words rounded-lg bg-pg-surface-2 p-2 text-[12px] leading-relaxed text-pg-text"
            >
              {snippet}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex w-full items-center justify-between rounded-lg px-3 py-1.5 capitalize transition-colors',
        active ? 'bg-brand-bubblegum/15 font-extrabold text-pg-text' : 'text-pg-text-dim hover:text-pg-text',
      )}
    >
      <span className="truncate">{label}</span>
      <span className={clsx('text-[12px]', active ? 'text-brand-bubblegum' : 'text-pg-text-muted')}>
        {count}
      </span>
    </button>
  );
}

function GenerateBar({
  prompt,
  onPrompt,
  onGenerate,
}: {
  prompt: string;
  onPrompt: (v: string) => void;
  onGenerate: () => void;
}) {
  return (
    <div className="shrink-0 border-b border-pg-border bg-pg-surface">
      <div className="flex items-center gap-2 px-3 py-2">
        <Sparkles size={16} className="text-brand-bubblegum" />
        <input
          value={prompt}
          data-testid="asset-generate-prompt"
          onChange={(e) => onPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onGenerate();
          }}
          placeholder="Describe an asset — e.g. 'a pixel coin' or 'a jump sound'…"
          className="min-w-0 flex-1 rounded-lg border border-pg-border bg-pg-surface-2 px-3 py-1.5 text-[13px] outline-none placeholder:text-pg-text-muted"
        />
        <button
          type="button"
          data-testid="asset-generate"
          onClick={onGenerate}
          disabled={!prompt.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-bubblegum px-3 py-1.5 text-[12.5px] font-extrabold text-white disabled:opacity-60"
        >
          <Sparkles size={15} /> Generate
        </button>
      </div>
    </div>
  );
}

function DetailView({
  asset,
  files,
  busy,
  readOnly,
  remixEnabled = true,
  onRemix,
  onBack,
  onRename,
  onDelete,
}: {
  asset: VfsFile;
  files: VfsFile[];
  busy: boolean;
  readOnly?: boolean;
  remixEnabled?: boolean;
  onRemix: (prompt: string) => void;
  onBack: () => void;
  onRename: (to: string) => void;
  onDelete: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(basename(asset.path));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dims, setDims] = useState<ImageMeta | null>(null);

  const kind = assetKindOf(asset.path, files);
  const anim = kind === 'sprite' ? parseAnimSidecar(files.find((f) => f.path === animSidecarPath(asset.path))) : null;
  const snippet = assetChatRef(asset, anim);
  // Decode dimensions from a blob: URL — Image() also chokes on a huge data: URL.
  const previewUrl = useObjectUrl(asset.content);

  useEffect(() => {
    setDims(null);
    if (kind === 'image' || kind === 'sprite') {
      let live = true;
      decodeImageMeta(previewUrl)
        .then((m) => {
          if (live) setDims(m);
        })
        .catch(() => undefined);
      return () => {
        live = false;
      };
    }
    return undefined;
  }, [previewUrl, kind]);

  function commitRename() {
    const next = nameDraft.trim();
    setRenaming(false);
    if (!next || next === basename(asset.path)) return;
    const dir = asset.path.slice(0, asset.path.lastIndexOf('/') + 1);
    onRename(`${dir}${next}`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <div className="flex items-center gap-2 border-b border-pg-border px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-semibold text-pg-text-dim hover:text-pg-text"
        >
          <ArrowLeft size={15} /> Back
        </button>
        {readOnly ? (
          // Read-only viewer (D-LV-6): the name is plain text — no rename.
          <span className="truncate text-[14px] font-extrabold">{basename(asset.path)}</span>
        ) : renaming ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') setRenaming(false);
            }}
            className="rounded-md border border-pg-border bg-pg-surface-2 px-2 py-0.5 text-[13px]"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setNameDraft(basename(asset.path));
              setRenaming(true);
            }}
            className="truncate text-[14px] font-extrabold"
            title="Rename"
          >
            {basename(asset.path)}
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-full bg-brand-bubblegum/15 px-2 py-0.5 text-[11px] font-bold capitalize text-pg-text-dim">
            {kind}
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <AssetPreview asset={asset} files={files} />

        <div className="flex flex-col gap-3">
          <dl className="rounded-xl border border-pg-border bg-pg-surface p-3 text-[12.5px]">
            <Row k="Path" v={asset.path} mono />
            <Row k="Category" v={categoryOf(asset.path)} />
            {dims && <Row k="Dimensions" v={`${dims.width} × ${dims.height}`} />}
            {anim && <Row k="Frames" v={`${anim.frames} @ ${anim.fps}fps · ${anim.frameWidth}×${anim.frameHeight}`} />}
            <Row k="Size" v={formatBytes(asset.size || asset.content.length)} />
          </dl>

          {(kind === 'image' || kind === 'sprite') && !readOnly && remixEnabled && (
            <RemixBar busy={busy} onRemix={onRemix} />
          )}

          <div className="rounded-xl border border-pg-border bg-pg-surface p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12.5px] font-extrabold">{referenceLabel(kind)}</span>
              <CopyButton text={snippet} testId="asset-copy-ref" />
            </div>
            <p className="mb-2 text-[11.5px] text-pg-text-muted">
              Paste this into the chat to ask the AI to use it.
            </p>
            <pre
              data-testid="asset-codeRef"
              className="whitespace-pre-wrap break-words rounded-lg bg-pg-surface-2 p-2 text-[12px] leading-relaxed text-pg-text"
            >
              {snippet}
            </pre>
          </div>

          {/* Delete is hidden in the read-only viewer (D-LV-6). */}
          {!readOnly &&
            (confirmDelete ? (
              <div className="flex items-center gap-2 rounded-xl border border-brand-coral/50 bg-brand-coral/10 p-3 text-[12.5px]">
                <span className="font-semibold">Delete this asset?</span>
                <button type="button" onClick={onDelete} className="ml-auto rounded-lg bg-brand-coral px-3 py-1 font-bold text-white">
                  Delete
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg border border-pg-border px-3 py-1 font-semibold">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-brand-coral/50 px-3 py-1.5 text-[12.5px] font-bold text-brand-coral hover:bg-brand-coral/10"
              >
                <Trash2 size={15} /> Delete
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <dt className="text-pg-text-muted">{k}</dt>
      <dd className={clsx('truncate text-right text-pg-text-dim', mono && 'font-mono')}>{v}</dd>
    </div>
  );
}
