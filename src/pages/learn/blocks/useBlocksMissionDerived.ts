import { useMemo } from 'react';

import type { BlocksProject } from './blocksModel';
import { storyMissionFor, type StoryCoachCue } from './curriculumGuides';
import { isJtwOrderDebugLesson } from './jtwOrderDebug';
import { JTW_C4_P4_LESSON_ID, JTW_C4_P5_LESSON_ID } from './jtwC4DualBuild';
import { sceneId } from './library';
import {
  storyMissionProgramMatches,
  storyMissionSayChoices,
  storyMissionScriptId,
  TINY_STAR_GREETING_CHOICES,
} from './storyMissionProgress';
import { nextStoryMissionForLesson, storyJourneyPositionForLesson } from './storyJourneyCatalog';
import { tinyStarCompletionScene } from './tinyStarCompletionScene';
import {
  TINY_STAR_BREAKFAST_CART_ID,
  TINY_STAR_DELIVERY_START_GX,
  tinyStarA2TargetGx,
  tinyStarDeliveryDistance,
} from './tinyStarStageTargets';
import { TINY_STAR_FINALE_RINGER_ID } from './tinyStarBellTower';
import { TINY_STAR_DUET_FIRST_ID, TINY_STAR_DUET_SECOND_ID } from './tinyStarDuet';

interface UseBlocksMissionDerivedOptions {
  project: BlocksProject;
  pageId: string;
  charId: string;
  missionAnswer: string | null;
  missionCompleted: boolean;
  missionCorrectRunFinished: boolean;
  missionFixApplied: boolean;
  running: boolean;
  storyCoachCue: StoryCoachCue;
}

export function useBlocksMissionDerived({
  project,
  pageId,
  charId,
  missionAnswer,
  missionCompleted,
  missionCorrectRunFinished,
  missionFixApplied,
  running,
  storyCoachCue,
}: UseBlocksMissionDerivedOptions) {
  const page = useMemo(
    () => project.pages.find((item) => item.id === pageId) ?? project.pages[0],
    [project, pageId],
  );
  const selectedChar =
    page.characters.find((character) => character.id === charId) ?? page.characters[0];
  const storyMission = useMemo(() => storyMissionFor(project.lessonId), [project.lessonId]);
  const completionScene = tinyStarCompletionScene(
    storyMission?.lessonId,
    page.background,
    missionCompleted,
  );
  const stageVisualScene = completionScene ?? sceneId(page.background);
  const missionSayChoices = useMemo(
    () =>
      storyMissionSayChoices(project.lessonId) ??
      (storyMission?.mode === 'personal-ship' ? TINY_STAR_GREETING_CHOICES : null),
    [project.lessonId, storyMission?.mode],
  );
  const journeyPosition = useMemo(
    () => storyJourneyPositionForLesson(project.lessonId),
    [project.lessonId],
  );
  const nextJourneyPosition = useMemo(
    () => nextStoryMissionForLesson(project.lessonId),
    [project.lessonId],
  );
  const answeredCorrectly =
    storyMission?.choices.some((choice) => choice.id === missionAnswer && choice.correct) ?? false;
  const missionScript = useMemo(
    () =>
      page.characters
        .flatMap((character) => character.scripts)
        .find((script) => script.id === storyMissionScriptId(storyMission?.lessonId ?? '')),
    [page, storyMission?.lessonId],
  );
  const missionTargetFixed = storyMission
    ? storyMissionProgramMatches(project, storyMission.lessonId)
    : false;
  const lessonId = storyMission?.lessonId;
  const isA2DirectionDebug = lessonId === 'tsv-s1-a2-d';
  const isA3EventDebug = lessonId === 'tsv-s1-a3-d';
  const isA2PersonalShip = lessonId === 'tsv-s1-a2-s';
  const isA3PersonalShip = lessonId === 'tsv-s1-a3-s';
  const isA4ParameterBuild = lessonId === 'tsv-s1-a4-b';
  const isA4ParameterDebug = lessonId === 'tsv-s1-a4-d';
  const isA4PersonalShip = lessonId === 'tsv-s1-a4-s';
  const isA5TurnBuild = lessonId === 'tsv-s1-a5-b';
  const isA5RelayDebug = lessonId === 'tsv-s1-a5-d';
  const isA5PersonalShip = lessonId === 'tsv-s1-a5-s';
  const isA6StepBuild = lessonId === 'tsv-s1-a6-b';
  const isA6OrderDebug = lessonId === 'tsv-s1-a6-d';
  const needsBellOrderRun = isA6StepBuild || isA6OrderDebug;
  const isA6Finale = lessonId === 'tsv-s1-a6-s';
  const finaleRinger = page.characters.find(
    (character) => character.id === TINY_STAR_FINALE_RINGER_ID,
  );
  const duetFirst = page.characters.find((character) => character.id === TINY_STAR_DUET_FIRST_ID);
  const duetSecond = page.characters.find((character) => character.id === TINY_STAR_DUET_SECOND_ID);
  const deliveryCart = page.characters.find(
    (character) => character.id === TINY_STAR_BREAKFAST_CART_ID,
  );
  const isJtwOrderDebug = isJtwOrderDebugLesson(lessonId);
  const isJtwC4DualBuild = lessonId === JTW_C4_P4_LESSON_ID || lessonId === JTW_C4_P5_LESSON_ID;
  const selectedHomeGx = tinyStarA2TargetGx(page.background, lessonId);
  const selectedDeliveryDistance = tinyStarDeliveryDistance(page.background);
  const lockedStageTargetGx =
    selectedHomeGx ??
    (selectedDeliveryDistance === undefined
      ? undefined
      : TINY_STAR_DELIVERY_START_GX + selectedDeliveryDistance);
  const visibleCoachCue: StoryCoachCue = missionCompleted
    ? 'complete'
    : missionCorrectRunFinished
      ? 'saving'
      : running
        ? storyCoachCue
        : storyMission?.mode === 'observe-only'
          ? storyCoachCue
          : storyMission?.mode !== 'observe-fix' && missionTargetFixed
            ? 'test'
            : missionFixApplied
              ? 'test'
              : missionAnswer
                ? answeredCorrectly
                  ? 'fix'
                  : 'retry'
                : storyCoachCue;

  return {
    page,
    selectedChar,
    storyMission,
    completionScene,
    stageVisualScene,
    missionSayChoices,
    journeyPosition,
    nextJourneyPosition,
    answeredCorrectly,
    missionScript,
    missionTargetFixed,
    isA2DirectionDebug,
    isA3EventDebug,
    isA2PersonalShip,
    isA3PersonalShip,
    isA4ParameterBuild,
    isA4ParameterDebug,
    isA4PersonalShip,
    isA5TurnBuild,
    isA5RelayDebug,
    isA5PersonalShip,
    isA6StepBuild,
    isA6OrderDebug,
    needsBellOrderRun,
    isA6Finale,
    finaleRinger,
    duetFirst,
    duetSecond,
    deliveryCart,
    isJtwOrderDebug,
    isJtwC4DualBuild,
    selectedHomeGx,
    selectedDeliveryDistance,
    lockedStageTargetGx,
    visibleCoachCue,
  };
}
