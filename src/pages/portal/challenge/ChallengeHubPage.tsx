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
import { CalendarDays, Code2, Globe2, MessageCircle, Trophy, Video } from 'lucide-react';

import { api } from '@/lib/api';
import { useMe } from '@/auth/useAuth';
import { KidDeviceHandoff } from '@/components/KidDeviceHandoff';
import {
  getChallengeRegistration,
  getChallengeRubric,
  type ChallengeRegistrationView,
  type ChallengeRubric,
} from './challengeApi';
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

const STATUS_ORDER = {
  draft: 0,
  registration_open: 1,
  submissions_open: 2,
  judging: 3,
  results_locked: 4,
  published: 5,
} as const;

interface TimelineStage {
  id: string;
  title: string;
  date: string;
  body: string;
  rank: number;
}

function challengeStatusCopy(status: keyof typeof STATUS_ORDER, anyEntered: boolean) {
  if (status === 'draft') {
    return {
      label: 'Coming soon',
      title: 'This competition is being prepared',
      body: 'You can learn how it works now. Registration will appear here when it opens.',
    };
  }
  if (status === 'registration_open') {
    return anyEntered
      ? {
          label: 'Your family is in',
          title: 'Start building — there is no need to wait',
          body: 'Your child can begin their project now and keep improving it before submissions open.',
        }
      : {
          label: 'Registration open',
          title: 'Choose a child to enter',
          body: 'Registration, consent and payment all happen from the child row below.',
        };
  }
  if (status === 'submissions_open') {
    return {
      label: 'Submissions open',
      title: 'It is time to finish and submit',
      body: 'Your child submits from their own account before the closing date shown below.',
    };
  }
  if (status === 'judging') {
    return {
      label: 'Review and judging',
      title: 'Entries are with the review team and judges',
      body: 'Approved entries can appear in the Creator Showcase according to each family’s media choices.',
    };
  }
  if (status === 'results_locked') {
    return {
      label: 'Results ready',
      title: 'Your child’s private feedback is ready',
      body: 'Open their entry to see the result and judge feedback available to your family.',
    };
  }
  return {
    label: 'Results published',
    title: 'The challenge is complete',
    body: 'Results and approved Creator Showcase entries are now available.',
  };
}

function timelineFor(edition: NonNullable<ChallengeRegistrationView['edition']>): TimelineStage[] {
  return [
    {
      id: 'register',
      title: 'Register and get ready',
      date: edition.registration_open ? 'Open now' : 'Registration closed',
      body: 'Choose a child, record both consent decisions and complete the entry.',
      rank: 1,
    },
    {
      id: 'submit',
      title: 'Build and submit',
      date: `${dayLabel(edition.submission_open)} — ${dayLabel(edition.submission_close)}`,
      body: 'Build one browser project, record the pitch and submit from the child’s account.',
      rank: 2,
    },
    {
      id: 'judge',
      title: 'Review, showcase and judging',
      date: `After ${dayLabel(edition.submission_close)}`,
      body: 'Entries are safety-reviewed, approved work can enter the Showcase, and judges use the published rubric.',
      rank: 3,
    },
    {
      id: 'results',
      title: 'Results and private feedback',
      date: dayLabel(edition.results_at),
      body: 'Your family can see your child’s feedback without seeing another child’s private marks.',
      rank: 4,
    },
  ];
}

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
  const statusCopy = edition ? challengeStatusCopy(edition.status, anyEntered) : null;
  const timeline = edition ? timelineFor(edition) : [];
  const currentRank = edition ? STATUS_ORDER[edition.status] : 0;

  // Published criteria, served by the backend so this page cannot state a
  // weighting the judges are not actually using.
  const rubric = useQuery<ChallengeRubric>({
    queryKey: ['challenge-rubric'],
    queryFn: getChallengeRubric,
    staleTime: 60 * 60 * 1000,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="overflow-hidden rounded-[32px] border-2 border-ink bg-ink text-white shadow-sticker">
        <div className="grid gap-0 lg:grid-cols-[1.45fr_0.8fr]">
          <div className="relative overflow-hidden p-6 sm:p-9 lg:p-10">
            <div className="absolute -right-14 -top-14 h-48 w-48 rounded-full bg-brand-sky/20" />
            <div className="absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-brand-bubblegum/15" />
            <div className="relative">
              <span className="sticker-bubblegum">Creative Code Challenge · Junior</span>
              <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
                {edition?.name ?? 'Creative Code Challenge'}
              </h1>
              <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-white/80 sm:text-[18px]">
                An online creative coding competition for ages 8–12. Your child turns an original
                idea into a playable browser project, explains how they made it, and is judged
                fairly against a published 100-point guide.
              </p>

              <div
                className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4"
                data-testid="challenge-hub-overview"
              >
                {[
                  { icon: Globe2, value: 'Online', label: 'Join from home' },
                  { icon: Code2, value: '1 project', label: 'Game or web' },
                  { icon: Video, value: '60–90 sec', label: 'Project pitch' },
                  { icon: Trophy, value: '100 points', label: 'Published rubric' },
                ].map((fact) => (
                  <div key={fact.value} className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
                    <fact.icon aria-hidden="true" className="h-5 w-5 text-brand-sunshine" />
                    <p className="mt-2 text-[14px] font-extrabold text-white">{fact.value}</p>
                    <p className="mt-0.5 text-[11px] text-white/60">{fact.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t-2 border-white/15 bg-white p-6 text-ink lg:border-l-2 lg:border-t-0 lg:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate2">
              Where the competition is now
            </p>
            {statusCopy ? (
              <div className="mt-4" data-testid="challenge-hub-current-stage">
                <span className="sticker-mint">{statusCopy.label}</span>
                <h2 className="mt-5 text-2xl font-extrabold leading-tight text-ink">
                  {statusCopy.title}
                </h2>
                <p className="mt-3 text-[14px] leading-relaxed text-slate2">{statusCopy.body}</p>
              </div>
            ) : (
              <p className="mt-4 text-[14px] text-slate2">Loading the current stage…</p>
            )}
            {edition && (
              <div className="mt-6 border-t-2 border-ink/10 pt-5" data-testid="challenge-hub-dates">
                <p className="flex items-start gap-2 text-[13px] font-bold text-ink">
                  <CalendarDays aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  Submit {dayLabel(edition.submission_open)} — {dayLabel(edition.submission_close)}
                </p>
                <p className="mt-2 flex items-start gap-2 text-[13px] font-bold text-ink">
                  <Trophy aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  Results {dayLabel(edition.results_at)}
                </p>
              </div>
            )}
            {edition && !edition.registration_open && (
              <p
                className="mt-4 text-[12px] leading-relaxed text-slate2"
                data-testid="challenge-hub-closed"
              >
                Registration is not open at the moment, so no new entries can be started or paid
                for.
              </p>
            )}
          </div>
        </div>
      </header>

      {/* ── The whole competition at a glance ─────────────────────────── */}
      <section className="card-base mt-6 sm:p-7" aria-labelledby="challenge-hub-timeline-title">
        <div className="max-w-2xl">
          <span className="eyebrow eyebrow-sky">The whole journey</span>
          <h2 id="challenge-hub-timeline-title" className="section-heading mt-2">
            What happens, and when
          </h2>
          <p className="lead-text mt-3">
            You do not need to understand the whole platform today. Follow these four stages; this
            page will keep showing where the competition has reached.
          </p>
        </div>

        {edition ? (
          <ol
            className="mt-7 grid gap-0 lg:grid-cols-4"
            data-testid="challenge-hub-timeline"
            aria-label="Competition timeline"
          >
            {timeline.map((stage, index) => {
              const isCurrent = currentRank === stage.rank;
              const isComplete =
                currentRank > stage.rank || (edition.status === 'published' && stage.rank === 4);
              return (
                <li
                  key={stage.id}
                  className="relative flex gap-4 pb-7 last:pb-0 lg:block lg:pb-0 lg:pr-5"
                  aria-current={isCurrent ? 'step' : undefined}
                  data-testid={`challenge-timeline-${stage.id}`}
                >
                  {index < timeline.length - 1 && (
                    <span
                      aria-hidden="true"
                      className={`absolute left-[17px] top-9 h-[calc(100%-2.25rem)] w-0.5 lg:left-9 lg:top-[17px] lg:h-0.5 lg:w-[calc(100%-2.25rem)] ${
                        isComplete ? 'bg-brand-mint' : 'bg-ink/10'
                      }`}
                    />
                  )}
                  <div
                    className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-extrabold ${
                      isComplete
                        ? 'border-brand-mint bg-brand-mint text-ink'
                        : isCurrent
                          ? 'border-ink bg-brand-sunshine text-ink'
                          : 'border-ink/15 bg-white text-slate2'
                    }`}
                  >
                    {isComplete ? '✓' : index + 1}
                  </div>
                  <div className="lg:mt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-extrabold text-ink">{stage.title}</p>
                      {isCurrent && (
                        <span className="rounded-full bg-brand-sunshine/40 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-ink">
                          Now
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[12px] font-bold text-slate2">{stage.date}</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-slate2">{stage.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-6 text-[14px] text-slate2">Loading the competition timeline…</p>
        )}
      </section>

      {/* ── Why this is useful for a child ─────────────────────────────── */}
      <section className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="What children practise">
        {[
          {
            icon: Code2,
            title: 'Turn an idea into something real',
            body: 'Your child makes a project another person can open, try and understand.',
            colour: 'bg-brand-sky/15',
          },
          {
            icon: MessageCircle,
            title: 'Explain their own decisions',
            body: 'The pitch is about clear thinking and ownership — never accent or fancy vocabulary.',
            colour: 'bg-brand-bubblegum/15',
          },
          {
            icon: Trophy,
            title: 'Learn from a clear rubric',
            body: 'Families can see the same marking guide the judges use before the child submits.',
            colour: 'bg-brand-mint/15',
          },
        ].map((benefit) => (
          <div key={benefit.title} className={`rounded-3xl p-5 ${benefit.colour}`}>
            <benefit.icon aria-hidden="true" className="h-6 w-6 text-ink" />
            <h2 className="mt-4 text-[16px] font-extrabold leading-snug text-ink">
              {benefit.title}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-slate2">{benefit.body}</p>
          </div>
        ))}
      </section>

      {/* ── Who is entered ──────────────────────────────────────────────── */}
      <section className="card-base mt-6 sm:p-7" aria-labelledby="challenge-hub-children">
        <h2 id="challenge-hub-children" className="section-heading">
          Your family’s entries
        </h2>
        <p className="lead-text mt-3">
          Each child has their own entry, project and submission. Choose the action beside their
          name — nothing is shared between siblings.
        </p>

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
                className="rounded-2xl bg-white/60 px-4 py-3"
                data-testid={`challenge-hub-kid-${kid.id}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
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
                </div>

                {/*
                  An ENTERED child needs their own account open to build and to
                  submit — and a parent cannot reach it, however signed in they
                  are: `/learn/*` bounces a parent principal to `/portal`. This
                  is the existing handoff (one-shot token + QR) placed where the
                  need actually arises, instead of only on the family page.
                */}
                {standing.kind === 'entered' && (
                  <div className="mt-3 border-t-2 border-ink/10 pt-3">
                    <KidDeviceHandoff kidId={kid.id} nickname={kid.nickname} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── What happens next ───────────────────────────────────────────── */}
      <section className="card-base mt-6 sm:p-7" aria-labelledby="challenge-hub-next">
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
                {step.parentLink && (
                  <a
                    className="mt-2 inline-block text-[13px] font-semibold text-ink underline"
                    href={step.parentLink.to}
                    data-testid={`challenge-hub-step-link-${step.id}`}
                  >
                    {step.parentLink.label} →
                  </a>
                )}
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

      {/* ── Where the child submits ─────────────────────────────────────── */}
      {anyEntered && (
        <section className="card-base mt-6" aria-labelledby="challenge-hub-submit-where">
          <h2 id="challenge-hub-submit-where" className="section-heading">
            Where your child submits
          </h2>
          <p className="lead-text mt-3">
            Your child submits from <strong>their own account</strong>, not from yours — the entry
            has to be theirs. They sign in to Learn and open{' '}
            <span className="font-mono text-[13px]">Challenge → Submit</span>.
          </p>
          <p className="mt-3 text-[13px] text-slate2" data-testid="challenge-hub-submit-note">
            This link only opens for a signed-in child, so it will not work from your account. Hand
            the device over, or use <strong>Send to my child’s device</strong> on the{' '}
            <Link to="/portal/family" className="underline">
              family page
            </Link>{' '}
            to pass it across.
          </p>
        </section>
      )}

      {/* ── How it is judged ────────────────────────────────────────────── */}
      <section className="card-base mt-6" aria-labelledby="challenge-hub-judging">
        <h2 id="challenge-hub-judging" className="section-heading">
          How it is judged
        </h2>

        {rubric.data && (
          <>
            <p className="lead-text mt-3">
              Every entry is scored out of {rubric.data.total_points} by each judge independently.
              This is the whole breakdown — nothing is scored that is not on this list.
            </p>
            <ul className="mt-4 space-y-4" data-testid="challenge-hub-rubric">
              {rubric.data.dimensions.map((dimension) => (
                <li key={dimension.key} className="rounded-2xl bg-white/60 px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[15px] font-bold text-ink">{dimension.label}</p>
                    <span className="sticker-sky alt">{dimension.max_points} marks</span>
                  </div>
                  <p className="mt-1 text-[14px] leading-relaxed text-slate2">
                    {dimension.description}
                  </p>
                  {dimension.constraints.length > 0 && (
                    <ul className="mt-2 space-y-1" data-testid={`rubric-limits-${dimension.key}`}>
                      {dimension.constraints.map((rule) => (
                        <li key={rule} className="text-[13px] leading-relaxed text-ink">
                          • {rule}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {rubric.isError && (
          // Never silently show nothing: a family that cannot see the criteria
          // should know the criteria exist and the page failed, not assume there
          // are none.
          <p className="field-error mt-3" role="alert" data-testid="challenge-hub-rubric-error">
            We could not load the marking guide just now. Reload the page — the criteria have not
            changed.
          </p>
        )}

        <ul className="mt-4 space-y-2" data-testid="challenge-hub-judging-notes">
          {CHALLENGE_JUDGING_NOTES.map((note) => (
            <li key={note} className="text-[14px] leading-relaxed text-slate2">
              {note}
            </li>
          ))}
        </ul>
      </section>

      {/* ── The public side ─────────────────────────────────────────────── */}
      <section className="card-base mt-6" aria-labelledby="challenge-hub-public">
        <h2 id="challenge-hub-public" className="section-heading">
          The public Creator Showcase
        </h2>
        <p className="lead-text mt-3">
          Approved entries appear in a public Showcase, and the public vote there decides the Junior
          People’s Choice award only — it does not change the judges’ scores.
        </p>
        <p className="mt-3 text-[13px] text-slate2">
          What appears is only what you permitted in the media release. If you granted nothing, your
          child’s work is judged exactly the same and simply is not shown publicly.
        </p>
        <a
          className="btn-pill-secondary mt-5 inline-block"
          href={`/challenge/${encodeURIComponent(slug)}/showcase`}
          data-testid="challenge-hub-showcase-link"
        >
          Open the public Showcase →
        </a>
      </section>
    </div>
  );
}
