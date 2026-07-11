// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CharacterVisual } from './CharacterVisual';

describe('CharacterVisual', () => {
  it('renders a first-party image asset when one is present', () => {
    const { container } = render(
      <CharacterVisual
        character={{
          name: 'Little Light',
          emoji: '⭐',
          asset: '/story-blocks/tiny-star-village/characters/little-light/resting.svg',
        }}
        className="sprite"
      />,
    );
    const image = container.querySelector('img');
    expect(image).toHaveAttribute(
      'src',
      '/story-blocks/tiny-star-village/characters/little-light/resting.svg',
    );
    expect(image).toHaveClass('sprite');
    expect(image).toHaveAttribute('draggable', 'false');
  });

  it('keeps emoji as the portable fallback', () => {
    render(<CharacterVisual character={{ name: 'Cat', emoji: '🐱' }} />);
    expect(screen.getByText('🐱')).toBeInTheDocument();
  });
});
