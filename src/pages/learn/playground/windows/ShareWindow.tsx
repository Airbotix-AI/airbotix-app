interface ShareWindowProps {
  className?: string;
}

/** Placeholder body for the Share window — the feature isn't built yet. */
export function ShareWindow({ className }: ShareWindowProps) {
  return (
    <div className={`flex h-full items-center justify-center bg-canvas p-8 ${className ?? ''}`}>
      <div className="max-w-sm rounded-2xl bg-surface px-8 py-10 text-center shadow-card-soft">
        <div className="mb-3 text-4xl">✨</div>
        <h2 className="text-xl font-bold text-ink">Share — coming soon ✨</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Soon you'll be able to share your game with friends and your class.
        </p>
      </div>
    </div>
  );
}
