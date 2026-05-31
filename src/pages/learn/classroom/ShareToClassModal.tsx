import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { ApiError } from '@/lib/api';
import { listClasses, shareToClass, type ClassSummary } from './classroomApi';

const CAPTION_MAX = 80; // learn-classroom-prd §10 (caption trimmed at 80)

interface ShareToClassModalProps {
  projectId: string;
  onClose: () => void;
  onShared?: () => void;
}

/**
 * "Share with class" flow (class-wall-moderation-prd §5.1 + §6.1): pick a class
 * + optional caption → POST a wall post (`/classes/:id/wall/posts`). The post
 * enters server-side moderation; this shows the friendly waiting state.
 */
export function ShareToClassModal({ projectId, onClose, onShared }: ShareToClassModalProps) {
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;

  const classes = useQuery<ClassSummary[]>({
    queryKey: ['kid', kidId, 'classes'],
    queryFn: () => listClasses(kidId!),
    enabled: !!kidId,
  });

  const [classId, setClassId] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const list = classes.data ?? [];
  const effectiveClassId = classId ?? list[0]?.id ?? null;

  const submit = async () => {
    if (!effectiveClassId) return;
    setBusy(true);
    setError(null);
    try {
      await shareToClass({ projectId, classId: effectiveClassId, caption: caption.trim() });
      setDone(true);
      onShared?.();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'CONFLICT') {
        setDone(true);
        onShared?.();
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
            <span className="sticker-mint">Sent ✓</span>
            <h2 className="section-heading mt-4" style={{ fontSize: '22px' }}>
              Off to your teacher!
            </h2>
            <p className="lead-text mt-2" style={{ fontSize: '14px' }}>
              You’ll get a ⭐ ping when they say yes. Then it shows up on the class wall.
            </p>
            <button onClick={onClose} className="btn-pill-primary mt-6">
              Got it
            </button>
          </div>
        ) : (
          <>
            <div className="eyebrow eyebrow-sky">Share with class</div>
            <h2 className="section-heading" style={{ fontSize: '22px' }}>
              Show your classmates
            </h2>
            <p className="lead-text mt-1" style={{ fontSize: '14px' }}>
              Only your classmates will see it, and your teacher checks it first.
            </p>

            {classes.isLoading ? (
              <p className="lead-text mt-5">Loading your classes…</p>
            ) : list.length === 0 ? (
              <div className="mt-5 rounded-2xl bg-wash-sunshine border border-brand-sunshine/40 px-4 py-3 text-[13px] font-medium text-ink">
                You’re not in a class yet. Ask your parent or teacher to join one.
              </div>
            ) : (
              <>
                {list.length > 1 && (
                  <div className="mt-5">
                    <span className="label-k12">Which class?</span>
                    <div className="mt-2 space-y-2">
                      {list.map((c) => (
                        <label
                          key={c.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-colors ${
                            effectiveClassId === c.id
                              ? 'border-brand-sky bg-wash-sky'
                              : 'border-hairline hover:border-brand-sky'
                          }`}
                        >
                          <input
                            type="radio"
                            className="sr-only"
                            checked={effectiveClassId === c.id}
                            onChange={() => setClassId(c.id)}
                          />
                          <span className="text-[14px] font-bold text-ink">{c.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-5">
                  <span className="label-k12">Say something about it (optional)</span>
                  <input
                    className="input-k12 mt-1"
                    placeholder="Look what I made!"
                    maxLength={CAPTION_MAX}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                  />
                  <div className="mt-1 text-right text-[11px] text-slate2">
                    {caption.length}/{CAPTION_MAX}
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
                  <button onClick={submit} disabled={busy || !effectiveClassId} className="btn-pill-primary flex-1">
                    {busy ? 'Sending…' : 'Send to teacher'}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
