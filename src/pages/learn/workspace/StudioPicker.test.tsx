// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { StudioPicker } from './StudioPicker';

describe('StudioPicker', () => {
  afterEach(cleanup);
  // Music left the chat shell (D-MS7) but must stay DISCOVERABLE here — the
  // picker asks "what do you want to make?" and music is an answer. Its card
  // links to the Stage instead of creating a chat-shell session.
  it('offers Music as a link to the Stage, not a session-creating button', () => {
    render(
      <MemoryRouter>
        <StudioPicker onPick={vi.fn()} busy={false} />
      </MemoryRouter>,
    );
    const music = screen.getByTestId('studio-pick-music');
    expect(music).toHaveAttribute('href', '/learn/music');
    expect(music).toHaveTextContent('Music');
    expect(music).toHaveTextContent('Opens your own stage');
    // The chat studio stays a plain session-creating button (no href).
    expect(screen.getByTestId('studio-pick-chat')).not.toHaveAttribute('href');
  });

  // Image left the chat shell for the canvas-first Art Studio (D-IS-26): its
  // card is a link-out like Music, never a session-creating button.
  it('offers Image as a link to the Art Studio, not a session-creating button', () => {
    render(
      <MemoryRouter>
        <StudioPicker onPick={vi.fn()} busy={false} />
      </MemoryRouter>,
    );
    const image = screen.getByTestId('studio-pick-image');
    expect(image).toHaveAttribute('href', '/learn/create/image');
    expect(image).toHaveTextContent('Art Studio');
    expect(image).toHaveTextContent('Opens your own art studio');
  });

  // Voice / Video are paused (studios.ts `comingSoon`, learn PRD v0.7):
  // no session-creating card, only a non-interactive "Coming soon" teaser.
  it('shows paused studios as coming-soon teasers, never as pickable cards', () => {
    render(
      <MemoryRouter>
        <StudioPicker onPick={vi.fn()} busy={false} />
      </MemoryRouter>,
    );
    for (const id of ['voice', 'video']) {
      expect(screen.queryByTestId(`studio-pick-${id}`)).toBeNull();
      const teaser = screen.getByTestId(`studio-coming-soon-${id}`);
      expect(teaser).toHaveAttribute('aria-disabled', 'true');
      expect(teaser).toHaveTextContent(/coming soon/i);
    }
    // live studios keep their pickable cards
    expect(screen.getByTestId('studio-pick-chat')).toBeInTheDocument();
    expect(screen.getByTestId('studio-pick-code')).toBeInTheDocument();
  });
});
