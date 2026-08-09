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
function wire({ failKid }: { failKid?: string } = {}) {
  apiMock.mockImplementation((path: string) => {
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

describe('Portal navigation target', () => {
  it('points at the hub, not the single-child register form', () => {
    // The nav pointed straight at /register, which is why a parent never saw a
    // family-level view at all.
    expect(CHALLENGE_PORTAL_PATH).toBe(`/portal/challenge/${SLUG}`);
    expect(CHALLENGE_PORTAL_PATH.endsWith('/register')).toBe(false);
  });
});
