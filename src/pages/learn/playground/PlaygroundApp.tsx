import { AlertTriangle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker, useNavigate, useSearchParams } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { useDemoMode } from '@/pages/try/demoMode';

import { getProject, readVfs, type VfsFile } from '../code/codeApi';
import type { GameEngine } from './buildGamePreview';
import { GeneratingScreen } from './GeneratingScreen';
import { createGameProject, createPrepGameProject, placeGameProjectForClass } from './panes/playgroundApi';
import { useHistoryStore } from './historyStore';
import { LandingScreen } from './LandingScreen';
import { usePlaygroundStore, type PlaygroundSnapshot } from './playgroundStore';
import {
  loadProject as loadPersisted,
  saveProject as savePersisted,
  loadWorkspaceUi,
  saveWorkspaceUi,
  loadChatHistory,
  saveChatHistory,
  saveThumbnail,
  type SaveResult,
} from './projectPersistence';
import { captureWorkspaceThumbnail } from './workspaceThumbnail';
import { useWorkspaceUiStore } from './workspaceUiStore';
import { type ProjectChange, useProjectStore } from './projectStore';
import { useSaveStatusStore } from './saveStatusStore';
import { Workspace } from './Workspace';
import type { ChatItem, FirstTurnSeed } from './panes/useGameAgent';
import { useReportFocus } from '../liveClass/reportFocus';

type Phase = 'landing' | 'generating' | 'workspace';

/** Debounce window (ms) for persisting the project after a change. */
const SAVE_DEBOUNCE_MS = 600;

const base = (p: string) => p.split('/').pop() || p;

/** The set of asset paths in a VFS — bytes that live as S3 objects. */
const assetPathSet = (files: VfsFile[]): Set<string> =>
  new Set(files.filter((f) => f.kind === 'asset').map((f) => f.path));

/** History label for a file-tree mutation (create/rename/move/delete). */
function changeSummary(c: ProjectChange): string | undefined {
  if (c.kind === 'create-file' && c.added.length) return `created ${base(c.added[0])}`;
  if (c.kind === 'remove' && c.removed.length)
    return `deleted ${base(c.removed[0])}${c.removed.length > 1 ? ` +${c.removed.length - 1}` : ''}`;
  if (c.kind === 'rename' && c.remaps.length) return `renamed ${base(c.remaps[0].from)} → ${base(c.remaps[0].to)}`;
  if (c.kind === 'move' && c.remaps.length) return `moved ${base(c.remaps[0].from)}`;
  return undefined;
}

interface PlaygroundAppProps {
  /**
   * The backend project whose files to open (its VFS is loaded from the
   * S3-backed backend). Supplied by the authed `/learn/playground/:projectId`
   * route. When absent (e.g. the `/learn/playground/new` create/landing flow
   * before a project exists) the local starter scaffold is used. NOTE: this
   * component also reads a `?projectId` query param below as a fallback — that
   * path was only exercised by the removed DEV sandbox route and is now
   * effectively dead (kept out of scope; see the follow-up note).
   */
  projectId?: string;
  /**
   * Read-only viewing mode (teacher-live-project-view-prd D-LV-6). A teacher
   * watches a kid's game project live: the studio loads the backend VFS
   * (`readVfs`) STRAIGHT into the workspace (no landing/generating flow, no
   * IndexedDB persistence) and renders the SAME Workspace with EVERY mutation
   * entry point gated — AI turns, file CRUD, Monaco edits, asset uploads, and
   * all autosave/persistence. Running the game (▶ Play / Run anew) stays live
   * (non-destructive viewing). The kid (editable) flow is untouched when false.
   */
  readOnly?: boolean;
  /**
   * Hosts the studio inside other chrome (e.g. the teacher prep-project page)
   * whose banner carries the only Back. When true, in-studio navigation that
   * would route a `user` principal into `/learn/*` (the load-error Back) is
   * suppressed. Mirrors the `embedded` seam on CodeStudioPage/BlocksStudioPage.
   * Kid/default behavior is unchanged when false.
   */
  embedded?: boolean;
  /**
   * Teacher-prep host (teacher-prep-projects): when set, a NEW game (`isNew`) is
   * created as a teacher-owned PREP project (`POST /classes/:id/prep-projects`) on
   * prompt submit — the SAME prompt-first landing → generate flow a kid gets — and
   * the URL is rewritten to `/teacher/prep/:id` instead of `/learn/playground/:id`.
   * Undefined for the kid flow (unchanged).
   */
  prepClassId?: string;
}

export function PlaygroundApp({
  projectId: projectIdProp,
  readOnly = false,
  embedded = false,
  prepClassId,
}: PlaygroundAppProps = {}) {
  // The whole playground (all phases) themes from this one `data-theme` root.
  const theme = usePlaygroundStore((s) => s.theme);
  // Highest window z-index — floating windows climb past any static z-index as the
  // kid focuses them, so the leave dialog reads it to always sit on top.
  const topZ = usePlaygroundStore((s) => s.topZ);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const me = useMe();
  // Try-demo mode (try-demo-mode-prd §3): the public /try/playground page wraps
  // this SAME component in a DemoModeProvider — the demo starts on the REAL
  // landing phase with the prompt pre-filled + locked (LandingScreen reads the
  // context). Null everywhere else, so the initializers below behave exactly as
  // before outside the demo.
  const demo = useDemoMode();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const familyId = me.data?.kind === 'kid' ? me.data.family_id : null;
  // The hub starts a NEW game with the sentinel id `new`, so the studio opens
  // PROMPT-FIRST on the landing screen (the 3-phase flow). The real `kind='game'`
  // project is created on prompt SUBMIT (below), not on the hub click — otherwise
  // a kid who backs out at the prompt would orphan an empty project.
  const isNew = projectIdProp === 'new';
  // The real owned project id once known: the route param, or the id created on
  // submit. `undefined` for a new-but-not-yet-created game (project-less session).
  const [createdId, setCreatedId] = useState<string | undefined>(undefined);
  const ownedProjectId = createdId ?? (isNew ? undefined : projectIdProp);
  // The `?projectId` query fallback was only used by the removed DEV sandbox
  // route — now effectively dead (see the prop doc / follow-up note).
  const projectId = ownedProjectId ?? searchParams.get('projectId') ?? undefined;
  // Class "Create for this class" opens `/learn/playground/new?class=<id>` so the
  // kid still sees the initial prompt. After the prompt creates the real game, we
  // attach it to this class via the placement endpoint before entering the studio.
  const createForClassId = isNew ? searchParams.get('class') : null;

  // Live focus presence (D-LIVE-3): report the kid's open game to the teacher.
  // No-op in readOnly (teacher viewer) or outside a live class. Title is omitted
  // (the teacher falls back to the live-state `current_project_title`).
  useReportFocus(projectId, 'game', undefined, readOnly);

  // Age tier (OD-1) for the first-turn generation: Lite 8–11 / Pro 12–17.
  const kidAge = me.data?.kind === 'kid' ? (me.data.age ?? null) : null;
  const mode: 'lite' | 'pro' = kidAge != null && kidAge >= 12 ? 'pro' : 'lite';
  // The AI's first turn (generated on the loading screen) → seeds the workspace chat.
  const [firstTurn, setFirstTurn] = useState<FirstTurnSeed | undefined>(undefined);
  // The project's game engine (2D phaser / 3D three) — drives which vendored global
  // + control shim the runner injects (learn-game-studio-3d-prd.md D-3D-01). Loaded
  // from the project below; defaults to phaser for a project-less local scaffold.
  const [engine, setEngine] = useState<GameEngine>('phaser');
  // Restored chat history (J9): the saved conversation, loaded on resume and passed
  // to the workspace so it reopens with the real log (not a fresh starter seed).
  const [initialChat, setInitialChat] = useState<ChatItem[] | undefined>(undefined);
  // The first-turn build was refused by the safety check → seed the workspace chat
  // with a friendly explanation + gentler suggestions (not a silent empty project).
  const [blockedSeed, setBlockedSeed] = useState(false);
  // Persistence key: the real project, or a fixed key for a project-less session.
  const persistKey = projectId ?? 'dev-sandbox';
  // A real owned route project (re)opens straight into loading its seeded VFS; a
  // NEW game (project-less session — including the demo) starts on the landing prompt.
  // The teacher viewer (readOnly) skips the landing/generating flow entirely and
  // mounts straight into the workspace once `readVfs` resolves below.
  const [phase, setPhase] = useState<Phase>(
    readOnly ? 'workspace' : projectIdProp && !isNew ? 'generating' : 'landing',
  );
  const [readOnlyReady, setReadOnlyReady] = useState(false);
  const [prompt, setPrompt] = useState(demo?.lockedPrompt ?? '');
  // The VFS lives in the project store (single funnel for editor saves, AI
  // turns, file CRUD, drag moves — and the seam for history + persistence).
  const files = useProjectStore((s) => s.files);
  const applyFiles = useProjectStore((s) => s.apply);
  const [runKey, setRunKey] = useState(0);
  // Whether the game has been launched. ▶ Play (editor or runner) and AI turns
  // set this so the Game Runner mounts. Bringing the runner window to the FRONT
  // is done only for the editor's ▶ Play (in Workspace) — NOT for chat turns.
  const [running, setRunning] = useState(false);
  const setSaveStatus = useSaveStatusStore((s) => s.set);
  // The server save version we last reconciled against (PRD J3, last-write-wins).
  // A ref so the debounced save reads the latest without re-subscribing.
  const versionRef = useRef(0);
  // Asset paths whose bytes are CONFIRMED in S3 at that path (set on load + after a
  // successful save). On save, an asset NOT in here is "dirty" (newly imported /
  // renamed) and uploaded straight to S3 first; the rest are sent as references.
  const syncedAssetsRef = useRef<Set<string>>(new Set());
  // Commit an AI turn's VFS AND adopt the new server version it reports. An applied
  // turn bumps `vfs_version` server-side (recordAgentVersion); if we apply the files
  // but keep the old version, the next manual save sends a stale expected_version,
  // 409s, and the server's pre-edit copy wins — silently reverting the kid's hand
  // edit. `version` is omitted for local-only applies (undo) that don't move it.
  const applyTurnFiles = useCallback(
    (next: VfsFile[], version?: number) => {
      if (version != null) versionRef.current = version;
      // Turn files come from the backend (already written to S3), so the next save
      // references their assets instead of re-uploading.
      for (const p of assetPathSet(next)) syncedAssetsRef.current.add(p);
      applyFiles(next);
    },
    [applyFiles],
  );
  // Wraps the workspace so we can snapshot it (chrome + game) for the Projects
  // thumbnail when the kid leaves. Excludes the leave dialog (a sibling below).
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);
  // A real project couldn't be opened, so we show an error page instead of the
  // studio. `null` = no error; `'load'` = the project's files couldn't be loaded
  // /created (backend is the source of truth, no scaffold fallback); `'service'`
  // = the AI/safety service was unavailable (outage or unconfigured LLM) — a
  // general "try again" error, NOT a content refusal.
  const [loadError, setLoadError] = useState<'load' | 'service' | null>(null);

  const run = useCallback(() => {
    setRunning(true);
    setRunKey((k) => k + 1);
  }, []);

  // Read-only (teacher viewer, D-LV-6): load the kid's current VFS straight from
  // the backend into the project store and open the workspace — no landing flow,
  // no IndexedDB, no persistence. The teacher page remounts this component (keyed
  // on the VFS version) when the kid saves/turns, so a fresh mount re-loads here.
  useEffect(() => {
    if (!readOnly || !projectId) return;
    let alive = true;
    void readVfs(projectId)
      .then((vfsFiles) => {
        if (!alive) return;
        useProjectStore.getState().setFiles(vfsFiles);
        setReadOnlyReady(true);
      })
      .catch(() => {
        if (alive) setLoadError('load');
      });
    return () => {
      alive = false;
    };
  }, [readOnly, projectId]);

  // Load the project's game ENGINE (2D phaser / 3D three) so the runner injects the
  // right vendored global + control shim (D-3D-01). Real projects only; a project-
  // less local scaffold keeps the default (phaser). An in-studio 2D⇄3D switch updates
  // it via onEngineChange (D-3D-08), so the effect only needs the initial load.
  useEffect(() => {
    if (!projectId || projectId.startsWith('local-')) return;
    let alive = true;
    void getProject(projectId)
      .then((p) => {
        if (alive && (p.engine === 'three' || p.engine === 'phaser')) setEngine(p.engine);
      })
      .catch(() => {
        /* fall back to the phaser default */
      });
    return () => {
      alive = false;
    };
  }, [projectId]);

  // Record file-tree operations (create/rename/move/delete) in history. Typing is
  // snapshotted by the editor's idle autosave; this covers structural changes so
  // they're in the timeline and revertable too.
  useEffect(() => {
    if (readOnly) return undefined; // teacher viewer — no history recording (D-LV-6)
    return useProjectStore.subscribe((state) => {
      const c = state.change;
      if (!c) return;
      if (c.kind === 'create-file' || c.kind === 'rename' || c.kind === 'move' || c.kind === 'remove') {
        useHistoryStore.getState().record(state.files, Date.now(), changeSummary(c));
      }
    });
  }, [readOnly]);

  // Persist the project (VFS + history) on change, debounced, while in the
  // workspace. The backend is the source of truth (PRD J3): we PUT the VFS and
  // show a visible save status; IndexedDB is the offline cache/outbox. On a
  // stale-version save the server's newer copy wins and the kid's superseded
  // build drops into History so it stays recoverable (never the word "conflict").
  // Persist the live project NOW (bypassing the debounce). Used by the debounced
  // autosave AND on exit (handleLeave) so a just-created asset/import that's still
  // within the debounce window isn't lost when the workspace unmounts.
  const flushSave = useCallback(async (): Promise<SaveResult> => {
    const ps = useProjectStore.getState();
    // Assets not yet confirmed in S3 at their path (new import / rename) → uploaded
    // straight to S3 by the save; the rest are referenced.
    const dirtyAssetPaths = new Set(
      ps.files
        .filter((f) => f.kind === 'asset' && !syncedAssetsRef.current.has(f.path))
        .map((f) => f.path),
    );
    const result = await savePersisted(
      persistKey,
      {
        files: ps.files,
        folders: ps.folders,
        checkpoints: useHistoryStore.getState().checkpoints,
        savedAt: Date.now(),
        version: versionRef.current,
      },
      projectId,
      { dirtyAssetPaths },
    );
    if (result.status === 'saved') {
      versionRef.current = result.version;
      // Everything in the saved VFS now lives in S3 at its path.
      syncedAssetsRef.current = assetPathSet(ps.files);
      setSaveStatus('saved');
    } else if (result.status === 'queued') {
      setSaveStatus('queued');
    } else if (result.status === 'rejected') {
      // Permanent backend rejection (e.g. an asset over the size cap). Surface it
      // honestly — the change won't survive a reload — instead of a false "saved".
      setSaveStatus('error');
    } else {
      // kept-newest: adopt the server's snapshot, record the superseded build
      // in History (recoverable), and reassure the kid we kept their newest.
      versionRef.current = result.server.version;
      useHistoryStore
        .getState()
        .record(result.superseded, Date.now(), 'Your earlier copy (we kept your newest)');
      useProjectStore.getState().apply(result.server.files);
      setSaveStatus('kept-newest');
    }
    // Returned so a caller (e.g. an asset import) can confirm the save before
    // revealing its result; the status side-effects above are unchanged.
    return result;
  }, [persistKey, projectId, setSaveStatus]);

  // Persist the chat conversation (J9 resume), debounced. The agent hook hands us
  // the full chat on every change; we strip transient bubbles ("Thinking…" /
  // mid-stream) and cache the settled log device-local. Real projects only — a
  // project-less session is transient. `latestChatRef` lets the exit path flush it.
  const latestChatRef = useRef<ChatItem[]>([]);
  const chatTimer = useRef<ReturnType<typeof setTimeout>>();
  const flushChat = useCallback(() => {
    if (!projectId) return;
    const settled = latestChatRef.current.filter((c) => !c.pending && !c.streaming);
    void saveChatHistory(persistKey, settled);
  }, [persistKey, projectId]);
  const persistChat = useCallback(
    (chat: ChatItem[]) => {
      latestChatRef.current = chat;
      if (!projectId) return;
      clearTimeout(chatTimer.current);
      chatTimer.current = setTimeout(flushChat, SAVE_DEBOUNCE_MS);
    },
    [projectId, flushChat],
  );

  useEffect(() => {
    if (readOnly || phase !== 'workspace') return; // teacher viewer never saves (D-LV-6)
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      setSaveStatus('saving');
      clearTimeout(timer);
      timer = setTimeout(() => void flushSave(), SAVE_DEBOUNCE_MS);
    };
    const unsubProject = useProjectStore.subscribe(schedule);
    const unsubHistory = useHistoryStore.subscribe(schedule);
    return () => {
      clearTimeout(timer);
      unsubProject();
      unsubHistory();
    };
  }, [readOnly, phase, flushSave, setSaveStatus]);

  // Persist the workspace UI ("resume where I left off") — debounced, while in the
  // workspace. Single place: snapshot the whole namespaced bag + the playground
  // store's slice. FUTURE-PROOF — any new pane that registers a slice via
  // `usePersistedWorkspaceState` is captured here automatically, no edits needed.
  useEffect(() => {
    // teacher viewer (readOnly) never persists workspace UI (D-LV-6).
    if (readOnly || phase !== 'workspace' || !projectId) return; // a project-less session is transient
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const blob = useWorkspaceUiStore.getState().snapshot();
        const ps = usePlaygroundStore.getState();
        blob.slices.playground = {
          theme: ps.theme,
          layoutMode: ps.layoutMode,
          windows: ps.windows,
          topZ: ps.topZ,
        };
        void saveWorkspaceUi(persistKey, blob);
      }, SAVE_DEBOUNCE_MS);
    };
    schedule(); // capture the initial layout on entry
    const unsubUi = useWorkspaceUiStore.subscribe(schedule);
    const unsubPg = usePlaygroundStore.subscribe(schedule);
    return () => {
      clearTimeout(timer);
      unsubUi();
      unsubPg();
    };
  }, [readOnly, phase, persistKey, projectId]);

  // Guard against accidentally leaving the studio (the Learn nav now sits above
  // it): block in-app navigation away while in the workspace and confirm first.
  // The teacher viewer (readOnly) has nothing to save → never blocks navigation.
  const blocker = useBlocker(!readOnly && phase === 'workspace');

  // Capture a workspace thumbnail (real projects only — a project-less session is
  // transient), persist it locally, then leave. Best-effort: never blocks exit.
  const handleLeave = useCallback(async () => {
    if (projectId && workspaceRef.current) {
      setLeaving(true);
      // Flush any pending (debounced) save FIRST so a just-imported/generated
      // asset persists even if the kid leaves immediately. Best-effort.
      try {
        await flushSave();
        flushChat();
      } catch {
        // A failed flush must not trap the kid in the studio.
      }
      try {
        const dataUrl = await captureWorkspaceThumbnail(workspaceRef.current);
        if (dataUrl) await saveThumbnail(projectId, dataUrl);
      } catch {
        // Thumbnail is best-effort; leaving must not depend on it.
      }
    }
    blocker.proceed?.();
  }, [projectId, blocker, flushSave, flushChat]);

  return (
    <div data-theme={theme} className="h-full min-h-0 w-full overflow-hidden bg-pg-bg">
      {loadError ? (
        <LoadErrorScreen
          variant={loadError}
          onBack={embedded ? undefined : () => navigate('/learn/create')}
        />
      ) : (
        <>
      {phase === 'landing' && (
        <LandingScreen
          onSubmit={async (p) => {
            setPrompt(p);
            // For a NEW game, create the real backend `kind='game'` project now —
            // AFTER the prompt — then load it. The **prompt is the project name**
            // (capped to a sensible length). Falls back to a throwaway local
            // scaffold if the backend isn't ready, so the studio still opens.
            if (isNew && !createdId) {
              try {
                // The prompt IS the title; the backend infers 2D/3D from it and
                // seeds the matching blank starter (no hardcoded template — that
                // forced every game, incl. "make a 3D …", into Phaser/2D).
                const title = p.trim().slice(0, 80) || 'My game';
                let newId: string;
                if (prepClassId) {
                  // TEACHER prep: create a teacher-owned prep game (0 Stars, class-
                  // scoped) and open it under /teacher/prep/:id — the same prompt-
                  // first flow the kid gets, just a different owner + URL.
                  const game = await createPrepGameProject({ classId: prepClassId, title });
                  newId = game.id;
                  window.history.replaceState(null, '', `/teacher/prep/${newId}`);
                } else {
                  const game = await createGameProject({ kidId, familyId, title });
                  if (createForClassId) {
                    await placeGameProjectForClass({ projectId: game.id, classId: createForClassId });
                  }
                  newId = game.id;
                  window.history.replaceState(null, '', `/learn/playground/${newId}`);
                }
                setCreatedId(newId);
              } catch {
                // Can't create the project on the backend → no local fallback;
                // show the error and send the kid back to project creation.
                setLoadError('load');
                return;
              }
            }
            setPhase('generating');
          }}
        />
      )}
      {phase === 'generating' && (
        <GeneratingScreen
          prompt={prompt}
          projectId={projectId}
          mode={mode}
          onDone={async (f, ft, blocked) => {
            // The AI's first turn (if any) seeds the workspace chat history.
            setFirstTurn(ft);
            // A safety-refused build → seed the chat with an explanation + gentler ideas.
            setBlockedSeed(!!blocked);
            // Load the project (PRD J9): for a REAL project the backend is the
            // source of truth — `loadPersisted` reads its saved versioned VFS (and
            // falls back to the offline cache); for a project-less session it's the cache.
            // `f` (from GeneratingScreen) is the scaffold fallback when neither
            // exists. Restoring the saved VFS means a reload never reopens the
            // scaffold.
            const persisted = await loadPersisted(persistKey, projectId);
            const project = useProjectStore.getState();
            const history = useHistoryStore.getState();
            if (persisted && persisted.files.length > 0) {
              versionRef.current = persisted.version;
              // Loaded assets already live in S3 at their path → reference, don't re-upload.
              syncedAssetsRef.current = assetPathSet(persisted.files);
              project.hydrate(persisted.files, persisted.folders);
              if (persisted.checkpoints.length > 0) {
                history.hydrate(persisted.checkpoints);
              } else {
                history.reset();
                history.record(persisted.files, Date.now(), 'Initial version');
              }
              setSaveStatus('saved');
            } else {
              versionRef.current = 0;
              syncedAssetsRef.current = assetPathSet(f);
              project.setFiles(f);
              history.reset();
              history.record(f, Date.now(), 'Initial version');
              setSaveStatus('idle');
            }
            // Restore the saved workspace UI (open tabs, sidebar, layout mode,
            // window positions/status, asset + runner selections, theme) so the
            // studio reopens exactly where the kid left it. MUST run before the
            // workspace (and its panes) mount so their persisted slices seed. Only
            // for a REAL project (resume); a project-less session is transient → reset
            // to defaults and never persist, so each session/e2e starts clean.
            if (projectId) {
              const ui = await loadWorkspaceUi(persistKey);
              useWorkspaceUiStore.getState().restore(ui);
              const pg = ui?.slices?.playground as PlaygroundSnapshot | undefined;
              if (pg) usePlaygroundStore.getState().restore(pg);
              // Restore the saved conversation (J9) so the chat reopens with the
              // real log. On a fresh first turn (`ft`) the seed wins instead — the
              // hook prefers a non-empty restored history but `ft` seeds the first
              // build before any history exists.
              if (!ft) setInitialChat((await loadChatHistory(persistKey)) ?? undefined);
            } else {
              useWorkspaceUiStore.getState().restore(null);
            }
            // Auto-run on entering the workspace so the FIRST build plays (and
            // gets verified) without the kid pressing ▶ (D-PAP-40). The initial
            // turn's id isn't threaded through the generating flow — the
            // verification hook's resume-verify (GET …/code/verify-state) picks
            // the pending turn up on workspace mount instead.
            run();
            setPhase('workspace');
          }}
          onError={(kind) => setLoadError(kind)}
        />
      )}
      {readOnly && !readOnlyReady && (
        <div className="pg-canvas flex h-full items-center justify-center text-pg-text-dim">
          <span className="text-[15px] font-bold">Loading…</span>
        </div>
      )}
      {phase === 'workspace' && (readOnly ? readOnlyReady : true) && (
        <div ref={workspaceRef} className="h-full min-h-0 w-full">
        <Workspace
          files={files}
          runKey={runKey}
          running={running}
          engine={engine}
          onEngineChange={setEngine}
          onApplyFiles={applyTurnFiles}
          onSaveNow={flushSave}
          onRun={run}
          prompt={prompt}
          firstTurn={firstTurn}
          initialChat={initialChat}
          onChatChange={persistChat}
          blockedSeed={blockedSeed}
          // Only a real OWNED project (the authed route param, or the id created
          // on submit) runs server-side AI turns. A project-less session keeps the
          // offline stub turn so the debug/warn specs stay deterministic and
          // LLM-free.
          projectId={ownedProjectId}
          // Teacher live viewer — gate every mutation entry point (D-LV-6).
          readOnly={readOnly}
        />
        </div>
      )}

      {blocker.state === 'blocked' && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 p-4"
          style={{ zIndex: topZ + 100 }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-pg-border bg-pg-surface p-5 text-pg-text shadow-2xl"
          >
            <h2 className="text-[17px] font-extrabold text-pg-text">Leave the game studio?</h2>
            <p className="mt-2 text-[13.5px] text-pg-text-dim">
              Your game is saved on this device, so it&apos;ll be here when you come back — but
              you&apos;ll leave the editor now.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                disabled={leaving}
                onClick={() => blocker.reset?.()}
                className="rounded-lg border border-pg-border px-4 py-2 text-[13px] font-bold transition-colors hover:bg-pg-text/5 disabled:opacity-50"
              >
                Keep building
              </button>
              <button
                type="button"
                disabled={leaving}
                onClick={handleLeave}
                className="rounded-lg bg-brand-coral px-4 py-2 text-[13px] font-extrabold text-white disabled:opacity-70"
              >
                {leaving ? 'Saving…' : 'Leave'}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

// Shown when a real project can't be opened — there is no scaffold fallback, so
// the kid heads back to project creation. `variant` picks the copy: `'load'` =
// the project's files couldn't be loaded/created; `'service'` = the AI/safety
// service was unavailable (outage or unconfigured LLM) — a general, content-blind
// "try again later" error, never implying the kid's idea was the problem.
function LoadErrorScreen({
  variant,
  onBack,
}: {
  variant: 'load' | 'service';
  // Omitted when hosted embedded (e.g. teacher prep) — the host banner carries
  // Back, and routing a `user` principal into `/learn/*` would strand them.
  onBack?: () => void;
}) {
  const copy =
    variant === 'service'
      ? {
          title: 'Something went wrong',
          body:
            "We couldn't start your game just now — our game studio is having a moment. " +
            'Please try again in a little while.',
        }
      : {
          title: "We couldn't open this game",
          body:
            'It may have been removed, or there was a problem loading it. ' +
            "Let's head back so you can make or pick another one.",
        };
  return (
    <div
      data-testid={`playground-error-${variant}`}
      className="pg-canvas flex h-full flex-col items-center justify-center gap-5 px-6 text-center text-pg-text"
    >
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-wash-coral text-brand-coral">
        <AlertTriangle size={30} />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-[20px] font-extrabold">{copy.title}</h1>
        <p className="max-w-sm text-[14px] text-pg-text-dim">{copy.body}</p>
      </div>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl bg-brand-coral px-5 py-2.5 text-[14px] font-extrabold text-white"
        >
          {variant === 'service' ? 'Try again' : 'Make something new'}
        </button>
      )}
    </div>
  );
}
