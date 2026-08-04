// @vitest-environment jsdom
// Creative Code Studio hub — the Website Studio card (creative-code-studio-
// website-prd). `hub-template-website` is a harness journey contract: clicking
// it opens the playground's prompt-first landing with the website kind armed
// (`/learn/playground/new?kind=website`) — the kind:'website' project is created
// on prompt submit there, NOT here (mirrors the game card's landing-first flow).

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { navigate, useMeMock, apiMock } = vi.hoisted(() => ({
  navigate: vi.fn(),
  useMeMock: vi.fn(),
  apiMock: vi.fn(),
}));

vi.mock('@/auth/useAuth', () => ({ useMe: useMeMock }));
vi.mock('@/lib/api', async (orig) => {
  const actual = await orig<typeof import('@/lib/api')>();
  return { ...actual, api: apiMock };
});
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

import { CodeHubPage } from './CodeHubPage';

function renderHub() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CodeHubPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CodeHubPage — Website Studio card', () => {
  beforeEach(() => {
    navigate.mockReset();
    apiMock.mockReset().mockResolvedValue([]);
    useMeMock.mockReturnValue({ data: { kind: 'kid', sub: 'kid-1', family_id: 'fam-1' } });
  });
  afterEach(cleanup);

  it('opens the prompt-first website landing — no project POST from the hub', () => {
    renderHub();
    const card = screen.getByTestId('hub-template-website');
    expect(card).toHaveTextContent('Website Studio');
    expect(card).toHaveTextContent(/its own little backend/i);

    fireEvent.click(card);

    expect(navigate).toHaveBeenCalledWith('/learn/playground/new?kind=website');
    // Landing-first: no POST /projects fires here (only the projects list GET ran).
    expect(apiMock).not.toHaveBeenCalledWith('/projects', expect.anything());
  });
});
