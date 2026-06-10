// Airo — the playground's friendly robot helper (named from Airbotix). A crisp,
// self-contained SVG avatar (no asset load) on the brand sky→purple gradient, with
// a glowing antenna and two mint eyes. Used in the chat header + on each Airo message.

interface AiroAvatarProps {
  /** Rendered px size (square). */
  size?: number;
  className?: string;
}

export function AiroAvatar({ size = 28, className = '' }: AiroAvatarProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="Airo"
      data-testid="airo-avatar"
    >
      <defs>
        <linearGradient id="airoHead" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6FB8FF" />
          <stop offset="1" stopColor="#7C5CFF" />
        </linearGradient>
        <radialGradient id="airoEye" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#C9FBEC" />
          <stop offset="1" stopColor="#3DD9A9" />
        </radialGradient>
        <filter id="airoGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.3" />
        </filter>
      </defs>

      {/* antenna + glowing tip */}
      <line x1="24" y1="9" x2="24" y2="5.5" stroke="#A6ADCF" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="4.2" r="3.4" fill="#FFD43B" opacity="0.55" filter="url(#airoGlow)" />
      <circle cx="24" cy="4.2" r="2.6" fill="#FFD43B" />

      {/* ears */}
      <rect x="3.5" y="20" width="5" height="10" rx="2.5" fill="#5DAEFF" />
      <rect x="39.5" y="20" width="5" height="10" rx="2.5" fill="#7C5CFF" />

      {/* head */}
      <rect x="8" y="9" width="32" height="31" rx="13" fill="url(#airoHead)" />
      {/* soft top sheen for a little dimension */}
      <rect x="11" y="11.5" width="26" height="9" rx="4.5" fill="#FFFFFF" opacity="0.12" />

      {/* dark visor */}
      <rect x="12.5" y="16.5" width="23" height="15" rx="7.5" fill="#15102B" />

      {/* glowing mint eyes + white catchlights */}
      <circle cx="19.6" cy="24" r="3.1" fill="url(#airoEye)" filter="url(#airoGlow)" />
      <circle cx="28.4" cy="24" r="3.1" fill="url(#airoEye)" filter="url(#airoGlow)" />
      <circle cx="19.6" cy="24" r="3.1" fill="url(#airoEye)" />
      <circle cx="28.4" cy="24" r="3.1" fill="url(#airoEye)" />
      <circle cx="18.6" cy="22.8" r="0.95" fill="#FFFFFF" />
      <circle cx="27.4" cy="22.8" r="0.95" fill="#FFFFFF" />
    </svg>
  );
}
