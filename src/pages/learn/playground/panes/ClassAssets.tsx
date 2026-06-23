// The "Class" source of the Asset Viewer (class-shared-assets-prd): a read-only
// grid + detail of the media a teacher prepared for the kid's class, with a
// one-tap "Add to my game" that COPIES the bytes into the kid's VFS (exactly
// like an import). Modelled on the Library source (LibraryGrid /
// LibraryDetailView) — same chrome, same copy-code-ref affordance — but its
// items are real, per-class backend assets (ClassAssetView), not the shared
// emoji library.
//
// Security (playground/CLAUDE.md): a class asset enters the game ONLY by being
// copied into the VFS. The signed `download_url` is used to preview and to fetch
// the bytes once; it is NEVER referenced directly inside the sandboxed game.

import { useState } from 'react';

import { ArrowLeft, Copy, Film, Image as ImageIcon, Loader2, Music, Plus } from 'lucide-react';

import type { ClassAssetView } from './playgroundApi';
import { classAssetChatRef, formatBytes, referenceLabel, type AssetKind } from './assetMeta';
import { EnlargeButton, ImageLightbox } from './ImageLightbox';

const KIND_ICON: Record<ClassAssetView['kind'], typeof ImageIcon> = {
  image: ImageIcon,
  audio: Music,
  video: Film,
};

/** The read-only Class asset grid (image thumb by signed URL; icon for av). */
export function ClassAssetsGrid({
  items,
  onSelect,
}: {
  items: ClassAssetView[];
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) {
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
        {items.map((a) => {
          const Icon = KIND_ICON[a.kind];
          return (
            <button
              key={a.id}
              type="button"
              data-testid="class-asset-card"
              onClick={() => onSelect(a.id)}
              className="flex flex-col overflow-hidden rounded-xl border border-pg-border bg-pg-surface text-left transition-colors hover:border-brand-bubblegum/60"
            >
              <div className="relative h-28 bg-pg-surface-2 p-2">
                {a.kind === 'image' ? (
                  <img
                    src={a.download_url}
                    alt={a.name}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-brand-sky">
                    <Icon size={40} />
                  </div>
                )}
              </div>
              <div className="px-2.5 py-2">
                <p className="truncate text-[12.5px] font-bold">{a.name}</p>
                <p className="text-[11px] text-pg-text-muted">{a.kind}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The read-only Class asset detail: preview + metadata + Add to my game + copy-ref. */
export function ClassAssetDetailView({
  asset,
  busy,
  readOnly,
  onAdd,
  onBack,
  onCopyRef,
}: {
  asset: ClassAssetView;
  /** An add is in flight (fetching the signed bytes) — disable the button. */
  busy: boolean;
  /** Teacher live viewer (D-LV-6) — hide "Add to my game"; preview stays. */
  readOnly?: boolean;
  onAdd: () => void;
  onBack: () => void;
  onCopyRef: (snippet: string) => void;
}) {
  const snippet = classAssetChatRef(asset);
  const kind: AssetKind = asset.kind;
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
            Class
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div className="relative flex items-center justify-center rounded-xl border border-pg-border bg-pg-surface-2 p-6">
          {asset.kind === 'image' ? (
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
          ) : asset.kind === 'video' ? (
            <video src={asset.download_url} controls className="max-h-48 w-full object-contain" />
          ) : (
            <audio src={asset.download_url} controls className="w-full" />
          )}
        </div>

        <div className="flex flex-col gap-3">
          <dl className="rounded-xl border border-pg-border bg-pg-surface p-3 text-[12.5px]">
            <Row k="Name" v={asset.name} />
            <Row k="Kind" v={kind} />
            <Row k="Size" v={formatBytes(asset.size_bytes)} />
            <Row k="Source" v="Class library (from your teacher)" />
          </dl>

          {/* Add to my game is hidden in the read-only viewer (D-LV-6). */}
          {!readOnly && (
            <button
              type="button"
              data-testid="class-asset-add"
              onClick={onAdd}
              disabled={busy}
              className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-brand-bubblegum px-3 py-1.5 text-[12.5px] font-extrabold text-white disabled:opacity-60"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Add to my game
            </button>
          )}

          <div className="rounded-xl border border-pg-border bg-pg-surface p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12.5px] font-extrabold">{referenceLabel(kind)}</span>
              <button
                type="button"
                onClick={() => onCopyRef(snippet)}
                className="inline-flex items-center gap-1 rounded-lg border border-pg-border px-2 py-1 text-[11.5px] font-bold hover:bg-pg-text/5"
              >
                <Copy size={14} /> Copy
              </button>
            </div>
            <p className="mb-2 text-[11.5px] text-pg-text-muted">
              Add it to your game, then paste this into the chat to ask the AI to use it.
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
      {lightbox && asset.kind === 'image' && (
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
