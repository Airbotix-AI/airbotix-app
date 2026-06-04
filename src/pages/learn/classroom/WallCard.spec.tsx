import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { WallPost } from './classroomApi';
import { WallCard } from './WallCard';

vi.mock('./ReactionBar', (): typeof import('./ReactionBar') => ({ ReactionBar: () => <div>REACTIONS</div> }));
vi.mock('./ReportModal', (): typeof import('./ReportModal') => ({
  ReportModal: () => <div>REPORT MODAL</div>,
}));

function post(overrides: Partial<WallPost> = {}): WallPost {
  return {
    id: 'wp1',
    title: 'My Game',
    caption: 'so fun',
    kid_nickname: 'Robo',
    thumbnail_url: null,
    is_owner: false,
    ...overrides,
  } as WallPost;
}

function renderCard(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('WallCard', () => {
  it('renders the post title, caption and author', () => {
    renderCard(<WallCard post={post()} classId="c1" />);
    expect(screen.getByText('My Game')).toBeInTheDocument();
    expect(screen.getByText('so fun')).toBeInTheDocument();
    expect(screen.getByText(/by Robo/)).toBeInTheDocument();
  });

  it('lets a non-owner report the post (opens the report modal)', async () => {
    renderCard(<WallCard post={post({ is_owner: false })} classId="c1" />);
    await userEvent.click(screen.getByRole('button', { name: /Tell teacher/ }));
    expect(screen.getByText('REPORT MODAL')).toBeInTheDocument();
  });

  it('hides the report button on the owner’s own post', () => {
    renderCard(<WallCard post={post({ is_owner: true })} classId="c1" />);
    expect(screen.queryByRole('button', { name: /Tell teacher/ })).not.toBeInTheDocument();
  });
});
