import { useId } from 'react';

import type { CharacterPerformance } from './characterPerformance';

interface LumiloCharacterProps {
  performance: CharacterPerformance;
  className?: string;
}

/**
 * The canonical, layered Lumilo puppet used by the storybook and the stage.
 * Keeping the face and limbs as SVG layers lets program execution change the
 * character's performance instead of moving a permanently sleeping picture.
 */
export function LumiloCharacter({ performance, className }: LumiloCharacterProps) {
  const instanceId = useId().replaceAll(':', '');
  const bodyGradientId = `${instanceId}-lumilo-body`;
  const cheekGradientId = `${instanceId}-lumilo-cheek`;
  const shadowFilterId = `${instanceId}-lumilo-shadow`;
  const glowFilterId = `${instanceId}-lumilo-glow`;

  return (
    <svg
      aria-hidden="true"
      className={['bsx-lumilo', className].filter(Boolean).join(' ')}
      data-performance={performance}
      focusable="false"
      viewBox="0 0 256 256"
    >
      <defs>
        <linearGradient id={bodyGradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE6A4" />
          <stop offset="0.48" stopColor="#FFC65B" />
          <stop offset="1" stopColor="#F29A32" />
        </linearGradient>
        <radialGradient id={cheekGradientId}>
          <stop offset="0" stopColor="#FF8E6D" stopOpacity=".72" />
          <stop offset="1" stopColor="#FF8E6D" stopOpacity="0" />
        </radialGradient>
        <filter id={shadowFilterId} x="-40%" y="-40%" width="180%" height="190%">
          <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#5B4674" floodOpacity=".22" />
        </filter>
        <filter id={glowFilterId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      <ellipse className="bsx-lumilo-floor-glow" cx="128" cy="224" rx="61" ry="16" />
      <g className="bsx-lumilo-puppet" filter={`url(#${shadowFilterId})`}>
        <circle
          className="bsx-lumilo-aura"
          cx="128"
          cy="130"
          r="85"
          filter={`url(#${glowFilterId})`}
        />
        <path
          className="bsx-lumilo-star"
          d="M128 15 141 41 170 45 149 66 154 95 128 81 102 95 107 66 86 45 115 41Z"
        />

        <g className="bsx-lumilo-arms bsx-lumilo-arms-rest">
          <path d="M70 116c-19 2-32 16-34 35-1 13 5 24 17 26 14 2 26-9 30-25Z" />
          <path d="M186 116c19 2 32 16 34 35 1 13-5 24-17 26-14 2-26-9-30-25Z" />
        </g>
        <g className="bsx-lumilo-arms bsx-lumilo-arms-celebrate">
          <path d="M76 124C53 111 40 91 43 73c2-10 12-15 20-9 8 6 9 26 27 39Z" />
          <path d="M180 124c23-13 36-33 33-51-2-10-12-15-20-9-8 6-9 26-27 39Z" />
        </g>

        <rect
          className="bsx-lumilo-body"
          fill={`url(#${bodyGradientId})`}
          x="61"
          y="75"
          width="134"
          height="136"
          rx="60"
        />
        <path
          className="bsx-lumilo-rib"
          d="M94 83c-9 32-9 81 0 116M128 79v126M162 83c9 32 9 81 0 116"
        />
        <g className="bsx-lumilo-feet">
          <ellipse cx="91" cy="210" rx="26" ry="17" />
          <ellipse cx="165" cy="210" rx="26" ry="17" />
        </g>

        <g className="bsx-lumilo-face">
          <ellipse
            className="bsx-lumilo-cheek"
            fill={`url(#${cheekGradientId})`}
            cx="91"
            cy="156"
            rx="20"
            ry="14"
          />
          <ellipse
            className="bsx-lumilo-cheek"
            fill={`url(#${cheekGradientId})`}
            cx="165"
            cy="156"
            rx="20"
            ry="14"
          />
          <g className="bsx-lumilo-brows">
            <path d="M88 124q13-7 25 0" />
            <path d="M143 124q13-7 25 0" />
          </g>
          <g className="bsx-lumilo-eyes">
            <ellipse cx="101" cy="138" rx="10" ry="13" />
            <ellipse cx="155" cy="138" rx="10" ry="13" />
            <circle className="bsx-lumilo-pupil" cx="103" cy="139" r="4" />
            <circle className="bsx-lumilo-pupil" cx="157" cy="139" r="4" />
            <circle className="bsx-lumilo-eye-shine" cx="106" cy="135" r="2" />
            <circle className="bsx-lumilo-eye-shine" cx="160" cy="135" r="2" />
          </g>
          <g className="bsx-lumilo-sleep-eyes">
            <path d="M90 138q11 9 22 0" />
            <path d="M144 138q11 9 22 0" />
          </g>
          <path className="bsx-lumilo-mouth bsx-lumilo-mouth-smile" d="M111 164q17 15 34 0" />
          <ellipse
            className="bsx-lumilo-mouth bsx-lumilo-mouth-speak"
            cx="128"
            cy="168"
            rx="13"
            ry="10"
          />
          <path className="bsx-lumilo-mouth bsx-lumilo-mouth-think" d="M119 169q9-5 18 0" />
        </g>

        <circle className="bsx-lumilo-heart-light" cx="84" cy="164" r="8" />
        <g className="bsx-lumilo-success-sparks">
          <path d="m38 105 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2Z" />
          <path d="m213 121 4 8 9 1-7 7 2 9-8-4-8 4 2-9-7-7 9-1Z" />
          <circle cx="204" cy="87" r="5" />
        </g>
      </g>
    </svg>
  );
}
