import { Link } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { SHOW_LESSONS_CATALOG } from '@/lib/features';
import { LIVE_CREATE_TOOLS } from './create/createTools';
import { WelcomeModal } from './WelcomeModal';

export function HomePage() {
  const me = useMe();
  const nickname = me.data?.kind === 'kid' ? me.data.nickname : 'friend';

  return (
    <div>
      <WelcomeModal nickname={typeof nickname === 'string' ? nickname : 'friend'} />
      <div className="mb-12">
        <div className="eyebrow eyebrow-bubblegum">Today</div>
        <h1 className="hero-display">Hi {nickname}!</h1>
        <p className="lead-text mt-4">What do you want to make today?</p>
      </div>

      <section data-testid="home-studio-grid">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <div className="eyebrow eyebrow-mint">Your creative studios</div>
            <h2 className="section-heading mt-1" style={{ fontSize: '28px' }}>
              Pick one and start making
            </h2>
          </div>
          <Link to="/learn/create" className="btn-pill-secondary shrink-0">
            All tools →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {LIVE_CREATE_TOOLS.map((studio) => (
            <Link
              key={studio.id}
              to={studio.to}
              className={`pack-card ${studio.color} block`}
              data-testid={`home-${studio.id}`}
            >
              <span className="pack-blob" />
              <div className="relative">
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">
                  {studio.discoveryLabel}
                </div>
                <div className="mt-3 text-[28px] font-bold leading-tight">
                  {studio.emoji} {studio.title}
                </div>
                <div className="mt-2 max-w-xl text-[14px] opacity-90">{studio.desc}</div>
                <div className="mt-6 inline-block rounded-full bg-canvas-pure/25 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.10em] backdrop-blur">
                  Open {studio.title} →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {SHOW_LESSONS_CATALOG && (
          <Link
            to="/learn/missions"
            className="pack-card bubblegum block"
            data-testid="home-courses"
          >
            <span className="pack-blob" />
            <div className="relative">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">
                Courses
              </div>
              <div className="mt-4 text-[24px] font-bold leading-tight">🚀 Guided courses</div>
              <div className="mt-2 text-[14px] opacity-90">
                Follow step-by-step lessons chosen for your age and see what success looks like.
              </div>
              <div className="mt-6 inline-block rounded-full bg-canvas-pure/25 backdrop-blur px-4 py-2 text-[12px] font-bold uppercase tracking-[0.10em]">
                Browse courses →
              </div>
            </div>
          </Link>
        )}

        <Link to="/learn/exams" className="pack-card coral block" data-testid="home-academy">
          <span className="pack-blob" />
          <div className="relative">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">
              Airbotix Academy
            </div>
            <div className="mt-4 text-[24px] font-bold leading-tight">🎯 My Exam Prep</div>
            <div className="mt-2 text-[14px] opacity-90">
              Open only the exam products unlocked for you. Your exam and year stay fixed.
            </div>
            <div className="mt-6 inline-block rounded-full bg-canvas-pure/25 backdrop-blur px-4 py-2 text-[12px] font-bold uppercase tracking-[0.10em]">
              Open my exams →
            </div>
          </div>
        </Link>

        <Link to="/learn/workspace" className="pack-card coral block">
          <span className="pack-blob" />
          <div className="relative">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">
              AI workspace
            </div>
            <div className="mt-4 text-[24px] font-bold leading-tight">💬 Continue a session</div>
            <div className="mt-2 text-[14px] opacity-90">
              Continue a chat, music, or code session you already started.
            </div>
            <div className="mt-6 inline-block rounded-full bg-canvas-pure/25 backdrop-blur px-4 py-2 text-[12px] font-bold uppercase tracking-[0.10em]">
              Open workspace →
            </div>
          </div>
        </Link>

        <Link to="/learn/projects" className="pack-card mint block">
          <span className="pack-blob" />
          <div className="relative">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">
              Projects
            </div>
            <div className="mt-4 text-[24px] font-bold leading-tight">📁 Your stuff</div>
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
