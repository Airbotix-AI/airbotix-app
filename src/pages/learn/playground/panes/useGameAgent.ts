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
import { flushSync } from 'react-dom';

import type {
  AgentTurnResult,
  ChatImageRef,
  FileNote,
  NextStep,
  SafeguardingVerdict,
  VfsFile,
} from '../../code/codeApi';
import {
  executeClientActions,
  type ClientActionHandlers,
} from '../executeClientActions';
import { api, ApiError } from '@/lib/api';
import {
  isOffline,
  predictionQuestion,
  realGameAgentDeps,
  streamTurn,
  type GameAgentDeps,
} from './gameAgent';
import { runTurnStub, type RunTurn } from './gameAgentStub';
import { detectEngineSwitch } from './engineSwitch';
import { isAssetFile } from './assetMeta';
import type { GameEngine } from '../buildGamePreview';
import type { SaveResult } from '../projectPersistence';
import { STARTER_GAME } from '../starterGame';
import { STARTER_GAME_3D } from '../threeStarter';
import { useGenerationStore, type StartGenArgs } from '../generationStore';
import { ASSET_GENERATION_ENABLED } from '../featureFlags';
import {
  startProgress,
  applyToolDelta,
  applyFixingStep,
  type TurnProgress,
} from './turnProgress';
import {
  AI_UNAVAILABLE_TEXT,
  FLUSH_FAILED_TEXT,
  mintTurnKey,
  settleBubble,
  TURN_TIMEOUT_TEXT,
  TURN_WATCHDOG_MS,
  useTurnHygiene,
  type QueuedItem,
  type RetryPayload,
} from './useTurnHygiene';
import {
  ERROR_TEXT,
  friendlyError,
  isAbortError,
  OFFLINE_TEXT,
  PENDING_TEXT,
  STOPPED_TEXT,
} from './chatCopy';
import { buildBlockedSeed, buildFirstTurn, buildIntro, type FirstTurnSeed } from './chatSeeds';

// Turn-hygiene state/copy (D-HARN-02/03/05 → `useTurnHygiene`), the kid-facing
// failure copy (→ `chatCopy`) and the opening-chat seeds (→ `chatSeeds`) are
// extracted siblings, but stay part of this hook's PUBLIC API — the panel, the
// workspace and the tests import them from here.
export {
  AI_UNAVAILABLE_TEXT,
  FLUSH_FAILED_TEXT,
  TURN_TIMEOUT_TEXT,
  TURN_WATCHDOG_MS,
} from './useTurnHygiene';
export type { RetryPayload } from './useTurnHygiene';
export {
  CAP_MESSAGE,
  IMAGE_CHECK_HICCUP_MESSAGE,
  IMAGE_DISABLED_MESSAGE,
  IMAGE_REJECT_MESSAGE,
  STOPPED_TEXT,
} from './chatCopy';
export type { FirstTurnSeed } from './chatSeeds';

/** In-chat call-to-action buttons (rendered on the message that carries them). */
export type ChatAction = 'run' | 'code';

/** One chat bubble. Mirrors `code/useCodeStudio` `ChatItem`. */
export interface ChatItem {
  id: string;
  role: 'kid' | 'agent';
  text: string;
  /**
   * Pictures the kid attached to THIS message (D-PAP-33), shown as thumbnails in
   * the kid bubble. `previewUrl` is the LOCAL object/data URL (never the S3 key) so
   * the bubble renders instantly without a round-trip and we never echo the upload
   * path. Kid-role bubbles only.
   */
  images?: { previewUrl: string }[];
  pending?: boolean;
  /** Streaming in progress — the text is being revealed token-by-token (J2). */
  streaming?: boolean;
  /** ⭐ charged for this turn (real path only; OD-3 "meter every turn"). */
  stars?: number;
  toolsFired?: string[];
  changes?: { path: string; before: string; after: string }[];
  /** Per-file "what changed" notes (§11.4) — one clickable row per file; tap → open + highlight. */
  fileNotes?: FileNote[];
  /** Optional CTA buttons (e.g. the launch "Run game" / "See code" hand-off). */
  actions?: ChatAction[];
  /** A safeguarding deflection bubble (J13) — rendered with the rescue styling. */
  safeguard?: boolean;
  /** Teacher "what next?" option chips (§11.4 / D-PAP-06) — tap to send `prompt`. */
  nextSteps?: NextStep[];
  /**
   * A retryable failed/timed-out turn (D-HARN-02/03/05): the bubble carries a
   * calm "Try again" chip that replays THIS bubble's own turn — the payload's
   * exact prompt with its SAME idempotency key (`retryTurn`), so the backend
   * replays the turn instead of charging a second one, and a stale chip can
   * never replay a LATER turn's prompt/key.
   */
  retry?: RetryPayload;
  /**
   * An AI asset-generation message (D-ASSET §3): the magic card while it runs,
   * then the finished asset with Add-to-game / Remix. `path` is the new VFS asset.
   */
  assetGen?: {
    status: 'generating' | 'done' | 'error';
    prompt: string;
    path?: string;
    /** For a remix: the reference asset's `data:` URL / URL, shown in the card. */
    refSrc?: string;
  };
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
  kind: 'agency' | 'plan' | 'engine-switch';
  /** For an 'engine-switch' confirm: the target engine to rebuild in (D-3D-08). */
  engine?: GameEngine;
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
  /**
   * Commit the turn's resulting VFS back to the page-level source of truth. When
   * the files come from an applied AI turn, `version` is the project's new server
   * VFS version (the turn bumped it server-side) so the page can keep its save
   * version in sync — without it, the next manual save 409s and the kid's edit is
   * reverted. Omit `version` for local-only applies (undo) that don't change the
   * server version. `changedPaths` (the turn's changed files) makes the apply a
   * per-path MERGE onto the current local VFS instead of a wholesale replace, so
   * a hand-edit committed while the turn was in flight survives.
   */
  onApplyFiles: (files: VfsFile[], version?: number, changedPaths?: string[]) => void;
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
   * "starter ready" message carrying Run / See-code actions). Only used for a
   * BRAND-NEW project when no real first turn was captured — an empty/blank value
   * never seeds the starter (so a resume doesn't show "your game starter is ready").
   */
  introPrompt?: string;
  /**
   * Restored chat history (J9 resume). When present + non-empty it takes precedence
   * over `firstTurn` / `introPrompt` — the workspace reopens with the real saved
   * conversation, not a fresh seed.
   */
  initialChat?: ChatItem[];
  /** Called (with the full chat) whenever the conversation changes, so the owner
   *  can persist it. Fired on the seed too, so a brand-new project's opening turn
   *  is saved even if the kid exits immediately. */
  onChatChange?: (chat: ChatItem[]) => void;
  /** The first-turn build was refused by the safety check (D-PAP-20). Seed the chat
   *  with a friendly explanation + gentler suggestion chips instead of an empty log. */
  blockedSeed?: boolean;
  /**
   * Teacher live viewer (D-LV-6) — read-only. EVERY turn entry point
   * (`send`, `requestAssetGen`, `confirmPending`, `cancelPending`, `raiseHand`,
   * `lowerHand`, `retryLast`, `autoFixFromErrors`) early-returns when set, so a
   * teacher can never run an AI turn (which would be kid-only anyway) or mutate
   * the VFS. (`cancelPending`/`lowerHand`/`retryLast` are already inert because
   * the state they act on is only ever created by a gated entry point — the
   * explicit guard just makes that uniform and obvious.)
   */
  readOnly?: boolean;
  /** The project's current game engine (2D phaser / 3D three) — drives switch
   *  detection (D-3D-08). Defaults to phaser. */
  engine?: GameEngine;
  /** Called when a confirmed 2D⇄3D switch flips the engine, so the runner re-renders
   *  with the new vendored global + control shim (D-3D-08). */
  onEngineChange?: (engine: GameEngine) => void;
  /**
   * Fired after a turn's result fully applies (files + version adopted, chat
   * settled). The workspace uses it to arm the post-apply verification loop for
   * a `verification: 'pending'` turn (D-PAP-40 / useVerification) and to record a
   * Time Machine save point. `meta.prompt` is the message that triggered this turn
   * (a typed ask or a tapped next-step chip), so the save point can be named after
   * what was asked when the backend's `history_label` is generic/absent.
   */
  onTurnApplied?: (result: AgentTurnResult, meta?: { prompt?: string }) => void;
  /**
   * Flush any pending (debounced) local VFS save to the backend BEFORE a turn
   * runs. A turn reads the SERVER-persisted VFS (the request body carries only the
   * prompt — see `codeApi.runAgentTurn`), so any edit still inside the ~600 ms
   * autosave window — a code change the kid just typed, a freshly imported asset —
   * is invisible to the agent unless we persist first. Awaiting the flush makes the
   * agent read exactly what the kid sees. Wired to the workspace's `onSaveNow`
   * (PlaygroundApp `flushSave`); absent off the real path (the stub never persists).
   */
  flushSave?: () => Promise<SaveResult>;
  /** Test seam: override the 180 s silent-turn watchdog window (D-HARN-03). */
  turnWatchdogMs?: number;
}

/** The ONE next message queued while a turn is busy (D-HARN-03) — never a drop. */
export type QueuedMessage = QueuedItem<SendOptions>;

/** Client actions that pull the code editor to the front — NOT auto-run on turn
 *  finish; the kid opens the editor by tapping a changed-file row instead. */
const EDITOR_FOCUS_ACTIONS = new Set(['open_file', 'highlight_code', 'jump_to_line', 'show_code', 'open_diff']);

const toChanges = (r: AgentTurnResult) =>
  r.changes.map((c) => ({ path: c.path, before: c.before, after: c.after }));

/**
 * One attached input image as passed to `send` (D-PAP-33): the composer has
 * ALREADY uploaded it, so this carries the S3 ref the turn body needs PLUS a local
 * `previewUrl` (object/data URL) the kid bubble renders — the S3 key never reaches
 * the bubble.
 */
export interface SendImage extends ChatImageRef {
  previewUrl: string;
}

/** Options for `send` — a guided (chip) flag and any attached input images. */
export interface SendOptions {
  guided?: boolean;
  images?: SendImage[];
}

/** Map send-images → the kid bubble's `images` (preview-only), or {} when none —
 *  spread into a ChatItem so a text-only message stays unchanged. */
function kidImages(images: SendImage[]): { images?: { previewUrl: string }[] } {
  return images.length > 0 ? { images: images.map((im) => ({ previewUrl: im.previewUrl })) } : {};
}

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
    initialChat,
    onChatChange,
    blockedSeed,
    readOnly = false,
    engine = 'phaser',
    onEngineChange,
    onTurnApplied,
    flushSave,
    turnWatchdogMs = TURN_WATCHDOG_MS,
  } = opts;

  const isReal = !!projectId;
  // Set while a confirmed engine switch re-runs send() to rebuild — makes that
  // rebuild skip switch detection so it doesn't re-trigger the confirm (D-3D-08).
  const switchBypassRef = useRef(false);

  const [chat, setChat] = useState<ChatItem[]>(() =>
    // Restored history (resume) wins; then a real first turn; then a safety-refused
    // build's explanation+suggestions; then the canned starter — but ONLY when
    // introPrompt is a non-empty prompt, so a resume (blank prompt) never re-injects
    // "your game starter is ready".
    initialChat && initialChat.length > 0
      ? initialChat
      : firstTurn
        ? buildFirstTurn(firstTurn)
        : blockedSeed
          ? buildBlockedSeed()
          : introPrompt && introPrompt.trim()
            ? buildIntro(introPrompt)
            : [],
  );
  const [busy, setBusy] = useState(false);
  // Whether the token-by-token reveal replay is currently running (drives the
  // Stop / skip-animation button, H1). Distinct from `busy` (which spans the
  // whole turn incl. the network round-trip).
  const [streaming, setStreaming] = useState(false);
  // The in-flight turn's honest progress (drives the WorkingCard). Non-null only
  // while a turn is working; cleared the instant the single message takes over.
  const [progress, setProgress] = useState<TurnProgress | null>(null);
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
  // Image-input dark-launch (D-PAP-37): flips true once the backend tells us the
  // feature flag is off (IMAGE_INPUT_DISABLED), so the composer hides the picture
  // affordance for the rest of the session instead of letting the kid try again.
  const [imagesDisabled, setImagesDisabled] = useState(false);
  // A monotonic counter the composer watches to know its attached image(s) were
  // REJECTED by moderation (D-PAP-34) and must clear — bumped on each image reject.
  const [imageRejectNonce, setImageRejectNonce] = useState(0);
  // A screen OUTAGE (MODERATION_UNAVAILABLE, D-PAP-46) withheld the pictures
  // UNJUDGED — the composer clears on submit, so re-stage the SAME already-
  // uploaded refs (nonce bump → AIChatPanel effect) for a one-tap retry.
  const [imageRestore, setImageRestore] = useState<{ nonce: number; images: SendImage[] }>({
    nonce: 0,
    images: [],
  });
  // A pending MODERATION_WARN ack — kid must confirm before the prompt is retried.
  const [warnPending, setWarnPending] = useState<{ message: string; prompt: string; stage: string } | null>(null);
  // The VFS snapshot BEFORE the last applied turn — the free local undo target.
  const undoTargetRef = useRef<VfsFile[] | null>(null);
  // Self-verify auto-fix attempts for the CURRENT broken game (MP3 / D-PAP-13).
  // Reset on every fresh user-initiated turn; bounded server-side (≤2) → co-debug.
  const autofixAttempt = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  // Abort the in-flight stream replay on unmount / a new turn.
  const streamAbort = useRef<{ aborted: boolean }>({ aborted: false });
  // Abort the in-flight AI TURN's network round-trip (classify + runTurn) when the
  // kid taps "Stop waiting" (D-PAP-48). Distinct from `streamAbort` (which only
  // skips the client-side typing replay AFTER the reply has arrived): this aborts
  // the fetch itself so the backend cleanly cancels the turn (no Stars).
  const turnAbortRef = useRef<AbortController | null>(null);
  // True only once the component has actually unmounted — lets us tell a
  // user-initiated "skip the animation" abort (still finalize) apart from an
  // unmount abort (bail, the component is gone).
  const unmountedRef = useRef(false);
  // The last prompt sent — so a failed turn can be retried verbatim (H2).
  const lastPromptRef = useRef<string>('');
  // Whether the last prompt came from tapping a next-step chip (a guided step), so a
  // retry preserves the guided flag and the teacher keeps offering the loop (D-PAP-26).
  const lastGuidedRef = useRef<boolean>(false);
  // Turn hygiene (D-HARN-02/03, `useTurnHygiene`): the per-logical-turn
  // idempotency keys, the ONE-message busy queue, and the silent-turn watchdog.
  // On timeout the watchdog aborts the in-flight fetch via the SAME clean-cancel
  // mechanism as "Stop waiting" (backend charges 0 Stars); the abort handlers
  // read `consumeTimedOut()` to settle calm timeout copy instead of STOPPED_TEXT.
  const {
    queuedMessage,
    queueMessage,
    takeQueued,
    cancelQueued,
    beginWatchdog,
    bumpWatchdog,
    clearWatchdog,
    consumeTimedOut,
    beginTurnKey,
    reuseKeyNext,
    lastTurnKey,
  } = useTurnHygiene<SendOptions>({
    watchdogMs: turnWatchdogMs,
    onTimeout: () => turnAbortRef.current?.abort(),
  });

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

  // Persist the conversation on every change (J9 resume). The owner debounces +
  // filters transient bubbles; here we just hand it the latest chat — including
  // the seed, so a brand-new project's opening turn is saved even on a fast exit.
  const onChatChangeRef = useRef(onChatChange);
  onChatChangeRef.current = onChatChange;
  useEffect(() => {
    onChatChangeRef.current?.(chat);
  }, [chat]);

  useEffect(() => {
    // Re-arm on (re)mount: StrictMode's dev mount→cleanup→remount cycle would
    // otherwise leave `unmountedRef` poisoned `true`, so the very first streamed
    // turn's finalize block (gated on `!unmountedRef.current`) would never run and
    // the reply would be stuck on the `agent-msg-streaming` bubble forever.
    unmountedRef.current = false;
    return () => {
      streamAbort.current.aborted = true;
      unmountedRef.current = true;
      // Cancel an in-flight turn's fetch if the workspace closes mid-turn (D-PAP-48)
      // — the disconnect is a clean server-side cancel (no Stars).
      turnAbortRef.current?.abort();
      clearWatchdog();
    };
  }, [clearWatchdog]);

  const seq = useRef(0);
  const nextId = useCallback((): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `m${seq.current++}`;
  }, []);

  /** Apply a completed turn: record the undo target, stream the reply, apply VFS.
   *  `keepOtherNextSteps` leaves earlier bubbles' chips intact — used by the
   *  self-verify auto-fix so a system repair turn never wipes the kid's still-unused
   *  next-step options (D-PAP-26 sticky; the chips belong to the kid, not the fix). */
  const applyResult = useCallback(
    async (
      result: AgentTurnResult,
      pendingId: string,
      opts?: { keepOtherNextSteps?: boolean; prompt?: string },
    ) => {
      undoTargetRef.current = files;
      setCanUndo(true);
      const sig = { aborted: false };
      streamAbort.current = sig;
      // The Stop/skip control (H1) is available for the whole replay.
      setStreaming(true);
      // The bubble stays the WorkingCard (pending) while the tool deltas fill in the
      // progress steps; the FIRST summary token flips it to the single streaming
      // message and drops the card — so there's one continuous turn, one message.
      let flipped = false;
      const flipToMessage = () => {
        if (flipped) return;
        flipped = true;
        setProgress(null);
        setChat((prev) =>
          prev.map((it) =>
            it.id === pendingId
              ? { id: pendingId, role: 'agent', text: '', streaming: true, stars: result.stars_charged }
              : it,
          ),
        );
      };
      await streamTurn(result, (d) => {
        // Any delta is a sign of life — re-arm the silent-turn watchdog (D-HARN-03)
        // so only a genuinely stalled turn ever times out.
        bumpWatchdog();
        if (d.type === 'tool') {
          setProgress((p) => (p ? applyToolDelta(p, d.tool, Date.now()) : p));
          return;
        }
        flipToMessage();
        setChat((prev) => prev.map((it) => (it.id === pendingId ? { ...it, text: it.text + d.text } : it)));
      }, sig);
      // An empty summary (or an abort before any token) never flipped — do it now so
      // the WorkingCard always resolves into the message.
      flipToMessage();
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
                  fileNotes: result.file_notes,
                  nextSteps: result.next_steps,
                }
              : // Only the latest server message shows next-step chips — clear any
                // carried by an earlier bubble so suggestions never linger on a
                // stale turn (D-PAP-26 last-message-only). EXCEPT a sticky apply
                // (auto-fix): a system repair turn must not erase the kid's
                // still-unused chips, so leave earlier bubbles untouched.
                opts?.keepOtherNextSteps
                ? it
                : it.nextSteps
                  ? { ...it, nextSteps: undefined }
                  : it,
          ),
        );
        setStreaming(false);
      }
      onApplyFiles(result.files, result.version, result.changes.map((c) => c.path));
      onStarsCharged?.(result.stars_charged);
      // Run the turn's workspace actions — but NOT the ones that yank the code
      // editor to the front. The kid opens the editor by tapping a changed-file
      // row (onOpenFile); a finished turn shouldn't steal focus to the code. We
      // still honour run/restart/look/help actions.
      const autoActions = (result.client_actions ?? []).filter(
        (a) =>
          !EDITOR_FOCUS_ACTIONS.has(a.action) && !(a.action === 'focus_panel' && a.target === 'code'),
      );
      if (clientActions) executeClientActions(autoActions, clientActions);
      // Auto-restart after any change so the kid immediately sees it run (the agent
      // doesn't have to remember to emit run_game). Skip if it already asked to
      // run/restart (avoid a double re-mount).
      const changed = (result.changes?.length ?? 0) > 0;
      const alreadyRan = (result.client_actions ?? []).some(
        (a) => a.action === 'run_game' || a.action === 'restart_game',
      );
      if (changed && !alreadyRan) clientActions?.restartGame();
      // The turn is fully applied (and the game re-running) — let the workspace
      // arm post-apply verification for a `verification: 'pending'` turn and record
      // a Time Machine save point (named after the ask when the label is generic).
      onTurnApplied?.(result, { prompt: opts?.prompt });
    },
    [files, onApplyFiles, onStarsCharged, clientActions, onTurnApplied, bumpWatchdog],
  );

  /**
   * Post a standalone agent bubble into the chat (no turn, no Stars). Used by
   * the post-apply verification loop for its ONE visible surface — the warm
   * co-debug hand-off message (D-PAP-40/44).
   */
  const pushAgentMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setChat((prev) => [...prev, { id: nextId(), role: 'agent', text: trimmed }]);
    },
    [nextId],
  );

  /**
   * Self-verify round-trip (MP3 / D-PAP-09,13,23). The studio ran a just-applied
   * game and the sandbox caught runtime errors; report them so the backend
   * auto-fixes (≤2 attempts) or hands off to "let's debug together". Idempotent
   * while busy; a no-op off the real path or with no errors.
   *
   * ⚠️ RETIRED for game verification (D-PAP-40): the workspace now drives the
   * server-adjudicated run-report loop (`useVerification` + POST …/run-report)
   * instead of wiring this to the runner's console errors. Kept compiling for
   * any remaining caller; do not wire it back up for games.
   */
  const autoFixFromErrors = useCallback(
    async (errors: string[]) => {
      if (readOnly) return; // teacher viewer — no auto-fix turn (D-LV-6)
      if (!isReal || busy || pending || streaming || errors.length === 0) return;
      autofixAttempt.current += 1;
      const attempt = autofixAttempt.current;
      const pendingId = nextId();
      setBusy(true);
      setError(null);
      // A self-repair is NOT a new kid message — show the calm "fixing a little
      // glitch" WorkingCard beat, never a second chat bubble.
      setProgress(applyFixingStep(startProgress(Date.now()), Date.now()));
      setChat((prev) => [...prev, { id: pendingId, role: 'agent', text: '', pending: true }]);
      try {
        const res = await deps.reportRuntimeErrors({ projectId: projectId!, errors, attempt, mode });
        if (res.co_debug) {
          // Can't fix on its own → ONE warm hand-off message (never a silent broken game).
          setProgress(null);
          setChat((prev) => settleBubble(prev, pendingId, res.message ?? "Let's fix this together! 🔧"));
        } else if (res.turn) {
          // Fixed itself → apply the repair SILENTLY and drop the card: no extra
          // message, so the kid's request still reads as one message + a game that
          // now works. (Chips on the earlier message are left untouched.)
          undoTargetRef.current = files;
          setCanUndo(true);
          setProgress(null);
          setChat((prev) => prev.filter((it) => it.id !== pendingId));
          onApplyFiles(res.turn.files, res.turn.version, res.turn.changes.map((c) => c.path));
          onStarsCharged?.(res.turn.stars_charged);
          clientActions?.restartGame();
        } else {
          setProgress(null);
          setChat((prev) => prev.filter((it) => it.id !== pendingId));
        }
      } catch (e) {
        // A failed background repair must not nag — the game already showed; drop
        // the card quietly (the kid can always ask again).
        if (friendlyError(e) === OFFLINE_TEXT) setOffline(true);
        setProgress(null);
        setChat((prev) => prev.filter((it) => it.id !== pendingId));
      } finally {
        setBusy(false);
      }
    },
    [readOnly, isReal, busy, pending, streaming, nextId, deps, projectId, mode, files, onApplyFiles, onStarsCharged, clientActions],
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

  // Run an asset generation AS A CHAT MESSAGE (D-ASSET §3). The global
  // generationStore is the engine (it generates + writes the asset into the VFS
  // and survives the pane); here we just reflect its state into the chat bubble:
  // magic card while generating → the finished asset (with Add-to-game / Remix) on
  // done. Caller owns the `busy` lock. Cancel is handled by the card → store.cancel().
  const runAssetTurn = useCallback(
    async (prompt: string, bubbleId: string, ref?: { refAssetPath?: string; refUrl?: string }) => {
      // Resolve the reference asset's image src so the card can show what's being
      // remixed (a VFS asset's data URL, or a Library asset's URL).
      const refSrc = ref?.refUrl ?? (ref?.refAssetPath ? files.find((f) => f.path === ref.refAssetPath)?.content : undefined);
      setChat((prev) =>
        prev.map((it) =>
          it.id === bubbleId
            ? { id: bubbleId, role: 'agent', text: '', assetGen: { status: 'generating', prompt, refSrc } }
            : it,
        ),
      );
      const store = useGenerationStore.getState();
      const args: StartGenArgs = { projectId, prompt };
      if (ref?.refAssetPath || ref?.refUrl) Object.assign(args, { mode: 'remix', ...ref });
      await store.start(args);
      const { status, resultPath } = useGenerationStore.getState();
      store.dismiss();
      setChat((prev) =>
        prev.flatMap((it) => {
          if (it.id !== bubbleId) return [it];
          if (status === 'done' && resultPath)
            return [{ id: bubbleId, role: 'agent' as const, text: '', assetGen: { status: 'done' as const, prompt, path: resultPath, refSrc } }];
          if (status === 'idle') return []; // cancelled → drop the bubble
          return [{ id: bubbleId, role: 'agent' as const, text: '', assetGen: { status: 'error' as const, prompt, refSrc } }];
        }),
      );
    },
    [projectId, files],
  );

  /**
   * Persist any debounced local VFS change to the backend BEFORE running a turn,
   * so the agent reads the SAME files the kid sees (a turn body carries only the
   * prompt; the backend reads the server-persisted VFS). Without it, an edit still
   * inside the ~600 ms autosave window is invisible to the agent.
   *
   * MUST-SUCCEED for a FRESH paid turn (D-HARN-05): returns false when the save
   * fails, and the caller then does NOT start the PAID turn — a turn run against
   * a stale VFS edits files that don't match what the kid sees. The free,
   * non-metered classify may run BEFORE the flush: the gate sits immediately
   * before the paid POST, so a turn stopped mid-classify never writes the VFS
   * (a clean cancel must not bump vfs_version). The gate applies to every path
   * that POSTs a NEW turn: `send()`, the agency confirm in `confirmPending`, and
   * the acknowledged-warn retry in `confirmWarn` — each settles the pending
   * bubble into FLUSH_FAILED_TEXT with a retry chip. The ONE exception is
   * plan-APPROVE (`confirmPending`, kind 'plan'), which stays best-effort: the
   * staged turn already ran against the VFS flushed when it was sent, so blocking
   * its approve on a fresh save would strand paid work. Returns true when there
   * is nothing to flush (no `flushSave` — the stub path never persists).
   */
  const flushBeforeTurn = useCallback(async (): Promise<boolean> => {
    if (!flushSave) return true;
    try {
      await flushSave();
      return true;
    } catch {
      return false;
    }
  }, [flushSave]);

  /**
   * Settle a pending bubble after an ABORTED fetch: the kid's Stop (calm
   * STOPPED_TEXT, D-PAP-48) or the silent-turn watchdog (calm timeout copy +
   * `retry` chip when the turn can be replayed from the bubble, D-HARN-03) —
   * never an error either way.
   */
  const settleAbortedBubble = useCallback(
    (pendingId: string, retry?: RetryPayload) => {
      clearWatchdog();
      const timedOut = consumeTimedOut();
      setChat((prev) =>
        timedOut
          ? settleBubble(prev, pendingId, TURN_TIMEOUT_TEXT, retry)
          : settleBubble(prev, pendingId, STOPPED_TEXT),
      );
    },
    [clearWatchdog, consumeTimedOut],
  );

  const send = useCallback(
    async (text: string, opts?: SendOptions) => {
      if (readOnly) return; // teacher viewer — no AI turns (D-LV-6)
      const trimmed = text.trim();
      // Attached pictures (D-PAP-33), already uploaded by the composer — each
      // carries its S3 ref (for the turn body) + a LOCAL preview URL (for the kid
      // bubble; we never echo the S3 key). Empty list when it's a plain text turn.
      const images = opts?.images ?? [];
      const hasImages = images.length > 0;
      // A turn needs TEXT or PICTURES — relax the empty-text guard for an image-only
      // ask (D-PAP-33).
      if (!trimmed && !hasImages) return;
      // ── Busy queue (D-HARN-03): a message sent while a turn is in flight is
      // NEVER silently dropped — exactly ONE queues ("I'll do this next", the
      // composer pill) and auto-sends when the turn settles; further sends are
      // ignored while the slot is taken (the composer keeps the kid's draft). ──
      if (busy || streaming) {
        queueMessage(trimmed, opts);
        return;
      }
      if (pending) return; // a confirm card is up — the composer is disabled
      const guided = !!opts?.guided;
      lastPromptRef.current = trimmed;
      lastGuidedRef.current = guided;
      // ONE idempotency key per LOGICAL turn (D-HARN-02), minted at send time (a
      // retry pre-loads the previous key so the backend replays the SAME turn).
      // The payload rides on any retryable bubble this turn settles into.
      const turnKey = beginTurnKey();
      const retryPayload: RetryPayload = { prompt: trimmed, turnKey, guided };
      // A fresh, kid-initiated turn restarts the auto-fix budget for whatever it builds.
      autofixAttempt.current = 0;

      // Offline pre-check (real path) — never even attempt the call; keep work
      // safe AND visible: the message lands in the chat with a retry chip (this
      // path also serves the queue's auto-send, whose text would otherwise vanish
      // with no bubble — D-HARN-03 "no silent drops").
      if (isReal && isOffline()) {
        setOffline(true);
        setError(OFFLINE_TEXT);
        setChat((prev) => [
          ...prev,
          { id: nextId(), role: 'kid', text: trimmed, ...kidImages(images) },
          { id: nextId(), role: 'agent', text: OFFLINE_TEXT, retry: retryPayload },
        ]);
        return;
      }

      // ── Engine SWITCH intent (D-3D-08): "make it 3D" / "turn it back to 2D"
      //    rebuilds the WHOLE game in a different engine, so we CONFIRM first and
      //    never auto-apply it (the one exception to the playground's auto-apply
      //    model). The post-confirm rebuild re-enters send() with switchBypassRef
      //    set, so it skips this check and runs as a normal turn in the new engine. ──
      if (isReal && !switchBypassRef.current) {
        const target = detectEngineSwitch(trimmed, engine);
        if (target) {
          setChat((prev) => [...prev, { id: nextId(), role: 'kid', text: trimmed, ...kidImages(images) }]);
          setPending({
            kind: 'engine-switch',
            engine: target,
            turnId: '',
            prompt: trimmed,
            summary:
              target === 'three'
                ? "Making this 3D means I'll rebuild your whole game from scratch with a 3D engine (three.js) — your current 2D game will be replaced. Want me to go ahead?"
                : "Making this 2D means I'll rebuild your whole game from scratch with the 2D engine — your current 3D game will be replaced. Want me to go ahead?",
            changes: [],
            result: null,
            prediction: '',
          });
          return;
        }
      }

      const pendingId = nextId();
      setError(null);
      setBusy(true);
      // Seed the honest progress card immediately — the timer starts ticking and the
      // "Looking at your game" step shows while the request is in flight.
      setProgress(startProgress(Date.now()));
      setChat((prev) => [
        ...prev,
        { id: nextId(), role: 'kid', text: trimmed, ...kidImages(images) },
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
          setChat((prev) => settleBubble(prev, pendingId, ERROR_TEXT));
        } finally {
          setProgress(null);
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
      // Skip the TEXT classify entirely for an image-only ask (no words to screen,
      // D-PAP-33): it routes as a normal code turn, and the image's OWN mandatory
      // pre-model moderation runs server-side inside the turn (fail-closed).
      // One controller aborts BOTH the classify and the runTurn fetch when the kid
      // taps "Stop waiting" (D-PAP-48). `finalizeStopped` re-enables the composer and
      // turns the pending bubble into the calm STOPPED_TEXT — never an error, because
      // the disconnect is a clean server-side cancel (no Stars, game unchanged).
      const ac = new AbortController();
      turnAbortRef.current = ac;
      const settleAborted = () => settleAbortedBubble(pendingId, retryPayload);
      const finalizeStopped = () => {
        setProgress(null);
        setBusy(false);
        settleAborted();
      };

      // Arm the silent-turn watchdog for the whole real turn (D-HARN-03). Cleared
      // on every exit below; re-armed by each stream delta in applyResult.
      beginWatchdog();

      let routedIntent: 'asset' | 'code' = 'code';
      if (trimmed) {
        try {
          const { safeguarding, intent } = await deps.classify({ projectId: projectId!, prompt: trimmed, signal: ac.signal });
          if (safeguarding) {
            clearWatchdog();
            setProgress(null);
            applySafeguard(safeguarding, pendingId);
            setBusy(false);
            return;
          }
          // The kid may have hit Stop AFTER classify resolved but BEFORE the turn
          // POSTs — finalize now so we never fire a turn the kid cancelled.
          if (ac.signal.aborted) {
            finalizeStopped();
            return;
          }
          routedIntent = intent;
        } catch (e) {
          // The kid stopped mid-classify → calm cancel, no fall-through to a turn.
          if (isAbortError(e)) {
            finalizeStopped();
            return;
          }
          // Classifier unreachable — proceed as a code turn; the turn-level firewall
          // still applies. (Asset routing simply falls back to a normal game turn.)
        }
      }

      // ── ASSET intent (D-ASSET §3): generate a media asset as a chat message,
      // not a code turn. Shares this turn's `busy` lock (one AI thing at a time).
      // The turn watchdog stands down — the generation card owns its own cancel.
      // Gated by the feature flag: while asset generation is disabled, an "asset"
      // classification falls through to a normal game-code turn (no generation). ──
      if (ASSET_GENERATION_ENABLED && routedIntent === 'asset') {
        clearWatchdog();
        setProgress(null);
        await runAssetTurn(trimmed, pendingId);
        setBusy(false);
        return;
      }

      // ── The game agent always auto-applies (playground teacher model, D-PAP-03):
      // the kid's request IS the go-ahead, so there is NO "Do it / Show me first"
      // agency beat and NO plan→approve gate (those belong to the Code Studio). Run
      // the turn server-side (Stars-metered + applied inside POST /code/turn) and
      // stream the result straight into the chat.
      try {
        // ── Pre-turn flush MUST succeed (D-HARN-05): persist edits still in the
        // autosave window so the agent reads exactly what the kid sees. Placed
        // AFTER the (free) classify + asset fork, immediately before the PAID
        // POST — so a turn stopped mid-classify never writes the VFS (a clean
        // cancel must not bump vfs_version). On failure the paid turn does NOT
        // start; the bubble settles into retryable "save first" copy and retry
        // re-flushes with the same idempotency key. ──
        const flushed = await flushBeforeTurn();
        if (ac.signal.aborted) {
          // Stopped (or the watchdog fired) while the save was in flight — the
          // `finally` re-enables the composer; never run the cancelled turn.
          settleAborted();
          return;
        }
        if (!flushed) {
          setChat((prev) => settleBubble(prev, pendingId, FLUSH_FAILED_TEXT, retryPayload));
          return;
        }
        const result = await deps.runTurn({
          projectId: projectId!,
          prompt: trimmed,
          mode,
          idempotencyKey: turnKey,
          piiWarnAcknowledged: false,
          guided,
          signal: ac.signal,
          // Only the S3 refs go to the backend — never the local preview URLs.
          ...(hasImages ? { images: images.map((im) => ({ s3_key: im.s3_key, mime: im.mime })) } : {}),
        });
        await applyResult(result, pendingId, { prompt: trimmed });
      } catch (e) {
        // The fetch aborted: the kid tapped "Stop waiting" (D-PAP-48) or the
        // silent-turn watchdog fired (D-HARN-03) — either way the backend cleanly
        // cancels the turn (no Stars). Settle the pending bubble calmly (STOPPED
        // or timeout-with-retry copy) — NOT an error — and let the `finally`
        // re-enable the composer. Must precede every error branch (an abort isn't
        // an ApiError).
        if (isAbortError(e)) {
          settleAborted();
          return;
        }
        if (e instanceof ApiError && e.code === 'MODERATION_WARN') {
          const details = e.details as { kind?: string } | undefined;
          const stage = details?.kind === 'pii_warn' ? 'pii_detector' : 'topic_classifier';
          setWarnPending({ message: e.message, prompt: trimmed, stage });
          setChat((prev) => prev.filter((it) => it.id !== pendingId));
        } else {
          // Image-specific failures (D-PAP-34/37): a rejected picture OR the flag
          // being off charges NO Stars (the throw is BEFORE propose server-side), so
          // we just surface the friendly copy. Clear the rejected/attempted picture
          // from the composer, and on a flag-off latch the affordance hidden.
          if (e instanceof ApiError && e.code === 'IMAGE_INPUT_DISABLED') setImagesDisabled(true);
          if (
            hasImages &&
            e instanceof ApiError &&
            (e.code === 'IMAGE_INPUT_DISABLED' ||
              (e.code === 'MODERATION_REJECTED' &&
                (e.details as { modality?: string } | undefined)?.modality === 'image'))
          ) {
            setImageRejectNonce((n) => n + 1);
          }
          // A screen OUTAGE (D-PAP-46): the pictures were never judged — re-stage
          // the SAME uploaded refs so the kid retries with one tap (vs. the reject
          // paths above, which clear so a blocked picture can't be re-sent).
          if (
            hasImages &&
            e instanceof ApiError &&
            e.code === 'MODERATION_UNAVAILABLE' &&
            (e.details as { modality?: string } | undefined)?.modality === 'image'
          ) {
            setImageRestore((prev) => ({ nonce: prev.nonce + 1, images }));
          }
          const msg = friendlyError(e);
          if (msg === OFFLINE_TEXT) setOffline(true);
          setError(msg);
          // The D-HARN-02 taxonomy is retryable in place: the failed bubble carries
          // a "Try again" chip that replays the turn with the SAME idempotency key.
          setChat((prev) =>
            settleBubble(prev, pendingId, msg, msg === AI_UNAVAILABLE_TEXT ? retryPayload : undefined),
          );
        }
      } finally {
        clearWatchdog();
        setProgress(null);
        setBusy(false);
      }
    },
    [readOnly, busy, streaming, pending, isReal, nextId, runTurn, files, onApplyFiles, deps, projectId, mode, applyResult, applySafeguard, runAssetTurn, engine, flushBeforeTurn, queueMessage, beginTurnKey, beginWatchdog, clearWatchdog, settleAbortedBubble],
  );

  // Auto-send the queued message once the turn settles (D-HARN-03). Driven by
  // STATE (not the turn's finally block) so the send it fires sees the settled
  // `busy` — a finally-time recursive call would still read the stale closure
  // and re-queue itself forever. `sendRef` always points at the latest send.
  const sendRef = useRef(send);
  sendRef.current = send;
  useEffect(() => {
    if (busy || streaming || pending || !queuedMessage) return;
    const q = takeQueued();
    if (q) void sendRef.current(q.text, q.opts);
  }, [busy, streaming, pending, queuedMessage, takeQueued]);

  // Public entry for the Asset Viewer's Generate / Remix buttons (D-ASSET §3,
  // "both entry points → one place out"): post the request into THIS chat so it
  // shares the one-AI-at-a-time lock and shows in the conversation like a typed ask.
  const requestAssetGen = useCallback(
    (prompt: string, ref?: { refAssetPath?: string; refUrl?: string }) => {
      if (readOnly) return; // teacher viewer — no asset generation (D-LV-6)
      const trimmed = prompt.trim();
      if (!trimmed || busy || pending) return;
      if (isReal && isOffline()) {
        setOffline(true);
        setError(OFFLINE_TEXT);
        return;
      }
      const bubbleId = nextId();
      setError(null);
      setBusy(true);
      setChat((prev) => [
        ...prev,
        { id: nextId(), role: 'kid', text: ref ? `Remix it: ${trimmed}` : trimmed },
        { id: bubbleId, role: 'agent', text: '', assetGen: { status: 'generating', prompt: trimmed } },
      ]);
      void runAssetTurn(trimmed, bubbleId, ref).finally(() => setBusy(false));
    },
    [readOnly, busy, pending, isReal, nextId, runAssetTurn],
  );

  /**
   * "Ask my teacher" raise-hand (J4). Flips into a calm waiting state and posts a
   * lightweight signal to the teacher (real path). It is a deliberately tiny,
   * always-safe action: no LLM, no Stars, no VFS change. Idempotent — a second tap
   * while already raised is a no-op (the kid just sees the calm waiting copy).
   */
  const raiseHand = useCallback(() => {
    if (readOnly) return; // teacher viewer — no raise-hand signal (D-LV-6)
    if (handRaised) return;
    setHandRaised(true);
    // Best-effort notify; the calm waiting state never depends on it succeeding.
    if (isReal && projectId) {
      void deps.raiseHand?.({ projectId }).catch(() => {});
    }
  }, [readOnly, handRaised, isReal, projectId, deps]);

  /** Put the "Ask my teacher" hand back down (cancel the raise). Local toggle —
   *  the backend raise/lower wiring lands with the teacher-WS work (I‑6/I‑7). */
  const lowerHand = useCallback(() => {
    if (readOnly) return; // teacher viewer — no hand to lower (D-LV-6)
    setHandRaised(false);
  }, [readOnly]);

  /**
   * Confirm a staged turn (Lite "Do it" OR Pro "✓ Approve"). For a Pro plan we ask
   * the backend to persist the already-run turn (`approveTurn`). For a Lite agency
   * beat the turn has NOT run yet — confirm is what SPENDS it: we POST /code/turn
   * now (which auto-applies + debits Stars server-side, D-CODE1c) and apply the
   * result. Either way Stars debit once, only after the kid commits.
   */
  const confirmPending = useCallback(async () => {
    if (readOnly) return; // teacher viewer — cannot confirm a kid's turn (D-LV-6)
    const p = pending;
    if (!p || busy) return;

    // Engine switch (D-3D-08): (1) flip the engine AND replace the VFS with the
    // target engine's CLEAN starter — so the old 2D files never run under the new 3D
    // global ("Phaser is not defined") and the agent rebuilds from a clean scaffold,
    // not by editing leftover 2D scenes; (2) re-run the agent to rebuild the game's
    // idea in the new engine.
    //
    // But CODE is all we drop: the kid's uploaded ASSETS (images/audio/video and —
    // the whole point of converting to 3D — imported `.glb` models) are engine-
    // agnostic media, not old-engine code, so we carry them across the rebuild.
    // Without this a just-imported GLB would vanish the moment the kid made the game
    // 3D to use it (D-3D-09). Starter files (`main.js`) never collide with `assets/`,
    // but we drop any starter-path clash defensively so the clean scaffold wins.
    if (p.kind === 'engine-switch' && p.engine && projectId) {
      const target = p.engine;
      const clean = target === 'three' ? STARTER_GAME_3D : STARTER_GAME;
      const starterPaths = new Set(clean.map((f) => f.path));
      const preservedAssets = files.filter((f) => isAssetFile(f) && !starterPaths.has(f.path));
      const starter = [...clean, ...preservedAssets];
      setPending(null);
      setBusy(true);
      setError(null);
      const pendingId = nextId();
      // Let "Stop waiting" (D-PAP-48) abort this rebuild's turn too, and guard the
      // reset + rebuild round-trips with the silent-turn watchdog (D-HARN-03).
      const ac = new AbortController();
      turnAbortRef.current = ac;
      beginWatchdog();
      // The rebuild is its own logical turn (D-HARN-02): a retryable settle replays
      // the PORT prompt (safe — the engine has flipped, so re-sending it through
      // send() no longer reads as a switch) with this same key.
      const rebuildKey = mintTurnKey();
      let rebuildRetry: RetryPayload | undefined;
      setChat((prev) => [...prev, { id: pendingId, role: 'agent', text: PENDING_TEXT, pending: true }]);
      try {
        const { version } = await deps.resetEngine({ projectId, engine: target, files: starter });
        // Flip the runner engine (React state) AND the VFS (Zustand store) in ONE
        // commit, so the runner never renders the old 2D files under the new 3D
        // global ("Phaser is not defined") — the two stores would otherwise update
        // in separate ticks and flash a mismatched pair.
        flushSync(() => {
          onEngineChange?.(target);
          onApplyFiles(starter, version);
        });
        // The kid stopped (or the watchdog fired) during the reset — the clean
        // starter is in place on both ends; settle calmly without the rebuild.
        if (ac.signal.aborted) {
          settleAbortedBubble(pendingId);
          return;
        }
        // Rebuild the game's idea in the new engine, on the clean starter. Use the
        // original game idea (the landing prompt) so the port keeps what the kid made.
        switchBypassRef.current = true;
        const idea = (introPrompt && introPrompt.trim()) || p.prompt;
        // Tell the agent about the assets we carried over so the rebuild can wire
        // them in — especially the GLB models a kid converts to 3D specifically to
        // use (D-3D-09). Listing the paths turns "my model vanished" into "my model
        // is in the new game".
        const preservedPaths = preservedAssets.map((f) => f.path);
        const assetsNote =
          preservedPaths.length > 0
            ? ` Your uploaded assets are still here — use them where they fit: ${preservedPaths.join(', ')}.`
            : '';
        const portPrompt =
          target === 'three'
            ? `Rebuild this as a 3D game with three.js, starting from the current 3D starter files. Keep the same idea and gameplay: "${idea}". Replace the starter with the real game.${assetsNote}`
            : `Rebuild this as a 2D game with Phaser, starting from the current 2D starter files. Keep the same idea and gameplay: "${idea}". Replace the starter with the real game.${assetsNote}`;
        rebuildRetry = { prompt: portPrompt, turnKey: rebuildKey, guided: false };
        const result = await deps.runTurn({ projectId, prompt: portPrompt, mode, idempotencyKey: rebuildKey, signal: ac.signal });
        await applyResult(result, pendingId);
      } catch (e) {
        // Kid stopped the rebuild (D-PAP-48) or the watchdog fired (D-HARN-03)
        // → calm cancel / timeout-with-retry, not an error.
        if (isAbortError(e)) {
          settleAbortedBubble(pendingId, rebuildRetry);
          return;
        }
        const msg = friendlyError(e);
        if (msg === OFFLINE_TEXT) setOffline(true);
        setError(msg);
        setChat((prev) =>
          settleBubble(prev, pendingId, msg, msg === AI_UNAVAILABLE_TEXT ? rebuildRetry : undefined),
        );
      } finally {
        clearWatchdog();
        switchBypassRef.current = false;
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    setError(null);
    const pendingId = nextId();
    // Let "Stop waiting" (D-PAP-48) abort this confirm's fetch; the silent-turn
    // watchdog (D-HARN-03) guards the whole round-trip.
    const ac = new AbortController();
    turnAbortRef.current = ac;
    beginWatchdog();
    setChat((prev) => [...prev, { id: pendingId, role: 'agent', text: PENDING_TEXT, pending: true }]);
    try {
      // A fresh (agency) confirm SPENDS a NEW paid turn against the live VFS, so
      // the flush gate applies exactly like send() (D-HARN-05). Plan-APPROVE stays
      // best-effort: the staged turn already ran against the VFS flushed when it
      // was sent — blocking its approve on a fresh save would strand paid work.
      const flushed = await flushBeforeTurn();
      if (ac.signal.aborted) {
        settleAbortedBubble(pendingId);
        return;
      }
      if (p.kind !== 'plan' && !flushed) {
        setPending(null);
        setChat((prev) =>
          settleBubble(prev, pendingId, FLUSH_FAILED_TEXT, {
            prompt: p.prompt,
            turnKey: mintTurnKey(),
            guided: false,
          }),
        );
        return;
      }
      const result =
        p.kind === 'plan'
          ? await deps.approve({ projectId: projectId!, turnId: p.turnId, decision: 'approve', signal: ac.signal })
          : await deps.runTurn({ projectId: projectId!, prompt: p.prompt, mode, idempotencyKey: mintTurnKey(), signal: ac.signal });
      setPending(null);
      await applyResult(result, pendingId, { prompt: p.prompt });
    } catch (e) {
      // Kid stopped waiting (D-PAP-48) or the watchdog fired (D-HARN-03) → calm
      // settle. No retry chip: the confirm card is still up — re-tapping IS the retry.
      if (isAbortError(e)) {
        settleAbortedBubble(pendingId);
        return;
      }
      const msg = friendlyError(e);
      if (msg === OFFLINE_TEXT) setOffline(true);
      setError(msg);
      setChat((prev) => settleBubble(prev, pendingId, msg));
    } finally {
      clearWatchdog();
      setBusy(false);
    }
  }, [readOnly, pending, busy, nextId, deps, projectId, mode, applyResult, onEngineChange, onApplyFiles, introPrompt, files, flushBeforeTurn, beginWatchdog, clearWatchdog, settleAbortedBubble]);

  /**
   * Cancel a staged turn ("Show me first" / "Not yet"). For a Lite agency beat the
   * turn was NEVER run (it runs only on confirm), so nothing was charged or written
   * — no backend call, genuinely "nothing changed". For a Pro plan the turn ran but
   * its writes were only collected (not persisted), so we tell the backend to
   * discard them (`reject`). Either way: no Stars leak, no persisted VFS change.
   */
  const cancelPending = useCallback(async () => {
    if (readOnly) return; // teacher viewer — no pending turn to cancel (D-LV-6)
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
  }, [readOnly, pending, deps, projectId, nextId]);

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
   * Stop waiting for the in-flight AI turn (D-PAP-48). Aborts the classify/runTurn
   * fetch; the backend treats the disconnect as a clean cancel (no Stars). The
   * pending bubble becomes STOPPED_TEXT and the composer re-enables. Distinct from
   * `abort`, which only skips the typing animation once the reply has arrived.
   */
  const cancelTurn = useCallback(() => {
    turnAbortRef.current?.abort();
  }, []);

  /**
   * Retry the last prompt after an error / timeout (H2, D-HARN-02). Resends the
   * exact prompt verbatim (the kid never has to retype) REUSING the previous
   * turn's idempotency key, so the backend replays/dedupes the turn instead of
   * running (and charging) a second one. The cap message is not retryable — the
   * panel gates the Try-again button on that.
   */
  const retryLast = useCallback(() => {
    if (readOnly) return; // teacher viewer — no prompt to retry (D-LV-6)
    if (busy || pending) return;
    if (!lastPromptRef.current) return;
    setError(null);
    reuseKeyNext(lastTurnKey());
    void send(lastPromptRef.current, { guided: lastGuidedRef.current });
  }, [readOnly, busy, pending, reuseKeyNext, lastTurnKey, send]);

  /**
   * Replay a SPECIFIC retryable turn from its bubble's "Try again" chip
   * (D-HARN-02): the payload rides on the ChatItem, so the chip re-sends ITS OWN
   * prompt with ITS OWN idempotency key — a stale chip (an earlier failed turn)
   * can never replay a later turn's prompt or reuse an already-applied key.
   */
  const retryTurn = useCallback(
    (payload: RetryPayload) => {
      if (readOnly) return; // teacher viewer — no turns (D-LV-6)
      if (busy || pending) return;
      if (!payload.prompt) return;
      setError(null);
      reuseKeyNext(payload.turnKey);
      void send(payload.prompt, { guided: payload.guided });
    },
    [readOnly, busy, pending, reuseKeyNext, send],
  );

  const confirmWarn = useCallback(async () => {
    if (!warnPending || busy) return;
    const { prompt } = warnPending;
    setWarnPending(null);
    if (!projectId) return;
    const pendingId = nextId();
    setError(null);
    setBusy(true);
    // Let "Stop waiting" (D-PAP-48) abort the acknowledged-warn turn's fetch; the
    // silent-turn watchdog (D-HARN-03) guards the whole round-trip.
    const ac = new AbortController();
    turnAbortRef.current = ac;
    beginWatchdog();
    // The acknowledged retry is its own logical turn (D-HARN-02) with a FRESH key
    // (the acknowledged request differs from the warned one); its retryable
    // settles replay through the normal send flow (which re-runs the warn beat).
    const warnKey = mintTurnKey();
    const warnRetry: RetryPayload = { prompt, turnKey: warnKey, guided: false };
    setChat((prev) => [
      ...prev,
      { id: nextId(), role: 'kid', text: prompt },
      { id: pendingId, role: 'agent', text: PENDING_TEXT, pending: true },
    ]);
    try {
      // The acknowledged warn POSTs a FRESH paid turn — the D-HARN-05 flush gate
      // applies exactly like send(): a failed save stops the turn.
      const flushed = await flushBeforeTurn();
      if (ac.signal.aborted) {
        settleAbortedBubble(pendingId, warnRetry);
        return;
      }
      if (!flushed) {
        setChat((prev) => settleBubble(prev, pendingId, FLUSH_FAILED_TEXT, warnRetry));
        return;
      }
      const result = await deps.runTurn({
        projectId,
        prompt,
        mode,
        idempotencyKey: warnKey,
        piiWarnAcknowledged: true,
        signal: ac.signal,
      });
      if (result.requires_approval) {
        setChat((prev) => prev.filter((it) => it.id !== pendingId));
        setPending({
          kind: 'plan',
          turnId: result.turn_id,
          prompt,
          summary: result.plan?.plan_text ?? result.summary,
          changes: toChanges(result),
          result,
          prediction: predictionQuestion(prompt),
        });
        return;
      }
      await applyResult(result, pendingId, { prompt });
    } catch (e) {
      // Kid stopped waiting (D-PAP-48) or the watchdog fired (D-HARN-03) → calm
      // cancel / timeout-with-retry, not an error.
      if (isAbortError(e)) {
        settleAbortedBubble(pendingId, warnRetry);
        return;
      }
      const msg = friendlyError(e);
      if (msg === OFFLINE_TEXT) setOffline(true);
      setError(msg);
      setChat((prev) =>
        settleBubble(prev, pendingId, msg, msg === AI_UNAVAILABLE_TEXT ? warnRetry : undefined),
      );
    } finally {
      clearWatchdog();
      setBusy(false);
    }
  }, [warnPending, busy, projectId, nextId, deps, mode, applyResult, flushBeforeTurn, beginWatchdog, clearWatchdog, settleAbortedBubble]);

  const dismissWarn = useCallback(() => {
    if (warnPending) {
      void api<void>('/safety/prompt-aborted', {
        method: 'POST',
        body: { surface: 'workspace', stage: warnPending.stage },
        principal: 'kid',
      }).catch(() => undefined);
    }
    setWarnPending(null);
  }, [warnPending]);

  return {
    chat,
    busy,
    streaming,
    /** The in-flight turn's honest progress steps (drives the WorkingCard). */
    progress,
    error,
    offline,
    pending,
    balance,
    canUndo,
    /** The standing safeguarding verdict (J13) — drives the rescue UI when set. */
    safeguard,
    /** Whether the "Ask my teacher" hand is up (calm waiting state, J4). */
    handRaised,
    /** The image-input flag is off (D-PAP-37) — the composer hides the picture button. */
    imagesDisabled,
    /** Bumps when an attached image was rejected/blocked — the composer clears it (D-PAP-34). */
    imageRejectNonce,
    /** Bumps on a screen OUTAGE — the composer RE-STAGES these unjudged pictures (D-PAP-46). */
    imageRestore,
    send,
    /** The ONE queued next message while a turn is busy (D-HARN-03) — drives the
     *  composer's "I'll do this next" pill; auto-sends when the turn settles. */
    queuedMessage,
    /** Drop the queued next message (the queued pill's ✕, D-HARN-03). */
    cancelQueued,
    /** Generate an asset INTO the chat (Asset Viewer Generate/Remix buttons, §3). */
    requestAssetGen,
    confirmPending,
    cancelPending,
    undo,
    raiseHand,
    lowerHand,
    /** Stop / skip the typing animation (H1) — finalizes, never wastes Stars. */
    abort,
    /**
     * Stop waiting for the in-flight AI turn (D-PAP-48). Aborts the classify/runTurn
     * fetch; the backend treats the disconnect as a clean cancel (no Stars). The
     * pending bubble becomes STOPPED_TEXT and the composer re-enables.
     */
    cancelTurn,
    /** Resend the last prompt after a (non-cap) error (H2). */
    retryLast,
    /** Replay a specific retryable bubble's own turn — same prompt, SAME
     *  idempotency key (the per-bubble "Try again" chip, D-HARN-02/03/05). */
    retryTurn,
    /** Report sandbox runtime errors → backend auto-fix / co-debug (MP3 / D-PAP-09,13,23).
     *  RETIRED for game verification — see the run-report loop (useVerification). */
    autoFixFromErrors,
    /** Post a standalone agent bubble (the verification loop's co-debug surface). */
    pushAgentMessage,
    /** A pending MODERATION_WARN the kid must ack before the prompt retries. */
    warnPending,
    /** Retry the last prompt with pii_warn_acknowledged (ack the MODERATION_WARN). */
    confirmWarn,
    /** Dismiss the MODERATION_WARN without retrying. */
    dismissWarn,
  };
}
