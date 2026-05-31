import { useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';
import { ShareToClassModal } from '@/pages/learn/classroom/ShareToClassModal';

interface Project {
  id: string;
  title: string;
  kind?: 'creative' | 'code';
  product_line: 'line_a_creative' | 'line_b_coding';
  visibility: 'private' | 'class' | 'public';
  thumbnail_s3_key: string | null;
  star_cost_total: number;
  status: 'in_progress' | 'submitted' | 'accepted' | 'archived';
  created_at: string;
  updated_at: string;
  mission_id: string | null;
}

interface Wallet {
  stars_balance: number;
  daily_used: number;
  daily_cap: number;
}

interface Artifact {
  id: string;
  kind: 'image' | 'audio' | 'video' | 'text' | 'code_file' | 'project_export';
  s3_key: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  metadata: { source?: string; prompt?: string; upstream_id?: string } | Record<string, unknown>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  stars?: number;
}

interface LlmTextResponse {
  id: string;
  reply: string;
  stars_charged: number;
  balance_after: number;
  model: string;
}

const KIND_STICKER: Record<string, string> = {
  image: 'bubblegum',
  audio: 'sky',
  video: 'sunshine',
  text: 'mint',
  code_file: 'coral',
  project_export: 'sky',
};

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const qc = useQueryClient();
  const familyId = me.data?.kind === 'kid' ? me.data.family_id : null;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const project = useQuery<Project>({
    queryKey: ['project', id],
    queryFn: () => api<Project>(`/projects/${id}`),
    enabled: !!id,
  });

  const wallet = useQuery<Wallet>({
    queryKey: ['wallet', familyId],
    queryFn: () => api<Wallet>(`/families/${familyId}/wallet`),
    enabled: !!familyId,
  });

  const artifacts = useQuery<Artifact[]>({
    queryKey: ['project', id, 'artifacts'],
    queryFn: () => api<Artifact[]>(`/projects/${id}/artifacts`),
    enabled: !!id,
  });

  const askAi = useMutation({
    mutationFn: (content: string) =>
      api<LlmTextResponse>('/llm/text-completion', {
        method: 'POST',
        body: {
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content },
          ],
          project_id: id,
        },
      }),
    onMutate: (content) => {
      setChatError(null);
      setMessages((prev) => [...prev, { role: 'user', content }]);
    },
    onSuccess: (res) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.reply, stars: res.stars_charged },
      ]);
      qc.invalidateQueries({ queryKey: ['wallet', familyId] });
      qc.invalidateQueries({ queryKey: ['project', id] });
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    onError: (e: unknown) => {
      setChatError(formatLlmError(e));
      setMessages((prev) => prev.slice(0, -1));
    },
  });

  const onSend = () => {
    const text = input.trim();
    if (!text || askAi.isPending) return;
    setInput('');
    askAi.mutate(text);
  };

  if (project.isLoading) return <p className="lead-text">Loading…</p>;
  if (!project.data)
    return (
      <div>
        <div className="eyebrow">Project</div>
        <h1 className="section-heading">Not found</h1>
        <Link to="/learn/projects" className="btn-pill-secondary mt-6">← Back</Link>
      </div>
    );

  // Code Studio projects open the dedicated 3-pane Studio (PRD §2 IA #4).
  if (project.data.kind === 'code') {
    return <Navigate to={`/learn/code/${project.data.id}`} replace />;
  }

  const p = project.data;
  const color = p.product_line === 'line_a_creative' ? 'coral' : 'sky';

  return (
    <div>
      <Link to="/learn/projects" className="btn-pill-ghost mb-4 -ml-3">← Projects</Link>

      <div className={`pack-card ${color} mb-8 cursor-default`} style={{ minHeight: 'auto' }}>
        <span className="pack-blob" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">
              {p.product_line === 'line_a_creative' ? 'Creative' : 'Coding'} ·{' '}
              {p.status.replace(/_/g, ' ')}
            </div>
            <h1 className="mt-3 text-[32px] font-bold leading-tight">{p.title}</h1>
            <div className="mt-4 flex flex-wrap gap-2 text-[12px] font-bold uppercase tracking-[0.10em]">
              <span className="rounded-full bg-canvas-pure/25 backdrop-blur px-3 py-1.5">
                {p.star_cost_total}★ used
              </span>
              {wallet.data && (
                <span className="rounded-full bg-canvas-pure/25 backdrop-blur px-3 py-1.5">
                  {wallet.data.stars_balance}★ left
                </span>
              )}
              <span className="rounded-full bg-canvas-pure/25 backdrop-blur px-3 py-1.5">
                {p.visibility}
              </span>
            </div>
          </div>
        </div>
      </div>

      {p.visibility === 'private' && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button onClick={() => setShowShare(true)} className="btn-pill-primary">
            ✨ Share with class
          </button>
        </div>
      )}

      {showShare && (
        <ShareToClassModal
          projectId={p.id}
          onClose={() => setShowShare(false)}
          onShared={() => qc.invalidateQueries({ queryKey: ['project', id] })}
        />
      )}

      <ShareApprovalPanel projectId={p.id} currentVisibility={p.visibility} />

      {/* Chat panel */}
      <div className="card-base p-0 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-hairline bg-wash-bubblegum flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="sticker-bubblegum">AI helper</span>
            <span className="text-[13px] font-semibold text-ink">
              Ask the AI for help, explanations, ideas. For images / music / video — use the dedicated studios.
            </span>
          </div>
          {wallet.data && (
            <span className="text-[14px] font-bold tabular-nums text-ink">
              {wallet.data.stars_balance}★
            </span>
          )}
        </div>

        <div className="px-6 py-5 space-y-4 min-h-[260px] max-h-[420px] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <span className="sticker-sunshine alt">Start chatting</span>
              <p className="lead-text mt-4" style={{ fontSize: '15px' }}>
                Type a prompt below, then send or use a media tool.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {[
                  'Tell me a fun science fact!',
                  'Help me write a haiku about cats.',
                  'A friendly robot in a forest, watercolour',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="rounded-full bg-surface px-4 py-2 text-[12px] font-semibold text-ink-soft hover:bg-wash-coral hover:text-ink transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <ChatBubble key={i} message={m} />
            ))
          )}
          {askAi.isPending && (
            <ChatBubble message={{ role: 'assistant', content: 'Thinking…' }} pending />
          )}
        </div>

        {(chatError) && (
          <div className="mx-6 mb-4 rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
            {chatError}
          </div>
        )}

        <div className="px-6 py-4 border-t border-hairline space-y-3">
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              placeholder="What do you want to make?"
              rows={2}
              className="flex-1 rounded-2xl border-2 border-hairline bg-canvas-pure px-4 py-3 text-[15px] text-ink placeholder:text-steel focus:border-brand-coral focus:outline-none transition-colors resize-none"
            />
            <button
              onClick={onSend}
              disabled={askAi.isPending || !input.trim()}
              className="btn-pill-primary shrink-0 self-stretch"
            >
              {askAi.isPending ? '…' : 'Send'}
            </button>
          </div>
<p className="text-[12px] text-slate2">
            Enter to send · 1★ per reply. For media → <Link to="/learn/create" className="font-bold text-brand-coral hover:underline">open a studio</Link>.
          </p>
        </div>
      </div>

      {/* Artifact gallery */}
      <h2 className="section-heading mb-4" style={{ fontSize: '24px' }}>Your gallery</h2>
      {artifacts.isLoading ? (
        <p className="lead-text">Loading…</p>
      ) : artifacts.data && artifacts.data.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {artifacts.data.map((a) => (
            <ArtifactTile key={a.id} artifact={a} projectId={id!} />
          ))}
        </div>
      ) : (
        <div className="card-base text-center">
          <span className="sticker-sunshine">Empty canvas</span>
          <p className="lead-text mt-4">
            No media yet. Go to a <Link to="/learn/create" className="font-bold text-brand-coral hover:underline">studio</Link> to make some.
          </p>
        </div>
      )}
    </div>
  );
}

function ChatBubble({ message, pending = false }: { message: ChatMessage; pending?: boolean }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-grad-coral text-white shadow-brand-coral'
            : 'bg-surface text-ink border border-hairline'
        }`}
      >
        <div className={`text-[14px] leading-relaxed whitespace-pre-wrap ${pending ? 'opacity-60 italic' : ''}`}>
          {message.content}
        </div>
        {message.stars !== undefined && (
          <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.10em] opacity-75">
            −{message.stars}★
          </div>
        )}
      </div>
    </div>
  );
}

interface SignedDownloadResponse {
  url: string;
  expires_in: number;
  mime_type: string;
  kind: string;
}

function ArtifactTile({ artifact, projectId }: { artifact: Artifact; projectId: string }) {
  const sticker = KIND_STICKER[artifact.kind] ?? 'sky';
  const isImage = artifact.kind === 'image';
  const isAudio = artifact.kind === 'audio';
  const isVideo = artifact.kind === 'video';
  const meta = artifact.metadata as { prompt?: string };

  // Always go through signDownload — keeps frontend ignorant of where the bytes live
  // (mock local FS today, real S3 tomorrow).
  const signed = useQuery<SignedDownloadResponse>({
    queryKey: ['artifact', artifact.id, 'download'],
    queryFn: () =>
      api<SignedDownloadResponse>(`/projects/${projectId}/artifacts/${artifact.id}/download-url`, {
        method: 'POST',
      }),
    enabled: isImage || isAudio || isVideo,
    staleTime: 4 * 60_000, // presigned URLs valid 5 min
  });
  const url = signed.data?.url;

  return (
    <div className="card-base p-3 flex flex-col">
      <div className="aspect-square rounded-xl bg-surface overflow-hidden mb-3 flex items-center justify-center">
        {signed.isLoading ? (
          <span className="text-[12px] text-slate2">…</span>
        ) : isImage && url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : isAudio && url ? (
          <audio controls className="w-full">
            <source src={url} type={artifact.mime_type} />
          </audio>
        ) : isVideo && url ? (
          <video controls className="h-full w-full object-cover">
            <source src={url} type={artifact.mime_type} />
          </video>
        ) : (
          <span className={`sticker-${sticker}`}>{artifact.kind}</span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className={`sticker-${sticker} text-[10px]`}>{artifact.kind}</span>
        <span className="text-[11px] text-slate2">
          {new Date(artifact.created_at).toLocaleDateString()}
        </span>
      </div>
      {meta.prompt && (
        <div className="text-[11px] text-ink-soft mt-2 line-clamp-2 italic">
          "{meta.prompt}"
        </div>
      )}
    </div>
  );
}

function formatLlmError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'WALLET_INSUFFICIENT' || e.code === 'DAILY_CAP_EXCEEDED')
      return 'Out of Stars! Ask a parent to top up.';
    if (e.code === 'FAMILY_PAUSED') return 'Your family paused AI. Ask a parent.';
    return e.message;
  }
  return 'Could not reach AI.';
}

/**
 * Kid-side request to widen project visibility. Creates a ShareRequest on the
 * project — `class` needs teacher review; `public` needs both teacher AND
 * parent (see projects.service.ts). On grant the backend flips
 * Project.visibility, so this UI only needs to fire the request and trust the
 * project query to pick up the new state.
 *
 * Backend rejects a second pending request for the same project with CONFLICT;
 * we surface that as "already waiting" rather than an error.
 */
function ShareApprovalPanel({
  projectId,
  currentVisibility,
}: {
  projectId: string;
  currentVisibility: 'private' | 'class' | 'public';
}) {
  const [target, setTarget] = useState<'class' | 'public'>('class');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = useMutation({
    mutationFn: () =>
      api<unknown>(`/projects/${projectId}/share-request`, {
        method: 'POST',
        body: { target_visibility: target },
      }),
    onSuccess: () => {
      setSubmitted(true);
      setError(null);
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError && e.code === 'CONFLICT') {
        // Already pending — treat as success state so the kid sees waiting.
        setSubmitted(true);
        setError(null);
        return;
      }
      setError(e instanceof ApiError ? e.message : 'Could not send request.');
    },
  });

  if (currentVisibility !== 'private') {
    return (
      <div className="card-base mb-6 flex items-center justify-between gap-4">
        <div>
          <span className="sticker-mint">Shared</span>
          <p className="text-[13px] text-ink-soft mt-2">
            This project is visible to{' '}
            <span className="font-semibold text-ink">
              {currentVisibility === 'public' ? 'everyone' : 'your class'}
            </span>
            . Ask a parent if you want to change it.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="card-base mb-6">
        <span className="sticker-mint">Sent ✓</span>
        <p className="text-[13px] text-ink mt-3 font-medium">
          Waiting on review. Class shares need your teacher; public shares
          need teacher + parent. The project unlocks the moment they say yes.
        </p>
      </div>
    );
  }

  return (
    <div className="card-base mb-6">
      <div className="eyebrow eyebrow-sunshine">Share</div>
      <h3 className="text-[18px] font-bold text-ink mt-1">Ask a parent to share this</h3>
      <p className="text-[13px] text-slate2 mt-2">
        Parents decide what goes public. Pick where, then send the request.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <label
          className={`cursor-pointer rounded-full px-4 py-2 text-[13px] font-semibold border-2 transition-colors ${
            target === 'class'
              ? 'bg-brand-sky text-white border-brand-sky'
              : 'bg-canvas-pure text-ink-soft border-hairline hover:border-brand-sky'
          }`}
        >
          <input
            type="radio"
            value="class"
            checked={target === 'class'}
            onChange={() => setTarget('class')}
            className="sr-only"
          />
          With my class
        </label>
        <label
          className={`cursor-pointer rounded-full px-4 py-2 text-[13px] font-semibold border-2 transition-colors ${
            target === 'public'
              ? 'bg-brand-coral text-white border-brand-coral'
              : 'bg-canvas-pure text-ink-soft border-hairline hover:border-brand-coral'
          }`}
        >
          <input
            type="radio"
            value="public"
            checked={target === 'public'}
            onChange={() => setTarget('public')}
            className="sr-only"
          />
          Public to everyone
        </label>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
          {error}
        </div>
      )}

      <button
        onClick={() => ask.mutate()}
        disabled={ask.isPending}
        className="btn-pill-primary mt-4"
      >
        {ask.isPending ? 'Sending…' : 'Send request'}
      </button>
    </div>
  );
}
