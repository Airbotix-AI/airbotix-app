// Shared fixtures + wiring for the Creative Code Challenge registration suites
// (`ChallengeRegisterPage.*.test.tsx`; creative-code-challenge-prd.md §5 flow 1).
//
// The registration page is one screen but four distinct flows — the media
// release, the competition terms, assent + checkout, and the Airwallex return
// trip — and every one of them needs the same consent fixtures. Those fixtures
// live here so the four suites stay well under the 1000-line hard cap
// (`rules/file-organization.md`) without four copies of `mediaDoc()` drifting
// apart from each other.
//
// ⚠️ This file is NOT a test file (no `.test.`/`.spec.` in its name), so vitest
// never collects it. It only ever runs as an import of a suite that has already
// registered its `vi.mock` factories — see `challengeRegisterTestMocks.ts`.

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, vi } from 'vitest';

import { ChallengeRegisterPage } from './ChallengeRegisterPage';
import { api, me } from './challengeRegisterTestMocks';

export const SLUG = 'creative-code-challenge-2026-junior';
export const REG_PATH = `/challenges/by-slug/${SLUG}/registration`;
export const CONSENT_PATH = '/challenges/ed_1/consent?kid_id=kid-1';

export const EDITION = {
  id: 'ed_1',
  slug: SLUG,
  name: 'Creative Code Challenge — Junior',
  age_group: 'junior_8_12',
  entry_fee_cents: 900,
  status: 'registration_open',
  registration_open: true,
  submission_open: '2026-08-24T00:00:00.000Z',
  submission_close: '2026-08-31T00:00:00.000Z',
  results_at: '2026-09-14T00:00:00.000Z',
};

/** The same edition with registration shut — every sign is a backend refusal. */
export const CLOSED_EDITION = { ...EDITION, status: 'judging', registration_open: false };

export const KIDS = [{ id: 'kid-1', nickname: 'Mia', age: 9 }];

/**
 * A stand-in for the backend's document body. Deliberately NOT the real v1.0
 * wording: these fixtures assert that the page renders whatever the registry
 * serves, and a copy of the operative text here would be a second, unversioned
 * home for words a parent's signature is filed against.
 */
export const DOCUMENT_BODY =
  'Served document body. The page renders this verbatim from the backend registry.';

/**
 * The overrides that turn any fixture document back into an unapproved draft.
 * The shipped documents are v1.0 approved, but the draft state and its banner
 * still exist so a future re-draft cannot reach a parent silently — so the
 * regression test drives it explicitly rather than by fixture default.
 */
export function draftOverrides() {
  return {
    current_version: '0.9-draft',
    legal_review_status: 'draft_pending_legal_review',
    body: 'PLACEHOLDER — NOT LEGALLY APPROVED TEXT.',
  };
}

/**
 * The signature block both documents serve (backend `SIGNER_DECLARATION` and
 * `CHALLENGE_SIGNER_RELATIONSHIPS`). Carried by the fixture because the block is
 * document-scoped: the form renders the served declaration and the served
 * options, never wording or a relationship list of its own.
 */
export const SIGNER_DECLARATION =
  'I am the parent or legal guardian named above, and the details I have given are true. Typing ' +
  'my full name is my electronic signature and I intend it to have the same effect as signing on ' +
  'paper. Airbotix records the date and time it receives this signature — you do not type it.';

export const SIGNER_RELATIONSHIP_OPTIONS = [
  { key: 'mother', label: 'Mother' },
  { key: 'father', label: 'Father' },
  { key: 'legal_guardian', label: 'Legal guardian' },
  { key: 'grandparent', label: 'Grandparent' },
  { key: 'other', label: 'Other parent or guardian' },
];

/**
 * The Parent/Guardian Details a test signs with, and the helper that fills them.
 *
 * Every signature now carries this block, so a test that only ticks grants can
 * no longer submit — which is the behaviour, not an inconvenience. The helper
 * exists so each test states the ONE thing it is about (a grant, a channel, a
 * closed edition) instead of restating four identical fields.
 */
export const SIGNER = {
  full_name: 'Mary Chen',
  relationship: 'mother',
  email: 'mary@example.com',
  signature: 'Mary Chen',
};

export function fillSignerBlock(overrides: Partial<typeof SIGNER> = {}) {
  const values = { ...SIGNER, ...overrides };
  fireEvent.change(screen.getByTestId('signer-full-name'), {
    target: { value: values.full_name },
  });
  fireEvent.change(screen.getByTestId('signer-relationship'), {
    target: { value: values.relationship },
  });
  fireEvent.change(screen.getByTestId('signer-email'), { target: { value: values.email } });
  fireEvent.change(screen.getByTestId('signer-signature'), {
    target: { value: values.signature },
  });
}

/** Served with every approved version (backend `VERSION_NOTICE`). */
export const VERSION_NOTICE =
  'This is version 1.0 of this document and it is the wording your signature is filed against. ' +
  'If we change it, the new wording ships as a new version and has to be signed again — a ' +
  'later version never applies to a signature you already gave.';

export function mediaDoc(overrides: Record<string, unknown> = {}) {
  return {
    document_type: 'parent_media_release',
    current_version: '1.0',
    title: 'Parent/Guardian Consent & Media Release',
    legal_review_status: 'legally_approved',
    body: DOCUMENT_BODY,
    choices: [
      { key: 'review', label: 'Airbotix staff and judges may review my child’s work' },
      { key: 'publish_title', label: 'Publish the work’s title, screenshots and playable demo' },
      { key: 'publish_voice', label: 'Publish my child’s voice (pitch video audio)' },
      { key: 'publish_face', label: 'Publish my child’s face (pitch video vision)' },
      { key: 'display_name', label: 'The public display name to use for my child' },
      {
        key: 'channels',
        label: 'Where Airbotix may reuse it (permission ends when this consent expires)',
      },
    ],
    // Two GROUPS, each naming its members — the shipped shape. The member list
    // is what keeps this from being the blanket "all social media" permission
    // the SOT forbids, so the fixture carries it too. Seven accounts since
    // media-release v1.1 added TikTok (owner, 2026-08-10).
    channel_options: [
      { key: 'airbotix_website', label: 'Airbotix website (airbotix.ai, the Creator Showcase)' },
      {
        key: 'airbotix_social',
        label:
          'Airbotix official social accounts (WeChat, Xiaohongshu (RED), YouTube, Instagram, ' +
          'Facebook, LinkedIn, TikTok) — these seven accounts only',
      },
    ],
    // The media release is signed by making its choices — no separate "I accept".
    attestation: null,
    signer_declaration: SIGNER_DECLARATION,
    signer_relationship_options: SIGNER_RELATIONSHIP_OPTIONS,
    signer: null,
    assurances: [
      'Voice and face are separate decisions, and either can be declined. An entry that shows ' +
        'neither is judged in exactly the same way as one that shows both.',
      VERSION_NOTICE,
    ],
    signed: false,
    signed_at: null,
    expires_at: null,
    signed_version: null,
    grants: null,
    missing_reason: 'never_signed',
    ...overrides,
  };
}

export function termsDoc(overrides: Record<string, unknown> = {}) {
  return {
    document_type: 'competition_terms',
    current_version: '1.0',
    title: 'Competition Terms & Declaration',
    legal_review_status: 'legally_approved',
    body: DOCUMENT_BODY,
    choices: [],
    channel_options: [],
    attestation:
      'I am the parent or legal guardian of the child being entered. I have read these ' +
      'Competition Terms and I accept them on my child’s behalf, and I confirm the entry will ' +
      'be my child’s own work.',
    signer_declaration: SIGNER_DECLARATION,
    signer_relationship_options: SIGNER_RELATIONSHIP_OPTIONS,
    signer: null,
    assurances: [VERSION_NOTICE],
    signed: false,
    signed_at: null,
    expires_at: null,
    signed_version: null,
    grants: null,
    missing_reason: 'never_signed',
    ...overrides,
  };
}

export const SIGNED_STAMP = {
  signed: true,
  signed_at: '2026-08-05T00:00:00.000Z',
  expires_at: '2027-08-05T00:00:00.000Z',
  signed_version: '1.0',
  missing_reason: null,
};

/** Served by the backend registry, exactly like the document bodies. */
export const KID_ASSENT_STATEMENT =
  'My child knows about this challenge and wants to take part. This is recorded as a note, ' +
  'not a signature, and it does not affect whether you can register.';

/** The family-scoped Airwallex handoff key. */
export const PENDING_KEY = `challenge_entry:${SLUG}:fam-1`;

export function consentStatus(documents: unknown[], overrides: Record<string, unknown> = {}) {
  return {
    edition_id: 'ed_1',
    kid_id: 'kid-1',
    entry_id: 'entry_1',
    documents,
    kid_assent_at: null,
    kid_assent_statement: KID_ASSENT_STATEMENT,
    all_documents_signed: (documents as Array<{ signed: boolean }>).every((d) => d.signed),
    ...overrides,
  };
}

/** Both adult documents signed — the state checkout becomes reachable from. */
export function bothSignedConsent(overrides: Record<string, unknown> = {}) {
  return consentStatus(
    [
      mediaDoc({ ...SIGNED_STAMP, grants: { review: true, channels: [] } }),
      termsDoc({ ...SIGNED_STAMP, grants: { accepted: true } }),
    ],
    overrides,
  );
}

export type Handler = unknown | ((opts: { method?: string; body?: unknown }) => unknown);

export function wireApi(handlers: Record<string, Handler> = {}) {
  api.mockImplementation((path: string, opts: { method?: string; body?: unknown } = {}) => {
    const key = `${opts.method ?? 'GET'} ${path}`;
    if (key in handlers) {
      const handler = handlers[key];
      const value = typeof handler === 'function' ? handler(opts) : handler;
      return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
    }
    if (path.startsWith(REG_PATH)) {
      return Promise.resolve({ edition: EDITION, kid_id: null, entry: null });
    }
    if (path === '/families/fam-1/kids') return Promise.resolve(KIDS);
    // Default consent state: nothing signed. Tests that care override it.
    if (path.startsWith('/challenges/ed_1/consent')) {
      return Promise.resolve(consentStatus([mediaDoc(), termsDoc()]));
    }
    return Promise.resolve(undefined);
  });
}

/** `wireApi` with the edition shut for registration, for the refusal suites. */
export function wireClosedApi(consent: unknown) {
  wireApi({
    [`GET ${REG_PATH}`]: { edition: CLOSED_EDITION, kid_id: null, entry: null },
    [`GET ${REG_PATH}?kid_id=kid-1`]: { edition: CLOSED_EDITION, kid_id: 'kid-1', entry: null },
    [`GET ${CONSENT_PATH}`]: consent,
  });
}

export function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/portal/challenge/${SLUG}/register`]}>
        <Routes>
          <Route path="/portal/challenge/:slug/register" element={<ChallengeRegisterPage />} />
          <Route path="/portal/register" element={<div>REGISTER PAGE</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

export async function pickKid() {
  fireEvent.change(await screen.findByTestId('challenge-kid'), { target: { value: 'kid-1' } });
}

/** Every POST that filed a consent signature, for "nothing was sent" assertions. */
export function consentSignPosts() {
  return api.mock.calls.filter(
    ([path, opts]) => path === '/challenges/ed_1/consent' && opts?.method === 'POST',
  );
}

/** The body of the consent POST under test. Throws rather than silently passing. */
export function lastConsentSignBody() {
  const call = consentSignPosts().at(-1);
  if (!call) throw new Error('no consent signature was posted');
  return call[1].body;
}

/**
 * The per-suite lifecycle, registered once from each suite's top level.
 *
 * `sessionStorage` and the injected Airwallex SDK are torn down here because a
 * leaked handoff key silently sends the NEXT test into the return-trip flow,
 * which is exactly the kind of cross-test bleed a split test file makes easier
 * to acquire and harder to spot.
 */
export function installRegisterPageHarness() {
  beforeEach(() => {
    me.data = { kind: 'user', family_id: 'fam-1', email: 'parent@example.com' };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    sessionStorage.clear();
    delete (window as { AirwallexComponentsSDK?: unknown }).AirwallexComponentsSDK;
  });
}
