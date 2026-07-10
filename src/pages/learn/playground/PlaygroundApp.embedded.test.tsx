// @vitest-environment jsdom
// Load-error dead-end guard (teacher-prep-projects, review finding): when the game
// studio is hosted EMBEDDED (the teacher prep-project page carries its own Back),
// the load-error screen must NOT offer a button that navigates into `/learn/create`
// — that route bounces a teacher `user` principal to `/portal`, stranding them.
// The kid/default path is unchanged: the "Make something new" button is present and
// routes to `/learn/create`.
//
// `LoadErrorScreen`'s button is gated purely on the `embedded` prop (via
// `onBack={embedded ? undefined : …}`), independent of read/edit mode. We reach the
// shared error screen deterministically through the `readVfs` failure path (no
// generating-flow timers), asserting the button gating that the fix introduced.

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getProjectMock, readVfsMock, useMeMock } = vi.hoisted(() => ({
  getProjectMock: vi.fn(),
  readVfsMock: vi.fn(),
  useMeMock: vi.fn(),
}));

vi.mock('@/auth/useAuth', () => ({ useMe: useMeMock }));
vi.mock('../code/codeApi', async (orig) => {
  const actual = await orig<typeof import('../code/codeApi')>();
  return { ...actual, getProject: getProjectMock, readVfs: readVfsMock };
});

import { PlaygroundApp } from './PlaygroundApp';

beforeEach(() => {
  // A teacher is a `user` principal (no family/kid) — the real prep host.
  useMeMock.mockReturnValue({ data: { kind: 'user', sub: 't1', role: 'teacher', family_id: null } });
  // The VFS load fails → loadError='load' → the shared LoadErrorScreen renders.
  readVfsMock.mockReset().mockRejectedValue(new Error('boom'));
  getProjectMock.mockReset().mockResolvedValue({ id: 'g1', title: 'Prep game', engine: 'phaser' });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPlayground(embedded: boolean) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <QueryClientProvider client={qc}>
            {/* readOnly triggers the deterministic readVfs load path; `embedded` is
                what gates the /learn button — the behavior under test. */}
            <PlaygroundApp projectId="g1" readOnly embedded={embedded} />
          </QueryClientProvider>
        ),
      },
    ],
    { initialEntries: ['/'] },
  );
  render(<RouterProvider router={router} />);
}

describe('PlaygroundApp load-error (embedded teacher prep host)', () => {
  it('embedded: shows the error but NO /learn navigation button', async () => {
    renderPlayground(true);
    await screen.findByTestId('playground-error-load');
    // The host banner carries Back — no in-studio button that would route to /learn.
    expect(screen.queryByRole('button', { name: /Make something new/i })).not.toBeInTheDocument();
  });

  it('default (not embedded): shows the "Make something new" button', async () => {
    renderPlayground(false);
    await screen.findByTestId('playground-error-load');
    expect(screen.getByRole('button', { name: /Make something new/i })).toBeInTheDocument();
  });
});
