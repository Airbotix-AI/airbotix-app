// Presentational AI chat panel for the game studio (PRD J2). PURELY
// PRESENTATIONAL: the `useGameAgent` hook is owned by the consumer (Workspace)
// and its state is passed in via props — this component never calls the hook.
//
// It renders the full J2 surface: streamed agent messages (token + per-tool
// deltas), a Stars-metered badge, the staged-turn card (Lite "Do it / Show me
// first" agency beat OR Pro "Approve / Not yet" plan gate, both with a default-on
// prediction beat), a free Undo of the last change, and a calm offline banner.

import {
  Bot,
  ChevronRight,
  Code2,
  Eye,
  Hand,
  Heart,
  ImagePlus,
  Loader2,
  Phone,
  Play,
  Send,
  Sparkles,
  Star,
  Undo2,
  Volume2,
  Wand2,
  WifiOff,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  CHAT_IMAGE_MAX_COUNT,
  CHAT_IMAGE_MIMES,
  isChatImageMime,
  type ChatImageRef,
  type SafeguardingVerdict,
} from '../../code/codeApi';
import { useGenerationStore } from '../generationStore';
import { QueuedPill, RetryChip } from './chatChips';
import type { RetryPayload } from './useTurnHygiene';
import { MagicGenerationCard } from './MagicGenerationCard';
import { canReadAloud, readAloud } from './readAloud';
import { ThinkingBubble } from './ThinkingBubble';
import { WorkingCard } from './WorkingCard';
import { AiroAvatar } from './AiroAvatar';
import type { TurnProgress } from './turnProgress';
import { useStickToBottom } from './useStickToBottom';
import {
  CAP_MESSAGE,
  type ChatItem,
  type PendingTurn,
  type QueuedMessage,
  type SendImage,
  type SendOptions,
} from './useGameAgent';

/** The cap-reached "ask your grown-up" copy gets its own testid (J11 / §11g(e)). */
const isCapMessage = (error: string): boolean => error === CAP_MESSAGE;

/**
 * One staged composer attachment (D-PAP-33). Created the moment a picture is
 * pasted/picked: it shows a thumbnail immediately (`previewUrl`) while it uploads
 * in the background, then flips to `ready` (carries its S3 `ref`) or `rejected`.
 * Send is blocked until every attachment is past `uploading`.
 */
interface Attachment {
  id: string;
  /** Local object URL for the thumbnail (revoked on remove). */
  previewUrl: string;
  status: 'uploading' | 'ready' | 'rejected';
  /** The uploaded S3 ref — present once `ready`. */
  ref?: ChatImageRef;
}

const newAttachmentId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `att-${Math.random().toString(36).slice(2)}`;

/** The `accept` attribute for the file picker — the allow-listed image MIMEs. */
const IMAGE_ACCEPT = CHAT_IMAGE_MIMES.join(',');

/** One clickable "what changed" row for the chat bubble (§11.4). */
interface ChangedFile {
  path: string;
  note?: string;
  fromLine?: number;
  toLine?: number;
}

/**
 * The inclusive [from, to] line range that differs between two file versions
 * (1-based, in the AFTER file), or null when unchanged — so a click can highlight
 * exactly what changed in the editor.
 */
function changedLineRange(
  before: string | null | undefined,
  after: string | null | undefined,
): { from: number; to: number } | null {
  // A new file has no `before`, a deleted file no `after` — coerce to '' so the diff
  // still computes (and never crashes on null, which a whole-game rebuild produces
  // for every new file).
  const beforeStr = before ?? '';
  const afterStr = after ?? '';
  if (beforeStr === afterStr) return null;
  const a = beforeStr.split('\n');
  const b = afterStr.split('\n');
  let from = 0;
  while (from < a.length && from < b.length && a[from] === b[from]) from += 1;
  let endA = a.length - 1;
  let endB = b.length - 1;
  while (endA >= from && endB >= from && a[endA] === b[endB]) {
    endA -= 1;
    endB -= 1;
  }
  // `from`..`endB` (0-based) is the changed region in the after file; if the change
  // was a pure deletion (endB < from), highlight the single line at `from`.
  const toLine = Math.max(from, endB) + 1;
  return { from: from + 1, to: Math.min(toLine, b.length) };
}

/**
 * A one-sentence, kid-friendly description for a file when the teacher didn't give
 * its own note — so EVERY changed-file row always reads as a sentence, never a bare
 * path. The teacher's `fileNotes` note (contextual to the change) is preferred; this
 * is the role-based fallback keyed off the well-known scaffold layout.
 */
function describeFile(path: string): string {
  const name = path.split('/').pop() ?? path;
  if (name === 'main.js') return "The game's starting point — it sets everything up.";
  if (name === 'Boot.js') return 'Gets the game ready before it starts.';
  if (name === 'Game.js') return 'Your main game scene — where the action happens.';
  if (name === 'GameOver.js') return 'The screen shown when the game ends.';
  if (name === 'style.css') return 'How the game page looks.';
  if (name.endsWith('.css')) return 'Styling for how things look.';
  if (path.includes('/scenes/')) return 'A game scene (one screen of your game).';
  if (name.endsWith('.json')) return 'Settings or data for your game.';
  if (name.endsWith('.js')) return 'Code that makes your game work.';
  return 'A file in your game.';
}

/** A friendly leading emoji for a changed-file row (feature-focused, like the design). */
function fileEmoji(path: string): string {
  const name = path.split('/').pop() ?? path;
  if (name === 'main.js') return '🔌';
  if (name === 'Game.js' || name === 'Boot.js') return '🎮';
  if (name === 'GameOver.js') return '🏁';
  if (name.endsWith('.css')) return '🎨';
  if (name.endsWith('.json')) return '⚙️';
  if (path.includes('/scenes/')) return '✨';
  return '✨';
}

/**
 * Build the per-file change rows for an agent bubble: ONE row per file
 * (consolidate multiple edits, §11.4), a one-sentence description, and the line
 * range to highlight. Driven by the applied diff (`changes`) for the range, the
 * teacher's `fileNotes` for descriptions (falling back to a role-based sentence so
 * a row is never just a path), and `toolsFired` only as a path fallback.
 */
function buildChangedFiles(item: ChatItem): ChangedFile[] {
  const noteByPath = new Map((item.fileNotes ?? []).map((n) => [n.path, n.note]));
  const seen = new Set<string>();
  const out: ChangedFile[] = [];
  const add = (path: string, range?: { from: number; to: number } | null) => {
    if (!path || seen.has(path)) return;
    seen.add(path);
    out.push({
      path,
      note: noteByPath.get(path) ?? describeFile(path),
      fromLine: range?.from,
      toLine: range?.to,
    });
  };
  for (const c of item.changes ?? []) add(c.path, changedLineRange(c.before, c.after));
  // Files the teacher noted but that produced no diff entry (rare) still get a row.
  for (const n of item.fileNotes ?? []) add(n.path);
  // Fallback: no diff + no notes but tools fired (e.g. the first-turn scaffold,
  // whose files arrive as toolsFired rather than a diff).
  if (out.length === 0) {
    for (const t of item.toolsFired ?? []) add(t.replace(/^(edit_file|write_file):/, ''));
  }
  return out;
}

interface AIChatPanelProps {
  chat: ChatItem[];
  busy: boolean;
  /** The typing-animation replay is running — the send button becomes Stop (H1). */
  streaming?: boolean;
  /** The in-flight turn's honest progress — drives the WorkingCard on the pending
   *  bubble (real steps + timer, not the fake-cycling ThinkingBubble). */
  progress?: TurnProgress | null;
  error: string | null;
  /** Offline banner (J2 — calm, work-is-safe copy). */
  offline?: boolean;
  /** Family Stars balance, shown metered (real path only). */
  balance?: number;
  /** A staged turn awaiting the kid's confirm (agency beat / plan gate). */
  pending?: PendingTurn | null;
  /** Undo the last applied change is available (free local revert). */
  canUndo?: boolean;
  /** The standing safeguarding verdict (J13) — shows the persistent crisis resource. */
  safeguard?: SafeguardingVerdict | null;
  /** Whether the "Ask my teacher" hand is up (calm waiting state, J4). */
  handRaised?: boolean;
  /** Teacher live read-only viewer (D-LV-6): hide every mutation affordance —
   *  composer, confirm/reject, raise-hand, undo, retry — leaving only the chat
   *  history + non-destructive run/view CTAs. The backend write-guard is the data
   *  backstop; this is the UX + defence-in-depth layer. */
  readOnly?: boolean;
  /** Only show "Ask my teacher" when the kid is in a class (else there's no
   *  teacher to ask). */
  inClass?: boolean;
  onSend: (text: string, opts?: SendOptions) => void;
  /**
   * Upload one attached image to S3 (presign + PUT) and return its turn-body ref
   * (D-PAP-33). Bound to the project by the consumer (`uploadChatImage`). Throws on
   * a client-guard miss / network failure so the thumbnail can show a rejected
   * state. Absent in a project-less / read-only context → the picture button hides.
   */
  onUploadImage?: (file: File) => Promise<ChatImageRef>;
  /** The image-input flag is off (D-PAP-37) — hide the picture affordance entirely. */
  imagesDisabled?: boolean;
  /** Bumps when an attached image was rejected by moderation (D-PAP-34) — clear the
   *  staged thumbnails so the kid isn't stuck with a picture that can't be sent. */
  imageRejectNonce?: number;
  /** Bumps when a screen OUTAGE withheld the pictures UNJUDGED (D-PAP-46) — re-stage
   *  the SAME already-uploaded refs so one tap retries (submit cleared them). */
  imageRestore?: { nonce: number; images: SendImage[] };
  onConfirm?: () => void;
  onCancel?: () => void;
  onUndo?: () => void;
  /** "Ask my teacher" raise-hand + put-it-back-down (J4). */
  onRaiseHand?: () => void;
  onLowerHand?: () => void;
  /** In-chat CTA handlers (the launch hand-off message renders Run / See code). */
  onRunGame?: () => void;
  onSeeCode?: () => void;
  /** Open a changed file in the editor and highlight the change (§11.4). */
  onOpenFile?: (path: string, fromLine?: number, toLine?: number) => void;
  /** Open a finished asset (by VFS path) in the Asset Viewer — the chat "done" card tap (§3). */
  onOpenAsset?: (path: string) => void;
  /** Resolve an asset's `data:` URL by VFS path, for the chat "done" preview. */
  assetSrc?: (path: string) => string | undefined;
  /** Stop / skip the typing animation (H1) — finalizes the message immediately. */
  onStop?: () => void;
  /** Stop waiting for the in-flight AI response — D-PAP-48. Distinct from `onStop`,
   *  which only skips the typing animation. Aborts the classify/runTurn fetch so the
   *  backend cleanly cancels the turn; the pending bubble becomes a calm "stopped"
   *  message and the composer re-enables. */
  onCancelTurn?: () => void;
  /** Retry the LAST prompt after a (non-cap) error — the error-banner button (H2). */
  onRetry?: () => void;
  /** Replay a SPECIFIC retryable bubble's turn from its "Try again" chip — the
   *  payload carries that turn's own prompt + idempotency key (D-HARN-02/03/05). */
  onRetryTurn?: (retry: RetryPayload) => void;
  /** The ONE message queued while a turn is busy (D-HARN-03) — renders the
   *  "I'll do this next" pill above the composer; it auto-sends on settle. */
  queuedMessage?: QueuedMessage | null;
  /** Drop the queued message (the queued pill's ✕). */
  onCancelQueued?: () => void;
}

export function AIChatPanel({
  chat,
  busy,
  streaming,
  progress,
  error,
  offline,
  balance,
  pending,
  canUndo,
  safeguard,
  handRaised,
  inClass,
  readOnly,
  onSend,
  onUploadImage,
  imagesDisabled,
  imageRejectNonce,
  imageRestore,
  onConfirm,
  onCancel,
  onUndo,
  onRaiseHand,
  onLowerHand,
  onRunGame,
  onSeeCode,
  onOpenFile,
  onOpenAsset,
  assetSrc,
  onStop,
  onCancelTurn,
  onRetry,
  onRetryTurn,
  queuedMessage,
  onCancelQueued,
}: AIChatPanelProps) {
  const [input, setInput] = useState('');
  // Staged image attachments for the next turn (D-PAP-33). Empty for a text turn.
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The picture affordance is available only when the consumer wired an uploader,
  // we're not a read-only viewer, and the dark-launch flag isn't off (D-PAP-37).
  const canAttach = !!onUploadImage && !readOnly && !imagesDisabled;
  const uploading = attachments.some((a) => a.status === 'uploading');

  // Stick-to-bottom + "new messages" pill (Gap A). The dep changes on every
  // append AND every streamed token so the hook re-glues / re-arms the pill.
  const last = chat[chat.length - 1];
  const dep = `${chat.length}:${last?.text.length ?? 0}:${last?.streaming ? 's' : ''}${last?.pending ? 'p' : ''}:${pending ? 1 : 0}`;
  const { listRef, showJump, jumpToBottom } = useStickToBottom(dep);

  // Revoke any object URLs on unmount so a session of attaching pictures never
  // leaks blobs (the previews are short-lived local URLs).
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;
  useEffect(
    () => () => {
      for (const a of attachmentsRef.current) {
        if (a.previewUrl.startsWith('blob:')) URL.revokeObjectURL(a.previewUrl);
      }
    },
    [],
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const gone = prev.find((a) => a.id === id);
      if (gone?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(gone.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  // Stage + background-upload one or more picked/pasted image files (D-PAP-33).
  // Each shows a thumbnail immediately (a local object URL) while it uploads, then
  // flips to ready (carrying its S3 ref) or rejected. Non-image files and any over
  // the ≤4 cap are ignored — the kid never sees a confusing failure.
  const addFiles = useCallback(
    (files: File[]) => {
      if (!onUploadImage) return;
      const images = files.filter((f) => isChatImageMime(f.type));
      if (images.length === 0) return;
      setAttachments((prev) => {
        const room = CHAT_IMAGE_MAX_COUNT - prev.length;
        const accepted = images.slice(0, Math.max(0, room));
        const staged: Attachment[] = accepted.map((file) => {
          const id = newAttachmentId();
          const previewUrl = URL.createObjectURL(file);
          // Upload in the background; reflect the outcome onto THIS attachment.
          void onUploadImage(file)
            .then((ref) =>
              setAttachments((cur) =>
                cur.map((a) => (a.id === id ? { ...a, status: 'ready' as const, ref } : a)),
              ),
            )
            .catch(() =>
              setAttachments((cur) =>
                cur.map((a) => (a.id === id ? { ...a, status: 'rejected' as const } : a)),
              ),
            );
          return { id, previewUrl, status: 'uploading' as const };
        });
        return [...prev, ...staged];
      });
    },
    [onUploadImage],
  );

  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (!canAttach) return;
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => isChatImageMime(f.type));
      if (files.length === 0) return;
      // A pasted image is an attachment, not text — don't also drop a data URL /
      // filename into the textarea.
      e.preventDefault();
      addFiles(files);
    },
    [canAttach, addFiles],
  );

  // When the backend rejects an attached image (moderation / flag-off), the hook
  // bumps `imageRejectNonce` — clear the staged thumbnails so the kid isn't stuck
  // re-sending a picture that can't go through.
  useEffect(() => {
    if (imageRejectNonce === undefined || imageRejectNonce === 0) return;
    setAttachments((prev) => {
      for (const a of prev) if (a.previewUrl.startsWith('blob:')) URL.revokeObjectURL(a.previewUrl);
      return [];
    });
  }, [imageRejectNonce]);

  // A screen OUTAGE (D-PAP-46) withheld the pictures UNJUDGED — `submit` already
  // cleared the composer, so re-stage the SAME uploaded refs (`ready`, no
  // re-upload) for a one-tap retry. Contrast with the reject clear above: a
  // picture that FAILED moderation must never be re-stageable this way.
  useEffect(() => {
    if (!imageRestore || imageRestore.nonce === 0) return;
    setAttachments(
      imageRestore.images.map((im) => ({
        id: newAttachmentId(),
        previewUrl: im.previewUrl,
        status: 'ready' as const,
        ref: { s3_key: im.s3_key, mime: im.mime },
      })),
    );
    // Only the nonce drives re-staging (the array identity changes with it).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageRestore?.nonce]);

  const submit = () => {
    const t = input.trim();
    // A turn needs text OR ready pictures, and never sends while one is still
    // uploading (or a confirm is pending).
    const ready = attachments.filter((a): a is Attachment & { ref: ChatImageRef } => a.status === 'ready' && !!a.ref);
    if ((!t && ready.length === 0) || pending || uploading) return;
    // While a turn is busy the hook QUEUES exactly one message (D-HARN-03) — a
    // submit still goes through so nothing is silently dropped. But once one IS
    // queued, keep this draft in the composer instead of clearing it into the void.
    if (busy && queuedMessage) return;
    const images: SendImage[] = ready.map((a) => ({ ...a.ref, previewUrl: a.previewUrl }));
    setInput('');
    setAttachments([]);
    onSend(t, images.length > 0 ? { images } : undefined);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-pg-border px-4 py-3">
        <span className="flex items-center gap-2 text-[14px] font-extrabold text-pg-text">
          <AiroAvatar size={22} />
          Airo
        </span>
        <div className="ml-auto flex items-center gap-2">
          {inClass && !readOnly && (
            <button
              type="button"
              data-testid="raise-hand"
              onClick={handRaised ? onLowerHand : onRaiseHand}
              aria-pressed={handRaised}
              title={handRaised ? 'Tap to put your hand down' : 'Ask your teacher for help'}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition-colors ${
                handRaised
                  ? 'border-brand-coral/40 bg-wash-coral text-ink'
                  : 'border-pg-border text-pg-text-dim hover:bg-pg-text/5'
              }`}
            >
              <Hand size={12} /> {handRaised ? 'Hand up — tap to lower' : 'Ask my teacher'}
            </button>
          )}
          {canUndo && !readOnly && (
            <button
              type="button"
              data-testid="undo-turn"
              onClick={onUndo}
              className="inline-flex items-center gap-1 rounded-full border border-pg-border px-2.5 py-0.5 text-[11px] font-bold text-pg-text-dim transition-colors hover:bg-pg-text/5"
            >
              <Undo2 size={12} /> Undo
            </button>
          )}
          {balance != null && (
            <span
              data-testid="stars-badge"
              className="inline-flex items-center gap-1 rounded-full bg-wash-sunshine px-2.5 py-0.5 text-[11px] font-extrabold text-ink"
            >
              <Star size={12} className="fill-current" /> {balance}
            </span>
          )}
        </div>
      </div>

      {/* Persistent, kid-readable AI disclosure (J13 / §11g(a)) — ambient on every
          turn, distinct from the parent-facing C-list disclosure. The child must
          always be reminded the helper is a robot, not a person. */}
      <div
        data-testid="ai-disclosure"
        className="flex shrink-0 items-center gap-1.5 border-b border-pg-border bg-pg-text/5 px-4 py-1.5 text-[11px] font-semibold text-pg-text-dim"
      >
        <Bot size={12} className="shrink-0 text-brand-sky" />
        I'm Airo, a robot helper — not a person.
      </div>

      {/* Calm waiting state for the "Ask my teacher" raise-hand (J4). Stays up so a
          non-reading / stuck kid isn't left guessing whether help is coming. */}
      {handRaised && (
        <div
          data-testid="raise-hand-waiting"
          className="mx-4 mt-3 flex items-center gap-2 rounded-2xl border border-brand-sky/40 bg-brand-sky/10 px-4 py-2 text-[12px] font-semibold text-pg-text"
        >
          <Hand size={14} className="text-brand-sky" /> Your hand is up — your teacher
          will come help you soon. Take a breath, your work is safe.
        </div>
      )}

      {/* Standing crisis resource (J13 / §11g) — sticky safe-mode: once a distress
          verdict arrives it PERSISTS (never shown-once), with read-aloud on the
          rescue path. The wording is the backend's, never improvised here. */}
      {safeguard?.crisisResource && (
        <CrisisResourceBanner resource={safeguard.crisisResource} />
      )}

      {offline && (
        <div
          data-testid="offline-banner"
          className="mx-4 mt-3 flex items-center gap-2 rounded-2xl border border-brand-sunshine/40 bg-wash-sunshine/60 px-4 py-2 text-[12px] font-semibold text-ink"
        >
          <WifiOff size={14} /> Internet hiccup — your work is safe. Try again in a moment.
        </div>
      )}

      <div className="relative flex-1 min-h-0">
        <div
          ref={listRef}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          className="pg-scroll h-full overflow-y-auto px-4 py-4 space-y-3"
        >
          {chat.length === 0 && (
            <div className="py-8 text-center text-[14px] font-semibold text-pg-text-dim">
              Tell me what to make and I'll code it 🤖
            </div>
          )}
          {chat.map((item) =>
            item.pending ? (
              // One in-flight turn → the honest WorkingCard (real steps + timer).
              // ThinkingBubble is the fallback if progress hasn't seeded yet.
              progress ? (
                <WorkingCard key={item.id} progress={progress} />
              ) : (
                <ThinkingBubble key={item.id} />
              )
            ) : (
              <ChatRow
                key={item.id}
                item={item}
                busy={busy}
                readOnly={readOnly}
                onRunGame={onRunGame}
                onSeeCode={onSeeCode}
                onSend={onSend}
                onOpenFile={onOpenFile}
                onOpenAsset={onOpenAsset}
                assetSrc={assetSrc}
                onRetryTurn={onRetryTurn}
              />
            ),
          )}

          {pending && !readOnly && (
            <PendingCard pending={pending} busy={!!busy} onConfirm={onConfirm} onCancel={onCancel} />
          )}
        </div>

        {/* "New messages" pill (Gap A) — only while released & new content arrived. */}
        {showJump && (
          <button
            type="button"
            data-testid="chat-jump-newest"
            onClick={jumpToBottom}
            aria-label="Jump to newest messages"
            className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center rounded-full bg-grad-sky px-3 py-1 text-[12px] font-extrabold text-white shadow-brand-sky transition-opacity hover:opacity-90"
          >
            ↓ New stuff!
          </button>
        )}
      </div>

      {error && (
        <div
          data-testid={isCapMessage(error) ? 'cap-message' : 'chat-error'}
          className="mx-4 mb-2 flex items-center gap-2 rounded-2xl border border-brand-coral/40 bg-brand-coral/15 px-4 py-2 text-[12px] font-medium text-pg-text"
        >
          <span className="min-w-0 flex-1">{error}</span>
          {/* The cap message is not retryable (the kid needs a grown-up to add
              Stars), so only offer Try-again on a transient failure. */}
          {onRetry && !isCapMessage(error) && !readOnly && (
            <button
              type="button"
              data-testid="chat-retry"
              onClick={onRetry}
              aria-label="Try the last message again"
              className="shrink-0 rounded-full bg-grad-sky px-3 py-0.5 text-[11px] font-extrabold text-white shadow-brand-sky transition-opacity hover:opacity-90"
            >
              Try again ↻
            </button>
          )}
        </div>
      )}

      {/* Teacher live read-only viewer (D-LV-6): the composer (type / send / stop)
          is replaced by a calm, subtle note — a teacher can watch but never type a
          prompt, send a turn, or interrupt a stream. */}
      {readOnly ? (
        <div
          data-testid="chat-readonly-note"
          className="shrink-0 border-t border-pg-border px-4 py-3 text-center text-[12px] font-semibold text-pg-text-dim"
        >
          <span className="inline-flex items-center gap-1.5">
            <Eye size={14} aria-hidden className="text-pg-text-muted" />
            Read-only — watching the student build
          </span>
        </div>
      ) : (
        <div className="shrink-0 border-t border-pg-border p-3">
          {/* The ONE queued next message (D-HARN-03) — auto-sends on settle. */}
          {queuedMessage && <QueuedPill text={queuedMessage.text} onCancel={onCancelQueued} />}
          {/* Staged-attachment strip (D-PAP-33) — sits ABOVE the textarea; each thumb
              shows a spinner while uploading, a red ring if moderation/upload failed,
              and a remove button. Hidden when nothing is attached. */}
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2" data-testid="chat-attachments">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  data-testid="chat-attachment"
                  data-status={a.status}
                  className={`relative h-14 w-14 overflow-hidden rounded-xl border-2 ${
                    a.status === 'rejected' ? 'border-brand-coral' : 'border-pg-border'
                  }`}
                >
                  <img src={a.previewUrl} alt="" className="h-full w-full object-cover" />
                  {a.status === 'uploading' && (
                    <div
                      data-testid="chat-attachment-spinner"
                      className="absolute inset-0 grid place-items-center bg-pg-text/40"
                    >
                      <Loader2 size={16} className="animate-spin text-white" />
                    </div>
                  )}
                  {a.status === 'rejected' && (
                    <div className="absolute inset-0 grid place-items-center bg-brand-coral/40" aria-hidden />
                  )}
                  <button
                    type="button"
                    data-testid="chat-attachment-remove"
                    aria-label="Remove picture"
                    onClick={() => removeAttachment(a.id)}
                    className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-pg-text/70 text-white"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 rounded-2xl border-2 border-pg-border bg-pg-text/5 pl-1.5 pr-1.5 focus-within:border-brand-sky">
            {/* Attach-a-picture (D-PAP-33) — only when the uploader is wired and the
                dark-launch flag isn't off. A hidden multi-file input does the picking. */}
            {canAttach && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={IMAGE_ACCEPT}
                  multiple
                  data-testid="chat-attach-input"
                  className="hidden"
                  onChange={(e) => {
                    addFiles(Array.from(e.target.files ?? []));
                    // Reset so re-picking the SAME file fires onChange again.
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  data-testid="chat-attach-btn"
                  aria-label="Add a picture"
                  title="Add a picture"
                  disabled={attachments.length >= CHAT_IMAGE_MAX_COUNT}
                  onClick={() => fileInputRef.current?.click()}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-pg-border bg-pg-surface text-pg-text-dim transition-colors hover:border-brand-sky/60 hover:bg-brand-sky/10 hover:text-brand-sky disabled:opacity-40"
                >
                  <ImagePlus size={18} />
                </button>
              </>
            )}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={onPaste}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              data-testid="chat-input"
              placeholder="What should we build?"
              rows={2}
              className="min-w-0 flex-1 resize-none bg-transparent px-3.5 py-2.5 text-[14px] text-pg-text placeholder:text-pg-text-muted focus:outline-none"
            />
            {streaming ? (
              // H1: the reply arrived and is replaying token-by-token → Stop skips
              // the animation to the finished message (never wastes Stars).
              <button
                type="button"
                onClick={onStop}
                data-testid="chat-stop"
                aria-label="Stop"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-grad-sky text-white shadow-brand-sky transition-transform hover:-translate-y-0.5"
              >
                <X size={16} />
              </button>
            ) : busy ? (
              // D-PAP-48: the agent is still THINKING (no reply yet) → Stop waiting
              // aborts the in-flight fetch; the backend cleanly cancels (no Stars).
              <button
                type="button"
                onClick={onCancelTurn}
                data-testid="chat-stop-waiting"
                aria-label="Stop"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-grad-sky text-white shadow-brand-sky transition-transform hover:-translate-y-0.5"
              >
                <X size={16} />
              </button>
            ) : (
              <button
                onClick={submit}
                // Send needs text OR a ready picture, and is blocked while any
                // attachment is still uploading (D-PAP-33).
                disabled={
                  !!pending ||
                  uploading ||
                  (!input.trim() && !attachments.some((a) => a.status === 'ready'))
                }
                data-testid="chat-send"
                aria-label="Send"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-grad-sky text-white shadow-brand-sky transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:shadow-none"
              >
                <Send size={16} />
              </button>
            )}
          </div>
          <div className="mt-1.5 text-[11px] text-pg-text-muted">Enter to send · Shift+Enter for a new line</div>
        </div>
      )}
    </div>
  );
}

/**
 * The staged-turn card (PRD J2). A Lite turn shows the agency beat ("here's what
 * I'll do… Do it / Show me first") BEFORE the turn is spent — confirm runs it,
 * cancel spends nothing. A Pro multi-file turn shows the plan gate ("Approve / Not
 * yet") after the turn ran (writes collected, not persisted). Both lead with the
 * default-on prediction beat — a typing-free "what will change?" so the kid thinks
 * before spending a metered turn. The diff stays plain-English in chat; we never
 * yank the editor open.
 */
function PendingCard({
  pending,
  busy,
  onConfirm,
  onCancel,
}: {
  pending: PendingTurn;
  busy: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}) {
  const isPlan = pending.kind === 'plan';
  const isSwitch = pending.kind === 'engine-switch';
  return (
    <div
      data-testid={isSwitch ? 'engine-switch-card' : isPlan ? 'plan-card' : 'agency-card'}
      className="rounded-2xl border-2 border-brand-sky/50 bg-brand-sky/5 px-4 py-3 text-[14px] text-pg-text"
    >
      <div className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-brand-sky">
        <Sparkles size={14} />{' '}
        {isSwitch ? 'Rebuild your whole game?' : isPlan ? "Here's my plan" : "Here's what I'll do"}
      </div>
      <p className="mt-1.5 whitespace-pre-wrap">{pending.summary}</p>

      {!isSwitch && pending.changes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" data-testid="turn-diff-kidview">
          {pending.changes.map((c, i) => (
            <span key={i} className="rounded-full bg-wash-mint px-2.5 py-0.5 text-[11px] font-bold text-ink">
              ✏️ {c.path.split('/').pop()}
            </span>
          ))}
        </div>
      )}

      {!isSwitch && (
        <div
          data-testid="predict-beat"
          className="mt-3 rounded-xl bg-pg-text/5 px-3 py-2 text-[12.5px] font-semibold text-pg-text-dim"
        >
          🤔 {pending.prediction}
          <span className="ml-1 font-normal">Make a guess, then see if you're right!</span>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid={isSwitch ? 'engine-switch-confirm' : isPlan ? 'plan-approve' : 'show-me-first'}
          disabled={busy}
          onClick={onConfirm}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-mint px-4 py-2 text-[13px] font-extrabold text-ink shadow-brand-mint transition-transform hover:-translate-y-0.5 disabled:opacity-40"
        >
          {isSwitch ? '✓ Yes, rebuild it' : isPlan ? '✓ Yes, do it' : 'Do it'}
        </button>
        <button
          type="button"
          data-testid={isSwitch ? 'engine-switch-cancel' : isPlan ? 'plan-reject' : 'show-diff-first'}
          disabled={busy}
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-pg-border px-4 py-2 text-[13px] font-extrabold text-pg-text transition-colors hover:bg-pg-text/5 disabled:opacity-40"
        >
          {isSwitch ? 'No, keep it' : isPlan ? 'Not yet' : 'Show me first'}
        </button>
      </div>
    </div>
  );
}

function ChatRow({
  item,
  busy,
  readOnly,
  onRunGame,
  onSeeCode,
  onSend,
  onOpenFile,
  onOpenAsset,
  assetSrc,
  onRetryTurn,
}: {
  item: ChatItem;
  /** A turn is in flight (D-HARN-03): the send-path chips render disabled. */
  busy?: boolean;
  /** Read-only viewer (D-LV-6): hide the next-step chips (they send a turn). */
  readOnly?: boolean;
  onRunGame?: () => void;
  onSeeCode?: () => void;
  onSend?: (text: string, opts?: SendOptions) => void;
  onOpenFile?: (path: string, fromLine?: number, toLine?: number) => void;
  onOpenAsset?: (path: string) => void;
  assetSrc?: (path: string) => string | undefined;
  /** Replay THIS bubble's retryable turn (its own prompt + key, D-HARN-02). */
  onRetryTurn?: (retry: RetryPayload) => void;
}) {
  if (item.role === 'kid') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-grad-sky text-white px-4 py-2.5 text-[14px] leading-relaxed shadow-brand-sky">
          {/* Pictures the kid attached (D-PAP-33), rendered from the LOCAL preview
              URL — the S3 key never reaches the bubble. */}
          {item.images && item.images.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1.5" data-testid="kid-bubble-images">
              {item.images.map((img, i) => (
                <img
                  key={i}
                  src={img.previewUrl}
                  alt=""
                  data-testid="kid-bubble-image"
                  className="h-20 w-20 rounded-xl object-cover"
                />
              ))}
            </div>
          )}
          {item.text}
        </div>
      </div>
    );
  }
  // AI asset generation (D-ASSET §3): the magic card while it runs, then the
  // finished asset with an Add-to-game CTA (a gentle text bubble on error).
  if (item.assetGen) {
    const ag = item.assetGen;
    if (ag.status === 'done' && ag.path) {
      const src = assetSrc?.(ag.path);
      const path = ag.path;
      // The finished asset, shown big. Tapping it opens it in the Asset Viewer.
      return (
        <div className="flex justify-start">
          <button
            type="button"
            data-testid="chat-asset-open"
            onClick={() => onOpenAsset?.(path)}
            className="max-w-[85%] rounded-2xl border border-pg-border bg-pg-text/10 p-2.5 text-left transition-colors hover:border-brand-bubblegum/60"
          >
            <div className="mb-2 px-1 text-[13px] font-extrabold text-pg-text">Here’s your asset! ✨</div>
            {src && (
              <img
                src={src}
                crossOrigin="anonymous"
                alt=""
                className="h-40 w-full rounded-xl bg-pg-surface-2 object-contain p-2"
              />
            )}
            <div className="mt-1.5 px-1 text-[11.5px] text-pg-text-muted">
              saved to My assets · tap to open it
            </div>
          </button>
        </div>
      );
    }
    if (ag.status === 'error') {
      return (
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl border border-pg-border bg-pg-text/10 px-4 py-2.5 text-[13.5px] text-pg-text-dim">
            🌧️ That fizzled — try asking again.
          </div>
        </div>
      );
    }
    return (
      <div className="flex w-full justify-start">
        <div className="w-[92%]">
          <MagicGenerationCard
            status="generating"
            prompt={ag.prompt}
            mode={ag.refSrc ? 'remix' : 'create'}
            refSrc={ag.refSrc}
            onCancel={() => useGenerationStore.getState().cancel()}
            onRetry={() => undefined}
            onDismiss={() => undefined}
          />
        </div>
      </div>
    );
  }
  // A safeguarding deflection (J13): the agent "breaks character" — distinct calm
  // styling, a read-aloud control for the rescue path, and NO turn/stars/diff/CTA
  // chrome (it was never a game turn).
  if (item.safeguard) {
    return (
      <div className="flex justify-start">
        <div
          data-testid="safeguard-break"
          className="max-w-[90%] rounded-2xl border-2 border-brand-coral/50 bg-brand-coral/10 px-4 py-3 text-[14px] leading-relaxed text-pg-text"
        >
          <div className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-brand-coral">
            <Heart size={14} className="fill-current" /> A quick check-in
          </div>
          <p className="mt-1.5 whitespace-pre-wrap">{item.text}</p>
          {canReadAloud() && (
            <button
              type="button"
              data-testid="safeguard-read-aloud"
              onClick={() => readAloud(item.text)}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border-2 border-brand-coral/50 px-3.5 py-1.5 text-[12px] font-extrabold text-brand-coral transition-colors hover:bg-brand-coral/10"
            >
              <Volume2 size={14} /> Read it to me
            </button>
          )}
        </div>
      </div>
    );
  }
  const hasActions = item.actions && item.actions.length > 0;
  // The streaming bubble carries `agent-msg-streaming`; a settled one `agent-msg`
  // (the stable markers the J2 e2e asserts the live→final transition by).
  const testid = item.pending
    ? undefined
    : item.streaming
      ? 'agent-msg-streaming'
      : hasActions
        ? 'chat-starter'
        : 'agent-msg';
  // The settled message is a raised card with an "AI Helper" header (the design).
  // While streaming it stays a light, header-less bubble so the type reveal is calm.
  const settled = !item.streaming;
  return (
    <div className="flex justify-start">
      <div
        data-testid={testid}
        className={`max-w-[92%] rounded-2xl border border-pg-border px-4 text-[14px] leading-relaxed text-pg-text ${
          settled ? 'bg-pg-surface py-3.5 shadow-sm' : 'bg-pg-text/10 py-2.5 italic opacity-80'
        }`}
      >
        {settled && (
          <div className="mb-2 flex items-center gap-2">
            <AiroAvatar size={24} />
            <span className="text-[13px] font-extrabold text-pg-text">Airo</span>
          </div>
        )}
        <div className="whitespace-pre-wrap">
          {item.text}
          {item.streaming && <span aria-hidden="true" className="ml-0.5 animate-pulse">▍</span>}
        </div>

        {/* Retryable failed/timed-out turn (D-HARN-02/03/05): one calm chip that
            replays THIS bubble's own turn — same prompt, SAME idempotency key. */}
        {item.retry && !readOnly && (
          <RetryChip retry={item.retry} busy={busy} onRetryTurn={onRetryTurn} />
        )}

        {(() => {
          // Per-file "what changed" rows (§11.4): ONE row per changed file
          // (consolidate multiple edits to the same file), each with the teacher's
          // short note and clickable → opens the editor + highlights the change.
          const changedFiles = buildChangedFiles(item);
          if (changedFiles.length === 0) return null;
          return (
            <div data-testid="file-changes" className="mt-3 flex flex-col gap-2">
              {changedFiles.map((f) => (
                <button
                  key={f.path}
                  type="button"
                  data-testid="file-change"
                  onClick={() => onOpenFile?.(f.path, f.fromLine, f.toLine)}
                  disabled={!onOpenFile}
                  title={f.path}
                  className="group flex items-center gap-2.5 rounded-xl border border-pg-border bg-pg-surface-2 px-3 py-2.5 text-left transition-colors enabled:hover:border-brand-sky/50 disabled:cursor-default"
                >
                  <span aria-hidden="true" className="text-[15px]">{fileEmoji(f.path)}</span>
                  <span className="min-w-0 flex-1">
                    {/* Lead with the friendly, feature-focused change (the design); the
                        file name rides along quietly for the editor jump + learning. */}
                    <span className="block truncate text-[13.5px] text-pg-text">{f.note}</span>
                    <span className="block truncate font-mono text-[11px] text-pg-text-muted">{f.path}</span>
                  </span>
                  <ChevronRight
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 text-pg-text-muted transition-colors group-enabled:group-hover:text-brand-sky"
                  />
                </button>
              ))}
            </div>
          );
        })()}

        {hasActions && (
          <div className="mt-3 flex flex-wrap gap-2">
            {item.actions?.includes('run') && (
              <button
                type="button"
                onClick={onRunGame}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-mint px-4 py-2 text-[13px] font-extrabold text-ink shadow-brand-mint transition-transform hover:-translate-y-0.5"
              >
                <Play size={16} /> Run game
              </button>
            )}
            {item.actions?.includes('code') && (
              <button
                type="button"
                onClick={onSeeCode}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-brand-sky/60 px-4 py-2 text-[13px] font-extrabold text-brand-sky transition-colors hover:bg-brand-sky/10"
              >
                <Code2 size={16} /> See code
              </button>
            )}
          </div>
        )}

        {/* Teacher "what shall we do next?" option chips (§11.4 / D-PAP-06).
            Tapping one sends its prompt as the next turn — so they're hidden in the
            read-only viewer (D-LV-6), which must never trigger a turn. */}
        {!readOnly && item.nextSteps && item.nextSteps.length > 0 && (
          <div className="mt-3.5 border-t border-pg-border pt-3">
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-pg-text-muted">
              What next?
            </div>
            <div data-testid="next-steps" className="flex flex-wrap gap-2">
              {item.nextSteps.map((step, i) => (
                <button
                  key={i}
                  type="button"
                  data-testid="next-step"
                  // Disabled while a turn is busy (D-HARN-03): a chip tap must never
                  // vanish into an in-flight turn — the composer queue is the one
                  // sanctioned "next message" slot.
                  disabled={busy}
                  onClick={() => onSend?.(step.prompt, { guided: true })}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-40 ${
                    step.tag === 'fun'
                      ? 'border-brand-bubblegum/45 bg-brand-bubblegum/10 text-brand-bubblegum'
                      : 'border-brand-sky/45 bg-brand-sky/10 text-brand-sky'
                  }`}
                >
                  {step.tag === 'fun' ? <Wand2 size={14} /> : <Sparkles size={14} />}
                  {step.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The standing, region-correct crisis resource (J13 / §11g). PERSISTENT (sticky
 * safe-mode — pinned above the chat, not a one-shot bubble) with a read-aloud
 * control so a distressed / non-reading child can hear who to call. The name +
 * number are the backend's (bound to enrolment), never improvised here.
 */
function CrisisResourceBanner({
  resource,
}: {
  resource: NonNullable<SafeguardingVerdict['crisisResource']>;
}) {
  const spoken = `${resource.note ? resource.note + '. ' : ''}You can call ${resource.name} on ${resource.phone}.`;
  return (
    <div
      data-testid="crisis-resource"
      className="mx-4 mt-3 rounded-2xl border-2 border-brand-coral/50 bg-brand-coral/10 px-4 py-3 text-pg-text"
    >
      <div className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-brand-coral">
        <Phone size={14} /> Talk to someone who can help
      </div>
      {resource.note && <p className="mt-1 text-[13px] leading-relaxed">{resource.note}</p>}
      <div className="mt-1.5 text-[14px] font-extrabold">
        {resource.name}: <span data-testid="crisis-phone">{resource.phone}</span>
      </div>
      {canReadAloud() && (
        <button
          type="button"
          data-testid="crisis-read-aloud"
          onClick={() => readAloud(spoken)}
          className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border-2 border-brand-coral/50 px-3.5 py-1.5 text-[12px] font-extrabold text-brand-coral transition-colors hover:bg-brand-coral/10"
        >
          <Volume2 size={14} /> Read it to me
        </button>
      )}
    </div>
  );
}
