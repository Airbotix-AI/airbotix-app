import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type ApiError } from '@/lib/api';
import { useMe } from '@/auth/useAuth';
import { Celebration } from '../shared/Celebration';
import { SessionSummary } from '../shared/SessionSummary';
import { useStudioSession } from '../shared/useSession';
import {
  friendlyError,
  useArtifactUrl,
  useBucketArtifacts,
  useCreateBucket,
  useGenerate,
  useKidWallet,
  type Artifact,
} from '../shared/useStudio';
import { ArtCanvas, type ArtCanvasHandle } from './ArtCanvas';
import { dataUrlToBlob, exportMask, type CanvasOp, type ToolId } from './strokeEngine';
import { fetchArtifactBlob, useArtifactBlobUrl } from './artifactBytes';
import { removeWhiteBackground } from './matting';

// The Art Studio, canvas-first (image-studio-prd.md v0.9, D-IS-11…19):
// 孩子的手在前,AI 的魔法在后. Four zones — left tool rail / center canvas /
// right AI coach rail / bottom takes film-strip. AI fires only when the kid
// presses an ignition button (D-IS-18): 👻 ghost sketch (2★) · 👀 coach look
// (1★) · ✨ bring-to-life (9★, the kid's own sketch as the ref). Magic results
// arrive as new takes and NEVER replace the sketch (D-IS-19).

// Must match backend charges (pricing.ts: ghost-sketch 2★, kids-default 1★,
// image tier 9★) — rules/ai-star-billing.md.
const MAGIC_COST = 9;
const GHOST_COST = 2;
const CHAT_COST = 1;

// Masked edits (D-ISF-5): gpt-image /images/edits expects the prompt to describe
// the desired full picture — a bare noun is frequently ignored. The kid's words
// ride verbatim inside the template.
const maskWishPrompt = (wish: string): string =>
  `Same picture, keep everything outside the highlighted region unchanged; the highlighted region becomes: ${wish}`;

const STYLES = ['cartoon', 'painting', 'pixel-art', 'photo', 'sketch', 'watercolor'] as const;
type PlanStyle = (typeof STYLES)[number];

const COLORS = [
  '#1f2437',
  '#e94f64',
  '#f78f3f',
  '#ffd44d',
  '#59c98d',
  '#3fa7e9',
  '#7a5cf0',
  '#f277c3',
  '#8b5a2b',
  '#ffffff',
];
// Sizes render as PREVIEW DOTS in the current ink colour (owner feedback
// 2026-07-20: floating "S M L" letters read as unrelated buttons) — the dot IS
// the stroke width the kid will get. Stamps scale off the same size (×8).
const BRUSH_SIZES = [
  { id: 6, label: 'S', dot: 'h-1.5 w-1.5' },
  { id: 14, label: 'M', dot: 'h-2.5 w-2.5' },
  { id: 28, label: 'L', dot: 'h-4 w-4' },
];
const TOOLS: { id: ToolId; emoji: string; label: string }[] = [
  { id: 'pencil', emoji: '✏️', label: 'Pencil' },
  { id: 'crayon', emoji: '🖍️', label: 'Crayon' },
  { id: 'marker', emoji: '🖊️', label: 'Marker' },
  { id: 'eraser', emoji: '🧽', label: 'Eraser' },
  { id: 'fill', emoji: '🪣', label: 'Fill' },
  { id: 'stamp', emoji: '⭐', label: 'Stamp' },
];
// one row per theme: originals · sky/weather · nature · treats · fun/fantasy
// prettier-ignore
const STAMPS = [
  '⭐', '❤️', '🌸', '⚡', '🌈', '🎈',
  '☀️', '🌙', '☁️', '❄️', '🔥', '💧',
  '🍀', '🍄', '🍓', '🧁', '⚽', '🎵',
  '👑', '💎', '🚀', '🦄', '🦖', '🦋',
];

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}
interface PlanTurn {
  reply: string;
  chips: string[];
  plan: { prompt: string; style: string; size: string } | null;
  stars_charged: number;
  balance_after: number;
}
interface Take {
  artifactId: string;
  kind: 'sketch' | 'magic' | 'ghost';
  label: string;
}

// Mission Mode (image-studio-prd D-IS-20/22): the studio opened from a course
// task. Passed via router state by PackLessonsPage; the template config rides
// the mission's steps_json.art.
export interface ArtMissionTemplate {
  url: string;
  layer: 'underlay' | 'base';
  magic?: 'with-base' | 'strokes-only';
}
export interface ArtMission {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  template?: ArtMissionTemplate;
  /** Draw-along steps (D-IS-21): each step can summon its own 2★ ghost. */
  draw_along?: string[];
  /** Element checklist (D-IS-20): grounds the 👀 look in the task. */
  checklist?: string[];
}

export function ArtStudioPage() {
  // canvas state
  const canvasRef = useRef<ArtCanvasHandle | null>(null);
  const [ops, setOps] = useState<CanvasOp[]>([]);
  const [tool, setTool] = useState<ToolId>('pencil');
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(14);
  const [stampEmoji, setStampEmoji] = useState(STAMPS[0]);
  const [baseArtifactId, setBaseArtifactId] = useState<string | null>(null);
  const [ghostArtifactId, setGhostArtifactId] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [maskMode, setMaskMode] = useState(false);
  const [maskOps, setMaskOps] = useState<CanvasOp[]>([]);
  const [maskText, setMaskText] = useState('');
  const [charName, setCharName] = useState('');
  const [charOpen, setCharOpen] = useState(false);
  const [gameOpen, setGameOpen] = useState(false);
  // 🎮 hand-off matting (D-ISF-6): ON by default — sprites want the white
  // paper gone; the kid can keep it for a full-scene background.
  const [gameTransparent, setGameTransparent] = useState(true);

  // takes + magic
  const [takes, setTakes] = useState<Take[]>([]);
  const [sketchTakeId, setSketchTakeId] = useState<string | null>(null);
  const [magicOpen, setMagicOpen] = useState(false);
  const [magicStyle, setMagicStyle] = useState<PlanStyle>('cartoon');
  const [magicDesc, setMagicDesc] = useState('');
  // The coach's distilled plan (D-ISF-3): what the kid and the coach agreed the
  // picture should be. Feeds ✨ when the kid doesn't type an explicit wish.
  const [plan, setPlan] = useState<PlanTurn['plan']>(null);

  // coach
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [chips, setChips] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [lastLook, setLastLook] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const location = useLocation();
  const mission = ((location.state as { mission?: ArtMission } | null)?.mission ?? null);
  // Reopen a saved picture to keep drawing (owner: "重新打开到画布继续画"): the
  // "🎨 Keep drawing" button in My Pictures passes the artifact's id + project. It
  // becomes the canvas BASE (loaded directly by id+project, so it works for a
  // picture in ANY project) and the ✨ bring-to-life remix ref.
  const reopenState = location.state as { editArtifactId?: string; editProjectId?: string } | null;
  const navReopen =
    reopenState?.editArtifactId && reopenState?.editProjectId
      ? { id: reopenState.editArtifactId, projectId: reopenState.editProjectId }
      : null;
  // A base picture that is NOT a bucket take (a reopened saved image). Kept in
  // state (and the draft) so a refresh restores it, not just the strokes.
  const [baseRef, setBaseRef] = useState<{ id: string; projectId: string } | null>(navReopen);
  // Whether THIS mount arrived via Keep drawing (fresh reopen) — captured once so
  // the hydrate effect can start clean on the chosen picture instead of restoring
  // a stale draft over it.
  const navReopenRef = useRef(navReopen);
  const [missionProjectId, setMissionProjectId] = useState<string | null>(null);
  const [missionDone, setMissionDone] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  const me = useMe();
  const { summary, endNow, dismiss } = useStudioSession('image');
  const bucket = useCreateBucket('image');
  const wallet = useKidWallet();
  const generate = useGenerate('image', bucket.data?.project_id);
  const bucketArtifacts = useBucketArtifacts(bucket.data?.project_id);
  const qc = useQueryClient();

  const coach = useMutation<PlanTurn, ApiError, { messages: ChatMsg[]; canvas_b64?: string }>({
    mutationFn: (body) =>
      api<PlanTurn>('/llm/image-plan', {
        method: 'POST',
        body: { ...body, messages: body.messages.slice(-15) },
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['wallet'] }),
  });

  const hasInk = ops.length > 0;

  // ── Draft auto-save (owner: auto-save must ALWAYS work, incl. reopened edits) ──
  // The working canvas AND which picture it's built on live only in React state,
  // so a refresh lost them. Persist { ops, baseArtifactId, baseRef } to
  // localStorage keyed by the bucket and restore on return — EVERY mode, not just
  // free-play. Only missions (their own project/flow) opt out.
  const draftKey = mission || !bucket.data ? null : `art-draft:v1:${bucket.data.project_id}`;
  // `hydrated` sequences the two effects: restore reads the draft first and only
  // THEN does auto-save arm. Without it the mount render (empty canvas) races the
  // restore and wipes the very draft we're about to load. Functional setState
  // keeps restore idempotent, so StrictMode's double-invoke is harmless.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!draftKey) return;
    // A fresh reopen starts clean on the chosen picture and REPLACES any stale
    // draft — never restore old strokes onto a newly opened image.
    if (!navReopenRef.current) {
      try {
        const raw = localStorage.getItem(draftKey);
        if (raw) {
          const d = JSON.parse(raw) as {
            ops?: CanvasOp[];
            baseArtifactId?: string | null;
            baseRef?: { id: string; projectId: string } | null;
          };
          if (Array.isArray(d.ops) && d.ops.length > 0) setOps((cur) => (cur.length ? cur : d.ops!));
          if (d.baseArtifactId) setBaseArtifactId((cur) => cur ?? d.baseArtifactId!);
          if (d.baseRef) setBaseRef((cur) => cur ?? d.baseRef!);
        }
      } catch {
        /* corrupt/unavailable draft — start clean */
      }
    }
    setHydrated(true);
  }, [draftKey]);
  useEffect(() => {
    if (!draftKey || !hydrated) return;
    try {
      if (ops.length === 0 && !baseArtifactId && !baseRef) localStorage.removeItem(draftKey);
      else localStorage.setItem(draftKey, JSON.stringify({ ops, baseArtifactId, baseRef }));
    } catch {
      /* quota/unavailable — the work still lives in state */
    }
  }, [ops, baseArtifactId, baseRef, draftKey, hydrated]);

  // A reopened picture drives the canvas base + remix ref (mask-brush,
  // bring-to-life). Bucket takes set baseArtifactId directly and clear baseRef.
  useEffect(() => {
    if (baseRef) setBaseArtifactId((cur) => cur ?? baseRef.id);
  }, [baseRef]);

  // Mission Mode: work saves to a mission-linked project (teacher-visible via
  // the existing chain) instead of the free-play bucket (D-IS-20). Created
  // lazily on the first paid action.
  const ensureSaveProject = async (): Promise<string> => {
    if (!mission) return (bucket.data as { project_id: string }).project_id;
    if (missionProjectId) return missionProjectId;
    const project = await api<{ id: string }>('/projects', {
      method: 'POST',
      body: { title: mission.title, product_line: 'line_a_creative', mission_id: mission.id },
    });
    setMissionProjectId(project.id);
    return project.id;
  };

  const template = mission?.template ?? null;
  const exportIncludesBase = template?.magic !== 'strokes-only';

  // The coach produced a plan → remember it and pre-select its style, so the ✨
  // magic prompt finally says what the kid MEANT (D-ISF-3 — the plan used to be
  // returned by /llm/image-plan and then thrown away).
  const acceptPlan = (turn: PlanTurn) => {
    if (!turn.plan) return;
    setPlan(turn.plan);
    if ((STYLES as readonly string[]).includes(turn.plan.style)) {
      setMagicStyle(turn.plan.style as PlanStyle);
    }
  };

  // ── coach chat (sidekick — D-IS-15) ──
  const sendToCoach = (text: string) => {
    const idea = text.trim();
    if (!idea || coach.isPending) return;
    setError(null);
    setDraft('');
    const next = [...msgs, { role: 'user' as const, content: idea.slice(0, 500) }];
    setMsgs(next);
    setChips([]);
    coach.mutate(
      { messages: next },
      {
        onSuccess: (turn) => {
          setMsgs([...next, { role: 'assistant', content: turn.reply }]);
          setChips(turn.chips);
          acceptPlan(turn);
        },
        onError: (e) => setError(friendlyError(e)),
      },
    );
  };

  // ── ① 👻 ghost sketch (2★): faint trace-me underlay ──
  const onGhost = () => {
    const idea = (draft || msgs.filter((m) => m.role === 'user').at(-1)?.content || '').trim();
    if (!idea) {
      setError('Tell the coach what to sketch first — type an idea below.');
      return;
    }
    setError(null);
    void ensureSaveProject().then((projectId) =>
      generate.mutate(
        { prompt: idea, options: { mode: 'ghost' }, project_id: projectId },
        {
        onSuccess: (r) => {
          if (r.artifact_id) setGhostArtifactId(r.artifact_id);
          setMsgs((m) => [
            ...m,
            { role: 'assistant', content: '👻 I sketched a faint outline — trace it your way!' },
          ]);
        },
          onError: (e) => setError(friendlyError(e)),
        },
      ),
    );
  };

  // Draw-along (D-IS-21): each step summons its own ghost underlay.
  const onStepGhost = () => {
    const steps = mission?.draw_along;
    if (!steps?.length) return;
    setError(null);
    void ensureSaveProject().then((projectId) =>
      generate.mutate(
        {
          prompt: `${steps[stepIdx]} — part of: ${mission!.title}`,
          options: { mode: 'ghost' },
          project_id: projectId,
        },
        {
          onSuccess: (r) => {
            if (r.artifact_id) setGhostArtifactId(r.artifact_id);
          },
          onError: (e) => setError(friendlyError(e)),
        },
      ),
    );
  };

  // ── ⑤ 📖 story time (1★): a tiny story + name for the picture (D-IS-18 ⑤) ──
  const onStory = () => {
    if (!canvasRef.current) return;
    setError(null);
    const b64 = canvasRef.current.exportPng(0.5).split(',')[1];
    const next = [
      ...msgs,
      {
        role: 'user' as const,
        content: 'Tell me a tiny three-sentence story about this picture, then suggest a fun name for it!',
      },
    ];
    setMsgs(next);
    coach.mutate(
      { messages: next, canvas_b64: b64 },
      {
        onSuccess: (turn) => {
          setMsgs([...next, { role: 'assistant', content: turn.reply }]);
          setChips(turn.chips);
        },
        onError: (e) => setError(friendlyError(e)),
      },
    );
  };

  // ── ④ 🪄 magic brush (D-IS-18 ④): change ONLY the highlighted region ──
  const onMaskApply = () => {
    const wish = maskText.trim();
    if (!wish || maskOps.length === 0 || generate.isPending) return;
    if (!baseArtifactId && !hasInk) return;
    setError(null);
    const mask = exportMask(maskOps).split(',')[1];
    void ensureSaveProject()
      .then(async (projectId) => {
        // A raw hand-drawing has no base artifact yet — snapshot the canvas as
        // the reference first (free, the same upload ✨ does), so region-replace
        // works on a plain sketch too (D-ISF-4: the horse→cow case).
        let refId = baseArtifactId;
        const isRawSketch = !refId;
        if (!refId) {
          const sketch = await uploadCanvas(projectId);
          refId = sketch.id;
          setSketchTakeId((prev) => prev ?? sketch.id);
          setTakes((t) => [...t, { artifactId: sketch.id, kind: 'sketch', label: '✏️ my sketch' }]);
          void qc.invalidateQueries({ queryKey: ['bucket-artifacts', bucket.data?.project_id] });
        }
        generate.mutate(
          {
            // The edits contract wants the FULL desired picture described — a
            // bare wish ("a cow") is often ignored (D-ISF-5).
            prompt: maskWishPrompt(wish),
            options: { size: 'square' },
            project_id: projectId,
            ref_artifact_id: refId,
            mask_b64: mask,
          },
          {
            onSuccess: (r) => {
              setCelebrate(true);
              if (r.artifact_id) {
                setTakes((t) => [
                  ...t,
                  { artifactId: r.artifact_id as string, kind: 'magic', label: '🪄 magic brush' },
                ]);
                setBaseArtifactId(r.artifact_id);
                setBaseRef(null); // the take (a bucket artifact) is the new base
                // The raw sketch's strokes ARE the reference — clear them so
                // they don't re-draw over the result (the sketch stays a take).
                if (isRawSketch) setOps([]);
              }
              setMaskOps([]);
              setMaskText('');
              setMaskMode(false);
            },
            onError: (e) => setError(friendlyError(e)),
          },
        );
      })
      .catch((e) => setError(friendlyError(e)));
  };

  // ── 👤 My Characters (D-IS-23): save the active take as a named character ──
  const onSaveCharacter = () => {
    const name = charName.trim().slice(0, 40);
    if (!name || !baseArtifactId) return;
    const art = artifactById(baseArtifactId);
    if (!art) return;
    setError(null);
    void api(`/projects/${art.project_id}/artifacts/${art.id}`, {
      method: 'PATCH',
      body: { metadata: { character: name } },
    })
      .then(() => {
        setCharName('');
        void qc.invalidateQueries({ queryKey: ['bucket-artifacts', art.project_id] });
        setMsgs((m) => [
          ...m,
          { role: 'assistant', content: `👤 ${name} joined your characters! Use them any time.` },
        ]);
      })
      .catch((e) => setError(friendlyError(e)));
  };

  const characters = (bucketArtifacts.data ?? []).filter(
    (a) => typeof (a.metadata as { character?: string }).character === 'string',
  );

  const pickCharacter = (a: Artifact) => {
    setBaseArtifactId(a.id);
    setBaseRef(null);
    setOps([]);
    setCharOpen(false);
    const name = (a.metadata as { character?: string }).character ?? 'your character';
    setMsgs((m) => [
      ...m,
      { role: 'assistant', content: `👤 ${name} is on the canvas — draw their next adventure!` },
    ]);
  };

  // ── 🎮 Use in my game (P4 v1, D-IS-25): the take becomes a game VFS asset ──
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const gameProjects = useQuery<Array<{ id: string; title: string; kind: string }>>({
    queryKey: ['kid-projects-for-art', kidId],
    queryFn: async () => {
      const all = await api<Array<{ id: string; title: string; kind: string; deleted_at?: string | null }>>(
        `/kids/${kidId}/projects`,
      );
      return all.filter((p) => p.kind === 'game' || p.kind === 'code');
    },
    enabled: gameOpen && !!kidId,
  });

  const sendToGame = async (game: { id: string; title: string }) => {
    const art = artifactById(baseArtifactId);
    if (!art) return;
    setGameOpen(false);
    setError(null);
    try {
      let blob = await fetchArtifactBlob(art);
      // Art pictures are opaque by design (white ground; parent PRD v0.5) — a
      // game sprite wants the paper GONE. Default-on matting erases only the
      // edge-connected white, so white inside the drawing survives (D-ISF-6).
      if (gameTransparent) blob = await removeWhiteBackground(blob);
      const path = `assets/art/${(
        (art.metadata as { character?: string }).character ?? 'my-art'
      )
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}-${art.id.slice(-6)}.png`;
      const sign = await api<{ url: string; headers?: Record<string, string>; s3_key?: string }>(
        `/projects/${game.id}/vfs/assets/sign-upload`,
        { method: 'POST', body: { path, content_type: 'image/png', size_bytes: blob.size } },
      );
      const put = await fetch(sign.url, {
        method: 'PUT',
        headers: sign.headers ?? { 'Content-Type': 'image/png' },
        body: blob,
      });
      if (!put.ok) throw new Error(`upload ${put.status}`);
      const project = await api<{ vfs_version: number }>(`/projects/${game.id}`);
      await api(`/projects/${game.id}/code/files`, {
        method: 'PUT',
        body: {
          files: [{ path, uploaded: true }],
          expected_version: project.vfs_version,
        },
      });
      setMsgs((m) => [
        ...m,
        {
          role: 'assistant',
          content: `🎮 Sent to “${game.title}”! Find it under ${path} in that game's assets.`,
        },
      ]);
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  // ── ② 👀 coach look (1★): vision on the canvas ──
  const onLook = () => {
    if (!canvasRef.current) return;
    setError(null);
    const b64 = canvasRef.current.exportPng(0.5).split(',')[1];
    const ask = mission?.checklist?.length
      ? `Coach, look at my canvas! The task checklist: ${mission.checklist.join(', ')}. Tell me which ones you can see and what is still missing.`
      : 'Coach, look at my canvas!';
    const next = [...msgs, { role: 'user' as const, content: ask }];
    setMsgs(next);
    coach.mutate(
      { messages: next, canvas_b64: b64 },
      {
        onSuccess: (turn) => {
          setMsgs([...next, { role: 'assistant', content: turn.reply }]);
          setChips(turn.chips);
          setLastLook(turn.reply);
          acceptPlan(turn);
        },
        onError: (e) => setError(friendlyError(e)),
      },
    );
  };

  // The ops array whose pixels were last uploaded — identity comparison works
  // because every edit replaces the array. Lets "+ new picture" skip a duplicate
  // snapshot when nothing changed since the last save.
  const savedOpsRef = useRef<CanvasOp[] | null>(null);
  const [savingNew, setSavingNew] = useState(false);

  // "+ new picture" KEEPS the old artwork (owner: 原先的也保留): an unsaved
  // drawing is snapshotted into My Pictures before the canvas resets — this is
  // also the only save path for a drawing that never summoned the AI.
  const onNewPicture = async () => {
    if (savingNew) return;
    setError(null);
    if (hasInk && savedOpsRef.current !== ops) {
      setSavingNew(true);
      try {
        const projectId = await ensureSaveProject();
        await uploadCanvas(projectId);
        void qc.invalidateQueries({ queryKey: ['bucket-artifacts', bucket.data?.project_id] });
      } catch {
        setError("Couldn't save this picture — it stays on the canvas. Try again.");
        setSavingNew(false);
        return;
      }
      setSavingNew(false);
    }
    setOps([]);
    setBaseArtifactId(null);
    setBaseRef(null);
    setGhostArtifactId(null);
    setSketchTakeId(null);
    setTakes([]);
    setLastLook(null);
    setPlan(null);
    setMaskMode(false);
    setMaskOps([]);
  };

  // ── ③ ✨ bring to life (9★): upload the kid's canvas → ref-based magic ──
  const uploadCanvas = async (projectId: string): Promise<{ id: string }> => {
    const bucketId = projectId;
    const dataUrl = (canvasRef.current as ArtCanvasHandle).exportPng(1);
    const blob = dataUrlToBlob(dataUrl);
    const sign = await api<{ url: string; headers: Record<string, string>; s3_key: string }>(
      `/projects/${bucketId}/artifacts/upload-url`,
      { method: 'POST', body: { kind: 'image', mime_type: 'image/png', size_bytes: blob.size } },
    );
    await fetch(sign.url, { method: 'PUT', headers: sign.headers, body: blob });
    const artifact = await api<{ id: string }>(`/projects/${bucketId}/artifacts`, {
      method: 'POST',
      body: {
        kind: 'image',
        s3_key: sign.s3_key,
        mime_type: 'image/png',
        size_bytes: blob.size,
        metadata: { source: 'canvas-sketch' },
      },
    });
    savedOpsRef.current = ops;
    return artifact;
  };

  const onMagic = async () => {
    if (!bucket.data || generate.isPending) return;
    setError(null);
    setMagicOpen(false);
    try {
      const projectId = await ensureSaveProject();
      let refId: string | undefined;
      if (hasInk || baseArtifactId) {
        const sketch = await uploadCanvas(projectId);
        refId = sketch.id;
        setSketchTakeId((prev) => prev ?? sketch.id);
        setTakes((t) => [...t, { artifactId: sketch.id, kind: 'sketch', label: '✏️ my sketch' }]);
        void qc.invalidateQueries({ queryKey: ['bucket-artifacts', bucket.data.project_id] });
      }
      // Prompt precedence (D-ISF-3): the kid's explicit wish wins, else the
      // plan the coach distilled from the conversation, else the bare fallback.
      const prompt = `${magicDesc.trim() || plan?.prompt.trim() || 'my drawing'}, ${magicStyle} style`;
      generate.mutate(
        // No ink at all = the pure-generation on-ramp (D-IS-15 bypass).
        {
          prompt,
          options: { size: 'square' },
          project_id: projectId,
          ...(refId ? { ref_artifact_id: refId } : {}),
        },
        {
          onSuccess: (r) => {
            setCelebrate(true);
            if (r.artifact_id) {
              setTakes((t) => [
                ...t,
                { artifactId: r.artifact_id as string, kind: 'magic', label: '✨ magic' },
              ]);
              setBaseArtifactId(r.artifact_id);
              setBaseRef(null); // the magic take (a bucket artifact) is the new base
              setOps([]);
              setGhostArtifactId(null);
            }
          },
          onError: (e) => setError(friendlyError(e)),
        },
      );
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  // 🚀 Mission turn-in (D-IS-20): existing submit → acceptance → +3★ (D-M3).
  const onTurnIn = async () => {
    if (!missionProjectId) return;
    setError(null);
    try {
      const res = await api<{ ok: boolean; reason?: string; stars_awarded?: number }>(
        `/projects/${missionProjectId}/submit`,
        { method: 'POST' },
      );
      if (res.ok) {
        setMissionDone(true);
        setCelebrate(true);
        setMsgs((m) => [
          ...m,
          { role: 'assistant', content: '🚀 Mission complete! +3★ — your teacher can see it now.' },
        ]);
        void qc.invalidateQueries({ queryKey: ['wallet'] });
      } else {
        setMsgs((m) => [
          ...m,
          { role: 'assistant', content: `Almost! ${res.reason ?? 'Something is still missing.'}` },
        ]);
      }
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  const activateTake = (take: Take) => {
    setBaseArtifactId(take.artifactId);
    setBaseRef(null);
    setOps([]);
  };

  const artifactById = (id: string | null): Artifact | undefined =>
    id ? bucketArtifacts.data?.find((a) => a.id === id) : undefined;

  // Canvas pixels ride the SAME-ORIGIN bytes proxy (D-IS-24) — no S3-CORS taint
  // on export; thumbnails elsewhere keep signed URLs (display only).
  const baseUrl = useArtifactBlobUrl(artifactById(baseArtifactId));
  const ghostUrlResolved = useArtifactBlobUrl(artifactById(ghostArtifactId));
  const sketchUrl = useArtifactBlobUrl(artifactById(sketchTakeId));

  // Reopened picture pixels loaded DIRECTLY by id+project (owner: "keep drawing
  // 无法加载原始的图片"). It may live in ANY project, so `artifactById`
  // (bucket-only) can't resolve it — build the ref straight from baseRef, which is
  // restored from the draft on refresh so the base survives a reload too.
  const reopenArtifact: Artifact | undefined = baseRef
    ? {
        id: baseRef.id,
        project_id: baseRef.projectId,
        kind: 'image',
        s3_key: '',
        mime_type: 'image/png',
        size_bytes: 0,
        created_at: '',
        metadata: {},
      }
    : undefined;
  const reopenBaseUrl = useArtifactBlobUrl(reopenArtifact);

  return (
    <div className="h-dvh flex flex-col bg-canvas overflow-hidden" data-testid="art-studio">
      <Celebration show={celebrate} message="Your image is ready!" onDone={() => setCelebrate(false)} />

      {/* header */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <Link to="/learn/create" className="text-[13px] font-bold text-ink-soft hover:text-ink">
            ← All tools
          </Link>
          <span className="text-[16px] font-bold text-ink">🎨 Art Studio</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-bold text-brand-mint">
            {wallet.data ? `${wallet.data.stars_balance}★` : ''}
          </span>
          {bucket.data && (
            <Link
              to={`/learn/projects/${bucket.data.project_id}`}
              className="text-[12px] text-ink-soft underline"
            >
              🖼 {bucket.data.title}
            </Link>
          )}
          <button onClick={() => endNow()} className="btn-pill-secondary text-[12px]">
            🎓 Done
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mb-1 rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-2 text-[13px] font-medium text-ink">
          {error}
        </div>
      )}

      {/* main: tools / canvas / AI */}
      <div className="flex-1 flex min-h-0 gap-2 px-3 pb-1">
        {/* left tool rail — TWO columns (owner feedback 2026-07-20: one long
            column pushed colors/stickers off-screen). Column 1 = the tools;
            column 2 = only the PICKED tool's options: colors for anything that
            paints, sizes for anything with a width (stamps scale off brushSize
            too), and the sticker grid for the stamp tool. */}
        <div className="flex gap-2 py-1" data-testid="tool-rail">
          <div className="flex flex-col gap-1.5">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                aria-label={t.label}
                onClick={() => setTool(t.id)}
                className={`flex w-14 flex-col items-center gap-0.5 rounded-2xl py-1.5 transition-colors ${
                  tool === t.id ? 'bg-grad-bubblegum shadow-brand-bubblegum' : 'bg-surface'
                }`}
              >
                <span className="text-[20px] leading-none">
                  {t.id === 'stamp' ? stampEmoji : t.emoji}
                </span>
                <span
                  className={`text-[10px] font-bold leading-none ${
                    tool === t.id ? 'text-ink' : 'text-ink-soft'
                  }`}
                >
                  {t.label}
                </span>
              </button>
            ))}
            <button
              aria-label="Undo"
              onClick={() => setOps(ops.slice(0, -1))}
              disabled={!hasInk}
              className="flex w-14 flex-col items-center gap-0.5 rounded-2xl bg-surface py-1.5 disabled:opacity-40"
            >
              <span className="text-[20px] leading-none">↩️</span>
              <span className="text-[10px] font-bold leading-none text-ink-soft">Undo</span>
            </button>
          </div>
          <div
            className="flex w-[76px] flex-col gap-2 overflow-y-auto rounded-2xl bg-surface/60 p-1"
            data-testid="tool-options"
          >
            {/* "how big" sits at the TOP, right beside the tool the kid just
                picked — a dot previewing the exact stroke width in the current
                ink (grey for the eraser). */}
            {tool !== 'fill' && (
              <div className="flex items-center justify-around">
                {BRUSH_SIZES.map((b) => (
                  <button
                    key={b.id}
                    aria-label={`size ${b.label}`}
                    onClick={() => setBrushSize(b.id)}
                    className={`grid h-8 w-[22px] place-items-center rounded-lg ${
                      brushSize === b.id ? 'bg-wash-bubblegum ring-1 ring-brand-bubblegum' : ''
                    }`}
                  >
                    <span
                      className={`rounded-full border border-black/20 ${b.dot}`}
                      style={{ backgroundColor: tool === 'eraser' ? '#94a3b8' : color }}
                    />
                  </button>
                ))}
              </div>
            )}
            {tool === 'stamp' && (
              <div className="grid grid-cols-2 gap-1" data-testid="stamp-grid">
                {STAMPS.map((s) => (
                  <button
                    key={s}
                    aria-label={`sticker ${s}`}
                    onClick={() => setStampEmoji(s)}
                    className={`h-8 w-8 rounded-xl text-[16px] ${
                      stampEmoji === s ? 'bg-wash-bubblegum ring-2 ring-brand-bubblegum' : ''
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {tool !== 'eraser' && tool !== 'stamp' && (
              <div className="grid grid-cols-2 gap-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    aria-label={`color ${c}`}
                    onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-full border-2 ${
                      color === c ? 'border-ink scale-110' : 'border-black/10'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* canvas */}
        <div className="flex-1 min-w-0 flex items-center justify-center relative">
          <div className="h-full max-h-full aspect-square max-w-full">
            <ArtCanvas
              ref={canvasRef}
              ops={ops}
              onOpsChange={setOps}
              tool={tool}
              color={color}
              brushSize={brushSize}
              stampEmoji={stampEmoji}
              baseImageUrl={
                reopenBaseUrl ?? baseUrl ?? (template?.layer === 'base' ? template.url : null)
              }
              ghostUrl={ghostUrlResolved}
              templateUrl={template?.layer === 'underlay' ? template.url : null}
              exportIncludesBase={exportIncludesBase}
              compareUrl={comparing ? sketchUrl : null}
              maskMode={maskMode}
              maskOps={maskOps}
              onMaskOpsChange={setMaskOps}
            />
          </div>
          {ghostArtifactId && (
            <button
              onClick={() => setGhostArtifactId(null)}
              className="absolute top-2 left-2 rounded-full bg-surface px-3 py-1 text-[11px] font-bold text-ink-soft"
            >
              👻 hide the ghost ✕
            </button>
          )}
          {(baseArtifactId || hasInk) && (
            <button
              data-testid="mask-toggle"
              onClick={() => {
                setMaskMode((m) => !m);
                if (maskMode) setMaskOps([]);
              }}
              className={`absolute top-2 right-2 rounded-full px-3 py-1 text-[11px] font-bold ${
                maskMode ? 'bg-grad-bubblegum text-white' : 'bg-surface text-ink-soft'
              }`}
            >
              🪄 Magic brush
            </button>
          )}
          {baseArtifactId && sketchTakeId && (
            <button
              data-testid="hold-compare"
              onPointerDown={() => setComparing(true)}
              onPointerUp={() => setComparing(false)}
              onPointerLeave={() => setComparing(false)}
              className="absolute bottom-2 left-2 rounded-full bg-surface px-3 py-1 text-[11px] font-bold text-ink-soft"
            >
              👆 hold to see my sketch
            </button>
          )}
          {maskMode && (
            <div
              className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 items-center card-base px-3 py-2 w-[90%] max-w-[440px]"
              data-testid="mask-bar"
            >
              <input
                value={maskText}
                onChange={(e) => setMaskText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onMaskApply()}
                placeholder="Paint the spot, then say what it becomes…"
                className="input-k12 flex-1 text-[13px]"
              />
              <button
                onClick={onMaskApply}
                disabled={generate.isPending || !maskText.trim() || maskOps.length === 0}
                className="btn-pill-primary text-[13px] whitespace-nowrap"
              >
                🪄 −{MAGIC_COST}★
              </button>
            </div>
          )}
        </div>

        {/* right AI rail */}
        {aiOpen ? (
          <div
            className="w-[300px] shrink-0 card-base p-3 flex flex-col min-h-0"
            data-testid="ai-rail"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-bold text-ink">🤖 Coach</span>
              <button onClick={() => setAiOpen(false)} className="text-[12px] text-ink-soft">
                ✕
              </button>
            </div>
            {mission && (
              <div className="mb-2 rounded-2xl bg-wash-sunshine px-3 py-2" data-testid="mission-card">
                <div className="text-[12px] font-bold text-ink">🚀 {mission.title}</div>
                {mission.description && (
                  <p className="text-[11px] text-ink-soft mt-0.5">{mission.description}</p>
                )}
                {mission.draw_along && mission.draw_along.length > 0 && !missionDone && (
                  <div className="mt-2" data-testid="draw-along">
                    <div className="text-[11px] font-bold text-ink">
                      Step {stepIdx + 1}/{mission.draw_along.length}: {mission.draw_along[stepIdx]}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <button
                        onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                        disabled={stepIdx === 0}
                        className="rounded-full bg-surface px-2 py-1 text-[11px] font-bold disabled:opacity-40"
                      >
                        ←
                      </button>
                      <button
                        onClick={onStepGhost}
                        disabled={generate.isPending}
                        className="btn-pill-secondary flex-1 text-[11px]"
                      >
                        👻 Show this step −{GHOST_COST}★
                      </button>
                      <button
                        onClick={() =>
                          setStepIdx((i) => Math.min((mission.draw_along as string[]).length - 1, i + 1))
                        }
                        disabled={stepIdx >= mission.draw_along.length - 1}
                        className="rounded-full bg-surface px-2 py-1 text-[11px] font-bold disabled:opacity-40"
                      >
                        →
                      </button>
                    </div>
                  </div>
                )}
                {takes.some((t) => t.kind === 'magic') && !missionDone && (
                  <button
                    onClick={() => void onTurnIn()}
                    className="btn-pill-primary w-full mt-2 text-[12px]"
                  >
                    🚀 Turn it in! +3★
                  </button>
                )}
                {missionDone && (
                  <div className="text-[11px] font-bold text-brand-mint mt-1">✓ Complete! +3★</div>
                )}
              </div>
            )}
            <div className="flex-1 overflow-y-auto space-y-2 mb-2">
              <Bubble role="assistant" content="What should we paint today? Tell me your idea!" />
              {msgs.map((m, i) => (
                <Bubble key={i} role={m.role} content={m.content} />
              ))}
              {coach.isPending && <Bubble role="assistant" content="🎨 thinking…" />}
              {generate.isPending && <Bubble role="assistant" content="🖌 painting…" />}
            </div>
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {chips.map((c) => (
                  <button
                    key={c}
                    onClick={() => sendToCoach(c)}
                    className="rounded-full px-3 py-1.5 text-[12px] font-bold bg-wash-bubblegum text-ink"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
            <div className="mb-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  // Enter sends, Shift+Enter makes a new line (normal chat feel).
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendToCoach(draft);
                  }
                }}
                rows={3}
                placeholder="Tell the coach your idea… (e.g. a friendly robot in space). Shift+Enter for a new line."
                className="input-k12 w-full resize-y text-[14px] leading-snug min-h-[76px]"
              />
              <button
                onClick={() => sendToCoach(draft)}
                disabled={coach.isPending || !draft.trim()}
                className="btn-pill-secondary mt-1.5 w-full py-2.5 text-[13px]"
              >
                Send −{CHAT_COST}★
              </button>
            </div>
            <div className="space-y-1.5">
              <button
                onClick={onGhost}
                disabled={generate.isPending || !bucket.data}
                className="btn-pill-secondary w-full text-[13px]"
              >
                👻 Sketch it for me −{GHOST_COST}★
              </button>
              <button
                onClick={onLook}
                disabled={coach.isPending || !hasInk}
                className="btn-pill-secondary w-full text-[13px]"
              >
                👀 Coach, look! −{CHAT_COST}★
              </button>
              <button
                onClick={() => setMagicOpen(true)}
                disabled={generate.isPending || !bucket.data}
                className="btn-pill-primary w-full text-[14px]"
              >
                ✨ Bring it to life! −{MAGIC_COST}★
              </button>
              {takes.some((t) => t.kind === 'magic') && (
                <button
                  onClick={onStory}
                  disabled={coach.isPending}
                  className="btn-pill-secondary w-full text-[13px]"
                >
                  📖 Story time! −{CHAT_COST}★
                </button>
              )}
              {baseArtifactId && (
                <div className="flex gap-1.5" data-testid="character-save">
                  <input
                    value={charName}
                    onChange={(e) => setCharName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSaveCharacter()}
                    placeholder="Name them… (Sparky)"
                    className="input-k12 flex-1 text-[12px]"
                  />
                  <button
                    onClick={onSaveCharacter}
                    disabled={!charName.trim()}
                    className="btn-pill-secondary text-[12px] whitespace-nowrap"
                  >
                    👤 Save
                  </button>
                </div>
              )}
              {baseArtifactId && (
                <button
                  onClick={() => setGameOpen(true)}
                  className="btn-pill-secondary w-full text-[13px]"
                  data-testid="use-in-game"
                >
                  🎮 Use in my game
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAiOpen(true)}
            className="self-start mt-2 w-11 h-11 rounded-full bg-grad-bubblegum text-[20px] shadow-brand-bubblegum"
            aria-label="Open coach"
          >
            🤖
          </button>
        )}
      </div>

      {/* magic confirm sheet (the see-confirm beat, D-IS-18 ③) */}
      {magicOpen && (
        <div className="absolute inset-0 bg-black/30 flex items-end sm:items-center justify-center z-20">
          <div className="card-base w-full sm:w-[420px] m-3 p-4" data-testid="magic-sheet">
            <span className="sticker-bubblegum">✨ Bring it to life</span>
            {plan && (
              <p className="text-[13px] text-ink mt-2" data-testid="magic-plan">
                🗺 Coach's plan: “{plan.prompt}”
              </p>
            )}
            {lastLook ? (
              <p className="text-[13px] text-ink mt-2">🤖 Coach saw: “{lastLook}”</p>
            ) : hasInk ? (
              <p className="text-[13px] text-ink-soft mt-2">
                Tip: tap 👀 first so the coach paints what you MEANT.
              </p>
            ) : (
              <p className="text-[13px] text-ink-soft mt-2">
                Empty canvas — I'll paint straight from your words.
              </p>
            )}
            <input
              value={magicDesc}
              onChange={(e) => setMagicDesc(e.target.value)}
              placeholder="Say a mood or extra wish (optional)"
              className="input-k12 mt-2"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => setMagicStyle(s)}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${
                    magicStyle === s
                      ? 'bg-grad-bubblegum text-white'
                      : 'bg-surface text-ink-soft'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button onClick={() => void onMagic()} className="btn-pill-primary w-full mt-3">
              ✨ Make it! −{MAGIC_COST}★
            </button>
            <button
              onClick={() => setMagicOpen(false)}
              className="text-[12px] text-ink-soft underline mt-2"
            >
              ← keep drawing
            </button>
          </div>
        </div>
      )}

      {/* 👤 characters picker (D-IS-23) */}
      {charOpen && (
        <div className="absolute inset-0 bg-black/30 flex items-end sm:items-center justify-center z-20">
          <div className="card-base w-full sm:w-[420px] m-3 p-4" data-testid="characters-sheet">
            <span className="sticker-bubblegum">👤 My Characters</span>
            <div className="grid grid-cols-3 gap-3 mt-3">
              {characters.map((a) => (
                <CharacterTile key={a.id} artifact={a} onPick={() => pickCharacter(a)} />
              ))}
            </div>
            <button
              onClick={() => setCharOpen(false)}
              className="text-[12px] text-ink-soft underline mt-3"
            >
              ← back
            </button>
          </div>
        </div>
      )}

      {/* 🎮 pick a game (P4 v1, D-IS-25) */}
      {gameOpen && (
        <div className="absolute inset-0 bg-black/30 flex items-end sm:items-center justify-center z-20">
          <div className="card-base w-full sm:w-[420px] m-3 p-4" data-testid="game-sheet">
            <span className="sticker-bubblegum">🎮 Which game gets this art?</span>
            <label className="mt-2 flex items-center gap-2 text-[13px] text-ink">
              <input
                type="checkbox"
                data-testid="game-transparent"
                checked={gameTransparent}
                onChange={(e) => setGameTransparent(e.target.checked)}
              />
              ✂️ Remove the white background (best for characters)
            </label>
            {gameProjects.isLoading ? (
              <p className="lead-text mt-3">Loading…</p>
            ) : (gameProjects.data?.length ?? 0) === 0 ? (
              <p className="text-[13px] text-ink-soft mt-3">
                No games yet — make one in the Creative Code Studio first!
              </p>
            ) : (
              <div className="space-y-2 mt-3">
                {gameProjects.data!.slice(0, 8).map((g) => (
                  <button
                    key={g.id}
                    onClick={() => void sendToGame(g)}
                    className="w-full text-left rounded-2xl bg-surface px-4 py-3 text-[14px] font-bold text-ink hover:bg-wash-bubblegum"
                  >
                    {g.kind === 'game' ? '🎮' : '💻'} {g.title}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setGameOpen(false)}
              className="text-[12px] text-ink-soft underline mt-3"
            >
              ← back
            </button>
          </div>
        </div>
      )}

      {/* bottom takes film-strip */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto" data-testid="takes-strip">
        {/* Airbotix brand mark — the immersive page hides the Learn nav, so the
            brand rides the bottom bar exactly like the Music Stage's transport
            (owner call 2026-07-20: 左下角放 logo,跟其他 studio 一样). */}
        <div
          className="hidden shrink-0 items-center gap-2.5 min-[720px]:flex"
          data-testid="studio-brand"
        >
          <img
            src="/logo-black-horizontal.png"
            alt="Airbotix"
            draggable={false}
            className="h-6 w-auto select-none"
          />
          <span aria-hidden className="h-5 w-px bg-hairline" />
          <span className="text-[13px] font-bold text-slate2">Art Studio</span>
        </div>
        <span className="text-[12px] text-ink-soft shrink-0">🎞</span>
        {characters.length > 0 && (
          <button
            onClick={() => setCharOpen(true)}
            className="shrink-0 rounded-xl bg-wash-bubblegum px-3 py-2 text-[12px] font-bold text-ink"
            data-testid="characters-open"
          >
            👤 Characters ({characters.length})
          </button>
        )}
        {takes.map((t, i) => (
          <TakeThumb
            key={`${t.artifactId}-${i}`}
            take={t}
            active={t.artifactId === baseArtifactId}
            artifact={artifactById(t.artifactId)}
            onClick={() => activateTake(t)}
          />
        ))}
        <button
          onClick={() => void onNewPicture()}
          disabled={savingNew}
          className="shrink-0 rounded-xl border-2 border-dashed border-ink-soft/40 px-3 py-2 text-[12px] font-bold text-ink-soft disabled:opacity-50"
        >
          {savingNew ? '💾 saving…' : '＋ new picture'}
        </button>
      </div>
      {summary && <SessionSummary summary={summary} onClose={dismiss} />}
    </div>
  );
}

/** Signed URL for an artifact (null-safe hook wrapper). */
function useSignedUrl(artifact: Artifact | undefined): string | null {
  const url = useArtifactUrl(
    artifact ?? ({ id: 'none', project_id: 'none' } as Artifact),
    artifact !== undefined,
  );
  return artifact ? (url.data ?? null) : null;
}

function Bubble({ role, content }: ChatMsg) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[92%] rounded-2xl px-3 py-1.5 text-[13px] ${
          role === 'user' ? 'bg-grad-bubblegum text-white' : 'bg-surface text-ink'
        }`}
      >
        {content}
      </div>
    </div>
  );
}

function TakeThumb({
  take,
  active,
  artifact,
  onClick,
}: {
  take: Take;
  active: boolean;
  artifact: Artifact | undefined;
  onClick(): void;
}) {
  const url = useSignedUrl(artifact);
  return (
    <button
      onClick={onClick}
      data-testid="take-thumb"
      className={`shrink-0 w-16 rounded-xl overflow-hidden border-2 ${
        active ? 'border-brand-bubblegum' : 'border-black/10'
      }`}
      title={take.label}
    >
      <div className="w-16 h-12 bg-white">
        {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : null}
      </div>
      <div className="text-[10px] font-bold text-ink-soft truncate px-1">{take.label}</div>
    </button>
  );
}


function CharacterTile({ artifact, onPick }: { artifact: Artifact; onPick(): void }) {
  const url = useSignedUrl(artifact);
  const name = (artifact.metadata as { character?: string }).character ?? '';
  return (
    <button onClick={onPick} className="rounded-2xl overflow-hidden border-2 border-black/10">
      <div className="aspect-square bg-white">
        {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : null}
      </div>
      <div className="text-[12px] font-bold text-ink truncate px-1 py-1">{name}</div>
    </button>
  );
}
