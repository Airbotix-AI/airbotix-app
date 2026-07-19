import type { AcademyRenderSpec, AcademyShellKind, AcademyTilePattern } from './academyApi';

type Spec<K extends AcademyRenderSpec['kind']> = Extract<AcademyRenderSpec, { kind: K }>;

const INK = '#25324B';
const GREY = '#9CA3AF';

export function AcademyYear3QuestionVisual({ spec }: { spec: AcademyRenderSpec }) {
  if (spec.kind === 'schedule_table') return <ScheduleTable spec={spec} />;
  if (spec.kind === 'joined_solids') return <JoinedSolids />;
  if (spec.kind === 'side_view_model') return <SideViewModel />;
  if (spec.kind === 'tile_rotation') return <TileRotation spec={spec} />;
  if (spec.kind === 'symmetry_grid') return <SymmetryGrid spec={spec} />;
  if (spec.kind === 'fraction_shapes') return <FractionPrompt />;
  if (spec.kind === 'shell_bags') return <ShellBags spec={spec} />;
  if (spec.kind === 'pyramid_faces') return <PyramidFaces spec={spec} />;
  return null;
}

export function AcademyYear3ChoiceVisual({
  spec,
  choiceIndex,
}: {
  spec: AcademyRenderSpec;
  choiceIndex: number;
}) {
  if (spec.kind === 'side_view_model') return <SideViewChoice index={choiceIndex} />;
  if (spec.kind === 'tile_rotation') {
    const choice = spec.choices[choiceIndex];
    return choice ? <TileStrip patterns={choice} compact /> : null;
  }
  if (spec.kind === 'fraction_shapes') {
    const choice = spec.choices[choiceIndex];
    return choice ? <FractionChoice variant={choice} /> : null;
  }
  if (spec.kind === 'shell_bags') {
    const choice = spec.choices[choiceIndex];
    return choice ? <ShellChoice shells={choice} /> : null;
  }
  return null;
}

function VisualCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-testid="academy-native-visual"
      className="mt-6 rounded-[28px] border-2 border-brand-sky/20 bg-gradient-to-br from-wash-sky to-white p-4 sm:p-6"
    >
      {children}
    </div>
  );
}

function ScheduleTable({ spec }: { spec: Spec<'schedule_table'> }) {
  return (
    <VisualCard>
      <div
        role="table"
        aria-label={spec.title}
        className="overflow-hidden rounded-2xl border-2 border-brand-navy bg-white"
      >
        <div className="bg-brand-navy px-4 py-3 text-center text-base font-black text-white">
          {spec.title}
        </div>
        <div
          role="row"
          className="grid grid-cols-[110px_1fr] bg-brand-sky/20 text-sm font-black text-brand-navy sm:grid-cols-[150px_1fr]"
        >
          {spec.columns.map((column) => (
            <span role="columnheader" key={column} className="px-3 py-2">
              {column}
            </span>
          ))}
        </div>
        {spec.rows.map(([time, activity]) => (
          <div
            role="row"
            key={`${time}-${activity}`}
            className="grid grid-cols-[110px_1fr] border-t border-brand-navy/20 text-sm sm:grid-cols-[150px_1fr] sm:text-base"
          >
            <span role="cell" className="px-3 py-2 font-black text-brand-navy">
              {time}
            </span>
            <span
              role="cell"
              className="border-l border-brand-navy/20 px-3 py-2 font-bold text-slate2"
            >
              {activity}
            </span>
          </div>
        ))}
      </div>
    </VisualCard>
  );
}

function JoinedSolids() {
  return (
    <VisualCard>
      <svg
        viewBox="0 0 520 240"
        role="img"
        aria-label="A cone joined end-to-end to a cylinder"
        className="mx-auto w-full max-w-xl"
      >
        <defs>
          <linearGradient id="academy-cylinder" x1="0" x2="1">
            <stop offset="0" stopColor="#DDEBFF" />
            <stop offset="1" stopColor="#A9D3FF" />
          </linearGradient>
        </defs>
        <path
          d="M58 120 L236 43 A42 77 0 0 1 236 197 Z"
          fill="#FFE7A3"
          stroke={INK}
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <path
          d="M236 43 H416 A42 77 0 0 1 416 197 H236 A42 77 0 0 0 236 43Z"
          fill="url(#academy-cylinder)"
          stroke={INK}
          strokeWidth="7"
        />
        <ellipse cx="416" cy="120" rx="42" ry="77" fill="#CFE8FF" stroke={INK} strokeWidth="7" />
        <path d="M236 43 A42 77 0 0 1 236 197" fill="none" stroke={INK} strokeWidth="7" />
      </svg>
    </VisualCard>
  );
}

function SideViewModel() {
  return (
    <VisualCard>
      <svg
        viewBox="0 0 560 280"
        role="img"
        aria-label="A model made from a cylinder, tall block, small cube and hexagonal prism, viewed from the left side"
        className="mx-auto w-full max-w-xl"
      >
        <defs>
          <marker
            id="academy-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="3"
            orient="auto"
          >
            <path d="M0 0 L8 3 L0 6Z" fill="#FF7C68" />
          </marker>
        </defs>
        <path d="M70 138 H150" stroke="#FF7C68" strokeWidth="8" markerEnd="url(#academy-arrow)" />
        <text x="55" y="175" fill={INK} fontSize="22" fontWeight="900">
          SIDE
        </text>
        <ellipse cx="205" cy="142" rx="43" ry="55" fill="#C7F2DF" stroke={INK} strokeWidth="6" />
        <path d="M238 72 L330 43 V211 L238 238Z" fill="#DDEBFF" stroke={INK} strokeWidth="6" />
        <path d="M330 43 L368 66 V222 L330 211Z" fill="#A9D3FF" stroke={INK} strokeWidth="6" />
        <path
          d="M356 94 L426 72 L475 117 L457 195 L390 217 L342 171Z"
          fill="#FFE7A3"
          stroke={INK}
          strokeWidth="6"
        />
        <path
          d="M318 170 L368 154 L404 180 V229 L350 242 L318 219Z"
          fill="#FFB7AB"
          stroke={INK}
          strokeWidth="6"
        />
      </svg>
    </VisualCard>
  );
}

function SideViewChoice({ index }: { index: number }) {
  const variants = [
    { tall: true, square: 'separate', hexagon: true },
    { tall: true, square: 'inside', hexagon: true },
    { tall: true, square: 'under-triangle', hexagon: false },
    { tall: false, square: 'inside', hexagon: true },
  ] as const;
  const value = variants[index];
  if (!value) return null;
  return (
    <svg
      data-testid={`academy-side-view-${index}`}
      viewBox="0 0 230 100"
      className="h-16 w-36 flex-none sm:h-20 sm:w-48"
      aria-hidden="true"
    >
      <circle cx="28" cy="54" r="21" fill="#fff" stroke={INK} strokeWidth="4" />
      <rect
        x="52"
        y={value.tall ? 8 : 22}
        width={value.tall ? 28 : 55}
        height={value.tall ? 80 : 64}
        fill="#DDEBFF"
        stroke={INK}
        strokeWidth="4"
      />
      {value.square === 'separate' && (
        <rect x="80" y="55" width="30" height="31" fill="#FFB7AB" stroke={INK} strokeWidth="4" />
      )}
      {value.square === 'under-triangle' && (
        <>
          <path d="M91 26 L112 57 H70Z" fill="#FFE7A3" stroke={INK} strokeWidth="4" />
          <rect x="70" y="57" width="42" height="29" fill="#FFB7AB" stroke={INK} strokeWidth="4" />
        </>
      )}
      {value.hexagon && (
        <path
          d="M145 17 H185 L207 52 L185 87 H145 L123 52Z"
          fill="#FFE7A3"
          stroke={INK}
          strokeWidth="4"
        />
      )}
      {value.square === 'inside' && (
        <rect
          x={value.tall ? 143 : 151}
          y="55"
          width="27"
          height="31"
          fill="#FFB7AB"
          stroke={INK}
          strokeWidth="4"
        />
      )}
    </svg>
  );
}

function tileFill(pattern: AcademyTilePattern) {
  if (pattern === 'solid') return <rect x="2" y="2" width="56" height="56" fill={GREY} />;
  if (pattern === 'diagonal_upper_left') return <path d="M2 2 H58 L2 58Z" fill={GREY} />;
  if (pattern === 'diagonal_lower_left') return <path d="M2 2 V58 H58Z" fill={GREY} />;
  if (pattern === 'vertical_left') return <rect x="2" y="2" width="28" height="56" fill={GREY} />;
  if (pattern === 'vertical_right') return <rect x="30" y="2" width="28" height="56" fill={GREY} />;
  if (pattern === 'horizontal_top') return <rect x="2" y="2" width="56" height="28" fill={GREY} />;
  if (pattern === 'horizontal_bottom')
    return <rect x="2" y="30" width="56" height="28" fill={GREY} />;
  return <rect x="2" y="21" width="56" height="18" fill={GREY} />;
}

function TileStrip({
  patterns,
  compact = false,
}: {
  patterns: AcademyTilePattern[];
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-none items-center ${compact ? 'gap-1' : 'gap-2'}`}
      aria-hidden="true"
    >
      {patterns.map((pattern, index) => (
        <svg
          key={`${pattern}-${index}`}
          viewBox="0 0 60 60"
          className={compact ? 'h-9 w-9 sm:h-11 sm:w-11' : 'h-14 w-14 sm:h-16 sm:w-16'}
        >
          <rect x="2" y="2" width="56" height="56" fill="#fff" stroke={INK} strokeWidth="4" />
          {tileFill(pattern)}
          <rect x="2" y="2" width="56" height="56" fill="none" stroke={INK} strokeWidth="4" />
        </svg>
      ))}
    </div>
  );
}

function TileRotation({ spec }: { spec: Spec<'tile_rotation'> }) {
  return (
    <VisualCard>
      <div
        role="img"
        aria-label="Four tiles before a quarter turn clockwise"
        className="flex flex-col items-center gap-4"
      >
        <TileStrip patterns={spec.start} />
        <span className="rounded-full bg-brand-coral px-4 py-2 text-sm font-black text-white">
          ¼ turn clockwise ↻
        </span>
      </div>
    </VisualCard>
  );
}

function SymmetryGrid({ spec }: { spec: Spec<'symmetry_grid'> }) {
  const width = spec.columns.length * 60;
  const height = spec.rows.length * 60;
  const axisIndex = spec.columns.indexOf(spec.axis_after_column) + 1;
  const eyeColumn = spec.columns.indexOf(spec.eye_cell[0]);
  const eyeRow = spec.rows.indexOf(Number(spec.eye_cell.slice(1)));
  return (
    <VisualCard>
      <svg
        viewBox={`0 0 ${width + 70} ${height + 65}`}
        role="img"
        aria-label={`A symmetry grid with the eye in ${spec.eye_cell} and the mirror line after column ${spec.axis_after_column}`}
        className="mx-auto w-full max-w-xl"
      >
        {spec.columns.map((column, index) => (
          <text
            key={column}
            x={55 + index * 60}
            y="24"
            textAnchor="middle"
            fill={INK}
            fontSize="18"
            fontWeight="900"
          >
            {column}
          </text>
        ))}
        {spec.rows.map((row, index) => (
          <text
            key={row}
            x="18"
            y={64 + index * 60}
            textAnchor="middle"
            fill={INK}
            fontSize="18"
            fontWeight="900"
          >
            {row}
          </text>
        ))}
        {Array.from({ length: spec.columns.length + 1 }, (_, index) => (
          <line
            key={`v-${index}`}
            x1={25 + index * 60}
            y1="35"
            x2={25 + index * 60}
            y2={35 + height}
            stroke={index === axisIndex ? '#FF7C68' : INK}
            strokeWidth={index === axisIndex ? 7 : 2}
          />
        ))}
        {Array.from({ length: spec.rows.length + 1 }, (_, index) => (
          <line
            key={`h-${index}`}
            x1="25"
            y1={35 + index * 60}
            x2={25 + width}
            y2={35 + index * 60}
            stroke={INK}
            strokeWidth="2"
          />
        ))}
        <path
          d={`M${25 + axisIndex * 60} 48 Q${25 + (axisIndex + 1.2) * 60} 70 ${25 + (axisIndex + 1.5) * 60} 145 Q${25 + (axisIndex + 1.2) * 60} 240 ${25 + axisIndex * 60} 315`}
          fill="none"
          stroke="#55A7FF"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <g transform={`translate(${55 + eyeColumn * 60} ${65 + eyeRow * 60})`}>
          <ellipse cx="0" cy="0" rx="18" ry="12" fill="#fff" stroke={INK} strokeWidth="5" />
          <circle cx="3" cy="0" r="6" fill={INK} />
        </g>
      </svg>
    </VisualCard>
  );
}

function FractionPrompt() {
  return (
    <VisualCard>
      <p className="text-center text-base font-black text-brand-navy">
        Compare each shaded region with the whole shape.
      </p>
    </VisualCard>
  );
}

function FractionChoice({ variant }: { variant: Spec<'fraction_shapes'>['choices'][number] }) {
  if (variant === 'sixth')
    return (
      <svg
        data-testid="academy-fraction-choice"
        viewBox="0 0 120 90"
        className="h-16 w-24 flex-none"
        aria-hidden="true"
      >
        <path
          d="M20 20 L60 4 L100 20 V70 L60 86 L20 70Z"
          fill="#fff"
          stroke={INK}
          strokeWidth="4"
        />
        <rect x="20" y="45" width="80" height="25" fill={GREY} />
        <path d="M20 20 H100 M20 45 H100 M20 70 H100" stroke={INK} strokeWidth="3" />
      </svg>
    );
  if (variant === 'half')
    return (
      <svg
        data-testid="academy-fraction-choice"
        viewBox="0 0 120 90"
        className="h-16 w-24 flex-none"
        aria-hidden="true"
      >
        <path
          d="M20 20 L60 4 L100 20 V70 L60 86 L20 70Z"
          fill="#fff"
          stroke={INK}
          strokeWidth="4"
        />
        <path d="M20 20 L100 70 L20 70Z" fill={GREY} stroke={INK} strokeWidth="3" />
        <path d="M100 20 L20 70" stroke={INK} strokeWidth="3" />
      </svg>
    );
  if (variant === 'third')
    return (
      <svg
        data-testid="academy-fraction-choice"
        viewBox="0 0 120 90"
        className="h-16 w-24 flex-none"
        aria-hidden="true"
      >
        <rect x="20" y="10" width="80" height="70" fill="#fff" stroke={INK} strokeWidth="4" />
        <path d="M20 80 L75 10 H100 L45 80Z" fill={GREY} stroke={INK} strokeWidth="3" />
      </svg>
    );
  return (
    <svg
      data-testid="academy-fraction-choice"
      viewBox="0 0 120 90"
      className="h-16 w-24 flex-none"
      aria-hidden="true"
    >
      <g transform="rotate(45 60 45)">
        <rect x="25" y="10" width="70" height="70" fill="#fff" stroke={INK} strokeWidth="4" />
        <rect x="25" y="45" width="70" height="17.5" fill={GREY} />
        <path d="M25 27.5 H95 M25 45 H95 M25 62.5 H95" stroke={INK} strokeWidth="3" />
      </g>
    </svg>
  );
}

function ShellGlyph({ kind }: { kind: AcademyShellKind }) {
  if (kind === 'spiral')
    return (
      <svg viewBox="0 0 60 60" className="h-10 w-10">
        <circle cx="30" cy="30" r="22" fill="#FFE7A3" stroke={INK} strokeWidth="4" />
        <path
          d="M39 31 C39 18 20 18 20 32 C20 43 36 43 36 33 C36 27 28 27 28 33"
          fill="none"
          stroke={INK}
          strokeWidth="3"
        />
      </svg>
    );
  if (kind === 'spotted')
    return (
      <svg viewBox="0 0 60 60" className="h-10 w-10">
        <path
          d="M8 35 Q28 7 51 25 L43 47 Q23 52 8 35Z"
          fill="#CFE8FF"
          stroke={INK}
          strokeWidth="4"
        />
        <g fill={INK}>
          {[18, 28, 38].map((x) => (
            <circle key={x} cx={x} cy="33" r="3" />
          ))}
        </g>
      </svg>
    );
  if (kind === 'conch')
    return (
      <svg viewBox="0 0 60 60" className="h-10 w-10">
        <path
          d="M8 39 Q18 10 43 16 Q57 20 46 32 L54 44 Q28 53 8 39Z"
          fill="#FFB7AB"
          stroke={INK}
          strokeWidth="4"
        />
      </svg>
    );
  return (
    <svg viewBox="0 0 60 60" className="h-10 w-10">
      <path d="M10 46 Q10 10 30 8 Q50 10 50 46Z" fill="#C7F2DF" stroke={INK} strokeWidth="4" />
      {[18, 25, 32, 39, 46].map((x) => (
        <path key={x} d={`M30 10 L${x} 45`} stroke={INK} strokeWidth="2" />
      ))}
    </svg>
  );
}

function ShellBags({ spec }: { spec: Spec<'shell_bags'> }) {
  return (
    <VisualCard>
      <div
        role="img"
        aria-label="Three bags containing different shells"
        className="grid grid-cols-3 gap-2 sm:gap-4"
      >
        {spec.bags.map((bag, index) => (
          <div
            key={index}
            className="rounded-b-[32px] rounded-t-xl border-4 border-brand-navy bg-white p-2 shadow-sm"
          >
            <div className="flex flex-wrap justify-center gap-1">
              {bag.map((shell, shellIndex) => (
                <ShellGlyph key={`${shell}-${shellIndex}`} kind={shell} />
              ))}
            </div>
            <p className="mt-1 text-center text-xs font-black text-slate2">Bag {index + 1}</p>
          </div>
        ))}
      </div>
    </VisualCard>
  );
}

function ShellChoice({ shells }: { shells: AcademyShellKind[] }) {
  return (
    <div
      data-testid="academy-shell-choice"
      className="flex w-32 flex-none items-center justify-center gap-1 sm:w-40"
      aria-hidden="true"
    >
      {shells.map((shell, index) => (
        <ShellGlyph key={`${shell}-${index}`} kind={shell} />
      ))}
    </div>
  );
}

function PyramidFaces({ spec }: { spec: Spec<'pyramid_faces'> }) {
  return (
    <VisualCard>
      <div
        role="img"
        aria-label={`${spec.square_faces} square face and ${spec.triangular_faces} triangular faces`}
        className="flex flex-wrap items-end justify-center gap-3"
      >
        {Array.from({ length: spec.square_faces }, (_, index) => (
          <svg key={`square-${index}`} viewBox="0 0 80 80" className="h-20 w-20">
            <rect
              x="8"
              y="8"
              width="64"
              height="64"
              rx="4"
              fill="#CFE8FF"
              stroke={INK}
              strokeWidth="6"
            />
          </svg>
        ))}
        {Array.from({ length: spec.triangular_faces }, (_, index) => (
          <svg key={`triangle-${index}`} viewBox="0 0 80 80" className="h-20 w-20">
            <path
              d="M40 6 L74 72 H6Z"
              fill={index % 2 ? '#FFE7A3' : '#C7F2DF'}
              stroke={INK}
              strokeWidth="6"
              strokeLinejoin="round"
            />
          </svg>
        ))}
      </div>
    </VisualCard>
  );
}
