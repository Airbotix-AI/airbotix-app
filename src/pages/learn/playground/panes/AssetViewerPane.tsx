// The Asset Viewer pane (design §5–7) — used identically by Window mode (a
// floating window) and Split mode (the "Assets" tab). Organised browsing +
// preview, edit/manage, and AI generation, over the existing VFS. All mutations
// go through projectStore (the single funnel); nothing here changes the VFS
// schema. Sidecar `.anim.json` files are hidden from the grid (they're metadata
// for their sibling sprite).

import { useEffect, useMemo, useRef, useState } from 'react';

import clsx from 'clsx';
import {
  ArrowLeft,
  Copy,
  Film,
  Image as ImageIcon,
  Loader2,
  Music,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';

import type { VfsFile } from '../../code/codeApi';
import { runGen } from '../assetGen';
import { addAssetToGame } from './assetInsert';
import { useProjectStore } from '../projectStore';
import { readWorkspaceSlice, writeWorkspaceSlice } from '../workspaceUiStore';
import { AssetPreview } from './AssetPreview';
import {
  animSidecarPath,
  assetKindOf,
  categoryOf,
  codeRefFor,
  decodeImageMeta,
  formatBytes,
  parseAnimSidecar,
  type AssetKind,
  type ImageMeta,
} from './assetMeta';

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
}

const ALL = '__all__';
const SOFT_SIZE_CAP = 4 * 1024 * 1024; // 4 MB — warn (esp. video) but still import
const ANIM_SUFFIX = '.anim.json';
// The stub returns instantly; hold the loading state briefly so the generating
// animation is actually visible (and it reads like real generation latency).
const MIN_GEN_MS = 900;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAsset(f: VfsFile): boolean {
  return f.kind === 'asset' || f.path.startsWith('assets/');
}
function isDisplayable(f: VfsFile): boolean {
  return isAsset(f) && !f.path.endsWith(ANIM_SUFFIX);
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

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'audio/wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
};

/** Map a generated asset's mime → file extension (fallback by kind). */
function extForResult(kind: 'image' | 'audio', mime: string): string {
  return MIME_EXT[mime] ?? (kind === 'audio' ? 'wav' : 'svg');
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
  text: ImageIcon,
  other: ImageIcon,
};

function Thumb({ asset, kind }: { asset: VfsFile; kind: AssetKind }) {
  if (kind === 'image' || kind === 'sprite') {
    return <img src={asset.content} alt="" className="h-full w-full object-contain" />;
  }
  if (kind === 'video') {
    return <video src={asset.content} className="h-full w-full object-contain" muted />;
  }
  const Icon = KIND_ICON[kind];
  return (
    <div className="flex h-full w-full items-center justify-center text-brand-sky">
      <Icon size={40} />
    </div>
  );
}

export function AssetViewerPane({ files, projectId, onApplyFiles }: AssetViewerPaneProps) {
  const createFile = useProjectStore((s) => s.createFile);
  const rename = useProjectStore((s) => s.rename);
  const remove = useProjectStore((s) => s.remove);

  // Persisted Asset Viewer selections (J9 "resume where I left off").
  const assetSeed = useRef(
    readWorkspaceSlice('asset-viewer', {
      assetCategory: ALL,
      assetQuery: '',
      assetSelectedPath: null as string | null,
    }),
  ).current;
  const [category, setCategory] = useState<string>(() => assetSeed.assetCategory);
  const [query, setQuery] = useState(() => assetSeed.assetQuery);
  const [selectedPath, setSelectedPath] = useState<string | null>(() => assetSeed.assetSelectedPath);
  useEffect(() => {
    writeWorkspaceSlice('asset-viewer', {
      assetCategory: category,
      assetQuery: query,
      assetSelectedPath: selectedPath,
    });
  }, [category, query, selectedPath]);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI generate form
  const [genPrompt, setGenPrompt] = useState('');
  const [genKind, setGenKind] = useState<'image' | 'audio'>('image');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const assets = useMemo(() => files.filter(isDisplayable), [files]);

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

  // Browsing a category (or searching) always returns to the grid — never leaves
  // you stuck on the previously-opened asset's detail screen.
  function showCategory(c: string) {
    setCategory(c);
    setSelectedPath(null);
  }

  const takenPaths = useMemo(() => new Set(files.map((f) => f.path)), [files]);
  const targetDir = category === ALL ? 'imported' : category;

  async function importFiles(list: FileList | File[]) {
    let warned = false;
    for (const file of Array.from(list)) {
      if (file.size > SOFT_SIZE_CAP) warned = true;
      const dataUrl = await fileToDataUrl(file);
      const path = uniquePath(`assets/${targetDir}/${file.name}`, takenPaths);
      takenPaths.add(path);
      createFile(path, 'asset', dataUrl);
    }
    setNotice(
      warned
        ? 'Imported. Heads-up: a file is large (>4 MB) — big assets bloat the project.'
        : 'Imported.',
    );
  }

  async function onGenerate() {
    if (!genPrompt.trim() || generating) return;
    setGenerating(true);
    setNotice(null);
    setGenError(null);
    try {
      const [result] = await Promise.all([
        runGen({
          projectId,
          kind: genKind,
          prompt: genPrompt.trim(),
          refAssetPath: selectedPath ?? undefined,
        }),
        sleep(MIN_GEN_MS),
      ]);
      // Pick the extension from the returned mime (real backend may return png /
      // mp3); fall back to the stub's svg / wav.
      const ext = extForResult(genKind, result.mime);
      const slug = genPrompt.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 24) || 'asset';
      const path = uniquePath(`assets/generated/${slug}.${ext}`, takenPaths);
      createFile(path, 'asset', result.dataUrl);
      setSelectedPath(path);
      setNotice(projectId ? 'Generated ✨ — add it to your game below.' : 'Generated (AI demo).');
    } catch {
      // Calm, kid-framed retry copy (never a frozen screen — PRD J5 offline).
      setGenError("That didn't work — check your internet and try again.");
    } finally {
      setGenerating(false);
    }
  }

  /** One-tap "Add to my game": write the loader + a sensible use into a scene. */
  function onAddToGame(addAsset: VfsFile) {
    if (!onApplyFiles) return;
    const r = addAssetToGame(files, addAsset);
    if (!r.files) {
      setNotice("Couldn't find a scene to add it to — open the code and load it yourself.");
      return;
    }
    onApplyFiles(r.files);
    setNotice(`Added '${r.key}' to your game ✨ — press Play to see it!`);
  }

  return (
    <div
      className="flex h-full w-full bg-pg-bg text-pg-text"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length) void importFiles(e.dataTransfer.files);
      }}
      onPaste={(e) => {
        const imgs = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith('image/'));
        if (imgs.length) void importFiles(imgs);
      }}
    >
      {/* Left rail: categories + actions */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-pg-border bg-pg-surface">
        <div className="p-3">
          <div className="flex items-center gap-2 rounded-lg border border-pg-border bg-pg-surface-2 px-2 py-1.5">
            <Search size={15} className="text-pg-text-muted" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedPath(null);
              }}
              placeholder="Search assets…"
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-pg-text-muted"
            />
          </div>
        </div>
        <nav className="min-h-0 flex-1 overflow-auto px-2 text-[13px]">
          <CategoryRow
            label="All assets"
            count={assets.length}
            active={category === ALL}
            onClick={() => showCategory(ALL)}
          />
          {categories.map(([c, n]) => (
            <CategoryRow
              key={c}
              label={c}
              count={n}
              active={category === c}
              onClick={() => showCategory(c)}
            />
          ))}
        </nav>
        <div className="flex gap-2 border-t border-pg-border p-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-pg-border py-2 text-[12px] font-bold hover:bg-pg-text/5"
          >
            <Upload size={15} /> Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,audio/*,video/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void importFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      </aside>

      {/* Main: grid OR detail */}
      <div className="flex min-w-0 flex-1 flex-col">
        {notice && (
          <div className="border-b border-pg-border bg-brand-bubblegum/10 px-4 py-1.5 text-[12px] text-pg-text-dim">
            {notice}
          </div>
        )}
        {selected ? (
          <DetailView
            asset={selected}
            files={files}
            canAddToGame={!!onApplyFiles}
            onAddToGame={() => onAddToGame(selected)}
            onBack={() => setSelectedPath(null)}
            onRename={(to) => {
              rename(selected.path, to);
              setSelectedPath(to);
            }}
            onDelete={() => {
              remove(selected.path);
              setSelectedPath(null);
            }}
            onCopyRef={(snippet) => {
              void navigator.clipboard?.writeText(snippet);
              setNotice('Code copied — paste it into your game.');
            }}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <GenerateBar
              prompt={genPrompt}
              kind={genKind}
              busy={generating}
              error={genError}
              onPrompt={setGenPrompt}
              onKind={setGenKind}
              onGenerate={() => void onGenerate()}
            />
            <div className="min-h-0 flex-1 overflow-auto p-4">
              {visible.length === 0 && !generating ? (
                <p className="mt-8 text-center text-[13px] text-pg-text-muted">
                  No assets here yet — Import or ✨ Generate to add some.
                </p>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                  {generating && <GeneratingCard />}
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

function GeneratingCard() {
  return (
    <div className="flex animate-pulse flex-col overflow-hidden rounded-xl border border-brand-bubblegum/50 bg-pg-surface">
      <div className="flex h-28 items-center justify-center bg-pg-surface-2">
        <Loader2 size={30} className="animate-spin text-brand-bubblegum" />
      </div>
      <div className="px-2.5 py-2">
        <p className="text-[12.5px] font-bold text-brand-bubblegum">Generating…</p>
        <p className="text-[11px] text-pg-text-muted">AI demo</p>
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
  kind,
  busy,
  error,
  onPrompt,
  onKind,
  onGenerate,
}: {
  prompt: string;
  kind: 'image' | 'audio';
  busy: boolean;
  error: string | null;
  onPrompt: (v: string) => void;
  onKind: (k: 'image' | 'audio') => void;
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
          placeholder="Describe an asset to generate with AI…"
          className="min-w-0 flex-1 rounded-lg border border-pg-border bg-pg-surface-2 px-3 py-1.5 text-[13px] outline-none placeholder:text-pg-text-muted"
        />
        <select
          value={kind}
          onChange={(e) => onKind(e.target.value as 'image' | 'audio')}
          className="rounded-lg border border-pg-border bg-pg-surface-2 px-2 py-1.5 text-[12px] font-semibold"
        >
          <option value="image">image</option>
          <option value="audio">audio</option>
        </select>
        <button
          type="button"
          data-testid="asset-generate"
          onClick={onGenerate}
          disabled={busy || !prompt.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-bubblegum px-3 py-1.5 text-[12.5px] font-extrabold text-white disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {busy ? 'Generating…' : 'Generate'}
        </button>
      </div>
      {error && (
        <div
          data-testid="asset-generate-error"
          className="border-t border-brand-coral/40 bg-brand-coral/10 px-4 py-1.5 text-[12px] text-brand-coral"
        >
          {error}
        </div>
      )}
    </div>
  );
}

function DetailView({
  asset,
  files,
  canAddToGame,
  onAddToGame,
  onBack,
  onRename,
  onDelete,
  onCopyRef,
}: {
  asset: VfsFile;
  files: VfsFile[];
  canAddToGame: boolean;
  onAddToGame: () => void;
  onBack: () => void;
  onRename: (to: string) => void;
  onDelete: () => void;
  onCopyRef: (snippet: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(basename(asset.path));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dims, setDims] = useState<ImageMeta | null>(null);

  const kind = assetKindOf(asset.path, files);
  const anim = kind === 'sprite' ? parseAnimSidecar(files.find((f) => f.path === animSidecarPath(asset.path))) : null;
  const snippet = codeRefFor(asset, anim);

  useEffect(() => {
    setDims(null);
    if ((kind === 'image' || kind === 'sprite') && asset.content.startsWith('data:')) {
      let live = true;
      decodeImageMeta(asset.content)
        .then((m) => {
          if (live) setDims(m);
        })
        .catch(() => undefined);
      return () => {
        live = false;
      };
    }
    return undefined;
  }, [asset.content, kind]);

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
        {renaming ? (
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

          {/* One-tap insert (PRD J5): a kid won't hand-paste the code-ref, so the
              primary action wires the loader + a use into a scene automatically.
              The code-ref below is kept for older kids who want to do it by hand. */}
          {canAddToGame && (
            <button
              type="button"
              data-testid="asset-add-to-game"
              onClick={onAddToGame}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-bubblegum px-3 py-2.5 text-[13px] font-extrabold text-white transition-colors hover:bg-brand-bubblegum/90"
            >
              <Plus size={16} /> Add to my game
            </button>
          )}

          <div className="rounded-xl border border-pg-border bg-pg-surface p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12.5px] font-extrabold">Use it in your code</span>
              <button
                type="button"
                onClick={() => onCopyRef(snippet)}
                className="inline-flex items-center gap-1 rounded-lg border border-pg-border px-2 py-1 text-[11.5px] font-bold hover:bg-pg-text/5"
              >
                <Copy size={14} /> Copy
              </button>
            </div>
            <pre
              data-testid="asset-codeRef"
              className="whitespace-pre-wrap break-all rounded-lg bg-pg-surface-2 p-2 font-mono text-[12px] leading-relaxed text-pg-text"
            >
              {snippet}
            </pre>
          </div>

          {confirmDelete ? (
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
          )}
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
