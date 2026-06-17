import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';
import { onWsEvent } from '@/lib/ws';
import { ShareToClassModal } from '@/pages/learn/classroom/ShareToClassModal';
import { useWsEvent } from '@/lib/useWsEvent';
import { StudioDrawer } from '@/pages/learn/create/shared/StudioDrawer';
import { ImageStudioContent } from '@/pages/learn/create/shared/ImageStudioContent';
import { VoiceStudioContent } from '@/pages/learn/create/shared/VoiceStudioContent';
import { VideoStudioContent } from '@/pages/learn/create/shared/VideoStudioContent';
import { StoryStudioContent } from '@/pages/learn/create/shared/StoryStudioContent';
import { MusicStudioContent } from '@/pages/learn/create/shared/MusicStudioContent';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  title: string;
  kind?: 'creative' | 'code';
  product_line: 'line_a_creative' | 'line_b_coding';
  visibility: 'private' | 'class_work' | 'class' | 'public';
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
  metadata: { source?: string; prompt?: string; target?: string } | Record<string, unknown>;
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

interface SignedDownloadResponse {
  url: string;
  expires_in: number;
  mime_type: string;
  kind: string;
}

interface ExportJobResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'succeeded' | 'failed';
  stars_charged?: number;
  balance_after?: number;
  artifact_id?: string;
  error?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const KIND_STICKER: Record<string, string> = {
  image: 'bubblegum',
  audio: 'sky',
  video: 'sunshine',
  text: 'mint',
  code_file: 'coral',
  project_export: 'sky',
};

const KIND_LABEL: Record<string, string> = {
  image: 'Images',
  audio: 'Voice & Music',
  video: 'Video',
  text: 'Stories',
  code_file: 'Code',
  project_export: 'Exports',
};

const CREATE_LINK: Record<string, string> = {
  image: '/learn/create/image',
  audio: '/learn/create/voice',
  video: '/learn/create/video',
  text:  '/learn/create/story',
};

// ─── Main component ───────────────────────────────────────────────────────────

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const qc = useQueryClient();
  const familyId = me.data?.kind === 'kid' ? me.data.family_id : null;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exportJob, setExportJob] = useState<ExportJobResponse | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

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

  // WS: live artifact refresh
  useWsEvent('artifact.created', () => {
    qc.invalidateQueries({ queryKey: ['project', id, 'artifacts'] });
  });

  // WS: export job progress — subscribe to dynamic event name via useEffect
  useEffect(() => {
    if (!exportJob?.job_id) return;
    return onWsEvent<ExportJobResponse>(`project.export.${exportJob.job_id}`, (payload) => {
      setExportJob((prev) => prev ? { ...prev, ...payload } : payload);
      if (payload.status === 'succeeded' || payload.status === 'failed') {
        qc.invalidateQueries({ queryKey: ['project', id, 'artifacts'] });
        qc.invalidateQueries({ queryKey: ['wallet', familyId] });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportJob?.job_id]);

  // ── Title edit ───────────────────────────────────────────────────────────

  const updateTitle = useMutation({
    mutationFn: (title: string) =>
      api(`/projects/${id}`, { method: 'PATCH', body: { title } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] });
      setEditingTitle(false);
    },
  });

  const startEditTitle = () => {
    setTitleDraft(project.data?.title ?? '');
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  };

  const submitTitle = () => {
    const t = titleDraft.trim();
    if (t && t !== project.data?.title) updateTitle.mutate(t);
    else setEditingTitle(false);
  };

  // ── Delete ───────────────────────────────────────────────────────────────

  const deleteProject = useMutation({
    mutationFn: () => api(`/projects/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      window.location.href = '/learn/projects';
    },
  });

  // ── Export ───────────────────────────────────────────────────────────────

  const startExport = useMutation({
    mutationFn: (target: 'pdf_storybook' | 'slideshow_video') =>
      api<ExportJobResponse>(`/projects/${id}/export`, { method: 'POST', body: { target } }),
    onSuccess: (res) => {
      setExportJob(res);
      qc.invalidateQueries({ queryKey: ['wallet', familyId] });
    },
  });

  // ── AI chat ──────────────────────────────────────────────────────────────

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
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply, stars: res.stars_charged }]);
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

  // ── Render ───────────────────────────────────────────────────────────────

  if (project.isLoading) return <p className="lead-text">Loading…</p>;
  if (!project.data)
    return (
      <div>
        <div className="eyebrow">Project</div>
        <h1 className="section-heading">Not found</h1>
        <Link to="/learn/projects" className="btn-pill-secondary mt-6">← Back</Link>
      </div>
    );

  if (project.data.kind === 'code')
    return <Navigate to={`/learn/code/${project.data.id}`} replace />;

  const p = project.data;
  const byKind = groupByKind(artifacts.data ?? []);
  const totalArtifacts = artifacts.data?.length ?? 0;
  const atArtifactLimit = totalArtifacts >= 100;

  return (
    <div>
      {/* ── ← My Works ── */}
      <Link to="/learn/projects" className="btn-pill-ghost mb-6 -ml-3">← My Works</Link>

      {/* ── Title row: title left + ⭐ spent right (PRD §5) ── */}
      <div className="mb-2 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={submitTitle}
              onKeyDown={(e) => { if (e.key === 'Enter') submitTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
              className="w-full rounded-2xl border-2 border-brand-coral bg-canvas-pure px-4 py-2 text-[28px] font-bold text-ink outline-none"
              maxLength={120}
            />
          ) : (
            <h1 className="text-[28px] font-bold text-ink leading-tight">{p.title}</h1>
          )}
        </div>
        <div className="shrink-0 text-[14px] font-bold text-steel mt-1">
          ⭐ {p.star_cost_total} spent on this
        </div>
      </div>

      {/* ── Action buttons row (PRD §5): Edit title · Share · Download · Delete ── */}
      <div className="mb-8 flex flex-wrap gap-2">
        <button onClick={startEditTitle} className="btn-pill-secondary text-[13px] py-2 px-4">
          ✏️ Edit title
        </button>
        {p.visibility === 'private' && (
          <button onClick={() => setShowShare(true)} className="btn-pill-secondary text-[13px] py-2 px-4">
            ✨ Share with class
          </button>
        )}
        <a
          href="#export-section"
          className="btn-pill-secondary text-[13px] py-2 px-4"
        >
          ⬇ Download
        </a>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="btn-pill-secondary text-[13px] py-2 px-4 text-brand-coral border-brand-coral/40 hover:bg-wash-coral"
        >
          🗑 Delete
        </button>
      </div>

      {showShare && (
        <ShareToClassModal
          projectId={p.id}
          onClose={() => setShowShare(false)}
          onShared={() => qc.invalidateQueries({ queryKey: ['project', id] })}
        />
      )}

      {showDeleteConfirm && (
        <DeleteConfirmModal
          title={p.title}
          onConfirm={() => deleteProject.mutate()}
          onCancel={() => setShowDeleteConfirm(false)}
          isPending={deleteProject.isPending}
        />
      )}

      <ShareApprovalPanel projectId={p.id} currentVisibility={p.visibility} />

      {/* ── Pieces of this project (PRD §5) ── */}
      <SectionDivider label="Pieces of this project" />

      {atArtifactLimit && (
        <div className="mb-4 rounded-2xl bg-wash-sunshine border border-brand-sunshine/40 px-4 py-3 text-[13px] font-medium text-ink">
          This project has 100 items — the maximum. Delete some to add more.
        </div>
      )}

      <div className="mb-8 space-y-6">
        {(['image', 'text', 'audio', 'video'] as const).map((kind) => (
          <ArtifactSection
            key={kind}
            kind={kind}
            artifacts={byKind[kind] ?? []}
            projectId={id!}
            atLimit={atArtifactLimit}
            onDeleted={() => qc.invalidateQueries({ queryKey: ['project', id, 'artifacts'] })}
          />
        ))}

        {(byKind['project_export'] ?? []).length > 0 && (
          <ArtifactSection
            kind="project_export"
            artifacts={byKind['project_export']!}
            projectId={id!}
            atLimit={false}
            onDeleted={() => qc.invalidateQueries({ queryKey: ['project', id, 'artifacts'] })}
          />
        )}
      </div>

      {/* ── Make a storybook (PRD §5 + §6) ── */}
      <div id="export-section">
      <SectionDivider label="Make a storybook" />
      <ExportPanel
        artifacts={artifacts.data ?? []}
        exportJob={exportJob}
        onExport={(target) => startExport.mutate(target)}
        isPending={startExport.isPending}
      />
      </div>

      {/* AI chat */}
      <div className="card-base p-0 overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-hairline bg-wash-bubblegum flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="sticker-bubblegum">AI helper</span>
            <span className="text-[13px] font-semibold text-ink">
              Ask for ideas, explanations, or help. For images / music / video — use the studios.
            </span>
          </div>
          {wallet.data && (
            <span className="text-[14px] font-bold tabular-nums text-ink">{wallet.data.stars_balance}★</span>
          )}
        </div>

        <div className="px-6 py-5 space-y-4 min-h-[220px] max-h-[400px] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <span className="sticker-sunshine alt">Start chatting</span>
              <p className="lead-text mt-4" style={{ fontSize: '15px' }}>Type a prompt below.</p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {['Tell me a fun science fact!', 'Help me write a haiku about cats.'].map((prompt) => (
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
          ) : messages.map((m, i) => <ChatBubble key={i} message={m} />)}
          {askAi.isPending && <ChatBubble message={{ role: 'assistant', content: 'Thinking…' }} pending />}
        </div>

        {chatError && (
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
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
              placeholder="What do you want to make?"
              rows={2}
              className="flex-1 rounded-2xl border-2 border-hairline bg-canvas-pure px-4 py-3 text-[15px] text-ink placeholder:text-steel focus:border-brand-coral focus:outline-none transition-colors resize-none"
            />
            <button onClick={onSend} disabled={askAi.isPending || !input.trim()} className="btn-pill-primary shrink-0 self-stretch">
              {askAi.isPending ? '…' : 'Send'}
            </button>
          </div>
          <p className="text-[12px] text-slate2">
            Enter to send · 1★ per reply. For media →{' '}
            <Link to="/learn/create" className="font-bold text-brand-coral hover:underline">open a studio</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── SectionDivider ──────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-px flex-1 bg-hairline" />
      <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-steel">{label}</span>
      <div className="h-px flex-1 bg-hairline" />
    </div>
  );
}

// ─── ArtifactSection ─────────────────────────────────────────────────────────

function ArtifactSection({
  kind,
  artifacts,
  projectId,
  atLimit,
  onDeleted,
}: {
  kind: string;
  artifacts: Artifact[];
  projectId: string;
  atLimit: boolean;
  onDeleted: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const canAdd = !!CREATE_LINK[kind] && !atLimit;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[16px] font-bold text-ink">
          {KIND_LABEL[kind] ?? kind}{' '}
          <span className="text-steel font-normal">({artifacts.length})</span>
        </h2>
        {canAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="btn-pill-ghost text-[12px] py-1.5 px-3"
          >
            + Add {KIND_LABEL[kind]?.toLowerCase().replace(/s$/, '') ?? kind}
          </button>
        )}
      </div>

      {artifacts.length === 0 ? (
        <p className="text-[13px] text-steel italic">None yet.</p>
      ) : kind === 'audio' || kind === 'text' ? (
        <div className="space-y-3">
          {artifacts.map((a) => (
            <ArtifactTile key={a.id} artifact={a} projectId={projectId} onDeleted={onDeleted} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {artifacts.map((a) => (
            <ArtifactTile key={a.id} artifact={a} projectId={projectId} onDeleted={onDeleted} />
          ))}
        </div>
      )}

      {showAdd && (
        <StudioDrawerForKind
          kind={kind as 'image' | 'text' | 'audio' | 'video'}
          projectId={projectId}
          onClose={() => setShowAdd(false)}
          onCreated={onDeleted}
        />
      )}
    </div>
  );
}

// ─── ArtifactTile ─────────────────────────────────────────────────────────────

function ArtifactTile({
  artifact,
  projectId,
  onDeleted,
}: {
  artifact: Artifact;
  projectId: string;
  onDeleted: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [textExpanded, setTextExpanded] = useState(false);
  const [replacing, setReplacing] = useState(false);

  // Map artifact kind to replaceable studio kind
  const replaceKind: 'image' | 'text' | 'audio' | 'video' | null =
    artifact.kind === 'image' ? 'image' :
    artifact.kind === 'audio' ? 'audio' :
    artifact.kind === 'text'  ? 'text' :
    artifact.kind === 'video' ? 'video' : null;
  const qc = useQueryClient();
  const sticker = KIND_STICKER[artifact.kind] ?? 'sky';
  const isImage = artifact.kind === 'image';
  const isAudio = artifact.kind === 'audio';
  const isVideo = artifact.kind === 'video';
  const isText = artifact.kind === 'text';
  const meta = artifact.metadata as { prompt?: string; reply?: string; content?: string; stars_charged?: number };

  const COST_FALLBACK: Record<string, number> = { image: 4, audio: 1, video: 5, text: 1, project_export: 2 };
  const costBadge = meta.stars_charged ?? COST_FALLBACK[artifact.kind];

  const signed = useQuery<SignedDownloadResponse>({
    queryKey: ['artifact', artifact.id, 'download'],
    queryFn: () =>
      api<SignedDownloadResponse>(`/projects/${projectId}/artifacts/${artifact.id}/download-url`, { method: 'POST' }),
    enabled: isImage || isAudio || isVideo,
    staleTime: 4 * 60_000,
  });

  // For text artifacts, fetch the actual content via download-url then read as text
  const textContent = useQuery<string>({
    queryKey: ['artifact', artifact.id, 'text-content'],
    queryFn: async () => {
      const { url } = await api<SignedDownloadResponse>(
        `/projects/${projectId}/artifacts/${artifact.id}/download-url`,
        { method: 'POST' },
      );
      const res = await fetch(url);
      return res.text();
    },
    enabled: isText && textExpanded,
    staleTime: 10 * 60_000,
  });

  const deleteArtifact = useMutation({
    mutationFn: () => api(`/projects/${projectId}/artifacts/${artifact.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId, 'artifacts'] });
      onDeleted();
    },
  });

  const url = signed.data?.url;

  const ThreeDotMenu = (
    <div className="relative">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="rounded-full p-1 text-slate2 hover:bg-surface hover:text-ink transition-colors text-[16px] leading-none"
        title="Options"
      >
        ⋯
      </button>
      {menuOpen && (
        <div className="absolute right-0 top-7 z-10 w-40 rounded-2xl border border-hairline bg-canvas-pure shadow-card-soft py-1">
          <button
            onClick={() => { setRenameDraft((artifact.metadata as { prompt?: string }).prompt ?? ''); setRenaming(true); setMenuOpen(false); }}
            className="flex w-full items-center gap-2 px-4 py-2 text-[13px] text-ink hover:bg-surface"
          >
            ✏️ Rename
          </button>
          {replaceKind && (
            <button
              onClick={() => { setReplacing(true); setMenuOpen(false); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-[13px] text-ink hover:bg-surface"
            >
              🔄 Replace
            </button>
          )}
          {url && (
            <a href={url} download className="flex w-full items-center gap-2 px-4 py-2 text-[13px] text-ink hover:bg-surface" onClick={() => setMenuOpen(false)}>
              ⬇ Download
            </a>
          )}
          <button
            onClick={() => { deleteArtifact.mutate(); setMenuOpen(false); }}
            className="flex w-full items-center gap-2 px-4 py-2 text-[13px] text-brand-coral hover:bg-wash-coral"
            disabled={deleteArtifact.isPending}
          >
            🗑 Delete
          </button>
        </div>
      )}
      {renaming && (
        <div className="absolute right-0 top-7 z-10 w-52 rounded-2xl border border-hairline bg-canvas-pure shadow-card-soft p-3">
          <input
            autoFocus
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setRenaming(false); if (e.key === 'Escape') setRenaming(false); }}
            className="input-k12 text-[13px]"
            placeholder="New name…"
            maxLength={120}
          />
          <button onClick={() => setRenaming(false)} className="btn-pill-primary mt-2 w-full text-[12px] py-1.5">Save</button>
        </div>
      )}
    </div>
  );

  const replaceDrawer = replacing && replaceKind ? (
    <StudioDrawerForKind
      kind={replaceKind}
      projectId={projectId}
      onClose={() => setReplacing(false)}
      onCreated={() => { setReplacing(false); onDeleted(); }}
    />
  ) : null;

  // Text artifact — full-width row layout (like AudioRow in VoiceBoothPage)
  if (isText) {
    return (
      <div className="card-base relative">
        {meta.prompt && (
          <div className="text-[13px] text-ink mb-2 line-clamp-2">"{meta.prompt}"</div>
        )}

        {textExpanded ? (
          <div className="mb-2 max-h-48 overflow-y-auto">
            {textContent.isLoading ? (
              <span className="text-[12px] text-slate2">Loading…</span>
            ) : textContent.error ? (
              <span className="text-[12px] text-brand-coral">Could not load story.</span>
            ) : (
              <p className="text-[13px] text-ink leading-relaxed whitespace-pre-wrap">
                {textContent.data ?? '(empty)'}
              </p>
            )}
          </div>
        ) : null}

        <div className="flex items-center justify-between mt-1">
          <button
            onClick={() => setTextExpanded((v) => !v)}
            className="text-[12px] font-semibold text-brand-coral hover:underline"
          >
            {textExpanded ? 'Show less' : 'Show more'}
          </button>
          <div className="flex items-center gap-2 text-[11px] text-slate2">
            <span className="font-bold text-brand-mint">−{costBadge}★</span>
            <span>{new Date(artifact.created_at).toLocaleString()}</span>
          </div>
        </div>

        {/* 3-dot menu */}
        <div className="absolute top-3 right-3">
          {ThreeDotMenu}
        </div>
        {replaceDrawer}
      </div>
    );
  }

  return (
    <div className="card-base p-3 flex flex-col relative">
      {/* Media preview area */}
      <div className={`${isVideo ? 'aspect-video' : 'aspect-square'} rounded-xl bg-surface overflow-hidden mb-3 flex items-center justify-center`}>
        {signed.isLoading ? (
          <span className="text-[12px] text-slate2">loading…</span>
        ) : isImage && url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : isAudio && url ? (
          <audio controls className="w-full"><source src={url} type={artifact.mime_type} /></audio>
        ) : isVideo && url ? (
          <video controls className="h-full w-full object-cover"><source src={url} type={artifact.mime_type} /></video>
        ) : (
          <span className={`sticker-${sticker}`}>{artifact.kind}</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className={`sticker-${sticker} text-[10px]`}>{artifact.kind}</span>
        {ThreeDotMenu}
      </div>

      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[11px] font-bold text-brand-mint">−{costBadge}★</span>
        <span className="text-[11px] text-slate2">{new Date(artifact.created_at).toLocaleDateString()}</span>
      </div>

      {artifact.kind === 'project_export' && url && (
        <a
          href={url}
          download
          className="btn-pill-primary w-full text-center text-[12px] py-2 mt-2"
        >
          ⬇ Download
        </a>
      )}

      {meta.prompt && (
        <div className="text-[11px] text-ink-soft mt-1 line-clamp-2 italic">"{meta.prompt}"</div>
      )}
      {replaceDrawer}
    </div>
  );
}

// ─── ExportPanel ─────────────────────────────────────────────────────────────

function ExportPanel({
  artifacts,
  exportJob,
  onExport,
  isPending,
}: {
  artifacts: Artifact[];
  exportJob: ExportJobResponse | null;
  onExport: (target: 'pdf_storybook' | 'slideshow_video') => void;
  isPending: boolean;
}) {
  const imageCount = artifacts.filter((a) => a.kind === 'image').length;
  const textCount  = artifacts.filter((a) => a.kind === 'text').length;

  const canPdf   = imageCount >= 1 && textCount >= 1;
  const canVideo = imageCount >= 2;

  if (!canPdf && !canVideo) return null;

  return (
    <div className="card-base mb-6">
      <div className="eyebrow eyebrow-mint">Make a takeaway</div>
      <h2 className="text-[20px] font-bold text-ink mt-1 mb-4">Combine into something shareable</h2>

      <div className="flex flex-wrap gap-3">
        {canPdf && (
          <button
            onClick={() => onExport('pdf_storybook')}
            disabled={isPending || (exportJob?.status === 'queued' || exportJob?.status === 'processing')}
            className="btn-pill-primary"
          >
            ✨ PDF storybook — 2★
          </button>
        )}
        {canVideo && (
          <button
            onClick={() => onExport('slideshow_video')}
            disabled={isPending || (exportJob?.status === 'queued' || exportJob?.status === 'processing')}
            className="btn-pill-secondary"
          >
            📺 Slideshow video — 5★
          </button>
        )}
      </div>

      {exportJob && <ExportStatus job={exportJob} />}
    </div>
  );
}

function ExportStatus({ job }: { job: ExportJobResponse }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (job.status !== 'queued' && job.status !== 'processing') return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [job.status]);

  if (job.status === 'succeeded') {
    return (
      <div className="mt-4 rounded-2xl bg-wash-mint border border-brand-mint/30 px-4 py-3 text-[13px] font-medium text-ink">
        ✅ Done! Check your Exports section above to download.
      </div>
    );
  }

  if (job.status === 'failed') {
    return (
      <div className="mt-4 rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
        ❌ {job.error ?? 'Export failed. Stars refunded.'}
      </div>
    );
  }

  const message =
    elapsed < 10 ? 'Putting it together…' :
    elapsed < 30 ? 'Adding the finishing touches…' :
    "Almost done — you can keep working, we'll ping you when it's ready!";

  return (
    <div className="mt-4 flex items-center gap-3 rounded-2xl bg-wash-sky border border-brand-sky/30 px-4 py-3 text-[13px] font-medium text-ink">
      <span className="animate-spin text-[18px]">⏳</span>
      {message}
    </div>
  );
}

// ─── DeleteConfirmModal ───────────────────────────────────────────────────────

function DeleteConfirmModal({
  title,
  onConfirm,
  onCancel,
  isPending,
}: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="card-base max-w-sm w-full">
        <span className="sticker-coral">Delete?</span>
        <h2 className="text-[20px] font-bold text-ink mt-4">Delete "{title}"?</h2>
        <p className="lead-text mt-2" style={{ fontSize: '14px' }}>
          Your project will be soft-deleted. Parents can recover it within 30 days.
        </p>
        <div className="mt-6 flex gap-3">
          <button onClick={onCancel} className="btn-pill-secondary flex-1">Keep it</button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="btn-pill-primary flex-1 bg-brand-coral border-brand-coral"
          >
            {isPending ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ShareApprovalPanel ───────────────────────────────────────────────────────

function ShareApprovalPanel({
  projectId,
  currentVisibility,
}: {
  projectId: string;
  currentVisibility: 'private' | 'class_work' | 'class' | 'public';
}) {
  const [target, setTarget] = useState<'class' | 'public'>('class');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = useMutation({
    mutationFn: () =>
      api<unknown>(`/projects/${projectId}/share-request`, { method: 'POST', body: { target_visibility: target } }),
    onSuccess: () => { setSubmitted(true); setError(null); },
    onError: (e: unknown) => {
      if (e instanceof ApiError && e.code === 'CONFLICT') { setSubmitted(true); setError(null); return; }
      setError(e instanceof ApiError ? e.message : 'Could not send request.');
    },
  });

  if (currentVisibility === 'class_work') {
    return (
      <div className="card-base mb-6 flex items-center gap-4">
        <span className="sticker-sunshine">Class work</span>
        <p className="text-[13px] text-ink-soft">
          Only your <span className="font-semibold text-ink">teacher</span> can see this — to help you. Classmates can’t, until you share it with the class.
        </p>
      </div>
    );
  }

  if (currentVisibility !== 'private') {
    return (
      <div className="card-base mb-6 flex items-center gap-4">
        <span className="sticker-mint">Shared</span>
        <p className="text-[13px] text-ink-soft">
          Visible to <span className="font-semibold text-ink">{currentVisibility === 'public' ? 'everyone' : 'your class'}</span>.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="card-base mb-6">
        <span className="sticker-mint">Sent ✓</span>
        <p className="text-[13px] text-ink mt-3 font-medium">
          Waiting on review. Class shares need your teacher; public shares need teacher + parent.
        </p>
      </div>
    );
  }

  return (
    <div className="card-base mb-6">
      <div className="eyebrow eyebrow-sunshine">Share</div>
      <h3 className="text-[18px] font-bold text-ink mt-1">Ask to share this project</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {(['class', 'public'] as const).map((v) => (
          <label
            key={v}
            className={`cursor-pointer rounded-full px-4 py-2 text-[13px] font-semibold border-2 transition-colors ${
              target === v ? 'bg-brand-sky text-white border-brand-sky' : 'bg-canvas-pure text-ink-soft border-hairline hover:border-brand-sky'
            }`}
          >
            <input type="radio" value={v} checked={target === v} onChange={() => setTarget(v)} className="sr-only" />
            {v === 'class' ? 'With my class' : 'Public to everyone'}
          </label>
        ))}
      </div>
      {error && (
        <div className="mt-4 rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">{error}</div>
      )}
      <button onClick={() => ask.mutate()} disabled={ask.isPending} className="btn-pill-primary mt-4">
        {ask.isPending ? 'Sending…' : 'Send request'}
      </button>
    </div>
  );
}

// ─── ChatBubble ───────────────────────────────────────────────────────────────

function ChatBubble({ message, pending = false }: { message: ChatMessage; pending?: boolean }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser ? 'bg-grad-coral text-white shadow-brand-coral' : 'bg-surface text-ink border border-hairline'
        }`}
      >
        <div className={`text-[14px] leading-relaxed whitespace-pre-wrap ${pending ? 'opacity-60 italic' : ''}`}>
          {message.content}
        </div>
        {message.stars !== undefined && (
          <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.10em] opacity-75">−{message.stars}★</div>
        )}
      </div>
    </div>
  );
}

// ─── StudioDrawerForKind ─────────────────────────────────────────────────────

const DRAWER_META: Record<string, { title: string; emoji: string; color: string }> = {
  image: { title: 'Image Maker',  emoji: '🎨', color: 'bubblegum' },
  text:  { title: 'Story Writer', emoji: '📖', color: 'mint' },
  audio: { title: 'Voice Booth',  emoji: '🔊', color: 'sky' },
  video: { title: 'Video Studio', emoji: '🎬', color: 'sunshine' },
};

function StudioDrawerForKind({
  kind,
  projectId,
  onClose,
  onCreated,
}: {
  kind: 'image' | 'text' | 'audio' | 'video';
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const meta = DRAWER_META[kind];

  return (
    <StudioDrawer
      title={meta.title}
      emoji={meta.emoji}
      color={meta.color}
      onClose={onClose}
    >
      {kind === 'image' && <ImageStudioContent projectId={projectId} onCreated={onCreated} />}
      {kind === 'audio' && <AudioStudioContent projectId={projectId} onCreated={onCreated} />}
      {kind === 'text'  && <StoryStudioContent projectId={projectId} onCreated={onCreated} />}
      {kind === 'video' && <VideoStudioContent projectId={projectId} onCreated={onCreated} />}
    </StudioDrawer>
  );
}

// ─── AudioStudioContent — voice or music picker ──────────────────────────────

function AudioStudioContent({ projectId, onCreated }: { projectId: string; onCreated: () => void }) {
  const [tab, setTab] = useState<'voice' | 'music'>('voice');
  return (
    <div>
      <div className="flex gap-2 mb-5">
        {(['voice', 'music'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-[13px] font-bold transition-colors flex-1 ${
              tab === t ? 'bg-brand-sky text-white' : 'bg-surface text-ink-soft hover:bg-wash-sky'
            }`}
          >
            {t === 'voice' ? '🔊 Voice' : '🎵 Music'}
          </button>
        ))}
      </div>
      {tab === 'voice'
        ? <VoiceStudioContent projectId={projectId} onCreated={onCreated} />
        : <MusicStudioContent projectId={projectId} onCreated={onCreated} />}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByKind(artifacts: Artifact[]): Partial<Record<string, Artifact[]>> {
  return artifacts.reduce<Partial<Record<string, Artifact[]>>>((acc, a) => {
    (acc[a.kind] ??= []).push(a);
    return acc;
  }, {});
}

function formatLlmError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'WALLET_INSUFFICIENT' || e.code === 'DAILY_CAP_EXCEEDED') return 'Out of Stars! Ask a parent to top up.';
    if (e.code === 'FAMILY_PAUSED') return 'Your family paused AI. Ask a parent.';
    return e.message;
  }
  return 'Could not reach AI.';
}
