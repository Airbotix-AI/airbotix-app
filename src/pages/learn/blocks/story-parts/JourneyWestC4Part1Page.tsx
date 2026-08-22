import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { JTW_C3_MONKEY_KING_SPRITE, JTW_C3_PAGE3_RESOLVED_BACKGROUND } from '../jtwC3Stage';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice, EvidenceGroup, OrderCards } from './partUi';
import {
  C4_P1_CLASSIC_CARD,
  C4_P1_DIALOGUE,
  C4_P1_MOTIVE_OPTIONS,
  C4_P1_PREDICTION_OPTIONS,
  C4_P1_ROUTE_CARDS,
  C4_P1_STORY,
  C4_P1_WHY_OPTIONS,
  c4p1CorrectOption,
  c4p1MotivesDone,
  c4p1RouteDone,
} from './journeyWestC4Part1Program';

const PART_ID = 'jtw-s1-c4-p1';
const NEXT_PART_ID = 'jtw-s1-c4-p2';

export function JourneyWestC4Part1Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });
  const [storyRead, setStoryRead] = useState(false);
  const [routeOrder, setRouteOrder] = useState<string[]>([]);
  const [motives, setMotives] = useState<string[]>([]);
  const [why, setWhy] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setStoryRead((evidence.selections?.story_screens ?? []).includes('story-card-a'));
    setRouteOrder(evidence.selections?.route_order ?? []);
    setMotives(evidence.selections?.motive_evidence ?? []);
    setWhy(evidence.selections?.why_retell?.[0] ?? null);
    setPrediction(evidence.prediction ?? null);
    setRestored(true);
  }

  const routeDone = c4p1RouteDone(routeOrder);
  const motivesDone = c4p1MotivesDone(motives);
  const whyDone = c4p1CorrectOption(C4_P1_WHY_OPTIONS, why);
  const predictionDone = c4p1CorrectOption(C4_P1_PREDICTION_OPTIONS, prediction);
  const resolved = storyRead && routeDone && motivesDone && whyDone && predictionDone;
  const completed = Boolean(savedEntry);

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          story_screens: storyRead ? ['story-card-a'] : [],
          route_order: routeOrder,
          motive_evidence: motives,
          why_retell: why ? [why] : [],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });

  if (progress.isLoading)
    return (
      <p className="p-8 text-center text-ink-soft">The lights at the mountain gate are on...</p>
    );
  if (!unlocked && !completed) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-c4p1-locked"
      >
        <p className="font-bold text-ink">
          Complete the story about the journey in Chapter 3 first, and then come to the mountain
          gate.
        </p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          Back to story map
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p1">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          Journey to the West · Chapter 4 You have a name: Sun Wukong · Part 1
        </p>
        <h1 className="text-[28px] font-black text-ink">
          In front of the mountain gate, explain clearly the way you came.
        </h1>
      </header>

      <section className="space-y-4" data-testid="jtw-c4p1-story">
        <p className="text-[16px] leading-8 text-ink">{C4_P1_STORY}</p>
        <div className="rounded-2xl border border-hairline bg-canvas-pure p-4">
          {C4_P1_DIALOGUE.map((line) => (
            <p key={line} className="text-[15px] leading-8 text-ink">
              {line}
            </p>
          ))}
        </div>
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] text-ink">
          <span className="font-bold">Classic story note:</span>
          {C4_P1_CLASSIC_CARD}
        </aside>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c4p1-read"
          onClick={() => setStoryRead(true)}
        >
          {storyRead ? 'The text has been read together ✓' : 'I have finished reading this text'}
        </button>
      </section>

      <div
        className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-hairline"
        data-testid="jtw-c4p1-stage"
      >
        <img
          src={JTW_C3_PAGE3_RESOLVED_BACKGROUND}
          alt="After crossing the sea, Stone Monkey arrives at his master's mountain gate."
          className="absolute inset-0 h-full w-full object-cover"
        />
        <img
          src={JTW_C3_MONKEY_KING_SPRITE}
          alt="The stone monkey still wearing an old cloth belt stands in front of the mountain gate"
          data-testid="jtw-c4p1-stone-monkey"
          className="absolute bottom-[18%] left-[24%] w-[15%]"
        />
        <div className="absolute right-[12%] top-[18%] rounded-xl border border-white/70 bg-ink/65 px-4 py-2 text-[14px] font-bold text-white">
          empty name tag
        </div>
      </div>

      {storyRead ? (
        <OrderCards
          title="Arrange the routes in order"
          options={[...C4_P1_ROUTE_CARDS]}
          order={routeOrder}
          onChange={setRouteOrder}
          done={routeDone}
          testId="jtw-c4p1-route"
        />
      ) : (
        <p className="font-semibold text-brand-coral" data-testid="jtw-c4p1-unread">
          Read the text first and then open the Luca card.
        </p>
      )}

      <EvidenceGroup
        title="Select two pieces of evidence of motivation from the text."
        options={[...C4_P1_MOTIVE_OPTIONS]}
        selected={motives}
        onToggle={(id) =>
          setMotives((current) =>
            current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
          )
        }
        done={motivesDone}
        testId="jtw-c4p1-motives"
      />

      <section data-testid="jtw-c4p1-prediction">
        <h2 className="mb-2 text-[15px] font-bold text-ink">
          If the Stone Monkey were only looking for treasure, which two places in the text would
          contradict each other?
        </h2>
        <div className="flex flex-col gap-2">
          {C4_P1_PREDICTION_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={prediction === option.id}
              onPick={() => setPrediction(option.id)}
            />
          ))}
        </div>
      </section>

      <section data-testid="jtw-c4p1-why">
        <h2 className="mb-2 text-[15px] font-bold text-ink">
          Look at the origin and say in your own voice "because - so - later"
        </h2>
        <div className="flex flex-col gap-2">
          {C4_P1_WHY_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={why === option.id}
              onPick={() => setWhy(option.id)}
            />
          ))}
        </div>
      </section>

      {(resolved || completed) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-c4p1-resolved"
        >
          <p className="text-[15px] leading-7 text-ink">
            The warm light on the mountain gate turned on, and the door only opened a way to the
            courtyard, and the empty name plate came into view.
          </p>
          <p className="mt-2 font-semibold text-ink">
            The door heard the origin and reason of the Stone Monkey; the next step is to understand
            why a name connects the past and the future.
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
          data-testid="jtw-c4p1-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? 'Saving…' : 'Look at the empty wooden sign'}
        </button>
      </footer>
    </div>
  );
}
