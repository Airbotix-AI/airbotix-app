// Music Studio — the Music Stage as its OWN immersive surface
// (music-stage-prd.md §1.2, D-MS7).
//
// The Stage used to live inside the Workspace: a three-pane IDE shell with a
// session sidebar, a chat transcript and a composer, with the stage wedged in the
// middle pane. That shell is right for a chat studio and wrong for a band — the
// kid ended up looking at a session list and a chat bubble while the thing the
// whole feature is about got a letterboxed strip. Music is now a full-viewport
// surface, like the Blocks Studio: nav bar off, stage front and centre.
//
// Sessions still back it (every take is a message pair, versions aggregate from
// the session) — the URL just carries the session instead of a sidebar.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';
import { MusicStagePane } from '../workspace/stage/MusicStagePane';
import { ImportTrackPicker } from '../workspace/ImportTrackPicker';
import type { Message } from '../workspace/WorkspacePage';

export function MusicStudioPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const nav = useNavigate();
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const familyId = me.data?.kind === 'kid' ? me.data.family_id : null;

  const [showImport, setShowImport] = useState(false);
  // "create for class" carries the class here; the Stage owns no project until
  // 💾 Save / 🎧 Make it real mints one, so the id has to survive the redirect.
  const [classId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('class'),
  );

  // No session in the URL → open one and put it there, so a refresh (or a link a
  // kid sends themselves) returns to the same song instead of a blank stage.
  // The backend reuses an active music session rather than minting a new one on
  // every visit, so this is not a session factory.
  const open = useMutation({
    mutationFn: () =>
      api<{ id: string }>('/learning-sessions', { method: 'POST', body: { studio: 'music' } }),
    onSuccess: ({ id }) => {
      const q = classId ? `?class=${encodeURIComponent(classId)}` : '';
      nav(`/learn/music/${id}${q}`, { replace: true });
    },
  });

  useEffect(() => {
    if (!sessionId && kidId && !open.isPending && !open.isSuccess) open.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per mount
  }, [sessionId, kidId]);

  const messages = useQuery<Message[]>({
    queryKey: ['session', sessionId, 'messages'],
    queryFn: () => api<Message[]>(`/learning-sessions/${sessionId}/messages`),
    enabled: !!sessionId,
  });

  const wallet = useQuery<{ stars_balance: number }>({
    queryKey: ['wallet', familyId],
    queryFn: () => api<{ stars_balance: number }>(`/families/${familyId}/wallet`),
    enabled: !!familyId,
  });

  const qc = useQueryClient();
  const importTrack = useMutation({
    mutationFn: (args: { artifactId: string; label: string }) => {
      if (!sessionId) throw new ApiError(400, 'NO_SESSION', 'No active session.');
      return api(`/learning-sessions/${sessionId}/append-artifact`, {
        method: 'POST',
        body: { artifact_id: args.artifactId, label: args.label },
      });
    },
    onSuccess: () => {
      setShowImport(false);
      qc.invalidateQueries({ queryKey: ['session', sessionId, 'messages'] });
    },
  });

  if (!sessionId) {
    return (
      <div className="grid h-dvh place-items-center bg-canvas">
        <p className="lead-text">Setting up your stage…</p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas">
      <MusicStagePane
        key={sessionId}
        sessionId={sessionId}
        messages={messages.data ?? []}
        balance={wallet.data?.stars_balance ?? 0}
        kidId={kidId}
        familyId={familyId}
        classId={classId}
        onExit={() => nav('/learn')}
        onImportTrack={() => setShowImport(true)}
      />
      {showImport && kidId && (
        <ImportTrackPicker
          kidId={kidId}
          excludeIds={
            new Set(
              (messages.data ?? []).map((m) => m.artifact?.id).filter((x): x is string => !!x),
            )
          }
          busy={importTrack.isPending}
          onClose={() => setShowImport(false)}
          onPick={(artifactId, label) => importTrack.mutate({ artifactId, label })}
        />
      )}
    </div>
  );
}
