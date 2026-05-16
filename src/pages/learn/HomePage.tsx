import { Link } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';

export function HomePage() {
  const me = useMe();
  const nickname = me.data?.kind === 'kid' ? me.data.nickname : 'friend';

  return (
    <div>
      <div className="mb-12">
        <div className="eyebrow eyebrow-bubblegum">Today</div>
        <h1 className="hero-display">
          Hi {nickname}!
        </h1>
        <p className="lead-text mt-4">
          What do you want to make today?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/learn/missions" className="pack-card coral block">
          <span className="pack-blob" />
          <div className="relative">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">
              Missions
            </div>
            <div className="mt-4 text-[28px] font-bold leading-tight">
              Start a mission
            </div>
            <div className="mt-2 text-[14px] opacity-90">
              Step-by-step adventures. Earn Stars by finishing.
            </div>
            <div className="mt-8 inline-block rounded-full bg-canvas-pure/25 backdrop-blur px-4 py-2 text-[12px] font-bold uppercase tracking-[0.10em]">
              Browse →
            </div>
          </div>
        </Link>

        <Link to="/learn/projects" className="pack-card sky block">
          <span className="pack-blob" />
          <div className="relative">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">
              My stuff
            </div>
            <div className="mt-4 text-[28px] font-bold leading-tight">
              Open a project
            </div>
            <div className="mt-2 text-[14px] opacity-90">
              Keep building what you started yesterday.
            </div>
            <div className="mt-8 inline-block rounded-full bg-canvas-pure/25 backdrop-blur px-4 py-2 text-[12px] font-bold uppercase tracking-[0.10em]">
              See projects →
            </div>
          </div>
        </Link>

        <Link to="/learn/projects/new" className="pack-card mint block">
          <span className="pack-blob" />
          <div className="relative">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">
              New
            </div>
            <div className="mt-4 text-[28px] font-bold leading-tight">
              Make from scratch
            </div>
            <div className="mt-2 text-[14px] opacity-90">
              Free play. Just an idea and AI to help.
            </div>
            <div className="mt-8 inline-block rounded-full bg-canvas-pure/25 backdrop-blur px-4 py-2 text-[12px] font-bold uppercase tracking-[0.10em]">
              Start →
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-12 card-base">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow eyebrow-sky">Class wall</div>
            <h2 className="section-heading" style={{ fontSize: '24px' }}>
              See what your friends made
            </h2>
            <p className="lead-text mt-2" style={{ fontSize: '15px' }}>
              Visit the class wall to vote and remix.
            </p>
          </div>
          <Link to="/learn/wall" className="btn-pill-secondary">
            Open →
          </Link>
        </div>
      </div>
    </div>
  );
}
