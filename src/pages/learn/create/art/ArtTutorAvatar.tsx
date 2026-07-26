import { useEffect, useState } from 'react';

export const ART_TUTOR_TEMP_NAME = 'Boti';

export type ArtTutorState = 'idle' | 'thinking' | 'looking' | 'creating' | 'celebrating';

const ART_TUTOR_ASSETS: Record<ArtTutorState | 'compact', string> = {
  idle: '/media/art-tutor/idle.webp',
  thinking: '/media/art-tutor/thinking.webp',
  looking: '/media/art-tutor/looking.webp',
  creating: '/media/art-tutor/creating.webp',
  celebrating: '/media/art-tutor/celebrating.webp',
  compact: '/media/art-tutor/compact.webp',
};

const ART_TUTOR_STATES: ArtTutorState[] = [
  'idle',
  'thinking',
  'looking',
  'creating',
  'celebrating',
];

const IDLE_POSE_SEQUENCE: ArtTutorState[] = ['idle', 'looking', 'idle', 'thinking'];
const IDLE_POSE_INTERVAL_MS = 1400;

const STATE_COPY: Record<ArtTutorState, string> = {
  idle: 'Ready when you are',
  thinking: 'Thinking about your idea',
  looking: 'Looking closely at your canvas',
  creating: 'Bringing your picture to life',
  celebrating: 'Celebrating your creation',
};

const STATE_MOTION: Record<ArtTutorState, string> = {
  idle: 'art-tutor-sprite--idle',
  thinking: 'art-tutor-sprite--thinking',
  looking: 'art-tutor-sprite--looking',
  creating: 'art-tutor-sprite--creating',
  celebrating: 'art-tutor-sprite--celebrating',
};

interface ArtTutorAvatarProps {
  state: ArtTutorState;
  compact?: boolean;
  showStatus?: boolean;
}

/**
 * Airbotix's robot-cat mascot, acting as Art Studio's visible tutor.
 *
 * The display name is deliberately exported from one temporary constant so the
 * owner can rename the character later without touching tutor behaviour. The
 * checked-in pose pack keeps each app state deterministic; CSS supplies only
 * lightweight motion and is disabled by the global reduced-motion contract.
 */
export function ArtTutorAvatar({ state, compact = false, showStatus = true }: ArtTutorAvatarProps) {
  const alt = `${ART_TUTOR_TEMP_NAME}, the Airbotix robot-cat art tutor`;
  const [idlePoseIndex, setIdlePoseIndex] = useState(0);

  useEffect(() => {
    if (state !== 'idle' || compact) return;

    const timer = window.setInterval(() => {
      setIdlePoseIndex((current) => (current + 1) % IDLE_POSE_SEQUENCE.length);
    }, IDLE_POSE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [compact, state]);

  const displayedPose = state === 'idle' && !compact ? IDLE_POSE_SEQUENCE[idlePoseIndex] : state;

  return (
    <div
      className="flex min-w-0 items-center gap-2.5"
      data-testid="art-tutor"
      data-state={state}
      data-pose={displayedPose}
      data-motion={state === 'idle' && !compact ? 'looping' : 'reactive'}
      data-name-is-temporary="true"
    >
      {compact ? (
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white bg-wash-sky p-1 shadow-brand-sky">
          <img
            key={state}
            src={ART_TUTOR_ASSETS.compact}
            alt={alt}
            className="art-tutor-sprite art-tutor-sprite--compact h-full w-full object-contain"
            data-testid="art-tutor-image-compact"
          />
        </div>
      ) : (
        <div className="relative h-[82px] w-[70px] shrink-0" data-testid="art-tutor-pose-stack">
          <span
            className="absolute inset-x-2 bottom-1 h-6 rounded-full bg-brand-sky/15 blur-md"
            aria-hidden="true"
          />
          {ART_TUTOR_STATES.map((assetState) => {
            const active = assetState === displayedPose;

            return (
              <img
                key={assetState}
                src={ART_TUTOR_ASSETS[assetState]}
                alt={active ? alt : ''}
                aria-hidden={!active}
                data-testid={`art-tutor-image-${assetState}`}
                data-active={active}
                className={`art-tutor-sprite absolute inset-0 h-full w-full object-contain transition-[opacity,transform] duration-300 ${
                  active
                    ? `z-10 opacity-100 ${STATE_MOTION[assetState]}`
                    : 'pointer-events-none opacity-0 scale-95'
                }`}
              />
            );
          })}
          {displayedPose === 'looking' && (
            <span
              className="absolute left-2 top-[46%] z-20 h-0.5 w-11 rotate-[-7deg] bg-brand-sky shadow-[0_0_8px_2px_rgba(61,174,255,0.8)] motion-safe:animate-pulse"
              aria-hidden="true"
              data-testid="art-tutor-scan"
            />
          )}
        </div>
      )}

      {!compact && (
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="truncate text-[13px] font-bold text-ink">{ART_TUTOR_TEMP_NAME}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-sky">
              Art tutor
            </span>
          </div>
          {showStatus && (
            <p className="truncate text-[10px] font-semibold text-ink-soft" aria-live="polite">
              {STATE_COPY[state]}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
