import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { KidCharacterSticker } from '@/components/KidCharacterSticker';
import { SHOW_LESSONS_CATALOG } from '@/lib/features';
import {
  MY_CHALLENGES_QUERY_KEY,
  listMyChallenges,
  type MyChallengeEntry,
} from './challenge/challengesMineApi';
import { LIVE_CREATE_TOOLS } from './create/createTools';
import { STUDIO_CHARACTERS } from './create/studioCharacters';
import { WelcomeModal } from './WelcomeModal';

export function HomePage() {
  const me = useMe();
  const nickname = me.data?.kind === 'kid' ? me.data.nickname : 'friend';
  // Walk-in kids DO get an ephemeral family and wallet, so "no family" is not the
  // discriminator — `is_ephemeral` is, consistent with `WALK_IN_NAV_ITEMS`. A
  // walk-in cannot have a paid entry, so they never ask.
  const isEnterableKid = me.data?.kind === 'kid' && me.data.is_ephemeral !== true;
  // The child's own entries (entrant-onboarding-prd §10 / execution plan PR 8).
  // `retry: false` because this runs on EVERY home render: one bad edition must
  // not turn the kid home into a retry storm. A failure renders nothing at all —
  // never a spinner and never an error card on a child's home screen.
  const challenges = useQuery<MyChallengeEntry[]>({
    queryKey: MY_CHALLENGES_QUERY_KEY,
    queryFn: listMyChallenges,
    enabled: isEnterableKid,
    retry: false,
  });
  const challenge: MyChallengeEntry | null = challenges.data?.[0] ?? null;

  return (
    <div>
      <WelcomeModal nickname={typeof nickname === 'string' ? nickname : 'friend'} />
      <div className="mb-12 grid grid-cols-[minmax(0,1fr)_112px] items-center overflow-hidden rounded-hero bg-wash-sunshine px-6 py-5 shadow-card-soft sm:grid-cols-[minmax(0,1fr)_180px] sm:px-9 sm:py-7">
        <div className="relative z-10 min-w-0">
          <div className="eyebrow eyebrow-bubblegum">Today</div>
          <h1 className="hero-display">Hi {nickname}!</h1>
          <p className="lead-text mt-4">What do you want to make today?</p>
        </div>
        <KidCharacterSticker
          character="lumi-welcome"
          className="-my-8 -mr-5 w-36 justify-self-end rotate-[3deg] drop-shadow-lg sm:-my-12 sm:w-52"
          priority
          testId="learn-home-character"
        />
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
          {LIVE_CREATE_TOOLS.map((studio) => {
            const character = STUDIO_CHARACTERS[studio.id];
            return (
              <Link
                key={studio.id}
                to={studio.to}
                className={`pack-card ${studio.color} block`}
                data-testid={`home-${studio.id}`}
              >
                <span className="pack-blob" />
                <div className="relative z-10 pr-20 sm:pr-28">
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
                <KidCharacterSticker
                  character={character}
                  className="absolute -bottom-4 -right-3 z-0 w-32 rotate-[3deg] drop-shadow-md sm:w-36"
                  testId={`home-${studio.id}-character`}
                />
              </Link>
            );
          })}
        </div>
      </section>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Creative Code Challenge (entrant-onboarding-prd §10): the child's own
            way back into their challenge. Deliberately hand-written HERE and NOT
            in `createTools.ts` — that registry is shared with the Create hub, the
            class create sheet and the parent-facing Creative Spaces panel, and
            every entry in it must be a project-creating studio with a project
            kind and a Stars cost. A challenge is neither. */}
        {challenge && (
          <Link
            to={`/learn/challenge/${encodeURIComponent(challenge.slug)}/submit`}
            className="pack-card sunshine relative block overflow-hidden"
            data-testid="home-my-challenge"
          >
            <span className="pack-blob" />
            <div className="relative z-10 pr-24 sm:pr-28">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">
                Creative Code Challenge
              </div>
              {/* The edition's OWN name — no challenge name is authored here. */}
              <div className="mt-4 text-[24px] font-bold leading-tight">
                🏆 {challenge.name}
              </div>
              <div className="mt-2 text-[14px] opacity-90">
                You are entered. Keep building, then send your project in from here.
              </div>
              <div className="mt-6 inline-block rounded-full bg-canvas-pure/25 backdrop-blur px-4 py-2 text-[12px] font-bold uppercase tracking-[0.10em]">
                Open my challenge →
              </div>
            </div>
            <KidCharacterSticker
              character="bix-celebrating"
              className="absolute -bottom-4 -right-3 z-0 w-32 rotate-[4deg] sm:w-36"
              testId="home-challenge-character"
            />
          </Link>
        )}

        {SHOW_LESSONS_CATALOG && (
          <Link
            to="/learn/missions"
            className="pack-card bubblegum relative block overflow-hidden"
            data-testid="home-courses"
          >
            <span className="pack-blob" />
            <div className="relative z-10 pr-24 sm:pr-28">
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
            <KidCharacterSticker
              character="tuantuan-thinking"
              className="absolute -bottom-4 -right-3 z-0 w-32 -rotate-[3deg] sm:w-36"
              testId="home-courses-character"
            />
          </Link>
        )}

        <Link
          to="/learn/exams"
          className="pack-card coral relative block overflow-hidden"
          data-testid="home-academy"
        >
          <span className="pack-blob" />
          <div className="relative z-10 pr-24 sm:pr-28">
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
          <KidCharacterSticker
            character="tuantuan"
            className="absolute -bottom-4 -right-3 z-0 w-32 rotate-[3deg] sm:w-36"
            testId="home-academy-character"
          />
        </Link>

        <Link
          to="/learn/workspace"
          className="pack-card coral relative block overflow-hidden"
          data-testid="home-workspace"
        >
          <span className="pack-blob" />
          <div className="relative z-10 pr-24 sm:pr-28">
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
          <KidCharacterSticker
            character="bix"
            className="absolute -bottom-4 -right-3 z-0 w-32 rotate-[3deg] sm:w-36"
            testId="home-workspace-character"
          />
        </Link>

        <Link
          to="/learn/projects"
          className="pack-card mint relative block overflow-hidden"
          data-testid="home-projects"
        >
          <span className="pack-blob" />
          <div className="relative z-10 pr-24 sm:pr-28">
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
          <KidCharacterSticker
            character="airo-building"
            className="absolute -bottom-4 -right-2 z-0 w-28 rotate-[3deg] sm:w-32"
            testId="home-projects-character"
          />
        </Link>
      </div>

      <div className="card-base relative mt-12 overflow-hidden" data-testid="home-class-wall">
        <div className="relative z-10 pr-28 sm:pr-40">
          <div>
            <div className="eyebrow eyebrow-sky">Class wall</div>
            <h2 className="section-heading" style={{ fontSize: '24px' }}>
              See what your friends made
            </h2>
            <p className="lead-text mt-2" style={{ fontSize: '15px' }}>
              Visit the class wall to vote and remix.
            </p>
          </div>
          <Link to="/learn/classroom" className="btn-pill-secondary mt-5 inline-block">
            Open →
          </Link>
        </div>
        <KidCharacterSticker
          character="lumi-welcome"
          className="absolute -bottom-5 -right-2 w-32 rotate-[4deg] sm:right-4 sm:w-40"
          testId="home-class-wall-character"
        />
      </div>
    </div>
  );
}
