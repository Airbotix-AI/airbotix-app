// The rules behind the Parent/Guardian Details block — its schema, its defaults
// and the mapping to the API's signer payload.
//
// Split out of `ParentGuardianDetails.tsx` because that file may export only its
// component (`react-refresh/only-export-components`). The block itself turns
// each consent submission into a
// SIGNATURE: who is signing, how they relate to the child, where they can be
// reached, and the drawn or typed mark that is their electronic signature.
//
// Shared by BOTH consent steps rather than written twice. D-CCC-7 keeps the two
// documents separate signing acts, so each carries its own block — but the block
// is the same block, and two copies would be two chances for the field set, the
// validation and the declaration to drift apart.
//
// ⚠️ THE DATE IS NOT AN INPUT. `ChallengeConsentRecord.signed_at` is stamped
// server-side when the signature lands. Showing today's date read-only tells the
// parent what will be recorded; offering a date field would invite them to state
// one the server then contradicts.
//
// ⚠️ The declaration beside the signature is `doc.signer_declaration`, served
// with the document version — never authored here, for the same reason
// `doc.attestation` is not: it is the operative sentence the e-signature is
// filed against.
import { z } from 'zod';

import type { ChallengeSignerDetails } from './challengeApi';

/**
 * The signature block's own validation, merged into each step's form schema.
 *
 * The signer chooses the text that represents their electronic signature. It
 * must be present, but it does not have to repeat the separately collected full
 * name.
 */
export const signerSchema = z
  .object({
    signer_full_name: z
      .string()
      .trim()
      .min(1, 'Add your full name')
      .max(120, 'Keep this to 120 characters or fewer'),
    signer_relationship: z.string().min(1, 'Choose your relationship to the student'),
    signer_email: z
      .string()
      .trim()
      .min(1, 'Add your email')
      .email('Enter an email we can reach you at')
      .max(254, 'Keep this to 254 characters or fewer'),
    signer_signature: z
      .string()
      .trim()
      .min(1, 'Draw or type your signature')
      .max(120, 'Keep this to 120 characters or fewer'),
  });

export type SignerFormValues = z.infer<typeof signerSchema>;

/**
 * Form defaults for the signing adult.
 *
 * Prefilled from the signed-in account as a CONVENIENCE, and every field stays
 * editable: the account holder is not always the parent whose name belongs on
 * the form, and the name on a legal signature is the signer's to state. What is
 * submitted is what they confirmed, never what we assumed.
 */
export function signerDefaults(account: {
  display_name?: string | null;
  email?: string | null;
}): SignerFormValues {
  const name = account.display_name?.trim() ?? '';
  return {
    signer_full_name: name,
    signer_relationship: '',
    signer_email: account.email?.trim() ?? '',
    // Never pre-typed. A signature the parent did not type is not a signature,
    // and prefilling it would make the tick-and-go path sign for them.
    signer_signature: '',
  };
}

/** Form values → the API's signer block. */
export function toSignerDetails(values: SignerFormValues): ChallengeSignerDetails {
  return {
    full_name: values.signer_full_name.trim(),
    relationship: values.signer_relationship,
    email: values.signer_email.trim(),
    signature: values.signer_signature.trim(),
  };
}

/** Today, as the parent will see it recorded. Display only — never submitted. */
export function signingDayLabel(now: Date = new Date()): string {
  return now.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Does the document version in force actually serve the signature block?
 *
 * Same discipline as `requiredChoiceLabels` in `MediaReleaseStep`: if this build
 * and the served document disagree about what is being asked, the form REFUSES
 * to render rather than substituting wording or options of its own. A signature
 * filed against a declaration nobody served — or a relationship picked from a
 * list this page invented — is exactly what the version-pinning scheme exists to
 * prevent.
 *
 * It is also the guard that makes a frontend deployed AHEAD of its backend fail
 * honestly: without it, `signer_relationship_options.map` on an older API
 * response throws and the parent gets a blank page instead of a reason.
 */
export function servesSignerBlock(doc: {
  signer_declaration?: string | null;
  signer_relationship_options?: { key: string; label: string }[] | null;
}): boolean {
  return Boolean(doc.signer_declaration?.trim()) && (doc.signer_relationship_options?.length ?? 0) > 0;
}
