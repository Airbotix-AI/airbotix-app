import type { CreatorCapabilityCode } from './creatorPassport';

const ART_PALETTE: Record<
  CreatorCapabilityCode,
  { dark: string; light: string; main: string; pop: string }
> = {
  idea_builder: { dark: '#6b4300', light: '#fff5b8', main: '#ffc928', pop: '#ff8a34' },
  prompt_director: { dark: '#7d2459', light: '#ffe1f2', main: '#f25ca5', pop: '#8a5cff' },
  bug_hunter: { dark: '#075e54', light: '#d8fff2', main: '#35c9a3', pop: '#ffcf3d' },
  game_tester: { dark: '#13567a', light: '#dcf5ff', main: '#48bce9', pop: '#6557e8' },
  project_presenter: { dark: '#85342d', light: '#ffe5dc', main: '#ff7466', pop: '#ffc928' },
};

function CapabilityGlyph({
  code,
  dark,
  pop,
}: {
  code: CreatorCapabilityCode;
  dark: string;
  pop: string;
}) {
  if (code === 'idea_builder') {
    return (
      <>
        <path
          d="M80 43c-17 0-30 13-30 29 0 11 6 18 13 25 4 4 6 8 6 13h22c0-5 2-9 6-13 7-7 13-14 13-25 0-16-13-29-30-29Z"
          fill="#fff"
        />
        <path d="M69 118h22M72 126h16" stroke={dark} strokeWidth="7" strokeLinecap="round" />
        <path
          d="m70 78 8 8 16-20"
          fill="none"
          stroke={pop}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M80 25V14M43 39l-8-8M117 39l8-8M34 72H22M126 72h12"
          stroke="#fff"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </>
    );
  }

  if (code === 'prompt_director') {
    return (
      <>
        <path
          d="M42 45h70a13 13 0 0 1 13 13v35a13 13 0 0 1-13 13H78l-20 17 4-17H42a13 13 0 0 1-13-13V58a13 13 0 0 1 13-13Z"
          fill="#fff"
        />
        <path d="m62 91 35-35" stroke={dark} strokeWidth="9" strokeLinecap="round" />
        <path d="m92 52 10 10" stroke={pop} strokeWidth="11" strokeLinecap="round" />
        <path
          d="m108 34 3-9 3 9 9 3-9 3-3 9-3-9-9-3 9-3ZM44 71l2-7 3 7 7 3-7 2-3 8-2-8-8-2 8-3Z"
          fill={pop}
        />
      </>
    );
  }

  if (code === 'bug_hunter') {
    return (
      <>
        <circle cx="70" cy="68" r="34" fill="#fff" />
        <path d="m95 93 30 30" stroke={dark} strokeWidth="13" strokeLinecap="round" />
        <path
          d="M58 63h24M70 52v43M55 74H43M85 74h12M58 55l-8-8M82 55l8-8"
          stroke={dark}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M55 66c0-9 7-16 15-16s15 7 15 16v13c0 10-7 17-15 17s-15-7-15-17V66Z"
          fill={pop}
          stroke={dark}
          strokeWidth="5"
        />
        <path
          d="m62 74 6 6 11-13"
          fill="none"
          stroke="#fff"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    );
  }

  if (code === 'game_tester') {
    return (
      <>
        <path
          d="M45 57h70c13 0 22 10 24 23l5 27c2 13-13 21-22 11l-14-16H52l-14 16c-9 10-24 2-22-11l5-27c2-13 11-23 24-23Z"
          fill="#fff"
        />
        <path d="M53 72v25M40 85h26" stroke={dark} strokeWidth="8" strokeLinecap="round" />
        <circle cx="111" cy="76" r="6" fill={pop} />
        <circle cx="125" cy="91" r="6" fill={pop} />
        <path
          d="m68 112 9 9 20-22"
          fill="none"
          stroke={pop}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    );
  }

  return (
    <>
      <path
        d="M32 39h96a8 8 0 0 1 8 8v63a8 8 0 0 1-8 8H32a8 8 0 0 1-8-8V47a8 8 0 0 1 8-8Z"
        fill="#fff"
      />
      <path d="M80 118v15M60 136h40" stroke={dark} strokeWidth="8" strokeLinecap="round" />
      <path
        d="m80 55 7 15 17 2-12 11 4 17-16-8-16 8 4-17-12-11 17-2 7-15Z"
        fill={pop}
        stroke={dark}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M39 51h18" stroke={dark} strokeWidth="6" strokeLinecap="round" />
    </>
  );
}

export function CreatorPassportStampArt({
  code,
  earned,
}: {
  code: CreatorCapabilityCode;
  earned: boolean;
}) {
  const palette = ART_PALETTE[code];
  const gradientId = `passport-stamp-gradient-${code}`;

  return (
    <svg
      viewBox="0 0 160 160"
      role="presentation"
      aria-hidden="true"
      className={`h-full w-full overflow-visible drop-shadow-[0_8px_12px_rgba(28,36,52,0.18)] transition duration-200 group-hover:-rotate-2 group-hover:scale-105 ${
        earned ? '' : 'grayscale opacity-45'
      }`}
      data-testid="creator-passport-stamp-art"
      data-stamp-art={code}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="24"
          y1="18"
          x2="138"
          y2="145"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={palette.main} />
          <stop offset="1" stopColor={palette.pop} />
        </linearGradient>
      </defs>
      <path
        d="m80 4 10 9 13-5 6 12 14-1 2 14 13 4-3 14 11 8-7 12 8 12-10 9 4 13-13 5-1 14-14-1-6 12-13-5-10 9-10-9-13 5-6-12-14 1-2-14-13-4 3-14-11-8 7-12-8-12 10-9-4-13 13-5 1-14 14 1 6-12 13 5 10-9Z"
        fill={`url(#${gradientId})`}
      />
      <circle cx="80" cy="80" r="61" fill={palette.light} stroke="#fff" strokeWidth="4" />
      <circle
        cx="80"
        cy="80"
        r="53"
        fill={palette.main}
        stroke={palette.dark}
        strokeWidth="3"
        strokeDasharray="3 7"
      />
      <CapabilityGlyph code={code} dark={palette.dark} pop={palette.pop} />
      {earned && (
        <g transform="translate(111 111)">
          <circle cx="16" cy="16" r="18" fill={palette.dark} stroke="#fff" strokeWidth="4" />
          <path
            d="m7 16 6 6L25 9"
            fill="none"
            stroke="#fff"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  );
}
