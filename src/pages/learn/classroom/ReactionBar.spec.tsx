import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReactionBar } from './ReactionBar';
import { addReaction, type WallPost } from './classroomApi';

vi.mock('./classroomApi', async (orig) => ({
  ...(await orig<typeof import('./classroomApi')>()),
  addReaction: vi.fn(),
  removeReaction: vi.fn(),
}));

const mockedAddReaction = vi.mocked(addReaction);

function post(overrides: Partial<WallPost> = {}): WallPost {
  return { id: 'wp1', is_owner: false, my_reaction: null, reaction_counts: {}, ...overrides } as WallPost;
}

function renderBar(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
}

beforeEach(() => mockedAddReaction.mockReset());

describe('ReactionBar', () => {
  it('shows a read-only "no reactions yet" for the owner', () => {
    renderBar(<ReactionBar post={post({ is_owner: true })} classId="c1" />);
    expect(screen.getByText('No reactions yet')).toBeInTheDocument();
  });

  it('lets a classmate open the picker and react', async () => {
    mockedAddReaction.mockResolvedValue(undefined as never);
    renderBar(<ReactionBar post={post()} classId="c1" />);

    await userEvent.click(screen.getByRole('button', { name: 'Add a reaction' }));
    const emojis = screen.getAllByRole('menuitem');
    await userEvent.click(emojis[0]);

    await waitFor(() =>
      expect(mockedAddReaction).toHaveBeenCalledWith(
        expect.objectContaining({ classId: 'c1', postId: 'wp1' }),
      ),
    );
  });
});
