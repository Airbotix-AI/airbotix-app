import { describe, it, expect, beforeEach } from 'vitest';

import type { VfsFile } from '../code/codeApi';
import { aiCheckpointLabel, useHistoryStore } from './historyStore';

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

describe('historyStore — authored label + kind (AI turns name their own save point)', () => {
  beforeEach(() => store().reset());

  it('stores an authored label + kind verbatim on the checkpoint', () => {
    const cp = store().record(f('build'), 1_000, 'edited main.js', {
      label: 'Added a pause button',
      kind: 'ai',
    });
    expect(cp?.label).toBe('Added a pause button');
    expect(cp?.kind).toBe('ai');
    // The technical summary is still kept for the "what changed" file list.
    expect(cp?.summary).toBe('edited main.js');
  });

  it('leaves label/kind undefined for a plain auto edit (panel derives a title)', () => {
    const cp = store().record(f('typed'), 1_000, undefined, { coalesce: true });
    expect(cp?.label).toBeUndefined();
    expect(cp?.kind).toBeUndefined();
  });

  it('an AI turn identical to the latest snapshot is deduped to null (no empty entry)', () => {
    store().record(f('same'), 1_000, 'Initial version', { label: 'Your game started here', kind: 'initial' });
    // A question turn changes nothing → same files → no new save point.
    expect(store().record(f('same'), 2_000, 'no change', { label: 'Answered a question', kind: 'ai' })).toBeNull();
    expect(len()).toBe(1);
  });

  it('a coalesced edit keeps the session label/kind when the fold carries none', () => {
    store().record(f('base'), 0, 'Initial version', { label: 'Your game started here', kind: 'initial' });
    store().record(f('a'), 1_000, undefined, { coalesce: true, label: 'Changed your game', kind: 'edit' });
    store().record(f('ab'), 2_000, undefined, { coalesce: true }); // typing burst: no label passed
    const [latest] = store().checkpoints;
    expect(latest.files[0].content).toBe('ab');
    expect(latest.label).toBe('Changed your game');
    expect(latest.kind).toBe('edit');
  });
});

describe('aiCheckpointLabel — an AI save point named after the ask when the label is bland', () => {
  it('prefers a specific backend history_label over the prompt', () => {
    expect(aiCheckpointLabel('Added a pause button', 'can you add a pause button')).toBe('Added a pause button');
  });

  it('falls back to the prompt when the label is a generic filler', () => {
    // The fake LLM emits "Made a change" for every non-initial turn — the ask is more useful.
    expect(aiCheckpointLabel('Made a change', 'make the player jump higher')).toBe('Make the player jump higher');
  });

  it('falls back to the prompt when there is no label at all', () => {
    expect(aiCheckpointLabel(null, 'add coins to collect')).toBe('Add coins to collect');
    expect(aiCheckpointLabel(undefined, 'add coins to collect')).toBe('Add coins to collect');
  });

  it('tidies the prompt: collapses whitespace, caps length with an ellipsis, capitalizes', () => {
    const long = 'please   make the   guy jump much higher and also add a bunch of gold coins everywhere';
    const out = aiCheckpointLabel('Made a change', long);
    expect(out.length).toBeLessThanOrEqual(60);
    expect(out.endsWith('…')).toBe(true);
    expect(out.startsWith('Please make the guy jump')).toBe(true);
    expect(out).not.toContain('   ');
  });

  it('uses the gentle default when neither a specific label nor a prompt exists', () => {
    expect(aiCheckpointLabel(null, undefined)).toBe('Made a change');
    expect(aiCheckpointLabel('   ', '   ')).toBe('Made a change');
  });
});
