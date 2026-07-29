import type { BlocksTemplateId } from './blocksApi';

export interface StoryJourneyMission {
  template: BlocksTemplateId;
  lessonId: string;
  number: number;
  title: string;
  action: string;
  legacyProjectTitles?: readonly string[];
}

export interface StoryJourneyChapter {
  id: string;
  number: number;
  emoji: string;
  title: string;
  story: {
    problem: string;
    help: string;
    after: string;
  };
  skill: string;
  art: 'window' | 'cloud' | 'rooftop' | 'breakfast' | 'greeting' | 'tower';
  missions: StoryJourneyMission[];
}

export const TINY_STAR_VILLAGE_CHAPTERS: StoryJourneyChapter[] = [
  {
    id: 'a1',
    number: 1,
    emoji: '🌟',
    title: 'Lumi starts the morning',
    story: {
      problem:
        'Tiny Star Village is still dark. Lumi said good morning in a dream before waking up, so the Bell Tower paused the morning-light chain.',
      help:
        'Lumi wants every friend to wake to a warm light. Help Lumi hop awake first, then say hello, so the first wake-up star can shine.',
      after:
        'Lumi’s window lights up. Its star reveals Tuan Tuan on the cloud road, walking away from the plaza.',
    },
    skill: 'Put steps in order',
    art: 'window',
    missions: [
      { template: 'blocks_tsv_a1_h', lessonId: 'tsv-s1-a1-h', number: 1, title: 'A strange good morning', action: 'Try' },
      { template: 'blocks_tsv_a1_b', lessonId: 'tsv-s1-a1-b', number: 2, title: 'Wake up first', action: 'Build' },
      { template: 'blocks_tsv_a1_d', lessonId: 'tsv-s1-a1-d', number: 3, title: 'The backwards morning', action: 'Fix' },
      { template: 'blocks_tsv_a1_s', lessonId: 'tsv-s1-a1-s', number: 4, title: 'My morning greeting', action: 'Make mine' },
    ],
  },
  {
    id: 'a2',
    number: 2,
    emoji: '☁️',
    title: 'Tuan Tuan finds the plaza',
    story: {
      problem:
        'Light from Lumi’s window reveals Tuan Tuan on the cloud road. The plaza is on his right, but his arrow sends him left.',
      help:
        'Tuan Tuan wants to get back to his friends. Help him choose the direction that takes him toward the plaza.',
      after:
        'Tuan Tuan reaches the plaza. From there, he spots Dot Dot still asleep on a nearby rooftop.',
    },
    skill: 'Choose left or right',
    art: 'cloud',
    missions: [
      {
        template: 'blocks_tsv_a2_h',
        lessonId: 'tsv-s1-a2-h',
        number: 5,
        title: 'Press Go and watch',
        action: 'Watch',
        legacyProjectTitles: [
          'Tiny Star Village · Which way is the plaza?',
          'Tiny Star Village · Watch the wrong-way arrow',
          'Tiny Star Village · Press Go once — watch Left 3',
        ],
      },
      { template: 'blocks_tsv_a2_b', lessonId: 'tsv-s1-a2-b', number: 6, title: 'Choose an arrow', action: 'Build' },
      { template: 'blocks_tsv_a2_d', lessonId: 'tsv-s1-a2-d', number: 7, title: 'Tuan Tuan walked the wrong way', action: 'Fix' },
      { template: 'blocks_tsv_a2_s', lessonId: 'tsv-s1-a2-s', number: 8, title: 'My two-step path', action: 'Make mine' },
    ],
  },
  {
    id: 'a3',
    number: 3,
    emoji: '🐱',
    title: 'Tap to wake Dot Dot',
    story: {
      problem:
        'Tuan Tuan reaches the plaza and sees Dot Dot asleep on the rooftop. The green Go button starts the plaza, but Dot Dot is waiting for a tap.',
      help:
        'Dot Dot needs a gentle wake-up signal. Make a tap start the action so Dot Dot can hop up and answer.',
      after:
        'Dot Dot wakes and looks across the village. The breakfast cart has stopped before reaching the table.',
    },
    skill: 'Make taps start actions',
    art: 'rooftop',
    missions: [
      { template: 'blocks_tsv_a3_h', lessonId: 'tsv-s1-a3-h', number: 9, title: 'Go cannot wake Dot Dot', action: 'Try' },
      { template: 'blocks_tsv_a3_b', lessonId: 'tsv-s1-a3-b', number: 10, title: 'Build a tap response', action: 'Build' },
      { template: 'blocks_tsv_a3_d', lessonId: 'tsv-s1-a3-d', number: 11, title: 'The wrong start hat', action: 'Fix' },
      { template: 'blocks_tsv_a3_s', lessonId: 'tsv-s1-a3-s', number: 12, title: 'My tap surprise', action: 'Make mine' },
    ],
  },
  {
    id: 'a4',
    number: 4,
    emoji: '🚙',
    title: 'The breakfast cart stops here',
    story: {
      problem:
        'Dot Dot is awake, but breakfast is stranded. The little cart stops in the road when it moves too little and rushes past the table when it moves too far.',
      help:
        'The friends are waiting to eat together. Count the spaces and help the cart stop right beside the table.',
      after:
        'Breakfast arrives. Lumi, Tuan Tuan, and Dot Dot gather around the table and all try to say good morning at once.',
    },
    skill: 'Move 1, 2, or 3 spaces',
    art: 'breakfast',
    missions: [
      { template: 'blocks_tsv_a4_h', lessonId: 'tsv-s1-a4-h', number: 13, title: 'How far is breakfast?', action: 'Try' },
      { template: 'blocks_tsv_a4_b', lessonId: 'tsv-s1-a4-b', number: 14, title: 'How many spaces?', action: 'Build' },
      { template: 'blocks_tsv_a4_d', lessonId: 'tsv-s1-a4-d', number: 15, title: 'The cart went too far', action: 'Fix' },
      { template: 'blocks_tsv_a4_s', lessonId: 'tsv-s1-a4-s', number: 16, title: 'My delivery stop', action: 'Make mine' },
    ],
  },
  {
    id: 'a5',
    number: 5,
    emoji: '💡',
    title: 'Everyone takes a turn',
    story: {
      problem:
        'Breakfast has arrived, but Lumi and Tuan Tuan speak at the same time. Their greeting bubbles overlap, and nobody can hear who spoke first.',
      help:
        'Each friend wants to be heard. Arrange a short wait so one friend greets the others and the next friend answers.',
      after:
        'Every greeting can be heard. Three greeting stars join into a glowing path that leads to the Bell Tower.',
    },
    skill: 'Use Wait to make turns',
    art: 'greeting',
    missions: [
      { template: 'blocks_tsv_a5_h', lessonId: 'tsv-s1-a5-h', number: 17, title: 'Who is speaking?', action: 'Try' },
      { template: 'blocks_tsv_a5_b', lessonId: 'tsv-s1-a5-b', number: 18, title: 'Wait a moment', action: 'Build' },
      { template: 'blocks_tsv_a5_d', lessonId: 'tsv-s1-a5-d', number: 19, title: 'That wait was too long', action: 'Fix' },
      { template: 'blocks_tsv_a5_s', lessonId: 'tsv-s1-a5-s', number: 20, title: 'My two-friend greeting', action: 'Make mine' },
    ],
  },
  {
    id: 'a6',
    number: 6,
    emoji: '🔔',
    title: 'Ring in the morning light',
    story: {
      problem:
        'The greeting stars lead Lumi to the Bell Tower, but the tower’s story is missing its middle step. The bell rings before anyone reaches up to touch it.',
      help:
        'The morning light needs a complete story. Help a friend walk to the tower, hop up to the bell, and only then make it ring.',
      after:
        'The bell sends three warm beams through every window. Morning returns, and all three friends celebrate the story you repaired.',
    },
    skill: 'Build and fix a three-step story',
    art: 'tower',
    missions: [
      { template: 'blocks_tsv_a6_h', lessonId: 'tsv-s1-a6-h', number: 21, title: 'Three Bell Tower cards', action: 'Try' },
      { template: 'blocks_tsv_a6_b', lessonId: 'tsv-s1-a6-b', number: 22, title: 'Add the missing step', action: 'Build' },
      { template: 'blocks_tsv_a6_d', lessonId: 'tsv-s1-a6-d', number: 23, title: 'The bell rang first', action: 'Fix' },
      { template: 'blocks_tsv_a6_s', lessonId: 'tsv-s1-a6-s', number: 24, title: 'My morning-light ending', action: 'Make mine' },
    ],
  },
];

export const PLAYABLE_STORY_MISSION_COUNT = TINY_STAR_VILLAGE_CHAPTERS.reduce(
  (total, chapter) => total + chapter.missions.length,
  0,
);

export interface StoryJourneyPosition {
  chapter: StoryJourneyChapter;
  mission: StoryJourneyMission;
  sceneNumber: number;
  sceneCount: number;
}

export function storyJourneyPositionForLesson(
  lessonId: string | undefined,
): StoryJourneyPosition | undefined {
  if (!lessonId) return undefined;
  for (const chapter of TINY_STAR_VILLAGE_CHAPTERS) {
    const sceneNumber = chapter.missions.findIndex((mission) => mission.lessonId === lessonId);
    if (sceneNumber >= 0) {
      return {
        chapter,
        mission: chapter.missions[sceneNumber],
        sceneNumber: sceneNumber + 1,
        sceneCount: chapter.missions.length,
      };
    }
  }
  return undefined;
}

export function nextStoryMissionForLesson(
  lessonId: string | undefined,
): StoryJourneyPosition | undefined {
  if (!lessonId) return undefined;
  const playable = TINY_STAR_VILLAGE_CHAPTERS.flatMap((chapter) =>
    chapter.missions.map((mission, index) => ({
      chapter,
      mission,
      sceneNumber: index + 1,
      sceneCount: chapter.missions.length,
    })),
  );
  const current = playable.findIndex((position) => position.mission.lessonId === lessonId);
  return current >= 0 ? playable[current + 1] : undefined;
}

export function storyJourneyActionLabel(
  current: StoryJourneyPosition,
  next: StoryJourneyPosition,
): string {
  if (current.chapter.number !== next.chapter.number) {
    return `Start Chapter ${next.chapter.number}: ${next.mission.title}`;
  }
  return `Next scene (${next.sceneNumber} of ${next.sceneCount}): ${next.mission.title}`;
}

export function storyMissionProjectTitle(mission: StoryJourneyMission): string {
  return `Tiny Star Village · ${mission.title}`;
}
