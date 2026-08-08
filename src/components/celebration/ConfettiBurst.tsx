// The ONE celebration confetti in the kid surface.
//
// Lifted out of `pages/learn/blocks/StoryMissionGuide.tsx` (Story Blocks) so
// Creative Code Studio's Mission Mode milestone (learn-game-studio-prd §9A,
// D-GAME14) reuses it rather than growing a second confetti. Behaviour is
// unchanged for Story Blocks: 72 CSS-variable-driven pieces, portalled to
// `document.body`, purely decorative (`aria-hidden`), styled by `confetti.css`.

import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';

import './confetti.css';

const CONFETTI_COLORS = ['#ffcc4d', '#ff6b91', '#6fd6ff', '#7ce38b', '#a98bff'];
const CONFETTI_PIECE_COUNT = 72;

/** The pieces are deterministic (index-derived), so renders are stable. */
const CONFETTI_PIECES = Array.from({ length: CONFETTI_PIECE_COUNT }, (_, index) => ({
  id: index,
  style: {
    '--confetti-left': `${(index * 37) % 100}%`,
    '--confetti-delay': `${(index % 8) * 90}ms`,
    '--confetti-duration': `${1500 + (index % 5) * 170}ms`,
    '--confetti-drift': `${(index % 2 === 0 ? 1 : -1) * (20 + (index % 4) * 12)}px`,
    '--confetti-color': CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  } as CSSProperties,
}));

export function ConfettiBurst({ testId }: { testId: string }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="bsx-story-celebration" data-testid={testId} aria-hidden="true">
      {CONFETTI_PIECES.map((piece) => (
        <span key={piece.id} style={piece.style} />
      ))}
    </div>,
    document.body,
  );
}
