// A document this family has already signed, echoed back so a parent can see
// what was recorded (creative-code-challenge-prd.md §5 flow 1).
//
// The grants shown are the ones the SERVER stored — and so are the WORDS they
// are described in: each label comes from `doc.choices`, which the backend
// serves with the version. A local copy of the labels would, after a document
// revision, describe a parent's own record of what they agreed to in wording
// that no longer matches the document they signed.

import { readStoredMediaReleaseGrants, type ChallengeConsentDocumentStatus } from './challengeApi';

/** The boolean grants, in the order the document asks them. */
const BOOLEAN_GRANT_KEYS = ['review', 'publish_title', 'publish_voice', 'publish_face'] as const;

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

export function SignedDocumentCard({
  doc,
  onReopen,
  channelLabels,
}: {
  doc: ChallengeConsentDocumentStatus;
  /** Only offered where re-signing is meaningful (the media release). */
  onReopen?: () => void;
  channelLabels: Record<string, string>;
}) {
  const grants =
    doc.document_type === 'parent_media_release' ? readStoredMediaReleaseGrants(doc.grants) : null;

  // The document's own label for a choice. Falls back to the raw KEY, never to
  // wording of ours: showing `publish_face` is honest about a gap, whereas a
  // sentence we wrote would look like the document's and might not be.
  const labelFor = (key: string) => doc.choices.find((choice) => choice.key === key)?.label ?? key;

  return (
    <section className="card-base mt-6" data-testid={`signed-${doc.document_type}`}>
      <span className="sticker-mint">Signed</span>
      <h2 className="section-heading mt-3">{doc.title}</h2>
      <p className="mt-1 text-[13px] text-slate2">
        Version {doc.signed_version ?? doc.current_version}
        {doc.signed_at ? ` · signed ${dayLabel(doc.signed_at)}` : ''}
        {doc.expires_at ? ` · valid until ${dayLabel(doc.expires_at)}` : ''}
      </p>

      {grants && (
        <ul className="mt-4 space-y-1 text-[14px] text-ink">
          {BOOLEAN_GRANT_KEYS.map((key) => (
            <li key={key}>
              {grants[key] ? '✓' : '✗'} {labelFor(key)}
            </li>
          ))}
          <li>
            {labelFor('display_name')}: {grants.display_name || '—'}
          </li>
          <li>
            {labelFor('channels')}:{' '}
            {grants.channels && grants.channels.length > 0
              ? grants.channels.map((channel) => channelLabels[channel] ?? channel).join(', ')
              : 'none'}
            {grants.channels_until ? ` · until ${dayLabel(grants.channels_until)}` : ''}
          </li>
        </ul>
      )}

      {onReopen && (
        <>
          <button type="button" onClick={onReopen} className="btn-pill-secondary mt-5">
            Update these choices
          </button>
          {/* Records are append-only and the newest one wins, so a re-sign is a
              replacement, not a patch. Saying so is the difference between an
              amendment and an accidental revocation. */}
          <p className="mt-2 text-[12px] leading-relaxed text-slate2" data-testid="reopen-note">
            Signing again replaces all of the choices above with whatever you submit. The form
            opens with what is recorded here.
          </p>
        </>
      )}
    </section>
  );
}
