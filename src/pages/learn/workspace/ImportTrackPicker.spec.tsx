import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import { mockApiResolved } from '@/test/mocks';
import { ImportTrackPicker } from './ImportTrackPicker';

vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: vi.fn(),
}));

const mockedApi = vi.mocked(api);
const artifact = {
  id: 'a1',
  kind: 'audio',
  mime_type: 'audio/mpeg',
  created_at: '2026-06-01T10:00:00Z',
  s3_key: 'k',
  project: null,
  metadata: { prompt: 'happy song' },
};

function renderPicker(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
}

beforeEach(() => mockedApi.mockReset());

describe('ImportTrackPicker', () => {
  it('shows an empty hint when there is nothing to import', async () => {
    mockApiResolved([]);
    renderPicker(
      <ImportTrackPicker kidId="k1" excludeIds={new Set()} busy={false} onClose={() => {}} onPick={() => {}} />,
    );
    expect(await screen.findByText(/Nothing to import yet/)).toBeInTheDocument();
  });

  it('picks an artifact and reports its id + label', async () => {
    mockApiResolved([artifact]);
    const onPick = vi.fn();
    renderPicker(
      <ImportTrackPicker kidId="k1" excludeIds={new Set()} busy={false} onClose={() => {}} onPick={onPick} />,
    );
    await userEvent.click(await screen.findByRole('button', { name: /happy song/ }));
    expect(onPick).toHaveBeenCalledWith('a1', 'happy song');
  });
});
