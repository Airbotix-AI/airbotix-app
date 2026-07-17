import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';
import { friendlyError } from '../create/shared/useStudio';
import { SessionsPane, type SessionRow } from './SessionsPane';
import { ChatPane } from './ChatPane';
import { CodePane } from './CodePane';
import { PreviewPane } from './PreviewPane';
import { ImportTrackPicker } from './ImportTrackPicker';
import type { MusicScore } from './stage/scoreTypes';
import { StudioPicker } from './StudioPicker';
import { StudioSetup } from './StudioSetup';
import { buildPromptPrefix, STUDIO_BY_ID, type Studio } from './studios';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  tool: Studio | null;
  content: string;
  artifact_id: string | null;
  stars_charged: number;
  created_at: string;
  /**
   * Structured payload for turns with no Artifact: free-play music generations
   * carry the composed score here (music-stage-prd §3.5 — versions aggregate
   * from session messages, and free-play sessions have no project/Artifact).
   */
  metadata?: { score?: MusicScore } | null;
  artifact?: {
    id: string;
    kind: 'image' | 'audio' | 'video' | 'text' | 'code_file' | 'project_export';
    mime_type: string;
    s3_key: string;
    project_id: string;
    metadata?: { score?: MusicScore } | null;
  } | null;
}

export function WorkspacePage() {
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const familyId = me.data?.kind === 'kid' ? me.data.family_id : null;
  const qc = useQueryClient();
  const nav = useNavigate();

  // activeSessionId = pinned chat; null + autoSelect=true → auto-pick most recent.
  // When the kid clicks "Make something" we set autoSelect=false to surface the picker.
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [autoSelect, setAutoSelect] = useState(true);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Two-step "Make something" flow: pick a studio, then fill its setup form,
  // then create the session and switch to chat.
  const [pendingStudio, setPendingStudio] = useState<Studio | null>(null);

  // `?studio=music` — the Create hub's 🎵 card deep-links straight into the Music
  // Stage instead of dropping the kid on the studio picker (the retired Music
  // Maker page was a direct link; losing that would make the Stage feel further
  // away, not closer). Runs once: after landing we clear the param so a reload or
  // a "back to my chats" click doesn't re-arm the picker.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const wanted = searchParams.get('studio');
    if (!wanted) return;
    // Paused (comingSoon) studios can't be armed via deep link either — the
    // param is dropped and the kid lands on the normal picker.
    if (wanted && wanted in STUDIO_BY_ID && !STUDIO_BY_ID[wanted as Studio].comingSoon) {
      setPendingStudio(wanted as Studio);
      setAutoSelect(false);
    }
    searchParams.delete('studio');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);
  // Session-scoped setup values keyed by sessionId.
  const [setupValues, setSetupValues] = useState<Record<string, Record<string, string | string[]>>>({});
  const [showImport, setShowImport] = useState(false);

  const sessions = useQuery<SessionRow[]>({
    queryKey: ['kid', kidId, 'sessions'],
    queryFn: () => api<SessionRow[]>(`/kids/${kidId}/learning-sessions`),
    enabled: !!kidId,
    refetchInterval: 30_000,
  });

  const messages = useQuery<Message[]>({
    queryKey: ['session', activeSessionId, 'messages'],
    queryFn: () => api<Message[]>(`/learning-sessions/${activeSessionId}/messages`),
    enabled: !!activeSessionId,
  });

  const wallet = useQuery<{ stars_balance: number }>({
    queryKey: ['wallet', familyId],
    queryFn: () => api<{ stars_balance: number }>(`/families/${familyId}/wallet`),
    enabled: !!familyId,
  });

  // Auto-select the most recent CHAT session on first load only. Music sessions
  // are excluded: the Stage owns them (D-MS7), and auto-resuming one here would
  // bounce the whole Workspace entry onto /learn/music — the kid clicked the AI
  // studio and got hijacked to an old song. The music redirect below still works
  // for a music session the kid EXPLICITLY picks from the sessions list.
  useEffect(() => {
    if (autoSelect && !activeSessionId && (sessions.data?.length ?? 0) > 0) {
      const lastChat = sessions.data!.find((s) => s.studio !== 'music');
      if (lastChat) setActiveSessionId(lastChat.id);
    }
  }, [autoSelect, activeSessionId, sessions.data]);

  // Studio is derived from the active session — locked once picked, never switched mid-chat.
  const activeSession = useMemo(
    () => sessions.data?.find((s) => s.id === activeSessionId) ?? null,
    [sessions.data, activeSessionId],
  );
  const studio: Studio | null = (activeSession?.studio as Studio | undefined) ?? null;
  const studioMeta = studio ? STUDIO_BY_ID[studio] : null;

  // A music session picked from the sessions list opens on the Music Stage, not
  // in this chat shell (D-MS7). Old sessions predate the move, so this is the
  // bridge that keeps them reachable.
  useEffect(() => {
    if (studio === 'music' && activeSessionId) {
      nav(`/learn/music/${activeSessionId}`, { replace: true });
    }
  }, [studio, activeSessionId, nav]);

  const createSession = useMutation({
    mutationFn: async (args: { studio: Studio; values: Record<string, string | string[]> }) => {
      const created = await api<{ id: string }>('/learning-sessions', {
        method: 'POST',
        body: { studio: args.studio },
      });
      return { id: created.id, values: args.values };
    },
    onSuccess: async ({ id, values }) => {
      setSetupValues((s) => ({ ...s, [id]: values }));
      await qc.invalidateQueries({ queryKey: ['kid', kidId, 'sessions'] });
      setActiveSessionId(id);
      setPendingStudio(null);
      setInput('');
      setError(null);
    },
  });

  const importMutation = useMutation({
    mutationFn: async (args: { artifactId: string; label: string }) => {
      if (!activeSessionId) throw new ApiError(400, 'NO_SESSION', 'No active session.');
      return api(`/learning-sessions/${activeSessionId}/append-artifact`, {
        method: 'POST',
        body: { artifact_id: args.artifactId, label: args.label },
      });
    },
    onSuccess: () => {
      setShowImport(false);
      qc.invalidateQueries({ queryKey: ['session', activeSessionId, 'messages'] });
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) setError(e.message);
      else setError('Could not import that track.');
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      const text = input.trim();
      if (!text) throw new ApiError(400, 'EMPTY', 'Type something first.');
      if (!studio) throw new ApiError(400, 'NO_STUDIO', 'Pick a chat type first.');

      const prefix = activeSessionId ? buildPromptPrefix(setupValues[activeSessionId] ?? {}) : '';
      const fullPrompt = `${prefix}${text}`;

      if (studio === 'chat') {
        return api('/llm/text-completion', {
          method: 'POST',
          body: { messages: [{ role: 'user', content: fullPrompt }] },
        });
      }
      if (studio === 'code') {
        // Code studio reuses text-completion with a kid-coding system prompt.
        // The assistant must reply with one ```html, one ```css, and one ```js
        // fence so CodePane can lift them into LiveCodes deterministically.
        const sys =
          'You are a friendly coding tutor for kids age 8-11. ' +
          'Build a single-page web project using ONLY vanilla HTML, CSS, and JavaScript — no frameworks, no external links, no remote fetches. ' +
          'Reply with EXACTLY three markdown code fences, in this order: ```html (the body content, no <html>/<head>), then ```css, then ```js. ' +
          'Keep it short, safe, kid-friendly, and visually playful. After the code fences, add ONE sentence that says what you built.';
        return api('/llm/text-completion', {
          method: 'POST',
          body: {
            messages: [
              { role: 'system', content: sys },
              { role: 'user', content: fullPrompt },
            ],
          },
        });
      }
      // studio === 'music' never reaches this mutation — the Music Stage pane
      // owns generation via POST /llm/music-score (music-stage-prd.md §2).
      const endpoint = studio === 'voice' ? 'tts' : studio;
      return api(`/llm/${endpoint}`, {
        method: 'POST',
        body: { prompt: fullPrompt },
      });
    },
    onSuccess: () => {
      setInput('');
      setError(null);
      qc.invalidateQueries({ queryKey: ['session', activeSessionId, 'messages'] });
      qc.invalidateQueries({ queryKey: ['kid', kidId, 'sessions'] });
      qc.invalidateQueries({ queryKey: ['wallet', familyId] });
    },
    onError: (e: unknown) => setError(friendlyError(e)),
  });

  const latestArtifact = useMemo(() => {
    if (!messages.data) return null;
    for (let i = messages.data.length - 1; i >= 0; i--) {
      const m = messages.data[i];
      if (m.artifact && ['image', 'audio', 'video'].includes(m.artifact.kind)) {
        return m.artifact;
      }
    }
    return null;
  }, [messages.data]);

  const balance = wallet.data?.stars_balance ?? 0;
  const cost = studioMeta?.cost ?? 0;
  // TODO(D-WFA-01): show "Free during workshop" + drop the `balance < cost` gate
  // when the workshop-free-AI waiver is live. Not wired yet because this Workspace
  // is SESSION-based (learning-sessions), not project-based: a free-play music/chat
  // session has NO project until the first paid generate creates one (see
  // MusicStagePane's setSongProjectId), and `ai_free_now` is a per-project flag
  // (GET /projects/:id). There is no upfront project id here to read it from. The
  // backend still enforces the waiver, so generation is already free; this is
  // display polish pending a project handle before the first generate.
  const inputRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="h-full flex bg-canvas">
      <SessionsPane
        sessions={sessions.data ?? []}
        loading={sessions.isLoading}
        activeId={activeSessionId}
        onPick={(id) => {
          setAutoSelect(false);
          setActiveSessionId(id);
          setPendingStudio(null);
        }}
        onNew={() => {
          setAutoSelect(false);
          setActiveSessionId(null);
          setPendingStudio(null);
          setInput('');
          setError(null);
        }}
      />

      <div className="flex-1 flex flex-col min-w-0 border-x border-hairline">
        {pendingStudio ? (
          <StudioSetup
            studio={STUDIO_BY_ID[pendingStudio]}
            busy={createSession.isPending}
            onBack={() => setPendingStudio(null)}
            onConfirm={(values) => createSession.mutate({ studio: pendingStudio, values })}
          />
        ) : !studio ? (
          <StudioPicker
            onPick={(s) => {
              if (STUDIO_BY_ID[s].setup.length === 0) {
                createSession.mutate({ studio: s, values: {} });
              } else {
                setPendingStudio(s);
              }
            }}
            busy={createSession.isPending}
          />
        ) : (
          <>
            <div className="border-b border-hairline bg-canvas-pure px-6 py-3 flex items-center gap-2 flex-wrap">
              <div className={`inline-flex items-center gap-2 rounded-full bg-${studioMeta!.wash} px-3 py-1 text-[12px] font-bold`}>
                <span className="text-[14px]">{studioMeta!.emoji}</span>
                <span className="text-ink">{studioMeta!.label}</span>
                <span className="text-ink-soft">−{studioMeta!.cost}★</span>
              </div>
              {activeSessionId && Object.entries(setupValues[activeSessionId] ?? {}).map(([k, v]) => {
                const display = Array.isArray(v) ? v.join(', ') : v;
                if (!display) return null;
                return (
                  <div key={k} className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-[11px] text-ink-soft">
                    <span className="font-semibold text-ink">{k}:</span>
                    <span>{display}</span>
                  </div>
                );
              })}
            </div>

            <ChatPane
              messages={messages.data ?? []}
              loading={messages.isLoading}
              sending={send.isPending}
              tool={studio}
              empty={false}
            />

            <div className="border-t border-hairline bg-canvas-pure p-4 shrink-0">
              {error && (
                <div className="mb-3 rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-2 text-[12px] font-medium text-ink">
                  {error}
                </div>
              )}
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim() && !send.isPending) send.mutate();
                    }
                  }}
                  placeholder={studioMeta!.placeholder}
                  rows={2}
                  className="flex-1 rounded-2xl border-2 border-hairline bg-canvas-pure px-4 py-3 text-[14px] text-ink placeholder:text-steel focus:border-brand-coral focus:outline-none resize-none"
                />
                <button
                  onClick={() => send.mutate()}
                  disabled={send.isPending || !input.trim() || balance < cost}
                  className="btn-pill-primary shrink-0 self-stretch"
                  title={balance < cost ? `Need ${cost}★, have ${balance}★` : ''}
                >
                  {send.isPending ? '…' : `Send −${cost}★`}
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate2">
                <span>Enter to send · Shift+Enter for new line</span>
                <span className={balance < cost ? 'text-brand-coral font-bold' : ''}>
                  {balance}★ left
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {studio === 'code' ? (
        <CodePane messages={messages.data ?? []} />
      ) : studio === 'music' ? null : ( // stage pane owns the whole music surface
        <PreviewPane artifact={latestArtifact} tool={studio ?? 'chat'} />
      )}

      {showImport && kidId && (
        <ImportTrackPicker
          kidId={kidId}
          excludeIds={
            new Set(
              (messages.data ?? [])
                .map((m) => m.artifact?.id)
                .filter((x): x is string => !!x),
            )
          }
          busy={importMutation.isPending}
          onClose={() => setShowImport(false)}
          onPick={(artifactId, label) =>
            importMutation.mutate({ artifactId, label })
          }
        />
      )}
    </div>
  );
}
