// @vitest-environment jsdom
// Website Studio (creative-code-studio-website-prd, D-WEB-04 live model): a
// website has NO run concept, so the editor's ▶ button becomes an explicit
// "commit + reload now" reading "Reload site" — the SAME gesture still commits
// drafts and bumps runKey. Games keep the "Run game" ▶ Play unchanged.
//
// D-WEB-16: the explorer's VIRTUAL `database.sqlite` entry — present only when
// `onOpenDatabase` is wired (Website Studio, incl. the read-only teacher
// viewer), opens the Database window instead of a text tab, carries no
// rename/delete/drag affordances, and NEVER leaks into VFS commits (it lives
// at the render layer, not in the files array).

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  // The pane's file-sidebar resizer observes its container; jsdom has no
  // ResizeObserver (same stub the GameRunnerPane tests install).
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  // jsdom implements no layout — the active-tab reveal calls scrollIntoView.
  Element.prototype.scrollIntoView = () => {};
});

// Monaco is heavy + lazily loaded — stub it (this test only exercises the
// toolbar); the diff view rides the same lazy chunk.
vi.mock('./MonacoEditor', () => ({ default: () => null }));
vi.mock('./HistoryDiff', () => ({ default: () => null }));

import type { VfsFile } from '../../code/codeApi';
import { useProjectStore } from '../projectStore';
import { CodeEditorPane } from './CodeEditorPane';

const FILES: VfsFile[] = [
  { path: 'index.html', content: '<h1>Hi</h1>', kind: 'text', size: 11 },
];

afterEach(cleanup);

describe('CodeEditorPane — the run button wording is kind-aware', () => {
  it('a game shows "Run game" ▶ Play', () => {
    render(<CodeEditorPane files={FILES} onApplyFiles={vi.fn()} onRun={vi.fn()} />);
    const btn = screen.getByRole('button', { name: 'Run game' });
    expect(btn).toHaveTextContent('Play');
  });

  it('a website shows "Reload site" and the gesture still commits + reloads', () => {
    const onRun = vi.fn();
    const onApplyFiles = vi.fn();
    render(
      <CodeEditorPane files={FILES} kind="website" onApplyFiles={onApplyFiles} onRun={onRun} />,
    );
    expect(screen.queryByRole('button', { name: 'Run game' })).not.toBeInTheDocument();
    const btn = screen.getByRole('button', { name: 'Reload site' });
    expect(btn).toHaveTextContent('Reload');

    fireEvent.click(btn);
    // Same commit-then-run gesture as the game's ▶ Play.
    expect(onApplyFiles).toHaveBeenCalledTimes(1);
    expect(onRun).toHaveBeenCalledTimes(1);
  });
});

describe('CodeEditorPane — the virtual database.sqlite explorer entry (D-WEB-16)', () => {
  it('clicking it opens the Database window — never a text tab', () => {
    const onOpenDatabase = vi.fn();
    render(
      <CodeEditorPane
        files={FILES}
        kind="website"
        onApplyFiles={vi.fn()}
        onRun={vi.fn()}
        onOpenDatabase={onOpenDatabase}
      />,
    );

    const entry = screen.getByTestId('explorer-database-file');
    fireEvent.click(entry);
    expect(onOpenDatabase).toHaveBeenCalledTimes(1);
    // No editor tab opened for it: the name appears exactly once (the tree row).
    expect(screen.getAllByText('database.sqlite')).toHaveLength(1);
    expect(
      screen.queryByRole('button', { name: 'Close database.sqlite' }),
    ).not.toBeInTheDocument();
  });

  it('is pinned with the root files: after the folders, before the first root file', () => {
    const files: VfsFile[] = [
      { path: 'index.html', content: '<h1>Hi</h1>', kind: 'text', size: 11 },
      { path: 'data/pets.json', content: '[]', kind: 'text', size: 2 },
    ];
    render(
      <CodeEditorPane
        files={files}
        kind="website"
        onApplyFiles={vi.fn()}
        onRun={vi.fn()}
        onOpenDatabase={vi.fn()}
      />,
    );
    // Scope to the sidebar — the open editor TAB is also named index.html.
    const sidebar = within(screen.getByTestId('editor-sidebar'));
    const entry = sidebar.getByTestId('explorer-database-file');
    const dataFolder = sidebar.getByRole('button', { name: /^data$/ });
    const indexRow = sidebar.getByRole('button', { name: /^index\.html$/ });
    // Document order: data/ folder → database.sqlite → index.html.
    expect(dataFolder.compareDocumentPosition(entry) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(entry.compareDocumentPosition(indexRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('is pinned chrome: no rename/delete affordances, not draggable', () => {
    render(
      <CodeEditorPane
        files={FILES}
        kind="website"
        onApplyFiles={vi.fn()}
        onRun={vi.fn()}
        onOpenDatabase={vi.fn()}
      />,
    );
    const entry = screen.getByTestId('explorer-database-file');
    expect(screen.queryByRole('button', { name: 'Rename database.sqlite' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete database.sqlite' })).not.toBeInTheDocument();
    // Real rows are draggable="true"; the virtual entry must not be movable.
    expect(entry.closest('[draggable="true"]')).toBeNull();
  });

  it('never leaks into VFS commits or file enumerations (render-layer only)', () => {
    useProjectStore.getState().setFiles(FILES);
    const onApplyFiles = vi.fn();
    render(
      <CodeEditorPane
        files={FILES}
        kind="website"
        onApplyFiles={onApplyFiles}
        onRun={vi.fn()}
        onOpenDatabase={vi.fn()}
      />,
    );

    // The commit gesture maps over the REAL store files — the virtual entry
    // must not appear in what gets written back.
    fireEvent.click(screen.getByRole('button', { name: 'Reload site' }));
    const committed = onApplyFiles.mock.calls[0][0] as VfsFile[];
    expect(committed.some((f) => f.path === 'database.sqlite')).toBe(false);
    // And it never entered the store (= the agent's file list) either.
    expect(
      useProjectStore.getState().files.some((f) => f.path === 'database.sqlite'),
    ).toBe(false);
  });

  it('absent when onOpenDatabase is not wired (game projects)', () => {
    render(<CodeEditorPane files={FILES} onApplyFiles={vi.fn()} onRun={vi.fn()} />);
    expect(screen.queryByTestId('explorer-database-file')).not.toBeInTheDocument();
  });

  it('still present in the read-only teacher viewer (viewing is allowed)', () => {
    const onOpenDatabase = vi.fn();
    render(
      <CodeEditorPane
        files={FILES}
        kind="website"
        readOnly
        onApplyFiles={vi.fn()}
        onRun={vi.fn()}
        onOpenDatabase={onOpenDatabase}
      />,
    );
    fireEvent.click(screen.getByTestId('explorer-database-file'));
    expect(onOpenDatabase).toHaveBeenCalledTimes(1);
  });
});
