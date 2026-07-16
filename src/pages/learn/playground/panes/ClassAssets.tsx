// The "Class" source of the Asset Viewer (class-shared-assets-prd): a read-only
// grid + detail of the media a teacher prepared for the kid's class. The kid
// copies the asset's REFERENCE (`assets/class/<name>`) and pastes it into the
// chat — the AI + runtime resolve it directly (Model A), with NO copy into the
// kid's VFS. Modelled on the Library source (LibraryGrid / LibraryDetailView) —
// same chrome, same copy-code-ref affordance — but its items are real, per-class
// backend assets (ClassAssetView), not the shared emoji library.
//
// Security (playground/CLAUDE.md): the signed `download_url` is used only to
// PREVIEW here and (at build time, on the parent origin) to resolve the bytes to
// an inlined `data:` URL; it is NEVER referenced directly inside the sandboxed
// game. Persisted copies happen only in the frozen public share snapshot (baked
// server-side at share-mint).

import { lazy, Suspense, useEffect, useState } from 'react';

import { ArrowLeft, Box, File, Film, Image as ImageIcon, Music } from 'lucide-react';

import { fetchClassAssetDataUrl, type ClassAssetView } from './playgroundApi';
import { animSidecarPath, classAssetChatRef, formatBytes, referenceLabel, type AssetKind } from './assetMeta';
import { CopyButton } from './CopyButton';
import { EnlargeButton, ImageLightbox } from './ImageLightbox';

// three.js enters the app bundle ONLY when a kid actually opens a 3D class model
// (mirrors AssetPreview's My-assets lazy import).
const ModelPreview = lazy(() => import('./ModelPreview'));

// The grid/detail display kind. The backend never sends `sprite` — an `image`
// item that has a sibling `<name>.anim.json` item in the list IS a sprite strip
// (same convention as the kid's own VFS assets — assetMeta.animSidecarPath).
type ClassDisplayKind = AssetKind;

const KIND_ICON: Record<ClassAssetView['kind'], typeof ImageIcon> = {
  image: ImageIcon,
  audio: Music,
  video: Film,
  model: Box,
  other: File,
};

/** The `.anim.json` sidecar item that makes `asset` a sprite strip, if present. */
function spriteSidecarOf(
  asset: ClassAssetView,
  items: readonly ClassAssetView[],
): ClassAssetView | undefined {
  if (asset.kind !== 'image') return undefined;
  const sidecarName = animSidecarPath(asset.name);
  return items.find((i) => i.name === sidecarName);
}

/** Whether an item is a sprite `.anim.json` sidecar (hidden from the grid). */
function isAnimSidecar(item: ClassAssetView): boolean {
  return item.name.endsWith('.anim.json');
}

/** The display kind for a class item — an image with a sidecar reads as `sprite`. */
function displayKindOf(asset: ClassAssetView, items: readonly ClassAssetView[]): ClassDisplayKind {
  if (asset.kind === 'image' && spriteSidecarOf(asset, items)) return 'sprite';
  return asset.kind;
}

/**
 * A class model's grid thumbnail: fetch the signed bytes once (the same signed
 * `download_url` used to preview) and render the real model still via the shared
 * `modelThumbnail` renderer My-assets uses — one shared WebGL context, cached by
 * content. Falls back to the 3D cube icon while fetching/rendering and on any
 * failure (an unparsable model or a network error never breaks the card).
 */
function ClassModelThumb({ projectId, assetId }: { projectId: string; assetId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const content = await fetchClassAssetDataUrl(projectId, assetId);
        const { modelThumbnail } = await import('./modelThumbnail');
        const u = await modelThumbnail(content);
        if (live) setUrl(u);
      } catch {
        /* leave the icon fallback in place */
      }
    })();
    return () => {
      live = false;
    };
  }, [projectId, assetId]);
  if (!url) {
    return (
      <div className="flex h-full w-full items-center justify-center text-brand-sky">
        <Box size={40} />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt=""
      data-testid="class-model-thumb"
      className="h-full w-full object-contain"
    />
  );
}

/**
 * A class model's detail preview: fetch the signed bytes, then hand them to the
 * same lazy `ModelPreview` three stage My-assets uses (it parses from a `data:`
 * URL, no network/blob-URL race). Falls back to the 3D cube while fetching and if
 * the bytes can't be loaded — a glb NEVER crashes the detail view.
 */
function ClassModelStage({ projectId, assetId }: { projectId: string; assetId: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    setContent(null);
    setFailed(false);
    void fetchClassAssetDataUrl(projectId, assetId)
      .then((c) => {
        if (live) setContent(c);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [projectId, assetId]);
  if (failed) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center text-brand-sky">
        <Box size={48} />
      </div>
    );
  }
  if (!content) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl bg-pg-surface-2 text-[13px] text-pg-text-dim">
        Opening 3D model…
      </div>
    );
  }
  return (
    <Suspense
      fallback={
        <div className="flex h-[300px] items-center justify-center rounded-xl bg-pg-surface-2 text-[13px] text-pg-text-dim">
          Opening 3D model…
        </div>
      }
    >
      <ModelPreview src={content} />
    </Suspense>
  );
}

// The merged endpoint (D-CSA-3) labels each asset's origin: a course-pack default
// (set by Airbotix) vs a class asset the teacher added. Keep the copy tiny + kid-
// friendly; both are referenced identically at `assets/class/<name>`.
const SOURCE_BADGE: Record<ClassAssetView['source'], string> = {
  course: 'Course',
  class: 'Class',
};
const SOURCE_DETAIL: Record<ClassAssetView['source'], string> = {
  course: 'Course library (set by Airbotix)',
  class: 'Class library (from your teacher)',
};

/** The read-only Class asset grid (image thumb by signed URL; icon for av). */
export function ClassAssetsGrid({
  items,
  projectId,
  onSelect,
}: {
  items: ClassAssetView[];
  /** The current project — model thumbnails read bytes via its same-origin proxy. */
  projectId: string;
  onSelect: (id: string) => void;
}) {
  // Sidecar `.anim.json` items are metadata for their sibling sprite image — hidden
  // from the grid (they never render as their own card), exactly like My-assets
  // (AssetViewerPane.isDisplayable / ANIM_SUFFIX).
  const displayable = items.filter((i) => !isAnimSidecar(i));
  if (displayable.length === 0) {
    return (
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <p className="mt-8 text-center text-[13px] text-pg-text-muted">
          No class assets match your search.
        </p>
      </div>
    );
  }
  return (
    <div className="min-h-0 flex-1 overflow-auto p-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
        {displayable.map((a) => {
          const kind = displayKindOf(a, items);
          return (
            <button
              key={a.id}
              type="button"
              data-testid="class-asset-card"
              onClick={() => onSelect(a.id)}
              className="flex flex-col overflow-hidden rounded-xl border border-pg-border bg-pg-surface text-left transition-colors hover:border-brand-bubblegum/60"
            >
              <div className="relative h-28 bg-pg-surface-2 p-2">
                <ClassThumb asset={a} kind={kind} projectId={projectId} />
              </div>
              <div className="px-2.5 py-2">
                <p className="truncate text-[12.5px] font-bold">{a.name}</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] text-pg-text-muted">
                    {kind === 'sprite' ? 'sprite sheet' : kind}
                  </p>
                  <span
                    data-testid="class-asset-source"
                    className="rounded-full bg-pg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-pg-text-muted"
                  >
                    {SOURCE_BADGE[a.source]}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * A class asset's grid thumbnail, by display kind: image/sprite render the signed
 * URL still; `model` renders the real 3D still (or a cube while it loads); `other`
 * (data/fonts/shaders) and av get their kind icon.
 */
function ClassThumb({
  asset,
  kind,
  projectId,
}: {
  asset: ClassAssetView;
  kind: ClassDisplayKind;
  projectId: string;
}) {
  if (kind === 'image' || kind === 'sprite') {
    return (
      <img
        src={asset.download_url}
        alt={asset.name}
        loading="lazy"
        className="h-full w-full object-contain"
      />
    );
  }
  if (kind === 'model') {
    return <ClassModelThumb projectId={projectId} assetId={asset.id} />;
  }
  const Icon = KIND_ICON[asset.kind];
  return (
    <div className="flex h-full w-full items-center justify-center text-brand-sky">
      <Icon size={40} />
    </div>
  );
}

/** The read-only Class asset detail: preview + metadata + copy-ref. A class asset
 *  is referenced directly at `assets/class/<name>` — there is no copy step
 *  (class-shared-assets-prd, Model A), so the kid just copies the reference. */
export function ClassAssetDetailView({
  asset,
  items,
  projectId,
  onBack,
}: {
  asset: ClassAssetView;
  /** The full merged list — used to detect a sprite (its `.anim.json` sidecar). */
  items: readonly ClassAssetView[];
  /** The current project — the 3D model stage reads bytes via its same-origin proxy. */
  projectId: string;
  onBack: () => void;
}) {
  const kind: AssetKind = displayKindOf(asset, items);
  const snippet = classAssetChatRef(asset);
  const isImage = kind === 'image' || kind === 'sprite';
  const [lightbox, setLightbox] = useState(false);
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
        <span className="truncate text-[14px] font-extrabold">{asset.name}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-full bg-pg-text/10 px-2 py-0.5 text-[11px] font-bold capitalize text-pg-text-dim">
            {SOURCE_BADGE[asset.source]}
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div className="relative flex items-center justify-center rounded-xl border border-pg-border bg-pg-surface-2 p-6">
          {isImage ? (
            // A sprite strip shows its still (its frames animate in-game); still
            // images enlarge on click.
            <>
              <img
                src={asset.download_url}
                alt={asset.name}
                onClick={() => setLightbox(true)}
                className="max-h-48 w-full cursor-zoom-in object-contain"
              />
              <span className="absolute right-2 top-2">
                <EnlargeButton onClick={() => setLightbox(true)} />
              </span>
            </>
          ) : kind === 'model' ? (
            <div className="w-full">
              <ClassModelStage projectId={projectId} assetId={asset.id} />
            </div>
          ) : asset.kind === 'video' ? (
            <video src={asset.download_url} controls className="max-h-48 w-full object-contain" />
          ) : asset.kind === 'audio' ? (
            <audio src={asset.download_url} controls className="w-full" />
          ) : (
            // `other` (data / fonts / shaders) has no player — a file icon + name.
            <div className="flex flex-col items-center gap-2 py-6 text-brand-sky">
              <File size={48} />
              <span className="max-w-full truncate text-[12.5px] font-bold text-pg-text-dim">
                {asset.name}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <dl className="rounded-xl border border-pg-border bg-pg-surface p-3 text-[12.5px]">
            <Row k="Name" v={asset.name} />
            <Row k="Kind" v={kind} />
            <Row k="Size" v={formatBytes(asset.size_bytes)} />
            <Row k="Source" v={SOURCE_DETAIL[asset.source]} />
          </dl>

          <div className="rounded-xl border border-pg-border bg-pg-surface p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12.5px] font-extrabold">{referenceLabel(kind)}</span>
              <CopyButton text={snippet} testId="class-asset-copy-ref" />
            </div>
            <p className="mb-2 text-[11.5px] text-pg-text-muted">
              Paste this into the chat to ask the AI to use it in your game.
            </p>
            <pre
              data-testid="class-asset-codeRef"
              className="whitespace-pre-wrap break-words rounded-lg bg-pg-surface-2 p-2 text-[12px] leading-relaxed text-pg-text"
            >
              {snippet}
            </pre>
          </div>
        </div>
      </div>
      {lightbox && isImage && (
        <ImageLightbox src={asset.download_url} alt={asset.name} onClose={() => setLightbox(false)} />
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <dt className="text-pg-text-muted">{k}</dt>
      <dd className="truncate text-right capitalize text-pg-text-dim">{v}</dd>
    </div>
  );
}
