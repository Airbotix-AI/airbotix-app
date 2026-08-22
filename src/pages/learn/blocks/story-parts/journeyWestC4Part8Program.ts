import type { JtwEvidenceOption } from './journeyWestSeason1';

export const C4_P8_PART_ID = 'jtw-s1-c4-p8';
export const C4_P8_NEXT_PART_ID = 'jtw-s1-c5-p1';
export const C4_P8_SEAL_ID = 'jtw-s1-c4-naming-seal';

export const C4_P8_STORY_BEFORE = [
  'The stone monkey walked a long way, explained his purpose in front of the door, and got the name "Sun Wukong", which took a long time to learn. The name connects him to where he came from and what he has done in the future, but neither a name nor a few building blocks can mean learning a complete spiritual practice at once.',
  'The companion presses Go first, and the name tag and "I am Sun Wukong" appear; the ability waits quietly. Only when the companion actually taps Wukong does the small display he selected run to End. Now please open the truly preserved work of Part 7 and tell the complete story of cause and effect.',
] as const;

export const C4_P8_CLASSIC_CARD =
  'Chapters 1 to 2 of the original work describe that after years of searching, the Monkey King became an apprentice and was named Sun Wukong, and showed his skills after long-term study. The course only uses a gentle small demonstration of the practice Start and Tap, and does not describe it as a complete practice or the seventy-two transformations.';

export const C4_P8_CAUSE_CARDS: JtwEvidenceOption[] = [
  { id: 'leave-home', label: '🏝Leave Flower-Fruit Mountain', correct: true },
  { id: 'explain-purpose', label: '⛩ Go to the door and explain your intention', correct: true },
  { id: 'receive-name', label: '🏷 Get a name', correct: true },
  { id: 'learn-over-time', label: '📚 After learning', correct: true },
  { id: 'wait-for-invitation', label: '👆 Waiting for invitation', correct: true },
  { id: 'show-skill', label: '✨ Show your skills', correct: true },
];

export const C4_P8_CAUSE_ORDER = [
  'leave-home',
  'explain-purpose',
  'receive-name',
  'learn-over-time',
  'wait-for-invitation',
  'show-skill',
] as const;

export const C4_P8_RETELL_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'linked-story-and-events',
    label:
      "Because Stone Monkey wanted to study seriously, he traveled from Flower-Fruit Mountain and explained the purpose of his visit in front of the door; as a result, he got the name Sun Wukong, and after studying, he still waited for the audience's invitation; later, Go only let the name appear, and Tap showed his skills to End, and he went home with his name and where he came from.",
    correct: true,
  },
  { id: 'blocks-only', label: 'Start、Show、Say、End、Tap、Hop、Wait、End。', correct: false },
  {
    id: 'instant-learning',
    label: 'He was given a name and learned all the tricks at the push of a button.',
    correct: false,
  },
];

export const C4_P8_TEXT_EVIDENCE: JtwEvidenceOption[] = [
  {
    id: 'came-to-learn',
    label: '"I come from Flower-Fruit Mountain and want to study hard."',
    correct: true,
  },
  {
    id: 'treasure',
    label: '"I travel far and wide just to find shining treasures."',
    correct: false,
  },
];

export const C4_P8_RUN_EVIDENCE: JtwEvidenceOption[] = [
  {
    id: 'two-trigger-traces',
    label:
      'The Go track only goes through the name chain, and the real Tap goes through the skill chain, both of which go to End.',
    correct: true,
  },
  {
    id: 'auto-played',
    label: 'Go automatically plays all the names and abilities.',
    correct: false,
  },
];

export const C4_P8_DEBUG_EVIDENCE: JtwEvidenceOption[] = [
  {
    id: 'wrong-trigger-first',
    label: 'The first deviation of P6 was that the skill used the wrong Start Trigger.',
    correct: true,
  },
  {
    id: 'wait-too-long',
    label: 'The first deviation of P6 is just waiting too long.',
    correct: false,
  },
];

export function c4p8CardsOrdered(order: readonly string[]): boolean {
  return (
    order.length === C4_P8_CAUSE_ORDER.length &&
    C4_P8_CAUSE_ORDER.every((id, index) => order[index] === id)
  );
}

export function c4p8Correct(options: JtwEvidenceOption[], selected: string | null): boolean {
  return options.find((option) => option.id === selected)?.correct === true;
}

export type C4P8ContinueChoice = 'now' | 'later';
