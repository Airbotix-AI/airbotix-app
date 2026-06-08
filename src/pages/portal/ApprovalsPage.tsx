import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWsEvent } from '@/lib/useWsEvent';

import { useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';
import {
  approveShareLink,
  listFamilyShareLinks,
  revokeShareLink,
  type FamilyShareLink,
} from '@/pages/learn/playground/sharingApi';

interface Approval {
  id: string;
  type: string;
  status: 'pending' | 'granted' | 'denied' | 'expired';
  payload: Record<string, unknown>;
  kid_id: string;
  created_at: string;
  expires_at: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  extra_stars: 'Extra Stars',
  public_share: 'Public share',
  always_allow_command: 'Always-allow tool',
  add_kid_profile: 'Add kid profile',
  topic_limit_change: 'Topic limit change',
};

const STATUS_STICKER: Record<string, string> = {
  pending: 'sunshine',
  granted: 'mint',
  denied: 'coral',
  expired: 'sky',
};

export function ApprovalsPage() {
  const me = useMe();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;
  const qc = useQueryClient();
  useWsEvent('approval.new', () => { qc.invalidateQueries({ queryKey: ['approvals', familyId] }); }, [familyId]);
  useWsEvent('approval.resolved', () => { qc.invalidateQueries({ queryKey: ['approvals', familyId] }); qc.invalidateQueries({ queryKey: ['wallet', familyId] }); }, [familyId]);

  const approvals = useQuery<Approval[]>({
    queryKey: ['approvals', familyId],
    queryFn: () => api<Approval[]>(`/families/${familyId}/approvals`),
    enabled: !!familyId,
  });

  if (!familyId) {
    return (
      <div>
        <div className="eyebrow">Approvals</div>
        <h1 className="section-heading">Set up your family first</h1>
        <Link to="/portal/register" className="btn-pill-primary mt-6">Start setup →</Link>
      </div>
    );
  }

  const pending = approvals.data?.filter((a) => a.status === 'pending') ?? [];
  const resolved = approvals.data?.filter((a) => a.status !== 'pending') ?? [];

  return (
    <div>
      <div className="mb-8">
        <div className="eyebrow eyebrow-bubblegum">Approvals</div>
        <h1 className="section-heading">What your kid is asking for</h1>
        <p className="lead-text mt-2" style={{ fontSize: '15px' }}>
          Hit cap? Wants to share publicly? You decide.
        </p>
      </div>

      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[18px] font-bold text-ink">Waiting for you</h2>
          {pending.length > 0 && <span className="sticker-sunshine">{pending.length}</span>}
        </div>

        {approvals.isLoading ? (
          <p className="lead-text">Loading…</p>
        ) : pending.length === 0 ? (
          <div className="card-base text-center">
            <span className="sticker-mint">All caught up</span>
            <p className="lead-text mt-4">Nothing waiting for your decision.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((a) => (
              <ApprovalCard key={a.id} approval={a} familyId={familyId} />
            ))}
          </div>
        )}
      </section>

      <ShareLinkRequests familyId={familyId} />

      {resolved.length > 0 && (
        <section>
          <h2 className="text-[18px] font-bold text-ink mb-4">Recently resolved</h2>
          <div className="space-y-3">
            {resolved.slice(0, 10).map((a) => (
              <ApprovalCard key={a.id} approval={a} familyId={familyId} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ApprovalCard({
  approval,
  familyId,
  compact = false,
}: {
  approval: Approval;
  familyId: string;
  compact?: boolean;
}) {
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const grantMut = useMutation({
    mutationFn: () => api(`/approvals/${approval.id}/grant`, { method: 'POST', body: {} }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals', familyId] });
      qc.invalidateQueries({ queryKey: ['wallet', familyId] });
    },
    onError: (e: unknown) =>
      setActionError(e instanceof ApiError ? e.message : 'Could not grant.'),
  });
  const denyMut = useMutation({
    mutationFn: () => api(`/approvals/${approval.id}/deny`, { method: 'POST', body: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals', familyId] }),
    onError: (e: unknown) =>
      setActionError(e instanceof ApiError ? e.message : 'Could not deny.'),
  });
  const busy = grantMut.isPending || denyMut.isPending;

  const sticker = STATUS_STICKER[approval.status] ?? 'sky';
  const label = TYPE_LABEL[approval.type] ?? approval.type;
  const payloadText = formatPayload(approval.type, approval.payload);

  return (
    <div className={compact ? 'card-base py-4' : 'card-base'}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`sticker-${sticker}`}>{approval.status}</span>
            <span className="text-[14px] font-bold text-ink">{label}</span>
          </div>
          {payloadText && (
            <p className="text-[14px] text-ink-soft mt-3">{payloadText}</p>
          )}
          <p className="text-[12px] text-slate2 mt-2">
            {new Date(approval.created_at).toLocaleString()}
            {approval.expires_at && ` · expires ${new Date(approval.expires_at).toLocaleString()}`}
          </p>
          {actionError && (
            <div className="mt-3 rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-2 text-[12px] font-medium text-ink">
              {actionError}
            </div>
          )}
        </div>
        {approval.status === 'pending' && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => grantMut.mutate()}
              disabled={busy}
              className="btn-pill-primary disabled:opacity-60"
            >
              {grantMut.isPending ? '…' : 'Grant'}
            </button>
            <button
              onClick={() => denyMut.mutate()}
              disabled={busy}
              className="btn-pill-secondary disabled:opacity-60"
            >
              {denyMut.isPending ? '…' : 'Deny'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Game share-link requests (J8 / D-GAME10a) ──────────────────────────────
// A kid asked to make an external "send-it-to-grandma" play-link; approving here
// mints it (freezes a PII-stripped snapshot), declining cancels the request.
function ShareLinkRequests({ familyId }: { familyId: string }) {
  const qc = useQueryClient();
  const links = useQuery<FamilyShareLink[]>({
    queryKey: ['share-requests', familyId],
    queryFn: () => listFamilyShareLinks(familyId),
    enabled: !!familyId,
  });
  useWsEvent('approval.new', () => qc.invalidateQueries({ queryKey: ['share-requests', familyId] }), [familyId]);

  const items = links.data ?? [];
  if (items.length === 0) return null;
  const pendingCount = items.filter((s) => s.status === 'pending').length;

  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[18px] font-bold text-ink">Game share links</h2>
        {pendingCount > 0 && <span className="sticker-sunshine">{pendingCount} to review</span>}
      </div>
      <p className="lead-text mb-4" style={{ fontSize: '14px' }}>
        Links let others play your kid's game — no login. Approve a request to make a link, see how
        many people opened and played it, and turn any link off whenever you want.
      </p>
      <div className="space-y-4">
        {items.map((s) => (
          <ShareLinkCard key={s.share_id} link={s} familyId={familyId} />
        ))}
      </div>
    </section>
  );
}

function ShareLinkCard({ link, familyId }: { link: FamilyShareLink; familyId: string }) {
  const qc = useQueryClient();
  const [err, setErr] = useState<string | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['share-requests', familyId] });
    qc.invalidateQueries({ queryKey: ['share', link.project_id] });
  };
  const approve = useMutation({
    mutationFn: () => approveShareLink(link.project_id),
    onSuccess: refresh,
    onError: (e: unknown) => setErr(e instanceof ApiError ? e.message : 'Could not approve.'),
  });
  const remove = useMutation({
    mutationFn: () => revokeShareLink(link.share_id),
    onSuccess: refresh,
    onError: (e: unknown) => setErr(e instanceof ApiError ? e.message : 'Could not update.'),
  });
  const busy = approve.isPending || remove.isPending;
  const isPending = link.status === 'pending';

  return (
    <div className="card-base" data-testid="share-request-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={isPending ? 'sticker-sunshine' : 'sticker-mint'}>
              {isPending ? 'waiting for you' : 'link is on'}
            </span>
            <span className="text-[14px] font-bold text-ink truncate">{link.project_title}</span>
          </div>
          {!isPending && (
            <p className="text-[13px] text-ink-soft mt-2">
              👀 {link.opens} opened · 🎮 {link.plays} played
            </p>
          )}
          <p className="text-[12px] text-slate2 mt-2">
            {isPending ? 'Asked' : 'Created'} {new Date(link.requested_at).toLocaleString()}
          </p>
          {err && (
            <div className="mt-3 rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-2 text-[12px] font-medium text-ink">
              {err}
            </div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {isPending ? (
            <>
              <button
                data-testid="share-request-approve"
                onClick={() => approve.mutate()}
                disabled={busy}
                className="btn-pill-primary disabled:opacity-60"
              >
                {approve.isPending ? '…' : 'Make link'}
              </button>
              <button
                onClick={() => remove.mutate()}
                disabled={busy}
                className="btn-pill-secondary disabled:opacity-60"
              >
                {remove.isPending ? '…' : 'Decline'}
              </button>
            </>
          ) : (
            <button
              data-testid="share-link-revoke"
              onClick={() => remove.mutate()}
              disabled={busy}
              className="btn-pill-secondary disabled:opacity-60"
            >
              {remove.isPending ? '…' : 'Turn off'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatPayload(type: string, payload: Record<string, unknown>): string {
  switch (type) {
    case 'extra_stars':
      return `Needs ${payload.amount ?? '?'} extra Stars${payload.reason ? ` for ${payload.reason}` : ''}`;
    case 'public_share':
      return `Wants to share project publicly: ${payload.title ?? payload.project_id ?? ''}`;
    case 'topic_limit_change':
      return `Wants topic limit "${payload.topic ?? '?'}" changed`;
    default:
      return JSON.stringify(payload);
  }
}
