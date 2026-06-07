import { type TopupLimitInfo, aud } from './walletTypes';

// Surfaces the backend's `429 TOPUP_*` anti-fraud responses (D-WAL-02,
// parent-portal-prd.md §4.4.2). The backend is the source of truth for the
// limits; this only renders friendly, reassuring copy from the response.

function resetLabel(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

function copyFor(info: TopupLimitInfo): { title: string; body: string } {
  const d = info.details ?? {};
  const used = d.current_aud_cents != null ? aud(d.current_aud_cents) : null;
  const cap = d.limit_aud_cents != null ? aud(d.limit_aud_cents) : null;
  const resets = resetLabel(d.resets_at);
  // Never hardcode the numeric limit — it lives server-side. Fall back to prose.
  const count = d.limit != null ? `${d.limit}` : 'a limited number of';

  switch (info.code) {
    case 'TOPUP_DAILY_LIMIT':
      return {
        title: 'Daily top-up limit reached',
        body:
          `You've topped up ${used ?? 'the maximum'} today` +
          `${cap ? `, which is the daily safety limit (${cap})` : ''}. ` +
          'This protects your card if your account is ever accessed by someone else.' +
          `${resets ? ` Limit resets ${resets}.` : ''}`,
      };
    case 'TOPUP_MONTHLY_LIMIT':
      return {
        title: 'Monthly top-up limit reached',
        body:
          `You've topped up ${used ?? 'the maximum'} this month` +
          `${cap ? `, the monthly safety limit (${cap})` : ''}.` +
          `${resets ? ` Limit resets ${resets}.` : ''}`,
      };
    case 'TOPUP_SINGLE_MAX':
      return {
        title: 'That pack is over the single top-up limit',
        body:
          `${cap ? `The most you can add in one top-up is ${cap}. ` : ''}` +
          'This caps the damage if your card is ever misused.',
      };
    case 'TOPUP_HOURLY_COUNT':
      return {
        title: 'Too many top-ups this hour',
        body:
          `For your card's safety you can make ${count} top-ups per hour.` +
          `${resets ? ` Please try again ${resets}.` : ' Please try again shortly.'}`,
      };
    case 'TOPUP_DAILY_COUNT':
      return {
        title: 'Too many top-ups today',
        body:
          `For your card's safety you can make ${count} top-ups per day.` +
          `${resets ? ` Resets ${resets}.` : ''}`,
      };
    default:
      return { title: 'Top-up limit reached', body: info.message };
  }
}

interface TopupLimitModalProps {
  info: TopupLimitInfo;
  onClose: () => void;
}

export function TopupLimitModal({ info, onClose }: TopupLimitModalProps) {
  const { title, body } = copyFor(info);
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="topup-limit-title"
    >
      <button className="absolute inset-0 bg-ink/40" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-hero bg-canvas-pure p-7 shadow-card-soft">
        <div className="text-[34px] leading-none" aria-hidden>
          ⚠️
        </div>
        <h2 id="topup-limit-title" className="section-heading mt-3 text-[22px]">
          {title}
        </h2>
        <p className="lead-text mt-2 text-[14px]">{body}</p>

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="btn-pill-primary">
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
