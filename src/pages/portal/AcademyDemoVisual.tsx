export type AcademyDemoVisualKind = 'groups' | 'money' | 'data' | 'time';

export function AcademyDemoVisual({ visual }: { visual: AcademyDemoVisualKind }) {
  if (visual === 'groups') {
    return (
      <div
        className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6"
        role="img"
        aria-label="6 cars with 3 people in each"
      >
        {Array.from({ length: 6 }, (_, car) => (
          <div key={car} className="rounded-xl border-2 border-brand-sky bg-wash-sky p-2">
            <div className="flex justify-center gap-1" aria-hidden="true">
              {Array.from({ length: 3 }, (_, person) => (
                <span key={person} className="h-3 w-3 rounded-full bg-brand-coral" />
              ))}
            </div>
            <div className="mt-1 text-center text-[10px] font-black text-ink">car {car + 1}</div>
          </div>
        ))}
      </div>
    );
  }

  if (visual === 'money') {
    const coins = [
      { label: '$2', size: 'h-20 w-20', colour: 'bg-brand-sun' },
      { label: '50c', size: 'h-16 w-16', colour: 'bg-wash-sky' },
      { label: '20c', size: 'h-14 w-14', colour: 'bg-wash-mint' },
      { label: '20c', size: 'h-14 w-14', colour: 'bg-wash-mint' },
    ];
    return (
      <div
        className="mt-5 flex min-h-24 flex-wrap items-center justify-center gap-3 rounded-2xl bg-canvas p-4"
        role="img"
        aria-label="One 2 dollar coin, one 50 cent coin and two 20 cent coins"
      >
        {coins.map((coin, index) => (
          <div
            key={`${coin.label}-${index}`}
            className={`grid place-items-center rounded-full border-2 border-ink/20 ${coin.size} ${coin.colour}`}
          >
            <span className="text-[14px] font-black text-ink">{coin.label}</span>
          </div>
        ))}
      </div>
    );
  }

  if (visual === 'data') {
    const bars = [
      { label: 'Dogs', value: 8, colour: 'bg-brand-coral' },
      { label: 'Cats', value: 5, colour: 'bg-brand-sky' },
      { label: 'Fish', value: 3, colour: 'bg-brand-mint' },
    ];
    return (
      <div
        className="mt-5 rounded-2xl bg-canvas p-4"
        role="img"
        aria-label="Bar chart showing Dogs 8, Cats 5 and Fish 3"
      >
        <div className="space-y-3">
          {bars.map((bar) => (
            <div key={bar.label} className="grid grid-cols-[42px_1fr_24px] items-center gap-2">
              <span className="text-[11px] font-black text-ink">{bar.label}</span>
              <div className="h-6 rounded-full bg-white">
                <div
                  className={`h-6 rounded-full ${bar.colour}`}
                  style={{ width: `${bar.value * 10}%` }}
                />
              </div>
              <span className="text-[13px] font-black text-ink">{bar.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 grid place-items-center rounded-2xl bg-canvas p-4">
      <svg
        viewBox="0 0 120 120"
        className="h-36 w-36"
        role="img"
        aria-label="Clock showing quarter past four"
      >
        <circle
          cx="60"
          cy="60"
          r="53"
          fill="white"
          stroke="currentColor"
          strokeWidth="4"
          className="text-ink"
        />
        {[12, 3, 6, 9].map((number, index) => {
          const positions = [
            { x: 60, y: 20 },
            { x: 100, y: 64 },
            { x: 60, y: 106 },
            { x: 20, y: 64 },
          ];
          return (
            <text
              key={number}
              x={positions[index].x}
              y={positions[index].y}
              textAnchor="middle"
              className="fill-ink text-[11px] font-black"
            >
              {number}
            </text>
          );
        })}
        <line
          x1="60"
          y1="60"
          x2="96"
          y2="60"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          className="text-brand-sky"
        />
        <line
          x1="60"
          y1="60"
          x2="75"
          y2="73"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          className="text-brand-coral"
        />
        <circle cx="60" cy="60" r="5" className="fill-ink" />
      </svg>
    </div>
  );
}
