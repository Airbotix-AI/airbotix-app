import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { BlockOp } from '../blocksModel';
import { BlocksRunner, startState, type SpriteState } from '../interpreter';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import {
  C4_P2_PREDICTIONS,
  C4_P2_PROJECT,
  C4_P2_STORY,
  c4p2PredictionDone,
  c4p2TraceDone,
} from './journeyWestC4Part2Program';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice } from './partUi';

const PART_ID = 'jtw-s1-c4-p2';
const NEXT_PART_ID = 'jtw-s1-c4-p3';
const CHARACTER_ID = 'sun-wukong';
const page = C4_P2_PROJECT.pages[0];
const character = page.characters[0];

export function JourneyWestC4Part2Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });
  const [storyRead, setStoryRead] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [flagTrace, setFlagTrace] = useState<BlockOp[]>([]);
  const [tapTrace, setTapTrace] = useState<BlockOp[]>([]);
  const [resetDone, setResetDone] = useState(false);
  const [sprite, setSprite] = useState<SpriteState>(() => startState(character));
  const [running, setRunning] = useState(false);
  const [restored, setRestored] = useState(false);
  const runnerRef = useRef<BlocksRunner | null>(null);
  const activeTrace = useRef<'flag' | 'tap' | null>(null);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setStoryRead((evidence.selections?.story_screens ?? []).includes('story-screen-2'));
    setPrediction(evidence.prediction ?? null);
    setFlagTrace((evidence.selections?.flag_trace ?? []) as BlockOp[]);
    setTapTrace((evidence.selections?.tap_trace ?? []) as BlockOp[]);
    setResetDone((evidence.selections?.teaching_reset ?? []).includes('between-events'));
    setRestored(true);
  }

  const makeRunner = () => {
    const runner = new BlocksRunner(
      page,
      {
        onSprite: (id, state) => {
          if (id === CHARACTER_ID) setSprite(state);
        },
        onSay: () => undefined,
        onNote: () => undefined,
        onSound: () => undefined,
        onGotoPage: () => undefined,
        onStep: (_characterId, scriptId, blockIndex) => {
          if (blockIndex < 0) return;
          const script = character.scripts.find((candidate) => candidate.id === scriptId);
          const op = script?.blocks[blockIndex]?.op;
          if (!op) return;
          if (activeTrace.current === 'flag') setFlagTrace((current) => [...current, op]);
          if (activeTrace.current === 'tap') setTapTrace((current) => [...current, op]);
        },
      },
      async () => undefined,
    );
    runnerRef.current = runner;
    return runner;
  };

  const runFlag = async () => {
    if (!storyRead || !c4p2PredictionDone(prediction) || running) return;
    setRunning(true);
    setResetDone(false);
    setTapTrace([]);
    setFlagTrace(['when_flag']);
    activeTrace.current = 'flag';
    const runner = makeRunner();
    await runner.runFlag();
    activeTrace.current = null;
    setRunning(false);
  };

  const reset = () => {
    const runner = runnerRef.current ?? makeRunner();
    runner.resetAll();
    setResetDone(true);
  };

  const runTap = async () => {
    if (!resetDone || running) return;
    setRunning(true);
    setTapTrace(['when_tap']);
    activeTrace.current = 'tap';
    const runner = runnerRef.current ?? makeRunner();
    await runner.runTap(CHARACTER_ID);
    activeTrace.current = null;
    setRunning(false);
  };

  const flagDone = c4p2TraceDone(flagTrace, 'when_flag');
  const tapDone = c4p2TraceDone(tapTrace, 'when_tap');
  const resolved = storyRead && c4p2PredictionDone(prediction) && flagDone && resetDone && tapDone;
  const completed = Boolean(savedEntry);

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          story_screens: storyRead ? ['story-screen-2'] : [],
          flag_trace: flagTrace,
          tap_trace: tapTrace,
          teaching_reset: resetDone ? ['between-events'] : [],
          event_comparison: resolved ? ['flag-name-plus-early-hop', 'tap-turn-only'] : [],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });

  if (progress.isLoading)
    return <p className="p-8 text-center text-ink-soft">Name tags are being put up...</p>;
  if (!unlocked && !completed) {
    return (
      <div className="p-10 text-center" data-testid="jtw-c4p2-locked">
        First explain the origin in front of the mountain gate.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p2">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          Journey to the West · Chapter 4 · Part 2
        </p>
        <h1 className="text-[28px] font-black text-ink">One name, two starts</h1>
      </header>

      <section className="space-y-3" data-testid="jtw-c4p2-story">
        {C4_P2_STORY.map((paragraph) => (
          <p key={paragraph} className="text-[16px] leading-8 text-ink">
            {paragraph}
          </p>
        ))}
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c4p2-read"
          onClick={() => setStoryRead(true)}
        >
          {storyRead
            ? 'Story cards B and C have been read together ✓'
            : 'Read story cards B and C together'}
        </button>
      </section>

      <section data-testid="jtw-c4p2-prediction">
        <h2 className="mb-2 font-bold text-ink">
          What should happen if you just press Go without Tap?
        </h2>
        <div className="flex flex-col gap-2">
          {C4_P2_PREDICTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={prediction === option.id}
              onPick={() => setPrediction(option.id)}
            />
          ))}
        </div>
      </section>

      <section
        className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-hairline bg-wash-sky"
        data-testid="jtw-c4p2-stage"
      >
        <div className="absolute right-[10%] top-[12%] rounded-xl bg-canvas-pure px-4 py-2 font-black text-ink">
          Sun Wukong
        </div>
        <img
          src={character.asset}
          alt="Sun Wukong stood by the name plate waiting for two different starts"
          data-testid="jtw-c4p2-wukong"
          className="absolute w-[18%]"
          style={{
            left: `${sprite.gx * 5}%`,
            top: `${sprite.gy * 5}%`,
            transform: `rotate(${sprite.rot}deg)`,
          }}
        />
      </section>

      <section className="space-y-3 rounded-2xl border border-hairline p-4">
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c4p2-go"
          disabled={!storyRead || !c4p2PredictionDone(prediction) || running}
          onClick={() => void runFlag()}
        >
          🚩 Go (don’t tap yet)
        </button>
        <p data-testid="jtw-c4p2-flag-trace" data-trace={flagTrace.join(',')}>
          Flag trajectory:{flagTrace.join(' → ') || 'Not yet running'}
        </p>
        {flagDone && (
          <p className="font-bold text-brand-coral" data-testid="jtw-c4p2-early-hop">
            Hop jumped the gun in Go; Tap track is still empty.
          </p>
        )}
        <button
          type="button"
          className="btn-pill-secondary"
          data-testid="jtw-c4p2-reset"
          disabled={!flagDone || running}
          onClick={reset}
        >
          ⤺ Teaching reset
        </button>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c4p2-tap"
          disabled={!resetDone || running}
          onClick={() => void runTap()}
        >
          👆 TapSun Wukong
        </button>
        <p data-testid="jtw-c4p2-tap-trace" data-trace={tapTrace.join(',')}>
          Fingertip trace:{tapTrace.join(' → ') || 'Not triggered yet'}
        </p>
      </section>

      {(resolved || completed) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-c4p2-resolved"
        >
          <p>
            The nameplate is fully displayed and two trajectory cards appear; the false start action
            is circled but has not moved yet.
          </p>
          <p className="mt-2 font-semibold">
            Wukong Know that "what will you do" and "when will you do it" are two different
            questions; the next step is to use an off-screen entry circle to explain.
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
          data-testid="jtw-c4p2-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          Try two entrances
        </button>
      </footer>
    </div>
  );
}
