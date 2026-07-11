export interface StoryMissionChoice {
  id: string;
  label: string;
  correct: boolean;
}

export interface StoryMission {
  lessonId: string;
  eyebrow: string;
  title: string;
  story: string;
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
    story:
      'Tiny Star Village is still dark. Little Light is trying to wake up—but its morning steps are mixed up.',
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
