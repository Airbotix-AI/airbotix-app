import type { MusicScore } from './MusicScorePlayer';

export function VersionBar({
  scoreVersions,
  activeVersionIdx,
  onSelectVersion,
}: {
  scoreVersions: MusicScore[];
  activeVersionIdx: number;
  onSelectVersion: (i: number) => void;
}) {
  if (scoreVersions.length < 2) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {scoreVersions.map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelectVersion(i)}
          className={
            i === activeVersionIdx
              ? 'rounded-full px-2 py-0.5 text-[10px] font-bold bg-brand-coral text-white'
              : 'rounded-full px-2 py-0.5 text-[10px] font-bold bg-slate-700 text-slate-300 hover:bg-slate-600'
          }
        >
          v{i + 1}{i === scoreVersions.length - 1 ? ' ←' : ''}
        </button>
      ))}
    </div>
  );
}
