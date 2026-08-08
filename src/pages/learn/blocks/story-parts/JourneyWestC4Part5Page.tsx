import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMe } from '@/auth/useAuth';
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import { Choice } from './partUi';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import {
  C4_P5_MOTIVE_OPTIONS,
  C4_P5_NEXT_PART_ID,
  C4_P5_PART_ID,
  C4_P5_PREDICTIONS,
  C4_P5_STORY_BEFORE,
  C4_P5_VERSIONS,
  c4p5Correct,
  c4p5ProjectEvidence,
} from './journeyWestC4Part5Program';

async function findBuild(kidId: string) {
  for (const project of (await listBlocksProjects(kidId)).slice(0, 8)) {
    try {
      const loaded = await loadBlocksProject(project.id);
      if (loaded.project.lessonId !== C4_P5_PART_ID) continue;
      return {
        projectId: project.id,
        ...c4p5ProjectEvidence(loaded.project, Object.keys(loaded.storyProgress?.completed ?? {})),
      };
    } catch {
      /* Continue past unreadable legacy work. */
    }
  }
  return null;
}

export function JourneyWestC4Part5Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });
  const build = useQuery({
    queryKey: ['jtw-c4-p5-build', kidId],
    queryFn: () => findBuild(kidId!),
    enabled: Boolean(kidId),
  });
  const [motive, setMotive] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const saved = progress.data?.completed.find((entry) => entry.part_id === C4_P5_PART_ID);
  if (saved && !restored) {
    const evidence = saved.evidence as StoryPartEvidence;
    setMotive(evidence.selections?.motive?.[0] ?? null);
    setVersion(evidence.selections?.skill_version?.[0] ?? null);
    setPrediction(evidence.prediction ?? null);
    setRestored(true);
  }
  const selected = C4_P5_VERSIONS.find((choice) => choice.id === version);
  const ready =
    c4p5Correct(motive, C4_P5_MOTIVE_OPTIONS) &&
    c4p5Correct(prediction, C4_P5_PREDICTIONS) &&
    Boolean(selected);
  const built = Boolean(build.data?.dualRunCompleted && build.data.version === version);
  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, C4_P5_PART_ID, {
        schema_version: 1,
        prediction: prediction ?? undefined,
        selections: {
          motive: motive ? [motive] : [],
          skill_version: version ? [version] : [],
          partner_prediction: [prediction ?? ''],
          build_project: build.data?.projectId ? [build.data.projectId] : [],
          runner_result: ['flag:name-only:end', `tap:${version}:visible:end`],
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: C4_P5_NEXT_PART_ID } });
    },
  });
  if (progress.isLoading) return <p className="p-8 text-center">正在打开展示选择卡…</p>;
  if (!(progress.data?.unlocked_part_ids.includes(C4_P5_PART_ID) || saved))
    return (
      <div className="p-8 text-center" data-testid="jtw-c4p5-locked">
        <Link to="/learn/story/journey-west">先回故事地图</Link>
      </div>
    );
  const openStudio = async () => {
    if (build.data?.projectId) return navigate(`/learn/blocks/${build.data.projectId}`);
    if (!selected) return;
    const project = await createBlocksProject({
      title: `西游记 · ${selected.label}`,
      template: selected.template,
    });
    navigate(`/learn/blocks/${project.id}`);
  };
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p5">
      <header>
        <p className="text-xs font-bold text-brand-sky">西游记 · 第四章 · Part 5</p>
        <h1 className="text-3xl font-black">本领不是为了抢先</h1>
      </header>
      <section className="space-y-3 rounded-2xl border p-5" data-testid="jtw-c4p5-story">
        {C4_P5_STORY_BEFORE.map((text) => (
          <p key={text.slice(0, 12)} className="leading-8">
            {text}
          </p>
        ))}
      </section>
      <section className="space-y-2">
        <h2 className="font-bold">悟空为什么等Tap？</h2>
        {C4_P5_MOTIVE_OPTIONS.map((choice) => (
          <Choice
            key={choice.id}
            option={choice}
            active={motive === choice.id}
            onPick={() => setMotive(choice.id)}
          />
        ))}
      </section>
      <section className="space-y-2" data-testid="jtw-c4p5-versions">
        <h2 className="font-bold">选择并组织一个真实版本</h2>
        {C4_P5_VERSIONS.map((choice) => (
          <button
            key={choice.id}
            className={`w-full rounded-xl border p-3 text-left ${version === choice.id ? 'border-brand-sky bg-wash-sky' : ''}`}
            onClick={() => setVersion(choice.id)}
          >
            <strong>{choice.label}</strong>
            <span className="block text-sm">{choice.detail}</span>
          </button>
        ))}
      </section>
      <section className="space-y-2">
        <h2 className="font-bold">同伴只看程序，应该预测什么？</h2>
        {C4_P5_PREDICTIONS.map((choice) => (
          <Choice
            key={choice.id}
            option={choice}
            active={prediction === choice.id}
            onPick={() => setPrediction(choice.id)}
          />
        ))}
      </section>
      <section className="rounded-2xl bg-wash-sky p-5">
        <button className="btn-pill-primary" disabled={!ready} onClick={() => void openStudio()}>
          {build.data?.projectId ? '回到所选工作区' : '打开所选工作区'}
        </button>
        <p data-testid="jtw-c4p5-build-status">
          {built
            ? '✓ 名字链保留；所选多块Tap链、Go等待与真实Tap都已保存'
            : '等待真实积木、同伴预测与两次运行'}
        </p>
      </section>
      {built && (
        <section className="rounded-2xl bg-wash-mint p-5" data-testid="jtw-c4p5-resolved">
          <h2 className="font-black">只有所选动作目标在Tap后点亮；名字牌仍由Start控制。</h2>
          <p>悟空说：“我是在观众准备好后回应。”一阵风随后把整段本领链吹到了错误入口。</p>
        </section>
      )}
      <button
        className="btn-pill-primary w-full"
        data-testid="jtw-c4p5-continue"
        disabled={!ready || !built || complete.isPending}
        onClick={() => complete.mutate()}
      >
        {saved ? '回到地图' : '检查排错的队伍'}
      </button>
      <p className="text-center text-xs">本Part只解锁P6，不完成第四章。</p>
    </div>
  );
}
