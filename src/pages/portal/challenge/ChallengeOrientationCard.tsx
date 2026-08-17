import { Link } from 'react-router-dom';

import { CHALLENGE_PORTAL_PATH, CURRENT_CHALLENGE_SLUG } from '@/lib/challenge';
import { ChallengeOrientationVideo } from './ChallengeOrientationVideo';
import { hasNotStarted, useChallengeFamilyEntries } from './useChallengeFamilyEntries';

/**
 * The orientation video, on the Portal dashboard, for a family whose child has
 * PAID but has not started (entrant-onboarding-prd.md §13).
 *
 * WHY IT IS GATED ON PROGRESS RATHER THAN ON A DISMISSAL. Showing a walkthrough
 * on every login regardless of state trains a parent to scroll past it, and by
 * the third visit it sits between them and whatever they came to do. Showing it
 * only once loses the family who skimmed it while distracted at the checkout.
 * So it stays — every login, in full — for exactly the families where the child
 * has not opened the studio yet, and disappears on its own the moment they do.
 * That is the population the video is for; everyone else keeps it one click away
 * on the challenge hub.
 *
 * It is therefore deliberately NOT dismissible. There is no flag to clear: the
 * card's own subject (a child who has not started) is what removes it, so a
 * dismissal would only hide the reminder from the one family still needing it.
 * It is a card and not a modal precisely so that costs them nothing.
 */

export function ChallengeOrientationCard() {
  const entries = useChallengeFamilyEntries(CURRENT_CHALLENGE_SLUG);

  // Render nothing while loading or on error: a dashboard card that flickers in
  // half-loaded, or that appears because a request failed, is worse than one
  // that waits a beat.
  if (!entries.isSuccess) return null;

  const waiting = entries.data.entries.filter(hasNotStarted);
  if (waiting.length === 0) return null;

  const video = entries.data.edition.orientation_video_url;
  if (!video) return null;

  // Named while it is unambiguous. With several children still to start, naming
  // one of them would be wrong about the others.
  const who =
    waiting.length === 1 && waiting[0].kid_nickname
      ? `${waiting[0].kid_nickname} hasn’t started building yet.`
      : 'Nobody has started building yet.';

  return (
    <div className="card-base mb-6" data-testid="challenge-orientation-card">
      <ChallengeOrientationVideo
        url={video}
        poster={entries.data.edition.orientation_video_poster}
      />
      <p className="mt-4 text-[14px] text-ink">{who}</p>
      <Link to={CHALLENGE_PORTAL_PATH} className="btn-pill-primary mt-4 inline-block">
        Open the challenge →
      </Link>
    </div>
  );
}
