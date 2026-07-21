// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock('@/lib/api', () => ({ api }));
vi.mock('@/lib/useWsEvent', () => ({ useWsEvent: vi.fn() }));
vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({
    data: {
      kind: 'user',
      display_name: 'Alex',
      family_id: 'family-1',
      email: 'parent@example.com',
    },
  }),
}));
vi.mock('./onboarding/WelcomeWizard', () => ({
  WelcomeWizard: () => <div data-testid="welcome-wizard" />,
}));
vi.mock('./onboarding/GettingStartedCard', () => ({
  GettingStartedCard: () => <div data-testid="getting-started" />,
}));
vi.mock('./NowEnrollingPanel', () => ({
  NowEnrollingPanel: () => <div data-testid="now-enrolling">open classes</div>,
}));
vi.mock('./guides/FamilyGuidesRecommendation', () => ({
  FamilyGuidesRecommendation: () => <div data-testid="family-guides">family guides</div>,
}));

import { DashboardPage } from './DashboardPage';

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  api.mockImplementation((path: string) => {
    if (path.endsWith('/wallet')) {
      return Promise.resolve({ stars_balance: 40, daily_used: 2, daily_cap: 20 });
    }
    if (path.endsWith('/approvals')) return Promise.resolve([]);
    return Promise.resolve({});
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DashboardPage', () => {
  it('surfaces open classes to enrol in right after Quick actions', () => {
    renderDashboard();

    // A freshly-logged-in parent sees what they can enrol in (Now enrolling) on the
    // landing page, after Quick actions and before the generic family-guides block.
    const quickActions = screen.getByText('Quick actions');
    const nowEnrolling = screen.getByTestId('now-enrolling');
    const familyGuides = screen.getByTestId('family-guides');

    expect(quickActions.compareDocumentPosition(nowEnrolling)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(nowEnrolling.compareDocumentPosition(familyGuides)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});
