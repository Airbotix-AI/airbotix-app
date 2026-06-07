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
/** In-chat call-to-action buttons (rendered on the message that carries them). */
export type ChatAction = 'run' | 'code';

export interface ChatItem {
  id: string;
  role: 'kid' | 'agent';
  text: string;
  pending?: boolean;
  toolsFired?: string[];
  changes?: { path: string; before: string; after: string }[];
  /** Optional CTA buttons (e.g. the launch "Run game" / "See code" hand-off). */
  actions?: ChatAction[];
}

export interface UseGameAgentOptions {
  /** Current VFS — passed to the turn so the agent edits the live files. */
  files: VfsFile[];
  /** Commit the turn's resulting VFS back to the page-level source of truth. */
  onApplyFiles: (files: VfsFile[]) => void;
  /** The swap seam. Defaults to the offline stub. */
  runTurn?: RunTurn;
  /**
   * Seed the chat on first mount with the launch hand-off: the kid's
   * landing-screen prompt + a generic "your starter is ready" message carrying
   * Run / See-code actions. Game-type-agnostic on purpose (we don't know what
   * the scaffold is). A non-empty prompt also shows the kid's bubble.
   */
  introPrompt?: string;
}

/** Shown on the pending agent bubble while the turn is in flight. */
const PENDING_TEXT = 'Thinking…';
/** Friendly fallback when the turn throws (stub never does, but the seam might). */
const ERROR_TEXT = 'Could not reach the AI. Try again.';

/** Generic, game-type-agnostic launch message — the scaffold is already runnable. */
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

/**
 * Chat controller for the playground AI panel. `send(text)` pushes the kid's
 * message plus a pending agent bubble, awaits `runTurn`, then either replaces
 * the pending bubble with the result and APPLIES the new VFS, or marks it as
 * failed. It does NOT run the game — the kid presses ▶ Play to see changes, so
 * chatting never auto-plays. Empty input and sends while busy are ignored.
 */
export function useGameAgent(opts: UseGameAgentOptions) {
  const { files, onApplyFiles, runTurn = runTurnStub, introPrompt } = opts;

  // Seed the launch hand-off once on mount (kid prompt + "starter ready" + CTAs)
  // when an introPrompt is provided; lazy initialiser so it runs exactly once.
  const [chat, setChat] = useState<ChatItem[]>(() =>
    introPrompt !== undefined ? buildIntro(introPrompt) : [],
  );
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
    [busy, files, nextId, onApplyFiles, runTurn],
  );

  return { chat, busy, error, send };
}
