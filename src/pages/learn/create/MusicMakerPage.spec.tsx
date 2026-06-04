import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MusicMakerPage } from './MusicMakerPage';
import { useGenerate, useRecentArtifacts } from './shared/useStudio';

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
  vi.mocked(useRecentArtifacts).mockReturnValue({ data: [], isLoading: false } as unknown as ReturnType<typeof useRecentArtifacts>);
});

describe('MusicMakerPage', () => {
  it('blocks an empty prompt with a friendly error', async () => {
    render(<MusicMakerPage />);
    await userEvent.click(screen.getByRole('button', { name: /Compose/ }));
    expect(screen.getByText('Tell me what kind of music you want.')).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('generates music from the prompt', async () => {
    render(<MusicMakerPage />);
    await userEvent.type(screen.getByRole('textbox'), 'a happy tune');
    await userEvent.click(screen.getByRole('button', { name: /Compose/ }));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: expect.stringContaining('a happy tune') }),
      expect.anything(),
    );
  });
});
