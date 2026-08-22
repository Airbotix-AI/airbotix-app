import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import type { BlockOp } from '../blocksModel';
import { BlocksRunner } from '../interpreter';
import { JTW_C4_WUKONG_ID } from '../jtwC4DualBuild';
import { findC4PersonalShipBuild } from './journeyWestC4PersonalShip';
import {
  C4_P8_CAUSE_CARDS,
  C4_P8_CLASSIC_CARD,
  C4_P8_DEBUG_EVIDENCE,
  C4_P8_NEXT_PART_ID,
  C4_P8_PART_ID,
  C4_P8_RETELL_OPTIONS,
  C4_P8_RUN_EVIDENCE,
  C4_P8_SEAL_ID,
  C4_P8_STORY_BEFORE,
  C4_P8_TEXT_EVIDENCE,
  c4p8CardsOrdered,
  c4p8Correct,
  type C4P8ContinueChoice,
} from './journeyWestC4Part8Program';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice, OrderCards } from './partUi';

const STORY_MAP_PATH = '/learn/story/journey-west';

export function JourneyWestC4Part8Page({
  previewSleep = async () => undefined,
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
    queryKey: ['jtw-c4-p7-build', kidId],
    queryFn: () => findC4PersonalShipBuild(kidId!),
    enabled: Boolean(kidId),
  });
  const [cards, setCards] = useState<string[]>([]);
  const [flagTrace, setFlagTrace] = useState<BlockOp[]>([]);
  const [tapTrace, setTapTrace] = useState<BlockOp[]>([]);
  const [retell, setRetell] = useState<string | null>(null);
  const [textEvidence, setTextEvidence] = useState<string | null>(null);
  const [runEvidence, setRunEvidence] = useState<string | null>(null);
  const [debugEvidence, setDebugEvidence] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const runnerRef = useRef<BlocksRunner | null>(null);
  const activeTrace = useRef<'flag' | 'tap' | null>(null);
  const saved = progress.data?.completed.find((entry) => entry.part_id === C4_P8_PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(C4_P8_PART_ID) ?? false;
  const seal = progress.data?.chapter_seals?.find((entry) => entry.seal_id === C4_P8_SEAL_ID);

  if (saved && !restored) {
    const evidence = saved.evidence as StoryPartEvidence;
    setCards(evidence.selections?.cause_card_order ?? []);
    setFlagTrace((evidence.selections?.flag_trace ?? []) as BlockOp[]);
    setTapTrace((evidence.selections?.tap_trace ?? []) as BlockOp[]);
    setRetell(evidence.selections?.retell_links?.[0] ?? null);
    setTextEvidence(evidence.selections?.text_evidence?.[0] ?? null);
    setRunEvidence(evidence.selections?.run_evidence?.[0] ?? null);
    setDebugEvidence(evidence.selections?.debug_evidence?.[0] ?? null);
    setRestored(true);
  }

  const makeRunner = () => {
    const page = build.data!.project.pages[0];
    const character = page.characters.find((entry) => entry.id === JTW_C4_WUKONG_ID)!;
    const runner = new BlocksRunner(
      page,
      {
        onSprite: () => undefined,
        onSay: () => undefined,
        onNote: () => undefined,
        onSound: () => undefined,
        onGotoPage: () => undefined,
        onStep: (_characterId, scriptId, blockIndex) => {
          if (blockIndex < 0) return;
          const op = character.scripts.find((script) => script.id === scriptId)?.blocks[blockIndex]
            ?.op;
          if (!op) return;
          if (activeTrace.current === 'flag') setFlagTrace((current) => [...current, op]);
          if (activeTrace.current === 'tap') setTapTrace((current) => [...current, op]);
        },
      },
      previewSleep,
    );
    runnerRef.current = runner;
    return runner;
  };

  const runFlag = async () => {
    if (!build.data || !c4p8CardsOrdered(cards)) return;
    setFlagTrace(['when_flag']);
    setTapTrace([]);
    activeTrace.current = 'flag';
    await makeRunner().runFlag();
    activeTrace.current = null;
  };

  const runTap = async () => {
    if (!runnerRef.current || flagTrace.at(-1) !== 'end') return;
    setTapTrace(['when_tap']);
    activeTrace.current = 'tap';
    await runnerRef.current.runTap(JTW_C4_WUKONG_ID);
    activeTrace.current = null;
  };

  const runDone =
    flagTrace[0] === 'when_flag' &&
    flagTrace.at(-1) === 'end' &&
    tapTrace[0] === 'when_tap' &&
    tapTrace.at(-1) === 'end';
  const evidenceDone =
    c4p8Correct(C4_P8_RETELL_OPTIONS, retell) &&
    c4p8Correct(C4_P8_TEXT_EVIDENCE, textEvidence) &&
    c4p8Correct(C4_P8_RUN_EVIDENCE, runEvidence) &&
    c4p8Correct(C4_P8_DEBUG_EVIDENCE, debugEvidence);
  const resolved = Boolean(build.data && c4p8CardsOrdered(cards) && runDone && evidenceDone);

  const finish = useMutation({
    mutationFn: (choice: C4P8ContinueChoice | null) =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, C4_P8_PART_ID, {
        schema_version: 1,
        selections: {
          ...saved?.evidence.selections,
          cause_card_order: cards,
          retell_links: retell ? [retell] : [],
          text_evidence: textEvidence ? [textEvidence] : [],
          run_evidence: runEvidence ? [runEvidence] : [],
          debug_evidence: debugEvidence ? [debugEvidence] : [],
          run_project: build.data?.projectId ? [build.data.projectId] : [],
          run_saved_version: build.data ? [String(build.data.savedVersion)] : [],
          flag_trace: flagTrace,
          tap_trace: tapTrace,
          continue_choice: choice ? [choice] : [],
        },
      }),
    onSuccess: async (_result, choice) => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      if (choice === 'now') navigate(STORY_MAP_PATH, { state: { unlocked: C4_P8_NEXT_PART_ID } });
    },
  });

  if (progress.isLoading)
    return <p className="p-8 text-center">The name tag is waiting for the last talk...</p>;
  if (!unlocked && !saved)
    return (
      <div className="p-8 text-center" data-testid="jtw-c4p8-locked">
        <Link to={STORY_MAP_PATH}>Complete the personal recognition card first</Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p8">
      <header>
        <p className="text-xs font-bold text-brand-sky">
          Journey to the West · Chapter 4 · Part 8 · Retell
        </p>
        <h1 className="text-3xl font-black">The name followed him home</h1>
      </header>
      <section className="space-y-3" data-testid="jtw-c4p8-story">
        {C4_P8_STORY_BEFORE.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <aside className="rounded-2xl bg-wash-sunshine p-4">
          <strong>Classic Card：</strong>
          {C4_P8_CLASSIC_CARD}
        </aside>
      </section>
      <OrderCards
        title="① Arrange the six cause and effect cards in story order"
        options={C4_P8_CAUSE_CARDS}
        order={cards}
        onChange={setCards}
        done={c4p8CardsOrdered(cards)}
        testId="jtw-c4p8-cards"
      />
      {!build.data && (
        <section data-testid="jtw-c4p8-work-missing">
          <p>
            No actual saved "Meet Sun Wukong" from Part 7 was found. This page will not load answer
            items.
          </p>
          <Link to="/learn/story/journey-west/jtw-s1-c4-p7">
            Go back to Part 7 to save and reopen the work
          </Link>
        </section>
      )}
      {build.data && (
        <section className="space-y-3 rounded-2xl bg-wash-sky p-5">
          <p>
            Work version: VFS {build.data.savedVersion} · {build.data.version}
          </p>
          <button
            className="btn-pill-primary"
            data-testid="jtw-c4p8-go"
            disabled={!c4p8CardsOrdered(cards)}
            onClick={() => void runFlag()}
          >
            🚩 Go: only run name chains
          </button>
          <p data-testid="jtw-c4p8-flag-trace">{flagTrace.join(' → ') || 'Not yet running'}</p>
          <button
            className="btn-pill-primary"
            data-testid="jtw-c4p8-tap"
            disabled={flagTrace.at(-1) !== 'end'}
            onClick={() => void runTap()}
          >
            👆 Real Tap Wukong
          </button>
          <p data-testid="jtw-c4p8-tap-trace">
            {tapTrace.join(' → ') || 'Still waiting for invitation'}
          </p>
        </section>
      )}
      {runDone && (
        <section className="space-y-4">
          <EvidenceChoice
            title="② Use because-so-result-we will talk about it later"
            options={C4_P8_RETELL_OPTIONS}
            selected={retell}
            onSelect={setRetell}
          />
          <EvidenceChoice
            title="③ Point out evidence of text motivation"
            options={C4_P8_TEXT_EVIDENCE}
            selected={textEvidence}
            onSelect={setTextEvidence}
          />
          <EvidenceChoice
            title="④ Point out the evidence of the operation of this double event"
            options={C4_P8_RUN_EVIDENCE}
            selected={runEvidence}
            onSelect={setRunEvidence}
          />
          <EvidenceChoice
            title="⑤ Point out the first deviation of P6"
            options={C4_P8_DEBUG_EVIDENCE}
            selected={debugEvidence}
            onSelect={setDebugEvidence}
          />
        </section>
      )}
      {(resolved || saved) && (
        <section className="rounded-2xl bg-wash-mint p-5" data-testid="jtw-c4p8-resolved">
          <h2 className="font-black">The name seal and name tag light up steadily</h2>
          <p>
            Wukong returns to Flower-Fruit Mountain with a new name and place of origin. A huge
            pillar appears in the depths of the sea: the next chapter is about finding a tool of the
            right size.
          </p>
        </section>
      )}
      {!saved && (
        <button
          className="btn-pill-primary w-full"
          data-testid="jtw-c4p8-complete"
          disabled={!resolved || finish.isPending}
          onClick={() => finish.mutate(null)}
        >
          Light up the name seal
        </button>
      )}
      {saved && (
        <section data-testid="jtw-c4p8-seal" data-lit={seal?.lit ? 'true' : 'false'}>
          <p>
            {seal?.lit
              ? 'The name seal has been lit by server aggregation.'
              : `Server is still missing ${seal?.missing.length ?? 0} item of evidence.`}
          </p>
          <div className="flex gap-3">
            <button className="btn-pill-primary" onClick={() => finish.mutate('now')}>
              Look at the shadow of the pillars in the sea
            </button>
            <button className="btn-pill-secondary" onClick={() => finish.mutate('later')}>
              continue later
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function EvidenceChoice({
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
    <div>
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
    </div>
  );
}
