import { Link } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { WelcomeModal } from './WelcomeModal';

export function HomePage() {
  const me = useMe();
  const nickname = me.data?.kind === 'kid' ? me.data.nickname : 'friend';

  return (
    <div>
      <WelcomeModal nickname={typeof nickname === 'string' ? nickname : 'friend'} />
      <div className="mb-12">
        <div className="eyebrow eyebrow-bubblegum">Today</div>
        <h1 className="hero-display">
          Hi {nickname}!
        </h1>
        <p className="lead-text mt-4">
          What do you want to make today?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Link to="/learn/workspace" className="pack-card coral block sm:col-span-2">
          <span className="pack-blob" />
          <div className="relative">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">
              Your workspace
            </div>
            <div className="mt-3 text-[32px] font-bold leading-tight">
              💬 Continue where you left off
            </div>
            <div className="mt-2 text-[14px] opacity-90 max-w-xl">
              ChatGPT-style workspace. Sessions on the left, chat in the middle, media preview on the right. Pick a tool (chat/image/music/voice/video) and just keep going.
            </div>
            <div className="mt-6 inline-block rounded-full bg-canvas-pure/25 backdrop-blur px-4 py-2 text-[12px] font-bold uppercase tracking-[0.10em]">
              Open →
            </div>
          </div>
        </Link>

        <Link to="/learn/missions" className="pack-card sky block">
          <span className="pack-blob" />
          <div className="relative">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">
              Missions
            </div>
            <div className="mt-4 text-[24px] font-bold leading-tight">
              🚀 Guided lessons
            </div>
            <div className="mt-2 text-[14px] opacity-90">
              Step-by-step missions sorted by your age. Earn Stars by finishing.
            </div>
            <div className="mt-6 inline-block rounded-full bg-canvas-pure/25 backdrop-blur px-4 py-2 text-[12px] font-bold uppercase tracking-[0.10em]">
              Browse →
            </div>
          </div>
        </Link>

        <Link to="/learn/projects" className="pack-card mint block">
          <span className="pack-blob" />
          <div className="relative">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">
              Projects
            </div>
            <div className="mt-4 text-[24px] font-bold leading-tight">
              📁 Your stuff
            </div>
            <div className="mt-2 text-[14px] opacity-90">
              Saved creations + the full gallery of everything you made.
            </div>
            <div className="mt-6 inline-block rounded-full bg-canvas-pure/25 backdrop-blur px-4 py-2 text-[12px] font-bold uppercase tracking-[0.10em]">
              See all →
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
          <Link to="/learn/classroom" className="btn-pill-secondary">
            Open →
          </Link>
        </div>
      </div>
    </div>
  );
}
