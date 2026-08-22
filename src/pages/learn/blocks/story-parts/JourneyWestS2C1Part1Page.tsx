import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Choice, OrderCards } from './partUi';
import { JourneyWestS2Scene } from './JourneyWestS2Scene';
import {
  JTW_S2_C1_P1_ID,
  JTW_S2_C1_P2_ID,
  JTW_S2_STORY_LINE_ID,
  S2_C1_P1_CLASSIC_CARD,
  S2_C1_P1_ROUTE_CARDS,
  S2_C1_P1_SCOPE_OPTIONS,
  S2_C1_P1_STORY,
  s2c1p1RouteDone,
} from './journeyWestSeason2';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';

export function JourneyWestS2C1Part1Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S2_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S2_STORY_LINE_ID),
  });
  const [storyRead, setStoryRead] = useState(false);
  const [scopeChoice, setScopeChoice] = useState<string | null>(null);
  const [routeOrder, setRouteOrder] = useState<string[]>([]);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === JTW_S2_C1_P1_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(JTW_S2_C1_P1_ID) ?? false;
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setStoryRead((evidence.selections?.story_screens ?? []).includes('story-card-1'));
    setScopeChoice(evidence.selections?.scope_choice?.[0] ?? null);
    setRouteOrder(evidence.selections?.route_order ?? []);
    setRestored(true);
  }

  const scopeDone = scopeChoice === 'three-steps';
  const routeDone = s2c1p1RouteDone(routeOrder);
  const completed = Boolean(savedEntry);
  const resolved = storyRead && scopeDone && routeDone;

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S2_STORY_LINE_ID, JTW_S2_C1_P1_ID, {
        schema_version: 1,
        selections: {
          story_screens: storyRead ? ['story-card-1'] : [],
          scope_choice: scopeChoice ? [scopeChoice] : [],
          route_order: routeOrder,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S2_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: JTW_S2_C1_P2_ID } });
    },
  });

  if (progress.isLoading)
    return (
      <p className="p-8 text-center text-ink-soft">Unfolding the departure note from Chang'an...</p>
    );
  if (!unlocked && !completed) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-s2-c1p1-locked"
      >
        <p className="font-bold text-ink">The entrance to Season 2 has not yet been unlocked.</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          Back to story map
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-s2-c1-p1">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          Journey to the West · Season 2 · Chapter 1 Departure Note from Chang'an · Part 1
        </p>
        <h1 className="text-[28px] font-black text-ink">
          Turn a long journey into three steps today
        </h1>
      </header>

      <JourneyWestS2Scene partId={JTW_S2_C1_P1_ID} resolved={resolved || completed} />

      <section className="space-y-4" data-testid="jtw-s2-c1p1-story">
        {S2_C1_P1_STORY.map((paragraph) => (
          <p key={paragraph} className="text-[16px] leading-8 text-ink">
            {paragraph}
          </p>
        ))}
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] text-ink">
          <span className="font-bold">Classic story note:</span>
          {S2_C1_P1_CLASSIC_CARD}
        </aside>
        <button
          type="button"
          className="btn-pill-primary"
          onClick={() => setStoryRead(true)}
          data-testid="jtw-s2-c1p1-read"
        >
          {storyRead ? 'Story Card 1 Read ✓' : 'I have finished reading story card 1'}
        </button>
      </section>

      <section data-testid="jtw-s2-c1p1-scope">
        <h2 className="mb-2 text-[15px] font-bold text-ink">
          Can we complete the entire westbound route now, or today's three steps?
        </h2>
        <div className="flex flex-col gap-2">
          {S2_C1_P1_SCOPE_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={scopeChoice === option.id}
              onPick={() => setScopeChoice(option.id)}
            />
          ))}
        </div>
        {scopeChoice === 'whole-journey' && (
          <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
            The map is very long. Look at the small piece of paper on the table.
          </p>
        )}
      </section>

      {storyRead ? (
        <OrderCards
          title="Arrange three things according to the note"
          options={[...S2_C1_P1_ROUTE_CARDS]}
          order={routeOrder}
          onChange={setRouteOrder}
          done={routeDone}
          testId="jtw-s2-c1p1-route"
        />
      ) : (
        <p className="font-semibold text-brand-coral">
          After reading the story card first, the three-step card will be opened.
        </p>
      )}

      {(resolved || completed) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-s2-c1p1-resolved"
        >
          <p className="font-bold text-ink">
            The departure note was unfolded: luggage → city gate → first mountain.
          </p>
          <p className="mt-2 text-[14px] text-ink">
            The long-range goal has not disappeared, but the first section of the road today has
            been made clear. The next part asks why Xuanzang needs to write three steps first?
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
          data-testid="jtw-s2-c1p1-continue"
        >
          {complete.isPending ? 'Saving…' : 'Continue story →'}
        </button>
      </footer>
      {complete.isError && (
        <p role="alert" className="text-[13px] font-semibold text-brand-coral">
          The departure note is temporarily not saved, please try again.
        </p>
      )}
    </div>
  );
}
