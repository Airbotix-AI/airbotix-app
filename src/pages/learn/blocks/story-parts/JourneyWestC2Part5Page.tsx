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
  'The five footprints of the stone monkey stopped just in front of the water curtain. He reached out and touched the roaring water, but the water curtain was still like a closed door. The route only answers "how to get there", and now the program also needs to answer "what will happen after encountering it".',
  'Stone Monkey remembered the agreement he made with his companions: after entering, he must see clearly what was inside, and he must also come back and explain his findings clearly. There is a stone bridge vaguely behind the water curtain. There is no water on the ground inside, there are stone seats and clear water. Does this evidence indicate that partners are also suitable to come in?',
] as const;

const EVIDENCE = [
  { id: 'bridge', label: 'You can walk on the stone bridge', correct: true },
  { id: 'dry-ground', label: 'The ground is dry', correct: true },
  { id: 'stone-seat', label: 'There is a stone seat inside', correct: true },
  { id: 'clear-water', label: 'There is clear water', correct: true },
  { id: 'fastest', label: 'The stone monkey runs the fastest', correct: false },
] as const;
const PREDICTIONS = [
  {
    id: 'nothing-readable',
    label: 'Only the empty cliff face remains, with no evidence of habitation in the cave.',
    correct: true,
  },
  {
    id: 'cave-visible',
    label: 'The hole will appear by itself, Show does not require a connection',
    correct: false,
  },
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
        alt="Dry cliff face and hollow mouth at the end of wet stone road"
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
          alt="closed water curtain"
          data-testid="jtw-c2p5-curtain"
          className="absolute right-[5%] top-[3%] h-[68%] w-[49%] object-contain"
        />
      )}
      {resolved && (
        <img
          src={CAVE_ASSET}
          alt="Warm light cave entrance, with stone bridge, dry ground, stone base and clear water inside"
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
        title: 'Journey to the West · After the water curtain separates',
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

  if (progress.isLoading)
    return <p className="p-8 text-center text-ink-soft">The water curtain is falling...</p>;
  if (!unlocked && !saved) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-c2p5-locked"
      >
        <p className="font-bold text-ink">
          Complete the five-block route in Part 4 before you can connect to Collision Response.
        </p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          Back to story map
        </Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c2-p5">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          Journey to the West · Chapter 2 · Part 5 · Build 2
        </p>
        <h1 className="text-[28px] font-black text-ink">After the water curtain is separated</h1>
      </header>
      <section className="space-y-4" data-testid="jtw-c2p5-story">
        {STORY_BEFORE.map((text) => (
          <p key={text.slice(0, 12)} className="text-[16px] leading-8 text-ink">
            {text}
          </p>
        ))}
        <aside className="rounded-2xl border border-hairline bg-canvas-pure p-4 text-[14px] leading-7 text-ink">
          <strong>Story—Program Bridge:</strong> The stone monkey route produces real collisions;
          the water curtain's On Bump runs Hide, and the cave entrance's own On Bump runs Show and
          Chime gives audible and visible feedback.
        </aside>
      </section>
      <Stage resolved={resolved || Boolean(saved)} />
      <section
        className="rounded-2xl border border-brand-sky/40 bg-wash-sky p-5"
        data-testid="jtw-c2p5-build"
        data-build-state={buildDone ? 'done' : 'pending'}
      >
        <h2 className="font-bold text-ink">Connect two responses in real workspace</h2>
        <p className="mt-2 text-[14px] leading-7 text-ink-soft">
          The route has been set. Put Hide into the water curtain's On Bump track, and put Show into
          the hole's own On Bump track. Track; check the role ownership, predict first, then press
          Go and save.
        </p>
        <button
          type="button"
          className="btn-pill-primary mt-4"
          data-testid="jtw-c2p5-open-studio"
          disabled={creating}
          onClick={() => void openStudio()}
        >
          {buildDone
            ? 'Look at my collision response again'
            : build.data?.projectId
              ? 'Continue to connect →'
              : 'Start connecting →'}
        </button>
        {buildDone && (
          <span
            className="ml-3 text-[13px] font-bold text-brand-mint"
            data-testid="jtw-c2p5-build-done"
          >
            ✓ Two On Bump tracks are actually running
          </span>
        )}
      </section>
      {buildDone && (
        <section className="space-y-5 rounded-2xl border border-brand-sky/40 bg-wash-sky p-5">
          <div>
            <h2 className="mb-2 font-bold text-ink">
              If you only hide the water curtain but don't show the hole, what will your partner
              see?
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
            <h2 className="mb-2 font-bold text-ink">
              Select at least three pieces of evidence that are “suitable for partners to enter”
            </h2>
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
            When the stone monkey touches the water curtain, the two On Bump tracks respond at the
            same time: the water curtain hides, the cave entrance shows a warm light, and Chime
            sounds.
          </p>
          <p className="mt-2 font-semibold text-ink">
            The stone monkey confirmed the stone bridge, dry land, stone base and clear water, and
            decided to go back along the original road as agreed to tell his companions.
          </p>
        </section>
      )}
      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← Back to story map
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c2p5-continue"
          disabled={(!resolved && !saved) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          Go back along the same path
        </button>
      </footer>
    </div>
  );
}
