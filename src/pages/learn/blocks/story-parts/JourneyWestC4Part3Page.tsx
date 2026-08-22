import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { JTW_C3_MONKEY_KING_SPRITE, JTW_C3_PAGE3_RESOLVED_BACKGROUND } from '../jtwC3Stage';
import { Choice, EvidenceGroup } from './partUi';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import {
  C4_P3_CARDS,
  C4_P3_PREDICTIONS,
  C4_P3_STORY,
  C4_P3_TRIGGER_OPTIONS,
  c4p3AssignmentsDone,
} from './journeyWestC4Part3Program';

const PART_ID = 'jtw-s1-c4-p3';
const NEXT_PART_ID = 'jtw-s1-c4-p4';

type Trigger = 'start' | 'tap' | 'unassigned';

export function JourneyWestC4Part3Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });
  const [storyRead, setStoryRead] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, Trigger>>({});
  const [triggers, setTriggers] = useState<string[]>([]);
  const [rehearsals, setRehearsals] = useState<string[]>([]);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setStoryRead((evidence.selections?.story_screens ?? []).includes('story-screen-3'));
    setPrediction(evidence.prediction ?? null);
    const saved = Object.fromEntries(
      (evidence.selections?.card_assignments ?? []).map((value) => {
        const [id, trigger] = value.split(':');
        return [id, trigger as Trigger];
      }),
    ) as Record<string, Trigger>;
    setAssignments(saved);
    setTriggers(evidence.selections?.trigger_evidence ?? []);
    setRehearsals(evidence.selections?.rehearsals ?? []);
    setRestored(true);
  }

  const predictionDone =
    C4_P3_PREDICTIONS.find((option) => option.id === prediction)?.correct === true;
  const assignmentDone = c4p3AssignmentsDone(assignments);
  const triggerDone = triggers.length === 2;
  const rehearsalDone = rehearsals.length === 2;
  const resolved = storyRead && predictionDone && assignmentDone && triggerDone && rehearsalDone;
  const completed = Boolean(savedEntry);

  const cycleCard = (id: string) => {
    setAssignments((current) => {
      const next: Trigger =
        current[id] === 'unassigned' || !current[id]
          ? 'start'
          : current[id] === 'start'
            ? 'tap'
            : 'unassigned';
      return { ...current, [id]: next };
    });
  };

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          story_screens: storyRead ? ['story-screen-3'] : [],
          card_assignments: Object.entries(assignments).map(([id, trigger]) => `${id}:${trigger}`),
          trigger_evidence: triggers,
          rehearsals,
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
      <p className="p-8 text-center text-ink-soft">Lines are being drawn for both entrances…</p>
    );
  if (!unlocked && !completed)
    return (
      <div className="p-10 text-center" data-testid="jtw-c4p3-locked">
        Complete the first two starts of the name.
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p3">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          Journey to the West · Chapter 4 · Part 3
        </p>
        <h1 className="text-[28px] font-black text-ink">two entrance circles</h1>
      </header>
      <section className="space-y-3" data-testid="jtw-c4p3-story">
        {C4_P3_STORY.map((paragraph) => (
          <p key={paragraph} className="text-[16px] leading-8 text-ink">
            {paragraph}
          </p>
        ))}
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c4p3-read"
          onClick={() => setStoryRead(true)}
        >
          {storyRead ? 'Story Screen 3 Read in total ✓' : 'Read Together Story Screen 3'}
        </button>
      </section>
      <section
        className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-hairline"
        data-testid="jtw-c4p3-stage"
      >
        <img
          src={JTW_C3_PAGE3_RESOLVED_BACKGROUND}
          alt="There are two different entrances in front of the mountain gate"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <img
          src={JTW_C3_MONKEY_KING_SPRITE}
          alt="Wukong waiting at the entrance"
          className="absolute bottom-[18%] left-[42%] w-[15%]"
        />
        <div className="absolute left-[8%] top-[12%] rounded-2xl border-2 border-brand-sky bg-canvas-pure/90 p-3 text-center font-bold">
          🚩 Start Circle
          <br />
          <span className="text-[12px] font-normal">Wait for the scene to start</span>
        </div>
        <div className="absolute right-[8%] top-[12%] rounded-2xl border-2 border-brand-sunshine bg-canvas-pure/90 p-3 text-center font-bold">
          👆 Tap circle
          <br />
          <span className="text-[12px] font-normal">Waiting for audience invitation</span>
        </div>
      </section>
      {storyRead ? (
        <section data-testid="jtw-c4p3-cards" className="space-y-3">
          <h2 className="font-bold text-ink">
            Each time a card is clicked, the entire card moves to the next entrance.
          </h2>
          <div className="flex flex-wrap gap-2">
            {C4_P3_CARDS.map((card) => (
              <button
                key={card.id}
                type="button"
                className="rounded-2xl border border-hairline bg-canvas-pure px-4 py-3 text-left"
                onClick={() => cycleCard(card.id)}
              >
                {card.label}
                <span className="ml-2 text-[12px] font-bold text-brand-sky">
                  {assignments[card.id] ?? 'Not put in'}
                </span>
              </button>
            ))}
          </div>
          {assignmentDone && (
            <p data-testid="jtw-c4p3-assignment-done" className="font-bold text-brand-mint">
              The two ground tracks have separated.
            </p>
          )}
        </section>
      ) : (
        <p data-testid="jtw-c4p3-unread" className="font-semibold text-brand-coral">
          Read the story first and the entry card will open.
        </p>
      )}
      <EvidenceGroup
        title="Specify two wait conditions"
        options={[...C4_P3_TRIGGER_OPTIONS]}
        selected={triggers}
        onToggle={(id) =>
          setTriggers((current) =>
            current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
          )
        }
        done={triggerDone}
        testId="jtw-c4p3-triggers"
      />
      <section data-testid="jtw-c4p3-prediction">
        <h2 className="mb-2 font-bold text-ink">
          What happens if you turn around and raise the flag while still on the Start circle?
        </h2>
        <div className="flex flex-col gap-2">
          {C4_P3_PREDICTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={prediction === option.id}
              onPick={() => setPrediction(option.id)}
            />
          ))}
        </div>
      </section>
      <section data-testid="jtw-c4p3-rehearsal">
        <h2 className="mb-2 font-bold text-ink">Flag Raising and Card Tap performed once each</h2>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-pill-secondary"
            onClick={() =>
              setRehearsals((current) =>
                current.includes('start') ? current : [...current, 'start'],
              )
            }
          >
            🚩 Flag raising drill
          </button>
          <button
            type="button"
            className="btn-pill-secondary"
            onClick={() =>
              setRehearsals((current) => (current.includes('tap') ? current : [...current, 'tap']))
            }
          >
            👆 Paper Card Tap Walkthrough
          </button>
        </div>
        <p data-testid="jtw-c4p3-rehearsal-state">{rehearsals.length}/2 drills</p>
      </section>
      {(resolved || completed) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-c4p3-resolved"
        >
          <p>
            The name card stops at Start and the action card stops at Tap; the two ground tracks no
            longer cross.
          </p>
          <p className="mt-2 font-semibold">
            The paper cards have been sorted out, but there are still empty slots for the two real
            chains of blocks.
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
          data-testid="jtw-c4p3-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          Build two stories
        </button>
      </footer>
    </div>
  );
}
