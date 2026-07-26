import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice } from './partUi';
import { JTW_S1_STORY_LINE_ID, JTW_STONE_MONKEY_ASSET } from './journeyWestSeason1';
import { c2p5ProgramMatches } from './journeyWestC2Part5Program';

const PART_ID = 'jtw-s1-c2-p5';
const NEXT_PART_ID = 'jtw-s1-c2-p6';
const LESSON_ID = 'jtw-s1-c2-p5';
const BASE_ASSET = '/story-blocks/journey-to-the-west/backgrounds/s1/c2/actor-free-v01.png';
const CURTAIN_ASSET =
  '/story-blocks/journey-to-the-west/characters/water-curtain-trigger/closed-v01.png';
const CAVE_ASSET = '/story-blocks/journey-to-the-west/characters/cave-entrance/revealed-v01.png';

const STORY_BEFORE = [
  '石猴的五个脚印刚好停在水帘前。他伸手碰到轰响的水流，可水帘还像一扇关着的门。路线只回答了“怎样到达”，现在程序还要回答“碰到以后会发生什么”。',
  '石猴想起和伙伴的约定：进去以后要看清里面，也要回来把发现讲明白。水帘后隐约有一条石桥，里面的地面没有积水，还有石座和清清的水。这些证据能不能说明伙伴也适合进来？',
] as const;

const EVIDENCE = [
  { id: 'bridge', label: '石桥可以走', correct: true },
  { id: 'dry-ground', label: '地面干爽', correct: true },
  { id: 'stone-seat', label: '里面有石座', correct: true },
  { id: 'clear-water', label: '有清水', correct: true },
  { id: 'fastest', label: '石猴跑得最快', correct: false },
] as const;
const PREDICTIONS = [
  { id: 'nothing-readable', label: '只剩空的崖面，看不到洞里的居住证据', correct: true },
  { id: 'cave-visible', label: '洞口会自己出现，Show 不需要连接', correct: false },
] as const;

interface BuildStatus {
  projectId: string | null;
  correct: boolean;
  runCompleted: boolean;
}

async function findBuild(kidId: string): Promise<BuildStatus> {
  for (const project of (await listBlocksProjects(kidId)).slice(0, 8)) {
    try {
      const loaded = await loadBlocksProject(project.id);
      if (loaded.project.lessonId !== LESSON_ID) continue;
      return {
        projectId: project.id,
        correct: c2p5ProgramMatches(loaded.project),
        runCompleted: Boolean(loaded.storyProgress?.completed[LESSON_ID]),
      };
    } catch {
      // Ignore unreadable legacy projects and keep scanning.
    }
  }
  return { projectId: null, correct: false, runCompleted: false };
}

function Stage({ resolved }: { resolved: boolean }) {
  return (
    <div
      className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-hairline"
      data-testid="jtw-c2p5-stage"
      data-world-state={resolved ? 'cave-revealed' : 'curtain-closed'}
    >
      <img
        src={BASE_ASSET}
        alt="湿石路尽头的干崖面和空洞口"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <img
        src={JTW_STONE_MONKEY_ASSET}
        alt=""
        aria-hidden
        className="absolute bottom-[18%] left-[58%] w-[12%]"
      />
      {!resolved && (
        <img
          src={CURTAIN_ASSET}
          alt="合着的水帘"
          data-testid="jtw-c2p5-curtain"
          className="absolute right-[5%] top-[3%] h-[68%] w-[49%] object-contain"
        />
      )}
      {resolved && (
        <img
          src={CAVE_ASSET}
          alt="暖光洞口，里面有石桥、干地、石座和清水"
          data-testid="jtw-c2p5-cave"
          className="absolute right-[12%] top-[12%] h-[61%] w-[38%] object-contain"
        />
      )}
    </div>
  );
}

export function JourneyWestC2Part5Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });
  const build = useQuery({
    queryKey: ['jtw-c2-p5-build', kidId],
    queryFn: () => findBuild(kidId!),
    enabled: !!kidId,
  });
  const [evidence, setEvidence] = useState<string[]>([]);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [restored, setRestored] = useState(false);
  const saved = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  if (saved && !restored) {
    const stored = saved.evidence as StoryPartEvidence;
    setEvidence(stored.selections?.cave_evidence ?? []);
    setPrediction(stored.prediction ?? null);
    setRestored(true);
  }
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;
  const buildDone = Boolean(build.data?.correct && build.data.runCompleted);
  const evidenceDone =
    evidence.filter((id) => EVIDENCE.find((item) => item.id === id)?.correct).length >= 3;
  const predictionDone = PREDICTIONS.find((item) => item.id === prediction)?.correct === true;
  const resolved = buildDone && evidenceDone && predictionDone;

  const openStudio = async () => {
    if (build.data?.projectId) return navigate(`/learn/blocks/${build.data.projectId}`);
    setCreating(true);
    try {
      const { id } = await createBlocksProject({
        title: '西游记 · 水帘分开以后',
        template: 'blocks_jtw_c2_p5',
      });
      navigate(`/learn/blocks/${id}`);
    } finally {
      setCreating(false);
    }
  };
  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          cave_evidence: evidence,
          bump_project: build.data?.projectId ? [build.data.projectId] : [],
          runner_result: ['curtain-hidden', 'cave-shown', 'chime-fired'],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) return <p className="p-8 text-center text-ink-soft">水帘正在落下…</p>;
  if (!unlocked && !saved) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-c2p5-locked"
      >
        <p className="font-bold text-ink">先完成 Part 4 的五块路线，才能连接碰撞回应。</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          回到故事地图
        </Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c2-p5">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第二章 · Part 5 · Build 2
        </p>
        <h1 className="text-[28px] font-black text-ink">水帘分开以后</h1>
      </header>
      <section className="space-y-4" data-testid="jtw-c2p5-story">
        {STORY_BEFORE.map((text) => (
          <p key={text.slice(0, 12)} className="text-[16px] leading-8 text-ink">
            {text}
          </p>
        ))}
        <aside className="rounded-2xl border border-hairline bg-canvas-pure p-4 text-[14px] leading-7 text-ink">
          <strong>故事—程序桥：</strong> 石猴路线产生真实碰撞；水帘的 On Bump 运行 Hide，洞口自己的
          On Bump 运行 Show，Chime 给出听觉和可见反馈。
        </aside>
      </section>
      <Stage resolved={resolved || Boolean(saved)} />
      <section
        className="rounded-2xl border border-brand-sky/40 bg-wash-sky p-5"
        data-testid="jtw-c2p5-build"
        data-build-state={buildDone ? 'done' : 'pending'}
      >
        <h2 className="font-bold text-ink">在真正的工作区连接两个回应</h2>
        <p className="mt-2 text-[14px] leading-7 text-ink-soft">
          路线已经搭好。把 Hide 放进水帘的 On Bump 轨，把 Show 放进洞口自己的 On Bump
          轨；核对角色归属，先预测，再按 Go、保存。
        </p>
        <button
          type="button"
          className="btn-pill-primary mt-4"
          data-testid="jtw-c2p5-open-studio"
          disabled={creating}
          onClick={() => void openStudio()}
        >
          {buildDone ? '再看我的碰撞回应' : build.data?.projectId ? '继续连接 →' : '开始连接 →'}
        </button>
        {buildDone && (
          <span
            className="ml-3 text-[13px] font-bold text-brand-mint"
            data-testid="jtw-c2p5-build-done"
          >
            ✓ 两条 On Bump 轨已真实运行
          </span>
        )}
      </section>
      {buildDone && (
        <section className="space-y-5 rounded-2xl border border-brand-sky/40 bg-wash-sky p-5">
          <div>
            <h2 className="mb-2 font-bold text-ink">
              如果只 Hide 水帘，却没有 Show 洞口，伙伴会看到什么？
            </h2>
            <div className="flex flex-col gap-2">
              {PREDICTIONS.map((option) => (
                <Choice
                  key={option.id}
                  option={option}
                  active={prediction === option.id}
                  onPick={() => setPrediction(option.id)}
                />
              ))}
            </div>
          </div>
          <div data-testid="jtw-c2p5-evidence">
            <h2 className="mb-2 font-bold text-ink">选出至少三条“适合伙伴进入”的证据</h2>
            <div className="flex flex-wrap gap-2">
              {EVIDENCE.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={evidence.includes(option.id)}
                  className="rounded-full border border-hairline bg-canvas-pure px-4 py-2 text-[14px] font-semibold"
                  onClick={() =>
                    setEvidence((current) =>
                      current.includes(option.id)
                        ? current.filter((id) => id !== option.id)
                        : [...current, option.id],
                    )
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
      {(resolved || saved) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-c2p5-resolved"
        >
          <p className="leading-7 text-ink">
            石猴碰到水帘，两条 On Bump 轨同时回应：水帘隐藏，洞口显出暖光，Chime 响起。
          </p>
          <p className="mt-2 font-semibold text-ink">
            石猴确认了石桥、干地、石座和清水，决定按约定沿原路回去告诉伙伴。
          </p>
        </section>
      )}
      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← 回到故事地图
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c2p5-continue"
          disabled={(!resolved && !saved) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          沿原路回去
        </button>
      </footer>
    </div>
  );
}
