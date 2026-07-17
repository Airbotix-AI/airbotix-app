// Share control for Blocks Studio — the SAME parent-approval flow + play-count
// as the Game Studio (it reuses the kind-agnostic share API: request → grown-up
// approves → frozen snapshot → live capability link at /play/:shareId). Styled
// with the studio's `--bsx-*` tokens (theme-aware) and rendered as a centred
// sheet, matching the character/scene pickers. The public play page renders the
// read-only Blocks player from the same frozen snapshot.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Gamepad2, Hourglass, Link2, Share2 } from 'lucide-react';

import {
  approveShareLink,
  getShareLink,
  requestShareLink,
  revokeShareLink,
  type ShareLink,
} from '../playground/sharingApi';
import { useDemoMode } from '@/pages/try/demoMode';
import type { BlocksTheme } from './blocksTheme';

export function BlocksSharePanel({
  projectId,
  theme,
  readOnly = false,
  prepMode = false,
}: {
  projectId: string;
  theme: BlocksTheme;
  readOnly?: boolean;
  /**
   * Teacher-prep host (teacher-prep-projects-prd.md D-PREP-6): the owner is an adult
   * teacher, so sharing is IMMEDIATE — one click mints the live link with no
   * parent-approval gate (the backend returns `active` straight from the request).
   * Drops the kid "ask a grown-up" copy; there is no pending/waiting beat.
   */
  prepMode?: boolean;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const share = useQuery<ShareLink>({
    queryKey: ['share', projectId],
    queryFn: () => getShareLink(projectId),
    // Teacher viewer (D-LV-6): sharing is a kid-only action — getShareLink is
    // kid-scoped, so a teacher would 403. Don't fetch in read-only; the button is
    // rendered disabled below (visible for layout parity, never opens the sheet).
    enabled: !readOnly,
    refetchOnMount: 'always',
    staleTime: 0,
    // poll while pending (the minted link appears on its own) / active (play count)
    refetchInterval: (q) =>
      q.state.data?.status === 'pending' || q.state.data?.status === 'active' ? 5000 : false,
  });

  const set = (data: ShareLink) => qc.setQueryData(['share', projectId], data);
  const request = useMutation({ mutationFn: () => requestShareLink(projectId), onSuccess: set });
  const revoke = useMutation({
    mutationFn: (shareId: string) => revokeShareLink(shareId),
    onSuccess: () => set({ status: 'none' }),
  });
  // Demo-only (D-DEMO-09): the tour fires the (preview-framed) grown-up approval.
  const approve = useMutation({ mutationFn: () => approveShareLink(projectId), onSuccess: set });

  const status = share.data?.status ?? 'none';
  const shareId = share.data?.shareId;
  const plays = share.data?.plays ?? 0;
  const shareUrl = shareId ? `${window.location.origin}/play/${shareId}` : '';

  // Try-demo (D-DEMO-09): hand the tour this real panel's affordances so it walks
  // the share flow on the real UI. Re-bound each render (last bind wins).
  const demo = useDemoMode();
  useEffect(() => {
    if (!demo?.bindShareControls) return;
    demo.bindShareControls({
      openPanel: () => {
        share.refetch();
        setOpen(true);
      },
      requestShare: () => request.mutate(),
      approve: () => approve.mutate(),
      openRecipient: () => {
        if (shareUrl) window.open(shareUrl, '_blank', 'noopener,noreferrer');
      },
      closePanel: () => setOpen(false),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, shareUrl]);

  const copy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the URL is still visible + selectable */
    }
  };

  const open$ = () => {
    share.refetch();
    setOpen(true);
  };

  const Icon = status === 'active' ? Link2 : status === 'pending' ? Hourglass : Share2;

  return (
    <>
      <button
        type="button"
        data-testid="share-link-btn"
        data-share-status={status}
        className={`bsx-press grid h-11 place-items-center px-3 text-[13px]${readOnly ? ' pointer-events-none cursor-default opacity-60' : ''}`}
        onClick={readOnly ? undefined : open$}
        disabled={readOnly}
        aria-disabled={readOnly}
        title={readOnly ? 'Share is the kid’s to use' : 'Share your project'}
      >
        <span className="flex items-center gap-1.5">
          <Icon size={18} className={status === 'pending' ? 'animate-pulse' : undefined} />
          {status === 'active' ? (
            <span className="flex items-center gap-1">
              <span className="bsx-tlabel">Live</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-mint/25 px-1.5 text-[11px] font-bold">
                <Gamepad2 size={11} aria-hidden /> {plays}
              </span>
            </span>
          ) : (
            <span className="bsx-tlabel">
              {status === 'pending' ? (prepMode ? 'Creating' : 'Waiting') : 'Share'}
            </span>
          )}
        </span>
      </button>

      {open &&
        createPortal(
          <div
            className="bsx bsx-sheet-bg"
            data-theme={theme}
            // Try-demo (D-DEMO-09): the tour owns the sheet lifecycle — a backdrop
            // tap (e.g. the tour's Next) must NOT dismiss it mid-beat. ✕ still closes.
            onPointerDown={() => {
              if (!demo) setOpen(false);
            }}
          >
            <div
              className="bsx-confirm"
              data-testid="share-panel"
              style={{ textAlign: 'left' }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[18px] font-extrabold">Share your project</div>
                <button type="button" className="bsx-press bsx-sheet-x" onClick={() => setOpen(false)}>
                  ✕
                </button>
              </div>

              {status !== 'active' && (
                <p className="bsx-muted mb-3 text-[12px] font-semibold" data-testid="citizenship-note">
                  {prepMode
                    ? 'Anyone with this link can play this project — no sign-in needed.'
                    : "Anyone with this link can play your project. Don't put your real name or photo in it."}
                </p>
              )}

              {status === 'none' && (
                <button
                  type="button"
                  className="bsx-confirm-ok w-full"
                  onClick={() => request.mutate()}
                  disabled={request.isPending}
                >
                  {prepMode
                    ? request.isPending
                      ? 'Creating link…'
                      : 'Create share link'
                    : request.isPending
                      ? 'Asking…'
                      : 'Ask my grown-up to share'}
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
                      className="bsx-confirm-cancel w-full"
                      onClick={() => revoke.mutate(shareId)}
                      disabled={revoke.isPending}
                    >
                      {revoke.isPending ? 'Canceling…' : 'Cancel request'}
                    </button>
                  )}
                </div>
              )}

              {status === 'active' && shareId && (
                <div className="space-y-3">
                  <div>
                    <div className="bsx-muted mb-1 text-[11px] font-bold uppercase tracking-wide">Your link</div>
                    <div className="flex items-center gap-2">
                      <input
                        data-testid="share-url"
                        readOnly
                        value={shareUrl}
                        onFocus={(e) => e.currentTarget.select()}
                        className="bsx-card min-w-0 flex-1 rounded-lg px-2 py-1.5 text-[12px] font-mono"
                      />
                      <button
                        type="button"
                        data-testid="share-copy"
                        onClick={copy}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-sky px-2.5 py-1.5 text-[12px] font-bold text-white"
                      >
                        {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div data-testid="share-stats" className="bsx-dim inline-flex items-center gap-1.5 text-[12px] font-semibold">
                    <Gamepad2 size={14} aria-hidden className="text-brand-mint" />
                    {plays} {plays === 1 ? 'play' : 'plays'}
                  </div>

                  <button
                    type="button"
                    data-testid="share-revoke"
                    className="bsx-confirm-cancel w-full"
                    onClick={() => revoke.mutate(shareId)}
                    disabled={revoke.isPending}
                  >
                    {revoke.isPending ? 'Turning off…' : 'Turn off this link'}
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
