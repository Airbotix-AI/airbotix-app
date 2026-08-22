// Journey to the West · Season 1 story map — the kid-facing part list for the
// 50-part chain. Lock state comes from the server (/story-parts): a part is
// tappable only when the API says it is unlocked AND its build has shipped
// (PLAYABLE_PART_IDS). Completing P1 unlocks exactly P2 — chapters never
// unlock wholesale (scene-specs completion contract).

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';

import { JTW_S1_CHAPTERS, JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import {
  JTW_S2_C1_P1_ID,
  JTW_S2_C1_P2_ID,
  JTW_S2_BATCH_PART_IDS,
  JTW_S2_PART_CONFIGS,
  JTW_S2_STORY_LINE_ID,
} from './journeyWestSeason2';
import { fetchStoryLineProgress } from './storyPartsApi';

/** Parts whose product build has shipped. Grows one part per queue task. */
export const PLAYABLE_PART_IDS: ReadonlySet<string> = new Set([
  'jtw-s1-c1-p1',
  'jtw-s1-c1-p2',
  'jtw-s1-c1-p3',
  'jtw-s1-c1-p4',
  'jtw-s1-c1-p5',
  'jtw-s1-c1-p6',
  'jtw-s1-c1-p7',
  'jtw-s1-c1-p8',
  'jtw-s1-c2-p1',
  'jtw-s1-c2-p2',
  'jtw-s1-c2-p3',
  'jtw-s1-c2-p4',
  'jtw-s1-c2-p5',
  'jtw-s1-c2-p6',
  'jtw-s1-c2-p7',
  'jtw-s1-c2-p8',
  'jtw-s1-c3-p1',
  'jtw-s1-c3-p2',
  'jtw-s1-c3-p3',
  'jtw-s1-c3-p4',
  'jtw-s1-c3-p5',
  'jtw-s1-c3-p6',
  'jtw-s1-c3-p7',
  'jtw-s1-c3-p8',
  'jtw-s1-c4-p1',
  'jtw-s1-c4-p2',
  'jtw-s1-c4-p3',
  'jtw-s1-c4-p4',
  'jtw-s1-c4-p5',
  'jtw-s1-c4-p6',
  'jtw-s1-c4-p7',
  'jtw-s1-c4-p8',
  'jtw-s1-c5-p1',
  'jtw-s1-c5-p2',
  'jtw-s1-c5-p3',
  'jtw-s1-c5-p4',
  'jtw-s1-c5-p5',
  'jtw-s1-c5-p6',
  'jtw-s1-c5-p7',
  'jtw-s1-c5-p8',
  'jtw-s1-c6-p1',
  'jtw-s1-c6-p2',
  'jtw-s1-c6-p3',
  'jtw-s1-c6-p4',
  'jtw-s1-c6-p5',
  'jtw-s1-c6-p6',
  'jtw-s1-c6-p7',
  'jtw-s1-c6-p8',
  'jtw-s1-c6-p9',
  'jtw-s1-c6-p10',
]);

export function JourneyWestMapPage() {
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });
  const season2Progress = useQuery({
    queryKey: ['story-parts', JTW_S2_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S2_STORY_LINE_ID),
  });

  const completed = new Set(progress.data?.completed.map((entry) => entry.part_id) ?? []);
  const unlocked = new Set(progress.data?.unlocked_part_ids ?? []);
  const season2Completed = new Set(
    season2Progress.data?.completed.map((entry) => entry.part_id) ?? [],
  );
  const season2Unlocked = new Set(season2Progress.data?.unlocked_part_ids ?? []);
  const season2Part1Completed = season2Completed.has(JTW_S2_C1_P1_ID);
  const season2Part1Open = season2Unlocked.has(JTW_S2_C1_P1_ID);
  const season2Part2Unlocked = season2Unlocked.has(JTW_S2_C1_P2_ID);
  const season2Part2Completed = season2Completed.has(JTW_S2_C1_P2_ID);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-map">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          Story Blocks · Story World
        </p>
        <h1 className="text-[28px] font-black text-ink">
          Journey to the West · Season 1: Stone Monkey’s First Journey
        </h1>
        <p className="mt-2 text-[14px] text-ink-soft">
          One part at a time: read the story, find evidence, and run the program. Only when one is
          completed will the next one be lit.
        </p>
      </header>

      {progress.isLoading && <p className="text-ink-soft">Checking your progress...</p>}

      {JTW_S1_CHAPTERS.map((chapter) => (
        <section key={chapter.code} data-testid={`jtw-map-${chapter.code.toLowerCase()}`}>
          <h2 className="mb-3 text-[17px] font-bold text-ink">
            {chapter.code} · {chapter.title}
          </h2>
          <ol className="grid gap-2 sm:grid-cols-2">
            {chapter.parts.map((part) => {
              const isCompleted = completed.has(part.id);
              const isUnlocked = unlocked.has(part.id);
              const isPlayable = PLAYABLE_PART_IDS.has(part.id);
              const state = isCompleted
                ? 'completed'
                : isUnlocked && isPlayable
                  ? 'open'
                  : isUnlocked
                    ? 'coming'
                    : 'locked';
              const label = (
                <>
                  <span className="text-[12px] font-bold text-ink-soft">{part.code}</span>
                  <span className="block text-[14px] font-semibold">{part.title}</span>
                  <span className="mt-1 block text-[12px] font-bold">
                    {state === 'completed' && <span className="text-brand-mint">✓ Completed</span>}
                    {state === 'open' && <span className="text-brand-sky">▶ OK to start</span>}
                    {state === 'coming' && (
                      <span className="text-brand-sunshine">Unlocked · Scene in production</span>
                    )}
                    {state === 'locked' && <span className="text-ink-soft">🔒 Not unlocked</span>}
                  </span>
                </>
              );
              const className = clsx(
                'block rounded-2xl border p-3 text-left transition',
                state === 'completed' && 'border-brand-mint/50 bg-wash-mint text-ink',
                state === 'open' &&
                  'border-brand-sky/60 bg-canvas-pure text-ink hover:-translate-y-0.5 hover:shadow-card-soft',
                state === 'coming' && 'border-brand-sunshine/50 bg-wash-sunshine text-ink',
                state === 'locked' && 'border-hairline bg-canvas-pure text-ink-soft opacity-70',
              );
              return (
                <li key={part.id} data-testid={`jtw-map-part-${part.id}`} data-state={state}>
                  {state === 'open' || state === 'completed' ? (
                    <Link className={className} to={`/learn/story/journey-west/${part.id}`}>
                      {label}
                    </Link>
                  ) : (
                    <div className={className}>{label}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      <section
        className="rounded-3xl border border-brand-sky/35 bg-wash-sky p-5"
        data-testid="jtw-map-s2"
      >
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          Season 2 · Westbound team gathers
        </p>
        <h2 className="mt-1 text-[20px] font-black text-ink">C1 · Departure note from Chang’an</h2>
        <p className="mt-2 text-[14px] text-ink-soft">
          Xuanzang breaks down the far westward goal into three steps that can be accomplished
          today.
        </p>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2">
          <li
            data-testid={`jtw-map-part-${JTW_S2_C1_P1_ID}`}
            data-state={season2Part1Completed ? 'completed' : season2Part1Open ? 'open' : 'locked'}
          >
            {season2Part1Open || season2Part1Completed ? (
              <Link
                className="block rounded-2xl border border-brand-sky/60 bg-canvas-pure p-3 text-ink"
                to={`/learn/story/journey-west/${JTW_S2_C1_P1_ID}`}
              >
                <span className="text-[12px] font-bold text-ink-soft">C1-P1 · Read</span>
                <span className="block text-[14px] font-semibold">
                  Turn a long way into three steps today
                </span>
                <span className="mt-1 block text-[12px] font-bold text-brand-sky">
                  {season2Part1Completed ? '✓ Completed' : '▶ OK to start'}
                </span>
              </Link>
            ) : (
              <div className="rounded-2xl border border-hairline bg-canvas-pure p-3 text-ink-soft">
                🔒 The entrance to Season 2 has not been unlocked
              </div>
            )}
          </li>
          <li
            data-testid={`jtw-map-part-${JTW_S2_C1_P2_ID}`}
            data-state={
              season2Part2Completed ? 'completed' : season2Part2Unlocked ? 'open' : 'locked'
            }
          >
            {season2Part2Unlocked || season2Part2Completed ? (
              <Link
                className="block rounded-2xl border border-brand-sky/60 bg-canvas-pure p-3 text-ink"
                to={`/learn/story/journey-west/${JTW_S2_C1_P2_ID}`}
              >
                <span className="text-[12px] font-bold text-ink-soft">C1-P2 · Why</span>
                <span className="block text-[14px] font-semibold">
                  Why write three steps first?
                </span>
                <span className="mt-1 block text-[12px] font-bold text-brand-sky">
                  {season2Part2Completed ? '✓ Completed' : '▶ OK to start'}
                </span>
              </Link>
            ) : (
              <div className="rounded-2xl border border-hairline bg-canvas-pure p-3 text-ink-soft">
                🔒 Unlocked after completing P1
              </div>
            )}
          </li>
          {JTW_S2_BATCH_PART_IDS.map((partId) => {
            const item = JTW_S2_PART_CONFIGS[partId];
            const isCompleted = season2Completed.has(partId);
            const isUnlocked = season2Unlocked.has(partId);
            const state = isCompleted ? 'completed' : isUnlocked ? 'open' : 'locked';
            return (
              <li key={partId} data-testid={`jtw-map-part-${partId}`} data-state={state}>
                {isCompleted || isUnlocked ? (
                  <Link
                    className="block rounded-2xl border border-brand-sky/60 bg-canvas-pure p-3 text-ink"
                    to={`/learn/story/journey-west/${partId}`}
                  >
                    <span className="text-[12px] font-bold text-ink-soft">
                      {partId.replace('jtw-s2-', '').toUpperCase()} · {item.scaffold}
                    </span>
                    <span className="block text-[14px] font-semibold">{item.title}</span>
                    <span
                      className={`mt-1 block text-[12px] font-bold ${isCompleted ? 'text-brand-mint' : 'text-brand-sky'}`}
                    >
                      {isCompleted ? '✓ Completed' : '▶ OK to start'}
                    </span>
                  </Link>
                ) : (
                  <div className="rounded-2xl border border-hairline bg-canvas-pure p-3 text-ink-soft">
                    <span className="text-[12px] font-bold">
                      {partId.replace('jtw-s2-', '').toUpperCase()} · {item.scaffold}
                    </span>
                    <span className="block text-[14px] font-semibold">{item.title}</span>
                    <span className="mt-1 block text-[12px]">
                      🔒 Unlocked after completing the previous Part
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-[12px] text-ink-soft">
          There are 6 chapters and 48 Parts in this season; all Parts have been implemented
          internally.
        </p>
      </section>
    </div>
  );
}
