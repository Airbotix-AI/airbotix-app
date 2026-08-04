// Story Blocks curriculum guides — the public module.
//
// The mission data itself lives in ./guides, one file per curriculum chapter,
// so no single file breaches the 1000-line hard rule in
// rules/file-organization.md. This file stays the only import site every other
// module uses: the types, the assembled catalogue and the lookup.

import { JTW_C1_MISSIONS } from './guides/journeyWestC1';
import { JTW_C2_MISSIONS } from './guides/journeyWestC2';
import { JTW_C3_MISSIONS } from './guides/journeyWestC3';
import { JTW_C4_MISSIONS } from './guides/journeyWestC4';
import { JTW_C5_MISSIONS } from './guides/journeyWestC5';
import { TSV_A1_MISSIONS } from './guides/tinyStarA1';
import { TSV_A2_MISSIONS } from './guides/tinyStarA2';
import { TSV_A3_MISSIONS } from './guides/tinyStarA3';
import { TSV_A4_MISSIONS } from './guides/tinyStarA4';
import { TSV_A5_MISSIONS } from './guides/tinyStarA5';
import { TSV_A6_MISSIONS } from './guides/tinyStarA6';
import type { StoryMission } from './guides/types';

export type {
  StoryCoachCopy,
  StoryCoachCue,
  StoryLogicStep,
  StoryMission,
  StoryMissionChoice,
  StoryPage,
} from './guides/types';

/**
 * Every mission guide, keyed by lesson id. Chapter modules are merged in
 * curriculum order; lesson ids are globally unique, so no key is ever shadowed
 * (guarded by a test).
 */
const STORY_MISSIONS: Record<string, StoryMission> = {
  ...TSV_A1_MISSIONS,
  ...TSV_A2_MISSIONS,
  ...TSV_A3_MISSIONS,
  ...TSV_A4_MISSIONS,
  ...TSV_A5_MISSIONS,
  ...TSV_A6_MISSIONS,
  ...JTW_C1_MISSIONS,
  ...JTW_C2_MISSIONS,
  ...JTW_C3_MISSIONS,
  ...JTW_C4_MISSIONS,
  ...JTW_C5_MISSIONS,
};

/** Chapter modules in curriculum order — used by the no-shadowing guard. */
export const STORY_MISSION_CHAPTERS: ReadonlyArray<Record<string, StoryMission>> = [
  TSV_A1_MISSIONS,
  TSV_A2_MISSIONS,
  TSV_A3_MISSIONS,
  TSV_A4_MISSIONS,
  TSV_A5_MISSIONS,
  TSV_A6_MISSIONS,
  JTW_C1_MISSIONS,
  JTW_C2_MISSIONS,
  JTW_C3_MISSIONS,
  JTW_C4_MISSIONS,
  JTW_C5_MISSIONS,
];

export function storyMissionFor(lessonId: string | undefined): StoryMission | undefined {
  return lessonId ? STORY_MISSIONS[lessonId] : undefined;
}
