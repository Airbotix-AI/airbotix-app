import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import { mockApiByPath } from '@/test/mocks';
import { AuditProjectPage } from './AuditProjectPage';

vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: vi.fn(),
}));

const mockedApi = vi.mocked(api);
const event = {
  id: 'e1',
  family_id: 'f1',
  kid_id: 'k1',
  project_id: 'p1',
  actor: 'agent',
  actor_id: 'a1',
  event_type: 'llm.text_completion',
  payload: {},
  occurred_at: '2026-06-01T10:00:00Z',
};

function renderAt(id = 'p1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/portal/audit/project/${id}`]}>
        <Routes>
          <Route path="/portal/audit/project/:id" element={<AuditProjectPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => mockedApi.mockReset());

describe('AuditProjectPage', () => {
  it('replays the project audit timeline', async () => {
    mockApiByPath(() => [event]);
    renderAt();
    expect(await screen.findByText('llm.text_completion')).toBeInTheDocument();
  });

  it('shows the no-trace state when the project has no events', async () => {
    mockApiByPath(() => []);
    renderAt();
    expect(await screen.findByText('No trace')).toBeInTheDocument();
  });
});
