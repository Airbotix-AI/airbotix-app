// Step 2 of registration: the Competition Terms & Declaration
// (creative-code-challenge-prd.md §5 flow 1, D-CCC-7).
//
// A SEPARATE step and a SEPARATE API call from the media release. The two are
// never one checkbox, and this one is not reachable as a by-product of signing
// the other — the parent reads this document and accepts it on its own. That
// separation is why this step collects its OWN Parent/Guardian Details block
// rather than reusing whatever the media release captured: each signature has to
// stand on its own as an identified act.
//
// This document records only THAT a version was accepted; it carries no
// individually-recorded choices. ⚠️ The acceptance declaration itself is the
// ONE operative sentence this signature is filed against, so it comes from the
// backend's versioned registry (`doc.attestation`) and is NOT written here. If
// the version in force serves none, this step refuses to render rather than
// accepting on wording nobody was shown.

import { zodResolver } from '@hookform/resolvers/zod';
import { useController, useForm } from 'react-hook-form';
import { z } from 'zod';

import type { ChallengeConsentDocumentStatus, ChallengeSignerDetails } from './challengeApi';
import { ConsentDocumentBody } from './ConsentDocumentBody';
import { ParentGuardianDetails } from './ParentGuardianDetails';
import {
  servesSignerBlock,
  signerDefaults,
  signerSchema,
  toSignerDetails,
} from './parentGuardianSigner';

// The tick is `literal(true)`: this form cannot be submitted un-accepted, which
// is what the disabled button used to express. Expressing it in the schema means
// the rule is stated once and enforced by the same resolver as everything else.
const schema = z
  .object({
    accepted: z.literal(true, {
      errorMap: () => ({ message: 'Tick the declaration to accept these terms' }),
    }),
  })
  .and(signerSchema);

type FormValues = z.infer<typeof schema>;

export function CompetitionTermsStep({
  doc,
  onAccept,
  account,
  submitting,
  error,
  closed = false,
}: {
  doc: ChallengeConsentDocumentStatus;
  onAccept: (signer: ChallengeSignerDetails) => void;
  /** Prefills the signature block from the signed-in account; stays editable. */
  account: { display_name?: string | null; email?: string | null };
  submitting: boolean;
  error: string | null;
  /**
   * Registration is not open. The backend refuses every sign with
   * `EDITION_NOT_OPEN_FOR_REGISTRATION`, so this step must not offer a live
   * accept control the backend would then refuse.
   */
  closed?: boolean;
}) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { accepted: false as unknown as true, ...signerDefaults(account) },
  });
  const signature = useController({ control, name: 'signer_signature' }).field;
  // The accept control stays inert until the parent says they have read it —
  // the affordance this step has always had. The schema's `literal(true)` is the
  // backstop, not the UX.
  const accepted = watch('accepted');

  // No attestation, or no signature block: this build and the served document
  // disagree about what is being asked, so nothing may be accepted.
  if (!doc.attestation || !servesSignerBlock(doc)) {
    return (
      <section className="card-base mt-6" role="alert" data-testid="competition-terms-unavailable">
        <span className="sticker-coral">Form unavailable</span>
        <h2 className="section-heading mt-3">{doc.title}</h2>
        <p className="lead-text mt-4">
          This form cannot be shown right now, so nothing can be accepted. Reload the page — if it
          keeps happening, contact Airbotix rather than accepting anything.
        </p>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((values) => onAccept(toSignerDetails(values)))}
      className="card-base mt-6 space-y-6"
      data-testid="competition-terms-step"
      noValidate
    >
      <ConsentDocumentBody doc={doc} />

      <div>
        <label htmlFor="terms-accept" className="flex items-start gap-3">
          <input
            id="terms-accept"
            type="checkbox"
            className="mt-1 h-5 w-5 shrink-0"
            disabled={closed}
            {...register('accepted')}
          />
          {/* Served with the version being accepted — never authored here. */}
          <span className="text-[14px] leading-relaxed text-ink" data-testid="terms-attestation">
            {doc.attestation}
          </span>
        </label>
        {errors.accepted && <span className="field-error">{errors.accepted.message}</span>}
      </div>

      <ParentGuardianDetails
        doc={doc}
        disabled={closed}
        fields={{
          full_name: register('signer_full_name'),
          relationship: register('signer_relationship'),
          email: register('signer_email'),
          signature: {
            value: signature.value,
            onChange: signature.onChange,
            onBlur: signature.onBlur,
          },
        }}
        errors={errors}
      />

      {error && (
        <div
          className="rounded-2xl border border-brand-coral/30 bg-wash-coral px-4 py-3 text-[13px] font-medium text-ink"
          role="alert"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={closed || !accepted || submitting}
        className="btn-pill-primary w-full disabled:opacity-50"
        data-testid="sign-competition-terms"
      >
        {submitting ? 'Recording your acceptance…' : 'Accept the competition terms →'}
      </button>
      {closed && (
        <p className="text-[12px] leading-relaxed text-slate2">
          This challenge is not taking entries at the moment, so nothing can be accepted right now.
        </p>
      )}
    </form>
  );
}
