import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryOk } from '@/test/mocks';
import { VideoStudioPage } from './VideoStudioPage';
import { useGenerate, useRecentArtifacts, type Artifact } from './shared/useStudio';

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

const mutate = vi.fn();
beforeEach(() => {
  mutate.mockReset();
  vi.mocked(useGenerate).mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<typeof useGenerate>);
  vi.mocked(useRecentArtifacts).mockReturnValue(queryOk<Artifact[]>([]));
});

describe('VideoStudioPage', () => {
  it('blocks an empty scene with a friendly error', async () => {
    render(<VideoStudioPage />);
    await userEvent.click(screen.getByRole('button', { name: /Film/ }));
    expect(screen.getByText('Describe the scene you want to film.')).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('generates a video from the scene description', async () => {
    render(<VideoStudioPage />);
    await userEvent.type(screen.getByRole('textbox'), 'a rocket launch');
    await userEvent.click(screen.getByRole('button', { name: /Film/ }));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: expect.stringContaining('a rocket launch') }),
      expect.anything(),
    );
  });
});
