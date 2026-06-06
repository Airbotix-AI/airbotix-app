import { useMemo, useRef, useState, type DragEvent } from 'react';
import {
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  File,
  FileAudio,
  FileCode2,
  FileImage,
  FileJson,
  FilePlus2,
  FileText,
  FileType,
  Folder,
  FolderPlus,
  Pencil,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { VfsFile } from '../../code/codeApi';
import { useProjectStore } from '../projectStore';
import { basename, dirname, joinPath } from '../vfsOps';

interface FileTreeProps {
  files: VfsFile[];
  activePath: string;
  onSelect: (path: string) => void;
}

type TabId = 'text' | 'asset';

const TABS: ReadonlyArray<{ id: TabId; label: string; Icon: LucideIcon }> = [
  { id: 'text', label: 'Files', Icon: FileText },
  { id: 'asset', label: 'Assets', Icon: Boxes },
];

const FILE_ICON: Record<string, LucideIcon> = {
  js: FileCode2,
  ts: FileCode2,
  css: FileType,
  json: FileJson,
  txt: FileText,
  md: FileText,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  gif: FileImage,
  svg: FileImage,
  webp: FileImage,
  mp3: FileAudio,
  wav: FileAudio,
  ogg: FileAudio,
  m4a: FileAudio,
};

function iconFor(path: string): LucideIcon {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return FILE_ICON[ext] ?? File;
}

/** Asset bucket = the `assets/` subtree (or files explicitly flagged `kind:'asset'`). */
function isAssetPath(path: string): boolean {
  return path === 'assets' || path.startsWith('assets/');
}
function isAssetFile(file: VfsFile): boolean {
  return file.kind === 'asset' || isAssetPath(file.path);
}

// ── Tree model ──────────────────────────────────────────────────────────────

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
}

/** Build a nested tree from flat file paths + explicit empty-folder paths. */
function buildTree(files: VfsFile[], folders: string[]): TreeNode[] {
  const root: TreeNode = { name: '', path: '', isFolder: true, children: [] };

  const addPath = (path: string, leafIsFolder: boolean) => {
    const segments = path.split('/').filter(Boolean);
    let cursor = root;
    segments.forEach((segment, i) => {
      const isLeaf = i === segments.length - 1;
      const isFolder = isLeaf ? leafIsFolder : true;
      const nodePath = segments.slice(0, i + 1).join('/');
      let child = cursor.children.find((c) => c.name === segment && c.isFolder === isFolder);
      if (!child) {
        child = { name: segment, path: nodePath, isFolder, children: [] };
        cursor.children.push(child);
      }
      cursor = child;
    });
  };

  for (const file of files) addPath(file.path, false); // leaf is a file
  for (const folder of folders) addPath(folder, true); // leaf is a folder

  const sort = (nodes: TreeNode[]): TreeNode[] => {
    nodes.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => n.isFolder && sort(n.children));
    return nodes;
  };

  return sort(root.children);
}

function collectFolderPaths(nodes: TreeNode[], acc: Set<string>): Set<string> {
  for (const node of nodes) {
    if (node.isFolder) {
      acc.add(node.path);
      collectFolderPaths(node.children, acc);
    }
  }
  return acc;
}

// ── Inline name input (create + rename) ───────────────────────────────────────

function NameInput({
  initial,
  depth,
  Icon,
  onCommit,
  onCancel,
}: {
  initial: string;
  depth: number;
  Icon: LucideIcon;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div
      className="flex items-center gap-1.5 rounded-lg py-1 pr-2"
      style={{ paddingLeft: `${depth * 14 + 4}px` }}
    >
      <span className="w-3.5 shrink-0" aria-hidden />
      <Icon size={14} className="shrink-0 text-pg-text-muted" aria-hidden />
      <input
        autoFocus
        aria-label="File or folder name"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit(value.trim());
          if (e.key === 'Escape') onCancel();
        }}
        onBlur={() => (value.trim() ? onCommit(value.trim()) : onCancel())}
        className="min-w-0 flex-1 rounded border border-brand-sky bg-pg-surface px-1 py-0.5 text-[13px] text-pg-text focus:outline-none"
      />
    </div>
  );
}

// ── Rendering ────────────────────────────────────────────────────────────────

interface RowProps {
  node: TreeNode;
  depth: number;
  activePath: string;
  expanded: Set<string>;
  renaming: string | null;
  confirming: string | null;
  creatingIn: string | null;
  createKind: 'file' | 'folder';
  dragOver: string | null;
  canDrop: (target: string) => boolean;
  onDragStart: (path: string) => void;
  onDragEnd: () => void;
  onDragOverFolder: (path: string, e: DragEvent) => void;
  onDragLeaveFolder: (path: string) => void;
  onDropOnFolder: (path: string, e: DragEvent) => void;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  onStartRename: (path: string) => void;
  onCommitRename: (path: string, name: string) => void;
  onStartCreate: (dir: string, kind: 'file' | 'folder') => void;
  onCommitCreate: (name: string) => void;
  onAskDelete: (path: string) => void;
  onConfirmDelete: (path: string) => void;
  onCancel: () => void;
}

function TreeRow(props: RowProps) {
  const { node, depth, activePath, expanded, renaming, confirming, creatingIn, createKind } = props;
  const indent = { paddingLeft: `${depth * 14 + 4}px` };

  if (renaming === node.path) {
    return (
      <li>
        <NameInput
          initial={node.name}
          depth={depth}
          Icon={node.isFolder ? Folder : iconFor(node.path)}
          onCommit={(name) => props.onCommitRename(node.path, name)}
          onCancel={props.onCancel}
        />
      </li>
    );
  }

  const ActionButtons = (
    <span className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
      {node.isFolder && (
        <button
          type="button"
          aria-label={`New file in ${node.name}`}
          onClick={(e) => {
            e.stopPropagation();
            props.onStartCreate(node.path, 'file');
          }}
          className="rounded p-0.5 text-pg-text-muted hover:bg-pg-text/10 hover:text-pg-text"
        >
          <FilePlus2 size={13} />
        </button>
      )}
      <button
        type="button"
        aria-label={`Rename ${node.name}`}
        onClick={(e) => {
          e.stopPropagation();
          props.onStartRename(node.path);
        }}
        className="rounded p-0.5 text-pg-text-muted hover:bg-pg-text/10 hover:text-pg-text"
      >
        <Pencil size={13} />
      </button>
      <button
        type="button"
        aria-label={`Delete ${node.name}`}
        onClick={(e) => {
          e.stopPropagation();
          props.onAskDelete(node.path);
        }}
        className="rounded p-0.5 text-pg-text-muted hover:bg-wash-coral hover:text-brand-coral"
      >
        <Trash2 size={13} />
      </button>
    </span>
  );

  const DeleteConfirm = (
    <span className="ml-auto flex shrink-0 items-center gap-1 text-[11px] font-bold text-brand-coral">
      Delete?
      <button
        type="button"
        aria-label={`Confirm delete ${node.name}`}
        onClick={(e) => {
          e.stopPropagation();
          props.onConfirmDelete(node.path);
        }}
        className="rounded p-0.5 hover:bg-wash-coral"
      >
        <Check size={13} />
      </button>
      <button
        type="button"
        aria-label="Cancel delete"
        onClick={(e) => {
          e.stopPropagation();
          props.onCancel();
        }}
        className="rounded p-0.5 text-pg-text-muted hover:bg-pg-text/10"
      >
        <X size={13} />
      </button>
    </span>
  );

  if (node.isFolder) {
    const isOpen = expanded.has(node.path);
    const Chevron = isOpen ? ChevronDown : ChevronRight;
    const dropping = props.dragOver === node.path;
    return (
      <li>
        <div
          data-path={node.path}
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            props.onDragStart(node.path);
          }}
          onDragEnd={props.onDragEnd}
          onDragOver={(e) => props.onDragOverFolder(node.path, e)}
          onDragLeave={() => props.onDragLeaveFolder(node.path)}
          onDrop={(e) => props.onDropOnFolder(node.path, e)}
          className={`group flex items-center rounded-lg pr-2 transition-colors ${
            dropping ? 'bg-brand-sky/20 ring-1 ring-brand-sky' : 'hover:bg-pg-text/5'
          }`}
          style={indent}
        >
          <button
            type="button"
            onClick={() => props.onToggle(node.path)}
            className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left text-[13px] font-semibold text-pg-text-dim hover:text-pg-text"
          >
            <Chevron size={14} className="shrink-0 text-pg-text-muted" aria-hidden />
            <Folder size={14} className="shrink-0 text-pg-text-muted" aria-hidden />
            <span className="truncate">{node.name}</span>
          </button>
          {confirming === node.path ? DeleteConfirm : ActionButtons}
        </div>
        {isOpen && (
          <ul className="space-y-0.5">
            {creatingIn === node.path && (
              <li>
                <NameInput
                  initial=""
                  depth={depth + 1}
                  Icon={createKind === 'folder' ? Folder : File}
                  onCommit={props.onCommitCreate}
                  onCancel={props.onCancel}
                />
              </li>
            )}
            {node.children.map((child) => (
              <TreeRow key={child.path} {...props} node={child} depth={depth + 1} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const isActive = node.path === activePath;
  const Icon = iconFor(node.path);
  return (
    <li>
      <div
        data-path={node.path}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          props.onDragStart(node.path);
        }}
        onDragEnd={props.onDragEnd}
        className={`group flex items-center rounded-lg pr-2 transition-colors ${
          isActive ? 'bg-brand-sky/15' : 'hover:bg-pg-text/5'
        }`}
        style={indent}
      >
        <button
          type="button"
          onClick={() => props.onSelect(node.path)}
          className={`flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left text-[13px] font-semibold ${
            isActive ? 'text-pg-text' : 'text-pg-text-dim hover:text-pg-text'
          }`}
        >
          <span className="w-3.5 shrink-0" aria-hidden />
          <Icon size={14} className="shrink-0" aria-hidden />
          <span className="truncate">{node.name}</span>
        </button>
        {confirming === node.path ? DeleteConfirm : ActionButtons}
      </div>
    </li>
  );
}

export function FileTree({ files, activePath, onSelect }: FileTreeProps) {
  const [tab, setTab] = useState<TabId>('text');
  const folders = useProjectStore((s) => s.folders);
  const createFile = useProjectStore((s) => s.createFile);
  const createFolder = useProjectStore((s) => s.createFolder);
  const renameOp = useProjectStore((s) => s.rename);
  const removeOp = useProjectStore((s) => s.remove);
  const moveOp = useProjectStore((s) => s.move);

  // Root for the current tab: assets live under `assets/`, source at the root.
  const baseDir = tab === 'asset' ? 'assets' : '';

  const visibleFiles = useMemo(
    () => files.filter((f) => (tab === 'asset' ? isAssetFile(f) : !isAssetFile(f))),
    [files, tab],
  );
  const visibleFolders = useMemo(
    () => folders.filter((d) => (tab === 'asset' ? isAssetPath(d) : !isAssetPath(d))),
    [folders, tab],
  );
  const tree = useMemo(() => buildTree(visibleFiles, visibleFolders), [visibleFiles, visibleFolders]);

  // Default everything expanded; re-expand when the folder set changes.
  const [expanded, setExpanded] = useState<Set<string>>(() => collectFolderPaths(tree, new Set()));
  const [seenFolders, setSeenFolders] = useState('');
  const folderKey = useMemo(() => [...collectFolderPaths(tree, new Set())].sort().join('|'), [tree]);
  if (folderKey !== seenFolders) {
    setSeenFolders(folderKey);
    setExpanded(collectFolderPaths(tree, new Set()));
  }

  // CRUD interaction state.
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ dir: string; kind: 'file' | 'folder' } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashError = (e: unknown) => {
    setError(e instanceof Error ? e.message : 'Something went wrong.');
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), 4000);
  };
  const clearAll = () => {
    setRenaming(null);
    setConfirming(null);
    setCreating(null);
  };

  const toggle = (path: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const startCreate = (dir: string, kind: 'file' | 'folder') => {
    clearAll();
    setError(null);
    if (dir) setExpanded((prev) => new Set(prev).add(dir));
    setCreating({ dir, kind });
  };
  const commitCreate = (name: string) => {
    const current = creating;
    setCreating(null);
    if (!current || !name) return;
    const path = joinPath(current.dir, name);
    try {
      if (current.kind === 'folder') createFolder(path);
      else {
        createFile(path);
        onSelect(path);
      }
    } catch (e) {
      flashError(e);
    }
  };

  const commitRename = (path: string, name: string) => {
    setRenaming(null);
    if (!name || name === basename(path)) return;
    try {
      renameOp(path, joinPath(dirname(path), name));
    } catch (e) {
      flashError(e);
    }
  };

  const confirmDelete = (path: string) => {
    setConfirming(null);
    try {
      removeOp(path);
    } catch (e) {
      flashError(e);
    }
  };

  // ── Drag-to-move ────────────────────────────────────────────────────────────
  const [dragPath, setDragPath] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null); // folder path, or '' for root

  // Can't drop onto itself or into its own descendant.
  const canDrop = (target: string) =>
    dragPath != null && target !== dragPath && !target.startsWith(`${dragPath}/`);

  const doMove = (target: string) => {
    const src = dragPath;
    setDragPath(null);
    setDragOver(null);
    if (!src || !canDrop(target) || dirname(src) === target) return; // no-op if already there
    try {
      moveOp(src, target);
    } catch (e) {
      flashError(e);
    }
  };

  const dnd = {
    dragOver,
    canDrop,
    onDragStart: (path: string) => {
      clearAll();
      setDragPath(path);
    },
    onDragEnd: () => {
      setDragPath(null);
      setDragOver(null);
    },
    onDragOverFolder: (path: string, e: DragEvent) => {
      if (!canDrop(path)) return;
      e.preventDefault();
      e.stopPropagation();
      setDragOver(path);
    },
    onDragLeaveFolder: (path: string) => setDragOver((d) => (d === path ? null : d)),
    onDropOnFolder: (path: string, e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      doMove(path);
    },
  };

  const rowProps = {
    ...dnd,
    activePath,
    expanded,
    renaming,
    confirming,
    creatingIn: creating?.dir ?? null,
    createKind: creating?.kind ?? 'file',
    onToggle: toggle,
    onSelect,
    onStartRename: (p: string) => {
      clearAll();
      setRenaming(p);
    },
    onCommitRename: commitRename,
    onStartCreate: startCreate,
    onCommitCreate: commitCreate,
    onAskDelete: (p: string) => {
      clearAll();
      setConfirming(p);
    },
    onConfirmDelete: confirmDelete,
    onCancel: clearAll,
  };

  return (
    <div className="flex h-full flex-col">
      {/* Files / Assets tab strip */}
      <div className="flex gap-1.5 px-2 pt-2.5 pb-1.5">
        {TABS.map((t) => {
          const isActive = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                clearAll();
              }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold transition-colors ${
                isActive ? 'bg-brand-sky text-white' : 'text-pg-text-muted hover:bg-pg-text/5 hover:text-pg-text'
              }`}
            >
              <t.Icon size={14} aria-hidden />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Project label + new file / new folder actions */}
      <div className="flex items-center gap-1.5 px-3 pt-3 pb-1">
        <Folder size={14} aria-hidden className="text-brand-sky" />
        <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-sky">Project</span>
        <span className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            aria-label="New file"
            title="New file"
            onClick={() => startCreate(baseDir, 'file')}
            className="rounded p-1 text-pg-text-muted transition-colors hover:bg-pg-text/10 hover:text-pg-text"
          >
            <FilePlus2 size={14} />
          </button>
          <button
            type="button"
            aria-label="New folder"
            title="New folder"
            onClick={() => startCreate(baseDir, 'folder')}
            className="rounded p-1 text-pg-text-muted transition-colors hover:bg-pg-text/10 hover:text-pg-text"
          >
            <FolderPlus size={14} />
          </button>
        </span>
      </div>

      {error && (
        <div className="mx-2 mb-1 rounded-md bg-wash-coral px-2 py-1 text-[11px] font-semibold text-brand-coral">
          {error}
        </div>
      )}

      {/* Nested tree — the empty area is a drop target for moving to the root. */}
      <div
        onDragOver={(e) => {
          if (dragPath && dirname(dragPath) !== '') {
            e.preventDefault();
            setDragOver('');
          }
        }}
        onDragLeave={(e) => {
          // Only clear when leaving the container itself, not a child row.
          if (e.currentTarget === e.target) setDragOver((d) => (d === '' ? null : d));
        }}
        onDrop={(e) => {
          e.preventDefault();
          doMove('');
        }}
        className={`flex-1 overflow-auto px-2 pb-3 ${
          dragOver === '' ? 'rounded-lg ring-1 ring-inset ring-brand-sky' : ''
        }`}
      >
        <ul className="space-y-0.5">
          {/* Root-level create input (when creating directly under this tab's base) */}
          {creating && creating.dir === baseDir && (
            <li>
              <NameInput
                initial=""
                depth={0}
                Icon={creating.kind === 'folder' ? Folder : File}
                onCommit={commitCreate}
                onCancel={clearAll}
              />
            </li>
          )}
          {tree.length === 0 && !creating ? (
            <li className="px-2 py-2 text-[12px] font-semibold text-pg-text-muted">
              {tab === 'asset' ? 'No assets yet.' : 'No files yet.'}
            </li>
          ) : (
            tree.map((node) => <TreeRow key={node.path} {...rowProps} node={node} depth={0} />)
          )}
        </ul>
      </div>
    </div>
  );
}
