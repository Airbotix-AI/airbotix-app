import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import type { BlocksProject } from '../blocksModel';
import { BlocksRunner } from '../interpreter';
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi';
import { jtwC5C6BuildMatches } from '../jtwC5C6Builds';
import { Choice, OrderCards } from './partUi';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import {
  C5_DEBUG_BUG,
  C5_DEBUG_FIXED,
  C5_RETELL_ORDER,
  c5PersonalProject,
  type C5PartId,
} from './journeyWestC5Program';

type FinalPartId = Extract<C5PartId, 'jtw-s1-c5-p6' | 'jtw-s1-c5-p7' | 'jtw-s1-c5-p8'>;
const MAP = '/learn/story/journey-west';
const NEXT: Record<FinalPartId, string> = {
  'jtw-s1-c5-p6': 'jtw-s1-c5-p7',
  'jtw-s1-c5-p7': 'jtw-s1-c5-p8',
  'jtw-s1-c5-p8': 'jtw-s1-c6-p1',
};
const RETELL_CARDS = [
  { id: 'learned-home', label: 'Go home after studying', correct: true },
  { id: 'tools-unfit', label: 'Old things are not suitable', correct: true },
  { id: 'dragon-palace', label: 'Go to Dragon Palace', correct: true },
  { id: 'state-test', label: 'test status', correct: true },
  { id: 'fix-reset', label: 'Repair Reset', correct: true },
  { id: 'carry-staff', label: 'Carry away the Golden-Hooped Staff', correct: true },
];

async function runProject(project: BlocksProject, sleep: (ms: number) => Promise<void>) {
  const trace: string[] = [];
  const runner = new BlocksRunner(
    project.pages[0],
    {
      onSprite: (_id, state) => trace.push(`size:${state.size}`),
      onSay: () => undefined,
      onNote: () => undefined,
      onSound: () => undefined,
      onGotoPage: () => undefined,
      onStep: (_id, _script, index) => {
        if (index >= 0)
          trace.push(project.pages[0].characters[0].scripts[0].blocks[index]?.op ?? '');
      },
    },
    sleep,
  );
  await runner.runFlag();
  return [...trace, `final:${runner.state('ruyi-staff')?.size}`];
}

export function JourneyWestC5FinalPartsPage({
  partId,
  previewSleep = async () => undefined,
}: {
  partId: FinalPartId;
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
  const p5 = progress.data?.completed.find((entry) => entry.part_id === 'jtw-s1-c5-p5');
  const p7 = progress.data?.completed.find((entry) => entry.part_id === 'jtw-s1-c5-p7');
  const p7ProjectId = (p7?.evidence as StoryPartEvidence | undefined)?.selections
    .build_project?.[0];
  const p7Build = useQuery({
    queryKey: ['jtw-c5-p7-build', p7ProjectId],
    queryFn: () => loadBlocksProject(p7ProjectId!),
    enabled: partId === 'jtw-s1-c5-p8' && Boolean(p7ProjectId),
  });
  const personalBuild = useQuery({
    queryKey: ['jtw-c5-p7-studio-build', kidId],
    enabled: partId === 'jtw-s1-c5-p7' && Boolean(kidId),
    queryFn: async () => {
      for (const meta of (await listBlocksProjects(kidId!)).slice(0, 12)) {
        const loaded = await loadBlocksProject(meta.id);
        if (
          jtwC5C6BuildMatches(loaded.project, 'jtw-s1-c5-p7') &&
          loaded.storyProgress?.completed?.['jtw-s1-c5-p7']
        ) {
          return {
            projectId: meta.id,
            version: loaded.version,
            snapshot: JSON.stringify(loaded.project),
            project: loaded.project,
          };
        }
      }
      return null;
    },
  });
  const [prediction, setPrediction] = useState<string | null>(null);
  const [bugTrace, setBugTrace] = useState<string[]>([]);
  const [fixedTrace, setFixedTrace] = useState<string[]>([]);
  const [repeatTrace, setRepeatTrace] = useState<string[]>([]);
  const [firstBreak, setFirstBreak] = useState<string | null>(null);
  const [fixed, setFixed] = useState(false);
  const [personalTrace, setPersonalTrace] = useState<string[]>([]);
  const [reopened, setReopened] = useState(false);
  const [peer, setPeer] = useState<string | null>(null);
  const [cards, setCards] = useState<string[]>([]);
  const [retell, setRetell] = useState<string | null>(null);
  const [rights, setRights] = useState<string | null>(null);
  const [p8Trace, setP8Trace] = useState<string[]>([]);
  const seal = progress.data?.chapter_seals?.find(
    (entry) => entry.seal_id === 'jtw-s1-c5-ruyi-seal',
  );

  const unlocked = progress.data?.unlocked_part_ids.includes(partId) ?? false;
  const p6Done =
    prediction === 'small-before-bug' &&
    bugTrace.at(-1) === 'final:2' &&
    firstBreak === 'last-reset' &&
    fixed &&
    fixedTrace.at(-1) === 'final:1.8' &&
    fixedTrace.join('|') === repeatTrace.join('|');
  const p7Done =
    prediction === 'three-stops-small' &&
    personalTrace.at(-1) === 'final:1.8' &&
    Boolean(personalBuild.data && reopened && peer === 'three-uses');
  const p8Done =
    cards.join('|') === C5_RETELL_ORDER.join('|') &&
    prediction === 'saved-last-shrink' &&
    p8Trace.at(-1) === 'final:1.8' &&
    retell === 'because-so-result-later' &&
    rights === 'source-conflict-muted-not-gift';
  const done = partId === 'jtw-s1-c5-p6' ? p6Done : partId === 'jtw-s1-c5-p7' ? p7Done : p8Done;

  const openPersonal = async () => {
    if (personalBuild.data) return navigate(`/learn/blocks/${personalBuild.data.projectId}`);
    const created = await createBlocksProject({
      title: 'Ruyi Staff Size Story',
      template: 'blocks_jtw_c5_p7',
    });
    navigate(`/learn/blocks/${created.id}`);
  };
  const verifyReopen = async () => {
    if (!personalBuild.data) return;
    const loaded = await loadBlocksProject(personalBuild.data.projectId);
    setReopened(
      JSON.stringify(loaded.project) === personalBuild.data.snapshot &&
        jtwC5C6BuildMatches(loaded.project),
    );
  };

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, partId, {
        schema_version: 1,
        prediction: prediction ?? undefined,
        selections: {
          bug_trace: bugTrace,
          first_break: firstBreak ? [firstBreak] : [],
          debug_diff: fixed ? ['move-reset-before-shrink-only'] : [],
          repaired_trace: fixedTrace,
          repeat_trace: repeatTrace,
          build_project: personalBuild.data ? [personalBuild.data.projectId] : [],
          saved_version: personalBuild.data ? [String(personalBuild.data.version)] : [],
          reopen_json_match: reopened ? ['true'] : [],
          peer_retell: peer ? [peer] : [],
          runner_result: personalTrace,
          cause_card_order: cards,
          retell_links: retell ? [retell] : [],
          rights_boundary: rights ? [rights] : [],
          run_trace: p8Trace,
          carried_p5_project:
            (p5?.evidence as StoryPartEvidence | undefined)?.selections.choice_ops ?? [],
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate(MAP, { state: { unlocked: NEXT[partId] } });
    },
  });

  if (progress.isLoading)
    return <p className="p-8 text-center">Reading the Golden-Hooped Staff evidence...</p>;
  if (!unlocked && !saved)
    return (
      <div className="p-8 text-center">
        <Link to={MAP}>Complete the previous Part first</Link>
      </div>
    );
  return (
    <div className="mx-auto max-w-3xl space-y-7 px-4 py-8" data-testid={`jtw-${partId}`}>
      <header>
        <p className="text-xs font-bold text-brand-sky">
          Journey to the West · Chapter 5 · Part {partId.at(-1)}
        </p>
        <h1 className="text-3xl font-black">
          {partId.endsWith('p6')
            ? 'Reset stood at the wrong end'
            : partId.endsWith('p7')
              ? 'My wishful story'
              : 'Take away the treasure and explain the consequences'}
        </h1>
      </header>
      {partId === 'jtw-s1-c5-p6' && (
        <>
          <p>
            Hidden at the end is Reset. Predict first, then run the wrong version; the first
            deviation must fall on the piece that actually changes the ending.
          </p>
          <Choice
            option={{
              id: 'small-before-bug',
              label:
                'I predict it should be small; if it returns to the original position, the first deviation will be at the end of Reset',
              correct: true,
            }}
            active={prediction === 'small-before-bug'}
            onPick={() => setPrediction('small-before-bug')}
          />
          <button
            data-testid="jtw-c5p6-bug"
            className="btn-pill-primary"
            disabled={!prediction}
            onClick={async () =>
              setBugTrace(
                await runProject(
                  {
                    version: 1,
                    name: 'bug',
                    pages: [
                      {
                        ...c5PersonalProject([], 1).pages[0],
                        characters: [
                          {
                            ...c5PersonalProject([], 1).pages[0].characters[0],
                            scripts: [{ id: 'debug', blocks: C5_DEBUG_BUG }],
                          },
                        ],
                      },
                    ],
                  },
                  previewSleep,
                ),
              )
            }
          >
            Run the wrong version
          </button>
          {bugTrace.length > 0 && (
            <>
              <Trace values={bugTrace} />
              <Choice
                option={{
                  id: 'last-reset',
                  label:
                    'The first deviation: the last Reset changes the small state back to the initial state',
                  correct: true,
                }}
                active={firstBreak === 'last-reset'}
                onPick={() => setFirstBreak('last-reset')}
              />
              <button
                className="btn-pill-secondary"
                disabled={firstBreak !== 'last-reset'}
                onClick={() => setFixed(true)}
              >
                Just move Reset to the middle
              </button>
            </>
          )}
          {fixed && (
            <div className="flex gap-2">
              <button
                data-testid="jtw-c5p6-fixed"
                className="btn-pill-primary"
                onClick={async () =>
                  setFixedTrace(
                    await runProject(
                      {
                        version: 1,
                        name: 'fixed',
                        pages: [
                          {
                            ...c5PersonalProject([], 1).pages[0],
                            characters: [
                              {
                                ...c5PersonalProject([], 1).pages[0].characters[0],
                                scripts: [{ id: 'debug', blocks: C5_DEBUG_FIXED }],
                              },
                            ],
                          },
                        ],
                      },
                      previewSleep,
                    ),
                  )
                }
              >
                Run after repair
              </button>
              <button
                className="btn-pill-secondary"
                disabled={!fixedTrace.length}
                onClick={async () =>
                  setRepeatTrace(
                    await runProject(
                      {
                        version: 1,
                        name: 'fixed',
                        pages: [
                          {
                            ...c5PersonalProject([], 1).pages[0],
                            characters: [
                              {
                                ...c5PersonalProject([], 1).pages[0].characters[0],
                                scripts: [{ id: 'debug', blocks: C5_DEBUG_FIXED }],
                              },
                            ],
                          },
                        ],
                      },
                      previewSleep,
                    ),
                  )
                }
              >
                Consistent reruns
              </button>
            </div>
          )}
          <Trace values={fixedTrace} />
          <Trace values={repeatTrace} />
        </>
      )}
      {partId === 'jtw-s1-c5-p7' && (
        <>
          <p>
            Arrange readable stop points and uses for the three states, build, run and save them in
            Blocks Studio, then close and reopen for verification.
          </p>
          <Choice
            option={{
              id: 'three-stops-small',
              label: 'Three stopping points, the last small state is portable',
              correct: true,
            }}
            active={prediction === 'three-stops-small'}
            onPick={() => setPrediction('three-stops-small')}
          />
          <button
            data-testid="jtw-c5p7-run"
            className="btn-pill-primary"
            disabled={!prediction}
            onClick={() => void openPersonal()}
          >
            {personalBuild.data ? 'Reopen Blocks Studio works' : 'Open Blocks Studio to build'}
          </button>
          {personalBuild.data && (
            <>
              <p>
                VFS {personalBuild.data.version} · {personalBuild.data.projectId}
              </p>
              <button
                className="btn-pill-primary"
                onClick={async () =>
                  setPersonalTrace(await runProject(personalBuild.data!.project, previewSleep))
                }
              >
                Run a saved personal story
              </button>
              <Trace values={personalTrace} />
              <button
                data-testid="jtw-c5p7-reopen"
                className="btn-pill-secondary"
                disabled={personalTrace.at(-1) !== 'final:1.8'}
                onClick={() => void verifyReopen()}
              >
                Check JSON after closing and reopening
              </button>
            </>
          )}{' '}
          {reopened && (
            <Choice
              option={{
                id: 'three-uses',
                label:
                  'The companion explains the original form, the comparison and the carrying purpose using evidence from the actual run.',
                correct: true,
              }}
              active={peer === 'three-uses'}
              onPick={() => setPeer('three-uses')}
            />
          )}
        </>
      )}
      {partId === 'jtw-s1-c5-p8' && (
        <>
          <p>
            The original work retains the Dragon Palace, selection, acquisition and ability to
            change size; the course fades out disputes and stress, but does not rewrite it into a
            happy gift.
          </p>
          <OrderCards
            title="Arrange six chapter cause and effect cards"
            options={RETELL_CARDS}
            order={cards}
            onChange={setCards}
            done={cards.join('|') === C5_RETELL_ORDER.join('|')}
            testId="jtw-c5p8-cards"
          />
          <Choice
            option={{
              id: 'saved-last-shrink',
              label:
                'The P7 saved version ends with Shrink, which is expected to carry a small state.',
              correct: true,
            }}
            active={prediction === 'saved-last-shrink'}
            onPick={() => setPrediction('saved-last-shrink')}
          />
          <button
            data-testid="jtw-c5p8-run"
            className="btn-pill-primary"
            disabled={!p7Build.data || !prediction}
            onClick={async () => setP8Trace(await runProject(p7Build.data!.project, previewSleep))}
          >
            Load the P7 version and Go
          </button>
          <Trace values={p8Trace} />
          {p8Trace.at(-1) === 'final:1.8' && (
            <>
              <Choice
                option={{
                  id: 'because-so-result-later',
                  label:
                    'Because I need the right tools, I tested the three states; the result was that the Reset was repaired and was taken away safely.',
                  correct: true,
                }}
                active={retell === 'because-so-result-later'}
                onPick={() => setRetell('because-so-result-later')}
              />
              <Choice
                option={{
                  id: 'source-conflict-muted-not-gift',
                  label:
                    'The original work has demands, disputes and pressure; the course fades out but is not said to be a happy gift',
                  correct: true,
                }}
                active={rights === 'source-conflict-muted-not-gift'}
                onPick={() => setRights('source-conflict-muted-not-gift')}
              />
            </>
          )}
        </>
      )}
      {(done || saved) && (
        <section data-testid="jtw-c5-final-resolved" className="rounded-2xl bg-wash-mint p-5">
          {partId.endsWith('p8')
            ? `Ruyi seal:${seal?.lit ? 'Server is lit' : `Still missing ${seal?.missing.length ?? 0} piece of evidence`}. The quest marker on the cloud road is appearing.`
            : 'Golden-Hooped Staff stops at a safe size and the path remains open; the next cause and effect has occurred.'}
        </section>
      )}
      <button
        data-testid="jtw-c5-final-complete"
        className="btn-pill-primary w-full"
        disabled={(!done && !saved) || complete.isPending}
        onClick={() => complete.mutate()}
      >
        continue story
      </button>
    </div>
  );
}

function Trace({ values }: { values: string[] }) {
  return values.length ? (
    <p data-testid="jtw-c5-final-trace" className="rounded-xl bg-wash-sky p-3">
      {values.join(' → ')}
    </p>
  ) : null;
}
