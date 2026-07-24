// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { OnboardingState } from './onboardingState';

const { useOnboardingState } = vi.hoisted(() => ({
  useOnboardingState: vi.fn(),
}));

vi.mock('./useOnboardingState', () => ({ useOnboardingState }));
vi.mock('./KidLoginHelper', () => ({ KidLoginHelper: () => null }));

import { GettingStartedCard } from './GettingStartedCard';

const items: OnboardingState['items'] = [
  { id: 'familySetup', done: true, optional: false },
  { id: 'kidAdded', done: true, optional: false },
  { id: 'kidLogin', done: false, optional: false },
  { id: 'addStars', done: true, optional: false },
  { id: 'setLimits', done: false, optional: true },
  { id: 'browseGuides', done: false, optional: true },
];

function renderSidebar() {
  useOnboardingState.mockReturnValue({
    state: { items, coreComplete: false },
    isReady: true,
    hasFamily: true,
    kidName: 'Mia',
    familyId: 'fam_1',
    checklistDismissed: false,
    dismissChecklist: vi.fn(),
    markKidLoginShown: vi.fn(),
    markLimitsReviewed: vi.fn(),
    markGuidesBrowsed: vi.fn(),
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <GettingStartedCard variant="sidebar" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('GettingStartedCard sidebar', () => {
  it('uses compact type and controls in the persistent dashboard rail', () => {
    renderSidebar();

    expect(screen.getByRole('heading', { name: "You're almost ready 🎉" })).toHaveStyle({
      fontSize: '18px',
    });
    expect(screen.getByText('Log Mia in on their device')).toHaveClass('text-[13px]');
    expect(screen.getByRole('button', { name: 'Show me how →' })).toHaveClass(
      '!px-3.5',
      '!py-2',
      '!text-[12px]',
    );
  });
});
