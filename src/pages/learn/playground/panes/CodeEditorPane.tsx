// The Code Editor pane: a 2-column layout of FileTree sidebar + center editor
// (multi-tab strip + ▶ Play + lazy Monaco). The AI chat now lives in the
// separate `ChatPane`, so this pane no longer docks a chat panel.
//
// State model: PlaygroundPage owns the VFS (single source of truth). This pane
// keeps a LOCAL DRAFT per open tab so typing in Monaco is snappy without
// round-tripping through the page on every keystroke. ▶ Play is the commit
// point that lifts the dirty drafts back into the VFS.

import {
  FileCode2,
  FolderTree,
  GitCompare,
  History,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Search,
  X,
} from 'lucide-react';
import React, { Suspense, useEffect, useRef, useState } from 'react';

import type { VfsFile } from '../../code/codeApi';
import { useHistoryStore, type Checkpoint } from '../historyStore';
import { useProjectStore } from '../projectStore';
import { readWorkspaceSlice, writeWorkspaceSlice } from '../workspaceUiStore';
import { FileTree } from './FileTree';
import { HistoryPanel } from './HistoryPanel';
import type { CursorPosition, JumpTarget } from './MonacoEditor';
import { SearchPanel } from './SearchPanel';

type SidebarView = 'files' | 'history' | 'search';

// Lazy like MonacoEditor — the diff view pulls monaco into the shared lazy chunk.
const HistoryDiff = React.lazy(() => import('./HistoryDiff'));

/** Idle pause (ms of no typing) after which edits auto-commit + snapshot to history. */
const IDLE_SAVE_MS = 1200;

// Diff tabs share the editor tab strip with file tabs, distinguished by an id
// prefix (a real file path can't contain `::`). One diff tab per file path.
const DIFF_PREFIX = 'diff::';
const isDiffTab = (id: string) => id.startsWith(DIFF_PREFIX);
const baseName = (path: string) => path.split('/').pop() || path;

// Files column: a FIXED pixel width (not a percentage), so growing the window
// only widens the editor — the file list keeps its width. Drag the divider to
// resize within these bounds.
// Wide enough that the Explorer / History / Search switcher shows all three tabs
// (min is the floor a drag can shrink the column to, so tabs stay visible).
// Wide enough that the Explorer / Time Machine / Search switcher always shows all
// three tabs in full (the min is the floor a drag can shrink to).
const FILES_DEFAULT_W = 280;
const FILES_MIN_W = 272;
/** Min pixels the editor keeps; caps how wide the files column can be dragged. */
const EDITOR_MIN_W = 240;
/** Sidebar auto-widens to this when the (two-column) History view opens. */
const HISTORY_MIN_W = 380;

// Monaco (~3–5 MB incl. workers) is code-split into its own chunk and fetched
// only when this pane mounts (design §6). MUST stay a `React.lazy` import.
const MonacoEditor = React.lazy(() => import('./MonacoEditor'));

interface CodeEditorPaneProps {
  /** The lifted VFS — owned by PlaygroundPage. */
  files: VfsFile[];
  /** Commit edits back to the page-level source of truth. */
  onApplyFiles: (files: VfsFile[]) => void;
  /** Re-run the game (PlaygroundPage bumps runKey). */
  onRun: () => void;
  /** A request (from a console error, or the agent's open_file/highlight_code) to
   *  open a file and reveal a line — `toLine` highlights a range (`select` selects
   *  it instead, surfacing the real ✨ toolbar). The `nonce` lets a repeat request
   *  for the same file+line re-fire. */
  openLocation?: { file: string; line: number; toLine?: number; select?: boolean; nonce: number } | null;
  /** Hand a selected code snippet to the AI chat (the "✨ Explain this" toolbar). */
  onExplainSelection?: (code: string) => void;
  /** Teacher live read-only viewer (D-LV-6): make Monaco non-editable, gate every
   *  write path (commit / idle-autosave), and hide all FileTree CRUD. ▶ Play may
   *  still RUN the game (it can't commit drafts since none can form). The backend
   *  write-guard is the data backstop; this is the UX + defence-in-depth layer. */
  readOnly?: boolean;
}

/** The entry file to open first: `main.js` if present, else first text file. */
function entryPath(files: VfsFile[]): string {
  const main = files.find((f) => f.path === 'main.js');
  if (main) return main.path;
  return files.find((f) => f.kind === 'text')?.path ?? '';
}

/** Crude language hint for Monaco from a file extension. */
function languageFor(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'css') return 'css';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'json') return 'json';
  if (ext === 'md' || ext === 'markdown') return 'markdown';
  // Non-code files (txt, READMEs, etc.) → plaintext so Monaco doesn't flag them
  // as broken JavaScript.
  if (ext === 'txt' || ext === '') return 'plaintext';
  return 'javascript';
}

/** Status-bar language label, e.g. 'src/x.js' → 'JAVASCRIPT'. */
function languageLabel(path: string): string {
  return languageFor(path).toUpperCase();
}

export function CodeEditorPane({ files, onApplyFiles, onRun, openLocation, onExplainSelection, readOnly }: CodeEditorPaneProps) {
  // Restore the editor UI from the persisted workspace slice (J9). Open tabs are
  // filtered to files that still exist; the `[files]` effect fills their drafts on
  // mount. Read once (useRef) so it's stable across renders.
  const editorSeed = useRef(
    readWorkspaceSlice('editor', {
      sidebar: 'files' as SidebarView,
      activeTab: '',
      openTabs: [] as string[],
      filesWidth: FILES_DEFAULT_W,
      filesCollapsed: false,
    }),
  ).current;
  const initialEntry = entryPath(files);
  const seededTabs = editorSeed.openTabs.filter(
    (t) => !isDiffTab(t) && files.some((f) => f.path === t),
  );
  const initialTabs = seededTabs.length ? seededTabs : initialEntry ? [initialEntry] : [];
  const initialActive =
    editorSeed.activeTab && initialTabs.includes(editorSeed.activeTab)
      ? editorSeed.activeTab
      : (initialTabs[0] ?? initialEntry);
  const seedTabContents = (): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const t of initialTabs) {
      const c = files.find((f) => f.path === t)?.content;
      if (c !== undefined) out[t] = c;
    }
    return out;
  };

  // The set of paths shown as tabs, the active one, and the editable draft text
  // per open tab. `drafts` only holds content for open tabs (lazily seeded).
  const [openTabs, setOpenTabs] = useState<string[]>(() => initialTabs);
  const [activeTab, setActiveTab] = useState<string>(() => initialActive);
  const [drafts, setDrafts] = useState<Record<string, string>>(seedTabContents);
  // The committed VFS content each open draft was last reconciled against. This
  // is the baseline that makes "dirty" unambiguous: a tab is dirty iff its draft
  // diverges from `synced[path]` (the kid typed). When `files` changes, a tab
  // whose draft still equals its baseline is CLEAN and gets refreshed to the new
  // commit; a dirty tab keeps the kid's text.
  const [synced, setSynced] = useState<Record<string, string>>(seedTabContents);

  /** The committed VFS content for a path (empty string if it's gone). */
  const fileContent = (path: string): string =>
    files.find((f) => f.path === path)?.content ?? '';

  /** A tab is dirty when its draft diverges from its reconciled baseline. */
  const isDirty = (path: string): boolean =>
    path in drafts && drafts[path] !== (synced[path] ?? fileContent(path));

  // When `files` changes externally (e.g. the AI applied an edit), refresh every
  // open tab that is NOT dirty so the new content appears in the editor; dirty
  // tabs keep the kid's in-progress text. Comparing the draft to its baseline
  // (`synced`) — not to the live commit — is what distinguishes the two cases.
  // (Typing only mutates `drafts`, never `files`, so this can't self-trigger.)
  useEffect(() => {
    let changed = false;
    const nextDrafts: Record<string, string> = { ...drafts };
    const nextSynced: Record<string, string> = { ...synced };
    for (const path of openTabs) {
      // Skip files that no longer exist (renamed/deleted) — the structural
      // reconcile effect below remaps/closes those tabs; refreshing here would
      // wipe the draft to '' before the remap lands.
      if (!files.some((f) => f.path === path)) continue;
      const committed = fileContent(path);
      const baseline = synced[path];
      const dirty = path in drafts && drafts[path] !== (baseline ?? committed);
      if (!dirty && (drafts[path] ?? '') !== committed) {
        nextDrafts[path] = committed;
        nextSynced[path] = committed;
        changed = true;
      }
    }
    if (changed) {
      setDrafts(nextDrafts);
      setSynced(nextSynced);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  // Structural reconcile: when the file tree renames/moves/deletes files, remap
  // open tabs (+ their drafts/baselines) to the new paths and close tabs whose
  // file is gone. Keyed on the store `change` seq so it fires once per mutation.
  const change = useProjectStore((s) => s.change);
  useEffect(() => {
    if (!change || (change.remaps.length === 0 && change.removed.length === 0)) return;
    const remap = new Map(change.remaps.map((r) => [r.from, r.to]));
    const gone = new Set(change.removed);
    const remapKeys = (m: Record<string, string>): Record<string, string> => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(m)) {
        if (gone.has(k)) continue;
        out[remap.get(k) ?? k] = v;
      }
      return out;
    };
    const nextTabs = openTabs.filter((p) => !gone.has(p)).map((p) => remap.get(p) ?? p);
    setOpenTabs(nextTabs);
    setActiveTab((prev) => (gone.has(prev) ? (nextTabs[0] ?? '') : remap.get(prev) ?? prev));
    setDrafts(remapKeys);
    setSynced(remapKeys);
    // Only react to a new mutation (seq) — not to tab-state churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [change?.seq]);

  const openTab = (path: string) => {
    setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
    setActiveTab(path);
    const content = fileContent(path);
    setDrafts((prev) => (path in prev ? prev : { ...prev, [path]: content }));
    setSynced((prev) => (path in prev ? prev : { ...prev, [path]: content }));
  };

  // Jump-to-error: a console error's file:line opens that file's tab and reveals
  // the line in Monaco. Only acts on real VFS paths (an error from Phaser
  // internals / about:srcdoc has no matching file — ignore it). `nonce` is what
  // makes a repeat click on the same line re-fire (the object identity changes).
  const [jumpTo, setJumpTo] = useState<JumpTarget | null>(null);
  useEffect(() => {
    if (!openLocation) return;
    if (!files.some((f) => f.path === openLocation.file)) return;
    openTab(openLocation.file);
    setJumpTo({
      line: openLocation.line,
      toLine: openLocation.toLine,
      select: openLocation.select,
      nonce: openLocation.nonce,
    });
    // Only react to a new request (nonce) — not to `files`/`openTab` churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openLocation]);

  const closeTab = (path: string) => {
    setOpenTabs((prev) => {
      const idx = prev.indexOf(path);
      if (idx === -1) return prev;
      const next = prev.filter((p) => p !== path);
      // If we closed the active tab, pick a neighbour (prefer the one to the
      // left, else the new tail); if none remain, clear the editor.
      if (path === activeTab) {
        const neighbour = next[idx - 1] ?? next[idx] ?? '';
        setActiveTab(neighbour);
      }
      return next;
    });
    setDrafts((prev) => {
      if (!(path in prev)) return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
    setSynced((prev) => {
      if (!(path in prev)) return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
  };

  // Commit ALL dirty drafts back into the VFS and advance their baselines, then
  // return the merged files. Shared by ▶ Play and the idle autosave.
  // In the read-only viewer (D-LV-6) this is a no-op — the editor is non-editable so
  // no drafts can form, but we hard-gate the write path as defence-in-depth.
  const commitDrafts = (): VfsFile[] => {
    if (readOnly) return files;
    const next = files.map((f) =>
      isDirty(f.path) ? { ...f, content: drafts[f.path], size: drafts[f.path].length } : f,
    );
    setSynced((prev) => {
      const advanced = { ...prev };
      for (const path of openTabs) {
        if (isDirty(path)) advanced[path] = drafts[path];
      }
      return advanced;
    });
    onApplyFiles(next);
    return next;
  };

  // ▶ Play: commit drafts, then run.
  const handlePlay = () => {
    commitDrafts();
    onRun();
  };

  // Idle autosnapshot: after a pause in typing, commit the drafts and record a
  // history checkpoint — so work is captured without a manual save and the
  // History tab fills in as the kid types. Re-armed on every keystroke (drafts
  // change); fires once the dust settles. Does NOT run the game.
  const record = useHistoryStore((s) => s.record);
  useEffect(() => {
    // Read-only viewer (D-LV-6): never autosave/commit — the teacher's view must
    // never write to the kid's project.
    if (readOnly) return;
    if (!openTabs.some((p) => isDirty(p))) return;
    const t = setTimeout(() => {
      const next = commitDrafts();
      // coalesce: a burst of typing folds into one "you changed your game" point.
      record(next, Date.now(), undefined, { coalesce: true });
    }, IDLE_SAVE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts]);

  // Left sidebar view (file tree / history / search).
  const [sidebarView, setSidebarView] = useState<SidebarView>(() => editorSeed.sidebar);
  // Diff tabs open in the SAME tab strip as files (special `diff::` ids), so you
  // can switch between a diff and your files. `diffTabs` holds each one's content.
  const [diffTabs, setDiffTabs] = useState<Record<string, { path: string; original: string; modified: string }>>({});
  const openDiffTab = (path: string, original: string, modified: string) => {
    const id = `${DIFF_PREFIX}${path}`;
    setDiffTabs((prev) => ({ ...prev, [id]: { path, original, modified } }));
    setOpenTabs((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActiveTab(id);
  };

  // Revert the whole project to a checkpoint, reset open-tab drafts to it, and
  // record the revert as its own checkpoint.
  const revertTo = (cp: Checkpoint) => {
    onApplyFiles(cp.files);
    const reset = (prev: Record<string, string>): Record<string, string> => {
      const out = { ...prev };
      for (const p of openTabs) {
        const f = cp.files.find((x) => x.path === p);
        if (f) out[p] = f.content;
      }
      return out;
    };
    setDrafts(reset);
    setSynced(reset);
    record(cp.files, Date.now(), `reverted · ${cp.summary}`, { label: 'Went back in time', kind: 'revert' });
  };

  // The sidebar auto-widens ONLY while a History entry is selected (i.e. the
  // two-column file detail is showing); deselecting or leaving History restores
  // the prior width. Driven by HistoryPanel via `onDetailOpen`.
  const widthBeforeHistory = useRef(FILES_DEFAULT_W);
  const detailOpen = useRef(false);
  const setHistoryDetailOpen = (open: boolean) => {
    if (open === detailOpen.current) return;
    detailOpen.current = open;
    if (open) {
      widthBeforeHistory.current = filesWidth;
      const maxW = (rootRef.current?.clientWidth ?? 900) - EDITOR_MIN_W;
      setFilesWidth(Math.max(filesWidth, Math.min(HISTORY_MIN_W, Math.max(FILES_MIN_W, maxW))));
    } else {
      setFilesWidth(widthBeforeHistory.current);
    }
  };
  const switchSidebar = (view: SidebarView) => {
    if (view === sidebarView) return;
    if (view !== 'history') setHistoryDetailOpen(false); // restore on leaving History
    setSidebarView(view);
  };

  // Search → open a result at its line. (Offset nonce so it can't collide with
  // the console-error jump's `openLocation` nonces.)
  const searchJumpSeq = useRef(1_000_000);
  const goToLine = (path: string, line: number) => {
    openTab(path);
    setJumpTo({ line, nonce: (searchJumpSeq.current += 1) });
  };

  // Search → replace every case-insensitive match across text files; commits to
  // the VFS, refreshes open drafts, records a history checkpoint. Returns the count.
  const replaceAll = (query: string, replacement: string): number => {
    if (!query) return 0;
    const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const cur = useProjectStore.getState().files;
    let count = 0;
    const next = cur.map((f) => {
      if (f.kind !== 'text') return f;
      const m = f.content.match(re);
      if (!m) return f;
      count += m.length;
      const content = f.content.replace(re, replacement);
      return { ...f, content, size: content.length };
    });
    if (count === 0) return 0;
    onApplyFiles(next);
    const sync = (prev: Record<string, string>): Record<string, string> => {
      const out = { ...prev };
      for (const f of next) if (f.path in out) out[f.path] = f.content;
      return out;
    };
    setDrafts(sync);
    setSynced(sync);
    record(next, Date.now(), `replaced "${query}"`);
    return count;
  };

  const editorValue = activeTab ? drafts[activeTab] ?? fileContent(activeTab) : '';
  // The active tab is a diff when it carries diff content; else it's a file.
  const activeDiff = activeTab && isDiffTab(activeTab) ? diffTabs[activeTab] : null;

  // Caret position for the status bar, reported by Monaco.
  const [cursor, setCursor] = useState<CursorPosition>({ line: 1, column: 1 });

  // Files column: fixed px width + collapse toggle. The editor flexes, so the
  // column keeps its width when the window grows.
  const rootRef = useRef<HTMLDivElement>(null);
  // Clamp any older persisted width up to the new minimum (so the tab switcher
  // always fits, even for projects saved before the min changed).
  const [filesWidth, setFilesWidth] = useState(() => Math.max(FILES_MIN_W, editorSeed.filesWidth));
  const [filesCollapsed, setFilesCollapsed] = useState(() => editorSeed.filesCollapsed);

  // Write the editor UI back to the persisted workspace slice (debounce-saved by
  // PlaygroundApp). Only real file tabs are persisted (diff tabs are transient).
  useEffect(() => {
    writeWorkspaceSlice('editor', {
      sidebar: sidebarView,
      activeTab,
      openTabs: openTabs.filter((t) => !isDiffTab(t)),
      filesWidth,
      filesCollapsed,
    });
  }, [sidebarView, activeTab, openTabs, filesWidth, filesCollapsed]);
  const toggleFiles = () => setFilesCollapsed((c) => !c);

  // Drag the divider to resize the (pixel-width) files column.
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = filesWidth;
    const maxW = Math.max(FILES_MIN_W, (rootRef.current?.clientWidth ?? 800) - EDITOR_MIN_W);
    const onMove = (ev: MouseEvent) =>
      setFilesWidth(Math.min(maxW, Math.max(FILES_MIN_W, startW + ev.clientX - startX)));
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Tab strip: no scrollbar — drag to scroll, with fading edges signalling more.
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabDraggedRef = useRef(false);
  const [tabFade, setTabFade] = useState({ left: false, right: false });

  const updateTabFade = () => {
    const el = tabsRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setTabFade({ left: el.scrollLeft > 1, right: el.scrollLeft < max - 1 });
  };

  useEffect(() => {
    updateTabFade();
    const el = tabsRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateTabFade);
    ro.observe(el);
    return () => ro.disconnect();
  }, [openTabs.length]);

  // Keep the active tab in view (selecting/opening one off-screen scrolls to it).
  useEffect(() => {
    tabsRef.current
      ?.querySelector('[data-tab-active="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeTab]);

  // Drag anywhere on the strip to scroll it. A move past the threshold sets a
  // flag so the trailing click doesn't select/close a tab (swallowed on capture).
  const onTabsPointerDown = (e: React.PointerEvent) => {
    const el = tabsRef.current;
    if (!el) return;
    const startX = e.clientX;
    const startLeft = el.scrollLeft;
    tabDraggedRef.current = false;
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 4) tabDraggedRef.current = true;
      el.scrollLeft = startLeft - dx;
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const FADE_PX = 28;
  const tabMask = `linear-gradient(to right, transparent 0, #000 ${
    tabFade.left ? `${FADE_PX}px` : '0'
  }, #000 calc(100% - ${tabFade.right ? `${FADE_PX}px` : '0px'}), transparent 100%)`;

  return (
    <div ref={rootRef} className="flex h-full min-h-0 bg-pg-bg text-pg-text">
      {/* Files list (fixed px width; collapsible via the tab-strip button) */}
      {!filesCollapsed && (
        <>
          <aside
            data-testid="editor-sidebar"
            style={{ width: filesWidth }}
            className="flex h-full shrink-0 flex-col overflow-hidden bg-pg-text/5"
          >
            {/* Files / History view switcher */}
            <div className="pg-no-scrollbar flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-pg-border px-1.5 py-1.5">
              {([
                { id: 'files', label: 'Explorer', Icon: FolderTree },
                { id: 'history', label: 'Time Machine', Icon: History },
                { id: 'search', label: 'Search', Icon: Search },
              ] as const).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={sidebarView === id}
                  onClick={() => switchSidebar(id)}
                  className={`flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-bold transition-colors ${
                    sidebarView === id
                      ? 'bg-pg-text/10 text-pg-text'
                      : 'text-pg-text-muted hover:bg-pg-text/5 hover:text-pg-text'
                  }`}
                >
                  <Icon size={14} aria-hidden />
                  {label}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {sidebarView === 'files' ? (
                <FileTree files={files} activePath={activeTab} onSelect={openTab} readOnly={readOnly} />
              ) : sidebarView === 'history' ? (
                <HistoryPanel
                  onRevert={revertTo}
                  onDiff={openDiffTab}
                  onDetailOpen={setHistoryDetailOpen}
                />
              ) : (
                <SearchPanel files={files} onOpenResult={goToLine} onReplaceAll={replaceAll} />
              )}
            </div>
          </aside>
          {/* Drag divider */}
          <div
            role="separator"
            aria-orientation="vertical"
            onMouseDown={startResize}
            className="group relative w-1.5 shrink-0 cursor-col-resize"
          >
            <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-pg-text/15 transition-colors group-hover:bg-brand-sky" />
          </div>
        </>
      )}

      {/* Code editor — tab strip + ▶ Play + Monaco + status bar */}
      <div className="min-w-0 flex-1">
        <section className="flex h-full min-w-0 flex-col">
          <div className="flex shrink-0 items-center gap-1.5 bg-pg-text/5 border-b border-pg-border px-2 py-1.5">
            <button
              type="button"
              aria-label={filesCollapsed ? 'Show files' : 'Hide files'}
              aria-pressed={!filesCollapsed}
              onClick={toggleFiles}
              className="shrink-0 rounded-md p-1 text-pg-text-muted transition-colors hover:bg-pg-text/10 hover:text-pg-text"
            >
              {filesCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
            <div
              ref={tabsRef}
              onScroll={updateTabFade}
              onPointerDown={onTabsPointerDown}
              onClickCapture={(e) => {
                if (tabDraggedRef.current) {
                  e.preventDefault();
                  e.stopPropagation();
                  tabDraggedRef.current = false;
                }
              }}
              style={{ maskImage: tabMask, WebkitMaskImage: tabMask }}
              className="pg-no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto select-none"
            >
              {openTabs.length === 0 ? (
                <span className="px-2 py-1 text-[13px] font-semibold text-pg-text-muted">No file open</span>
              ) : (
                openTabs.map((tabId) => {
                  const isActive = tabId === activeTab;
                  const dt = isDiffTab(tabId) ? diffTabs[tabId] : null;
                  const name = dt ? `${baseName(dt.path)} (diff)` : baseName(tabId);
                  const TabIcon = dt ? GitCompare : FileCode2;
                  return (
                    <div
                      key={tabId}
                      data-tab-active={isActive ? 'true' : 'false'}
                      className={`group flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px] transition-colors ${
                        isActive
                          ? 'bg-brand-sky/15 text-pg-text font-semibold'
                          : 'text-pg-text-dim hover:bg-pg-text/5 hover:text-pg-text'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveTab(tabId)}
                        className="flex min-w-0 items-center gap-1.5"
                      >
                        <TabIcon size={14} aria-hidden className={dt ? 'text-brand-sky' : undefined} />
                        <span className="truncate">{name}</span>
                        {!dt && isDirty(tabId) && (
                          <span
                            aria-label="Unsaved changes"
                            className="h-1.5 w-1.5 rounded-full bg-brand-mint"
                          />
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label={`Close ${name}`}
                        onClick={() => closeTab(tabId)}
                        className={`ml-0.5 rounded text-pg-text-muted transition-colors hover:text-pg-text ${
                          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <button
              type="button"
              aria-label="Run game"
              onClick={handlePlay}
              className="ml-auto mr-2 flex shrink-0 items-center gap-1.5 rounded-full bg-grad-mint px-4 py-1.5 text-[13px] font-extrabold text-white shadow-brand-mint transition-transform hover:-translate-y-0.5"
            >
              <Play size={14} aria-hidden /> Play
            </button>
          </div>

          <div className="relative min-h-0 flex-1" data-testid={activeDiff ? 'history-diff' : undefined}>
            {!activeTab ? (
              <div className="flex h-full items-center justify-center text-[13px] font-semibold text-pg-text-muted">
                Pick a file to start editing.
              </div>
            ) : activeDiff ? (
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-[13px] font-semibold text-pg-text-dim">
                    Loading diff…
                  </div>
                }
              >
                <HistoryDiff
                  original={activeDiff.original}
                  modified={activeDiff.modified}
                  language={languageFor(activeDiff.path)}
                />
              </Suspense>
            ) : (
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-[13px] font-semibold text-pg-text-dim">
                    Loading editor…
                  </div>
                }
              >
                <MonacoEditor
                  value={editorValue}
                  onChange={(v) => setDrafts((prev) => ({ ...prev, [activeTab]: v }))}
                  language={languageFor(activeTab)}
                  onCursorChange={setCursor}
                  jumpTo={jumpTo}
                  onExplainSelection={onExplainSelection}
                  readOnly={readOnly}
                />
              </Suspense>
            )}
          </div>

          {/* Status bar: file path (left) · Ln/Col + language (right). The idle
              autosave keeps the VFS current, so there's no "unsaved" indicator. */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-pg-border bg-pg-text/5 px-3 py-1 text-[11px] font-medium text-pg-text-muted">
            <div className="flex min-w-0 items-center gap-1.5">
              {activeDiff ? <GitCompare size={12} aria-hidden className="shrink-0 text-brand-sky" /> : <FileCode2 size={12} aria-hidden className="shrink-0" />}
              <span className="truncate">{activeDiff ? activeDiff.path : activeTab || 'No file open'}</span>
            </div>
            {activeTab && (
              <div className="flex shrink-0 items-center gap-2">
                {activeDiff ? (
                  <span className="font-bold text-brand-sky">DIFF · old → now</span>
                ) : (
                  <>
                    <span>Ln {cursor.line}, Col {cursor.column}</span>
                    <span aria-hidden className="text-pg-border">|</span>
                    <span>{languageLabel(activeTab)}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
