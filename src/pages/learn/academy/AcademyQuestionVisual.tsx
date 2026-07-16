import type { AcademyRenderSpec } from './academyApi';

export function AcademyQuestionVisual({ spec }: { spec: AcademyRenderSpec }) {
  if (spec.kind === 'none') return null;
  if (spec.kind === 'tally_table') return <TallyTable spec={spec} />;
  if (spec.kind === 'number_range') return <NumberRange spec={spec} />;
  if (spec.kind === 'balance_scale') return <BalanceScale spec={spec} />;
  return <RouteMap spec={spec} />;
}

function TallyTable({ spec }: { spec: Extract<AcademyRenderSpec, { kind: 'tally_table' }> }) {
  return (
    <div
      data-testid="academy-native-visual"
      className="mt-6 overflow-hidden rounded-[24px] border-2 border-brand-sky/20 bg-white shadow-sm"
    >
      <div className="grid grid-cols-[minmax(120px,1fr)_minmax(190px,1.4fr)] bg-wash-sky px-5 py-3 text-[13px] font-black uppercase tracking-[0.08em] text-slate2">
        <span>{spec.title}</span>
        <span>{spec.value_label}</span>
      </div>
      {spec.rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[minmax(120px,1fr)_minmax(190px,1.4fr)] items-center border-t border-brand-sky/15 px-5 py-4"
        >
          <span className="text-[16px] font-black text-ink">{row.label}</span>
          <Tallies count={row.count} />
        </div>
      ))}
    </div>
  );
}

function Tallies({ count }: { count: number }) {
  const groups = Array.from({ length: Math.floor(count / 5) });
  const rest = count % 5;
  return (
    <div className="flex flex-wrap items-center gap-3" aria-label={`${count} tally marks`}>
      {groups.map((_, index) => (
        <svg
          // The group is decorative; the accessible count is on the wrapper.
          aria-hidden="true"
          key={index}
          viewBox="0 0 42 30"
          className="h-8 w-11 text-brand-navy"
        >
          {[6, 14, 22, 30].map((x) => (
            <path key={x} d={`M${x} 4 L${x - 2} 26`} stroke="currentColor" strokeWidth="3" />
          ))}
          <path d="M2 22 L35 7" stroke="currentColor" strokeWidth="3" />
        </svg>
      ))}
      {rest > 0 && (
        <svg aria-hidden="true" viewBox="0 0 42 30" className="h-8 w-11 text-brand-navy">
          {Array.from({ length: rest }).map((_, index) => {
            const x = 6 + index * 8;
            return (
              <path
                key={x}
                d={`M${x} 4 L${x - 2} 26`}
                stroke="currentColor"
                strokeWidth="3"
              />
            );
          })}
        </svg>
      )}
    </div>
  );
}

function NumberRange({ spec }: { spec: Extract<AcademyRenderSpec, { kind: 'number_range' }> }) {
  return (
    <div
      data-testid="academy-native-visual"
      className="mt-6 rounded-[24px] border-2 border-brand-mint/30 bg-wash-mint px-6 py-5"
    >
      <div className="flex items-center justify-center">
        <span className="rounded-xl bg-white px-4 py-2 text-[17px] font-black text-ink shadow-sm">
          {spec.lower}
        </span>
        <div className="relative mx-3 h-3 min-w-32 flex-1 rounded-full bg-brand-mint/35">
          <div className="absolute inset-x-3 top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand-mint" />
          <span className="absolute left-3 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-brand-mint bg-white" />
          <span className="absolute right-3 top-1/2 h-4 w-4 translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-brand-mint bg-white" />
        </div>
        <span className="rounded-xl bg-white px-4 py-2 text-[17px] font-black text-ink shadow-sm">
          {spec.upper}
        </span>
      </div>
      <p className="mt-3 text-center text-[13px] font-bold text-slate2">
        The number is between the two endpoints.
      </p>
    </div>
  );
}

const TONE_CLASS = {
  mint: 'fill-brand-mint',
  sky: 'fill-brand-sky',
  sun: 'fill-brand-sunshine',
} as const;

function BalanceScale({ spec }: { spec: Extract<AcademyRenderSpec, { kind: 'balance_scale' }> }) {
  return (
    <div
      data-testid="academy-native-visual"
      className="mt-6 rounded-[28px] border-2 border-brand-sunshine/30 bg-wash-sunshine p-4 sm:p-6"
    >
      <svg
        viewBox="0 0 680 260"
        role="img"
        aria-label="A balanced scale with 13 grams and an unknown cube on the left, and 28 grams on the right"
        className="w-full"
      >
        <path d="M340 105 L340 220" stroke="#25324B" strokeWidth="14" strokeLinecap="round" />
        <path d="M270 226 H410" stroke="#25324B" strokeWidth="18" strokeLinecap="round" />
        <path d="M90 105 H590" stroke="#25324B" strokeWidth="12" strokeLinecap="round" />
        <circle cx="340" cy="105" r="14" fill="#fff" stroke="#25324B" strokeWidth="8" />
        <path d="M115 105 L80 175 H210 L175 105" fill="#DDEBFF" stroke="#25324B" strokeWidth="5" />
        <path d="M505 105 L470 175 H600 L565 105" fill="#FFF0B5" stroke="#25324B" strokeWidth="5" />
        {spec.left.map((item, index) => (
          <g key={`${item.label}-${index}`} transform={`translate(${100 + index * 76} 78)`}>
            <rect
              x="-30"
              y="-55"
              width="60"
              height="55"
              rx="12"
              className={TONE_CLASS[item.tone]}
              stroke="#25324B"
              strokeWidth="4"
            />
            <text
              x="0"
              y="-22"
              textAnchor="middle"
              fill="#25324B"
              fontSize="20"
              fontWeight="800"
            >
              {item.label}
            </text>
          </g>
        ))}
        {spec.right.map((item, index) => (
          <g key={`${item.label}-${index}`} transform={`translate(${535 + index * 76} 78)`}>
            <path
              d="M-36 0 L-26 -58 H26 L36 0 Z"
              className={TONE_CLASS[item.tone]}
              stroke="#25324B"
              strokeWidth="4"
            />
            <text
              x="0"
              y="-22"
              textAnchor="middle"
              fill="#25324B"
              fontSize="20"
              fontWeight="800"
            >
              {item.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function RouteMap({ spec }: { spec: Extract<AcademyRenderSpec, { kind: 'route' }> }) {
  return (
    <div
      data-testid="academy-native-visual"
      className="mt-6 overflow-hidden rounded-[28px] border-2 border-brand-sky/20 bg-gradient-to-br from-wash-sky to-white p-5"
    >
      <svg
        viewBox="0 0 680 260"
        role="img"
        aria-label={`A route from ${spec.from} to ${spec.to}`}
        className="w-full"
      >
        <path
          d="M90 170 C160 55 260 35 345 92 C430 150 510 188 590 95"
          fill="none"
          stroke="#55A7FF"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray="2 22"
        />
        <circle cx="90" cy="170" r="18" fill="#FF7C68" />
        <circle cx="590" cy="95" r="18" fill="#57C69A" />
        <text x="90" y="215" textAnchor="middle" fill="#25324B" fontSize="24" fontWeight="900">
          {spec.from}
        </text>
        <text x="590" y="58" textAnchor="middle" fill="#25324B" fontSize="24" fontWeight="900">
          {spec.to}
        </text>
        <g transform="translate(330 122)">
          <rect x="-155" y="-28" width="310" height="56" rx="28" fill="#fff" />
          <text x="0" y="7" textAnchor="middle" fill="#25324B" fontSize="18" fontWeight="800">
            {spec.label}
          </text>
        </g>
      </svg>
    </div>
  );
}
