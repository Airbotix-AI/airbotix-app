// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { api, parentKidLogin } = vi.hoisted(() => ({
  api: vi.fn(),
  parentKidLogin: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api,
  ApiError: class ApiError extends Error {},
}));
vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({
    data: { kind: 'user', family_id: 'family-1', email: 'parent@example.com' },
  }),
  useParentKidLogin: () => parentKidLogin,
}));

import { FamilyDetailPage } from './FamilyDetailPage';
import { FamilyListPage } from './FamilyListPage';
import { KidGrowthPage } from './KidGrowthPage';

const KID = {
  id: 'kid-1',
  nickname: 'Mia',
  age: 9,
  real_name: null,
  daily_star_cap: 30,
  is_active: true,
  family_id: 'family-1',
  created_at: '2026-07-01T00:00:00Z',
  deleted_at: null,
};

function wireApi() {
  api.mockImplementation((path: string) => {
    if (path === '/kids/kid-1') return Promise.resolve(KID);
    if (path.startsWith('/kids/kid-1/usage/trend')) {
      return Promise.resolve({ metric: 'stars', series: [] });
    }
    if (path.startsWith('/kids/kid-1/usage')) {
      return Promise.resolve({ totals: { requests: 0, stars_charged: 0 }, by_task_type: {} });
    }
    if (path === '/families/family-1') {
      return Promise.resolve({
        id: 'family-1',
        name: 'Wang family',
        code: 'LM4Q',
        region: 'QLD',
        primary_email: 'parent@example.com',
      });
    }
    if (path === '/families/family-1/kids') return Promise.resolve([KID]);
    return Promise.resolve({});
  });
}

function renderRoute(path: string, element: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path={
              path.includes('/settings')
                ? '/portal/family/:kidId/settings'
                : '/portal/family/:kidId'
            }
            element={element}
          />
          <Route path="/learn" element={<div>Kid home</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderFamilyList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <FamilyListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('family profile navigation', () => {
  it('puts a prominent edit-profile action beside the kid growth heading', async () => {
    wireApi();
    renderRoute('/portal/family/kid-1', <KidGrowthPage />);

    expect(await screen.findByRole('heading', { name: "Mia's growth" })).toBeInTheDocument();
    const editProfile = screen.getByRole('link', { name: "Edit Mia's profile" });
    expect(editProfile).toHaveAttribute('href', '/portal/family/kid-1/settings');
    expect(editProfile).toHaveClass('btn-pill-primary');
  });

  it('opens the selected kid session directly from the parent growth page', async () => {
    wireApi();
    parentKidLogin.mockResolvedValue({
      access_token: 'kid-token',
      expires_in: 900,
      kid: { id: 'kid-1', nickname: 'Mia', age: 9, family_id: 'family-1' },
    });
    renderRoute('/portal/family/kid-1', <KidGrowthPage />);

    const quickLogin = await screen.findByRole('button', { name: "Open Mia's kids page" });
    fireEvent.click(quickLogin);

    await waitFor(() => expect(parentKidLogin).toHaveBeenCalledWith('kid-1'));
    expect(await screen.findByText('Kid home')).toBeInTheDocument();
  });

  it('offers edit profile directly from each kid card in My Family', async () => {
    wireApi();
    renderFamilyList();

    expect(await screen.findByText('Mia')).toBeInTheDocument();
    const editProfile = screen.getByRole('link', { name: "Edit Mia's profile" });
    expect(editProfile).toHaveAttribute('href', '/portal/family/kid-1/settings');
    expect(editProfile).toHaveClass('btn-pill-primary');
    expect(screen.getByRole('link', { name: "See Mia's growth" })).toHaveAttribute(
      'href',
      '/portal/family/kid-1',
    );
  });

  it('organises settings into plain-language profile, access and PIN sections', async () => {
    wireApi();
    renderRoute('/portal/family/kid-1/settings', <FamilyDetailPage />);

    expect(await screen.findByRole('heading', { name: 'Manage Mia' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Basic details' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Access & limits' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Set a new kid PIN' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save profile changes' })).toBeInTheDocument();
    expect(screen.getByText('Need to remove this kid profile?')).toBeInTheDocument();
  });
});
