import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Check, Copy, Gamepad2, Hourglass, Link2, Share2 } from 'lucide-react';

import {
  getShareLink,
  requestShareLink,
  revokeShareLink,
  type ShareLink,
} from './sharingApi';

interface ShareLinkPanelProps {
  /** The real backend project (no share UI for the DEV local scaffold). */
  projectId: string;
}

/**
 * The external share-link control (learn-game-studio-prd.md §17.8 J8 / D-GAME10).
 * Lives on the workspace bottom bar (the Taskbar). The button itself reflects the
 * live share status — neutral when nothing is shared, a sunshine "waiting" beat
 * while a grown-up approval is PENDING, and a mint "link live" pill (with the play
 * count) once a parent approves and the frozen snapshot passes the safety + PII
 * scan. The status is polled even while the panel is closed, so an out-of-band
 * parent approval (Portal) lights the button up on its own.
 *
 * Clicking opens a popup rendered into `document.body` (so it floats above the
 * desktop windows + taskbar, never clipped) anchored just above the button;
 * clicking outside it or pressing Escape dismisses it.
 *
 * This component owns NO play surface; it just produces/manages the link. The
 * public play page (`/play/:shareId`) is the only place a snapshot actually plays.
 */
export function ShareLinkPanel({ projectId }: ShareLinkPanelProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  // Fixed-position anchor for the portal popup (above the button, right-aligned).
  const [anchor, setAnchor] = useState<{ right: number; bottom: number } | null>(null);

  const share = useQuery<ShareLink>({
    queryKey: ['share', projectId],
    queryFn: () => getShareLink(projectId),
    // Always fetch so the bottom-bar button reflects the current status even when
    // the panel is closed (incl. a parent approving out-of-band in the Portal).
    refetchOnMount: 'always',
    staleTime: 0,
    // Poll while pending/active: pending → the minted link appears on its own;
    // active → the play count stays fresh.
    refetchInterval: (q) =>
      q.state.data?.status === 'pending' || q.state.data?.status === 'active' ? 5000 : false,
  });

  const placePopup = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setAnchor({ right: window.innerWidth - r.right, bottom: window.innerHeight - r.top + 8 });
  };

  // Re-check the share state every time the panel is opened (the parent may have
  // approved since it was last closed) and anchor the popup to the button.
  const togglePanel = () => {
    setOpen((v) => {
      const next = !v;
      if (next) {
        share.refetch();
        placePopup();
      }
      return next;
    });
  };

  // Dismiss on outside-click / Escape; keep the popup anchored on resize+scroll.
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const reposition = () => placePopup();
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open]);

  const set = (data: ShareLink) => qc.setQueryData(['share', projectId], data);

  const request = useMutation({
    mutationFn: () => requestShareLink(projectId),
    onSuccess: set,
  });
  const revoke = useMutation({
    mutationFn: (shareId: string) => revokeShareLink(shareId),
    onSuccess: () => set({ status: 'none' }),
  });

  const status = share.data?.status ?? 'none';
  const shareId = share.data?.shareId;
  const plays = share.data?.plays ?? 0;
  const shareUrl = shareId ? `${window.location.origin}/play/${shareId}` : '';

  const copy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked (headless) — the URL is still visible + selectable */
    }
  };

  // Button identity per status (matches the taskbar's h-9 / rounded-lg pills).
  const btn =
    status === 'active'
      ? { wash: 'bg-brand-mint/15', border: 'border-brand-mint/50', Icon: Link2, iconClass: 'text-brand-mint' }
      : status === 'pending'
        ? { wash: 'bg-brand-sunshine/20', border: 'border-brand-sunshine/60', Icon: Hourglass, iconClass: 'text-brand-sunshine' }
        : { wash: 'bg-pg-surface-2', border: 'border-pg-border', Icon: Share2, iconClass: 'text-pg-text-muted' };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        data-testid="share-link-btn"
        data-share-status={status}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={togglePanel}
        className={clsx(
          'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold leading-none text-pg-text transition-colors',
          btn.wash,
          btn.border,
        )}
      >
        <btn.Icon
          size={16}
          className={clsx(btn.iconClass, status === 'pending' && 'animate-pulse')}
        />
        {status === 'active' ? (
          <span className="inline-flex items-center gap-2">
            Link live
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-mint/20 px-2 py-0.5 text-[12px] font-bold text-pg-text">
              <Gamepad2 size={12} aria-hidden /> {plays}
            </span>
          </span>
        ) : status === 'pending' ? (
          'Waiting for grown-up'
        ) : (
          'Share'
        )}
      </button>

      {open &&
        anchor &&
        createPortal(
          <div
            ref={popRef}
            role="dialog"
            aria-label="Share link"
            style={{ position: 'fixed', right: anchor.right, bottom: anchor.bottom, zIndex: 1000 }}
            className="w-72 rounded-2xl border border-pg-border bg-pg-desktop p-4 text-pg-text shadow-2xl"
          >
            {/* Digital-citizenship beat (§11 (c)) — shown before any link exists. */}
            {status !== 'active' && (
              <p className="text-[12px] text-pg-text-dim mb-3" data-testid="citizenship-note">
                Anyone with this link can play your game. Don’t put your real name or
                photo in it.
              </p>
            )}

            {status === 'none' && (
              <button
                type="button"
                onClick={() => request.mutate()}
                disabled={request.isPending}
                className="w-full rounded-full bg-brand-sky px-3 py-2 text-[13px] font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {request.isPending ? 'Asking…' : 'Ask my grown-up to share'}
              </button>
            )}

            {status === 'pending' && (
              <div data-testid="share-approval-pending" className="space-y-2">
                <div className="rounded-xl bg-wash-sunshine px-3 py-3 text-[13px] font-semibold text-ink">
                  🕊 Asking your grown-up… your link appears here once they say yes.
                </div>
                {shareId && (
                  <button
                    type="button"
                    data-testid="share-cancel"
                    onClick={() => revoke.mutate(shareId)}
                    disabled={revoke.isPending}
                    className="w-full rounded-full bg-pg-text/10 px-3 py-1.5 text-[12px] font-bold text-pg-text-dim hover:bg-pg-text/20 transition-colors disabled:opacity-60"
                  >
                    {revoke.isPending ? 'Canceling…' : 'Cancel request'}
                  </button>
                )}
              </div>
            )}

            {status === 'active' && shareId && (
              <div className="space-y-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-pg-text-muted mb-1">
                    Your link
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      data-testid="share-url"
                      readOnly
                      value={shareUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      className="min-w-0 flex-1 rounded-lg bg-pg-text/10 px-2 py-1.5 text-[12px] font-mono text-pg-text"
                    />
                    <button
                      type="button"
                      data-testid="share-copy"
                      onClick={copy}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-sky px-2.5 py-1.5 text-[12px] font-bold text-white hover:opacity-90"
                    >
                      {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* How many times the game was played (J8). */}
                <div data-testid="share-stats" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-pg-text-dim">
                  <Gamepad2 size={14} aria-hidden className="text-brand-mint" />
                  {plays} {plays === 1 ? 'play' : 'plays'}
                </div>

                <button
                  type="button"
                  data-testid="share-revoke"
                  onClick={() => revoke.mutate(shareId)}
                  disabled={revoke.isPending}
                  className="w-full rounded-full bg-wash-coral px-3 py-2 text-[12px] font-bold text-ink hover:bg-brand-coral hover:text-white transition-colors disabled:opacity-60"
                >
                  {revoke.isPending ? 'Turning off…' : 'Turn off this link'}
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
