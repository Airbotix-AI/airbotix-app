import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryOk } from '@/test/mocks';
import { ImageMakerPage } from './ImageMakerPage';
import { useGenerate, useRecentArtifacts, type Artifact } from './shared/useStudio';

// Heavy studio chrome + session hooks are stubbed; this spec exercises the
// ImageMaker form orchestration (prompt → generate). The 4 create studios share
// this exact shape, so this is the representative coverage. `typeof import` keeps
// the chrome stub honest against its real export shape.
vi.mock('./shared/StudioChrome', (): typeof import('./shared/StudioChrome') => ({
  StudioChrome: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('./shared/StudioTip', (): typeof import('./shared/StudioTip') => ({ StudioTip: () => <></> }));
vi.mock('./shared/Celebration', (): typeof import('./shared/Celebration') => ({ Celebration: () => <></> }));
vi.mock('./shared/SessionSummary', (): typeof import('./shared/SessionSummary') => ({
  SessionSummary: () => <></>,
}));
vi.mock('./shared/useSession', () => ({
  useStudioSession: () => ({ sessionId: 's1' }),
  useExitSummary: () => ({ summary: null, endNow: vi.fn(), dismiss: vi.fn() }),
}));
vi.mock('./shared/useStudio', async (orig) => ({
  ...(await orig<typeof import('./shared/useStudio')>()),
  useGenerate: vi.fn(),
  useRecentArtifacts: vi.fn(),
}));

const mockedGenerate = vi.mocked(useGenerate);
const mockedRecent = vi.mocked(useRecentArtifacts);
const mutate = vi.fn();

beforeEach(() => {
  mutate.mockReset();
  mockedGenerate.mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<typeof useGenerate>);
  mockedRecent.mockReturnValue(queryOk<Artifact[]>([]));
});

describe('ImageMakerPage', () => {
  it('renders the prompt input and the make button', () => {
    render(<ImageMakerPage />);
    expect(screen.getByLabelText('What should I draw?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Make it/ })).toBeInTheDocument();
  });

  it('blocks an empty prompt with a friendly error', async () => {
    render(<ImageMakerPage />);
    await userEvent.click(screen.getByRole('button', { name: /Make it/ }));
    expect(screen.getByText('Type what you want to draw first.')).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('generates an image from the prompt + style', async () => {
    render(<ImageMakerPage />);
    await userEvent.type(screen.getByLabelText('What should I draw?'), 'a robot');
    await userEvent.click(screen.getByRole('button', { name: /Make it/ }));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: expect.stringContaining('a robot') }),
      expect.anything(),
    );
  });
});
