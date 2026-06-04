import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { PortalLayout } from './PortalLayout';

// Isolate the layout: its a11y landmarks (skip-link + <main>) are the contract
// under test, not the child widgets (which have their own specs + ws deps).
vi.mock('./PortalNavDrawer', () => ({ PortalNavDrawer: () => <nav>NAV</nav> }));
vi.mock('@/components/IncidentBanner', () => ({ IncidentBanner: () => null }));
vi.mock('@/components/LiveAnnouncer', () => ({ LiveAnnouncer: () => null }));

describe('PortalLayout', () => {
  it('exposes the skip-link and a focusable main landmark around the outlet', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/portal']}>
        <Routes>
          <Route element={<PortalLayout />}>
            <Route path="/portal" element={<div>PORTAL CONTENT</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Skip to content/ })).toHaveAttribute('href', '#main-content');
    const main = container.querySelector('main#main-content');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('tabindex', '-1');
    expect(screen.getByText('PORTAL CONTENT')).toBeInTheDocument();
  });
});
