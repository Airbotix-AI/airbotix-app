import { useMemo, useState } from 'react';
import {
  Boxes,
  ChevronDown,
  ChevronRight,
  File,
  FileAudio,
  FileCode2,
  FileImage,
  FileJson,
  FileText,
  FileType,
  Folder,
  type LucideIcon,
} from 'lucide-react';
import type { VfsFile } from '../../code/codeApi';

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
  // images
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  gif: FileImage,
  svg: FileImage,
  webp: FileImage,
  // audio
  mp3: FileAudio,
  wav: FileAudio,
  ogg: FileAudio,
  m4a: FileAudio,
};

function iconFor(path: string): LucideIcon {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return FILE_ICON[ext] ?? File;
}

// ── Tree model ──────────────────────────────────────────────────────────────

interface TreeNode {
  name: string; // segment label (file or folder name)
  path: string; // full project-relative path of this node
  isFolder: boolean;
  children: TreeNode[];
}

/**
 * Build a nested folder tree from flat slash-delimited paths. Each path is split
 * into segments; we walk/create one folder node per intermediate segment (keyed
 * by its accumulated path) and attach the final segment as a leaf file. Folders
 * are sorted before files, each group alphabetically.
 */
function buildTree(files: VfsFile[]): TreeNode[] {
  const root: TreeNode = { name: '', path: '', isFolder: true, children: [] };

  for (const file of files) {
    const segments = file.path.split('/').filter(Boolean);
    let cursor = root;
    segments.forEach((segment, i) => {
      const isLeaf = i === segments.length - 1;
      const nodePath = segments.slice(0, i + 1).join('/');
      let child = cursor.children.find((c) => c.name === segment && c.isFolder === !isLeaf);
      if (!child) {
        child = { name: segment, path: nodePath, isFolder: !isLeaf, children: [] };
        cursor.children.push(child);
      }
      cursor = child;
    });
  }

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

// ── Rendering ────────────────────────────────────────────────────────────────

interface RowProps {
  node: TreeNode;
  depth: number;
  activePath: string;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}

function TreeRow({ node, depth, activePath, expanded, onToggle, onSelect }: RowProps) {
  const indent = { paddingLeft: `${depth * 14 + 4}px` };

  if (node.isFolder) {
    const isOpen = expanded.has(node.path);
    const Chevron = isOpen ? ChevronDown : ChevronRight;
    return (
      <li>
        <button
          type="button"
          onClick={() => onToggle(node.path)}
          style={indent}
          className="flex w-full items-center gap-1.5 rounded-lg py-1.5 pr-2 text-left text-[13px] font-semibold text-pg-text-dim transition-colors hover:bg-pg-text/5 hover:text-pg-text"
        >
          <Chevron size={14} className="shrink-0 text-pg-text-muted" aria-hidden />
          <Folder size={14} className="shrink-0 text-pg-text-muted" aria-hidden />
          <span className="truncate">{node.name}</span>
        </button>
        {isOpen && node.children.length > 0 && (
          <ul className="space-y-0.5">
            {node.children.map((child) => (
              <TreeRow
                key={child.path}
                node={child}
                depth={depth + 1}
                activePath={activePath}
                expanded={expanded}
                onToggle={onToggle}
                onSelect={onSelect}
              />
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
      <button
        type="button"
        onClick={() => onSelect(node.path)}
        style={indent}
        className={`flex w-full items-center gap-1.5 rounded-lg py-1.5 pr-2 text-left text-[13px] font-semibold transition-colors ${
          isActive
            ? 'bg-brand-sky/15 text-pg-text'
            : 'text-pg-text-dim hover:bg-pg-text/5 hover:text-pg-text'
        }`}
      >
        <span className="w-3.5 shrink-0" aria-hidden />
        <Icon size={14} className="shrink-0" aria-hidden />
        <span className="truncate">{node.name}</span>
      </button>
    </li>
  );
}

export function FileTree({ files, activePath, onSelect }: FileTreeProps) {
  const [tab, setTab] = useState<TabId>('text');

  const tree = useMemo(
    () => buildTree(files.filter((f) => f.kind === tab)),
    [files, tab],
  );

  // Default everything expanded; reset whenever the tab's folder set changes.
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    collectFolderPaths(buildTree(files.filter((f) => f.kind === 'text')), new Set()),
  );
  const [seenFolders, setSeenFolders] = useState('');
  const folderKey = useMemo(
    () => [...collectFolderPaths(tree, new Set())].sort().join('|'),
    [tree],
  );
  if (folderKey !== seenFolders) {
    setSeenFolders(folderKey);
    setExpanded(collectFolderPaths(tree, new Set()));
  }

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Files / Assets tab strip — full pills; active = solid brand-sky. */}
      <div className="flex gap-1.5 px-2 pt-2.5 pb-1.5">
        {TABS.map((t) => {
          const isActive = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold transition-colors ${
                isActive
                  ? 'bg-brand-sky text-white'
                  : 'text-pg-text-muted hover:bg-pg-text/5 hover:text-pg-text'
              }`}
            >
              <t.Icon size={14} aria-hidden />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Project root label */}
      <div className="flex items-center gap-1.5 px-3 pt-3 pb-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-sky">
        <Folder size={14} aria-hidden />
        <span>Project</span>
      </div>

      {/* Nested tree */}
      <div className="flex-1 overflow-auto px-2 pb-3">
        {tree.length === 0 ? (
          <p className="px-2 py-2 text-[12px] font-semibold text-pg-text-muted">
            {tab === 'asset' ? 'No assets yet.' : 'No files yet.'}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {tree.map((node) => (
              <TreeRow
                key={node.path}
                node={node}
                depth={0}
                activePath={activePath}
                expanded={expanded}
                onToggle={toggle}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
