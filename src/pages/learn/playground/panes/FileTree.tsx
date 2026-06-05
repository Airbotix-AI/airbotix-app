import { useMemo, useState } from 'react';
import type { VfsFile } from '../../code/codeApi';

interface FileTreeProps {
  files: VfsFile[];
  activePath: string;
  onSelect: (path: string) => void;
}

type TabId = 'text' | 'asset';

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'text', label: '📄 Files' },
  { id: 'asset', label: '🧊 Assets' },
];

const FILE_EMOJI: Record<string, string> = {
  html: '📄',
  htm: '📄',
  css: '🎨',
  js: '⚙️',
  json: '🗂',
  md: '📝',
  txt: '📃',
  // images
  png: '🖼',
  jpg: '🖼',
  jpeg: '🖼',
  gif: '🖼',
  svg: '🖼',
  webp: '🖼',
  // audio
  mp3: '🔊',
  wav: '🔊',
  ogg: '🔊',
  m4a: '🔊',
};

function emojiFor(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return FILE_EMOJI[ext] ?? '📄';
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
    return (
      <li>
        <button
          type="button"
          onClick={() => onToggle(node.path)}
          style={indent}
          className="flex w-full items-center gap-1.5 rounded-lg py-1.5 pr-2 text-left text-[13px] font-semibold text-stone2 transition-colors hover:bg-canvas-pure/5 hover:text-canvas-pure"
        >
          <span className="w-3 text-[10px] text-steel">{isOpen ? '▾' : '▸'}</span>
          <span>📁</span>
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
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(node.path)}
        style={indent}
        className={`flex w-full items-center gap-1.5 rounded-lg py-1.5 pr-2 text-left text-[13px] font-semibold transition-colors ${
          isActive
            ? 'bg-canvas-pure/15 text-canvas-pure'
            : 'text-stone2 hover:bg-canvas-pure/5 hover:text-canvas-pure'
        }`}
      >
        <span className="w-3" aria-hidden />
        <span>{emojiFor(node.path)}</span>
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
      {/* Files / Assets tab strip */}
      <div className="flex gap-1 border-b border-canvas-pure/10 px-2 pt-2">
        {TABS.map((t) => {
          const isActive = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-t-lg px-3 py-1.5 text-[12px] font-bold transition-colors ${
                isActive
                  ? 'bg-canvas-pure/15 text-canvas-pure'
                  : 'text-stone2 hover:bg-canvas-pure/5 hover:text-canvas-pure'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Project root label */}
      <div className="px-3 pt-3 pb-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-sky">
        📁 Project
      </div>

      {/* Nested tree */}
      <div className="flex-1 overflow-auto px-2 pb-3">
        {tree.length === 0 ? (
          <p className="px-2 py-2 text-[12px] font-semibold text-steel">
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
