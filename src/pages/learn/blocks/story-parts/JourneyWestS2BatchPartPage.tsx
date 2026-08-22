import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import {
  createBlocksProject,
  listBlocksProjects,
  loadBlocksProject,
  type BlocksTemplateId,
} from '../blocksApi';
import { jtwS2BuildMatches } from '../jtwS2Builds';
import { JourneyWestS2Scene } from './JourneyWestS2Scene';
import { Choice, OrderCards } from './partUi';
import {
  JTW_S2_C1_P3_ID,
  JTW_S2_C1_P7_ID,
  JTW_S2_C1_P8_ID,
  JTW_S2_C2_P7_ID,
  JTW_S2_C2_P8_ID,
  JTW_S2_C3_P7_ID,
  JTW_S2_C3_P8_ID,
  JTW_S2_C4_P3_ID,
  JTW_S2_C4_P7_ID,
  JTW_S2_C4_P8_ID,
  JTW_S2_C5_P3_ID,
  JTW_S2_C5_P7_ID,
  JTW_S2_C5_P8_ID,
  JTW_S2_C6_P3_ID,
  JTW_S2_C6_P7_ID,
  JTW_S2_C6_P8_ID,
  JTW_S2_PART_CONFIGS,
  JTW_S2_STORY_LINE_ID,
} from './journeyWestSeason2';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';

const RECENT_PROJECTS_TO_SCAN = 20;
const P3_ORDER = ['read-note', 'pack-bag', 'pass-gate', 'mountain-stop'];
const P3_CARDS = [
  { id: 'read-note', label: 'Read the directions', correct: true },
  { id: 'pack-bag', label: 'Bring a suitcase', correct: true },
  { id: 'pass-gate', label: 'Cross the city gate', correct: true },
  { id: 'mountain-stop', label: 'Stop at the foot of the mountain', correct: true },
];
const C4_P3_ORDER = ['wukong-sender', 'send-blue', 'get-blue', 'bajie-receiver'];
const C4_P3_CARDS = [
  { id: 'wukong-sender', label: 'Wukong · Sender', correct: true },
  { id: 'send-blue', label: 'Send · blue', correct: true },
  { id: 'get-blue', label: 'Get · Blue', correct: true },
  { id: 'bajie-receiver', label: 'Bajie·Receiver', correct: true },
];
const C4_P3_CHECKPOINT =
  'Wukong sends blue, and Bajie receives blue, so Bajie will act; if Bajie waits for orange, he will continue to wait.';
const C5_P3_ORDER = [
  'wukong-send-blue',
  'bajie-get-blue',
  'bajie-send-yellow',
  'wujing-get-yellow',
];
const C5_P3_CARDS = [
  { id: 'wukong-send-blue', label: 'Wukong · Send blue', correct: true },
  { id: 'bajie-get-blue', label: 'Bajie · Get ​​Blue', correct: true },
  { id: 'bajie-send-yellow', label: 'Bajie · Send Yellow', correct: true },
  { id: 'wujing-get-yellow', label: 'Wu Jing · Get ​​Yellow', correct: true },
];
const C6_P3_ORDER = [
  'page-one-gather',
  'send-blue',
  'page-two-bridge',
  'send-yellow',
  'page-three-west',
  'end',
];
const C6_P3_CARDS = [
  { id: 'page-one-gather', label: 'First page · Collection', correct: true },
  { id: 'send-blue', label: 'Send · blue', correct: true },
  { id: 'page-two-bridge', label: 'Page 2 · Crossing the bridge', correct: true },
  { id: 'send-yellow', label: 'Send · Yellow', correct: true },
  { id: 'page-three-west', label: 'Page 3 · To the West', correct: true },
  { id: 'end', label: 'End', correct: true },
];

interface BuildReadback {
  projectId: string | null;
  programMatches: boolean;
  runCompleted: boolean;
  bag: string | null;
  pace: string | null;
}

async function findBuild(kidId: string, lessonId: string): Promise<BuildReadback> {
  const projects = (await listBlocksProjects(kidId)).slice(0, RECENT_PROJECTS_TO_SCAN);
  for (const meta of projects) {
    try {
      const loaded = await loadBlocksProject(meta.id);
      if (loaded.project.lessonId !== lessonId) continue;
      const blocks =
        loaded.project.pages[0]?.characters.find((character) => character.id === 'xuanzang')
          ?.scripts[0]?.blocks ?? [];
      return {
        projectId: meta.id,
        programMatches: jtwS2BuildMatches(loaded.project, lessonId),
        runCompleted: Boolean(loaded.storyProgress?.completed[lessonId]),
        bag:
          blocks.find((block) => block.op === 'say' && block.text?.startsWith('bring'))?.text ??
          null,
        pace:
          blocks.find((block) => block.op === 'set_speed')?.n === 1
            ? 'slow'
            : blocks.find((block) => block.op === 'set_speed')?.n === 2
              ? 'normal'
              : null,
      };
    } catch {
      // Ignore an unreadable legacy project and keep scanning.
    }
  }
  return { projectId: null, programMatches: false, runCompleted: false, bag: null, pace: null };
}

export function JourneyWestS2BatchPartPage({ partId }: { partId: string }) {
  const config = JTW_S2_PART_CONFIGS[partId];
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S2_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S2_STORY_LINE_ID),
    enabled: Boolean(config),
  });
  const retellBuildLesson =
    partId === JTW_S2_C1_P8_ID
      ? JTW_S2_C1_P7_ID
      : partId === JTW_S2_C2_P8_ID
        ? JTW_S2_C2_P7_ID
        : partId === JTW_S2_C3_P8_ID
          ? JTW_S2_C3_P7_ID
          : partId === JTW_S2_C4_P8_ID
            ? JTW_S2_C4_P7_ID
            : partId === JTW_S2_C5_P8_ID
              ? JTW_S2_C5_P7_ID
              : partId === JTW_S2_C6_P8_ID
                ? JTW_S2_C6_P7_ID
                : null;
  const buildLesson = config?.template ? partId : retellBuildLesson;
  const build = useQuery({
    queryKey: ['jtw-s2-build', buildLesson, kidId],
    queryFn: () => findBuild(kidId!, buildLesson!),
    enabled: Boolean(kidId && buildLesson),
  });
  const [storyRead, setStoryRead] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [extra, setExtra] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [restored, setRestored] = useState(false);
  const [creating, setCreating] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === partId);
  const unlocked = progress.data?.unlocked_part_ids.includes(partId) ?? false;
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setStoryRead((evidence.selections?.story_screens ?? []).includes(`${partId}-story`));
    setAnswer(evidence.selections?.answer?.[0] ?? null);
    setExtra(evidence.selections?.extra_answer?.[0] ?? null);
    setOrder(evidence.selections?.action_order ?? []);
    setRestored(true);
  }

  const answerDone = config.options.find((option) => option.id === answer)?.correct === true;
  const extraDone =
    !config.extraOptions ||
    config.extraOptions.find((option) => option.id === extra)?.correct === true;
  const orderDone =
    partId === JTW_S2_C1_P3_ID
      ? order.join('|') === P3_ORDER.join('|')
      : partId === JTW_S2_C4_P3_ID
        ? order.join('|') === C4_P3_ORDER.join('|')
        : partId === JTW_S2_C5_P3_ID
          ? order.join('|') === C5_P3_ORDER.join('|')
          : partId === JTW_S2_C6_P3_ID
            ? order.join('|') === C6_P3_ORDER.join('|')
            : true;
  const buildDone = !buildLesson || Boolean(build.data?.programMatches && build.data.runCompleted);
  const resolved = storyRead && answerDone && extraDone && orderDone && buildDone;
  const completed = Boolean(savedEntry);

  const openStudio = async () => {
    if (build.data?.projectId) {
      navigate(`/learn/blocks/${build.data.projectId}`);
      return;
    }
    if (!config.template) return;
    setCreating(true);
    try {
      const { id } = await createBlocksProject({
        title: config.studioTitle ?? config.title,
        template: config.template as BlocksTemplateId,
      });
      navigate(`/learn/blocks/${id}`);
    } finally {
      setCreating(false);
    }
  };

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S2_STORY_LINE_ID, partId, {
        schema_version: 1,
        selections: {
          story_screens: storyRead ? [`${partId}-story`] : [],
          answer: answer ? [answer] : [],
          extra_answer: extra ? [extra] : [],
          action_order: order,
          build_project: build.data?.projectId ? [build.data.projectId] : [],
          persisted_design: build.data?.bag ? [build.data.bag, build.data.pace ?? ''] : [],
          ...(partId === JTW_S2_C4_P3_ID && resolved
            ? {
                sender: ['wukong'],
                receiver: ['bajie'],
                matching_pair: ['blue-blue'],
                mismatch_pair: ['blue-orange'],
                matching_prediction: ['bajie-acts'],
                mismatch_prediction: ['bajie-waits'],
                checkpoint_sentence: [C4_P3_CHECKPOINT],
              }
            : {}),
        },
        prediction: partId.endsWith('-p3') ? (answer ?? undefined) : undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S2_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: config.nextId } });
    },
  });

  if (progress.isLoading)
    return <p className="p-8 text-center text-ink-soft">Preparing the next story card…</p>;
  if (!unlocked && !completed) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid={`${partId}-locked`}
      >
        <p className="font-bold text-ink">
          This page will open only after completing the previous Part.
        </p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          Back to story map
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid={partId}>
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          Journey to the West · Season 2 · {config.chapter} · {config.part} · {config.scaffold}
        </p>
        <h1 className="text-[28px] font-black text-ink">{config.title}</h1>
      </header>

      <JourneyWestS2Scene partId={partId} resolved={resolved || completed} />

      <section className="space-y-4" data-testid={`${partId}-story`}>
        {config.story.map((paragraph) => (
          <p key={paragraph} className="text-[16px] leading-8 text-ink">
            {paragraph}
          </p>
        ))}
        <button type="button" className="btn-pill-primary" onClick={() => setStoryRead(true)}>
          {storyRead
            ? 'The story has been read together ✓'
            : 'I have finished reading this story card'}
        </button>
      </section>

      {partId === JTW_S2_C1_P3_ID && storyRead && (
        <OrderCards
          title="Put the complete actions on the table first"
          options={P3_CARDS}
          order={order}
          onChange={setOrder}
          done={orderDone}
          testId={`${partId}-order`}
        />
      )}

      {partId === JTW_S2_C4_P3_ID && storyRead && (
        <OrderCards
          title="Arrange the sender, the same color message and the receiver in a complete route"
          options={C4_P3_CARDS}
          order={order}
          onChange={setOrder}
          done={orderDone}
          testId={`${partId}-order`}
        />
      )}

      {partId === JTW_S2_C5_P3_ID && storyRead && (
        <OrderCards
          title="Arrange the two relay sections in the order of sending and receiving."
          options={C5_P3_CARDS}
          order={order}
          onChange={setOrder}
          done={orderDone}
          testId={`${partId}-order`}
        />
      )}

      {partId === JTW_S2_C6_P3_ID && storyRead && (
        <OrderCards
          title="Arrange the three pages, two messages and the last End"
          options={C6_P3_CARDS}
          order={order}
          onChange={setOrder}
          done={orderDone}
          testId={`${partId}-order`}
        />
      )}

      <section data-testid={`${partId}-question`}>
        <h2 className="mb-2 text-[15px] font-bold text-ink">{config.question}</h2>
        <div className="flex flex-col gap-2">
          {config.options.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={answer === option.id}
              onPick={() => setAnswer(option.id)}
            />
          ))}
        </div>
        {answer && !answerDone && (
          <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
            Let’s go back to the story evidence and the sequence of events.
          </p>
        )}
      </section>

      {config.extraOptions && (
        <section data-testid={`${partId}-extra`}>
          <h2 className="mb-2 text-[15px] font-bold text-ink">{config.extraQuestion}</h2>
          <div className="flex flex-col gap-2">
            {config.extraOptions.map((option) => (
              <Choice
                key={option.id}
                option={option}
                active={extra === option.id}
                onPick={() => setExtra(option.id)}
              />
            ))}
          </div>
        </section>
      )}

      {config.template && (
        <section
          className="rounded-2xl border border-brand-sky/40 bg-wash-sky p-5"
          data-testid={`${partId}-build`}
          data-build-state={buildDone ? 'done' : build.data?.projectId ? 'in-progress' : 'none'}
        >
          <h2 className="font-bold text-ink">Complete, run and save in real Blocks Studio</h2>
          <p className="mt-2 text-[13px] leading-6 text-ink-soft">
            The finish button reads saved projects and running records; just dragging blocks, just
            selecting answers, or running without pressing Go will not pass.
          </p>
          <button
            type="button"
            className="btn-pill-primary mt-4"
            disabled={creating}
            onClick={() => void openStudio()}
          >
            {creating
              ? 'Creating…'
              : buildDone
                ? 'Reopen and run'
                : build.data?.projectId
                  ? 'Continue to build'
                  : 'Open workspace'}
          </button>
          {buildDone && (
            <p className="mt-3 font-bold text-brand-mint">
              ✓ The program structure matches, has been actually run and saved
            </p>
          )}
          {(partId === JTW_S2_C1_P7_ID || partId === JTW_S2_C2_P7_ID) && build.data?.bag && (
            <p className="mt-2 text-[13px] text-ink">
              Saved design:{build.data.bag} · {build.data.pace === 'slow' ? 'slow' : 'normal speed'}
            </p>
          )}
        </section>
      )}

      {retellBuildLesson && (
        <section
          className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-5"
          data-testid={`${partId}-p7-readback`}
        >
          <h2 className="font-bold text-ink">Read the personal works of the previous Part</h2>
          <p className="mt-2 text-[13px] text-ink-soft">
            The retell page does not create new answer projects; it reads real projects that P7 has
            saved and run.
          </p>
          <p className={`mt-3 font-bold ${buildDone ? 'text-brand-mint' : 'text-brand-coral'}`}>
            {buildDone
              ? `✓ Valid saved running records of P7 have been read back${build.data?.bag ? `：${build.data.bag}` : ''}`
              : 'No valid saved run records for P7 have been read yet.'}
          </p>
        </section>
      )}

      {(resolved || completed) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid={`${partId}-resolved`}
        >
          <p className="font-bold text-ink">
            This Part's story evidence, procedural results, and preservation evidence are aligned.
          </p>
          {partId === JTW_S2_C4_P3_ID && (
            <div
              className="mt-3 space-y-2 text-[14px] text-ink"
              data-testid={`${partId}-comparison`}
            >
              <p>🔵 Wukong Send blue ─── Bajie Get blue: Bajie will take action</p>
              <p>🔵 Wukong Send Blue ─⨯─ 🟠 Bajie Get Orange: Bajie continues to wait</p>
              <p>{C4_P3_CHECKPOINT}</p>
            </div>
          )}
          <p className="mt-2 text-[14px] text-ink">
            Continuing will only unlock {config.nextId}, will not open the entire chapter at once.
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
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => complete.mutate()}
          data-testid={`${partId}-continue`}
        >
          {complete.isPending ? 'Saving…' : 'Continue story →'}
        </button>
      </footer>
      {complete.isError && (
        <p role="alert" className="text-[13px] font-semibold text-brand-coral">
          The evidence is not saved yet, please try again.
        </p>
      )}
    </div>
  );
}
