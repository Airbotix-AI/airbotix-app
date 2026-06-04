import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CodeStudioPage } from './CodeStudioPage';
import { useCodeStudio } from './useCodeStudio';

vi.mock('./useCodeStudio', () => ({ useCodeStudio: vi.fn() }));
vi.mock('./CodeChat', (): typeof import('./CodeChat') => ({ CodeChat: () => <div>CHAT</div> }));
vi.mock('./FileTree', (): typeof import('./FileTree') => ({ FileTree: () => <div>FILES</div> }));
vi.mock('./PreviewFrame', (): typeof import('./PreviewFrame') => ({ PreviewFrame: () => <div>PREVIEW</div> }));

type Studio = ReturnType<typeof useCodeStudio>;

function studioStub(over: Partial<Studio> = {}): Studio {
  return {
    mode: 'pro',
    age: 14,
    title: 'My Site',
    files: [],
    loading: false,
    chat: [],
    busy: false,
    error: null,
    balance: 10,
    runKey: 0,
    pendingPlan: null,
    send: vi.fn(),
    approvePlan: vi.fn(),
    rejectPlan: vi.fn(),
    runAnew: vi.fn(),
    visibility: 'private',
    ...over,
  } as unknown as Studio;
}

function renderAt(path: string, routePath: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePath} element={<CodeStudioPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.mocked(useCodeStudio).mockReset());

describe('CodeStudioPage', () => {
  it('shows the opening state while loading', () => {
    vi.mocked(useCodeStudio).mockReturnValue(studioStub({ loading: true }));
    renderAt('/learn/code/cp1', '/learn/code/:projectId');
    expect(screen.getByText('Opening your code…')).toBeInTheDocument();
  });

  it('renders the Pro layout (files + chat + preview) for older kids', () => {
    vi.mocked(useCodeStudio).mockReturnValue(studioStub({ mode: 'pro' }));
    renderAt('/learn/code/cp1', '/learn/code/:projectId');
    expect(screen.getByText('My Site')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /My code/ })).toBeInTheDocument();
    expect(screen.getByText('CHAT')).toBeInTheDocument();
  });

  it('renders the Lite layout (show-files affordance) for younger kids', () => {
    vi.mocked(useCodeStudio).mockReturnValue(studioStub({ mode: 'lite' }));
    renderAt('/learn/code/cp1', '/learn/code/:projectId');
    expect(screen.getByRole('button', { name: /Show files/ })).toBeInTheDocument();
    expect(screen.getByText('CHAT')).toBeInTheDocument();
  });

  it('renders not-found when there is no project id', () => {
    vi.mocked(useCodeStudio).mockReturnValue(studioStub());
    renderAt('/x', '/x');
    expect(screen.getByText('Project not found')).toBeInTheDocument();
  });
});
