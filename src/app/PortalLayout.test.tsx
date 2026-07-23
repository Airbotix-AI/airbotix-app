// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { PortalLayout } from './PortalLayout';

vi.mock('@/components/IncidentBanner', () => ({
  IncidentBanner: () => <div>Incident banner</div>,
}));

vi.mock('./PortalNavDrawer', () => ({
  PortalNavDrawer: ({ pendingCount }: { pendingCount: number }) => (
    <div data-testid="desktop-navigation">{pendingCount}</div>
  ),
}));

vi.mock('./usePortalPendingCount', () => ({
  usePortalPendingCount: () => 4,
}));

vi.mock('./PortalMobileNav', () => ({
  PortalMobileNav: ({ pendingCount }: { pendingCount: number }) => (
    <nav aria-label="Parent Portal mobile">{pendingCount}</nav>
  ),
}));

describe('PortalLayout', () => {
  it('mounts desktop and mobile navigation with the same live pending count', () => {
    render(
      <MemoryRouter initialEntries={['/portal']}>
        <Routes>
          <Route path="/portal" element={<PortalLayout />}>
            <Route index element={<div>Portal dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('desktop-navigation')).toHaveTextContent('4');
    expect(screen.getByRole('navigation', { name: 'Parent Portal mobile' })).toHaveTextContent('4');
    expect(screen.getByText('Portal dashboard')).toBeVisible();
  });
});
