// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ClassCoverImage } from './ClassCoverImage';

describe('ClassCoverImage', () => {
  it('fills the whole cover with the course image even when the cover has padding', () => {
    const { container } = render(
      <ClassCoverImage
        src="/media/courses/course.png"
        emoji="🤖"
        color="sky"
        className="flex h-24 items-center px-7"
      />,
    );

    expect(screen.queryByText('🤖')).not.toBeInTheDocument();
    const img = container.querySelector('img')!;
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/media/courses/course.png');
    expect(img).toHaveClass('absolute', 'inset-0', 'h-full', 'w-full', 'object-cover');
    expect(img.parentElement).toHaveClass('relative', 'overflow-hidden');
  });
});
