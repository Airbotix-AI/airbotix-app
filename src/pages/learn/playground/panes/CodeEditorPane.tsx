// The Code Editor pane: a 2-column layout of FileTree sidebar + center editor
// (multi-tab strip + ▶ Play + lazy Monaco). The AI chat now lives in the
// separate `ChatPane`, so this pane no longer docks a chat panel.
//
// State model: PlaygroundPage owns the VFS (single source of truth). This pane
// keeps a LOCAL DRAFT per open tab so typing in Monaco is snappy without
// round-tripping through the page on every keystroke. ▶ Play is the commit
// point that lifts the dirty drafts back into the VFS.

import { FileCode2, Play, X } from 'lucide-react';
import React, { Suspense, useEffect, useState } from 'react';
import { Panel, PanelGroup } from 'react-resizable-panels';

import type { VfsFile } from '../../code/codeApi';
import { FileTree } from './FileTree';
import { ResizeHandle } from './ResizeHandle';

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

  return (
    <PanelGroup direction="horizontal" className="h-full min-h-0 bg-ink text-canvas-pure" autoSaveId="pg-editor">
      {/* Files list */}
      <Panel defaultSize={28} minSize={12} className="min-w-0">
        <aside className="h-full overflow-y-auto bg-canvas-pure/5">
          <FileTree files={files} activePath={activeTab} onSelect={openTab} />
        </aside>
      </Panel>

      <ResizeHandle />

      {/* Code editor — tab strip + ▶ Play + Monaco */}
      <Panel defaultSize={72} minSize={30} className="min-w-0">
        <section className="flex h-full min-w-0 flex-col">
          <div className="flex shrink-0 items-center bg-canvas-pure/5 border-b border-canvas-pure/10">
            <div className="flex min-w-0 flex-1 items-center gap-0 overflow-x-auto">
              {openTabs.length === 0 ? (
                <span className="px-3 py-2 text-[13px] font-semibold text-steel">No file open</span>
              ) : (
                openTabs.map((path) => {
                  const isActive = path === activeTab;
                  const name = path.split('/').pop() ?? path;
                  return (
                    <div
                      key={path}
                      className={`group flex shrink-0 items-center gap-2 border-r border-canvas-pure/10 border-b-2 px-3 py-2 text-[13px] transition-colors ${
                        isActive
                          ? 'bg-ink text-canvas-pure border-b-brand-sky'
                          : 'text-stone2 border-b-transparent hover:bg-canvas-pure/5 hover:text-canvas-pure'
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
                        className={`ml-0.5 rounded text-steel transition-colors hover:text-canvas-pure ${
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
                  <div className="flex h-full items-center justify-center text-[13px] font-semibold text-stone2">
                    Loading editor…
                  </div>
                }
              >
                <MonacoEditor
                  value={editorValue}
                  onChange={(v) => setDrafts((prev) => ({ ...prev, [activeTab]: v }))}
                  language={languageFor(activeTab)}
                />
              </Suspense>
            ) : (
              <div className="flex h-full items-center justify-center text-[13px] font-semibold text-steel">
                Pick a file to start editing.
              </div>
            )}
          </div>
        </section>
      </Panel>
    </PanelGroup>
  );
}
