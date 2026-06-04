import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CodeRunPage } from './CodeRunPage';
import { CODE_PROJECT_KIND, getProject, readVfs, type CodeProject } from './codeApi';

const project: CodeProject = {
  id: 'cp1',
  title: 'My Site',
  kind: CODE_PROJECT_KIND,
  visibility: 'private',
  updated_at: '2026-06-01T10:00:00Z',
  created_at: '2026-06-01T09:00:00Z',
};

vi.mock('./codeApi', async (orig) => ({
  ...(await orig<typeof import('./codeApi')>()),
  getProject: vi.fn(),
  readVfs: vi.fn(),
}));
vi.mock('./PreviewFrame', (): typeof import('./PreviewFrame') => ({
  PreviewFrame: () => <div>PREVIEW</div>,
}));

const mockedGetProject = vi.mocked(getProject);
const mockedReadVfs = vi.mocked(readVfs);

function renderAt(projectId = 'cp1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/learn/code/${projectId}/run`]}>
        <Routes>
          <Route path="/learn/code/:projectId/run" element={<CodeRunPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockedGetProject.mockReset();
  mockedReadVfs.mockReset();
});

describe('CodeRunPage', () => {
  it('renders the project title and the standalone preview', async () => {
    mockedGetProject.mockResolvedValue(project);
    mockedReadVfs.mockResolvedValue([{ path: 'index.html', content: '<h1>Hi</h1>', kind: 'text', size: 11 }]);
    renderAt();
    expect(await screen.findByText('My Site')).toBeInTheDocument();
    expect(await screen.findByText('PREVIEW')).toBeInTheDocument();
  });
});
