export interface StoryMissionChoice {
  id: string;
  label: string;
  correct: boolean;
}

export type StoryCoachCue =
  | 'ready'
  | 'watch'
  | 'sayFirst'
  | 'sayThen'
  | 'hopFirst'
  | 'hopThen'
  | 'retry'
  | 'fix'
  | 'test'
  | 'complete';

export interface StoryCoachCopy {
  ready: string;
  watch: string;
  sayFirst: string;
  sayThen: string;
  hopFirst: string;
  hopThen: string;
  retry: string;
  fix: string;
  test: string;
  complete: string;
}

export interface StoryLogicStep {
  icon: string;
  label: string;
  order: string;
}

export interface StoryPage {
  emoji: string;
  title: string;
  body: string;
  speaker?: string;
  dialogue?: string;
}

export interface StoryMission {
  lessonId: string;
  eyebrow: string;
  title: string;
  storyPages: StoryPage[];
  partnerLine: string;
  mission: string;
  question: string;
  choices: StoryMissionChoice[];
  retry: string;
  successTitle: string;
  success: string;
  fixTitle: string;
  fixPrompt: string;
  fixChoices: StoryMissionChoice[];
  fixRetry: string;
  coach: StoryCoachCopy;
  logicSteps: StoryLogicStep[];
  logicWhy: string;
  completionTitle: string;
  completion: string;
  completionSteps: StoryLogicStep[];
  completionWhy: string;
  next: string;
}

const STORY_MISSIONS: Record<string, StoryMission> = {
  'tsv-s1-a1-h': {
    lessonId: 'tsv-s1-a1-h',
    eyebrow: 'Tiny Star Village · Chapter 1',
    title: 'A strange good morning',
    storyPages: [
      {
        emoji: '🌌🏘️',
        title: 'The village that wakes with light',
        body:
          'Far beyond the clouds is Tiny Star Village. Every morning, its Bell Tower sends out one warm beam that wakes the houses, paths, and singing streetlights.',
      },
      {
        emoji: '🌑🔕',
        title: 'The morning light is missing',
        body:
          'But today the bell did not ring. The village stayed dark, and all the little stars wondered which morning step had not happened.',
        speaker: 'Cloud Bear',
        dialogue: 'Why is the village still dark?',
      },
      {
        emoji: '⭐⏰',
        title: 'A strange good morning',
        body:
          'At the window, Little Light was still asleep. It called out “Morning!” from its dream—and only then did it hop awake.',
        speaker: 'Little Light',
        dialogue: 'Oh! Did I do my morning steps in the wrong order?',
      },
      {
        emoji: '🤝✨',
        title: 'A new Morning Light Helper',
        body:
          'The Bell Tower cannot shine until the morning begins in the right order. Little Light needs someone who can watch carefully and find the mixed-up step.',
        speaker: 'Little Light',
        dialogue: 'Will you be my Story Partner?',
      },
    ],
    partnerLine: "Little Light needs a Story Partner. That's you!",
    mission: 'Press Go. Watch the speech bubble and the jump. What happens first?',
    question: 'What happens first?',
    choices: [
      { id: 'say-first', label: "It says ‘Morning!’ first", correct: true },
      { id: 'hop-first', label: 'It hops awake first', correct: false },
    ],
    retry: 'Almost! Watch the speech bubble and the jump once more.',
    successTitle: 'You found the mixed-up step! ⭐',
    success:
      'Little Light talks before it wakes up. The order of the blocks makes the story feel strange.',
    fixTitle: 'Now fix the morning',
    fixPrompt: 'Which order will wake Little Light properly?',
    fixChoices: [
      { id: 'hop-then-say', label: '🦘 Hop awake → 💬 Say “Morning!”', correct: true },
      { id: 'say-then-hop', label: '💬 Say “Morning!” → 🦘 Hop awake', correct: false },
    ],
    fixRetry: 'That is the mixed-up order we just saw. Try the other plan.',
    coach: {
      ready: 'Press Go. Watch only two things: the speech bubble and the hop.',
      watch: 'Watch closely… which block lights up first?',
      sayFirst: 'First, I say “Morning!” 💬',
      sayThen: 'Then, I say “Morning!” 💬',
      hopFirst: 'First, I hop awake! 🦘',
      hopThen: 'Then, I hop awake! 🦘',
      retry: 'Let’s watch again. Look for the speech bubble first.',
      fix: 'Choose the new order: hop awake first, then say hello.',
      test: 'Your blocks changed! Press Go to test the new morning.',
      complete: 'You found it! The blocks run from left to right.',
    },
    logicSteps: [
      { icon: '💬', label: 'Morning!', order: 'First' },
      { icon: '🦘', label: 'Hop', order: 'Then' },
    ],
    logicWhy: 'The speech block is on the left, so it runs first.',
    completionTitle: 'First mission complete! 🌅',
    completion:
      'You changed the real program and tested it. Little Light now wakes up before saying hello.',
    completionSteps: [
      { icon: '🦘', label: 'Hop', order: 'First' },
      { icon: '💬', label: 'Morning!', order: 'Then' },
    ],
    completionWhy: 'The Hop block is now on the left, so Little Light wakes up first.',
    next: 'A tiny light appears at the window. The first morning clue is safe.',
  },
};

export function storyMissionFor(lessonId: string | undefined): StoryMission | undefined {
  return lessonId ? STORY_MISSIONS[lessonId] : undefined;
}
