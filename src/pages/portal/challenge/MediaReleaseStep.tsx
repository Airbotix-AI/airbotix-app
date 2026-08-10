// Step 1 of registration: the Parent/Guardian Consent & Media Release
// (creative-code-challenge-prd.md §5 flow 1, D-CCC-7; upstream SOT §8).
//
// The SIX choices are captured SEPARATELY and posted as six fields. They are
// never collapsed into one "I agree" — that is exactly what D-CCC-7 rules out.
//
// ⚠️ NO WORDING IS AUTHORED HERE. Every label, the document body and the
// assurance about declined grants come from the backend's versioned registry and
// are served WITH the version being signed. If a choice this form must capture
// is absent from `doc.choices`, the form REFUSES to render rather than
// substituting copy of its own: a grant recorded against words the parent was
// never served is precisely what the version-pinning scheme exists to prevent.
//
// Pre-ticking rules:
//   • A FIRST signature starts entirely blank — a recorded permission must
//     always be something the parent did, never something they failed to undo.
//   • A RE-SIGN starts from the choices the server currently has on record.
//     Records are append-only and the newest one wins, so a blank re-open would
//     silently revoke the five grants the parent did not come back to change.
//     Echoing a parent's own recorded decisions back is not a nudge; zeroing
//     them without saying so is a far worse one.

import { zodResolver } from '@hookform/resolvers/zod';
import { useController, useForm } from 'react-hook-form';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { z } from 'zod';

import type {
  ChallengeConsentDocumentStatus,
  ChallengeSignerDetails,
  MediaReleaseGrants,
  StoredMediaReleaseGrants,
} from './challengeApi';
import { ConsentDocumentBody } from './ConsentDocumentBody';
import { ParentGuardianDetails } from './ParentGuardianDetails';
import {
  servesSignerBlock,
  signerDefaults,
  signerSchema,
  toSignerDetails,
} from './parentGuardianSigner';

/**
 * How long a reuse permission runs. Must equal the backend's
 * `CONSENT_VALIDITY_MONTHS` — the consent itself lapses after 12 months, so a
 * `channels_until` beyond that would promise a window the document does not
 * have.
 */
const CONSENT_VALIDITY_MONTHS = 12;

/**
 * The end of the reuse window: 12 months from signing, end of the local day.
 *
 * This used to be a date the PARENT typed, which was both extra work and a
 * contradiction — the Terms say the whole consent is "valid for 12 months from
 * signing" while the form invited any date at all. The window is now derived,
 * never entered, so the two can't disagree. A family that wants it to stop
 * sooner uses the withdrawal path the document already gives them (email
 * privacy@), which is immediate rather than a date months away.
 *
 * End-of-local-day, not UTC midnight: the backend requires the instant to be
 * strictly in the future, and a bare date at UTC midnight lands in the PAST for
 * an Australian afternoon (AEST is UTC+10).
 */
function reuseWindowEndIso(): string {
  const end = new Date();
  end.setMonth(end.getMonth() + CONSENT_VALIDITY_MONTHS);
  end.setHours(23, 59, 59, 999);
  return end.toISOString();
}

/** The same instant as a plain date, for the sentence shown to the parent. */
function reuseWindowEndLabel(): string {
  return new Date(reuseWindowEndIso()).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// The choices, plus the Parent/Guardian signature block every signature carries.
// `.and()` keeps the shared signer validation with the block it belongs to
// instead of restating it here.
const schema = z
  .object({
    review: z.boolean(),
    publish_title: z.boolean(),
    publish_voice: z.boolean(),
    publish_face: z.boolean(),
    display_name: z
      .string()
      .trim()
      .min(1, 'Add the name to publish with your child’s work')
      .max(60, 'Keep this to 60 characters or fewer'),
    channels: z.array(z.string()),
  })
  .and(signerSchema);

type FormValues = z.infer<typeof schema>;

/**
 * The choice keys this form captures. They must all be declared by the document
 * version in force — see `requiredChoiceLabels`.
 */
const REQUIRED_CHOICE_KEYS = [
  'review',
  'publish_title',
  'publish_voice',
  'publish_face',
  'display_name',
  'channels',
] as const;

/**
 * The label the document version in force declares for each choice, or `null` if
 * the document is missing any of them.
 *
 * Returning `null` — rather than falling back to wording of our own — is the
 * whole point: an absent key means this build and the document version disagree
 * about what is being asked, and a signature filed in that state would record a
 * grant against text the parent was never shown.
 */
function requiredChoiceLabels(doc: ChallengeConsentDocumentStatus): Record<string, string> | null {
  const labels: Record<string, string> = {};
  for (const key of REQUIRED_CHOICE_KEYS) {
    const label = doc.choices.find((choice) => choice.key === key)?.label;
    if (!label) return null;
    labels[key] = label;
  }
  return labels;
}

/**
 * Recorded choices → form defaults. A missing key stays off / empty.
 *
 * The signature block is NOT restored from a prior signature, even on a re-sign:
 * a re-sign is a new signing act, and pre-typing the signature would file one
 * the parent did not make this time.
 */
function toDefaults(
  prior: StoredMediaReleaseGrants | null,
  account: { display_name?: string | null; email?: string | null },
): FormValues {
  return {
    review: prior?.review === true,
    publish_title: prior?.publish_title === true,
    publish_voice: prior?.publish_voice === true,
    publish_face: prior?.publish_face === true,
    display_name: prior?.display_name ?? '',
    channels: prior?.channels ?? [],
    ...signerDefaults(account),
  };
}

export function MediaReleaseStep({
  doc,
  onSign,
  account,
  submitting,
  error,
  closed = false,
  priorGrants = null,
}: {
  doc: ChallengeConsentDocumentStatus;
  onSign: (grants: MediaReleaseGrants, signer: ChallengeSignerDetails) => void;
  /** Prefills the signature block from the signed-in account; stays editable. */
  account: { display_name?: string | null; email?: string | null };
  submitting: boolean;
  error: string | null;
  /**
   * Registration is not open. The backend refuses every sign with
   * `EDITION_NOT_OPEN_FOR_REGISTRATION`, so the form must not offer a live
   * submit — offering a parent a form the backend then refuses is the failure
   * this flag exists to prevent.
   */
  closed?: boolean;
  /** The choices currently on record, when this is a re-sign. See the header. */
  priorGrants?: StoredMediaReleaseGrants | null;
}) {
  const labels = requiredChoiceLabels(doc);
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(priorGrants, account),
  });
  const signature = useController({ control, name: 'signer_signature' }).field;
  const channels = watch('channels');

  // The document in force does not declare everything this form records — a
  // choice label, or the signature block itself — so there is nothing safe to
  // render. Better an explicit dead end than a signature filed against wording
  // nobody served.
  if (!labels || !servesSignerBlock(doc)) {
    return (
      <section className="card-base mt-6" role="alert" data-testid="media-release-unavailable">
        <span className="sticker-coral">Form unavailable</span>
        <h2 className="section-heading mt-3">{doc.title}</h2>
        <p className="lead-text mt-4">
          This form cannot be shown right now, so nothing can be signed. Reload the page — if it
          keeps happening, contact Airbotix rather than signing anything.
        </p>
      </section>
    );
  }

  const submit = (values: FormValues) => {
    const grants: MediaReleaseGrants = {
      review: values.review,
      publish_title: values.publish_title,
      publish_voice: values.publish_voice,
      publish_face: values.publish_face,
      display_name: values.display_name.trim(),
      channels: values.channels,
    };
    // Omitted, not sent empty: the backend rejects a `channels_until` with no
    // channel granted, because a date is meaningless without one. When there IS
    // a channel, the window is always the 12-month consent life — derived here
    // rather than typed by the parent.
    if (values.channels.length > 0) {
      grants.channels_until = reuseWindowEndIso();
    }
    onSign(grants, toSignerDetails(values));
  };

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="card-base mt-6 space-y-6"
      data-testid="media-release-step"
      noValidate
    >
      <ConsentDocumentBody doc={doc} />

      {priorGrants && (
        <p
          className="rounded-2xl border border-brand-sky/30 bg-wash-sky px-4 py-3 text-[13px] leading-relaxed text-ink"
          data-testid="media-release-amending"
        >
          These are the choices currently on record. Signing again replaces all six of them with
          whatever is set below, so leave the ones you are happy with as they are.
        </p>
      )}

      <div className="space-y-4">
        <p className="label-k12">Your choices — each one is recorded separately</p>

        <GrantCheckbox
          id="grant-review"
          label={labels.review}
          disabled={closed}
          field={register('review')}
        />
        <GrantCheckbox
          id="grant-publish-title"
          label={labels.publish_title}
          disabled={closed}
          field={register('publish_title')}
        />
        <GrantCheckbox
          id="grant-publish-voice"
          label={labels.publish_voice}
          disabled={closed}
          field={register('publish_voice')}
        />
        <GrantCheckbox
          id="grant-publish-face"
          label={labels.publish_face}
          disabled={closed}
          field={register('publish_face')}
        />
        {/* Served with the version being signed — never written here. */}
        {doc.assurances.map((line) => (
          <p key={line} className="text-[13px] leading-relaxed text-slate2">
            {line}
          </p>
        ))}
      </div>

      <label className="block">
        <span className="label-k12">{labels.display_name}</span>
        <input
          className="input-k12 mt-2"
          maxLength={60}
          autoComplete="off"
          disabled={closed}
          data-testid="grant-display-name"
          {...register('display_name')}
        />
        {errors.display_name && <span className="field-error">{errors.display_name.message}</span>}
      </label>

      <fieldset className="block">
        <legend className="label-k12">{labels.channels}</legend>
        <div className="mt-2 space-y-3">
          {doc.channel_options.map((channel) => (
            <GrantCheckbox
              key={channel.key}
              id={`grant-channel-${channel.key}`}
              label={channel.label}
              value={channel.key}
              disabled={closed}
              field={register('channels')}
            />
          ))}
        </div>
        {channels.length > 0 && (
          <p className="mt-4 text-[13px] leading-relaxed text-slate2" data-testid="grant-channels-until">
            Permission ends automatically on <strong>{reuseWindowEndLabel()}</strong>, 12 months
            from today, when this consent expires. You can end it sooner at any time by emailing us
            — you do not have to wait for that date.
          </p>
        )}
      </fieldset>

      {/* Last, on purpose: a parent signs AFTER making the choices above, not
          before. Its own signature block, not the terms' — D-CCC-7 keeps the two
          documents separate signing acts, so neither borrows the other's. */}
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
        disabled={closed || submitting}
        className="btn-pill-primary w-full disabled:opacity-50"
        data-testid="sign-media-release"
      >
        {submitting ? 'Recording your choices…' : 'Sign the media release →'}
      </button>
      <p className="text-[12px] leading-relaxed text-slate2">
        {closed
          ? 'This challenge is not taking entries at the moment, so nothing can be signed right now.'
          : 'Signing records your choices as made — including any you decline. You will sign the ' +
            'competition terms as a separate step.'}
      </p>
    </form>
  );
}

/**
 * A checkbox that reads as one decision. Split out so every grant renders
 * identically: a grant that looked different from its neighbours would be a
 * nudge, and these six must not be nudged either way.
 */
const GrantCheckbox = ({
  id,
  label,
  value,
  disabled,
  field,
}: {
  id: string;
  label: string;
  value?: string;
  disabled?: boolean;
  // The register() result is spread onto the INPUT, not onto this component: a
  // ref handed to a function component is swallowed by React, and react-hook-form
  // would then never see the checkbox.
  field: UseFormRegisterReturn;
}) => (
  <label htmlFor={id} className="flex items-start gap-3">
    <input
      id={id}
      type="checkbox"
      value={value}
      className="mt-1 h-5 w-5 shrink-0"
      data-testid={id}
      {...field}
      // After the spread: `register()` may carry its own `disabled`, and the
      // closed-registration gate must win over it.
      disabled={disabled}
    />
    <span className="text-[14px] leading-relaxed text-ink">{label}</span>
  </label>
);
