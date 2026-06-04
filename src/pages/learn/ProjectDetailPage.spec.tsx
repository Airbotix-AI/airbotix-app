import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { useMe } from '@/auth/useAuth';
import { ApiError, api } from '@/lib/api';
import { ProjectDetailPage } from './ProjectDetailPage';

vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn() }));
vi.mock('@/pages/learn/classroom/ShareToClassModal', () => ({ ShareToClassModal: () => null }));
vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: vi.fn(),
}));

const mockedUseMe = vi.mocked(useMe);
const mockedApi = vi.mocked(api);

const kid = { kind: 'kid', sub: 'k1', nickname: 'Robo', family_id: 'f1' } as AuthPrincipal;
const walletObj = { stars_balance: 50, daily_used: 5, daily_cap: 30 };

function setApi(impl: (path: string) => unknown) {
  mockedApi.mockImplementation(((p: string) => Promise.resolve(impl(p))) as unknown as typeof api);
}

function project(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    title: 'My Drawing',
    kind: 'creative',
    product_line: 'line_a_creative',
    visibility: 'private',
    thumbnail_s3_key: null,
    star_cost_total: 12,
    status: 'in_progress',
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-06-01T10:00:00Z',
    mission_id: null,
    ...overrides,
  };
}

function renderProject(id = 'p1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/learn/projects/${id}`]}>
        <Routes>
          <Route path="/learn/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/learn/projects" element={<div>PROJECTS LIST</div>} />
          <Route path="/learn/code/:id" element={<div>CODE STUDIO</div>} />
          <Route path="/learn/create" element={<div>CREATE</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProjectDetailPage', () => {
  beforeEach(() => {
    mockedApi.mockReset();
    mockedUseMe.mockReturnValue({ data: kid } as ReturnType<typeof useMe>);
  });

  it('shows a not-found state when the project fails to load', async () => {
    setApi((p) => {
      if (p.includes('/artifacts')) return [];
      if (p.includes('/wallet')) return walletObj;
      throw new ApiError(404, 'NOT_FOUND', 'no');
    });
    renderProject();
    expect(await screen.findByText('Not found')).toBeInTheDocument();
  });

  it('renders a creative project with the chat panel and a non-empty gallery', async () => {
    setApi((p) => {
      if (p.includes('/artifacts'))
        return [
          {
            id: 'art1',
            kind: 'text',
            s3_key: 'k',
            mime_type: 'text/plain',
            size_bytes: 4,
            created_at: '2026-06-01T10:00:00Z',
            metadata: { prompt: 'a cat' },
          },
        ];
      if (p.includes('/wallet')) return walletObj;
      return project();
    });
    renderProject();

    expect(await screen.findByRole('heading', { name: 'My Drawing' })).toBeInTheDocument();
    expect(screen.getByText('Start chatting')).toBeInTheDocument();
    expect(screen.getByText('private')).toBeInTheDocument();
    expect(screen.queryByText('Empty canvas')).not.toBeInTheDocument();
  });

  it('redirects a code-kind project to the Code Studio', async () => {
    setApi((p) => {
      if (p.includes('/artifacts')) return [];
      if (p.includes('/wallet')) return walletObj;
      return project({ kind: 'code' });
    });
    renderProject();
    expect(await screen.findByText('CODE STUDIO')).toBeInTheDocument();
  });

  it('sends a chat prompt to /llm/text-completion and shows the reply', async () => {
    setApi((p) => {
      if (p.includes('/llm/text-completion'))
        return { id: 'm1', reply: 'Here is a fun fact!', stars_charged: 1, balance_after: 49, model: 'x' };
      if (p.includes('/artifacts')) return [];
      if (p.includes('/wallet')) return walletObj;
      return project();
    });
    renderProject();

    const box = await screen.findByRole('textbox');
    await userEvent.type(box, 'tell me a fact');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Here is a fun fact!')).toBeInTheDocument();
    expect(mockedApi).toHaveBeenCalledWith(
      '/llm/text-completion',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('lets the kid request a share, posting to /projects/:id/share-request', async () => {
    setApi((p) => {
      if (p.includes('/share-request')) return {};
      if (p.includes('/artifacts')) return [];
      if (p.includes('/wallet')) return walletObj;
      return project();
    });
    renderProject();

    const sendReq = await screen.findByRole('button', { name: 'Send request' });
    await userEvent.click(sendReq);

    expect(await screen.findByText('Sent ✓')).toBeInTheDocument();
    expect(mockedApi).toHaveBeenCalledWith(
      '/projects/p1/share-request',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
