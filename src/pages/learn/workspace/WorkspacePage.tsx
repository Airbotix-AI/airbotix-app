import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';
import { friendlyError } from '../create/shared/useStudio';
import { SessionsPane, type SessionRow } from './SessionsPane';
import { ChatPane } from './ChatPane';
import { CodePane } from './CodePane';
import { PreviewPane } from './PreviewPane';
import { ImportTrackPicker } from './ImportTrackPicker';
import { MusicScorePlayer, type MusicScore } from './MusicScorePlayer';
import { StudioPicker } from './StudioPicker';
import { StudioSetup } from './StudioSetup';
import { buildPromptPrefix, STUDIO_BY_ID, type Studio } from './studios';
import { GenreTagCloud } from './GenreTagCloud';
import { LyricsPanel, type LyricsInput } from './LyricsPanel';
import { AudioReferenceUploader, type AudioMeta } from './AudioReferenceUploader';
import { useMusicUpload } from './useMusicUpload';
import { DurationPicker, musicCostFor } from './DurationPicker';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  tool: Studio | null;
  content: string;
  artifact_id: string | null;
  stars_charged: number;
  created_at: string;
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

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [autoSelect, setAutoSelect] = useState(true);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [pendingStudio, setPendingStudio] = useState<Studio | null>(null);
  const [setupValues, setSetupValues] = useState<Record<string, Record<string, string | string[]>>>({});
  const [showImport, setShowImport] = useState(false);

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [lyrics, setLyrics] = useState<LyricsInput>({});
  const [referenceAudio, setReferenceAudio] = useState<{ filename: string; meta: AudioMeta } | null>(null);
  const [musicProjectId, setMusicProjectId] = useState<string | null>(null);
  const [activeVersionIdx, setActiveVersionIdx] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState(30);

  const { save: saveAudio, saving: savingAudio } = useMusicUpload(musicProjectId);

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

  useEffect(() => {
    if (autoSelect && !activeSessionId && (sessions.data?.length ?? 0) > 0) {
      setActiveSessionId(sessions.data![0].id);
    }
  }, [autoSelect, activeSessionId, sessions.data]);

  const activeSession = useMemo(
    () => sessions.data?.find((s) => s.id === activeSessionId) ?? null,
    [sessions.data, activeSessionId],
  );
  const studio: Studio | null = (activeSession?.studio as Studio | undefined) ?? null;
  const studioMeta = studio ? STUDIO_BY_ID[studio] : null;

  const createSession = useMutation({
    mutationFn: async (args: { studio: Studio; values: Record<string, string | string[]> }) => {
      const created = await api<{ id: string }>('/learning-sessions', {
        method: 'POST',
        body: { studio: args.studio },
      });
      return { id: created.id, values: args.values, studio: args.studio };
    },
    onSuccess: async ({ id, values, studio: createdStudio }) => {
      setSetupValues((s) => ({ ...s, [id]: values }));
      await qc.invalidateQueries({ queryKey: ['kid', kidId, 'sessions'] });
      setActiveSessionId(id);
      setPendingStudio(null);
      setInput('');
      setError(null);
      setActiveVersionIdx(0);

      if (createdStudio === 'music' && !musicProjectId && kidId) {
        try {
          const proj = await api<{ id: string }>('/projects', {
            method: 'POST',
            body: { kind: 'creative', title: 'My Song', kid_id: kidId },
          });
          setMusicProjectId(proj.id);
        } catch {
          // Project creation failure is non-blocking — save feature degrades gracefully
        }
      }
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
      if (studio === 'music') {
        const rerollMatch = text.match(/^\[Re-roll:\s*([^\]]+)\]/i);
        const rerollTrack = rerollMatch ? rerollMatch[1].trim() : undefined;

        const allScores = (messages.data ?? [])
          .filter((m) => m.artifact?.metadata?.score?.tracks)
          .map((m) => m.artifact!.metadata!.score!);
        const latestScore = allScores[allScores.length - 1];

        const lyricsPayload = Object.values(lyrics).some(Boolean) ? lyrics : undefined;

        return api('/llm/music-score', {
          method: 'POST',
          body: {
            prompt: fullPrompt,
            project_id: musicProjectId ?? undefined,
            options: {
              ...(selectedGenres.length ? { genre: selectedGenres.join(' + ') } : {}),
              duration: selectedDuration,
            },
            referenceAudioMeta: referenceAudio?.meta,
            lyrics: lyricsPayload,
            existingScore: rerollTrack && latestScore ? latestScore : undefined,
            rerollTrack,
          },
        });
      }
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

  const generateLyrics = useMutation({
    mutationFn: async () => {
      const desc = input.trim() || 'a fun upbeat song for kids';
      const sys =
        'You are a lyricist writing age-appropriate songs for children aged 8–14. ' +
        'Given a song description, write complete lyrics. ' +
        'Return ONLY valid JSON with this shape (no markdown, no extra text): ' +
        '{"verse":"...","preChorus":"...","chorus":"...","bridge":"...","outro":"..."}. ' +
        'Each section 4–8 lines. Keep it positive, fun, and child-safe.';
      const result = await api<{ reply: string }>('/llm/text-completion', {
        method: 'POST',
        body: { messages: [{ role: 'system', content: sys }, { role: 'user', content: desc }] },
      });
      return JSON.parse(result.reply) as LyricsInput;
    },
    onSuccess: (generated) => {
      setLyrics(generated);
      qc.invalidateQueries({ queryKey: ['wallet', familyId] });
    },
    onError: () => setError('Could not generate lyrics. Please try again.'),
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

  const scoreVersions = useMemo((): MusicScore[] => {
    if (!messages.data) return [];
    return messages.data
      .filter((m) => m.artifact?.metadata?.score?.tracks)
      .map((m) => m.artifact!.metadata!.score!);
  }, [messages.data]);

  const displayScore = scoreVersions[activeVersionIdx] ?? scoreVersions[scoreVersions.length - 1] ?? null;

  const suggestions = useMemo(() => {
    if (!displayScore) return [];
    return buildSuggestions(displayScore, Object.values(lyrics).some(Boolean) ? lyrics : undefined);
  }, [displayScore, lyrics]);

  const balance = wallet.data?.stars_balance ?? 0;
  const cost = studio === 'music' ? musicCostFor(selectedDuration) : (studioMeta?.cost ?? 0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleReroll = (trackIdx: number) => {
    if (!displayScore) return;
    const instrument = displayScore.tracks[trackIdx]?.instrument;
    if (!instrument) return;
    const prefix = `[Re-roll: ${instrument}] Keep everything the same. Change only the ${instrument} — `;
    setInput(prefix);
    inputRef.current?.focus();
  };

  const handleSaveMix = async () => {
    if (!displayScore || !musicProjectId) return;
    const { encodeWavFromScore } = await import('./musicExportUtils');
    const blob = await encodeWavFromScore(displayScore, {});
    await saveAudio(blob, `${slugify(displayScore.title)}.wav`, {
      source: 'mix',
      title: displayScore.title,
      score_version: activeVersionIdx,
    });
  };

  const handleSaveTrack = async (trackIdx: number) => {
    if (!displayScore || !musicProjectId) return;
    const { encodeWavFromScore } = await import('./musicExportUtils');
    const instrument = displayScore.tracks[trackIdx]?.instrument ?? 'track';
    const blob = await encodeWavFromScore(displayScore, {}, trackIdx);
    await saveAudio(blob, `${slugify(displayScore.title)}-${instrument}.wav`, {
      source: 'track',
      title: displayScore.title,
      track: instrument,
      score_version: activeVersionIdx,
    });
  };

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

            {studio === 'music' && suggestions.length > 0 && !send.isPending && (
              <div className="px-4 py-2 flex gap-1.5 flex-wrap border-t border-hairline bg-wash-mint">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="rounded-full bg-canvas-pure border border-hairline px-3 py-1 text-[11px] font-semibold text-ink-soft hover:border-brand-mint hover:text-ink transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="border-t border-hairline bg-canvas-pure p-4 shrink-0">
              {studio === 'music' && (
                <div className="mb-3 space-y-2.5">
                  <DurationPicker value={selectedDuration} onChange={setSelectedDuration} />
                  <GenreTagCloud
                    selected={selectedGenres}
                    onToggle={(g) =>
                      setSelectedGenres((prev) =>
                        prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g].slice(0, 2),
                      )
                    }
                  />
                  <LyricsPanel
                    value={lyrics}
                    onChange={setLyrics}
                    onGenerate={() => generateLyrics.mutate()}
                    generating={generateLyrics.isPending}
                  />
                  <AudioReferenceUploader
                    value={referenceAudio}
                    onAnalyzed={(filename, meta) => setReferenceAudio({ filename, meta })}
                    onRemove={() => setReferenceAudio(null)}
                  />
                </div>
              )}
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
      ) : studio === 'music' ? (
        <MusicScorePlayer
          score={displayScore}
          scoreVersions={scoreVersions}
          activeVersionIdx={activeVersionIdx}
          onSelectVersion={(i) => setActiveVersionIdx(i)}
          onAddTrack={() => inputRef.current?.focus()}
          onImportTrack={() => setShowImport(true)}
          onReroll={handleReroll}
          onSaveMix={musicProjectId ? handleSaveMix : undefined}
          onSaveTrack={musicProjectId ? handleSaveTrack : undefined}
          savingState={savingAudio}
        />
      ) : (
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

function buildSuggestions(score: MusicScore, lyrics?: LyricsInput): string[] {
  const instruments = score.tracks.map((t) => t.instrument);
  const s: string[] = [];
  if (instruments.includes('drums'))       s.push('🥁 Bigger kick drum');
  if (instruments.includes('lead_vocals')) s.push('🎤 Smoother vocal melody');
  if (!instruments.includes('guitar'))     s.push('🎸 Add guitar');
  if (!lyrics || !Object.values(lyrics).some(Boolean)) s.push('📝 Add lyrics');
  s.push('⚡ More energetic');
  s.push('🎲 Surprise me');
  return s.slice(0, 5);
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40) || 'track';
}
