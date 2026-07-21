import { useMemo, useState } from 'react';

export interface JourneyC1Part1Evidence {
  clues: string[];
  classicOrder: string[];
  prediction: string;
}

interface JourneyC1Part1GuideProps {
  completed: boolean;
  saving: boolean;
  error?: string | null;
  onComplete: (evidence: JourneyC1Part1Evidence) => void;
}

const CORRECT_CLUES = ['warm-light', 'bright-crack', 'soft-sound'] as const;
const CLUES = [
  { id: 'warm-light', label: 'Warm light', correct: true, marker: 'Light' },
  { id: 'bright-crack', label: 'Bright crack', correct: true, marker: 'Crack' },
  { id: 'soft-sound', label: 'Soft sound', correct: true, marker: 'Sound' },
  { id: 'peach-tree', label: 'Peach tree', correct: false, marker: 'Tree' },
  { id: 'quiet-cloud', label: 'Quiet cloud', correct: false, marker: 'Cloud' },
] as const;

export function JourneyC1Part1Guide({
  completed,
  saving,
  error,
  onComplete,
}: JourneyC1Part1GuideProps) {
  const [page, setPage] = useState(0);
  const [clues, setClues] = useState<string[]>([]);
  const [wrongClue, setWrongClue] = useState<string | null>(null);
  const [classicOrder, setClassicOrder] = useState<string[]>([]);
  const [prediction, setPrediction] = useState<string | null>(null);

  const clueReady = CORRECT_CLUES.every((clue) => clues.includes(clue));
  const classicReady = classicOrder.join('|') === 'stone-monkey|sun-wukong';
  const predictionReady = prediction === 'stone-monkey-because-clues';
  const ready = clueReady && classicReady && predictionReady;
  const progress = useMemo(
    () => [clueReady, classicReady, predictionReady].filter(Boolean).length,
    [classicReady, clueReady, predictionReady],
  );

  const chooseClue = (id: string, correct: boolean) => {
    if (!correct) {
      setWrongClue(id);
      return;
    }
    setWrongClue(null);
    setClues((current) => (current.includes(id) ? current : [...current, id]));
  };

  const chooseClassic = (id: string) => {
    setClassicOrder((current) => {
      if (current.length === 2) return [id];
      if (current.includes(id)) return current;
      return [...current, id];
    });
  };

  if (completed) {
    return (
      <div className="jtw-p1-gate" data-testid="jtw-p1-complete">
        <section className="jtw-p1-card is-complete" role="dialog" aria-modal="true">
          <div className="jtw-p1-kicker">Journey to the West · Chapter 1 · Part 1 of 8</div>
          <img
            className="jtw-p1-hero"
            src="/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png"
            alt="Stone Monkey"
          />
          <h2>The mountain is about to change</h2>
          <p>
            The crack shines brighter. A soft thump comes from inside the stone. The monkeys stop
            playing and listen. Something is ready to enter their world.
          </p>
          <div className="jtw-p1-proof" data-testid="jtw-p1-saved-proof">
            <span>✓ Three picture clues</span>
            <span>✓ Classic story order</span>
            <span>✓ Prediction with evidence</span>
            <span>✓ Saved on the server</span>
          </div>
          <div className="jtw-p1-next">
            <strong>Next clue</strong>
            Who will appear, and should appearing, jumping, or greeting happen first?
          </div>
          <button type="button" className="jtw-p1-primary" disabled>
            Part 2 unlocked · Listen to the stone
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="jtw-p1-gate" data-testid="jtw-p1-reading-gate">
      <section className="jtw-p1-card" role="dialog" aria-modal="true" aria-labelledby="jtw-p1-title">
        <div className="jtw-p1-kicker">Journey to the West · Chapter 1 · Part 1 of 8</div>
        <div className="jtw-p1-progress" aria-label={`Evidence ${progress} of 3 complete`}>
          {[0, 1, 2].map((index) => <span key={index} className={index < progress ? 'on' : ''} />)}
        </div>

        {page === 0 && (
          <div className="jtw-p1-page" data-testid="jtw-p1-hero-page">
            <img
              className="jtw-p1-hero"
              src="/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png"
              alt="Stone Monkey"
            />
            <div>
              <h2 id="jtw-p1-title">Meet the Stone Monkey</h2>
              <p>
                He has not stepped out of the stone yet. First, meet the hero you will see on the
                real Story Blocks stage.
              </p>
              <button type="button" className="jtw-p1-primary" onClick={() => setPage(1)}>
                Look at Flower-Fruit Mountain →
              </button>
            </div>
          </div>
        )}

        {page === 1 && (
          <div className="jtw-p1-page is-evidence" data-testid="jtw-p1-clue-page">
            <div className="jtw-p1-mountain" aria-label="Flower-Fruit Mountain and the magical stone">
              {CLUES.map((clue) => (
                <button
                  key={clue.id}
                  type="button"
                  data-testid={`jtw-clue-${clue.id}`}
                  className={clues.includes(clue.id) ? 'is-found' : ''}
                  aria-pressed={clues.includes(clue.id)}
                  onClick={() => chooseClue(clue.id, clue.correct)}
                >
                  {clue.marker}
                </button>
              ))}
            </div>
            <div>
              <h2 id="jtw-p1-title">Flower-Fruit Mountain wakes</h2>
              <p>
                Beside the sea stands Flower-Fruit Mountain. A magical stone has watched many
                sunrises and moons. Today, warm light glows inside a thin crack.
              </p>
              <p className="jtw-p1-prompt">Find the three clues that show the mountain is about to change.</p>
              <div className="jtw-p1-found" data-testid="jtw-p1-clue-count">{clues.length}/3 clues found</div>
              {wrongClue && <p className="jtw-p1-hint" role="status">That belongs to the mountain, but it is not changing. Look near the stone.</p>}
              <button type="button" className="jtw-p1-primary" disabled={!clueReady} onClick={() => setPage(2)}>
                Read the Classic Card →
              </button>
            </div>
          </div>
        )}

        {page === 2 && (
          <div className="jtw-p1-page" data-testid="jtw-p1-classic-page">
            <div className="jtw-p1-classic-card">
              <strong>Classic Card</strong>
              <p>
                This is the beginning of <em>Journey to the West</em>. The Stone Monkey comes before
                Water Curtain Cave, the name Sun Wukong, and the journey west.
              </p>
            </div>
            <div>
              <h2 id="jtw-p1-title">Which name comes first?</h2>
              <p>Tap the two cards in the original story order.</p>
              <div className="jtw-p1-order">
                {[
                  { id: 'stone-monkey', label: 'Stone Monkey' },
                  { id: 'sun-wukong', label: 'Sun Wukong' },
                ].map((item) => (
                  <button key={item.id} type="button" data-testid={`jtw-order-${item.id}`} onClick={() => chooseClassic(item.id)}>
                    {classicOrder.indexOf(item.id) >= 0 ? classicOrder.indexOf(item.id) + 1 : '·'} {item.label}
                  </button>
                ))}
              </div>
              {classicOrder.length === 2 && !classicReady && <p className="jtw-p1-hint">The Stone Monkey has not received the name Sun Wukong yet. Try the order again.</p>}
              <button type="button" className="jtw-p1-primary" disabled={!classicReady} onClick={() => setPage(3)}>
                Make a prediction →
              </button>
            </div>
          </div>
        )}

        {page === 3 && (
          <div className="jtw-p1-page" data-testid="jtw-p1-prediction-page">
            <div className="jtw-p1-prediction-art" aria-hidden="true">Stone → ?</div>
            <div>
              <h2 id="jtw-p1-title">Who will come from the stone?</h2>
              <p>Choose a prediction that uses the evidence you found.</p>
              <div className="jtw-p1-predictions">
                <button type="button" data-testid="jtw-prediction-evidence" aria-pressed={predictionReady} onClick={() => setPrediction('stone-monkey-because-clues')}>
                  The Stone Monkey, because the warm light, bright crack, and soft sound show something is moving inside.
                </button>
                <button type="button" data-testid="jtw-prediction-guess" onClick={() => setPrediction('sun-wukong-no-evidence')}>
                  Sun Wukong, because I know that name already.
                </button>
              </div>
              {prediction && !predictionReady && <p className="jtw-p1-hint">Use today’s picture and story clues. The name Sun Wukong comes later.</p>}
              {error && <p className="jtw-p1-hint" role="alert">{error}</p>}
              <button
                type="button"
                data-testid="jtw-p1-complete-button"
                className="jtw-p1-primary"
                disabled={!ready || saving}
                onClick={() => onComplete({ clues: [...CORRECT_CLUES], classicOrder, prediction: prediction! })}
              >
                {saving ? 'Saving evidence…' : 'Listen to the stone'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
