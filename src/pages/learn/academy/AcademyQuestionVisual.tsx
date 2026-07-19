import { useId } from 'react';

import type {
  AcademyPatternSymbol,
  AcademyRenderSpec,
  AcademyShape,
  AcademyShapeName,
} from './academyApi';

export function AcademyQuestionVisual({ spec }: { spec: AcademyRenderSpec }) {
  if (spec.kind === 'none') return null;
  if (spec.kind === 'tally_table') return <TallyTable spec={spec} />;
  if (spec.kind === 'number_range') return <NumberRange spec={spec} />;
  if (spec.kind === 'balance_scale') return <BalanceScale spec={spec} />;
  if (spec.kind === 'equal_groups') return <EqualGroups spec={spec} />;
  if (spec.kind === 'analog_clock') return <AnalogClock spec={spec} />;
  if (spec.kind === 'solid_shape') return <SolidShape spec={spec} />;
  if (spec.kind === 'coin_collection') return <CoinCollection spec={spec} />;
  if (spec.kind === 'shape_matrix') return <ShapeMatrix spec={spec} />;
  if (spec.kind === 'symbol_pattern') return <SymbolPattern spec={spec} />;
  return <RouteMap spec={spec} />;
}

export function AcademyChoiceVisual({
  spec,
  choiceIndex,
}: {
  spec: AcademyRenderSpec;
  choiceIndex: number;
}) {
  if (spec.kind === 'shape_matrix') {
    const choice = spec.choices[choiceIndex];
    return choice ? (
      <div className="w-20 flex-none" aria-hidden="true">
        <ShapeGlyph value={choice} />
      </div>
    ) : null;
  }
  if (spec.kind === 'symbol_pattern') {
    const choice = spec.choices[choiceIndex];
    return choice ? (
      <div className="flex flex-none items-center gap-1" aria-hidden="true">
        {choice.map((symbol, index) => (
          <SymbolGlyph key={`${symbol}-${index}`} symbol={symbol} />
        ))}
      </div>
    ) : null;
  }
  return null;
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
              <path key={x} d={`M${x} 4 L${x - 2} 26`} stroke="currentColor" strokeWidth="3" />
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
            <text x="0" y="-22" textAnchor="middle" fill="#25324B" fontSize="20" fontWeight="800">
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
            <text x="0" y="-22" textAnchor="middle" fill="#25324B" fontSize="20" fontWeight="800">
              {item.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

const CAR_TONES = ['#CFE8FF', '#C7F2DF', '#FFE7A3'] as const;

function pluralise(label: string, count: number) {
  if (count === 1) return label;
  if (label === 'person') return 'people';
  return `${label}s`;
}

function EqualGroups({ spec }: { spec: Extract<AcademyRenderSpec, { kind: 'equal_groups' }> }) {
  const groupWord = pluralise(spec.group_label, spec.group_count);
  const itemWord = pluralise(spec.item_label, spec.items_per_group);
  return (
    <div
      data-testid="academy-native-visual"
      role="img"
      aria-label={`${spec.group_count} ${groupWord} with ${spec.items_per_group} ${itemWord} in each`}
      className="mt-6 rounded-[28px] border-2 border-brand-sunshine/30 bg-wash-sunshine p-4 sm:p-6"
    >
      <div className="flex items-center justify-center gap-2 text-center text-sm font-black text-[#25324B] sm:text-base">
        <span data-testid="academy-group-count" className="rounded-full bg-white px-3 py-2 shadow-sm">
          {spec.group_count} {groupWord}
        </span>
        <span aria-hidden="true" className="text-xl text-brand-coral">
          ×
        </span>
        <span data-testid="academy-items-per-group" className="rounded-full bg-white px-3 py-2 shadow-sm">
          {spec.items_per_group} {itemWord} in each
        </span>
      </div>

      <div className="relative mx-auto mt-4 grid max-w-2xl grid-cols-3 gap-x-2 gap-y-3 sm:gap-x-4">
        {Array.from({ length: spec.group_count }, (_, groupIndex) => (
          <div
            data-testid="academy-equal-group"
            key={groupIndex}
            className="relative z-10 min-w-0"
            aria-hidden="true"
          >
            {groupIndex % 3 !== 2 && groupIndex < spec.group_count - 1 && (
              <span className="absolute left-[88%] top-[62%] -z-10 h-1 w-[28%] rounded-full bg-[#25324B]" />
            )}
            <svg viewBox="0 0 140 96" className="w-full">
              {Array.from({ length: spec.items_per_group }, (_, itemIndex) => {
                const spacing = 82 / Math.max(spec.items_per_group - 1, 1);
                const x = spec.items_per_group === 1 ? 70 : 29 + itemIndex * spacing;
                return (
                  <g data-testid="academy-equal-group-item" key={itemIndex}>
                    <circle cx={x} cy="28" r="10" fill="#FFF" stroke="#25324B" strokeWidth="4" />
                    <path
                      d={`M${x - 10} 51 Q${x} 35 ${x + 10} 51`}
                      fill="#FF9E92"
                      stroke="#25324B"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </g>
                );
              })}
              <path
                d="M14 48 H126 L116 78 H25 Z"
                fill={CAR_TONES[groupIndex % CAR_TONES.length]}
                stroke="#25324B"
                strokeWidth="5"
                strokeLinejoin="round"
              />
              <circle cx="40" cy="80" r="9" fill="#FFF" stroke="#25324B" strokeWidth="5" />
              <circle cx="103" cy="80" r="9" fill="#FFF" stroke="#25324B" strokeWidth="5" />
            </svg>
            <p className="-mt-1 text-center text-[11px] font-black text-slate2 sm:text-xs">
              {spec.items_per_group} {itemWord}
            </p>
          </div>
        ))}
      </div>

      <div
        data-testid="academy-equal-groups-equation"
        className="mt-4 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 rounded-[18px] bg-[#25324B] px-4 py-3 text-center text-sm font-bold text-white sm:text-base"
      >
        <span>{spec.group_count} {groupWord}</span>
        <span aria-hidden="true">×</span>
        <span>{spec.items_per_group} {itemWord} in each</span>
        <span aria-hidden="true">=</span>
        <strong className="text-xl text-brand-sunshine">?</strong>
        <span>{itemWord} altogether</span>
      </div>
    </div>
  );
}

function clockPoint(angle: number, length: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: 150 + Math.cos(radians) * length,
    y: 150 + Math.sin(radians) * length,
  };
}

function AnalogClock({ spec }: { spec: Extract<AcademyRenderSpec, { kind: 'analog_clock' }> }) {
  const minuteAngle = spec.minute * 6;
  const hourAngle = ((spec.hour % 12) + spec.minute / 60) * 30;
  const minuteEnd = clockPoint(minuteAngle, 92);
  const hourEnd = clockPoint(hourAngle, 62);
  return (
    <div
      data-testid="academy-native-visual"
      className="mt-6 rounded-[28px] border-2 border-brand-sky/25 bg-wash-sky p-4 sm:p-6"
    >
      <svg
        viewBox="0 0 300 300"
        role="img"
        aria-label="An analogue clock with the minute hand pointing to 3 and the hour hand just past 8"
        className="mx-auto w-full max-w-[320px]"
      >
        <circle cx="150" cy="150" r="137" fill="#FFFFFF" stroke="#25324B" strokeWidth="9" />
        <circle cx="150" cy="150" r="126" fill="none" stroke="#CFE8FF" strokeWidth="5" />
        {Array.from({ length: 60 }, (_, index) => {
          const outer = clockPoint(index * 6, 119);
          const inner = clockPoint(index * 6, index % 5 === 0 ? 104 : 112);
          return (
            <line
              aria-hidden="true"
              key={index}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="#25324B"
              strokeWidth={index % 5 === 0 ? 4 : 2}
              strokeLinecap="round"
            />
          );
        })}
        {Array.from({ length: 12 }, (_, index) => {
          const number = index + 1;
          const point = clockPoint(number * 30, 86);
          return (
            <text
              aria-hidden="true"
              key={number}
              x={point.x}
              y={point.y + 7}
              textAnchor="middle"
              fill="#25324B"
              fontSize="22"
              fontWeight="800"
            >
              {number}
            </text>
          );
        })}
        <line
          data-testid="academy-clock-hour-hand"
          x1="150"
          y1="150"
          x2={hourEnd.x}
          y2={hourEnd.y}
          stroke="#25324B"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <line
          data-testid="academy-clock-minute-hand"
          x1="150"
          y1="150"
          x2={minuteEnd.x}
          y2={minuteEnd.y}
          stroke="#FF7C68"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <circle cx="150" cy="150" r="11" fill="#FFE27A" stroke="#25324B" strokeWidth="5" />
      </svg>
    </div>
  );
}

function SolidShape({ spec }: { spec: Extract<AcademyRenderSpec, { kind: 'solid_shape' }> }) {
  return (
    <div
      data-testid="academy-native-visual"
      className="mt-6 rounded-[28px] border-2 border-brand-mint/30 bg-wash-mint p-4 sm:p-6"
    >
      <svg
        viewBox="0 0 420 280"
        role="img"
        aria-label={
          spec.shape === 'triangular_prism'
            ? 'A pet hutch with two triangular ends and rectangular side faces'
            : 'A three-dimensional solid shape'
        }
        className="mx-auto w-full max-w-[520px]"
      >
        <path
          data-testid="academy-solid-shape-side"
          d="M105 70 L270 42 L355 205 L190 230 Z"
          fill="#CFE8FF"
          stroke="#25324B"
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <path
          data-testid="academy-solid-shape-end"
          d="M105 70 L35 220 L190 230 Z"
          fill="#FFE7A3"
          stroke="#25324B"
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <path
          d="M270 42 L215 165 L355 205 Z"
          fill="#C7F2DF"
          stroke="#25324B"
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <path d="M105 70 L270 42 M35 220 L215 165 M190 230 L355 205" fill="none" stroke="#25324B" strokeWidth="7" />
        <g stroke="#70809A" strokeWidth="3" opacity="0.65">
          <path d="M226 142 L334 177 M238 115 L320 145 M250 88 L304 112" />
          <path d="M238 151 L286 78 M270 162 L309 105 M302 173 L331 135" />
        </g>
        <rect x="83" y="150" width="58" height="71" rx="5" fill="#FFFFFF" stroke="#25324B" strokeWidth="6" />
      </svg>
      <p className="mt-1 text-center text-sm font-bold text-slate2">
        Look at the ends and side faces of the solid.
      </p>
    </div>
  );
}

function formatCoin(cents: number) {
  if (cents >= 100) return `$${cents / 100}`;
  return `${cents}c`;
}

function CoinCollection({
  spec,
}: {
  spec: Extract<AcademyRenderSpec, { kind: 'coin_collection' }>;
}) {
  const labels = spec.coins_cents.map(formatCoin);
  return (
    <div
      data-testid="academy-native-visual"
      role="img"
      aria-label={`Coins: ${labels.join(', ')}`}
      className="mt-6 flex flex-wrap items-end justify-center gap-3 rounded-[28px] border-2 border-brand-sunshine/30 bg-wash-sunshine p-5 sm:gap-4"
    >
      {spec.coins_cents.map((cents, index) => {
        const size = cents >= 100 ? 76 : cents >= 50 ? 68 : cents >= 20 ? 60 : 52;
        return (
          <span
            aria-hidden="true"
            key={`${cents}-${index}`}
            className="grid flex-none place-items-center rounded-full border-[3px] border-brand-navy bg-gradient-to-br from-white via-slate-100 to-slate-300 text-[14px] font-black text-brand-navy shadow-sm"
            style={{ width: size, height: size }}
          >
            {formatCoin(cents)}
          </span>
        );
      })}
    </div>
  );
}

function shapePath(shape: AcademyShapeName) {
  if (shape === 'hexagon') return 'M25 10 H75 L95 50 L75 90 H25 L5 50 Z';
  if (shape === 'diamond') return 'M50 5 L95 50 L50 95 L5 50 Z';
  if (shape === 'triangle') return 'M14 10 L14 90 L90 90 Z';
  return 'M22 10 H78 L95 90 H5 Z';
}

function ShapeGlyph({ value }: { value: AcademyShape }) {
  const rawId = useId();
  const clipId = `shape-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const path = shapePath(value.shape);
  return (
    <svg viewBox="0 0 100 100" className="h-auto w-full" focusable="false">
      <defs>
        <clipPath id={clipId}>
          <path d={path} />
        </clipPath>
      </defs>
      <path
        d={path}
        fill={value.fill === 'solid' ? '#25324B' : '#FFFFFF'}
        stroke="#25324B"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {value.fill === 'grid' && (
        <g clipPath={`url(#${clipId})`} stroke="#70809A" strokeWidth="2">
          {[22, 42, 62, 82].map((position) => (
            <g key={position}>
              <path d={`M0 ${position} H100`} />
              <path d={`M${position} 0 V100`} />
            </g>
          ))}
        </g>
      )}
      {value.fill === 'dots' && (
        <g clipPath={`url(#${clipId})`} fill="#25324B">
          {[25, 50, 75].flatMap((y) =>
            [25, 50, 75].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3" />),
          )}
        </g>
      )}
      <path d={path} fill="none" stroke="#25324B" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

function isQuestionCell(
  cell: AcademyShape | { question: true } | null,
): cell is { question: true } {
  return cell !== null && 'question' in cell;
}

function ShapeMatrix({ spec }: { spec: Extract<AcademyRenderSpec, { kind: 'shape_matrix' }> }) {
  return (
    <div
      data-testid="academy-native-visual"
      role="img"
      aria-label="A four by four shape pattern with the bottom-right shape missing"
      className="mt-6 grid grid-cols-4 overflow-hidden rounded-[20px] border-2 border-brand-navy bg-white"
    >
      {spec.cells.flatMap((row, rowIndex) =>
        row.map((cell, columnIndex) => (
          <div
            key={`${rowIndex}-${columnIndex}`}
            className={`grid aspect-square min-w-0 place-items-center border-brand-navy/40 p-2 ${
              columnIndex < 3 ? 'border-r' : ''
            } ${rowIndex < 3 ? 'border-b' : ''} ${
              isQuestionCell(cell) ? 'bg-brand-sky/25' : 'bg-white'
            }`}
          >
            {cell && !isQuestionCell(cell) && <ShapeGlyph value={cell} />}
            {isQuestionCell(cell) && (
              <span className="text-[clamp(24px,8vw,54px)] font-black text-brand-sky">?</span>
            )}
          </div>
        )),
      )}
    </div>
  );
}

function SymbolGlyph({ symbol }: { symbol: AcademyPatternSymbol }) {
  const common = { fill: '#FFFFFF', stroke: '#25324B', strokeWidth: 3 };
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9 flex-none" focusable="false">
      {symbol === 'circle' && <circle cx="20" cy="20" r="9" {...common} />}
      {symbol === 'oval' && (
        <ellipse cx="20" cy="20" rx="7" ry="14" fill="#70809A" stroke="#25324B" strokeWidth="3" />
      )}
      {symbol === 'triangle' && <path d="M20 8 L33 31 H7 Z" {...common} />}
      {symbol === 'star' && (
        <path d="M20 4 L24 15 L36 20 L24 24 L20 36 L16 24 L4 20 L16 15 Z" {...common} />
      )}
    </svg>
  );
}

function SymbolPattern({ spec }: { spec: Extract<AcademyRenderSpec, { kind: 'symbol_pattern' }> }) {
  return (
    <div
      data-testid="academy-native-visual"
      role="img"
      aria-label={`Repeating lights: ${spec.sequence.join(', ')}`}
      className="mt-6 rounded-[28px] border-2 border-brand-sky/20 bg-wash-sky p-4 sm:p-6"
    >
      <div className="grid grid-cols-5 justify-items-center gap-2 sm:grid-cols-10">
        {spec.sequence.map((symbol, index) => (
          <SymbolGlyph key={`${symbol}-${index}`} symbol={symbol} />
        ))}
      </div>
      <div className="mt-4 border-t-2 border-dashed border-brand-sky/35 pt-3 text-center text-[14px] font-black text-slate2">
        What comes next?
      </div>
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
