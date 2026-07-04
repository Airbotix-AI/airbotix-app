// Post-apply verification loop driver (D-PAP-40/44, FE-2). After an applied
// game turn (`verification: 'pending'`), the studio runs the game instrumented;
// GameFrame emits a RunReport which this hook POSTs for the armed turn. The
// backend adjudicates:
//   - `fixing`   → apply the fix turn's files SILENTLY (adopt version), restart,
//                  re-arm for the fix turn at attempt+1. NO chat message — the
//                  kid sees nothing (product decision: silent on auto-fix).
//   - `co_debug` → ONE warm chat bubble (the server's message) — the ONLY
//                  visible surface of the whole loop.
//   - `verified` / `recorded` / `inconclusive` → do nothing (silent).
// Resume-verify: on mount, a `pending` verify-state means the last applied turn
// was never verified (closed tab) — arm it at attempts+1 and restart the game
// so a fresh report gets generated.

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getVerifyState,
  postRunReport,
  type AgentTurnResult,
} from '../../code/codeApi';
import type { RunReport } from '../runReport';

/** Belt-and-suspenders client cap: reports posted per verification chain. The
 *  server bounds fix turns anyway (≤2 + doom-loop breaker); this just guarantees
 *  the client loop terminates even against a misbehaving response stream. */
const MAX_CHAIN_REPORTS = 3;

/** Backend seam (tests inject mocks; defaults to the real codeApi calls). */
export interface VerificationDeps {
  postRunReport: typeof postRunReport;
  getVerifyState: typeof getVerifyState;
}

const realDeps: VerificationDeps = { postRunReport, getVerifyState };

export interface UseVerificationOptions {
  /** The real backend project (verification is a no-op without one). */
  projectId?: string;
  /** Age tier — forwarded so a fix turn keeps the Lite/Pro voice. */
  mode: 'lite' | 'pro';
  /** Real, kid-owned project only — false for the offline stub / teacher viewer. */
  enabled: boolean;
  /** Apply a fix turn's files+version through EXACTLY the same funnel chat
   *  turns use (projectStore apply + server-version adoption). */
  applyFixTurn: (turn: AgentTurnResult) => void;
  /** Re-run the game (bump runKey) so the next report gets generated. */
  restartGame: () => void;
  /** Surface the co-debug hand-off as one warm agent chat bubble. */
  pushCoDebugMessage: (text: string) => void;
  /** A fix turn debits Stars — let the wallet refetch. */
  onStarsCharged?: (charged: number) => void;
  deps?: VerificationDeps;
}

interface ArmedChain {
  turnId: string;
  /** The 1-based attempt the NEXT report must carry. */
  attempt: number;
  /** Reports already posted in this chain (client-side loop cap). */
  reports: number;
}

export interface Verification {
  /** The attempt GameFrame stamps into the next run's report. */
  reportAttempt: number;
  /** Arm the loop: the next run report is posted for this just-applied turn. */
  beginVerification: (turnId: string) => void;
  /** GameFrame's `onRunReport` — posts the report for the armed turn (if any). */
  onRunReport: (report: RunReport) => void;
}

export function useVerification(opts: UseVerificationOptions): Verification {
  const { projectId, mode, enabled, deps = realDeps } = opts;

  // Latest callbacks in refs so the async verdict handling never goes stale and
  // the mount effect doesn't re-fire on parent re-renders.
  const callbacksRef = useRef(opts);
  callbacksRef.current = opts;

  const armedRef = useRef<ArmedChain | null>(null);
  // The (turnId:attempt) currently in flight — a duplicate report for the same
  // attempt (kid restarts mid-post) must never double-POST.
  const inFlightRef = useRef<string | null>(null);
  const [reportAttempt, setReportAttempt] = useState(1);

  const arm = useCallback((chain: ArmedChain | null) => {
    armedRef.current = chain;
    setReportAttempt(chain?.attempt ?? 1);
  }, []);

  const beginVerification = useCallback(
    (turnId: string) => {
      if (!enabled || !turnId) return;
      arm({ turnId, attempt: 1, reports: 0 });
    },
    [enabled, arm],
  );

  const onRunReport = useCallback(
    (report: RunReport) => {
      const armed = armedRef.current;
      if (!enabled || !projectId || !armed) return;
      // A report generated before this chain was (re)armed reports a stale run —
      // only the run started at the armed attempt is admissible evidence.
      if (report.attempt !== armed.attempt) return;
      if (armed.reports >= MAX_CHAIN_REPORTS) {
        arm(null);
        return;
      }
      const key = `${armed.turnId}:${armed.attempt}`;
      if (inFlightRef.current === key) return;
      inFlightRef.current = key;
      void deps
        .postRunReport({ projectId, turnId: armed.turnId, report, mode })
        .then((res) => {
          // The POST is held open for the whole server-side fix turn — if the
          // kid sent a chat turn meanwhile, a NEW chain owns the loop and this
          // verdict is stale evidence: applying its files would clobber the
          // kid's newer turn. Discard unless we are still the armed chain.
          if (armedRef.current !== armed) return;
          const cb = callbacksRef.current;
          if (res.verdict === 'fixing') {
            // Silent fix beat: apply exactly like a chat turn (files + version),
            // re-arm for the FIX turn's own report, run again. No chat message.
            arm({
              turnId: res.turn.turn_id,
              attempt: res.attempt + 1,
              reports: armed.reports + 1,
            });
            cb.applyFixTurn(res.turn);
            cb.onStarsCharged?.(res.turn.stars_charged);
            cb.restartGame();
            return;
          }
          arm(null);
          if (res.verdict === 'co_debug') cb.pushCoDebugMessage(res.message);
          // verified / recorded / inconclusive: silent — the kid sees nothing.
        })
        .catch(() => {
          // Verification must never nag: a failed post ends the chain quietly
          // (resume-verify picks a still-pending turn back up on next open) —
          // but only if this chain still owns the loop.
          if (armedRef.current === armed) arm(null);
        })
        .finally(() => {
          if (inFlightRef.current === key) inFlightRef.current = null;
        });
    },
    [enabled, projectId, mode, deps, arm],
  );

  // Resume-verify (D-PAP-40): once per mount, ask the backend whether the
  // newest applied turn is still awaiting verification; if so, arm it at
  // attempts+1 and run the game so a report gets generated. Best-effort.
  const resumedRef = useRef(false);
  useEffect(() => {
    if (!enabled || !projectId || resumedRef.current) return undefined;
    resumedRef.current = true;
    let alive = true;
    void deps
      .getVerifyState(projectId)
      .then((state) => {
        if (!alive || !state.turn_id || state.verify_status !== 'pending') return;
        if (armedRef.current) return; // a fresh chat-turn chain already owns the loop
        arm({ turnId: state.turn_id, attempt: state.attempts + 1, reports: 0 });
        callbacksRef.current.restartGame();
      })
      .catch(() => {
        // Unknown state — verify nothing rather than block or nag.
      });
    return () => {
      alive = false;
    };
  }, [enabled, projectId, deps, arm]);

  return { reportAttempt, beginVerification, onRunReport };
}
