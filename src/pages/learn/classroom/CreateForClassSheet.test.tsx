// @vitest-environment jsdom
// "Create for this class" sheet (my-classes-prd §3.3): a tool with sub-types
// (Creative Code Studio → Web Code / Creative Code Studio) opens a second-level menu; a plain
// tool (Story Blocks) creates directly. Direct creates POST /projects, attach via the
// placement endpoint, and navigate to the right editor. Creative Code Studio is
// prompt-first: it navigates to `/learn/playground/new?class=...` and lets the
// playground create + attach the game after the initial prompt.

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

  it('opens the Creative Code Studio sub-menu (Web Code + Creative Code Studio) and can go back', async () => {
    renderSheet();
    // Creative Code Studio is a sub-menu tool, not a direct create.
    fireEvent.click(screen.getByTestId('create-tool-submenu'));

    expect(screen.getByText('Web Code')).toBeInTheDocument();
    expect(screen.getByText('Creative Code Studio')).toBeInTheDocument();
    expect(screen.getByText(/Creative Code Studio · pick one/)).toBeInTheDocument();
    // Opening the sub-menu must not POST anything.
    expect(api).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('create-subtool-back'));
    expect(screen.queryByText('Web Code')).not.toBeInTheDocument();
    expect(screen.queryByTestId('create-subtool-back')).not.toBeInTheDocument();
    expect(screen.getByText(/pick a tool/)).toBeInTheDocument();
  });

  it('Creative Code Studio opens the prompt-first playground with class context', async () => {
    renderSheet();
    fireEvent.click(screen.getByTestId('create-tool-submenu'));
    const game = screen.getByText('Creative Code Studio').closest('button')!;
    fireEvent.click(game);

    expect(navigate).toHaveBeenCalledWith('/learn/playground/new?class=class-1');
    expect(api).not.toHaveBeenCalled();
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

  it('shows only the course-allowed project kinds', async () => {
    renderSheet(['game', 'blocks']);

    expect(screen.queryByText('Image Maker')).not.toBeInTheDocument();
    expect(screen.queryByText('Music Maker')).not.toBeInTheDocument();
    expect(screen.queryByText('Web Code')).not.toBeInTheDocument();
    expect(screen.getByText('Creative Code Studio')).toBeInTheDocument();
    expect(screen.getByText('Story Blocks')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('create-tool-submenu'));
    expect(screen.getByText('Creative Code Studio')).toBeInTheDocument();
    expect(screen.queryByText('Web Code')).not.toBeInTheDocument();
  });
});
