import { type ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { KidLoginHelper } from './KidLoginHelper';
import { useOnboardingState } from './useOnboardingState';
import type { OnboardingItemId } from './onboardingState';

interface FamilyData {
  id: string;
  name: string;
  code: string;
}

/** A single checklist row. */
function Row({
  done,
  label,
  sub,
  optional,
  action,
}: {
  done: boolean;
  label: ReactNode;
  sub?: ReactNode;
  optional?: boolean;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex items-start gap-3">
        {done ? (
          <span
            role="img"
            aria-label="Completed"
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-mint text-white"
          >
            <Check size={15} strokeWidth={3} />
          </span>
        ) : (
          <span
            role="img"
            aria-label="Not done yet"
            className="mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 border-hairline"
          />
        )}
        <div>
          <div className={`text-[15px] font-semibold ${done ? 'text-slate2 line-through' : 'text-ink'}`}>
            {label}
            {optional && <span className="ml-2 text-[12px] font-medium text-slate2">optional</span>}
          </div>
          {sub && !done && <div className="mt-0.5 text-[13px] text-slate2">{sub}</div>}
        </div>
      </div>
      {!done && action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/**
 * Persistent, data-driven getting-started checklist at the top of the Dashboard
 * (parent-portal-onboarding-prd §5). Self-gates: renders nothing until core
 * queries settle, on the no-family empty state, or once dismissed. Collapses to
 * an "All set" line once the two core steps (login + Stars) are done.
 */
export function GettingStartedCard() {
  const ob = useOnboardingState();
  const [helperOpen, setHelperOpen] = useState(false);

  // Family code is only needed for the kid-login helper → fetch lazily on open.
  const family = useQuery<FamilyData>({
    queryKey: ['family', ob.familyId],
    queryFn: () => api<FamilyData>(`/families/${ob.familyId}`),
    enabled: helperOpen && ob.hasFamily,
  });

  if (!ob.isReady || !ob.hasFamily || ob.checklistDismissed) return null;

  const openHelper = () => setHelperOpen(true);
  const closeHelper = () => {
    setHelperOpen(false);
    ob.markKidLoginShown(); // viewing the helper marks "log kid in" done (D-ONB2-05)
  };

  // The helper renders in BOTH card variants — never gate it behind the collapse,
  // or marking kidLoginShown could flip coreComplete and unmount the modal the
  // parent just opened.
  const helper = helperOpen ? (
    <KidLoginHelper familyCode={family.data?.code ?? ''} kidName={ob.kidName} onClose={closeHelper} />
  ) : null;

  // Once core is complete, collapse to a celebratory dismissible line.
  if (ob.state.coreComplete) {
    return (
      <>
        <div className="card-base mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[28px]" aria-hidden="true">
              🎉
            </span>
            <div>
              <div className="text-[16px] font-bold text-ink">All set!</div>
              <div className="text-[13px] text-slate2">{ob.kidName} is ready to create.</div>
            </div>
          </div>
          <button onClick={ob.dismissChecklist} className="btn-pill-ghost">
            Hide this
          </button>
        </div>
        {helper}
      </>
    );
  }

  const labels: Record<OnboardingItemId, { label: ReactNode; sub?: ReactNode; action?: ReactNode }> = {
    familySetup: { label: 'Your family is set up' },
    kidAdded: { label: `${ob.kidName} is added` },
    kidLogin: {
      label: `Log ${ob.kidName} in on their device`,
      action: (
        <button onClick={openHelper} className="btn-pill-secondary">
          Show me how →
        </button>
      ),
    },
    addStars: {
      label: `Add Stars so ${ob.kidName} can create`,
      sub: `Stars are ${ob.kidName}'s AI allowance.`,
      action: (
        <Link to="/portal/wallet/topup" className="btn-pill-primary">
          Add Stars →
        </Link>
      ),
    },
    setLimits: {
      label: 'Set daily spending limits',
      action: (
        <Link to="/portal/wallet/auto-topup" onClick={ob.markLimitsReviewed} className="btn-pill-secondary">
          Set limits →
        </Link>
      ),
    },
  };

  return (
    <>
      <div className="card-base mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="sticker-mint">Getting started</span>
            <h2 className="section-heading mt-4" style={{ fontSize: '24px' }}>
              You&apos;re almost ready 🎉
            </h2>
            <p className="lead-text mt-2" style={{ fontSize: '15px' }}>
              A couple of quick steps and {ob.kidName} can start creating.
            </p>
          </div>
          <button onClick={ob.dismissChecklist} className="btn-pill-ghost shrink-0">
            Hide
          </button>
        </div>

        <div className="mt-4 divide-y divide-hairline">
          {ob.state.items.map((item) => {
            const cfg = labels[item.id];
            return (
              <Row
                key={item.id}
                done={item.done}
                label={cfg.label}
                sub={cfg.sub}
                optional={item.optional}
                action={cfg.action}
              />
            );
          })}
        </div>
      </div>

      {helper}
    </>
  );
}
