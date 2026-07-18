import { Link } from 'react-router-dom';

import { useKidWallet } from './shared/useStudio';
import { CREATE_TOOLS as STUDIOS } from './createTools';

export function CreateHubPage() {
  const wallet = useKidWallet();

  return (
    <div>
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <div className="eyebrow eyebrow-bubblegum">Create</div>
          <h1 className="hero-display">
            What do you want to <span className="squiggle-word">make</span>?
          </h1>
          <p className="lead-text mt-4">Pick a tool. Each AI helper has its own studio.</p>
          <p className="mt-2 text-[13px] font-semibold text-slate2">
            🔒 Personal — only you can see what you make here. To make work for a class, open the
            class and tap “Create for this class”.
          </p>
        </div>
        {wallet.data && (
          <div className="text-right shrink-0">
            <div className="text-[24px] font-bold tabular-nums text-brand-mint">
              {wallet.data.stars_balance}★
            </div>
            <div className="text-[11px] uppercase tracking-[0.10em] text-slate2 font-bold">
              left to spend
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
        {STUDIOS.filter((s) => !s.comingSoon).map((s) => (
          <Link key={s.to} to={s.to} className={`pack-card ${s.color} block`}>
            <span className="pack-blob" />
            <div className="relative">
              <div className="text-[40px]">{s.emoji}</div>
              <h2 className="mt-3 text-[26px] font-bold leading-tight">{s.title}</h2>
              <p className="mt-2 text-[14px] opacity-90">{s.desc}</p>
              <div className="mt-8 flex items-center justify-between">
                <span className="rounded-full bg-canvas-pure/25 backdrop-blur px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.10em]">
                  {s.cost === 0 ? 'Free — no stars' : `${s.cost}★ per make`}
                </span>
                <span className="rounded-full bg-canvas-pure/25 backdrop-blur px-4 py-2 text-[12px] font-bold uppercase tracking-[0.10em]">
                  Open →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Paused studios: visible so kids know what's cooking, but NOT clickable —
          quality isn't there yet (learn PRD v0.7). No cost chip, no Open button. */}
      <div className="mb-10" data-testid="coming-soon-studios">
        <div className="eyebrow eyebrow-sunshine">Coming soon</div>
        <h2 className="text-[20px] font-bold text-ink mt-1 mb-4">
          New studios are in the workshop 🔧
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STUDIOS.filter((s) => s.comingSoon).map((s) => (
            <div
              key={s.to}
              data-testid={`coming-soon-${s.title.toLowerCase().replace(/\s+/g, '-')}`}
              className="card-base relative overflow-hidden opacity-70 saturate-50 select-none"
              aria-disabled="true"
            >
              <div className="text-[32px]">{s.emoji}</div>
              <h3 className="mt-2 text-[18px] font-bold leading-tight text-ink">{s.title}</h3>
              <p className="mt-1 text-[13px] text-slate2">{s.desc}</p>
              <span className="sticker-sunshine mt-4 inline-block">Coming soon</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card-base">
        <div className="eyebrow eyebrow-sky">Tip</div>
        <h3 className="text-[18px] font-bold text-ink mt-1">
          Every tool teaches a different skill
        </h3>
        <p className="lead-text mt-2" style={{ fontSize: '15px' }}>
          🧩 Sequencing & story logic · 💻 Real code & prompt-craft · 🎵 Music theory & mood
        </p>
      </div>
    </div>
  );
}
