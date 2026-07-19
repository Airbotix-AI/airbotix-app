import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, type ApiError } from '@/lib/api';
import { Celebration } from './shared/Celebration';
import { StudioChrome } from './shared/StudioChrome';
import { SessionSummary } from './shared/SessionSummary';
import { useStudioSession } from './shared/useSession';
import {
  friendlyError,
  useArtifactUrl,
  useBucketArtifacts,
  useCreateBucket,
  useGenerate,
  type Artifact,
} from './shared/useStudio';

// The Art Studio IS a conversation (image-studio-prd.md D-IS-7/8, owner call
// 2026-07-19: no form page — one chat stream). The coach plans with the kid
// (1★/turn), the paint plan appears as a card IN the stream, the finished
// picture lands as a message IN the stream, and changing it is just the next
// message. Past work lives in My Pictures (footer link) — no gallery grid here.

const STYLES = ['cartoon', 'painting', 'pixel-art', 'photo', 'sketch', 'watercolor'] as const;
type PlanStyle = (typeof STYLES)[number];
// Preset ids are mapped server-side to the dims the image models accept
// (imageGenOptions in platform-backend llm.service.ts) — keep both in sync.
const SIZES = [
  { id: 'square', label: 'Square', dims: '1024×1024' },
  { id: 'wide', label: 'Wide', dims: '1536×1024' },
  { id: 'tall', label: 'Tall', dims: '1024×1536' },
] as const;
type PlanSize = (typeof SIZES)[number]['id'];

// Must match the backend charges (pricing: image tier, kids-default text turn).
// Every AI invocation charges Stars (rules/ai-star-billing.md).
const COST = 8;
const CHAT_COST = 1;

const OPENING = 'What should we paint today? Tell me your idea!';
const SPARK_CHIPS = [
  'A friendly robot watering plants in space',
  'A cozy library with a sleeping cat',
  'A dragon flying over a glowing city',
  'Underwater jellyfish disco party',
];

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}
interface PaintPlan {
  prompt: string;
  style: PlanStyle;
  size: PlanSize;
}
interface PlanTurn {
  reply: string;
  chips: string[];
  plan: PaintPlan | null;
  stars_charged: number;
  balance_after: number;
}
type StreamItem =
  | { kind: 'msg'; role: 'user' | 'assistant'; content: string }
  | { kind: 'image'; artifactId: string; prompt: string };

export function ImageMakerPage() {
  const [stream, setStream] = useState<StreamItem[]>([]);
  const [chips, setChips] = useState<string[]>(SPARK_CHIPS);
  const [draft, setDraft] = useState('');
  const [plan, setPlan] = useState<PaintPlan | null>(null);
  const [latestImageId, setLatestImageId] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'chat' | 'change'>('chat');
  const [error, setError] = useState<string | null>(null);
  const [showCelebrate, setShowCelebrate] = useState(false);

  const { summary, endNow, dismiss } = useStudioSession('image');

  // Everything made here auto-saves into the kid's My Pictures bucket
  // (learn-create-studio-save-prd §5) — no bucket, no generation.
  const bucket = useCreateBucket('image');
  const generate = useGenerate('image', bucket.data?.project_id);
  const bucketArtifacts = useBucketArtifacts(bucket.data?.project_id);

  const qc = useQueryClient();
  const coach = useMutation<PlanTurn, ApiError, ChatMsg[]>({
    mutationFn: (messages) =>
      api<PlanTurn>('/llm/image-plan', { method: 'POST', body: { messages: messages.slice(-15) } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['wallet'] });
    },
  });

  const chatTranscript = (items: StreamItem[]): ChatMsg[] =>
    items.flatMap((i) => (i.kind === 'msg' ? [{ role: i.role, content: i.content }] : []));

  const sendToCoach = (text: string) => {
    const idea = text.trim();
    if (!idea || coach.isPending) return;
    setError(null);
    setDraft('');
    const next: StreamItem[] = [
      ...stream,
      { kind: 'msg', role: 'user', content: idea.slice(0, 500) },
    ];
    setStream(next);
    setChips([]);
    coach.mutate(chatTranscript(next), {
      onSuccess: (turn) => {
        setStream([...next, { kind: 'msg', role: 'assistant', content: turn.reply }]);
        setChips(turn.chips);
        if (turn.plan) setPlan(turn.plan);
      },
      onError: (e) => setError(friendlyError(e)),
    });
  };

  const sendChange = (text: string) => {
    const change = text.trim();
    if (!change || !latestImageId || generate.isPending) return;
    setError(null);
    setDraft('');
    const next: StreamItem[] = [...stream, { kind: 'msg', role: 'user', content: change }];
    setStream(next);
    generate.mutate(
      { prompt: change, options: { size: plan?.size ?? 'square' }, ref_artifact_id: latestImageId },
      {
        onSuccess: (r) => {
          setShowCelebrate(true);
          if (r.artifact_id) {
            setLatestImageId(r.artifact_id);
            setStream([...next, { kind: 'image', artifactId: r.artifact_id, prompt: change }]);
          }
        },
        onError: (e) => setError(friendlyError(e)),
      },
    );
  };

  const onSend = () =>
    inputMode === 'change' && latestImageId ? sendChange(draft) : sendToCoach(draft);

  // Escape hatch: paint straight from what the kid already said.
  const skipToPlan = () => {
    const said = chatTranscript(stream)
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join(', ');
    if (said) setPlan({ prompt: said, style: 'cartoon', size: 'square' });
  };

  const onMake = () => {
    if (!plan || !plan.prompt.trim()) return;
    setError(null);
    const fullPrompt = `${plan.prompt}, ${plan.style} style`;
    const size = plan.size;
    generate.mutate(
      { prompt: fullPrompt, options: { size } },
      {
        onSuccess: (r) => {
          setShowCelebrate(true);
          if (r.artifact_id) {
            const id = r.artifact_id;
            setLatestImageId(id);
            setInputMode('change');
            setStream((s) => [...s, { kind: 'image', artifactId: id, prompt: fullPrompt }]);
          }
          setPlan(null);
        },
        onError: (e) => setError(friendlyError(e)),
      },
    );
  };

  const kidHasSpoken = stream.some((i) => i.kind === 'msg' && i.role === 'user');
  const changeMode = inputMode === 'change' && latestImageId !== null;
  const sendCost = changeMode ? COST : CHAT_COST;

  return (
    <StudioChrome
      eyebrow="Art Studio"
      eyebrowColor="eyebrow-bubblegum"
      emoji="🎨"
      title="Art Studio"
      subtitle="Talk with your art coach — plan it, paint it, change it. All in one conversation."
      cost={COST}
    >
      <Celebration
        show={showCelebrate}
        message="Your image is ready!"
        onDone={() => setShowCelebrate(false)}
      />

      <div className="card-base mb-4">
        {/* ── the one conversation ── */}
        <div className="space-y-3 mb-4">
          <ChatBubble role="assistant" content={OPENING} />
          {stream.map((item, i) =>
            item.kind === 'msg' ? (
              <ChatBubble key={i} role={item.role} content={item.content} />
            ) : (
              <ImageBubble
                key={i}
                artifactId={item.artifactId}
                prompt={item.prompt}
                artifacts={bucketArtifacts.data}
              />
            ),
          )}
          {coach.isPending && <ChatBubble role="assistant" content="🎨 thinking…" />}
          {generate.isPending && (
            <ChatBubble role="assistant" content="🖌 painting… (about 10 seconds)" />
          )}

          {/* the paint plan is a message in the stream, not a separate form */}
          {plan && !generate.isPending && (
            <div className="flex justify-start" data-testid="paint-plan-card">
              <div className="max-w-[92%] w-full rounded-2xl bg-wash-bubblegum px-4 py-3">
                <span className="sticker-bubblegum">Our paint plan</span>
                <textarea
                  value={plan.prompt}
                  onChange={(e) => setPlan({ ...plan, prompt: e.target.value })}
                  rows={2}
                  className="input-k12 mt-2"
                  aria-label="The picture (you can edit it!)"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {STYLES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setPlan({ ...plan, style: s })}
                      className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors ${
                        plan.style === s
                          ? 'bg-grad-bubblegum text-white shadow-brand-bubblegum'
                          : 'bg-surface text-ink-soft hover:text-ink'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5 mt-2">
                  {SIZES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setPlan({ ...plan, size: s.id })}
                      className={`rounded-xl px-3 py-1.5 text-[12px] font-bold transition-colors ${
                        plan.size === s.id
                          ? 'bg-grad-bubblegum text-white shadow-brand-bubblegum'
                          : 'bg-surface text-ink-soft'
                      }`}
                      title={s.dims}
                    >
                      {s.label} <span className="opacity-70 font-normal">{s.dims}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={onMake}
                  disabled={generate.isPending || !bucket.data || !plan.prompt.trim()}
                  className="btn-pill-primary w-full mt-3"
                >
                  ✨ Make it! −{COST}★
                </button>
              </div>
            </div>
          )}
        </div>

        {chips.length > 0 && !plan && !latestImageId && (
          <div className="flex flex-wrap gap-2 mb-3">
            {chips.map((c) => (
              <button
                key={c}
                onClick={() => sendToCoach(c)}
                className="rounded-full px-4 py-2 text-[13px] font-bold bg-wash-bubblegum text-ink hover:bg-grad-bubblegum hover:text-white transition-colors"
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-3 rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
            {error}
          </div>
        )}

        {/* after a picture exists the same input can change it or keep planning */}
        {latestImageId && (
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setInputMode('change')}
              className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors ${
                inputMode === 'change' ? 'bg-grad-bubblegum text-white' : 'bg-surface text-ink-soft'
              }`}
            >
              🖌 Change this picture
            </button>
            <button
              onClick={() => setInputMode('chat')}
              className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors ${
                inputMode === 'chat' ? 'bg-grad-bubblegum text-white' : 'bg-surface text-ink-soft'
              }`}
            >
              💬 Plan something new
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSend()}
            placeholder={
              changeMode ? 'Give it a tiny hat!' : 'A friendly robot watering plants in space'
            }
            className="input-k12 flex-1"
            autoFocus
          />
          <button
            onClick={onSend}
            disabled={coach.isPending || generate.isPending || !draft.trim()}
            className="btn-pill-primary"
          >
            Send −{sendCost}★
          </button>
        </div>
        {!plan && kidHasSpoken && !latestImageId && (
          <button onClick={skipToPlan} className="text-[12px] text-ink-soft underline mt-2">
            Skip the chat — just paint it ➡
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        {bucket.data ? (
          <Link
            to={`/learn/projects/${bucket.data.project_id}`}
            className="text-[13px] font-bold text-ink-soft hover:text-ink"
          >
            🖼 Everything you make is saved in {bucket.data.title} →
          </Link>
        ) : (
          <span />
        )}
        <button onClick={() => endNow()} className="btn-pill-secondary">
          🎓 Done for now
        </button>
      </div>
      {summary && <SessionSummary summary={summary} onClose={dismiss} />}
    </StudioChrome>
  );
}

function ChatBubble({ role, content }: ChatMsg) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2 text-[14px] ${
          role === 'user' ? 'bg-grad-bubblegum text-white' : 'bg-surface text-ink'
        }`}
      >
        {content}
      </div>
    </div>
  );
}

/** A finished picture as a message in the conversation. */
function ImageBubble({
  artifactId,
  prompt,
  artifacts,
}: {
  artifactId: string;
  prompt: string;
  artifacts: Artifact[] | undefined;
}) {
  const artifact = artifacts?.find((a) => a.id === artifactId);
  return (
    <div className="flex justify-start" data-testid="image-bubble">
      <div className="max-w-[85%] rounded-2xl bg-surface p-2">
        <div className="rounded-xl overflow-hidden bg-wash-bubblegum min-h-[120px] min-w-[180px]">
          {artifact ? <ArtifactImage artifact={artifact} /> : null}
        </div>
        <div className="text-[11px] text-ink-soft mt-1.5 italic line-clamp-2">"{prompt}"</div>
        <div className="text-[11px] text-ink-soft">Saved to My Pictures ✓</div>
      </div>
    </div>
  );
}

function ArtifactImage({ artifact }: { artifact: Artifact }) {
  const url = useArtifactUrl(artifact);
  return url.data ? (
    <img src={url.data} alt="" className="max-h-[320px] w-auto object-contain" />
  ) : (
    <div className="h-[120px] flex items-center justify-center text-[12px] text-slate2">
      loading…
    </div>
  );
}
