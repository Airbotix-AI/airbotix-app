import { describe, it, expect, beforeEach } from 'vitest';

import type { VfsFile } from '../code/codeApi';
import { useHistoryStore } from './historyStore';

const f = (content: string): VfsFile[] => [{ path: 'main.js', content, kind: 'text', size: content.length }];
const store = () => useHistoryStore.getState();
const len = () => store().checkpoints.length;

describe('historyStore — coalescing edit checkpoints (kids shouldn’t see one entry per keystroke)', () => {
  beforeEach(() => store().reset());

  it('skips a snapshot identical to the latest', () => {
    store().record(f('a'), 1000);
    expect(store().record(f('a'), 2000)).toBeNull();
    expect(len()).toBe(1);
  });

  it('folds consecutive coalescable edits within the window into ONE evolving entry', () => {
    store().record(f('start'), 0); // baseline (e.g. the initial version) — not coalescable
    store().record(f('a'), 1_000, undefined, { coalesce: true }); // opens an editing session
    store().record(f('ab'), 2_000, undefined, { coalesce: true }); // folds in
    store().record(f('abc'), 3_000, undefined, { coalesce: true }); // folds in
    const cps = store().checkpoints;
    expect(cps).toHaveLength(2); // baseline + ONE coalesced edit
    expect(cps[0].files[0].content).toBe('abc'); // shows the newest content
    expect(cps[0].ts).toBe(3_000);
  });

  it('does NOT fold an edit into a non-coalescable point (the initial version stays)', () => {
    store().record(f('start'), 0);
    store().record(f('a'), 1_000, undefined, { coalesce: true });
    expect(len()).toBe(2);
  });

  it('starts a fresh entry once the coalesce window has passed', () => {
    store().record(f('start'), 0);
    store().record(f('a'), 1_000, undefined, { coalesce: true });
    store().record(f('ab'), 1_000 + 90_001, undefined, { coalesce: true }); // > COALESCE_WINDOW_MS
    expect(len()).toBe(3);
  });

  it('a non-coalesce record (a file op) breaks the session', () => {
    store().record(f('start'), 0);
    store().record(f('a'), 1_000, undefined, { coalesce: true });
    store().record(f('x'), 1_500, 'created Note.js'); // structural → own entry, not coalescable
    store().record(f('y'), 1_800, undefined, { coalesce: true }); // can't fold into the file op
    expect(len()).toBe(4);
  });
});
