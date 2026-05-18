import { useEffect, useState } from 'react';

const EMOJIS = ['🎉', '✨', '⭐', '🌟', '🎊', '💫'];

/**
 * Lightweight celebration overlay: emoji rain + center toast.
 * Renders for `duration` ms then unmounts.
 */
export function Celebration({
  show,
  message,
  onDone,
  duration = 2500,
}: {
  show: boolean;
  message: string;
  onDone?: () => void;
  duration?: number;
}) {
  const [pieces, setPieces] = useState<{ id: number; left: number; emoji: string; delay: number; size: number }[]>([]);

  useEffect(() => {
    if (!show) return;
    const next = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      delay: Math.random() * 0.4,
      size: 24 + Math.random() * 24,
    }));
    setPieces(next);
    const t = setTimeout(() => {
      setPieces([]);
      onDone?.();
    }, duration);
    return () => clearTimeout(t);
  }, [show, duration, onDone]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: '-40px',
            fontSize: `${p.size}px`,
            animation: `airbotix-fall ${1.2 + p.delay}s ease-in ${p.delay}s forwards`,
          }}
        >
          {p.emoji}
        </span>
      ))}
      <div className="absolute inset-x-0 top-[30vh] flex justify-center">
        <div
          className="rounded-hero bg-grad-mint text-white shadow-brand-mint px-8 py-6 text-center"
          style={{
            animation: 'airbotix-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <div className="text-[40px]">🎉</div>
          <div className="mt-2 text-[20px] font-bold">{message}</div>
        </div>
      </div>
      <style>{`
        @keyframes airbotix-fall {
          to { transform: translateY(110vh) rotate(180deg); opacity: 0.5; }
        }
        @keyframes airbotix-pop {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
