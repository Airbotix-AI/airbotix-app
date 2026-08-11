// @vitest-environment jsdom
// Website Studio (creative-code-studio-website-prd, D-WEB-04 live model): a
// website has NO run concept, so the editor's ▶ button becomes an explicit
// "commit + reload now" reading "Reload site" — the SAME gesture still commits
// drafts and bumps runKey. Games keep the "Run game" ▶ Play unchanged.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
