// The Code Editor pane: a 2-column layout of FileTree sidebar + center editor
// (multi-tab strip + ▶ Play + lazy Monaco). The AI chat now lives in the
// separate `ChatPane`, so this pane no longer docks a chat panel.
//
// State model: PlaygroundPage owns the VFS (single source of truth). This pane
// keeps a LOCAL DRAFT per open tab so typing in Monaco is snappy without
// round-tripping through the page on every keystroke. ▶ Play is the commit
// point that lifts the dirty drafts back into the VFS.

import { FileCode2, PanelLeftClose, PanelLeftOpen, Play, X } from 'lucide-react';
import React, { Suspense, useEffect, useRef, useState } from 'react';

import type { VfsFile } from '../../code/codeApi';
import { FileTree } from './FileTree';
import type { CursorPosition } from './MonacoEditor';

// Files column: a FIXED pixel width (not a percentage), so growing the window
// only widens the editor — the file list keeps its width. Drag the divider to
// resize within these bounds.
const FILES_DEFAULT_W = 220;
const FILES_MIN_W = 140;
/** Min pixels the editor keeps; caps how wide the files column can be dragged. */
const EDITOR_MIN_W = 240;

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

export function CodeEditorPane({ files, onApplyFiles, onRun }: CodeEditorPaneProps) {
  // The set of paths shown as tabs, the active one, and the editable draft text
  // per open tab. `drafts` only holds content for open tabs (lazily seeded).
  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    const entry = entryPath(files);
    return entry ? [entry] : [];
  });
  const [activeTab, setActiveTab] = useState<string>(() => entryPath(files));
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const entry = entryPath(files);
    const content = files.find((f) => f.path === entry)?.content ?? '';
    return entry ? { [entry]: content } : {};
  });
  // The committed VFS content each open draft was last reconciled against. This
  // is the baseline that makes "dirty" unambiguous: a tab is dirty iff its draft
  // diverges from `synced[path]` (the kid typed). When `files` changes, a tab
  // whose draft still equals its baseline is CLEAN and gets refreshed to the new
  // commit; a dirty tab keeps the kid's text.
  const [synced, setSynced] = useState<Record<string, string>>(() => {
    const entry = entryPath(files);
    const content = files.find((f) => f.path === entry)?.content ?? '';
    return entry ? { [entry]: content } : {};
  });

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

  const openTab = (path: string) => {
    setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
    setActiveTab(path);
    const content = fileContent(path);
    setDrafts((prev) => (path in prev ? prev : { ...prev, [path]: content }));
    setSynced((prev) => (path in prev ? prev : { ...prev, [path]: content }));
  };

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

  // ▶ Play: write ALL dirty drafts back into the VFS, then run. The committed
  // drafts are no longer dirty, so advance their baseline to match.
  const handlePlay = () => {
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
    onRun();
  };

  const editorValue = activeTab ? drafts[activeTab] ?? fileContent(activeTab) : '';

  // Caret position for the status bar, reported by Monaco.
  const [cursor, setCursor] = useState<CursorPosition>({ line: 1, column: 1 });

  // Files column: fixed px width + collapse toggle. The editor flexes, so the
  // column keeps its width when the window grows.
  const rootRef = useRef<HTMLDivElement>(null);
  const [filesWidth, setFilesWidth] = useState(FILES_DEFAULT_W);
  const [filesCollapsed, setFilesCollapsed] = useState(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            style={{ width: filesWidth }}
            className="h-full shrink-0 overflow-y-auto bg-pg-text/5"
          >
            <FileTree files={files} activePath={activeTab} onSelect={openTab} />
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
                openTabs.map((path) => {
                  const isActive = path === activeTab;
                  const name = path.split('/').pop() ?? path;
                  return (
                    <div
                      key={path}
                      data-tab-active={isActive ? 'true' : 'false'}
                      className={`group flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px] transition-colors ${
                        isActive
                          ? 'bg-brand-sky/15 text-pg-text font-semibold'
                          : 'text-pg-text-dim hover:bg-pg-text/5 hover:text-pg-text'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveTab(path)}
                        className="flex min-w-0 items-center gap-1.5"
                      >
                        <FileCode2 size={14} aria-hidden />
                        <span className="truncate">{name}</span>
                        {isDirty(path) && (
                          <span
                            aria-label="Unsaved changes"
                            className="h-1.5 w-1.5 rounded-full bg-brand-mint"
                          />
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label={`Close ${name}`}
                        onClick={() => closeTab(path)}
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

          <div className="min-h-0 flex-1">
            {activeTab ? (
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
                />
              </Suspense>
            ) : (
              <div className="flex h-full items-center justify-center text-[13px] font-semibold text-pg-text-muted">
                Pick a file to start editing.
              </div>
            )}
          </div>

          {/* Status bar: file path (left) · Ln/Col + language (right). Auto-save
              is planned, so there's intentionally no "unsaved" indicator here. */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-pg-border bg-pg-text/5 px-3 py-1 text-[11px] font-medium text-pg-text-muted">
            <div className="flex min-w-0 items-center gap-1.5">
              <FileCode2 size={12} aria-hidden className="shrink-0" />
              <span className="truncate">{activeTab || 'No file open'}</span>
            </div>
            {activeTab && (
              <div className="flex shrink-0 items-center gap-2">
                <span>Ln {cursor.line}, Col {cursor.column}</span>
                <span aria-hidden className="text-pg-border">|</span>
                <span>{languageLabel(activeTab)}</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
