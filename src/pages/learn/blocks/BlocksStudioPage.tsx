// Blocks Studio — `/learn/blocks/:projectId` (learn-blocks-studio-prd.md §4).
//
// The junior block-coding editor: stage + character rail + pages rail + the
// six-category coding band. Tap a palette block to snap it onto the program;
// tap a chained block to pluck it off; tap a number tile to change it; drag a
// character on the stage to set its start spot; Go runs every 🚩 script;
// Present hides the editing chrome. The program persists as
// `project.blocks.json` in the project VFS (debounced autosave, server wins
// on conflict) — same versioned persistence as the sibling studios.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Expand,
  Image as ImageIcon,
  MoreHorizontal,
  Moon,
  Redo2,
  RotateCcw,
  Sun,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';

import {
  createBlocksProject,
  loadBlocksProject,
  saveBlocksProject,
  type BlocksStoryProgress,
} from './blocksApi';
import {
  type BlockCategory,
  type BlockOp,
  BUILT_IN_NOTES,
  BUILT_IN_SOUNDS,
  BLOCK_DEFS,
  CATEGORIES,
  GRID_H,
  GRID_W,
  MAX_COLOR,
  MAX_NOTE,
  MAX_PAGES,
  MAX_PARAM,
  MAX_SPEED,
  MAX_SOUND,
  blockDef,
  defaultParam,
  isTrigger,
} from './blocksModel';
import { useDemoMode } from '@/pages/try/demoMode';
import { useBlocksStore } from './blocksStore';
import { useBlocksTheme } from './blocksTheme';
import { captureBlocksThumbnail } from './thumbnail';
import { saveThumbnail } from '../playground/projectPersistence';
import { useProjectBackTo } from '../projects/useProjectBackTo';
import { RaiseHandButton } from '../liveClass/RaiseHandButton';
import { useReportFocus } from '../liveClass/reportFocus';
import { BlocksRunner, startState, type SpriteState } from './interpreter';
import { BlockChip } from './BlockChip';
import { FadeScroller } from './FadeScroller';
import { CHARACTER_GROUPS, SCENES, sceneId } from './library';
import { sfx, isMuted, setMuted } from './sounds';
import { BlocksSharePanel } from './BlocksSharePanel';
import './blocks.css';
import { CharacterVisual } from './CharacterVisual';
import { performanceForBlock } from './characterPerformance';
import type { CharacterPerformance } from './characterPerformance';
import { storyMissionFor, type StoryCoachCue } from './curriculumGuides';
import { StoryCoachPanel } from './StoryCoachPanel';
import { StoryMissionGuide } from './StoryMissionGuide';
import {
  storyMissionProgramMatches,
  storyMissionScriptId,
  TINY_STAR_GREETING_CHOICES,
} from './storyMissionProgress';
import {
  nextStoryMissionForLesson,
  storyJourneyPositionForLesson,
  storyMissionProjectTitle,
} from './storyJourneyCatalog';

const SAVE_DEBOUNCE_MS = 800;

// ── block drag tuning (touch-first) ──────────────────────────────────────────
// On a tablet a finger that starts on a block must be free to SCROLL the list;
// only a deliberate HOLD lifts the block to drag. So: touch waits for a short
// long-press (and cancels if the finger moves first = a scroll); mouse starts
// on a tiny move threshold. While a drag is active we lock page scrolling with a
// non-passive touchmove listener (touch-action alone can't be flipped mid-touch).
const LONGPRESS_MS = 180;
const TOUCH_CANCEL_PX = 12; // finger travels this far before the hold fires → it's a scroll
const MOUSE_DRAG_PX = 6; // mouse moves this far → start dragging
const preventTouchMove = (e: TouchEvent) => {
  if (e.cancelable) e.preventDefault();
};
function lockTouchScroll() {
  document.addEventListener('touchmove', preventTouchMove, { passive: false });
}
function unlockTouchScroll() {
  document.removeEventListener('touchmove', preventTouchMove);
}

type SaveStatus = 'saved' | 'saving' | 'offline';

// Teacher read-only viewer (D-LV-6): edit controls are RENDERED-but-DISABLED, not
// hidden, so the read-only layout is byte-for-byte the kid's (no empty bands, no
// missing palette). Edit controls get this consistent inert + dimmed treatment;
// the CONTENT the teacher is viewing (stage, characters, script chain, page
// thumbnails) stays full-opacity. Mutation handlers are already store-gated.
const READONLY_EDIT_DISABLED = 'pointer-events-none cursor-default opacity-60';

// ── zone label chip (clarity pass) ───────────────────────────────────────────
// Kids 5–8 (many pre-readers) couldn't tell what each studio area was for, so
// every zone wears a tiny emoji-first name tag. Chips are decoration only:
// pointer-events:none, aria-hidden (the zones carry matching aria-labels), and
// blocks.css hides them in present mode / while a block drag is live.
function ZoneTag({ zone, emoji, label }: { zone: string; emoji: string; label: string }) {
  return (
    <span className={`bsx-zonetag zt-${zone}`} data-testid={`zone-${zone}`} aria-hidden>
      <span className="zt-ic">{emoji}</span>
      <span className="zt-txt">{label}</span>
    </span>
  );
}

export function BlocksStudioPage({
  projectId: projectIdProp,
  readOnly = false,
  embedded = false,
  prepMode = false,
}: { projectId?: string; readOnly?: boolean; embedded?: boolean; prepMode?: boolean } = {}) {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  // The public /try/blocks demo mounts this page directly (no route param) with
  // a fixed demo id; everywhere else the authed route param wins (unchanged).
  // The teacher live viewer (D-LV-6) mounts it with `projectId` + `readOnly` so a
  // teacher watches the kid's blocks editor with every edit affordance disabled.
  // `embedded` HOSTS the studio inside other chrome (e.g. the teacher prep-project
  // page): it hides the 🏠 home link — which routes into `/learn/*` and would bounce
  // a `user` principal — while keeping the editor fully editable. The host's own
  // chrome carries the only Back. Kid/readOnly behaviour is unchanged when false.
  const projectId = projectIdProp ?? routeProjectId;
  // Home/back returns to the class's "My work" if this is class work (§3.4).
  const homeHref = useProjectBackTo(projectId, '/learn/create/blocks');
  // Try-demo (try-demo-mode-prd D-DEMO-09): share is DEMOED, not hidden — the
  // real `BlocksSharePanel` rides an in-memory share adapter (the tour walks it).
  const demo = useDemoMode();
  const project = useBlocksStore((s) => s.project);
  // Live focus presence (D-LIVE-3): tell the teacher this is the kid's open
  // project. No-op in readOnly (teacher viewer) or outside a live class.
  useReportFocus(projectId, 'blocks', project.name, readOnly);
  const pageId = useBlocksStore((s) => s.pageId);
  const charId = useBlocksStore((s) => s.charId);
  const dirty = useBlocksStore((s) => s.dirty);
  const canUndo = useBlocksStore((s) => s.past.length > 0);
  const canRedo = useBlocksStore((s) => s.future.length > 0);

  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
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
  const [missionAnswer, setMissionAnswer] = useState<string | null>(null);
  const [missionFixApplied, setMissionFixApplied] = useState(false);
  const [missionCorrectRunFinished, setMissionCorrectRunFinished] = useState(false);
  const [missionFixPersisted, setMissionFixPersisted] = useState(false);
  const [missionCompleted, setMissionCompleted] = useState(false);
  const [nextMissionBusy, setNextMissionBusy] = useState(false);
  const [nextMissionError, setNextMissionError] = useState<string | null>(null);
  const [storyCoachCue, setStoryCoachCue] = useState<StoryCoachCue>('ready');
  // secondary toolbar actions collapse into a "⋯ More" menu so the bar stays
  // uncluttered (especially in portrait). Anchored below the button.
  const [moreAnchor, setMoreAnchor] = useState<{ right: number; top: number } | null>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  // Theme follows the system by default; the toolbar 🌙/☀️ overrides + persists.
  // Shared via a store so the Learn top bar flips with the studio (blocksTheme).
  const theme = useBlocksTheme((s) => s.theme);
  const toggleTheme = useBlocksTheme((s) => s.toggle);
  // The friend picker floats in a portal (the character rail clips overflow +
  // has a backdrop-filter, which would otherwise trap/cut off an absolute popup).
  const [friendPos, setFriendPos] = useState<{ left: number; top: number } | null>(null);
  const pickFriend = friendPos !== null;
  // live sprite states while/after a run (charId → state+duration); null = start poses
  const [runStates, setRunStates] = useState<Map<string, { st: SpriteState; dur: number }> | null>(
    null,
  );
  const [says, setSays] = useState<Map<string, string>>(new Map());
  // the block each character is executing right now → "lit" glow (charId → "scriptId:index")
  const [activeBlocks, setActiveBlocks] = useState<Map<string, string>>(new Map());
  const [characterPerformances, setCharacterPerformances] = useState<
    Map<string, CharacterPerformance>
  >(new Map());

  const versionRef = useRef(0);
  const otherFilesRef = useRef<Awaited<ReturnType<typeof loadBlocksProject>>['otherFiles']>([]);
  const storyProgressRef = useRef<BlocksStoryProgress>({ schemaVersion: 1, completed: {} });
  const completionSaveInFlightRef = useRef(false);
  const runnerRef = useRef<BlocksRunner | null>(null);
  // Autosave is serialized: only one save may be in flight. Overlapping saves
  // would share the same base `versionRef` (it only advances when a save
  // RETURNS), so the second would PUT a stale `expected_version`, 409, and the
  // conflict handler would reload the server's older snapshot — silently
  // reverting in-flight edits. `savingRef` is the mutex; `pendingRef` records
  // that edits landed mid-save so we re-save once with the fresh version.
  const savingRef = useRef(false);
  const pendingRef = useRef(false);

  const page = useMemo(
    () => project.pages.find((p) => p.id === pageId) ?? project.pages[0],
    [project, pageId],
  );
  const selectedChar = page.characters.find((c) => c.id === charId) ?? page.characters[0];
  const storyMission = useMemo(() => storyMissionFor(project.lessonId), [project.lessonId]);
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
  const isA2DirectionDebug = storyMission?.lessonId === 'tsv-s1-a2-d';
  const isA3EventDebug = storyMission?.lessonId === 'tsv-s1-a3-d';
  const isA2PersonalShip = storyMission?.lessonId === 'tsv-s1-a2-s';
  const isA3PersonalShip = storyMission?.lessonId === 'tsv-s1-a3-s';
  const isA4ParameterBuild = storyMission?.lessonId === 'tsv-s1-a4-b';
  const isA4ParameterDebug = storyMission?.lessonId === 'tsv-s1-a4-d';
  const selectedHomeGx = page.characters.find((character) => character.id === 'plaza-target')?.start
    .gx;
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
  const introducedMissionRef = useRef<string | null>(null);

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
    setMissionFixPersisted(missionTargetFixed);
    setMissionCompleted(previouslyCompleted);
    setNextMissionBusy(false);
    setNextMissionError(null);
    setStoryCoachCue(previouslyCompleted ? 'complete' : 'ready');
    setMissionOpen(true);
  }, [phase, projectId, storyMission, missionTargetFixed]);

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

  // Mirror the read-only flag into the store so EVERY mutation funnel (`_commit`,
  // undo, redo) is a hard no-op and `dirty` can never advance — the autosave
  // below therefore never fires for a teacher viewer (D-LV-6).
  //
  // This write is DELIBERATELY in render (not a layout/passive effect): the load
  // effect below can resolve and the autosave subscription can fire in the SAME
  // commit the component first mounts, so the flag MUST be set before that commit —
  // a useLayoutEffect runs only AFTER the commit, leaving an editable window where
  // a mutation/autosave could slip through. It is a guarded, idempotent write to an
  // EXTERNAL Zustand store (not a setState of THIS component), so it is not the
  // "update a component while rendering" anti-pattern React warns about.
  if (useBlocksStore.getState().readOnly !== readOnly) {
    useBlocksStore.getState().setReadOnly(readOnly);
  }
  useEffect(() => {
    useBlocksStore.getState().setReadOnly(readOnly);
    return () => {
      // Leaving the viewer must restore the editable default for the kid studio
      // (the store is a shared singleton).
      if (readOnly) useBlocksStore.getState().setReadOnly(false);
    };
  }, [readOnly]);

  // ── load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    let alive = true;
    loadBlocksProject(projectId)
      .then((loaded) => {
        if (!alive) return;
        versionRef.current = loaded.version;
        otherFilesRef.current = loaded.otherFiles;
        storyProgressRef.current = loaded.storyProgress ?? { schemaVersion: 1, completed: {} };
        const loadedMission = storyMissionFor(loaded.project.lessonId);
        const loadedMissionCompleted = Boolean(
          loadedMission &&
          storyProgressRef.current.completed[loadedMission.lessonId] &&
          storyMissionProgramMatches(loaded.project, loadedMission.lessonId),
        );
        useBlocksStore.getState().load(loaded.project);
        useBlocksStore.getState().setHistory(loaded.history.past, loaded.history.future);
        if (loadedMissionCompleted && loadedMission) {
          introducedMissionRef.current = projectId;
          setMissionHasRun(true);
          setMissionCorrectRunFinished(true);
          setMissionFixPersisted(true);
          setMissionCompleted(true);
          setStoryCoachCue('complete');
          setMissionOpen(true);
        }
        setPhase('ready');
        // refresh the cover thumbnail on open (device-local; even without an edit).
        // Never in the teacher viewer (D-LV-6): saveThumbnail is a kid-scoped write,
        // so a teacher would 403 — read-only means a teacher can never write.
        if (!readOnly) {
          try {
            const cover = loaded.project.pages[0];
            if (cover) void saveThumbnail(projectId, captureBlocksThumbnail(cover));
          } catch {
            // best-effort
          }
        }
      })
      .catch(() => alive && setPhase('error'));
    return () => {
      alive = false;
    };
  }, [projectId, readOnly]);

  // Immersive tablet mode (page-scroll lock + browser fullscreen) is owned by
  // LearnLayout, keyed on the route — so it survives this page's remounts and
  // can't flicker out/in. Going Home navigates to the (non-immersive) hub, which
  // restores normal browsing.

  // ── debounced autosave on any program change (server wins on conflict) ────
  // Never autosave in the teacher viewer (D-LV-6): the store gate keeps `dirty`
  // at 0 so this can't fire, but guard explicitly so a teacher can never write.
  useEffect(() => {
    if (readOnly || phase !== 'ready' || dirty === 0 || !projectId) return;
    setSaveStatus('saving');
    const t = setTimeout(() => {
      // Serialize: if a save is already running, just flag that there's more to
      // persist — the running save will pick it up before it finishes (below).
      if (savingRef.current) {
        pendingRef.current = true;
        return;
      }
      void (async () => {
        savingRef.current = true;
        try {
          // Loop so any edit that lands mid-save is saved with the version
          // returned by the previous round — never a stale base version.
          do {
            pendingRef.current = false;
            const st = useBlocksStore.getState();
            const result = await saveBlocksProject({
              projectId,
              project: st.project,
              version: versionRef.current,
              otherFiles: otherFilesRef.current,
              history: { past: st.past, future: st.future },
              storyProgress: storyProgressRef.current,
            });
            versionRef.current = result.version;
            if (result.status === 'kept-newest') {
              useBlocksStore.getState().load(result.project);
              storyProgressRef.current = result.storyProgress;
            }
          } while (pendingRef.current);
          setSaveStatus('saved');
          if (storyMission) {
            setMissionFixPersisted(
              storyMissionProgramMatches(useBlocksStore.getState().project, storyMission.lessonId),
            );
          }
          // refresh the Projects/My Works cover thumbnail (device-local)
          try {
            const cover = useBlocksStore.getState().project.pages[0];
            if (cover) void saveThumbnail(projectId, captureBlocksThumbnail(cover));
          } catch {
            // thumbnail is best-effort
          }
        } catch {
          setSaveStatus('offline');
        } finally {
          savingRef.current = false;
        }
      })();
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [dirty, phase, projectId, readOnly, storyMission]);

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
  }, [projectId, storyMission]);

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

  // ── undo / redo (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z or Ctrl+Y) ─────────────────
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

  // edits & page switches invalidate the live run view
  useEffect(() => {
    runnerRef.current?.stopAll();
    runnerRef.current = null;
    setRunStates(null);
    setSays(new Map());
    setActiveBlocks(new Map());
    setCharacterPerformances(new Map());
    setRunning(false);
    setStoryCoachCue('ready');
  }, [dirty, pageId]);

  // ── run ───────────────────────────────────────────────────────────────────
  const makeRunner = useCallback(() => {
    const runner = new BlocksRunner(page, {
      onSprite: (id, st, dur) =>
        setRunStates((prev) => {
          const next = new Map(prev ?? []);
          next.set(id, { st, dur });
          return next;
        }),
      onSay: (id, text) =>
        setSays((prev) => {
          const next = new Map(prev);
          if (text === null) next.delete(id);
          else next.set(id, text);
          return next;
        }),
      onNote: sfx.playNote,
      onSound: sfx.playSound,
      onGotoPage: (idx) => {
        const target = useBlocksStore.getState().project.pages[idx];
        if (target) useBlocksStore.getState().selectPage(target.id);
      },
      // key the live highlight by SCRIPT, not character — a character can run
      // several tracks at once, and each track's current block must glow
      // simultaneously (ScratchJr highlights the running block in every thread).
      onStep: (stepCharId, scriptId, index) => {
        const script = page.characters
          .flatMap((character) => character.scripts)
          .find((candidate) => candidate.id === scriptId);
        const op = index >= 0 ? script?.blocks[index]?.op : undefined;
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
  }, [page, storyMission]);

  // fast lookup for the "lit" glow: the set of "scriptId:index" running now
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
        const targetGx = page.characters.find((character) => character.id === 'plaza-target')?.start
          .gx;
        const reachedMissionTarget =
          (!requiresPlazaArrival || runner.state('tuan-tuan')?.gx === targetGx) &&
          (!(isA4ParameterBuild || isA4ParameterDebug) || runner.state('breakfast-cart')?.gx === 7);
        const observedWrongDirection =
          storyMission.lessonId === 'tsv-s1-a2-d' && runner.state('tuan-tuan')?.gx === 5;
        const observedOvershoot = isA4ParameterDebug && runner.state('breakfast-cart')?.gx === 8;
        setMissionHasRun(true);
        if (observedWrongDirection) setMissionWrongRunObserved(true);
        if (observedOvershoot) setMissionWrongRunObserved(true);
        if (storyMission.mode === 'observe-only') {
          const completedDistanceHook =
            storyMission.lessonId === 'tsv-s1-a4-h' &&
            missionAnswer === 'three' &&
            runner.state('breakfast-cart')?.gx === 5;
          if (completedDistanceHook) {
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
          (!(isA2DirectionDebug || isA4ParameterDebug) || missionWrongRunObserved) &&
          (!isA4ParameterDebug || answeredCorrectly)
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
    missionWrongRunObserved,
    missionAnswer,
    answeredCorrectly,
    page.characters,
  ]);

  const answerStoryMission = useCallback(
    (choiceId: string) => {
      setMissionAnswer(choiceId);
      if (storyMission?.mode !== 'observe-only' || !missionHasRun || !missionTargetFixed) return;
      if (storyMission.lessonId === 'tsv-s1-a3-h' && !missionTapObserved) return;
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
    [missionHasRun, missionTapObserved, missionTargetFixed, storyMission],
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

  // try-demo seam: the tour's Next can press the REAL Go for the user
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

  // close the "⋯ More" menu on outside-click / Escape
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
        if (id !== 'dot-dot') return;
        const targetFixedNow = storyMission
          ? storyMissionProgramMatches(useBlocksStore.getState().project, storyMission.lessonId)
          : false;
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

  // ── character picker: a centered modal sheet (big library, kid-friendly) ──
  const openFriendPicker = useCallback(() => {
    sfx.tap();
    setFriendPos({ left: 0, top: 0 });
  }, []);

  const stageRef = useRef<HTMLDivElement>(null);

  // ── character (object) drag on the stage: reposition only (remove is the ✕
  //    button, like pages). One undo step per drag via the store's coalescing. ─
  const [dragging, setDragging] = useState<string | null>(null);
  const dragMoved = useRef(false);
  const onSpriteDown = (e: React.PointerEvent, id: string) => {
    if (running || present || readOnly) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(id);
    dragMoved.current = false;
    useBlocksStore.getState().selectChar(id);
  };
  const onSpriteMove = (e: React.PointerEvent, id: string) => {
    if (dragging !== id || !stageRef.current) return;
    if (!dragMoved.current) sfx.pickup();
    dragMoved.current = true;
    const rect = stageRef.current.getBoundingClientRect();
    const gx = ((e.clientX - rect.left) / rect.width) * GRID_W - 0.5;
    const gy = ((e.clientY - rect.top) / rect.height) * GRID_H - 0.5;
    useBlocksStore.getState().moveCharacter(id, gx, gy);
  };
  const onSpriteUp = (id: string) => {
    const wasDrag = dragMoved.current;
    setDragging(null);
    useBlocksStore.getState().endCoalesce(); // this drag = one undo step
    if (!wasDrag) tapSprite(id); // a clean tap runs the 👆 scripts
  };

  // shared: the script row + insertion slot under a point. Scans EVERY track so
  // a block can be dropped into a different track (cross-track move) and the
  // palette can insert anywhere. `exclude` skips the block being dragged while
  // it's still sitting in its own row.
  const scanRows = (
    x: number,
    y: number,
    exclude?: { scriptId: string; index: number },
  ): { scriptId: string; slot: number; dropX: number } | null => {
    const rows = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-testid^="script-"]:not([data-testid="script-area"])',
      ),
    ];
    for (const row of rows) {
      const rr = row.getBoundingClientRect();
      const pad = 18;
      if (x < rr.left - pad || x > rr.right + pad || y < rr.top - pad || y > rr.bottom + pad)
        continue;
      const scriptId = row.getAttribute('data-testid')!.slice('script-'.length);
      const items = [...row.querySelectorAll<HTMLElement>('.bsx-block')];
      let slot = items.length;
      let dropX = items.length
        ? items[items.length - 1].getBoundingClientRect().right - rr.left + 2
        : 0;
      for (let i = 1; i < items.length; i += 1) {
        if (exclude && exclude.scriptId === scriptId && i === exclude.index) continue;
        const r = items[i].getBoundingClientRect();
        if (x < r.left + r.width / 2) {
          slot = i;
          dropX = r.left - rr.left - 2;
          break;
        }
      }
      return { scriptId, slot: Math.max(1, slot), dropX };
    }
    return null;
  };

  // ── reorder/move an existing block: HOLD-to-lift, drag across tracks, or drop
  //    on the BIN to remove. (Mouse starts on a tiny move; touch needs a short
  //    hold so a quick swipe still scrolls the program list.) ────────────────
  const binRef = useRef<HTMLDivElement>(null);
  const [binArmed, setBinArmed] = useState(false);
  const overBin = (x: number, y: number) => {
    const r = binRef.current?.getBoundingClientRect();
    if (!r) return false;
    const pad = 16;
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  };
  const blockDrag = useRef<{
    scriptId: string;
    index: number;
    x0: number;
    y0: number;
    lastX: number;
    lastY: number;
    pointerId: number;
    touch: boolean;
    el: HTMLElement;
  } | null>(null);
  const blockLP = useRef<number | undefined>(undefined);
  const blockDidDrag = useRef(false);
  const [dragBlk, setDragBlk] = useState<{
    scriptId: string;
    index: number;
    cx: number;
    cy: number;
    onBin: boolean;
    targetScriptId: string | null;
    targetSlot: number | null;
    dropX: number | null;
  } | null>(null);

  const blockDragUpdate = (x: number, y: number) => {
    const d = blockDrag.current;
    if (!d) return;
    const onBin = overBin(x, y);
    setBinArmed(onBin);
    let targetScriptId: string | null = null;
    let targetSlot: number | null = null;
    let dropX: number | null = null;
    if (!onBin && d.index > 0) {
      const hit = scanRows(x, y, { scriptId: d.scriptId, index: d.index });
      if (hit) {
        targetScriptId = hit.scriptId;
        targetSlot = hit.slot;
        dropX = hit.dropX;
      }
    }
    setDragBlk({
      scriptId: d.scriptId,
      index: d.index,
      cx: x,
      cy: y,
      onBin,
      targetScriptId,
      targetSlot,
      dropX,
    });
  };
  const onBlockDown = (e: React.PointerEvent, scriptId: string, index: number) => {
    if (running || present || readOnly || isA2DirectionDebug || isA3EventDebug || isA4ParameterBuild || isA4ParameterDebug) return;
    const touch = e.pointerType === 'touch';
    const el = e.currentTarget as HTMLElement;
    const { pointerId, clientX: x0, clientY: y0 } = e;
    blockDrag.current = { scriptId, index, x0, y0, lastX: x0, lastY: y0, pointerId, touch, el };
    blockDidDrag.current = false;
    window.clearTimeout(blockLP.current);
    if (touch) {
      blockLP.current = window.setTimeout(() => {
        const d = blockDrag.current;
        if (!d || blockDidDrag.current) return;
        blockDidDrag.current = true;
        sfx.pickup();
        try {
          d.el.setPointerCapture(d.pointerId);
        } catch {
          /* ignore */
        }
        lockTouchScroll();
        navigator.vibrate?.(8);
        blockDragUpdate(d.lastX, d.lastY);
      }, LONGPRESS_MS);
    }
  };
  const onBlockMove = (e: React.PointerEvent) => {
    const d = blockDrag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    if (!blockDidDrag.current) {
      const moved = Math.hypot(e.clientX - d.x0, e.clientY - d.y0);
      if (d.touch) {
        if (moved > TOUCH_CANCEL_PX) {
          window.clearTimeout(blockLP.current);
          blockDrag.current = null; // they're scrolling, not dragging
        }
        return;
      }
      if (moved <= MOUSE_DRAG_PX) return;
      blockDidDrag.current = true;
      sfx.pickup();
      try {
        d.el.setPointerCapture(d.pointerId);
      } catch {
        /* ignore */
      }
    }
    blockDragUpdate(e.clientX, e.clientY);
  };
  const endBlockDrag = (commit: boolean) => {
    window.clearTimeout(blockLP.current);
    unlockTouchScroll();
    const info = dragBlk;
    const d = blockDrag.current;
    blockDrag.current = null;
    setDragBlk(null);
    setBinArmed(false);
    if (commit && blockDidDrag.current && info && d) {
      if (info.onBin) {
        sfx.trash();
        useBlocksStore.getState().removeBlock(d.scriptId, d.index);
      } else if (
        info.targetScriptId &&
        (info.targetScriptId !== d.scriptId || info.targetSlot !== d.index)
      ) {
        sfx.snap();
        useBlocksStore
          .getState()
          .moveBlockAcross(d.scriptId, d.index, info.targetScriptId, info.targetSlot ?? 1);
      }
    }
    setTimeout(() => (blockDidDrag.current = false), 0);
  };
  const onBlockUp = () => endBlockDrag(true);
  const onBlockCancel = () => endBlockDrag(false);

  // ── palette block: TAP appends, HOLD-and-drag drops it at any slot (across any
  //    track). Same hold-to-lift + scroll-lock so the palette stays scrollable. ─
  const palDrag = useRef<{
    op: BlockOp;
    n?: number;
    x0: number;
    y0: number;
    lastX: number;
    lastY: number;
    pointerId: number;
    touch: boolean;
    el: HTMLElement;
  } | null>(null);
  const palLP = useRef<number | undefined>(undefined);
  const palDidDrag = useRef(false);
  const [palBlk, setPalBlk] = useState<{
    op: BlockOp;
    n?: number;
    cx: number;
    cy: number;
    scriptId: string | null;
    slot: number;
    dropX: number | null;
  } | null>(null);
  const [ifBodyTarget, setIfBodyTarget] = useState<{
    scriptId: string;
    index: number;
  } | null>(null);

  const palDragUpdate = (x: number, y: number) => {
    const d = palDrag.current;
    if (!d) return;
    const hit = isTrigger(d.op) ? null : scanRows(x, y);
    setPalBlk({
      op: d.op,
      n: d.n,
      cx: x,
      cy: y,
      scriptId: hit?.scriptId ?? null,
      slot: hit?.slot ?? 0,
      dropX: hit?.dropX ?? null,
    });
  };
  const onPalDown = (e: React.PointerEvent, op: BlockOp, n?: number) => {
    if (running || present || readOnly) return;
    const touch = e.pointerType === 'touch';
    const el = e.currentTarget as HTMLElement;
    const { pointerId, clientX: x0, clientY: y0 } = e;
    palDrag.current = { op, n, x0, y0, lastX: x0, lastY: y0, pointerId, touch, el };
    palDidDrag.current = false;
    window.clearTimeout(palLP.current);
    if (touch) {
      palLP.current = window.setTimeout(() => {
        const d = palDrag.current;
        if (!d || palDidDrag.current) return;
        palDidDrag.current = true;
        sfx.pickup();
        try {
          d.el.setPointerCapture(d.pointerId);
        } catch {
          /* ignore */
        }
        lockTouchScroll();
        navigator.vibrate?.(8);
        palDragUpdate(d.lastX, d.lastY);
      }, LONGPRESS_MS);
    }
  };
  const onPalMove = (e: React.PointerEvent) => {
    const d = palDrag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    if (!palDidDrag.current) {
      const moved = Math.hypot(e.clientX - d.x0, e.clientY - d.y0);
      if (d.touch) {
        if (moved > TOUCH_CANCEL_PX) {
          window.clearTimeout(palLP.current);
          palDrag.current = null;
        }
        return;
      }
      if (moved <= MOUSE_DRAG_PX) return;
      palDidDrag.current = true;
      sfx.pickup();
      try {
        d.el.setPointerCapture(d.pointerId);
      } catch {
        /* ignore */
      }
    }
    palDragUpdate(e.clientX, e.clientY);
  };
  const addPaletteBlock = (
    store: ReturnType<typeof useBlocksStore.getState>,
    op: BlockOp,
    n: number | undefined,
    drop?: { scriptId: string; slot: number },
  ) => {
    if (isA2DirectionDebug || isA3EventDebug || isA4ParameterBuild || isA4ParameterDebug) return;
    if (ifBodyTarget && !isTrigger(op)) {
      store.addIfBodyBlock(ifBodyTarget.scriptId, ifBodyTarget.index, op, n);
      setIfBodyTarget(null);
      return;
    }
    const isA2Direction =
      (storyMission?.lessonId === 'tsv-s1-a2-b' || isA2PersonalShip) &&
      (op === 'move_left' || op === 'move_right');
    if (isA2Direction && missionScript) {
      const endIndex = missionScript.blocks.findIndex((block) => block.op === 'end');
      store.insertBlock(
        op,
        missionScript.id,
        endIndex >= 1 ? endIndex : missionScript.blocks.length,
        isA2PersonalShip ? 1 : 3,
      );
      return;
    }
    if (drop) {
      store.insertBlock(op, drop.scriptId, drop.slot, n);
      return;
    }
    store.addBlock(op, n);
  };
  const endPalDrag = (op: BlockOp, n: number | undefined, commit: boolean) => {
    window.clearTimeout(palLP.current);
    unlockTouchScroll();
    const info = palBlk;
    const d = palDrag.current;
    palDrag.current = null;
    setPalBlk(null);
    const store = useBlocksStore.getState();
    if (commit) {
      if (palDidDrag.current) {
        if (info && info.scriptId) {
          sfx.snap();
          addPaletteBlock(store, d?.op ?? op, d?.n ?? n, {
            scriptId: info.scriptId,
            slot: info.slot,
          });
        } else {
          sfx.place();
          addPaletteBlock(store, d?.op ?? op, d?.n ?? n);
        }
      } else {
        // a clean tap → add to the bottom of the latest script
        sfx.place();
        addPaletteBlock(store, op, n);
      }
    }
    setTimeout(() => (palDidDrag.current = false), 0);
  };
  const onPalUp = (op: BlockOp, n?: number) => endPalDrag(op, n, true);
  const onPalCancel = (op: BlockOp, n?: number) => endPalDrag(op, n, false);

  // ── tap a whole block to EDIT it (number stepper / Say text) ─────────────
  const [editBlk, setEditBlk] = useState<{
    scriptId: string;
    index: number;
    left: number;
    top: number;
  } | null>(null);
  const onBlockTap = (e: React.MouseEvent, scriptId: string, index: number, op: string) => {
    if (readOnly) return; // teacher viewer — blocks aren't editable (D-LV-6)
    if (blockDidDrag.current) return; // it was a drag, not a tap
    if ((isA4ParameterBuild || isA4ParameterDebug) && op !== 'move_right') return;
    if (isA4ParameterDebug && !missionWrongRunObserved) {
      setStoryCoachCue('retry');
      setMissionOpen(true);
      return;
    }
    if (
      (storyMission?.lessonId === 'tsv-s1-a2-b' || isA2PersonalShip) &&
      (op === 'move_left' || op === 'move_right')
    ) {
      return; // Age A direction mission fixes the distance at three steps.
    }
    if (isA2DirectionDebug && (op === 'move_left' || op === 'move_right')) {
      if (!missionWrongRunObserved) {
        setStoryCoachCue('retry');
        setMissionOpen(true);
        return;
      }
      sfx.tap();
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const W = 230;
      const left = Math.min(Math.max(8, r.left + r.width / 2 - W / 2), window.innerWidth - W - 8);
      setEditBlk({ scriptId, index, left, top: Math.max(70, r.top - 132) });
      return;
    }
    if (isA3EventDebug && (op === 'when_flag' || op === 'when_tap')) {
      if (!missionTapObserved) {
        setStoryCoachCue('retry');
        setMissionOpen(true);
        return;
      }
      sfx.tap();
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const W = 230;
      const left = Math.min(Math.max(8, r.left + r.width / 2 - W / 2), window.innerWidth - W - 8);
      setEditBlk({ scriptId, index, left, top: Math.max(70, r.top - 132) });
      return;
    }
    if (isA2DirectionDebug || isA3EventDebug) return;
    const def = blockDef(op as BlockOp);
    // speed / message-colour blocks cycle their value on tap (no number editor)
    if (def.param === 'speed') {
      sfx.numUp();
      useBlocksStore.getState().cycleParam(scriptId, index, MAX_SPEED);
      return;
    }
    if (def.param === 'color') {
      sfx.tap();
      useBlocksStore.getState().cycleParam(scriptId, index, MAX_COLOR);
      return;
    }
    if (
      !def.hasN &&
      def.param !== 'note' &&
      def.param !== 'sound' &&
      op !== 'say' &&
      op !== 'if_touching'
    ) return; // nothing to edit on this block
    sfx.tap();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const W = 230;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - W / 2), window.innerWidth - W - 8);
    setEditBlk({ scriptId, index, left, top: Math.max(70, r.top - 132) });
  };
  useEffect(() => {
    if (!editBlk) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('[data-testid="block-editor"]')) setEditBlk(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setEditBlk(null);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
      // closing the editor ends the coalescing session → next edit is its own step
      useBlocksStore.getState().endCoalesce();
    };
  }, [editBlk]);
  // keep the editor anchored to a live block; close if the script/block vanished
  const editing = (() => {
    if (!editBlk) return null;
    const script = selectedChar?.scripts.find((s) => s.id === editBlk.scriptId);
    const blk = script?.blocks[editBlk.index];
    return blk ? { ...editBlk, block: blk } : null;
  })();
  // the Page block targets an existing page only, so its stepper caps at the page
  // count; every other number tile uses the generic 1..MAX_PARAM range.
  const editMax = editing?.block.op === 'goto_page' ? project.pages.length : MAX_PARAM;
  // the block under the pointer while dragging — rendered as a fixed clone
  const draggingBlock = (() => {
    if (!dragBlk) return null;
    const script = selectedChar?.scripts.find((s) => s.id === dragBlk.scriptId);
    const blk = script?.blocks[dragBlk.index];
    return blk ? { block: blk } : null;
  })();

  // never leave the page-scroll lock on if we unmount mid-drag
  useEffect(() => () => unlockTouchScroll(), []);

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

  const paletteBlocks = BLOCK_DEFS.filter((d) => d.category === category && !d.legacy);
  const paletteChoices: Array<{
    def: (typeof paletteBlocks)[number];
    n?: number;
    key: string;
  }> = [];
  paletteBlocks.forEach((def) => {
    if (def.param === 'note') {
      BUILT_IN_NOTES.forEach((note) => {
        paletteChoices.push({ def, n: note.id, key: `${def.op}-${note.id}` });
      });
      return;
    }
    if (def.param === 'sound') {
      BUILT_IN_SOUNDS.forEach((sound) => {
        paletteChoices.push({ def, n: sound.id, key: `${def.op}-${sound.id}` });
      });
      return;
    }
    paletteChoices.push({ def, n: defaultParam(def.op), key: def.op });
  });
  const activeCat = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0];

  return (
    <div
      className={`bsx bsx-app${present ? ' present' : ''}${dragBlk || palBlk ? ' bsx-dragging' : ''}${isA2PersonalShip ? ' has-home-picker' : ''}`}
      data-theme={theme}
      data-story={storyMission ? 'true' : undefined}
      data-story-target-fixed={missionTargetFixed ? 'true' : 'false'}
      data-testid="blocks-studio"
    >
      {/* ── toolbar ── */}
      <header className="bsx-card flex items-center gap-2 rounded-3xl px-3 py-2">
        {/* Home/back is the kid's own navigation — hidden in the teacher live viewer
            (D-LV-6) AND when `embedded` in a host that carries its own Back (e.g. the
            teacher prep-project page, which must not route a `user` into `/learn/*`).
            Try-demo: Home exits to the marketing "Try it" page, not the authed hub. */}
        {readOnly || embedded ? null : demo?.exitHref ? (
          <a
            href={demo.exitHref}
            data-testid="demo-home"
            className="bsx-press grid h-11 w-11 place-items-center text-[20px]"
            title="Back to Try it"
          >
            🏠
          </a>
        ) : (
          <Link
            to={homeHref}
            className="bsx-press grid h-11 w-11 place-items-center text-[20px]"
            title="Save & back"
          >
            🏠
          </Link>
        )}
        {/* Undo/redo are kid-only edit affordances — rendered but inert + dimmed in
            the teacher viewer so the read-only layout matches the kid's (D-LV-6). */}
        <button
          type="button"
          data-testid="undo"
          className={`bsx-press grid h-11 w-11 place-items-center disabled:opacity-40${readOnly ? ` ${READONLY_EDIT_DISABLED}` : ''}`}
          onClick={undo}
          disabled={readOnly || !canUndo}
          aria-disabled={readOnly || undefined}
          title="Undo (⌘Z)"
        >
          <Undo2 size={20} />
        </button>
        <button
          type="button"
          data-testid="redo"
          className={`bsx-press grid h-11 w-11 place-items-center disabled:opacity-40${readOnly ? ` ${READONLY_EDIT_DISABLED}` : ''}`}
          onClick={redo}
          disabled={readOnly || !canRedo}
          aria-disabled={readOnly || undefined}
          title="Redo (⌘⇧Z)"
        >
          <Redo2 size={20} />
        </button>
        <div className="min-w-0 px-1">
          <div className="truncate text-[15px] font-extrabold leading-tight">{project.name}</div>
          <div
            className="bsx-muted truncate text-[11px] font-semibold"
            data-testid="save-status"
            data-status={saveStatus}
          >
            Page {project.pages.indexOf(page) + 1} of {project.pages.length} ·{' '}
            {saveStatus === 'saved'
              ? '✓ saved'
              : saveStatus === 'saving'
                ? 'saving…'
                : 'saved on this device'}
          </div>
        </div>
        <div className="flex-1" />
        {storyMission && (
          <button
            type="button"
            className="bsx-mission-launcher"
            data-testid="story-mission-launcher"
            onClick={() => setMissionOpen(true)}
            title="Open the story and mission"
          >
            📖 <span>Story mission</span>
          </button>
        )}
        <button
          type="button"
          className={`bsx-press grid h-11 w-11 place-items-center${muted ? ' bsx-muted-on' : ''}`}
          onClick={toggleMute}
          data-testid="mute-toggle"
          aria-pressed={muted}
          title={muted ? 'Sounds are OFF — tap to turn on' : 'Sounds are ON — tap to mute'}
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        {projectId && (
          <BlocksSharePanel
            projectId={projectId}
            theme={theme}
            readOnly={readOnly}
            prepMode={prepMode}
          />
        )}
        <RaiseHandButton readOnly={readOnly} />
        <button
          ref={moreBtnRef}
          type="button"
          className="bsx-press grid h-11 w-11 place-items-center"
          data-testid="more-menu-btn"
          aria-haspopup="menu"
          aria-expanded={moreAnchor !== null}
          title="More"
          onClick={() => {
            sfx.tap();
            const r = moreBtnRef.current?.getBoundingClientRect();
            setMoreAnchor((a) =>
              a ? null : r ? { right: window.innerWidth - r.right, top: r.bottom + 6 } : null,
            );
          }}
        >
          <MoreHorizontal size={20} />
        </button>
        <button
          type="button"
          data-testid="go-button"
          onClick={go}
          disabled={running}
          className="inline-flex h-11 items-center whitespace-nowrap rounded-full bg-brand-mint px-6 text-[16px] font-extrabold text-white shadow-brand-mint transition hover:-translate-y-0.5 disabled:opacity-60"
          title="Run every 🚩 start"
        >
          ▶ Go!
        </button>
      </header>

      {isA2PersonalShip && (
        <div className="bsx-home-picker" data-testid="a2-s-endpoint-picker">
          <div className="bsx-home-picker-title">
            <span aria-hidden>⭐</span>
            <div>
              <strong>Choose my home star</strong>
              <small>Pick where Tuan Tuan should land</small>
            </div>
          </div>
          <div className="bsx-home-choices" role="group" aria-label="Choose my home star">
            <button
              type="button"
              data-testid="a2-s-endpoint-left"
              className={`bsx-home-choice${selectedHomeGx === 6 ? ' selected' : ''}`}
              aria-pressed={selectedHomeGx === 6}
              onClick={() => useBlocksStore.getState().moveCharacter('plaza-target', 6, 10)}
            >
              <span aria-hidden>⬅️</span>
              <strong>Left home</strong>
              <span className="bsx-home-star" aria-hidden>
                ⭐
              </span>
            </button>
            <button
              type="button"
              data-testid="a2-s-endpoint-right"
              className={`bsx-home-choice${selectedHomeGx === 10 ? ' selected' : ''}`}
              aria-pressed={selectedHomeGx === 10}
              onClick={() => useBlocksStore.getState().moveCharacter('plaza-target', 10, 10)}
            >
              <span className="bsx-home-star" aria-hidden>
                ⭐
              </span>
              <strong>Right home</strong>
              <span aria-hidden>➡️</span>
            </button>
          </div>
        </div>
      )}

      {isA3PersonalShip && (
        <div className="bsx-home-picker" data-testid="a3-s-character-picker">
          <div className="bsx-home-picker-title"><span aria-hidden>✨</span><div><strong>Choose my secret friend</strong><small>This changes the saved character, not the blocks</small></div></div>
          <div className="bsx-home-choices" role="group" aria-label="Choose my secret friend">
            {[
              ['Dot Dot', '🐱', '/story-blocks/tiny-star-village/characters/dot-dot/resting.svg'],
              ['Tuan Tuan', '🐻', '/story-blocks/tiny-star-village/characters/cloud-bear/resting.svg'],
              ['Lumilo', '⭐', '/story-blocks/tiny-star-village/characters/little-light/resting.svg'],
            ].map(([name, emoji, asset]) => (
              <button key={name} type="button" data-testid={`a3-s-character-${name.toLowerCase().replaceAll(' ', '-')}`}
                className={`bsx-home-choice${selectedChar.asset === asset ? ' selected' : ''}`}
                aria-pressed={selectedChar.asset === asset}
                onClick={() => useBlocksStore.getState().setCharacterIdentity('dot-dot', name, emoji, asset)}>
                <img src={asset} alt="" className="bsx-character-asset-thumb" /><strong>{name}</strong>
              </button>
            ))}
          </div>
        </div>
      )}

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
            nextJourneyPosition
              ? `Chapter ${nextJourneyPosition.chapter.number} · ${nextJourneyPosition.mission.title}`
              : undefined
          }
          nextBusy={nextMissionBusy}
          nextError={nextMissionError}
          onNext={nextJourneyPosition && !readOnly && !demo ? startNextStoryMission : undefined}
          onBackToCollection={() => navigate('/learn/create/blocks')}
        />
      )}

      {/* ── middle: characters · stage · pages ── */}
      <section className="bsx-middle">
        <aside className="bsx-railbox" style={{ gridArea: 'chars' }} aria-label="Characters">
          <FadeScroller className="bsx-railscroll">
            <ZoneTag zone="chars" emoji="🐱" label="Characters" />
            {page.characters.map((c) => (
              <button
                key={c.id}
                type="button"
                data-testid={`char-thumb-${c.id}`}
                onClick={() => useBlocksStore.getState().selectChar(c.id)}
                className="bsx-press relative grid aspect-square w-full max-w-[72px] place-items-center rounded-2xl text-[30px]"
                style={
                  c.id === selectedChar?.id
                    ? { boxShadow: '0 0 0 4px #5DAEFF, 0 4px 0 var(--bsx-border)' }
                    : undefined
                }
                title={c.name}
              >
                <CharacterVisual
                  character={c}
                  className={c.asset ? 'bsx-character-asset-thumb' : undefined}
                />
                {c.id === selectedChar?.id && page.characters.length > 1 && (
                  <span
                    role="button"
                    data-testid={`remove-character-${c.id}`}
                    aria-disabled={readOnly || undefined}
                    className={`absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-brand-coral text-[11px] font-bold text-white${readOnly ? ` ${READONLY_EDIT_DISABLED}` : ''}`}
                    title={`Remove ${c.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (readOnly) return;
                      sfx.trash();
                      useBlocksStore.getState().removeCharacter(c.id);
                    }}
                  >
                    ✕
                  </span>
                )}
              </button>
            ))}
            <button
              type="button"
              data-testid="add-character"
              onClick={openFriendPicker}
              disabled={readOnly}
              aria-disabled={readOnly || undefined}
              className={`grid aspect-square w-full max-w-[72px] place-items-center rounded-2xl border-2 border-dashed border-brand-sky/50 text-[26px] text-brand-sky${readOnly ? ` ${READONLY_EDIT_DISABLED}` : ''}`}
              title="Add a character"
            >
              ＋
            </button>
          </FadeScroller>
        </aside>

        <div className="flex min-h-0 flex-col gap-2" style={{ gridArea: 'stage' }}>
          <div
            ref={stageRef}
            data-testid="blocks-stage"
            data-scene={sceneId(page.background)}
            className="bsx-stage min-h-[180px] flex-1"
            aria-label="Stage"
          >
            <div className="bsx-grid" />
            {/* animated scene decorations (CSS draws the rest per [data-scene]) */}
            <div className="bsx-deco bsx-deco-a" />
            <div className="bsx-deco bsx-deco-b" />
            <div className="bsx-deco bsx-deco-c" />
            <div className="bsx-hill" />
            {/* change the scene — a big picture library. Rendered but inert + dimmed
                in the teacher viewer so the stage layout matches the kid's (D-LV-6). */}
            <button
              type="button"
              data-testid="scene-btn"
              className={`bsx-scene-btn${readOnly ? ` ${READONLY_EDIT_DISABLED}` : ''}`}
              title="Change the background"
              disabled={readOnly}
              aria-disabled={readOnly || undefined}
              onClick={() => {
                if (readOnly) return;
                sfx.tap();
                setScenePick((v) => !v);
              }}
            >
              <ImageIcon size={20} />
            </button>
            {/* beside (never over) the scene button — the stage's name tag */}
            <ZoneTag zone="stage" emoji="🎬" label="Stage" />
            {storyMission && !missionOpen && (
              <StoryCoachPanel
                mission={storyMission}
                cue={visibleCoachCue}
                running={running}
                onGo={go}
              />
            )}
            {page.characters.map((c) => {
              const run = runStates?.get(c.id);
              const st = run?.st ?? startState(c);
              const dur = run?.dur ?? 0;
              const say = says.get(c.id);
              return (
                <div key={c.id}>
                  {say && (
                    <div
                      className="bsx-say"
                      style={{
                        left: `${((st.gx + 0.5) / GRID_W) * 100}%`,
                        top: `${((st.gy - 0.9) / GRID_H) * 100}%`,
                      }}
                    >
                      {say}
                    </div>
                  )}
                  <div
                    data-testid={`sprite-${c.id}`}
                    data-gx={st.gx}
                    data-gy={st.gy}
                    className={`bsx-sprite${dragging === c.id ? ' dragging' : ''}`}
                    onPointerDown={(e) => onSpriteDown(e, c.id)}
                    onPointerMove={(e) => onSpriteMove(e, c.id)}
                    onPointerUp={() => onSpriteUp(c.id)}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{
                      left: `${((st.gx + 0.5) / GRID_W) * 100}%`,
                      top: `${((st.gy + 0.5) / GRID_H) * 100}%`,
                      fontSize: 'clamp(40px,5.5vw,64px)',
                      opacity: st.visible ? 1 : 0.12,
                      transform: `translate(-50%,-50%) rotate(${st.rot}deg) scale(${st.size})`,
                      transition:
                        dur > 0
                          ? `left ${dur}ms ease, top ${dur}ms ease, transform ${dur}ms ease, opacity ${dur}ms ease`
                          : 'none',
                    }}
                    title={`${c.name} — drag to move, tap to run 👆, drag to the bin to remove`}
                  >
                    <CharacterVisual
                      character={c}
                      className={c.asset ? 'bsx-character-asset' : undefined}
                      performance={
                        missionCompleted && storyMission?.hero.asset === c.asset
                          ? 'success'
                          : characterPerformances.get(c.id)
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="bsx-railbox" style={{ gridArea: 'pages' }} aria-label="Pages">
          <FadeScroller className="bsx-railscroll">
            <ZoneTag zone="pages" emoji="📖" label="Pages" />
            {project.pages.map((p, i) => (
              <div key={p.id} className="relative w-full max-w-[96px]">
                <button
                  type="button"
                  data-testid={`page-thumb-${i}`}
                  onClick={() => {
                    sfx.page();
                    useBlocksStore.getState().selectPage(p.id);
                  }}
                  className={`bsx-press bsx-stage bsx-pagethumb${p.id === page.id ? ' sel' : ''}`}
                  data-scene={sceneId(p.background)}
                  style={{ aspectRatio: '4/3' }}
                  title={`Page ${i + 1}`}
                >
                  <span className="bsx-hill" />
                  <span className="bsx-pagethumb-n">{i + 1}</span>
                  <span className="bsx-pagethumb-emoji">{p.characters[0]?.emoji ?? '🧩'}</span>
                </button>
                {project.pages.length > 1 && (
                  <button
                    type="button"
                    data-testid={`remove-page-${i}`}
                    disabled={readOnly}
                    aria-disabled={readOnly || undefined}
                    className={`absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-brand-coral text-[11px] font-bold text-white shadow${readOnly ? ` ${READONLY_EDIT_DISABLED}` : ''}`}
                    title={`Remove page ${i + 1}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (readOnly) return;
                      sfx.trash();
                      useBlocksStore.getState().removePage(p.id);
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {project.pages.length < MAX_PAGES && (
              <button
                type="button"
                data-testid="add-page"
                onClick={() => {
                  if (readOnly) return;
                  sfx.add();
                  useBlocksStore.getState().addPage();
                }}
                disabled={readOnly}
                aria-disabled={readOnly || undefined}
                className={`grid w-full max-w-[96px] place-items-center rounded-xl border-2 border-dashed border-brand-coral/50 text-[22px] text-brand-coral${readOnly ? ` ${READONLY_EDIT_DISABLED}` : ''}`}
                style={{ aspectRatio: '4/3' }}
                title="Add a page"
              >
                ＋
              </button>
            )}
          </FadeScroller>
        </aside>
      </section>

      {/* ── coding band ── */}
      <section className="bsx-coder">
        {/* The category bar drives the palette. Rendered but inert + dimmed in the
            teacher viewer so the coding band matches the kid's layout (D-LV-6). */}
        <nav
          className={`bsx-catbar${readOnly ? ` ${READONLY_EDIT_DISABLED}` : ''}`}
          aria-label="Kinds of blocks"
          aria-disabled={readOnly || undefined}
        >
          <FadeScroller className="bsx-catscroll">
            <ZoneTag zone="cats" emoji="🧰" label="Kinds" />
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                data-testid={`cat-${c.id}`}
                className={`bsx-cat c-${c.id}`}
                aria-pressed={category === c.id}
                disabled={readOnly}
                aria-disabled={readOnly || undefined}
                onClick={() => {
                  if (readOnly) return;
                  sfx.tap();
                  setCategory(c.id);
                }}
                title={`${c.label} blocks`}
              >
                <span>{c.icon}</span>
                {c.id === 'sound' && (
                  <span className="bsx-cat-count" aria-hidden>
                    7+6
                  </span>
                )}
              </button>
            ))}
          </FadeScroller>
        </nav>

        <div className="relative flex min-h-0 min-w-0 flex-col gap-2">
          {/* pinned on the wrapper (not the scroller) so it never scrolls away */}
          {/* The palette ADDS blocks — a mutation. Rendered but inert + dimmed in the
              teacher viewer so the coding band keeps the kid's layout (D-LV-6). */}
          <ZoneTag zone="palette" emoji="🧩" label="Blocks" />
          <div
            className={`bsx-soft bsx-palette flex min-w-0 overflow-hidden rounded-3xl${readOnly ? ` ${READONLY_EDIT_DISABLED}` : ''}`}
            data-testid="palette"
            data-cat={category}
            aria-label="Blocks"
            aria-disabled={readOnly || undefined}
          >
            <FadeScroller className="flex items-center gap-4 overflow-x-auto px-4 pb-4 pt-3">
              <span className="bsx-palette-tag shrink-0">
                <span aria-hidden>{activeCat.icon}</span>
                {activeCat.id === 'sound' ? '7 Notes + 6 Sounds' : activeCat.label}
              </span>
              {paletteChoices.map(({ def, n, key }) => (
                <BlockChip
                  key={key}
                  block={{
                    op: def.op,
                    ...(n !== undefined ? { n } : {}),
                  }}
                  style={palBlk?.op === def.op && palBlk?.n === n ? { opacity: 0.4 } : undefined}
                  onPointerDown={(e) => onPalDown(e, def.op, n)}
                  onPointerMove={onPalMove}
                  onPointerUp={() => onPalUp(def.op, n)}
                  onPointerCancel={() => onPalCancel(def.op, n)}
                  title={`Tap to add this sound — or hold and drag it into ${selectedChar?.name}'s program`}
                />
              ))}
            </FadeScroller>
          </div>

          <div className="relative flex min-h-0 flex-1 gap-2">
            {/* pinned on the wrapper (not the scroller) so it never scrolls away */}
            <ZoneTag zone="script" emoji="✨" label="What they do" />
            <div
              className="bsx-soft relative flex min-h-0 flex-1 overflow-hidden rounded-3xl"
              data-testid="script-area"
              aria-label="What they do"
            >
              <FadeScroller className="overflow-auto p-4">
                {selectedChar?.scripts.length === 0 && (
                  <div className="bsx-muted grid h-full place-items-center text-[14px] font-bold">
                    Tap a 🚩 block to pick what {selectedChar.name} does ✨
                  </div>
                )}
                {selectedChar?.scripts.map((script) => {
                  const isDragSource = !!dragBlk && dragBlk.scriptId === script.id;
                  // the insertion bar shows in whichever track the block is heading
                  // for — which may be a DIFFERENT track (cross-track move).
                  const showReorderBar =
                    !!dragBlk &&
                    !dragBlk.onBin &&
                    dragBlk.targetScriptId === script.id &&
                    dragBlk.dropX !== null;
                  return (
                    <div
                      key={script.id}
                      className="bsx-chainwrap relative mb-3 flex w-max items-center rounded-2xl p-2.5 pr-4"
                      data-testid={`script-${script.id}`}
                    >
                      {script.blocks.map((b, i) => {
                        const isDragged = isDragSource && dragBlk!.index === i;
                        const def = blockDef(b.op);
                        const isLockedDirection =
                          storyMission?.lessonId === 'tsv-s1-a2-b' &&
                          (b.op === 'move_left' || b.op === 'move_right');
                        const isDebugDirection =
                          isA2DirectionDebug && (b.op === 'move_left' || b.op === 'move_right');
                        if (b.op === 'if_touching') {
                          const bodyTarget =
                            ifBodyTarget?.scriptId === script.id && ifBodyTarget.index === i;
                          return (
                            <div
                              key={`${script.id}-${i}`}
                              className="bsx-if-c"
                              data-testid="if-container"
                            >
                              <BlockChip
                                block={b}
                                inChain
                                lit={activeKeys.has(`${script.id}:${i}`)}
                                dragging={isDragged}
                                style={isDragged ? { opacity: 0.28 } : undefined}
                                onPointerDown={(e) => onBlockDown(e, script.id, i)}
                                onPointerMove={onBlockMove}
                                onPointerUp={onBlockUp}
                                onPointerCancel={onBlockCancel}
                                onTap={(e) => onBlockTap(e, script.id, i, b.op)}
                                title="Tap to choose a friend · hold to move the whole If"
                              />
                              <div
                                className={`bsx-if-body${bodyTarget ? ' is-target' : ''}`}
                                data-testid="if-body"
                              >
                                <span className="bsx-if-body-label">Then do</span>
                                <div className="bsx-if-body-chain">
                                  {(b.body ?? []).map((child, bodyIndex) => (
                                    <BlockChip
                                      key={`${script.id}-${i}-body-${bodyIndex}`}
                                      block={child}
                                      inChain
                                      isLast={bodyIndex === (b.body?.length ?? 0) - 1}
                                      title="Tap to remove this action from the If"
                                      onTap={() =>
                                        useBlocksStore
                                          .getState()
                                          .removeIfBodyBlock(script.id, i, bodyIndex)
                                      }
                                    />
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  className="bsx-if-add"
                                  data-testid="if-add-inside"
                                  aria-pressed={bodyTarget}
                                  onClick={() => {
                                    sfx.tap();
                                    setIfBodyTarget({ scriptId: script.id, index: i });
                                  }}
                                >
                                  <span aria-hidden>{bodyTarget ? '←' : '+'}</span>
                                  {bodyTarget ? 'Pick a block on the left' : 'Add block'}
                                </button>
                              </div>
                              <span className="bsx-if-foot" aria-hidden />
                            </div>
                          );
                        }
                        return (
                          <BlockChip
                            key={`${script.id}-${i}`}
                            block={b}
                            inChain
                            isLast={i === script.blocks.length - 1}
                            lit={activeKeys.has(`${script.id}:${i}`)}
                            dragging={isDragged}
                            // the original stays put (dimmed) while a fixed clone
                            // follows the pointer — so it can't be clipped by the
                            // script-area's overflow or pushed behind the bin, and
                            // dragging never adds a horizontal scrollbar.
                            style={isDragged ? { opacity: 0.28 } : undefined}
                            onPointerDown={(e) => onBlockDown(e, script.id, i)}
                            onPointerMove={onBlockMove}
                            onPointerUp={onBlockUp}
                            onPointerCancel={onBlockCancel}
                            onTap={(e) => onBlockTap(e, script.id, i, b.op)}
                            title={
                              isDebugDirection
                                ? missionWrongRunObserved
                                  ? 'Tap to turn this one arrow · 3 steps stay the same'
                                  : 'Press Go first and watch where Left 3 goes'
                                : isLockedDirection
                                  ? '3 steps are ready · hold to drag · drag to the bin to remove'
                                  : def.hasN
                                    ? 'Tap to change the number · hold to drag · drag to the bin to remove'
                                    : b.op === 'say'
                                      ? 'Tap to change the words · hold to drag · drag to the bin to remove'
                                      : 'Hold to drag · drag to another track or the bin'
                            }
                          />
                        );
                      })}
                      {/* reorder / cross-track insertion bar */}
                      {showReorderBar && (
                        <span className="bsx-dropbar" style={{ left: dragBlk!.dropX! }} />
                      )}
                      {/* palette-drop insertion bar */}
                      {palBlk && palBlk.scriptId === script.id && palBlk.dropX !== null && (
                        <span className="bsx-dropbar" style={{ left: palBlk.dropX }} />
                      )}
                    </div>
                  );
                })}
              </FadeScroller>
            </div>
            {/* the trash bin — at the end of the block area; drag a block here to
              remove it. Bigger + glows red when armed. (Blocks only.) Rendered but
              inert + dimmed in the teacher viewer so the band matches the kid's
              layout — there's no block dragging to feed it (D-LV-6). */}
            <div
              ref={binRef}
              data-testid="trash-bin"
              aria-label="Trash"
              aria-disabled={readOnly || undefined}
              className={`bsx-bin${dragBlk ? ' active' : ''}${binArmed ? ' armed' : ''}${readOnly ? ` ${READONLY_EDIT_DISABLED}` : ''}`}
            >
              <div className="bsx-bin-can">
                <span className="bsx-bin-lid" />
                <span className="bsx-bin-body" />
              </div>
              <span className="bsx-bin-label">{binArmed ? 'Drop!' : 'Bin'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* floating friend picker — portalled to <body> so the rail can't clip it */}
      {pickFriend &&
        createPortal(
          <div
            className="bsx bsx-sheet-bg"
            data-theme={theme}
            onPointerDown={() => setFriendPos(null)}
          >
            <div
              data-testid="friend-picker"
              className="bsx-sheet"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="bsx-sheet-head">
                <span>Pick a friend ✨</span>
                <button
                  type="button"
                  className="bsx-press bsx-sheet-x"
                  onClick={() => setFriendPos(null)}
                >
                  ✕
                </button>
              </div>
              <div className="bsx-sheet-tabs">
                {CHARACTER_GROUPS.map((g, i) => (
                  <button
                    key={g.label}
                    type="button"
                    className="bsx-tab"
                    aria-pressed={charTab === i}
                    onClick={() => {
                      sfx.tap();
                      setCharTab(i);
                    }}
                  >
                    <span>{g.emoji}</span>
                    <span>{g.label}</span>
                  </button>
                ))}
              </div>
              <div className="bsx-sheet-grid">
                {CHARACTER_GROUPS[charTab].items.map((f) => (
                  <button
                    key={f.emoji}
                    type="button"
                    className="bsx-pick"
                    title={f.name}
                    onClick={() => {
                      sfx.add();
                      useBlocksStore.getState().addCharacter(f.emoji, f.name);
                      setFriendPos(null);
                    }}
                  >
                    {f.emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* scene / background picker — a big picture library */}
      {scenePick &&
        createPortal(
          <div
            className="bsx bsx-sheet-bg"
            data-theme={theme}
            onPointerDown={() => setScenePick(false)}
          >
            <div
              data-testid="scene-picker"
              className="bsx-sheet"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="bsx-sheet-head">
                <span>Pick a scene 🏞</span>
                <button
                  type="button"
                  className="bsx-press bsx-sheet-x"
                  onClick={() => setScenePick(false)}
                >
                  ✕
                </button>
              </div>
              <div className="bsx-scene-grid">
                {SCENES.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    data-testid={`scene-${sc.id}`}
                    className={`bsx-scene-tile bsx-stage${sceneId(page.background) === sc.id ? ' sel' : ''}`}
                    data-scene={sc.id}
                    title={sc.label}
                    onClick={() => {
                      sfx.add();
                      useBlocksStore.getState().setBackground(sc.id);
                      setScenePick(false);
                    }}
                  >
                    <span className="bsx-scene-name">
                      {sc.emoji} {sc.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* ── tap-to-edit popover: number stepper / Say text ── */}
      {editing &&
        createPortal(
          <div
            data-testid="block-editor"
            className="bsx bsx-card fixed z-[70] rounded-2xl p-3 shadow-card-soft"
            data-theme={theme}
            style={{ left: editing.left, top: editing.top, width: 230 }}
          >
            <div className="mb-2 flex items-center gap-2 text-[13px] font-extrabold">
              <span className="text-[20px]">{blockDef(editing.block.op).icon}</span>
              {isA3EventDebug &&
              (editing.block.op === 'when_flag' || editing.block.op === 'when_tap')
                ? 'Which start listens for a tap?'
                : isA2DirectionDebug &&
              (editing.block.op === 'move_left' || editing.block.op === 'move_right')
                ? 'Which way should Tuan Tuan go?'
                : editing.block.op === 'say'
                  ? 'What should they say?'
                  : editing.block.op === 'if_touching'
                    ? 'Touching which friend?'
                  : blockDef(editing.block.op).param === 'note'
                    ? 'Which note? Tap to hear it!'
                    : blockDef(editing.block.op).param === 'sound'
                      ? 'Which sound? Tap to hear it!'
                      : editing.block.op === 'goto_page'
                        ? `Which page? (1–${project.pages.length})`
                        : `How many? (${blockDef(editing.block.op).label})`}
            </div>
            {isA3EventDebug &&
            (editing.block.op === 'when_flag' || editing.block.op === 'when_tap') ? (
              <div className="grid grid-cols-2 gap-2" data-testid="event-repair-picker">
                {(['when_flag', 'when_tap'] as const).map((event) => (
                  <button
                    key={event}
                    type="button"
                    data-testid={`event-repair-${event}`}
                    aria-pressed={editing.block.op === event}
                    className="bsx-press rounded-xl border border-current/15 px-2 py-3 text-[13px] font-extrabold aria-pressed:bg-emerald-100"
                    onClick={() => {
                      if (editing.block.op === event) return;
                      sfx.tap();
                      useBlocksStore.getState().replaceBlockOp(editing.scriptId, editing.index, event);
                      setEditBlk(null);
                      setStoryCoachCue('test');
                    }}
                  >
                    {event === 'when_flag' ? '🚩 Start' : '👆 On Tap'}
                  </button>
                ))}
              </div>
            ) : isA2DirectionDebug &&
            (editing.block.op === 'move_left' || editing.block.op === 'move_right') ? (
              <div className="grid grid-cols-2 gap-2" data-testid="direction-repair-picker">
                {(['move_left', 'move_right'] as const).map((direction) => (
                  <button
                    key={direction}
                    type="button"
                    data-testid={`direction-repair-${direction}`}
                    aria-pressed={editing.block.op === direction}
                    className="bsx-press rounded-xl border border-current/15 px-2 py-3 text-[13px] font-extrabold aria-pressed:bg-emerald-100"
                    onClick={() => {
                      if (editing.block.op === direction) return;
                      sfx.tap();
                      useBlocksStore
                        .getState()
                        .replaceBlockOp(editing.scriptId, editing.index, direction);
                      setEditBlk(null);
                    }}
                  >
                    {direction === 'move_left' ? '⬅️ Left' : '➡️ Right'}
                  </button>
                ))}
              </div>
            ) : editing.block.op === 'if_touching' ? (
              <div className="grid gap-2" data-testid="if-touching-picker">
                {page.characters
                  .filter((character) => character.id !== selectedChar.id)
                  .map((character) => (
                    <button
                      key={character.id}
                      type="button"
                      data-testid={`if-touching-choice-${character.id}`}
                      aria-pressed={editing.block.text === character.id}
                      className="bsx-press rounded-xl border border-current/15 px-3 py-2 text-left text-[13px] font-extrabold aria-pressed:bg-emerald-100"
                      onClick={() => {
                        sfx.tap();
                        useBlocksStore
                          .getState()
                          .setSayText(editing.scriptId, editing.index, character.id);
                        setEditBlk(null);
                      }}
                    >
                      {character.emoji} {character.name}
                    </button>
                  ))}
                {page.characters.length < 2 && (
                  <p className="text-[12px] font-bold bsx-muted">
                    Add another character first.
                  </p>
                )}
              </div>
            ) : editing.block.op === 'say' ? (
              <div>
                <input
                  data-testid="say-input"
                  autoFocus
                  maxLength={60}
                  value={editing.block.text ?? 'Hi!'}
                  onChange={(e) =>
                    useBlocksStore
                      .getState()
                      .setSayText(editing.scriptId, editing.index, e.target.value)
                  }
                  onKeyDown={(e) => e.key === 'Enter' && setEditBlk(null)}
                  className="bsx-card w-full rounded-xl px-3 py-2 text-[15px] font-bold outline-none"
                />
                {storyMission?.mode === 'personal-ship' && (
                  <div className="mt-2 grid gap-1.5" data-testid="story-greeting-picker">
                    {TINY_STAR_GREETING_CHOICES.map((greeting) => (
                      <button
                        key={greeting}
                        type="button"
                        className="bsx-press rounded-xl border border-current/15 px-2 py-2 text-left text-[12px] font-extrabold"
                        aria-pressed={editing.block.text === greeting}
                        onClick={() => {
                          sfx.tap();
                          useBlocksStore
                            .getState()
                            .setSayText(editing.scriptId, editing.index, greeting);
                        }}
                      >
                        💬 {greeting}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : blockDef(editing.block.op).param === 'note' ? (
              <div className="grid grid-cols-4 gap-2" data-testid="note-picker">
                {BUILT_IN_NOTES.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    data-testid={`note-choice-${note.id}`}
                    aria-pressed={(editing.block.n ?? 1) === note.id}
                    className="bsx-press rounded-xl border border-current/15 px-2 py-2 text-[12px] font-extrabold aria-pressed:bg-emerald-100"
                    onClick={() => {
                      sfx.playNote(note.id);
                      useBlocksStore
                        .getState()
                        .setParam(editing.scriptId, editing.index, note.id, MAX_NOTE);
                    }}
                  >
                    <span className="block text-[24px]" aria-hidden>
                      {note.icon}
                    </span>
                    {note.label}
                  </button>
                ))}
              </div>
            ) : blockDef(editing.block.op).param === 'sound' ? (
              <div className="grid grid-cols-3 gap-2" data-testid="sound-picker">
                {BUILT_IN_SOUNDS.map((sound) => (
                  <button
                    key={sound.id}
                    type="button"
                    data-testid={`sound-choice-${sound.id}`}
                    aria-pressed={(editing.block.n ?? 1) === sound.id}
                    className="bsx-press rounded-xl border border-current/15 px-2 py-2 text-[12px] font-extrabold aria-pressed:bg-emerald-100"
                    onClick={() => {
                      sfx.playSound(sound.id);
                      useBlocksStore
                        .getState()
                        .setParam(editing.scriptId, editing.index, sound.id, MAX_SOUND);
                    }}
                  >
                    <span className="block text-[24px]" aria-hidden>
                      {sound.icon}
                    </span>
                    {sound.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  data-testid="num-minus"
                  className="bsx-step"
                  disabled={(editing.block.n ?? 1) <= 1}
                  onClick={() => {
                    sfx.numDown();
                    useBlocksStore
                      .getState()
                      .setParam(
                        editing.scriptId,
                        editing.index,
                        (editing.block.n ?? 1) - 1,
                        editMax,
                      );
                  }}
                >
                  −
                </button>
                <span data-testid="num-value" className="text-[30px] font-extrabold tabular-nums">
                  {editing.block.n ?? 1}
                </span>
                <button
                  type="button"
                  data-testid="num-plus"
                  className="bsx-step"
                  onClick={() => {
                    sfx.numUp();
                    useBlocksStore
                      .getState()
                      .setParam(
                        editing.scriptId,
                        editing.index,
                        (editing.block.n ?? 1) + 1,
                        editMax,
                      );
                  }}
                  disabled={(editing.block.n ?? 1) >= editMax}
                >
                  +
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}

      {/* ── "⋯ More" menu — secondary actions (keeps the bar uncluttered) ── */}
      {moreAnchor &&
        createPortal(
          <div
            className="bsx"
            data-theme={theme}
            data-testid="more-menu"
            style={{ position: 'fixed', right: moreAnchor.right, top: moreAnchor.top, zIndex: 80 }}
          >
            <div className="bsx-menu" role="menu">
              <button
                type="button"
                className="bsx-menu-row"
                data-testid="theme-toggle"
                onClick={() => {
                  toggleTheme();
                  setMoreAnchor(null);
                }}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                <span>{theme === 'dark' ? 'Day mode' : 'Night mode'}</span>
              </button>
              <button
                type="button"
                className="bsx-menu-row"
                data-testid="reset-button"
                onClick={() => {
                  sfx.tap();
                  setMoreAnchor(null);
                  setConfirmReset(true);
                }}
              >
                <RotateCcw size={18} />
                <span>Reset</span>
              </button>
              <button
                type="button"
                className="bsx-menu-row"
                data-testid="present-toggle"
                onClick={() => {
                  setMoreAnchor(null);
                  setPresent((p) => !p);
                }}
              >
                <Expand size={18} />
                <span>{present ? 'Exit big screen' : 'Big screen'}</span>
              </button>
            </div>
          </div>,
          document.body,
        )}

      {/* ── reset confirmation — friendly, reversible-sounding, kid-readable ── */}
      {confirmReset &&
        createPortal(
          <div
            className="bsx bsx-sheet-bg"
            data-theme={theme}
            onPointerDown={() => setConfirmReset(false)}
          >
            <div
              className="bsx-confirm"
              data-testid="reset-confirm"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="bsx-confirm-icon">
                <RotateCcw size={34} />
              </div>
              <div className="bsx-confirm-title">Start over?</div>
              <div className="bsx-confirm-text">
                Everyone hops back to their start spots. Your blocks stay just the way you made
                them. ✨
              </div>
              <div className="bsx-confirm-btns">
                <button
                  type="button"
                  className="bsx-confirm-cancel"
                  onClick={() => {
                    sfx.tap();
                    setConfirmReset(false);
                  }}
                >
                  Keep playing
                </button>
                <button
                  type="button"
                  className="bsx-confirm-ok"
                  data-testid="reset-confirm-ok"
                  onClick={() => {
                    sfx.page();
                    reset();
                    setConfirmReset(false);
                  }}
                >
                  ↺ Reset
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* drag clone — a fixed copy that follows the pointer, ABOVE everything
          (incl. the bin) and never clipped by the script area's overflow */}
      {dragBlk &&
        draggingBlock &&
        createPortal(
          <div
            className="bsx"
            data-theme={theme}
            style={{
              position: 'fixed',
              left: dragBlk.cx,
              top: dragBlk.cy,
              zIndex: 9999,
              pointerEvents: 'none',
              transform: 'translate(-50%,-50%) scale(1.08) rotate(-2deg)',
            }}
          >
            <BlockChip block={draggingBlock.block} inChain removing={dragBlk.onBin} />
          </div>,
          document.body,
        )}

      {/* palette drag clone — same fixed-above-everything trick */}
      {palBlk &&
        createPortal(
          <div
            className="bsx"
            data-theme={theme}
            style={{
              position: 'fixed',
              left: palBlk.cx,
              top: palBlk.cy,
              zIndex: 9999,
              pointerEvents: 'none',
              transform: 'translate(-50%,-50%) scale(1.08) rotate(-2deg)',
            }}
          >
            <BlockChip
              block={{
                op: palBlk.op,
                ...(palBlk.n !== undefined
                  ? { n: palBlk.n }
                  : blockDef(palBlk.op).hasN
                    ? { n: blockDef(palBlk.op).defaultN }
                    : {}),
              }}
              inChain
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
