// Body of the Code Editor window (design §2/§6/§7 / mockup #3–6). The window
// chrome (titlebar, min/max/close, dragging) comes from Window.tsx — this is
// only the inner content: a 3-column layout of FileTree sidebar, center editor
// (tab row + ▶ Play + lazy Monaco), and a collapsible docked AI chat panel.
//
// State model: PlaygroundPage owns the VFS (single source of truth). This window
// keeps a LOCAL DRAFT of the active file's text so typing in Monaco is snappy
// without round-tripping through the page on every keystroke. ▶ Play (and the AI
// turn) are the commit points that lift the draft back into the VFS.

import React, { Suspense, useEffect, useState } from 'react';

import type { VfsFile } from '../../code/codeApi';
import { AIChatPanel } from './AIChatPanel';
import { FileTree } from './FileTree';
import { useGameAgent } from './useGameAgent';

// Monaco (~3–5 MB incl. workers) is code-split into its own chunk and fetched
// only when this window mounts (design §6). MUST stay a `React.lazy` import.
const MonacoEditor = React.lazy(() => import('./MonacoEditor'));

interface CodeEditorWindowProps {
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

export function CodeEditorWindow({ files, onApplyFiles, onRun }: CodeEditorWindowProps) {
  const [activePath, setActivePath] = useState(() => firstTextPath(files));
  // Local editable copy of the active file's content (the editor `value`).
  const [draft, setDraft] = useState(
    () => files.find((f) => f.path === activePath)?.content ?? '',
  );
  const [chatOpen, setChatOpen] = useState(true);

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
    <div className="flex h-full min-h-0 bg-canvas-pure text-ink">
      {/* Left — Files sidebar */}
      <aside className="w-44 shrink-0 overflow-y-auto border-r border-hairline bg-surface">
        <FileTree files={files} activePath={activePath} onSelect={setActivePath} />
      </aside>

      {/* Center — tab row + ▶ Play + editor */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-hairline px-3 py-2">
          <div className="flex min-w-0 items-center gap-1.5 rounded-xl bg-wash-sky px-3 py-1.5 text-[13px] font-bold text-ink">
            <span aria-hidden>⚙️</span>
            <span className="truncate">{activePath || 'No file'}</span>
          </div>

          <button
            type="button"
            onClick={handlePlay}
            className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-grad-mint px-4 py-1.5 text-[13px] font-extrabold text-white shadow-brand-mint transition-transform hover:-translate-y-0.5"
          >
            <span aria-hidden>▶</span> Play
          </button>

          <button
            type="button"
            aria-label={chatOpen ? 'Hide AI Helper' : 'Show AI Helper'}
            aria-pressed={chatOpen}
            title={chatOpen ? 'Hide AI Helper' : 'Show AI Helper'}
            onClick={() => setChatOpen((o) => !o)}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base transition-colors ${
              chatOpen ? 'bg-wash-sky text-ink' : 'text-ink-soft hover:bg-surface'
            }`}
          >
            ✨
          </button>
        </div>

        <div className="min-h-0 flex-1">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-[13px] font-semibold text-ink-soft">
                Loading editor…
              </div>
            }
          >
            <MonacoEditor value={draft} onChange={setDraft} language={languageFor(activePath)} />
          </Suspense>
        </div>
      </section>

      {/* Right — collapsible AI chat panel */}
      {chatOpen && (
        <aside className="flex w-80 shrink-0 flex-col border-l border-hairline bg-canvas-pure">
          <AIChatPanel chat={chat} busy={busy} error={error} onSend={send} />
        </aside>
      )}
    </div>
  );
}
