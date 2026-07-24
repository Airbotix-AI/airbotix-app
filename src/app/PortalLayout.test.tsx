// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

afterEach(cleanup);

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

  it('keeps the document fixed to the viewport and makes the main region the only scroller', () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route element={<PortalLayout />}>
            <Route index element={<div>Course comparison</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const layout = screen.getByTestId('portal-layout');
    const scrollRegion = screen.getByTestId('portal-scroll-region');
    const contentFrame = screen.getByTestId('portal-content-frame');

    expect(layout).toHaveClass('fixed', 'inset-0', 'h-dvh', 'min-h-0', 'overflow-hidden');
    expect(scrollRegion).toHaveClass('min-h-0', 'min-w-0', 'overflow-y-auto');
    expect(contentFrame).toHaveClass('w-full', 'max-w-none', 'pr-3', 'xl:pr-4');
    expect(within(scrollRegion).getByText('Course comparison')).toBeInTheDocument();
    expect(screen.getByTestId('desktop-navigation')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Parent Portal mobile' })).toBeInTheDocument();
  });
});
