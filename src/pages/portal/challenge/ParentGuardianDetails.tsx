// The Parent/Guardian Details fieldset — the rendered half of the signature
// block. Its schema, defaults and payload mapping live in
// `parentGuardianSigner.ts` (this file may export only the component).
//
// ⚠️ THE DATE IS NOT AN INPUT. `ChallengeConsentRecord.signed_at` is stamped
// server-side when the signature lands. Showing today's date read-only tells the
// parent what will be recorded; offering a date field would invite them to state
// one the server then contradicts.
//
// ⚠️ The declaration beside the drawn or typed signature and the relationship options are
// `doc.signer_declaration` / `doc.signer_relationship_options`, served with the
// document version — never authored here, for the same reason `doc.attestation`
// is not.
import type { UseFormRegisterReturn } from 'react-hook-form';

import type { ChallengeConsentDocumentStatus } from './challengeApi';
import { signingDayLabel, type SignerFormValues } from './parentGuardianSigner';
import { SignatureInput } from './SignatureInput';

export function ParentGuardianDetails({
  doc,
  fields,
  errors,
  disabled = false,
}: {
  doc: ChallengeConsentDocumentStatus;
  fields: {
    full_name: UseFormRegisterReturn;
    relationship: UseFormRegisterReturn;
    email: UseFormRegisterReturn;
    signature: {
      value: string;
      onChange: (value: string) => void;
      onBlur: () => void;
    };
  };
  errors: Partial<Record<keyof SignerFormValues, { message?: string }>>;
  disabled?: boolean;
}) {
  return (
    <fieldset className="block" data-testid="parent-guardian-details">
      <legend className="label-k12">Parent/Guardian Details</legend>

      <div className="mt-3 space-y-4">
        <label className="block">
          <span className="label-k12">Full name</span>
          <input
            type="text"
            className="input-k12 mt-2"
            maxLength={120}
            autoComplete="name"
            disabled={disabled}
            data-testid="signer-full-name"
            {...fields.full_name}
          />
          {errors.signer_full_name && (
            <span className="field-error">{errors.signer_full_name.message}</span>
          )}
        </label>

        <label className="block">
          <span className="label-k12">Relationship to student</span>
          <select
            className="input-k12 mt-2"
            disabled={disabled}
            data-testid="signer-relationship"
            {...fields.relationship}
          >
            <option value="">Select…</option>
            {/* Served with the document version — this page offers no option of
                its own, so a relationship can never be filed under a label the
                signed version did not carry. */}
            {doc.signer_relationship_options.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.signer_relationship && (
            <span className="field-error">{errors.signer_relationship.message}</span>
          )}
        </label>

        <label className="block">
          <span className="label-k12">Email</span>
          <input
            type="email"
            className="input-k12 mt-2"
            maxLength={254}
            autoComplete="email"
            disabled={disabled}
            data-testid="signer-email"
            {...fields.email}
          />
          {errors.signer_email && <span className="field-error">{errors.signer_email.message}</span>}
        </label>

        {/* Not a wrapping <label>: the declaration is a DESCRIPTION, not part of
            the field's name. Inside the label it became the input's accessible
            name, so a screen reader announced a paragraph where "Signature"
            belonged — and it collided with the terms' own "I am the parent or
            legal guardian…" attestation elsewhere on the page. */}
        <div className="block">
          <span id="signer-signature-label" className="label-k12">
            Signature / electronic confirmation
          </span>
          <SignatureInput
            id="signer-signature"
            value={fields.signature.value}
            onChange={fields.signature.onChange}
            onBlur={fields.signature.onBlur}
            labelledBy="signer-signature-label"
            describedBy="signer-declaration"
            disabled={disabled}
          />
          {errors.signer_signature && (
            <span className="field-error" role="alert">
              {errors.signer_signature.message}
            </span>
          )}
          <p
            id="signer-declaration"
            className="mt-2 text-[13px] leading-relaxed text-slate2"
            data-testid="signer-declaration"
          >
            {doc.signer_declaration}
          </p>
        </div>

        <div className="block">
          <span className="label-k12">Date</span>
          {/* Read-only by design — see the file header. */}
          <p className="mt-1 text-[14px] text-ink" data-testid="signer-date">
            {signingDayLabel()}
          </p>
          <span className="mt-1 block text-[13px] leading-relaxed text-slate2">
            Recorded by Airbotix when your signature is received. You do not type this.
          </span>
        </div>
      </div>
    </fieldset>
  );
}
