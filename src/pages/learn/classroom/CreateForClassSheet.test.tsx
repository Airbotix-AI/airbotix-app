// @vitest-environment jsdom
// "Create for this class" sheet (my-classes-prd §3.3): a tool with sub-types
// (Code Studio → Web Code / Game Playground) opens a second-level menu; a plain
// tool (Blocks) creates directly. Every create POSTs /projects, attaches via the
// placement endpoint, and navigates to the right editor.

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

describe('CreateForClassSheet — second-level menu', () => {
  beforeEach(() => {
    navigate.mockReset();
    wireCreate();
  });
  afterEach(cleanup);

  it('opens the Code Studio sub-menu (Web Code + Game Playground) and can go back', async () => {
    renderSheet();
    // Code Studio is a sub-menu tool, not a direct create.
    fireEvent.click(screen.getByTestId('create-tool-submenu'));

    expect(screen.getByText('Web Code')).toBeInTheDocument();
    expect(screen.getByText('Game Playground')).toBeInTheDocument();
    expect(screen.getByText(/Code Studio · pick one/)).toBeInTheDocument();
    // Opening the sub-menu must not POST anything.
    expect(api).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('create-subtool-back'));
    expect(screen.queryByText('Game Playground')).not.toBeInTheDocument();
    expect(screen.getByText(/pick a tool/)).toBeInTheDocument();
  });

  it('Game Playground creates a phaser_blank game and opens the playground', async () => {
    renderSheet();
    fireEvent.click(screen.getByTestId('create-tool-submenu'));
    const game = screen.getByText('Game Playground').closest('button')!;
    fireEvent.click(game);

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/learn/playground/new-proj'));
    expect(api).toHaveBeenCalledWith('/projects', {
      method: 'POST',
      body: { title: 'My Game', product_line: 'line_b_coding', kind: 'game', template: 'phaser_blank' },
    });
    expect(api).toHaveBeenCalledWith('/projects/new-proj/placement', {
      method: 'PATCH',
      body: { action: 'use_for_class', class_id: 'class-1' },
    });
  });

  it('Web Code creates a blank code project and opens the code studio', async () => {
    renderSheet();
    fireEvent.click(screen.getByTestId('create-tool-submenu'));
    const web = screen.getByText('Web Code').closest('button')!;
    fireEvent.click(web);

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/learn/code/new-proj'));
    expect(api).toHaveBeenCalledWith('/projects', {
      method: 'POST',
      body: { title: 'My Project', product_line: 'line_b_coding', kind: 'code', template: 'blank' },
    });
  });

  it('a direct tool (Blocks) creates immediately without a sub-menu', async () => {
    renderSheet();
    const blocks = screen.getByText('Blocks').closest('button')!;
    expect(blocks).toHaveAttribute('data-testid', 'create-tool');
    fireEvent.click(blocks);

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/learn/blocks/new-proj'));
    expect(api).toHaveBeenCalledWith('/projects', {
      method: 'POST',
      body: { title: 'My Blocks', product_line: 'line_b_coding', kind: 'blocks', template: 'blocks_blank' },
    });
  });

  it('shows only the course-allowed project kinds', async () => {
    renderSheet(['game', 'blocks']);

    expect(screen.queryByText('Image Maker')).not.toBeInTheDocument();
    expect(screen.queryByText('Music Maker')).not.toBeInTheDocument();
    expect(screen.queryByText('Web Code')).not.toBeInTheDocument();
    expect(screen.getByText('Code Studio')).toBeInTheDocument();
    expect(screen.getByText('Blocks')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('create-tool-submenu'));
    expect(screen.getByText('Game Playground')).toBeInTheDocument();
    expect(screen.queryByText('Web Code')).not.toBeInTheDocument();
  });
});
