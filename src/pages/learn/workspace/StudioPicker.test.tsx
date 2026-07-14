// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { StudioPicker } from './StudioPicker';

describe('StudioPicker', () => {
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
});
