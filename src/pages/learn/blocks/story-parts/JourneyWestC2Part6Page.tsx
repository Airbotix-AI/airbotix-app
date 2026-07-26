import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi';
import type { BlocksProject } from '../blocksModel';
import { BlocksRunner, pageById } from '../interpreter';
import {
  JTW_C2_P6_BUG,
  jtwC2P6ProgramMatches,
  jtwC2P6ProjectDiff,
} from '../jtwC2P6Mission';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice, EvidenceGroup } from './partUi';
import { JTW_S1_STORY_LINE_ID, type JtwEvidenceOption } from './journeyWestSeason1';

const PART_ID = 'jtw-s1-c2-p6';
const NEXT_PART_ID = 'jtw-s1-c2-p7';
const RECENT_PROJECTS_TO_SCAN = 8;

const BUG_PROJECT: BlocksProject = {
  version: 1,
  name: 'JtW C2-P6 bug preview',
  lessonId: PART_ID,
  pages: [
    {
      id: 'jtw-c2-p6-bug-preview',
      background: 'jtw-s1-c2-actor-free-base',
      characters: [
        {
          id: 'stone-monkey',
          name: 'Stone Monkey',
          emoji: '🐵',
          start: { gx: 6, gy: 7, size: 3, rot: 0 },
          scripts: [{ id: 'return-bug-preview', blocks: JTW_C2_P6_BUG }],
        },
      ],
    },
  ],
};

const PREDICTION: JtwEvidenceOption[] = [
  { id: 'down-after-first-left', label: '先向下到 4-8，再向左回到 2-8', correct: true },
  { id: 'left-again', label: '继续向左；速度快一点就会修好', correct: false },
];
const ACTUAL: JtwEvidenceOption[] = [
  { id: 'second-stop-2-7', label: '第二段停在 2-7；这就是第一次偏离', correct: true },
  { id: 'second-stop-4-8', label: '第二段已经停在 4-8，没有偏离', correct: false },
];
const DEVIATION: JtwEvidenceOption[] = [
  { id: 'swap-middle-targets', label: '只交换第二个 Left 2 和 Down 1', correct: true },
  { id: 'change-speed', label: '把速度调快，不改顺序', correct: false },
  { id: 'go-home', label: '删掉路线，放一个 Go Home', correct: false },
];
const RETURN_EVIDENCE: JtwEvidenceOption[] = [
  { id: 'stone-bridge', label: '石桥让伙伴能走进去', correct: true },
  { id: 'dry-ground', label: '干爽地面说明里面不是一片水', correct: true },
  { id: 'clear-water', label: '清水是适合居住的证据', correct: true },
  { id: 'fast-route', label: '路线跑得快，所以洞里一定安全', correct: false },
];

interface BuildStatus {
  projectId: string | null;
  matches: boolean;
  ran: boolean;
  projectDiff: string[];
}

async function findBuild(kidId: string): Promise<BuildStatus> {
  for (const meta of (await listBlocksProjects(kidId)).slice(0, RECENT_PROJECTS_TO_SCAN)) {
    try {
      const loaded = await loadBlocksProject(meta.id);
      if (loaded.project.lessonId !== PART_ID) continue;
      return {
        projectId: meta.id,
        matches: jtwC2P6ProgramMatches(loaded.project),
        ran: Boolean(loaded.storyProgress?.completed[PART_ID]),
        projectDiff: jtwC2P6ProjectDiff(loaded.project),
      };
    } catch {
      // Ignore unreadable legacy projects and keep scanning.
    }
  }
  return { projectId: null, matches: false, ran: false, projectDiff: [] };
}

export function JourneyWestC2Part6Page({
  previewSleep,
}: {
  previewSleep?: (ms: number) => Promise<void>;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });
  const build = useQuery({
    queryKey: ['jtw-c2-p6-build', kidId],
    queryFn: () => findBuild(kidId!),
    enabled: !!kidId,
  });
  const [prediction, setPrediction] = useState<string | null>(null);
  const [bugRan, setBugRan] = useState(false);
  const [bugTrace, setBugTrace] = useState<string[]>([]);
  const [actual, setActual] = useState<string | null>(null);
  const [deviation, setDeviation] = useState<string | null>(null);
  const [returnEvidence, setReturnEvidence] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [restored, setRestored] = useState(false);
  const bugPage = useMemo(() => pageById(BUG_PROJECT, 'jtw-c2-p6-bug-preview'), []);

  const saved = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  if (saved && !restored) {
    const evidence = saved.evidence as StoryPartEvidence;
    setPrediction(evidence.prediction ?? null);
    setActual(evidence.selections?.actual_stop?.[0] ?? null);
    setDeviation(evidence.selections?.first_deviation?.[0] ?? null);
    setReturnEvidence(evidence.selections?.return_evidence ?? []);
    setBugRan(true);
    setRestored(true);
  }

  const completed = Boolean(saved);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;
  const predictionDone = PREDICTION.some(
    (option) => option.id === prediction && option.correct,
  );
  const actualDone = ACTUAL.some((option) => option.id === actual && option.correct);
  const deviationDone = DEVIATION.some(
    (option) => option.id === deviation && option.correct,
  );
  const buildDone = Boolean(build.data?.matches && build.data.ran);
  const evidenceDone =
    RETURN_EVIDENCE.filter((option) => option.correct && returnEvidence.includes(option.id))
      .length >= 3;
  const resolved =
    completed ||
    (predictionDone && bugRan && actualDone && deviationDone && buildDone && evidenceDone);

  const runBug = async () => {
    const trace: string[] = [];
    const runner = new BlocksRunner(
      bugPage,
      {
        onSprite: (_id, state) => trace.push(`${state.gx}-${state.gy}`),
        onSay: () => undefined,
        onNote: () => undefined,
        onSound: () => undefined,
        onGotoPage: () => undefined,
        onStep: () => undefined,
      },
      previewSleep,
    );
    await runner.runFlag();
    setBugTrace([...new Set(trace)]);
    setBugRan(true);
  };

  const openStudio = async () => {
    if (build.data?.projectId) {
      navigate(`/learn/blocks/${build.data.projectId}`);
      return;
    }
    setCreating(true);
    const created = await createBlocksProject({
      title: '西游记 · 修好返回路线',
      template: 'blocks_jtw_c2_p6',
    });
    navigate(`/learn/blocks/${created.id}`);
  };

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          bug_run_trace: bugTrace,
          actual_stop: actual ? [actual] : [],
          first_deviation: deviation ? [deviation] : [],
          project_diff: build.data?.projectDiff ?? [],
          fixed_run: ['return-6-7-to-2-8-via-4-7-and-4-8'],
          return_evidence: returnEvidence,
          build_project: build.data?.projectId ? [build.data.projectId] : [],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) return <p className="p-8 text-center">正在铺开回去的路线…</p>;
  if (!unlocked && !completed) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center" data-testid="jtw-c2p6-locked">
        <p>先完成 Part 5，让石猴看清洞里的居住证据。</p>
        <Link className="btn-pill-primary mt-4 inline-block" to="/learn/story/journey-west">
          回到故事地图
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-7 px-4 py-8" data-testid="jtw-part-c2-p6">
      <header>
        <p className="text-[12px] font-bold uppercase text-brand-sky">
          西游记 · 第二章 · Part 6 · Debug
        </p>
        <h1 className="text-[28px] font-black text-ink">回去的第一处偏离</h1>
      </header>
      <section className="space-y-3" data-testid="jtw-c2p6-story-before">
        <p>石猴答应回去告诉伙伴。洞里有石桥、干爽地面和清水，可伙伴还在高石旁等他说明。</p>
        <p>返回脚本每块都有用，只有中间顺序错误。速度不能修复方向；石猴要先找到第一次偏离，再作最小修改。</p>
        <p className="rounded-2xl border p-4">
          <strong>故事—程序桥：</strong>三段移动重建“回来分享”；去程路线保留在第二页，不能为修返回路线而改写。
        </p>
      </section>
      <section>
        <h2 className="font-bold">预测：第一段 Left 2 正确以后，下一步应该怎样走？</h2>
        {PREDICTION.map((option) => (
          <Choice
            key={option.id}
            option={option}
            active={prediction === option.id}
            onPick={() => setPrediction(option.id)}
          />
        ))}
      </section>
      {predictionDone && (
        <section className="rounded-2xl border bg-wash-sky p-5" data-testid="jtw-c2p6-bug-run">
          <p className="font-bold">错误链：Left 2 → Left 2 → Down 1</p>
          <button type="button" className="btn-pill-primary mt-3" onClick={() => void runBug()}>
            {bugRan ? '再运行错误路线' : '运行错误路线'}
          </button>
          {bugRan && <p data-testid="jtw-c2p6-bug-trace">真实 Runner 停点：{bugTrace.join(' → ')}</p>}
        </section>
      )}
      {bugRan && (
        <section>
          <h2 className="font-bold">实际发生了什么？</h2>
          {ACTUAL.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={actual === option.id}
              onPick={() => setActual(option.id)}
            />
          ))}
        </section>
      )}
      {actualDone && (
        <section>
          <h2 className="font-bold">怎样作最小修复？</h2>
          {DEVIATION.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={deviation === option.id}
              onPick={() => setDeviation(option.id)}
            />
          ))}
        </section>
      )}
      {deviationDone && (
        <section className="rounded-2xl border bg-wash-sky p-5" data-testid="jtw-c2p6-build">
          <p>在真实工作区只交换中间两块，按 Go 重跑并保存。第二页的五块去程证明必须保持原样。</p>
          <button type="button" className="btn-pill-primary mt-3" disabled={creating} onClick={() => void openStudio()}>
            {buildDone ? '再看修好的项目' : creating ? '正在准备…' : '打开工作区修复'}
          </button>
          {buildDone && (
            <p data-testid="jtw-c2p6-build-done">
              ✓ 修复后真实运行并保存；项目 diff：{build.data?.projectDiff.join(' · ')}
            </p>
          )}
        </section>
      )}
      {buildDone && (
        <EvidenceGroup
          title="石猴回来要告诉伙伴哪三条居住证据？"
          options={RETURN_EVIDENCE}
          selected={returnEvidence}
          onToggle={(id) =>
            setReturnEvidence((current) =>
              current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
            )
          }
          done={evidenceDone}
          testId="jtw-c2p6-return-evidence"
        />
      )}
      {resolved && (
        <section className="rounded-2xl border border-brand-mint bg-wash-mint p-5" data-testid="jtw-c2p6-story-after">
          <p>石猴沿 6-7 → 4-7 → 4-8 → 2-8 的来路回到高石与伙伴面前。</p>
          <p className="mt-2">他按石桥、干地和清水说明发现，也兑现了“回来告诉大家”的约定。</p>
          <p className="mt-2 font-bold">下一处问题：怎样把个人路线变成伙伴都能预测、重复的安全路线？</p>
          <button type="button" className="btn-pill-primary mt-4" disabled={complete.isPending} onClick={() => complete.mutate()}>
            把路线变成大家的路
          </button>
        </section>
      )}
    </div>
  );
}
