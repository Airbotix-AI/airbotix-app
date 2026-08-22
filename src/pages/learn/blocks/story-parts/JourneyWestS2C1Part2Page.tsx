import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Choice } from './partUi';
import { JourneyWestS2Scene } from './JourneyWestS2Scene';
import {
  JTW_S2_C1_P2_ID,
  JTW_S2_C1_P3_ID,
  JTW_S2_STORY_LINE_ID,
  S2_C1_P2_MOTIVE_OPTIONS,
  S2_C1_P2_REASON_OPTIONS,
  S2_C1_P2_STORY,
} from './journeyWestSeason2';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';

export function JourneyWestS2C1Part2Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S2_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S2_STORY_LINE_ID),
  });
  const [storyRead, setStoryRead] = useState(false);
  const [motive, setMotive] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === JTW_S2_C1_P2_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(JTW_S2_C1_P2_ID) ?? false;
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setStoryRead((evidence.selections?.story_screens ?? []).includes('story-card-2'));
    setMotive(evidence.selections?.motive_choice?.[0] ?? null);
    setReason(evidence.selections?.because_sentence?.[0] ?? null);
    setRestored(true);
  }

  const motiveDone = motive === 'break-down-goal';
  const reasonDone = reason === 'map-long-three-steps';
  const completed = Boolean(savedEntry);
  const resolved = storyRead && motiveDone && reasonDone;

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S2_STORY_LINE_ID, JTW_S2_C1_P2_ID, {
        schema_version: 1,
        selections: {
          story_screens: storyRead ? ['story-card-2'] : [],
          motive_choice: motive ? [motive] : [],
          because_sentence: reason ? [reason] : [],
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S2_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: JTW_S2_C1_P3_ID } });
    },
  });

  if (progress.isLoading)
    return (
      <p className="p-8 text-center text-ink-soft">Unfolding the second side of the note...</p>
    );
  if (!unlocked && !completed) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-s2-c1p2-locked"
      >
        <p className="font-bold text-ink">
          Complete Part 1 first and clearly arrange the three steps for today.
        </p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          Back to story map
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-s2-c1-p2">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          Journey to the West · Season 2 · Chapter 1 Departure Note from Chang'an · Part 2 · Why
        </p>
        <h1 className="text-[28px] font-black text-ink">
          Why does the note only have three lines?
        </h1>
      </header>

      <JourneyWestS2Scene partId={JTW_S2_C1_P2_ID} resolved={resolved || completed} />

      <section className="space-y-4" data-testid="jtw-s2-c1p2-story">
        {S2_C1_P2_STORY.map((paragraph) => (
          <p key={paragraph} className="text-[16px] leading-8 text-ink">
            {paragraph}
          </p>
        ))}
        <button
          type="button"
          className="btn-pill-primary"
          onClick={() => setStoryRead(true)}
          data-testid="jtw-s2-c1p2-read"
        >
          {storyRead ? 'Story Card 2 Read ✓' : 'I have finished reading story card 2'}
        </button>
      </section>

      <section data-testid="jtw-s2-c1p2-motive">
        <h2 className="mb-2 text-[15px] font-bold text-ink">
          Why does Xuanzang write only three steps for today?
        </h2>
        <div className="flex flex-col gap-2">
          {S2_C1_P2_MOTIVE_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={motive === option.id}
              onPick={() => setMotive(option.id)}
            />
          ))}
        </div>
        {motive && !motiveDone && (
          <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
            Read Xuanzang's words again: The long-range goal is still there, he just breaks down
            what he can do today.
          </p>
        )}
      </section>

      <section data-testid="jtw-s2-c1p2-reason">
        <h2 className="mb-2 text-[15px] font-bold text-ink">
          Use "because-so" to complete the reason
        </h2>
        <div className="flex flex-col gap-2">
          {S2_C1_P2_REASON_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={reason === option.id}
              onPick={() => setReason(option.id)}
            />
          ))}
        </div>
        {reason && !reasonDone && (
          <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="alert">
            The reason comes from the long map in the story, not from the system rules.
          </p>
        )}
      </section>

      {(resolved || completed) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-s2-c1p2-resolved"
        >
          <p className="font-bold text-ink">
            The small piece of paper unfolded and three pictures lit up.
          </p>
          <ol
            className="mt-3 grid grid-cols-3 gap-2 text-center text-[13px] font-bold text-ink"
            aria-label="Three pictures on the note"
          >
            <li className="rounded-xl bg-canvas-pure p-3">1 · Luggage</li>
            <li className="rounded-xl bg-canvas-pure p-3">2 · city gate</li>
            <li className="rounded-xl bg-canvas-pure p-3">3 · Mountain Shadow</li>
          </ol>
          <p className="mt-3 text-[14px] text-ink">
            The graph already has a sequence, but it doesn't run by itself yet. In the next part,
            you must first arrange the complete actions on the table, and then predict where
            Xuanzang will stop.
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
          data-testid="jtw-s2-c1p2-continue"
        >
          {complete.isPending ? 'Saving…' : 'Continue story →'}
        </button>
      </footer>
      {complete.isError && (
        <p role="alert" className="text-[13px] font-semibold text-brand-coral">
          The reason for the note has not been saved yet, please try again.
        </p>
      )}
    </div>
  );
}
