import { Link } from 'react-router-dom';

import { KidCharacterSticker } from '@/components/KidCharacterSticker';
import { useKidWallet } from './shared/useStudio';
import { CREATE_TOOLS as STUDIOS } from './createTools';
import { STUDIO_CHARACTERS } from './studioCharacters';

export function CreateHubPage() {
  const wallet = useKidWallet();

  return (
    <div>
      <div className="mb-10 grid grid-cols-[minmax(0,1fr)_104px] items-center gap-3 overflow-hidden rounded-hero bg-wash-mint px-6 py-6 shadow-card-soft sm:grid-cols-[minmax(0,1fr)_180px] sm:px-8">
        <div className="relative z-10 min-w-0">
          <div className="eyebrow eyebrow-bubblegum">Create</div>
          <h1 className="hero-display">
            What do you want to <span className="squiggle-word">make</span>?
          </h1>
          <p className="lead-text mt-4">Pick a tool. Each AI helper has its own studio.</p>
          <p className="mt-2 text-[13px] font-semibold text-slate2">
            🔒 Personal — only you can see what you make here. To make work for a class, open the
            class and tap “Create for this class”.
          </p>
          {wallet.data && (
            <div className="mt-5 inline-block rounded-2xl bg-canvas-pure/70 px-4 py-3">
              <div className="text-[24px] font-bold tabular-nums text-brand-mint">
                {wallet.data.stars_balance}★
              </div>
              <div className="text-[11px] uppercase tracking-[0.10em] text-slate2 font-bold">
                left to spend
              </div>
            </div>
          )}
        </div>
        <KidCharacterSticker
          character="airo-building"
          className="-my-7 -mr-4 w-32 justify-self-end rotate-[2deg] sm:-my-10 sm:w-48"
          priority
          testId="create-hub-character"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
        {STUDIOS.filter((s) => !s.comingSoon).map((s) => {
          const character = STUDIO_CHARACTERS[s.id];
          return (
            <Link
              key={s.to}
              to={s.to}
              className={`pack-card ${s.color} relative block overflow-hidden`}
              data-testid={`create-${s.id}`}
            >
              <span className="pack-blob" />
              <div className="relative z-10 pr-24 sm:pr-28">
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">
                  {s.discoveryLabel}
                </div>
                <h2 className="mt-3 text-[26px] font-bold leading-tight">
                  {s.emoji} {s.title}
                </h2>
                <p className="mt-2 text-[14px] opacity-90">{s.desc}</p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-canvas-pure/25 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.10em] backdrop-blur">
                    {s.cost === 0 ? 'Free — no stars' : `${s.cost}★ per make`}
                  </span>
                  <span className="rounded-full bg-canvas-pure/25 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.10em] backdrop-blur sm:ml-auto">
                    Open studio →
                  </span>
                </div>
              </div>
              <KidCharacterSticker
                character={character}
                className="absolute -bottom-4 -right-3 z-0 w-32 rotate-[3deg] sm:w-36"
                testId={`create-${s.id}-character`}
              />
            </Link>
          );
        })}
      </div>

      {/* Paused studios: visible so kids know what's cooking, but NOT clickable —
          quality isn't there yet (learn PRD v0.7). No cost chip, no Open button. */}
      <div className="mb-10" data-testid="coming-soon-studios">
        <div className="eyebrow eyebrow-sunshine">Coming soon</div>
        <h2 className="text-[20px] font-bold text-ink mt-1 mb-4">
          New studios are in the workshop 🔧
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STUDIOS.filter((s) => s.comingSoon).map((s) => {
            const character = STUDIO_CHARACTERS[s.id];
            return (
              <div
                key={s.to}
                data-testid={`coming-soon-${s.title.toLowerCase().replace(/\s+/g, '-')}`}
                className="card-base relative min-h-52 select-none overflow-hidden opacity-75"
                aria-disabled="true"
              >
                <div className="relative z-10 pr-20">
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate2">
                    In the workshop
                  </div>
                  <h3 className="mt-3 text-[18px] font-bold leading-tight text-ink">
                    {s.emoji} {s.title}
                  </h3>
                  <p className="mt-2 text-[13px] text-slate2">{s.desc}</p>
                  <span className="sticker-sunshine mt-5 inline-block">Coming soon</span>
                </div>
                <KidCharacterSticker
                  character={character}
                  className="absolute -bottom-4 -right-4 z-0 w-28 rotate-[4deg] grayscale-[20%]"
                  testId={`coming-soon-${s.id}-character`}
                />
              </div>
            );
          })}
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
