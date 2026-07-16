import { useId } from 'react';

import type { CharacterPerformance } from './characterPerformance';

interface TuanTuanCharacterProps {
  performance: CharacterPerformance;
  className?: string;
}

/** A layered cloud-bear puppet whose face and pose respond to the running blocks. */
export function TuanTuanCharacter({ performance, className }: TuanTuanCharacterProps) {
  const instanceId = useId().replaceAll(':', '');
  const bodyId = `${instanceId}-tuan-body`;
  const scarfId = `${instanceId}-tuan-scarf`;
  const shadowId = `${instanceId}-tuan-shadow`;

  return (
    <svg
      aria-hidden="true"
      className={['bsx-tuan', className].filter(Boolean).join(' ')}
      data-performance={performance}
      focusable="false"
      viewBox="0 0 256 256"
    >
      <defs>
        <linearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E9FAFF" />
          <stop offset="0.55" stopColor="#B8E5F3" />
          <stop offset="1" stopColor="#8BC9E0" />
        </linearGradient>
        <linearGradient id={scarfId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE487" />
          <stop offset="1" stopColor="#F4A64A" />
        </linearGradient>
        <filter id={shadowId} x="-40%" y="-35%" width="180%" height="185%">
          <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#405575" floodOpacity=".22" />
        </filter>
      </defs>

      <ellipse className="bsx-tuan-floor-glow" cx="128" cy="231" rx="67" ry="14" />
      <g className="bsx-tuan-puppet" filter={`url(#${shadowId})`}>
        <g className="bsx-tuan-success-sparks">
          <path d="m35 96 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2Z" />
          <path d="m218 106 4 8 9 1-7 7 2 9-8-4-8 4 2-9-7-7 9-1Z" />
        </g>

        <circle className="bsx-tuan-ear" cx="78" cy="70" r="31" />
        <circle className="bsx-tuan-ear" cx="178" cy="70" r="31" />
        <circle className="bsx-tuan-ear-shine" cx="78" cy="70" r="15" />
        <circle className="bsx-tuan-ear-shine" cx="178" cy="70" r="15" />

        <g className="bsx-tuan-arms bsx-tuan-arms-rest">
          <path d="M61 154c-21 5-33 21-29 39 3 15 18 22 31 14 13-8 18-25 16-45Z" />
          <path d="M195 154c21 5 33 21 29 39-3 15-18 22-31 14-13-8-18-25-16-45Z" />
        </g>
        <g className="bsx-tuan-arms bsx-tuan-arms-celebrate">
          <path d="M72 159C49 139 35 112 40 89c3-13 17-17 25-7 7 9 3 32 24 55Z" />
          <path d="M184 159c23-20 37-47 32-70-3-13-17-17-25-7-7 9-3 32-24 55Z" />
        </g>

        <path
          className="bsx-tuan-body"
          fill={`url(#${bodyId})`}
          d="M52 132c0-50 31-84 76-84s76 34 76 84v33c0 38-31 67-76 67s-76-29-76-67Z"
        />
        <ellipse className="bsx-tuan-foot" cx="91" cy="225" rx="31" ry="17" />
        <ellipse className="bsx-tuan-foot" cx="165" cy="225" rx="31" ry="17" />

        <g className="bsx-tuan-face">
          <g className="bsx-tuan-eyes">
            <ellipse cx="95" cy="108" rx="10" ry="13" />
            <ellipse cx="161" cy="108" rx="10" ry="13" />
            <circle className="bsx-tuan-pupil" cx="97" cy="109" r="4" />
            <circle className="bsx-tuan-pupil" cx="163" cy="109" r="4" />
            <circle className="bsx-tuan-eye-shine" cx="100" cy="105" r="2" />
            <circle className="bsx-tuan-eye-shine" cx="166" cy="105" r="2" />
          </g>
          <g className="bsx-tuan-sleep-eyes">
            <path d="M84 108q11 9 22 0" />
            <path d="M150 108q11 9 22 0" />
          </g>
          <ellipse className="bsx-tuan-nose" cx="128" cy="133" rx="15" ry="12" />
          <path className="bsx-tuan-mouth bsx-tuan-mouth-smile" d="M128 144q-8 14-21 5M128 144q8 14 21 5" />
          <ellipse className="bsx-tuan-mouth bsx-tuan-mouth-speak" cx="128" cy="151" rx="10" ry="8" />
          <circle className="bsx-tuan-cheek" cx="82" cy="139" r="10" />
          <circle className="bsx-tuan-cheek" cx="174" cy="139" r="10" />
        </g>

        <path
          className="bsx-tuan-scarf"
          stroke={`url(#${scarfId})`}
          d="M66 171c34 15 90 15 124 0"
        />
        <path className="bsx-tuan-scarf-tail" d="M168 177v44l26-8-7-39Z" />
        <path className="bsx-tuan-cloud-shine" d="M112 61c8-10 24-10 32 0" />
      </g>
    </svg>
  );
}
