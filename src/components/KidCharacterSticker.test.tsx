// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { KidCharacterSticker } from './KidCharacterSticker';

afterEach(cleanup);

describe('KidCharacterSticker', () => {
  it('uses the optimized character artwork without adding duplicate spoken content', () => {
    render(<KidCharacterSticker character="bix" testId="kid-character" />);

    const sticker = screen.getByTestId('kid-character');
    expect(sticker).toHaveAttribute(
      'src',
      '/media/characters/stickers/bix-ai-creator.webp',
    );
    expect(sticker).toHaveAttribute('alt', '');
    expect(sticker).toHaveAttribute('aria-hidden', 'true');
    expect(sticker).toHaveAttribute('loading', 'lazy');
  });

  it('exposes the reusable product-state poses from the character library', () => {
    const { rerender } = render(
      <KidCharacterSticker character="lumi-welcome" testId="state-character" />,
    );
    expect(screen.getByTestId('state-character')).toHaveAttribute(
      'src',
      '/media/characters/stickers/lumi-welcome.webp',
    );

    rerender(<KidCharacterSticker character="airo-building" testId="state-character" />);
    expect(screen.getByTestId('state-character')).toHaveAttribute(
      'src',
      '/media/characters/stickers/airo-building.webp',
    );
  });
});
