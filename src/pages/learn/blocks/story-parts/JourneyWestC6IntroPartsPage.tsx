import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import { Choice, EvidenceGroup, OrderCards } from './partUi';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import { completeStoryPart, fetchStoryLineProgress } from './storyPartsApi';

type PartId = 'jtw-s1-c6-p1' | 'jtw-s1-c6-p2';
const MAP = '/learn/story/journey-west';
const SEALS = ['birth', 'water-curtain', 'journey', 'name-skills', 'ruyi-staff', 'heaven'];
const SEAL_CARDS = [
  { id: 'birth', label: 'fairy stone', correct: true },
  { id: 'water-curtain', label: 'Water Curtain Cave', correct: true },
  { id: 'journey', label: 'Travel far away', correct: true },
  { id: 'name-skills', label: 'Get the name Xueyi', correct: true },
  { id: 'ruyi-staff', label: 'Golden-Hooped Staff', correct: true },
  { id: 'heaven', label: 'Tiangong', correct: true },
];
const FOUR = [
  {
    id: 'wish-important-work',
    label: 'Desire: to get an important and suitable job',
    correct: true,
  },
  { id: 'assignment-horses', label: 'Arrangement: Take care of Pegasus', correct: true },
  { id: 'feeling-unseen', label: 'Feeling: Ability not seen', correct: true },
  { id: 'choice-leave', label: 'Choice: Leave without clear negotiation', correct: true },
];

export function JourneyWestC6IntroPartsPage({ partId }: { partId: PartId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });
  const saved = progress.data?.completed.find((entry) => entry.part_id === partId);
  const [cards, setCards] = useState<string[]>([]);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [prediction, setPrediction] = useState<string | null>(null);
  const p1Done =
    cards.join('|') === SEALS.join('|') &&
    evidence.includes('wish-important-work') &&
    evidence.includes('assignment-horses') &&
    prediction === 'expectation-gap';
  const p2Done =
    FOUR.every((item) => evidence.includes(item.id)) && prediction === 'leaving-does-not-solve';
  const done = partId.endsWith('p1') ? p1Done : p2Done;
  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, partId, {
        schema_version: 1,
        prediction: prediction ?? undefined,
        selections: {
          seal_order: cards,
          expectation_evidence: partId.endsWith('p1') ? evidence : [],
          motive_choice_evidence: partId.endsWith('p2') ? evidence : [],
          causal_sentence: prediction ? [prediction] : [],
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate(MAP, {
        state: { unlocked: partId.endsWith('p1') ? 'jtw-s1-c6-p2' : 'jtw-s1-c6-p3' },
      });
    },
  });
  if (progress.isLoading) return <p className="p-8 text-center">Cloud Gate is unfolding...</p>;
  if (!(progress.data?.unlocked_part_ids.includes(partId) || saved))
    return (
      <div className="p-8 text-center">
        <Link to={MAP}>Complete the previous Part first</Link>
      </div>
    );
  return (
    <div className="mx-auto max-w-3xl space-y-7 px-4 py-8" data-testid={`jtw-${partId}`}>
      <header>
        <p className="text-xs font-bold text-brand-sky">
          Journey to the West · Chapter 6 · Part {partId.at(-1)}
        </p>
        <h1 className="text-3xl font-black">
          {partId.endsWith('p1')
            ? 'Six seals walked to the Heavenly Palace'
            : 'Feelings and choices are not the same thing'}
        </h1>
      </header>
      {partId.endsWith('p1') ? (
        <>
          <p>
            Wukong came to Yunmen with his name, skills and Golden-Hooped Staff, hoping that someone
            would seriously see his ability; being invited does not mean that the arrangement is
            suitable.
          </p>
          <OrderCards
            title="Arrange the six seals in story order"
            options={SEAL_CARDS}
            order={cards}
            onChange={setCards}
            done={cards.join('|') === SEALS.join('|')}
            testId="jtw-c6p1-seals"
          />
          <EvidenceGroup
            title="Find out expectations vs. actual arrangements"
            options={FOUR.slice(0, 2)}
            selected={evidence}
            onToggle={(id) =>
              setEvidence((current) =>
                current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
              )
            }
            done={evidence.length === 2}
            testId="jtw-c6p1-evidence"
          />
          <Choice
            option={{
              id: 'expectation-gap',
              label:
                'There is a gap between the expectation of an important and suitable job and the arrangements for taking care of Tianma',
              correct: true,
            }}
            active={prediction === 'expectation-gap'}
            onPick={() => setPrediction('expectation-gap')}
          />
        </>
      ) : (
        <>
          <p>
            Wukong What’s sad is that the arrangement was not explained clearly. The feelings are
            understandable, but asking, waiting, negotiating, or leaving immediately will bring
            different results.
          </p>
          <EvidenceGroup
            title="Label wishes, arrangements, feelings, and choices respectively"
            options={FOUR}
            selected={evidence}
            onToggle={(id) =>
              setEvidence((current) =>
                current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
              )
            }
            done={FOUR.every((item) => evidence.includes(item.id))}
            testId="jtw-c6p2-four"
          />
          <Choice
            option={{
              id: 'leaving-does-not-solve',
              label:
                'Leaving expresses dissatisfaction but does not automatically resolve differences.',
              correct: true,
            }}
            active={prediction === 'leaving-does-not-solve'}
            onPick={() => setPrediction('leaving-does-not-solve')}
          />
        </>
      )}
      {(done || saved) && (
        <section data-testid="jtw-c6-resolved" className="rounded-2xl bg-wash-mint p-5">
          {partId.endsWith('p1')
            ? 'Six seals connected to form a road, and the Tiangong nameplate lit up.'
            : 'Detached cloud display; loud title did not automatically fix differences.'}
        </section>
      )}
      <button
        data-testid="jtw-c6-complete"
        className="btn-pill-primary w-full"
        disabled={(!done && !saved) || complete.isPending}
        onClick={() => complete.mutate()}
      >
        continue story
      </button>
    </div>
  );
}
