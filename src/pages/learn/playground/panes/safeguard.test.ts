// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AgentTurnResult, SafeguardingVerdict } from '../../code/codeApi';
import type { GameAgentDeps } from './gameAgent';
import { useGameAgent } from './useGameAgent';

const DISTRESS: SafeguardingVerdict = {
  class: 'distress',
  message: 'Please talk to a grown-up you trust.',
  crisisResource: { name: 'Kids Helpline', phone: '1800 55 1800' },
};

const PERSONAL: SafeguardingVerdict = {
  class: 'personal-disclosure',
  message: 'Best to share that with a grown-up.',
};

const TURN: AgentTurnResult = {
  turn_id: 't1',
  requires_approval: false,
  plan: null,
  changes: [],
  files: [{ path: 'main.js', content: 'x', kind: 'text', size: 1 }],
  version: 1,
  summary: 'done',
  stars_charged: 2,
  tools_fired: [],
};

/** A deps double whose `classify` is scripted per call; the turn would apply. */
function makeDeps(verdicts: (SafeguardingVerdict | null)[]): GameAgentDeps {
  let i = 0;
  return {
    runTurn: vi.fn(async () => TURN),
    approve: vi.fn(async () => TURN),
    classify: vi.fn(async () => ({ safeguarding: verdicts[Math.min(i++, verdicts.length - 1)] ?? null, intent: 'code' as const })),
    raiseHand: vi.fn(async () => {}),
    reportRuntimeErrors: vi.fn(async () => ({ attempted: false, co_debug: false, attempt: 1 })),
  };
}

function setup(deps: GameAgentDeps, onApplyFiles = vi.fn()) {
  return renderHook(() =>
    useGameAgent({ files: [], onApplyFiles, projectId: 'p1', mode: 'pro', deps }),
  );
}

describe('useGameAgent safeguarding (J13)', () => {
  it('deflects a distress message: no turn, no file apply, standing crisis resource', async () => {
    const deps = makeDeps([DISTRESS]);
    const onApplyFiles = vi.fn();
    const { result } = setup(deps, onApplyFiles);

    await act(async () => {
      await result.current.send('i feel hopeless');
    });

    await waitFor(() => expect(result.current.safeguard?.class).toBe('distress'));
    expect(result.current.safeguard?.crisisResource?.phone).toBe('1800 55 1800');
    // The classifier deflected BEFORE any turn — no game turn ran, no files applied.
    expect(deps.runTurn).not.toHaveBeenCalled();
    expect(onApplyFiles).not.toHaveBeenCalled();
    // The deflection bubble carries the break-character marker.
    expect(result.current.chat.some((c) => c.safeguard)).toBe(true);
  });

  it('sticky safe-mode: a later personal-disclosure never downgrades distress', async () => {
    const deps = makeDeps([DISTRESS, PERSONAL]);
    const { result } = setup(deps);

    await act(async () => {
      await result.current.send('i feel hopeless');
    });
    await waitFor(() => expect(result.current.safeguard?.class).toBe('distress'));

    await act(async () => {
      await result.current.send('also my dog died');
    });
    // Still distress — the crisis resource persists (does not relax to disclosure).
    await waitFor(() => expect(deps.classify).toHaveBeenCalledTimes(2));
    expect(result.current.safeguard?.class).toBe('distress');
    expect(result.current.safeguard?.crisisResource).toBeDefined();
  });

  it('personal-disclosure deflects without a crisis resource', async () => {
    const deps = makeDeps([PERSONAL]);
    const { result } = setup(deps);

    await act(async () => {
      await result.current.send('my dog died');
    });
    await waitFor(() => expect(result.current.safeguard?.class).toBe('personal-disclosure'));
    expect(result.current.safeguard?.crisisResource).toBeUndefined();
    expect(deps.runTurn).not.toHaveBeenCalled();
  });

  it('a normal request proceeds to a turn (classify returns null)', async () => {
    const deps = makeDeps([null]);
    const onApplyFiles = vi.fn();
    const { result } = setup(deps, onApplyFiles);

    await act(async () => {
      await result.current.send('make the ball faster');
    });
    await waitFor(() => expect(deps.runTurn).toHaveBeenCalledTimes(1));
    expect(result.current.safeguard).toBeNull();
  });

  it('raise-hand flips to the calm waiting state and signals best-effort', async () => {
    const deps = makeDeps([null]);
    const { result } = setup(deps);

    expect(result.current.handRaised).toBe(false);
    act(() => result.current.raiseHand());
    expect(result.current.handRaised).toBe(true);
    expect(deps.raiseHand).toHaveBeenCalledWith({ projectId: 'p1' });
    // Idempotent — a second tap does not re-signal.
    act(() => result.current.raiseHand());
    expect(deps.raiseHand).toHaveBeenCalledTimes(1);
  });
});
