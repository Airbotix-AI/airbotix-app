import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import { Choice } from './partUi';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import {
  C4_P5_CONTINUE_LABEL,
  C4_P5_MOTIVE_OPTIONS,
  C4_P5_NEXT_PART_ID,
  C4_P5_PART_ID,
  C4_P5_PREDICTION_OPTIONS,
  C4_P5_STORY_BEFORE,
  C4_P5_TEMPLATE_ID,
  C4_P5_VERSION_OPTIONS,
  c4p5BuildEvidence,
  c4p5MotiveCorrect,
  c4p5PredictionCorrect,
  type C4P5BuildEvidence,
} from './journeyWestC4Part5Program';

const RECENT_PROJECTS_TO_SCAN = 8;

async function findBuild(kidId: string): Promise<C4P5BuildEvidence | null> {
  const projects = (await listBlocksProjects(kidId)).slice(0, RECENT_PROJECTS_TO_SCAN);
  for (const project of projects) {
    try {
      const loaded = await loadBlocksProject(project.id);
      if (loaded.project.lessonId !== C4_P5_PART_ID) continue;
      return c4p5BuildEvidence(
        project.id,
        loaded.project,
        Object.keys(loaded.storyProgress?.completed ?? {}),
      );
    } catch {
      // Keep scanning after an unreadable legacy project.
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
  const [creating, setCreating] = useState(false);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C4_P5_PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(C4_P5_PART_ID) ?? false;
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setMotive(evidence.selections?.motive?.[0] ?? null);
    setVersion(evidence.selections?.version?.[0] ?? null);
    setPrediction(evidence.prediction ?? null);
    setRestored(true);
  }
  const readingDone =
    c4p5MotiveCorrect(motive) && c4p5PredictionCorrect(prediction) && Boolean(version);
  const buildDone = Boolean(build.data?.dualRunCompleted && build.data.version === version);
  const resolved = readingDone && buildDone;
  const completed = Boolean(savedEntry);

  const openStudio = async () => {
    if (build.data?.projectId) return navigate(`/learn/blocks/${build.data.projectId}`);
    setCreating(true);
    try {
      const { id } = await createBlocksProject({
        title: 'Journey to the West · The skill is not to be first',
        template: C4_P5_TEMPLATE_ID,
      });
      navigate(`/learn/blocks/${id}`);
    } finally {
      setCreating(false);
    }
  };

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, C4_P5_PART_ID, {
        schema_version: 1,
        selections: {
          motive: motive ? [motive] : [],
          version: version ? [version] : [],
          build_project: build.data?.projectId ? [build.data.projectId] : [],
          placed_blocks: build.data?.placedBlocks ?? [],
          run_trace: ['flag:name-only-end', 'partner-prediction', `tap:${version}:visible-end`],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: C4_P5_NEXT_PART_ID } });
    },
  });

  if (progress.isLoading)
    return <p className="p-8 text-center text-ink-soft">Three responses are being prepared…</p>;
  if (!unlocked && !completed)
    return (
      <div className="mx-auto max-w-3xl p-8 text-center" data-testid="jtw-c4p5-locked">
        <p>Complete the name chain and skill chain first.</p>
        <Link to="/learn/story/journey-west">Back to story map</Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p5">
      <header>
        <p className="text-[12px] font-bold text-brand-sky">
          Journey to the West · Chapter 4 · Part 5
        </p>
        <h1 className="text-[28px] font-black text-ink">The skill is not to be first</h1>
      </header>
      <section
        className="space-y-3 rounded-2xl border border-hairline p-5"
        data-testid="jtw-c4p5-story"
      >
        {C4_P5_STORY_BEFORE.map((text) => (
          <p key={text.slice(0, 16)}>{text}</p>
        ))}
      </section>
      <section className="space-y-2">
        <h2 className="font-bold">Why is Wukong waiting for Tap?</h2>
        {C4_P5_MOTIVE_OPTIONS.map((option) => (
          <Choice
            key={option.id}
            option={option}
            active={motive === option.id}
            onPick={() => setMotive(option.id)}
          />
        ))}
      </section>
      <section className="space-y-2" data-testid="jtw-c4p5-versions">
        <h2 className="font-bold">Choose a version that will change the program</h2>
        {C4_P5_VERSION_OPTIONS.map((option) => (
          <Choice
            key={option.id}
            option={option}
            active={version === option.id}
            onPick={() => setVersion(option.id)}
          />
        ))}
      </section>
      <section className="space-y-2">
        <h2 className="font-bold">Ask your peers to predict first</h2>
        {C4_P5_PREDICTION_OPTIONS.map((option) => (
          <Choice
            key={option.id}
            option={option}
            active={prediction === option.id}
            onPick={() => setPrediction(option.id)}
          />
        ))}
      </section>
      <section className="space-y-3 rounded-2xl border border-brand-sky/50 bg-wash-sky p-5">
        <h2 className="font-black">Keep the name chain and set up the selected Tap chain</h2>
        <p>
          Go first to confirm that there is only the name, and then ask your partner to tapWukong.
          Only 3–5 blocks consistent with your choice and two real runs are considered complete.
        </p>
        <button
          className="btn-pill-primary"
          disabled={!readingDone || creating}
          onClick={() => void openStudio()}
        >
          {build.data?.projectId ? 'Return to my selection workspace' : 'Open selection workspace'}
        </button>
        <p data-testid="jtw-c4p5-build-status">
          {buildDone
            ? `✓ ${version} version saved and Go/Tap dual testing completed`
            : 'Waiting for real selection, block editing, saving and double testing'}
        </p>
      </section>
      {resolved && (
        <section
          className="rounded-2xl border border-brand-mint bg-wash-mint p-5"
          data-testid="jtw-c4p5-resolved"
        >
          <h2 className="font-black">
            The selected action only appears after Tap, and the name is still controlled by Start.
          </h2>
          <p>
            Wukong explains that you are responding when the audience is ready. A gust of wind then
            blew the entire chain to the wrong entrance.
          </p>
        </section>
      )}
      <button
        className="btn-pill-primary w-full"
        data-testid="jtw-c4p5-continue"
        disabled={!resolved || complete.isPending}
        onClick={() => complete.mutate()}
      >
        {completed ? 'Return to map' : C4_P5_CONTINUE_LABEL}
      </button>
      <p className="text-center text-[12px] text-ink-soft">
        This Part only unlocks P6 and does not complete Chapter 4.
      </p>
    </div>
  );
}
