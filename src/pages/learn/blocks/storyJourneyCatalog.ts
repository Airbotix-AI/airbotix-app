import type { BlocksTemplateId } from './blocksApi';

export interface StoryJourneyMission {
  template: BlocksTemplateId;
  lessonId: string;
  number: number;
  title: string;
  action: string;
}

export interface StoryJourneyChapter {
  id: string;
  number: number;
  emoji: string;
  title: string;
  story: string;
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
    story: 'The Bell Tower is quiet. Help Lumi send the village’s first wake-up light.',
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
    story: 'A cloud path appears, but Tuan Tuan keeps following the wrong arrow.',
    skill: 'Choose left or right',
    art: 'cloud',
    missions: [
      { template: 'blocks_tsv_a2_h', lessonId: 'tsv-s1-a2-h', number: 5, title: 'Which way is the plaza?', action: 'Try' },
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
    story: 'The rooftop star will not wake for Go. Dot Dot needs a different kind of start.',
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
    story: 'Breakfast is ready, but the little cart keeps stopping too early or too late.',
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
    story: 'All the friends say good morning at once. Help each voice have its moment.',
    skill: 'Use Wait to make turns',
    art: 'greeting',
    missions: [
      { template: 'blocks_tsv_a5_h', lessonId: 'tsv-s1-a5-h', number: 17, title: 'Who is speaking?', action: 'Listen' },
      { template: 'blocks_tsv_a5_b', lessonId: 'tsv-s1-a5-b', number: 18, title: 'Wait for your turn', action: 'Build' },
      { template: 'blocks_tsv_a5_d', lessonId: 'tsv-s1-a5-d', number: 19, title: 'Fix the long pause', action: 'Fix' },
      { template: 'blocks_tsv_a5_s', lessonId: 'tsv-s1-a5-s', number: 20, title: 'My morning welcome', action: 'Make mine' },
    ],
  },
  {
    id: 'a6',
    number: 6,
    emoji: '🔔',
    title: 'Ring in the morning light',
    story: 'Walk, hop, then ring the Bell Tower to bring sunrise back to the whole village.',
    skill: 'Build and fix a three-step story',
    art: 'tower',
    missions: [
      { template: 'blocks_tsv_a6_h', lessonId: 'tsv-s1-a6-h', number: 21, title: 'Which step is missing?', action: 'Notice' },
      { template: 'blocks_tsv_a6_b', lessonId: 'tsv-s1-a6-b', number: 22, title: 'Add the missing Hop', action: 'Build' },
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

export function storyMissionProjectTitle(mission: StoryJourneyMission): string {
  return `Tiny Star Village · ${mission.title}`;
}
