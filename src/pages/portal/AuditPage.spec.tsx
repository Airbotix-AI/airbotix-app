import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { api } from '@/lib/api';
import { mockApiByPath, mockUseMe } from '@/test/mocks';
import { AuditPage } from './AuditPage';

vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn() }));
vi.mock('@/lib/useWsEvent', () => ({ useWsEvent: vi.fn() }));
vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: vi.fn(),
}));

const mockedApi = vi.mocked(api);
const parent = (family_id: string | null = 'f1'): AuthPrincipal =>
  ({ kind: 'user', sub: 'u1', email: 'p@e.com', display_name: 'Sam', role: 'parent', family_id }) as AuthPrincipal;

const auditEvent = {
  id: 'e1',
  family_id: 'f1',
  kid_id: 'k1',
  project_id: 'p1',
  actor: 'kid',
  actor_id: 'k1',
  event_type: 'llm.text_completion',
  payload: { model: 'claude-haiku' },
  occurred_at: '2026-06-01T10:00:00Z',
};

function renderPage(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockedApi.mockReset();
  mockUseMe(parent());
});

describe('AuditPage', () => {
  it('prompts to set up a family when there is none', () => {
    mockUseMe(parent(null));
    renderPage(<AuditPage />);
    expect(screen.getByText('Set up your family first')).toBeInTheDocument();
  });

  it('renders the audit timeline with the event type and a project link', async () => {
    mockApiByPath(() => [auditEvent]);
    renderPage(<AuditPage />);

    expect(await screen.findByText('llm.text_completion')).toBeInTheDocument();
    expect(screen.getByText('kid')).toBeInTheDocument(); // actor sticker
    expect(screen.getByRole('link', { name: /project/ })).toHaveAttribute(
      'href',
      '/portal/audit/project/p1',
    );
  });

  it('shows the quiet empty state when there are no events', async () => {
    mockApiByPath(() => []);
    renderPage(<AuditPage />);
    expect(await screen.findByText('Quiet')).toBeInTheDocument();
  });
});
