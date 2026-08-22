import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import { Choice } from './partUi';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import {
  C4_P4_CLASSIC_CARD,
  C4_P4_CONTINUE_LABEL,
  C4_P4_NEXT_PART_ID,
  C4_P4_PART_ID,
  C4_P4_PREDICTION_OPTIONS,
  C4_P4_RESOLVED_WORLD_CHANGE,
  C4_P4_STORY_AFTER,
  C4_P4_STORY_BEFORE,
  C4_P4_STORY_BRIDGE,
  C4_P4_TAP_OPTIONS,
  C4_P4_TEMPLATE_ID,
  c4p4BuildEvidence,
  c4p4PredictionCorrect,
  c4p4TapPredictionCorrect,
  type C4P4BuildEvidence,
} from './journeyWestC4Part4Program';

const RECENT_PROJECTS_TO_SCAN = 8;

async function findBuild(kidId: string): Promise<C4P4BuildEvidence | null> {
  const projects = (await listBlocksProjects(kidId)).slice(0, RECENT_PROJECTS_TO_SCAN);
  for (const project of projects) {
    try {
      const loaded = await loadBlocksProject(project.id);
      if (loaded.project.lessonId !== C4_P4_PART_ID) continue;
      return c4p4BuildEvidence(
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

export function JourneyWestC4Part4Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });
  const build = useQuery({
    queryKey: ['jtw-c4-p4-build', kidId],
    queryFn: () => findBuild(kidId!),
    enabled: Boolean(kidId),
  });
  const [goPrediction, setGoPrediction] = useState<string | null>(null);
  const [tapPrediction, setTapPrediction] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(false);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === C4_P4_PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(C4_P4_PART_ID) ?? false;
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setGoPrediction(evidence.prediction ?? null);
    setTapPrediction(evidence.selections?.tap_prediction?.[0] ?? null);
    setRestored(true);
  }

  const predictionDone =
    c4p4PredictionCorrect(goPrediction) && c4p4TapPredictionCorrect(tapPrediction);
  const buildDone = Boolean(build.data?.programMatches && build.data.dualRunCompleted);
  const resolved = predictionDone && buildDone;
  const completed = Boolean(savedEntry);

  const openStudio = async () => {
    if (build.data?.projectId) {
      navigate(`/learn/blocks/${build.data.projectId}`);
      return;
    }
    setCreating(true);
    setCreateError(false);
    try {
      const { id } = await createBlocksProject({
        title: 'Journey to the West · The name first stands firm, the ability then responds',
        template: C4_P4_TEMPLATE_ID,
      });
      navigate(`/learn/blocks/${id}`);
    } catch {
      setCreateError(true);
      setCreating(false);
    }
  };

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, C4_P4_PART_ID, {
        schema_version: 1,
        selections: {
          tap_prediction: tapPrediction ? [tapPrediction] : [],
          build_project: build.data?.projectId ? [build.data.projectId] : [],
          placed_blocks: build.data?.placedBlocks ?? [],
          run_trace: ['flag:name-show-say-end', 'wait:skill-quiet', 'tap:hop-say-end'],
        },
        prediction: goPrediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: C4_P4_NEXT_PART_ID } });
    },
  });

  if (progress.isLoading)
    return <p className="p-8 text-center text-ink-soft">Two chains of events are unfolding...</p>;
  if (!unlocked && !completed) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-c4p4-locked"
      >
        <p className="font-bold text-ink">
          Complete the two entrance circles first before you can open the real dual-event workspace.
        </p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          Back to story map
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p4">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          Journey to the West · Chapter 4 Your name is Sun Wukong · Part 4
        </p>
        <h1 className="text-[28px] font-black text-ink">
          Stand firm on the name first, then respond with the ability
        </h1>
      </header>

      <section
        className="space-y-3 rounded-2xl border border-hairline bg-canvas-pure p-5"
        data-testid="jtw-c4p4-story"
      >
        {C4_P4_STORY_BEFORE.map((paragraph) => (
          <p key={paragraph.slice(0, 16)} className="text-[16px] leading-8 text-ink">
            {paragraph}
          </p>
        ))}
        <p className="text-[13px] leading-6 text-ink-soft">{C4_P4_CLASSIC_CARD}</p>
        <p className="rounded-xl bg-wash-sky p-3 text-[14px] leading-6 text-ink">
          {C4_P4_STORY_BRIDGE}
        </p>
      </section>

      <section className="space-y-2" data-testid="jtw-c4p4-go-prediction">
        <h2 className="font-bold text-ink">Just press Go, which chain should stay quiet?</h2>
        {C4_P4_PREDICTION_OPTIONS.map((option) => (
          <Choice
            key={option.id}
            option={option}
            active={goPrediction === option.id}
            onPick={() => setGoPrediction(option.id)}
          />
        ))}
      </section>
      <section className="space-y-2" data-testid="jtw-c4p4-tap-prediction">
        <h2 className="font-bold text-ink">Which target lights up after the real TapWukong?</h2>
        {C4_P4_TAP_OPTIONS.map((option) => (
          <Choice
            key={option.id}
            option={option}
            active={tapPrediction === option.id}
            onPick={() => setTapPrediction(option.id)}
          />
        ))}
      </section>

      <section
        className="space-y-3 rounded-2xl border border-brand-sky/50 bg-wash-sky p-5"
        data-testid="jtw-c4p4-build"
      >
        <h2 className="font-black text-ink">Real workspace: six blocks divided into two chains</h2>
        <p className="text-[14px] leading-6 text-ink">
          Trigger has been fixed. You put the Show, name Say, and End in the Start chain, and the
          Hop 2, invitation Say, and End in the Tap chain. After completion, press Go and wait, then
          click Wukong on the stage.
        </p>
        <button
          className="btn-pill-primary"
          type="button"
          disabled={!predictionDone || creating}
          onClick={() => void openStudio()}
        >
          {build.data?.projectId
            ? 'Back to my dual event workspace'
            : 'Open the dual event workspace'}
        </button>
        {createError && (
          <p className="text-sm text-red-700">The workspace is not open yet, please try again.</p>
        )}
        <p data-testid="jtw-c4p4-build-status">
          {buildDone
            ? '✓ Six blocks have been saved; Go waits and the real Tap two trajectories reach the End'
            : 'Awaiting real bricks, saves and double test evidence'}
        </p>
      </section>

      {resolved && (
        <section
          className="space-y-2 rounded-2xl border border-brand-mint bg-wash-mint p-5"
          data-testid="jtw-c4p4-resolved"
        >
          <h2 className="font-black text-ink">{C4_P4_RESOLVED_WORLD_CHANGE}</h2>
          <p className="text-[15px] leading-7 text-ink">{C4_P4_STORY_AFTER}</p>
        </section>
      )}

      <button
        className="btn-pill-primary w-full"
        data-testid="jtw-c4p4-continue"
        type="button"
        disabled={!resolved || complete.isPending}
        onClick={() => complete.mutate()}
      >
        {completed ? 'Return to map' : C4_P4_CONTINUE_LABEL}
      </button>
      <p className="text-center text-[12px] text-ink-soft">
        This Part only unlocks P5, does not complete Chapter 4, and does not display chapter
        celebrations.
      </p>
    </div>
  );
}
