// @vitest-environment jsdom
// Desktop nav drawer — grouped IA (parent-portal-prd.md §2): Dashboard on top,
// then Explore / Family / Account sections; Approvals badge unchanged.

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/lib/api', () => ({ api }));
vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({
    data: {
      kind: 'user',
      family_id: 'fam-1',
      email: 'parent@example.test',
      display_name: 'Test Parent',
      role: 'parent',
    },
  }),
  useLogout: () => vi.fn(),
}));
vi.mock('@/lib/useWsEvent', () => ({ useWsEvent: vi.fn() }));
vi.mock('@/pages/learn/playground/sharingApi', () => ({
  listFamilyShareLinks: vi.fn(async () => []),
}));

import { PortalNavDrawer } from './PortalNavDrawer';

function renderDrawer() {
  api.mockResolvedValue([]);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/portal']}>
        <PortalNavDrawer pendingCount={0} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PortalNavDrawer', () => {
  afterEach(() => {
    cleanup();
    api.mockReset();
  });

  it('groups the 14 destinations under Explore / Family / Account headings', () => {
    renderDrawer();

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('hidden', 'xl:flex');
    expect(within(nav).getAllByRole('link')).toHaveLength(14);
    for (const heading of ['Explore', 'Family', 'Account']) {
      expect(within(nav).getByText(heading)).toBeVisible();
    }

    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Find a class' })).toBeVisible();
    expect(within(nav).getByRole('link', { name: 'My Family' })).toBeVisible();
    expect(within(nav).getByRole('link', { name: 'Settings' })).toBeVisible();
  });

  it('keeps every section heading above its first item', () => {
    renderDrawer();

    const nav = screen.getByRole('navigation');
    const order = [
      ['Explore', 'Find a class'],
      ['Family', 'My Family'],
      ['Account', 'Wallet'],
    ] as const;
    for (const [heading, firstItem] of order) {
      const headingEl = within(nav).getByText(heading);
      const linkEl = within(nav).getByRole('link', { name: firstItem });
      expect(
        headingEl.compareDocumentPosition(linkEl) & Node.DOCUMENT_POSITION_FOLLOWING,
        `${heading} precedes ${firstItem}`,
      ).toBeTruthy();
    }
  });
});
