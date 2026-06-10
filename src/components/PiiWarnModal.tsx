import { useMe } from '@/auth/useAuth';
import { piiWarnCopy } from '@/lib/piiMessages';

export interface WarnPending {
  message: string;
  prompt: string;
  stage: string;
  categories?: string[];
}

interface Props {
  warnPending: WarnPending | null;
  onConfirm: () => void;
  onDismiss: () => void;
}

/**
 * Friendly PII / content-warn modal (pii-protection §6, firewall §4).
 * Shown when the backend returns MODERATION_WARN (422) with requires_ack=true.
 * The kid can either edit their message or send it anyway (once).
 */
export function PiiWarnModal({ warnPending, onConfirm, onDismiss }: Props) {
  const me = useMe();
  if (!warnPending) return null;

  const age = me.data?.kind === 'kid' ? (me.data.age ?? null) : null;
  const isYoung = age === null || age < 12;
  const isPii = warnPending.stage === 'pii_detector';

  const { title, body } = isPii
    ? piiWarnCopy(warnPending.categories, isYoung)
    : {
        title: 'Heads up',
        body: warnPending.message,
      };

  // Truncate the original prompt shown to the kid to keep the modal compact.
  const excerpt =
    warnPending.prompt.length > 120
      ? warnPending.prompt.slice(0, 117) + '…'
      : warnPending.prompt;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pii-warn-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-canvas-pure p-5 shadow-xl border border-hairline">
        {/* Icon + title */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl" aria-hidden>👀</span>
          <h2 id="pii-warn-title" className="text-[16px] font-bold text-ink">
            {title}
          </h2>
        </div>

        {/* Body */}
        <p className="text-[14px] text-ink-muted leading-relaxed mb-3">{body}</p>

        {/* Original prompt excerpt */}
        <div className="rounded-xl bg-wash px-3 py-2 text-[13px] text-ink-muted mb-4 break-words">
          <span className="font-semibold text-ink">Your message: </span>
          &ldquo;{excerpt}&rdquo;
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onDismiss}
            className="btn-pill-primary w-full justify-center"
            autoFocus
          >
            ✏️ Let me change it
          </button>
          <button
            onClick={onConfirm}
            className="btn-pill-ghost w-full justify-center text-ink-muted"
          >
            📤 Send anyway (this once)
          </button>
        </div>
      </div>
    </div>
  );
}
