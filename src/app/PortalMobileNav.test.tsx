// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { PortalMobileNav } from './PortalMobileNav';

const logout = vi.fn();

vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({
    data: {
      kind: 'user',
      email: 'parent@example.test',
      display_name: 'Test Parent',
    },
  }),
  useLogout: () => logout,
}));

function renderNavigation(initialEntry = '/portal') {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <PortalMobileNav pendingCount={3} />
      <Routes>
        <Route path="/portal" element={<p>Dashboard page</p>} />
        <Route path="/portal/classes" element={<p>Classes page</p>} />
        <Route path="/portal/audit" element={<p>Activity page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PortalMobileNav', () => {
  beforeEach(() => {
    logout.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders a native-style five-tab bar with the active route', () => {
    renderNavigation();

    const navigation = screen.getByRole('navigation', { name: 'Parent Portal mobile' });
    expect(within(navigation).getAllByRole('link')).toHaveLength(4);
    expect(within(navigation).getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(navigation).getByRole('link', { name: 'Classes' })).toBeVisible();
    expect(within(navigation).getByRole('link', { name: 'Family' })).toBeVisible();
    expect(within(navigation).getByRole('link', { name: 'Wallet' })).toBeVisible();
    expect(within(navigation).getByRole('button', { name: /More/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByLabelText('3 pending approvals in More')).toBeVisible();
  });

  it('opens every secondary destination in a bottom sheet and closes after navigation', async () => {
    renderNavigation();

    fireEvent.click(screen.getByRole('button', { name: /More/ }));
    const sheet = screen.getByRole('dialog', { name: 'More Parent Portal navigation' });

    for (const label of [
      'Courses',
      'Exam Prep',
      'Tutoring',
      'Family Guides',
      'Usage',
      'Approvals',
      'Activity',
      'Billing',
      'Settings',
    ]) {
      expect(within(sheet).getByRole('link', { name: new RegExp(label) })).toBeVisible();
    }
    expect(within(sheet).getByLabelText('3 pending approvals')).toBeVisible();

    fireEvent.click(within(sheet).getByRole('link', { name: 'Activity' }));
    expect(await screen.findByText('Activity page')).toBeVisible();
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'More Parent Portal navigation' })).toBeNull();
    });
  });

  it('keeps account sign-out reachable from the More sheet', () => {
    renderNavigation();

    fireEvent.click(screen.getByRole('button', { name: /More/ }));
    const sheet = screen.getByRole('dialog', { name: 'More Parent Portal navigation' });
    expect(within(sheet).getByText('Test Parent')).toBeVisible();
    fireEvent.click(within(sheet).getByRole('button', { name: 'Sign out' }));

    expect(logout).toHaveBeenCalledWith('user', false);
  });
});
