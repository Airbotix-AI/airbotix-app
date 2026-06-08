// Chat controller for the playground AI panel (design §7 / PRD J2). It owns the
// chat state machine and the apply→run wiring around a turn, and works in TWO
// modes behind the SAME UI:
//
//   - REAL (a `projectId` is set — the authed studio): the turn runs SERVER-SIDE
//     via `runAgentTurn` (gameAgent → code/codeApi). Streams token + per-tool
//     deltas live; meters Stars; gates Pro multi-file behind plan→approve. For a
//     Lite kid the "Do it / Show me first" agency beat + default-on prediction beat
//     (OD-1/OD-3) fire BEFORE the turn is spent — the turn POSTs only on confirm,
//     because a Lite (non-approval) turn auto-applies + debits Stars inside the POST
//     (D-CODE1c, §10 "后扣模式"), so "Show me first" must not have spent it. The kid
//     NEVER calls an LLM (CLAUDE.md #5).
//   - STUB (no `projectId` — a project-less session): the offline `runTurnStub`,
//     so the desktop stays demoable with no backend. The chat UI is identical.
//
// Undo is FREE (OD-3): a local revert of the last applied change — never an AI
// call. Offline mid-turn surfaces a calm banner (J2), not a frozen screen.

import { useCallback, useEffect, useRef, useState } from 'react';

import type { AgentTurnResult, SafeguardingVerdict, VfsFile } from '../../code/codeApi';
import {
  executeClientActions,
  type ClientActionHandlers,
} from '../executeClientActions';
import { ApiError } from '@/lib/api';
import {
  isOffline,
  predictionQuestion,
  realGameAgentDeps,
  streamTurn,
  type GameAgentDeps,
} from './gameAgent';
import { runTurnStub, type RunTurn } from './gameAgentStub';

/** In-chat call-to-action buttons (rendered on the message that carries them). */
export type ChatAction = 'run' | 'code';

/** One chat bubble. Mirrors `code/useCodeStudio` `ChatItem`. */
export interface ChatItem {
  id: string;
  role: 'kid' | 'agent';
  text: string;
  pending?: boolean;
  /** Streaming in progress — the text is being revealed token-by-token (J2). */
  streaming?: boolean;
  /** ⭐ charged for this turn (real path only; OD-3 "meter every turn"). */
  stars?: number;
  toolsFired?: string[];
  changes?: { path: string; before: string; after: string }[];
  /** Optional CTA buttons (e.g. the launch "Run game" / "See code" hand-off). */
  actions?: ChatAction[];
  /** A safeguarding deflection bubble (J13) — rendered with the rescue styling. */
  safeguard?: boolean;
}

/**
 * A turn the kid must confirm before it applies (PRD J2). `kind` distinguishes:
 *   - 'agency' — Lite "here's what I'll do… Do it / Show me first" (OD-1). This
 *     beat fires BEFORE the turn is spent: a non-approval (Lite) turn AUTO-APPLIES
 *     and DEBITS Stars server-side inside the POST (D-CODE1c, §10 "后扣模式"), so
 *     we must NOT run it until the kid confirms — otherwise "Show me first" would
 *     leak Stars and desync the persisted VFS. Hence `result` is null here and the
 *     turn runs on confirm.
 *   - 'plan'   — Pro multi-file plan→approve gate (requires_approval). The turn has
 *     already run (read-only/collected writes), `result` carries the staged turn,
 *     and confirm calls `approve` to persist; cancel calls `reject` to discard.
 * Both carry a prediction question (the default-on predict beat, OD-3) so the kid
 * thinks before spending a metered turn.
 */
export interface PendingTurn {
  kind: 'agency' | 'plan';
  turnId: string;
  prompt: string;
  summary: string;
  changes: { path: string; before: string; after: string }[];
  /**
   * The staged full result. Set for a Pro 'plan' (the turn ran, awaiting approve).
   * NULL for a Lite 'agency' beat — the turn has NOT run yet (it runs on confirm).
   */
  result: AgentTurnResult | null;
  /** A typing-free "what will change?" question (PRD J2 prediction beat). */
  prediction: string;
}

export interface UseGameAgentOptions {
  /** Current VFS — passed to the turn so the agent edits the live files. */
  files: VfsFile[];
  /** Commit the turn's resulting VFS back to the page-level source of truth. */
  onApplyFiles: (files: VfsFile[]) => void;
  /** The real backend project. When absent, the offline stub runs (project-less session). */
  projectId?: string;
  /** Age-derived tier: Lite (8–11) auto-applies w/ agency beat; Pro (12–17) approves. */
  mode?: 'lite' | 'pro';
  /** The family Stars balance, for the metered display (real path). */
  balance?: number;
  /** Called after a turn debits Stars so the wallet can refetch. */
  onStarsCharged?: (charged: number) => void;
  /** Studio handlers for a turn's workspace actions (run/restart/focus). When
   *  set, client_actions on a turn result are executed after the VFS applies. */
  clientActions?: ClientActionHandlers;
  /** The AI's first turn (generated on the loading screen) — seeds the chat with
   *  the real opening exchange instead of the canned starter. Takes precedence
   *  over `introPrompt`. */
  firstTurn?: FirstTurnSeed;
  /** STUB seam (project-less session only). Ignored when `projectId` is set. */
  runTurn?: RunTurn;
  /** Backend seam (tests inject a mock; defaults to the real API). */
  deps?: GameAgentDeps;
  /**
   * Seed the chat on first mount with the launch hand-off (kid prompt + a generic
   * "starter ready" message carrying Run / See-code actions).
   */
  introPrompt?: string;
}

const PENDING_TEXT = 'Thinking…';
/**
 * "Can't get to the server" copy — used when the request never reached the
 * backend: `fetch` itself rejected (connection refused / DNS / CORS) so no
 * `ApiError` was produced, OR a gateway is down (502/503/504). Distinct from
 * SERVER_ERROR_TEXT so a connectivity problem reads differently from a backend
 * that WAS reached but errored (the common dev-mode "backend restarting" case).
 */
const ERROR_TEXT = 'Could not reach the AI. Try again.';
/**
 * "The backend was reached but errored" copy (an unexpected 5xx / unhandled
 * status). The AI server answered with a failure rather than being unreachable,
 * so we don't claim we "couldn't reach" it — that misdirects debugging.
 */
const SERVER_ERROR_TEXT = 'The AI ran into a problem. Try again in a moment.';
/** Calm, kid-framed offline copy (PRD J2 — never a frozen screen). */
const OFFLINE_TEXT = 'Internet hiccup — your work is safe. Try again in a moment.';
/**
 * The cap-reached "ask your grown-up" copy (J11 / §11g(e)). When the parent
 * spending cap (or wallet) is hit, the backend blocks AI turns BEFORE any LLM
 * call; the kid sees this — never a dead end. Exported so the panel can tag it
 * with the `cap-message` testid without substring-matching the wording.
 */
export const CAP_MESSAGE = 'You used all the Stars for now. Ask your grown-up to add more. ⭐';

const STARTER_MESSAGE =
  'Your game starter is ready to play 🎮\n\n' +
  'I put together a runnable starter for your idea — it already works out of the ' +
  'box. Take it for a spin now, or open the code whenever you want to start ' +
  'changing things.';

function buildIntro(prompt: string | undefined): ChatItem[] {
  const items: ChatItem[] = [];
  const p = prompt?.trim();
  if (p) items.push({ id: 'intro-kid', role: 'kid', text: p });
  items.push({ id: 'intro-agent', role: 'agent', text: STARTER_MESSAGE, actions: ['run', 'code'] });
  return items;
}

/** The AI's first turn (run on the loading screen) replayed into the chat so the
 *  workspace opens with the real opening exchange, not a canned starter. */
export interface FirstTurnSeed {
  prompt: string;
  reply: string;
  toolsFired?: string[];
}

function buildFirstTurn(seed: FirstTurnSeed): ChatItem[] {
  return [
    { id: 'first-kid', role: 'kid', text: seed.prompt },
    {
      id: 'first-agent',
      role: 'agent',
      text: seed.reply,
      toolsFired: seed.toolsFired,
      actions: ['run', 'code'],
    },
  ];
}

/** Kid-framed error copy for the known backend failure envelopes (mirror code). */
function friendlyError(e: unknown): string {
  if (isOffline()) return OFFLINE_TEXT;
  if (e instanceof ApiError) {
    if (e.code === 'WALLET_INSUFFICIENT' || e.code === 'DAILY_CAP_EXCEEDED' || e.status === 402)
      return CAP_MESSAGE;
    if (e.code === 'FAMILY_PAUSED') return 'Your family paused AI. Ask a grown-up.';
    if (e.code === 'MODERATION_REJECTED')
      return "Let's keep it kind and safe — try asking for something else.";
    if (e.code === 'MODERATION_WARN')
      return 'That message looked a bit off. Try saying it a different way.';
    // A gateway is down (the backend itself is unreachable behind a proxy) → keep
    // the "can't reach" copy; any other status means the server answered with a
    // failure → it WAS reached, so surface the distinct server-error copy.
    if (e.status === 502 || e.status === 503 || e.status === 504) return ERROR_TEXT;
    return SERVER_ERROR_TEXT;
  }
  // Not an ApiError → `fetch` rejected before any response (connection refused /
  // DNS / CORS): the backend was never reached.
  return ERROR_TEXT;
}

const toChanges = (r: AgentTurnResult) =>
  r.changes.map((c) => ({ path: c.path, before: c.before, after: c.after }));

export function useGameAgent(opts: UseGameAgentOptions) {
  const {
    files,
    onApplyFiles,
    projectId,
    mode = 'lite',
    balance,
    onStarsCharged,
    clientActions,
    runTurn = runTurnStub,
    deps = realGameAgentDeps,
    introPrompt,
    firstTurn,
  } = opts;

  const isReal = !!projectId;

  const [chat, setChat] = useState<ChatItem[]>(() =>
    firstTurn
      ? buildFirstTurn(firstTurn)
      : introPrompt !== undefined
        ? buildIntro(introPrompt)
        : [],
  );
  const [busy, setBusy] = useState(false);
  // Whether the token-by-token reveal replay is currently running (drives the
  // Stop / skip-animation button, H1). Distinct from `busy` (which spans the
  // whole turn incl. the network round-trip).
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState<boolean>(isOffline());
  // A turn awaiting the kid's confirm (Lite agency beat OR Pro plan gate, J2).
  const [pending, setPending] = useState<PendingTurn | null>(null);
  // The safeguarding verdict for the current session (J13 / §11g). Set when the
  // backend classifier deflects a message instead of running a game turn. STICKY:
  // a `distress` verdict's crisis resource PERSISTS (sticky safe-mode) and never
  // downgrades to `personal-disclosure`; re-disclosure escalates a tier (tracked
  // by `safeguardTier`) but never resets to normal game-help.
  const [safeguard, setSafeguard] = useState<SafeguardingVerdict | null>(null);
  const safeguardTier = useRef(0);
  // The "Ask my teacher" raise-hand (J4): a calm waiting state once raised.
  const [handRaised, setHandRaised] = useState(false);
  // The VFS snapshot BEFORE the last applied turn — the free local undo target.
  const undoTargetRef = useRef<VfsFile[] | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  // Abort the in-flight stream replay on unmount / a new turn.
  const streamAbort = useRef<{ aborted: boolean }>({ aborted: false });
  // True only once the component has actually unmounted — lets us tell a
  // user-initiated "skip the animation" abort (still finalize) apart from an
  // unmount abort (bail, the component is gone).
  const unmountedRef = useRef(false);
  // The last prompt sent — so a failed turn can be retried verbatim (H2).
  const lastPromptRef = useRef<string>('');

  // Reflect connectivity into a banner the panel renders (J2 offline state).
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    // Re-arm on (re)mount: StrictMode's dev mount→cleanup→remount cycle would
    // otherwise leave `unmountedRef` poisoned `true`, so the very first streamed
    // turn's finalize block (gated on `!unmountedRef.current`) would never run and
    // the reply would be stuck on the `agent-msg-streaming` bubble forever.
    unmountedRef.current = false;
    return () => {
      streamAbort.current.aborted = true;
      unmountedRef.current = true;
    };
  }, []);

  const seq = useRef(0);
  const nextId = useCallback((): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `m${seq.current++}`;
  }, []);

  /** Apply a completed turn: record the undo target, stream the reply, apply VFS. */
  const applyResult = useCallback(
    async (result: AgentTurnResult, pendingId: string) => {
      undoTargetRef.current = files;
      setCanUndo(true);
      // Replace the "Thinking…" bubble with a streaming one, then reveal deltas.
      setChat((prev) =>
        prev.map((it) =>
          it.id === pendingId
            ? { id: pendingId, role: 'agent', text: '', streaming: true, stars: result.stars_charged }
            : it,
        ),
      );
      const sig = { aborted: false };
      streamAbort.current = sig;
      setStreaming(true);
      await streamTurn(result, (d) => {
        setChat((prev) =>
          prev.map((it) => {
            if (it.id !== pendingId) return it;
            if (d.type === 'token') return { ...it, text: it.text + d.text };
            return { ...it, toolsFired: [...(it.toolsFired ?? []), d.tool] };
          }),
        );
      }, sig);
      // A user-initiated abort (Stop) sets sig.aborted to skip the reveal loop,
      // but the turn is already paid for — so we STILL finalize (full summary +
      // tools + apply + stars). Only an actual unmount skips the React state
      // updates (the bubble + streaming flag belong to a gone tree). The apply +
      // stars callbacks, though, ALWAYS run: the turn was charged server-side, so
      // dropping its files would lose paid-for work and desync the persisted VFS
      // (they write to the Zustand store / wallet, which is safe after unmount).
      if (!unmountedRef.current) {
        setChat((prev) =>
          prev.map((it) =>
            it.id === pendingId
              ? {
                  id: pendingId,
                  role: 'agent',
                  text: result.summary,
                  stars: result.stars_charged,
                  toolsFired: result.tools_fired,
                  changes: toChanges(result),
                }
              : it,
          ),
        );
        setStreaming(false);
      }
      onApplyFiles(result.files);
      onStarsCharged?.(result.stars_charged);
      // Run any workspace actions the turn asked for (play/restart/focus).
      if (clientActions) executeClientActions(result.client_actions, clientActions);
    },
    [files, onApplyFiles, onStarsCharged, clientActions],
  );

  /**
   * Handle a safeguarding deflection (J13 / §11g). The backend classifier decided
   * NOT to run a game turn — so we apply NO files, charge NO Stars, and stream NO
   * turn. We replace the pending bubble with the standing deflection and surface
   * the rescue UI. STICKY safe-mode: a `distress` verdict never downgrades and its
   * crisis resource persists; a re-disclosure escalates a tier (never resets to
   * normal game-help). A `personal-disclosure` deflects + logs without escalation.
   */
  const applySafeguard = useCallback(
    (verdict: SafeguardingVerdict, pendingId: string) => {
      // Sticky: once in distress, stay in distress (a later personal-disclosure
      // must not relax the safe-mode); each new trigger escalates a tier.
      safeguardTier.current += 1;
      setSafeguard((prev) =>
        prev?.class === 'distress' && verdict.class !== 'distress' ? prev : verdict,
      );
      setChat((prev) =>
        prev.map((it) =>
          it.id === pendingId
            ? { id: pendingId, role: 'agent', text: verdict.message, safeguard: true }
            : it,
        ),
      );
    },
    [],
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy || pending) return;
      lastPromptRef.current = trimmed;

      // Offline pre-check (real path) — never even attempt the call; keep work safe.
      if (isReal && isOffline()) {
        setOffline(true);
        setError(OFFLINE_TEXT);
        return;
      }

      const pendingId = nextId();
      setError(null);
      setBusy(true);
      setChat((prev) => [
        ...prev,
        { id: nextId(), role: 'kid', text: trimmed },
        { id: pendingId, role: 'agent', text: PENDING_TEXT, pending: true },
      ]);

      // ── STUB path (project-less session): the offline tweak, no Stars/approval. ──
      if (!isReal) {
        try {
          const result = await runTurn(trimmed, files);
          undoTargetRef.current = files;
          setCanUndo(true);
          setChat((prev) =>
            prev.map((it) =>
              it.id === pendingId
                ? {
                    id: pendingId,
                    role: 'agent',
                    text: result.summary,
                    toolsFired: result.toolsFired,
                    changes: result.changes,
                  }
                : it,
            ),
          );
          onApplyFiles(result.files);
        } catch {
          setError(ERROR_TEXT);
          setChat((prev) =>
            prev.map((it) => (it.id === pendingId ? { id: pendingId, role: 'agent', text: ERROR_TEXT } : it)),
          );
        } finally {
          setBusy(false);
        }
        return;
      }

      // ── Safeguarding gate (J13 / §11g): classify the message server-side BEFORE
      // any LLM call or agency beat. A distress / personal-disclosure message is
      // DEFLECTED here — it never becomes a game turn, never spends Stars, never
      // changes the VFS. This must run for BOTH tiers (it precedes the Lite agency
      // beat below). The classifier is free and recall-favouring (§11g). On a
      // classify failure we fall through to the normal flow (fail-open to game-help
      // is acceptable — the backend turn firewall is a second line of defence).
      try {
        const verdict = await deps.classify({ projectId: projectId!, prompt: trimmed });
        if (verdict) {
          applySafeguard(verdict, pendingId);
          setBusy(false);
          return;
        }
      } catch {
        // Classifier unreachable — proceed; the turn-level firewall still applies.
      }

      // ── Lite agency beat (OD-1): the typing-free "Do it / Show me first" +
      // predict beat fires BEFORE the turn is spent. A Lite (non-approval) turn
      // AUTO-APPLIES + DEBITS Stars server-side inside POST /code/turn (D-CODE1c,
      // §10 "后扣模式"), so we must NOT run it yet — running-then-staging would let
      // "Show me first" leak Stars and desync the persisted VFS. The turn runs on
      // confirm (`confirmPending`). No backend call, no Stars, no VFS change here.
      if (mode === 'lite') {
        setChat((prev) => prev.filter((it) => it.id !== pendingId));
        setBusy(false);
        setPending({
          kind: 'agency',
          turnId: '',
          prompt: trimmed,
          summary: "I'll make that change for you. Want me to go ahead?",
          changes: [],
          result: null,
          prediction: predictionQuestion(trimmed),
        });
        return;
      }

      // ── REAL Pro path: server-side loop, Stars-metered, streamed, gated. ──
      try {
        const result = await deps.runTurn({ projectId: projectId!, prompt: trimmed, mode });
        // Pro multi-file → plan→approve gate (writes were collected, not persisted).
        // A non-approval Pro turn auto-applied + debited inside the POST, so apply
        // it immediately (mirror useCodeStudio) — never stage an applied turn.
        if (result.requires_approval) {
          setChat((prev) => prev.filter((it) => it.id !== pendingId));
          setPending({
            kind: 'plan',
            turnId: result.turn_id,
            prompt: trimmed,
            summary:
              result.plan?.plan_text ??
              (result.changes.length
                ? `I'll change ${result.changes.map((c) => c.path).join(', ')}.`
                : result.summary),
            changes: toChanges(result),
            result,
            prediction: predictionQuestion(trimmed),
          });
          return;
        }
        await applyResult(result, pendingId);
      } catch (e) {
        const msg = friendlyError(e);
        if (msg === OFFLINE_TEXT) setOffline(true);
        setError(msg);
        setChat((prev) =>
          prev.map((it) => (it.id === pendingId ? { id: pendingId, role: 'agent', text: msg } : it)),
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, pending, isReal, nextId, runTurn, files, onApplyFiles, deps, projectId, mode, applyResult, applySafeguard],
  );

  /**
   * "Ask my teacher" raise-hand (J4). Flips into a calm waiting state and posts a
   * lightweight signal to the teacher (real path). It is a deliberately tiny,
   * always-safe action: no LLM, no Stars, no VFS change. Idempotent — a second tap
   * while already raised is a no-op (the kid just sees the calm waiting copy).
   */
  const raiseHand = useCallback(() => {
    if (handRaised) return;
    setHandRaised(true);
    // Best-effort notify; the calm waiting state never depends on it succeeding.
    if (isReal && projectId) {
      void deps.raiseHand?.({ projectId }).catch(() => {});
    }
  }, [handRaised, isReal, projectId, deps]);

  /** Put the "Ask my teacher" hand back down (cancel the raise). Local toggle —
   *  the backend raise/lower wiring lands with the teacher-WS work (I‑6/I‑7). */
  const lowerHand = useCallback(() => {
    setHandRaised(false);
  }, []);

  /**
   * Confirm a staged turn (Lite "Do it" OR Pro "✓ Approve"). For a Pro plan we ask
   * the backend to persist the already-run turn (`approveTurn`). For a Lite agency
   * beat the turn has NOT run yet — confirm is what SPENDS it: we POST /code/turn
   * now (which auto-applies + debits Stars server-side, D-CODE1c) and apply the
   * result. Either way Stars debit once, only after the kid commits.
   */
  const confirmPending = useCallback(async () => {
    const p = pending;
    if (!p || busy) return;
    setBusy(true);
    setError(null);
    const pendingId = nextId();
    setChat((prev) => [...prev, { id: pendingId, role: 'agent', text: PENDING_TEXT, pending: true }]);
    try {
      const result =
        p.kind === 'plan'
          ? await deps.approve({ projectId: projectId!, turnId: p.turnId, decision: 'approve' })
          : await deps.runTurn({ projectId: projectId!, prompt: p.prompt, mode });
      setPending(null);
      await applyResult(result, pendingId);
    } catch (e) {
      const msg = friendlyError(e);
      if (msg === OFFLINE_TEXT) setOffline(true);
      setError(msg);
      setChat((prev) => prev.map((it) => (it.id === pendingId ? { id: pendingId, role: 'agent', text: msg } : it)));
    } finally {
      setBusy(false);
    }
  }, [pending, busy, nextId, deps, projectId, mode, applyResult]);

  /**
   * Cancel a staged turn ("Show me first" / "Not yet"). For a Lite agency beat the
   * turn was NEVER run (it runs only on confirm), so nothing was charged or written
   * — no backend call, genuinely "nothing changed". For a Pro plan the turn ran but
   * its writes were only collected (not persisted), so we tell the backend to
   * discard them (`reject`). Either way: no Stars leak, no persisted VFS change.
   */
  const cancelPending = useCallback(async () => {
    const p = pending;
    if (!p) return;
    setPending(null);
    if (p.kind === 'plan') {
      try {
        await deps.approve({ projectId: projectId!, turnId: p.turnId, decision: 'reject' });
      } catch {
        // Unapproved writes were never persisted — drop the staging regardless.
      }
    }
    setChat((prev) => [
      ...prev,
      { id: nextId(), role: 'agent', text: 'No problem — nothing changed. Tell me what to do instead.' },
    ]);
  }, [pending, deps, projectId, nextId]);

  /**
   * FREE local undo (OD-3): revert the VFS to the snapshot before the last applied
   * turn. NOT an AI call — never debits Stars. One step back (the last change).
   */
  const undo = useCallback(() => {
    const target = undoTargetRef.current;
    if (!target) return;
    onApplyFiles(target);
    undoTargetRef.current = null;
    setCanUndo(false);
    setChat((prev) => [
      ...prev,
      { id: nextId(), role: 'agent', text: 'Undone — I put your game back the way it was. ↩️' },
    ]);
  }, [onApplyFiles, nextId]);

  /**
   * Stop / skip the typing animation (H1). The reply is a client-side replay and
   * the work is already paid for, so "Stop" means skip-to-end: flip the abort flag
   * so `streamTurn` exits its per-token loop, and `applyResult` then jumps straight
   * to the finished bubble (it does NOT discard the result or waste Stars).
   */
  const abort = useCallback(() => {
    streamAbort.current.aborted = true;
  }, []);

  /**
   * Retry the last prompt after an error (H2). Resends the exact prompt verbatim
   * (the kid never has to retype). The cap message is not retryable — the panel
   * gates the Try-again button on that.
   */
  const retryLast = useCallback(() => {
    if (busy || pending) return;
    if (!lastPromptRef.current) return;
    setError(null);
    void send(lastPromptRef.current);
  }, [busy, pending, send]);

  return {
    chat,
    busy,
    streaming,
    error,
    offline,
    pending,
    balance,
    canUndo,
    /** The standing safeguarding verdict (J13) — drives the rescue UI when set. */
    safeguard,
    /** Whether the "Ask my teacher" hand is up (calm waiting state, J4). */
    handRaised,
    send,
    confirmPending,
    cancelPending,
    undo,
    raiseHand,
    lowerHand,
    /** Stop / skip the typing animation (H1) — finalizes, never wastes Stars. */
    abort,
    /** Resend the last prompt after a (non-cap) error (H2). */
    retryLast,
  };
}
