import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import type { Block } from '../blocksModel';
import { BlocksRunner } from '../interpreter';
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi';
import { jtwC5C6BuildMatches } from '../jtwC5C6Builds';
import { Choice, EvidenceGroup, OrderCards } from './partUi';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import {
  C5_NEXT,
  C5_REVERSED_DEMO,
  C5_ROUTE_ORDER,
  C5_STATE_DEMO,
  c5Page,
  type C5EarlyPartId,
} from './journeyWestC5Program';

const MAP = '/learn/story/journey-west';
const STORY: Record<C5EarlyPartId, string[]> = {
  'jtw-s1-c5-p1': [
    'Wukong returns to Flower-Fruit Mountain after learning. The wooden stick was bent and the stone hammer was inconvenient to use; he needed a tool that could be moved, changed in size, and easy to carry.',
    'Column shadows appear deep in the sea. It is not an enemy, nor is it a gift from the master; Wukong decided to go to the East China Sea Dragon Palace to see it clearly.',
  ],
  'jtw-s1-c5-p2': [
    'The pillar hall has three levels of scale: large, original and small. Golden-Hooped Staff will Grow, Reset, and Shrink in sequence, and the last executed status block determines the end.',
    'Reset does not rewind the story, it only restores the size to its original state.',
  ],
  'jtw-s1-c5-p3': [
    'The child remembers the three states of stretching, standing back to the original position, and shrinking, and then compares the two sequences.',
    'The body movements are just models; the real evidence still comes from two complete trajectories of the same interpreter.',
  ],
  'jtw-s1-c5-p4': [
    'The narrow door is still obscured by the shadow of the pillars. Please put Grow, Wait, Reset, and Shrink between Start and End by hand.',
    'Turn can run, but it cannot answer big or small questions; half of the Ruyi Seal will light up only after it is fully run.',
  ],
  'jtw-s1-c5-p5': [
    'The biggest is not necessarily the most suitable. Narrow doors, curved waterways and return water curtains all require Golden-Hooped Staff to be carried safely in the end.',
    'Please change the state order or rhythm of P4, choose the purpose for the three segments, and prove with real operation that the last is a small state.',
  ],
};

const ROUTE_CARDS = [
  { id: 'learned-home', label: 'Go home after studying', correct: true },
  { id: 'tools-unfit', label: 'Old tools are not suitable', correct: true },
  { id: 'pillar-shadow', label: 'Column shadow appears on the bottom of the sea', correct: true },
];
const MOTIVES = [
  { id: 'wood-bent', label: 'The stick is bent', correct: true },
  { id: 'hammer-awkward', label: 'Stone hammer is inconvenient to use', correct: true },
  { id: 'defeat-enemy', label: 'In order to defeat the enemies in this chapter', correct: false },
];
const STATE_OPTIONS = [
  {
    id: 'small',
    label: 'The last is small, because the last state block is Shrink',
    correct: true,
  },
  { id: 'large', label: 'The last one must be the biggest' },
];
const RESET_OPTIONS = [
  { id: 'restore', label: 'Reset restores the initial size, not doing nothing', correct: true },
  { id: 'rewind', label: 'Reset will rewind the entire story' },
];
export function JourneyWestC5PartsPage({
  partId,
  previewSleep = async () => undefined,
}: {
  partId: C5EarlyPartId;
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
  const studioBuild = useQuery({
    queryKey: ['jtw-c5-studio-build', partId, kidId],
    enabled: Boolean(kidId) && (partId.endsWith('p4') || partId.endsWith('p5')),
    queryFn: async () => {
      for (const meta of (await listBlocksProjects(kidId!)).slice(0, 12)) {
        const loaded = await loadBlocksProject(meta.id);
        if (
          jtwC5C6BuildMatches(loaded.project, partId) &&
          loaded.storyProgress?.completed?.[partId]
        ) {
          return {
            projectId: meta.id,
            blocks: loaded.project.pages[0].characters[0].scripts[0].blocks,
          };
        }
      }
      return null;
    },
  });
  const saved = progress.data?.completed.find((entry) => entry.part_id === partId);
  const priorP4 = progress.data?.completed.find((entry) => entry.part_id === 'jtw-s1-c5-p4');
  const unlocked = progress.data?.unlocked_part_ids.includes(partId) ?? false;
  const [route, setRoute] = useState<string[]>([]);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [reset, setReset] = useState<string | null>(null);
  const [trace, setTrace] = useState<string[]>([]);
  const [secondTrace, setSecondTrace] = useState<string[]>([]);
  const [uses, setUses] = useState<string[]>([]);
  const [restored, setRestored] = useState(false);
  const runningTrace = useRef<'first' | 'second'>('first');

  if (saved && !restored) {
    const selections = (saved.evidence as StoryPartEvidence).selections;
    setRoute(selections.route_order ?? []);
    setEvidence(selections.motive_evidence ?? selections.environment_evidence ?? []);
    setPrediction((saved.evidence as StoryPartEvidence).prediction ?? null);
    setReset(selections.reset_explanation?.[0] ?? null);
    setTrace(selections.run_trace ?? []);
    setSecondTrace(selections.second_run_trace ?? []);
    setUses(selections.use_labels ?? []);
    setRestored(true);
  }
  const run = async (blocks: Block[], destination: 'first' | 'second' = 'first') => {
    runningTrace.current = destination;
    const values: string[] = [];
    const runner = new BlocksRunner(
      c5Page(blocks),
      {
        onSprite: (_id, state) => values.push(String(state.size)),
        onSay: () => undefined,
        onNote: () => undefined,
        onSound: () => undefined,
        onGotoPage: () => undefined,
        onStep: (_id, _script, index) => {
          if (index >= 0) values.push(blocks[index]?.op ?? '');
        },
      },
      previewSleep,
    );
    await runner.runFlag();
    const result = [...values, `final:${runner.state('ruyi-staff')?.size}`];
    if (destination === 'first') setTrace(result);
    else setSecondTrace(result);
  };

  const p1Done =
    route.join('|') === C5_ROUTE_ORDER.join('|') &&
    evidence.includes('wood-bent') &&
    evidence.includes('hammer-awkward') &&
    prediction === 'fit-not-biggest';
  const p2Done =
    prediction === 'small' &&
    reset === 'restore' &&
    trace.includes('shrink') &&
    trace.some((item) => item.startsWith('final:'));
  const p3Done =
    reset === 'restore' && trace.at(-1) === 'final:1.8' && secondTrace.at(-1) === 'final:2.2';
  const p4Done = Boolean(studioBuild.data);
  const p5Done = evidence.length >= 2 && uses.length === 3 && Boolean(studioBuild.data);
  const done = {
    'jtw-s1-c5-p1': p1Done,
    'jtw-s1-c5-p2': p2Done,
    'jtw-s1-c5-p3': p3Done,
    'jtw-s1-c5-p4': p4Done,
    'jtw-s1-c5-p5': p5Done,
  }[partId];

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, partId, {
        schema_version: 1,
        prediction: prediction ?? undefined,
        selections: {
          route_order: route,
          motive_evidence: partId === 'jtw-s1-c5-p1' ? evidence : [],
          environment_evidence: partId === 'jtw-s1-c5-p5' ? evidence : [],
          reset_explanation: reset ? [reset] : [],
          build_ops:
            partId === 'jtw-s1-c5-p4'
              ? (studioBuild.data?.blocks.map((block) => block.op) ?? [])
              : [],
          choice_ops:
            partId === 'jtw-s1-c5-p5'
              ? (studioBuild.data?.blocks.map((block) => block.op) ?? [])
              : [],
          build_project: studioBuild.data ? [studioBuild.data.projectId] : [],
          run_trace: trace,
          second_run_trace: secondTrace,
          use_labels: uses,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate(MAP, { state: { unlocked: C5_NEXT[partId] } });
    },
  });

  if (progress.isLoading)
    return (
      <p className="p-8 text-center">The water pattern of Dragon Palace is becoming clear...</p>
    );
  if (!unlocked && !saved)
    return (
      <div className="p-8 text-center" data-testid="jtw-c5-locked">
        <Link to={MAP}>Complete the previous story first</Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl space-y-7 px-4 py-8" data-testid={`jtw-${partId}`}>
      <header>
        <p className="text-xs font-bold text-brand-sky">
          Journey to the West · Chapter 5 · Part {partId.at(-1)}
        </p>
        <h1 className="text-3xl font-black">The Golden-Hooped Staff: any size you need</h1>
      </header>
      <section className="space-y-3" data-testid="jtw-c5-story">
        {STORY[partId].map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </section>
      {partId === 'jtw-s1-c5-p1' && (
        <>
          <OrderCards
            title="Arrange three story cards"
            options={ROUTE_CARDS}
            order={route}
            onChange={setRoute}
            done={route.join('|') === C5_ROUTE_ORDER.join('|')}
            testId="jtw-c5p1-route"
          />
          <EvidenceGroup
            title="Evidence that choosing two tools is inappropriate"
            options={MOTIVES}
            selected={evidence}
            onToggle={(id) =>
              setEvidence((current) =>
                current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
              )
            }
            done={evidence.includes('wood-bent') && evidence.includes('hammer-awkward')}
            testId="jtw-c5p1-evidence"
          />
          <Choice
            option={{
              id: 'fit-not-biggest',
              label: 'The right clues are most important, not bigger is better',
              correct: true,
            }}
            active={prediction === 'fit-not-biggest'}
            onPick={() => setPrediction('fit-not-biggest')}
          />
        </>
      )}
      {partId === 'jtw-s1-c5-p2' && (
        <>
          <ChoiceList
            title="Predict the final size first"
            options={STATE_OPTIONS}
            selected={prediction}
            onSelect={setPrediction}
          />
          <button
            className="btn-pill-primary"
            disabled={!prediction}
            data-testid="jtw-c5p2-run"
            onClick={() => void run(C5_STATE_DEMO)}
          >
            Go: running real-size trajectories
          </button>
          <Trace value={trace} />
          <ChoiceList
            title="What is Reset"
            options={RESET_OPTIONS}
            selected={reset}
            onSelect={setReset}
          />
        </>
      )}
      {partId === 'jtw-s1-c5-p3' && (
        <>
          <ChoiceList
            title="Description Reset"
            options={RESET_OPTIONS}
            selected={reset}
            onSelect={setReset}
          />
          <div className="flex gap-3">
            <button
              className="btn-pill-primary"
              data-testid="jtw-c5p3-first"
              onClick={() => void run(C5_STATE_DEMO, 'first')}
            >
              Run large→original→small
            </button>
            <button
              className="btn-pill-secondary"
              data-testid="jtw-c5p3-second"
              onClick={() => void run(C5_REVERSED_DEMO, 'second')}
            >
              Run small→original→large
            </button>
          </div>
          <Trace value={trace} />
          <Trace value={secondTrace} />
        </>
      )}
      {partId === 'jtw-s1-c5-p4' && (
        <StudioBuild partId={partId} projectId={studioBuild.data?.projectId} navigate={navigate} />
      )}
      {partId === 'jtw-s1-c5-p5' && (
        <>
          <p data-testid="jtw-c5p5-prior">
            P4 save chain:
            {(priorP4?.evidence as StoryPartEvidence | undefined)?.selections.build_ops?.join(
              ' → ',
            ) ?? 'Waiting for P4'}
          </p>
          <EvidenceGroup
            title="Find two environmental constraints"
            options={[
              { id: 'narrow-door', label: 'narrow gate', correct: true },
              { id: 'curved-waterway', label: 'crooked waterway', correct: true },
              { id: 'water-curtain', label: 'Return water curtain', correct: true },
            ]}
            selected={evidence}
            onToggle={(id) =>
              setEvidence((current) =>
                current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
              )
            }
            done={evidence.length >= 2}
            testId="jtw-c5p5-environment"
          />
          <StudioBuild
            partId={partId}
            projectId={studioBuild.data?.projectId}
            navigate={navigate}
          />
          <EvidenceGroup
            title="Choose a purpose for the three-segment state"
            options={[
              { id: 'show-origin', label: 'See the original appearance', correct: true },
              { id: 'compare-start', label: 'compare initial', correct: true },
              { id: 'carry-home', label: 'ready to carry', correct: true },
            ]}
            selected={uses}
            onToggle={(id) =>
              setUses((current) =>
                current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
              )
            }
            done={uses.length === 3}
            testId="jtw-c5p5-uses"
          />
        </>
      )}
      <Trace value={partId === 'jtw-s1-c5-p4' || partId === 'jtw-s1-c5-p5' ? trace : []} />
      {(done || saved) && (
        <section className="rounded-2xl bg-wash-mint p-5" data-testid="jtw-c5-resolved">
          <strong>World changes:</strong>
          {partId === 'jtw-s1-c5-p5'
            ? 'The narrow-door safety line appears; Wukong knows that the right fit is the goal. Next time, check the Reset hidden at the end.'
            : 'The shadow of the pillar changes according to the evidence, and the next part of the story has been revealed.'}
        </section>
      )}
      <button
        className="btn-pill-primary w-full"
        data-testid="jtw-c5-complete"
        disabled={(!done && !saved) || complete.isPending}
        onClick={() => complete.mutate()}
      >
        Continue to the next Part
      </button>
    </div>
  );
}

function ChoiceList({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string;
  options: Array<{ id: string; label: string; correct?: boolean }>;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section>
      <h2 className="mb-2 font-bold">{title}</h2>
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <Choice
            key={option.id}
            option={option}
            active={selected === option.id}
            onPick={() => onSelect(option.id)}
          />
        ))}
      </div>
    </section>
  );
}

function StudioBuild({
  partId,
  projectId,
  navigate,
}: {
  partId: C5EarlyPartId;
  projectId?: string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const open = async () => {
    if (projectId) return navigate(`/learn/blocks/${projectId}`);
    const p4 = partId.endsWith('p4');
    const created = await createBlocksProject({
      title: p4 ? 'Ruyi Staff State Build' : 'Ruyi Staff Portable Build',
      template: p4 ? 'blocks_jtw_c5_p4' : 'blocks_jtw_c5_p5',
    });
    navigate(`/learn/blocks/${created.id}`);
  };
  return (
    <section className="space-y-3" data-testid="jtw-c5-editor">
      <p>
        {projectId
          ? '✓ Blocks Studio project saved with real Go run'
          : 'Build and run it yourself in Blocks Studio; the page buttons are not replaced.'}
      </p>
      <button className="btn-pill-primary" onClick={() => void open()}>
        {projectId ? 'Restart real projects' : 'Open Blocks Studio'}
      </button>
    </section>
  );
}

function Trace({ value }: { value: string[] }) {
  return value.length ? (
    <p className="rounded-xl bg-wash-sky p-3" data-testid="jtw-c5-trace">
      {value.join(' → ')}
    </p>
  ) : null;
}
