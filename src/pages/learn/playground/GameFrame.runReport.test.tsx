// @vitest-environment jsdom
//
// GameFrame's run-report emission (D-PAP-40/41): per run it collects what the
// sandbox posts (console / stat frames / asset outcomes), asks the in-frame
// probe to report after the observation window, and emits ONE finalized
// RunReport — with `probeError: 'no-response'` when the probe never answers.
// The frame is jsdom (no real game), so the sandbox messages are simulated by
// dispatching `message` events on window, exactly the transport GameFrame uses.
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { VfsFile } from '../code/codeApi';
import { GameFrame } from './GameFrame';
import type { RunReport } from './runReport';

const FILES: VfsFile[] = [
  { path: 'main.js', content: 'new Phaser.Game({});', kind: 'text', size: 20 },
];

const RUN_OBSERVE_MS = 4000;
const PROBE_REPLY_TIMEOUT_MS = 1500;

function post(data: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data }));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('GameFrame onRunReport', () => {
  it('collects console/stat/asset feeds and emits once with probeError when the probe never replies', () => {
    const reports: RunReport[] = [];
    render(
      <GameFrame files={FILES} runKey={1} reportAttempt={2} onRunReport={(r) => reports.push(r)} />,
    );

    post({ __airbotixConsole: true, level: 'error', text: 'TypeError: boom' });
    post({ __airbotixStat: true, fps: 60, paused: false, frames: 120 });
    post({ __airbotixAsset: true, url: 'assets/ghost.png', len: 16, ok: false, error: '404' });

    // Observation window elapses → the probe is asked; it never answers.
    act(() => {
      vi.advanceTimersByTime(RUN_OBSERVE_MS + PROBE_REPLY_TIMEOUT_MS);
    });

    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      reportVersion: 1,
      attempt: 2,
      engine: 'phaser',
      booted: true,
      framesAdvanced: 120,
      fps: 60,
      consoleErrors: ['TypeError: boom'],
      assets: [{ path: 'assets/ghost.png', status: 'missing-ref', detail: '404' }],
      probeError: 'no-response',
    });

    // A late probe reply after the emit never produces a second report.
    post({ __airbotixRunReport: true, canvas: { present: true, nonBlank: true, sampled: 64 } });
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(reports).toHaveLength(1);
  });

  it('emits on the probe reply (canvas evidence, no probeError) — once per run', () => {
    const reports: RunReport[] = [];
    render(<GameFrame files={FILES} runKey={1} onRunReport={(r) => reports.push(r)} />);

    post({ __airbotixStat: true, fps: 59, paused: false, frames: 200 });
    act(() => {
      vi.advanceTimersByTime(RUN_OBSERVE_MS); // probe request goes out
    });
    post({ __airbotixRunReport: true, canvas: { present: true, nonBlank: true, sampled: 64 } });

    expect(reports).toHaveLength(1);
    expect(reports[0].attempt).toBe(1); // default
    expect(reports[0].canvas).toEqual({ present: true, nonBlank: true, sampled: 64 });
    expect(reports[0].probeError).toBeUndefined();

    // A duplicate reply and the stale no-response timer never re-emit.
    post({ __airbotixRunReport: true, canvas: { present: true, nonBlank: false, sampled: 64 } });
    act(() => {
      vi.advanceTimersByTime(PROBE_REPLY_TIMEOUT_MS + 1000);
    });
    expect(reports).toHaveLength(1);
  });

  it('a re-run (runKey bump) starts a fresh collector and emits a fresh report', () => {
    const reports: RunReport[] = [];
    const { rerender } = render(
      <GameFrame files={FILES} runKey={1} onRunReport={(r) => reports.push(r)} />,
    );
    act(() => {
      vi.advanceTimersByTime(RUN_OBSERVE_MS + PROBE_REPLY_TIMEOUT_MS);
    });
    expect(reports).toHaveLength(1);

    rerender(<GameFrame files={FILES} runKey={2} reportAttempt={2} onRunReport={(r) => reports.push(r)} />);
    post({ __airbotixStat: true, fps: 60, paused: false, frames: 42 });
    act(() => {
      vi.advanceTimersByTime(RUN_OBSERVE_MS + PROBE_REPLY_TIMEOUT_MS);
    });
    expect(reports).toHaveLength(2);
    expect(reports[1].attempt).toBe(2);
    expect(reports[1].framesAdvanced).toBe(42); // not carried over from run 1
  });

  it('collects nothing when onRunReport is not set (no probe, no emit)', () => {
    render(<GameFrame files={FILES} runKey={1} />);
    post({ __airbotixStat: true, fps: 60, paused: false, frames: 10 });
    act(() => {
      vi.advanceTimersByTime(RUN_OBSERVE_MS + PROBE_REPLY_TIMEOUT_MS);
    });
    // Nothing to assert beyond "no crash" — there is no collector or callback.
  });
});
