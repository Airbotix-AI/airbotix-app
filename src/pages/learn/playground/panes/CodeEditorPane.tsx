// The Code Editor pane: a 3-column layout of FileTree sidebar, center editor
// (tab row + ▶ Play + lazy Monaco), and a collapsible docked AI chat panel.
// Fills the left side of the Playground split.
//
// State model: PlaygroundPage owns the VFS (single source of truth). This pane
// keeps a LOCAL DRAFT of the active file's text so typing in Monaco is snappy
// without round-tripping through the page on every keystroke. ▶ Play (and the AI
// turn) are the commit points that lift the draft back into the VFS.

import React, { Suspense, useEffect, useState } from 'react';
import { Panel, PanelGroup } from 'react-resizable-panels';

import type { VfsFile } from '../../code/codeApi';
import { AIChatPanel } from './AIChatPanel';
import { FileTree } from './FileTree';
import { ResizeHandle } from './ResizeHandle';
import { useGameAgent } from './useGameAgent';

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

/** First text file is the default active tab (e.g. 'game.js'). */
function firstTextPath(files: VfsFile[]): string {
  return (files.find((f) => f.kind === 'text') ?? files[0])?.path ?? '';
}

/** Crude language hint for Monaco from a file extension. */
function languageFor(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'css') return 'css';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'json') return 'json';
  return 'javascript';
}

export function CodeEditorPane({ files, onApplyFiles, onRun }: CodeEditorPaneProps) {
  const [activePath, setActivePath] = useState(() => firstTextPath(files));
  // Local editable copy of the active file's content (the editor `value`).
  const [draft, setDraft] = useState(
    () => files.find((f) => f.path === activePath)?.content ?? '',
  );

  const activeFile = files.find((f) => f.path === activePath);

  // Re-sync the draft from the VFS whenever the files prop or active tab change
  // — e.g. the AI applied an edit, or the kid switched files. This makes AI
  // edits show up in the editor immediately. (Typing only mutates `draft`, so
  // it never round-trips and never clobbers itself; ▶ Play / AI are the commit
  // points that change `files`.)
  useEffect(() => {
    setDraft(activeFile?.content ?? '');
  }, [activeFile]);

  const { chat, busy, error, send } = useGameAgent({ files, onApplyFiles, onRun });

  // ▶ Play: write the current draft into the active file and run.
  const handlePlay = () => {
    if (!activeFile) {
      onRun();
      return;
    }
    const next = files.map((f) =>
      f.path === activePath ? { ...f, content: draft, size: draft.length } : f,
    );
    onApplyFiles(next);
    onRun();
  };

  return (
    <PanelGroup direction="horizontal" className="h-full min-h-0 bg-ink text-canvas-pure" autoSaveId="pg-editor">
      {/* Files list */}
      <Panel defaultSize={20} minSize={10} className="min-w-0">
        <aside className="h-full overflow-y-auto bg-canvas-pure/5">
          <FileTree files={files} activePath={activePath} onSelect={setActivePath} />
        </aside>
      </Panel>

      <ResizeHandle />

      {/* Code editor — tab row + ▶ Play + Monaco */}
      <Panel defaultSize={50} minSize={25} className="min-w-0">
        <section className="flex h-full min-w-0 flex-col">
          <div className="flex shrink-0 items-center gap-2 border-b border-canvas-pure/10 px-3 py-2">
            <div className="flex min-w-0 items-center gap-1.5 rounded-xl bg-canvas-pure/10 px-3 py-1.5 text-[13px] font-bold text-canvas-pure">
              <span aria-hidden>⚙️</span>
              <span className="truncate">{activePath || 'No file'}</span>
            </div>

            <button
              type="button"
              aria-label="Run game"
              onClick={handlePlay}
              className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-grad-mint px-4 py-1.5 text-[13px] font-extrabold text-white shadow-brand-mint transition-transform hover:-translate-y-0.5"
            >
              <span aria-hidden>▶</span> Play
            </button>
          </div>

          <div className="min-h-0 flex-1">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-[13px] font-semibold text-stone2">
                  Loading editor…
                </div>
              }
            >
              <MonacoEditor value={draft} onChange={setDraft} language={languageFor(activePath)} />
            </Suspense>
          </div>
        </section>
      </Panel>

      <ResizeHandle />

      {/* AI helper */}
      <Panel defaultSize={30} minSize={15} className="min-w-0">
        <aside className="flex h-full flex-col bg-canvas-pure/5">
          <AIChatPanel chat={chat} busy={busy} error={error} onSend={send} />
        </aside>
      </Panel>
    </PanelGroup>
  );
}
