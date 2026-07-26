import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi';
import { jtwC2P5ProgramMatches } from '../jtwC2P5Mission';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice, EvidenceGroup } from './partUi';
import { JTW_S1_STORY_LINE_ID, type JtwEvidenceOption } from './journeyWestSeason1';

const PART_ID = 'jtw-s1-c2-p5';
const NEXT_PART_ID = 'jtw-s1-c2-p6';
const LESSON_ID = PART_ID;
const BACKGROUND =
  '/story-blocks/journey-to-the-west/backgrounds/s1/c2/base-v01.webp';
const CURTAIN =
  '/story-blocks/journey-to-the-west/characters/water-curtain-trigger/closed-v01.png';
const CAVE =
  '/story-blocks/journey-to-the-west/characters/cave-entrance/revealed-v01.png';

const STORY_BEFORE = [
  '石猴刚好碰到水帘入口，可水帘没有回应。路线只负责“到达”；现在要让碰撞真的改变世界。',
  '水声后面露出一座石桥、干爽地面、石座和清水。石猴要先看清这些证据，才知道伙伴是否适合进来。',
] as const;

const EVIDENCE: JtwEvidenceOption[] = [
  { id: 'stone-bridge', label: '石桥：伙伴可以走进去', correct: true },
  { id: 'dry-ground', label: '干爽地面：里面不是一片水', correct: true },
  { id: 'stone-seat', label: '石座：有能休息的地方', correct: true },
  { id: 'clear-water', label: '清水：有干净的水源', correct: true },
  { id: 'loud-splash', label: '水声很大，所以一定适合居住', correct: false },
];

const PREDICTION: JtwEvidenceOption[] = [
  {
    id: 'curtain-gone-cave-hidden',
    label: '只会看到空的崖壁；水帘不见了，但洞口和居住证据还没有出现',
    correct: true,
  },
  { id: 'cave-visible-anyway', label: '洞口会自己出现，Show 不需要连接', correct: false },
];

interface BuildStatus {
  projectId: string | null;
  matches: boolean;
  ran: boolean;
}

async function findBuild(kidId: string): Promise<BuildStatus> {
  for (const meta of (await listBlocksProjects(kidId)).slice(0, 8)) {
    try {
      const loaded = await loadBlocksProject(meta.id);
      if (loaded.project.lessonId !== LESSON_ID) continue;
      return {
        projectId: meta.id,
        matches: jtwC2P5ProgramMatches(loaded.project),
        ran: Boolean(loaded.storyProgress?.completed[LESSON_ID]),
      };
    } catch {
      // Ignore unreadable legacy projects and keep scanning.
    }
  }
  return { projectId: null, matches: false, ran: false };
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
  const [restored, setRestored] = useState(false);
  const [creating, setCreating] = useState(false);

  const saved = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  if (saved && !restored) {
    const savedEvidence = saved.evidence as StoryPartEvidence;
    setEvidence(savedEvidence.selections?.dwelling_evidence ?? []);
    setPrediction(savedEvidence.prediction ?? null);
    setRestored(true);
  }
  const completed = Boolean(saved);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;
  const evidenceDone = EVIDENCE.filter((option) => option.correct).filter((option) =>
    evidence.includes(option.id),
  ).length >= 3;
  const predictionDone = PREDICTION.find((option) => option.id === prediction)?.correct === true;
  const buildDone = Boolean(build.data?.matches && build.data.ran);
  const resolved = completed || (buildDone && evidenceDone && predictionDone);

  const openStudio = async () => {
    if (build.data?.projectId) {
      navigate(`/learn/blocks/${build.data.projectId}`);
      return;
    }
    setCreating(true);
    const created = await createBlocksProject({
      title: '西游记 · 水帘分开以后',
      template: 'blocks_jtw_c2_p5',
    });
    navigate(`/learn/blocks/${created.id}`);
  };

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          dwelling_evidence: evidence,
          build_project: build.data?.projectId ? [build.data.projectId] : [],
          runner_result: ['both-on-bump-tracks-ran'],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) return <p className="p-8 text-center">正在听水帘的回应…</p>;
  if (!unlocked && !completed) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center" data-testid="jtw-c2p5-locked">
        <p>先完成 Part 4 的五块路线，再来连接碰撞回应。</p>
        <Link className="btn-pill-primary mt-4 inline-block" to="/learn/story/journey-west">
          回到故事地图
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-7 px-4 py-8" data-testid="jtw-part-c2-p5">
      <header>
        <p className="text-[12px] font-bold uppercase text-brand-sky">
          西游记 · 第二章 · Part 5 · Build 2
        </p>
        <h1 className="text-[28px] font-black text-ink">水帘分开以后</h1>
      </header>
      <section className="space-y-3" data-testid="jtw-c2p5-story-before">
        {STORY_BEFORE.map((paragraph) => (
          <p key={paragraph} className="text-[16px] leading-8 text-ink">
            {paragraph}
          </p>
        ))}
        <p className="rounded-2xl border p-4">
          <strong>故事—程序桥：</strong>石猴的路线产生碰撞；水帘的 On Bump 要 Hide，洞口的
          On Bump 要 Show。两条回应都真实运行，世界才会改变。
        </p>
      </section>
      <div
        className="relative aspect-video overflow-hidden rounded-2xl border"
        data-testid="jtw-c2p5-stage"
        data-resolved={resolved}
      >
        <img src={BACKGROUND} alt="没有烤入角色的花果山水帘洞崖壁与湿石路" className="h-full w-full object-cover" />
        <img src={CAVE} alt={resolved ? '暖光洞口、石桥、干地、石座和清水' : ''} className="absolute inset-0 h-full w-full object-contain" hidden={!resolved} />
        <img src={CURTAIN} alt={resolved ? '' : '仍然合着的水帘'} className="absolute inset-0 h-full w-full object-contain" hidden={resolved} />
      </div>
      <section className="rounded-2xl border bg-wash-sky p-5" data-testid="jtw-c2p5-build">
        <h2 className="font-bold">在真实工作区连接两个 On Bump 轨</h2>
        <p className="my-2 text-[14px]">把 Hide 放在水帘轨，把 Show 放在洞口轨；角色归属相反、少一块或只看页面动画都不算完成。运行并保存。</p>
        <button type="button" className="btn-pill-primary" disabled={creating} onClick={() => void openStudio()}>
          {buildDone ? '再看我的碰撞程序' : creating ? '正在准备…' : '连接并运行 →'}
        </button>
        {buildDone && <p data-testid="jtw-c2p5-build-done">✓ 保存的作品证明两个 On Bump 轨都真实运行</p>}
      </section>
      <section>
        <h2 className="font-bold">预测：只 Hide 水帘、不 Show 洞口，会看到什么？</h2>
        {PREDICTION.map((option) => (
          <Choice key={option.id} option={option} active={prediction === option.id} onPick={() => setPrediction(option.id)} />
        ))}
      </section>
      {buildDone && predictionDone && (
        <EvidenceGroup
          title="找出至少三条“适合伙伴进入”的画面证据"
          options={EVIDENCE}
          selected={evidence}
          onToggle={(id) =>
            setEvidence((current) =>
              current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
            )
          }
          done={evidenceDone}
          testId="jtw-c2p5-evidence"
        />
      )}
      {resolved && (
        <section className="rounded-2xl border border-brand-mint bg-wash-mint p-5" data-testid="jtw-c2p5-story-after">
          <p>水帘分开，洞内暖光照亮石桥、干地、石座和清水。</p>
          <p className="mt-2 font-bold">石猴确认这里适合伙伴进入，决定按约定沿原路返回。下一处问题：回去的路线会在哪里第一次偏离？</p>
          <button type="button" className="btn-pill-primary mt-4" disabled={complete.isPending} onClick={() => complete.mutate()}>
            沿原路回去
          </button>
        </section>
      )}
    </div>
  );
}
