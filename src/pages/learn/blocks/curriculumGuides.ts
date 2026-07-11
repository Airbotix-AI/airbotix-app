export interface StoryMissionChoice {
  id: string;
  label: string;
  correct: boolean;
}

export interface StoryPage {
  emoji: string;
  title: string;
  body: string;
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
        title: 'The village beyond the clouds',
        body:
          'Far beyond the clouds is Tiny Star Village. Its little houses, winding paths, and singing streetlights all glow with starshine.',
      },
      {
        emoji: '🌅🗼',
        title: 'The morning promise',
        body:
          'Every morning, the first star to wake must light the Dawn Tower. Its golden beam shows the Sun how to find the village.',
      },
      {
        emoji: '⭐⏰',
        title: "Little Light's first big job",
        body:
          'Today, Little Light must wake the village all by itself. But the tower is still dark—and its morning blocks may be mixed up.',
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
    next: 'Next, you will help Little Light wake up first, then say hello.',
  },
};

export function storyMissionFor(lessonId: string | undefined): StoryMission | undefined {
  return lessonId ? STORY_MISSIONS[lessonId] : undefined;
}
