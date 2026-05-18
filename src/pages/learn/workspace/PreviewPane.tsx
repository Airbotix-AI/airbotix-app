import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import type { Message } from './WorkspacePage';
import type { ToolKind } from './ToolPicker';

type Artifact = NonNullable<Message['artifact']>;

const TOOL_EMOJI: Record<string, string> = {
  chat: '💬',
  image: '🎨',
  music: '🎵',
  voice: '🔊',
  video: '🎬',
};

export function PreviewPane({
  artifact,
  tool,
}: {
  artifact: Artifact | null;
  tool: ToolKind;
}) {
  const dl = useQuery<{ url: string }>({
    queryKey: ['artifact', artifact?.id, 'download'],
    queryFn: () =>
      api<{ url: string }>(
        `/projects/${artifact!.project_id}/artifacts/${artifact!.id}/download-url`,
        { method: 'POST' },
      ),
    enabled: !!artifact,
    staleTime: 4 * 60_000,
  });

  return (
    <aside className="hidden lg:flex w-96 shrink-0 flex-col bg-canvas-pure">
      <div className="px-5 py-4 border-b border-hairline">
        <div className="eyebrow">{TOOL_EMOJI[tool] ?? '✨'} Preview</div>
        <div className="text-[14px] font-bold text-ink mt-1">
          {artifact ? `Latest ${artifact.kind}` : 'No preview yet'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {!artifact && (
          <div className="text-center py-12">
            <div className="text-[48px] opacity-30">✨</div>
            <p className="text-[13px] text-slate2 mt-3">
              Send a media request (image / music / voice / video) and it shows up here.
            </p>
          </div>
        )}
        {artifact && (
          <div>
            {artifact.kind === 'image' && dl.data?.url && (
              <img
                src={dl.data.url}
                alt=""
                className="w-full rounded-2xl border-2 border-hairline"
              />
            )}
            {artifact.kind === 'audio' && dl.data?.url && (
              <audio controls className="w-full">
                <source src={dl.data.url} type={artifact.mime_type} />
              </audio>
            )}
            {artifact.kind === 'video' && dl.data?.url && (
              <video controls className="w-full rounded-2xl border-2 border-hairline">
                <source src={dl.data.url} type={artifact.mime_type} />
              </video>
            )}
            {!dl.data && <p className="text-[13px] text-slate2">Loading preview…</p>}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => navigator.clipboard?.writeText(dl.data?.url ?? '')}
                className="btn-pill-secondary text-[12px] flex-1"
              >
                Copy link
              </button>
              <a
                href={dl.data?.url}
                download
                className="btn-pill-secondary text-[12px] flex-1 text-center"
              >
                Download
              </a>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
