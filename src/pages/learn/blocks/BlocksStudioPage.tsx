// Blocks Studio — `/learn/blocks/:projectId` (learn-blocks-studio-prd.md §4).
// Junior stage, character/page rails and six-category coding band.
// Serialized server-wins persistence and interactions live in adjacent hooks.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createBlocksProject,
  saveBlocksProject,
  type BlocksStoryProgress,
} from './blocksApi';
import { type BlockCategory } from './blocksModel';
import { useDemoMode } from '@/pages/try/demoMode';
import { useBlocksStore } from './blocksStore';
import { useBlocksTheme } from './blocksTheme';
import { useProjectBackTo } from '../projects/useProjectBackTo';
import { useReportFocus } from '../liveClass/reportFocus';
import { BlocksRunner, type SpriteState } from './interpreter';
import { sfx, isMuted, setMuted } from './sounds';
import './blocks.css';
import { performanceForBlock } from './characterPerformance';
import type { CharacterPerformance } from './characterPerformance';
import { type StoryCoachCue } from './curriculumGuides';
import { jtwOrderBugObserved } from './jtwOrderDebug';
import {
  JTW_C4_P4_LESSON_ID,
  JTW_C4_P5_LESSON_ID,
  JTW_C4_P6_LESSON_ID,
  JTW_C4_WUKONG_ID,
} from './jtwC4DualBuild';
import { StoryMissionGuide } from './StoryMissionGuide';
import {
  storyMissionProgramMatches,
  TINY_STAR_OVERLAPPING_VOICES,
  tinyStarBounceRelayInTime,
  tinyStarBounceRelayTooLate,
  tinyStarGreetingTookTurns,
} from './storyMissionProgress';
import { TINY_STAR_DELIVERY_START_GX, tinyStarA2TargetGx } from './tinyStarStageTargets';
import {
  TINY_STAR_BELL_MISSING_CARD_ID,
  TINY_STAR_BELL_RINGER_ID,
  TINY_STAR_BELL_RINGER_IDS,
  TINY_STAR_BELL_TOWER_ID,
  TINY_STAR_BELL_TOWER_GX,
  TINY_STAR_FINALE_RINGER_ID,
  isTinyStarBellPageId,
  tinyStarBellRangAfterHop,
  tinyStarBellRangBeforeHop,
  tinyStarBellRangWithoutHop,
  tinyStarFinaleDesign,
  tinyStarFinaleEndedAfterBell,
} from './tinyStarBellTower';
import { tinyStarDuetDesign, tinyStarDuetTookTurns } from './tinyStarDuet';
import { storyJourneyActionLabel, storyMissionProjectTitle } from './storyJourneyCatalog';
import {
  recordTinyStarSeasonScene,
  TINY_STAR_SEASON_LOCKED_MESSAGE,
  TINY_STAR_SEASON_OFFLINE_MESSAGE,
} from './tinyStarSeason';
import { BlocksStudioToolbar } from './BlocksStudioToolbar';
import { TinyStarPersonalizationPanel } from './TinyStarPersonalizationPanel';
import { CharacterPickerDialog } from './CharacterPickerDialog';
import { ScenePickerDialog } from './ScenePickerDialog';
import { BlockEditorPopover } from './BlockEditorPopover';
import { StudioMoreMenu } from './StudioMoreMenu';
import { ResetStudioDialog } from './ResetStudioDialog';
import { BlockDragOverlay } from './BlockDragOverlay';
import { BlocksStageWorkspace } from './BlocksStageWorkspace';
import { BlocksCodingBand } from './BlocksCodingBand';
import { useSpriteDrag } from './useSpriteDrag';
import { useBlockDrag } from './useBlockDrag';
import { usePaletteDrag } from './usePaletteDrag';
import { useBlockEditor } from './useBlockEditor';
import { useBlocksProjectPersistence } from './useBlocksProjectPersistence';
import { useTinyStarBellVisual } from './useTinyStarBellVisual';
import { useBlocksMissionDerived } from './useBlocksMissionDerived';
export function BlocksStudioPage({
  projectId: projectIdProp,
  readOnly = false,
  embedded = false,
  prepMode = false,
}: { projectId?: string; readOnly?: boolean; embedded?: boolean; prepMode?: boolean } = {}) {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const projectId = projectIdProp ?? routeProjectId;
  const homeHref = useProjectBackTo(projectId, '/learn/create/blocks');
  const demo = useDemoMode();
  const project = useBlocksStore((s) => s.project);
  useReportFocus(projectId, 'blocks', project.name, readOnly);
  const pageId = useBlocksStore((s) => s.pageId);
  const charId = useBlocksStore((s) => s.charId);
  const dirty = useBlocksStore((s) => s.dirty);
  const canUndo = useBlocksStore((s) => s.past.length > 0);
  const canRedo = useBlocksStore((s) => s.future.length > 0);
  const [category, setCategory] = useState<BlockCategory>('trigger');
  const [present, setPresent] = useState(false);
  const [running, setRunning] = useState(false);
  const [scenePick, setScenePick] = useState(false);
  const [charTab, setCharTab] = useState(0);
  const [muted, setMutedState] = useState(isMuted());
  const [confirmReset, setConfirmReset] = useState(false);
  const [missionOpen, setMissionOpen] = useState(false);
  const [missionHasRun, setMissionHasRun] = useState(false);
  const [missionTapObserved, setMissionTapObserved] = useState(false);
  const [missionWrongRunObserved, setMissionWrongRunObserved] = useState(false);
  const [missionVoicesOverlapped, setMissionVoicesOverlapped] = useState(false);
  const voicesOverlappedRef = useRef(false);
  const greetingTookTurnsRef = useRef(false);
  const bounceRelayInTimeRef = useRef(false);
  const bounceRelayTooLateRef = useRef(false);
  const duetTookTurnsRef = useRef(false);
  const [missionBellRangAlone, setMissionBellRangAlone] = useState(false);
  const bellRangAloneRef = useRef(false);
  const { bellSwinging, resetBellVisual, swingBell } = useTinyStarBellVisual();
  /**
   * A6: the block ops the ringer's script actually reached in THIS run, in the
   * order the interpreter reached them. A6-H reads a negative off it (a bell
   * with no hop before it); A6-B reads the repaired order (hop, then bell).
   */
  const bellPlayedOpsRef = useRef<string[]>([]);
  const [missionAnswer, setMissionAnswer] = useState<string | null>(null);
  const [missionFixApplied, setMissionFixApplied] = useState(false);
  const [missionCorrectRunFinished, setMissionCorrectRunFinished] = useState(false);
  const [missionFixPersisted, setMissionFixPersisted] = useState(false);
  const [missionCompleted, setMissionCompleted] = useState(false);
  const [nextMissionBusy, setNextMissionBusy] = useState(false);
  const [nextMissionError, setNextMissionError] = useState<string | null>(null);
  const [seasonSceneLocked, setSeasonSceneLocked] = useState(false);
  const [storyCoachCue, setStoryCoachCue] = useState<StoryCoachCue>('ready');
  const [moreAnchor, setMoreAnchor] = useState<{ right: number; top: number } | null>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const theme = useBlocksTheme((s) => s.theme);
  const toggleTheme = useBlocksTheme((s) => s.toggle);
  const [friendPos, setFriendPos] = useState<{ left: number; top: number } | null>(null);
  const pickFriend = friendPos !== null;
  const [runStates, setRunStates] = useState<Map<string, { st: SpriteState; dur: number }> | null>(
    null,
  );
  const [says, setSays] = useState<Map<string, string>>(new Map());
  const [activeBlocks, setActiveBlocks] = useState<Map<string, string>>(new Map());
  const [characterPerformances, setCharacterPerformances] = useState<
    Map<string, CharacterPerformance>
  >(new Map());
  const runnerRef = useRef<BlocksRunner | null>(null);
  const {
    page, selectedChar, storyMission, completionScene, stageVisualScene, missionSayChoices,
    journeyPosition, nextJourneyPosition, answeredCorrectly, missionScript, missionTargetFixed,
    isA2DirectionDebug, isA3EventDebug, isA2PersonalShip, isA3PersonalShip,
    isA4ParameterBuild, isA4ParameterDebug, isA4PersonalShip, isA5TurnBuild,
    isA5RelayDebug, isA5PersonalShip, isA6OrderDebug, needsBellOrderRun,
    isA6Finale, finaleRinger, duetFirst, duetSecond, deliveryCart, isJtwOrderDebug,
    isJtwC4DualBuild,
    selectedHomeGx, selectedDeliveryDistance, lockedStageTargetGx, visibleCoachCue,
  } = useBlocksMissionDerived({
    project, pageId, charId, missionAnswer, missionCompleted, missionCorrectRunFinished,
    missionFixApplied, running, storyCoachCue,
  });
  const {
    phase,
    saveStatus,
    setSaveStatus,
    versionRef,
    otherFilesRef,
    storyProgressRef,
    completionSaveInFlightRef,
    savingRef,
    pendingRef,
    introducedMissionRef,
  } = useBlocksProjectPersistence({
    projectId,
    readOnly,
    dirty,
    storyMission,
    setMissionHasRun,
    setMissionCorrectRunFinished,
    setMissionFixPersisted,
    setMissionCompleted,
    setStoryCoachCue,
    setMissionOpen,
  });
  useEffect(() => {
    if (phase !== 'ready' || !storyMission || introducedMissionRef.current === projectId) return;
    introducedMissionRef.current = projectId ?? storyMission.lessonId;
    const previouslyCompleted = Boolean(
      storyProgressRef.current.completed[storyMission.lessonId] && missionTargetFixed,
    );
    setMissionHasRun(previouslyCompleted);
    setMissionAnswer(null);
    setMissionFixApplied(false);
    setMissionCorrectRunFinished(previouslyCompleted);
    setMissionWrongRunObserved(false);
    setMissionVoicesOverlapped(false);
    voicesOverlappedRef.current = false;
    setMissionBellRangAlone(false);
    bellRangAloneRef.current = false;
    greetingTookTurnsRef.current = false;
    bounceRelayInTimeRef.current = false;
    bounceRelayTooLateRef.current = false;
    duetTookTurnsRef.current = false;
    setMissionFixPersisted(missionTargetFixed);
    setMissionCompleted(previouslyCompleted);
    setNextMissionBusy(false);
    setNextMissionError(null);
    setSeasonSceneLocked(false);
    setStoryCoachCue(previouslyCompleted ? 'complete' : 'ready');
    setMissionOpen(true);
  }, [
    introducedMissionRef,
    missionTargetFixed,
    phase,
    projectId,
    storyMission,
    storyProgressRef,
  ]);
  const startNextStoryMission = useCallback(async () => {
    if (!nextJourneyPosition || nextMissionBusy) return;
    setNextMissionBusy(true);
    setNextMissionError(null);
    try {
      const { id } = await createBlocksProject({
        template: nextJourneyPosition.mission.template,
        title: storyMissionProjectTitle(nextJourneyPosition.mission),
      });
      navigate(`/learn/blocks/${id}`);
    } catch {
      setNextMissionBusy(false);
      setNextMissionError("Couldn't open the next scene. Please try again.");
    }
  }, [navigate, nextJourneyPosition, nextMissionBusy]);
  useEffect(() => {
    if (missionTargetFixed) return;
    setMissionCorrectRunFinished(false);
    setMissionFixPersisted(false);
    setMissionCompleted(false);
  }, [missionTargetFixed]);
  const persistStoryMissionCompletion = useCallback(async () => {
    if (!projectId || !storyMission || completionSaveInFlightRef.current || savingRef.current) {
      return;
    }
    completionSaveInFlightRef.current = true;
    savingRef.current = true;
    setSaveStatus('saving');
    setNextMissionError(null);
    const nextProgress: BlocksStoryProgress = {
      schemaVersion: 1,
      completed: {
        ...storyProgressRef.current.completed,
        [storyMission.lessonId]: { completedAt: new Date().toISOString() },
      },
    };
    try {
      let serverWon = false;
      do {
        pendingRef.current = false;
        const st = useBlocksStore.getState();
        const result = await saveBlocksProject({
          projectId,
          project: st.project,
          version: versionRef.current,
          otherFiles: otherFilesRef.current,
          history: { past: st.past, future: st.future },
          storyProgress: nextProgress,
        });
        versionRef.current = result.version;
        if (result.status === 'kept-newest') {
          serverWon = true;
          useBlocksStore.getState().load(result.project);
          storyProgressRef.current = result.storyProgress;
          break;
        }
      } while (pendingRef.current);
      if (serverWon) {
        const currentProject = useBlocksStore.getState().project;
        const completedOnServer = Boolean(
          storyProgressRef.current.completed[storyMission.lessonId] &&
          storyMissionProgramMatches(currentProject, storyMission.lessonId),
        );
        setMissionCompleted(completedOnServer);
        setMissionCorrectRunFinished(completedOnServer);
        setMissionFixPersisted(storyMissionProgramMatches(currentProject, storyMission.lessonId));
        setStoryCoachCue(completedOnServer ? 'complete' : 'test');
        setMissionOpen(completedOnServer);
      } else {
        storyProgressRef.current = nextProgress;
        setMissionCompleted(true);
        setStoryCoachCue('complete');
        setMissionOpen(true);
        if (!demo) {
          const seasonRecord = await recordTinyStarSeasonScene(storyMission.lessonId, projectId);
          setSeasonSceneLocked(seasonRecord === 'locked');
          if (seasonRecord === 'locked') setNextMissionError(TINY_STAR_SEASON_LOCKED_MESSAGE);
          else if (seasonRecord === 'unavailable') {
            setNextMissionError(TINY_STAR_SEASON_OFFLINE_MESSAGE);
          }
        }
      }
      setSaveStatus('saved');
    } catch {
      setSaveStatus('offline');
      setMissionCorrectRunFinished(false);
      setNextMissionError(
        'Your blocks are ready, but the completion could not be saved. Press Go to try again.',
      );
      setStoryCoachCue('test');
      setMissionOpen(true);
    } finally {
      savingRef.current = false;
      completionSaveInFlightRef.current = false;
    }
  }, [
    completionSaveInFlightRef,
    demo,
    otherFilesRef,
    pendingRef,
    projectId,
    savingRef,
    setSaveStatus,
    storyMission,
    storyProgressRef,
    versionRef,
  ]);
  useEffect(() => {
    if (
      missionCompleted ||
      !missionCorrectRunFinished ||
      !missionFixPersisted ||
      !missionTargetFixed ||
      saveStatus === 'saving'
    ) {
      return;
    }
    void persistStoryMissionCompletion();
  }, [
    missionCompleted,
    missionCorrectRunFinished,
    missionFixPersisted,
    missionTargetFixed,
    persistStoryMissionCompletion,
    saveStatus,
  ]);
  const undo = useCallback(() => {
    sfx.snap();
    useBlocksStore.getState().undo();
  }, []);
  const redo = useCallback(() => {
    sfx.pop();
    useBlocksStore.getState().redo();
  }, []);
  useEffect(() => {
    if (phase !== 'ready') return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, undo, redo]);
  useEffect(() => {
    runnerRef.current?.stopAll();
    runnerRef.current = null;
    resetBellVisual();
    setRunStates(null);
    setSays(new Map());
    setActiveBlocks(new Map());
    setCharacterPerformances(new Map());
    setRunning(false);
    setStoryCoachCue('ready');
  }, [dirty, pageId, resetBellVisual]);
  const makeRunner = useCallback(() => {
    resetBellVisual();
    const openBubbles = new Set<string>();
    const bubbleOpenedAt = new Map<string, number>();
    const bounceStartedAt = new Map<string, number>();
    const duetGreetedAt = new Map<string, number>();
    const duetDesign = tinyStarDuetDesign(page);
    greetingTookTurnsRef.current = false;
    bounceRelayInTimeRef.current = false;
    bounceRelayTooLateRef.current = false;
    duetTookTurnsRef.current = false;
    bellPlayedOpsRef.current = [];
    const runner = new BlocksRunner(page, {
      onSprite: (id, st, dur) =>
        setRunStates((prev) => {
          const next = new Map(prev ?? []);
          next.set(id, { st, dur });
          return next;
        }),
      onSay: (id, text) => {
        if (text === null) openBubbles.delete(id);
        else {
          openBubbles.add(id);
          if (!bubbleOpenedAt.has(id)) {
            bubbleOpenedAt.set(id, Date.now());
            if (tinyStarGreetingTookTurns(bubbleOpenedAt)) greetingTookTurnsRef.current = true;
          }
          if (openBubbles.size >= TINY_STAR_OVERLAPPING_VOICES) {
            voicesOverlappedRef.current = true;
            setMissionVoicesOverlapped(true);
          }
        }
        setSays((prev) => {
          const next = new Map(prev);
          if (text === null) next.delete(id);
          else next.set(id, text);
          return next;
        });
      },
      onNote: sfx.playNote,
      onSound: sfx.playSound,
      onGotoPage: (idx) => {
        const target = useBlocksStore.getState().project.pages[idx];
        if (target) useBlocksStore.getState().selectPage(target.id);
      },
      onStep: (stepCharId, scriptId, index) => {
        const script = page.characters
          .flatMap((character) => character.scripts)
          .find((candidate) => candidate.id === scriptId);
        const op = index >= 0 ? script?.blocks[index]?.op : undefined;
        if (op && TINY_STAR_BELL_RINGER_IDS.includes(stepCharId)) {
          bellPlayedOpsRef.current.push(op);
        }
        if (
          op === 'pop' &&
          TINY_STAR_BELL_RINGER_IDS.includes(stepCharId) &&
          isTinyStarBellPageId(page.id) &&
          page.characters.some((character) => character.id === TINY_STAR_BELL_TOWER_ID)
        ) {
          swingBell();
        }
        if (op === 'hop' && !bounceStartedAt.has(stepCharId)) {
          bounceStartedAt.set(stepCharId, Date.now());
          bounceRelayInTimeRef.current = tinyStarBounceRelayInTime(bounceStartedAt);
          bounceRelayTooLateRef.current = tinyStarBounceRelayTooLate(bounceStartedAt);
        }
        if (duetDesign && (op === 'say' || op === 'hop') && !duetGreetedAt.has(stepCharId)) {
          duetGreetedAt.set(stepCharId, Date.now());
          duetTookTurnsRef.current = tinyStarDuetTookTurns(duetGreetedAt, duetDesign.firstAction);
        }
        setCharacterPerformances((prev) => {
          const next = new Map(prev);
          next.set(stepCharId, performanceForBlock(op));
          return next;
        });
        setActiveBlocks((prev) => {
          const next = new Map(prev);
          if (index < 0) next.delete(scriptId);
          else next.set(scriptId, `${scriptId}:${index}`);
          return next;
        });
        if (storyMission && index >= 0) {
          const sayIndex = script?.blocks.findIndex((block) => block.op === 'say') ?? -1;
          const hopIndex = script?.blocks.findIndex((block) => block.op === 'hop') ?? -1;
          if (op === 'say') setStoryCoachCue(sayIndex < hopIndex ? 'sayFirst' : 'sayThen');
          if (op === 'hop') setStoryCoachCue(hopIndex < sayIndex ? 'hopFirst' : 'hopThen');
        }
      },
    });
    runnerRef.current = runner;
    return runner;
  }, [page, resetBellVisual, storyMission, swingBell]);
  const activeKeys = useMemo(() => new Set(activeBlocks.values()), [activeBlocks]);
  const go = useCallback(() => {
    if (running) return;
    setRunning(true);
    if (storyMission) setStoryCoachCue('watch');
    demo?.onStoryRun?.('start'); // try-demo: tour spotlights the stage while it plays
    const runner = makeRunner();
    runner.resetAll();
    sfx.go();
    void runner.runFlag().finally(() => {
      setRunning(false);
      demo?.onStoryRun?.('end');
      if (storyMission) {
        const requiresPlazaArrival = ['tsv-s1-a2-b', 'tsv-s1-a2-d', 'tsv-s1-a2-s'].includes(
          storyMission.lessonId,
        );
        const targetGx = tinyStarA2TargetGx(page.background, storyMission.lessonId);
        const deliveryStopGx =
          selectedDeliveryDistance === undefined
            ? undefined
            : TINY_STAR_DELIVERY_START_GX + selectedDeliveryDistance;
        const finaleDesign = tinyStarFinaleDesign(page);
        const reachedMissionTarget =
          (!requiresPlazaArrival || runner.state('tuan-tuan')?.gx === targetGx) &&
          (!(isA4ParameterBuild || isA4ParameterDebug) ||
            runner.state('breakfast-cart')?.gx === 7) &&
          (!isA4PersonalShip ||
            (deliveryStopGx !== undefined &&
              runner.state('breakfast-cart')?.gx === deliveryStopGx)) &&
          (!isA5TurnBuild || greetingTookTurnsRef.current) &&
          (!isA5RelayDebug || bounceRelayInTimeRef.current) &&
          (!isA5PersonalShip || duetTookTurnsRef.current) &&
          (!needsBellOrderRun ||
            (tinyStarBellRangAfterHop(bellPlayedOpsRef.current) &&
              runner.state(TINY_STAR_BELL_RINGER_ID)?.gx === TINY_STAR_BELL_TOWER_GX)) &&
          (!isA6Finale ||
            (finaleDesign !== null &&
              tinyStarFinaleEndedAfterBell(bellPlayedOpsRef.current, finaleDesign.ending) &&
              runner.state(TINY_STAR_FINALE_RINGER_ID)?.gx === TINY_STAR_BELL_TOWER_GX));
        const observedWrongDirection =
          storyMission.lessonId === 'tsv-s1-a2-d' && runner.state('tuan-tuan')?.gx === 5;
        const observedOvershoot = isA4ParameterDebug && runner.state('breakfast-cart')?.gx === 8;
        const observedLateBounce = isA5RelayDebug && bounceRelayTooLateRef.current;
        const observedEarlyBell =
          isA6OrderDebug && tinyStarBellRangBeforeHop(bellPlayedOpsRef.current);
        const observedOrderBug = jtwOrderBugObserved(storyMission.lessonId, missionScript?.blocks);
        if (
          storyMission.lessonId === 'tsv-s1-a6-h' &&
          tinyStarBellRangWithoutHop(bellPlayedOpsRef.current) &&
          runner.state(TINY_STAR_BELL_RINGER_ID)?.gx === TINY_STAR_BELL_TOWER_GX
        ) {
          bellRangAloneRef.current = true;
          setMissionBellRangAlone(true);
        }
        setMissionHasRun(true);
        if (observedWrongDirection) setMissionWrongRunObserved(true);
        if (observedOvershoot) setMissionWrongRunObserved(true);
        if (observedOrderBug) setMissionWrongRunObserved(true);
        if (observedLateBounce) setMissionWrongRunObserved(true);
        if (observedEarlyBell) setMissionWrongRunObserved(true);
        if (storyMission.mode === 'observe-only') {
          const completedDistanceHook =
            storyMission.lessonId === 'tsv-s1-a4-h' &&
            missionAnswer === 'three' &&
            runner.state('breakfast-cart')?.gx === 5;
          const completedGreetingHook =
            storyMission.lessonId === 'tsv-s1-a5-h' &&
            missionAnswer === 'together' &&
            voicesOverlappedRef.current;
          const completedBellHook =
            storyMission.lessonId === 'tsv-s1-a6-h' &&
            missionAnswer === TINY_STAR_BELL_MISSING_CARD_ID &&
            bellRangAloneRef.current;
          if (completedDistanceHook || completedGreetingHook || completedBellHook) {
            setMissionCorrectRunFinished(true);
            setStoryCoachCue('saving');
            setMissionOpen(false);
          } else {
            setStoryCoachCue(missionTargetFixed ? 'fix' : 'retry');
            setMissionOpen(storyMission.lessonId !== 'tsv-s1-a3-h');
          }
        } else if (
          missionTargetFixed &&
          reachedMissionTarget &&
          !isJtwC4DualBuild &&
          (!(
            isA2DirectionDebug ||
            isA4ParameterDebug ||
            isA5RelayDebug ||
            isA6OrderDebug ||
            isJtwOrderDebug
          ) ||
            missionWrongRunObserved) &&
          (!(isA4ParameterDebug || isA5RelayDebug || isA6OrderDebug) || answeredCorrectly)
        ) {
          setMissionCorrectRunFinished(true);
          if (missionCompleted) {
            setStoryCoachCue('complete');
            setMissionOpen(true);
          } else {
            setStoryCoachCue('saving');
            setMissionOpen(false);
          }
        } else {
          if (storyMission.mode !== 'observe-fix') setStoryCoachCue('retry');
          setMissionOpen(true);
        }
      }
    });
  }, [
    running,
    makeRunner,
    demo,
    storyMission,
    missionTargetFixed,
    missionCompleted,
    isA2DirectionDebug,
    isA4ParameterBuild,
    isA4ParameterDebug,
    isA4PersonalShip,
    isA5TurnBuild,
    isA5RelayDebug,
    isA5PersonalShip,
    isA6OrderDebug,
    isA6Finale,
    needsBellOrderRun,
    isJtwOrderDebug,
    isJtwC4DualBuild,
    missionScript,
    missionWrongRunObserved,
    missionAnswer,
    answeredCorrectly,
    selectedDeliveryDistance,
    page,
  ]);
  const answerStoryMission = useCallback(
    (choiceId: string) => {
      setMissionAnswer(choiceId);
      if (storyMission?.mode !== 'observe-only' || !missionHasRun || !missionTargetFixed) return;
      if (storyMission.lessonId === 'tsv-s1-a3-h' && !missionTapObserved) return;
      if (storyMission.lessonId === 'tsv-s1-a5-h' && !missionVoicesOverlapped) return;
      if (storyMission.lessonId === 'tsv-s1-a6-h' && !missionBellRangAlone) return;
      const correct = storyMission.choices.some(
        (choice) => choice.id === choiceId && choice.correct,
      );
      if (!correct) {
        setStoryCoachCue('retry');
        return;
      }
      setMissionCorrectRunFinished(true);
      setStoryCoachCue('saving');
      setMissionOpen(false);
    },
    [
      missionBellRangAlone,
      missionHasRun,
      missionTapObserved,
      missionTargetFixed,
      missionVoicesOverlapped,
      storyMission,
    ],
  );
  const applyMissionFix = useCallback(() => {
    if (!missionScript) return;
    const hopIndex = missionScript.blocks.findIndex((block) => block.op === 'hop');
    const sayIndex = missionScript.blocks.findIndex((block) => block.op === 'say');
    if (hopIndex < 1 || sayIndex < 1) return;
    if (hopIndex > sayIndex) {
      useBlocksStore
        .getState()
        .moveBlockAcross(missionScript.id, hopIndex, missionScript.id, sayIndex);
    }
    setMissionFixApplied(true);
    setMissionCorrectRunFinished(false);
    setMissionFixPersisted(false);
    setMissionCompleted(false);
    setStoryCoachCue('test');
    setMissionOpen(false);
  }, [missionScript]);
  useEffect(() => {
    demo?.bindBlocksGo?.(go);
  }, [demo, go]);
  const reset = useCallback(() => {
    runnerRef.current?.stopAll();
    runnerRef.current = null;
    setRunStates(null);
    setSays(new Map());
    setActiveBlocks(new Map());
    setCharacterPerformances(new Map());
    setRunning(false);
    setStoryCoachCue('ready');
  }, []);
  const toggleMute = useCallback(() => {
    const next = !isMuted();
    setMuted(next);
    setMutedState(next);
    if (!next) sfx.tap(); // a little blip to confirm sound is back on
  }, []);
  useEffect(() => {
    if (!moreAnchor) return undefined;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (moreBtnRef.current?.contains(t) || t.closest('[data-testid="more-menu"]')) return;
      setMoreAnchor(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMoreAnchor(null);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [moreAnchor]);
  const tapSprite = useCallback(
    (id: string) => {
      const runner = runnerRef.current ?? makeRunner();
      void runner.runTap(id).finally(() => {
        const targetFixedNow = storyMission
          ? storyMissionProgramMatches(useBlocksStore.getState().project, storyMission.lessonId)
          : false;
        if (
          id === JTW_C4_WUKONG_ID &&
          (storyMission?.lessonId === JTW_C4_P4_LESSON_ID ||
            storyMission?.lessonId === JTW_C4_P5_LESSON_ID ||
            storyMission?.lessonId === JTW_C4_P6_LESSON_ID) &&
          missionHasRun &&
          targetFixedNow
        ) {
          setMissionTapObserved(true);
          setMissionCorrectRunFinished(true);
          setStoryCoachCue('saving');
          setMissionOpen(false);
          return;
        }
        if (id !== 'dot-dot') return;
        if (storyMission?.lessonId === 'tsv-s1-a3-h' && missionHasRun) {
          setMissionTapObserved(true);
          setStoryCoachCue('fix');
          setMissionOpen(true);
        }
        if (
          (storyMission?.lessonId === 'tsv-s1-a3-b' || isA3PersonalShip) &&
          targetFixedNow
        ) {
          setMissionFixPersisted(true);
          setMissionCorrectRunFinished(true);
          setStoryCoachCue('saving');
          setMissionOpen(false);
        }
        if (storyMission?.lessonId === 'tsv-s1-a3-d') {
          if (!missionTapObserved) {
            setMissionHasRun(true);
            setMissionTapObserved(true);
            setStoryCoachCue('fix');
            setMissionOpen(true);
          } else if (targetFixedNow) {
            setMissionCorrectRunFinished(true);
            setStoryCoachCue('saving');
            setMissionOpen(false);
          }
        }
      });
    },
    [isA3PersonalShip, makeRunner, missionHasRun, missionTapObserved, storyMission],
  );
  const openFriendPicker = useCallback(() => {
    sfx.tap();
    setFriendPos({ left: 0, top: 0 });
  }, []);
  const { stageRef, dragging, onSpriteDown, onSpriteMove, onSpriteUp } = useSpriteDrag({
    running,
    present,
    readOnly,
    pageId: page.id,
    tapSprite,
  });
  const {
    binRef,
    binArmed,
    blockDidDrag,
    dragBlk,
    draggingBlock,
    scanRows,
    onBlockDown,
    onBlockMove,
    onBlockUp,
    onBlockCancel,
  } = useBlockDrag({
    running,
    present,
    readOnly,
    isA2DirectionDebug,
    isA3EventDebug,
    isA4ParameterBuild,
    isA4ParameterDebug,
    isA5RelayDebug,
    isA6OrderDebug,
    missionWrongRunObserved,
    selectedChar,
  });
  const {
    paletteBlock: palBlk,
    ifBodyTarget,
    setIfBodyTarget,
    onPaletteDown: onPalDown,
    onPaletteMove: onPalMove,
    onPaletteUp: onPalUp,
    onPaletteCancel: onPalCancel,
  } = usePaletteDrag({
    running,
    present,
    readOnly,
    scanRows,
    isA2DirectionDebug,
    isA3EventDebug,
    isA4ParameterBuild,
    isA4ParameterDebug,
    isA5RelayDebug,
    isA6OrderDebug,
    isA2PersonalShip,
    isA4PersonalShip,
    isA5PersonalShip,
    storyMission,
    missionScript,
  });
  const { editing, editMax, onBlockTap, closeBlockEditor } = useBlockEditor({
    readOnly,
    blockDidDrag,
    selectedChar,
    pageCount: project.pages.length,
    storyMission,
    isA2PersonalShip,
    isA2DirectionDebug,
    isA3EventDebug,
    isA4ParameterBuild,
    isA4ParameterDebug,
    isA5RelayDebug,
    isA6OrderDebug,
    missionWrongRunObserved,
    missionTapObserved,
    setStoryCoachCue,
    openMission: () => setMissionOpen(true),
  });
  if (phase === 'loading') {
    return (
      <div className="bsx flex h-[60vh] items-center justify-center text-[18px] font-bold bsx-muted">
        Opening your blocks… 🧩
      </div>
    );
  }
  if (phase === 'error') {
    return (
      <div className="bsx flex h-[60vh] flex-col items-center justify-center gap-4">
        <div className="text-[18px] font-bold">That project couldn&apos;t open. 🌧️</div>
        {readOnly || embedded ? null : (
          <Link to="/learn/create/blocks" className="btn-pill-ghost">
            ← Back to Blocks
          </Link>
        )}
      </div>
    );
  }
  return (
    <div
      className={`bsx bsx-app${present ? ' present' : ''}${dragBlk || palBlk ? ' bsx-dragging' : ''}${isA2PersonalShip || isA4PersonalShip || isA5PersonalShip || isA6Finale ? ' has-home-picker' : ''}`}
      data-theme={theme}
      data-story={storyMission ? 'true' : undefined}
      data-story-target-fixed={missionTargetFixed ? 'true' : 'false'}
      data-testid="blocks-studio"
    >
      <BlocksStudioToolbar
        readOnly={readOnly}
        embedded={embedded}
        demoExitHref={demo?.exitHref}
        homeHref={homeHref}
        canUndo={canUndo}
        canRedo={canRedo}
        undo={undo}
        redo={redo}
        project={project}
        currentPageIndex={project.pages.indexOf(page)}
        saveStatus={saveStatus}
        hasStoryMission={Boolean(storyMission)}
        openStoryMission={() => setMissionOpen(true)}
        muted={muted}
        toggleMute={toggleMute}
        projectId={projectId}
        theme={theme}
        prepMode={prepMode}
        moreBtnRef={moreBtnRef}
        moreMenuOpen={moreAnchor !== null}
        toggleMoreMenu={() => {
          sfx.tap();
          const r = moreBtnRef.current?.getBoundingClientRect();
          setMoreAnchor((a) =>
            a ? null : r ? { right: window.innerWidth - r.right, top: r.bottom + 6 } : null,
          );
        }}
        go={go}
        running={running}
      />
      <TinyStarPersonalizationPanel
        isA2PersonalShip={isA2PersonalShip}
        isA3PersonalShip={isA3PersonalShip}
        isA4PersonalShip={isA4PersonalShip}
        isA5PersonalShip={isA5PersonalShip}
        isA6Finale={isA6Finale}
        selectedHomeGx={selectedHomeGx}
        selectedDeliveryDistance={selectedDeliveryDistance}
        selectedChar={selectedChar}
        deliveryCart={deliveryCart}
        duetFirst={duetFirst}
        duetSecond={duetSecond}
        finaleRinger={finaleRinger}
      />
      {storyMission && missionOpen && (
        <StoryMissionGuide
          mission={storyMission}
          hasRun={missionHasRun}
          completed={missionCompleted}
          answerId={missionAnswer}
          onAnswer={answerStoryMission}
          onApplyFix={applyMissionFix}
          onClose={() => setMissionOpen(false)}
          journeyLabel={
            journeyPosition
              ? `Chapter ${journeyPosition.chapter.number} · Scene ${journeyPosition.sceneNumber} of ${journeyPosition.sceneCount}`
              : undefined
          }
          nextJourneyLabel={
            journeyPosition && nextJourneyPosition
              ? storyJourneyActionLabel(journeyPosition, nextJourneyPosition)
              : undefined
          }
          nextBusy={nextMissionBusy}
          nextError={nextMissionError}
          onNext={
            nextJourneyPosition && !readOnly && !demo && !seasonSceneLocked
              ? startNextStoryMission
              : undefined
          }
          onBackToCollection={() => navigate('/learn/create/blocks')}
        />
      )}
      <BlocksStageWorkspace
        page={page}
        project={project}
        selectedChar={selectedChar}
        readOnly={readOnly}
        openFriendPicker={openFriendPicker}
        stageRef={stageRef}
        completionScene={completionScene}
        stageVisualScene={stageVisualScene}
        lockedStageTargetGx={lockedStageTargetGx}
        openScenePicker={() => setScenePick((value) => !value)}
        storyMission={storyMission}
        missionOpen={missionOpen}
        visibleCoachCue={visibleCoachCue}
        running={running}
        go={go}
        runStates={runStates}
        says={says}
        bellSwinging={bellSwinging}
        dragging={dragging}
        onSpriteDown={onSpriteDown}
        onSpriteMove={onSpriteMove}
        onSpriteUp={onSpriteUp}
        missionCompleted={missionCompleted}
        isA6Finale={isA6Finale}
        characterPerformances={characterPerformances}
      />
      <BlocksCodingBand
        readOnly={readOnly}
        category={category}
        setCategory={setCategory}
        paletteBlock={palBlk}
        selectedChar={selectedChar}
        onPaletteDown={onPalDown}
        onPaletteMove={onPalMove}
        onPaletteUp={onPalUp}
        onPaletteCancel={onPalCancel}
        dragBlock={dragBlk}
        ifBodyTarget={ifBodyTarget}
        setIfBodyTarget={setIfBodyTarget}
        activeKeys={activeKeys}
        onBlockDown={onBlockDown}
        onBlockMove={onBlockMove}
        onBlockUp={onBlockUp}
        onBlockCancel={onBlockCancel}
        onBlockTap={onBlockTap}
        storyMission={storyMission}
        isA2DirectionDebug={isA2DirectionDebug}
        missionWrongRunObserved={missionWrongRunObserved}
        binRef={binRef}
        binArmed={binArmed}
      />
      <CharacterPickerDialog
        open={pickFriend}
        theme={theme}
        charTab={charTab}
        setCharTab={setCharTab}
        close={() => setFriendPos(null)}
      />
      <ScenePickerDialog
        open={scenePick}
        theme={theme}
        background={page.background}
        close={() => setScenePick(false)}
      />
      <BlockEditorPopover
        editing={editing}
        theme={theme}
        isA3EventDebug={isA3EventDebug}
        isA2DirectionDebug={isA2DirectionDebug}
        characters={page.characters}
        selectedChar={selectedChar}
        missionSayChoices={missionSayChoices}
        pageCount={project.pages.length}
        editMax={editMax}
        close={closeBlockEditor}
        setStoryCoachCue={setStoryCoachCue}
      />
      <StudioMoreMenu
        anchor={moreAnchor}
        theme={theme}
        toggleTheme={toggleTheme}
        close={() => setMoreAnchor(null)}
        openReset={() => setConfirmReset(true)}
        present={present}
        togglePresent={() => setPresent((p) => !p)}
      />
      <ResetStudioDialog
        open={confirmReset}
        theme={theme}
        close={() => setConfirmReset(false)}
        reset={reset}
      />
      <BlockDragOverlay
        theme={theme}
        dragBlock={dragBlk}
        draggingBlock={draggingBlock}
        paletteBlock={palBlk}
      />
    </div>
  );
}
