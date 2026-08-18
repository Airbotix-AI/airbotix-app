import { useState } from 'react';
import { PlayCircle } from 'lucide-react';

import { CHALLENGE_ORIENTATION_VIDEO } from './challengeGuidance';

/**
 * The "how it works" walkthrough an entrant family is shown after payment, and
 * again on every visit until their child actually starts building
 * (entrant-onboarding-prd.md §13).
 *
 * WHY THIS EXISTS: the post-payment confirmation card's only call to action was
 * "View wallet". A family paid, was told their Stars had landed, and was left to
 * work out what a Creative Code Challenge entry actually involves on their own.
 *
 * The URL and poster come from the `ChallengeEdition` row, never from this file:
 * swapping the video for a future edition is an ops edit in super-admin, not a
 * deploy. A null URL renders NOTHING — an edition without a video is a normal
 * state, not an error, and no placeholder is invented for it.
 *
 * NEVER autoplays and is never muted-autoplay decoration: this is a video a
 * parent chooses to watch, so it starts on a real click. `preload="metadata"`
 * means the ~20MB file is not fetched until then — only enough to paint the
 * first frame and report its own duration, which is why no duration is written
 * down anywhere (a hardcoded one drifts the first time the video is recut).
 */
export interface ChallengeOrientationVideoProps {
  /** From `edition.orientation_video_url`. Null renders nothing. */
  url: string | null;
  /** From `edition.orientation_video_poster`. */
  poster?: string | null;
  /**
   * `full` — an inline player, for the moment the family is already looking at
   * the challenge (post-payment, or a hub where nobody has started).
   * `compact` — a one-line poster + title row that swaps to the player on
   * click, for a family who is already building and does not need it again.
   */
  variant?: 'full' | 'compact';
  /** Extra classes for the wrapper, so callers own their own spacing. */
  className?: string;
}

export function ChallengeOrientationVideo({
  url,
  poster,
  variant = 'full',
  className,
}: ChallengeOrientationVideoProps) {
  // `compact` stays collapsed until asked for; `full` is the player from the
  // start. Held here rather than lifted, because nothing outside this component
  // needs to know whether a parent expanded it.
  const [expanded, setExpanded] = useState(variant === 'full');

  if (!url) return null;

  const player = (
    <video
      // NO CAPTIONS YET. A <track kind="captions"> belongs here and is a real
      // accessibility gap — it needs a transcript of the recorded narration,
      // which nobody has written. Tracked in entrant-onboarding-prd §13; the
      // track element lands in the same change as the .vtt, never before it (a
      // <track> pointing at a missing file is worse than none).
      controls
      preload="metadata"
      playsInline
      poster={poster ?? undefined}
      className="w-full rounded-xl bg-ink"
      data-testid="challenge-orientation-video"
    >
      <source src={url} type="video/mp4" />
      Your browser cannot play this video.{' '}
      <a href={url} className="underline">
        Open it directly
      </a>
      .
    </video>
  );

  if (!expanded) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-hairline bg-wash-sky p-3 text-left"
          data-testid="challenge-orientation-video-expand"
        >
          <PlayCircle size={22} className="shrink-0 text-brand-sky" aria-hidden="true" />
          <span className="text-[14px] font-semibold text-ink">
            {CHALLENGE_ORIENTATION_VIDEO.title}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={className} data-testid="challenge-orientation-video-panel">
      <div className="eyebrow eyebrow-sky">{CHALLENGE_ORIENTATION_VIDEO.eyebrow}</div>
      <h3 className="mt-2 text-[18px] font-semibold text-ink">
        {CHALLENGE_ORIENTATION_VIDEO.title}
      </h3>
      <p className="mt-1 text-[14px] text-slate2">{CHALLENGE_ORIENTATION_VIDEO.body}</p>
      <div className="mt-4">{player}</div>
    </div>
  );
}
