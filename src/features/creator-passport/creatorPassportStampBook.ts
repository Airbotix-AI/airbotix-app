import type { CreatorCapabilityCode } from './creatorPassport';

export type PassportStampLevel = 1 | 2 | 3;

export interface PassportStampChapter {
  level: PassportStampLevel;
  label: string;
  quest: string;
}

export const CAPABILITY_TRAIL_LABELS: Record<CreatorCapabilityCode, string> = {
  idea_builder: 'Idea trail',
  prompt_director: 'AI trail',
  bug_hunter: 'Fix-it trail',
  game_tester: 'Play trail',
  project_presenter: 'Showcase trail',
};

export const CAPABILITY_STAMP_TRAILS: Record<
  CreatorCapabilityCode,
  readonly [PassportStampChapter, PassportStampChapter, PassportStampChapter]
> = {
  idea_builder: [
    { level: 1, label: 'Idea Spark', quest: 'Bring one idea to life' },
    { level: 2, label: 'World Maker', quest: 'Build another world' },
    { level: 3, label: 'Big Inventor', quest: 'Invent something surprising' },
  ],
  prompt_director: [
    { level: 1, label: 'AI Explorer', quest: 'Guide AI, then improve it' },
    { level: 2, label: 'Prompt Coach', quest: 'Coach AI through a new challenge' },
    { level: 3, label: 'AI Director', quest: 'Direct AI with your own plan' },
  ],
  bug_hunter: [
    { level: 1, label: 'Bug Spotter', quest: 'Find and prove one fix' },
    { level: 2, label: 'Fix-it Finder', quest: 'Track down a tricky bug' },
    { level: 3, label: 'Debug Hero', quest: 'Solve another real problem' },
  ],
  game_tester: [
    { level: 1, label: 'Play Tester', quest: 'Test, notice, improve' },
    { level: 2, label: 'Feedback Finder', quest: 'Use someone else’s feedback' },
    { level: 3, label: 'Test Captain', quest: 'Lead a new test mission' },
  ],
  project_presenter: [
    { level: 1, label: 'Show & Tell Star', quest: 'Share what you made' },
    { level: 2, label: 'Story Speaker', quest: 'Tell the story behind a project' },
    { level: 3, label: 'Showcase Star', quest: 'Present your next big creation' },
  ],
};

export const PASSPORT_STAMP_COUNT = Object.values(CAPABILITY_STAMP_TRAILS).reduce(
  (total, trail) => total + trail.length,
  0,
);
