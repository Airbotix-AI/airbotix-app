// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MagicGenerationCard } from './MagicGenerationCard';

afterEach(cleanup);

describe('MagicGenerationCard', () => {
  const noop = vi.fn();

  it('shows the conjuring heading + prompt while generating', () => {
    render(
      <MagicGenerationCard
        status="generating"
        prompt="a cute baby"
        mode="create"
        onCancel={noop}
        onRetry={noop}
        onDismiss={noop}
      />,
    );
    expect(screen.getByText('Conjuring your asset…')).toBeTruthy();
    expect(screen.getByText('“a cute baby”')).toBeTruthy();
  });

  // The card surface must follow the workspace theme (no hardcoded white panel /
  // no light-pin) so it goes dark in dark theme — its text uses themeable pg-*
  // tokens, which only stay legible if the surface flips with them.
  it('uses themeable surface tokens and does not pin the theme', () => {
    const { container } = render(
      <MagicGenerationCard
        status="generating"
        prompt="x"
        mode="create"
        onCancel={noop}
        onRetry={noop}
        onDismiss={noop}
      />,
    );
    const card = screen.getByTestId('asset-magic-card');
    // Not pinned to a fixed theme — it inherits the workspace's data-theme.
    expect(card.getAttribute('data-theme')).toBeNull();
    // The inner surface is a themeable pg-surface gradient, never a hardcoded white.
    const panel = container.querySelector('.from-pg-surface');
    expect(panel).toBeTruthy();
    expect(container.querySelector('.bg-white')).toBeNull();
  });
});
