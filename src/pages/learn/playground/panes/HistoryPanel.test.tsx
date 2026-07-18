// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import type { VfsFile } from '../../code/codeApi';
import { useHistoryStore, type Checkpoint, type CheckpointKind } from '../historyStore';
import { HistoryPanel } from './HistoryPanel';

const f = (content: string): VfsFile[] => [{ path: 'main.js', content, kind: 'text', size: content.length }];

/** Seed the store directly with checkpoints (newest first), bypassing record()'s
 *  dedupe/coalesce so a test can pin the exact shape it wants to render. */
function seed(checkpoints: Checkpoint[]) {
  useHistoryStore.setState({ checkpoints });
}

const cp = (over: Partial<Checkpoint> & { id: string }): Checkpoint => ({
  ts: 1_000,
  files: f(over.id),
  summary: '',
  ...over,
});

// jsdom has no ResizeObserver; the panel observes its list for the scroll-fade.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverStub as typeof ResizeObserver);

const noop = () => {};

function renderPanel() {
  render(<HistoryPanel onDiff={noop} onRevert={noop} onDetailOpen={noop} />);
}

describe('HistoryPanel — entry title comes from the authored label, not summary-sniffing', () => {
  beforeEach(() => useHistoryStore.getState().reset());
  afterEach(cleanup);

  it('shows an AI turn`s authored history_label verbatim (describe() would mangle it)', () => {
    // "Made a change" has a verb ("Made") the legacy describe() map does not know —
    // it would render "Changed a change". The authored label must win.
    seed([
      cp({ id: 'now', label: 'Made a change', kind: 'ai', summary: 'edited main.js' }),
      cp({ id: 'start', label: 'Your game started here', kind: 'initial', summary: 'Initial version' }),
    ]);
    renderPanel();
    expect(screen.getByText('Made a change')).toBeInTheDocument();
    expect(screen.queryByText('Changed a change')).not.toBeInTheDocument();
    expect(screen.getByText('Your game started here')).toBeInTheDocument();
  });

  it('falls back to deriving a title from summary for legacy checkpoints (no label/kind)', () => {
    // A checkpoint persisted before authored labels existed carries only a technical
    // summary — the panel still derives a friendly title from it.
    seed([cp({ id: 'now', summary: 'created Note.js' })]);
    renderPanel();
    expect(screen.getByText('Added Note.js')).toBeInTheDocument();
  });

  it('renders one entry per checkpoint', () => {
    const kinds: CheckpointKind[] = ['ai', 'edit', 'file', 'revert', 'kept-newest', 'initial'];
    seed(kinds.map((kind, i) => cp({ id: `c${i}`, kind, label: `entry ${i}` })));
    renderPanel();
    expect(screen.getAllByTestId('history-entry')).toHaveLength(kinds.length);
  });
});
