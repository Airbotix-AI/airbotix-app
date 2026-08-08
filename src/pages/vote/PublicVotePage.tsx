// PUBLIC Creative Code Challenge voting + Creator Showcase —
// `/vote/:slug` and `/challenge/:slug/showcase`
// (creative-code-challenge-prd.md §5 flow 7/9, §3 D-CCC-4, §6 "airbotix-app —
// Public" row).
//
// Top-level and UNAUTHENTICATED, exactly like `/play/:shareId`: registered
// OUTSIDE every `<ProtectedRoute>` and outside both layouts, so a grandparent
// with no account and no app can open the link and take part.
//
// ## The four promises this page keeps
//
//   1. **The tally is hidden.** D-CCC-4 keeps the running count secret for the
//      whole voting window. So no entry card and no receipt renders a number of
//      any kind — not a count, not a rank, not a progress bar, not the voter's
//      own budget out of 10 (which the server returns and this page throws
//      away). The tests assert on the container text, because "we did not mean
//      to show a tally" is not a control.
//   2. **Every entry is presented identically, in a random order.** The server
//      re-shuffles on every request and serves three fields per entry; this page
//      renders them in the order received, with the same fields, the same
//      wording and the same CTA on every card. It NEVER sorts — any stable order
//      is an implicit ranking, and the two obvious ones (by votes, by time) are
//      the two worst.
//   3. **No child's media is published here.** The Showcase carries a display
//      name and a project kind, because that is what the media release consents
//      to by name (grant 5). There is no video, no playable project, no image
//      and no link to one — PRD §9 has NOT decided what a declined
//      `publish_face` / `publish_voice` grant does to publication, and a page
//      that guessed would be guessing about a minor's face.
//   4. **A failed load never looks like an empty Showcase.** "We could not load
//      this" and "no entries yet" are different screens with different words.
//
// ## Not here, on purpose
//
//   - **No OTP and no sign-in** (D-CCC-4). An email address is captured as an
//     identity, not as an authorisation, and nothing is emailed.
//   - **No analytics.** `/portal/*` is the only measured surface of this app
//     (`lib/analytics.ts`); a page showing children's work sits on the other
//     side of that line and must never be instrumented.
//   - **Nothing is logged.** Every payload here carries a voter's email address
//     and the display names of minors.

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { MARKETING_URL } from '@/lib/marketing';
import {
  castChallengeVote,
  getChallengeShowcase,
  type ChallengeShowcase,
  type ChallengeShowcaseEntry,
  type ChallengeVoteReceipt,
} from './challengeVoteApi';
import {
  dayLabel,
  ENTRY_FORMAT_NOTE,
  HIDDEN_TALLY_NOTE,
  isReferralRefusal,
  MEDIA_NOTE,
  projectTypeLabel,
  referralOutcomeMessage,
  showcaseLoadMessage,
  VOTE_CTA,
  voteErrorMessage,
} from './challengeVoteCopy';
import { VoteBonusPanel } from './VoteBonusPanel';

/** The backend's own ceiling (`VOTER_EMAIL_MAX_LENGTH`). */
const EMAIL_MAX = 254;

const voteSchema = z.object({
  submission_id: z.string().min(1, 'Choose the entry you want to vote for.'),
  email: z
    .string()
    .trim()
    .min(1, 'Type your email address so we can keep votes to one each.')
    .email('That does not look like an email address.')
    .max(EMAIL_MAX, 'That address is too long.'),
});
type VoteValues = z.infer<typeof voteSchema>;

/** Where `now` sits against the published window the backend gates writes on. */
type Phase = 'before' | 'open' | 'closed';

function phaseOf(showcase: ChallengeShowcase): Phase {
  if (showcase.voting_window_open) return 'open';
  return Date.now() < new Date(showcase.voting_open).getTime() ? 'before' : 'closed';
}

interface Props {
  /**
   * `vote` is `/vote/:slug`. `showcase` is `/challenge/:slug/showcase` — the
   * Creator Showcase of PRD §5 flow 9, which outlives the voting window and
   * carries no voting controls at all.
   */
  mode?: 'vote' | 'showcase';
}

export function PublicVotePage({ mode = 'vote' }: Props) {
  const { slug = '' } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  /** The code belongs to whoever invited this visitor; it credits THEM. */
  const referralCode = searchParams.get('ref')?.trim() || null;

  const [receipt, setReceipt] = useState<ChallengeVoteReceipt | null>(null);
  const [voterEmail, setVoterEmail] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  /** Set once the server has refused the invite code — see `onError` below. */
  const [referralDropped, setReferralDropped] = useState(false);

  const showcase = useQuery<ChallengeShowcase>({
    queryKey: ['challenge-showcase', slug],
    queryFn: () => getChallengeShowcase(slug),
    enabled: slug !== '',
    retry: false,
    // The server re-draws the order on EVERY request, and that shuffle is the
    // fairness rule (promise 2). A cached list would freeze one draw into every
    // later visit, so this query is never reused across mounts.
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  const form = useForm<VoteValues>({
    resolver: zodResolver(voteSchema),
    defaultValues: { submission_id: '', email: '' },
  });

  const cast = useMutation({
    mutationFn: (values: VoteValues) =>
      castChallengeVote(slug, {
        email: values.email.trim(),
        submission_id: values.submission_id,
        ...(referralCode && !referralDropped ? { referral_code: referralCode } : {}),
      }),
    onSuccess: (voteReceipt, values) => {
      setVoteError(null);
      setReceipt(voteReceipt);
      setVoterEmail(values.email.trim());
    },
    onError: (error: unknown) => {
      // The server refused the invite CODE, not the vote. Drop it so the next
      // attempt is the vote the visitor came to cast — never silently, and never
      // by dropping a code the server still accepts.
      if (isReferralRefusal(error)) setReferralDropped(true);
      setVoteError(
        voteErrorMessage(error, 'That did not send. Nothing was recorded — try again in a moment.'),
      );
    },
  });

  if (showcase.isLoading) {
    return (
      <Shell>
        <p className="lead-text" data-testid="vote-loading">
          Loading the Showcase…
        </p>
      </Shell>
    );
  }

  // A FAILED LOAD IS NOT AN EMPTY SHOWCASE. Different screen, different words,
  // and a retry — telling a visitor "no entries" because a request failed
  // misrepresents every child who entered.
  if (showcase.isError || !showcase.data) {
    return (
      <Shell>
        <div className="card-base" role="alert" data-testid="vote-load-error">
          <span className="sticker-coral">We could not load this</span>
          <p className="lead-text mt-4">{showcaseLoadMessage(showcase.error)}</p>
          <button type="button" onClick={() => void showcase.refetch()} className="btn-pill-primary mt-6">
            Try again
          </button>
        </div>
      </Shell>
    );
  }

  const data = showcase.data;
  const phase = phaseOf(data);
  const votingSurface = mode === 'vote';
  const canVote = votingSurface && phase === 'open' && receipt === null;

  return (
    <Shell title={votingSurface ? data.edition_name : `${data.edition_name} — Creator Showcase`}>
      <p className="mt-2 text-[14px] font-semibold text-slate2" data-testid="vote-window">
        {phase === 'before' && `Voting opens on ${dayLabel(data.voting_open)}.`}
        {phase === 'open' && `Voting is open until ${dayLabel(data.voting_close)}.`}
        {phase === 'closed' && `Voting closed on ${dayLabel(data.voting_close)}.`}
      </p>

      {/* Said ONCE, for every entry equally — and kept out of the cards so the
          cards carry no number at all (promise 1). */}
      <div className="card-base mt-4" data-testid="vote-entry-format">
        <p className="text-[14px] text-ink">{ENTRY_FORMAT_NOTE}</p>
        <p className="mt-2 text-[14px] text-slate2">{MEDIA_NOTE}</p>
        <p className="mt-2 text-[14px] text-slate2">{HIDDEN_TALLY_NOTE}</p>
      </div>

      {referralCode && !referralDropped && !receipt && votingSurface && (
        <p className="mt-4 text-[14px] text-slate2" data-testid="vote-referral-notice">
          You followed someone’s invite link. Your vote counts for the entry you choose — the
          invite only thanks the person who sent it.
        </p>
      )}

      {receipt && <VoteReceiptCard receipt={receipt} />}

      {data.submissions.length === 0 ? (
        <div className="card-base mt-6" data-testid="vote-empty">
          <span className="sticker-sunshine">Nothing to show yet</span>
          <p className="lead-text mt-4">
            No entries have been added to the Showcase yet. They appear here once each one has been
            checked, so please come back.
          </p>
        </div>
      ) : (
        <form
          className="mt-6"
          data-testid="vote-form"
          // `noValidate`: the email field keeps `type="email"` for the phone
          // keyboard, but the browser's own bubble ("Please enter an email
          // address") would BLOCK submit before our schema ran — so a visitor
          // who mistyped their address would never see that they also have to
          // choose an entry. One validator, ours, with the copy we wrote.
          noValidate
          onSubmit={form.handleSubmit((values) => cast.mutate(values))}
        >
          <fieldset>
            <legend className="section-heading">
              {canVote ? 'Choose one entry' : 'The entries'}
            </legend>
            {/* ⚠️ `data.submissions` is rendered in the order the server sent it.
                Do not sort, group or rank this list. */}
            <ul className="mt-4 grid gap-4 sm:grid-cols-2" data-testid="vote-showcase">
              {data.submissions.map((entry) => (
                <EntryCard
                  key={entry.submission_id}
                  entry={entry}
                  selectable={canVote}
                  register={form.register}
                />
              ))}
            </ul>
            {form.formState.errors.submission_id && (
              <span className="field-error" role="alert">
                {form.formState.errors.submission_id.message}
              </span>
            )}
          </fieldset>

          {canVote && (
            <div className="card-base mt-6">
              <label className="label-k12" htmlFor="vote-email">
                Your email address
              </label>
              <p className="mb-2 text-[13px] text-slate2">
                One vote per address. We use it to keep the voting fair — there is nothing to sign
                up for and no code to wait for.
              </p>
              <input
                id="vote-email"
                type="email"
                autoComplete="email"
                className="input-k12"
                data-testid="vote-email"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <span className="field-error">{form.formState.errors.email.message}</span>
              )}

              {referralDropped && (
                <p className="mt-3 text-[13px] text-slate2" data-testid="vote-referral-dropped">
                  Your next try will vote without the invite link.
                </p>
              )}

              {voteError && (
                <p
                  className="mt-3 rounded-2xl border border-brand-coral/30 bg-wash-coral px-4 py-3 text-[14px] font-semibold text-ink"
                  role="alert"
                  data-testid="vote-error"
                >
                  {voteError}
                </p>
              )}

              <button
                type="submit"
                className="btn-pill-primary mt-4"
                disabled={cast.isPending}
                data-testid="vote-submit"
              >
                {cast.isPending ? 'Sending your vote…' : 'Cast my vote →'}
              </button>
            </div>
          )}

          {votingSurface && phase === 'before' && (
            <p className="mt-6 text-[14px] text-slate2" data-testid="vote-not-open">
              You can vote from {dayLabel(data.voting_open)}. Have a look around until then.
            </p>
          )}
          {votingSurface && phase === 'closed' && (
            <p className="mt-6 text-[14px] text-slate2" data-testid="vote-closed">
              Voting closed on {dayLabel(data.voting_close)}, so no more votes can be added. The
              results are announced separately.
            </p>
          )}
          {!votingSurface && phase === 'open' && (
            <p className="mt-6 text-[14px] text-slate2">
              <Link to={`/vote/${slug}`} className="font-semibold underline" data-testid="vote-link">
                Voting is open — have your say →
              </Link>
            </p>
          )}
        </form>
      )}

      {/* The bonus tasks need the one-shot token from the receipt, so they only
          exist once this visitor has actually voted. */}
      {receipt && voterEmail && (
        <VoteBonusPanel
          slug={slug}
          identity={{ email: voterEmail, bonus_token: receipt.bonus_token }}
        />
      )}
    </Shell>
  );
}

/**
 * One Creator Card — the SAME three things for every entry, in the same words,
 * with the same call to action. No count, no rank, no date, no media, no link.
 */
function EntryCard({
  entry,
  selectable,
  register,
}: {
  entry: ChallengeShowcaseEntry;
  selectable: boolean;
  register: ReturnType<typeof useForm<VoteValues>>['register'];
}) {
  return (
    <li
      className="card-base"
      data-testid="vote-entry"
      data-submission-id={entry.submission_id}
    >
      <h3 className="text-[17px] font-bold text-ink">{entry.display_name}</h3>
      <p className="mt-1 text-[14px] text-slate2">{projectTypeLabel(entry.project_type)}</p>
      {selectable && (
        <label className="mt-4 flex items-center gap-3 text-[15px] font-semibold text-ink">
          <input type="radio" value={entry.submission_id} {...register('submission_id')} />
          {VOTE_CTA}
        </label>
      )}
    </li>
  );
}

/**
 * What a voter is told afterwards: that it worked. Nothing else.
 *
 * No count, no "you are voter #N", no standing, and nothing about the entry they
 * chose — a receipt that reported anything measurable would be the tally leaking
 * one voter at a time.
 */
function VoteReceiptCard({ receipt }: { receipt: ChallengeVoteReceipt }) {
  const referral = referralOutcomeMessage(receipt.referral);
  return (
    <div className="card-base mt-6" role="status" data-testid="vote-receipt">
      <span className="sticker-mint">Vote recorded</span>
      <p className="lead-text mt-4">
        Thank you — your vote has been recorded. Results are not shown while voting is open, so
        there is nothing to check back for until they are announced.
      </p>
      {referral && (
        <p className="mt-3 text-[14px] text-slate2" data-testid="vote-referral-outcome">
          {referral}
        </p>
      )}
    </div>
  );
}

/**
 * The page frame. Deliberately light: brand attribution and one first-party link
 * back to the marketing site, no app chrome, no navigation into the product, no
 * third-party anything (minors-compliance C14).
 */
function Shell({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <a
          href={MARKETING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] font-bold uppercase tracking-wide text-brand-coral"
        >
          AirBotix
        </a>
        <div className="mb-2 mt-4">
          <div className="eyebrow eyebrow-sky">Creative Code Challenge</div>
          <h1 className="hero-display">{title ?? 'Creator Showcase'}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
