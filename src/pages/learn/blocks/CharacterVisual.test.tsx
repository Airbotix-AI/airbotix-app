// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CharacterVisual } from './CharacterVisual';

describe('CharacterVisual', () => {
  it('renders Lumilo as the canonical layered puppet with open-eyed idle by default', () => {
    const { container, rerender } = render(
      <CharacterVisual
        character={{
          name: 'Little Light',
          emoji: '⭐',
          asset: '/story-blocks/tiny-star-village/characters/little-light/resting.svg',
        }}
        className="sprite"
      />,
    );
    const puppet = container.querySelector('svg');
    expect(puppet).toHaveAttribute('data-performance', 'idle');
    expect(puppet).toHaveClass('sprite');
    expect(puppet?.querySelector('.bsx-lumilo-eyes')).toBeInTheDocument();

    rerender(
      <CharacterVisual
        character={{
          name: 'Little Light',
          emoji: '⭐',
          asset: '/story-blocks/tiny-star-village/characters/little-light/resting.svg',
        }}
        performance="speaking"
      />,
    );
    expect(container.querySelector('svg')).toHaveAttribute('data-performance', 'speaking');
    expect(container.querySelector('.bsx-lumilo-mouth-speak')).toBeInTheDocument();
  });

  it('renders Tuan Tuan as an open-eyed layered puppet with the shared performance contract', () => {
    const { container, rerender } = render(
      <CharacterVisual
        character={{
          name: 'Tuan Tuan',
          emoji: '☁️',
          asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting.svg',
        }}
      />,
    );
    expect(container.querySelector('svg')).toHaveAttribute('data-performance', 'idle');
    expect(container.querySelector('.bsx-tuan-eyes')).toBeInTheDocument();

    rerender(
      <CharacterVisual
        character={{
          name: 'Tuan Tuan',
          emoji: '☁️',
          asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting.svg',
        }}
        performance="success"
      />,
    );
    expect(container.querySelector('svg')).toHaveAttribute('data-performance', 'success');
    expect(container.querySelector('.bsx-tuan-arms-celebrate')).toBeInTheDocument();
  });

  it('keeps emoji as the portable fallback', () => {
    render(<CharacterVisual character={{ name: 'Cat', emoji: '🐱' }} />);
    expect(screen.getByText('🐱')).toBeInTheDocument();
  });
});
