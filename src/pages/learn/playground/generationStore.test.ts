import { describe, it, expect, beforeEach } from 'vitest';

import { useGenerationStore } from './generationStore';
import { useProjectStore } from './projectStore';

// The store runs the OFFLINE stub when no projectId is set (deterministic, no
// network) — perfect for unit-testing the generate → write-to-VFS → done flow,
// the one-at-a-time guard, and cancel/dismiss.
describe('generationStore (global Magic Generation — D-ASSET §3)', () => {
  beforeEach(() => {
    useProjectStore.getState().setFiles([]);
    useGenerationStore.setState({
      status: 'idle',
      prompt: '',
      mode: 'create',
      resultPath: null,
      error: null,
      _ctrl: null,
      _last: null,
    });
  });

  it('generates → writes the asset into the VFS → status done with a result path', async () => {
    await useGenerationStore.getState().start({ prompt: 'a pixel coin' });

    const s = useGenerationStore.getState();
    expect(s.status).toBe('done');
    expect(s.resultPath).toMatch(/^assets\/generated\/a_pixel_coin\.(svg|png|webp)$/);
    // The asset is in the project VFS (the store owns completion, not the pane).
    const file = useProjectStore.getState().files.find((f) => f.path === s.resultPath);
    expect(file?.kind).toBe('asset');
    expect(file?.content.startsWith('data:')).toBe(true);
  });

  it('remix uses mode "remix" and still lands under assets/generated', async () => {
    await useGenerationStore.getState().start({ prompt: 'make it blue', mode: 'remix', refUrl: 'x' });
    const s = useGenerationStore.getState();
    expect(s.mode).toBe('remix');
    expect(s.status).toBe('done');
    expect(s.resultPath).toMatch(/^assets\/generated\//);
  });

  it('runs only ONE generation at a time (a second start while busy is ignored)', () => {
    useGenerationStore.setState({ status: 'generating', prompt: 'first' });
    void useGenerationStore.getState().start({ prompt: 'second' });
    expect(useGenerationStore.getState().prompt).toBe('first'); // unchanged
  });

  it('cancel resets to idle', () => {
    useGenerationStore.setState({ status: 'generating', prompt: 'x', _ctrl: new AbortController() });
    useGenerationStore.getState().cancel();
    expect(useGenerationStore.getState().status).toBe('idle');
  });

  it('dismiss clears a finished card but never interrupts an in-flight one', () => {
    useGenerationStore.setState({ status: 'done', resultPath: 'assets/generated/x.png' });
    useGenerationStore.getState().dismiss();
    expect(useGenerationStore.getState().status).toBe('idle');

    useGenerationStore.setState({ status: 'generating', prompt: 'busy' });
    useGenerationStore.getState().dismiss();
    expect(useGenerationStore.getState().status).toBe('generating'); // no-op mid-flight
  });
});
