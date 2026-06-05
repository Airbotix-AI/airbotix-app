// Chat controller for the playground AI panel (design §7). UI-SHELL iteration:
// the turn itself is a LOCAL STUB (see `gameAgentStub.ts`) — this hook owns the
// chat state machine and the apply→run wiring around it, and stays identical
// when the stub is later swapped for the real backend call.
//
// `runTurn` is the single swap seam: inject `runTurnStub` now (the default);
// later inject an adapter over `runAgentTurn` (code/codeApi) and nothing here
// changes. `ChatItem` mirrors `code/useCodeStudio` (minus the Stars field) so
// the chat UI is shared between code studio and playground.

import { useCallback, useRef, useState } from 'react';

import type { VfsFile } from '../../code/codeApi';
import { runTurnStub, type RunTurn } from './gameAgentStub';

/** One chat bubble. Mirrors `code/useCodeStudio` `ChatItem` (no Stars in the stub). */
export interface ChatItem {
  id: string;
  role: 'kid' | 'agent';
  text: string;
  pending?: boolean;
  toolsFired?: string[];
  changes?: { path: string; before: string; after: string }[];
}

export interface UseGameAgentOptions {
  /** Current VFS — passed to the turn so the agent edits the live files. */
  files: VfsFile[];
  /** Commit the turn's resulting VFS back to the page-level source of truth. */
  onApplyFiles: (files: VfsFile[]) => void;
  /** Re-run the game after files are applied (bumps the run key). */
  onRun: () => void;
  /** The swap seam. Defaults to the offline stub. */
  runTurn?: RunTurn;
}

/** Shown on the pending agent bubble while the turn is in flight. */
const PENDING_TEXT = 'Thinking…';
/** Friendly fallback when the turn throws (stub never does, but the seam might). */
const ERROR_TEXT = 'Could not reach the AI. Try again.';

/**
 * Chat controller for the playground AI panel. `send(text)` pushes the kid's
 * message plus a pending agent bubble, awaits `runTurn`, then either replaces
 * the pending bubble with the result (and applies + runs the new VFS) or marks
 * it as failed. Empty input and sends while busy are ignored.
 */
export function useGameAgent(opts: UseGameAgentOptions) {
  const { files, onApplyFiles, onRun, runTurn = runTurnStub } = opts;

  const [chat, setChat] = useState<ChatItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Monotonic id source — no external deps. `crypto.randomUUID` when present
  // (jsdom/older browsers may lack it), else a stable incrementing counter.
  const seq = useRef(0);
  const nextId = useCallback((): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `m${seq.current++}`;
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;

      const pendingId = nextId();
      setError(null);
      setBusy(true);
      setChat((prev) => [
        ...prev,
        { id: nextId(), role: 'kid', text: trimmed },
        { id: pendingId, role: 'agent', text: PENDING_TEXT, pending: true },
      ]);

      try {
        const result = await runTurn(trimmed, files);
        setChat((prev) =>
          prev.map((item) =>
            item.id === pendingId
              ? {
                  id: pendingId,
                  role: 'agent',
                  text: result.summary,
                  toolsFired: result.toolsFired,
                  changes: result.changes,
                }
              : item,
          ),
        );
        onApplyFiles(result.files);
        onRun();
      } catch {
        setError(ERROR_TEXT);
        setChat((prev) =>
          prev.map((item) =>
            item.id === pendingId
              ? { id: pendingId, role: 'agent', text: ERROR_TEXT }
              : item,
          ),
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, files, nextId, onApplyFiles, onRun, runTurn],
  );

  return { chat, busy, error, send };
}
