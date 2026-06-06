import { beforeEach, describe, expect, it } from 'vitest';

import type { VfsFile } from '../code/codeApi';
import { summarize, useHistoryStore } from './historyStore';

function f(path: string, content = ''): VfsFile {
  return { path, content, kind: 'text', size: content.length };
}

describe('summarize', () => {
  it('labels the first snapshot', () => {
    expect(summarize(null, [f('a.js')])).toBe('Initial version');
  });

  it('describes edits, adds and removes (with +N overflow)', () => {
    expect(summarize([f('a.js', 'old')], [f('a.js', 'new')])).toBe('edited a.js');
    expect(summarize([f('a.js', 'x')], [f('a.js', 'x'), f('b.js', 'y')])).toBe('added b.js');
    expect(summarize([f('a.js'), f('b.js')], [f('a.js')])).toBe('removed b.js');
    expect(summarize([f('a.js', 'o'), f('b.js', 'o')], [f('a.js', 'n'), f('b.js', 'n')])).toBe('edited a.js +1');
  });

  it('basenames nested paths and combines change kinds', () => {
    expect(summarize([f('src/a.js', 'o'), f('gone.js')], [f('src/a.js', 'n'), f('new.js')])).toBe(
      'edited a.js, added new.js, removed gone.js',
    );
  });

  it('reports no change for an identical snapshot', () => {
    expect(summarize([f('a.js', 'x')], [f('a.js', 'x')])).toBe('No change');
  });
});

describe('useHistoryStore', () => {
  beforeEach(() => useHistoryStore.getState().reset());

  it('records newest-first with an auto summary', () => {
    const { record } = useHistoryStore.getState();
    record([f('a.js', 'v1')], 1000);
    const cp = record([f('a.js', 'v2')], 2000);

    const { checkpoints } = useHistoryStore.getState();
    expect(checkpoints).toHaveLength(2);
    expect(checkpoints[0]).toBe(cp); // newest first
    expect(checkpoints[0].summary).toBe('edited a.js');
  });

  it('skips a snapshot identical to the latest', () => {
    const { record } = useHistoryStore.getState();
    record([f('a.js', 'same')], 1000);
    const dup = record([f('a.js', 'same')], 2000);
    expect(dup).toBeNull();
    expect(useHistoryStore.getState().checkpoints).toHaveLength(1);
  });

  it('snapshots a copy so later mutation of the source does not leak in', () => {
    const files = [f('a.js', 'orig')];
    useHistoryStore.getState().record(files, 1000);
    files[0].content = 'mutated';
    expect(useHistoryStore.getState().checkpoints[0].files[0].content).toBe('orig');
  });

  it('caps the timeline at 50 checkpoints (oldest drop off)', () => {
    const { record } = useHistoryStore.getState();
    for (let i = 0; i < 55; i++) record([f('a.js', `v${i}`)], i);
    const { checkpoints } = useHistoryStore.getState();
    expect(checkpoints).toHaveLength(50);
    expect(checkpoints[0].files[0].content).toBe('v54'); // newest kept
  });

  it('reset clears the timeline', () => {
    useHistoryStore.getState().record([f('a.js', 'x')], 1000);
    useHistoryStore.getState().reset();
    expect(useHistoryStore.getState().checkpoints).toEqual([]);
  });
});
