export interface StoryMissionChoice {
  id: string;
  label: string;
  correct: boolean;
}

export type StoryCoachCue = 'ready' | 'watch' | 'say' | 'hop' | 'retry' | 'complete';

export interface StoryCoachCopy {
  ready: string;
  watch: string;
  say: string;
  hop: string;
  retry: string;
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
  coach: StoryCoachCopy;
  logicSteps: StoryLogicStep[];
  logicWhy: string;
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
    coach: {
      ready: 'Press Go. Watch only two things: the speech bubble and the hop.',
      watch: 'Watch closely… which block lights up first?',
      say: 'First, I say “Morning!” 💬',
      hop: 'Then, I hop awake! 🦘',
      retry: 'Let’s watch again. Look for the speech bubble first.',
      complete: 'You found it! The blocks run from left to right.',
    },
    logicSteps: [
      { icon: '💬', label: 'Morning!', order: 'First' },
      { icon: '🦘', label: 'Hop', order: 'Then' },
    ],
    logicWhy: 'The speech block is on the left, so it runs first.',
    next: 'Next, you will help Little Light wake up first, then say hello.',
  },
};

export function storyMissionFor(lessonId: string | undefined): StoryMission | undefined {
  return lessonId ? STORY_MISSIONS[lessonId] : undefined;
}
