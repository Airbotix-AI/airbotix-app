// Pick an existing audio artifact (generated in another session, or
// later uploaded) and append it as a new track in the current music mix.

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

interface KidArtifact {
  id: string;
  kind: 'audio' | 'image' | 'video' | 'text' | 'code_file' | 'project_export';
  mime_type: string;
  created_at: string;
  s3_key: string;
  project: { id: string; title: string | null } | null;
  metadata?: { prompt?: string } | null;
}

export function ImportTrackPicker({
  kidId,
  excludeIds,
  busy,
  onClose,
  onPick,
}: {
  kidId: string;
  excludeIds: Set<string>;
  busy: boolean;
  onClose: () => void;
  onPick: (artifactId: string, label: string) => void;
}) {
  const artifacts = useQuery<KidArtifact[]>({
    queryKey: ['kid', kidId, 'artifacts', 'audio'],
    queryFn: () => api<KidArtifact[]>(`/kids/${kidId}/artifacts?kind=audio`),
  });

  const usable = (artifacts.data ?? []).filter((a) => !excludeIds.has(a.id));

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 text-slate-100 w-full max-w-xl rounded-2xl border border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400 font-bold">
              📂 Import a track
            </div>
            <div className="text-[15px] font-bold text-slate-100 mt-0.5">
              Pull from your other chats
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 text-[20px]"
          >
            ×
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {artifacts.isLoading && (
            <p className="text-center text-[13px] text-slate-400 py-10">Loading…</p>
          )}
          {!artifacts.isLoading && usable.length === 0 && (
            <p className="text-center text-[13px] text-slate-400 py-10 px-6">
              Nothing to import yet. Generate some music in another chat first, then come back.
            </p>
          )}
          {usable.map((a) => {
            const label = a.metadata?.prompt
              ? stripPrefix(a.metadata.prompt)
              : `${a.kind} · ${new Date(a.created_at).toLocaleDateString()}`;
            return (
              <button
                key={a.id}
                disabled={busy}
                onClick={() => onPick(a.id, label)}
                className="w-full text-left px-3 py-3 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-3"
              >
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-slate-800 text-[16px]">
                  🎵
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-slate-100 truncate">
                    {label}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(a.created_at).toLocaleString()} · {a.mime_type}
                  </div>
                </div>
                <span className="text-[12px] text-brand-coral font-semibold">+ Add</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function stripPrefix(s: string): string {
  const m = s.match(/^\[[^\]]+\]\s*(.*)$/);
  return (m ? m[1] : s).trim().slice(0, 80);
}
