import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi';
import { jtwC5C6BuildMatches } from '../jtwC5C6Builds';
import { Choice, OrderCards } from './partUi';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import {
  C6_EVENT_ORDER,
  PAGE_ONE,
  PAGE_THREE_BUG,
  PAGE_TWO,
  PAGE_TWO_BUG,
  c6Project,
  runC6,
} from './journeyWestC6Program';
import { boundedC6EvidenceTrace, nonEmptyC6Selections } from './journeyWestC6Evidence';

type PartId = `jtw-s1-c6-p${3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`;
const MAP = '/learn/story/journey-west';
const NEXT: Record<PartId, string> = {
  'jtw-s1-c6-p3': 'jtw-s1-c6-p4',
  'jtw-s1-c6-p4': 'jtw-s1-c6-p5',
  'jtw-s1-c6-p5': 'jtw-s1-c6-p6',
  'jtw-s1-c6-p6': 'jtw-s1-c6-p7',
  'jtw-s1-c6-p7': 'jtw-s1-c6-p8',
  'jtw-s1-c6-p8': 'jtw-s1-c6-p9',
  'jtw-s1-c6-p9': 'jtw-s1-c6-p10',
  'jtw-s1-c6-p10': 'jtw-s2-c1-p1',
};
const TITLES: Record<PartId, string> = {
  'jtw-s1-c6-p3': 'Six things cannot happen at the same time',
  'jtw-s1-c6-p4': 'Make the identity conflict clear on the first page',
  'jtw-s1-c6-p5': 'Page 2 separates action from response',
  'jtw-s1-c6-p6': 'My prequel rhythm',
  'jtw-s1-c6-p7': 'It’s Five Elements Mountain but it’s not over yet',
  'jtw-s1-c6-p8': 'My three-page Monkey King prequel',
  'jtw-s1-c6-p9': 'Six seals and four reasons',
  'jtw-s1-c6-p10': 'The first journey is complete',
};
const EVENT_CARDS = C6_EVENT_ORDER.map((id, index) => ({
  id,
  label: [
    'dissatisfied with office',
    'leave',
    'independent title',
    'Enter the heaven again',
    'The storm escalates',
    'Five Elements Mountain results',
  ][index],
  correct: true,
}));
export function JourneyWestC6FinalPartsPage({
  partId,
  previewSleep = async () => undefined,
}: {
  partId: PartId;
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
  const saved = progress.data?.completed.find((entry) => entry.part_id === partId);
  const p8 = progress.data?.completed.find((entry) => entry.part_id === 'jtw-s1-c6-p8');
  const p8ProjectId = (p8?.evidence as StoryPartEvidence | undefined)?.selections
    .build_project?.[0];
  const p8Build = useQuery({
    queryKey: ['jtw-c6-p8-build', p8ProjectId],
    queryFn: () => loadBlocksProject(p8ProjectId!),
    enabled: (partId.endsWith('p9') || partId.endsWith('p10')) && Boolean(p8ProjectId),
  });
  const studioBuild = useQuery({
    queryKey: ['jtw-c6-studio-build', partId, kidId],
    enabled: Boolean(kidId) && [4, 5, 8].includes(Number(partId.split('p').at(-1))),
    queryFn: async () => {
      for (const meta of (await listBlocksProjects(kidId!)).slice(0, 15)) {
        const loaded = await loadBlocksProject(meta.id);
        if (
          jtwC5C6BuildMatches(loaded.project, partId) &&
          loaded.storyProgress?.completed?.[partId]
        )
          return {
            projectId: meta.id,
            version: loaded.version,
            snapshot: JSON.stringify(loaded.project),
            project: loaded.project,
          };
      }
      return null;
    },
  });
  const [cards, setCards] = useState<string[]>([]);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);
  const [trace, setTrace] = useState<string[]>([]);
  const [bugTrace, setBugTrace] = useState<string[]>([]);
  const [fixed, setFixed] = useState(false);
  const [repeatTrace, setRepeatTrace] = useState<string[]>([]);
  const [reopened, setReopened] = useState(false);
  const [peer, setPeer] = useState(false);
  const [retell, setRetell] = useState<string[]>([]);
  const [later, setLater] = useState(false);
  const seal = progress.data?.chapter_seals?.find(
    (entry) => entry.seal_id === 'jtw-s1-c6-first-journey-seal',
  );
  const number = Number(partId.split('p').at(-1));
  const exactOrder = cards.join('|') === C6_EVENT_ORDER.join('|');
  const done =
    saved ||
    (number === 3 && exactOrder && reasons.length === 2 && trace.length > 0) ||
    (number === 4 && Boolean(studioBuild.data) && reasons.length === 2) ||
    (number === 5 && Boolean(studioBuild.data) && reasons.length === 2) ||
    (number === 6 && reasons.length >= 3 && trace.length > 0 && peer) ||
    (number === 7 &&
      bugTrace.some((item) => item.includes('planned:forever')) &&
      fixed &&
      trace.at(-1)?.includes('end') &&
      trace.join('|') === repeatTrace.join('|')) ||
    (number === 8 &&
      Boolean(studioBuild.data) &&
      reopened &&
      trace.at(-1)?.includes('end') &&
      peer) ||
    (number === 9 && retell.length === 4 && trace.length > 0 && peer) ||
    (number === 10 &&
      trace.at(-1)?.includes('end') &&
      prediction === 'stable-mountain' &&
      reasons.length === 2);

  const run = async () => setTrace(await runC6(c6Project(), previewSleep));
  const openStudio = async () => {
    if (studioBuild.data) return navigate(`/learn/blocks/${studioBuild.data.projectId}`);
    const template =
      number === 4 ? 'blocks_jtw_c6_p4' : number === 5 ? 'blocks_jtw_c6_p5' : 'blocks_jtw_c6_p8';
    const created = await createBlocksProject({ title: TITLES[partId], template });
    navigate(`/learn/blocks/${created.id}`);
  };
  const reopen = async () => {
    if (!studioBuild.data) return;
    const loaded = await loadBlocksProject(studioBuild.data.projectId);
    setReopened(
      JSON.stringify(loaded.project) === studioBuild.data.snapshot &&
        jtwC5C6BuildMatches(loaded.project),
    );
  };
  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, partId, {
        schema_version: 1,
        prediction: prediction ?? undefined,
        selections: nonEmptyC6Selections({
          event_order: cards,
          page_groups: exactOrder
            ? ['p1:job-leave-title', 'p2:return-response', 'p3:mountain']
            : [],
          wait_reasons: reasons,
          preview_trace: boundedC6EvidenceTrace(trace),
          build_ast: studioBuild.data ? ['saved-studio-ast'] : [],
          cause_links: reasons,
          run_trace: boundedC6EvidenceTrace(trace),
          before_ast: number === 5 ? PAGE_TWO_BUG.map((item) => item.op) : [],
          after_ast: number === 5 ? PAGE_TWO.map((item) => item.op) : [],
          peer_order: peer ? ['confirmed'] : [],
          personal_choices: reasons,
          bug_trace: boundedC6EvidenceTrace(bugTrace),
          first_break: fixed ? ['forever'] : [],
          debug_diff: fixed ? ['remove-stop-forever-add-end'] : [],
          repaired_trace: boundedC6EvidenceTrace(trace),
          repeat_trace: boundedC6EvidenceTrace(repeatTrace),
          build_project: studioBuild.data
            ? [studioBuild.data.projectId]
            : p8ProjectId
              ? [p8ProjectId]
              : [],
          saved_version: studioBuild.data ? [String(studioBuild.data.version)] : [],
          reopen_json_match: reopened ? ['true'] : [],
          peer_retell: peer ? ['same-version'] : [],
          three_page_trace: boundedC6EvidenceTrace(trace),
          retell_links: retell,
          visual_evidence: retell,
          aggregate_readback:
            number === 10 ? ['ten-parts', 'read-why-code-run-debug-retell-save'] : [],
          rights_celebration: reasons,
        }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate(MAP, { state: { unlocked: NEXT[partId] } });
    },
  });

  if (progress.isLoading) return <p className="p-8 text-center">Reading first pass evidence...</p>;
  if (!(progress.data?.unlocked_part_ids.includes(partId) || saved))
    return (
      <div className="p-8 text-center">
        <Link to={MAP}>Complete the previous Part first</Link>
      </div>
    );
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8" data-testid={`jtw-${partId}`}>
      <header>
        <p className="text-xs font-bold text-brand-sky">
          Journey to the West · Chapter 6 · Part {number}
        </p>
        <h1 className="text-3xl font-black">{TITLES[partId]}</h1>
      </header>
      {number === 3 && (
        <>
          <p>
            If six things happen at the same time, cause and effect will not be clear. Sequence it
            first, then use three pages and two stops for the audience to understand.
          </p>
          <OrderCards
            title="Rank six things"
            options={EVENT_CARDS}
            order={cards}
            onChange={setCards}
            done={exactOrder}
            testId="jtw-c6p3-order"
          />
          <Multi
            choices={['Page 1: From identity to title', 'Page 2: Invite again and get response']}
            values={reasons}
            set={setReasons}
          />
          <button
            className="btn-pill-primary"
            disabled={!exactOrder || reasons.length < 2}
            onClick={() => void run()}
          >
            Preview page by page
          </button>
        </>
      )}
      {number === 4 && (
        <StudioTask
          title="Take Page 1: Two sentences, move, stop, Page exit"
          ready={Boolean(studioBuild.data)}
          reasons={reasons}
          setReasons={setReasons}
          open={openStudio}
        />
      )}
      {number === 5 && (
        <StudioTask
          title="Rearrange Page 2: Action, Response, Time Shadow, Page Exit"
          ready={Boolean(studioBuild.data)}
          reasons={reasons}
          setReasons={setReasons}
          open={openStudio}
        />
      )}
      {number === 6 && (
        <>
          <p>
            Load two pages of success chains, change the Wait, speed and Tap/Golden-Hooped Staff
            status to let your partners hear the boundary.
          </p>
          <Multi
            choices={[
              'Page 1 Wait changed to 3',
              'Page 2 Select Slow',
              'Tap ability + Shrink carry',
            ]}
            values={reasons}
            set={setReasons}
          />
          <button
            className="btn-pill-primary"
            disabled={reasons.length < 3}
            onClick={() => void run()}
          >
            run my rhythm
          </button>
          {trace.length > 0 && (
            <Choice
              option={{
                id: 'peer',
                label: 'Partners point out the delineation between action and response',
                correct: true,
              }}
              active={peer}
              onPick={() => setPeer(true)}
            />
          )}
        </>
      )}
      {number === 7 && (
        <>
          <p>
            Expected to end stable in Five Elements Mountain. Run the wrong version first, locate
            the first deviation, and then just change to End.
          </p>
          <button
            className="btn-pill-primary"
            onClick={async () =>
              setBugTrace(await runC6(c6Project(PAGE_ONE, PAGE_TWO, PAGE_THREE_BUG), previewSleep))
            }
          >
            Run Stop + Again error version
          </button>
          {bugTrace.length > 0 && (
            <button className="btn-pill-secondary" onClick={() => setFixed(true)}>
              The first deviation is in Again; change to End
            </button>
          )}
          {fixed && (
            <>
              <button className="btn-pill-primary" onClick={() => void run()}>
                Run after repair
              </button>
              <button
                className="btn-pill-secondary"
                disabled={!trace.length}
                onClick={async () => setRepeatTrace(await runC6(c6Project(), previewSleep))}
              >
                Consistent reruns
              </button>
            </>
          )}
        </>
      )}
      {number === 8 && (
        <>
          <p>
            The three-page work must have at least 18 blocks, three event entrances, two rhythms,
            two page exits and a stable end; it must be completed and run page by page in Blocks
            Studio, and it must be closed and reopened after saving.
          </p>
          <Choice
            option={{
              id: 'three-page-plan',
              label: 'I drew three pages of stopping points and predicted the final stability End',
              correct: true,
            }}
            active={prediction === 'three-page-plan'}
            onPick={() => setPrediction('three-page-plan')}
          />
          <button
            className="btn-pill-primary"
            disabled={!prediction}
            onClick={() => void openStudio()}
          >
            {studioBuild.data
              ? 'Reopen three pages of Blocks Studio works'
              : 'Open the three-page Blocks Studio build'}
          </button>
          {studioBuild.data && (
            <>
              <button
                className="btn-pill-primary"
                onClick={async () => setTrace(await runC6(studioBuild.data!.project, previewSleep))}
              >
                Run the saved three-page version
              </button>
              <button
                className="btn-pill-secondary"
                disabled={!trace.at(-1)?.includes('end')}
                onClick={() => void reopen()}
              >
                Close and reopen the three check pages JSON
              </button>
            </>
          )}
          {reopened && (
            <Choice
              option={{
                id: 'peer',
                label: 'Partner predicts the next two pages from the first page',
                correct: true,
              }}
              active={peer}
              onPick={() => setPeer(true)}
            />
          )}
        </>
      )}
      {number === 9 && (
        <>
          <p>
            Load the same version of P8, run it from the first page, and then talk back to the four
            "becauses" independently.
          </p>
          <button
            className="btn-pill-primary"
            disabled={!p8Build.data}
            onClick={async () => setTrace(await runC6(p8Build.data!.project, previewSleep))}
          >
            Run the P8 save
          </button>
          {trace.length > 0 && (
            <>
              <Multi
                choices={[
                  'Because the identity arrangement is inappropriate',
                  'So leave and make your own title',
                  'As a result, there was still controversy over the invitation again.',
                  'Later stopped at Five Elements Mountain to wait',
                ]}
                values={retell}
                set={setRetell}
              />
              <Choice
                option={{
                  id: 'peer',
                  label: 'Partners found four pieces of evidence in the same version',
                  correct: true,
                }}
                active={peer}
                onPick={() => setPeer(true)}
              />
            </>
          )}
        </>
      )}
      {number === 10 && (
        <>
          <p>
            Load the same work for the last time, check the ten Parts and
            Read/Why/Code/Run/Debug/Retell/save and reopen the evidence. Celebrate your child's
            reading, programming, testing, and storytelling.
          </p>
          <Choice
            option={{
              id: 'stable-mountain',
              label: 'Finally, it stabilized at Five Elements Mountain',
              correct: true,
            }}
            active={prediction === 'stable-mountain'}
            onPick={() => setPrediction('stable-mountain')}
          />
          <Multi
            choices={[
              'Lesson fades away from the battle but does not write back the consequences',
              "Ribbons only surround children's works",
            ]}
            values={reasons}
            set={setReasons}
          />
          <button
            className="btn-pill-primary"
            disabled={!p8Build.data || !prediction || reasons.length < 2}
            onClick={async () => setTrace(await runC6(p8Build.data!.project, previewSleep))}
          >
            Finally run to End
          </button>
        </>
      )}
      {trace.length > 0 && (
        <p data-testid="jtw-c6-trace" className="rounded-xl bg-wash-sky p-3">
          {trace.join(' → ')}
        </p>
      )}
      {(done || saved) && (
        <section className="rounded-2xl bg-wash-mint p-5" data-testid="jtw-c6-resolved">
          {number === 10
            ? `First stamp:${seal?.lit ? 'Server is lit' : `Still missing ${seal?.missing.length ?? 0} item`}. Six chapters completed.`
            : `World changes saved; next paragraph is ${NEXT[partId]}。`}
        </section>
      )}
      <button
        data-testid="jtw-c6-complete"
        className="btn-pill-primary w-full"
        disabled={!done || complete.isPending}
        onClick={() => complete.mutate()}
      >
        continue story
      </button>
      {number === 10 && done && (
        <button className="btn-pill-ghost w-full" onClick={() => setLater(true)}>
          {later ? 'Location saved' : 'continue later'}
        </button>
      )}
    </div>
  );
}

function Multi({
  choices,
  values,
  set,
}: {
  choices: string[];
  values: string[];
  set: (value: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {choices.map((choice, index) => {
        const id = `${index}:${choice}`;
        return (
          <button
            key={id}
            className="btn-pill-secondary"
            aria-pressed={values.includes(id)}
            onClick={() =>
              set(values.includes(id) ? values.filter((item) => item !== id) : [...values, id])
            }
          >
            {choice}
          </button>
        );
      })}
    </div>
  );
}
function StudioTask({
  title,
  ready,
  reasons,
  setReasons,
  open,
}: {
  title: string;
  ready: boolean;
  reasons: string[];
  setReasons: (value: string[]) => void;
  open: () => Promise<void>;
}) {
  return (
    <>
      <p>{title}</p>
      <Multi
        choices={['reason connection 1', 'reason connection 2']}
        values={reasons}
        set={setReasons}
      />
      <button className="btn-pill-primary" onClick={() => void open()}>
        {ready
          ? 'Reopen a saved Blocks Studio project'
          : 'Open Blocks Studio and build it yourself'}
      </button>
    </>
  );
}
