import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getShareLink,
  requestShareLink,
  revokeShareLink,
  setShareHandle,
  type ShareLink,
} from './sharingApi';

interface ShareLinkPanelProps {
  /** The real backend project (no share UI for the DEV local scaffold). */
  projectId: string;
}

/**
 * The external share-link control (learn-game-studio-prd.md §17.8 J8 / D-GAME10).
 * Lives in the studio. The kid asks for a "send-it-to-grandma" link; minting
 * REQUIRES parent approval, so the first state after asking is a parent-approval
 * PENDING beat (no URL yet, with the digital-citizenship reminder). Once a parent
 * approves and the frozen snapshot passes the safety + PII scan, the backend mints
 * an unlisted capability URL — shown here as a copyable link, with an
 * anonymized-handle toggle (OD-7) and a revoke control (kid or parent → 410).
 *
 * This component owns NO play surface; it just produces/manages the link. The
 * public play page (`/play/:shareId`) is the only place a snapshot actually plays.
 */
export function ShareLinkPanel({ projectId }: ShareLinkPanelProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const share = useQuery<ShareLink>({
    queryKey: ['share', projectId],
    queryFn: () => getShareLink(projectId),
    enabled: open,
    // The parent may approve out-of-band (Portal), so re-opening the panel must
    // re-check the server rather than trust a stale `pending`/`none` snapshot.
    refetchOnMount: 'always',
    staleTime: 0,
  });

  // Re-check the share state every time the panel is opened (the parent may have
  // approved since it was last closed).
  const openPanel = () => {
    setOpen((v) => {
      const next = !v;
      if (next) share.refetch();
      return next;
    });
  };

  const set = (data: ShareLink) => qc.setQueryData(['share', projectId], data);

  const request = useMutation({
    mutationFn: () => requestShareLink(projectId),
    onSuccess: set,
  });
  const toggleHandle = useMutation({
    mutationFn: (showHandle: boolean) => setShareHandle({ projectId, showHandle }),
    onSuccess: set,
  });
  const revoke = useMutation({
    mutationFn: (shareId: string) => revokeShareLink(shareId),
    onSuccess: () => set({ status: 'none' }),
  });

  const status = share.data?.status ?? 'none';
  const shareId = share.data?.shareId;
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

  return (
    <div className="relative">
      <button
        type="button"
        data-testid="share-link-btn"
        onClick={openPanel}
        className="inline-flex items-center gap-1.5 rounded-full bg-pg-text/10 px-3 py-1 text-[12px] font-bold text-pg-text hover:bg-pg-text/20 transition-colors"
      >
        🔗 Share link
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-pg-border bg-pg-desktop p-4 text-pg-text shadow-xl z-50">
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
            <div
              data-testid="share-approval-pending"
              className="rounded-xl bg-wash-sunshine px-3 py-3 text-[13px] font-semibold text-ink"
            >
              🕊 Asking your grown-up… your link appears here once they say yes.
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
                    className="shrink-0 rounded-lg bg-brand-sky px-2.5 py-1.5 text-[12px] font-bold text-white hover:opacity-90"
                  >
                    {copied ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-[12px] font-semibold text-pg-text-dim">
                <input
                  type="checkbox"
                  data-testid="share-handle-toggle"
                  checked={share.data?.show_handle ?? false}
                  onChange={(e) => toggleHandle.mutate(e.target.checked)}
                  disabled={toggleHandle.isPending}
                />
                Show my display handle (no real name)
              </label>

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
        </div>
      )}
    </div>
  );
}
