// @vitest-environment jsdom
// The hub's Tiny Star Village season progression (Task 25): the story map's
// locks and its "continue the story" control come from the server's unlock
// answer, and resuming reopens the child's own project for the open scene.

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();

vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: { kind: 'kid', sub: 'kid_1', nickname: 'Mia' } }),
}));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));
vi.mock('./blocksApi', () => ({
  createBlocksProject: vi.fn(async () => ({ id: 'fresh-project' })),
  listBlocksProjects: vi.fn(async () => []),
}));
vi.mock('./story-parts/storyPartsApi', () => ({
  fetchStoryLineProgress: vi.fn(),
}));

import { BlocksHubPage } from './BlocksHubPage';
import { createBlocksProject, listBlocksProjects } from './blocksApi';
import { fetchStoryLineProgress } from './story-parts/storyPartsApi';
import { TINY_STAR_STORY_LINE_ID } from './tinyStarSeason';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  // clearAllMocks keeps implementations: reset the per-test project list so one
  // test's saved project cannot resume another test's season.
  vi.mocked(listBlocksProjects).mockResolvedValue([]);
});

/** The server answer after chapter A1 is finished: A2-H is the open scene. */
const AFTER_CHAPTER_ONE = {
  story_line_id: TINY_STAR_STORY_LINE_ID,
  completed: ['tsv-s1-a1-h', 'tsv-s1-a1-b', 'tsv-s1-a1-d', 'tsv-s1-a1-s'].map((part_id) => ({
    part_id,
    completed_at: '2026-07-25T00:00:00.000Z',
    evidence: {} as Record<string, never>,
  })),
  unlocked_part_ids: ['tsv-s1-a1-h', 'tsv-s1-a1-b', 'tsv-s1-a1-d', 'tsv-s1-a1-s', 'tsv-s1-a2-h'],
};

function renderHub() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <BlocksHubPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Story Blocks hub — Tiny Star Village season progression', () => {
  it('shows one English Journey to the West story-world entry', async () => {
    vi.mocked(fetchStoryLineProgress).mockRejectedValue(new Error('offline'));
    renderHub();

    await waitFor(() => expect(fetchStoryLineProgress).toHaveBeenCalled());
    expect(screen.getAllByTestId('blocks-jtw-entry')).toHaveLength(1);
    expect(
      screen.getByRole('heading', {
        name: "Journey to the West · The Monkey King's First Journey",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('西游记 · 石猴的第一程')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Enter Flower Fruit Mountain →' }));
    expect(navigate).toHaveBeenCalledWith('/learn/story/journey-west');
  });

  it('keeps backend project records off the child-facing story hub', async () => {
    vi.mocked(fetchStoryLineProgress).mockResolvedValue(AFTER_CHAPTER_ONE);
    vi.mocked(listBlocksProjects).mockResolvedValue([
      {
        id: 'free-project',
        title: 'My Story Blocks project',
        kind: 'blocks',
        status: 'active',
        updated_at: '2026-07-25T02:00:00.000Z',
      },
      {
        id: 'mission-project',
        title: 'Tiny Star Village · Wake up first',
        kind: 'blocks',
        status: 'active',
        updated_at: '2026-07-25T01:00:00.000Z',
      },
    ]);
    renderHub();

    await waitFor(() => expect(listBlocksProjects).toHaveBeenCalledWith('kid_1'));
    expect(screen.queryByText('Free creation')).not.toBeInTheDocument();
    expect(screen.queryByText('Make your own Story Blocks project')).not.toBeInTheDocument();
    expect(screen.queryByText('Your Story Blocks projects')).not.toBeInTheDocument();
    expect(screen.queryByTestId('blocks-continue-latest')).not.toBeInTheDocument();
    expect(screen.queryByTestId('blocks-project-card')).not.toBeInTheDocument();
    expect(screen.queryByText('My Story Blocks project')).not.toBeInTheDocument();
  });

  it('locks the scenes the server has not opened yet', async () => {
    vi.mocked(fetchStoryLineProgress).mockResolvedValue(AFTER_CHAPTER_ONE);
    renderHub();

    // Nothing is locked until the server answers, so wait for the first lock.
    await waitFor(() =>
      expect(screen.getByTestId('blocks-starter-blocks_tsv_a2_b')).toBeDisabled(),
    );
    expect(fetchStoryLineProgress).toHaveBeenCalledWith(TINY_STAR_STORY_LINE_ID);
    expect(screen.getByTestId('blocks-starter-blocks_tsv_a1_s')).toHaveAttribute(
      'data-state',
      'completed',
    );
    expect(screen.getByTestId('blocks-starter-blocks_tsv_a2_h')).toHaveAttribute(
      'data-state',
      'open',
    );
    expect(screen.getByTestId('blocks-starter-blocks_tsv_a6_s')).toHaveAttribute(
      'data-state',
      'locked',
    );
  });

  it('resumes the open scene in the project the child already started', async () => {
    vi.mocked(fetchStoryLineProgress).mockResolvedValue(AFTER_CHAPTER_ONE);
    vi.mocked(listBlocksProjects).mockResolvedValue([
      {
        id: 'a2h-project',
        title: 'Tiny Star Village · Which way is the plaza?',
        kind: 'blocks',
        status: 'active',
        updated_at: '2026-07-25T01:00:00.000Z',
      },
    ]);
    renderHub();

    fireEvent.click(await screen.findByTestId('story-season-resume-start'));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/learn/blocks/a2h-project'));
    expect(createBlocksProject).not.toHaveBeenCalled();
  });

  it('starts the open scene fresh when the child has never opened it', async () => {
    vi.mocked(fetchStoryLineProgress).mockResolvedValue(AFTER_CHAPTER_ONE);
    renderHub();

    fireEvent.click(await screen.findByTestId('story-season-resume-start'));

    await waitFor(() =>
      expect(createBlocksProject).toHaveBeenCalledWith({
        template: 'blocks_tsv_a2_h',
        title: 'Tiny Star Village · Press Go and watch',
      }),
    );
    expect(navigate).toHaveBeenCalledWith('/learn/blocks/fresh-project');
  });

  it('never locks a scene when the season progress cannot be read', async () => {
    vi.mocked(fetchStoryLineProgress).mockRejectedValue(new Error('offline'));
    renderHub();

    await waitFor(() => expect(fetchStoryLineProgress).toHaveBeenCalled());
    expect(screen.queryByTestId('story-season-resume')).not.toBeInTheDocument();
    for (const button of screen.getAllByTestId(/blocks-starter-blocks_tsv_/)) {
      expect(button).not.toBeDisabled();
    }
  });
});
