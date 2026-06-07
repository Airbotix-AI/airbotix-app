// Chat controller for the playground AI panel (design §7 / PRD J2). It owns the
// chat state machine and the apply→run wiring around a turn, and works in TWO
// modes behind the SAME UI:
//
//   - REAL (a `projectId` is set — the authed studio): the turn runs SERVER-SIDE
//     via `runAgentTurn` (gameAgent → code/codeApi). Streams token + per-tool
//     deltas live; meters Stars; gates Pro multi-file behind plan→approve; lets a
//     Lite kid choose "Do it / Show me first" (OD-1 agency beat) and answer a
//     default-on prediction beat (OD-3) before spending a (metered) turn. The kid
//     NEVER calls an LLM (CLAUDE.md #5).
//   - STUB (no `projectId` — the DEV sandbox): the offline `runTurnStub`, so the
//     desktop stays demoable with no backend. The chat UI is identical.
//
// Undo is FREE (OD-3): a local revert of the last applied change — never an AI
// call. Offline mid-turn surfaces a calm banner (J2), not a frozen screen.

import { useCallback, useEffect, useRef, useState } from 'react';

import type { AgentTurnResult, VfsFile } from '../../code/codeApi';
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
}

/**
 * A turn the kid must confirm before it applies (PRD J2). `kind` distinguishes:
 *   - 'agency' — Lite "here's what I'll change… Do it / Show me first" (OD-1);
 *   - 'plan'   — Pro multi-file plan→approve gate (requires_approval).
 * Both carry the staged turn + its prediction question (the default-on predict
 * beat, OD-3) so the kid thinks before spending a metered turn.
 */
export interface PendingTurn {
  kind: 'agency' | 'plan';
  turnId: string;
  prompt: string;
  summary: string;
  changes: { path: string; before: string; after: string }[];
  /** The staged full result (real path) — applied on confirm. */
  result: AgentTurnResult | null;
  /** A typing-free "what will change?" question (PRD J2 prediction beat). */
  prediction: string;
}

export interface UseGameAgentOptions {
  /** Current VFS — passed to the turn so the agent edits the live files. */
  files: VfsFile[];
  /** Commit the turn's resulting VFS back to the page-level source of truth. */
  onApplyFiles: (files: VfsFile[]) => void;
  /** The real backend project. When absent, the offline stub runs (DEV sandbox). */
  projectId?: string;
  /** Age-derived tier: Lite (8–11) auto-applies w/ agency beat; Pro (12–17) approves. */
  mode?: 'lite' | 'pro';
  /** The family Stars balance, for the metered display (real path). */
  balance?: number;
  /** Called after a turn debits Stars so the wallet can refetch. */
  onStarsCharged?: (charged: number) => void;
  /** STUB seam (DEV sandbox only). Ignored when `projectId` is set. */
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
const ERROR_TEXT = 'Could not reach the AI. Try again.';
/** Calm, kid-framed offline copy (PRD J2 — never a frozen screen). */
const OFFLINE_TEXT = 'Internet hiccup — your work is safe. Try again in a moment.';

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

/** Kid-framed error copy for the known backend failure envelopes (mirror code). */
function friendlyError(e: unknown): string {
  if (isOffline()) return OFFLINE_TEXT;
  if (e instanceof ApiError) {
    if (e.code === 'WALLET_INSUFFICIENT' || e.code === 'DAILY_CAP_EXCEEDED' || e.status === 402)
      return 'Out of Stars! Ask a grown-up to top up.';
    if (e.code === 'FAMILY_PAUSED') return 'Your family paused AI. Ask a grown-up.';
    if (e.code === 'MODERATION_REJECTED')
      return "Let's keep it kind and safe — try asking for something else.";
    if (e.code === 'MODERATION_WARN')
      return 'That message looked a bit off. Try saying it a different way.';
  }
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
    runTurn = runTurnStub,
    deps = realGameAgentDeps,
    introPrompt,
  } = opts;

  const isReal = !!projectId;

  const [chat, setChat] = useState<ChatItem[]>(() =>
    introPrompt !== undefined ? buildIntro(introPrompt) : [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState<boolean>(isOffline());
  // A turn awaiting the kid's confirm (Lite agency beat OR Pro plan gate, J2).
  const [pending, setPending] = useState<PendingTurn | null>(null);
  // The VFS snapshot BEFORE the last applied turn — the free local undo target.
  const undoTargetRef = useRef<VfsFile[] | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  // Abort the in-flight stream replay on unmount / a new turn.
  const streamAbort = useRef<{ aborted: boolean }>({ aborted: false });

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

  useEffect(() => () => {
    streamAbort.current.aborted = true;
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
      await streamTurn(result, (d) => {
        setChat((prev) =>
          prev.map((it) => {
            if (it.id !== pendingId) return it;
            if (d.type === 'token') return { ...it, text: it.text + d.text };
            return { ...it, toolsFired: [...(it.toolsFired ?? []), d.tool] };
          }),
        );
      }, sig);
      if (sig.aborted) return;
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
      onApplyFiles(result.files);
      onStarsCharged?.(result.stars_charged);
    },
    [files, onApplyFiles, onStarsCharged],
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy || pending) return;

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

      // ── STUB path (DEV sandbox): the offline tweak, no Stars/approval. ──
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

      // ── REAL path: server-side loop, Stars-metered, streamed, gated. ──
      try {
        const result = await deps.runTurn({ projectId: projectId!, prompt: trimmed, mode });
        // Pro multi-file → plan→approve gate; Lite → agency beat ("Do it / Show
        // me first"). Both stage the turn behind a confirm with a prediction beat;
        // the VFS does NOT change until the kid confirms.
        if (result.requires_approval || mode === 'lite') {
          setChat((prev) => prev.filter((it) => it.id !== pendingId));
          setPending({
            kind: result.requires_approval ? 'plan' : 'agency',
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
    [busy, pending, isReal, nextId, runTurn, files, onApplyFiles, deps, projectId, mode, applyResult],
  );

  /**
   * Confirm a staged turn (Lite "Do it" OR Pro "✓ Approve"). For a Pro plan we
   * ask the backend to persist (`approveTurn`); a Lite agency beat already has the
   * staged result, so we apply it directly. Either way Stars debit once on apply.
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
          : p.result!;
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
  }, [pending, busy, nextId, deps, projectId, applyResult]);

  /**
   * Cancel a staged turn ("Show me first" / reject). No VFS change, no Stars. For
   * a Pro plan we tell the backend to discard the staged writes.
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

  return {
    chat,
    busy,
    error,
    offline,
    pending,
    balance,
    canUndo,
    send,
    confirmPending,
    cancelPending,
    undo,
  };
}
