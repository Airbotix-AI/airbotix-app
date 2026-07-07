// @vitest-environment jsdom
// Class "Create for this class" enters the Game Playground prompt-first route:
// `/learn/playground/new?class=<id>`. The project must be created only after the
// kid submits the first prompt, then attached to the class before the studio
// moves into generation.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createGameProjectMock, placeGameProjectForClassMock, getProjectMock, useMeMock } = vi.hoisted(() => ({
  createGameProjectMock: vi.fn(),
  placeGameProjectForClassMock: vi.fn(),
  getProjectMock: vi.fn(),
  useMeMock: vi.fn(),
}));

vi.mock('@/auth/useAuth', () => ({ useMe: useMeMock }));
vi.mock('../code/codeApi', async (orig) => {
  const actual = await orig<typeof import('../code/codeApi')>();
  return { ...actual, getProject: getProjectMock };
});
vi.mock('./panes/playgroundApi', async (orig) => {
  const actual = await orig<typeof import('./panes/playgroundApi')>();
  return {
    ...actual,
    createGameProject: createGameProjectMock,
    placeGameProjectForClass: placeGameProjectForClassMock,
  };
});
vi.mock('./LandingScreen', () => ({
  LandingScreen: ({ onSubmit }: { onSubmit: (prompt: string) => void }) => (
    <button type="button" onClick={() => onSubmit('make a 3D maze')}>
      Submit prompt
    </button>
  ),
}));
vi.mock('./GeneratingScreen', () => ({
  GeneratingScreen: ({ projectId }: { projectId?: string }) => (
    <div data-testid="generating-project">{projectId}</div>
  ),
}));

import { PlaygroundApp } from './PlaygroundApp';

function renderClassCreate() {
  const router = createMemoryRouter(
    [
      {
        path: '/learn/playground/:projectId',
        element: <PlaygroundApp projectId="new" />,
      },
    ],
    { initialEntries: ['/learn/playground/new?class=class-1'] },
  );
  return render(<RouterProvider router={router} />);
}

describe('PlaygroundApp class create flow', () => {
  beforeEach(() => {
    createGameProjectMock.mockReset().mockResolvedValue({ id: 'game-77' });
    placeGameProjectForClassMock.mockReset().mockResolvedValue(undefined);
    getProjectMock.mockReset().mockResolvedValue({ id: 'game-77', engine: 'three', learning_context: null });
    useMeMock.mockReturnValue({ data: { kind: 'kid', sub: 'kid-1', family_id: 'fam-1', age: 10 } });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('creates the game from the prompt and attaches it to the source class', async () => {
    renderClassCreate();

    expect(createGameProjectMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Submit prompt' }));

    await waitFor(() =>
      expect(createGameProjectMock).toHaveBeenCalledWith({
        kidId: 'kid-1',
        familyId: 'fam-1',
        title: 'make a 3D maze',
      }),
    );
    expect(placeGameProjectForClassMock).toHaveBeenCalledWith({
      projectId: 'game-77',
      classId: 'class-1',
    });
    await expect(screen.findByTestId('generating-project')).resolves.toHaveTextContent('game-77');
  });
});
