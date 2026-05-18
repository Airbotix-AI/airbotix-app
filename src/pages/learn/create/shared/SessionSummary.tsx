import type { SessionSummary as Summary } from './useSession';

export function SessionSummary({
  summary,
  onClose,
}: {
  summary: Summary;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-ink/60 flex items-center justify-center p-6">
      <div className="auth-card text-center" style={{ maxWidth: '480px' }}>
        <div className="text-[56px]">🎓</div>
        <h1 className="hero-display mt-4" style={{ fontSize: '32px' }}>
          Nice session!
        </h1>
        <p className="lead-text mt-3" style={{ fontSize: '15px' }}>
          Here's what you made just now.
        </p>

        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="stat-tile sky">
            <div className="stat-num text-brand-sky">{summary.duration_minutes}</div>
            <div className="stat-label">min</div>
          </div>
          <div className="stat-tile mint">
            <div className="stat-num text-brand-mint">{summary.artifacts_count}</div>
            <div className="stat-label">made</div>
          </div>
          <div className="stat-tile coral">
            <div className="stat-num text-brand-coral">{summary.stars_used}</div>
            <div className="stat-label">stars</div>
          </div>
        </div>

        <p className="mt-6 text-[13px] text-slate2">
          Come back tomorrow for more — your parent and teacher can see your activity 🌟
        </p>

        <button onClick={onClose} className="btn-pill-primary mt-6 w-full">
          Done 👋
        </button>
      </div>
    </div>
  );
}
