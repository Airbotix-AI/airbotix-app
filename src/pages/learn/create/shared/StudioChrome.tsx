import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { useKidWallet } from './useStudio';

interface StudioChromeProps {
  eyebrow: string;
  eyebrowColor?: string;
  emoji: string;
  title: string;
  subtitle: string;
  cost: number;
  children: ReactNode;
}

export function StudioChrome({
  eyebrow,
  eyebrowColor = 'eyebrow',
  emoji,
  title,
  subtitle,
  cost,
  children,
}: StudioChromeProps) {
  const wallet = useKidWallet();
  const balance = wallet.data?.stars_balance ?? 0;
  const canAfford = balance >= cost;

  return (
    <div>
      <Link to="/learn/create" className="btn-pill-ghost mb-4 -ml-3">← All tools</Link>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className={`eyebrow ${eyebrowColor}`}>{eyebrow}</div>
          <h1 className="hero-display">
            {emoji} {title}
          </h1>
          <p className="lead-text mt-3" style={{ fontSize: '16px' }}>
            {subtitle}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-[14px] font-bold tabular-nums ${canAfford ? 'text-brand-mint' : 'text-brand-coral'}`}>
            {balance}★
          </div>
          <div className="text-[11px] uppercase tracking-[0.10em] text-slate2 font-bold">cost {cost}★</div>
        </div>
      </div>

      {children}

      {!canAfford && (
        <div className="rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 mt-6 text-[13px] font-medium text-ink">
          Out of Stars! Ask a parent to top up before making more.
        </div>
      )}
    </div>
  );
}
