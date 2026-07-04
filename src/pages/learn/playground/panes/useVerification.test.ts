// @vitest-environment jsdom
//
// The post-apply verification loop driver (D-PAP-40/44, FE-2): arms per applied
// turn, posts one report per attempt, applies fix turns SILENTLY (re-arming at
// attempt+1), surfaces ONLY the co-debug hand-off, and resumes a pending turn
// from GET …/code/verify-state on mount.
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AgentTurnResult, RunReportVerdict, VerifyState } from '../../code/codeApi';
import type { RunReport } from '../runReport';
import { useVerification, type VerificationDeps } from './useVerification';

const FIX_TURN: AgentTurnResult = {
  turn_id: 'fix-1',
  requires_approval: false,
  plan: null,
  changes: [{ path: 'main.js', before: 'a', after: 'b', lines_added: 1, lines_removed: 1 }],
  files: [{ path: 'main.js', content: 'b', kind: 'text', size: 1 }],
  version: 7,
  summary: 'Fixed the loader path.',
  stars_charged: 1,
  tools_fired: ['edit_file:main.js'],
  verification: 'pending',
};

function report(attempt: number): RunReport {
  return {
    reportVersion: 1,
    attempt,
    engine: 'phaser',
    observedMs: 4000,
    booted: true,
    framesAdvanced: 200,
    fps: 60,
    consoleErrors: ['TypeError: boom'],
    consoleWarns: [],
    unhandledRejections: [],
    windowErrors: [],
    dropped: { errors: 0, warns: 0, rejections: 0 },
    assets: [],
    canvas: { present: true, nonBlank: true, sampled: 64 },
  };
}

const IDLE_STATE: VerifyState = { turn_id: null, verify_status: 'none', attempts: 0 };

function setup(overrides: {
  verdicts?: RunReportVerdict[];
  state?: VerifyState;
  enabled?: boolean;
} = {}) {
  const verdicts = [...(overrides.verdicts ?? [])];
  const deps: VerificationDeps = {
    postRunReport: vi.fn(async () => verdicts.shift() ?? { verdict: 'verified' as const }),
    getVerifyState: vi.fn(async () => overrides.state ?? IDLE_STATE),
  };
  const applyFixTurn = vi.fn();
  const restartGame = vi.fn();
  const pushCoDebugMessage = vi.fn();
  const onStarsCharged = vi.fn();
  const view = renderHook(() =>
    useVerification({
      projectId: 'p1',
      mode: 'lite',
      enabled: overrides.enabled ?? true,
      applyFixTurn,
      restartGame,
      pushCoDebugMessage,
      onStarsCharged,
      deps,
    }),
  );
  return { ...view, deps, applyFixTurn, restartGame, pushCoDebugMessage, onStarsCharged };
}

/** Flush the in-flight postRunReport promise chain. */
const flush = () => act(async () => {});

describe('useVerification — the report → verdict loop', () => {
  it('posts the armed turn+attempt and stays SILENT on verified', async () => {
    const { result, deps, applyFixTurn, pushCoDebugMessage, restartGame } = setup({
      verdicts: [{ verdict: 'verified' }],
    });
    act(() => result.current.beginVerification('t1'));
    expect(result.current.reportAttempt).toBe(1);
    act(() => result.current.onRunReport(report(1)));
    await flush();
    expect(deps.postRunReport).toHaveBeenCalledWith({
      projectId: 'p1',
      turnId: 't1',
      report: report(1),
      mode: 'lite',
    });
    expect(applyFixTurn).not.toHaveBeenCalled();
    expect(pushCoDebugMessage).not.toHaveBeenCalled();
    expect(restartGame).not.toHaveBeenCalled();
    // Disarmed: a later report never posts again.
    act(() => result.current.onRunReport(report(1)));
    await flush();
    expect(deps.postRunReport).toHaveBeenCalledTimes(1);
  });

  it('fixing → applies the fix turn silently, restarts, re-arms at attempt+1', async () => {
    const { result, deps, applyFixTurn, restartGame, onStarsCharged, pushCoDebugMessage } = setup({
      verdicts: [{ verdict: 'fixing', attempt: 1, turn: FIX_TURN }, { verdict: 'verified' }],
    });
    act(() => result.current.beginVerification('t1'));
    act(() => result.current.onRunReport(report(1)));
    await flush();
    expect(applyFixTurn).toHaveBeenCalledWith(FIX_TURN);
    expect(onStarsCharged).toHaveBeenCalledWith(1);
    expect(restartGame).toHaveBeenCalledTimes(1);
    expect(pushCoDebugMessage).not.toHaveBeenCalled(); // NO chat message on a fix
    expect(result.current.reportAttempt).toBe(2);
    // The next run's report (attempt 2) posts against the FIX turn's id.
    act(() => result.current.onRunReport(report(2)));
    await flush();
    expect(deps.postRunReport).toHaveBeenLastCalledWith(
      expect.objectContaining({ turnId: 'fix-1', report: report(2) }),
    );
  });

  it('co_debug → pushes the server message as the ONLY visible surface', async () => {
    const { result, pushCoDebugMessage, applyFixTurn } = setup({
      verdicts: [{ verdict: 'co_debug', message: "Let's look together!" }],
    });
    act(() => result.current.beginVerification('t1'));
    act(() => result.current.onRunReport(report(1)));
    await flush();
    expect(pushCoDebugMessage).toHaveBeenCalledWith("Let's look together!");
    expect(applyFixTurn).not.toHaveBeenCalled();
  });

  it('ignores a stale report whose attempt does not match the armed chain', async () => {
    const { result, deps } = setup();
    act(() => result.current.beginVerification('t1'));
    act(() => result.current.onRunReport(report(2))); // pre-arm run's leftover
    await flush();
    expect(deps.postRunReport).not.toHaveBeenCalled();
  });

  it('never double-posts the same attempt while one is in flight', async () => {
    let release: (v: RunReportVerdict) => void = () => {};
    const deps: VerificationDeps = {
      postRunReport: vi.fn(
        () => new Promise<RunReportVerdict>((resolve) => { release = resolve; }),
      ),
      getVerifyState: vi.fn(async () => IDLE_STATE),
    };
    const { result } = renderHook(() =>
      useVerification({
        projectId: 'p1',
        mode: 'lite',
        enabled: true,
        applyFixTurn: vi.fn(),
        restartGame: vi.fn(),
        pushCoDebugMessage: vi.fn(),
        deps,
      }),
    );
    act(() => result.current.beginVerification('t1'));
    act(() => result.current.onRunReport(report(1)));
    act(() => result.current.onRunReport(report(1))); // kid restarts mid-post
    await act(async () => {
      release({ verdict: 'verified' });
    });
    expect(deps.postRunReport).toHaveBeenCalledTimes(1);
  });

  it('caps a chain at 3 reports client-side (belt-and-suspenders)', async () => {
    const { result, deps } = setup({
      verdicts: [
        { verdict: 'fixing', attempt: 1, turn: { ...FIX_TURN, turn_id: 'f1' } },
        { verdict: 'fixing', attempt: 2, turn: { ...FIX_TURN, turn_id: 'f2' } },
        { verdict: 'fixing', attempt: 3, turn: { ...FIX_TURN, turn_id: 'f3' } },
        { verdict: 'fixing', attempt: 4, turn: { ...FIX_TURN, turn_id: 'f4' } },
      ],
    });
    act(() => result.current.beginVerification('t1'));
    for (let attempt = 1; attempt <= 4; attempt++) {
      act(() => result.current.onRunReport(report(attempt)));
      await flush();
    }
    // Reports 1–3 posted; the 4th hit the client cap and the chain disarmed.
    expect(deps.postRunReport).toHaveBeenCalledTimes(3);
  });

  it('does nothing when disabled (offline stub / teacher viewer)', async () => {
    const { result, deps } = setup({ enabled: false });
    act(() => result.current.beginVerification('t1'));
    act(() => result.current.onRunReport(report(1)));
    await flush();
    expect(deps.postRunReport).not.toHaveBeenCalled();
    expect(deps.getVerifyState).not.toHaveBeenCalled();
  });

  it('ends the chain quietly on a network failure (verification never nags)', async () => {
    const deps: VerificationDeps = {
      postRunReport: vi.fn(async () => {
        throw new Error('boom');
      }),
      getVerifyState: vi.fn(async () => IDLE_STATE),
    };
    const pushCoDebugMessage = vi.fn();
    const { result } = renderHook(() =>
      useVerification({
        projectId: 'p1',
        mode: 'lite',
        enabled: true,
        applyFixTurn: vi.fn(),
        restartGame: vi.fn(),
        pushCoDebugMessage,
        deps,
      }),
    );
    act(() => result.current.beginVerification('t1'));
    act(() => result.current.onRunReport(report(1)));
    await flush();
    expect(pushCoDebugMessage).not.toHaveBeenCalled();
    act(() => result.current.onRunReport(report(1)));
    await flush();
    expect(deps.postRunReport).toHaveBeenCalledTimes(1); // disarmed after the failure
  });
});

describe('useVerification — resume-verify (GET …/code/verify-state)', () => {
  it('arms a pending turn at attempts+1 and restarts the game', async () => {
    const { result, deps, restartGame } = setup({
      state: { turn_id: 't9', verify_status: 'pending', attempts: 1 },
    });
    await waitFor(() => expect(restartGame).toHaveBeenCalledTimes(1));
    expect(result.current.reportAttempt).toBe(2);
    act(() => result.current.onRunReport(report(2)));
    await flush();
    expect(deps.postRunReport).toHaveBeenCalledWith(
      expect.objectContaining({ turnId: 't9', report: report(2) }),
    );
  });

  it('stays idle when the newest turn is not pending', async () => {
    const { deps, restartGame } = setup({
      state: { turn_id: 't9', verify_status: 'verified', attempts: 1 },
    });
    await waitFor(() => expect(deps.getVerifyState).toHaveBeenCalled());
    await flush();
    expect(restartGame).not.toHaveBeenCalled();
  });
});
