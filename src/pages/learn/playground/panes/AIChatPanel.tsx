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
  Code2,
  Hand,
  Heart,
  Loader2,
  Phone,
  Play,
  Send,
  Sparkles,
  Star,
  Undo2,
  Volume2,
  WifiOff,
  X,
} from 'lucide-react';
import { useState } from 'react';

import type { SafeguardingVerdict } from '../../code/codeApi';
import { canReadAloud, readAloud } from './readAloud';
import { ThinkingBubble } from './ThinkingBubble';
import { useStickToBottom } from './useStickToBottom';
import { CAP_MESSAGE, type ChatItem, type PendingTurn } from './useGameAgent';

/** The cap-reached "ask your grown-up" copy gets its own testid (J11 / §11g(e)). */
const isCapMessage = (error: string): boolean => error === CAP_MESSAGE;

interface AIChatPanelProps {
  chat: ChatItem[];
  busy: boolean;
  /** The typing-animation replay is running — the send button becomes Stop (H1). */
  streaming?: boolean;
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
  /** Only show "Ask my teacher" when the kid is in a class (else there's no
   *  teacher to ask). */
  inClass?: boolean;
  onSend: (text: string) => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  onUndo?: () => void;
  /** "Ask my teacher" raise-hand + put-it-back-down (J4). */
  onRaiseHand?: () => void;
  onLowerHand?: () => void;
  /** In-chat CTA handlers (the launch hand-off message renders Run / See code). */
  onRunGame?: () => void;
  onSeeCode?: () => void;
  /** Stop / skip the typing animation (H1) — finalizes the message immediately. */
  onStop?: () => void;
  /** Retry the last prompt after a (non-cap) error (H2). */
  onRetry?: () => void;
}

export function AIChatPanel({
  chat,
  busy,
  streaming,
  error,
  offline,
  balance,
  pending,
  canUndo,
  safeguard,
  handRaised,
  inClass,
  onSend,
  onConfirm,
  onCancel,
  onUndo,
  onRaiseHand,
  onLowerHand,
  onRunGame,
  onSeeCode,
  onStop,
  onRetry,
}: AIChatPanelProps) {
  const [input, setInput] = useState('');

  // Stick-to-bottom + "new messages" pill (Gap A). The dep changes on every
  // append AND every streamed token so the hook re-glues / re-arms the pill.
  const last = chat[chat.length - 1];
  const dep = `${chat.length}:${last?.text.length ?? 0}:${last?.streaming ? 's' : ''}${last?.pending ? 'p' : ''}:${pending ? 1 : 0}`;
  const { listRef, showJump, jumpToBottom } = useStickToBottom(dep);

  const submit = () => {
    const t = input.trim();
    if (!t || busy || pending) return;
    setInput('');
    onSend(t);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-pg-border px-4 py-3">
        <span className="flex items-center gap-1.5 text-[14px] font-extrabold text-pg-text">
          <Sparkles size={16} className="text-brand-sunshine" />
          AI Helper
        </span>
        <div className="ml-auto flex items-center gap-2">
          {inClass && (
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
          {canUndo && (
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
        I'm a robot helper, not a person.
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
          className="h-full overflow-y-auto px-4 py-4 space-y-3"
        >
          {chat.length === 0 && (
            <div className="py-8 text-center text-[14px] font-semibold text-pg-text-dim">
              Tell me what to make and I'll code it 🤖
            </div>
          )}
          {chat.map((item) =>
            item.pending ? (
              <ThinkingBubble key={item.id} />
            ) : (
              <ChatRow key={item.id} item={item} onRunGame={onRunGame} onSeeCode={onSeeCode} />
            ),
          )}

          {pending && (
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
          {onRetry && !isCapMessage(error) && (
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

      <div className="shrink-0 border-t border-pg-border p-3">
        <div className="flex items-center gap-2 rounded-2xl border-2 border-pg-border bg-pg-text/5 pr-1.5 focus-within:border-brand-sky">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
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
            <button
              type="button"
              onClick={onStop}
              data-testid="chat-stop"
              aria-label="Stop"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-grad-sky text-white shadow-brand-sky transition-transform hover:-translate-y-0.5"
            >
              <X size={16} />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={busy || !!pending || !input.trim()}
              data-testid="chat-send"
              aria-label="Send"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-grad-sky text-white shadow-brand-sky transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:shadow-none"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          )}
        </div>
        <div className="mt-1.5 text-[11px] text-pg-text-muted">Enter to send · Shift+Enter for a new line</div>
      </div>
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
  return (
    <div
      data-testid={isPlan ? 'plan-card' : 'agency-card'}
      className="rounded-2xl border-2 border-brand-sky/50 bg-brand-sky/5 px-4 py-3 text-[14px] text-pg-text"
    >
      <div className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-brand-sky">
        <Sparkles size={14} /> {isPlan ? "Here's my plan" : "Here's what I'll do"}
      </div>
      <p className="mt-1.5 whitespace-pre-wrap">{pending.summary}</p>

      {pending.changes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" data-testid="turn-diff-kidview">
          {pending.changes.map((c, i) => (
            <span key={i} className="rounded-full bg-wash-mint px-2.5 py-0.5 text-[11px] font-bold text-ink">
              ✏️ {c.path.split('/').pop()}
            </span>
          ))}
        </div>
      )}

      <div
        data-testid="predict-beat"
        className="mt-3 rounded-xl bg-pg-text/5 px-3 py-2 text-[12.5px] font-semibold text-pg-text-dim"
      >
        🤔 {pending.prediction}
        <span className="ml-1 font-normal">Make a guess, then see if you're right!</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid={isPlan ? 'plan-approve' : 'show-me-first'}
          disabled={busy}
          onClick={onConfirm}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-mint px-4 py-2 text-[13px] font-extrabold text-ink shadow-brand-mint transition-transform hover:-translate-y-0.5 disabled:opacity-40"
        >
          {isPlan ? '✓ Yes, do it' : 'Do it'}
        </button>
        <button
          type="button"
          data-testid={isPlan ? 'plan-reject' : 'show-diff-first'}
          disabled={busy}
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-pg-border px-4 py-2 text-[13px] font-extrabold text-pg-text transition-colors hover:bg-pg-text/5 disabled:opacity-40"
        >
          {isPlan ? 'Not yet' : 'Show me first'}
        </button>
      </div>
    </div>
  );
}

function ChatRow({
  item,
  onRunGame,
  onSeeCode,
}: {
  item: ChatItem;
  onRunGame?: () => void;
  onSeeCode?: () => void;
}) {
  if (item.role === 'kid') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-grad-sky text-white px-4 py-2.5 text-[14px] leading-relaxed shadow-brand-sky">
          {item.text}
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
  return (
    <div className="flex justify-start">
      <div
        data-testid={testid}
        className={`max-w-[90%] rounded-2xl border border-pg-border bg-pg-text/10 px-4 py-2.5 text-[14px] leading-relaxed text-pg-text ${
          item.pending || item.streaming ? 'italic opacity-70' : ''
        }`}
      >
        <div className="whitespace-pre-wrap">
          {item.text}
          {item.streaming && <span aria-hidden="true" className="ml-0.5 animate-pulse">▍</span>}
        </div>

        {item.toolsFired && item.toolsFired.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.toolsFired.map((t, i) => (
              <span key={i} className="rounded-full bg-wash-mint px-2.5 py-0.5 text-[11px] font-bold text-ink">
                ✏️ {t.replace('edit_file:', '').replace('write_file:', '')}
              </span>
            ))}
          </div>
        )}

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
