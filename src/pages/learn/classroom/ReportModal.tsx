import { useState } from 'react';

import { ApiError } from '@/lib/api';
import { REPORT_REASONS, reportPost, type ReportReason } from './classroomApi';

const REASON_TEXT_MAX = 200; // class-wall-moderation-prd §5.3 (optional text box)

interface ReportModalProps {
  /** WallPost id (not project id) — reports attach to the wall post (§10). */
  postId: string;
  classId: string;
  onClose: () => void;
  onReported?: () => void;
}

/** "Tell teacher" report flow (class-wall-moderation-prd.md §5.3 / §6.4). */
export function ReportModal({ postId, classId, onClose, onReported }: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setBusy(true);
    setError(null);
    try {
      await reportPost({ postId, classId, reason, reasonText: reasonText.trim() || undefined });
      setDone(true);
      onReported?.();
    } catch (e) {
      // Already reported (one report per kid per post — §4.4) → treat as success.
      if (e instanceof ApiError && (e.status === 409 || e.code === 'CONFLICT')) {
        setDone(true);
        onReported?.();
      } else {
        setError(e instanceof ApiError ? e.message : 'Could not send. Try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-ink/40" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-hero bg-canvas-pure p-7 shadow-card-soft">
        {done ? (
          <div className="text-center">
            <span className="sticker-mint">Thank you</span>
            <h2 className="section-heading mt-4" style={{ fontSize: '22px' }}>
              We told your teacher
            </h2>
            <p className="lead-text mt-2" style={{ fontSize: '14px' }}>
              They’ll take a look. You did the right thing by telling someone.
            </p>
            <button onClick={onClose} className="btn-pill-primary mt-6">
              Close
            </button>
          </div>
        ) : (
          <>
            <h2 className="section-heading" style={{ fontSize: '22px' }}>
              Tell us what’s wrong
            </h2>
            <p className="lead-text mt-1" style={{ fontSize: '14px' }}>
              We’ll keep this private from the person who posted.
            </p>

            <div className="mt-5 space-y-2">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-colors ${
                    reason === r.id ? 'border-brand-coral bg-wash-coral' : 'border-hairline hover:border-brand-coral'
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={reason === r.id}
                    onChange={() => setReason(r.id)}
                  />
                  <span className="text-[18px]">{r.emoji}</span>
                  <span className="text-[14px] font-semibold text-ink">{r.label}</span>
                </label>
              ))}
            </div>

            <div className="mt-4">
              <span className="label-k12">Want to say more? (optional)</span>
              <textarea
                className="input-k12 mt-1"
                rows={2}
                maxLength={REASON_TEXT_MAX}
                placeholder="You don’t have to."
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
              />
              <div className="mt-1 text-right text-[11px] text-slate2">
                {reasonText.length}/{REASON_TEXT_MAX}
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-2 text-[13px] font-medium text-ink">
                {error}
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <button onClick={onClose} className="btn-pill-secondary flex-1">
                Cancel
              </button>
              <button onClick={submit} disabled={busy || !reason} className="btn-pill-primary flex-1">
                {busy ? 'Sending…' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
