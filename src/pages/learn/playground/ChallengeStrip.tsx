// The Creative Code Challenge strip in the studio
// (creative-code-challenge-entrant-onboarding-prd.md §8.3, execution plan PR 5).
//
// A child who arrives from their challenge page lands in a studio that, until
// now, had no idea a competition existed. This strip states the four things they
// cannot otherwise discover, and NOTHING ELSE:
//
//   1. which challenge this project belongs to (the edition's own name);
//   2. the submission window (the edition's own dates);
//   3. whether THIS project is the entry the judges will see, with the control
//      that makes it so;
//   4. one way back to the challenge page.
//
// ⚠️ **No date, rule, requirement or judging criterion may be authored here.**
// Every value on screen comes from the entry row the API returned. A sentence
// invented in the studio becomes a promise nobody else is keeping — and this is
// the surface a child reads most often.
//
// It renders NOTHING when there is no entry (including a failed read): a studio
// is a working surface, and an error card floating over a child's game is worse
// than the strip simply not being there.

import { Link } from 'react-router-dom';

import { dayLabel } from '../challenge/challengeSubmitCopy';
import { useChallengeContext } from './useChallengeContext';

export interface ChallengeStripProps {
  /** The real owned project, once one exists (absent on the landing phase). */
  projectId?: string;
  /** `?challenge=<slug>` — first arrival only; see `useChallengeContext`. */
  slug: string | null;
  /** `Project.challenge_edition_id` — what a resumed session has instead. */
  editionId: string | null;
}

export function ChallengeStrip({ projectId, slug, editionId }: ChallengeStripProps) {
  const context = useChallengeContext({ projectId, slug, editionId });
  if (!context) return null;

  const { entry, isDesignated, canDesignate, designate, designating, designateFailed } = context;

  return (
    <div
      data-testid="challenge-strip"
      className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-pg-border bg-pg-surface px-4 py-2 text-[13px] text-pg-text"
    >
      <span className="font-extrabold" data-testid="challenge-strip-name">
        🏆 {entry.name}
      </span>

      {/* Both dates come from the edition record — never from this file. */}
      <span className="text-pg-text-dim" data-testid="challenge-strip-window">
        Send in between {dayLabel(entry.submission_open)} and {dayLabel(entry.submission_close)}
      </span>

      {/* §8.3: the two facts a child cannot otherwise discover. Both describe
          how the product already behaves — neither is a new requirement. */}
      <span className="text-pg-text-dim" data-testid="challenge-strip-facts">
        Your work saves by itself. Only the project you enter is the one judges see.
      </span>

      {isDesignated ? (
        <span className="font-bold text-brand-mint" data-testid="challenge-strip-designated">
          This is the project you are entering
        </span>
      ) : (
        canDesignate && (
          <button
            type="button"
            onClick={designate}
            disabled={designating}
            className="rounded-lg border border-pg-border px-3 py-1 text-[12.5px] font-bold transition-colors hover:bg-pg-text/5 disabled:opacity-60"
            data-testid="challenge-strip-designate"
          >
            {designating ? 'Saving…' : 'Enter this project'}
          </button>
        )
      )}

      {designateFailed && (
        <span className="text-brand-coral" role="alert" data-testid="challenge-strip-error">
          That did not save. Try again in a moment.
        </span>
      )}

      <Link
        to={`/learn/challenge/${encodeURIComponent(entry.slug)}/submit`}
        className="ml-auto font-bold underline"
        data-testid="challenge-strip-link"
      >
        My challenge page →
      </Link>
    </div>
  );
}
