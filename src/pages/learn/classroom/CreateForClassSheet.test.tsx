// @vitest-environment jsdom
// "Create for this class" sheet (my-classes-prd §3.3): Creative Code Studio jumps
// STRAIGHT to the prompt-first game playground (`/learn/playground/new?class=...`)
// — its old Web Code / game second-level menu is skipped because Web Code is hidden
// until it ships (a tool only shows a sub-menu when >1 sub-type is visible). Plain
// tools (Story Blocks) create directly: POST /projects, attach via the placement
// endpoint, and navigate to the right editor.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { api, navigate } = vi.hoisted(() => ({ api: vi.fn(), navigate: vi.fn() }));
vi.mock('@/lib/api', () => ({
  api,
  ApiError: class ApiError extends Error {
    constructor(public status: number) {
      super('err');
    }
  },
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

import { CreateForClassSheet } from './CreateForClassSheet';

function renderSheet(allowedKinds?: Array<'creative' | 'code' | 'game' | 'blocks'>) {
  return render(
    <MemoryRouter>
      <CreateForClassSheet
        classId="class-1"
        className="Year 5 AI Lab"
        allowedKinds={allowedKinds}
        onClose={() => {}}
      />
    </MemoryRouter>,
  );
}

/** Resolve POST /projects with a fixed id, and the placement PATCH with void. */
function wireCreate(id = 'new-proj') {
  api.mockReset();
  api.mockImplementation((path: string) => {
    if (path === '/projects') return Promise.resolve({ id });
    return Promise.resolve(undefined); // placement PATCH
  });
}

describe('CreateForClassSheet — direct-jump', () => {
  beforeEach(() => {
    navigate.mockReset();
    wireCreate();
  });
  afterEach(cleanup);

  it('Creative Code Studio jumps straight to the prompt-first playground — no sub-menu, no POST', async () => {
    renderSheet();
    // No second-level menu affordance: Web Code is hidden, so only the game
    // sub-type is visible and the tool renders as a direct-create tool.
    expect(screen.queryByTestId('create-tool-submenu')).not.toBeInTheDocument();

    const game = screen.getByText('Creative Code Studio').closest('button')!;
    expect(game).toHaveAttribute('data-testid', 'create-tool');
    fireEvent.click(game);

    expect(navigate).toHaveBeenCalledWith('/learn/playground/new?class=class-1');
    // Prompt-first: the playground creates + attaches the game later, not here.
    expect(api).not.toHaveBeenCalled();
  });

  it('keeps Web Code hidden until it ships', () => {
    renderSheet();
    expect(screen.queryByText('Web Code')).not.toBeInTheDocument();
    expect(screen.queryByTestId('create-subtool-back')).not.toBeInTheDocument();
  });

  it('the direct Story Blocks tool creates immediately without a sub-menu', async () => {
    renderSheet();
    const blocks = screen.getByText('Story Blocks').closest('button')!;
    expect(blocks).toHaveAttribute('data-testid', 'create-tool');
    fireEvent.click(blocks);

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/learn/blocks/new-proj'));
    expect(api).toHaveBeenCalledWith('/projects', {
      method: 'POST',
      body: { title: 'My Blocks', product_line: 'line_b_coding', kind: 'blocks', template: 'blocks_blank' },
    });
  });

  it('never offers paused (coming-soon) or noClassSheet studios, even when creative is allowed', async () => {
    renderSheet(['creative', 'code', 'game', 'blocks']);

    // Art Studio is live but `noClassSheet`: its class path is mission
    // templates, not free-form class work (image-studio-prd D-IS-26).
    expect(screen.queryByText('Art Studio')).not.toBeInTheDocument();
    expect(screen.queryByText('Voice Booth')).not.toBeInTheDocument();
    expect(screen.queryByText('Video Studio')).not.toBeInTheDocument();
    // live creative tool still offered
    expect(screen.getByText('Music Stage')).toBeInTheDocument();
  });

  it('shows only the course-allowed project kinds', async () => {
    renderSheet(['game', 'blocks']);

    expect(screen.queryByText('Art Studio')).not.toBeInTheDocument();
    expect(screen.queryByText('Music Maker')).not.toBeInTheDocument();
    expect(screen.queryByText('Web Code')).not.toBeInTheDocument();
    // Creative Code Studio is allowed via its `game` sub-type and jumps directly.
    const game = screen.getByText('Creative Code Studio').closest('button')!;
    expect(game).toHaveAttribute('data-testid', 'create-tool');
    expect(screen.getByText('Story Blocks')).toBeInTheDocument();
    expect(screen.queryByTestId('create-tool-submenu')).not.toBeInTheDocument();
  });

  it('hides Creative Code Studio when the course disallows game work', async () => {
    renderSheet(['creative', 'blocks']);
    // Only the game sub-type is visible today, so a game-less course drops the tool.
    expect(screen.queryByText('Creative Code Studio')).not.toBeInTheDocument();
    expect(screen.getByText('Story Blocks')).toBeInTheDocument();
    // A live creative tool still shows (Music Stage). Voice/Video are paused as
    // `comingSoon`; Art Studio is live but `noClassSheet` — never offered here.
    expect(screen.getByText('Music Stage')).toBeInTheDocument();
    expect(screen.queryByText('Image Maker')).not.toBeInTheDocument();
  });
});
