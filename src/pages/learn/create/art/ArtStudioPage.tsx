import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, type ApiError } from '@/lib/api';
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
const BRUSH_SIZES = [
  { id: 6, label: 'S' },
  { id: 14, label: 'M' },
  { id: 28, label: 'L' },
];
const TOOLS: { id: ToolId; emoji: string; label: string }[] = [
  { id: 'pencil', emoji: '✏️', label: 'Pencil' },
  { id: 'crayon', emoji: '🖍️', label: 'Crayon' },
  { id: 'marker', emoji: '🖊️', label: 'Marker' },
  { id: 'eraser', emoji: '🧽', label: 'Eraser' },
  { id: 'fill', emoji: '🪣', label: 'Fill' },
  { id: 'stamp', emoji: '⭐', label: 'Stamp' },
];
const STAMPS = ['⭐', '❤️', '🌸', '⚡', '🌈', '🎈'];

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

  // takes + magic
  const [takes, setTakes] = useState<Take[]>([]);
  const [sketchTakeId, setSketchTakeId] = useState<string | null>(null);
  const [magicOpen, setMagicOpen] = useState(false);
  const [magicStyle, setMagicStyle] = useState<PlanStyle>('cartoon');
  const [magicDesc, setMagicDesc] = useState('');

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
  const [missionProjectId, setMissionProjectId] = useState<string | null>(null);
  const [missionDone, setMissionDone] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

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
    if (!wish || !baseArtifactId || maskOps.length === 0 || generate.isPending) return;
    setError(null);
    const mask = exportMask(maskOps).split(',')[1];
    void ensureSaveProject().then((projectId) =>
      generate.mutate(
        {
          prompt: wish,
          options: { size: 'square' },
          project_id: projectId,
          ref_artifact_id: baseArtifactId,
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
            }
            setMaskOps([]);
            setMaskText('');
            setMaskMode(false);
          },
          onError: (e) => setError(friendlyError(e)),
        },
      ),
    );
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
        },
        onError: (e) => setError(friendlyError(e)),
      },
    );
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
    return api<{ id: string }>(`/projects/${bucketId}/artifacts`, {
      method: 'POST',
      body: {
        kind: 'image',
        s3_key: sign.s3_key,
        mime_type: 'image/png',
        size_bytes: blob.size,
        metadata: { source: 'canvas-sketch' },
      },
    });
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
      const prompt = `${magicDesc.trim() || 'my drawing'}, ${magicStyle} style`;
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
    setOps([]);
  };

  const artifactById = (id: string | null): Artifact | undefined =>
    id ? bucketArtifacts.data?.find((a) => a.id === id) : undefined;

  const baseUrl = useSignedUrl(artifactById(baseArtifactId));
  const ghostUrlResolved = useSignedUrl(artifactById(ghostArtifactId));
  const sketchUrl = useSignedUrl(artifactById(sketchTakeId));

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
        {/* left tool rail */}
        <div className="flex flex-col gap-1.5 py-1" data-testid="tool-rail">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              aria-label={t.label}
              onClick={() => setTool(t.id)}
              className={`w-11 h-11 rounded-2xl text-[20px] transition-colors ${
                tool === t.id ? 'bg-grad-bubblegum shadow-brand-bubblegum' : 'bg-surface'
              }`}
            >
              {t.id === 'stamp' ? stampEmoji : t.emoji}
            </button>
          ))}
          <button
            aria-label="Undo"
            onClick={() => setOps(ops.slice(0, -1))}
            disabled={!hasInk}
            className="w-11 h-11 rounded-2xl text-[20px] bg-surface disabled:opacity-40"
          >
            ↩️
          </button>
          <div className="mt-1 flex flex-col gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                aria-label={`color ${c}`}
                onClick={() => setColor(c)}
                className={`w-8 h-8 mx-auto rounded-full border-2 ${
                  color === c ? 'border-ink scale-110' : 'border-black/10'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="mt-1 flex flex-col gap-1">
            {BRUSH_SIZES.map((b) => (
              <button
                key={b.id}
                onClick={() => setBrushSize(b.id)}
                className={`w-8 h-8 mx-auto rounded-full text-[11px] font-bold ${
                  brushSize === b.id ? 'bg-grad-bubblegum text-white' : 'bg-surface text-ink-soft'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
          {tool === 'stamp' && (
            <div className="mt-1 flex flex-col gap-1">
              {STAMPS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStampEmoji(s)}
                  className={`w-8 h-8 mx-auto rounded-xl text-[16px] ${
                    stampEmoji === s ? 'bg-wash-bubblegum' : ''
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
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
              baseImageUrl={baseUrl ?? (template?.layer === 'base' ? template.url : null)}
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
          {baseArtifactId && (
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
            className="w-[260px] shrink-0 card-base p-3 flex flex-col min-h-0"
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
            <div className="flex gap-1.5 mb-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendToCoach(draft)}
                placeholder="A friendly robot in space"
                className="input-k12 flex-1 text-[13px]"
              />
              <button
                onClick={() => sendToCoach(draft)}
                disabled={coach.isPending || !draft.trim()}
                className="btn-pill-secondary text-[12px] whitespace-nowrap"
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

      {/* bottom takes film-strip */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto" data-testid="takes-strip">
        <span className="text-[12px] text-ink-soft shrink-0">🎞</span>
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
          onClick={() => {
            setOps([]);
            setBaseArtifactId(null);
            setGhostArtifactId(null);
            setSketchTakeId(null);
            setTakes([]);
            setLastLook(null);
          }}
          className="shrink-0 rounded-xl border-2 border-dashed border-ink-soft/40 px-3 py-2 text-[12px] font-bold text-ink-soft"
        >
          ＋ new picture
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
