// The document a parent is being asked to sign, rendered from the backend's
// versioned source (creative-code-challenge-prd.md §7).
//
// ⚠️ This component NEVER authors document wording. `body`, `title` and the
// version are whatever the backend's document registry serves.
//
// The documents in force are v1.0 `legally_approved`, so the banner below
// normally does not render. It is kept, not deleted: if a future re-draft is
// ever served, a parent must not be able to mistake it for approved text, and
// that guard belongs on the surface that shows the words.

import type { ChallengeConsentDocumentStatus } from './challengeApi';

export function ConsentDocumentBody({ doc }: { doc: ChallengeConsentDocumentStatus }) {
  const isDraft = doc.legal_review_status === 'draft_pending_legal_review';
  return (
    <div>
      <h2 className="section-heading">{doc.title}</h2>
      <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-slate2">
        Version {doc.current_version}
      </p>

      {isDraft && (
        <div
          className="mt-4 rounded-2xl border border-brand-coral/40 bg-wash-coral px-4 py-3"
          data-testid="consent-draft-warning"
          role="status"
        >
          <p className="text-[13px] font-bold text-ink">
            Draft document — not legally approved
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink">
            This wording has not been reviewed by Australian legal or privacy counsel. It is in
            place so the consent process can be tested, and it grants nothing. Your choices below
            are recorded exactly as you make them.
          </p>
        </div>
      )}

      <p
        className="mt-4 whitespace-pre-line rounded-2xl bg-white/60 px-4 py-3 text-[13px] leading-relaxed text-ink"
        data-testid="consent-document-body"
      >
        {doc.body}
      </p>
    </div>
  );
}
