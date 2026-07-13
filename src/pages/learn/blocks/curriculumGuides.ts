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
  | 'saving'
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
  saving: string;
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
        emoji: '🌟👋',
        title: 'Meet Lumi, your morning-light friend',
        body:
          'This is Lumilo—Lumi to friends. Lumi is Tiny Star Village’s first Morning Light Keeper. Every morning begins at Lumi’s little window.',
        speaker: 'Lumilo',
        dialogue: 'Hi! Call me Lumi. Will you help me wake the village?',
      },
      {
        emoji: '🏘️✨🔔',
        title: 'Lumi starts the morning light',
        body:
          'When Lumi hops awake, one wake-up star appears. Lumi says “Morning!” next, and the star travels to the Bell Tower. Other homes send their stars too, and the tower joins them into warm morning light.',
        speaker: 'Lumilo',
        dialogue: 'My star goes first. Then the other homes join in!',
      },
      {
        emoji: '🌑🔕',
        title: 'The light chain stopped today',
        body:
          'Today the tower heard “Morning!”, but no wake-up star arrived first. It paused the light chain, so the bell stayed quiet and the village stayed dim.',
        speaker: 'Cloud Bear',
        dialogue: 'The tower heard a hello. Where is the wake-up star?',
      },
      {
        emoji: '⭐⏰',
        title: 'The program mixed up the story',
        body:
          'At the window, Lumi called “Morning!” from a dream—and only then hopped awake. The blocks run from left to right, so the mixed-up order made the morning happen backwards.',
        speaker: 'Lumilo',
        dialogue: 'My steps are both here. Can you put them in the right order?',
      },
      {
        emoji: '🤝🧩✨',
        title: 'Why the village needs a Story Partner',
        body:
          'The village friends can see the darkness, but you can read the glowing blocks and change their order. Fix this first link to light Lumi’s window and send the tower its first morning clue.',
        speaker: 'Lumilo',
        dialogue: 'Will you help my wake-up star reach the Bell Tower?',
      },
    ],
    partnerLine: "Lumilo needs a Story Partner. That's you!",
    mission:
      'Help Lumi send the first wake-up star: press Go, find what happens first, then make Lumi hop awake before saying “Morning!”',
    question: 'What happens first?',
    choices: [
      { id: 'say-first', label: "It says ‘Morning!’ first", correct: true },
      { id: 'hop-first', label: 'It hops awake first', correct: false },
    ],
    retry: 'Almost! Watch the speech bubble and the jump once more.',
    successTitle: 'You found the mixed-up step! ⭐',
    success:
      'Lumi talks before waking up. The order of the blocks makes the story feel strange.',
    fixTitle: 'Now fix the morning',
    fixPrompt: 'Which order will wake Lumi properly?',
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
      saving: 'The morning worked! I am saving your real blocks…',
      complete: 'You repaired the morning chain! The wake-up star reached the Bell Tower.',
    },
    logicSteps: [
      { icon: '💬', label: 'Morning!', order: 'First' },
      { icon: '🦘', label: 'Hop', order: 'Then' },
    ],
    logicWhy: 'The speech block is on the left, so it runs first.',
    completionTitle: 'First mission complete! 🌅',
    completion:
      'You changed the real program and tested it. Lumi now wakes first, then sends the wake-up star to the Bell Tower.',
    completionSteps: [
      { icon: '🦘', label: 'Hop', order: 'First' },
      { icon: '💬', label: 'Morning!', order: 'Then' },
    ],
    completionWhy: 'The Hop block is now on the left, so Lumi wakes up first.',
    next: 'Lumi’s window glows. The Bell Tower now has the first of six morning clues.',
  },
};

export function storyMissionFor(lessonId: string | undefined): StoryMission | undefined {
  return lessonId ? STORY_MISSIONS[lessonId] : undefined;
}
