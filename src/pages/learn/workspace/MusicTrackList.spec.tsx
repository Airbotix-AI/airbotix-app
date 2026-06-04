import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MusicTrackList } from './MusicTrackList';

// wavesurfer.js touches AudioContext on .create(); the empty state never gets
// there, but mock it so importing the module is inert under jsdom.
vi.mock('wavesurfer.js', () => ({ default: { create: vi.fn() } }));

describe('MusicTrackList', () => {
  it('shows the empty studio state when there are no audio tracks', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MusicTrackList messages={[]} />
      </QueryClientProvider>,
    );
    expect(screen.getByText('Your mix · 0 tracks')).toBeInTheDocument();
    expect(screen.getByText(/Describe a song below/)).toBeInTheDocument();
  });
});
