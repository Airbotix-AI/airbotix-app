// Journey to the West · Season 1 story map — the kid-facing part list for the
// 50-part chain. Lock state comes from the server (/story-parts): a part is
// tappable only when the API says it is unlocked AND its build has shipped
// (PLAYABLE_PART_IDS). Completing P1 unlocks exactly P2 — chapters never
// unlock wholesale (scene-specs completion contract).

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';

import { JTW_S1_CHAPTERS, JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
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
]);

export function JourneyWestMapPage() {
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });

  const completed = new Set(progress.data?.completed.map((entry) => entry.part_id) ?? []);
  const unlocked = new Set(progress.data?.unlocked_part_ids ?? []);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-map">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          Story Blocks · 故事世界
        </p>
        <h1 className="text-[28px] font-black text-ink">西游记 · 第一季：石猴的第一程</h1>
        <p className="mt-2 text-[14px] text-ink-soft">
          一次一个 Part：读故事、找证据、跑程序。完成一个，才点亮下一个。
        </p>
      </header>

      {progress.isLoading && <p className="text-ink-soft">正在查看你的进度…</p>}

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
                    {state === 'completed' && <span className="text-brand-mint">✓ 已完成</span>}
                    {state === 'open' && <span className="text-brand-sky">▶ 可以开始</span>}
                    {state === 'coming' && (
                      <span className="text-brand-sunshine">已解锁 · 场景制作中</span>
                    )}
                    {state === 'locked' && <span className="text-ink-soft">🔒 未解锁</span>}
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
    </div>
  );
}
