import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import { mockApiByPath } from '@/test/mocks';
import { PreviewPane } from './PreviewPane';
import type { Message } from './WorkspacePage';

vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: vi.fn(),
}));

const mockedApi = vi.mocked(api);
type Artifact = NonNullable<Message['artifact']>;
const imageArtifact = {
  id: 'a1',
  kind: 'image',
  mime_type: 'image/png',
  s3_key: 'k',
  project_id: 'p1',
} as Artifact;

function renderPane(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
}

beforeEach(() => mockedApi.mockReset());

describe('PreviewPane', () => {
  it('shows the empty state when there is no artifact', () => {
    renderPane(<PreviewPane artifact={null} tool="image" />);
    expect(screen.getByText('No preview yet')).toBeInTheDocument();
  });

  it('renders the latest artifact heading + download actions', async () => {
    mockApiByPath(() => ({ url: 'blob:preview' }));
    renderPane(<PreviewPane artifact={imageArtifact} tool="image" />);
    expect(screen.getByText('Latest image')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Copy link' })).toBeInTheDocument();
  });
});
