// The two bonus tasks a voter may do AFTER their own vote is recorded
// (creative-code-challenge-prd.md §5 flow 7, D-CCC-4: "referral +1" and
// "group share +1, evidence reviewed").
//
// Three rules this panel exists to keep:
//
//   1. **The voter shares, we do not.** The referral bonus is a link the voter
//      copies and sends themselves. This panel never asks for a friend's email
//      address, never offers to send anything on their behalf, and never touches
//      a contact list — there is no endpoint for any of that and there must not
//      be one.
//   2. **Nothing here is a score.** A bonus is filed, not counted: the server
//      returns the voter's own budget out of 10 and this panel renders none of
//      it, because a number on this page is how a hidden tally leaks.
//   3. **A filed group share counts NOTHING until a person decides it.** The row
//      is created `pending_review`; saying anything stronger would be telling a
//      voter they earned something they may not get.

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';

import {
  createChallengeReferralLink,
  referralShareUrl,
  submitChallengeGroupShare,
  type ChallengeBonusTaskStatus,
  type VoterBonusIdentity,
} from './challengeVoteApi';
import { bonusTaskMessage, voteErrorMessage } from './challengeVoteCopy';

/** The backend caps `evidence_ref` at 500 characters (`SubmitGroupShareSchema`). */
const EVIDENCE_MAX = 500;

const groupShareSchema = z.object({
  evidence_ref: z
    .string()
    .trim()
    .min(1, 'Paste the link to your post so someone can check it.')
    .max(EVIDENCE_MAX, 'That is too long to store — paste just the link.'),
});
type GroupShareValues = z.infer<typeof groupShareSchema>;

interface Props {
  slug: string;
  identity: VoterBonusIdentity;
}

export function VoteBonusPanel({ slug, identity }: Props) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [groupShareStatus, setGroupShareStatus] = useState<ChallengeBonusTaskStatus | null>(null);
  const [groupShareError, setGroupShareError] = useState<string | null>(null);

  const referral = useMutation({
    mutationFn: () => createChallengeReferralLink(slug, identity),
    onSuccess: (link) => {
      setReferralError(null);
      setShareUrl(referralShareUrl(window.location.origin, slug, link.referral_code));
    },
    onError: (error: unknown) =>
      setReferralError(
        voteErrorMessage(error, 'We could not make your invite link just now. Try again.'),
      ),
  });

  const form = useForm<GroupShareValues>({
    resolver: zodResolver(groupShareSchema),
    defaultValues: { evidence_ref: '' },
  });

  const groupShare = useMutation({
    mutationFn: (values: GroupShareValues) =>
      submitChallengeGroupShare(slug, { ...identity, evidence_ref: values.evidence_ref.trim() }),
    onSuccess: (receipt) => {
      setGroupShareError(null);
      setGroupShareStatus(receipt.status);
      form.reset({ evidence_ref: '' });
    },
    onError: (error: unknown) =>
      setGroupShareError(
        voteErrorMessage(error, 'That did not send. Nothing was filed — try again in a moment.'),
      ),
  });

  // `navigator.clipboard` is unavailable on http origins and in some in-app
  // browsers. The link is on screen and selectable either way, so a failed copy
  // is a quiet no-op rather than an error a voter cannot act on.
  const copy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard?.writeText(shareUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="card-base mt-6" data-testid="vote-bonus">
      <h2 className="section-heading">Want to do more?</h2>
      <p className="lead-text mt-2">
        These are optional. They do not change your vote, and they are never needed to take part.
      </p>

      {/* ── 1. the invite link — copied and shared BY THE VOTER ───────────── */}
      <div className="mt-6">
        <h3 className="text-[15px] font-bold text-ink">Invite someone to vote</h3>
        <p className="mt-1 text-[14px] text-slate2">
          Copy your link and send it to whoever you like. We never ask for anyone else’s email
          address and we never send anything for you.
        </p>

        {!shareUrl && (
          <button
            type="button"
            className="btn-pill-secondary mt-3"
            data-testid="vote-referral-create"
            disabled={referral.isPending}
            onClick={() => referral.mutate()}
          >
            {referral.isPending ? 'Getting your link…' : 'Get my invite link →'}
          </button>
        )}

        {shareUrl && (
          <div className="mt-3">
            <label className="label-k12" htmlFor="vote-referral-url">
              Your invite link
            </label>
            <input
              id="vote-referral-url"
              className="input-k12"
              data-testid="vote-referral-url"
              readOnly
              value={shareUrl}
              onFocus={(event) => event.currentTarget.select()}
            />
            <button type="button" className="btn-pill-secondary mt-3" onClick={() => void copy()}>
              {copied ? 'Copied' : 'Copy link'}
            </button>
            {/* The capability that unlocks these tasks lives in this page only —
                PRD §9 leaves "should it be recoverable" open, so nothing is
                stored anywhere and the consequence is stated instead of hidden. */}
            <p className="mt-3 text-[13px] text-slate2" data-testid="vote-bonus-scope">
              Keep this page open while you share. Your vote is safely recorded, but these bonus
              tasks live on this screen only — reloading the page starts them over.
            </p>
          </div>
        )}

        {referralError && (
          <p className="field-error" role="alert" data-testid="vote-referral-error">
            {referralError}
          </p>
        )}
      </div>

      {/* ── 2. the group share — evidence, filed for a human ──────────────── */}
      <form
        className="mt-8"
        data-testid="vote-group-share-form"
        onSubmit={form.handleSubmit((values) => groupShare.mutate(values))}
      >
        <h3 className="text-[15px] font-bold text-ink">Shared it with a group?</h3>
        <p className="mt-1 text-[14px] text-slate2">
          Paste the link to your post and a person on our team will look at it.
        </p>
        <label className="label-k12 mt-3" htmlFor="vote-group-share">
          Link to your post
        </label>
        <input
          id="vote-group-share"
          className="input-k12"
          data-testid="vote-group-share"
          placeholder="https://…"
          {...form.register('evidence_ref')}
        />
        {form.formState.errors.evidence_ref && (
          <span className="field-error">{form.formState.errors.evidence_ref.message}</span>
        )}
        <button
          type="submit"
          className="btn-pill-secondary mt-3"
          disabled={groupShare.isPending}
        >
          {groupShare.isPending ? 'Sending…' : 'Send it in →'}
        </button>

        {groupShareStatus && (
          <p className="mt-3 text-[14px] font-semibold text-ink" data-testid="vote-group-share-status">
            {bonusTaskMessage(groupShareStatus)}
          </p>
        )}
        {groupShareError && (
          <p className="field-error" role="alert" data-testid="vote-group-share-error">
            {groupShareError}
          </p>
        )}
      </form>
    </section>
  );
}
