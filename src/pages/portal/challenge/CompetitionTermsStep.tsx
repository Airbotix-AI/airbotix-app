// Step 2 of registration: the Competition Terms & Declaration
// (creative-code-challenge-prd.md §5 flow 1, D-CCC-7).
//
// A SEPARATE step and a SEPARATE API call from the media release. The two are
// never one checkbox, and this one is not reachable as a by-product of signing
// the other — the parent reads this document and accepts it on its own.
//
// This document records only THAT a version was accepted; it carries no
// individually-recorded choices. ⚠️ The acceptance declaration itself is the
// ONE operative sentence this signature is filed against, so it comes from the
// backend's versioned registry (`doc.attestation`) and is NOT written here. If
// the version in force serves none, this step refuses to render rather than
// accepting on wording nobody was shown.

import { useState } from 'react';

import type { ChallengeConsentDocumentStatus } from './challengeApi';
import { ConsentDocumentBody } from './ConsentDocumentBody';

export function CompetitionTermsStep({
  doc,
  onAccept,
  submitting,
  error,
  closed = false,
}: {
  doc: ChallengeConsentDocumentStatus;
  onAccept: () => void;
  submitting: boolean;
  error: string | null;
  /**
   * Registration is not open. The backend refuses every sign with
   * `EDITION_NOT_OPEN_FOR_REGISTRATION`, so this step must not offer a live
   * accept control the backend would then refuse.
   */
  closed?: boolean;
}) {
  const [accepted, setAccepted] = useState(false);

  if (!doc.attestation) {
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
    <section className="card-base mt-6 space-y-6" data-testid="competition-terms-step">
      <ConsentDocumentBody doc={doc} />

      <label htmlFor="terms-accept" className="flex items-start gap-3">
        <input
          id="terms-accept"
          type="checkbox"
          className="mt-1 h-5 w-5 shrink-0"
          checked={accepted}
          disabled={closed}
          onChange={(event) => setAccepted(event.target.checked)}
        />
        {/* Served with the version being accepted — never authored here. */}
        <span className="text-[14px] leading-relaxed text-ink" data-testid="terms-attestation">
          {doc.attestation}
        </span>
      </label>

      {error && (
        <div
          className="rounded-2xl border border-brand-coral/30 bg-wash-coral px-4 py-3 text-[13px] font-medium text-ink"
          role="alert"
        >
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={closed || !accepted || submitting}
        onClick={onAccept}
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
    </section>
  );
}
