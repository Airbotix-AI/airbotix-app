// /portal/challenge/:slug — the family's view of one challenge.
//
// WHY THIS PAGE EXISTS: the Portal's only challenge route was
// `/portal/challenge/:slug/register`, a SINGLE-CHILD form fronted by a picker
// that showed nothing but names and ages. A parent with three children had to
// select each one in turn to discover who was entered, and there was no view
// that answered "where does my family stand?" at all. PRD §5 flow 1 specifies
// the register page and never specified this layer — the gap was in the spec,
// not just the code (PRD updated in the same change).
//
// It also answers the question the confirmation card left hanging: a family that
// has paid needs to know what their child actually makes and submits. That
// content is in `challengeGuidance.ts`, copied from the PRD, never authored here.
//
// This page reads; it never signs, pays or mutates. Every action links to the
// register page, which owns the whole consent + payment flow.

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { useMe } from '@/auth/useAuth';
import { getChallengeRegistration, type ChallengeRegistrationView } from './challengeApi';
import { challengeDayLabelLong } from './challengeDates';
import {
  CHALLENGE_JUDGING_NOTES,
  CHALLENGE_NEXT_STEPS,
  CHALLENGE_PROJECT_TYPES,
  CHALLENGE_SUBMISSION_ITEMS,
} from './challengeGuidance';

interface Kid {
  id: string;
  nickname: string;
  age: number;
}

/** What a parent needs to read on a row, derived from the entry the API returns. */
type KidStandingKind = 'entered' | 'payment_pending' | 'not_entered' | 'unknown';

interface KidStanding {
  kind: KidStandingKind;
  label: string;
  /** The one action this row offers. */
  actionLabel: string;
}

/**
 * Entry status → what the parent is told and what they can do next.
 *
 * `unknown` exists because a failed per-child request must NOT render as "not
 * entered": telling a parent their paid child has no entry is worse than saying
 * we could not check.
 */
function standingFor(view: ChallengeRegistrationView | undefined, isError: boolean): KidStanding {
  if (isError || !view) {
    return {
      kind: 'unknown',
      label: 'Could not check this child’s entry',
      actionLabel: 'Open and retry',
    };
  }
  const status = view.entry?.status;
  if (status === 'registration_confirmed') {
    return { kind: 'entered', label: 'Entered', actionLabel: 'View entry' };
  }
  if (status === 'pending_payment') {
    return {
      kind: 'payment_pending',
      label: 'Started — not paid yet',
      actionLabel: 'Finish registering',
    };
  }
  return { kind: 'not_entered', label: 'Not entered', actionLabel: 'Register this child' };
}

const STANDING_CLASS: Record<KidStandingKind, string> = {
  entered: 'sticker-mint',
  payment_pending: 'sticker-sunshine',
  not_entered: 'sticker-sky alt',
  unknown: 'sticker-coral',
};

const dayLabel = challengeDayLabelLong;

export function ChallengeHubPage({ slug }: { slug: string }) {
  const me = useMe();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : '';

  const kids = useQuery<Kid[]>({
    queryKey: ['families', familyId, 'kids'],
    queryFn: () => api<Kid[]>(`/families/${familyId}/kids`),
    enabled: familyId !== '',
  });

  const kidList = useMemo(() => kids.data ?? [], [kids.data]);

  // One request per child. The alternative — a family-scoped list endpoint — is
  // the cleaner shape and is logged in the PRD as a follow-up; with a handful of
  // children per family this reads the same data without a backend change, and
  // therefore without adding a deploy to the critical path.
  const registrations = useQueries({
    queries: kidList.map((kid) => ({
      queryKey: ['challenge-registration', slug, kid.id],
      queryFn: () => getChallengeRegistration(slug, kid.id),
    })),
  });

  // The edition is the same for every child, so the first successful response
  // describes it. Falling back to a kid-less read keeps the page useful for a
  // family with no children on the profile yet.
  const editionQuery = useQuery<ChallengeRegistrationView>({
    queryKey: ['challenge-registration', slug, null],
    queryFn: () => getChallengeRegistration(slug),
  });
  const edition = registrations.find((r) => r.data)?.data?.edition ?? editionQuery.data?.edition;

  const anyEntered = registrations.some((r) => r.data?.entry?.status === 'registration_confirmed');

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header>
        <span className="sticker-bubblegum">Creative Code Challenge</span>
        <h1 className="mt-4 text-3xl font-extrabold text-ink">
          {edition?.name ?? 'Creative Code Challenge'}
        </h1>
        {edition && (
          <p className="lead-text mt-3" data-testid="challenge-hub-dates">
            Submissions open {dayLabel(edition.submission_open)} and close{' '}
            {dayLabel(edition.submission_close)}. Results {dayLabel(edition.results_at)}.
          </p>
        )}
        {edition && !edition.registration_open && (
          <p className="mt-3 text-[13px] text-slate2" data-testid="challenge-hub-closed">
            Registration is not open at the moment, so no new entries can be started or paid for.
          </p>
        )}
      </header>

      {/* ── Who is entered ──────────────────────────────────────────────── */}
      <section className="card-base mt-6" aria-labelledby="challenge-hub-children">
        <h2 id="challenge-hub-children" className="section-heading">
          Your children
        </h2>

        {kids.isLoading && <p className="mt-3 text-[14px] text-slate2">Loading your children…</p>}

        {kids.isError && (
          <p className="field-error mt-3" role="alert">
            We could not load your children. Reload the page and try again.
          </p>
        )}

        {!kids.isLoading && !kids.isError && kidList.length === 0 && (
          <p className="mt-3 text-[13px] text-slate2">
            No children on your family profile yet.{' '}
            <Link to="/portal/family/new" className="underline">
              Add one first
            </Link>
            .
          </p>
        )}

        <ul className="mt-4 space-y-3">
          {kidList.map((kid, index) => {
            const result = registrations[index];
            const standing = standingFor(result?.data, Boolean(result?.isError));
            const loading = result?.isLoading ?? true;
            return (
              <li
                key={kid.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/60 px-4 py-3"
                data-testid={`challenge-hub-kid-${kid.id}`}
              >
                <div>
                  <p className="text-[15px] font-bold text-ink">{kid.nickname}</p>
                  <p className="text-[13px] text-slate2">Age {kid.age}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {loading ? (
                    <span className="text-[13px] text-slate2">Checking…</span>
                  ) : (
                    <span
                      className={STANDING_CLASS[standing.kind]}
                      data-testid={`challenge-hub-status-${kid.id}`}
                    >
                      {standing.label}
                    </span>
                  )}
                  <Link
                    className="btn-pill-secondary"
                    to={`/portal/challenge/${slug}/register?kid_id=${encodeURIComponent(kid.id)}`}
                    data-testid={`challenge-hub-action-${kid.id}`}
                  >
                    {standing.actionLabel} →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── What happens next ───────────────────────────────────────────── */}
      <section className="card-base mt-6" aria-labelledby="challenge-hub-next">
        <h2 id="challenge-hub-next" className="section-heading">
          {anyEntered ? 'What happens next' : 'What entering involves'}
        </h2>
        <p className="lead-text mt-3">
          Most families are doing this for the first time. Here is the whole thing, start to finish.
        </p>

        <ol className="mt-5 space-y-4" data-testid="challenge-hub-steps">
          {CHALLENGE_NEXT_STEPS.map((step, index) => (
            <li key={step.id} className="flex gap-3">
              <span className="mt-[2px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-sky text-[13px] font-bold text-ink">
                {index + 1}
              </span>
              <div>
                <p className="text-[15px] font-bold text-ink">{step.title}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-slate2">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── What the child makes ────────────────────────────────────────── */}
      <section className="card-base mt-6" aria-labelledby="challenge-hub-build">
        <h2 id="challenge-hub-build" className="section-heading">
          What your child builds
        </h2>
        <p className="lead-text mt-3">One project, either kind. Both run in a browser.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {CHALLENGE_PROJECT_TYPES.map((type) => (
            <div key={type.id} className="rounded-2xl bg-white/60 px-4 py-3">
              <p className="text-[15px] font-bold text-ink">{type.name}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-slate2">{type.body}</p>
            </div>
          ))}
        </div>

        <h3 className="mt-6 text-[15px] font-bold text-ink">What gets submitted</h3>
        <ul className="mt-3 space-y-3" data-testid="challenge-hub-submission-items">
          {CHALLENGE_SUBMISSION_ITEMS.map((item) => (
            <li key={item.id}>
              <p className="text-[14px] font-bold text-ink">{item.title}</p>
              <p className="text-[14px] leading-relaxed text-slate2">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── How it is judged ────────────────────────────────────────────── */}
      <section className="card-base mt-6" aria-labelledby="challenge-hub-judging">
        <h2 id="challenge-hub-judging" className="section-heading">
          How it is judged
        </h2>
        <ul className="mt-3 space-y-2" data-testid="challenge-hub-judging-notes">
          {CHALLENGE_JUDGING_NOTES.map((note) => (
            <li key={note} className="text-[14px] leading-relaxed text-slate2">
              {note}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
