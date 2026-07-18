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
// Screenshot evidence (D-HARN-21b): when the verification payload carries
// `screenshot_requested`, the report gains a downscaled composited screenshot —
// captured over the control channel; ANY capture failure omits the field and
// the report still posts (a screenshot bug must never fail a kid's run).

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getVerifyState,
  postRunReport,
  type AgentTurnResult,
} from '../../code/codeApi';
import { useProjectStore } from '../projectStore';
import { captureReportScreenshot } from '../reportScreenshot';
import type { RunReport } from '../runReport';

/** The project store's monotonic mutation counter — the staleness sentinel. */
const vfsSeq = (): number => useProjectStore.getState().change?.seq ?? 0;

/** Belt-and-suspenders client cap: reports posted per verification chain. The
 *  server bounds fix turns anyway (≤2 + doom-loop breaker); this just guarantees
 *  the client loop terminates even against a misbehaving response stream. */
const MAX_CHAIN_REPORTS = 3;

/** Backend seam (tests inject mocks; defaults to the real codeApi calls). */
export interface VerificationDeps {
  postRunReport: typeof postRunReport;
  getVerifyState: typeof getVerifyState;
  /** Screenshot evidence capture (D-HARN-21b) — bounded, resolves undefined on
   *  any failure so the report still posts without the field. */
  captureScreenshot: typeof captureReportScreenshot;
}

const realDeps: VerificationDeps = {
  postRunReport,
  getVerifyState,
  captureScreenshot: captureReportScreenshot,
};

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
  /** Backend asked for screenshot evidence on this turn's report (D-HARN-21b). */
  screenshot: boolean;
  /** The VFS mutation seq when this chain armed. A `fixing` verdict that arrives
   *  after the kid touched the project (hand-edit, file op, Time Machine revert)
   *  was computed against an older snapshot — applying it would clobber the
   *  kid's newer work, so the chain is dropped instead. */
  baseSeq: number;
}

export interface Verification {
  /** The attempt GameFrame stamps into the next run's report. */
  reportAttempt: number;
  /** Arm the loop: the next run report is posted for this just-applied turn.
   *  `screenshotRequested` = the turn's `screenshot_requested` hint. */
  beginVerification: (turnId: string, screenshotRequested?: boolean) => void;
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
    (turnId: string, screenshotRequested = false) => {
      if (!enabled || !turnId) return;
      // Called AFTER the turn's files applied, so baseSeq is the post-apply seq.
      arm({ turnId, attempt: 1, reports: 0, screenshot: screenshotRequested, baseSeq: vfsSeq() });
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
      // Screenshot evidence (D-HARN-21b): attached ONLY when the backend asked
      // for it, and ANY capture failure (timeout / decode / oversize / a throwing
      // dep) omits the field — the report must still post.
      const withEvidence = async (): Promise<RunReport> => {
        if (!armed.screenshot) return report;
        try {
          const screenshot = await deps.captureScreenshot();
          return screenshot ? { ...report, screenshot } : report;
        } catch {
          return report;
        }
      };
      void withEvidence()
        .then((finalReport) => {
          // Capture adds up to ~3s — if a newer chat turn re-armed (and possibly
          // restarted the game) meanwhile, this screenshot shows the NEW game on
          // the OLD turn's report: wrong evidence for the fix turn / vision
          // verdict. Only the still-armed chain may post.
          if (armedRef.current !== armed) return null;
          return deps.postRunReport({ projectId, turnId: armed.turnId, report: finalReport, mode });
        })
        .then((res) => {
          if (res === null) return; // superseded before posting (stale evidence)
          // The POST is held open for the whole server-side fix turn — if the
          // kid sent a chat turn meanwhile, a NEW chain owns the loop and this
          // verdict is stale evidence: applying its files would clobber the
          // kid's newer turn. Discard unless we are still the armed chain.
          if (armedRef.current !== armed) return;
          const cb = callbacksRef.current;
          if (res.verdict === 'fixing') {
            // The kid touched the project while the server was fixing (hand-edit,
            // file op, Time Machine revert): the fix was computed against the older
            // snapshot, so applying it would clobber their newer work. Drop the
            // chain — resume-verify picks the still-pending turn up on next open.
            if (vfsSeq() !== armed.baseSeq) {
              arm(null);
              return;
            }
            // Silent fix beat: apply exactly like a chat turn (files + version +
            // per-path merge), re-arm for the FIX turn's own report (baseSeq is
            // read AFTER the apply so the fix's own mutation doesn't trip the
            // staleness guard), run again. No chat message.
            cb.applyFixTurn(res.turn);
            cb.onStarsCharged?.(res.turn.stars_charged);
            arm({
              turnId: res.turn.turn_id,
              attempt: res.attempt + 1,
              reports: armed.reports + 1,
              screenshot: res.turn.screenshot_requested === true,
              baseSeq: vfsSeq(),
            });
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
        arm({
          turnId: state.turn_id,
          attempt: state.attempts + 1,
          reports: 0,
          screenshot: state.screenshot_requested === true,
          baseSeq: vfsSeq(),
        });
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
