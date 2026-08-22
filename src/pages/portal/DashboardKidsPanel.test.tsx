// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { api, parentKidLogin } = vi.hoisted(() => ({
  api: vi.fn(),
  parentKidLogin: vi.fn(),
}));

vi.mock('@/lib/api', () => ({ api }));
vi.mock('@/auth/useAuth', () => ({
  useParentKidLogin: () => parentKidLogin,
}));
vi.mock('./KidGrowthTeaser', () => ({
  KidGrowthTeaser: ({ name, compact }: { name: string; compact?: boolean }) => (
    <div data-compact={compact ? 'true' : 'false'}>{name} growth</div>
  ),
}));

import { DashboardKidsPanel } from './DashboardKidsPanel';

const ACTIVE_KID = {
  id: 'kid-1',
  nickname: 'Mia',
  age: 9,
  is_active: true,
};

const PAUSED_KID = {
  id: 'kid-2',
  nickname: 'Leo',
  age: 12,
  is_active: false,
};

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardKidsPanel familyId="family-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('DashboardKidsPanel', () => {
  it('shows a labelled loading state without inventing kid data', () => {
    api.mockReturnValue(new Promise(() => undefined));

    renderPanel();

    expect(screen.getByText('Loading your kids…')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Mia' })).not.toBeInTheDocument();
  });

  it('shows every kid with unique growth and handoff actions', async () => {
    api.mockResolvedValue([ACTIVE_KID, PAUSED_KID]);
    parentKidLogin.mockResolvedValue({
      access_token: 'kid-token',
      expires_in: 900,
      kid: { id: 'kid-1', nickname: 'Mia', age: 9, family_id: 'family-1' },
    });
    const kidTab = { location: { href: '' }, closed: false, close: vi.fn() };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(kidTab as unknown as Window);

    renderPanel();

    expect(await screen.findByRole('heading', { name: 'Mia' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Leo' })).toBeInTheDocument();
    // The initial-letter placeholder is now a real picked avatar image, so the
    // accessible name carries the avatar's own name after the child's.
    expect(screen.getByRole('img', { name: /Mia's avatar/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Leo's avatar/ })).toBeInTheDocument();
    expect(screen.getByText('Mia growth')).toBeInTheDocument();
    expect(screen.getByText('Leo growth')).toBeInTheDocument();
    expect(screen.getByText('Mia growth')).toHaveAttribute('data-compact', 'true');
    expect(screen.getByRole('button', { name: "Open Mia's kids page" })).toHaveTextContent(
      'Open Learn',
    );
    expect(screen.getByRole('link', { name: "See Mia's growth" })).toHaveTextContent('Growth');
    expect(screen.getByRole('link', { name: "See Mia's growth" })).toHaveAttribute(
      'href',
      '/portal/family/kid-1',
    );
    expect(screen.getByRole('link', { name: "See Leo's growth" })).toHaveAttribute(
      'href',
      '/portal/family/kid-2',
    );

    const pausedOpen = screen.getByRole('button', { name: "Open Leo's kids page" });
    expect(pausedOpen).toBeDisabled();
    expect(screen.getByText('Paused — update this kid in My Family.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: "Open Mia's kids page" }));
    await waitFor(() => expect(parentKidLogin).toHaveBeenCalledWith('kid-1'));
    expect(openSpy).toHaveBeenCalledWith('', '_blank');
    await waitFor(() => expect(kidTab.location.href).toMatch(/\/learn$/));
  });

  it('keeps a single kid card at a readable width', async () => {
    api.mockResolvedValue([ACTIVE_KID]);

    renderPanel();

    expect(await screen.findByRole('heading', { name: 'Mia' })).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-kids-grid')).toHaveClass('max-w-lg');
  });

  it('fits a family of three into one desktop overview row', async () => {
    api.mockResolvedValue([
      ACTIVE_KID,
      PAUSED_KID,
      { ...ACTIVE_KID, id: 'kid-3', nickname: 'Pip', age: 7 },
    ]);

    renderPanel();

    expect(await screen.findByRole('heading', { name: 'Pip' })).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-kids-grid')).toHaveClass(
      'sm:grid-cols-2',
      'lg:grid-cols-3',
    );
  });

  it('shows the add-first-kid state without rendering an empty grid', async () => {
    api.mockResolvedValue([]);

    renderPanel();

    expect(await screen.findByRole('heading', { name: 'Add your first kid' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add your first kid →' })).toHaveAttribute(
      'href',
      '/portal/family/new',
    );
    expect(screen.getByTestId('dashboard-kids-empty-character')).toHaveAttribute(
      'data-character',
      'lumi-welcome',
    );
  });

  it('keeps the Dashboard usable and retries after the kids request fails', async () => {
    api.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([ACTIVE_KID]);

    renderPanel();

    expect(
      await screen.findByRole('heading', { name: "We couldn't load your kids" }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open My Family' })).toHaveAttribute(
      'href',
      '/portal/family',
    );
    expect(screen.getByTestId('dashboard-kids-error-character')).toHaveAttribute(
      'data-character',
      'tuantuan-thinking',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: 'Mia' })).toBeInTheDocument();
    expect(api).toHaveBeenCalledTimes(2);
  });

  it('reports a handoff failure beside the kid and keeps the action retryable', async () => {
    api.mockResolvedValue([ACTIVE_KID]);
    parentKidLogin.mockRejectedValue(new Error('login failed'));
    const kidTab = { location: { href: '' }, closed: false, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(kidTab as unknown as Window);

    renderPanel();

    const openButton = await screen.findByRole('button', { name: "Open Mia's kids page" });
    fireEvent.click(openButton);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Could not open Mia's kids page. Allow pop-ups and try again.",
    );
    expect(kidTab.close).toHaveBeenCalled();
    expect(openButton).toBeEnabled();
  });

  it('treats a blocked popup as a local error instead of leaving the parent Dashboard', async () => {
    api.mockResolvedValue([ACTIVE_KID]);
    parentKidLogin.mockResolvedValue({
      access_token: 'kid-token',
      expires_in: 900,
      kid: { id: 'kid-1', nickname: 'Mia', age: 9, family_id: 'family-1' },
    });
    vi.spyOn(window, 'open').mockReturnValue(null);

    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: "Open Mia's kids page" }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Allow pop-ups and try again.');
    expect(screen.getByRole('heading', { name: 'My kids' })).toBeInTheDocument();
  });
});
