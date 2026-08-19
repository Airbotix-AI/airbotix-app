// Creative Code Challenge — parent registration
// (`/portal/challenge/:slug/register`; creative-code-challenge-prd.md §5 flow 1,
// §6 "airbotix-app — Portal" row).
//
// The order is fixed and each step is its own recorded act: pick the child →
// sign the Media Release → accept the Competition Terms (TWO separate documents,
// TWO separate API calls, D-CCC-7) → pay the entry fee on the Airwallex hosted
// page → come back and see what the webhook actually did.
//
// Two things this page must never do:
//   • claim success it has not seen. The confirmation renders the entry status
//     and the Stars the SERVER reports, never the fact that a redirect happened.
//   • put a live Pay button in front of a parent whose payment may still be in
//     flight. Same double-charge guard as ClassCheckoutPage.
//
// Nothing here is logged: the payloads carry a child's display name, consent
// choices and the family's registration state.

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { CHALLENGE_PORTAL_PATH } from '@/lib/challenge';
import { api } from '@/lib/api';
import { formatAud } from '@/lib/money';
import { ChallengeOrientationVideo } from './ChallengeOrientationVideo';

import { startHostedCheckout } from '../airwallex';
import {
  getChallengeConsent,
  getChallengeRegistration,
  readStoredMediaReleaseGrants,
  recordChallengeKidAssent,
  signChallengeConsent,
  startChallengeCheckout,
  type ChallengeConsentDocumentStatus,
  type ChallengeConsentStatus,
  type ChallengeRegistrationView,
  type ChallengeSignerDetails,
  type MediaReleaseGrants,
} from './challengeApi';
import {
  challengeErrorMessage,
  consentGapDetail,
  isChallengeNotFound,
  isConsentRequired,
} from './challengeErrors';
import { challengeDayLabel } from './challengeDates';
import { CompetitionTermsStep } from './CompetitionTermsStep';
import { MediaReleaseStep } from './MediaReleaseStep';
import { SignedDocumentCard } from './SignedDocumentCard';

interface Kid {
  id: string;
  nickname: string;
  age: number;
}

/**
 * Handoff across the Airwallex redirect. Stores the KID ID — an opaque
 * identifier — and never the nickname: this is the parent's browser, but a
 * child's name has no reason to sit in storage for a payment round-trip.
 *
 * Scoped to the signed-in FAMILY. Session storage outlives a sign-out in the
 * same tab, so an unscoped key let one parent's abandoned checkout be read back
 * under the next parent's session on a shared family device — which then drove
 * a `kid_id` that is not theirs into every read on this page.
 */
const pendingKey = (slug: string, familyId: string) => `challenge_entry:${slug}:${familyId}`;

const POLL_INTERVAL_MS = 3_000;
const POLL_MAX_ATTEMPTS = 40; // ~2 minutes

// Shared, and rendered in UTC — this used to format in the VIEWER's timezone,
// which showed an Australian parent `submission_close` (31 Aug 23:59:59Z) as
// 1 September: a deadline one day later than the real one. See challengeDates.ts.
const dayLabel = challengeDayLabel;

function findDoc(
  consent: ChallengeConsentStatus | undefined,
  type: ChallengeConsentDocumentStatus['document_type'],
): ChallengeConsentDocumentStatus | undefined {
  return consent?.documents.find((doc) => doc.document_type === type);
}

export function ChallengeRegisterPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const location = useLocation();
  const me = useMe();
  const queryClient = useQueryClient();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;
  // Prefill only. The signature block stays editable, because the account holder
  // is not always the adult whose name belongs on the form.
  const signerAccount =
    me.data?.kind === 'user'
      ? { display_name: me.data.display_name, email: me.data.email }
      : { display_name: null, email: null };

  const [kidId, setKidId] = useState('');
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  const [pollAttempts, setPollAttempts] = useState(0);
  const [signError, setSignError] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [assentError, setAssentError] = useState<string | null>(null);
  const [kidNotice, setKidNotice] = useState<string | null>(null);
  const [reopenMediaRelease, setReopenMediaRelease] = useState(false);
  const [reviewAuthorization, setReviewAuthorization] = useState(false);

  const clearHandoff = () => {
    if (familyId) sessionStorage.removeItem(pendingKey(slug, familyId));
  };

  // Pick the payment round-trip back up — but only once we know WHOSE session
  // this is, since the key is family-scoped.
  useEffect(() => {
    if (!familyId) return;
    const stashed = sessionStorage.getItem(pendingKey(slug, familyId));
    if (!stashed) return;
    setKidId(stashed);
    setAwaitingPayment(true);
  }, [familyId, slug]);

  const registration = useQuery<ChallengeRegistrationView>({
    queryKey: ['challenge-registration', slug, kidId],
    queryFn: () => getChallengeRegistration(slug, kidId || undefined),
    enabled: slug !== '',
    retry: false,
    refetchInterval: () =>
      awaitingPayment && pollAttempts < POLL_MAX_ATTEMPTS ? POLL_INTERVAL_MS : false,
  });
  const edition = registration.data?.edition;
  const entry = registration.data?.entry ?? null;

  const kids = useQuery<Kid[]>({
    queryKey: ['families', familyId, 'kids'],
    queryFn: () => api<Kid[]>(`/families/${familyId}/kids`),
    enabled: !!familyId,
  });

  const consent = useQuery<ChallengeConsentStatus>({
    queryKey: ['challenge-consent', edition?.id, kidId],
    queryFn: () => getChallengeConsent(edition!.id, kidId),
    enabled: !!edition?.id && kidId !== '',
    retry: false,
  });

  // Count polls so an unconfirmed entry lands on the "still confirming" screen
  // instead of spinning forever.
  useEffect(() => {
    if (!awaitingPayment) return;
    setPollAttempts((n) => n + 1);
  }, [awaitingPayment, registration.dataUpdatedAt]);

  // The webhook landed — stop polling and drop the handoff key so a later visit
  // doesn't re-enter the waiting state.
  useEffect(() => {
    if (entry?.status !== 'registration_confirmed') return;
    if (familyId) sessionStorage.removeItem(pendingKey(slug, familyId));
    setAwaitingPayment(false);
  }, [entry?.status, slug, familyId]);

  /**
   * A kid-scoped 404 must not take the whole page out.
   *
   * `…/registration?kid_id=` answers the SAME 404 for a missing edition and for
   * a kid id that is not this family's (the backend never leaks another family's
   * kid ids). A stale id from an earlier session in this tab, or a since-deleted
   * child, would therefore have told the parent "we could not find this
   * challenge" and removed the child picker with it — a dead funnel on a page a
   * marketing CTA links straight into. Drop the kid instead and let them choose
   * again.
   */
  const staleKid =
    registration.isError && kidId !== '' && isChallengeNotFound(registration.error);
  useEffect(() => {
    if (!staleKid) return;
    clearHandoff();
    setKidId('');
    setAwaitingPayment(false);
    setKidNotice(
      'We could not open that child’s entry for this challenge. Choose a child below to start again.',
    );
    // `clearHandoff` closes over the family id, which is in the deps already.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staleKid, slug, familyId]);

  const refreshConsent = () =>
    queryClient.invalidateQueries({ queryKey: ['challenge-consent', edition?.id, kidId] });

  const signMediaRelease = useMutation({
    mutationFn: ({ grants, signer }: { grants: MediaReleaseGrants; signer: ChallengeSignerDetails }) => {
      const doc = findDoc(consent.data, 'parent_media_release');
      return signChallengeConsent(edition!.id, {
        kid_id: kidId,
        document_type: 'parent_media_release',
        document_version: doc!.current_version,
        grants,
        signer,
      });
    },
    onSuccess: (status) => {
      setSignError(null);
      setReopenMediaRelease(false);
      queryClient.setQueryData(['challenge-consent', edition?.id, kidId], status);
    },
    onError: (error: unknown) =>
      setSignError(challengeErrorMessage(error, 'We could not record your choices. Try again.')),
  });

  const signTerms = useMutation({
    mutationFn: (signer: ChallengeSignerDetails) => {
      const doc = findDoc(consent.data, 'competition_terms');
      return signChallengeConsent(edition!.id, {
        kid_id: kidId,
        document_type: 'competition_terms',
        document_version: doc!.current_version,
        grants: { accepted: true },
        signer,
      });
    },
    onSuccess: (status) => {
      setSignError(null);
      queryClient.setQueryData(['challenge-consent', edition?.id, kidId], status);
    },
    onError: (error: unknown) =>
      setSignError(challengeErrorMessage(error, 'We could not record your acceptance. Try again.')),
  });

  const assent = useMutation({
    mutationFn: (assented: boolean) => recordChallengeKidAssent(edition!.id, kidId, assented),
    onSuccess: (status) => {
      setAssentError(null);
      queryClient.setQueryData(['challenge-consent', edition?.id, kidId], status);
    },
    // The checkbox reflects the SERVER's stamp, so a rejected write just snaps
    // it back. Without this the parent watches their tick undo itself and is
    // told nothing.
    onError: (error: unknown) =>
      setAssentError(
        challengeErrorMessage(error, 'We could not record that. Try ticking the box again.'),
      ),
  });

  const pay = useMutation({
    mutationFn: () => startChallengeCheckout(edition!.id, kidId),
    onSuccess: async (result) => {
      setPayError(null);
      if (familyId) sessionStorage.setItem(pendingKey(slug, familyId), kidId);
      setAwaitingPayment(true);
      setPollAttempts(0);
      await startHostedCheckout(result);
    },
    onError: async (error: unknown) => {
      const message = challengeErrorMessage(error, 'We could not start checkout. Try again.');
      // Name the outstanding document when the backend told us which one it is —
      // "a form is missing" is not something a parent can act on. `null` when it
      // didn't say, and we never guess: naming the wrong form sends them to
      // re-sign something that was fine.
      const detail = consentGapDetail(error);
      setPayError(detail ? `${message} Specifically, ${detail}.` : message);
      // A consent gap refusal means the page's idea of what is signed is stale —
      // re-read it so the outstanding document is actually put back in front of
      // the parent rather than just described in an error message.
      if (isConsentRequired(error)) await refreshConsent();
      if (isConsentRequired(error)) setReviewAuthorization(true);
    },
  });

  // Paying requires a family, same as every other Portal checkout.
  if (me.data?.kind === 'user' && !familyId) {
    return <Navigate to="/portal/register" state={{ from: location }} replace />;
  }

  // `staleKid` is about to drop the kid and re-read without it, so show the
  // loading state rather than flashing a terminal "not available" card.
  if (registration.isLoading || staleKid) {
    return (
      <div>
        <Header />
        <p className="lead-text mt-6">Loading this challenge…</p>
      </div>
    );
  }

  if (registration.isError || !edition) {
    return (
      <div>
        <Header />
        <div className="card-base mt-6" role="alert">
          <span className="sticker-sunshine">Not available</span>
          <p className="lead-text mt-4">
            {challengeErrorMessage(registration.error, 'We could not load this challenge.')}
          </p>
          {/* A transient 500 or a dropped connection must not permanently close
              the registration funnel — same recovery the consent card offers. */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void registration.refetch()}
              className="btn-pill-primary"
              data-testid="challenge-retry"
            >
              Try again
            </button>
            <Link to="/portal" className="btn-pill-secondary inline-block">
              Back to the Portal →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const kidName = (kids.data ?? []).find((kid) => kid.id === kidId)?.nickname ?? null;

  // ── Confirmed ───────────────────────────────────────────────────────────
  // Reports what the SERVER says happened, including the case where the entry
  // is confirmed but the Stars grant has not been read back yet.
  if (entry?.status === 'registration_confirmed') {
    return (
      <div>
        <Header />
        <div className="card-base mt-6" data-testid="challenge-registered">
          <span className="sticker-mint">Entry confirmed</span>
          <h2 className="section-heading mt-4">
            {kidName ? `${kidName} is entered` : 'Registration confirmed'} ✓
          </h2>
          <p className="lead-text mt-3">
            {edition.name} · entry status: {entry.status.replace(/_/g, ' ')}.
          </p>
          <p className="mt-3 text-[14px] text-ink" data-testid="challenge-stars">
            {entry.stars_granted > 0
              ? `${entry.stars_granted} Stars have been added to your family wallet.`
              : 'The Stars that come with an entry have not been added yet. They land automatically — ' +
                'check your wallet again shortly.'}
          </p>
          <p className="mt-3 text-[13px] text-slate2">
            Submissions open {dayLabel(edition.submission_open)} and close{' '}
            {dayLabel(edition.submission_close)}.
          </p>
          {/*
            The moment a family most needs to know what they just bought. This
            card used to dead-end at the wallet: "your Stars landed" told a
            parent nothing about what their child now does (entrant-onboarding-prd
            §13). Renders nothing when the edition carries no video.
          */}
          <ChallengeOrientationVideo
            url={edition.orientation_video_url}
            poster={edition.orientation_video_poster}
            className="mt-6"
          />
          <div className="mt-6 flex flex-wrap gap-3">
            {/*
              The onward action is the CHALLENGE, not the wallet. The hub is
              where the per-child handoff into the studio lives; the wallet is a
              balance a parent can check any time and was never the next step.
            */}
            <Link to={CHALLENGE_PORTAL_PATH} className="btn-pill-primary inline-block">
              {kidName ? `Open ${kidName}’s challenge →` : 'Open the challenge →'}
            </Link>
            <Link to="/portal/wallet" className="btn-pill-secondary inline-block">
              View wallet →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Back from the hosted page, waiting on the webhook ────────────────────
  if (awaitingPayment) {
    const timedOut = pollAttempts >= POLL_MAX_ATTEMPTS;
    return (
      <div>
        <Header />
        <div className="card-base mt-6" data-testid="challenge-confirming">
          <span className={timedOut ? 'sticker-sunshine' : 'sticker-sky alt'}>
            {timedOut ? 'Still confirming' : 'Confirming payment…'}
          </span>
          <p className="lead-text mt-4">
            {timedOut
              ? 'We have not received your payment confirmation yet. If you completed payment, do ' +
                'not pay again — the entry confirms itself the moment confirmation arrives.'
              : 'Hang tight — we are waiting for your payment confirmation. This usually takes a ' +
                'few seconds.'}
          </p>
          {timedOut && (
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setPollAttempts(0);
                  void registration.refetch();
                }}
                className="btn-pill-primary"
                data-testid="challenge-recheck"
              >
                Check again →
              </button>
              <button
                type="button"
                onClick={() => {
                  clearHandoff();
                  setAwaitingPayment(false);
                }}
                className="btn-pill-secondary"
                data-testid="challenge-abandon"
              >
                I did not complete payment
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const mediaRelease = findDoc(consent.data, 'parent_media_release');
  const terms = findDoc(consent.data, 'competition_terms');
  const channelLabels = Object.fromEntries(
    (mediaRelease?.channel_options ?? []).map((option) => [option.key, option.label]),
  );
  const bothSigned = consent.data?.all_documents_signed === true;

  return (
    <div>
      <Header />

      <section className="card-base mt-6">
        <h2 className="section-heading">{edition.name}</h2>
        <p className="mt-2 text-[14px] text-slate2">
          Entry fee {formatAud(edition.entry_fee_cents)} · submissions{' '}
          {dayLabel(edition.submission_open)} – {dayLabel(edition.submission_close)} · results{' '}
          {dayLabel(edition.results_at)}
        </p>
        {!edition.registration_open && (
          <p
            className="mt-4 rounded-2xl border border-brand-coral/30 bg-wash-coral px-4 py-3 text-[13px] font-medium text-ink"
            role="alert"
            data-testid="registration-closed"
          >
            This challenge is not taking entries at the moment, so nothing can be signed or paid
            right now. Check the challenge page for the next registration window.
          </p>
        )}
      </section>

      <section className="card-base mt-6">
        <label className="block">
          <span className="label-k12">Who are you entering?</span>
          <select
            className="input-k12 mt-2"
            value={kidId}
            onChange={(event) => {
              setKidId(event.target.value);
              setSignError(null);
              setPayError(null);
              setAssentError(null);
              setKidNotice(null);
              setReopenMediaRelease(false);
              setReviewAuthorization(false);
            }}
            data-testid="challenge-kid"
          >
            <option value="">Choose a child</option>
            {(kids.data ?? []).map((kid) => (
              <option key={kid.id} value={kid.id}>
                {kid.nickname} (age {kid.age})
              </option>
            ))}
          </select>
        </label>
        {kidNotice && (
          <p className="field-error mt-2" role="alert" data-testid="challenge-kid-notice">
            {kidNotice}
          </p>
        )}
        {kids.isError && (
          <p className="field-error mt-2" role="alert">
            We could not load your children. Reload the page and try again.
          </p>
        )}
        {!kids.isLoading && !kids.isError && (kids.data ?? []).length === 0 && (
          <p className="mt-3 text-[13px] text-slate2">
            No children on your family profile yet.{' '}
            <Link to="/portal/family/new" className="underline">
              Add one first
            </Link>
            .
          </p>
        )}
      </section>

      {kidId !== '' && consent.isLoading && <p className="lead-text mt-6">Loading the forms…</p>}

      {kidId !== '' && consent.isError && (
        <div className="card-base mt-6" role="alert">
          <span className="sticker-coral">Could not load the forms</span>
          <p className="lead-text mt-4">
            {challengeErrorMessage(consent.error, 'We could not load the consent forms.')}
          </p>
          <button
            type="button"
            onClick={() => void consent.refetch()}
            className="btn-pill-secondary mt-6"
          >
            Try again
          </button>
        </div>
      )}

      {kidId !== '' && consent.data && mediaRelease && terms && (
        <>
          <RegistrationSteps
            authorizationComplete={bothSigned}
            current={
              bothSigned && !reviewAuthorization && !reopenMediaRelease
                ? 'payment'
                : 'authorization'
            }
          />

          {(!bothSigned || reviewAuthorization || reopenMediaRelease) && (
            <section data-testid="challenge-authorization-step">
              <div className="mt-6 rounded-3xl border border-brand-sky/30 bg-wash-sky px-5 py-4">
                <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-slate2">
                  Step 1 of 2 · Parent authorization
                </p>
                <h2 className="section-heading mt-2">Authorize the entry first</h2>
                <p className="mt-2 text-[14px] leading-relaxed text-slate2">
                  Complete the media choices and competition terms here. No payment is taken in
                  this step. The payment screen opens only after both forms are signed.
                </p>
              </div>

              {payError && (
                <div
                  className="mt-5 rounded-2xl border border-brand-coral/30 bg-wash-coral px-4 py-3 text-[13px] font-medium text-ink"
                  role="alert"
                  data-testid="challenge-pay-error"
                >
                  {payError}
                </div>
              )}

              {mediaRelease.signed && !reopenMediaRelease ? (
                <SignedDocumentCard
                  doc={mediaRelease}
                  channelLabels={channelLabels}
                  onReopen={
                    edition.registration_open ? () => setReopenMediaRelease(true) : undefined
                  }
                />
              ) : (
                <MediaReleaseStep
                  doc={mediaRelease}
                  onSign={(grants, signer) => signMediaRelease.mutate({ grants, signer })}
                  account={signerAccount}
                  submitting={signMediaRelease.isPending}
                  error={signError}
                  closed={!edition.registration_open}
                  // Re-signing REPLACES the record (append-only store, newest wins),
                  // so a reopened form starts from what is on record. A blank one
                  // would silently revoke every grant the parent did not return to
                  // change. A first signature has nothing on record and stays blank.
                  priorGrants={
                    reopenMediaRelease ? readStoredMediaReleaseGrants(mediaRelease.grants) : null
                  }
                />
              )}

              {/* The two authorization documents remain separate recorded acts,
                  but together they make up the parent's single UX step. */}
              {!mediaRelease.signed ? (
                <p className="mt-6 text-[13px] text-slate2" data-testid="terms-locked">
                  The competition terms open after the media choices are signed.
                </p>
              ) : terms.signed ? (
                <SignedDocumentCard doc={terms} channelLabels={channelLabels} />
              ) : (
                <CompetitionTermsStep
                  doc={terms}
                  onAccept={(signer) => signTerms.mutate(signer)}
                  account={signerAccount}
                  submitting={signTerms.isPending}
                  error={signError}
                  closed={!edition.registration_open}
                />
              )}

              {bothSigned && !reopenMediaRelease && (
                <button
                  type="button"
                  className="btn-pill-primary mt-6 w-full"
                  onClick={() => setReviewAuthorization(false)}
                  data-testid="continue-to-payment"
                >
                  Continue to payment →
                </button>
              )}
            </section>
          )}

          {bothSigned && !reviewAuthorization && !reopenMediaRelease && (
            <section className="card-base mt-6" data-testid="challenge-payment-step">
              <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-slate2">
                Step 2 of 2 · Confirm and pay
              </p>
              <div
                className="mt-4 rounded-2xl border border-brand-mint/40 bg-wash-mint px-4 py-3"
                data-testid="authorization-complete"
              >
                <p className="font-bold text-ink">Parent authorization complete ✓</p>
                <p className="mt-1 text-[13px] text-slate2">
                  Media choices and competition terms are both signed for {kidName ?? 'this child'}.
                </p>
                <button
                  type="button"
                  className="mt-2 text-[13px] font-bold text-brand-blue underline underline-offset-2"
                  onClick={() => setReviewAuthorization(true)}
                  data-testid="review-authorization"
                >
                  Review or update authorization
                </button>
              </div>

              <h2 className="section-heading mt-6">Entry fee</h2>
              <p className="mt-2 text-[14px] text-slate2">
                {formatAud(edition.entry_fee_cents)}, paid once at checkout. Your entry is confirmed
                when the payment is received.
              </p>

              {/* The words that produce the assent record come from the backend
                  (they are what the audit row is evidence of), so there is no
                  checkbox to offer if the server served none. */}
              {consent.data.kid_assent_statement && (
                <label htmlFor="kid-assent" className="mt-5 flex items-start gap-3">
                  <input
                    id="kid-assent"
                    type="checkbox"
                    className="mt-1 h-5 w-5 shrink-0"
                    data-testid="kid-assent"
                    // The SERVER's stamp, not local state: a failed write must
                    // leave the box showing what is actually recorded.
                    checked={consent.data.kid_assent_at !== null}
                    disabled={assent.isPending || !edition.registration_open}
                    onChange={(event) => assent.mutate(event.target.checked)}
                  />
                  <span className="text-[14px] leading-relaxed text-ink">
                    {consent.data.kid_assent_statement}
                  </span>
                </label>
              )}

              {assentError && (
                <p className="field-error mt-2" role="alert" data-testid="challenge-assent-error">
                  {assentError}
                </p>
              )}

              {payError && (
                <div
                  className="mt-5 rounded-2xl border border-brand-coral/30 bg-wash-coral px-4 py-3 text-[13px] font-medium text-ink"
                  role="alert"
                  data-testid="challenge-pay-error"
                >
                  {payError}
                </div>
              )}

              <button
                type="button"
                disabled={!edition.registration_open || pay.isPending}
                onClick={() => pay.mutate()}
                className="btn-pill-primary mt-5 w-full disabled:opacity-50"
                data-testid="challenge-pay"
              >
                {pay.isPending
                  ? 'Opening secure checkout…'
                  : `Pay ${formatAud(edition.entry_fee_cents)} & enter →`}
              </button>
              <p className="mt-4 text-[12px] leading-relaxed text-slate2">
                You will pay securely on our payment page (Airwallex). Come back here afterwards
                to see the entry confirmed.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function RegistrationSteps({
  authorizationComplete,
  current,
}: {
  authorizationComplete: boolean;
  current: 'authorization' | 'payment';
}) {
  return (
    <ol
      className="mt-6 grid grid-cols-2 overflow-hidden rounded-3xl border border-line bg-white"
      aria-label="Registration progress"
      data-testid="registration-steps"
    >
      <li
        className={`px-4 py-4 ${current === 'authorization' ? 'bg-wash-sky' : ''}`}
        aria-current={current === 'authorization' ? 'step' : undefined}
      >
        <span className="text-[12px] font-bold text-slate2">1</span>
        <span className="ml-2 text-[14px] font-bold text-ink">
          Parent authorization {authorizationComplete ? '✓' : ''}
        </span>
      </li>
      <li
        className={`border-l border-line px-4 py-4 ${current === 'payment' ? 'bg-wash-mint' : ''}`}
        aria-current={current === 'payment' ? 'step' : undefined}
        aria-disabled={!authorizationComplete}
      >
        <span className="text-[12px] font-bold text-slate2">2</span>
        <span className="ml-2 text-[14px] font-bold text-ink">Confirm and pay</span>
      </li>
    </ol>
  );
}

function Header() {
  return (
    <div>
      <div className="eyebrow eyebrow-mint">Creative Code Challenge</div>
      <h1 className="section-heading">Register a child</h1>
    </div>
  );
}
