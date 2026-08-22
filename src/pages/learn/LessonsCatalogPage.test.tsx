// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: { kind: 'kid', sub: 'kid-1', age: 10 } }),
}));
vi.mock('@/lib/api', () => ({ api: vi.fn(async () => []) }));

import { LessonsCatalogPage } from './LessonsCatalogPage';

afterEach(cleanup);

describe('LessonsCatalogPage character guidance', () => {
  it('uses Tuan Tuan for both the Lessons hero and its empty guidance state', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <LessonsCatalogPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('lessons-character')).toHaveAttribute(
      'data-character',
      'tuantuan-thinking',
    );
    expect(await screen.findByTestId('lessons-empty-character')).toHaveAttribute(
      'data-character',
      'tuantuan-thinking',
    );
  });
});
