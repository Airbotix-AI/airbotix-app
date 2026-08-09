// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: { kind: 'user', family_id: 'fam-1' } }),
}));

const apiMock = vi.fn();
vi.mock('@/lib/api', () => ({ api: (path: string) => apiMock(path) }));

import { ChallengeHubPage } from './ChallengeHubPage';
import { CHALLENGE_PORTAL_PATH } from '@/lib/challenge';

const SLUG = 'creative-code-challenge-2026-junior';

const EDITION = {
  id: 'ed_1',
  slug: SLUG,
  name: 'Creative Code Challenge — 2026 Junior',
  age_group: 'junior_8_12',
  entry_fee_cents: 1900,
  status: 'registration_open',
  registration_open: true,
  submission_open: '2026-08-24T00:00:00.000Z',
  submission_close: '2026-08-31T23:59:59.000Z',
  results_at: '2026-09-14T10:00:00.000Z',
};

const KIDS = [
  { id: 'kid-1', nickname: 'Mia', age: 9 },
  { id: 'kid-2', nickname: 'Max', age: 11 },
  { id: 'kid-3', nickname: 'Pip', age: 8 },
];

/** kid-1 confirmed, kid-2 mid-payment, kid-3 never started. */
const RUBRIC = {
  version: '1.0',
  total_points: 100,
  dimensions: [
    {
      key: 'original_idea',
      label: 'Original idea and creative decisions',
      max_points: 25,
      description: 'How original the concept is.',
      constraints: [],
    },
    {
      key: 'pitch',
      label: 'English Project Pitch',
      max_points: 15,
      description: 'How clearly the child explains, in English, what they built.',
      constraints: ['Do NOT award or deduct marks for accent or pronunciation.'],
    },
  ],
};

function wire({ failKid, failRubric }: { failKid?: string; failRubric?: boolean } = {}) {
  apiMock.mockImplementation((path: string) => {
    if (path === '/challenges/rubric') {
      return failRubric ? Promise.reject(new Error('boom')) : Promise.resolve(RUBRIC);
    }
    if (path === '/families/fam-1/kids') return Promise.resolve(KIDS);
    const match = /kid_id=([^&]+)/.exec(path);
    const kidId = match ? decodeURIComponent(match[1]) : null;
    if (kidId && kidId === failKid) return Promise.reject(new Error('boom'));
    const entry =
      kidId === 'kid-1'
        ? { id: 'e1', status: 'registration_confirmed', stars_granted: 500 }
        : kidId === 'kid-2'
          ? { id: 'e2', status: 'pending_payment', stars_granted: 0 }
          : null;
    return Promise.resolve({ edition: EDITION, kid_id: kidId, entry });
  });
}

function renderHub() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ChallengeHubPage slug={SLUG} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => apiMock.mockReset());
afterEach(() => cleanup());

describe('ChallengeHubPage — who in the family is entered', () => {
  it('shows every child with their own standing, without the parent selecting anyone', async () => {
    // The whole reason this page exists: the register page opened on ONE child
    // chosen from a picker, so a family's standing could only be discovered by
    // switching between children one at a time.
    wire();
    renderHub();

    expect(await screen.findByTestId('challenge-hub-status-kid-1')).toHaveTextContent('Entered');
    expect(screen.getByTestId('challenge-hub-status-kid-2')).toHaveTextContent(
      'Started — not paid yet'
    );
    expect(screen.getByTestId('challenge-hub-status-kid-3')).toHaveTextContent('Not entered');
  });

  it('gives each child an action that carries their own kid_id', async () => {
    wire();
    renderHub();

    const action = await screen.findByTestId('challenge-hub-action-kid-3');
    expect(action).toHaveAttribute(
      'href',
      `/portal/challenge/${SLUG}/register?kid_id=kid-3`
    );
    expect(action).toHaveTextContent('Register this child');
    expect(screen.getByTestId('challenge-hub-action-kid-1')).toHaveTextContent('View entry');
    expect(screen.getByTestId('challenge-hub-action-kid-2')).toHaveTextContent('Finish registering');
  });

  it('never reports a failed lookup as "not entered"', async () => {
    // Telling a parent their PAID child has no entry is worse than admitting we
    // could not check — one is a false fact, the other is a retry.
    wire({ failKid: 'kid-1' });
    renderHub();

    await waitFor(() =>
      expect(screen.getByTestId('challenge-hub-status-kid-1')).toHaveTextContent(
        'Could not check this child’s entry'
      )
    );
    expect(screen.getByTestId('challenge-hub-status-kid-1')).not.toHaveTextContent('Not entered');
  });
});

describe('ChallengeHubPage — the guidance a first-time family needs', () => {
  it('answers "what now" with ordered steps and what gets submitted', async () => {
    // A parent who paid A$19 previously landed on a card whose only action was
    // "View wallet". These two lists are the answer to what they build and hand in.
    wire();
    renderHub();

    const steps = await screen.findByTestId('challenge-hub-steps');
    expect(steps.querySelectorAll('li').length).toBeGreaterThanOrEqual(4);
    expect(steps).toHaveTextContent(/start building today/i);

    const items = screen.getByTestId('challenge-hub-submission-items');
    expect(items).toHaveTextContent(/60–90 second pitch video/);
    expect(items).toHaveTextContent(/evidence of one change/i);
  });

  it('states the English-fairness and declined-media rules where families see them', async () => {
    // These are commitments to children, not judge-only trivia.
    wire();
    renderHub();

    const notes = await screen.findByTestId('challenge-hub-judging-notes');
    expect(notes).toHaveTextContent(/never on accent, vocabulary, or the language spoken at home/i);
    expect(notes).toHaveTextContent(/judged in exactly the same way/i);
  });

  it('shows the real submission window from the edition, never a hardcoded date', async () => {
    wire();
    renderHub();

    const dates = await screen.findByTestId('challenge-hub-dates');
    expect(dates).toHaveTextContent(/24 August 2026/);
    expect(dates).toHaveTextContent(/31 August 2026/);
  });
});

describe('ChallengeHubPage — the marking guide families could never see', () => {
  it('renders every rubric dimension with its marks, from the backend', async () => {
    // The rubric lived only on the judge side. A family paying to enter could
    // not find out how the 100 points split.
    wire();
    renderHub();

    const rubric = await screen.findByTestId('challenge-hub-rubric');
    expect(rubric).toHaveTextContent('Original idea and creative decisions');
    expect(rubric).toHaveTextContent('25 marks');
    expect(rubric).toHaveTextContent('English Project Pitch');
    expect(rubric).toHaveTextContent('15 marks');
  });

  it('shows the English-fairness limits attached to the pitch mark', async () => {
    // A fairness rule a family is never shown is one they cannot rely on.
    wire();
    renderHub();

    const limits = await screen.findByTestId('rubric-limits-pitch');
    expect(limits).toHaveTextContent(/accent or pronunciation/i);
  });

  it('says the guide failed to load rather than rendering no criteria at all', async () => {
    // Silence would read as "there are no criteria", which is worse than an error.
    wire({ failRubric: true });
    renderHub();

    expect(await screen.findByTestId('challenge-hub-rubric-error')).toHaveTextContent(
      /could not load the marking guide/i
    );
    expect(screen.queryByTestId('challenge-hub-rubric')).not.toBeInTheDocument();
  });

  it('never hardcodes the rubric — it renders exactly what the API returned', async () => {
    wire();
    renderHub();

    const rubric = await screen.findByTestId('challenge-hub-rubric');
    // Two dimensions in the fixture; a page carrying its own copy would show six.
    expect(rubric.querySelectorAll('li[class*="rounded-2xl"]').length).toBe(
      RUBRIC.dimensions.length
    );
  });
});

describe('ChallengeHubPage — the links a family needs', () => {
  it('points at the public Showcase', async () => {
    wire();
    renderHub();

    expect(await screen.findByTestId('challenge-hub-showcase-link')).toHaveAttribute(
      'href',
      `/challenge/${SLUG}/showcase`
    );
  });

  it('gives the parent a studio they can actually open — the public demo', async () => {
    // "Build in Creative Code Studio" named a place a parent cannot reach: the
    // studio proper is a kid surface and bounces them to /portal. /try/playground
    // is the one version they can open, and it needs no account.
    wire();
    renderHub();

    const link = await screen.findByTestId('challenge-hub-step-link-start-building');
    expect(link).toHaveAttribute('href', '/try/playground');
    expect(link).toHaveTextContent(/Creative Code Studio/i);
    // Never "no login needed": the parent reading this IS signed in, so that
    // wording reads as nonsense or as an instruction to sign out. Whose account
    // the studio lives in is the actual point.
    expect(link.textContent ?? '').not.toMatch(/no login/i);
  });

  it('offers the device handoff on an ENTERED child, where it is actually needed', async () => {
    // A parent cannot open their child's studio or submit page however signed in
    // they are — `/learn/*` bounces a parent principal. The handoff was only on
    // the family page, nowhere near the moment a parent needs it.
    wire();
    renderHub();

    const entered = await screen.findByTestId('challenge-hub-kid-kid-1');
    expect(entered.textContent ?? '').toMatch(/device/i);
    // Not offered for a child with no entry — there is nothing to hand over yet.
    expect(screen.getByTestId('challenge-hub-kid-kid-3').textContent ?? '').not.toMatch(/device/i);
  });

  it('tells a parent the submit page is the CHILD’s, not a link they can open', async () => {
    // A parent opening /learn/* is bounced back to /portal, so handing them a
    // raw link would be a dead end dressed up as an action.
    wire();
    renderHub();

    expect(await screen.findByTestId('challenge-hub-submit-note')).toHaveTextContent(
      /will not work from your account/i
    );
  });
});

describe('Portal navigation target', () => {
  it('points at the hub, not the single-child register form', () => {
    // The nav pointed straight at /register, which is why a parent never saw a
    // family-level view at all.
    expect(CHALLENGE_PORTAL_PATH).toBe(`/portal/challenge/${SLUG}`);
    expect(CHALLENGE_PORTAL_PATH.endsWith('/register')).toBe(false);
  });
});
