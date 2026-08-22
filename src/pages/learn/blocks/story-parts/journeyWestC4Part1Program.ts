import type { JtwEvidenceOption } from './journeyWestSeason1';

export const C4_P1_STORY =
  'The stone monkey walked a long way and finally came to the quiet mountain gate. He did not show off his skills as soon as he entered the door, but first explained that he came from Flower-Fruit Mountain and why he was willing to travel far to study. What the master heard was not only "I want to become great", but also his persistent search and willingness to learn.';

export const C4_P1_DIALOGUE = [
  'Master: "Where are you from? Why have you come so far?"',
  'Stone Monkey: "I come from Flower-Fruit Mountain and want to study seriously."',
] as const;

export const C4_P1_CLASSIC_CARD =
  "In the first and second chapters of the original work, Stone Monkey came to the master's gate after many years of searching. This is not a treasure hunt, a lesson learned, or a click to learn all the skills.";

export const C4_P1_ROUTE_CARDS: readonly JtwEvidenceOption[] = [
  { id: 'flower-fruit-mountain', label: 'Flower-Fruit Mountain', correct: true },
  { id: 'sea-route', label: 'sea ​​route', correct: true },
  { id: 'master-gate', label: "master's gate", correct: true },
];

export const C4_P1_ROUTE_ORDER = ['flower-fruit-mountain', 'sea-route', 'master-gate'] as const;

export const C4_P1_MOTIVE_OPTIONS: readonly JtwEvidenceOption[] = [
  { id: 'willing-to-learn', label: 'willing to study seriously', correct: true },
  { id: 'bring-learning-home', label: 'Want to take what I learned home with me', correct: true },
  { id: 'find-shiny-treasure', label: 'Looking for shiny treasures', correct: false },
  { id: 'dislike-friends', label: "don't like partner", correct: false },
];

export const C4_P1_WHY_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'learn-and-return',
    label:
      'Because there are still many things I don’t understand, I am willing to study hard and take the experience home.',
    correct: true,
  },
  {
    id: 'treasure-only',
    label:
      'Because there must be a treasure inside the mountain gate, so I just want to go in and find the treasure.',
    correct: false,
  },
];

export const C4_P1_PREDICTION_OPTIONS: readonly JtwEvidenceOption[] = [
  {
    id: 'learning-and-return-conflict',
    label: '"Being willing to study hard" and "bringing experiences home" are contradictory.',
    correct: true,
  },
  {
    id: 'long-road-conflict',
    label: '"Walked a long way" and "came to the mountain gate" would contradict each other.',
    correct: false,
  },
];

export function c4p1RouteDone(order: readonly string[]): boolean {
  return (
    order.length === C4_P1_ROUTE_ORDER.length &&
    C4_P1_ROUTE_ORDER.every((id, index) => order[index] === id)
  );
}

export function c4p1MotivesDone(selected: readonly string[]): boolean {
  const correct = C4_P1_MOTIVE_OPTIONS.filter((option) => option.correct).map(
    (option) => option.id,
  );
  return selected.length === correct.length && correct.every((id) => selected.includes(id));
}

export function c4p1CorrectOption(
  options: readonly JtwEvidenceOption[],
  selected: string | null,
): boolean {
  return options.find((option) => option.id === selected)?.correct === true;
}
