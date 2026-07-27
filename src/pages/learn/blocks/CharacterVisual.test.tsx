// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { CharacterVisual } from './CharacterVisual';
import { TINY_STAR_SUCCESS_ASSETS } from './tinyStarPerformanceAssets';

describe('CharacterVisual', () => {
  it('renders Lumilo as the canonical layered puppet with open-eyed idle by default', () => {
    const { container, rerender } = render(
      <CharacterVisual
        character={{
          name: 'Little Light',
          emoji: '⭐',
          asset: '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png',
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
          asset: '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png',
        }}
        performance="speaking"
      />,
    );
    expect(container.querySelector('svg')).toHaveAttribute('data-performance', 'speaking');
    expect(container.querySelector('.bsx-lumilo-mouth-smile')).toBeInTheDocument();
    expect(container.querySelector('.bsx-lumilo-mouth-speak')).toBeInTheDocument();
  });

  it('renders Tuan Tuan as an open-eyed layered puppet with the shared performance contract', () => {
    const { container, rerender } = render(
      <CharacterVisual
        character={{
          name: 'Tuan Tuan',
          emoji: '☁️',
          asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting-happy-v01.png',
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
          asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting-happy-v01.png',
        }}
        performance="speaking"
      />,
    );
    expect(container.querySelector('.bsx-tuan-mouth-smile')).toBeInTheDocument();
    expect(container.querySelector('.bsx-tuan-mouth-speak')).toBeInTheDocument();

    rerender(
      <CharacterVisual
        character={{
          name: 'Tuan Tuan',
          emoji: '☁️',
          asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting-happy-v01.png',
        }}
        performance="success"
      />,
    );
    const success = container.querySelector('img');
    expect(success).toHaveAttribute('data-performance', 'success');
    expect(success).toHaveAttribute('data-performance-asset', 'true');
    expect(success).toHaveAttribute('src', TINY_STAR_SUCCESS_ASSETS.tuanTuan);
  });

  it('uses terminal pose art for every Tiny Star friend without changing transient puppets', () => {
    const { container, rerender } = render(
      <CharacterVisual
        character={{
          name: 'Lumilo',
          asset: '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png',
        }}
        performance="hopping"
      />,
    );
    expect(container.querySelector('svg')).toHaveAttribute('data-performance', 'hopping');
    expect(container.querySelector('img')).not.toBeInTheDocument();

    rerender(
      <CharacterVisual
        character={{
          name: 'Lumilo',
          asset: '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png',
        }}
        performance="success"
      />,
    );
    expect(container.querySelector('img')).toHaveAttribute('src', TINY_STAR_SUCCESS_ASSETS.lumilo);

    rerender(
      <CharacterVisual
        character={{
          name: 'Dot Dot',
          asset: '/story-blocks/tiny-star-village/characters/dot-dot/standing-calm-v01.png',
        }}
        performance="success"
      />,
    );
    expect(container.querySelector('img')).toHaveAttribute('src', TINY_STAR_SUCCESS_ASSETS.dotDot);
  });

  it('keeps emoji as the portable fallback', () => {
    render(<CharacterVisual character={{ name: 'Cat', emoji: '🐱' }} />);
    expect(screen.getByText('🐱')).toBeInTheDocument();
  });

  it('keeps speaking mouths calm instead of looping an open-close animation', () => {
    const css = readFileSync('src/pages/learn/blocks/blocks.css', 'utf8');

    expect(css).not.toContain("data-performance='speaking'] .bsx-lumilo-mouth-speak");
    expect(css).not.toContain("data-performance='speaking'] .bsx-tuan-mouth-speak");
    expect(css).not.toContain('@keyframes bsx-lumilo-talk');
    expect(css).not.toContain('@keyframes bsx-tuan-talk');
    expect(css).toContain("data-performance='speaking'] .bsx-lumilo-eyes");
    expect(css).toContain("data-performance='speaking'] .bsx-tuan-eyes");
  });
});
