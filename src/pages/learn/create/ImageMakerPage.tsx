import { useState } from 'react';
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

// Plan → Make → Change (image-studio-prd.md D-IS-7/8): the studio opens as a
// conversation with an art coach that turns the kid's idea into a paint plan
// (FREE), the plan card is the only 8★ moment, and every picture can then be
// remixed with "Change it".

const STYLES = ['cartoon', 'painting', 'pixel-art', 'photo', 'sketch', 'watercolor'] as const;
type PlanStyle = (typeof STYLES)[number];
// Preset ids are mapped server-side to the dims gpt-image-1 actually supports
// (imageGenOptions in platform-backend llm.service.ts) — keep both in sync.
const SIZES = [
  { id: 'square', label: 'Square', dims: '1024×1024' },
  { id: 'wide', label: 'Wide', dims: '1536×1024' },
  { id: 'tall', label: 'Tall', dims: '1024×1536' },
] as const;
type PlanSize = (typeof SIZES)[number]['id'];

// Must match the backend charges (pricing.ts: image = 8⭐, kids-default text
// turn = 1⭐). Every AI invocation charges Stars — including each coach turn
// (rules/ai-star-billing.md, owner decision 2026-07-17).
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

export function ImageMakerPage() {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [chips, setChips] = useState<string[]>(SPARK_CHIPS);
  const [draft, setDraft] = useState('');
  const [plan, setPlan] = useState<PaintPlan | null>(null);
  const [madeId, setMadeId] = useState<string | null>(null);
  const [remixText, setRemixText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCelebrate, setShowCelebrate] = useState(false);

  const { summary, endNow, dismiss } = useStudioSession('image');

  // Everything made here auto-saves into the kid's My Pictures bucket
  // (learn-create-studio-save-prd §5) — no bucket, no generation.
  const bucket = useCreateBucket('image');
  const generate = useGenerate('image', bucket.data?.project_id);
  const recent = useBucketArtifacts(bucket.data?.project_id);

  // Each coach turn is one metered AI call (1★ — rules/ai-star-billing.md);
  // the big spend stays the plan card below.
  const qc = useQueryClient();
  const coach = useMutation<PlanTurn, ApiError, ChatMsg[]>({
    mutationFn: (messages) =>
      api<PlanTurn>('/llm/image-plan', { method: 'POST', body: { messages: messages.slice(-15) } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['wallet'] });
    },
  });

  const send = (text: string) => {
    const idea = text.trim();
    if (!idea || coach.isPending) return;
    setError(null);
    setDraft('');
    const next = [...msgs, { role: 'user' as const, content: idea.slice(0, 500) }];
    setMsgs(next);
    setChips([]);
    coach.mutate(next, {
      onSuccess: (turn) => {
        setMsgs([...next, { role: 'assistant', content: turn.reply }]);
        setChips(turn.chips);
        if (turn.plan) setPlan(turn.plan);
      },
      onError: (e) => setError(friendlyError(e)),
    });
  };

  // Escape hatch: paint straight from what the kid already said.
  const skipToPlan = () => {
    const said = msgs
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join(', ');
    if (said) setPlan({ prompt: said, style: 'cartoon', size: 'square' });
  };

  const onMake = () => {
    if (!plan) return;
    setError(null);
    generate.mutate(
      { prompt: `${plan.prompt}, ${plan.style} style`, options: { size: plan.size } },
      {
        onSuccess: (r) => {
          setShowCelebrate(true);
          setMadeId(r.artifact_id);
        },
        onError: (e) => setError(friendlyError(e)),
      },
    );
  };

  const onRemix = () => {
    const change = remixText.trim();
    if (!change || !madeId) return;
    setError(null);
    generate.mutate(
      { prompt: change, options: { size: plan?.size ?? 'square' }, ref_artifact_id: madeId },
      {
        onSuccess: (r) => {
          setShowCelebrate(true);
          setMadeId(r.artifact_id);
          setRemixText('');
        },
        onError: (e) => setError(friendlyError(e)),
      },
    );
  };

  const kidHasSpoken = msgs.some((m) => m.role === 'user');
  const justMade = madeId ? recent.data?.find((a) => a.id === madeId) : undefined;

  return (
    <StudioChrome
      eyebrow="Art Studio"
      eyebrowColor="eyebrow-bubblegum"
      emoji="🎨"
      title="Art Studio"
      subtitle="Chat with your art coach to plan the picture, then paint it. Great pictures say WHO, WHERE, and FEELING."
      cost={COST}
    >
      <Celebration show={showCelebrate} message="Your image is ready!" onDone={() => setShowCelebrate(false)} />

      {/* ── 想 · plan it with the coach (free) ── */}
      <div className="card-base mb-6">
        <div className="space-y-3 mb-4">
          <ChatBubble role="assistant" content={OPENING} />
          {msgs.map((m, i) => (
            <ChatBubble key={i} role={m.role} content={m.content} />
          ))}
          {coach.isPending && <ChatBubble role="assistant" content="🎨 thinking…" />}
        </div>

        {chips.length > 0 && !plan && (
          <div className="flex flex-wrap gap-2 mb-4">
            {chips.map((c) => (
              <button
                key={c}
                onClick={() => send(c)}
                className="rounded-full px-4 py-2 text-[13px] font-bold bg-wash-bubblegum text-ink hover:bg-grad-bubblegum hover:text-white transition-colors"
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {!plan && (
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send(draft)}
              placeholder="A friendly robot watering plants in space"
              className="input-k12 flex-1"
              autoFocus
            />
            <button
              onClick={() => send(draft)}
              disabled={coach.isPending || !draft.trim()}
              className="btn-pill-primary"
            >
              Send −{CHAT_COST}★
            </button>
          </div>
        )}
        {!plan && kidHasSpoken && (
          <button onClick={skipToPlan} className="text-[12px] text-ink-soft underline mt-3">
            Skip the chat — just paint it ➡
          </button>
        )}
      </div>

      {/* ── 画 · the plan card — the ONLY place Stars are spent ── */}
      {plan && (
        <div className="card-base mb-6" data-testid="paint-plan-card">
          <span className="sticker-bubblegum">Our paint plan</span>
          <label className="block mt-3">
            <span className="label-k12">The picture (you can edit it!)</span>
            <textarea
              value={plan.prompt}
              onChange={(e) => setPlan({ ...plan, prompt: e.target.value })}
              rows={2}
              className="input-k12"
            />
          </label>

          <div className="mt-4">
            <span className="label-k12">Style</span>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => setPlan({ ...plan, style: s })}
                  className={`rounded-full px-4 py-2 text-[13px] font-bold transition-colors ${
                    plan.style === s
                      ? 'bg-grad-bubblegum text-white shadow-brand-bubblegum'
                      : 'bg-surface text-ink-soft hover:bg-wash-bubblegum hover:text-ink'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <span className="label-k12">Size</span>
            <div className="flex gap-2">
              {SIZES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setPlan({ ...plan, size: s.id })}
                  className={`rounded-2xl px-4 py-3 text-left transition-colors flex-1 ${
                    plan.size === s.id
                      ? 'bg-grad-bubblegum text-white shadow-brand-bubblegum'
                      : 'bg-surface text-ink-soft hover:bg-wash-bubblegum'
                  }`}
                >
                  <div className="text-[14px] font-bold">{s.label}</div>
                  <div className="text-[11px] opacity-75">{s.dims}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={onMake}
            disabled={generate.isPending || !bucket.data || !plan.prompt.trim()}
            className="btn-pill-primary w-full mt-6"
          >
            {generate.isPending ? '✨ Making…' : `✨ Make it! −${COST}★`}
          </button>
          <button
            onClick={() => {
              setPlan(null);
              setChips([]);
            }}
            className="text-[12px] text-ink-soft underline mt-3"
          >
            ← Keep planning instead
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
          {error}
        </div>
      )}

      {/* ── 改 · change the picture you just made ── */}
      {madeId && (
        <div className="card-base mb-6" data-testid="remix-card">
          <span className="sticker-bubblegum">🖌 Change it</span>
          {justMade && (
            <div className="mt-3 max-w-[240px]">
              <ImageTile artifact={justMade} />
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <input
              value={remixText}
              onChange={(e) => setRemixText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onRemix()}
              placeholder="Give it a tiny hat!"
              className="input-k12 flex-1"
            />
            <button
              onClick={onRemix}
              disabled={generate.isPending || !remixText.trim()}
              className="btn-pill-primary"
            >
              {generate.isPending ? '🖌 …' : `🖌 Go −${COST}★`}
            </button>
          </div>
        </div>
      )}

      <h2 className="text-[18px] font-bold text-ink mb-1">Your recent images</h2>
      <p className="text-[12px] text-ink-soft mb-3">
        Everything you make is saved to {bucket.data?.title ?? 'My Pictures'} ✓
      </p>
      {recent.isLoading ? (
        <p className="lead-text">Loading…</p>
      ) : (recent.data?.length ?? 0) === 0 ? (
        <div className="card-base text-center">
          <span className="sticker-bubblegum">Empty canvas</span>
          <p className="lead-text mt-3" style={{ fontSize: '14px' }}>
            Chat with the coach above, then tap Make it!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {recent.data!.slice(0, 12).map((a) => (
            <ImageTile key={a.id} artifact={a} />
          ))}
        </div>
      )}
      <div className="flex justify-center mt-8">
        <button
          onClick={() => endNow()}
          className="btn-pill-secondary"
        >
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
          role === 'user'
            ? 'bg-grad-bubblegum text-white'
            : 'bg-surface text-ink'
        }`}
      >
        {content}
      </div>
    </div>
  );
}

function ImageTile({ artifact }: { artifact: Artifact }) {
  const url = useArtifactUrl(artifact);
  const meta = artifact.metadata as { prompt?: string };
  return (
    <div className="card-base p-2">
      <div className="aspect-square rounded-xl bg-surface overflow-hidden">
        {url.data ? <img src={url.data} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      {meta.prompt && (
        <div className="text-[11px] text-ink-soft mt-2 line-clamp-2 italic">"{meta.prompt}"</div>
      )}
    </div>
  );
}
